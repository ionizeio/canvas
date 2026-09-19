import { useId, Fragment } from "react";
import Svg, { Circle, Path, Rect, G, Line, Defs, RadialGradient, Stop } from "react-native-svg";
import { View, LoopView, type LoopTrack } from "../../../style/index.js";
import { type BackdropClock } from "../backdrop-clock.js";
import { type Layer, type ParticlesLayer, type Particle, type ParticleSprite, type GradientBlob } from "../backdrop-layers.js";

// The Backdrop's baseline renderer, built on react-native-svg (a required kit peer),
// so it runs anywhere the kit runs with no optional dependency at all.
//
// It does four jobs at once, which is why it stays in the tree even once a GPU
// renderer exists: the no-dependency baseline, the loading window while a GPU
// backend boots, the Reduce Motion poster host, and the recovery path if a GPU
// renderer fails to initialise.
//
// Architectural rule, load-bearing: every drawn group is ONE `LoopView` wrapping a
// STATIC <Svg>. No SVG element prop is ever animated; all motion is transform and
// opacity on the wrapper, bound to the clock's channels through tracks, which is what
// lets the loop primitive run the sky on the native driver natively and as compositor
// CSS animations on the web (src/style/loop.tsx). A twinkling layer draws as several
// such groups (its phase buckets) nested inside the layer's own wrapper: opacity
// composes multiplicatively through nesting, so the layer's travel fade and each
// bucket's flare stay two single-channel tracks instead of a product no compositor
// animation could express. Never wrap an Svg in an Animated component directly: its
// forced collapsable={false} reaches the DOM on react-native-web and React throws (see
// src/atoms/spinner/spinner.styles.tsx).

// SVG defs ids must be unique per mounted instance; React's useId is sanitized
// because raw ids contain colons, which break url(#...) references on the web.
function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

// A true exponential z-curve sampled into keyframes. The original hand-picked
// five-point approximation drifted from constant z-velocity at the wrap seam,
// which is exactly where the eye is most likely to catch it; sampling exp()
// finely removes that.
const Z_STEPS = 12;
function zCurve(depth: number): { inputRange: number[]; outputRange: number[] } {
  const s0 = Math.max(0.05, 1 - 0.65 * depth);
  const s1 = 1 + 1.4 * depth;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= Z_STEPS; i++) {
    const t = i / Z_STEPS;
    inputRange.push(t);
    outputRange.push(s0 * Math.pow(s1 / s0, t));
  }
  return { inputRange, outputRange };
}

const FADE_IN = [0, 0.12, 0.78, 0.95, 1];

// A layer's phase in the flight cycle is the track's `offset`: the loop primitive wraps
// it as a sawtooth on both platforms, so sibling layers stagger on one channel.

// ---------------------------------------------------------------------------
// Scintillation.
// ---------------------------------------------------------------------------

// Twinkling used to be one shimmer multiplied into a whole layer, which moved
// every body in lockstep. A field rising and falling as one is a global luminance
// change, and the eye adapts straight through it: the effect was nearly invisible
// however wide the range was pushed. Real scintillation is DIFFERENTIAL, so a
// twinkling field is dealt into phase buckets that flare at unrelated moments,
// each bucket its own LoopView over its own static Svg.

/** Phase buckets per twinkling field. Enough that neighbours are almost never in
 *  the same bucket, few enough that the extra wrappers stay cheap. */
const TWINKLE_BUCKETS = 9;

// Deal by a hash of the index, not by `i % k`. Fields are generated on lattices
// (`(i * 37) % 101` is the shape every example uses), so every k-th body would
// land on a regular sub-grid, and a sub-grid flashing together reads as a pattern
// sweeping the sky rather than as stars.
function bucketOf(i: number, k: number): number {
  let h = Math.imul(i + 1, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) % k;
}

// One body's flare as a fraction of the layer cap: a fast attack, a quick drop off
// the peak, then a long rest. The sharp leading edge is what makes a flare read as
// an event; the old effect eased both ways and never stopped moving, so nothing in
// it ever registered as happening. The peak stops exactly AT the cap rather than
// above it, so the prominence axis still means what backdrop.styles.ts says it
// means; the contrast is bought from the resting floor, not from the budget.
const FLARE_IN = [0, 0.05, 0.16, 0.45, 1];
const FLARE_OUT = [0.5, 1, 0.75, 0.5, 0.5];

