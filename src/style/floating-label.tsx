import { useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";
import { Text, type TextStyle } from "./primitives.js";
import { type ColorTokens } from "./tokens.js";
import { useReducedMotion, supportsNativeDriver } from "./motion.js";
import { primaryText } from "./primary-text.js";
import { destructiveText } from "./destructive-text.js";

// The Material 3 in-container FLOATING label, shared by every filled field family
// (Input, Autocomplete, Select, Textarea). It is the SINGLE source of truth for the
// label placement contract and its animation, so the four controls float their
// label identically and a fix lands once. The BRAND survives (the floated tint is
// `primary-text`, the error tint `destructive-text`, never a platform default); only
// the shape the per-OS skin describes changes.
//
// Placement per platform lives in each skin as a `FloatingLabelStyles` slice:
// Android sets `floatingLabel: true` and supplies the rest/floated/reserve types;
// iOS + web set `floatingLabel: false` and render the label ABOVE the field (the
// static title the Field/Form composers produce today). Only the geometry members
// vary here; the label COLOR is animated in this component from the active tokens.

/**
 * The label-placement slice a filled-field skin fulfills. iOS + web render the
 * label ABOVE the field (`floatingLabel: false`), Android floats the M3
 * in-container label (`floatingLabel: true`, supplying the rest/floated/reserve
 * types). The label's COLOR (muted at rest, `primary-text` on focus, `destructive-text`
 * on error) is animated by `FloatingLabel` from the active tokens, so it is not
 * described here.
 */
export interface FloatingLabelStyles<S extends string = string> {
  /** true on the Android skin (floating label); false on iOS/web (label above). */
  floatingLabel: boolean;
  /** iOS/web: the static above-field label type (color is applied by the shell). */
  labelAbove?: (t: ColorTokens, size: S) => TextStyle;
  /** Android: the resting (unfocused, empty) label type — body-large, centered like a placeholder. */
  labelRest?: (t: ColorTokens, size: S) => TextStyle;
  /** Android: the floated label type — body-small at the top. Only its `fontSize`
   *  is used (to derive the transform scale = floated/rest); the label is RENDERED
   *  at `labelRest` and scaled, never re-sized, so the animation stays on the
   *  transform driver (Fabric/RNW-safe). */
  labelFloated?: (t: ColorTokens, size: S) => TextStyle;
  /** Android: the state-independent top padding the field reserves for the floated
   *  label, spread by the shell so the skin's field/trigger signature (and the
   *  active-indicator invariant it is tested against) stays intact. */
  labelReserve?: (size: S) => TextStyle;
}

// Read a numeric style value (height / paddingTop / fontSize), falling back when absent.
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

// Marks a decorative node out of the accessibility tree on every platform: the
// required "*" must NOT pollute the field's accessible name (that comes from the
// label text alone), so it is hidden natively (accessibilityElementsHidden /
// importantForAccessibility) and on web (aria-hidden, which excludes it from the
// aria-labelledby name computation).
export const HIDDEN_FROM_A11Y = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
  "aria-hidden": true,
} as const;

/**
 * The label text plus, when required, a trailing destructive "*". The star is
 * hidden from assistive tech so the accessible name stays the bare label. Used
 * for BOTH the above-field label and the floated label so every field family
 * renders the required affordance identically.
 */
export function LabelContent({ label, required, starColor }: { label: string; required?: boolean; starColor: string }): ReactNode {
  return (
    <>
      {label}
      {required ? (
        <Text {...HIDDEN_FROM_A11Y} style={{ color: starColor }}>
          {" *"}
        </Text>
      ) : null}
    </>
  );
}

/**
 * The Material 3 in-container floating label (Android skin only). It overlays the
 * field, pinned to the leading edge, and animates between the resting (centered
 * placeholder-like, or top-aligned on a multiline field) and floated (top, small)
 * positions.
 *
 * Split-driver animation (the crux — must run on iOS, Android New-Arch/Fabric,
 * AND react-native-web):
 *  - `pos` (0->1) drives ONLY the transform (translateY + scale 1->floated/rest),
 *    on the native driver where available (a one-shot, so the loop-freeze caveat
 *    does not apply) and the JS driver on web. It NEVER animates fontSize/top/width
 *    (those are Fabric-stuck). Target = focused || populated.
 *  - `tint` (0->1) drives ONLY the color, on the JS driver ALWAYS (color can't be
 *    native-driven). Target = focused || error, so a filled-but-unfocused valid
 *    field floats yet stays muted.
 * transformOrigin "0% 50%" pins the leading edge while it scales (no measurement,
 * no translateX); RTL uses the logical `start` inset.
 *
 * Geometry: the label's resting and floated vertical CENTERS are computed, and
 * translateY carries the resting center to the floated one:
 *  - single-line: rest center = the field's vertical middle (`height / 2`);
 *  - multiline: rest center aligns with the first value line (`reserve + line/2`),
 *    since a multiline field's value is top-aligned below the reserved band.
 * The floated center lands the scaled label's bottom edge at `reserve` (where the
 * value begins), so the value always clears it.
 */
