import { type ViewStyle, type TextStyle } from "react-native";
import { alpha, type ColorTokens } from "../../style/index.js";
import { fieldBorder } from "../../style/field-colors.js";
import { type StepperSkin, type Size } from "./stepper.shared.js";

// Co-located Stepper skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). The BRAND survives wherever
// the platform idiom carries an accent: the web glyphs are the indigo `primary`, and
// the Android ripple is 12%-alpha brand ink. The iOS 27 stepper has NO accent slot
// at all (its glyphs are neutral label-colored), so the iOS glyphs stay `foreground`
// rather than inventing a tint. Only the native SHAPE, sizing, and structure change:
//   iOS (HIG / iOS 27 kit Stepper): a FULL-CAPSULE gray pill of [ − | + ]
//     (radius = height/2, continuous corner curve) with an inset hairline divider
//     (height − 8, self-centered) between the halves, ~32pt tall, `secondary` fill;
//     the editable value sits in a field to its LEFT (HIG layout). Press paints a
//     quaternary-fill HIGHLIGHT on the pressed half (the glyph keeps full color).
//   Android (Material 3): two OUTLINED icon buttons (M3 has no stepper, so a custom
//     quantity control built from icon buttons) flanking the value, circular ~40dp,
//     1dp `border` outline (a FAINTER alpha outline when disabled, per the M3
//     disabled treatment), flat (no shadow), 12%-alpha ripple on press, and hitSlop
//     padding the touch target to the M3 48dp minimum.
//   Web: the established Canvas look — a single bordered group [ − | value | + ] with
//     1px divider lines between the slots (the shadcn-ish number field), 6 radius.
// Disabled dims the whole control (opacity in the shell) and softens the ± glyph to
// `muted` (handled in the shell).

// ---- shared field type scale (brand type, identical across platforms) ----
function fieldText(size: Size): TextStyle {
  if (size === "large") return { fontSize: 16, lineHeight: 24 };
  if (size === "small") return { fontSize: 12, lineHeight: 16 };
  return { fontSize: 14, lineHeight: 20 };
}

const ROW_CENTER: ViewStyle = { alignItems: "center", justifyContent: "center" };

// ============================ Web: the established Canvas look ============================
// A single bordered group [ − | value | + ] with 1px inner dividers, 6 radius, the
// background fill, and an opacity dim on a pressed ± button (mirrors the kit's other
// web skins). The glyph is the brand `primary`.
const WEB_HEIGHT: Record<Size, number> = { small: 32, base: 36, large: 40 };
const WEB_BTN_W: Record<Size, number> = { small: 32, base: 36, large: 40 };
const WEB_FIELD_W: Record<Size, number> = { small: 48, base: 56, large: 64 };

export const webSkin: StepperSkin = {
  group: (t, size) => ({
    flexDirection: "row",
    alignItems: "stretch",
    height: WEB_HEIGHT[size],
    borderWidth: 1,
    borderColor: fieldBorder(t),
    borderRadius: 6,
    backgroundColor: t.background,
    overflow: "hidden",
  }),
  button: (_t, size, _side) => ({
    ...ROW_CENTER,
    width: WEB_BTN_W[size],
    height: "100%",
  }),
  field: (t, size) => ({
    ...fieldText(size),
    width: WEB_FIELD_W[size],
    height: "100%",
    textAlign: "center",
    color: t.foreground,
    paddingHorizontal: 4,
  }),
  divider: (t) => ({ width: 1, alignSelf: "stretch", backgroundColor: t.border }),
  glyph: (_t, size) => ({ color: "primary", size: size === "large" ? 18 : size === "small" ? 14 : 16 }),
  pressedOpacity: 0.6,
  ripple: null,
  hitSlop: null,
  fieldOnLeft: false,
  // The established Canvas above-field title (the Field/Form label look): 14/20
  // medium (500) at base, matching Input's web label scale.
  labelAbove: (t, size) => ({
    fontSize: size === "large" ? 16 : size === "small" ? 12 : 14,
    lineHeight: size === "large" ? 24 : size === "small" ? 16 : 20,
    fontWeight: "500",
    color: t.foreground,
  }),
  description: (t, size) => ({
    fontSize: size === "large" ? 14 : 12,
    lineHeight: size === "large" ? 20 : 16,
    color: t["muted-foreground"],
  }),
};

