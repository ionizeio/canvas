import { useId, useMemo } from "react";
import { Easing, useWindowDimensions } from "react-native";
import Svg, { Circle, Rect, Line, G, Defs, RadialGradient, Stop } from "react-native-svg";
import { Backdrop, LoopView, View, backdropClock, useBackdropBox, useTheme, type Energy, type LoopChannel, type LoopTrack } from "@ionizeio/canvas";
import { LATTICE, type GlyphKind, type LightShape, type SchemeInk } from "./lattice-tunables";
import { buildLattice, type Assembly, type Atom, type Bucket, type Cell, type LitCell } from "./lattice-scene";

// The Lattice: the assembly demonstration retained at /testing/lattice. The docs'
// production background is CanvasCurrents; this fixture exercises richer scenes.
//
// The kit supplies the surface, the clock, the frame budget and the accessibility
// ladder. Everything below is Canvas's own art: a periodic table of components across
// the page, cells lighting at unrelated moments with a primitive inside, neighbours
// bonding into molecules, and the assembly moments in which lit cells lift their
// primitives out and compose them into an organism. Point the same <Backdrop> at a
// different set of children and it renders a different animation entirely, which is
// the whole reason the engine lives in the kit and this file does not.
//
// Everything moves through the kit's LoopView on the engine's exported clock, so the
// scene stays in phase across page changes and costs the same nothing per frame as the
// engine's own layers: the native driver natively, a compositor CSS animation on the
// web. Every coefficient is in lattice-tunables.ts; the roster (which cells light, what
// assembles where) is computed once per surface box in lattice-scene.ts.

export interface CanvasLatticeProps {
  /** Harness only: park the scene on its poster. Production leaves it to the engine's
   *  Reduce Motion ladder. */
  still?: boolean;
  /** Harness only: override the scene's own energy. */
  energy?: Energy;
}

/** The Canvas Lattice backdrop. Mount inside a <BackdropHost>. */
export function CanvasLattice({ still, energy }: CanvasLatticeProps = {}) {
  const e = energy ?? LATTICE.energy;
  return (
    <Backdrop still={still} calm={e === "calm"} energetic={e === "energetic"}>
      <Backdrop.Custom>
        <LatticeArt energy={e} />
      </Backdrop.Custom>
    </Backdrop>
  );
}

// SVG defs ids must be unique per mounted instance; React's useId is sanitized
// because raw ids contain colons, which break url(#...) references on the web.
function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

const ease = Easing.inOut(Easing.ease);