/** One bucket's flare on the scintillation channel, `offset` cycles ahead, scaled by
 *  the layer cap. */
function flare(clock: BackdropClock, offset: number, cap: number): LoopTrack {
  return { channel: clock.scintillate, offset, inputRange: FLARE_IN, outputRange: FLARE_OUT.map((v) => v * cap) };
}

interface Bucket {
  field: Particle[];
  /** The bucket's flare phase, in cycles of the scintillation channel. */
  offset: number;
}

/** Split a twinkling field into its phase buckets. A field that does not twinkle is
 *  the one bucket it already was, so the caller has a single path. */
function buckets(layer: ParticlesLayer): Bucket[] {
  if (!layer.twinkle) return [{ field: layer.field, offset: 0 }];
  const k = Math.min(TWINKLE_BUCKETS, layer.field.length);
  const out: Bucket[] = Array.from({ length: k }, (_, b) => ({ field: [], offset: b / k }));
  layer.field.forEach((p, i) => out[bucketOf(i, k)]!.field.push(p));
  return out.filter((b) => b.field.length > 0);
}

// ---------------------------------------------------------------------------
// Sprites.
// ---------------------------------------------------------------------------

// A four-point diffraction glint: two crossed tapering diamonds, the classic
// astrophotography starburst, drawn as one path.
function sparkPath(r: number, w: number): string {
  return `M 0 ${-r} L ${w} 0 L 0 ${r} L ${-w} 0 Z M ${-r} 0 L 0 ${-w} L ${r} 0 L 0 ${w} Z`;
}

// The scintillation glint: the same crossed diamonds, drawn wide and thin under a
// twinkling body, plus the white core the spark sprite uses. Both ride the bucket's
// flare opacity, so a flaring body grows spikes and goes white-hot while a resting
// one stays a plain disc. This is what carries the effect at these sizes: a two-pixel
// dot changing brightness is easy to miss, a two-pixel dot briefly growing spikes is
// not. The core is also the one place peak luminance rises without touching the
// layer cap, since white outreads the tint on a single pixel.
const GLINT_MIN_R = 1.2;
const GLINT_MIN_A = 0.5;

/** One body's glint, or null when the body is too small or too faint to have earned
 *  one. Only the bright bodies scintillate in a real sky, and the threshold is also
 *  what keeps a 200-body field from doubling its node count. */
function drawGlint(p: Particle, i: number, bw: number, bh: number, tint: string) {
  if (p.r < GLINT_MIN_R || p.a < GLINT_MIN_A) return null;
  const cx = p.x * bw;
  const cy = p.y * bh;
  return (
    <G key={i} transform={`translate(${cx}, ${cy})`}>
      <Path d={sparkPath(p.r * 4.2, Math.max(0.45, p.r * 0.2))} fill={p.color ?? tint} fillOpacity={p.a * 0.6} />
      <Circle cx={0} cy={0} r={Math.max(0.6, p.r * 0.22)} fill="#ffffff" fillOpacity={p.a * 0.7} />
    </G>
  );
}

/** Draw one body. `bw`/`bh` are the layer box in px, so unit positions resolve
 *  correctly whether the box is a square travel shell or the raw viewport. */
