import { type ViewStyle, type TextStyle } from "react-native";
import { alpha, customShadow, tabularNums, type ColorTokens } from "../../style/index.js";
import { type SliderSkin, type Size } from "./slider.shared.js";

// Co-located Slider skins, one per platform, all driven by the brand tokens (passed
// in from useTheme so they follow light/dark). The BRAND survives on every platform:
// the filled range is always the indigo `primary`, never a platform default (no iOS
// system blue, no M3 default). Only the native SHAPE changes per OS:
//   iOS (iOS 27 kit, Sliders symbol group): a 6pt rail with 3pt radius and Apple
//     smooth (continuous) corners, and a 37x24pt capsule knob (borderCurve
//     continuous, soft drop shadow), brand fill on the rail. On iOS 26+ the knob
//     "transforms into liquid glass during interaction" (WWDC25): it renders through
//     GlassSurface, so it is a real Apple Liquid Glass puck refracting
//     the rail, and it stays opaque on press rather than
//     dimming. Under solid surface / Reduce Transparency / Increase Contrast it
//     degrades to the opaque WHITE CAPSULE. Stepped sliders show small gray tick dots
//     along the rail (the kit's Ticks layer), under the fill.
//   Android (M3 Expressive sliders, m3.material.io/components/sliders/specs): the
//     THICK-track redesign. XS (default): a 16dp track with 8dp shape split into an
//     active (primary) and an inactive (secondary container -> `muted` token)
//     segment, a 4dp-wide x 44dp-tall BAR handle in primary inset by a 6dp gap from
//     BOTH segments, and a 4dp stop indicator dot in the inactive track end. The
//     `large` size maps to M3 S (24dp track, same 44dp handle). Flat, no shadow,
//     and NO circular thumb or state-layer disc (Expressive dropped both). Stepped
//     sliders add 4dp stop dots at each interior step (on-primary over the active
//     segment, on-secondary-container -> `muted-foreground` over the inactive one).
//   Web: the established Canvas look, an iOS-like thin rail with a small bordered
//     white thumb (matched to shadcn's slider: h-1.5 bg-muted track, bg-primary
//     range, a size-4 white thumb with a primary border and a soft shadow).
// Disabled dims the whole control (opacity in the shell) and softens the fill toward
// `muted` here.

const RAIL: ViewStyle = { width: "100%", borderRadius: 999, overflow: "visible" };
const FILL_BASE: ViewStyle = { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999 };
const THUMB_BASE: ViewStyle = { position: "absolute", borderRadius: 999 };

// iOS soft knob shadow (the iOS 27 kit floats the knob just off the rail).
const IOS_THUMB_SHADOW: ViewStyle = customShadow({ offsetY: 1, radius: 3, opacity: 0.18, elevation: 3 });

// ----- Header type: the title / description / value readout the Slider owns above
// the track. This is BRAND type, not a platform face, so the scale is the same on
// every OS and mirrors the Checkbox/Radio label + description precedent: the label is
// text-sm (14/20) medium foreground, the description one step below (12/16) muted, and
// the value readout matches the label size but reads muted with tabular figures so the
// digits do not jitter as the thumb drags. Each skin exposes the same three functions.
const LABEL_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 }, // text-xs
  base: { fontSize: 14, lineHeight: 20 }, // text-sm
  large: { fontSize: 16, lineHeight: 24 }, // text-base
};
const DESCRIPTION_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 11, lineHeight: 15 },
  base: { fontSize: 12, lineHeight: 16 },
  large: { fontSize: 14, lineHeight: 20 },
};

function label(tokens: ColorTokens, size: Size): TextStyle {
  return { fontWeight: "500", flexShrink: 1, color: tokens.foreground, ...LABEL_TYPE[size] };
}
function description(tokens: ColorTokens, size: Size): TextStyle {
  return { color: tokens["muted-foreground"], ...DESCRIPTION_TYPE[size] };
}
function value(tokens: ColorTokens, size: Size): TextStyle {
  return { fontWeight: "500", color: tokens["muted-foreground"], ...tabularNums(), ...LABEL_TYPE[size] };
}

