import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo } from "react-native";
import { View, useTheme, alpha, useFormFactor, useResponsive, useContainerWidth, supportsNativeDriver, thereAndBack } from "@ionizeio/canvas";
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Mask, Rect, G, Filter, FeGaussianBlur, FeColorMatrix } from "react-native-svg";
import { CanvasMark } from "./canvas-mark";
import { AppleLogo, ReactLogo, TypeScriptLogo, AndroidLogo, Html5Logo, TailwindLogo } from "./brand-logos";

// Canvas at the core, the platforms it targets orbiting around it: a dashed ring, a disc
// carrying the rainbow "C", a rainbow glow that
// spins behind it, and six brand badges that ride a slow orbit (each counter-rotated so its
// logo stays upright), exactly like the CSS keyframes. The web's `--i` order is preserved so
// each logo keeps its slot: tailwind 0, react 1, ts 2, android 3, web 4, ios 5. Honors
// reduce-motion by pinning the badges 60° apart and freezing the glow.
const BADGES: { i: number; color: string; render: (s: number, tint: string) => ReactNode }[] = [
  { i: 0, color: "#38bdf8", render: (s) => <TailwindLogo size={s} color="#38bdf8" /> },
  { i: 1, color: "#149eca", render: (s) => <ReactLogo size={s + 1} color="#149eca" /> },
  { i: 2, color: "#3178c6", render: (s) => <TypeScriptLogo size={s - 3} color="#3178c6" /> },
  { i: 3, color: "#3ddc84", render: (s) => <AndroidLogo size={s} color="#3ddc84" /> },
  { i: 4, color: "#e34f26", render: (s) => <Html5Logo size={s - 1} color="#e34f26" /> },
  // iOS rides the `--c: foreground` slot; the Apple glyph uses currentColor, so we
  // pass the resolved foreground tint (without it, dark mode renders it near-invisible).
  { i: 5, color: "__fg__", render: (s, tint) => <AppleLogo size={s} color={tint} /> },
];

// The rainbow glow from the keyframe: six bright hues swept as ONE conic ring. react-native-svg
// has no conic gradient, so the ring is built cross-platform from many thin pie sectors and
// blurred. A piecewise-LINEAR blend between the six hues leaves faint Mach-band lines at each
// stop (most visible green→yellow and blue→purple), so the colour is interpolated with a CLOSED
// Catmull-Rom spline through the hues instead: it passes through every hue but with a continuous
// first derivative, so neighbouring hues blend with no slope kink and therefore no seam.
export const GLOW = ["#06b6d4", "#22c55e", "#f59e0b", "#fb6a3c", "#ec4899", "#a855f7"];
const GLOW_RGB = GLOW.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
// The conic glow color at a screen angle (deg): a smooth closed Catmull-Rom sweep of the six hues.
// Exported so brand art elsewhere can paint the same sweep.
export function glowColor(deg: number): string {
  const n = GLOW_RGB.length;
  const seg = ((((deg % 360) + 360) % 360) / 360) * n; // 0..n around the wheel
  const i = Math.floor(seg) % n, t = seg - Math.floor(seg);
  const p0 = GLOW_RGB[(i - 1 + n) % n], p1 = GLOW_RGB[i], p2 = GLOW_RGB[(i + 1) % n], p3 = GLOW_RGB[(i + 2) % n];
  const ch = (k: number) => Math.max(0, Math.min(255, Math.round(catmull(p0[k], p1[k], p2[k], p3[k], t))));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}

