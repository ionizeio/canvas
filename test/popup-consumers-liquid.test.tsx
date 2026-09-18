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

// Phase 3 owners share the mechanism, but each is verified through its own
// trigger and content role: the material conceals the content until it settles,
// and a close retires the content at once while the material leaves.
import { Popover } from "../src/atoms/popover/popover.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { PhoneInput } from "../src/molecules/phone-input/phone-input.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";

const owners: Array<{ name: string; render: () => ReactNode; open: () => void; role: string; close: () => void }> = [
  {
    name: "Popover (triggered)",
    render: () => <Popover trigger="Details" title="Information" actionLabel="Done" />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "Details" })),
    role: "dialog",
    close: () => fireEvent.click(screen.getByRole("button", { name: "Details" })),
  },
  {
    name: "RowMenu",
    render: () => <RowMenu items={[{ label: "Edit" }, { label: "Delete", destructive: true }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
    role: "menu",
    close: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
  },
  {
    name: "Command (triggered)",
    render: () => <Command trigger groups={[{ heading: "Actions", items: [{ label: "New file" }, { label: "Open" }] }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: /Search/ })),
    role: "listbox",
    close: () => fireEvent.click(screen.getByRole("button", { name: /Search/ })),
  },
  {
    name: "split ButtonGroup",
    render: () => <ButtonGroup split items={["Save"]} menu={["Save copy"]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
    role: "menu",
    close: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
  },
  {
    name: "PhoneInput country list",
    render: () => <PhoneInput label="Phone" />,
    open: () => fireEvent.click(screen.getByRole("button", { name: /^Country/ })),
    role: "listbox",
    close: () => fireEvent.click(screen.getByRole("button", { name: /^Country/ })),
  },
];

describe("phase 3 owners on the liquid popup policy", () => {
  for (const owner of owners) {
    it(`${owner.name}: conceals until settled, retires at once on close, unmounts after the exit`, async () => {
      const measure = bounds();
      const view = render(glass(owner.render()));
      await act(async () => {});
      const clock = animationClock();
      try {
        owner.open();
        clock.advance(32);
        const content = await screen.findByRole(owner.role, { hidden: true });
        const nodes = hostedEntranceParts(content);
        layoutHostedEntrance(content, SIZE);
        expect(heldBack(content)).toBe(true);
        clock.advance(1600);
        expect(heldBack(content)).toBe(false);
        owner.close();
        expect(screen.queryByRole(owner.role)).toBeNull();
        expect(content.isConnected).toBe(true);
        expect(retired(nodes.entrance)).toBe(true);
        clock.advance(1600);
        expect(content.isConnected).toBe(false);
      } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
    });
  }

  it("Autocomplete: the suggestion list follows the same lifecycle around the live editor", async () => {
    const measure = bounds();
    const view = render(glass(<Autocomplete label="Fruit" options={["Apple", "Apricot"]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const field = screen.getByRole("combobox") as HTMLInputElement;
      fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      const nodes = hostedEntranceParts(list);
      layoutHostedEntrance(list, SIZE);
      expect(heldBack(list)).toBe(true);
      clock.advance(1600);
      expect(heldBack(list)).toBe(false);
      fireEvent.click(within(list).getByRole("option", { name: "Apricot" }));
      expect(field.value).toBe("Apricot");
      expect(field.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(list.isConnected).toBe(false);
      expect(screen.getByRole("combobox")).toBe(field);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("Popover: the inline card stays a static in-flow panel", async () => {
    const view = render(glass(<Popover inline title="Information" actionLabel="Done">Always here</Popover>));
    await act(async () => {});
    expect(screen.getByText("Always here").closest('[aria-hidden="true"]')).toBeNull();
    view.unmount();
  });
});

describe("owners closing their menu when editing is disallowed", () => {
  it("split ButtonGroup: disabling the group while its menu is open closes it and nothing selects afterwards", async () => {
    const measure = bounds();
    const picked: string[] = [];
    const page = (disabled: boolean) => glass(<ButtonGroup split items={["Save"]} menu={["Save copy"]} disabled={disabled} onSelect={(_, item) => picked.push(item)} />);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      clock.advance(1600);
      const row = within(menu).getByRole("menuitem", { name: "Save copy" });
      view.rerender(page(true));
      expect(screen.queryByRole("menuitem", { name: "Save copy" })).toBeNull();
      fireEvent.click(row);
      clock.advance(1600);
      expect(picked).toEqual([]);
      expect(row.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("PhoneInput: turning read-only while the country list is open closes it", async () => {
    const measure = bounds();
    const page = (readOnly: boolean) => glass(<PhoneInput label="Phone" readOnly={readOnly} />);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: /^Country/ }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      layoutHostedEntrance(list, SIZE);
      clock.advance(1600);
      expect(screen.getByRole("listbox")).toBe(list);
      view.rerender(page(true));
      expect(screen.queryByRole("listbox")).toBeNull();
      clock.advance(1600);
      expect(list.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});
