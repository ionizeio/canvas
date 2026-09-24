import { StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha, activeIndicator, shape, type FloatingLabelStyles } from "../../style/index.js";
import { fieldBorder } from "../../style/field-colors.js";
import {
  FIELD_HEIGHT,
  FIELD_ICON,
  FIELD_ICON_GAP,
  FIELD_INSET,
  FIELD_LABEL_GAP,
  fieldDisabled,
  fieldFrame,
  fieldLabel,
  fieldValue,
  type FieldDisabledLook,
  type FieldSize,
} from "../../style/field-look.js";
import {
  MENU_OFFSET,
  MENU_ROW_GAP,
  menuCheck,
  menuChosenLabel,
  menuListPanel,
  menuRow,
  menuRowHover,
  menuRowLabel,
  menuRowPressed,
} from "../../style/menu-look.js";

// Co-located Select skins, one per platform, all driven by the theme tokens (passed in
// from useTheme so they follow the palette and the scheme). Under glass the option list
// takes the DENSE layer (the shell passes `dense` to AnchoredOverlay), so its rows stay
// legible over the page; in solid mode each skin paints its own panel. A pop-up menu
// exists on both platforms, so iOS and Android keep their own shapes in the theme's
// colours, and the web takes Dark Factory's Select:
//   iOS: the "iOS Mobile Input Fields" reference's country select (see
//     input.styles.ts): the same white `card` box as the Input (8 radius, the 1pt
//     gray-300 `field-border` hairline, `ring` when open), ~44pt tall, a 16pt
//     value, and a trailing ▾ caret in `muted-foreground`; press = opacity dim
//     (~0.8). The menu is the very rounded Liquid Glass popover (26 radius,
//     `popover`, soft shadow, ~17pt rows ~42pt tall, hairline group separators);
//     the selected row shows a LEADING brand checkmark (the UIMenu look).
//   Android (Material 3 exposed dropdown): a filled trigger (subtle `muted` fill,
//     TOP corners ~4 radius, flat bottom) with a bottom active-indicator underline
//     (1dp `muted-foreground` at rest -> 2dp `primary` when open) and a trailing
//     chevron; press = android_ripple. The menu is an elevated surface (4 radius,
//     `popover`, soft shadow); pressed rows tint with the ripple (alpha(primary, 0.12)
//     state layer) and the selected row is tinted.
//   Web: Dark Factory's Select. The trigger is its field frame (src/style/field-look.ts:
//     the `field-fill` well at the field corner, the resting `field-border` hairline
//     turning `ring` while the list is open, 40 tall at base, a 12px inset and a 13 /
//     600 value) with its 14px chevron-down Icon in the muted ink, the eyebrow label
//     above, and Dark Factory's disabled look in place of a dim. The list is Dark
//     Factory's menu (src/style/menu-look.ts): the panel 8 below the trigger, 33px
//     rows 2px apart with the instant hover wash, and the chosen row marked in the
//     selection violet (its label and a checkmark in the gutter every row keeps), with
//     no fill. Under glass the trigger is the clear well every web field is.

export type Size = "small" | "default" | "large";

