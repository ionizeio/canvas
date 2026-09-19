import { Easing } from "react-native";
import { createLoopChannel, thereAndBack, holdThen, type LoopChannel } from "../../style/index.js";

// The Backdrop's animation clock: a small set of general-purpose looping channels
// that a scene binds its layers to through `LoopView` (src/style/loop.tsx). Every
// channel lives at MODULE scope and loops forever, so two Backdrops running at the
// same energy share one phase. That is what makes a backdrop CONTINUE across page
// changes, tab switches and back-swipes instead of restarting: the phase is global,
// so a newly mounted surface renders the exact frame the previous one was showing.
//
// Clocks are keyed by energy, because energy is the only prop that changes a RATE.
// Two backdrops at the same energy share channels (continuity); two at different
// energies get independent clocks, which is correct rather than a bug.
//
// Where the frames come from is the loop primitive's business, and it is the whole
// frame budget: on iOS and Android each channel is one natively driven timing and every
// binding an interpolation of it, so the JS thread is idle between frames (the old
// JS-driven clock saturated it: 150% CPU, rAF near 3 frames per second on the iPhone 17
// Pro simulator); on the web each binding is a compositor-run CSS keyframe animation,
// so the sky costs no JavaScript and no DOM writes per frame at all (the old clock drove
// one React commit and about forty inline style writes per frame there, enough to
// saturate an idle page's main thread in an unthrottled browser). The evidence for
// both is in tools/native/liquid-motion.md.

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

/** The slow channels' periods, shared by every energy. */
const DRIFT_PERIOD = 180000;
const BREATH_PERIOD = 11000;

/** The rare-event cycle: parked for 80% of a flight, then one eased sweep 0..1 over the
 *  next 22%, so the sweep never lands at the same flight phase twice in a row. */
const EVENT_HOLD = 0.8;
const EVENT_SWEEP = 0.22;

/** Sample points per cycle for the shaped channels. The event's hold-to-sweep corner is
 *  the one sharp feature, so it gets the denser grid. */
const BREATH_SAMPLES = 64;
const EVENT_SAMPLES = 160;

export interface BackdropClock {
  /** Master 0..1 ramp over the flight period. Layers derive staggered sawtooth
   *  phases from it (a track's `offset`), so every layer stays locked to one timeline. */
  flight: LoopChannel;
  /** Shimmer, 0..1..0. Pulse, breathe, anything that swells and settles as one. */
  twinkle: LoopChannel;
  /** Scintillation ramp, a linear 0..1 SAWTOOTH at the flare period. The sawtooth
   *  is the point: it can be phase-shifted per body (see the renderer's buckets)
   *  so flares land at unrelated moments across the field, which a ping-pong
   *  cannot do without a discontinuity at the turn. */
  scintillate: LoopChannel;
  /** Very slow 0..1 ramp (180s). Rotation, hue drift, anything near-static. */
  drift: LoopChannel;
  /** Medium 0..1..0 breath (11s). Scale and opacity swells. */
  breath: LoopChannel;
  /** Rare event cycle: parked, then a sweep. Comets, meteors, flashes. */
  event: LoopChannel;
}

interface Entry {
  clock: BackdropClock;
  mode: "running" | "poster" | null;
  count: number;
}

const entries = new Map<Energy, Entry>();

const breathe = thereAndBack(Easing.inOut(Easing.ease));
const eventShape = holdThen(EVENT_HOLD / (EVENT_HOLD + EVENT_SWEEP), Easing.inOut(Easing.ease));

function makeClock(energy: Energy): BackdropClock {
  const flight = FLIGHT_PERIOD[energy];
  return {
    flight: createLoopChannel({ period: flight }),
    twinkle: createLoopChannel({ period: TWINKLE_HALF[energy] * 2, shape: breathe, samples: BREATH_SAMPLES }),
    scintillate: createLoopChannel({ period: SCINTILLATE_PERIOD[energy] }),
    drift: createLoopChannel({ period: DRIFT_PERIOD }),
    breath: createLoopChannel({ period: BREATH_PERIOD, shape: breathe, samples: BREATH_SAMPLES }),
    event: createLoopChannel({ period: Math.round(flight * (EVENT_HOLD + EVENT_SWEEP)), shape: eventShape, samples: EVENT_SAMPLES }),
  };
}

function entryFor(energy: Energy): Entry {
  let e = entries.get(energy);
  if (!e) {
    e = { clock: makeClock(energy), mode: null, count: 0 };
    entries.set(energy, e);
  }
  return e;
}

const channels = (clock: BackdropClock): LoopChannel[] => [clock.flight, clock.twinkle, clock.scintillate, clock.drift, clock.breath, clock.event];

/** Read a clock without retaining it (renderers bind tracks to these). */
export function backdropClock(energy: Energy): BackdropClock {
  return entryFor(energy).clock;
}

// Every channel resumes from where it last stopped, so toggling a backdrop off and
// back on continues mid-flight rather than restarting; the first run starts at the top.
function startAll(e: Entry) {
  channels(e.clock).forEach((channel) => channel.play());
}

function stopAll(e: Entry) {
  channels(e.clock).forEach((channel) => channel.stop());
}

// The composed poster still for Reduce Motion: layers graduated mid-flight (each
// sawtooth offset spreads the single 0.35), sky at mid-shimmer, slow channels at
// rest, the rare event parked offscreen. Poster positions are cycle PHASES: the
// shimmer's quarter cycle is its mid-swell on the out-and-back.
function poster(e: Entry) {
  e.clock.flight.park(0.35);
  e.clock.twinkle.park(0.25);
  // Mid-ramp, not zero: the bucket offsets fan out from here, so the still frame
  // catches one bucket near its peak and the rest strung down the falloff, which
  // is a sky with bright and faint stars rather than one flat field.
  e.clock.scintillate.park(0.5);
  e.clock.drift.park(0);
  e.clock.breath.park(0.25);
  e.clock.event.park(0);
}

/** Bind a Backdrop to its clock. Idempotent per mode; refcounted per energy. */
export function retainBackdropClock(energy: Energy, want: "running" | "poster"): void {
  const e = entryFor(energy);
  e.count++;
  if (e.mode === want) return;
  e.mode = want;
  if (want === "running") startAll(e);
  else poster(e);
}

/** Release a Backdrop; the last release stops every channel for that energy,
 *  capturing the phase for the next retain. */
export function releaseBackdropClock(energy: Energy): void {
  const e = entries.get(energy);
  if (!e) return;
  e.count = Math.max(0, e.count - 1);
  if (e.count === 0) {
    stopAll(e);
    e.mode = null;
  }
}

/** Test seam: drop every clock so a suite starts from a known state. */
export function resetBackdropClocks(): void {
  entries.forEach((e) => stopAll(e));
  entries.clear();
}
