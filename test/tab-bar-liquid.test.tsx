import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, Animated, Text, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { TabBar as WebBar } from "../src/organisms/tab-bar/tab-bar.tsx";
import { TabBar as IOSBar } from "../src/organisms/tab-bar/tab-bar.ios.tsx";
import { TabBar as AndroidBar } from "../src/organisms/tab-bar/tab-bar.android.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

afterEach(cleanup);

const destinations = ["Home", "Search", "Library", "Updates", "Profile"].map((label) => ({
  key: label.toLowerCase(), label, icon: () => <Text testID={`${label}-glyph`}>●</Text>,
}));

function measureDestination(label: string, item: LayoutRectangle, icon = { x: 39, y: 6, width: 22, height: 22 }) {
  layoutElement(screen.getByRole("tab", { name: label }), item);
  layoutElement(screen.getByTestId(`${label}-glyph`).parentElement!, icon);
}

function frame() {
  const { style } = screen.getByTestId("bar-selection-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}

// The outermost padded ancestor of the tablist: a docked bar's own box, whose bottom
// padding grew by the inset, or a floating bar's frame, which keeps the inset under the
// capsule (the capsule's own symmetric padding sits between the two).
function insetHostOf(bar: HTMLElement): HTMLElement | null {
  let host: HTMLElement | null = null;
  for (let node = bar.parentElement; node; node = node.parentElement) {
    if (node.style.paddingBottom) host = node;
  }
  return host;
}

describe("TabBar measured glass indicator", () => {
  // Three bars, two anatomies. iOS and web float a capsule whose selection is a capsule
  // covering the whole destination cell, so the surface is the measured cell itself and
  // the safe-area inset becomes space UNDER the capsule (24 - 12 clearance = 12). Android
  // docks a full-bleed bar with the M3 icon pill and extends its bottom padding by the
  // inset (8 + 24). The navigation profile stretches only along the row, so no bar's
  // surface ever grows taller than its resting height in flight.
  const bars = [
    ["web", WebBar, "cell", 100, 46, "12px"],
    ["ios", IOSBar, "cell", 100, 46, "12px"],
    ["android", AndroidBar, "icon", 56, 32, "32px"],
  ] as const;
  for (const [platform, Bar, covers, width, height, inset] of bars) {
    for (const count of [3, 5]) {
      it(`${platform} moves one ${covers} surface (${width}x${height}) across ${count} destinations without growing taller`, async () => {
        const items = destinations.slice(0, count);
        const { unmount } = render(<ThemeProvider glass><Bar items={items} bottomInset={24} testID="bar" /></ThemeProvider>);
        await act(async () => {});
        items.forEach((item, i) => measureDestination(item.label, { x: i * 100, y: 0, width: 100, height: 46 }));
        const first = screen.getByRole("tab", { name: "Home" });
        const last = screen.getByRole("tab", { name: items.at(-1)!.label });
        const glyph = screen.getByTestId(`${items.at(-1)!.label}-glyph`);
        const rest = covers === "cell"
          ? { x: (count - 1) * 100, y: 0, width, height }
          : { x: (count - 1) * 100 + 50 - width / 2, y: 17 - height / 2, width, height };
        const clock = animationClock();
        try {
          act(() => last.focus());
          fireEvent.click(last);
          expect(last.getAttribute("aria-selected")).toBe("true");
          expect(first.getAttribute("aria-selected")).toBe("false");
          clock.advance(80);
          expect(frame().width).toBeGreaterThan(width);
          expect(frame().x).toBeGreaterThan(covers === "cell" ? 0 : 50 - width / 2);
          for (let i = 0; i < 70; i++) {
            clock.advance(16);
            expect(frame().height).toBeLessThanOrEqual(height + 0.001);
          }
          clock.advance(800);
          expect(frame()).toEqual(rest);
          expect(screen.getByTestId(`${items.at(-1)!.label}-glyph`)).toBe(glyph);
          expect(glyph.style.transform).toBe("");
          expect(document.activeElement).toBe(last);
          expect(screen.getAllByTestId("bar-selection")).toHaveLength(1);
          expect(insetHostOf(screen.getByTestId("bar"))?.style.paddingBottom).toBe(inset);
        } finally { unmount(); clock.restore(); }
      });
    }
  }

  it("keeps a floating capsule's safe-area space under the bar, never inside it", async () => {
    // A phone with a 34pt home-indicator inset: the capsule floats 22pt up (34 - 12),
    // clear of the indicator; with no inset it keeps its 8pt floor.
    for (const [inset, expected] of [[34, "22px"], [0, "8px"]] as const) {
      const { unmount } = render(<ThemeProvider solid><WebBar items={destinations.slice(0, 3)} bottomInset={inset} testID="bar" /></ThemeProvider>);
      await act(async () => {});
      expect(insetHostOf(screen.getByTestId("bar"))?.style.paddingBottom).toBe(expected);
      const capsule = screen.getByTestId("bar").parentElement as HTMLElement;
      expect(capsule.style.borderRadius).toBe("9999px");
      unmount();
    }
  });

  it("reorders keyed destinations without reusing stale bounds or remounting semantic hosts", async () => {
    const renderBar = (items = destinations.slice(0, 3)) => <ThemeProvider glass><WebBar items={items} active="search" testID="bar" /></ThemeProvider>;
    const { rerender } = render(renderBar());
    await act(async () => {});
    measureDestination("Search", { x: 100, y: 0, width: 100, height: 46 });
    const search = screen.getByRole("tab", { name: "Search" });
    const glyph = screen.getByTestId("Search-glyph");
    expect(frame().x).toBe(100);
    rerender(renderBar([destinations[1], destinations[2], destinations[0]]));
    expect(screen.queryByTestId("bar-selection-motion")).toBeNull();
    expect(screen.getByRole("tab", { name: "Search" })).toBe(search);
    expect(screen.getByTestId("Search-glyph")).toBe(glyph);
    measureDestination("Search", { x: 0, y: 0, width: 100, height: 46 });
    expect(frame().x).toBe(0);
    rerender(renderBar([destinations[2], destinations[0]]));
    expect(screen.queryByTestId("bar-selection-motion")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Search" })).toBeNull();
  });

  it("retains controlled refusal and current geometry during rapid reversal", async () => {
    const requests: string[] = [];
    const renderBar = (active: string, glass = true) => <ThemeProvider glass={glass} solid={!glass}><WebBar items={destinations.slice(0, 3)} active={active} onSelect={(key) => requests.push(key)} testID="bar" /></ThemeProvider>;
    const { rerender, unmount } = render(renderBar("home"));
    await act(async () => {});
    destinations.slice(0, 3).forEach((item, i) => measureDestination(item.label, { x: i * 100, y: 0, width: 100, height: 46 }));
    const home = screen.getByRole("tab", { name: "Home" });
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("tab", { name: "Library" }));
      expect(requests).toEqual(["library"]);
      expect(frame().x).toBe(0);
      rerender(renderBar("library"));
      clock.advance(80);
      const midway = frame();
      rerender(renderBar("home"));
      expect(frame().x).toBeCloseTo(midway.x, 4);
      expect(frame().width).toBeCloseTo(midway.width, 4);
      rerender(renderBar("home", false));
      expect(screen.queryByTestId("bar-selection-motion")).toBeNull();
      expect(screen.getByRole("tab", { name: "Home" })).toBe(home);
      clock.advance(1600);
      expect(screen.queryByTestId("bar-selection-motion")).toBeNull();
    } finally { unmount(); clock.restore(); }
  });

  it("jumps to the measured cell with Reduce Motion and does not spring", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      render(<ThemeProvider glass><WebBar items={destinations.slice(0, 3)} testID="bar" /></ThemeProvider>);
      await act(async () => {});
      destinations.slice(0, 3).forEach((item, i) => measureDestination(item.label, { x: i * 120, y: 0, width: 120, height: 52 }, { x: 46, y: 8, width: 28, height: 28 }));
      await act(async () => {});
      const spring = spyOn(Animated, "spring");
      try {
        fireEvent.click(screen.getByRole("tab", { name: "Library" }));
        expect(frame()).toEqual({ x: 240, y: 0, width: 120, height: 52 });
        expect(spring).not.toHaveBeenCalled();
      } finally { spring.mockRestore(); }
    } finally { reduced.mockRestore(); }
  });

  it("jumps to the measured icon bounds with Reduce Motion on the docked Android bar", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      render(<ThemeProvider glass><AndroidBar items={destinations.slice(0, 3)} testID="bar" /></ThemeProvider>);
      await act(async () => {});
      destinations.slice(0, 3).forEach((item, i) => measureDestination(item.label, { x: i * 120, y: 0, width: 120, height: 52 }, { x: 46, y: 8, width: 28, height: 28 }));
      await act(async () => {});
      fireEvent.click(screen.getByRole("tab", { name: "Library" }));
      expect(frame()).toEqual({ x: 272, y: 6, width: 56, height: 32 });
    } finally { reduced.mockRestore(); }
  });

  it("keeps the ordinary skin pill when native material capability resolves solid", async () => {
    const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
    Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => false } });
    const { unmount } = render(<ThemeProvider glass><WebBar items={destinations.slice(0, 3)} testID="bar" /></ThemeProvider>);
    try {
      await act(async () => {});
      destinations.slice(0, 3).forEach((item, i) => measureDestination(item.label, { x: i * 100, y: 0, width: 100, height: 46 }));
      const spring = spyOn(Animated, "spring");
      try {
        fireEvent.click(screen.getByRole("tab", { name: "Library" }));
        expect(spring).not.toHaveBeenCalled();
        expect(screen.queryByTestId("bar-selection-motion")).toBeNull();
        // The resting capsule sits behind glyph and label alike: the cell's first child,
        // absolutely filling it, fully rounded.
        const pill = screen.getByRole("tab", { name: "Library" }).firstElementChild as HTMLElement;
        expect(getComputedStyle(pill).position).toBe("absolute");
        expect(pill.style.borderRadius).toBe("9999px");
        expect(pill.contains(screen.getByTestId("Library-glyph"))).toBe(false);
      } finally { spring.mockRestore(); }
    } finally {
      unmount();
      if (css) Object.defineProperty(globalThis, "CSS", css);
      else Reflect.deleteProperty(globalThis, "CSS");
    }
  });
});
