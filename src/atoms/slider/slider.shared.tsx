import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import {
  Animated,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type AccessibilityActionEvent,
} from "react-native";
import { View, Text, GlassSurface, useTheme, useControllableState, useFillStyle, useReducedMotion, isRTL, FOCUS_RESET, type ColorTokens, type ViewProps, type ViewStyle, type TextStyle, type StyleProp } from "../../style/index.js";
import { clamp } from "../../style/math.js";

// Shared Slider shell. Uses React Native's primitives DIRECTLY (no engine className
// layer) and reads the active brand tokens via useTheme, so the track/fill/thumb
// follow light/dark and the glass surface. The shared structure (the track + filled
// range + draggable thumb, the geometry math, the PanResponder drag, tap-to-jump,
// and the full adjustable accessibility) lives here once; a platform file supplies
// only its track + thumb styles and anatomy flags (a SliderSkin) and calls
// createSlider. PanResponder is React Native's gesture system and works on iOS,
// Android, and react-native-web alike, so the drag is one cross-platform code path
// (no Platform.OS branch).

export interface SliderProps {
  /** Controlled value; omit for uncontrolled use. The thumb sits at this value (clamped to [min, max]). */
  value?: number;
  /** Initial value for uncontrolled use (a bare <Slider/> drags out of the box). Default `min`. */
  defaultValue?: number;
  /** Lower bound of the range. Default 0. */
  min?: number;
  /** Upper bound of the range. Default 100. */
  max?: number;
  /** Snap increment. Default 1. Set to a fraction for finer control. */
  step?: number;
  /** Fired with the next (clamped, snapped) value as the thumb is dragged or the track tapped (both modes). */
  onChange?: (value: number) => void;
  /** E2E hook forwarded to the slider container. */
  testID?: string;
  /**
   * The title line, rendered ABOVE the track (a slider's label sits above the rail,
   * not beside it). Supplying it builds the component-owned header so the caller
   * never hand-composes a Column + Typography above a bare slider, and the visible
   * title also names the control for assistive tech (see `accessibilityLabel`).
   */
  children?: ReactNode;
  /** Optional muted secondary line rendered under the title, for a hint or unit note. */
  description?: ReactNode;
  /**
   * Render the live current value (the same value the thumb sits at) as a trailing
   * readout on the title line, right-aligned. With no title it still renders the
   * value as a standalone trailing readout above the track. The number tracks the
   * drag in real time and uses tabular figures so it does not jitter.
   */
  showValue?: boolean;
  // Size (pick one; default is the standard track + thumb).
  small?: boolean;
  large?: boolean;
  // Width: a slider is FILL (src/style/sizing.ts) like the other input-like
  // controls; the parent layout container provides the bounds.
  // State.
  disabled?: boolean;
  /** Accessible name for the slider (e.g. "Volume"). */
  accessibilityLabel?: string;
  /** Extra style on the slider container, applied last. */
  style?: StyleProp<ViewStyle>;
}

export type Size = "small" | "base" | "large";

