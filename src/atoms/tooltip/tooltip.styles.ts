import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow } from "../../style/index.js";
import { typeScale } from "../../style/type-scale.js";

// Co-located Tooltip skins, one per platform, all driven by the theme tokens (passed
// in from useTheme so they follow the palette, the scheme and the glass surface). A
// tooltip carries no brand fill of its own; the convention on every platform is an
// INVERSE label (a dark bubble in a light theme, painted on the `foreground` token with
// `background` text) so the tip reads against the page in either scheme. Dark Factory
// has no tooltip; its only dark bubble, the toast pill, keeps one colour in every theme,
// which would all but vanish on the dark page, so the bubble keeps the per-scheme inverse
// and takes Dark Factory's type and corners:
//   Web: an 8-radius bubble (the control corner), 6 x 10 padding, a soft `md` lift, the
//     label in Dark Factory's 12px label weight (600) at its 1.3 line height.
//   iOS: no system tooltip, so the web skin.
//   Android (Material 3 plain tooltip): a small rounded rect (radius 4), the inverse
//     fill, body-small 12sp, padding 8 x 4, flat (no elevation per M3 plain), a 24dp
//     minimum height.

export type Placement = "top" | "bottom" | "left" | "right";

// The contract a platform skin fulfills. Layout (wrapper direction per placement,
// the gap between bubble and trigger, the bubble-first ordering) is shared and
// lives in the shell; the skin supplies only the bubble surface and the label
// type, both functions of the active tokens so the inverse fill follows
// light/dark automatically.
export interface TooltipSkin {
  /** The bubble surface: shape, radius, inverse fill, padding, elevation. */
  bubble: (t: ColorTokens) => ViewStyle;
  /** The tip label: size/weight, painted in the inverse text token. */
  label: (t: ColorTokens) => TextStyle;
}

// --- shared layout fragments (identical across platforms) -------------------

// Wrapper layout per placement: a column for top/bottom (bubble stacked above or
// below the trigger), a row for left/right (bubble beside the trigger). Centered
// on the cross axis; the shell appends `useHugStyle()` (src/style/sizing.ts) so the
// wrapper shrinks to its content inside a stretching Column.
export const wrapper: Record<Placement, ViewStyle> = {
  top: { flexDirection: "column", alignItems: "center" },
  bottom: { flexDirection: "column", alignItems: "center" },
  left: { flexDirection: "row", alignItems: "center" },
  right: { flexDirection: "row", alignItems: "center" },
};

// Gap between bubble and trigger (the old `m{b,t,r,l}-1.5` = 6), applied to the
// bubble on the trigger-facing side: top -> below, bottom -> above, etc.
export const bubbleGap: Record<Placement, ViewStyle> = {
  top: { marginBottom: 6 },
  bottom: { marginTop: 6 },
  left: { marginRight: 6 },
  right: { marginLeft: 6 },
};

// The icon trigger: a 40px square ghost button holding the settings glyph,
// matching a ghost icon Button. Press feedback is applied by the component's
// Pressable (opacity dim on iOS/web, ripple on Android).
export const iconTrigger: ViewStyle = {
  height: 40,
  width: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
};

// The text trigger: the `trigger` string rendered as a pressable inline word (a
// hover-text affordance) rather than a Button. A little padding gives it a
// comfortable tap target and rounds the press/ripple state layer. Press feedback
// (opacity dim on iOS/web, ripple on Android) is applied by the component's
// Pressable, matching the icon trigger; this is a shared Canvas affordance (no
// native tooltip-trigger control exists), so it is not per-platform skinned.
export const textTrigger: ViewStyle = {
  alignSelf: "flex-start",
  paddingHorizontal: 2,
  paddingVertical: 2,
  borderRadius: 4,
};

// The text-trigger label: the brand `foreground` ink at body size (14/20 medium)
// with a dotted underline so the word reads as an interactive tip affordance,
// not plain copy. Painted from tokens so it follows light/dark.
export const textTriggerLabel = (t: ColorTokens): TextStyle => ({
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "500",
  color: t.foreground,
  textDecorationLine: "underline",
  textDecorationStyle: "dotted",
});

// ---------- Web: Dark Factory's type on the inverse bubble ----------
export const webSkin: TooltipSkin = {
  bubble: (t) => ({
    borderRadius: 8,
    backgroundColor: t.foreground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...shadow("md", t),
  }),
  label: (t) => ({ ...typeScale.label, lineHeight: 16, color: t.background }),
};

// ---------- iOS: no system tooltip, so the web skin ----------
export const iosSkin: TooltipSkin = webSkin;

// ---------- Android (Material 3 plain tooltip): inverse-surface rounded rect ----------
// M3 plain tooltip: a small rounded rect with a tighter 4dp corner radius, an
// inverse-surface fill (dark in a light theme: `foreground` bg, `background`
// text), body-small ~12sp, padding 8x4, and FLAT (no elevation) per the M3 plain
// tooltip spec. A 24dp minimum height keeps single-line tips at the spec height.
export const androidSkin: TooltipSkin = {
  bubble: (t) => ({
    borderRadius: 4,
    backgroundColor: t.foreground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
    justifyContent: "center",
  }),
  label: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "400", color: t.background }),
};