function drawParticle(p: Particle, i: number, bw: number, bh: number, sprite: ParticleSprite, tint: string, cap: number, haloId: string) {
  const color = p.color ?? tint;
  const cx = p.x * bw;
  const cy = p.y * bh;
  const o = p.a * cap;

  if (sprite === "streak") {
    const dx = p.dx ?? 0;
    const dy = p.dy ?? 0;
    const len = p.len ?? 0.02;
    return (
      <Line
        key={i}
        x1={cx}
        y1={cy}
        x2={(p.x + dx * len) * bw}
        y2={(p.y + dy * len) * bh}
        stroke={color}
        strokeOpacity={o}
        strokeWidth={Math.max(1, p.r)}
        strokeLinecap="round"
      />
    );
  }

  if (sprite === "spark") {
    const w = Math.max(0.9, p.r * 0.11);
    return (
      <G key={i} transform={`translate(${cx}, ${cy}) rotate(${p.rot ?? 0})`}>
        <Path d={sparkPath(p.r, w)} fill={color} fillOpacity={o} />
        <Circle cx={0} cy={0} r={Math.max(1, p.r * 0.09)} fill="#ffffff" fillOpacity={Math.min(1, o * 1.3)} />
      </G>
    );
  }

  if (sprite === "halo") {
    // Baked bloom: a soft wide falloff under a hard core. Two nodes instead of a
    // filter, so it costs nothing on the native backends that lack real blur.
    // The halo is kept tight and faint on purpose: bloom that reads as glow on one
    // body reads as haze when a few hundred of them overlap behind body text.
    return (
      <Fragment key={i}>
        <Circle cx={cx} cy={cy} r={p.r * 2.8} fill={`url(#${haloId})`} fillOpacity={o * 0.3} />
        <Circle cx={cx} cy={cy} r={p.r} fill={color} fillOpacity={o} />
      </Fragment>
    );
  }

  return <Circle key={i} cx={cx} cy={cy} r={p.r} fill={color} fillOpacity={o} />;
}

// ---------------------------------------------------------------------------
// Layer views.
// ---------------------------------------------------------------------------

interface ParticlesSvgProps {
  field: Particle[];
  sprite: ParticleSprite;
  width: number;
  height: number;
  tint: string;
  bloom: boolean;
  /** Draw the scintillation glint under each qualifying body. Set for a twinkling
   *  field, where the flare has to read on bodies a couple of pixels across. */
  glint: boolean;
}

/** The static drawing of one field: every body at its unit position in the box. */
function ParticlesSvg({ field, sprite, width, height, tint, bloom, glint }: ParticlesSvgProps) {
  const haloId = useSvgId("halo");
  const needsHalo = sprite === "halo" || bloom;
  // A spark is already a starburst and a streak is already elongated; glinting
  // either one just thickens it. Discs and halos are the round bodies that need it.
  const glints = glint && (sprite === "disc" || sprite === "halo");
  return (
    <Svg width={width} height={height}>
      {needsHalo ? (
        <Defs>
          <RadialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={tint} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      ) : null}
      {glints ? field.map((p, i) => drawGlint(p, i, width, height, tint)) : null}
      {field.map((p, i) => drawParticle(p, i, width, height, sprite, tint, 1, haloId))}
    </Svg>
  );
}

interface GradientLayerViewProps {
  blobs: GradientBlob[];
  size: number;
  style: object;
  scale: LoopTrack | number;
  opacity: LoopTrack;
}

