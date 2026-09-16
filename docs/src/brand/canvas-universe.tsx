import { useId } from "react";
import { Animated, useWindowDimensions } from "react-native";
import Svg, { Circle, Path, Rect, G, Defs, RadialGradient, LinearGradient, Stop, Mask, Filter, FeGaussianBlur, FeColorMatrix } from "react-native-svg";
import { Backdrop, backdropClock, useTheme } from "@ionizeio/canvas";
import { glowColor } from "./hero-orbit";
import { canvasSky } from "./canvas-sky";

// The Canvas Universe: this application's scene for the kit's Backdrop engine.
//
// The kit supplies the surface, the clock, the frame budget and the accessibility
// ladder. Everything below is Canvas's own art: the seeded fields, the brand
// spectrum, the galactic core and the comets. Point the same <Backdrop> at a
// different set of children and it renders a different animation entirely, which
// is the whole reason the engine lives in the kit and this file does not.
//
// Bespoke art (the core, the comets) rides <Backdrop.Custom> and binds to the
// engine's exported clock, so it stays in phase with the particle layers instead
// of running its own timeline.

const ENERGY = "energetic" as const;

type AnimNumber = Animated.Value | Animated.AnimatedInterpolation<number> | number;

// SVG defs ids must be unique per mounted instance; React's useId is sanitized
// because raw ids contain colons, which break url(#...) references on the web.
function useSvgId(prefix: string): string {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// The galactic core.
// ---------------------------------------------------------------------------

// The brand's conic spectrum as a distant galaxy: a fan of thin pie sectors
// coloured by the shared Catmull-Rom sweep, masked to a disc that fades outward
// and softened by a Gaussian blur. Sector count is deliberately modest; the blur
// does the smoothing, so more sectors buy nothing but nodes.
const SECTORS = 96;

function GalaxyCore() {
  const { dark } = useTheme();
  const { width, height } = useWindowDimensions();
  const id = useSvgId("gal");
  const clock = backdropClock(ENERGY);

  const size = Math.min(300, Math.round(Math.min(width, height) * 0.44));
  const c = size / 2;
  const left = width * 0.5 - size / 2;
  const top = height * 0.42 - size / 2;

  const sectors = Array.from({ length: SECTORS }, (_, i) => {
    const a0 = (i * 360) / SECTORS;
    const a1 = ((i + 1) * 360) / SECTORS;
    const am = a0 + 180 / SECTORS;
    const x0 = c + c * Math.sin((a0 * Math.PI) / 180);
    const y0 = c - c * Math.cos((a0 * Math.PI) / 180);
    const x1 = c + c * Math.sin((a1 * Math.PI) / 180);
    const y1 = c - c * Math.cos((a1 * Math.PI) / 180);
    return { d: `M${c} ${c} L${x0.toFixed(2)} ${y0.toFixed(2)} A${c} ${c} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`, color: glowColor(am) };
  });

  const rotate = clock.drift.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const opacity = clock.breath.interpolate({ inputRange: [0, 1], outputRange: dark ? [0.3, 0.4] : [0.3, 0.38] });

  return (
    <Animated.View style={{ position: "absolute", left, top, width: size, height: size, opacity, transform: [{ rotate }] }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <Stop offset="30%" stopColor="#ffffff" stopOpacity={0.9} />
            <Stop offset="92%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
          <Mask id={`${id}-mask`}>
            <Rect x="0" y="0" width={size} height={size} fill={`url(#${id}-fade)`} />
          </Mask>
          <Filter id={`${id}-blur`} x="-25%" y="-25%" width="150%" height="150%">
            <FeGaussianBlur stdDeviation="11" result="b" />
            <FeColorMatrix in="b" type="saturate" values="1.25" />
          </Filter>
          <RadialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <G mask={`url(#${id}-mask)`} filter={`url(#${id}-blur)`}>
          {sectors.map((s, i) => (
            <Path key={i} d={s.d} fill={s.color} />
          ))}
        </G>
        <Circle cx={c} cy={c} r={size * 0.12} fill={`url(#${id}-core)`} />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Comets.
// ---------------------------------------------------------------------------

// A real comet carries TWO tails: a straight ion tail blown directly away from the
// light source, and a broader dust tail that lags along the orbit and warms in
// colour. Drawing both is the detail that reads as "someone knew what a comet
// looks like" rather than "a streak went past".
function Comet({ progress, from, to, tilt, scale }: { progress: AnimNumber; from: { x: number; y: number }; to: { x: number; y: number }; tilt: number; scale: number }) {
  const id = useSvgId("comet");
  const { width, height } = useWindowDimensions();
  const w = 260 * scale;
  const h = 26 * scale;

  const p = progress as Animated.Value;
  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [width * from.x, width * to.x] });
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [height * from.y, height * to.y] });
  const opacity = p.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 0.85, 0.85, 0] });

  return (
    <Animated.View
      style={{ position: "absolute", top: 0, left: 0, width: w, height: h, opacity, transform: [{ translateX }, { translateY }, { rotate: `${tilt}deg` }] }}
    >
      <Svg width={w} height={h}>
        <Defs>
          {/* Ion tail: narrow, straight, cold. */}
          <LinearGradient id={`${id}-ion`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#27cdf2" stopOpacity={0} />
            <Stop offset="0.7" stopColor="#7dd3fc" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0.9} />
          </LinearGradient>
          {/* Dust tail: broader, curved away, warm. */}
          <LinearGradient id={`${id}-dust`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffb43d" stopOpacity={0} />
            <Stop offset="0.8" stopColor="#ffd9a8" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#fff7ed" stopOpacity={0.6} />
          </LinearGradient>
          <RadialGradient id={`${id}-head`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <G transform={`translate(0, ${h / 2}) rotate(7)`}>
          <Rect x={0} y={-2.6 * scale} width={w * 0.86} height={5.2 * scale} rx={2.6 * scale} fill={`url(#${id}-dust)`} />
        </G>
        <Rect x={0} y={h / 2 - 1.6 * scale} width={w} height={3.2 * scale} rx={1.6 * scale} fill={`url(#${id}-ion)`} />
        <Circle cx={w - 2} cy={h / 2} r={5 * scale} fill={`url(#${id}-head)`} />
      </Svg>
    </Animated.View>
  );
}

function Comets() {
  const clock = backdropClock(ENERGY);
  // Two comets on channels with very different periods (the event cycle and the
  // 180s drift), so their passes almost never coincide and the sky never looks
  // like it is on a loop.
  const second = clock.drift.interpolate({
    inputRange: [0, 0.55, 0.78, 1],
    outputRange: [0, 0, 1, 1],
  });
  return (
    <>
      <Comet progress={clock.event} from={{ x: -0.25, y: 0.16 }} to={{ x: 1.15, y: 0.52 }} tilt={14} scale={1} />
      <Comet progress={second} from={{ x: 1.2, y: 0.72 }} to={{ x: -0.3, y: 0.3 }} tilt={196} scale={0.72} />
    </>
  );
}

// ---------------------------------------------------------------------------
// The scene.
// ---------------------------------------------------------------------------

/** The Canvas Universe backdrop. Mount inside a <BackdropHost>. */
export function CanvasUniverse() {
  const { tokens, dark } = useTheme();
  const sky = canvasSky(tokens.primary, dark);

  return (
    <Backdrop energetic vivid>
      {/* Back to front. The pinned deep field never travels. */}
      <Backdrop.Particles field={sky.deep} depth={0} sprite="disc" twinkle alpha={0.75} />

      {/* Clouds are held back deliberately: they are the layer most likely to sit
          directly behind a paragraph, and the sky must never win against the text. */}
      <Backdrop.Gradient blobs={sky.nebula.far} depth={0.06} size={860} at={{ x: 0.7, y: 0.25 }} alpha={0.72} />
      <Backdrop.Custom>
        <GalaxyCore />
      </Backdrop.Custom>
      <Backdrop.Gradient blobs={sky.nebula.near} depth={0.22} size={760} at={{ x: 0.2, y: 0.8 }} alpha={0.72} />

      {/* Four travelling shells on the quarters: the fly-through itself. */}
      {sky.shells.map((field, i) => (
        <Backdrop.Particles key={`s${i}`} field={field} depth={1} phase={i * 0.25} sprite="halo" bloom />
      ))}

      {/* Glints and streaks interleaved on the odd eighths between the shells. */}
      {sky.glints.map((field, i) => (
        <Backdrop.Particles key={`g${i}`} field={field} depth={1} phase={0.375 + i * 0.5} sprite="spark" twinkle />
      ))}
      {sky.streaks.map((field, i) => (
        <Backdrop.Particles key={`t${i}`} field={field} depth={1.6} phase={0.125 + i * 0.5} sprite="streak" />
      ))}

      <Backdrop.Custom>
        <Comets />
      </Backdrop.Custom>
    </Backdrop>
  );
}
