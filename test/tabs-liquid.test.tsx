import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Tabs as WebTabs } from "../src/organisms/tabs/tabs.tsx";
import { Tabs as IOSTabs } from "../src/organisms/tabs/tabs.ios.tsx";
import { Tabs as AndroidTabs } from "../src/organisms/tabs/tabs.android.tsx";
import { selectionTint, webSkin, iosSkin, androidSkin } from "../src/organisms/tabs/tabs.styles.ts";
import { composite, contrastRatio } from "../src/style/color.ts";
import { darkColors, lightColors, glassByScheme } from "../src/style/tokens.ts";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

afterEach(cleanup);

function measureTab(name: string, rect: LayoutRectangle) {
  const tab = screen.getByRole("tab", { name });
  for (let host = tab.parentElement; host; host = host.parentElement) {
    if ((host as unknown as { __reactLayoutHandler?: unknown }).__reactLayoutHandler) {
      layoutElement(host, rect);
      return;
    }
  }
  throw new Error(`Missing measured trigger for ${name}`);
}

function frame() {
  const { style } = screen.getByTestId("tabs-selection-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}

describe("Tabs moving glass selection", () => {
  for (const [platform, Tabs] of [["web", WebTabs], ["ios", IOSTabs], ["android", AndroidTabs]] as const) {
    it(`${platform} moves one measured pill while preserving labels, focus and logical selection`, async () => {
      const { unmount } = render(<ThemeProvider glass><Tabs pills tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>);
      await act(async () => {});
      measureTab("Overview", { x: 8, y: 8, width: 100, height: 40 });
      measureTab("Activity", { x: 116, y: 8, width: 100, height: 40 });
      const first = screen.getByRole("tab", { name: "Overview" });
      const second = screen.getByRole("tab", { name: "Activity" });
      const label = screen.getByText("Activity");
      const color = label.style.color;
      act(() => second.focus());
      const clock = animationClock();
      try {
        fireEvent.click(second);
        expect(second.getAttribute("aria-selected")).toBe("true");
        expect(first.getAttribute("aria-selected")).toBe("false");
        expect(frame().x).toBe(8);
        clock.advance(80);
        expect(frame().width).toBeGreaterThan(100);
        expect(frame().height).toBeGreaterThan(40);
        expect(screen.getByText("Activity")).toBe(label);
        expect(label.style.color).toBe(color);
        expect(label.style.transform).toBe("");
        expect(document.activeElement).toBe(second);
        expect(screen.getAllByTestId("tabs-selection")).toHaveLength(1);
        clock.advance(1600);
        expect(frame()).toEqual({ x: 116, y: 8, width: 100, height: 40 });
      } finally { unmount(); clock.restore(); }
    });

    it(`${platform} observes full vertical and block rectangles and reconciles variant changes`, async () => {
      const control = (vertical: boolean) => <ThemeProvider glass><Tabs vertical={vertical} pills={!vertical} block tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>;
      const { rerender, unmount } = render(control(true));
      await act(async () => {});
      measureTab("Overview", { x: 0, y: 0, width: 180, height: 40 });
      measureTab("Activity", { x: 0, y: 44, width: 180, height: 40 });
      const clock = animationClock();
      try {
        fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
        clock.advance(80);
        expect(frame().height).toBeGreaterThan(40);
        expect(frame().width).toBeGreaterThan(180);
        rerender(control(false));
        expect(screen.queryByTestId("tabs-selection-motion")).toBeNull();
        measureTab("Overview", { x: 8, y: 8, width: 120, height: 40 });
        measureTab("Activity", { x: 136, y: 8, width: 120, height: 40 });
        expect(frame()).toEqual({ x: 136, y: 8, width: 120, height: 40 });
        clock.advance(1600);
        expect(frame()).toEqual({ x: 136, y: 8, width: 120, height: 40 });
      } finally { unmount(); clock.restore(); }
    });
  }

  it("preserves Android underline ink while iOS and web use the capsule's filled anatomy", async () => {
    for (const [platform, Tabs] of [["web", WebTabs], ["android", AndroidTabs], ["ios", IOSTabs]] as const) {
      const { unmount } = render(<ThemeProvider glass><Tabs tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>);
      await act(async () => {});
      measureTab("Overview", { x: 3, y: 3, width: 100, height: 32 });
      expect(screen.queryByTestId("tabs-selection-motion") !== null).toBe(platform !== "android");
      unmount();
    }
  });

  it("retains controlled rejection, disabled skipping and reversed measured coordinates", async () => {
    const selected: number[] = [];
    const control = (active: number, glass = true) => <ThemeProvider glass={glass} solid={!glass}><WebTabs pills active={active} tabs={["Overview", { label: "Billing", disabled: true }, "Activity"]} onSelect={(index) => selected.push(index)} testID="tabs" /></ThemeProvider>;
    const { rerender, unmount } = render(control(0));
    await act(async () => {});
    measureTab("Overview", { x: 220, y: 8, width: 100, height: 40 });
    measureTab("Billing", { x: 112, y: 8, width: 100, height: 40 });
    measureTab("Activity", { x: 4, y: 8, width: 100, height: 40 });
    const first = screen.getByRole("tab", { name: "Overview" });
    const last = screen.getByRole("tab", { name: "Activity" });
    const clock = animationClock();
    try {
      fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(selected).toEqual([2]);
      expect(frame().x).toBe(220);
      rerender(control(2));
      clock.advance(80);
      const moving = frame();
      expect(moving.x).toBeLessThan(220);
      rerender(control(0));
      expect(frame().x).toBeCloseTo(moving.x, 4);
      rerender(control(0, false));
      expect(screen.queryByTestId("tabs-selection-motion")).toBeNull();
      expect(screen.getByRole("tab", { name: "Overview" })).toBe(first);
      expect(screen.getByRole("tab", { name: "Activity" })).toBe(last);
      clock.advance(1600);
      expect(screen.queryByTestId("tabs-selection-motion")).toBeNull();
    } finally { unmount(); clock.restore(); }
  });

  it("jumps exactly under Reduce Motion and resets active geometry on resize", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      render(<ThemeProvider glass><WebTabs pills block tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>);
      await act(async () => {});
      measureTab("Overview", { x: 8, y: 8, width: 100, height: 40 });
      measureTab("Activity", { x: 116, y: 8, width: 100, height: 40 });
      await act(async () => {});
      fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
      expect(frame()).toEqual({ x: 116, y: 8, width: 100, height: 40 });
      measureTab("Activity", { x: 80, y: 8, width: 64, height: 40 });
      expect(frame()).toEqual({ x: 80, y: 8, width: 64, height: 40 });
    } finally { reduced.mockRestore(); }
  });

  it("keeps stable foreground above the track and every skin tint in both schemes", () => {
    for (const [scheme, tokens] of [["light", lightColors], ["dark", darkColors]] as const) {
      const track = composite(glassByScheme[scheme]["glass-tint"], tokens.background);
      for (const skin of [webSkin, iosSkin, androidSkin]) {
        for (const style of [skin.pillsFill(tokens, true, scheme === "dark"), skin.verticalFill(tokens, true), skin.underlineTrigger(tokens, true, scheme === "dark")]) {
          const tint = selectionTint(style, scheme === "dark");
          if (!tint) continue;
          expect(contrastRatio(tokens.foreground, track)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(tokens.foreground, composite(tint, track))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps first and last selection deformation inside reserved scroll gutters", async () => {
    const { unmount } = render(<ThemeProvider glass><WebTabs pills tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>);
    await act(async () => {});
    measureTab("Overview", { x: 8, y: 8, width: 100, height: 40 });
    measureTab("Activity", { x: 116, y: 8, width: 100, height: 40 });
    const content = screen.getByTestId("tabs").parentElement!;
    const horizontal = parseFloat(content.style.paddingLeft);
    const vertical = parseFloat(content.style.paddingTop);
    expect(horizontal).toBeGreaterThan(0);
    expect(vertical).toBeGreaterThan(0);
    const clock = animationClock();
    try {
      for (const name of ["Activity", "Overview"]) {
        fireEvent.click(screen.getByRole("tab", { name }));
        for (let i = 0; i < 50; i++) {
          clock.advance(16);
          const moving = frame();
          expect(moving.x).toBeGreaterThanOrEqual(-horizontal);
          expect(moving.y).toBeGreaterThanOrEqual(-vertical);
          expect(moving.x + moving.width).toBeLessThanOrEqual(224 + horizontal);
          expect(moving.y + moving.height).toBeLessThanOrEqual(56 + vertical);
        }
      }
    } finally { unmount(); clock.restore(); }
  });

  it("keeps the solid selected treatment when the requested renderer is unavailable", async () => {
    const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
    Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => false } });
    const { unmount } = render(<ThemeProvider glass><WebTabs pills tabs={["Overview", "Activity"]} testID="tabs" /></ThemeProvider>);
    try {
      await act(async () => {});
      measureTab("Overview", { x: 8, y: 8, width: 100, height: 40 });
      measureTab("Activity", { x: 116, y: 8, width: 100, height: 40 });
      fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
      expect(screen.queryByTestId("tabs-selection-motion")).toBeNull();
      expect(screen.getByRole("tab", { name: "Activity" }).getAttribute("aria-selected")).toBe("true");
      expect(screen.getByRole("tab", { name: "Activity" }).style.backgroundColor).not.toBe("rgba(0, 0, 0, 0.00)");
    } finally {
      unmount();
      if (css) Object.defineProperty(globalThis, "CSS", css);
      else Reflect.deleteProperty(globalThis, "CSS");
    }
  });
});