// ============================ iOS (HIG / iOS 27 kit Stepper) ============================
// The segmented UIStepper pill: a `secondary` FULL CAPSULE of [ − | + ] (iOS 27 kit
// Stepper root: border-radius infinity, continuous corner curve) with an inset
// hairline divider between the halves (1 × height − 8, self-centered, the kit's
// 1x24 separator on the 32pt control), ~32pt tall. The editable value sits in a
// transparent field to the LEFT of the pill (the HIG layout) at the iOS body role
// (17/22 base). The ± glyphs are NEUTRAL `foreground` (the stepper has no accent
// slot: its glyphs are label-colored, white in dark / black in light), and a pressed
// half gets a quaternary-fill HIGHLIGHT (alpha(foreground, 0.1)) instead of a dim,
// so the glyph never fades mid-press.
const IOS_HEIGHT: Record<Size, number> = { small: 28, base: 32, large: 36 };
const IOS_BTN_W: Record<Size, number> = { small: 42, base: 48, large: 54 };
const IOS_FIELD_W: Record<Size, number> = { small: 44, base: 52, large: 60 };

export const iosSkin: StepperSkin = {
  group: (t, size) => ({
    flexDirection: "row",
    alignItems: "stretch",
    height: IOS_HEIGHT[size],
    // Full capsule (radius = height / 2) with Apple's smooth corner curve; the
    // pre-iOS-26 ~8pt rounded rect is gone. borderCurve is iOS-only (no-op elsewhere).
    borderRadius: IOS_HEIGHT[size] / 2,
    borderCurve: "continuous",
    backgroundColor: t.secondary,
    overflow: "hidden",
  }),
  button: (t, size, _side, disabled, pressed) => ({
    ...ROW_CENTER,
    width: IOS_BTN_W[size],
    height: "100%",
    // iOS 27 stepper press feedback: the pressed half paints a quaternary-fill
    // segment highlight (like a segmented control) while the glyph stays at full
    // label color — never an opacity dim.
    backgroundColor: pressed && !disabled ? alpha(t.foreground, 0.1) : "transparent",
  }),
  field: (t, size) => ({
    ...fieldText(size),
    // iOS body text is 17pt: bump the value to the iOS type roles (subheadline
    // 15/20, body 17/22, title3 20/25), the same per-OS bump the Android skin
    // takes to the M3 16sp body.
    ...(size === "large"
      ? { fontSize: 20, lineHeight: 25 }
      : size === "small"
        ? { fontSize: 15, lineHeight: 20 }
        : { fontSize: 17, lineHeight: 22 }),
    width: IOS_FIELD_W[size],
    // The value sits to the left of the pill, right-aligned toward it, on a
    // transparent surface (no box) per the HIG inline layout.
    textAlign: "right",
    color: t.foreground,
    backgroundColor: "transparent",
    paddingRight: 10,
  }),
  // The hairline that splits the [ − | + ] pill into two halves: inset 4pt top and
  // bottom (1 × height − 8, the kit's 1x24 separator on the 32pt stepper) in a
  // tertiary-label-like ink that reads against the `secondary` fill in BOTH schemes
  // (t.border matches the dark fill and vanishes there).
  divider: (t) => ({
    width: 1,
    alignSelf: "stretch",
    marginVertical: 4,
    backgroundColor: alpha(t.foreground, 0.3),
  }),
  glyph: (_t, size) => ({ color: "foreground", size: size === "large" ? 20 : size === "small" ? 16 : 18 }),
  pressedOpacity: null, // the pressed half highlights (see button) — no dim on iOS
  ripple: null,
  hitSlop: null, // Apple's own UIStepper is a 32pt-tall control; no HIG finding here
  fieldOnLeft: true,
  // The iOS field-label above the control: SF Pro Text tracking (letterSpacing
  // -0.15 at 14pt, Apple's SF tracking table) and semibold (600), the iOS
  // field-label convention (identical to Input's iOS label).
  labelAbove: (t, size) => ({
    fontSize: size === "large" ? 16 : size === "small" ? 12 : 14,
    lineHeight: size === "large" ? 24 : size === "small" ? 16 : 20,
    fontWeight: "600",
    letterSpacing: -0.15,
    color: t.foreground,
  }),
  // Secondary/footnote line under the label: iOS footnote 13pt with SF tracking.
  description: (t, size) => ({
    fontSize: size === "large" ? 14 : 13,
    lineHeight: size === "large" ? 20 : 18,
    letterSpacing: -0.08,
    color: t["muted-foreground"],
  }),
};

