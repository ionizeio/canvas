import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Animated, Easing, type LayoutChangeEvent } from "react-native";
import { View, Text, useFillStyle, useReducedMotion, supportsNativeDriver, palette, type ColorTokens, type LayoutStyle, type MeasureProps, type ViewStyle, type TextStyle, type StyleProp, GlassPane, isGlass, innerFill } from "../../style/index.js";

// Shared Progress shell. Uses React Native's primitives DIRECTLY (no engine className
// layer) and reads the active brand tokens via so the track/fill colors follow
// light/dark. The shared structure (the rounded track + filled bar, the determinate vs.
// indeterminate logic, the value clamp, the accessibility contract, the standard field
// width axis, the component-owned label/description/value header, and the sliding-bar
// animation) lives here once; a platform file supplies only its measured shape (a
// ProgressSkin) plus any per-OS parts and calls createProgress. Styles are plain RN
// objects, which work on iOS, Android, and web alike.
//
// Progress is OUTPUT-ONLY: it reports task completion, so there is no onChange and the
// control is never interactive (no Pressable, no press feedback).
//
//   Determinate  (default): the fill reaches `value` (clamped to 0..1) and EASES to it on
//     every change (an upload ticking up slides rather than jumps), like the reference
//     platforms; Reduce Motion snaps instead. See the animatedFraction block below.
//   Indeterminate (`indeterminate`): `value` is ignored and a short bar slides and loops
//     across the track (on iOS the entry threads the kit Spinner instead: iOS has no
//     linear indeterminate idiom, the activity indicator is the unknown-duration control).
//
// Width: Progress is FILL (src/style/sizing.ts) like the input-like controls: the bar
// takes the bounds its parent layout container provides and shares a Row with hugging
// siblings. It never carries a width of its own.

