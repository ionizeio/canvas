import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { AccessibilityInfo, Animated, type LayoutRectangle } from "react-native";
import { useLiquidMotion, type LiquidMotionProfile } from "../src/style/liquid-motion.ts";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";
import { Slider } from "../src/atoms/slider/slider.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

afterEach(cleanup);

function Probe({ layout, enabled = true, pressed = false, profile = "selection", onCommit }: {
  layout: LayoutRectangle; enabled?: boolean; pressed?: boolean; profile?: LiquidMotionProfile; onCommit?: () => void;
}) {
  const frame = useLiquidMotion(layout, { enabled, pressed, profile });
  useLayoutEffect(() => { onCommit?.(); });
  return <Animated.View testID="frame" style={[{ position: "absolute", pointerEvents: "none" }, frame]} />;
}
const readFrame = (id = "frame") => {
  const { style } = screen.getByTestId(id);
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
};
const start = { x: 3, y: 3, width: 40, height: 28 };

describe("scoped liquid bounds motion", () => {
  it("commits a dragged thumb center with its value before passive effects run", async () => {
    const committedCenters: number[] = [];
    const onCommit = () => {
      const frame = readFrame();
      committedCenters.push(frame.x + frame.width / 2);
    };
    const { rerender, unmount } = render(<Probe profile="drag" layout={start} onCommit={onCommit} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe profile="drag" pressed layout={{ ...start, x: 120 }} onCommit={onCommit} />);
      expect(committedCenters.at(-1)).toBeCloseTo(140, 4);
      clock.advance(80);
      rerender(<Probe profile="drag" pressed layout={{ ...start, x: 20 }} onCommit={onCommit} />);
      expect(committedCenters.at(-1)).toBeCloseTo(40, 4);
      rerender(<Probe profile="drag" enabled={false} layout={{ ...start, x: 60 }} onCommit={onCommit} />);
      expect(committedCenters.at(-1)).toBe(80);
    } finally { unmount(); clock.restore(); }
  });

  it("keeps drag position authoritative while its shape stretches, reverses and settles", async () => {
    const { rerender, unmount } = render(<Probe profile="drag" layout={start} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe profile="drag" pressed layout={{ ...start, x: 120 }} />);
      clock.advance(80);
      const moving = readFrame();
      expect(moving.x + moving.width / 2).toBeCloseTo(140, 4);
      expect(moving.width).toBeGreaterThan(start.width);
      expect(moving.height).not.toBe(start.height);
      rerender(<Probe profile="drag" pressed layout={{ ...start, x: 20 }} />);
      expect(readFrame().width).toBeCloseTo(moving.width, 4);
      clock.advance(64);
      expect(readFrame().x + readFrame().width / 2).toBeCloseTo(40, 4);
      rerender(<Probe profile="drag" layout={{ ...start, x: 20 }} />);
      clock.advance(1600);
      expect(readFrame()).toEqual({ ...start, x: 20 });
    } finally { unmount(); clock.restore(); }
  });

  for (const profile of ["selection", "drag", "toggle"] as const) {
    it(`${profile} cancels ongoing deformation immediately when disabled by material policy`, async () => {
      const { rerender, unmount } = render(<Probe profile={profile} layout={start} />);
      await act(async () => {});
      const clock = animationClock();
      try {
        const target = { ...start, x: 100 };
        rerender(<Probe profile={profile} pressed layout={target} />);
        clock.advance(80);
        expect(readFrame().width).toBeGreaterThan(start.width);
        rerender(<Probe profile={profile} pressed enabled={false} layout={target} />);
        expect(readFrame()).toEqual(target);
        clock.advance(600);
        expect(readFrame()).toEqual(target);
      } finally { unmount(); clock.restore(); }
    });

    it(`${profile} resolves resize and Reduce Motion directly without lift or deformation`, async () => {
      const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
      try {
        const { rerender } = render(<Probe profile={profile} layout={start} />);
        await act(async () => {});
        const resized = { x: 100, y: 6, width: 72, height: 36 };
        rerender(<Probe profile={profile} pressed layout={resized} />);
        expect(readFrame()).toEqual(resized);
        expect(screen.getByTestId("frame").style.transform).toBe("");
      } finally { reduced.mockRestore(); }
    });
  }
});

