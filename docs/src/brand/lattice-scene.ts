import { LATTICE, type AssemblySpec, type GlyphKind, type LatticeTunables } from "./lattice-tunables";

// The Lattice scene's roster: everything the art needs, computed once per surface box
// from the tunables and a fixed seed. Pure and platform-free, so the same box produces
// the same lattice on every render, screen and platform (a shuffling lattice reads as
// a bug), and so the harness can count what the scene will mount.

export interface Cell {
  i: number;
  col: number;
  row: number;
  /** Centre, px in the surface box. */
  x: number;
  y: number;
}

export interface LitCell extends Cell {
  kind: GlyphKind;
  hue: string;
}

/** One loop view's worth of light: the cells that light together, the bonds between
 *  the neighbours among them, and the bucket's phase offset in cycles of its channel. */
export interface Bucket {
  cells: LitCell[];
  bonds: Array<[LitCell, LitCell]>;
  offset: number;
}

export interface Atom {
  kind: GlyphKind;
  hue: string;
  /** Width of a bar or pill. */
  w?: number;
  /** The cell the atom lifts out of. */
  home: LitCell;
  /** Where its slot sits in the assembled organism, px. */
  slot: { x: number; y: number };
}

export interface Assembly {
  spec: AssemblySpec;
  /** The organism's top-left corner, px. */
  origin: { x: number; y: number };
  atoms: Atom[];
}

export interface LatticeStats {
  cells: number;
  glowCells: number;
  blinkCells: number;
  bonds: number;
  atoms: number;
  /** Loop views the scene mounts: the buckets, the atoms, and two groups per assembly. */
  animatedViews: number;
}

export interface LatticeRoster {
  cols: number;
  rows: number;
  cells: Cell[];
  glow: Bucket[];
  blink: Bucket[];
  assemblies: Assembly[];
  stats: LatticeStats;
}

// Deterministic PRNG (mulberry32), the same one the old sky used.
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

// Deal by a hash of the index, not `i % k`: a lattice is the most regular field there
// is, and every k-th cell flashing together would sweep the grid as a pattern.
function bucketOf(i: number, k: number): number {
  let h = Math.imul(i + 1, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) % k;
}

