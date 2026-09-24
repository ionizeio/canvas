import { destructiveText } from "../../style/destructive-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha } from "../../style/index.js";
import { MENU_ICON, MENU_OFFSET, MENU_ROW_GAP, menuDetail, menuPanel, menuRow, menuRowHover, menuRowLabel, menuRowPressed, menuSection, menuSeparator } from "../../style/menu-look.js";
import { typeScale } from "../../style/type-scale.js";

// Co-located Dropdown skins, one per platform, all driven by the theme tokens (passed
// in from useTheme so they follow the palette and the scheme). Under glass the shell
// asks AnchoredOverlay for the DENSE layer, so the menu reads as the densest material
// and its rows stay legible; in solid mode each skin paints its own card. Menus exist
// on both platforms, so iOS and Android keep their own shapes in the theme's colours
// (the design language's item 3), and the web takes Dark Factory's menu:
//   iOS (iOS 26 / Liquid Glass pull-down menu): a very rounded panel (26 radius,
//     `popover` fill, no border, soft shadow), rows about 44pt tall with 17pt labels,
//     hairline `border` separators between groups, destructive rows in
//     `destructive-text`; a pressed row tints with a `secondary` highlight (no ripple)
//     at pressedOpacity 0.8; a disabled row dims to 0.4.
//   Android (Material 3 menu): an elevated surface (4 radius, `popover`, shadow md,
//     paddingVertical 8), rows about 48dp tall with 14sp labels and a leading icon
//     gutter, an android_ripple (alpha(primary, 0.12) state layer) on rows, no
//     separators; a disabled row dims to 0.38.
//   Web: Dark Factory's menu (src/style/menu-look.ts): the `popover` card at the menu
//     corner with an 8px inset, its popover shadow and hairline, 33px rows 2px apart at
//     an 8px corner with 12.5 / 700 labels, the instant `hover` wash, the eyebrow section
//     heading, the caption shortcut, and a disabled row in the muted ink rather than a dim.