describe("moving controls retain their semantic hosts", () => {
  for (const preference of ["prefers-reduced-transparency", "prefers-contrast"]) {
    it(`cancels a Switch in flight when ${preference} changes`, async () => {
      const original = window.matchMedia.bind(window);
      const listeners = new Set<(event: { matches: boolean }) => void>();
      const media = spyOn(window, "matchMedia").mockImplementation((query) => query.includes(preference) ? {
        matches: false, media: query, onchange: null,
        addEventListener: (_type: string, callback: (event: { matches: boolean }) => void) => listeners.add(callback),
        removeEventListener: (_type: string, callback: (event: { matches: boolean }) => void) => listeners.delete(callback),
        addListener: (callback: (event: { matches: boolean }) => void) => listeners.add(callback),
        removeListener: (callback: (event: { matches: boolean }) => void) => listeners.delete(callback),
        dispatchEvent: () => true,
      } as unknown as MediaQueryList : original(query));
      const { unmount } = render(<ThemeProvider glass><Switch testID="switch">Enabled</Switch></ThemeProvider>);
      await act(async () => {});
      const clock = animationClock();
      try {
        const host = screen.getByRole("switch");
        act(() => host.focus());
        fireEvent.click(host);
        clock.advance(80);
        expect(readFrame("switch-thumb-motion").width).toBeGreaterThan(20);
        act(() => listeners.forEach((listener) => listener({ matches: true })));
        expect(readFrame("switch-thumb-motion")).toEqual({ x: 22, y: 2, width: 20, height: 20 });
        expect(host.querySelector('[style*="backdrop-filter"]')).toBeNull();
        expect(document.activeElement).toBe(host);
        clock.advance(1000);
        expect(readFrame("switch-thumb-motion")).toEqual({ x: 22, y: 2, width: 20, height: 20 });
      } finally { unmount(); clock.restore(); media.mockRestore(); }
    });
  }

  it("does no custom spring work when the material implementation is unavailable", async () => {
    const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
    Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => false } });
    const { unmount } = render(<ThemeProvider glass><Switch testID="switch">Enabled</Switch><Slider accessibilityLabel="Volume" /></ThemeProvider>);
    await act(async () => {});
    const spring = spyOn(Animated, "spring");
    try {
      fireEvent.click(screen.getByRole("switch"));
      fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
      expect(spring).not.toHaveBeenCalled();
      expect(readFrame("switch-thumb-motion")).toEqual({ x: 22, y: 2, width: 20, height: 20 });
    } finally {
      unmount(); spring.mockRestore();
      if (css) Object.defineProperty(globalThis, "CSS", css);
    }
  });

  it("moves a controlled Switch only when its owner accepts the change, then cancels into solid", async () => {
    const calls: boolean[] = [];
    const control = (checked: boolean, glass: boolean) => <ThemeProvider glass={glass} solid={!glass}><Switch checked={checked} onChange={(next) => calls.push(next)} testID="switch">Enabled</Switch></ThemeProvider>;
    const { rerender, unmount } = render(control(false, true));
    await act(async () => {});
    const host = screen.getByRole("switch");
    act(() => host.focus());
    const clock = animationClock();
    try {
      const resting = readFrame("switch-thumb-motion");
      fireEvent.click(host);
      expect(calls).toEqual([true]);
      expect(host.getAttribute("aria-checked")).toBe("false");
      expect(readFrame("switch-thumb-motion")).toEqual(resting);
      rerender(control(true, true));
      clock.advance(80);
      const moving = readFrame("switch-thumb-motion");
      expect(moving.width).toBeGreaterThan(resting.width);
      expect(moving.x).toBeGreaterThan(resting.x);
      rerender(control(true, false));
      expect(screen.getByRole("switch")).toBe(host);
      expect(document.activeElement).toBe(host);
      expect(host.getAttribute("aria-checked")).toBe("true");
      expect(readFrame("switch-thumb-motion")).toEqual({ x: 22, y: 2, width: 20, height: 20 });
      clock.advance(1600);
      expect(readFrame("switch-thumb-motion")).toEqual({ x: 22, y: 2, width: 20, height: 20 });
    } finally { unmount(); clock.restore(); }
  });

  it("keeps a controlled Slider value and thumb geometry authoritative through keyboard input and mode changes", async () => {
    const calls: number[] = [];
    const control = (value: number, glass: boolean) => <ThemeProvider glass={glass} solid={!glass}><Slider value={value} onChange={(next) => calls.push(next)} testID="slider" accessibilityLabel="Volume" /></ThemeProvider>;
    const { rerender } = render(control(20, true));
    await act(async () => {});
    const host = screen.getByRole("slider");
    layoutElement(host, { width: 220, height: 40 });
    act(() => host.focus());
    fireEvent.keyDown(host, { key: "ArrowRight" });
    expect(calls).toEqual([21]);
    expect(host.getAttribute("aria-valuenow")).toBe("20");
    const before = readFrame("slider-thumb-motion");
    rerender(control(80, true));
    expect(readFrame("slider-thumb-motion").x).toBeGreaterThan(before.x);
    rerender(control(80, false));
    expect(screen.getByRole("slider")).toBe(host);
    expect(document.activeElement).toBe(host);
    expect(host.getAttribute("aria-valuenow")).toBe("80");
    expect(readFrame("slider-thumb-motion").width).toBe(before.width);
  });
});
