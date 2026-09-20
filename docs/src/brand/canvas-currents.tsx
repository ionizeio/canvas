import { useId, useMemo, type ReactElement } from "react";
import Svg, { Defs, FeGaussianBlur, Filter, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Backdrop, LoopView, View, backdropClock, useBackdropBox, useReducedTransparency, useTheme, type Energy, type LoopTrack } from "@ionizeio/canvas";
import { CURRENTS, type CurrentKind } from "./currents-tunables";

// App-specific brand art on the kit's shared renderer. Each static SVG rides a
// single LoopView, producing CSS keyframes on web and native-driver transforms on
// iOS/Android. No per-frame React state, DOM mutation or platform-specific artwork.
// All paths and filters are static; only the layer's transform and opacity move.
export function CanvasCurrents({ still, energy = CURRENTS.energy }: { still?: boolean; energy?: Energy } = {}) {
  return (
    <Backdrop still={still} calm={energy === "calm"} energetic={energy === "energetic"}>
      <Backdrop.Custom><CurrentsArt energy={energy} /></Backdrop.Custom>
    </Backdrop>
  );
}

function useArtId(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

function CurrentsArt({ energy }: { energy: Energy }) {
  const box = useBackdropBox();
  const { tokens, dark } = useTheme();
  const reducedTransparency = useReducedTransparency();
  const id = useArtId("currents-veil");
  // Backdrop already removes every layer for Increase Contrast. A custom scene
  // must also omit its own translucent washes for Reduce Transparency.
  if (!box || reducedTransparency) return null;
  const { width, height } = box;
  return (
    <View testID="canvas-currents" style={{ position: "absolute", top: 0, left: 0, width, height, opacity: dark ? CURRENTS.ink.dark : CURRENTS.ink.light, pointerEvents: "none" }}>
      <CurrentLayer kind="cool" width={width} height={height} energy={energy} />
      <CurrentLayer kind="warm" width={width} height={height} energy={energy} />
      <CurrentLayer kind="violet" width={width} height={height} energy={energy} />
      <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id={id} cx="49%" cy="45%" r="66%">
            <Stop offset="0%" stopColor={tokens.background} stopOpacity={CURRENTS.veil.center} />
            <Stop offset={`${CURRENTS.veil.fade * 100}%`} stopColor={tokens.background} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={`url(#${id})`} opacity={CURRENTS.veil.opacity} />
      </Svg>
    </View>
  );
}

function CurrentLayer({ kind, width, height, energy }: { kind: CurrentKind; width: number; height: number; energy: Energy }) {
  const spec = CURRENTS.layers[kind];
  const channel = backdropClock(energy)[spec.channel];
  const id = useArtId(`current-${kind}`);
  const pad = Math.ceil(Math.max(width, height) * CURRENTS.overscan);
  const tracks = useMemo(() => {
    const samples = CURRENTS.samplesPerCycle * spec.cycles;
    const inputRange = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    // Whole cosine cycles give both endpoints identical position, opacity and
    // velocity. Staggered offsets are handled by LoopView's shared clock, so a
    // route remount resumes the same frame instead of restarting the ribbons.
    const wave = inputRange.map((t) => (1 - Math.cos(t * spec.cycles * 2 * Math.PI)) / 2);
    const track = (range: readonly [number, number], multiplier = 1): LoopTrack => ({
      channel, offset: spec.offset, inputRange,
      outputRange: wave.map((t) => (range[0] + (range[1] - range[0]) * t) * multiplier),
    });
    return { translateX: track(spec.x, width), translateY: track(spec.y, height), rotate: track(spec.rotate), scale: track(spec.scale), opacity: track(spec.opacity) };
  }, [channel, spec, width, height]);

  return (
    <LoopView {...tracks} testID={`current-${kind}`} style={{ position: "absolute", left: -pad, top: -pad, width: width + 2 * pad, height: height + 2 * pad }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${CURRENTS.viewBox.width} ${CURRENTS.viewBox.height}`} preserveAspectRatio="none">
        <Defs>
          <Filter id={`${id}-soft`} x="-15%" y="-70%" width="130%" height="240%">
            <FeGaussianBlur stdDeviation={spec.blur} />
          </Filter>
        </Defs>
        {kind === "cool" ? <CoolCurrent id={id} /> : kind === "warm" ? <WarmCurrent id={id} /> : <VioletCurrent id={id} />}
      </Svg>
    </LoopView>
  );
}

function Stroke({ id, d, width, opacity = 1, soft = false }: { id: string; d: string; width: number; opacity?: number; soft?: boolean }) {
  return <Path d={d} fill="none" stroke={`url(#${id}-ink)`} strokeWidth={width} opacity={opacity} filter={soft ? `url(#${id}-soft)` : undefined} />;
}

function Ink({ id, children, diagonal = false }: { id: string; children: ReactElement[]; diagonal?: boolean }) {
  return <LinearGradient id={`${id}-ink`} x1="0%" y1={diagonal ? "100%" : "50%"} x2="100%" y2={diagonal ? "0%" : "50%"}>{children}</LinearGradient>;
}

function CoolCurrent({ id }: { id: string }) {
  const edge = "M -100 250 C 105 99 201 307 375 151 S 760 20 945 62 S 1140 55 1300 -65";
  return (
    <>
      <Defs>
        <Ink id={id}>
          <Stop offset="0%" stopColor="#b24dff" stopOpacity={0} />
          <Stop offset="22%" stopColor="#46e082" stopOpacity={0.2} />
          <Stop offset="55%" stopColor="#27cdf2" stopOpacity={0.3} />
          <Stop offset="79%" stopColor="#46e082" stopOpacity={0.13} />
          <Stop offset="100%" stopColor="#27cdf2" stopOpacity={0} />
        </Ink>
        <LinearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#27cdf2" stopOpacity={0} />
          <Stop offset="75%" stopColor="#27cdf2" stopOpacity={0.03} />
          <Stop offset="100%" stopColor="#46e082" stopOpacity={0.14} />
        </LinearGradient>
      </Defs>
      <Path d="M -100 240 C 100 95 180 310 375 151 S 760 20 945 62 S 1140 55 1300 -65 L1300 -140 C920 -60 730 -90 450 5 S70 225 -100 150Z" fill={`url(#${id}-fill)`} />
      <Stroke id={id} d={edge} width={10} soft />
      <Stroke id={id} d={edge} width={1.1} opacity={0.5} />
      <Stroke id={id} d="M -100 286 C 109 97 212 321 397 161 S 785 14 956 58 S 1154 15 1300 -88" width={0.7} opacity={0.25} />
      <Stroke id={id} d="M 340 838 C 550 709 621 730 776 511 S 1066 452 1330 298" width={18} opacity={0.55} soft />
    </>
  );
}

function WarmCurrent({ id }: { id: string }) {
  const edge = "M -95 421 C 186 346 226 541 486 608 S 901 441 1058 398 S 1195 346 1300 315";
  return (
    <>
      <Defs>
        <Ink id={id}>
          <Stop offset="0%" stopColor="#b24dff" stopOpacity={0.06} />
          <Stop offset="23%" stopColor="#ff6a4d" stopOpacity={0.26} />
          <Stop offset="43%" stopColor="#ffb43d" stopOpacity={0.23} />
          <Stop offset="66%" stopColor="#46e082" stopOpacity={0.08} />
          <Stop offset="85%" stopColor="#27cdf2" stopOpacity={0.28} />
          <Stop offset="100%" stopColor="#b24dff" stopOpacity={0} />
        </Ink>
        <LinearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ff6a4d" stopOpacity={0.08} />
          <Stop offset="45%" stopColor="#b24dff" stopOpacity={0.04} />
          <Stop offset="100%" stopColor="#b24dff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M -95 421 C 186 346 226 541 486 608 S 901 441 1058 398 S 1195 346 1300 315 L1300 410 C1087 459 922 545 749 669 S421 664 245 564 S59 472 -95 490Z" fill={`url(#${id}-fill)`} />
      <Stroke id={id} d={edge} width={12} soft />
      <Stroke id={id} d={edge} width={1.1} opacity={0.65} />
      <Stroke id={id} d="M -95 447 C 169 347 260 571 516 623 S 883 452 1056 408 S 1220 354 1300 321" width={0.8} opacity={0.35} />
      <Stroke id={id} d="M -95 460 C 179 341 268 586 539 634 S 891 463 1061 419 S 1226 367 1300 328" width={0.6} opacity={0.2} />
    </>
  );
}

function VioletCurrent({ id }: { id: string }) {
  const upper = "M 630 90 C 906 236 1008 80 1200 12 S 1350 -23 1430 -80";
  const lower = "M -90 523 C 170 479 222 610 422 704 S 738 778 905 674";
  return (
    <>
      <Defs>
        <Ink id={id} diagonal>
          <Stop offset="0%" stopColor="#b24dff" stopOpacity={0} />
          <Stop offset="30%" stopColor="#b24dff" stopOpacity={0.24} />
          <Stop offset="60%" stopColor="#ff2d6e" stopOpacity={0.15} />
          <Stop offset="85%" stopColor="#ffb43d" stopOpacity={0.24} />
          <Stop offset="100%" stopColor="#ffb43d" stopOpacity={0} />
        </Ink>
      </Defs>
      <Stroke id={id} d={upper} width={23} soft />
      <Stroke id={id} d={upper} width={1} opacity={0.45} />
      <Stroke id={id} d={lower} width={18} soft />
      <Stroke id={id} d={lower} width={1} opacity={0.5} />
    </>
  );
}