export function HeroOrbit() {
  const { tokens } = useTheme();
  const reduced = useReducedMotion();

  const badgeSpin = useRef(new Animated.Value(0)).current;
  const glowSpin = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      badgeSpin.setValue(0);
      glowSpin.setValue(0);
      glowPulse.setValue(1);
      return;
    }
    // Match the CSS: 30s for the orbit, 6s for the rainbow spin, both linear and looping;
    // a 3.4s ease-in-out opacity pulse (heroGlowPulse: 0.85 → 1 → 0.85) breathes the glow.
    // The loops run on the native driver where there is one and on the JS driver on web
    // (supportsNativeDriver): under the New Architecture a JS-driven frame is a shadow-tree
    // commit per animated view, and this orbit alone kept the docs app's JS thread saturated
    // on an idle Home screen. A native loop cannot hold an Animated.sequence, so the pulse is
    // one timing 1 → 0.85 → 1 shaped by a there-and-back easing.
    const b = Animated.loop(Animated.timing(badgeSpin, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: supportsNativeDriver }));
    const g = Animated.loop(Animated.timing(glowSpin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: supportsNativeDriver }));
    const p = Animated.loop(
      Animated.timing(glowPulse, { toValue: 0.85, duration: 3400, easing: thereAndBack(Easing.inOut(Easing.ease)), useNativeDriver: supportsNativeDriver }),
    );
    b.start();
    g.start();
    p.start();
    return () => { b.stop(); g.stop(); p.stop(); };
  }, [reduced, badgeSpin, glowSpin, glowPulse]);

  // Desktop (the side-by-side hero, the kit's desktop tier: width > lg, 1024) keeps the
  // fixed orbit next to the copy. The stacked phone/tablet hero scales the WHOLE orbit
  // (ring, disc, glow, badges) to fill the available width, so on a phone it is the
  // screen's centerpiece instead of a small medallion. The tier and the badge size come
  // from the kit's bucket hooks (desktop on the server and for the hydration render, so
  // the pre-rendered page carries the fixed geometry rather than a collapsed orbit drawn
  // from a window width of 0), and the stacked width from the column this sits in,
  // measured by the probe below (the window until the first layout, once hydrated).
  const stacked = useFormFactor() !== "desktop";
  const badge = useResponsive({ base: 60, sm: 56 });
  const column = useContainerWidth();
  // Fill the column width (small side margin), capped so a big tablet does not get an
  // oversized orbit. The box is square when stacked, so it fills vertically too.
  const boxW = stacked && column.width > 0 ? Math.min(column.width - 40, 440) : 380;
  const r = stacked ? Math.round((boxW - badge - 20) / 2) : 150;
  const core = stacked ? Math.round(r * 0.78) : 116;
  // Stacked: trim the ring's vertical margin (badges nearly touch the box edges) so the orbit
  // takes less height and stays fully on screen below the copy.
  const boxH = stacked ? boxW - 18 : 400;
  const cx = boxW / 2, cy = boxH / 2;
  const mark = Math.round(core * 0.64);
  const logo = Math.round(26 * (badge / 60));

  const glowSize = core + 100; // a 50px inset glow around the core
  // The glow is bigger than the Canvas mark, so it needs many more conic sectors to keep
  // each seam sub-pixel; 360 (one per degree) + the blur below reads as a true conic.
  const gc = glowSize / 2, gR = glowSize / 2, gN = 360;
  const ring = Array.from({ length: gN }, (_, i) => {
    const a0 = (i * 360) / gN, a1 = ((i + 1) * 360) / gN, am = a0 + 180 / gN;
    const x0 = gc + gR * Math.sin((a0 * Math.PI) / 180), y0 = gc - gR * Math.cos((a0 * Math.PI) / 180);
    const x1 = gc + gR * Math.sin((a1 * Math.PI) / 180), y1 = gc - gR * Math.cos((a1 * Math.PI) / 180);
    return { d: `M${gc} ${gc} L${x0.toFixed(2)} ${y0.toFixed(2)} A${gR} ${gR} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`, color: glowColor(am) };
  });

  const orbitRotate = badgeSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const badgeCounter = badgeSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const glowRotate = glowSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View onLayout={column.onLayout} style={{ width: "100%", alignItems: "center" }}>
    <View style={{ width: boxW, height: boxH, alignSelf: "center", position: "relative" }}>
      {/* Dashed orbit ring */}
      <Svg width={boxW} height={boxH} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={tokens["muted-foreground"]} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 5" />
      </Svg>

      {/* Rainbow glow halo, behind the disc, spinning and breathing */}
      <Animated.View
        style={{
          position: "absolute",
          top: cy - glowSize / 2,
          left: cx - glowSize / 2,
          width: glowSize,
          height: glowSize,
          opacity: glowPulse,
          transform: [{ rotate: glowRotate }],
        }}
      >
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            {/* Mask: radial-gradient(closest-side, #000 0 54%, transparent 92%); the disc
                covers the solid center, leaving a ring that fades out by 92% of the radius. */}
            <RadialGradient id="glow-fade" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
              <Stop offset="54%" stopColor="#ffffff" stopOpacity={1} />
              <Stop offset="92%" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
            <Mask id="glow-mask">
              <Rect x="0" y="0" width={glowSize} height={glowSize} fill="url(#glow-fade)" />
            </Mask>
            {/* `filter: blur(9px) saturate(1.25)`: softens the conic sectors into one
                diffuse bloom (no visible banding) and deepens the hues. A hair more blur
                (11 vs 9) since sectors need slightly more help than a true CSS conic. */}
            <Filter id="glow-blur" x="-25%" y="-25%" width="150%" height="150%">
              <FeGaussianBlur stdDeviation="11" result="b" />
              <FeColorMatrix in="b" type="saturate" values="1.25" />
            </Filter>
          </Defs>
          <G mask="url(#glow-mask)" filter="url(#glow-blur)">
            {ring.map((s, i) => <Path key={i} d={s.d} fill={s.color} />)}
          </G>
        </Svg>
      </Animated.View>

      {/* The disc + the Canvas mark (static, above the glow) */}
      <View
        style={{
          position: "absolute",
          top: cy - core / 2,
          left: cx - core / 2,
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: tokens.card,
          borderWidth: 1,
          borderColor: tokens.border,
          alignItems: "center",
          justifyContent: "center",
          // Core shadow: 0 18px 40px -20px foreground@35%.
          boxShadow: `0px 18px 40px -20px ${alpha(tokens.foreground, 0.35)}`,
        }}
      >
        <CanvasMark size={mark} />
      </View>

      {/* Six brand badges on the orbiting layer; each counter-rotates to stay upright */}
      <Animated.View style={{ position: "absolute", top: 0, left: 0, width: boxW, height: boxH, transform: [{ rotate: orbitRotate }] }}>
        {BADGES.map(({ i, color, render }) => {
          const a = (i * 60 * Math.PI) / 180;
          const bx = cx + Math.cos(a) * r - badge / 2;
          const by = cy + Math.sin(a) * r - badge / 2;
          const tint = color === "__fg__" ? tokens.foreground : color;
          return (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                top: by,
                left: bx,
                width: badge,
                height: badge,
                borderRadius: badge / 2,
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ rotate: badgeCounter }],
                // Badge inner shadow: a tight colored glow (the -10px spread keeps it
                // small) plus a faint grounding shadow. boxShadow carries both + the spread,
                // which RN's shadow* props cannot.
                boxShadow: `0px 8px 22px -10px ${alpha(tint, 0.55)}, 0px 1px 2px ${alpha(tokens.foreground, 0.1)}`,
              }}
            >
              {render(logo, tint)}
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
    </View>
  );
}
