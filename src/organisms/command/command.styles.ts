import { Platform, type ViewStyle, type TextStyle } from "react-native";
import { activeIndicator, platformMinTarget, shape, surfaceRipple, type ColorTokens, type TouchTargetSkin } from "../../style/index.js";
import { FIELD_HEIGHT, FIELD_ICON, FIELD_ICON_GAP, FIELD_INSET, fieldFrame, fieldValue } from "../../style/field-look.js";
import {
  MENU_ICON,
  MENU_OFFSET,
  MENU_ROW_GAP,
  menuPanel,
  menuRow,
  menuRowLabel,
  menuRowPressed,
  menuSection,
} from "../../style/menu-look.js";

// The Command skin: one look on every platform. Neither iOS nor Material 3 ships a command
// palette (PLATFORM-REFERENCES.md), and Dark Factory has none either, so all three platforms
// take one palette built from Dark Factory's own parts (the design language's item 3):
//   - the palette is Dark Factory's menu panel (src/style/menu-look.ts: the `popover` card,
//     its hairline, the popover shadow and the 8px inset) at the dialog corner (18), a
//     large floating surface, 420 wide and never wider than its parent;
//   - the search row is Dark Factory's SearchField: a 15px search Icon 10 from the text, the
//     field's 13 / 600 value, no frame of its own inside the panel, and the kit's focus rule
//     under it: a `border` hairline that turns `ring` and thickens while the search holds
//     focus (the field's own focus indicator, which Dark Factory does not draw);
//   - the results are the menu's rows: an 8px corner, 8 x 10 padding, 14px icons and the
//     12.5 / 700 label, 2px apart, 33 tall with or without a shortcut (its Kbd cap centres
//     on the label's line); the row the keyboard or the pointer has made active takes the
//     menu's pressed fill, and a group's heading is the menu's eyebrow section;
//   - the footer is Dark Factory's MenuNote: a hairline over a muted 11 / 500 note, here the
//     key hints beside their Kbd caps;
//   - the collapsed trigger is Dark Factory's field frame (src/style/field-look.ts: the
//     `field-fill` well at the 10px corner, the resting `field-border` line turning `ring`
//     while the palette is open, 40 tall with a 12px inset) holding the search Icon and
//     the SearchField's tracked uppercase placeholder, at full `muted-foreground` (Dark
//     Factory's 0.9 opacity reads 3.60:1 on its shell) before the shortcut's Kbd.
// Touch: on an iPhone and on Android the rows, the search row and the trigger grow to the
// 44pt / 48dp minimum (platformMinTarget, read once when the module loads; the web keeps
// Dark Factory's 33px rows). The press feedback stays each platform's own: Android's rows
// ripple, and the others take the menu's pressed fill.

/** The palette's width: a bounds provider for its own rows, capped by its parent. */
export const CARD_WIDTH = 420;

/** The search row's vertical inset: Dark Factory's SearchField text padding. */
const SEARCH_INSET_Y = 8;

// Dark Factory's SearchField placeholder: tracked caps (0.16em) at 10.5 / 700, at 1.5 lines.
const SEARCH_PLACEHOLDER: TextStyle = { fontSize: 10.5, lineHeight: 16, fontWeight: "700", letterSpacing: 1.68, textTransform: "uppercase" };

// Dark Factory's MenuNote type: 11 / 500 at 1.45 lines.
const NOTE_TEXT: TextStyle = { fontSize: 11, lineHeight: 16, fontWeight: "500" };