export function FloatingLabel<S extends string>({
  styles,
  size,
  tokens,
  label,
  required,
  labelId,
  focused,
  populated,
  isError,
  height,
  inset = 16,
  multiline = false,
}: {
  styles: FloatingLabelStyles<S>;
  size: S;
  tokens: ColorTokens;
  label: string;
  required?: boolean;
  labelId: string;
  focused: boolean;
  populated: boolean;
  isError: boolean;
  /** The single-line field's height (used to center the resting label). Ignored in `multiline` mode. */
  height: number;
  /** Leading inset that matches the field's horizontal content padding (default 16dp). */
  inset?: number;
  /** Multiline field (Textarea): rest the label at the top text line, not the box middle. */
  multiline?: boolean;
}) {
  const reduced = useReducedMotion();
  const posTarget = focused || populated ? 1 : 0;
  const tintTarget = focused || isError ? 1 : 0;
  // Seed each value at its target so a prefilled/defaultValue field starts floated
  // (and a required-invalid field starts tinted) with no opening animation.
  const [pos] = useState(() => new Animated.Value(posTarget));
  const [tint] = useState(() => new Animated.Value(tintTarget));

  // pos drives the TRANSFORM (translateY + scale): native driver where available
  // (one-shot, so the loop-freeze caveat does not apply), JS on web. Reduced
  // motion snaps to the final frame; the label still moves.
  useEffect(() => {
    if (reduced) {
      pos.setValue(posTarget);
      return;
    }
    Animated.timing(pos, { toValue: posTarget, duration: 150, useNativeDriver: supportsNativeDriver }).start();
  }, [pos, posTarget, reduced]);

  // tint drives ONLY the COLOR, always on the JS driver (color can't be native-
  // driven; never interpolate it off `pos`).
  useEffect(() => {
    if (reduced) {
      tint.setValue(tintTarget);
      return;
    }
    Animated.timing(tint, { toValue: tintTarget, duration: 150, useNativeDriver: false }).start();
  }, [tint, tintTarget, reduced]);

  const rest = styles.labelRest!(tokens, size) as TextStyle;
  const floated = styles.labelFloated!(tokens, size) as TextStyle;
  const restLine = asNum(rest.lineHeight, 24);
  const restSize = asNum(rest.fontSize, 16);
  const scaleTo = asNum(floated.fontSize, 12) / restSize;
  const reserve = asNum((styles.labelReserve!(size) as TextStyle).paddingTop, 24);
  const scaledLine = restLine * scaleTo;
  // The floated label's bottom edge lands at `reserve` (where the value begins),
  // so the value clears it; its center is that minus half the scaled line box.
  const floatedCenterY = reserve - scaledLine / 2;
  // The resting center: the field's vertical middle for a single-line field, or the
  // first value line for a multiline one (its value is top-aligned below `reserve`).
  const restCenterY = multiline ? reserve + restLine / 2 : height / 2;
  const translateYTo = floatedCenterY - restCenterY;

  const translateY = pos.interpolate({ inputRange: [0, 1], outputRange: [0, translateYTo] });
  const scale = pos.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] });
  const color = tint.interpolate({
    inputRange: [0, 1],
    outputRange: [tokens["muted-foreground"], isError ? destructiveText(tokens) : primaryText(tokens)],
  });

  return (
    <Animated.View
      // pointerEvents:none so taps fall through to the field beneath. Single-line
      // fills the field vertically and centers the label (rest center = height/2);
      // multiline pins the label at the top text line (top = reserve). The transform
      // then floats it, scaling around the box center (transformOrigin 0% 50%).
      style={
        multiline
          ? {
              position: "absolute",
              top: reserve,
              start: inset,
              pointerEvents: "none",
              transformOrigin: "0% 50%",
              transform: [{ translateY }, { scale }],
            }
          : {
              position: "absolute",
              top: 0,
              bottom: 0,
              start: inset,
              justifyContent: "center",
              pointerEvents: "none",
              transformOrigin: "0% 50%",
              transform: [{ translateY }, { scale }],
            }
      }
    >
      <Animated.Text nativeID={labelId} numberOfLines={1} style={[rest, { color }]}>
        <LabelContent label={label} required={required} starColor={tokens.destructive} />
      </Animated.Text>
    </Animated.View>
  );
}