// ============================ Android (Material 3 quantity control) ============================
// M3 has no stepper, so this is the standard custom quantity control: two OUTLINED
// circular icon buttons (1dp `border`, ~40dp) flanking the value, flat (no shadow),
// with a 12%-alpha brand android_ripple on press and hitSlop padding the touch
// target to the M3 48dp minimum. The ± glyphs are the brand `primary`; the value
// sits inline between the buttons.
const M3_BTN: Record<Size, number> = { small: 32, base: 40, large: 48 };
const M3_FIELD_W: Record<Size, number> = { small: 48, base: 56, large: 64 };
const M3_GAP: Record<Size, number> = { small: 6, base: 8, large: 10 };

export const androidSkin: StepperSkin = {
  // The group is just a row; the M3 icon buttons carry their own outline, so the
  // group itself is transparent with a gap between slots.
  group: (_t, size) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: M3_GAP[size],
  }),
  button: (t, size, _side, disabled) => ({
    ...ROW_CENTER,
    width: M3_BTN[size],
    height: M3_BTN[size],
    borderRadius: 9999, // M3 icon button = circle
    borderWidth: 1,
    // M3 disabled outlined treatment: the outline FADES (on-surface at 12% alpha),
    // always fainter than the enabled `border` — never a stronger token, or the
    // at-bound button reads as the emphasized one.
    borderColor: disabled ? alpha(t.foreground, 0.12) : t.border,
    backgroundColor: "transparent", // outlined, flat (no elevation/shadow per M3)
    overflow: "hidden", // clip the ripple to the circle
  }),
  field: (t, size) => ({
    ...fieldText(size),
    // M3 body input is 16sp; nudge the value type up.
    ...(size === "large" ? { fontSize: 18, lineHeight: 26 } : size === "small" ? { fontSize: 14, lineHeight: 20 } : { fontSize: 16, lineHeight: 24 }),
    width: M3_FIELD_W[size],
    textAlign: "center",
    color: t.foreground,
    backgroundColor: "transparent",
  }),
  divider: null, // no joining lines: the M3 buttons are separate outlined chips
  glyph: (_t, size) => ({ color: "primary", size: size === "large" ? 22 : size === "small" ? 18 : 20 }),
  pressedOpacity: null, // Android uses a ripple instead
  // M3 state layer = 12% alpha ink (brand primary here), per src/style/ripple.ts
  // conventions; bounded + the overflow clip above keeps it inside the circle.
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
  // Pad the 32/40dp circles out to the M3 48dp minimum touch target (large is 48dp
  // already): the standard M3 icon-button pattern of a 40dp container in a 48dp target.
  hitSlop: (size) => Math.max(0, (48 - M3_BTN[size]) / 2),
  fieldOnLeft: false,
  // M3 has no stepper, so its custom quantity control carries a component-owned
  // title ABOVE (a ± button row has no filled field box to float an in-container
  // M3 label into). The M3 label type: medium (500) with M3 label tracking (0.1),
  // on-surface; sizes match Input's label scale.
  labelAbove: (t, size) => ({
    fontSize: size === "large" ? 16 : size === "small" ? 12 : 14,
    lineHeight: size === "large" ? 24 : size === "small" ? 16 : 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    color: t.foreground,
  }),
  // M3 supporting text: body-small (12sp) with body-small tracking (0.4), on-surface-variant.
  description: (t, size) => ({
    fontSize: size === "large" ? 14 : 12,
    lineHeight: size === "large" ? 20 : 16,
    letterSpacing: 0.4,
    color: t["muted-foreground"],
  }),
};
