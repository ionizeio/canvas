import { spyOn } from "bun:test";
import { act } from "@testing-library/react";
import { Animated } from "react-native";

// Drive RN's real springs through their frame callbacks. This tests the painted
// bounds without replacing Animated.spring with a mock that jumps to its target.
export function animationClock() {
  // RNW selects AnimatedMock under NODE_ENV=test. Opt this scope back into
  // the production engine, and restore both methods before another test runs.
  const engine = require("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation").default as typeof Animated;
  const spring = spyOn(Animated, "spring").mockImplementation(engine.spring);
  const parallel = spyOn(Animated, "parallel").mockImplementation(engine.parallel);
  let now = Date.now();
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const time = spyOn(Date, "now").mockImplementation(() => now);
  const raf = spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  const cancel = spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
  return {
    advance(milliseconds: number) {
      for (let elapsed = 0; elapsed < milliseconds; elapsed += 16) {
        act(() => {
          now += 16;
          const callbacks = [...frames.values()];
          frames.clear();
          callbacks.forEach((callback) => callback(now));
        });
      }
    },
    restore() { time.mockRestore(); raf.mockRestore(); cancel.mockRestore(); spring.mockRestore(); parallel.mockRestore(); },
  };
}
