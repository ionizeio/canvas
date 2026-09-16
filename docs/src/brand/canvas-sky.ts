import type { Particle, GradientBlob } from "@ionizeio/canvas";

// The Canvas Universe's art: seeds, distributions and palettes.
//
// This is the APPLICATION's scene data. The kit's Backdrop is a generic engine
// that knows about particle fields and gradient fields; everything cosmic lives
// here, in the docs app, so the kit stays brand-free and another app can point the
// same engine at a completely different animation.
//
// Everything is generated once per scheme from a fixed seed, so the sky is
// identical across renders, screens and platforms. A shuffling sky reads as a bug,
// not as a universe.

// Deterministic PRNG (mulberry32). The seed is arbitrary but FIXED: the atlas is
// part of the brand art, not a random effect.
const SEED = 20260710;
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The conic C's hues (canvas-mark-geometry STOPS), carried into the sky as rare
 *  bright-star accents so the brand spectrum is present without being sprayed. */
export const SPECTRUM = ["#27cdf2", "#46e082", "#ffb43d", "#ff2d6e", "#b24dff"];

/** Stellar colour temperature. Real starfields are mostly white with a blue-white
 *  majority-minority and a small warm tail; sampling that instead of one flat tint
 *  is most of what separates a sky from a dot pattern. */
function temperature(u: number): string | undefined {
  if (u < 0.14) return "#cfe0ff"; // blue-white
  if (u < 0.22) return "#ffd9a8"; // amber
  return undefined; // near-white: take the layer tint, so light mode inverts cleanly
}

// A power-law magnitude: many faint bodies and a long, thin bright tail. The old
// field drew radius and alpha from flat uniforms, which is exactly why it read as
// synthetic. Size and brightness correlate here, but not linearly.
function magnitude(rng: () => number): number {
  return Math.pow(rng(), 3.2);
}

function body(x: number, y: number, m: number, rng: () => number, accentRate: number): Particle {
  const accent = m > 1 - accentRate;
  return {
    x,
    y,
    r: 0.5 + m * 3.1,
    a: 0.15 + Math.pow(m, 0.6) * 0.85,
    color: accent ? SPECTRUM[Math.floor(rng() * SPECTRUM.length)] : temperature(rng()),
  };
}

/** The pinned deep field: the unmoving far sky behind everything. */
function makeDeepField(count: number, rng: () => number): Particle[] {
  return Array.from({ length: count }, () => body(rng(), rng(), magnitude(rng), rng, 0.02));
}

/** A travelling shell: a full-field distribution in a unit box with a mild centre
 *  bias, so bodies cluster toward the core ahead the way a real approach does. */
function makeShell(count: number, rng: () => number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = Math.pow(rng(), 1.4) * 0.5;
    return body(0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius, magnitude(rng), rng, 0.02);
  });
}

/** Radial streaks: the motion-blurred foreground. Length grows with distance from
 *  the vanishing point, which is what sells the speed. */
function makeStreaks(count: number, rng: () => number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = 0.12 + Math.pow(rng(), 1.2) * 0.38;
    return {
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      len: 0.012 + radius * 0.05,
      r: 1.4,
      a: 0.3 + rng() * 0.5,
    };
  });
}

/** Diffraction glints: the bright foreground sparkles of the journey. */
function makeGlints(count: number, rng: () => number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const radius = 0.12 + rng() * 0.36;
    return {
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      r: 6 + rng() * 12,
      rot: (rng() - 0.5) * 24,
      a: 0.5 + rng() * 0.5,
      color: rng() < 0.25 ? SPECTRUM[Math.floor(rng() * SPECTRUM.length)] : undefined,
    };
  });
}

export interface Sky {
  deep: Particle[];
  shells: Particle[][];
  streaks: Particle[][];
  glints: Particle[][];
  nebula: { far: GradientBlob[]; near: GradientBlob[] };
}

// Scenes declare their RICHEST field; the kit's density tier decides how much is
// actually drawn, so these counts are ceilings rather than per-platform tuning.
const DEEP_COUNT = 220;
const SHELL_COUNT = 64;
const STREAK_COUNT = 34;
const GLINT_COUNT = 8;

function build(primary: string, dark: boolean): Sky {
  const rng = mulberry32(SEED);
  return {
    deep: makeDeepField(DEEP_COUNT, rng),
    shells: Array.from({ length: 4 }, () => makeShell(SHELL_COUNT, rng)),
    streaks: Array.from({ length: 2 }, () => makeStreaks(STREAK_COUNT, rng)),
    glints: Array.from({ length: 2 }, () => makeGlints(GLINT_COUNT, rng)),
    nebula: nebulaBlobs(primary, dark),
  };
}

// The nebula palette. `primary` is threaded through so the clouds follow a rebrand
// rather than pinning the sky to one indigo forever.
function nebulaBlobs(primary: string, dark: boolean): { far: GradientBlob[]; near: GradientBlob[] } {
  return {
    far: [
      { color: primary, cx: 0.32, cy: 0.3, r: 0.52, o: dark ? 0.2 : 0.3, end: 0.62 },
      { color: "#8b5cf6", cx: 0.72, cy: 0.42, r: 0.46, o: dark ? 0.22 : 0.32, end: 0.62 },
      { color: "#ec4899", cx: 0.6, cy: 0.74, r: 0.4, o: dark ? 0.16 : 0.24, end: 0.6 },
    ],
    near: [
      { color: "#06b6d4", cx: 0.62, cy: 0.6, r: 0.5, o: dark ? 0.18 : 0.28, end: 0.62 },
      { color: "#14b8a6", cx: 0.3, cy: 0.36, r: 0.44, o: dark ? 0.2 : 0.3, end: 0.64 },
    ],
  };
}

// Cached per scheme+primary so field identity stays stable across renders, which
// is what lets the engine skip re-rendering the surface.
const cache = new Map<string, Sky>();

export function canvasSky(primary: string, dark: boolean): Sky {
  const key = `${primary}:${dark ? "d" : "l"}`;
  let sky = cache.get(key);
  if (!sky) {
    sky = build(primary, dark);
    cache.set(key, sky);
  }
  return sky;
}
