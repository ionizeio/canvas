import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccessibilityInfo } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { ButtonGroup as WebGroup } from "../src/atoms/button-group/button-group.tsx";
import { ButtonGroup as IOSGroup } from "../src/atoms/button-group/button-group.ios.tsx";
import { ButtonGroup as AndroidGroup } from "../src/atoms/button-group/button-group.android.tsx";
import { GlassSelection } from "../src/atoms/button-group/button-group-glass.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement, layoutEntrance } from "./entrance-layout.ts";

afterEach(cleanup);

const items = ["Day", "Week", "Month"];
const materialLayers = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[style]")]
  .filter((node) => node.style.backdropFilter);

function selectionFrame() {
  const frame = screen.getByTestId("selection").parentElement!;
  return {
    left: parseFloat(frame.style.left), top: parseFloat(frame.style.top),
    width: parseFloat(frame.style.width), height: parseFloat(frame.style.height),
    transform: frame.style.transform,
  };
}

describe("ButtonGroup theme material", () => {
  for (const [platform, Group] of [["web", WebGroup], ["ios", IOSGroup], ["android", AndroidGroup]] as const) {
    for (const kind of ["segmented", "split", "stepper", "spaced"] as const) {
      it(`${platform} ${kind} switches the material on and off with the theme`, async () => {
        // Exercise the actual shared renderer, without mocking GlassSurface. Native
        // entrypoints here check skin integration; device QA checks native materials.
        Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36" });
        try {
          const group = <Group {...{ [kind]: true }} items={items} testID="group" />;
          const { rerender } = render(<ThemeProvider glass>{group}</ThemeProvider>);
          await waitFor(() => expect(materialLayers(screen.getByTestId("group")).length).toBeGreaterThan(0));
          rerender(<ThemeProvider solid>{group}</ThemeProvider>);
          expect(materialLayers(screen.getByTestId("group"))).toHaveLength(0);
        } finally {
          delete (window.navigator as unknown as Record<string, unknown>).userAgent;
        }
      });
    }

    it(`${platform} preserves selection through a surface toggle and respects disabled`, () => {
      const selected: string[] = [];
      const group = <Group items={items} accessibilityLabel="Calendar view" onSelect={(_, item) => selected.push(item)} />;
      const { rerender } = render(<ThemeProvider glass>{group}</ThemeProvider>);
      expect(screen.getByRole("tablist", { name: "Calendar view" })).toBeTruthy();
      fireEvent.click(screen.getByRole("tab", { name: "Week" }));
      expect(screen.getByRole("tab", { name: "Week" }).getAttribute("aria-selected")).toBe("true");
      rerender(<ThemeProvider solid>{group}</ThemeProvider>);
      expect(screen.getByRole("tab", { name: "Week" }).getAttribute("aria-selected")).toBe("true");
      rerender(<ThemeProvider glass><Group items={items} disabled onSelect={(_, item) => selected.push(item)} /></ThemeProvider>);
      fireEvent.click(screen.getByRole("tab", { name: "Month" }));
      expect(screen.getByRole("tab", { name: "Month" }).getAttribute("aria-disabled")).toBe("true");
      expect(selected).toEqual(["Week"]);
    });

    it(`${platform} paints the selected material when entering glass without a new layout event`, async () => {
      const control = (glass: boolean) => <ThemeProvider glass={glass} solid={!glass}>
        <Group items={items} active={1} testID="group" />
      </ThemeProvider>;
      const { rerender } = render(control(false));
      await act(async () => {});
      const selected = screen.getByRole("tab", { name: "Week" });
      layoutElement(selected.parentElement!, { width: 84, height: 36 });
      expect(screen.queryByTestId("group-selection")).toBeNull();
      rerender(control(true));
      const material = screen.getByTestId("group-selection");
      expect(material.parentElement!.style.width).toBe("84px");
      expect(material.parentElement!.style.height).toBe("36px");
      expect(screen.getByRole("tab", { name: "Week" })).toBe(selected);
      expect(selected.getAttribute("aria-selected")).toBe("true");
      expect(material.parentElement!.getAttribute("aria-hidden")).toBe("true");
    });

    it(`${platform} keeps controlled icon selection and detached action semantics`, () => {
      let selected = -1;
      const { rerender } = render(
        <ThemeProvider glass>
          <Group iconsOnly active={0} items={[{ label: "Phone", icon: "smartphone" }, { label: "Desktop", icon: "monitor" }]} onSelect={(i) => { selected = i; }} />
        </ThemeProvider>,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Desktop" }));
      expect(selected).toBe(1);
      expect(screen.getByRole("tab", { name: "Phone" }).getAttribute("aria-selected")).toBe("true");
      rerender(<ThemeProvider glass><Group spaced items={items} onSelect={(i) => { selected = i; }} /></ThemeProvider>);
      fireEvent.click(screen.getByRole("button", { name: "Month" }));
      expect(selected).toBe(2);
      expect(screen.getByRole("button", { name: "Month" }).hasAttribute("aria-selected")).toBe(false);
    });

    it(`${platform} keeps split menu and wrapping stepper actions working`, async () => {
      const selected: string[] = [];
      const { rerender } = render(<ThemeProvider glass><Group split items={["Save"]} menu={["Save copy"]} onSelect={(_, item) => selected.push(item)} /></ThemeProvider>);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      expect(screen.getByRole("button", { name: "More actions" }).getAttribute("aria-expanded")).toBe("true");
      layoutEntrance(screen.getByText("Save copy"), { width: 200, height: 48 });
      fireEvent.click(await screen.findByRole("menuitem", { name: "Save copy" }));
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      rerender(<ThemeProvider glass><Group stepper items={items} onSelect={(_, item) => selected.push(item)} /></ThemeProvider>);
      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      expect(screen.getByText("Month")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByText("Day")).toBeTruthy();
      expect(selected).toEqual(["Save", "Save copy", "Month", "Day"]);
    });
  }

  it("moves the selection to measured bounds immediately under Reduce Motion", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { rerender } = render(<ThemeProvider glass><GlassSelection testID="selection" layout={{ x: 3, y: 3, width: 60, height: 36 }} /></ThemeProvider>);
      await act(async () => {});
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={{ x: 120, y: 3, width: 96, height: 40 }} /></ThemeProvider>);
      const frame = screen.getByTestId("selection").parentElement!;
      expect(frame.style.left).toBe("120px");
      expect(frame.style.width).toBe("96px");
      expect(frame.style.height).toBe("40px");
      expect(frame.style.transform).toBe("");
    } finally {
      reduced.mockRestore();
    }
  });

  it("stretches outside the track, recoils, and settles exactly on the selected segment", async () => {
    const start = { x: 3, y: 3, width: 72, height: 36 };
    const { rerender, unmount } = render(<ThemeProvider glass><GlassSelection testID="selection" layout={start} /></ThemeProvider>);
    await act(async () => {});
    const clock = animationClock();
    try {
      // Equal-width tabs expose actual deformation, not an animated width change.
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={{ ...start, x: 75 }} /></ThemeProvider>);
      clock.advance(80);
      const airborne = selectionFrame();
      expect(airborne.width).toBeGreaterThan(start.width * 1.15);
      expect(airborne.top).toBeLessThan(0);
      expect(airborne.top + airborne.height).toBeGreaterThan(42);
      expect(airborne.transform).toBe("");
      clock.advance(240);
      expect(selectionFrame().width).toBeLessThan(start.width);
      clock.advance(1200);
      expect(selectionFrame()).toEqual({ left: 75, top: 3, width: 72, height: 36, transform: "" });
    } finally { unmount(); clock.restore(); }
  });

  it("retargets a reversing switch without snapping and lands on unequal bounds", async () => {
    const start = { x: 160, y: 3, width: 96, height: 40 };
    const { rerender, unmount } = render(<ThemeProvider glass><GlassSelection testID="selection" layout={start} /></ThemeProvider>);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={{ x: 3, y: 3, width: 56, height: 36 }} /></ThemeProvider>);
      clock.advance(64);
      const before = selectionFrame();
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={start} /></ThemeProvider>);
      const after = selectionFrame();
      expect(after.left).toBeCloseTo(before.left, 4);
      expect(after.width).toBeCloseTo(before.width, 4);
      clock.advance(1600);
      expect(selectionFrame()).toEqual({ left: 160, top: 3, width: 96, height: 40, transform: "" });
    } finally { unmount(); clock.restore(); }
  });

  it("keeps a held pill outside the track and settles on release without changing its hit target", async () => {
    const layout = { x: 3, y: 3, width: 72, height: 36 };
    const { rerender, unmount } = render(<ThemeProvider glass><GlassSelection testID="selection" layout={layout} /></ThemeProvider>);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={layout} pressed /></ThemeProvider>);
      clock.advance(1000);
      expect(selectionFrame().height).toBeCloseTo(54, 1);
      expect(selectionFrame().top).toBeLessThan(0);
      expect(screen.getByTestId("selection").style.pointerEvents).toBe("none");
      rerender(<ThemeProvider glass><GlassSelection testID="selection" layout={layout} /></ThemeProvider>);
      clock.advance(1600);
      expect(selectionFrame()).toEqual({ left: 3, top: 3, width: 72, height: 36, transform: "" });
    } finally { unmount(); clock.restore(); }
  });

  it("uses opaque solid segments with contrast edges under Increase Contrast", async () => {
    const original = window.matchMedia.bind(window);
    const contrast = spyOn(window, "matchMedia").mockImplementation((query) => {
      const result = original(query);
      if (query.includes("prefers-contrast")) Object.defineProperty(result, "matches", { value: true });
      return result;
    });
    try {
      render(<ThemeProvider glass><WebGroup items={items} testID="group" /></ThemeProvider>);
      await waitFor(() => expect(screen.getByRole("tab", { name: "Week" }).style.borderWidth).toBe("1px"));
      expect(screen.queryByTestId("group-glass")).toBeNull();
      expect(screen.queryByTestId("group-selection")).toBeNull();
      expect(materialLayers(screen.getByTestId("group"))).toHaveLength(0);
      const week = screen.getByRole("tab", { name: "Week" });
      expect(week.style.backgroundColor).not.toBe("");
      expect(week.style.backgroundColor).not.toBe("transparent");
      expect(week.style.borderColor).not.toBe("");
      fireEvent.click(screen.getByRole("tab", { name: "Week" }));
      expect(screen.getByRole("tab", { name: "Week" }).getAttribute("aria-selected")).toBe("true");
    } finally {
      contrast.mockRestore();
    }
  });
});
