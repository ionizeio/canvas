import { Platform, type ViewStyle, type TextStyle } from "react-native";
import { activeIndicator, platformMinTarget, TOUCH_TARGET, type ColorTokens, type FloatingLabelStyles, type TouchTargetSkin } from "../../style/index.js";
import { webHover } from "../../style/hover.js";
import {
  FIELD_HEIGHT,
  FIELD_ICON_GAP,
  FIELD_INSET,
  FIELD_LABEL_GAP,
  fieldDisabled,
  fieldFrame,
  fieldLabel,
  fieldNote,
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

// Co-located Autocomplete skins. An Autocomplete is a searchable single-select: an
// editable field that filters an open option list. Neither iOS nor Material 3 would
// hand a phone this as one control, but Android ships the exposed dropdown menu for the
// job and iOS ships nothing, so (the design language's catalog) the Android skin keeps
// Material 3's shape in the theme's colours and the iOS skin IS the web skin, Dark
// Factory's field and menu:
//   Web and iOS: the field recipe (src/style/field-look.ts): the `field-fill` well at
//     the field corner with the resting `field-border` hairline turning `ring` while the
//     field is active (focused or open), 40 tall at base, a 12px inset and a 13 / 600
//     value, the eyebrow label above, Dark Factory's small helper line under it, its
//     disabled look in place of a dim, and the 14px chevron-down Icon in the muted ink at
//     the field's inset, 10px from the text. The list is Dark Factory's menu
//     (src/style/menu-look.ts): the panel 8 below the field, 33px rows 2px apart with the
//     hover wash (on the web only: native pointer hover waits on the owner), the
//     keyboard's active row on the pressed fill, and the chosen row in the selection
//     violet (its label and a checkmark in the gutter every row keeps) with no fill.
//     Touch: the text input fills the field's height, so a press anywhere in the well
//     is on the text. On iOS the field and the rows grow to the 44pt minimum, the
//     chevron's touch area reaches it through slop that stops at the text, and a press
//     dims the chevron (platformMinTarget, null on the web, where the chevron's 24px
//     box is the target and the list opening is the press's feedback).
//   Android (Material 3 exposed dropdown): a subtle `muted` fill, TOP corners ~4 radius
//     and a flat bottom, a bottom active-indicator underline (1dp `muted-foreground` at
//     rest, 2dp `ring` while active); the menu is a flat-cornered (~4) elevated
//     `popover` sheet, full-width rows ~48dp tall; press = android_ripple.

export type Size = "small" | "default" | "large";

// The contract a platform skin fulfills. The shell resolves the size and the
// open/selected/pressed/muted state and asks the skin to map them to RN style
// objects. The skin owns shape, fill, border/underline, popover elevation, the
// row layout, and the press-feedback channel (iOS/web opacity vs Android ripple).
export interface AutocompleteSkin extends FloatingLabelStyles<Size>, TouchTargetSkin {
  /** The clear text-entry well under web glass. */
  liquid?: boolean;
  /** Type scale per size; the field text and the option rows share it. */
  text: (size: Size) => TextStyle;
  /** Stacked (above-field) label type, used on iOS + web (`floatingLabel: false`).
   *  On Android the label FLOATS inside the field instead (see FloatingLabelStyles:
   *  `floatingLabel`, `labelRest`/`labelFloated`/`labelReserve`). */
  label: (t: ColorTokens, size: Size) => TextStyle;
  /**
   * The editable field surface: shape, fill, and the border/underline of its active
   * state (the field holds focus or its list is open), which is also the field's keyboard
   * focus indicator: the field suppresses the browser's ring for it.
   */
  field: (t: ColorTokens, size: Size, active: boolean) => ViewStyle;
  /** The field's value text (foreground), or muted for the placeholder. */
  fieldText: (t: ColorTokens, size: Size, muted: boolean) => TextStyle;
  /** The trailing disclosure chevron. */
  chevron: (t: ColorTokens, size: Size) => TextStyle;
  /**
   * The size of the kit's chevronDown Icon where the skin draws that (the web's, Dark
   * Factory's 14px chevron) in `chevron`'s colour; null for the text ▾ at `chevron`'s type.
   */
  chevronIcon: number | null;
  /**
   * The disclosure's real layout/touch target, including the field's border band. Where it
   * is smaller than `minTarget` the shell grows its touch area with slop, which stops at the
   * text across the field's `gap`.
   */
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
   * The fill applied to the SELECTED row at rest: Android's `accent` state layer; null on
   * the web, whose chosen row is marked by its label and check alone.
   */
  rowSelected: (t: ColorTokens) => ViewStyle | null;
  /** The fill of a PRESSED row, and of the row the keyboard has made active. */
  rowPressed: (t: ColorTokens) => ViewStyle;
  /** The instant look of a resting row under the pointer (the web's wash); null where there is none. */
  rowHover: ((t: ColorTokens) => ViewStyle) | null;
  /** The chosen row's label over its plain one (the web's selection violet); null leaves it plain. */
  chosenText: ((t: ColorTokens) => TextStyle) | null;
  /** The space between rows. */
  rowGap: number;
  /** The standoff between the field and the list, in px (Dark Factory's 8 on the web). */
  menuGap: number;
  /** The leading check column. */
  check: (t: ColorTokens, size: Size) => TextStyle;
  /** The option label. */
  optionText: (t: ColorTokens, size: Size) => TextStyle;
  /** Helper line below the option list. */
  helper: (t: ColorTokens) => TextStyle;
  /** Opacity applied to the whole control when disabled (1 on a skin that draws `disabledLook`). */
  disabledOpacity: number;
  /**
   * A disabled look drawn in place of the dim (the web's, Dark Factory's field): the field
   * takes `frame`, its value `ink`, and it paints no material. Android omits it and dims.
   */
  disabledLook?: (t: ColorTokens, focused: boolean) => FieldDisabledLook;
  /** The disclosure's dim while pressed (iOS's); null where the ripple (Android) or nothing (the web) is the feedback. */
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

// Android's type scale for the label and the rows, a notch below its field type.
const TEXT_SIZE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 16, lineHeight: 24 },
};