function GradientLayerView({ blobs, size, style, scale, opacity }: GradientLayerViewProps) {
  const id = useSvgId("grad");
  return (
    <LoopView style={[style, { width: size, height: size }]} opacity={opacity} scale={scale}>
      <Svg width={size} height={size}>
        <Defs>
          {blobs.map((b, i) => (
            <RadialGradient key={i} id={`${id}-${i}`} gradientUnits="userSpaceOnUse" cx={b.cx * size} cy={b.cy * size} r={b.r * size}>
              <Stop offset="0" stopColor={b.color} stopOpacity={b.o} />
              <Stop offset={b.end} stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((_, i) => (
          <Rect key={i} x={0} y={0} width={size} height={size} fill={`url(#${id}-${i})`} />
        ))}
      </Svg>
    </LoopView>
  );
}

// ---------------------------------------------------------------------------
// The renderer.
// ---------------------------------------------------------------------------

export interface SvgBackdropProps {
  layers: Layer[];
  width: number;
  height: number;
  focus: { x: number; y: number };
  clock: BackdropClock;
  tint: string;
  /** Global alpha cap from the prominence axis, multiplied into every layer. */
  prominence: number;
}

export function SvgBackdrop({ layers, width, height, focus, clock, tint, prominence }: SvgBackdropProps) {
  const focusX = width * focus.x;
  const focusY = height * focus.y;

  // Travelling layers live in square boxes centred on the focus point, sized to
  // cover the farthest viewport corner at scale 1. React Native scales about the
  // view centre, so this centres the radial motion exactly on the vanishing point.
  const box = Math.ceil(2 * Math.hypot(0.5 * width, 0.58 * height));
  const boxStyle = { position: "absolute" as const, left: focusX - box / 2, top: focusY - box / 2, width: box, height: box };
  const pinnedStyle = { position: "absolute" as const, top: 0, left: 0, width, height };
  // A bucket fills its layer's box exactly, so the layer's scale and fade carry it.
  const fillStyle = { position: "absolute" as const, top: 0, left: 0, width: box, height: box };

  return (
    <>
      {layers.map((layer, i) => {
        if (layer.kind === "shader") {
          // No shader support here; the scene's mandatory fallback stands in.
          return <Fragment key={i}>{layer.fallback}</Fragment>;
        }

        if (layer.kind === "custom") {
          return <Fragment key={i}>{layer.content}</Fragment>;
        }

        if (layer.kind === "gradient") {
          const size = layer.size;
          const style = {
            position: "absolute" as const,
            left: width * layer.at.x - size / 2,
            top: height * layer.at.y - size / 2,
          };
          // Palindromic keyframes (equal endpoints) keep a drifting layer seam-free
          // on the looping master value.
          const swell = 0.18 * Math.max(0.2, layer.depth);
          const scale: LoopTrack | number = layer.drift
            ? { channel: clock.flight, inputRange: [0, 0.5, 1], outputRange: [1 - swell, 1 + swell, 1 - swell] }
            : 1;
          const cap = layer.alpha * prominence;
          const opacity: LoopTrack = { channel: clock.flight, inputRange: [0, 0.5, 1], outputRange: [0.7 * cap, cap, 0.7 * cap] };
          return <GradientLayerView key={i} blobs={layer.blobs} size={size} style={style} scale={scale} opacity={opacity} />;
        }

        const cap = layer.alpha * prominence;
        const layerTint = layer.tint ?? tint;

        // A pinned layer does not travel: it is the deep field behind everything,
        // sized to the viewport and scintillating in place, each bucket on its own
        // flare phase. A field that does not twinkle needs no animation at all.
        if (layer.depth === 0) {
          if (!layer.twinkle) {
            return (
              <View key={i} style={[pinnedStyle, { opacity: cap }]}>
                <ParticlesSvg field={layer.field} sprite={layer.sprite} width={width} height={height} tint={layerTint} bloom={layer.bloom} glint={false} />
              </View>
            );
          }
          return (
            <Fragment key={i}>
              {buckets(layer).map((b, j) => (
                <LoopView key={j} style={pinnedStyle} opacity={flare(clock, b.offset, cap)}>
                  <ParticlesSvg field={b.field} sprite={layer.sprite} width={width} height={height} tint={layerTint} bloom={layer.bloom} glint />
                </LoopView>
              ))}
            </Fragment>
          );
        }

        // A travelling layer: its z-curve scale and its fade ride the flight, `phase`
        // cycles ahead. Its twinkle buckets nest inside it, so the flight is bound once
        // per layer and only the flare phase differs between buckets.
        const scale: LoopTrack = { channel: clock.flight, offset: layer.phase, ...zCurve(layer.depth) };
        const fade: LoopTrack = { channel: clock.flight, offset: layer.phase, inputRange: FADE_IN, outputRange: [0, cap, cap, 0, 0] };
        return (
          <LoopView key={i} style={boxStyle} opacity={fade} scale={scale}>
            {layer.twinkle ? (
              buckets(layer).map((b, j) => (
                <LoopView key={j} style={fillStyle} opacity={flare(clock, b.offset, 1)}>
                  <ParticlesSvg field={b.field} sprite={layer.sprite} width={box} height={box} tint={layerTint} bloom={layer.bloom} glint />
                </LoopView>
              ))
            ) : (
              <ParticlesSvg field={layer.field} sprite={layer.sprite} width={box} height={box} tint={layerTint} bloom={layer.bloom} glint={false} />
            )}
          </LoopView>
        );
      })}
    </>
  );
}

/** A flat scheme floor painted beneath every layer. Light schemes need one;
 *  dark rides the theme background token directly. */
export function BackdropFloor({ color }: { color: string }) {
  return <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color }} />;
}