// ----- iOS (iOS 27 kit): 6pt rail (radius 3), 37x24pt capsule knob -----
// Rail: the kit's Track/Fill are 6pt tall with 3pt radius and Apple smooth
// (continuous) corners; small/large scale the base proportionally.
const IOS_TRACK_H: Record<Size, number> = { small: 5, base: 6, large: 7 };
// Knob: the kit's Knob symbol is a 37x24pt horizontal capsule (NOT a circle);
// small/large scale it proportionally, radius = height / 2.
const IOS_KNOB: Record<Size, { w: number; h: number }> = {
  small: { w: 32, h: 21 },
  base: { w: 37, h: 24 },
  large: { w: 42, h: 27 },
};

export const iosSkin: SliderSkin = {
  trackHeight: (size) => IOS_TRACK_H[size],
  thumbWidth: (size) => IOS_KNOB[size].w,
  thumbHeight: (size) => IOS_KNOB[size].h,
  // HIG minimum touch target: the interactive row is never shorter than 44pt.
  minRowHeight: 44,
  track: (t, size) => ({
    width: "100%",
    height: IOS_TRACK_H[size],
    borderRadius: IOS_TRACK_H[size] / 2,
    borderCurve: "continuous",
    overflow: "visible",
    // The iOS inactive rail is a light fill; `muted` reads correctly on both schemes.
    backgroundColor: t.muted,
  }),
  fill: (t, size, disabled) => ({
    position: "absolute",
    left: 0,
    top: 0,
    height: IOS_TRACK_H[size],
    borderRadius: IOS_TRACK_H[size] / 2,
    borderCurve: "continuous",
    backgroundColor: disabled ? t["muted-foreground"] : t.primary,
  }),
  thumb: (_t, size) => {
    const k = IOS_KNOB[size];
    return {
      position: "absolute",
      width: k.w,
      height: k.h,
      borderRadius: k.h / 2,
      borderCurve: "continuous",
      // The shell sets `top` to vertically center the knob on the rail.
      backgroundColor: "#ffffff",
      borderWidth: 0.5,
      borderColor: alpha("#000000", 0.04),
      ...IOS_THUMB_SHADOW,
      // No pressed OPACITY treatment: the iOS knob stays opaque through a drag. This white
      // fill is what the knob degrades back to under solid surface / Reduce Transparency.
    };
  },
  // iOS 26 slider handles "transform into liquid glass during interaction" (WWDC25):
  // route the knob through GlassSurface so on iOS 26+ (glass is the platform default)
  // it becomes an Apple Liquid Glass puck that refracts the rail.
  // An OPAQUE white under-fill so the knob reads as a BRIGHT puck, matching the real
  // iOS handle (a bright white knob whose glass is the lit edge + interactive refraction,
  // not a see-through frost). This is deliberately not translucent: verified on the iOS
  // 26.3 sim, the GlassView "regular" material adaptively darkens ANY translucent backing
  // toward the content behind it, so a translucent white knob renders as a dim gray
  // lozenge over a dark UI (reads as inactive). A solid white backing keeps it bright on
  // every renderer (iOS GlassView, web/Android frost), while the GlassView still supplies
  // the real Liquid Glass edge-lensing, specular, and `isInteractive` response on top,
  // the way iOS 26 "transforms controls into liquid glass during interaction".
  glassTint: () => "#ffffff",
  // Stepped sliders: small gray tick dots along the rail (the kit's Ticks layer
  // sits UNDER the Fill, so the filled side covers its dots).
  tick: (t) => ({ backgroundColor: t["muted-foreground"] }),
  label,
  description,
  value,
};

// ----- Android (M3 Expressive): thick split track, 4x44dp bar handle -----
// XS (default): track 16dp / shape 8dp; `large` maps to S: track 24dp / shape 8dp
// (M3 has no size below XS, so `small` also renders the XS anatomy). Handle is a
// 4dp-wide x 44dp-tall primary bar at every mapped size, inset by a 6dp gap from
// both track segments; the inactive end carries a 4dp stop indicator dot.
const M3_TRACK_H: Record<Size, number> = { small: 16, base: 16, large: 24 };
const M3_TRACK_R = 8; // outer track shape (XS + S)
const M3_INNER_R = 2; // the segment edge facing the handle gap
const M3_HANDLE_W = 4;
const M3_HANDLE_H = 44;

