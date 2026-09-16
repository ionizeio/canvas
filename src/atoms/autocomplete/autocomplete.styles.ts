import { StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { shadow, activeIndicator, shape, type ColorTokens, type FloatingLabelStyles } from "../../style/index.js";

// Co-located Autocomplete skins, one per platform. An Autocomplete is a searchable
// single-select: an editable field that filters an open option list. The BRAND
// survives on every platform (the indigo `primary`/`accent` tokens stay; the
// focus accent is the `ring`, never a platform default) and only the native
// SHAPE, sizing, fill, border/underline treatment, popover elevation, and press
// feedback change per OS. The treatment mirrors Input/Select:
//   iOS 27 (iOS 26+/Liquid Glass): a plain field, transparent, no capsule, just
//     a bottom hairline (`border` at rest -> brand `primary` when open); the
//     trailing chevron is `muted-foreground`; the open list is a large
//     continuous-corner `popover` card (~27 radius) with a soft shadow and roomy
//     rows. Press = opacity dim (~0.8).
//   Android (Material 3 filled): a subtle `muted` fill, TOP corners ~4 radius and
//     a flat bottom, a bottom active-indicator underline (1dp `border` at rest ->
//     2dp `ring` brand when open); the menu surface is a flat-cornered (~4)
//     elevated `popover` sheet (M3 elevation, no soft drop shadow), full-width
//     rows ~48dp tall; press = android_ripple.
//   Web: the established Canvas look (the current field, lifted verbatim) —
//     full 1px `input` border, 6 radius, `background` fill, h-8/9/10; the popover
//     is a 6-radius bordered `popover` card with `shadow-lg`, 4px padding, 2-radius
//     accent rows. Press dims nothing (the active accent fill is the feedback).

export type Size = "small" | "default" | "large";

// The contract a platform skin fulfills. The shell resolves the size and the
// open/selected/pressed/muted state and asks the skin to map them to RN style
// objects. The skin owns shape, fill, border/underline, popover elevation, the
// row layout, and the press-feedback channel (iOS/web opacity vs Android ripple).
export interface AutocompleteSkin extends FloatingLabelStyles<Size> {
  /** Type scale per size; the field text and the option rows share it. */
  text: (size: Size) => TextStyle;
  /** Stacked (above-field) label type, used on iOS + web (`floatingLabel: false`).
   *  On Android the label FLOATS inside the field instead (see FloatingLabelStyles:
   *  `floatingLabel`, `labelRest`/`labelFloated`/`labelReserve`). */
  label: (t: ColorTokens, size: Size) => TextStyle;
  /** The editable field surface: shape, fill, border/underline for the open state. */
  field: (t: ColorTokens, size: Size, open: boolean) => ViewStyle;
  /** The field's value text (foreground), or muted for the placeholder. */
  fieldText: (t: ColorTokens, size: Size, muted: boolean) => TextStyle;
  /** The trailing disclosure chevron. */
  chevron: (t: ColorTokens, size: Size) => TextStyle;
  /** The disclosure's real layout/touch target, including the field's border band. */
  chevronTarget: (size: Size) => ViewStyle;
  /**
   * The open option list CARD: radius, fill, border, elevation/shadow, padding,
   * max-height. Positioning is owned by the shell (AnchoredOverlay portals and
   * anchors it; POPOVER_ANCHOR is the no-host inline fallback), so this returns
   * card visuals only, no position/top/zIndex.
   */
  popover: (t: ColorTokens) => ViewStyle;
  /** The "No results" row box. */
  emptyRow: ViewStyle;
  emptyText: (t: ColorTokens, size: Size) => TextStyle;
  /** A single option row's layout (gutter, radius, padding). */
  row: ViewStyle;
  /**
   * Optional hairline group separator applied to every row after the first, so
   * the menu reads as iOS's separated item groups. Skins that omit it (web,
   * Android) render borderless rows exactly as before.
   */
  rowSeparator?: (t: ColorTokens) => ViewStyle;
  /**
   * The fill applied to the SELECTED row at rest. iOS marks selection with the
   * leading check only (no rest fill), so it returns null; web/Android tint with
   * the brand `accent`.
   */
  rowSelected: (t: ColorTokens) => ViewStyle | null;
  /**
   * The transient fill applied while a row is PRESSED. iOS uses the neutral list
   * tint (`secondary`); web/Android tint with the brand `accent`.
   */
  rowPressed: (t: ColorTokens) => ViewStyle;
  /** The leading check column. */
  check: (t: ColorTokens, size: Size) => TextStyle;
  /** The option label. */
  optionText: (t: ColorTokens, size: Size) => TextStyle;
  /** Helper line below the option list. */
  helper: (t: ColorTokens) => TextStyle;
  /** Opacity applied to the whole control when disabled. */
  disabledOpacity: number;
  /** iOS/web dim the field on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the pressable surfaces; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// `relative w-full`: the positioning context for the absolutely-placed popover.
export const wrapper: ViewStyle = { position: "relative", width: "100%" };

// When the list is open, the wrapper is lifted into its own stacking context
// above sibling content. react-native-web gives every positioned View an
// implicit stacking context, so the popover's own `zIndex` is scoped INSIDE the
// `relative` wrapper and cannot rise above a later sibling. Raising the wrapper's
// zIndex while open lifts the whole control — field and popover together — above
// everything painted after it.
export const wrapperLifted: ViewStyle = { zIndex: 50 };

// --- shared type scale (identical across platforms; brand type, not a face) --
const TEXT_SIZE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 16, lineHeight: 24 },
};
function webText(size: Size): TextStyle {
  return TEXT_SIZE[size];
}

// Field height per size; mirrors Input's footprint per platform.
const WEB_FIELD_BOX: Record<Size, number> = { small: 40, default: 48, large: 56 };

// ---------- Web: the Riskora dashboard field + menu ----------
export const webSkin: AutocompleteSkin = {
  text: webText,
  label: (t, size) => ({ marginBottom: 6, fontWeight: "500", color: t.foreground, ...TEXT_SIZE[size] }),
  field: (t, size) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: shape.web.field,
    borderWidth: 1,
    borderColor: t.input,
    backgroundColor: t.card,
    paddingHorizontal: 16,
    height: WEB_FIELD_BOX[size],
  }),
  fieldText: (t, size, muted) => ({ color: muted ? t["muted-foreground"] : t.foreground, ...TEXT_SIZE[size] }),
  chevron: (t, size) => ({ color: t["muted-foreground"], ...TEXT_SIZE[size] }),
  chevronTarget: () => ({
    alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexShrink: 0,
    width: 24, minHeight: 24,
  }),
  // The list is the Riskora menu: a 16px-cornered card with an 8px inset and
  // 40px rows with a 10px corner (matches Select's panel).
  popover: (t) => ({
    maxHeight: 280,
    overflow: "hidden", // clip rows to the rounded card; the list scrolls inside
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 8,
    ...shadow("lg"),
  }),
  emptyRow: { paddingHorizontal: 12, paddingVertical: 10 },
  emptyText: (t, size) => ({ color: t["muted-foreground"], ...TEXT_SIZE[size] }),
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // Web marks both selection and press with the soft `accent` panel fill.
  rowSelected: (t) => ({ backgroundColor: t.accent }),
  rowPressed: (t) => ({ backgroundColor: t.accent }),
  check: (t, size) => ({ width: 14, color: t["popover-foreground"], ...TEXT_SIZE[size] }),
  optionText: (t, size) => ({ color: t["popover-foreground"], ...TEXT_SIZE[size] }),
  helper: (t) => ({ marginTop: 6, fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  disabledOpacity: 0.5,
  pressedOpacity: null, // web shows press via the active accent fill, not opacity
  ripple: null,
  // The label sits ABOVE the field (Riskora's form rows).
  floatingLabel: false,
};

// ---------- iOS (HIG): .roundedBorder field, large-radius glass menu ----------
// The iOS combo box reads like SwiftUI's `.roundedBorder` text field: a subtly filled,
// rounded rectangle (continuous corners) with a 1pt border that tints to the brand
// `ring` when the list is open. A full border box, never a bottom underline, so it
// reads as a native iOS field rather than the Material one. The field value, placeholder,
// and label use the iOS-native scale (13/15/17pt). The open list is the iOS 26+
// menu surface: a large continuous-corner `popover` card (26 radius, matching the
// co-located iOS Select menu) floating on a soft shadow, with roomy ~42pt rows
// pinned to the iOS body 17pt and hairline group separators between them. Selection
// is the leading brand check ONLY (no rest fill); the transient press highlight is
// the neutral iOS list tint `secondary`. Press dims the field surface (~0.8); no
// ripple. The brand survives: the open hairline, the leading check, and the
// trailing disclosure are all the indigo `primary`, never iOS system blue.
const IOS_MENU_RADIUS = 26;
// Small retains its compact typography, but its entire field must contain the
// 44pt disclosure target: native hit testing cannot extend beyond its parent.
const IOS_FIELD_BOX: Record<Size, number> = { small: 44, default: 44, large: 50 };
// iOS-native field scale (matches select.styles.ts IOS_TEXT): the field value,
// placeholder, and stacked label sit a notch larger than the brand web scale so
// the control reads at the iOS-native footprint (13/15/17pt).
const IOS_TEXT: Record<Size, TextStyle> = {
  small: { fontSize: 13, lineHeight: 18 },
  default: { fontSize: 15, lineHeight: 20 },
  large: { fontSize: 17, lineHeight: 22 },
};
// Menu rows hold the iOS body size (17pt) regardless of the field's size axis,
// matching the kit's fixed "Menu Item, Title" type and select.styles.ts IOS_ROW_TEXT.
const IOS_ROW_TEXT: TextStyle = { fontSize: 17, lineHeight: 22 };
export const iosSkin: AutocompleteSkin = {
  text: (size) => IOS_TEXT[size],
  label: (t, size) => ({ marginBottom: 6, fontWeight: "600", color: t.foreground, ...IOS_TEXT[size] }),
  // Filled rounded rect (.roundedBorder), continuous corners; the border tints to the
  // brand `ring` when the list is open. A full border box, not a bottom underline.
  field: (t, size, open) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: open ? t.ring : t.input,
    backgroundColor: t.secondary,
    paddingHorizontal: 12,
    height: IOS_FIELD_BOX[size],
  }),
  fieldText: (t, size, muted) => ({ color: muted ? t["muted-foreground"] : t.foreground, ...IOS_TEXT[size] }),
  // The trailing disclosure is the brand indigo, the iOS field/pop-up tint.
  chevron: (t, size) => ({ color: t.primary, ...IOS_TEXT[size] }),
  chevronTarget: () => ({
    alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexShrink: 0,
    width: 44, minHeight: 44,
    // Include the 1pt field borders in the actual hit box and use the trailing
    // gutter for the target instead of taking all 44pt from editable text.
    marginVertical: -1, marginEnd: -12,
  }),
  popover: (t) => ({
    maxHeight: 260,
    overflow: "hidden", // clip rows to the rounded card; the list scrolls inside
    borderRadius: IOS_MENU_RADIUS,
    backgroundColor: t.popover,
    paddingVertical: 6,
    ...shadow("lg"),
  }),
  emptyRow: { paddingHorizontal: 16, paddingVertical: 11 },
  emptyText: (t, _size) => ({ color: t["muted-foreground"], ...IOS_ROW_TEXT }),
  // iOS grouped-list rows: roomy (~42pt), no rest fill, hairline-separated. The
  // selection is shown by the leading check, not a row tint.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 42,
  },
  // Inset hairline group separator on every row after the first, in `border`
  // (the iOS opaque-separator read), so the menu reads as iOS's separated groups.
  rowSeparator: (t) => ({ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }),
  // Selection is the leading check ONLY, no rest fill (iOS selectable menu item).
  rowSelected: () => null,
  // The transient press highlight is the neutral iOS list-row tint.
  rowPressed: (t) => ({ backgroundColor: t.secondary }),
  check: (t, _size) => ({ width: 18, color: t.primary, ...IOS_ROW_TEXT }),
  optionText: (t, _size) => ({ color: t["popover-foreground"], ...IOS_ROW_TEXT }),
  helper: (t) => ({ marginTop: 6, fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  // iOS disabled control alpha ~0.4 (the kit's disabled Menu Item is markedly
  // dimmer than 50%), matching select.styles.ts and the iOS Button.
  disabledOpacity: 0.4,
  pressedOpacity: 0.8,
  ripple: null,
  // iOS (HIG): the label sits ABOVE the field, rendered from `label` above.
  floatingLabel: false,
};

// ---------- Android (Material 3 filled): subtle fill, top radius, bottom indicator, elevated menu ----------
// M3 exposed dropdown: the anchor is a filled field (`muted`) with the TOP
// corners rounded ~4dp and a flat bottom, plus a bottom active-indicator
// underline — 1dp `border` at rest, 2dp `ring` (brand) when open. The menu is a
// flat-cornered (~4) elevated `popover` sheet (M3 elevation via `elevation`, no
// soft iOS drop shadow), full-width rows ~48dp tall whose active/selected state
// is the `accent` state layer. The action feedback is android_ripple.
const ANDROID_TOP_RADIUS = 4;
const ANDROID_FIELD_BOX: Record<Size, number> = { small: 48, default: 56, large: 60 };
export const androidSkin: AutocompleteSkin = {
  // M3 body text is 16sp; nudge base/large up, keep small readable.
  text: (size) => {
    if (size === "large") return { fontSize: 18, lineHeight: 26 };
    if (size === "small") return { fontSize: 14, lineHeight: 20 };
    return { fontSize: 16, lineHeight: 24 };
  },
  label: (t, size) => ({ marginBottom: 6, fontWeight: "500", color: t.foreground, ...TEXT_SIZE[size] }),
  field: (t, size, open) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopStartRadius: ANDROID_TOP_RADIUS,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
    // M3 active indicator: a clear muted rest baseline thickening to the brand `ring`
    // on open. activeIndicator keeps the content-box height fixed across the change.
    ...activeIndicator({ active: open, restColor: t["muted-foreground"], activeColor: t.ring }),
    backgroundColor: t.muted,
    paddingHorizontal: 16,
    height: ANDROID_FIELD_BOX[size],
    // The disclosure includes the indicator's border band in its hit target.
    // Clipping here would remove that band from native and browser hit testing.
    // Its Pressable owns the rounded ripple clip instead.
    overflow: "visible",
  }),
  fieldText: (t, size, muted) => ({ color: muted ? t["muted-foreground"] : t.foreground, ...TEXT_SIZE[size] }),
  chevron: (t, size) => ({ color: t["muted-foreground"], ...TEXT_SIZE[size] }),
  chevronTarget: () => ({
    alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexShrink: 0,
    width: 48, minHeight: 48, marginEnd: -16,
    // activeIndicator always reserves 2dp for its border + padding. Include
    // that band so the small 48dp field contains a complete 48dp target.
    marginBottom: -2,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    overflow: "hidden",
  }),
  // M3 menu surface: flat 4dp corners, elevated (no soft drop shadow), zero
  // padding so the full-bleed rows reach the edges.
  popover: (t) => ({
    maxHeight: 280,
    overflow: "hidden", // clip rows to the rounded card; the list scrolls inside
    borderRadius: 4,
    backgroundColor: t.popover,
    paddingVertical: 8,
    elevation: 8,
  }),
  emptyRow: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyText: (t, size) => ({ color: t["muted-foreground"], ...TEXT_SIZE[size] }),
  // Full-bleed M3 list rows: square corners, ~48dp tall, 16dp gutter.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 0,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // M3 marks both selection and press with the brand `accent` state layer
  // (unchanged from the previous shared `rowAccent`).
  rowSelected: (t) => ({ backgroundColor: t.accent }),
  rowPressed: (t) => ({ backgroundColor: t.accent }),
  check: (t, size) => ({ width: 16, color: t.primary, ...TEXT_SIZE[size] }),
  optionText: (t, size) => ({ color: t["popover-foreground"], ...TEXT_SIZE[size] }),
  helper: (t) => ({ marginTop: 6, fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  disabledOpacity: 0.38, // M3 disabled opacity
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: t.accent, borderless: false }),
  // Android (Material 3): the IN-CONTAINER FLOATING label, identical geometry to
  // the M3 Input. At rest it sits vertically centered like the field's placeholder
  // (body-large per size); once the list is open OR a value fills the field it
  // floats to the top, shrinking to body-small (12sp). The shell reserves
  // `labelReserve` of top padding so the value clears the floated label, and drives
  // translateY + scale on the transform driver (`labelFloated`'s fontSize supplies
  // the scale ratio only — the label is rendered at `labelRest` and scaled, never
  // re-sized). M3 body tracking: body-large 0.5, body-medium 0.25, body-small 0.4.
  floatingLabel: true,
  labelRest: (_t, size) => {
    if (size === "large") return { fontSize: 18, lineHeight: 26, letterSpacing: 0.5 };
    if (size === "small") return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 };
    return { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 };
  },
  labelFloated: (_t, _size) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4 }),
  labelReserve: (size) => ({ paddingTop: size === "large" ? 26 : size === "small" ? 20 : 24 }),
};