// ---------- Web and iOS: Dark Factory's field and menu ----------
// The field reads the field recipe and the list the menu recipe, so the Autocomplete
// cannot drift from the Input and the Select beside it. Its middle size is the field's base.
const FIELD_SIZE: Record<Size, FieldSize> = { small: "small", default: "base", large: "large" };
// The disclosure: the web's 24px target around the 14px chevron, pulled into the field's
// end inset so the chevron itself sits at the inset, as a Select's does.
const CHEVRON_ICON = 14;
const CHEVRON_BOX = 24;
const CHEVRON_PULL = (CHEVRON_BOX - CHEVRON_ICON) / 2;
// iOS's highlighted state on the disclosure, the dim its own skin took before it shared the web's.
const IOS_PRESSED_OPACITY = 0.8;

/**
 * What the platforms that share this skin differ by (the web, and iOS, which ships no
 * autocomplete control), each read for the running platform when the module loads, as
 * platformMinTarget and platformDisabledDim are. A parameter so the tests can build the
 * skin an iPhone runs in the web harness.
 */
export interface SharedSkinPlatform {
  /** The touch minimum: iOS's 44, none on the web. The field and the rows grow to it. */
  minTarget: number | null;
  /** The disclosure's press dim: iOS's highlighted state, none on the web. */
  pressedOpacity: number | null;
}