// The contract a platform skin fulfills. The shell resolves size + the open and
// hasValue/selected states and passes them in; the skin maps them to RN style
// objects. `selectedSide` tells the shell where to render the ✓ selection
// indicator (leading on every platform today; a skin may put it trailing).
export interface SelectSkin extends FloatingLabelStyles<Size> {
  /** The clear text-entry well under web glass (the web skin); the others keep the control layer's material. */
  liquid?: boolean;
  /** Type scale per size; label, trigger value, and rows share it so they line up. */
  text: (size: Size) => TextStyle;
  /** The stacked (above-trigger) label type, used on iOS + web (`floatingLabel:
   *  false`). On Android the label FLOATS inside the trigger instead (see
   *  FloatingLabelStyles: `floatingLabel`, `labelRest`/`labelFloated`/`labelReserve`). */
  label: (t: ColorTokens, size: Size) => TextStyle;
  /** The INLINE label type: a muted small label rendered as a leading cluster
   *  INSIDE the trigger row (before the value) when `inline` is set alongside
   *  `label`, for a toolbar-style labeled select. Per-OS type; not the persistent
   *  above/floating placement. */
  inlineLabel: (t: ColorTokens, size: Size) => TextStyle;
  /** The trigger surface: shape, fill, border/underline; `open` lights the active state. */
  trigger: (t: ColorTokens, size: Size, open: boolean) => ViewStyle;
  /** The leading cluster inside the trigger (optional icon + value/placeholder). */
  triggerValue: ViewStyle;
  /** The trigger value text: foreground when a value is selected, muted otherwise. */
  valueText: (t: ColorTokens, size: Size, hasValue: boolean) => TextStyle;
  /** The trailing chevron glyph. Different character per platform; `open` lets
   *  Android tint it with the brand `primary` when the menu is expanded. */
  chevron: (t: ColorTokens, size: Size, open: boolean) => TextStyle;
  /** The chevron character where the skin draws a text glyph (▾ on iOS, ⌄ on Android). */
  chevronGlyph: string;
  /**
   * The size of the kit's chevronDown Icon where the skin draws that in place of the text
   * glyph (the web's, Dark Factory's 14px chevron), in `chevron`'s colour; null for the glyph.
   */
  chevronIcon: number | null;
  /** The leading glyph's size (the `icon` prop's globe). */
  iconSize: number;
  /** The open option list surface: card visuals only (fill, border, shadow,
   *  radius, padding, maxHeight). AnchoredOverlay paints it (the dense layer's
   *  material under glass) and supplies the on-page position; the inline no-host
   *  fallback adds panelAnchor for the absolute anchoring. */
  panel: (t: ColorTokens) => ViewStyle;
  /** An option row. `selected` carries the platform's selected tint, where it has one. */
  optionRow: (t: ColorTokens, selected: boolean) => ViewStyle;
  /**
   * Optional hairline group separator applied to every row after the first, so
   * the menu reads as iOS's separated item groups. Skins that omit it (web,
   * Android) render borderless rows exactly as before.
   */
  rowSeparator?: (t: ColorTokens) => ViewStyle;
  /** The fill applied on press (web/iOS dim via this; Android uses a ripple). */
  optionPressed: (t: ColorTokens) => ViewStyle;
  /** The instant look of a resting row under the pointer (the web's wash); null where there is none. */
  optionHover: ((t: ColorTokens) => ViewStyle) | null;
  /** The chosen row's label over its plain one (the web's selection violet); null leaves it plain. */
  chosenText: ((t: ColorTokens) => TextStyle) | null;
  /** The space between rows. */
  rowGap: number;
  /** The standoff between the trigger and the list, in px (Dark Factory's 8 on the web). */
  menuGap: number;
  /** Option row text (label + the indicator glyph). */
  optionText: (t: ColorTokens, size: Size) => TextStyle;
  /** The selected-row indicator glyph (✓) styled in the platform's accent. */
  indicator: (t: ColorTokens, size: Size) => TextStyle;
  /** Which side the selection indicator renders on. */
  selectedSide: "leading" | "trailing";
  /** Opacity applied to the trigger when disabled (1 on a skin that draws `disabledLook`). */
  disabledOpacity: number;
  /**
   * A disabled look drawn in place of the dim (the web: Dark Factory's, the field's): the
   * trigger takes `frame`, its value `ink`, and it paints no material. The iOS and Android
   * skins omit it and dim.
   */
  disabledLook?: (t: ColorTokens, focused: boolean) => FieldDisabledLook;
  /** iOS/web dim the trigger + rows on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the trigger and the rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// The control owns the full width of its slot; `relative` makes it the
// positioning context for the floating option list. The escape-hatch `style`
// (mainly width) is applied after this by the shell.
export const root: ViewStyle = { position: "relative", width: "100%" };

// When the list is open, the root is lifted into its own stacking context above
// sibling content. react-native-web gives every positioned View an implicit
// stacking context, so the panel's own `zIndex` is scoped INSIDE the `relative`
// root and cannot rise above a later sibling. Raising the root's zIndex while
// open lifts the whole control — trigger and panel together — above everything
// painted after it.
export const rootLifted: ViewStyle = { zIndex: 50 };

// --- shared layout fragments (identical across platforms) -------------------

const TRIGGER_ROW: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  // A minimum gutter between the value cluster and the trailing chevron. In a
  // fixed-width field `space-between` pushes them to opposite edges and the free
  // space far exceeds this, so it has no visible effect; when `fit` collapses the
  // trigger to its content width there is no free space to distribute, and this
  // keeps the chevron from jamming against the value (the toolbar `inline`+`fit` case).
  gap: 8,
};

// The inline-fallback anchor: with no OverlayProvider mounted the option list
// renders in place, absolutely positioned below the trigger (the kit's pre-portal
// behavior). With a provider, AnchoredOverlay portals the card over the page,
// anchors it below the trigger, and adds the outside-tap dismiss backdrop instead.
// `start:0,end:0` pins the fallback to the trigger's width; the `marginTop`
// supplies the skin's trigger-to-panel gap in this fallback (AnchoredOverlay's `gap`
// does it when hosted). The skins own the card's shape/fill/shadow only.
export function panelAnchor(gap: number): ViewStyle {
  return { position: "absolute", top: "100%", start: 0, end: 0, zIndex: 50, marginTop: gap };
}

// ---------- Web: Dark Factory's Select ----------
// The trigger reads the field recipe and the list the menu recipe, so the Select cannot
// drift from the Input beside it or from the Dropdown. The Select's middle size is the
// field's base.
const FIELD_SIZE: Record<Size, FieldSize> = { small: "small", default: "base", large: "large" };
export const webSkin: SelectSkin = {
  liquid: true,
  text: (size) => fieldValue(FIELD_SIZE[size]),
  label: (t) => ({ ...fieldLabel(t), marginBottom: FIELD_LABEL_GAP }),
  // Inline (toolbar) label: the value's size at the body weight in the muted ink, beside the value.
  inlineLabel: (t, size) => ({ ...fieldValue(FIELD_SIZE[size]), fontWeight: "500", color: t["muted-foreground"] }),
  // Dark Factory's FieldFrame focused while the list is open (the trigger's keyboard focus
  // shows the kit's ring), its 12px inset, and the field's height per size.
  trigger: (t, size, open) => ({
    ...TRIGGER_ROW,
    ...fieldFrame(t, { focused: open, error: false }),
    paddingHorizontal: FIELD_INSET,
    height: FIELD_HEIGHT[FIELD_SIZE[size]],
  }),
  triggerValue: { flexDirection: "row", alignItems: "center", gap: FIELD_ICON_GAP },
  valueText: (t, size, hasValue) => ({ ...fieldValue(FIELD_SIZE[size]), color: hasValue ? t.foreground : t["muted-foreground"] }),
  chevron: (t) => ({ color: t["muted-foreground"] }),
  chevronGlyph: "▾",
  chevronIcon: 14,
  iconSize: FIELD_ICON,
  panel: menuListPanel,
  // Being chosen fills nothing: the label and the checkmark carry it.
  optionRow: () => menuRow,
  optionPressed: menuRowPressed,
  optionHover: menuRowHover,
  chosenText: menuChosenLabel,
  rowGap: MENU_ROW_GAP,
  menuGap: MENU_OFFSET,
  optionText: (t) => ({ ...menuRowLabel, color: t["popover-foreground"] }),
  indicator: menuCheck,
  selectedSide: "leading",
  disabledOpacity: 1,
  disabledLook: fieldDisabled,
  pressedOpacity: 0.9,
  ripple: null,
  // The label sits ABOVE the trigger: Dark Factory's eyebrow.
  floatingLabel: false,
};

// ---------- iOS 26 (Liquid Glass) pop-up button + menu ----------
// Apple's iOS 26 pop-up button is a PLAIN, lightly outlined row (not a heavy
// filled gray capsule): the value text followed by a trailing chevron-up-down
// disclosure, drawn as the reference's field box: `card` fill, the resting
// `field-border` hairline, `ring` when open, 44pt tall, the 8pt field corner. The
// MENU it opens is the Liquid Glass surface from Apple's kit: a VERY rounded
// popover (26pt continuous corners), `popover` fill, a soft drop shadow, ~17pt
// rows that are ~42pt tall (the kit's iPhone "Menu Item, Title" is 198x42), with
// a hairline group separator between rows. The SELECTED row is marked by a
// LEADING brand checkmark (the kit's "Menu Item - Selectable" puts the check on
// the leading edge), in `primary`.
const IOS_MENU_RADIUS = 26;
const IOS_TRIGGER_BOX: Record<Size, number> = { small: 36, default: 44, large: 50 };
// The reference's 16pt value (the same ladder as the Input's iOS skin).
const IOS_TEXT: Record<Size, TextStyle> = {
  small: { fontSize: 13, lineHeight: 16 },
  default: { fontSize: 16, lineHeight: 24 },
  large: { fontSize: 17, lineHeight: 26 },
};
// The above-trigger label: the reference's 14pt regular secondary title.
const IOS_LABEL: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 16, lineHeight: 24 },
};
// Menu rows hold the iOS body size (17pt) regardless of the trigger's size axis,
// matching the kit's fixed menu type.
const IOS_ROW_TEXT: TextStyle = { fontSize: 17, lineHeight: 22 };
export const iosSkin: SelectSkin = {
  text: (size) => IOS_TEXT[size],
  label: (t, size) => ({ marginBottom: 8, fontWeight: "400", letterSpacing: -0.15, color: t["muted-foreground"], ...IOS_LABEL[size] }),
  // Inline (toolbar) label: iOS uses a regular-weight secondary label beside the
  // value (the iOS bar/toolbar caption read), tinted `muted-foreground`.
  inlineLabel: (t, size) => ({ fontWeight: "400", color: t["muted-foreground"], ...IOS_TEXT[size] }),
  // The reference's select trigger: the Input's white box (see input.styles.ts),
  // its resting hairline turning `ring` while the list is open.
  trigger: (t, size, open) => ({
    ...TRIGGER_ROW,
    borderRadius: shape.ios.field,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: open ? t.ring : fieldBorder(t),
    backgroundColor: t.card,
    paddingHorizontal: 12,
    height: IOS_TRIGGER_BOX[size],
  }),
  triggerValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  valueText: (t, size, hasValue) => ({ color: hasValue ? t.foreground : t["muted-foreground"], ...IOS_TEXT[size] }),
  // The trailing disclosure is the reference's gray caret (its Icon/Default), a
  // small filled ▾ in `muted-foreground`, unchanged while the list is open.
  chevron: (t, size) => ({ color: t["muted-foreground"], ...IOS_TEXT[size] }),
  chevronGlyph: "▾",
  chevronIcon: null,
  iconSize: 14,
  // The Liquid Glass menu: very rounded (26pt), `popover`, soft shadow, and
  // CLIPPED to those corners so a pressed row, the full-bleed separators, and any
  // option scrolled under the cap cannot poke past them. iOS still draws the soft
  // shadow outside these bounds: the iOS Dropdown menuCard has shipped the same
  // clip alongside shadow("lg") since the Liquid Glass rework.
  panel: (t) => ({
    maxHeight: 320,
    overflow: "hidden", // clip rows to the rounded card; the list scrolls inside
    borderRadius: IOS_MENU_RADIUS,
    backgroundColor: t.popover,
    paddingVertical: 4,
    ...shadow("lg", t),
  }),
  // No row tint at rest on iOS; the selection is shown by the leading check and
  // rows are separated by hairlines (see rowSeparator). ~42pt tall per the kit.
  optionRow: (_t, _selected) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 42,
  }),
  // Hairline group separator between rows, in `border` (the iOS opaque-separator
  // read), inset to clear the leading text gutter as the kit shows.
  rowSeparator: (t) => ({ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }),
  optionPressed: (t) => ({ backgroundColor: t.secondary }),
  optionHover: null,
  chosenText: null,
  rowGap: 0,
  menuGap: 4,
  optionText: (t, _size) => ({ color: t["popover-foreground"], ...IOS_ROW_TEXT }),
  // The selected-row checkmark is the selection `primary`, LEADING-aligned (the iOS 26
  // selectable menu marks the leading edge), with the label plain.
  indicator: (t, _size) => ({ color: t.primary, fontWeight: "600", ...IOS_ROW_TEXT }),
  selectedSide: "leading",
  // iOS disabled control alpha: ~0.4 (the kit's disabled Menu Item is markedly
  // dimmer than 50%), matching the iOS Button's disabled treatment.
  disabledOpacity: 0.4,
  pressedOpacity: 0.8,
  ripple: null,
  // iOS (HIG): the label sits ABOVE the trigger, rendered from `label` above.
  floatingLabel: false,
};

// ---------- Android (Material 3 exposed dropdown): filled field, top radius, active indicator ----------
// M3 exposed dropdown menu: a filled trigger (subtle `muted` fill ~
// surface-container-highest), the TOP corners rounded ~4dp and a flat bottom,
// with a bottom active-indicator underline (1dp `muted-foreground` at rest, 2dp
// `primary` when open) and a trailing dropdown arrow (chevron-down). The menu is
// an elevated surface (4dp, `popover`, soft shadow); pressed rows tint with the
// ripple (alpha(primary, 0.12) state layer) and the selected row is tinted.
const ANDROID_TOP_RADIUS = 4;
const ANDROID_TRIGGER_BOX: Record<Size, number> = { small: 48, default: 56, large: 60 };
const ANDROID_TEXT: Record<Size, TextStyle> = {
  small: { fontSize: 14, lineHeight: 20 },
  default: { fontSize: 16, lineHeight: 24 },
  large: { fontSize: 18, lineHeight: 26 },
};
// M3 supporting-text label scale, a notch below the field type.
const ANDROID_LABEL: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 12, lineHeight: 16 },
  large: { fontSize: 14, lineHeight: 20 },
};
export const androidSkin: SelectSkin = {
  text: (size) => ANDROID_TEXT[size],
  label: (t, size) => ({ marginBottom: 6, fontWeight: "500", color: t.foreground, ...ANDROID_LABEL[size] }),
  // Inline (toolbar) label: the M3 label-medium scale (a notch below the field
  // type), tinted on-surface-variant (`muted-foreground`), beside the value.
  inlineLabel: (t, size) => ({ fontWeight: "500", color: t["muted-foreground"], ...ANDROID_LABEL[size] }),
  trigger: (t, size, open) => ({
    ...TRIGGER_ROW,
    borderTopStartRadius: ANDROID_TOP_RADIUS,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
    // Clip the Material ripple to the rounded top outline (without this the bounded
    // android_ripple paints a rectangle past the top corners).
    overflow: "hidden",
    // M3 active indicator: a clear rest baseline (on-surface-variant ~ muted-foreground)
    // thickening to the brand primary on open. activeIndicator reserves a constant band
    // below the content so the 1dp -> 2dp thickening never reflows the centered value text.
    ...activeIndicator({ active: open, restColor: t["muted-foreground"], activeColor: t.primary }),
    backgroundColor: t.muted,
    paddingHorizontal: 16,
    height: ANDROID_TRIGGER_BOX[size],
  }),
  triggerValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  valueText: (t, size, hasValue) => ({ color: hasValue ? t.foreground : t["muted-foreground"], ...ANDROID_TEXT[size] }),
  // The trailing dropdown arrow tints with the brand `primary` when open, muted at rest.
  chevron: (t, size, open) => ({ color: open ? t.primary : t["muted-foreground"], ...ANDROID_TEXT[size] }),
  chevronGlyph: "⌄",
  chevronIcon: null,
  iconSize: 14,
  panel: (t) => ({
    maxHeight: 280,
    overflow: "hidden", // clip rows to the rounded card; the list scrolls inside
    borderRadius: 4,
    backgroundColor: t.popover,
    paddingVertical: 8,
    ...shadow("md", t),
  }),
  optionRow: (t, selected) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    ...(selected ? { backgroundColor: alpha(t.primary, 0.12) } : null),
  }),
  // The M3 pressed state layer: the brand primary at ~12% alpha (the ripple tint).
  optionPressed: (t) => ({ backgroundColor: alpha(t.primary, 0.12) }),
  optionHover: null,
  chosenText: null,
  rowGap: 0,
  menuGap: 4,
  optionText: (t, _size) => ({ color: t["popover-foreground"], ...ANDROID_TEXT["small"] }),
  indicator: (t, _size) => ({ color: t.primary, fontWeight: "700", ...ANDROID_TEXT["small"] }),
  selectedSide: "leading",
  disabledOpacity: 0.38, // M3 disabled opacity
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
  // Android (Material 3 exposed dropdown): the IN-CONTAINER FLOATING label,
  // identical geometry to the M3 Input. At rest it sits vertically centered like
  // the trigger's placeholder (body per size); once the menu opens OR a value is
  // selected it floats to the top, shrinking to body-small (12sp). The shell
  // reserves `labelReserve` of top padding so the value clears the floated label,
  // and drives translateY + scale on the transform driver (`labelFloated`'s
  // fontSize supplies the scale ratio only). M3 body tracking: body-large 0.5,
  // body-medium 0.25, body-small 0.4.
  floatingLabel: true,
  labelRest: (_t, size) => {
    if (size === "large") return { fontSize: 18, lineHeight: 26, letterSpacing: 0.5 };
    if (size === "small") return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 };
    return { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 };
  },
  labelFloated: (_t, _size) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4 }),
  labelReserve: (size) => ({ paddingTop: size === "large" ? 26 : size === "small" ? 20 : 24 }),
};
