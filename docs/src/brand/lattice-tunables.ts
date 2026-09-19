import type { Energy } from "@ionizeio/canvas";

// The Lattice scene's one table of tunables.
//
// The docs' background is a periodic table of components: a quiet lattice of cells
// across the page, a few of them lit at unrelated moments with a primitive inside,
// neighbours bonding into small molecules, and every so often an ASSEMBLY moment,
// where a handful of lit cells lift their primitives out, glide them into the
// silhouette of an organism (a search field, a card), hold, and settle back. Atoms,
// molecules, organisms: the atomic-design story the kit is built on, drawn in the
// kit's own brand hues.
//
// Every coefficient the eye judges lives here and nowhere else: the geometry, which
// cells light and how, the assembly windows and their travel, and the inks per scheme.
// The harness route (/testing/lattice) drives the scene against this table and the
// runs are logged in tools/native/liquid-motion.md; the push gate refuses a change to
// this file that carries no evidence row. Nothing here is a public prop.

/** The primitives a cell can hold and an atom can carry. */
export type GlyphKind = "dot" | "pill" | "ring" | "bar" | "square";

/** One slot of an organism: the primitive it takes and where its centre sits, in px
 *  from the organism's top-left corner. `w` is the width of a bar or pill. */
export interface OrganismSlot {
  kind: GlyphKind;
  x: number;
  y: number;
  w?: number;
}

/** An organism silhouette: the outline the atoms assemble into. */
export interface Organism {
  name: string;
  width: number;
  height: number;
  radius: number;
  slots: OrganismSlot[];
}

/** An assembly moment: which channel it rides, the window of that channel's cycle it
 *  occupies, where on the surface it assembles, and what it assembles into. */
export interface AssemblySpec {
  name: string;
  /** `flight` fires once per flight (32 s at the default energy); `drift` once per
   *  180 s, so the two moments almost never coincide and the scene never reads as a loop. */
  channel: "flight" | "drift";
  /** Start and end of the moment, in 0..1 phase of the channel. The whole moment,
   *  travel out, hold and travel back, sits inside it. */
  window: readonly [number, number];
  /** The organism's centre, in 0..1 units of the surface box. */
  at: { x: number; y: number };
  organism: Organism;
}

/** A bucket's light over one cycle of its channel: the phase breakpoints and the
 *  opacity at each, `offset` cycles apart per bucket. Piecewise linear between. */
export interface LightShape {
  window: readonly number[];
  level: readonly number[];
}

export interface SchemeInk {
  /** Whole-scene alpha, applied once over everything. Light stays fainter: dark text
   *  on a pale field loses contrast faster than light text on a deep one. */
  scene: number;
  /** The resting lattice hairline, in the theme's foreground. */
  hairline: number;
  /** A lit cell's outline, fill and halo, in its hue. */
  litStroke: number;
  litFill: number;
  glow: number;
  /** The primitive inside a lit cell (and the atom that carries it). */
  glyph: number;
  /** Hairline bonds between neighbours and between an organism's slots. */
  bond: number;
  /** The organism's outline and its faint fill, in the foreground. */
  outline: number;
  outlineFill: number;
}

// Slot widths stay inside a cell (36 px): an atom carries the same glyph at home and in
// its slot, so a bar or pill wider than the cell it rests in would overflow it.

/** A search field: an icon ring, a placeholder bar, a button pill. */
const FIELD: Organism = {
  name: "field",
  width: 120,
  height: 36,
  radius: 18,
  slots: [
    { kind: "ring", x: 18, y: 18 },
    { kind: "bar", x: 56, y: 18, w: 28 },
    { kind: "pill", x: 100, y: 18, w: 24 },
  ],
};

/** A card: an avatar ring beside two text bars, a badge dot, a button pill and an icon
 *  square along the bottom. */
const CARD: Organism = {
  name: "card",
  width: 112,
  height: 80,
  radius: 12,
  slots: [
    { kind: "ring", x: 20, y: 20 },
    { kind: "bar", x: 56, y: 16, w: 28 },
    { kind: "bar", x: 52, y: 28, w: 24 },
    { kind: "dot", x: 96, y: 16 },
    { kind: "pill", x: 30, y: 62, w: 26 },
    { kind: "square", x: 92, y: 62 },
  ],
};

export const LATTICE = {
  /** The clock the scene binds to. Energy is the only prop that changes a rate. */
  energy: "default" as Energy,
  /** Fixed: the lattice is brand art, not a random effect. */
  seed: 20260919,

  // Geometry, px.
  pitch: 56,
  cell: 36,
  radius: 10,
  hairline: 1,
  /** Cells laid out beyond each edge, so the lattice never shows a border. */
  overscan: 1,
  /** The atom view's side, px; a glyph is drawn centred in it. */
  atom: 40,

  /** The slow lights, on the flight channel: the fraction of cells that ever light,
   *  the buckets they are dealt into (each bucket one loop view), the light shape, and
   *  the molecule each bucket grows by pulling neighbours in. */
  glow: {
    fraction: 0.2,
    buckets: 10,
    shape: { window: [0, 0.012, 0.03, 0.16, 0.19], level: [0, 0.75, 1, 1, 0] } as LightShape,
    cluster: { min: 2, max: 4 },
  },

  /** The quick blinks, on the scintillation channel: a few cells, a sharper shape. */
  blink: {
    fraction: 0.04,
    buckets: 3,
    shape: { window: [0, 0.06, 0.16, 0.36, 1], level: [0, 1, 0.85, 0, 0] } as LightShape,
  },

  /** An assembly moment's travel as fractions of its window: out, hold, back; the
   *  eased legs are sampled at `samples` points each. */
  travel: { out: 0.24, hold: 0.52, back: 0.24, samples: 6 },

  /** How far an atom's home cell sits from its slot, in pitches: far enough that the
   *  travel reads, near enough that the organism draws from its own neighbourhood. */
  homeRange: [2, 7] as readonly [number, number],

  assemblies: [
    { name: "field", channel: "flight", window: [0.52, 0.92], at: { x: 0.74, y: 0.6 }, organism: FIELD },
    { name: "card", channel: "drift", window: [0.3, 0.42], at: { x: 0.24, y: 0.66 }, organism: CARD },
  ] as AssemblySpec[],

  /** The conic C's hues (canvas-mark-geometry STOPS): the only colours in the scene. */
  hues: ["#27cdf2", "#46e082", "#ffb43d", "#ff2d6e", "#b24dff"],

  /** Glyph sizes, px: radii for the round ones, sides for the rest. */
  glyph: { dot: 3, ring: 5.5, pill: { w: 14, h: 6 }, bar: { w: 16, h: 3 }, square: 8 },

  ink: {
    dark: { scene: 0.8, hairline: 0.1, litStroke: 0.85, litFill: 0.14, glow: 0.42, glyph: 0.95, bond: 0.5, outline: 0.45, outlineFill: 0.06 } as SchemeInk,
    light: { scene: 0.55, hairline: 0.12, litStroke: 0.75, litFill: 0.12, glow: 0.22, glyph: 0.9, bond: 0.45, outline: 0.4, outlineFill: 0.05 } as SchemeInk,
  },
};

export type LatticeTunables = typeof LATTICE;