// The contract the skin fulfills. The shell owns the structure (the palette surface, the
// search input, the grouped rows, the footer, the trigger and its material) and the open,
// query and active-row state; the skin maps tokens and state to style objects.
export interface CommandSkin extends TouchTargetSkin {
  /** The trigger is a field, so under web glass it is the clear text-entry well. */
  liquid: boolean;
  /** The palette card: shape, fill, hairline, shadow, inset and width. */
  panel: (t: ColorTokens) => ViewStyle;
  /** The standoff between the trigger and the palette. */
  panelGap: number;
  /**
   * The search row: gap, padding, and the rule under it, which turns `ring` and thickens
   * while the search field holds focus (the field's keyboard focus indicator; the field
   * suppresses the browser ring for it).
   */
  searchRow: (t: ColorTokens, focused: boolean) => ViewStyle;
  /** The leading search Icon's size (px), tinted `muted-foreground`. */
  searchGlyphSize: number;
  /** The search input's typed value. */
  searchText: (t: ColorTokens) => TextStyle;
  /** The search input's placeholder colour. */
  searchPlaceholder: (t: ColorTokens) => string;
  /** A group's heading above its rows. */
  groupHeading: (t: ColorTokens) => TextStyle;
  /** The space between rows. */
  rowGap: number;
  /** A result row's layout (gap, corner, padding, minimum height). */
  row: ViewStyle;
  /** The active row's fill: the row the keyboard or the pointer has made active. */
  rowActive: (t: ColorTokens) => ViewStyle;
  /** A pressed row's fill; null where the ripple carries the press (Android). */
  rowPressed: ((t: ColorTokens) => ViewStyle) | null;
  /** A row's leading Icon size (px). */
  iconSize: number;
  /** A row's label (takes the remaining width). */
  rowLabel: (t: ColorTokens) => TextStyle;
  /**
   * The box a row's trailing shortcut Kbd sits in: the label's line, so the 20px cap centres
   * on it and a row with a shortcut is as tall as one without.
   */
  rowShortcut: ViewStyle;
  /** The "No results" row, where a row would sit. */
  emptyRow: ViewStyle;
  emptyText: (t: ColorTokens) => TextStyle;
  /** The footer: the hairline note row under the list. */
  footer: (t: ColorTokens) => ViewStyle;
  /** One hint cluster in the footer (its Kbd caps and its text). */
  footerHint: ViewStyle;
  footerText: (t: ColorTokens) => TextStyle;
  /** The collapsed trigger: the field frame, its ring while the palette is open. */
  trigger: (t: ColorTokens, open: boolean) => ViewStyle;
  /** The trigger's search Icon size (px), tinted `muted-foreground`. */
  triggerGlyphSize: number;
  /** The trigger's placeholder label. */
  triggerLabel: (t: ColorTokens) => TextStyle;
  /** Android's ripple over a pressed row; null elsewhere. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

/**
 * What the platforms sharing this skin differ by, read for the running platform when the
 * module loads, as platformMinTarget is. A parameter so the tests can build the skin an
 * iPhone or an Android phone runs in the web harness.
 */
export interface SharedSkinPlatform {
  /** The touch minimum: iOS's 44, Android's 48, none on the web. Rows, the search row and the trigger grow to it. */
  minTarget: number | null;
  /** Android's ripple over a pressed row; null where the row's pressed fill is the feedback. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

/** The one Command skin, for a platform's touch minimum and press feedback. */
export function sharedSkin({ minTarget, ripple }: SharedSkinPlatform): CommandSkin {
  const grow: ViewStyle = minTarget == null ? {} : { minHeight: minTarget };
  return {
    liquid: true,
    panel: (t) => ({
      width: CARD_WIDTH,
      maxWidth: "100%",
      ...menuPanel(t),
      borderRadius: shape.web.dialog,
      overflow: "hidden",
    }),
    panelGap: MENU_OFFSET,
    searchRow: (t, focused) => ({
      flexDirection: "row",
      alignItems: "center",
      gap: FIELD_ICON_GAP,
      paddingHorizontal: menuRow.paddingHorizontal,
      paddingTop: SEARCH_INSET_Y,
      ...activeIndicator({ active: focused, restColor: t.border, activeColor: t.ring, gap: SEARCH_INSET_Y }),
      marginBottom: 4,
      ...grow,
    }),
    searchGlyphSize: FIELD_ICON,
    searchText: (t) => ({ ...fieldValue("base"), color: t.foreground }),
    searchPlaceholder: (t) => t["muted-foreground"],
    groupHeading: menuSection,
    rowGap: MENU_ROW_GAP,
    row: { ...menuRow, ...grow },
    rowActive: menuRowPressed,
    rowPressed: ripple == null ? menuRowPressed : null,
    iconSize: MENU_ICON,
    rowLabel: (t) => ({ ...menuRowLabel, color: t["popover-foreground"], flexGrow: 1, flexShrink: 1, flexBasis: "0%" }),
    rowShortcut: { height: menuRowLabel.lineHeight, justifyContent: "center" },
    emptyRow: { paddingHorizontal: menuRow.paddingHorizontal, paddingVertical: menuRow.paddingVertical },
    emptyText: (t) => ({ ...menuRowLabel, color: t["muted-foreground"] }),
    footer: (t) => ({
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: 12,
      rowGap: 4,
      borderTopWidth: 1,
      borderTopColor: t.border,
      marginTop: 4,
      paddingTop: 8,
      paddingHorizontal: menuRow.paddingHorizontal,
      paddingBottom: 6,
    }),
    footerHint: { flexDirection: "row", alignItems: "center", gap: 4 },
    footerText: (t) => ({ ...NOTE_TEXT, color: t["muted-foreground"] }),
    trigger: (t, open) => ({
      flexDirection: "row",
      alignItems: "center",
      gap: FIELD_ICON_GAP,
      width: "100%",
      height: Math.max(FIELD_HEIGHT.base, minTarget ?? 0),
      paddingHorizontal: FIELD_INSET,
      ...fieldFrame(t, { focused: open, error: false }),
    }),
    triggerGlyphSize: FIELD_ICON,
    triggerLabel: (t) => ({ ...SEARCH_PLACEHOLDER, color: t["muted-foreground"], flexShrink: 1 }),
    ripple,
    minTarget,
  };
}

export const webSkin: CommandSkin = sharedSkin({
  minTarget: platformMinTarget(),
  ripple: Platform.OS === "android" ? surfaceRipple : null,
});

// No platform ships a command palette, so iOS and Android take the web's (the design
// language's item 3).
export const iosSkin: CommandSkin = webSkin;
export const androidSkin: CommandSkin = webSkin;

// ---------- structure (shared across platforms) ----------

// In trigger mode with no overlay host, the card floats below the trigger inline.
export function cardFloating(gap: number): ViewStyle {
  return { position: "absolute", top: "100%", start: 0, zIndex: 50, marginTop: gap };
}

// The wrapper around the collapsed trigger and the floating card.
export const triggerWrapper: ViewStyle = { position: "relative", width: "100%" };

// When the palette is open in trigger mode, the wrapper is lifted into its own
// stacking context above sibling content. react-native-web gives every
// positioned View an implicit stacking context, so the floating card's own
// `zIndex` is scoped INSIDE the `relative` wrapper and cannot rise above a later
// sibling. Raising the wrapper's zIndex while open lifts the whole control (trigger
// and palette together) above everything painted after it.
export const triggerWrapperLifted: ViewStyle = { zIndex: 50 };

// Pushes the trailing Kbd cap to the trigger's end.
export const triggerKbd: ViewStyle = { marginStart: "auto" };
