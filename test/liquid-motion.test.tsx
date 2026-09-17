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

function Probe({ layout, enabled = true, pressed = false, profile = "selection", resetKey, testID = "frame", onCommit }: {
  layout: LayoutRectangle; enabled?: boolean; pressed?: boolean; profile?: LiquidMotionProfile; resetKey?: string | number; testID?: string; onCommit?: () => void;
}) {
  const frame = useLiquidMotion(layout, { enabled, pressed, profile, resetKey });
  useLayoutEffect(() => { onCommit?.(); });
  return <Animated.View testID={testID} style={[{ position: "absolute", pointerEvents: "none" }, frame]} />;
}
const readFrame = (id = "frame") => {
  const { style } = screen.getByTestId(id);
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
};
const start = { x: 3, y: 3, width: 40, height: 28 };

describe("scoped liquid bounds motion", () => {
  it("transposes stretch, recoil and lift for vertical travel without changing horizontal feel", async () => {
    const horizontal = { x: 3, y: 3, width: 72, height: 36 };
    const vertical = { x: 3, y: 3, width: 36, height: 72 };
    const pair = (moving: boolean) => <>
      <Probe testID="horizontal" layout={{ ...horizontal, x: moving ? 75 : 3 }} />
      <Probe testID="vertical" layout={{ ...vertical, y: moving ? 75 : 3 }} />
    </>;
    const { rerender, unmount } = render(pair(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(pair(true));
      clock.advance(80);
      const compare = () => {
        const across = readFrame("horizontal");
        const down = readFrame("vertical");
        expect(down.x).toBeCloseTo(across.y, 4);
        expect(down.y).toBeCloseTo(across.x, 4);
        expect(down.width).toBeCloseTo(across.height, 4);
        expect(down.height).toBeCloseTo(across.width, 4);
      };
      compare();
      expect(readFrame("vertical").height).toBeGreaterThan(vertical.height * 1.15);
      expect(readFrame("vertical").x).toBeLessThan(0);
      clock.advance(240);
      compare();
      expect(readFrame("vertical").height).toBeLessThan(vertical.height);
      clock.advance(1200);
      expect(readFrame("vertical")).toEqual({ ...vertical, y: 75 });
      expect(readFrame("horizontal")).toEqual({ ...horizontal, x: 75 });
    } finally { unmount(); clock.restore(); }
  });

  it("shares diagonal deformation across both axes and settles without rotating the host", async () => {
    const square = { x: 3, y: 3, width: 40, height: 40 };
    const { rerender, unmount } = render(<Probe layout={square} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe layout={{ ...square, x: 83, y: 83 }} />);
      clock.advance(80);
      const airborne = readFrame();
      expect(airborne.width).toBeGreaterThan(square.width);
      expect(airborne.width).toBeCloseTo(airborne.height, 4);
      expect(airborne.x).toBeCloseTo(airborne.y, 4);
      expect(screen.getByTestId("frame").style.transform).toBe("");
      clock.advance(1600);
      expect(readFrame()).toEqual({ ...square, x: 83, y: 83 });
    } finally { unmount(); clock.restore(); }
  });

  it("retargets an in-flight horizontal selection vertically without a shape or position snap", async () => {
    const { rerender, unmount } = render(<Probe layout={start} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe layout={{ ...start, x: 100 }} />);
      clock.advance(80);
      const before = readFrame();
      const target = { x: 100, y: 120, width: 60, height: 32 };
      rerender(<Probe layout={target} />);
      const after = readFrame();
      for (const axis of ["x", "y", "width", "height"] as const) expect(after[axis]).toBeCloseTo(before[axis], 4);
      clock.advance(80);
      const turning = readFrame();
      expect(turning.y).toBeGreaterThan(before.y);
      expect(turning.width).toBeGreaterThan(0);
      expect(turning.height).toBeGreaterThan(0);
      clock.advance(1600);
      expect(readFrame()).toEqual(target);
    } finally { unmount(); clock.restore(); }
  });

  it("resizes in place without introducing a travel impulse or lift", async () => {
    const { rerender, unmount } = render(<Probe layout={start} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe layout={{ ...start, width: 80 }} />);
      clock.advance(80);
      const resized = readFrame();
      expect(resized.width).toBeGreaterThan(start.width);
      expect(resized.width).toBeLessThan(80);
      expect(resized.x).toBeCloseTo(start.x, 4);
      expect(resized.y).toBe(start.y);
      expect(resized.height).toBe(start.height);
      clock.advance(1600);
      expect(readFrame()).toEqual({ ...start, width: 80 });
    } finally { unmount(); clock.restore(); }
  });

  it("cancels into structural relayout bounds then resumes motion on the next selection", async () => {
    const { rerender, unmount } = render(<Probe layout={start} resetKey={0} />);
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(<Probe layout={{ ...start, x: 100 }} resetKey={0} />);
      clock.advance(80);
      const reflow = { x: 30, y: 45, width: 96, height: 18 };
      rerender(<Probe layout={reflow} resetKey={1} />);
      expect(readFrame()).toEqual(reflow);
      clock.advance(400);
      expect(readFrame()).toEqual(reflow);
      const target = { ...reflow, y: 100 };
      rerender(<Probe layout={target} resetKey={1} />);
      clock.advance(80);
      expect(readFrame().height).toBeGreaterThan(reflow.height);
      clock.advance(1600);
      expect(readFrame()).toEqual(target);
    } finally { unmount(); clock.restore(); }
  });

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
