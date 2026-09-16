import { type ViewStyle, type TextStyle } from "react-native";
import { shape, type ColorTokens } from "../../style/index.js";
import { type CheckboxSkin, type Size } from "./checkbox.shared.js";

// Co-located Checkbox skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark and the glass surface). The
// BRAND survives on every platform (the filled box is always the indigo `primary`,
// never a platform default), and only the native SHAPE, sizing, border weight, and
// press feedback change per OS:
//   iOS (HIG): no native checkbox; the de-facto rounded square (~5 radius), a
//     hairline 1px border when empty, brand fill + white check when checked, the
//     control nudged to ~20pt; press = opacity dim (~0.8).
//   Android (Material 3): an 18dp square with a 2dp corner radius and a 2dp outline
//     when empty, brand fill + white check when checked; press = android_ripple over
//     a 40dp state layer; disabled opacity 0.38.
//   Web: the established Canvas look (the current checkbox, lifted verbatim) —
//     14/16/20px box per size, 3 radius, 1px border, brand fill + foreground check.

// Box dimensions per size.
const WEB_BOX: Record<Size, number> = { small: 16, base: 20, large: 24 };
const IOS_BOX: Record<Size, number> = { small: 18, base: 20, large: 24 };
const ANDROID_BOX: Record<Size, number> = { small: 18, base: 18, large: 20 };

// Glyph (check / dash) type per box family. The check sits inside the box, so the
// font tracks the box size; `lineHeight: fontSize` keeps it optically centered.
function glyphType(fontSize: number): TextStyle {
  return { fontSize, lineHeight: fontSize };
}
const WEB_GLYPH: Record<Size, number> = { small: 12, base: 14, large: 16 };
const IOS_GLYPH: Record<Size, number> = { small: 13, base: 14, large: 17 };
const ANDROID_GLYPH: Record<Size, number> = { small: 13, base: 13, large: 15 };

// Label type per size (shared across platforms; the label is brand type, not a
// platform face). Matches the original Canvas label scale. `flexShrink` lets a
// long label wrap within the row instead of forcing the row wider.
const LABEL_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 }, // text-xs
  base: { fontSize: 14, lineHeight: 20 }, // text-sm
  large: { fontSize: 16, lineHeight: 24 }, // text-base
};
function label(tokens: ColorTokens, size: Size): TextStyle {
  return { fontWeight: "500", flexShrink: 1, color: tokens.foreground, ...LABEL_TYPE[size] };
}

// Description type per size, one step below the label, matching the kit's other
// title+description controls (Radio, Switch). Muted secondary color on every
// platform. The whole row already dims when disabled, so the description keeps
// the muted token in either state.
const DESCRIPTION_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 11, lineHeight: 15 },
  base: { fontSize: 12, lineHeight: 16 },
  large: { fontSize: 14, lineHeight: 20 },
};
function description(tokens: ColorTokens, size: Size): TextStyle {
  return { color: tokens["muted-foreground"], ...DESCRIPTION_TYPE[size] };
}

// Box base: a square, centered, nudged down (`marginTop: 2`) to align with the
// label's first line when text sits beside it. Per-platform radius/border weight
// is layered on by each skin.
function boxBase(box: number, nudge: boolean): ViewStyle {
  return {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    width: box,
    height: box,
    ...(nudge ? { marginTop: 2 } : null),
  };
}

// ---------- Web: the Riskora dashboard checkbox (a 20px box with the 6px corner) ----------
export const webSkin: CheckboxSkin = {
  box: (t, filled, size, nudge) => ({
    ...boxBase(WEB_BOX[size], nudge),
    borderRadius: shape.web.checkbox,
    borderWidth: 1,
    ...(filled
      ? { borderColor: t.primary, backgroundColor: t.primary }
      : { borderColor: t.input, backgroundColor: "transparent" }),
  }),
  glyph: (t, size) => ({ fontWeight: "500", color: t["primary-foreground"], ...glyphType(WEB_GLYPH[size]) }),
  label,
  description,
  disabledOpacity: 0.5,
  pressedOpacity: 0.9,
  ripple: null,
};

// ---------- iOS (HIG): rounded square, hairline border, dim on press ----------
export const iosSkin: CheckboxSkin = {
  box: (t, filled, size, nudge) => ({
    ...boxBase(IOS_BOX[size], nudge),
    borderRadius: size === "small" ? 4 : size === "large" ? 6 : 5,
    borderWidth: 1, // hairline when empty; the fill hides it when checked
    ...(filled
      ? { borderColor: t.primary, backgroundColor: t.primary }
      : { borderColor: t.input, backgroundColor: "transparent" }),
  }),
  glyph: (_t, size) => ({ fontWeight: "600", color: "#ffffff", ...glyphType(IOS_GLYPH[size]) }),
  label,
  description,
  disabledOpacity: 0.5,
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3): 18dp square, 2dp radius/outline, ripple ----------
export const androidSkin: CheckboxSkin = {
  box: (t, filled, size, nudge) => ({
    ...boxBase(ANDROID_BOX[size], nudge),
    borderRadius: 2,
    borderWidth: 2,
    ...(filled
      ? { borderColor: t.primary, backgroundColor: t.primary }
      : { borderColor: t["muted-foreground"], backgroundColor: "transparent" }),
  }),
  glyph: (_t, size) => ({ fontWeight: "700", color: "#ffffff", ...glyphType(ANDROID_GLYPH[size]) }),
  label,
  description,
  disabledOpacity: 0.38, // M3 disabled opacity
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: t.primary, borderless: true, radius: 20 }), // 40dp state layer
};