// The contract a platform skin fulfills. The shell renders the wrapper, the
// trigger, the optional backdrop, the menu card, the optional section label, the
// per-group separators, and the item rows; the skin maps the active platform's
// shape/fill/sizing/feedback onto each piece.
export interface DropdownSkin {
  /** The floating menu card: shape, fill, border (or lack of), shadow, padding.
   *  The shell supplies the measured minWidth inline. */
  menuCard: (t: ColorTokens) => ViewStyle;
  /** Muted section heading rendered above the rows. */
  menuLabel: (t: ColorTokens) => TextStyle;
  /** The identity header block (title over description) rendered ABOVE both the
   *  section label and the rows, when `title`/`description` are passed. Its
   *  gutter matches `menuLabel`'s, so the header, the label, and the row labels
   *  share one start column. iOS and Android set it at 14/20 over 12/16; the web
   *  in Dark Factory's row label over its caption. */
  menuHeader: ViewStyle;
  /** The header's title line, in the popover foreground. */
  menuHeaderTitle: (t: ColorTokens) => TextStyle;
  /** The header's muted second line under the title. */
  menuHeaderDescription: (t: ColorTokens) => TextStyle;
  /** A hairline separator above a row that starts a new group. iOS/web draw one;
   *  Android (M3) returns null (no dividers). */
  separator: ((t: ColorTokens) => ViewStyle) | null;
  /** An item row layout (the flex-row + gap + radius + padding box). */
  itemRow: ViewStyle;
  /** The fill applied to a pressed row (iOS/web tint here; Android uses a
   *  ripple, so this is null). */
  itemPressed: ((t: ColorTokens) => ViewStyle) | null;
  /** The instant look of a resting row under the pointer (the web's wash); null where there is none. */
  itemHover: ((t: ColorTokens) => ViewStyle) | null;
  /** The space between rows. */
  rowGap: number;
  /** Item label type scale. */
  itemTextType: TextStyle;
  /** Leading Canvas icon size (px), sized to sit with the label per platform. */
  iconSize: number;
  /** Item label color; branches on `destructive`. Icons retain their graphic role. */
  itemTextColor: (t: ColorTokens, dark: boolean, destructive: boolean) => TextStyle;
  /** Trailing keyboard shortcut, right-aligned and muted. */
  shortcut: (t: ColorTokens) => TextStyle;
  /** Standoff between the trigger and the menu card, in px. Skin-owned rather than
   *  caller-owned: a menu built for a taller trigger stands off further (the
   *  hand-off's account pill uses 6 where a plain dropdown uses 4), and a spacing
   *  prop on a public component would be the re-spacing escape hatch. */
  menuGap: number;
  /** The dim on a disabled custom trigger (the caller's own node, so a dim is all the shell can do). */
  disabledOpacity: number;
  /** A disabled row: the dim it takes, and whether its label and icon go to the muted ink instead. */
  disabledRow: { opacity: number; muted: boolean };
  /** iOS/web dim a row on press via this; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- wrapper + trigger (identical across platforms) -------------------------

// relative anchors the menu; the shell appends `useHugStyle()` (src/style/sizing.ts)
// so the trigger keeps its content width inside a stretching Column without a
// static alignSelf pinning it to the top of a centered Row.
export const wrapper: ViewStyle = { position: "relative" };

// When the menu is open, the wrapper is lifted into its own stacking context
// above sibling content. react-native-web gives every positioned View an
// implicit stacking context, so the menu's own `zIndex` is scoped INSIDE the
// `relative` wrapper and cannot rise above a later sibling. Raising the wrapper's
// zIndex while open lifts the whole control — trigger and menu together — above
// everything painted after it.
export const wrapperLifted: ViewStyle = { zIndex: 50 };

// The custom-trigger Pressable: keeps the chip from stretching.
export const customTrigger: ViewStyle = { alignSelf: "flex-start" };

// ---------- Web: Dark Factory's menu (src/style/menu-look.ts) ----------
export const webSkin: DropdownSkin = {
  menuCard: menuPanel,
  menuLabel: menuSection,
  // The header shares the row gutter (10), so the identity block, the eyebrow and the row
  // labels start on one column.
  menuHeader: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6, gap: 2 },
  menuHeaderTitle: (t) => ({ ...menuRowLabel, color: t["popover-foreground"] }),
  menuHeaderDescription: (t) => ({ ...typeScale.caption, color: t["muted-foreground"] }),
  separator: menuSeparator,
  itemRow: menuRow,
  itemPressed: menuRowPressed,
  itemHover: menuRowHover,
  rowGap: MENU_ROW_GAP,
  itemTextType: menuRowLabel,
  iconSize: MENU_ICON,
  itemTextColor: (t, _dark, destructive) => {
    if (destructive) return { color: destructiveText(t) };
    return { color: t["popover-foreground"] };
  },
  shortcut: menuDetail,
  menuGap: MENU_OFFSET,
  disabledOpacity: 0.5, // the hand-off's --p-disabled on web
  disabledRow: { opacity: 1, muted: true },
  pressedOpacity: null, // web tints the row fill on press, no opacity dim
  ripple: null,
};

// ---------- iOS 26 (Liquid Glass pull-down menu): VERY rounded popover, no border, hairline groups ----------
// Apple's iOS 26 pull-down/context menu: a very rounded popover panel (~26pt
// continuous radius, matching Apple's Liquid Glass pull-down kit render) over the `popover` fill
// with NO visible border and a soft shadow; rows ~44pt tall with ~17pt labels,
// full-bleed hairline `border` separators between groups, a destructive row in
// `destructive-text` labels and destructive icons, section titles in `muted-foreground`,
// and an optional trailing SF-style icon (e.g. a submenu chevron). A pressed row
// tints with a subtle `secondary` highlight (no ripple) at pressedOpacity 0.8.
// iOS 26 menus are markedly rounder than legacy (~13pt) menus; the larger radius
// is the headline shape change.
const IOS_RADIUS = 26;
export const iosSkin: DropdownSkin = {
  menuCard: (t) => ({
    borderRadius: IOS_RADIUS,
    backgroundColor: t.popover,
    paddingVertical: 6,
    // Clip the pressed-row highlight and full-bleed separators to the heavily
    // rounded panel so they don't poke past the ~26pt corners. iOS still draws
    // the soft shadow outside these bounds.
    overflow: "hidden",
    ...shadow("lg", t),
  }),
  menuLabel: (t) => ({
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: t["muted-foreground"],
  }),
  // Header gutter = the iOS menu-label gutter (16 x 6): the identity block sits
  // on the same 16pt start column as every row label.
  menuHeader: { paddingHorizontal: 16, paddingVertical: 6, gap: 2 },
  menuHeaderTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["popover-foreground"] }),
  menuHeaderDescription: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  // Hairline group separators run full-bleed across the panel (iOS 26 groups
  // rows with a thin divider).
  separator: (t) => ({ marginTop: 6, marginBottom: 6, height: 1, backgroundColor: t.border }),
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
  },
  // Subtle highlight under a pressed row (no ripple on iOS).
  itemPressed: (t) => ({ backgroundColor: t.secondary }),
  itemTextType: { fontSize: 17, lineHeight: 22 },
  iconSize: 20,
  itemTextColor: (t, _dark, destructive) => {
    if (destructive) return { color: destructiveText(t) };
    return { color: t["popover-foreground"] };
  },
  shortcut: (t) => ({
    marginStart: "auto",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.5,
    color: t["muted-foreground"],
  }),
  // The hand-off dims a disabled iOS control to 0.4 (--p-disabled under
  // [data-platform="ios"]), not the 0.5 web and the legacy UIKit convention use.
  menuGap: 4,
  itemHover: null,
  rowGap: 0,
  disabledOpacity: 0.4,
  disabledRow: { opacity: 0.4, muted: false },
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 menu): elevated surface, ripple rows, no dividers ----------
// M3 dropdown menu: an ELEVATED surface (4dp radius, `popover` fill, soft shadow,
// 8dp vertical padding); rows ~48dp tall with 14sp labels and a leading icon
// gutter, an android_ripple (alpha(primary, 0.12) state layer) on each row, and
// NO separators (M3 menus group with spacing, not dividers).
const ANDROID_RADIUS = 4;
export const androidSkin: DropdownSkin = {
  menuCard: (t) => ({
    borderRadius: ANDROID_RADIUS,
    backgroundColor: t.popover,
    paddingVertical: 8,
    ...shadow("md", t),
  }),
  menuLabel: (t) => ({
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: t["muted-foreground"],
  }),
  // Header gutter = the M3 menu-label gutter (16 x 8).
  menuHeader: { paddingHorizontal: 16, paddingVertical: 8, gap: 2 },
  menuHeaderTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["popover-foreground"] }),
  menuHeaderDescription: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  // M3 menus use no dividers between items, so the identity header is separated
  // by its own padding rather than a rule (the hand-off collapses the M3
  // separator to 0 height for the same reason).
  separator: null,
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    minHeight: 48,
  },
  // Android uses the ripple, so no static pressed fill.
  itemPressed: null,
  itemTextType: { fontSize: 14, lineHeight: 20 },
  iconSize: 20,
  itemTextColor: (t, _dark, destructive) => {
    if (destructive) return { color: destructiveText(t) };
    return { color: t["popover-foreground"] };
  },
  shortcut: (t) => ({
    marginStart: "auto",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: t["muted-foreground"],
  }),
  menuGap: 4,
  itemHover: null,
  rowGap: 0,
  disabledOpacity: 0.38, // M3 disabled opacity, the hand-off's --p-disabled on Android
  disabledRow: { opacity: 0.38, muted: false },
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
};
