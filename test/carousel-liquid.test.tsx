import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, UIManager, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Carousel as WebCarousel } from "../src/organisms/carousel/carousel.tsx";
import { Carousel as IOSCarousel } from "../src/organisms/carousel/carousel.ios.tsx";
import { Carousel as AndroidCarousel } from "../src/organisms/carousel/carousel.android.tsx";
import { webSkin, iosSkin, androidSkin } from "../src/organisms/carousel/carousel.styles.ts";
import { animationClock } from "./liquid-motion-clock.ts";

// In glass mode the Carousel's active dot mark travels between the dots as one
// measured ink marker following the committed slide (dots, arrows, a controlled
// index, a loop back to the first slide); the dots, their press targets and the
// slides stay still. A slide-set change resets the marker in place; the marker
// has the skin's own active dot size, so the resting strip is unchanged; solid
// mode keeps the skin's static dots.

afterEach(cleanup);

const platforms = [["web", WebCarousel, webSkin], ["ios", IOSCarousel, iosSkin], ["android", AndroidCarousel, androidSkin]] as const;
const items = [{ key: "a", content: "First" }, { key: "b", content: "Second" }, { key: "c", content: "Third" }];

// Dot press targets report their frames in the dots row through measureLayout;
// the test DOM has no layout, so the measurement answers from the strip's own
// arithmetic (targets of the skin's size, side by side), keyed by the slide label.
let target = 24;
const rectOf = (i: number): LayoutRectangle => ({ x: i * target, y: 0, width: target, height: target });
function mockDotMeasurement() {
  return spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, onFail, onSuccess) => {
    const label = (node as unknown as HTMLElement).getAttribute("aria-label") ?? "";
    const match = /^Slide (\d+) of/.exec(label);
    if (match) { const r = rectOf(Number(match[1]) - 1); onSuccess(r.x, r.y, r.width, r.height); } else onFail();
  });
}
function frame() {
  const { style } = screen.getByTestId("car-dot-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}
const marker = (i: number, dot: { width: number; height: number }) => {
  const r = rectOf(i);
  return { x: r.x + (r.width - dot.width) / 2, y: r.y + (r.height - dot.height) / 2, width: dot.width, height: dot.height };
};
const dot = (n: number) => screen.getByRole("button", { name: new RegExp(`^Slide ${n} of`) });

describe("Carousel moving glass dot marker", () => {
  for (const [platform, Carousel, skin] of platforms) {
    it(`${platform}: travels between the dots on a dot press and keeps the resting strip unchanged`, async () => {
      target = (skin.dotTarget?.minWidth as number) ?? 24;
      const active = skin.dot({} as never, true) as { width: number; height: number };
      const measure = mockDotMeasurement();
      const { unmount } = render(<ThemeProvider glass><Carousel items={items} showDots testID="car" /></ThemeProvider>);
      await act(async () => {});
      const clock = animationClock();
      try {
        expect(screen.getAllByTestId("car-dot-marker")).toHaveLength(1);
        expect(frame()).toEqual(marker(0, active));
        // The dot under the marker renders inactive: the marker is the only brand mark.
        expect(getComputedStyle(dot(1).firstElementChild as Element).width).toBe(`${(skin.dot({} as never, false) as { width: number }).width}px`);
        fireEvent.click(dot(3));
        expect(dot(3).getAttribute("aria-current")).toBe("true");
        expect(frame().x).toBe(marker(0, active).x);
        clock.advance(80);
        expect(frame().width).toBeGreaterThan(active.width);
        expect(dot(1).getAttribute("aria-current")).toBe("false");
        clock.advance(1600);
        expect(frame()).toEqual(marker(2, active));
      } finally { unmount(); clock.restore(); measure.mockRestore(); }
    });
  }

  it("follows a controlled index, and travels back along the strip when a loop wraps to the first slide", async () => {
    target = 24;
    const active = webSkin.dot({} as never, true) as { width: number; height: number };
    const measure = mockDotMeasurement();
    const view = render(<ThemeProvider glass><WebCarousel items={items} showDots showArrows loop index={1} testID="car" /></ThemeProvider>);
    await act(async () => {});
    const clock = animationClock();
    try {
      expect(frame()).toEqual(marker(1, active));
      view.rerender(<ThemeProvider glass><WebCarousel items={items} showDots showArrows loop index={2} testID="car" /></ThemeProvider>);
      clock.advance(1600);
      expect(frame()).toEqual(marker(2, active));
      // Uncontrolled loop: next from the last slide wraps to the first, the marker travels back.
      view.unmount();
      const wrapped = render(<ThemeProvider glass><WebCarousel items={items} showDots showArrows loop defaultIndex={2} testID="car" /></ThemeProvider>);
      await act(async () => {});
      expect(frame()).toEqual(marker(2, active));
      fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
      expect(dot(1).getAttribute("aria-current")).toBe("true");
      clock.advance(80);
      expect(frame().x).toBeLessThan(marker(2, active).x);
      clock.advance(1600);
      expect(frame()).toEqual(marker(0, active));
      wrapped.unmount();
    } finally { clock.restore(); measure.mockRestore(); }
  });

  it("resets in place when the slide set changes and withdraws when the dots hide", async () => {
    target = 24;
    const active = webSkin.dot({} as never, true) as { width: number; height: number };
    const measure = mockDotMeasurement();
    const view = render(<ThemeProvider glass><WebCarousel items={items} showDots defaultIndex={2} testID="car" /></ThemeProvider>);
    await act(async () => {});
    const clock = animationClock();
    try {
      expect(frame()).toEqual(marker(2, active));
      // Dropping the last slide clamps the index to the new last dot: a reset, no travel.
      view.rerender(<ThemeProvider glass><WebCarousel items={items.slice(0, 2)} showDots defaultIndex={2} testID="car" /></ThemeProvider>);
      await act(async () => {});
      expect(frame()).toEqual(marker(1, active));
      clock.advance(80);
      expect(frame()).toEqual(marker(1, active));
      view.rerender(<ThemeProvider glass><WebCarousel items={items.slice(0, 1)} showDots defaultIndex={2} testID="car" /></ThemeProvider>);
      await act(async () => {});
      expect(screen.queryByTestId("car-dot-motion")).toBeNull();
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("keeps the skin's static dots in solid mode", async () => {
    target = 24;
    const measure = mockDotMeasurement();
    try {
      const { unmount } = render(<ThemeProvider solid><WebCarousel items={items} showDots testID="car" /></ThemeProvider>);
      await act(async () => {});
      expect(screen.queryByTestId("car-dot-motion")).toBeNull();
      expect(getComputedStyle(dot(1).firstElementChild as Element).width).toBe(`${(webSkin.dot({} as never, true) as { width: number }).width}px`);
      unmount();
    } finally { measure.mockRestore(); }
  });

  it("selects the measured bounds immediately under Reduce Motion", async () => {
    target = 24;
    const active = webSkin.dot({} as never, true) as { width: number; height: number };
    const measure = mockDotMeasurement();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(<ThemeProvider glass><WebCarousel items={items} showDots testID="car" /></ThemeProvider>);
      await act(async () => {});
      fireEvent.click(dot(3));
      await act(async () => {});
      expect(frame()).toEqual(marker(2, active));
      unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
  });
});