// Size precedence within the axis: large > small > default (first match wins),
// matching the other atoms.
function sizeOf(p: SliderProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// The only thing a platform skin owns: the track geometry (heights + radii), the
// thumb box (width x height: a circle on the web, the iOS 27 capsule knob, the M3
// Expressive bar handle), the anatomy flags (the M3 track gap + end stop, the
// minimum touch-target row height, the stepped tick dots), and the press/state
// feedback, all built from the active tokens for a given size and pressed state.
// The fill is always the brand `primary` (dimmed via `muted` when disabled); the
// skin never injects a platform default color.
export interface SliderSkin {
  /** Track height for a size, used by the shell for hit geometry and to center the segments. */
  trackHeight: (size: Size) => number;
  /** Thumb width along the travel axis (the diameter for round thumbs, the bar/capsule width otherwise). */
  thumbWidth: (size: Size) => number;
  /** Thumb height (the diameter for round thumbs), used by the shell to center the thumb. */
  thumbHeight: (size: Size) => number;
  /**
   * Gap between the handle and BOTH track segments (M3 Expressive anatomy). When
   * set (> 0) the shell renders the track as two absolutely-positioned segments
   * (active | gap | handle | gap | inactive) and `track`/`fill` supply only the
   * segment colors + per-corner radii; when 0/omitted the shell nests `fill`
   * inside the full-width `track` rail (the continuous-rail anatomy).
   */
  trackGap?: number;
  /** Floor for the interactive row height (iOS HIG 44pt / Android M3 48dp minimum touch target). */
  minRowHeight?: number;
  /** Render the M3 stop indicator dot in the inactive track end (requires `tick`). */
  endStop?: boolean;
  /** Stop/tick indicator dot diameter (default 4). */
  tickSize?: number;
  /** The inactive track: the full-width rounded rail (continuous anatomy) or the inactive segment (gap anatomy). */
  track: (tokens: ColorTokens, size: Size, disabled: boolean) => ViewStyle;
  /** The active range: the filled overlay from min to the value (continuous) or the active segment (gap anatomy). */
  fill: (tokens: ColorTokens, size: Size, disabled: boolean) => ViewStyle;
  /** The draggable thumb (its left/top offset is set by the shell). */
  thumb: (tokens: ColorTokens, size: Size, disabled: boolean, pressed: boolean) => ViewStyle;
  /**
   * Render the thumb as a real Liquid Glass control (the iOS 26 slider handle
   * "transforms into liquid glass during interaction", WWDC25). When set, the shell
   * routes the thumb through the shared `GlassSurface` primitive: on iOS 26+ (theme
   * `surface === "glass"`, the platform default there) it becomes an Apple Liquid
   * Glass knob that refracts the track, and it springs up on press (Apple's
   * scale/bounce); under solid surface, Reduce Transparency, or Increase Contrast it
   * degrades to the opaque `thumb` fill above, unchanged. Omitted skins render the
   * plain `thumb` View exactly as before.
   */
  glassThumb?: boolean;
  /**
   * The bright translucent under-fill for the glass knob (passed to `GlassSurface`'s
   * `tint`), so the handle reads as a light glass puck on both schemes instead of a
   * popover-tinted blob. Only consulted when `glassThumb` is set.
   */
  glassTint?: (tokens: ColorTokens) => string;
  /**
   * Stop/tick dot fill for stepped sliders (and the M3 end stop). The shell sizes
   * and positions the dot; `onActive` says the dot sits on the active (filled)
   * side, for the M3 on-primary vs on-secondary-container roles. Omit to render
   * no ticks (the web look).
   */
  tick?: (tokens: ColorTokens, size: Size, disabled: boolean, onActive: boolean) => ViewStyle;
  /** The title line above the track (component-owned label type; brand, not a platform face). */
  label: (tokens: ColorTokens, size: Size) => TextStyle;
  /** The muted secondary description line under the title. */
  description: (tokens: ColorTokens, size: Size) => TextStyle;
  /** The live value readout trailing the title line (muted, tabular figures). */
  value: (tokens: ColorTokens, size: Size) => TextStyle;
}

// Snap a raw value to the step grid, anchored at `min`, then clamp to [min, max].
function snap(raw: number, min: number, max: number, step: number): number {
  if (step <= 0) return clamp(raw, min, max);
  const steps = Math.round((raw - min) / step);
  const snapped = min + steps * step;
  // Round off floating-point drift from non-integer steps (e.g. 0.1).
  const decimals = (String(step).split(".")[1] ?? "").length;
  const fixed = decimals > 0 ? Number(snapped.toFixed(decimals)) : snapped;
  return clamp(fixed, min, max);
}

// Ticks render only for a deliberately-discrete slider: at least 2 intervals so
// there is an interior stop, and at most this many so the default 0-100/step-1
// slider does not sprout a hundred dots (both the M3 stops config and the iOS 27
// kit Ticks layer are for coarse, discrete scales).
const MAX_TICK_INTERVALS = 20;

// How far the Liquid Glass handle springs up on press (Apple's scale/bounce as the
// iOS 26 slider "transforms into liquid glass during interaction"). Only applied on
// the glass-thumb path under real glass with motion allowed.
const GLASS_THUMB_PRESS_SCALE = 1.12;

// The stacked header the Slider owns above its track: a title row (the label with an
// optional trailing live-value readout) over a muted description line. `OUTER` is the
// column that wraps the header and the interactive rail; its snug 8px gap reproduces
// the `<Column snug>` a caller used to hand-compose above a bare slider, and it now
// carries the FILL nature so the label aligns to the track's width. `HEADER`
// tightly pairs the description under its title (4px). `TITLE_ROW` lays the title and
// readout on one line; the shell picks the justification (label + readout split ends,
// a lone readout trails to the end). The component owns this column, its gaps, and the
// type (from the skin), so the caller never rebuilds the anatomy around the control.
const OUTER: ViewStyle = { width: "100%", gap: 8 };
const HEADER: ViewStyle = { gap: 4 };
const TITLE_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// Format the readout to at most the step's decimal places (mirroring `snap`'s
// decimal handling), so an integer-step slider shows "48" and a 0.5-step slider
// shows "2.5" without floating-point tails.
function formatValue(v: number, step: number): string {
  const decimals = (String(step).split(".")[1] ?? "").length;
  return decimals > 0 ? v.toFixed(decimals) : String(v);
}

/** Build a Slider component from a platform skin.
 * @ref Ref to the interactive adjustable track, including when a header is shown. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createSlider(skin: SliderSkin) {
  const Slider = forwardRef<View, SliderProps>(function Slider(props, ref) {
    const hostRef = useComposedRefs(ref);
    const { min = 0, max = 100, step = 1, onChange, disabled, accessibilityLabel, style, children, description, showValue } = props;
    const { tokens, surface } = useTheme();
    const reducedMotion = useReducedMotion();
    const size = sizeOf(props);
    // Whether the component-owned header (title / description / value readout) renders
    // at all. A bare <Slider/> passes none of these and renders exactly as before —
    // no header, no wrapper node.
    const hasHeader = children != null || description != null || !!showValue;
    // The visible title names the control for assistive tech: when no explicit
    // accessibilityLabel is given but the title is plain text, derive the accessible
    // name from it (the visible label labels the control). An explicit
    // accessibilityLabel always wins, and a non-string title (a ReactNode) is left to
    // the caller's accessibilityLabel.
    const accessibleName = accessibilityLabel ?? (typeof children === "string" ? children : undefined);
    // In a right-to-left locale the whole control mirrors: min sits on the RIGHT and
    // the fill/thumb grow leftward, the physical tap maps flipped, and the horizontal
    // arrows reverse (the drawer's isRTL() physical-computation pattern).
    const rtl = isRTL();
    // FILL, appended after the base width:"100%": the row-sharing pair lets a slider
    // beside a button take the remainder of a Row.
    const widthCap = useFillStyle("Slider");

    // Controlled when `value` is provided, self-managed otherwise, so a bare
    // <Slider/> drags out of the box (the standard library contract).
    const [value, setValue] = useControllableState<number>(
      props.value,
      props.defaultValue ?? min,
      onChange,
    );

    // Treat a NaN value as "no value": fall back to `min` rather than letting NaN
    // flow through clamp (Math.min/max propagate NaN) and poison the geometry
    // (fillWidth/thumbLeft) and the announced aria-valuenow/accessibilityValue.
    const raw = Number.isNaN(value) ? min : value;
    const current = clamp(raw, min, max);
    const fraction = max > min ? (current - min) / (max - min) : 0;

    const trackHeight = skin.trackHeight(size);
    const thumbW = skin.thumbWidth(size);
    const thumbH = skin.thumbHeight(size);
    const gap = skin.trackGap ?? 0;
    const segmented = gap > 0;

    // The measured track width (excluding the thumb's own travel, see below). Kept in
    // a ref for the gesture handlers (which capture once) and in state to trigger a
    // re-render that paints the fill/thumb at the right spot once measured.
    const [trackWidth, setTrackWidth] = useState(0);
    const widthRef = useRef(0);
    const [pressed, setPressed] = useState(false);
    // Web keyboard focus: paint the thumb's focus ring (the same ring the drag
    // shows) while the slider holds focus. Stays false on native touch usage.
    const [focused, setFocused] = useState(false);

    // Liquid Glass handle (iOS): the knob springs up on press. Apple's iOS 26 slider
    // "transforms into liquid glass during interaction" with a scale/bounce; we drive
    // that scale ourselves because the thumb is pointerEvents:"none" (the parent
    // PanResponder owns the gesture, so the GlassView never receives the touch). Only
    // under REAL glass (surface === "glass", the iOS 26 default) and with motion
    // allowed; otherwise the knob stays at rest scale, matching today's static thumb.
    //
    // Crucially the grow is applied as ANIMATED WIDTH/HEIGHT (a layout resize), NOT a
    // `transform: scale`. A scale transform on the GlassView's ancestor degrades Apple's
    // Liquid Glass material to an opaque gray and it stays gray after the gesture
    // (verified on the iOS 26.3 sim: the knob dropped from ~rgb250 to ~rgb114 after a
    // scaled drag) — UIKit visual effects break under transforms. Resizing via layout
    // keeps the material intact, so `useNativeDriver` MUST be false (layout props are
    // not native-driver-animatable).
    const glassThumb = !!skin.glassThumb;
    const thumbScale = useRef(new Animated.Value(1)).current;
    const springThumb = glassThumb && surface === "glass" && !reducedMotion;
    useEffect(() => {
      if (!springThumb) {
        thumbScale.setValue(1);
        return;
      }
      Animated.spring(thumbScale, {
        toValue: pressed ? GLASS_THUMB_PRESS_SCALE : 1,
        useNativeDriver: false,
        friction: 7,
        tension: 180,
      }).start();
    }, [pressed, springThumb, thumbScale]);

    const onLayout = (e: LayoutChangeEvent) => {
      const _l = e.nativeEvent.layout; if (!_l) return; const w = _l.width;
      widthRef.current = w;
      setTrackWidth(w);
    };

    // The thumb travels along the rail inset by its own half-width on each end, so
    // its center reaches min at the left edge and max at the right edge. Convert a
    // local touch x (relative to the track's left edge) into a value over that span.
    const valueFromX = (localX: number): number => {
      const w = widthRef.current;
      const travel = Math.max(1, w - thumbW);
      const f = clamp((localX - thumbW / 2) / travel, 0, 1);
      // RTL: the physical-left edge is MAX, so the fraction runs the other way.
      const fraction = rtl ? 1 - f : f;
      return snap(min + fraction * (max - min), min, max, step);
    };

    const emit = (next: number) => {
      if (next !== current) setValue(next);
    };

    // Refs so the once-created PanResponder always calls the freshest closures
    // (which capture the current value, geometry, and the disabled flag). They are
    // declared BEFORE the PanResponder so its handlers can read them.
    const emitRef = useRef(emit);
    emitRef.current = emit;
    const valueFromXRef = useRef(valueFromX);
    valueFromXRef.current = valueFromX;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    // One PanResponder drives both the tap (jump to the touch point) and the drag
    // (track the finger). It is created once per mount; the handlers read live refs,
    // so they always see the latest geometry and props without re-subscribing.
    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          if (disabledRef.current) return;
          setPressed(true);
          emitRef.current(valueFromXRef.current(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          if (disabledRef.current) return;
          emitRef.current(valueFromXRef.current(e.nativeEvent.locationX));
        },
        onPanResponderRelease: () => setPressed(false),
        onPanResponderTerminate: () => setPressed(false),
      }),
    ).current;

    // Keyboard / switch-control / VoiceOver adjust: increment and decrement by one step.
    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      if (disabled) return;
      const name = event.nativeEvent.actionName;
      if (name === "increment") emit(snap(current + step, min, max, step));
      else if (name === "decrement") emit(snap(current - step, min, max, step));
    };

    // Web keyboard operability (the WAI-ARIA slider pattern): arrows nudge by one
    // step, PageUp/PageDown by a coarse page (10 steps), Home/End jump to the ends;
    // snap clamps every result to [min, max]. react-native-web forwards `onKeyDown`
    // to the DOM node, but View's RN prop types omit it (it is web-only), so the
    // handler rides in through a cast; natively View has no onKeyDown and never
    // invokes it, so this is a no-op there — additive web-only EVENT handling, the
    // same pattern as useEscapeKey, NOT a web-only render branch.
    const pageStep = step * 10;
    // The horizontal arrows follow the visual direction: ArrowRight always moves the
    // thumb visually rightward, which is +step in LTR but -step in RTL (per APG). The
    // vertical arrows and Home/End keep their logical meaning in both directions.
    const rightStep = rtl ? -step : step;
    const onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      if (disabled) return;
      let next: number;
      switch (event.key) {
        case "ArrowRight": next = current + rightStep; break;
        case "ArrowUp": next = current + step; break;
        case "ArrowLeft": next = current - rightStep; break;
        case "ArrowDown": next = current - step; break;
        case "PageUp": next = current + pageStep; break;
        case "PageDown": next = current - pageStep; break;
        case "Home": next = min; break;
        case "End": next = max; break;
        default: return; // let every other key through (Tab, etc.)
      }
      // Swallow the key so Arrow/Page/Home/End don't also scroll the page.
      event.preventDefault();
      emit(snap(next, min, max, step));
    };
    const webKeyboardProps = { onKeyDown } as unknown as ViewProps;

    // Fill spans from the left edge to the thumb center.
    const fillWidth = thumbW / 2 + fraction * Math.max(0, trackWidth - thumbW);
    // Thumb left so its center lands on the value point.
    const thumbLeft = fraction * Math.max(0, trackWidth - thumbW);
    // Vertically center the thumb on the rail: the container centers the track, so
    // the rail's center sits at rowHeight/2; the absolutely positioned thumb (height
    // `thumbH`) must have its center there too. The row is the thumb/track height
    // plus comfortable touch padding, floored at the skin's minimum touch target
    // (iOS HIG 44pt, Android M3 48dp; the web has no such floor).
    const rowHeight = Math.max(skin.minRowHeight ?? 0, Math.max(thumbH, trackHeight) + 16);
    const thumbTop = rowHeight / 2 - thumbH / 2;
    const trackTop = rowHeight / 2 - trackHeight / 2;

    // Segmented (M3 Expressive) geometry: active | gap | handle | gap | inactive.
    const activeWidth = Math.max(0, thumbLeft - gap);
    const inactiveLeft = thumbLeft + thumbW + gap;
    const inactiveWidth = Math.max(0, trackWidth - inactiveLeft);

    // Stop/tick dots for a deliberately-stepped slider (skins that define `tick`):
    // the interior stops only; the ends are the rail caps (and, on Android, the M3
    // end-stop dot below). Computed after layout so the centers use real geometry.
    const dot = skin.tickSize ?? 4;
    const tickCenters: number[] = [];
    if (skin.tick && step > 0 && max > min && trackWidth > 0) {
      const intervals = (max - min) / step;
      if (intervals >= 2 && intervals <= MAX_TICK_INTERVALS) {
        for (let k = 1; k * step < max - min - 1e-9; k += 1) {
          const f = (k * step) / (max - min);
          tickCenters.push(thumbW / 2 + f * Math.max(0, trackWidth - thumbW));
        }
      }
    }
    // Mirror a physical-left coordinate for RTL (the fill/thumb/ticks all paint with
    // physical `left`, so RTL flips the anchor around the measured track width).
    const mirrorX = (x: number): number => (rtl ? trackWidth - x : x);
    const tickBox = (cx: number, cy: number): ViewStyle => ({
      position: "absolute",
      left: mirrorX(cx) - dot / 2,
      top: cy - dot / 2,
      width: dot,
      height: dot,
      borderRadius: dot / 2,
      pointerEvents: "none",
    });
    // The M3 stop indicator sits centered inside the inactive track's end cap; it
    // hides once the handle (plus its gap) reaches it.
    const endStopCx = trackWidth - trackHeight / 2;
    const showEndStop =
      !!skin.endStop && !!skin.tick && trackWidth > 0 && endStopCx - dot / 2 >= inactiveLeft;

    // The interactive rail: the pressable/adjustable track + thumb. Rendered
    // identically whether or not a header sits above it. When a header IS present the
    // FILL nature and the caller's `style` move up to the wrapping column (so the
    // label aligns to the track width and the caller sizes the whole labeled group),
    // and the rail simply fills that column; with no header this View is the root and
    // renders byte-for-byte as before.
    const interactive = (
      <View
        ref={hostRef}
        {...pan.panHandlers}
        {...webKeyboardProps}
        onLayout={onLayout}
        testID={props.testID}
        // A keyboard tab-stop on the web (RNW maps `focusable` to tabIndex 0/-1); the
        // arrow/page/home/end keys then drive it through onKeyDown above. Disabled drops
        // it out of the tab order.
        focusable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibleName}
        accessibilityValue={{ min, max, now: current }}
        // Cross-platform ARIA value props: map to accessibilityValue on native, and RNW
        // renders them as aria-valuemin/max/now (which RNW does NOT derive from
        // accessibilityValue), so web screen readers announce the value too.
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        accessibilityState={{ disabled: !!disabled }}
        // RNW forwards neither accessibilityState nor accessibilityValue to the DOM,
        // so pair the disabled state with an aria-disabled alias (matching the
        // aria-valuemin/max/now aliases above) for web screen readers.
        aria-disabled={!!disabled}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[
          {
            width: "100%",
            justifyContent: "center",
            // Give the touch area a comfortable height around the rail.
            height: rowHeight,
            opacity: disabled ? 0.5 : 1,
          },
          // The thumb paints the focus ring, so suppress RNW's default outline on the
          // focused container (no-op on native).
          FOCUS_RESET,
          // FILL. With a header these move up to the wrapping column (below) so the
          // label aligns to the track width; a bare slider keeps them here.
          hasHeader ? null : widthCap,
          hasHeader ? null : style,
        ]}
      >
        {segmented ? (
          // M3 Expressive anatomy: two thick track segments inset by `gap` around the
          // bar handle, plus stop indicator dots. Every painted child is
          // pointerEvents:"none" so the container's PanResponder receives the raw
          // touch (locationX stays container-relative).
          <>
            {/* The active segment, from the value edge (left in LTR, right in RTL) to
                `gap` before the handle. */}
            <View
              style={[
                skin.fill(tokens, size, !!disabled),
                { position: "absolute", left: rtl ? Math.max(0, trackWidth - activeWidth) : 0, top: trackTop, width: activeWidth, height: trackHeight, pointerEvents: "none" },
              ]}
            />
            {/* The inactive segment, from `gap` after the handle to the far edge. */}
            <View
              style={[
                skin.track(tokens, size, !!disabled),
                { position: "absolute", left: rtl ? Math.max(0, trackWidth - inactiveLeft - inactiveWidth) : inactiveLeft, top: trackTop, width: inactiveWidth, height: trackHeight, pointerEvents: "none" },
              ]}
            />
            {/* Stop indicator dots at the interior steps, hidden where the handle
                (plus its gaps) covers them. */}
            {skin.tick
              ? tickCenters
                  .filter((cx) => cx < thumbLeft - gap || cx > thumbLeft + thumbW + gap)
                  .map((cx) => (
                    <View key={cx} style={[skin.tick!(tokens, size, !!disabled, cx < thumbLeft), tickBox(cx, rowHeight / 2)]} />
                  ))
              : null}
            {/* The M3 end-stop dot in the inactive track end cap. */}
            {showEndStop ? (
              <View style={[skin.tick!(tokens, size, !!disabled, false), tickBox(endStopCx, rowHeight / 2)]} />
            ) : null}
          </>
        ) : (
          // Continuous-rail anatomy: the fill overlays the full-width rail. Ticks
          // render UNDER the fill (the iOS 27 kit stacks Ticks inside the Track
          // layer, below the Fill), so the filled side covers its dots.
          <View style={[skin.track(tokens, size, !!disabled), { pointerEvents: "none" }]}>
            {skin.tick
              ? tickCenters.map((cx) => (
                  <View key={cx} style={[skin.tick!(tokens, size, !!disabled, cx <= fillWidth), tickBox(cx, trackHeight / 2)]} />
                ))
              : null}
            {/* The filled range, from the value edge to the value. The skin anchors it
                left:0; in RTL re-anchor it to the right so it grows from the min end. */}
            <View style={[skin.fill(tokens, size, !!disabled), { width: fillWidth, left: rtl ? Math.max(0, trackWidth - fillWidth) : 0 }]} />
          </View>
        )}
        {/* The thumb. The parent View's PanResponder owns the whole gesture (tapping the
            track to jump AND dragging the thumb), so the thumb only PAINTS the value
            position and the per-OS press feedback (the web focus ring; iOS keeps the knob
            opaque, Android's M3 Expressive handle has no state layer), driven by `pressed`
            from the PanResponder OR web keyboard `focused`. It carries pointerEvents="none"
            so it never competes with the parent for the touch responder, keeping the
            drag/jump on one code path. */}
        {glassThumb ? (
          // iOS 26 Liquid Glass handle. An Animated wrapper owns the position + the press
          // spring (Apple's scale/bounce on interaction); GlassSurface paints the real
          // Liquid Glass material on iOS 26+ (refracting the track behind the knob) and
          // degrades to the opaque `thumb` fill under solid surface / Reduce Transparency /
          // Increase Contrast. The wrapper sizes the surface; the skin's own position is
          // dropped so it fills the wrapper rather than double-offsetting. The press grow is
          // an ANIMATED WIDTH/HEIGHT resize (not a transform, which would break the glass —
          // see the spring effect); the negative margins keep the grow centered on the knob.
          <Animated.View
            style={{
              position: "absolute",
              left: rtl ? Math.max(0, trackWidth - thumbW) - thumbLeft : thumbLeft,
              top: thumbTop,
              width: thumbScale.interpolate({ inputRange: [1, GLASS_THUMB_PRESS_SCALE], outputRange: [thumbW, thumbW * GLASS_THUMB_PRESS_SCALE] }),
              height: thumbScale.interpolate({ inputRange: [1, GLASS_THUMB_PRESS_SCALE], outputRange: [thumbH, thumbH * GLASS_THUMB_PRESS_SCALE] }),
              marginLeft: thumbScale.interpolate({ inputRange: [1, GLASS_THUMB_PRESS_SCALE], outputRange: [0, (-thumbW * (GLASS_THUMB_PRESS_SCALE - 1)) / 2] }),
              marginTop: thumbScale.interpolate({ inputRange: [1, GLASS_THUMB_PRESS_SCALE], outputRange: [0, (-thumbH * (GLASS_THUMB_PRESS_SCALE - 1)) / 2] }),
              pointerEvents: "none",
            }}
          >
            <GlassSurface
              interactive
              pointerEvents="none"
              tint={skin.glassTint?.(tokens)}
              style={[
                skin.thumb(tokens, size, !!disabled, pressed || focused),
                { position: "relative", width: "100%", height: "100%" },
              ]}
            />
          </Animated.View>
        ) : (
          <View
            style={[skin.thumb(tokens, size, !!disabled, pressed || focused), { left: rtl ? Math.max(0, trackWidth - thumbW) - thumbLeft : thumbLeft, top: thumbTop, pointerEvents: "none" }]}
          />
        )}
      </View>
    );

    // No header: the interactive rail IS the root, exactly as before.
    if (!hasHeader) return interactive;

    // With a header: the component owns a stacked column above the rail. The title row
    // carries the label at the leading edge and the optional live-value readout at the
    // trailing edge (a lone readout, with no title, trails to the end on its own); the
    // muted description sits under the title.
    const titleJustify: ViewStyle["justifyContent"] =
      children != null && showValue ? "space-between" : showValue ? "flex-end" : "flex-start";

    return (
      <View style={[OUTER, widthCap, style]}>
        <View style={HEADER}>
          {children != null || showValue ? (
            <View style={[TITLE_ROW, { justifyContent: titleJustify }]}>
              {children != null ? <Text style={skin.label(tokens, size)}>{children}</Text> : null}
              {showValue ? <Text style={skin.value(tokens, size)}>{formatValue(current, step)}</Text> : null}
            </View>
          ) : null}
          {description != null ? <Text style={skin.description(tokens, size)}>{description}</Text> : null}
        </View>
        {interactive}
      </View>
    );
  });
  Slider.displayName = "Slider";
  return Slider;
}
