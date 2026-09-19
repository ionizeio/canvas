import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup, act } from "@testing-library/react";
import { Animated, Easing } from "react-native";
import { createLoopChannel, trackAt, trackValueAt, trackSamples, LoopView, type LoopChannel } from "../src/style/loop.tsx";
import { createNativeLoop } from "../src/style/loop-native.ts";
import { thereAndBack } from "../src/style/motion.ts";

// The loop primitive is what keeps decorative motion off the JavaScript thread on
// every platform: a natively driven interpolation graph on iOS and Android, a CSS
// keyframe animation on the web. Under bun test react-native is react-native-web, so
// LoopView renders its web branch here (the class-backed animation, the inline delay,
// the parked numbers); the native engine is tested through its own module with the
// synchronous AnimatedMock react-native-web installs.

afterEach(cleanup);

const wrapper = (c: HTMLElement) => c.firstElementChild as HTMLElement;

describe("tracks", () => {
  it("interpolates piecewise-linearly and clamps at the ends, the way Animated does", () => {
    const track = { inputRange: [0, 0.5, 1], outputRange: [0, 1, 0.25] };
    expect(trackAt(track, 0.25)).toBe(0.5);
    expect(trackAt(track, 0.75)).toBe(0.625);
    expect(trackAt(track, -1)).toBe(0);
    expect(trackAt(track, 2)).toBe(0.25);
  });

  it("reads a linear channel at the track's offset, wrapping as a sawtooth", () => {
    const channel = createLoopChannel({ period: 1000 });
    const track = { channel, inputRange: [0, 1], outputRange: [0, 1], offset: 0.25 };
    expect(trackValueAt(track, 0)).toBeCloseTo(0.25);
    expect(trackValueAt(track, 0.5)).toBeCloseTo(0.75);
    expect(trackValueAt(track, 0.9)).toBeCloseTo(0.15);
  });

  it("reads a shaped channel through its sampled shape", () => {
    const channel = createLoopChannel({ period: 1000, shape: thereAndBack(Easing.linear), samples: 4 });
    expect(channel.shape).toEqual({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 0.5, 1, 0.5, 0] });
    const track = { channel, inputRange: [0, 1], outputRange: [1, 0.5] };
    expect(trackValueAt(track, 0)).toBe(1);
    expect(trackValueAt(track, 0.5)).toBe(0.5);
    expect(trackValueAt(track, 0.25)).toBe(0.75);
  });

  it("samples a linear channel at the track's own breakpoints, exactly", () => {
    const channel = createLoopChannel({ period: 1000 });
    const samples = trackSamples({ channel, inputRange: [0, 0.12, 0.78, 0.95, 1], outputRange: [0, 1, 1, 0, 0] });
    expect(samples.map((s) => s.at)).toEqual([0, 0.12, 0.78, 0.95, 1]);
    expect(samples.map((s) => s.value)).toEqual([0, 0.12, 0.78, 0.95, 1]);
  });
});

describe("a loop channel", () => {
  let now = 1_000_000;
  const clock = () => spyOn(Date, "now").mockImplementation(() => now);

  it("plays from the wall clock and reports its position", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 4000 });
      expect(channel.state().playing).toBe(false);
      channel.play();
      expect(channel.state()).toEqual({ playing: true, epoch: now, phase: 0 });
      now += 1000;
      expect(channel.position()).toBeCloseTo(0.25);
      now += 4000;
      expect(channel.position()).toBeCloseTo(0.25);
    } finally {
      spy.mockRestore();
    }
  });

  it("resumes from where it stopped, and a park does not overwrite that phase", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 4000 });
      channel.play();
      now += 2000;
      channel.stop();
      expect(channel.state()).toEqual({ playing: false, epoch: 0, phase: 0.5 });
      // A poster still holds the channel at its own phase; the run's phase survives.
      channel.park(0.35);
      expect(channel.state()).toEqual({ playing: false, epoch: 0, phase: 0.35 });
      expect(channel.position()).toBe(0.35);
      channel.play();
      expect(channel.position()).toBeCloseTo(0.5);
      expect(channel.state().epoch).toBe(now - 2000);
    } finally {
      spy.mockRestore();
    }
  });

  it("starts where it is told, wrapping the cycle", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 1000 });
      channel.play(1.25);
      expect(channel.position()).toBeCloseTo(0.25);
    } finally {
      spy.mockRestore();
    }
  });

  it("tells its subscribers about every play, park and stop", () => {
    const channel = createLoopChannel({ period: 1000 });
    let notified = 0;
    const off = channel.subscribe(() => notified++);
    channel.play();
    channel.park(0.2);
    channel.play();
    channel.stop();
    channel.stop();
    expect(notified).toBe(4);
    off();
    channel.play();
    expect(notified).toBe(4);
  });
});