export interface ProgressProps extends MeasureProps {
  /** Completion as a 0..1 fraction (clamped). Ignored when `indeterminate`. Defaults to 0. */
  value?: number;
  /** Indeterminate mode: ignore `value` and animate a sliding bar (a spinner on iOS). */
  indeterminate?: boolean;
  /**
   * Optional title line rendered ABOVE the bar. Supplying it (with or without a
   * `description`/`showValue`) builds the stacked header inside the control, so the
   * caller never hand-composes a Row/Column + Typography around the bar. This is the
   * "components own their label anatomy" contract, mirroring Checkbox/Radio/Switch's
   * `description` slot.
   */
  children?: ReactNode;
  /** Optional muted secondary line rendered under the title. */
  description?: ReactNode;
  /**
   * Render the percent (derived from `value`) as a right-aligned readout on the title
   * line. Indeterminate has no measurable value, so this renders nothing then.
   */
  showValue?: boolean;
  // Tone axis (the active fill color; pick one, default is the brand primary). `warning` tints the bar amber, `danger` red, for a metric over a soft threshold or a hard limit (a WIP meter over its cap); the track stays neutral. Pair with copy: the tone adds no accessible value.
  warning?: boolean;
  danger?: boolean;
  // Size axis (track thickness; pick one, default is the medium track).
  small?: boolean;
  large?: boolean;
  /** Accessible description of what is progressing. */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export type Size = "small" | "base" | "large";
export type Tone = "default" | "warning" | "danger";

// Size precedence within the axis: large > small > default (first match wins).
function sizeOf(p: ProgressProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// Tone precedence within the axis: danger > warning > default (first match wins), so the
// more urgent state wins when both are (accidentally) passed. Exported for tests.
export function toneOf(p: ProgressProps): Tone {
  if (p.danger) return "danger";
  if (p.warning) return "warning";
  return "default";
}

// The tone fill draws from the same Tailwind palette vocabulary the Badge status pills use
// (amber for warning, red for danger), so the whole kit speaks one semantic-color language.
// A saturated 500 in light, one step lighter (400) in dark so the bar keeps contrast against
// the darker track. `default` keeps the skin's brand `primary` fill (computed by the caller).
// Exported for tests (not re-exported from the package barrel).
const TONE_HUE: Record<Exclude<Tone, "default">, string> = { warning: "amber", danger: "red" };
export function toneFill(tone: Exclude<Tone, "default">, dark: boolean): string {
  const hue = TONE_HUE[tone];
  return dark ? palette[`${hue}-400`] : palette[`${hue}-500`];
}

// Clamp the value to a 0..1 fraction (the public contract). NaN/undefined collapse to 0.
function clampValue(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

// Header layout owned by the SHELL (the component owns the column, the gaps, and the
// stacking; the skin owns only the text type). ROOT_STACK stacks the header over the
// track; HEADER_COLUMN stacks the title row over the description; TITLE_ROW lays the
// title beside its trailing percent; VALUE_READOUT_LAYOUT pins that percent to the right
// edge (marginLeft:auto) with a min gap so a long title never touches it. These are the
// control's own anatomy, not a call-site restyle.
const ROOT_STACK: ViewStyle = { gap: 8 };
const HEADER_COLUMN: ViewStyle = { gap: 2 };
const TITLE_ROW: ViewStyle = { flexDirection: "row", alignItems: "center" };
const VALUE_READOUT_LAYOUT: TextStyle = { marginLeft: "auto", paddingLeft: 8 };

// What a platform skin owns: the track height + radius per size, the track (inactive)
// fill, the active fill, the header text type (label/description/value readout), the
// fraction of the track width the sliding indeterminate bar occupies, and the optional
// M3 segmented anatomy (active/track gap + stop indicator). Everything else (structure,
// value logic, animation, a11y) is the shell.
export interface ProgressSkin {
  /** Track thickness (px) per size. */
  height: Record<Size, number>;
  /** Corner radius (px) per size for both the track and the fill. */
  radius: Record<Size, number>;
  /** Inactive track fill. */
  trackColor: (tokens: ColorTokens) => string;
  /** Active (filled) bar color. */
  fillColor: (tokens: ColorTokens) => string;
  /** The title line rendered above the track (canonical 14/20 medium, foreground). */
  label: (tokens: ColorTokens) => TextStyle;
  /** The muted secondary line under the title (canonical 12/16, muted-foreground). */
  description: (tokens: ColorTokens) => TextStyle;
  /** The trailing percent readout on the title line (14/20 muted-foreground, tabular). */
  valueReadout: (tokens: ColorTokens) => TextStyle;
  /** Width of the sliding indeterminate bar as a fraction (0..1) of the track. */
  indeterminateWidth: number;
  /**
   * M3 anatomy (Android): the gap (dp) between the active indicator's trailing edge
   * and the inactive track, so the two read as separate segments. Omit (or 0) for the
   * continuous single-track structure (iOS/web). Determinate only: the indeterminate
   * sweep keeps the continuous rail.
   */
  trackGap?: number;
  /**
   * M3 anatomy (Android): render the stop indicator, a 4x4dp dot in the active color
   * pinned at the track's trailing edge (vertically centered, so it sits 2dp in from
   * the edge of the 8dp-thick large track). Determinate only, per M3.
   */
  stopIndicator?: boolean;
}

// The per-OS pieces a platform entry threads in beside its skin (the empty-state
// pattern, where entry files pass their platform's Button). iOS swaps the indeterminate
// visual for the kit Spinner (the UIActivityIndicatorView idiom; the iOS 27 kit's only
// indeterminate progress symbols are spinners), so progress.ios.tsx passes the iOS
// Spinner here. Web/Android pass nothing and keep the sliding-bar indeterminate.
export interface ProgressParts {
  IndeterminateSpinner?: ComponentType<{
    small?: boolean;
    large?: boolean;
    accessibilityLabel?: string;
    testID?: string;
  }>;
}

/** Build a Progress component from a platform skin (plus optional per-OS parts). */
export function createProgress(skin: ProgressSkin, parts: ProgressParts = {}) {
  return function Progress(props: ProgressProps) {
    const { value, indeterminate, children, description, accessibilityLabel, testID, style } = props;
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens, dark } = theme;
    const size = sizeOf(props);
    const tone = toneOf(props);
    // Under glass the rail is a static pane at control density: the continuous track paints a
    // GlassPane in place of its opaque fill (the brand fill slides over the material),
    // and the segmented M3 inactive track, which must keep its gap from the active
    // edge, becomes an ink tint instead of a second material.
    const glass = isGlass(theme);
    // FILL, appended after the skin's width:"100%" (the row-sharing pair).
    const widthStyle = useFillStyle("Progress", props);

    const height = skin.height[size];
    const radius = skin.radius[size];
    const trackColor = glass ? innerFill(theme, "muted", "soft") : skin.trackColor(tokens);
    // The active fill: the skin's brand `primary` by default, or the semantic tone color
    // (amber/red) when `warning`/`danger` is set. Every fill render path below reads this one
    // value, so the tone flows through the continuous, segmented, indeterminate, and stop-dot
    // anatomies alike.
    const fillColor = tone === "default" ? skin.fillColor(tokens) : toneFill(tone, dark);
    const fraction = clampValue(value);

    // Measured track width, needed to slide the indeterminate bar in absolute px (a
    // translateX is the cross-platform-safe way to move it; animating `left`/`width` is
    // not). Held in state so the interpolation re-derives once the layout reports a real
    // width (a ref alone would never re-render, leaving the bar parked at 0), matching the
    // slider atom's measured-track pattern.
    const [trackWidth, setTrackWidth] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;

    const onLayout = (e: LayoutChangeEvent) => {
      const _l = e.nativeEvent.layout; if (!_l) return; const w = _l.width;
      if (w !== trackWidth) setTrackWidth(w);
    };

    // One sweep (the bar enters from the left edge and exits the right) per ~1100ms,
    // looping forever while in indeterminate mode. Re-armed when the mode or the measured
    // width changes. The loop runs on the native driver where there is one and on the JS
    // driver on web (supportsNativeDriver, src/style/motion.ts): the bar moves by
    // translateX, which the native driver animates off-thread, and under the New
    // Architecture a JS-driven loop is a shadow-tree commit per frame. This matches the
    // spinner atom's loop convention.
    useEffect(() => {
      if (!indeterminate || trackWidth <= 0) return;
      progress.setValue(0);
      const loop = Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: supportsNativeDriver,
        }),
      );
      loop.start();
      return () => loop.stop();
    }, [indeterminate, trackWidth, progress]);

