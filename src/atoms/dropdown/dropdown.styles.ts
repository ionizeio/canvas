import { destructiveText } from "../../style/destructive-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha, shape } from "../../style/index.js";

// Co-located Dropdown skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). The menu card paints the
// `popover` fill on an OPAQUE surface in every theming mode: the shell asks
// AnchoredOverlay for its plain surface (`opaque`), so a menu never takes the
// glass material and its rows never have the page reading through them. The BRAND
// survives on every platform (the indigo `primary` press tint on Android, the
// `destructive` red for destructive rows); only the native SHAPE, sizing, fill,
// separators, and press feedback change per OS:
//   iOS (iOS 26 / Liquid Glass pull-down menu): a VERY rounded popover panel
//     (~26 radius, `popover` fill, NO border, soft shadow), rows ~44pt tall with
//     ~17pt labels, hairline `border` separators between groups, a destructive
//     row in `destructive` red, an optional trailing SF-style icon; a pressed row
//     tints with a subtle `secondary` highlight (no ripple) at pressedOpacity 0.8.
//   Android (Material 3 menu): an ELEVATED surface (4 radius, `popover`, shadow
//     md, paddingVertical 8), rows ~48dp tall with 14sp labels and a leading
//     icon gutter, an android_ripple (alpha(primary, 0.12) state layer) on rows,
//     and NO separators.
//   Web: the established Canvas look (the current dropdown, lifted verbatim) — a
//     bordered popover card (6 radius, `border`, `popover` fill, shadow-lg,
//     padding 4), rows with rounded-sm px-2 py-1.5 layout, hairline `border`
//     separators, an `accent` pressed/active fill, and `red-700/red-300`
//     destructive rows.

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
   *  share one start column; the type scale is deliberately the SAME on all
   *  three platforms (the hand-off hard-codes it, there is no per-platform
   *  header token), so only the gutter is a per-OS value. */
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
  /** Item label type scale. */
  itemTextType: TextStyle;
  /** Leading Canvas icon size (px), sized to sit with the label per platform. */
  iconSize: number;
  /** Item label color; branches on `destructive`. Icons retain their graphic role. */
  itemTextColor: (t: ColorTokens, dark: boolean, destructive: boolean) => TextStyle;
  /** Trailing keyboard shortcut, right-aligned and muted. */
  shortcut: (t: ColorTokens) => TextStyle;
  /** Opacity applied to a disabled row. */
  /** Standoff between the trigger and the menu card, in px. Skin-owned rather than
   *  caller-owned: a menu built for a taller trigger stands off further (the
   *  hand-off's account pill uses 6 where a plain dropdown uses 4), and a spacing
   *  prop on a public component would be the re-spacing escape hatch. */
  menuGap: number;
  disabledOpacity: number;
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

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// The current dropdown: a popover card (rounded-md border bg-popover p-1
// shadow-lg) positioned absolutely below the trigger; rows with the
// flex-row items-center gap-2 rounded-sm px-2 py-1.5 layout, hairline
// my-1 h-px bg-border separators, an active:bg-accent pressed fill, and
// text-red-700 dark:text-red-300 destructive rows (red-300 holds 4.5:1 on the Dark Factory
// dark pressed fill, where red-400 fell to 4.3:1).
// The Riskora menu: a card at the menu corner with an 8px inset, 40px rows with a 10px
// corner and a 12px gutter (the Workflow node menu).
export const webSkin: DropdownSkin = {
  menuCard: (t) => ({
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 8,
    ...shadow("lg", t),
  }),
  menuLabel: (t) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: t["muted-foreground"],
  }),
  // Header gutter = the web menu-label gutter (12 x 8), so the identity block
  // starts on the same column as the label and the row text.
  menuHeader: { paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  menuHeaderTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["popover-foreground"] }),
  menuHeaderDescription: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  separator: (t) => ({ marginTop: 6, marginBottom: 6, height: 1, backgroundColor: t.border }),
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemPressed: (t) => ({ backgroundColor: t.accent }),
  itemTextType: { fontSize: 14, lineHeight: 20 },
  iconSize: 16,
  itemTextColor: (t, _dark, destructive) => {
    if (destructive) return { color: destructiveText(t) };
    return { color: t["popover-foreground"] };
  },
  shortcut: (t) => ({
    marginStart: "auto",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    color: t["muted-foreground"],
  }),
  menuGap: 4,
  disabledOpacity: 0.5, // the hand-off's --p-disabled on web
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
  disabledOpacity: 0.4,
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
  disabledOpacity: 0.38, // M3 disabled opacity, the hand-off's --p-disabled on Android
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
};