export const androidSkin: SliderSkin = {
  trackHeight: (size) => M3_TRACK_H[size],
  thumbWidth: () => M3_HANDLE_W,
  thumbHeight: () => M3_HANDLE_H,
  // The Expressive gap between the handle and BOTH track segments.
  trackGap: 6,
  // M3 minimum touch target: the interactive row is never shorter than 48dp.
  minRowHeight: 48,
  // The 4dp stop indicator dot in the inactive track end.
  endStop: true,
  tickSize: 4,
  track: (t) => ({
    // Inactive segment: M3 secondary container; `muted` is the closest token.
    backgroundColor: t.muted,
    // Outer end fully shaped (8dp), inner edge lightly rounded toward the gap.
    borderTopLeftRadius: M3_INNER_R,
    borderBottomLeftRadius: M3_INNER_R,
    borderTopRightRadius: M3_TRACK_R,
    borderBottomRightRadius: M3_TRACK_R,
  }),
  fill: (t, _size, disabled) => ({
    // Active segment: brand primary (M3 active track = primary).
    backgroundColor: disabled ? t["muted-foreground"] : t.primary,
    borderTopLeftRadius: M3_TRACK_R,
    borderBottomLeftRadius: M3_TRACK_R,
    borderTopRightRadius: M3_INNER_R,
    borderBottomRightRadius: M3_INNER_R,
  }),
  thumb: (t, _size, disabled) => ({
    ...THUMB_BASE,
    width: M3_HANDLE_W,
    height: M3_HANDLE_H,
    borderRadius: M3_HANDLE_W / 2,
    // The shell sets `top` to vertically center the bar handle on the track.
    backgroundColor: disabled ? t["muted-foreground"] : t.primary,
    // Flat and static: M3 Expressive dropped the drop shadow AND the pressed
    // state-layer disc (the handle is plain primary in every state).
  }),
  // Stop indicator roles: on-primary over the active segment, on-secondary-container
  // over the inactive one (`muted-foreground` pairs with the `muted` track token).
  tick: (t, _size, _disabled, onActive) => ({
    backgroundColor: onActive ? t["primary-foreground"] : t["muted-foreground"],
  }),
  label,
  description,
  value,
};

// ----- Web: the established Canvas look (shadcn-matched) -----
const WEB_TRACK_H: Record<Size, number> = { small: 6, base: 8, large: 10 };
const WEB_THUMB: Record<Size, number> = { small: 16, base: 20, large: 24 };

export const webSkin: SliderSkin = {
  trackHeight: (size) => WEB_TRACK_H[size],
  thumbWidth: (size) => WEB_THUMB[size],
  thumbHeight: (size) => WEB_THUMB[size],
  track: (t, size) => ({
    ...RAIL,
    height: WEB_TRACK_H[size],
    backgroundColor: t.muted,
  }),
  fill: (t, size, disabled) => ({
    ...FILL_BASE,
    height: WEB_TRACK_H[size],
    backgroundColor: disabled ? t["muted-foreground"] : t.primary,
  }),
  thumb: (t, size, disabled, pressed) => {
    const d = WEB_THUMB[size];
    return {
      ...THUMB_BASE,
      width: d,
      height: d,
      // The shell sets `top` to vertically center the thumb on the rail.
      backgroundColor: t.background,
      borderWidth: 1,
      borderColor: disabled ? t["muted-foreground"] : t.primary,
      ...customShadow({ offsetY: 1, radius: 2, opacity: 0.1, elevation: 1 }),
      // Web press feedback: a faint primary focus ring grows on press (hover:ring-4 /
      // focus-visible:ring-4 in shadcn).
      ...(pressed && !disabled ? { borderColor: alpha(t.primary, 0.5), borderWidth: 4 } : null),
    };
  },
  label,
  description,
  value,
};