const KINDS: GlyphKind[] = ["dot", "pill", "ring", "bar", "square"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function buildLattice(box: { width: number; height: number }, t: LatticeTunables = LATTICE): LatticeRoster {
  const { width, height } = box;
  const { pitch } = t;

  // The grid, centred on the box and overscanned past every edge.
  const cols = Math.max(1, Math.ceil(width / pitch) + 2 * t.overscan);
  const rows = Math.max(1, Math.ceil(height / pitch) + 2 * t.overscan);
  const x0 = width / 2 - ((cols - 1) / 2) * pitch;
  const y0 = height / 2 - ((rows - 1) / 2) * pitch;
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      cells.push({ i, col, row, x: x0 + col * pitch, y: y0 + row * pitch });
    }
  }
  const at = (col: number, row: number): Cell | undefined => (col < 0 || row < 0 || col >= cols || row >= rows ? undefined : cells[row * cols + col]);

  // Every random draw a cell needs is made up front, in cell order, so the roster is a
  // pure function of the box: a reservation made later never shifts another cell's draw.
  const rng = mulberry32(t.seed);
  const draw = cells.map(() => ({ u: rng(), v: rng(), kind: KINDS[Math.floor(rng() * KINDS.length)]!, hue: t.hues[Math.floor(rng() * t.hues.length)]!, jitter: rng() }));
  const lit = (c: Cell, kind = draw[c.i]!.kind): LitCell => ({ ...c, kind, hue: draw[c.i]!.hue });

  const reserved = new Set<number>();

  // Assemblies first: each slot claims the home cell it will draw its atom from, a few
  // pitches away from the slot so the travel reads.
  const assemblies: Assembly[] = t.assemblies.map((spec) => {
    const { organism } = spec;
    const origin = {
      x: clamp(width * spec.at.x - organism.width / 2, pitch, Math.max(pitch, width - organism.width - pitch)),
      y: clamp(height * spec.at.y - organism.height / 2, pitch, Math.max(pitch, height - organism.height - pitch)),
    };
    const atoms: Atom[] = organism.slots.map((slot) => {
      const target = { x: origin.x + slot.x, y: origin.y + slot.y };
      const distance = (c: Cell) => Math.hypot(c.x - target.x, c.y - target.y) / pitch;
      const inRange = cells.filter((c) => !reserved.has(c.i) && distance(c) >= t.homeRange[0] && distance(c) <= t.homeRange[1]);
      const pool = inRange.length > 0 ? inRange : cells.filter((c) => !reserved.has(c.i));
      // Nearest wins, with a seeded jitter so the atoms of one organism do not all come
      // from the same side.
      const home = pool.reduce((best, c) => (distance(c) + draw[c.i]!.jitter * 2 < distance(best) + draw[best.i]!.jitter * 2 ? c : best), pool[0]!);
      reserved.add(home.i);
      return { kind: slot.kind, hue: draw[home.i]!.hue, w: slot.w, home: lit(home, slot.kind), slot: target };
    });
    return { spec, origin, atoms };
  });

  // The slow lights: the active fraction, dealt into buckets, each bucket then growing
  // one molecule by pulling unlit neighbours in and bonding them.
  const active = new Set<number>();
  const glow: Bucket[] = Array.from({ length: t.glow.buckets }, (_, b) => ({ cells: [], bonds: [], offset: b / t.glow.buckets }));
  for (const c of cells) {
    if (reserved.has(c.i) || draw[c.i]!.u >= t.glow.fraction) continue;
    active.add(c.i);
    glow[bucketOf(c.i, t.glow.buckets)]!.cells.push(lit(c));
  }
  const neighbours = (c: Cell): Cell[] => [at(c.col + 1, c.row), at(c.col - 1, c.row), at(c.col, c.row + 1), at(c.col, c.row - 1)].filter((n): n is Cell => !!n);
  for (const bucket of glow) {
    if (bucket.cells.length === 0) continue;
    // The seed is the bucket's cell with the lowest draw, so it is as arbitrary as the
    // rest of the deal but fixed.
    let current: LitCell = bucket.cells.reduce((best, c) => (draw[c.i]!.v < draw[best.i]!.v ? c : best), bucket.cells[0]!);
    const size = t.glow.cluster.min + Math.floor(draw[current.i]!.v * (t.glow.cluster.max - t.glow.cluster.min + 1));
    for (let n = 1; n < size; n++) {
      const free = neighbours(current).filter((c) => !reserved.has(c.i) && !active.has(c.i));
      if (free.length === 0) break;
      const next = lit(free[Math.floor(draw[current.i]!.jitter * free.length) % free.length]!);
      active.add(next.i);
      bucket.cells.push(next);
      bucket.bonds.push([current, next]);
      current = next;
    }
  }

  // The quick blinks: a few of the cells left over, on their own buckets.
  const blink: Bucket[] = Array.from({ length: t.blink.buckets }, (_, b) => ({ cells: [], bonds: [], offset: b / t.blink.buckets }));
  for (const c of cells) {
    if (reserved.has(c.i) || active.has(c.i) || draw[c.i]!.v >= t.blink.fraction) continue;
    blink[bucketOf(c.i, t.blink.buckets)]!.cells.push(lit(c));
  }

  const glowBuckets = glow.filter((b) => b.cells.length > 0);
  const blinkBuckets = blink.filter((b) => b.cells.length > 0);
  const atoms = assemblies.reduce((n, a) => n + a.atoms.length, 0);
  const stats: LatticeStats = {
    cells: cells.length,
    glowCells: glowBuckets.reduce((n, b) => n + b.cells.length, 0),
    blinkCells: blinkBuckets.reduce((n, b) => n + b.cells.length, 0),
    bonds: glowBuckets.reduce((n, b) => n + b.bonds.length, 0),
    atoms,
    animatedViews: glowBuckets.length + blinkBuckets.length + atoms + 2 * assemblies.length,
  };

  return { cols, rows, cells, glow: glowBuckets, blink: blinkBuckets, assemblies, stats };
}
