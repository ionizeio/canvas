import { Animated, Easing } from "react-native";
import { supportsNativeDriver, thereAndBack, holdThen } from "../../style/motion.js";

// The Backdrop's animation clock: a small set of general-purpose looping channels
// that a scene binds its layers to. Every Animated.Value lives at MODULE scope and
// loops forever, so two Backdrops running at the same energy share one phase. That
// is what makes a backdrop CONTINUE across page changes, tab switches and
// back-swipes instead of restarting: the phase is global, so a newly mounted
// surface renders the exact frame the previous one was showing.
//
// Clocks are keyed by energy, because energy is the only prop that changes a RATE.
// Two backdrops at the same energy share values (continuity); two at different
// energies get independent clocks, which is correct rather than a bug.
//
// Two Animated quirks are encoded here and must not be "cleaned up":
//   - Animated.loop resets a value to its CONSTRUCTOR value before every iteration
//     (including the first), so all values are constructed at 0; pre-phase and
//     poster states go through setValue.
//   - A stopped loop composite cannot be restarted (isFinished latches), so
//     composites are REBUILT on every start. Building is cheap.
//
// Every loop runs on the native driver where the platform has one and on the JS driver
// on web (`supportsNativeDriver`, src/style/motion.ts). This is not an optimisation but
// the whole frame budget: under the New Architecture a JS-driven frame is a shadow-tree
// commit per animated view, so the old JS-driven clock saturated the JS thread of an
// IDLE screen (150% CPU, rAF near 3 frames per second on the iPhone 17 Pro simulator;
// tools/native/liquid-motion.md). Natively driven, the timings, interpolations and
// multiplies all live in the native animated module and the JS thread is idle between
// frames. The native driver cannot loop an `Animated.sequence` or run `Animated.delay`,
// so every channel is ONE looping timing whose easing carries the cycle's shape: a
// linear ramp, an out-and-back (`thereAndBack`) or a hold then a sweep (`holdThen`).

export type Energy = "calm" | "default" | "energetic";

/** Master flight period per energy, in ms. */
const FLIGHT_PERIOD: Record<Energy, number> = {
  calm: 44000,
  default: 32000,
  energetic: 20000,
};

/** The shimmer half-period per energy, in ms. */
const TWINKLE_HALF: Record<Energy, number> = {
  calm: 4600,
  default: 3500,
  energetic: 2400,
};

/** One body's full flare cycle per energy, in ms. Renderers spread a field across
 *  this cycle in phase buckets, so the sky sees a flare roughly every
 *  period/buckets rather than every period. */
const SCINTILLATE_PERIOD: Record<Energy, number> = {
  calm: 6400,
  default: 4600,
  energetic: 3200,
};

export interface BackdropClock {
  /** Master 0..1 ramp over the flight period. Layers derive staggered sawtooth
   *  phases from it, so every layer stays locked to one timeline. */
  flight: Animated.Value;
  /** Shimmer, 0..1..0. Pulse, breathe, anything that swells and settles as one. */
  twinkle: Animated.Value;
  /** Scintillation ramp, a linear 0..1 SAWTOOTH at the flare period. The sawtooth
   *  is the point: it can be phase-shifted per body (see the renderer's buckets)
   *  so flares land at unrelated moments across the field, which a ping-pong
   *  cannot do without a discontinuity at the turn. */
  scintillate: Animated.Value;
  /** Very slow 0..1 ramp (180s). Rotation, hue drift, anything near-static. */
  drift: Animated.Value;
  /** Medium 0..1..0 breath (11s). Scale and opacity swells. */
  breath: Animated.Value;
  /** Rare event cycle: parked, then a sweep. Comets, meteors, flashes. */
  event: Animated.Value;
}

/** A started loop, which is all the clock needs to hold. */
interface Loop {
  stop: () => void;
}

interface Entry {
  clock: BackdropClock;
  mode: "running" | "poster" | null;
  count: number;
  running: Loop[];
  /** The master phase survives stops, so toggling a backdrop off and back on
   *  resumes where it left off rather than restarting. */
  phase: number;
  /** Wall-clock start of the current run, for capturing the phase on stop. A natively
   *  driven value cannot report its live position to JS, so the phase is bookkept
   *  from the timing's own wall clock instead. */
  startedAt: number;
}

const entries = new Map<Energy, Entry>();

function makeClock(): BackdropClock {
  return {
    flight: new Animated.Value(0),
    twinkle: new Animated.Value(0),
    scintillate: new Animated.Value(0),
    drift: new Animated.Value(0),
    breath: new Animated.Value(0),
    event: new Animated.Value(0),
  };
}

function entryFor(energy: Energy): Entry {
  let e = entries.get(energy);
  if (!e) {
    e = { clock: makeClock(), mode: null, count: 0, running: [], phase: 0, startedAt: 0 };
    entries.set(energy, e);
  }
  return e;
}