function LatticeArt({ energy }: { energy: Energy }) {
  // The surface's own box, so the lattice fills a harness column or a docs stage as
  // exactly as the screen; the window is only the fallback outside a surface.
  const box = useBackdropBox();
  const win = useWindowDimensions();
  const width = box?.width ?? win.width;
  const height = box?.height ?? win.height;
  const { tokens, dark } = useTheme();
  const clock = backdropClock(energy);
  const roster = useMemo(() => buildLattice({ width, height }), [width, height]);
  const ink = dark ? LATTICE.ink.dark : LATTICE.ink.light;
  const line = tokens.foreground;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height, opacity: ink.scene, pointerEvents: "none" }}>
      <Hairlines cells={roster.cells} width={width} height={height} line={line} alpha={ink.hairline} />
      {roster.glow.map((bucket, i) => (
        <BucketView key={`g${i}`} bucket={bucket} channel={clock.flight} shape={LATTICE.glow.shape} width={width} height={height} ink={ink} line={line} />
      ))}
      {roster.blink.map((bucket, i) => (
        <BucketView key={`b${i}`} bucket={bucket} channel={clock.scintillate} shape={LATTICE.blink.shape} width={width} height={height} ink={ink} line={line} />
      ))}
      {roster.assemblies.map((assembly) => (
        <AssemblyView
          key={assembly.spec.name}
          assembly={assembly}
          channel={assembly.spec.channel === "drift" ? clock.drift : clock.flight}
          width={width}
          height={height}
          ink={ink}
          line={line}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// The resting lattice: every cell as a hairline, drawn once and never animated.
// ---------------------------------------------------------------------------

function Hairlines({ cells, width, height, line, alpha }: { cells: Cell[]; width: number; height: number; line: string; alpha: number }) {
  const s = LATTICE.cell;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <Svg width={width} height={height}>
        {cells.map((c) => (
          <Rect key={c.i} x={c.x - s / 2} y={c.y - s / 2} width={s} height={s} rx={LATTICE.radius} fill="none" stroke={line} strokeOpacity={alpha} strokeWidth={LATTICE.hairline} />
        ))}
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Glyphs: the primitives a cell holds and an atom carries.
// ---------------------------------------------------------------------------

function Glyph({ kind, hue, w, cx, cy, alpha }: { kind: GlyphKind; hue: string; w?: number; cx: number; cy: number; alpha: number }) {
  const g = LATTICE.glyph;
  if (kind === "dot") return <Circle cx={cx} cy={cy} r={g.dot} fill={hue} fillOpacity={alpha} />;
  if (kind === "ring") return <Circle cx={cx} cy={cy} r={g.ring} fill="none" stroke={hue} strokeOpacity={alpha} strokeWidth={1.5} />;
  if (kind === "pill") {
    const pw = w ?? g.pill.w;
    return <Rect x={cx - pw / 2} y={cy - g.pill.h / 2} width={pw} height={g.pill.h} rx={g.pill.h / 2} fill={hue} fillOpacity={alpha} />;
  }
  if (kind === "bar") {
    const bw = w ?? g.bar.w;
    return <Rect x={cx - bw / 2} y={cy - g.bar.h / 2} width={bw} height={g.bar.h} rx={g.bar.h / 2} fill={hue} fillOpacity={alpha} />;
  }
  return <Rect x={cx - g.square / 2} y={cy - g.square / 2} width={g.square} height={g.square} rx={2} fill={hue} fillOpacity={alpha} />;
}

/** The soft halo behind a lit cell, one gradient per hue in the group. */
function HueHalos({ id, hues, alpha }: { id: string; hues: string[]; alpha: number }) {
  return (
    <Defs>
      {hues.map((hue) => (
        <RadialGradient key={hue} id={`${id}-${hue.slice(1)}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={hue} stopOpacity={alpha} />
          <Stop offset="100%" stopColor={hue} stopOpacity={0} />
        </RadialGradient>
      ))}
    </Defs>
  );
}

const unique = (hues: string[]) => Array.from(new Set(hues));

/** A lit cell: halo, the cell in its hue, and the primitive inside unless an atom is
 *  carrying it. */
function LitCellArt({ cell, id, ink, glyph = true }: { cell: LitCell; id: string; ink: SchemeInk; glyph?: boolean }) {
  const s = LATTICE.cell;
  return (
    <G>
      <Circle cx={cell.x} cy={cell.y} r={s * 0.9} fill={`url(#${id}-${cell.hue.slice(1)})`} />
      <Rect x={cell.x - s / 2} y={cell.y - s / 2} width={s} height={s} rx={LATTICE.radius} fill={cell.hue} fillOpacity={ink.litFill} stroke={cell.hue} strokeOpacity={ink.litStroke} strokeWidth={LATTICE.hairline} />
      {glyph ? <Glyph kind={cell.kind} hue={cell.hue} cx={cell.x} cy={cell.y} alpha={ink.glyph} /> : null}
    </G>
  );
}

// ---------------------------------------------------------------------------
// Buckets: the cells that light together, one loop view over one static drawing.
// ---------------------------------------------------------------------------

interface BucketViewProps {
  bucket: Bucket;
  channel: LoopChannel;
  shape: LightShape;
  width: number;
  height: number;
  ink: SchemeInk;
  line: string;
}

function BucketView({ bucket, channel, shape, width, height, ink, line }: BucketViewProps) {
  const id = useSvgId("lit");
  const opacity: LoopTrack = { channel, offset: bucket.offset, inputRange: shape.window, outputRange: shape.level };
  return (
    <LoopView style={{ position: "absolute", top: 0, left: 0, width, height }} opacity={opacity}>
      <Svg width={width} height={height}>
        <HueHalos id={id} hues={unique(bucket.cells.map((c) => c.hue))} alpha={ink.glow} />
        {bucket.bonds.map(([a, b], i) => (
          <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={line} strokeOpacity={ink.bond} strokeWidth={LATTICE.hairline} />
        ))}
        {bucket.cells.map((c) => (
          <LitCellArt key={c.i} cell={c} id={id} ink={ink} />
        ))}
      </Svg>
    </LoopView>
  );
}

// ---------------------------------------------------------------------------
// Assembly moments.
// ---------------------------------------------------------------------------

// A moment is a window of a LINEAR channel (the flight or the drift), so its tracks
// carve the window out of the cycle themselves: the home cells light just before it,
// the atoms travel out on an eased leg, hold in their slots while the organism's
// outline and bonds show, travel back on the mirrored leg, and the cells go dark again.
// Outside the window every track sits at its resting value, which is also the poster.

interface AssemblyViewProps {
  assembly: Assembly;
  channel: LoopChannel;
  width: number;
  height: number;
  ink: SchemeInk;
  line: string;
}

/** The moment's timeline in channel phase. */
function timeline(window: readonly [number, number]) {
  const [s, e] = window;
  const span = e - s;
  const { out, back } = LATTICE.travel;
  return {
    s,
    e,
    span,
    /** Atoms arrive in their slots. */
    arrive: s + span * out,
    /** Atoms leave their slots. */
    leave: e - span * back,
    /** How far before the window the cells light (and after it they fade), kept inside
     *  the cycle so every breakpoint stays in 0..1 and in order. */
    lead: Math.min(0.03, s / 2, (1 - e) / 2),
  };
}

function AssemblyView({ assembly, channel, width, height, ink, line }: AssemblyViewProps) {
  const id = useSvgId("asm");
  const { spec, origin, atoms } = assembly;
  const { organism } = spec;
  const t = timeline(spec.window);
  const dim = 0.35;
  const cellsOpacity: LoopTrack = {
    channel,
    inputRange: [0, t.s - t.lead, t.s, t.arrive, t.arrive + t.span * 0.05, t.leave - t.span * 0.05, t.leave, t.e, t.e + t.lead, 1],
    outputRange: [0, 0, 1, 1, dim, dim, 1, 1, 0, 0],
  };
  const outlineOpacity: LoopTrack = {
    channel,
    inputRange: [0, t.arrive - t.span * 0.03, t.arrive + t.span * 0.04, t.leave - t.span * 0.04, t.leave + t.span * 0.03, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  };
  // Room around the outline for its stroke and the slot bonds.
  const pad = 12;
  const ow = organism.width + 2 * pad;
  const oh = organism.height + 2 * pad;

  return (
    <>
      <LoopView style={{ position: "absolute", top: 0, left: 0, width, height }} opacity={cellsOpacity}>
        <Svg width={width} height={height}>
          <HueHalos id={id} hues={unique(atoms.map((a) => a.hue))} alpha={ink.glow} />
          {atoms.map((a) => (
            <LitCellArt key={a.home.i} cell={a.home} id={id} ink={ink} glyph={false} />
          ))}
        </Svg>
      </LoopView>
      <LoopView style={{ position: "absolute", left: origin.x - pad, top: origin.y - pad, width: ow, height: oh }} opacity={outlineOpacity}>
        <Svg width={ow} height={oh}>
          <Rect x={pad} y={pad} width={organism.width} height={organism.height} rx={organism.radius} fill={line} fillOpacity={ink.outlineFill} stroke={line} strokeOpacity={ink.outline} strokeWidth={LATTICE.hairline} />
          {organism.slots.slice(1).map((slot, i) => {
            const prev = organism.slots[i]!;
            return <Line key={i} x1={pad + prev.x} y1={pad + prev.y} x2={pad + slot.x} y2={pad + slot.y} stroke={line} strokeOpacity={ink.bond} strokeWidth={LATTICE.hairline} />;
          })}
        </Svg>
      </LoopView>
      {atoms.map((atom, i) => (
        <AtomView key={i} atom={atom} channel={channel} t={t} ink={ink} />
      ))}
    </>
  );
}

/** One atom: the glyph, sitting on its home cell outside the moment and travelling to
 *  its slot and back inside it. Both transform components ride the same channel at the
 *  same (zero) offset, as LoopView requires. */
function AtomView({ atom, channel, t, ink }: { atom: Atom; channel: LoopChannel; t: ReturnType<typeof timeline>; ink: SchemeInk }) {
  const size = LATTICE.atom;
  const { samples } = LATTICE.travel;
  const dx = atom.slot.x - atom.home.x;
  const dy = atom.slot.y - atom.home.y;
  const inputRange: number[] = [0, t.s];
  const xs: number[] = [0, 0];
  const ys: number[] = [0, 0];
  for (let i = 1; i <= samples; i++) {
    const u = i / samples;
    const p = ease(u);
    inputRange.push(t.s + (t.arrive - t.s) * u);
    xs.push(dx * p);
    ys.push(dy * p);
  }
  inputRange.push(t.leave);
  xs.push(dx);
  ys.push(dy);
  for (let i = 1; i <= samples; i++) {
    const u = i / samples;
    const p = 1 - ease(u);
    inputRange.push(t.leave + (t.e - t.leave) * u);
    xs.push(dx * p);
    ys.push(dy * p);
  }
  inputRange.push(1);
  xs.push(0);
  ys.push(0);
  const opacity: LoopTrack = { channel, inputRange: [0, t.s - t.lead / 2, t.s, t.e, t.e + t.lead / 2, 1], outputRange: [0, 0, 1, 1, 0, 0] };
  return (
    <LoopView
      style={{ position: "absolute", left: atom.home.x - size / 2, top: atom.home.y - size / 2, width: size, height: size }}
      opacity={opacity}
      translateX={{ channel, inputRange, outputRange: xs }}
      translateY={{ channel, inputRange, outputRange: ys }}
    >
      <Svg width={size} height={size}>
        <Glyph kind={atom.kind} hue={atom.hue} w={atom.w} cx={size / 2} cy={size / 2} alpha={ink.glyph} />
      </Svg>
    </LoopView>
  );
}
