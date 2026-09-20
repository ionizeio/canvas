// The hero orbit's one table of tunables (docs/src/brand/hero-orbit.tsx).
//
// Three loops make the orbit: the six brand badges ride one slow revolution, each
// counter-rotated so its logo stays upright; the rainbow glow behind the disc spins;
// and the glow breathes, a there-and-back dip in opacity eased in and out. Every
// period and the breath's floor live here and nowhere else. The harness route
// (/testing/orbit) drives the real component against this table, the runs are logged
// in tools/native/liquid-motion.md, and the push gate refuses a change to this file
// that carries no evidence row. Nothing here is a public prop.
export const ORBIT = {
  /** One revolution of the badges, in ms, linear. */
  orbitPeriod: 30000,
  /** One turn of the rainbow glow, in ms, linear. */
  glowPeriod: 6000,
  /** One breath of the glow, in ms: opacity 1 down to `glowFloor` and back, eased in and out. */
  glowPeriodBreath: 3400,
  /** The glow's opacity at the bottom of a breath. */
  glowFloor: 0.85,
} as const;