/** The web's skin, which iOS takes too, for a platform's touch minimum and press dim. */
export function sharedSkin({ minTarget, pressedOpacity }: SharedSkinPlatform): AutocompleteSkin {
  // The field's height: the recipe's, or the platform minimum where that is taller. The
  // shell stretches the text input to it, so the whole well is the text's target.
  const fieldHeight = (size: Size) => Math.max(FIELD_HEIGHT[FIELD_SIZE[size]], minTarget ?? 0);
  return {
    liquid: true,
    text: (size) => fieldValue(FIELD_SIZE[size]),
    label: (t) => ({ ...fieldLabel(t), marginBottom: FIELD_LABEL_GAP }),
    // Dark Factory's field frame, active while focused or open (the field's own focus
    // indicator), and the 10px glyph gap between the text and the disclosure.
    field: (t, size, active) => ({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: FIELD_ICON_GAP,
      ...fieldFrame(t, { focused: active, error: false }),
      paddingStart: FIELD_INSET,
      paddingEnd: FIELD_INSET - CHEVRON_PULL,
      height: fieldHeight(size),
    }),
    fieldText: (t, size, muted) => ({ ...fieldValue(FIELD_SIZE[size]), color: muted ? t["muted-foreground"] : t.foreground }),
    chevron: (t) => ({ color: t["muted-foreground"] }),
    chevronIcon: CHEVRON_ICON,
    chevronTarget: () => ({
      alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexShrink: 0,
      width: CHEVRON_BOX, minHeight: CHEVRON_BOX,
    }),
    popover: menuListPanel,
    // "No results" sits where a row would, in the muted ink a disabled row takes.
    emptyRow: { paddingHorizontal: menuRow.paddingHorizontal, paddingVertical: menuRow.paddingVertical },
    emptyText: (t) => ({ ...menuRowLabel, color: t["muted-foreground"] }),
    // On iOS a row grows to the 44pt minimum; the web keeps Dark Factory's 33px row.
    row: minTarget == null ? menuRow : { ...menuRow, minHeight: minTarget },
    // Being chosen fills nothing: the label and the checkmark carry it.
    rowSelected: () => null,
    rowPressed: menuRowPressed,
    rowHover: webHover(menuRowHover),
    chosenText: menuChosenLabel,
    rowGap: MENU_ROW_GAP,
    menuGap: MENU_OFFSET,
    check: menuCheck,
    optionText: (t) => ({ ...menuRowLabel, color: t["popover-foreground"] }),
    helper: (t) => ({ ...fieldNote(t, false), marginTop: FIELD_LABEL_GAP }),
    minTarget,
    disabledOpacity: 1,
    disabledLook: fieldDisabled,
    // The rows' pressed and active fills are their feedback; the disclosure dims on iOS.
    pressedOpacity,
    ripple: null,
    // The label sits ABOVE the field: Dark Factory's eyebrow.
    floatingLabel: false,
  };
}

export const webSkin: AutocompleteSkin = sharedSkin({
  minTarget: platformMinTarget(),
  pressedOpacity: Platform.OS === "ios" ? IOS_PRESSED_OPACITY : null,
});

// iOS ships no autocomplete control, so the iOS Autocomplete is the web's (the design
// language's item 3).
export const iosSkin: AutocompleteSkin = webSkin;

// ---------- Android (Material 3 filled): subtle fill, top radius, bottom indicator, elevated menu ----------
// M3 exposed dropdown: the anchor is a filled field (`muted`) with the TOP
// corners rounded ~4dp and a flat bottom, plus a bottom active-indicator
// underline (1dp `muted-foreground` at rest, 2dp `ring` while active). The menu is a
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
  field: (t, size, active) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopStartRadius: ANDROID_TOP_RADIUS,
    borderTopEndRadius: ANDROID_TOP_RADIUS,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
    // M3 active indicator: a clear muted rest baseline thickening to the brand `ring`
    // while active. activeIndicator keeps the content-box height fixed across the change.
    ...activeIndicator({ active, restColor: t["muted-foreground"], activeColor: t.ring }),
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
  chevronIcon: null,
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
  rowHover: null,
  chosenText: null,
  rowGap: 0,
  menuGap: 4,
  check: (t, size) => ({ width: 16, color: t.primary, ...TEXT_SIZE[size] }),
  optionText: (t, size) => ({ color: t["popover-foreground"], ...TEXT_SIZE[size] }),
  helper: (t) => ({ marginTop: 6, fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  // The field and its 48dp disclosure and rows already meet Material 3's minimum.
  minTarget: TOUCH_TARGET.android,
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