/** Read a clock without retaining it (renderers bind interpolations to these). */
export function backdropClock(energy: Energy): BackdropClock {
  return entryFor(energy).clock;
}

const timing = (v: Animated.Value, duration: number, easing: (t: number) => number) =>
  Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: supportsNativeDriver });

/** One looping timing 0..1 over `period`, shaped by `easing`; the loop restarts from the
 *  constructor value 0. Every easing used here returns to a seam-free value at t=1 (0 for
 *  an out-and-back, 1 for a ramp whose consumers wrap), so the restart is invisible. */
function cycle(v: Animated.Value, period: number, easing: (t: number) => number): Loop {
  v.setValue(0);
  const loop = Animated.loop(timing(v, period, easing));
  loop.start();
  return loop;
}

// Resume a linear 0..1 loop from `phase`: a head timing runs phase -> 1 at the loop's
// speed, then the loop owns the full passes from 0. The head's completion is the one JS
// callback in the run; a stopped head reports finished:false and hands nothing on.
function linLoop(v: Animated.Value, period: number, phase: number): Loop {
  if (phase <= 0) return cycle(v, period, Easing.linear);
  v.setValue(phase);
  let current: Animated.CompositeAnimation = timing(v, Math.round(period * (1 - phase)), Easing.linear);
  current.start(({ finished }) => {
    if (!finished) return;
    v.setValue(0);
    current = Animated.loop(timing(v, period, Easing.linear));
    current.start();
  });
  return { stop: () => current.stop() };
}

const breatheEasing = thereAndBack(Easing.inOut(Easing.ease));

/** The rare-event cycle: parked for 80% of a flight, then one eased sweep 0..1 over the
 *  next 22%, so the sweep never lands at the same flight phase twice in a row. */
const EVENT_HOLD = 0.8;
const EVENT_SWEEP = 0.22;
const eventEasing = holdThen(EVENT_HOLD / (EVENT_HOLD + EVENT_SWEEP), Easing.inOut(Easing.ease));

function startAll(e: Entry, energy: Energy) {
  const flight = FLIGHT_PERIOD[energy];
  e.startedAt = Date.now();
  e.running = [
    linLoop(e.clock.flight, flight, e.phase),
    cycle(e.clock.twinkle, TWINKLE_HALF[energy] * 2, breatheEasing),
    cycle(e.clock.scintillate, SCINTILLATE_PERIOD[energy], Easing.linear),
    cycle(e.clock.drift, 180000, Easing.linear),
    cycle(e.clock.breath, 11000, breatheEasing),
    cycle(e.clock.event, Math.round(flight * (EVENT_HOLD + EVENT_SWEEP)), eventEasing),
  ];
}

function stopAll(e: Entry, energy: Energy) {
  if (e.running.length > 0) {
    // Capture the live flight phase from the run's wall clock: the timing is linear and
    // wall-clock paced on both drivers, so this is the value the loop is showing.
    e.phase = (e.phase + (Date.now() - e.startedAt) / FLIGHT_PERIOD[energy]) % 1;
  }
  e.running.forEach((a) => a.stop());
  e.running = [];
}

// The composed poster still for Reduce Motion: layers graduated mid-flight (each
// sawtooth offset spreads the single 0.35), sky at mid-shimmer, slow channels at
// rest, the rare event parked offscreen.
function poster(e: Entry, energy: Energy) {
  stopAll(e, energy);
  e.clock.flight.setValue(0.35);
  e.clock.twinkle.setValue(0.5);
  // Mid-ramp, not zero: the bucket offsets fan out from here, so the still frame
  // catches one bucket near its peak and the rest strung down the falloff, which
  // is a sky with bright and faint stars rather than one flat field.
  e.clock.scintillate.setValue(0.5);
  e.clock.drift.setValue(0);
  e.clock.breath.setValue(0.5);
  e.clock.event.setValue(0);
}

/** Bind a Backdrop to its clock. Idempotent per mode; refcounted per energy. */
export function retainBackdropClock(energy: Energy, want: "running" | "poster"): void {
  const e = entryFor(energy);
  e.count++;
  if (e.mode === want) return;
  e.mode = want;
  if (want === "running") {
    stopAll(e, energy);
    startAll(e, energy);
  } else {
    poster(e, energy);
  }
}

/** Release a Backdrop; the last release stops every timer for that energy,
 *  capturing the flight phase for the next retain. */
export function releaseBackdropClock(energy: Energy): void {
  const e = entries.get(energy);
  if (!e) return;
  e.count = Math.max(0, e.count - 1);
  if (e.count === 0) {
    stopAll(e, energy);
    e.mode = null;
  }
}

/** Test seam: drop every clock so a suite starts from a known state. */
export function resetBackdropClocks(): void {
  entries.forEach((e, energy) => stopAll(e, energy));
  entries.clear();
}
