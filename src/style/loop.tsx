import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Animated, Platform, StyleSheet, View, type EasingFunction, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { devWarn } from "./dev-warn.js";
import { createNativeLoop, type NativeLoop } from "./loop-native.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

// Looping decorative motion that costs nothing per frame on any platform.
//
// A LOOP CHANNEL is a shared periodic phase: 0..1 over its period, wall-clock paced,
// restarting forever, optionally shaped (an out-and-back for a breath or a shimmer, a
// hold then a sweep for a rare event). A LOOP VIEW binds its opacity and transform to
// a channel through piecewise-linear TRACKS, the same `inputRange` / `outputRange`
// vocabulary as `Animated.interpolate`, plus a phase offset so sibling layers stagger.
//
// The point is where the frames come from. On iOS and Android the channel is one
// `Animated.timing` inside `Animated.loop` on the native driver and every track is an
// interpolation node of it, so the whole graph advances in the native animated module
// and the JS thread is idle between frames (the shadow-tree commit cost of a JS-driven
// frame is in src/style/motion.ts). On the web react-native-web has no native driver: its
// JS driver re-renders every Animated.View through React on every animation frame, one
// React commit and dozens of inline style writes per frame for a decorative sky, enough
// to saturate the main thread of an idle page and starve a Suspense retry in an
// unthrottled browser. So on the web a loop view is a plain View whose motion is a CSS
// keyframe animation, compiled through react-native-web's own `animationKeyframes`
// style and run by the compositor: zero JavaScript and zero DOM writes per frame. The
// same sampled track feeds both: the native interpolation's ranges and the web
// keyframes are one table. Phase continuity is an EPOCH: every view mounted against a
// playing channel computes its `animation-delay` from the channel's wall-clock start,
// so a surface that remounts (a page change, a material toggle) picks the sky up
// mid-flight instead of restarting it.
//
// Play channels from effects, never during render: the web delay is derived from the
// wall clock, and a channel playing during a server render would put a server timestamp
// into markup the client then fails to hydrate.

export interface LoopChannelOptions {
  /** Cycle length in ms. */
  period: number;
  /** Shape of one cycle: maps the linear 0..1 phase to the channel's 0..1 value
   *  (`thereAndBack`, `holdThen`, `keyframes` in src/style/motion.ts). Linear when
   *  omitted, which is the sawtooth a travelling layer wraps on. */
  shape?: EasingFunction;
  /** Points a shaped channel is sampled at per cycle (the native interpolation's
   *  steps and the web keyframes alike). A linear channel needs none. Default 64;
   *  raise it for a shape with a sharp corner. */
  samples?: number;
}

/** What a loop view reads from its channel. Playing: `epoch` is the wall-clock
 *  millisecond at which the current cycle count began at phase 0. Parked: `phase`
 *  is where the channel holds. */
export interface LoopChannelState {
  playing: boolean;
  epoch: number;
  phase: number;
}

export interface LoopChannel {
  readonly period: number;
  /** The sampled shape as an interpolation table, or null for a linear channel. */
  readonly shape: { inputRange: number[]; outputRange: number[] } | null;
  /** The linear cycle position as an Animated.Value. It advances on iOS and Android
   *  only; on the web the channel runs on CSS time and this value stays parked, so
   *  bind through `LoopView` rather than through `Animated` for anything that must
   *  move on every platform. */
  readonly phase: Animated.Value;
  /** Start playing from `phase`, or resume from where the channel last stopped. */
  play(phase?: number): void;
  /** Stop and hold at `phase`, remembering the resume point a stop captured. */
  park(phase: number): void;
  /** Stop where the channel is now, capturing the phase for the next `play()`. */
  stop(): void;
  /** The cycle position, 0..1, at `now` (wall-clock ms; defaults to Date.now()). */
  position(now?: number): number;
  subscribe(listener: () => void): () => void;
  state(): LoopChannelState;
}

const WEB = Platform.OS === "web";
const DEFAULT_SAMPLES = 64;

function sampleShape(shape: EasingFunction, samples: number): { inputRange: number[]; outputRange: number[] } {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    inputRange.push(t);
    outputRange.push(shape(t));
  }
  return { inputRange, outputRange };
}

const wrap = (phase: number) => {
  const rest = phase % 1;
  return rest < 0 ? rest + 1 : rest;
};

