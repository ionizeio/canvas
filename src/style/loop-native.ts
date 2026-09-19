import { Animated, Easing } from "react-native";
import { supportsNativeDriver } from "./motion.js";

// The native half of a loop channel (src/style/loop.tsx): one Animated.Value that
// ramps 0..1 over the period on the native driver and restarts forever. Every shape a
// channel carries (an out-and-back, a hold then a sweep) is an interpolation OF this
// linear phase rather than the timing's easing, so the resume head below is always the
// same linear timing and the sampled shape table is shared with the web keyframes.
//
// Two Animated facts this leans on, so do not "clean them up":
//   - Animated.loop resets the value to its CONSTRUCTOR value before every iteration,
//     the first included, so the phase value is constructed at 0 and every start goes
//     through setValue.
//   - A stopped composite cannot be restarted (isFinished latches), so the loop is
//     rebuilt on every start. Building one is cheap.
//
// Resuming from a phase: a head timing runs phase -> 1 at the loop's speed, and its
// completion (the one JS callback in a run) starts the full loop from 0. A natively
// driven value cannot report its position to JS, which is why the channel bookkeeps
// the phase from the wall clock instead of reading it back.

export interface NativeLoop {
  /** The linear cycle position, 0..1, advancing on the native driver while playing. */
  readonly phase: Animated.Value;
  /** Start (or restart) the loop from `phase` (0..1 of the cycle). */
  play(phase: number): void;
  /** Stop the loop, leaving the value where it is. */
  stop(): void;
  /** Hold the value at `phase` with nothing running. */
  hold(phase: number): void;
}

const timing = (value: Animated.Value, duration: number) =>
  Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: supportsNativeDriver });

export function createNativeLoop(period: number): NativeLoop {
  const phase = new Animated.Value(0);
  let running: Animated.CompositeAnimation | null = null;

  const stop = () => {
    running?.stop();
    running = null;
  };

  const loopFromZero = () => {
    phase.setValue(0);
    running = Animated.loop(timing(phase, period));
    running.start();
  };

  return {
    phase,
    play(at) {
      stop();
      if (at <= 0 || at >= 1) {
        loopFromZero();
        return;
      }
      phase.setValue(at);
      const head = timing(phase, Math.round(period * (1 - at)));
      running = head;
      head.start(({ finished }) => {
        // A stopped head reports finished:false and hands nothing on.
        if (!finished || running !== head) return;
        loopFromZero();
      });
    },
    stop,
    hold(at) {
      stop();
      phase.setValue(at);
    },
  };
}