    const barWidth = trackWidth * skin.indeterminateWidth;
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-barWidth, trackWidth],
    });

    // Determinate fill animation. The active fill's extent EASES toward `value` on every
    // change (an upload ticking 0.30 → 0.55 slides rather than jumps), matching the
    // reference platforms: iOS UIProgressView setProgress:animated:, Material 3's animated
    // indicator, and the shadcn/Radix web bar's transitioned fill. `animatedFraction` holds
    // the eased 0..1 position, initialised to the first fraction so the bar paints its value
    // at rest (no fill-up-on-mount). The fill is positioned by translateX (a transform, so it
    // is native-driver-safe off-thread and, unlike an animated width, is NOT frozen under the
    // Android New Architecture); web falls back to the JS driver. Reduced Motion snaps to the
    // value instead of easing — the fill is information-bearing, so it still updates; only the
    // decorative transition is dropped (per WCAG 2.3.3, matching motion.ts's contract).
    const reduced = useReducedMotion();
    const animatedFraction = useRef(new Animated.Value(fraction)).current;
    useEffect(() => {
      if (indeterminate) return; // determinate only; the sliding bar owns `progress`
      if (reduced) {
        animatedFraction.setValue(fraction);
        return;
      }
      const anim = Animated.timing(animatedFraction, {
        toValue: fraction,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: supportsNativeDriver,
      });
      anim.start();
      return () => anim.stop();
    }, [fraction, indeterminate, reduced, animatedFraction]);

    // The active fill is a full-width bar translated left so its rounded trailing edge sits
    // at `fraction` of the track, clipped by the track's overflow (the shadcn/Radix model:
    // the leading corner keeps its radius, with no scaleX cap distortion). The translate is
    // in measured px; until the first onLayout reports a width the render falls back to a
    // static percent-width fill so the value paints immediately with no empty flash.
    const activeTranslateX = animatedFraction.interpolate({
      inputRange: [0, 1],
      outputRange: [-trackWidth, 0],
    });

    // iOS indeterminate idiom: iOS has no linear indeterminate bar (the iOS 27 kit's
    // unknown-duration control is the activity indicator), so when the entry threads a
    // Spinner the skin path swaps the visual while the cross-platform `indeterminate`
    // prop stays. The Spinner announces itself (progressbar role, "Loading" default
    // label); the wrapper stays presentational and only carries the width axis so the
    // control keeps its slot in a form column.
    const IndeterminateSpinner = parts.IndeterminateSpinner;

    // Component-owned label anatomy (mirrors Checkbox/Radio/Switch's `description`): a
    // stacked header, the title row with an optional right-aligned percent readout, and a
    // muted description under it, rendered ABOVE the track inside Progress's own root node.
    // `showValue` has no percent to show while indeterminate, so it is dropped then. A bare
    // <Progress value={...}/> passes none of these, so `hasHeader` is false and every
    // render path below stays byte-identical to the header-less original.
    const showPercent = !!props.showValue && !indeterminate;
    const hasHeader = children != null || description != null || showPercent;
    // Derive the accessible name from a string title when no explicit label is given, so a
    // labelled bar announces its title without a redundant accessibilityLabel.
    const accessibilityName = accessibilityLabel ?? (typeof children === "string" ? children : undefined);
    const header = hasHeader ? (
      <View style={HEADER_COLUMN}>
        {children != null || showPercent ? (
          <View style={TITLE_ROW}>
            {children != null ? <Text style={skin.label(tokens)}>{children}</Text> : null}
            {showPercent ? (
              <Text style={[skin.valueReadout(tokens), VALUE_READOUT_LAYOUT]}>{`${Math.round(fraction * 100)}%`}</Text>
            ) : null}
          </View>
        ) : null}
        {description != null ? <Text style={skin.description(tokens)}>{description}</Text> : null}
      </View>
    ) : null;

    if (indeterminate && IndeterminateSpinner) {
      const spinner = (
        <IndeterminateSpinner small={props.small} large={props.large} accessibilityLabel={accessibilityName} />
      );
      // Bare, the spinner stays centered in the field slot (byte-identical to the
      // original). With a header it sits left-aligned under the stacked title.
      if (!hasHeader) {
        return (
          <View testID={testID} style={[{ alignItems: "center" }, widthStyle, style]}>
            {spinner}
          </View>
        );
      }
      return (
        <View testID={testID} style={[ROOT_STACK, widthStyle, style]}>
          {header}
          <View style={{ alignItems: "flex-start" }}>{spinner}</View>
        </View>
      );
    }

    // M3 segmented anatomy (Android determinate): active indicator, a `trackGap` gap,
    // the inactive track, and the stop indicator dot at the trailing edge. Indeterminate
    // keeps the continuous rail (the sliding bar needs the full track, and M3's
    // indeterminate has no stop indicator).
    const gap = skin.trackGap ?? 0;
    const segmented = !indeterminate && gap > 0;
    const stopSize = !indeterminate && skin.stopIndicator ? Math.min(4, height) : 0;
    const stopInset = (height - stopSize) / 2;

    // Segmented (M3) inactive track: a full-width bar translated to start a `gap` past the
    // active edge (its trailing overflow is clipped). The gap only opens once there is some
    // progress (outputRange 0 at fraction 0), so at rest-empty the track spans the full rail,
    // matching the static anatomy. Driven by the same eased `animatedFraction` as the fill.
    const inactiveTranslateX = segmented
      ? Animated.add(
          animatedFraction.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] }),
          animatedFraction.interpolate({ inputRange: [0, 0.0001, 1], outputRange: [0, gap, gap] }),
        )
      : null;

    const track = (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityName}
        accessibilityValue={
          indeterminate ? { min: 0, max: 100 } : { min: 0, max: 100, now: Math.round(fraction * 100) }
        }
        // Cross-platform ARIA value props (RNW renders aria-valuemin/max/now; native maps
        // them to accessibilityValue). Indeterminate omits `now`.
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(fraction * 100)}
        // With a header the outer root node owns the width axis, the outer style
        // composition, and the testID; the track keeps only the progressbar role and its
        // own shape. Header-less, they stay on the track so the render is byte-identical.
        testID={hasHeader ? undefined : testID}
        onLayout={onLayout}
        style={[
          // overflow:hidden clips the sliding indeterminate bar AND the translated
          // determinate fill/segments to the rounded rail. The continuous structure paints
          // the inactive track as the container fill; the segmented (M3) structure draws its
          // own track segment, so the container stays transparent there.
          { width: "100%", height, borderRadius: radius, overflow: "hidden" as const },
          segmented || glass ? null : { backgroundColor: trackColor },
          hasHeader ? null : widthStyle,
          hasHeader ? null : style,
        ]}
      >
        {segmented ? null : <GlassPane static layer="control" shape={{ borderRadius: radius }} />}
        {indeterminate ? (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: `${skin.indeterminateWidth * 100}%`,
              borderRadius: radius,
              backgroundColor: fillColor,
              transform: [{ translateX }],
            }}
          />
        ) : segmented ? (
          <>
            {trackWidth > 0 ? (
              <>
                {/* Inactive track: full-width, translated to start a `gap` past the active
                    edge; the trailing overflow is clipped by the container. */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: trackWidth,
                    borderRadius: radius,
                    backgroundColor: trackColor,
                    transform: [{ translateX: inactiveTranslateX! }],
                  }}
                />
                {/* Active indicator: full-width, translated left so its rounded trailing
                    edge sits at `fraction` of the track (eased). */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: trackWidth,
                    borderRadius: radius,
                    backgroundColor: fillColor,
                    transform: [{ translateX: activeTranslateX }],
                  }}
                />
              </>
            ) : (
              // Pre-measurement fallback: the static percent-based M3 anatomy, so the value
              // paints immediately (the inactive segment from active edge + gap to the end,
              // the active bar, and no gap at rest-empty).
              <>
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    start: `${fraction * 100}%`,
                    end: 0,
                    marginStart: fraction > 0 ? gap : 0,
                    borderRadius: radius,
                    backgroundColor: trackColor,
                  }}
                />
                {fraction > 0 ? (
                  <View
                    style={{
                      height: "100%",
                      width: `${fraction * 100}%`,
                      borderRadius: radius,
                      backgroundColor: fillColor,
                    }}
                  />
                ) : null}
              </>
            )}
            {stopSize > 0 ? (
              // M3 stop indicator: a 4x4dp dot in the active color pinned at the
              // trailing edge (vertically centered: flush on the 4dp base track, 2dp
              // in from the edge of the 8dp large track).
              <View
                style={{
                  position: "absolute",
                  top: stopInset,
                  end: stopInset,
                  width: stopSize,
                  height: stopSize,
                  borderRadius: stopSize / 2,
                  backgroundColor: fillColor,
                }}
              />
            ) : null}
          </>
        ) : trackWidth > 0 ? (
          // Continuous (iOS/web): full-width fill translated left so its rounded trailing
          // edge sits at `fraction` of the track (eased), clipped by the container overflow.
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: trackWidth,
              borderRadius: radius,
              backgroundColor: fillColor,
              transform: [{ translateX: activeTranslateX }],
            }}
          />
        ) : (
          // Pre-measurement fallback: static percent-width fill so the value paints at once.
          <View
            style={{
              height: "100%",
              width: `${fraction * 100}%`,
              borderRadius: radius,
              backgroundColor: fillColor,
            }}
          />
        )}
      </View>
    );

    // Header-less: the track IS the root node (byte-identical to the original render).
    // With a header: an outer column stacks the header over the track and carries the
    // width axis, the outer style composition, and the testID.
    if (!hasHeader) return track;
    return (
      <View testID={testID} style={[ROOT_STACK, widthStyle, style]}>
        {header}
        {track}
      </View>
    );
  };
}
