import { describe, it, expect } from "bun:test";
import { Easing } from "react-native";
import { supportsNativeDriver, thereAndBack, holdThen, keyframes } from "../src/style/motion.ts";

describe("supportsNativeDriver", () => {
  it("is a boolean gate (RNW can't run the native driver; native can)", () => {
    expect(typeof supportsNativeDriver).toBe("boolean");
  });
});

// The cycle shapers exist so a loop can be ONE Animated.timing on the native driver:
// React Native refuses an Animated.sequence inside a native loop and Animated.delay
// hardcodes the JS driver. Each returns to a seam-free value at t=1, which is what
// lets Animated.loop restart it without a visible jump on either driver.
describe("thereAndBack", () => {
  const io = Easing.inOut(Easing.ease);
  const shape = thereAndBack(io);

  it("rises to the easing's end at mid-cycle and returns to 0 at the end", () => {
    expect(shape(0)).toBe(0);
    expect(shape(0.5)).toBeCloseTo(1, 6);
    expect(shape(1)).toBe(0);
  });

  it("mirrors the second half exactly, like the two-step sequence it replaces", () => {
    for (const t of [0.1, 0.2, 0.3, 0.4]) {
      expect(shape(0.5 + t)).toBeCloseTo(shape(0.5 - t), 6);
      // The first half IS the easing over twice the time, the second the same run back.
      expect(shape(t)).toBeCloseTo(io(t * 2), 6);
    }
  });
});

describe("holdThen", () => {
  const shape = holdThen(0.8, Easing.linear);

  it("parks at 0 for the hold, then sweeps to 1 by the end", () => {
    expect(shape(0)).toBe(0);
    expect(shape(0.5)).toBe(0);
    expect(shape(0.8)).toBe(0);
    expect(shape(0.9)).toBeCloseTo(0.5, 6);
    expect(shape(1)).toBe(1);
  });

  it("degrades to a flat 0 when the hold is the whole cycle", () => {
    expect(holdThen(1, Easing.linear)(1)).toBe(0);
  });
});

describe("keyframes", () => {
  // The caret blink: visible, a quick fade out, hidden, a quick fade in.
  const blink = keyframes([
    [0, 0],
    [0.38, 0],
    [0.5, 1],
    [0.88, 1],
    [1, 0],
  ]);

  it("holds each plateau and joins them with straight segments", () => {
    expect(blink(0)).toBe(0);
    expect(blink(0.2)).toBe(0);
    expect(blink(0.44)).toBeCloseTo(0.5, 6);
    expect(blink(0.7)).toBe(1);
    expect(blink(0.94)).toBeCloseTo(0.5, 6);
    expect(blink(1)).toBe(0);
  });

  it("clamps outside the keyframe range", () => {
    expect(blink(-1)).toBe(0);
    expect(blink(2)).toBe(0);
  });
});
