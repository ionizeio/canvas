import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, FOCUS_RESET, activeIndicator, shape, type FloatingLabelStyles } from "../../style/index.js";

// Co-located Input skins, one per platform. The BRAND survives on every platform
// (the cursor/selection is always the sky `primary`, the focus accent is the
// `ring`, never a platform default), and only the native SHAPE, sizing, fill,
// border treatment, and press feedback change per OS:
//   iOS (HIG, iOS 26+/Liquid Glass): a PLAIN text field — the value text sits on
//     a TRANSPARENT surface with a single bottom HAIRLINE rule (1pt `border`
//     separator) and NO fill, NO surrounding box, NO rounded capsule. Focus
//     thickens/tints the hairline to the brand (`ring`), error to `destructive`;
//     press (action suffix) = opacity dim (~0.8). The cursor/selection stays the
//     indigo `primary`.
//   Android (Material 3 filled): a subtle fill (`muted`), TOP corners ~4 radius
//     and a flat bottom, a bottom active-indicator underline (1dp `border` at
//     rest -> 2dp `ring` on focus, `destructive` on error), ~56dp tall; the
//     action suffix uses android_ripple; disabled opacity 0.38.
//   Web: the Riskora dashboard field — a white (`card`) box with the 12px control
//     corner and a full 1px border (error > focus > input), 48 tall at the base
//     size (40 small, 56 large), 16px inset, opacity 0.5 disabled, action press
//     opacity 0.9. The resting border stays the 3:1 `input` boundary rather than the
//     source's 1.5:1 hairline (WCAG 1.4.11; see src/style/tokens.ts).

export type Size = "small" | "base" | "large";