describe("LoopView on the web", () => {
  let now = 5_000_000;
  const clock = () => spyOn(Date, "now").mockImplementation(() => now);

  function Star({ channel, offset = 0 }: { channel: LoopChannel; offset?: number }) {
    return (
      <LoopView
        style={{ width: 10, height: 10 }}
        opacity={{ channel, inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2], offset }}
        scale={{ channel, inputRange: [0, 1], outputRange: [0.5, 2], offset }}
        rotate={14}
      />
    );
  }

  it("renders a parked channel as plain numbers with no animation", () => {
    const channel = createLoopChannel({ period: 2000 });
    channel.park(0.25);
    const { container } = render(<Star channel={channel} />);
    const node = wrapper(container);
    expect(Number(node.style.opacity)).toBeCloseTo(0.6);
    expect(node.style.transform).toBe("rotate(14deg) scale(0.875)");
    expect(node.style.animationDelay).toBe("");
    expect(node.className).not.toMatch(/animationKeyframes/);
  });

  it("renders a playing channel as a compiled keyframe animation with the phase in the delay", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 2000 });
      channel.play();
      now += 500;
      const { container } = render(<Star channel={channel} offset={0.25} />);
      const node = wrapper(container);
      // The opacity and the transform are two animations on one element: two names,
      // two durations, two delays, the offset folded into the delay (500 ms elapsed plus
      // a quarter cycle ahead is one second into a two-second cycle).
      expect(node.className).toMatch(/animationKeyframes/);
      expect(node.className).toMatch(/animationDuration/);
      expect(node.style.animationDelay).toBe("-1000ms, -1000ms");
      expect(node.style.opacity).toBe("");
      expect(node.style.transform).toBe("");
      // The rule reached the document: one @keyframes per property at the track's own
      // breakpoints.
      const css = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join("\n");
      expect(css).toContain("@keyframes");
      expect(css).toMatch(/50\.0000%\s*\{\s*opacity:\s*1/);
      expect(css).toMatch(/100\.0000%\s*\{\s*transform:\s*rotate\(14deg\) scale\(2\)/);
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the delay it mounted with across re-renders, and takes a new one on a new play", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 2000 });
      channel.play();
      const { container, rerender } = render(<Star channel={channel} />);
      const node = wrapper(container);
      expect(node.style.animationDelay).toBe("0ms, 0ms");
      // A re-render a second later must not hand the browser a fresh reading: that
      // would restart the timing and skip. The running animation already carries time.
      now += 1000;
      rerender(<Star channel={channel} />);
      expect(node.style.animationDelay).toBe("0ms, 0ms");
      // A new play while playing re-phases the channel. The running animation would
      // read a new delay against the start time it already has and land late by its own
      // age, so the view remounts: a new node, a new animation, the delay for now.
      act(() => channel.play(0.75));
      const replaced = wrapper(container);
      expect(replaced).not.toBe(node);
      expect(node.isConnected).toBe(false);
      expect(replaced.style.animationDelay).toBe("-1500ms, -1500ms");
    } finally {
      spy.mockRestore();
    }
  });

  it("follows the channel from playing to parked without remounting", () => {
    const spy = clock();
    try {
      const channel = createLoopChannel({ period: 2000 });
      channel.play();
      const { container } = render(<Star channel={channel} />);
      const node = wrapper(container);
      expect(node.className).toMatch(/animationKeyframes/);
      act(() => channel.park(0.5));
      expect(node.className).not.toMatch(/animationKeyframes/);
      expect(node.style.opacity).toBe("1");
      expect(node.style.transform).toBe("rotate(14deg) scale(1.25)");
    } finally {
      spy.mockRestore();
    }
  });

  it("shares one compiled rule between views on the same track", () => {
    const channel = createLoopChannel({ period: 2000 });
    channel.play();
    const { container } = render(<><Star channel={channel} offset={0} /><Star channel={channel} offset={0.5} /></>);
    const [a, b] = [...container.children] as HTMLElement[];
    expect(a!.className).toBe(b!.className);
    expect(a!.style.animationDelay).not.toBe(b!.style.animationDelay);
  });
});

describe("the native loop engine", () => {
  // react-native-web installs AnimatedMock under test, so every timing completes the
  // moment it starts; the engine is observed through the timings it asks for.
  const durations = (calls: Array<unknown[]>, value: Animated.Value) =>
    calls.filter((args) => args[0] === value).map((args) => (args[1] as { duration: number }).duration);
  const valueOf = (v: Animated.Value): number => (v as unknown as { __getValue: () => number }).__getValue();

  it("loops the full period from the top of the cycle", () => {
    const timing = spyOn(Animated, "timing");
    try {
      const loop = createNativeLoop(32000);
      loop.play(0);
      expect(durations(timing.mock.calls, loop.phase)).toEqual([32000]);
      loop.stop();
    } finally {
      timing.mockRestore();
    }
  });

  it("resumes through a head timing that covers the rest of the cycle, then loops", () => {
    const timing = spyOn(Animated, "timing");
    try {
      const loop = createNativeLoop(32000);
      loop.play(0.25);
      expect(durations(timing.mock.calls, loop.phase)).toEqual([24000, 32000]);
      loop.stop();
    } finally {
      timing.mockRestore();
    }
  });

  it("holds the phase value still when parked", () => {
    const loop = createNativeLoop(1000);
    loop.hold(0.35);
    expect(valueOf(loop.phase)).toBe(0.35);
  });
});
