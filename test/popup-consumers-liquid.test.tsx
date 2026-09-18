import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { AvatarMenu } from "../src/atoms/avatar/avatar.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { hostedEntranceParts, layoutElement, layoutHostedEntrance } from "./entrance-layout.ts";

// Without a motion clock nothing conceals the card, so the hosted anatomy cannot
// be located by its concealed entrance; deliver the fixture size to every native
// layout boundary above the content instead (extra same-size events are inert).
function layoutChain(content: Element, size: { width: number; height: number }) {
  for (let node: Element | null = content; node && node.tagName !== "BODY"; node = node.parentElement) {
    if (typeof (node as Element & { __reactLayoutHandler?: unknown }).__reactLayoutHandler === "function") layoutElement(node, size);
  }
}

// Dropdown and Select are the first public popups on the kit's liquid policy:
// under glass their menu material grows from the anchor, the rows stay concealed
// and inert until the material covers them, and a closing menu stays visible
// briefly while its rows are already out of interaction and accessibility.
// Logical state (selection, open) never waits for the decoration. AvatarMenu
// and the collapsed Navbar menu are built on Dropdown and inherit all of it.

afterEach(cleanup);

const SIZE = { width: 240, height: 120 };
const bounds = () => spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
  x: 0, y: 0, width: 640, height: 800, top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
} as DOMRect);
const glass = (body: ReactNode) => <ThemeProvider glass><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;
const solid = (body: ReactNode) => <ThemeProvider solid><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;
// Opening conceals the rows on the foreground host inside the card; closing
// retires the whole hosted entrance (semantics and pointer events together).
const heldBack = (content: Element) => content.closest('[aria-hidden="true"]') !== null;
const retired = (node: Element) => node.getAttribute("aria-hidden") === "true" && getComputedStyle(node).pointerEvents === "none";

describe("Dropdown on the liquid popup policy", () => {
  it("conceals the rows until the material settles, then retires them at once on close while the material exits", async () => {
    const measure = bounds();
    const picked: string[] = [];
    const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }, { label: "Sign out" }]} onSelect={(item) => picked.push(item.label)} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      const nodes = hostedEntranceParts(menu);
      layoutHostedEntrance(menu, SIZE);
      // Opening: the foreground waits for the material.
      expect(heldBack(menu)).toBe(true);
      clock.advance(1600);
      expect(heldBack(menu)).toBe(false);
      const row = within(menu).getByRole("menuitem", { name: "Sign out" });
      fireEvent.click(row);
      // The selection is committed and the menu is logically closed at once...
      expect(picked).toEqual(["Sign out"]);
      expect(screen.queryByRole("menuitem", { name: "Sign out" })).toBeNull();
      expect(screen.getByRole("button", { name: "Account" }).getAttribute("aria-expanded")).toBe("false");
      // ...while the retained material is still leaving, with its rows inert.
      expect(row.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(row.isConnected).toBe(false);
      expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
      expect(picked).toEqual(["Sign out"]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("reopens during its exit from the retained material without a second row set", async () => {
    const measure = bounds();
    const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const trigger = screen.getByRole("button", { name: "Account" });
      fireEvent.click(trigger);
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      clock.advance(1600);
      fireEvent.click(trigger); // close
      clock.advance(80);
      fireEvent.click(trigger); // reopen mid-exit
      clock.advance(1600);
      expect(screen.getAllByRole("menu", { hidden: true })).toHaveLength(1);
      expect(screen.getByRole("menuitem", { name: "Profile" }).closest('[role="menu"]')).toBe(menu);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("snaps to rest under Reduce Motion and keeps the ordinary entrance in solid mode", async () => {
    const measure = bounds();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutChain(menu, SIZE);
      await act(async () => {});
      expect(heldBack(menu)).toBe(false);
      view.unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
    const measureAgain = bounds();
    try {
      const view = render(solid(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutChain(menu, SIZE);
      await act(async () => {});
      // Solid: no liquid gating, the rows are reachable as soon as the card is placed.
      expect(heldBack(menu)).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      await act(async () => {});
      expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
      view.unmount();
    } finally { measureAgain.mockRestore(); }
  });
});

describe("Select on the liquid popup policy", () => {
  it("commits the chosen value before the option material has left", async () => {
    const measure = bounds();
    const changes: string[] = [];
    const view = render(glass(<Select label="Region" options={["Americas", "Europe"]} onSelect={(value) => changes.push(value)} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Region" }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      const nodes = hostedEntranceParts(list);
      layoutHostedEntrance(list, SIZE);
      expect(heldBack(list)).toBe(true);
      clock.advance(1600);
      expect(heldBack(list)).toBe(false);
      const option = within(list).getByRole("option", { name: "Europe" });
      fireEvent.click(option);
      expect(changes).toEqual(["Europe"]);
      expect(screen.getByRole("button", { name: "Region" }).getAttribute("aria-expanded")).toBe("false");
      expect(option.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(option.isConnected).toBe(false);
      expect(changes).toEqual(["Europe"]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});

describe("AvatarMenu inherits the Dropdown policy", () => {
  it("opens through the concealed-then-readable lifecycle with one accessible trigger", async () => {
    const measure = bounds();
    const view = render(glass(<AvatarMenu name="Rachel Chen" items={[{ label: "Profile" }, { label: "Sign out" }]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const triggers = screen.getAllByRole("button");
      expect(triggers).toHaveLength(1);
      fireEvent.click(triggers[0]!);
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      expect(heldBack(menu)).toBe(true);
      clock.advance(1600);
      expect(heldBack(menu)).toBe(false);
      expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeDefined();
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});