// The contract a platform skin fulfills. Both layouts (bare field, grouped addon
// row) and the size/state inputs the shell resolves are passed in; the skin maps
// them to RN style objects. `borderColor` is a token key (error > focus > input)
// the shell already resolved; the skin reads tokens[borderColor].
export interface InputSkin extends FloatingLabelStyles<Size> {
  /** Type scale per size; the field and its addons share it so they line up. */
  text: (t: ColorTokens, size: Size) => TextStyle;
  /** Height of the single-line bare field. */
  bareBox: (size: Size) => TextStyle;
  /** Total (border-box) height of the grouped layout, matching the bare field.
   *  The shell enforces it as minHeight on the group container, so the row keeps
   *  its height even when no addon box is present (icon-only groups). */
  groupedHeight: (size: Size) => number;
  /** The bare field surface: shape, fill, border/underline for the active state. */
  bareField: (t: ColorTokens, borderColor: keyof ColorTokens, focused: boolean, error: boolean) => TextStyle;
  /** The grouped (addon) outer: the row that shares one border/underline. */
  groupContainer: (t: ColorTokens, borderColor: keyof ColorTokens, focused: boolean, error: boolean) => ViewStyle;
  /** The inner field inside the group (fills the field area; pads away from icons and
   *  from prefix/suffix affixes so the value hugs an inline affix — see groupField). */
  groupField: (t: ColorTokens, opts: { leadingIcon: boolean; trailingIcon: boolean; hasPrefix: boolean; hasSuffix: boolean }) => TextStyle;
  /** A prefix/suffix addon box. Stretches to the row height (alignItems stretch);
   *  it must not set its own height, or it would re-inflate the container past
   *  groupedHeight by the border/indicator band. */
  addonBox: (t: ColorTokens, side: "left" | "right") => ViewStyle;
  addonText: (t: ColorTokens) => TextStyle;
  actionText: (t: ColorTokens) => TextStyle;
  /** Overlaid icon position inside the field area (left or right gutter). The shell
   *  anchors it to the field-area wrapper — the container's CONTENT box — never to
   *  the bordered container itself: the Android active indicator changes the
   *  container's border/padding band on focus, and an overlay spanning that band
   *  would re-center and visibly shift its icon by half the change. */
  iconOverlay: (side: "left" | "right") => ViewStyle;
  /** Opacity applied to the field when disabled. */
  disabledOpacity: number;
  /** iOS/web dim the action suffix on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the action suffix; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;

  // Label placement (the `label` prop) is contributed by FloatingLabelStyles<Size>:
  // `floatingLabel` (Android true / iOS+web false), `labelAbove` (iOS/web static
  // title), and `labelRest`/`labelFloated`/`labelReserve` (the Android M3 floating
  // label geometry). Shared verbatim with Autocomplete, Select, and Textarea so the
  // four filled-field controls float their label identically.
}

// --- shared type scale (identical across platforms; brand type, not a face) --
function webText(_t: ColorTokens, size: Size): TextStyle {
  if (size === "large") return { fontSize: 16, lineHeight: 24 };
  if (size === "small") return { fontSize: 12, lineHeight: 16 };
  return { fontSize: 14, lineHeight: 20 };
}

// ---------- Web: the Riskora dashboard field ----------
export const webSkin: InputSkin = {
  text: webText,
  bareBox: (size) => ({ height: size === "large" ? 56 : size === "small" ? 40 : 48 }),
  groupedHeight: (size) => (size === "large" ? 56 : size === "small" ? 40 : 48),
  bareField: (t, borderColor) => ({
    width: "100%",
    borderRadius: shape.web.field,
    borderWidth: 1,
    borderColor: t[borderColor],
    backgroundColor: t.card,
    paddingHorizontal: 16,
    paddingVertical: 0,
    color: t.foreground,
  }),
  groupContainer: (t, borderColor) => ({
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderWidth: 1,
    borderColor: t[borderColor],
    borderRadius: shape.web.field,
    overflow: "hidden",
    backgroundColor: t.card,
  }),
  // No vertical padding: the container's minHeight (groupedHeight) owns the row
  // height, the stretched input fills it, and a single line self-centers. Any
  // vertical padding would only inflate the row past the bare field's height.
  groupField: (t, { leadingIcon, trailingIcon }) => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    paddingHorizontal: 16,
    color: t.foreground,
    ...(leadingIcon ? { paddingStart: 44 } : null),
    ...(trailingIcon ? { paddingEnd: 44 } : null),
  }),
  addonBox: (t, side) => ({
    justifyContent: "center",
    backgroundColor: t.muted,
    paddingHorizontal: 16,
    borderColor: t.border,
    ...(side === "left" ? { borderEndWidth: 1 } : { borderStartWidth: 1 }),
  }),
  addonText: (t) => ({ color: t["muted-foreground"] }),
  actionText: (t) => ({ fontWeight: "500", color: t.foreground }),
  iconOverlay: (side) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: "center",
    ...(side === "left" ? { start: 0, paddingStart: 16 } : { end: 0, paddingEnd: 16 }),
  }),
  disabledOpacity: 0.5,
  pressedOpacity: 0.9,
  ripple: null,
  // The label sits ABOVE the field (Riskora's form rows: a 14/20 medium title over
  // the box), which is the visual the Field/Form composers render.
  floatingLabel: false,
  labelAbove: (t, size) => ({
    fontSize: size === "large" ? 16 : size === "small" ? 12 : 14,
    lineHeight: size === "large" ? 24 : size === "small" ? 16 : 20,
    fontWeight: "500",
    color: t.foreground,
  }),
};

// ---------- iOS (HIG): .roundedBorder filled field ----------
// The iOS text field reads as SwiftUI's `.roundedBorder`: the value text sits in a
// subtly filled, rounded rectangle (continuous corners) with a 1pt border that
// resolves error > focus(`ring`) > `input`. It is a full border box, never a bottom
// underline, so the field reads as a native iOS field rather than the Material
// filled/underlined one. The cursor/selection is always the indigo `primary` (set in
// the shell); focus tints the whole border to the brand `ring`.

// react-native-web paints a default focus outline (a bright-blue rectangle) and a
// browser-default caret on the field. These web-only style props suppress that outline
// (the skin draws its own border) and pin the caret to the brand `primary`, matching
// `selectionColor`. They are no-ops on real iOS, which has no CSS outline.
// `caretColor`/`cursorColor`/`outlineStyle`/`outlineWidth` are not in RN's TextStyle,
// hence the cast (as in the shell's FIELD_OUTLINE_RESET).
function iosWebFieldReset(t: ColorTokens): TextStyle {
  return {
    ...FOCUS_RESET, // shared outline-ring suppression (outlineStyle/outlineWidth)
    caretColor: t.primary, // brand indigo caret (RN Web), matching selectionColor
    cursorColor: t.primary, // brand indigo caret (RN Android prop, harmless on iOS)
  } as unknown as TextStyle;
}

export const iosSkin: InputSkin = {
  text: webText,
  bareBox: (size) => ({ height: size === "large" ? 50 : size === "small" ? 36 : 44 }),
  groupedHeight: (size) => (size === "large" ? 50 : size === "small" ? 36 : 44),
  // Filled rounded rect, continuous corners; the border carries the shell-resolved
  // state color (error > focus(ring) > input).
  bareField: (t, borderColor) => ({
    width: "100%",
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: t[borderColor],
    backgroundColor: t.secondary,
    ...iosWebFieldReset(t),
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: t.foreground,
  }),
  // The grouped (addon) row shares one rounded border box; joined edges are clipped.
  groupContainer: (t, borderColor) => ({
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: t[borderColor],
    overflow: "hidden",
    backgroundColor: t.secondary,
  }),
  // No vertical padding (see webSkin.groupField): minHeight + stretch own the
  // row height and the single-line value self-centers.
  groupField: (t, { leadingIcon, trailingIcon, hasPrefix, hasSuffix }) => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    color: t.foreground,
    // Brand caret + outline suppression on the inner grouped field too.
    ...iosWebFieldReset(t),
    // 12pt content inset per side, EXCEPT where an inline prefix/suffix affix already
    // supplies that inset plus a tight gap (then the value hugs the affix); an overlaid
    // icon uses a wider gutter.
    paddingStart: leadingIcon ? 36 : hasPrefix ? 0 : 12,
    paddingEnd: trailingIcon ? 36 : hasSuffix ? 0 : 12,
  }),
  // Prefix/suffix is inline affix text inside the rounded box: no separate fill, no
  // divider. The affix owns the 12pt box inset and keeps an 8pt gap to the value; the
  // field zeroes its padding on that side (see groupField).
  addonBox: (_t, side) => ({
    justifyContent: "center",
    ...(side === "left" ? { paddingStart: 12, paddingEnd: 8 } : { paddingStart: 8, paddingEnd: 12 }),
  }),
  addonText: (t) => ({ color: t["muted-foreground"] }),
  actionText: (t) => ({ fontWeight: "600", color: primaryText(t) }),
  iconOverlay: (side) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: "center",
    ...(side === "left" ? { start: 0, paddingStart: 12 } : { end: 0, paddingEnd: 12 }),
  }),
  disabledOpacity: 0.5,
  pressedOpacity: 0.8,
  ripple: null,
  // iOS (HIG): the label sits ABOVE the field, as a form-row title. SF Pro Text
  // tracking (letterSpacing -0.15 at 14pt, Apple's SF tracking table) and a
  // semibold (600) weight, the iOS field-label convention.
  floatingLabel: false,
  labelAbove: (t, size) => ({
    fontSize: size === "large" ? 16 : size === "small" ? 12 : 14,
    lineHeight: size === "large" ? 24 : size === "small" ? 16 : 20,
    fontWeight: "600",
    letterSpacing: -0.15,
    color: t.foreground,
  }),
};

// ---------- Android (Material 3 filled): subtle fill, top radius, bottom active indicator ----------
// M3 filled text field: a ~56dp container with a subtle fill (`muted` ~
// surface-container-highest), the TOP corners rounded ~4dp and a flat bottom,
// and a bottom active-indicator underline — 1dp `border` at rest, 2dp `ring`
// (brand) on focus, `destructive` on error. The brand survives via the focused
// indicator color and the action suffix's primary label + ripple.
const ANDROID_TOP_RADIUS = 4;
// M3 active indicator: a VISIBLE baseline at rest (on-surface-variant ~ `muted-foreground`,
// so the filled field stays distinct from the iOS lineless capsule), thickening to 2dp in the
// shell-resolved brand color (ring on focus / destructive on error) when active. `gap` is the
// padding kept below the content so the thickening reserves a constant band (see activeIndicator).
function androidUnderline(t: ColorTokens, borderColor: keyof ColorTokens, focused: boolean, error: boolean, gap: number): ViewStyle {
  return activeIndicator({ active: focused || error, restColor: t["muted-foreground"], activeColor: t[borderColor] ?? t.ring, gap });
}
export const androidSkin: InputSkin = {
  // M3 body input is 16sp; nudge the base/large up, keep small readable.
  text: (_t, size) => {
    if (size === "large") return { fontSize: 18, lineHeight: 26 };
    if (size === "small") return { fontSize: 14, lineHeight: 20 };
    return { fontSize: 16, lineHeight: 24 };
  },
  bareBox: (size) => ({ height: size === "large" ? 60 : size === "small" ? 48 : 56 }),
  groupedHeight: (size) => (size === "large" ? 60 : size === "small" ? 48 : 56),
  bareField: (t, borderColor, focused, error) => ({
    width: "100%",
    borderTopStartRadius: ANDROID_TOP_RADIUS,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
    // The bottom indicator + its no-reflow padding (gap 8 keeps it balanced with paddingTop).
    ...androidUnderline(t, borderColor, focused, error, 8),
    backgroundColor: t.muted,
    paddingHorizontal: 16,
    paddingTop: 8,
    color: t.foreground,
  }),
  groupContainer: (t, borderColor, focused, error) => ({
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderTopStartRadius: ANDROID_TOP_RADIUS,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    // The shared bottom indicator + its no-reflow padding (gap 0).
    ...androidUnderline(t, borderColor, focused, error, 0),
    overflow: "hidden",
    backgroundColor: t.muted,
  }),
  // No vertical padding (see webSkin.groupField): minHeight + stretch own the
  // row height and the single-line value self-centers.
  groupField: (t, { leadingIcon, trailingIcon, hasPrefix, hasSuffix }) => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    color: t.foreground,
    // Content inset is 16dp per side, EXCEPT when a prefix/suffix affix already
    // supplies that inset plus a tight gap: there the field drops its padding so
    // the value hugs the affix (M3 inline prefix/suffix text, not a padded box).
    // An overlaid icon uses a 44dp gutter instead.
    paddingStart: leadingIcon ? 44 : hasPrefix ? 0 : 16,
    paddingEnd: trailingIcon ? 44 : hasSuffix ? 0 : 16,
  }),
  // M3 prefix/suffix is inline affix text inside the filled container: it shares
  // the field surface (no separate fill, no divider) and the value follows it
  // directly. The affix owns the 16dp container inset and keeps an 8dp gap to the
  // value; the field zeroes its padding on that side (see groupField).
  addonBox: (_t, side) => ({
    justifyContent: "center",
    ...(side === "left" ? { paddingStart: 16, paddingEnd: 8 } : { paddingStart: 8, paddingEnd: 16 }),
  }),
  addonText: (t) => ({ color: t["muted-foreground"] }),
  actionText: (t) => ({ fontWeight: "500", color: primaryText(t), textTransform: "uppercase", letterSpacing: 0.5 }),
  iconOverlay: (side) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: "center",
    ...(side === "left" ? { start: 0, paddingStart: 16 } : { end: 0, paddingEnd: 16 }),
  }),
  disabledOpacity: 0.38, // M3 disabled opacity
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: t.primary, borderless: false }),
  // Android (Material 3): the IN-CONTAINER FLOATING label. At rest it sits
  // vertically centered like a placeholder (body-large, matching the field text
  // per size); when the field is focused OR populated it floats to the top,
  // shrinking to body-small (12sp). The shell renders the label at `labelRest`
  // and drives translateY + scale on the transform driver; `labelFloated`'s
  // fontSize only supplies the scale ratio (12 / restFontSize). `labelReserve`
  // is the constant top padding the value field gives up so the floated label
  // clears the value. M3 body tracking: body-large 0.5, body-medium 0.25,
  // body-small 0.4.
  floatingLabel: true,
  labelRest: (_t, size) => {
    if (size === "large") return { fontSize: 18, lineHeight: 26, letterSpacing: 0.5 };
    if (size === "small") return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 };
    return { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 };
  },
  labelFloated: (_t, _size) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4 }),
  labelReserve: (size) => ({ paddingTop: size === "large" ? 26 : size === "small" ? 20 : 24 }),
};