export function createLoopChannel(options: LoopChannelOptions): LoopChannel {
  const { period } = options;
  const shape = options.shape ? sampleShape(options.shape, options.samples ?? DEFAULT_SAMPLES) : null;
  const native: NativeLoop | null = WEB ? null : createNativeLoop(period);
  const listeners = new Set<() => void>();
  let state: LoopChannelState = { playing: false, epoch: 0, phase: 0 };
  // The phase a stop captured, which a park must not overwrite: a poster still in the
  // middle of a run resumes where the run was, not at the poster.
  let resumeAt = 0;

  const set = (next: LoopChannelState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const position = (now = Date.now()) => (state.playing ? wrap((now - state.epoch) / period) : state.phase);
  const capture = () => {
    if (state.playing) resumeAt = position();
  };

  return {
    period,
    shape,
    phase: native ? native.phase : new Animated.Value(0),
    play(at) {
      capture();
      const phase = wrap(at ?? resumeAt);
      native?.play(phase);
      set({ playing: true, epoch: Date.now() - phase * period, phase });
    },
    park(at) {
      capture();
      const phase = wrap(at);
      native?.hold(phase);
      set({ playing: false, epoch: 0, phase });
    },
    stop() {
      if (!state.playing) return;
      capture();
      native?.stop();
      set({ playing: false, epoch: 0, phase: resumeAt });
    },
    position,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    state: () => state,
  };
}

// ---------------------------------------------------------------------------
// Tracks.
// ---------------------------------------------------------------------------

/** A piecewise-linear map of a channel's value onto a style value, the way
 *  `Animated.interpolate` reads it: `inputRange` rises from 0 to 1 across the channel's
 *  value, `outputRange` carries the matching style values, and the segments between
 *  are straight. `offset` reads the channel that many cycles ahead (wrapping), so
 *  sibling layers on one channel stagger without a channel each. */
export interface LoopTrack {
  channel: LoopChannel;
  inputRange: readonly number[];
  outputRange: readonly number[];
  offset?: number;
}

/** Evaluate a track's map at a channel value, clamped at the ends. */
export function trackAt(track: Pick<LoopTrack, "inputRange" | "outputRange">, value: number): number {
  const { inputRange, outputRange } = track;
  if (value <= inputRange[0]!) return outputRange[0]!;
  for (let i = 1; i < inputRange.length; i++) {
    const x1 = inputRange[i]!;
    if (value <= x1) {
      const x0 = inputRange[i - 1]!;
      const y0 = outputRange[i - 1]!;
      const y1 = outputRange[i]!;
      return x1 === x0 ? y1 : y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return outputRange[outputRange.length - 1]!;
}

/** The channel value a track sees at cycle position `phase`: the offset wrap, then
 *  the shape. */
function channelValue(track: LoopTrack, phase: number): number {
  const at = wrap(phase + (track.offset ?? 0));
  return track.channel.shape ? trackAt(track.channel.shape, at) : at;
}

/** A track's style value at cycle position `phase`. */
export function trackValueAt(track: LoopTrack, phase: number): number {
  return trackAt(track, channelValue(track, phase));
}

/** The channel values a track is sampled at over one cycle of its own timeline (the
 *  channel's cycle shifted by the track's offset): the track's own breakpoints on a
 *  linear channel, which is exact, or the channel's shape grid on a shaped one. Each
 *  entry pairs the cycle position with the channel value there. */
export function trackSamples(track: LoopTrack): Array<{ at: number; value: number }> {
  const { shape } = track.channel;
  if (shape) return shape.inputRange.map((at, i) => ({ at, value: shape.outputRange[i]! }));
  return [...new Set([0, ...track.inputRange, 1])].sort((a, b) => a - b).map((at) => ({ at, value: at }));
}

// ---------------------------------------------------------------------------
// The view.
// ---------------------------------------------------------------------------

/** The view's own props pass through to the host view (accessibility flags, testID,
 *  pointer events); the tracks are the only additions. */
export interface LoopViewProps extends Omit<ViewProps, "style"> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  opacity?: LoopTrack;
  /** Transform components, applied translate, rotate, then scale. A number is a
   *  constant. Every animated transform component on one view must ride the same
   *  channel with the same offset: a transform is one property on both platforms. */
  scale?: LoopTrack | number;
  /** Degrees. */
  rotate?: LoopTrack | number;
  translateX?: LoopTrack | number;
  translateY?: LoopTrack | number;
}

const isTrack = (value: LoopTrack | number | undefined): value is LoopTrack => typeof value === "object";

interface TransformParts {
  translateX?: LoopTrack | number;
  translateY?: LoopTrack | number;
  rotate?: LoopTrack | number;
  scale?: LoopTrack | number;
}

const TRANSFORM_ORDER: Array<keyof TransformParts> = ["translateX", "translateY", "rotate", "scale"];

function transformTrack(parts: TransformParts): LoopTrack | null {
  let first: LoopTrack | null = null;
  for (const key of TRANSFORM_ORDER) {
    const part = parts[key];
    if (!isTrack(part)) continue;
    if (!first) first = part;
    else devWarn(part.channel !== first.channel || (part.offset ?? 0) !== (first.offset ?? 0), "[canvas] <LoopView />: every animated transform component must ride one channel at one offset; the first component's channel drives the transform.");
  }
  return first;
}

const IDLE_STATE: LoopChannelState = { playing: false, epoch: 0, phase: 0 };
const NO_CHANNEL: Pick<LoopChannel, "subscribe" | "state"> = { subscribe: () => () => {}, state: () => IDLE_STATE };

function useChannelState(channel: LoopChannel | null): LoopChannelState {
  const source = channel ?? NO_CHANNEL;
  return useSyncExternalStore(source.subscribe, source.state, source.state);
}

const unit = (key: keyof TransformParts, value: number) => (key === "rotate" ? `${value}deg` : key === "scale" ? `${value}` : `${value}px`);

/** The CSS transform at cycle position `phase` (a parked view). */
function transformAt(parts: TransformParts, phase: number): string {
  const out: string[] = [];
  for (const key of TRANSFORM_ORDER) {
    const part = parts[key];
    if (part === undefined) continue;
    out.push(`${key}(${unit(key, isTrack(part) ? trackValueAt(part, phase) : part)})`);
  }
  return out.join(" ");
}

/** The CSS transform at a channel value (a keyframe of the shared transform track). */
function transformAtValue(parts: TransformParts, value: number): string {
  const out: string[] = [];
  for (const key of TRANSFORM_ORDER) {
    const part = parts[key];
    if (part === undefined) continue;
    out.push(`${key}(${unit(key, isTrack(part) ? trackAt(part, value) : part)})`);
  }
  return out.join(" ");
}

// --- web: CSS keyframes through react-native-web's StyleSheet -----------------

const percent = (t: number) => `${(t * 100).toFixed(4)}%`;

interface WebAnimation {
  keyframes: Record<string, Record<string, number | string>>;
  period: number;
}

/** One cycle of keyframes for a property on a track's own timeline. */
function webAnimation(track: LoopTrack, styleAt: (value: number) => Record<string, number | string>): WebAnimation {
  const keyframes: Record<string, Record<string, number | string>> = {};
  for (const { at, value } of trackSamples(track)) keyframes[percent(at)] = styleAt(value);
  return { keyframes, period: track.channel.period };
}

/** The negative delay that puts a view mounted at `now` on the channel's current
 *  position, the track's offset included: the animation starts that far into its cycle. */
function webDelay(track: LoopTrack, state: LoopChannelState, now: number): number {
  const { period } = track.channel;
  return -Math.round(wrap((now - state.epoch) / period + (track.offset ?? 0)) * period);
}

// Compiled animation styles, one per distinct keyframe set: StyleSheet.create emits the
// @keyframes rules into the document once and the class name is reused by every view
// on that track (nine twinkle buckets share one rule and differ only in their delay).
const compiled = new Map<string, ViewStyle>();

function compiledAnimation(key: string, animations: WebAnimation[]): ViewStyle {
  let style = compiled.get(key);
  if (!style) {
    style = StyleSheet.create({
      loop: {
        animationKeyframes: animations.map((a) => a.keyframes),
        animationDuration: animations.map((a) => `${a.period}ms`).join(", "),
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
      } as unknown as ViewStyle,
    }).loop;
    compiled.set(key, style);
  }
  return style;
}

function WebLoopView({ style, children, opacity, scale, rotate, translateX, translateY, ...rest }: LoopViewProps) {
  const parts: TransformParts = { scale, rotate, translateX, translateY };
  const transform = transformTrack(parts);
  const opacityState = useChannelState(opacity?.channel ?? null);
  const transformState = useChannelState(transform?.channel ?? null);

  const animations: WebAnimation[] = [];
  const delays: Array<{ track: LoopTrack; state: LoopChannelState }> = [];
  const inline: Record<string, number | string> = {};

  if (opacity) {
    if (opacityState.playing) {
      animations.push(webAnimation(opacity, (value) => ({ opacity: trackAt(opacity, value) })));
      delays.push({ track: opacity, state: opacityState });
    } else inline.opacity = trackValueAt(opacity, opacityState.phase);
  }
  if (TRANSFORM_ORDER.some((key) => parts[key] !== undefined)) {
    if (transform && transformState.playing) {
      animations.push(webAnimation(transform, (value) => ({ transform: transformAtValue(parts, value) })));
      delays.push({ track: transform, state: transformState });
    } else inline.transform = transformAt(parts, transform ? transformState.phase : 0);
  }

  const key = JSON.stringify(animations.map((a) => [a.keyframes, a.period]));
  const animation = animations.length > 0 ? compiledAnimation(key, animations) : null;
  // The delay is fixed for as long as the same animation runs against the same play:
  // a re-render must not hand the browser a fresh delay (that restarts the timing from
  // a new wall-clock reading and skips), so it is recomputed only when the channel is
  // played again or the keyframes change, which is when the animation restarts anyway.
  const epochs = delays.map((d) => d.state.epoch).join(",");
  const delay = useMemo(() => {
    const now = Date.now();
    return delays.map((d) => `${webDelay(d.track, d.state, now)}ms`).join(", ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, epochs]);
  if (animation) inline.animationDelay = delay;

  // A running CSS animation keeps the start time it began with, so a new delay handed
  // to it re-phases it relative to THAT start, not to now: a channel played again while
  // it was already playing (a harness jumping to a moment, an app re-syncing a clock)
  // would land every view late by the animation's age. Such a re-phase remounts the
  // node instead, so a fresh animation starts now at the delay computed for now. Park
  // and resume keep the node: a parked view carries no animation, and the one a resume
  // adds is new anyway. The layout effect re-renders before paint, so the old node
  // never shows a frame at the wrong phase.
  const [generation, setGeneration] = useState(0);
  const playing = animation ? epochs : "";
  const previous = useRef(playing);
  useIsomorphicLayoutEffect(() => {
    if (previous.current !== "" && playing !== "" && previous.current !== playing) setGeneration((g) => g + 1);
    previous.current = playing;
  }, [playing]);

  return (
    <View key={generation} {...rest} style={[style, animation, inline as ViewStyle]}>
      {children}
    </View>
  );
}

// --- native: interpolation nodes on the channel's Animated phase ---------------

const sawtooth = (phase: Animated.Value, offset: number) => {
  if (offset === 0) return phase;
  const seam = 1 - offset;
  return phase.interpolate({ inputRange: [0, seam, seam + 1e-6, 1], outputRange: [offset, 1, 0, offset] });
};

function nativeNode(track: LoopTrack): Animated.AnimatedInterpolation<number> {
  const { channel } = track;
  let node: Animated.Value | Animated.AnimatedInterpolation<number> = sawtooth(channel.phase, wrap(track.offset ?? 0));
  if (channel.shape) node = node.interpolate({ inputRange: channel.shape.inputRange, outputRange: channel.shape.outputRange });
  return node.interpolate({ inputRange: [...track.inputRange], outputRange: [...track.outputRange], extrapolate: "clamp" });
}

const trackKey = (track: LoopTrack | number | undefined) => (isTrack(track) ? `${track.offset ?? 0}|${track.inputRange.join(",")}|${track.outputRange.join(",")}` : String(track));

function NativeLoopView({ style, children, opacity, scale, rotate, translateX, translateY, ...rest }: LoopViewProps) {
  const parts: TransformParts = { scale, rotate, translateX, translateY };
  const transform = transformTrack(parts);
  const channels = [opacity?.channel, transform?.channel];
  const key = [opacity, translateX, translateY, rotate, scale].map(trackKey).join("/");
  // The graph is rebuilt only when a binding changes; a re-render with the same tracks
  // keeps the nodes the native module already holds.
  const animated = useMemo(() => {
    // Animated nodes stand in for numbers in the style; the Animated.View resolves them.
    const out: Record<string, unknown> = {};
    if (opacity) out.opacity = nativeNode(opacity);
    const components: Array<Record<string, unknown>> = [];
    for (const k of TRANSFORM_ORDER) {
      const part = parts[k];
      if (part === undefined) continue;
      if (isTrack(part)) {
        const node = nativeNode(part);
        components.push({ [k]: k === "rotate" ? node.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1deg"] }) : node });
      } else components.push({ [k]: k === "rotate" ? `${part}deg` : part });
    }
    if (components.length > 0) out.transform = components;
    return out as ViewStyle;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...channels]);
  return (
    <Animated.View {...rest} style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

/** A view whose opacity and transform loop with a channel, on the native driver on
 *  iOS and Android and as a compositor-run CSS animation on the web. */
export const LoopView = WEB ? WebLoopView : NativeLoopView;
