import { type ViewStyle, type TextStyle } from "react-native";
import { destructiveText } from "../../style/destructive-text.js";
import { shadow, alpha, TOUCH_TARGET, type ColorTokens, type TouchTargetSkin, shape } from "../../style/index.js";
import { type IconName } from "../../atoms/icon/icon.js";

// Co-located RowMenu skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). The menu card paints the
// `popover` fill on an OPAQUE surface in every theming mode: the shell asks
// AnchoredOverlay for its plain surface (`opaque`), so the menu never takes the
// glass material and the table row under it never reads through. The BRAND survives
// on every platform (the destructive red is a fixed Tailwind hue, the trigger and
// rows take the brand foreground/popover tokens, never a platform default); only
// the native SHAPE, sizing, structure, and interaction feedback change per OS:
//   iOS (HIG context menu): the floating card is a rounded popover (~13 radius)
//     over `popover` with a soft shadow, NO border; rows are ~44pt tall with a
//     LEADING icon, groups split by hairline `separator` lines; destructive rows
//     are red; pressed = a `secondary` highlight (no ripple). The ⋯ trigger dims
//     to ~0.8 opacity on press.
//   Android (Material 3 menu): the card is an elevated surface (4 radius,
//     `popover`, soft shadow), NO border; groups are not auto-divided, but an item
//     that sets `separatorBefore` gets a 1dp M3 menu divider above it; rows are
//     ~48dp tall with a LEADING icon; press = an android_ripple (alpha(primary,
//     0.12) state layer). Destructive rows are red. The ⋯ trigger uses the same
//     ripple.
//   Web: the established Canvas look (the current row menu, lifted verbatim) — a
//     bordered popover card (6 radius, `border`, shadow-lg, min-w 180), rounded-sm
//     rows (px-2 py-1.5), hairline `border` separators, destructive red, and an
//     `accent` fill on press for both the trigger and the rows.

export interface RowMenuItem {
  label: string;
  /** Optional leading Canvas glyph, named from the kit icon set (e.g. `"pencil"`,
   *  `"copy"`, `"trash"`). Rendered through the `Icon` atom, tinted to match the
   *  row (destructive rows go red). */
  icon?: IconName;
  /** Red-tinted row for destructive actions (e.g. Delete). */
  destructive?: boolean;
  /** Draw a hairline separator above this row to start a new group. */
  separatorBefore?: boolean;
  /** Dim the row and make it inert: it does not fire `onSelect`, does not close the menu, and
   *  is announced as disabled (for an action that is unavailable in the current context, e.g.
   *  "Clear column" on an already-empty column). */
  disabled?: boolean;
}

// The contract a platform skin fulfills. The shell owns the structure (anchor +
// ⋯ trigger + floating card of section label and item rows) and the open/close
// state; the skin maps tokens and the active row state to RN style objects, and
// declares its press-feedback mode (iOS/web dim or tint inline, Android ripples).
export interface RowMenuSkin extends TouchTargetSkin {
  /** The relative anchor: keeps the trigger from stretching, positions the card. */
  anchor: ViewStyle;
  /** The ⋯ icon-button surface (square, centered, platform radius). */
  trigger: ViewStyle;
  /** The ⋯ (moreHorizontal) Canvas trigger glyph size (px), per platform. */
  triggerIconSize: number;
  /** The fill applied to the trigger on press (web/iOS tint via this; Android ripples). */
  triggerPressed: (t: ColorTokens) => ViewStyle;
  /** The floating menu card surface (shape, fill, border, shadow, radius). The
   *  shell adds the measured minWidth and positions the card via AnchoredOverlay. */
  menuCard: (t: ColorTokens) => ViewStyle;
  /** The menu's min-width floor; the card never renders narrower than this. */
  menuMinWidth: number;
  /** The muted section heading above the rows. */
  menuLabel: (t: ColorTokens) => TextStyle;
  /** A single action/link row layout. */
  itemRow: ViewStyle;
  /** The fill applied to a row on press (web/iOS tint via this; Android ripples). */
  itemPressed: (t: ColorTokens) => ViewStyle;
  /** The hairline separator above a row that sets `separatorBefore`. Always rendered
   *  when an item requests it, on every platform (both HIG and M3 menus use group dividers). */
  separator: (t: ColorTokens) => ViewStyle;
  /** The row label text size. */
  rowTextSize: TextStyle;
  /** The leading Canvas icon size (px), sized to sit with the label per platform. */
  iconSize: number;
  /** The per-row text color (destructive red, link foreground, action popover fg). */
  rowTextColor: (item: RowMenuItem, links: boolean, t: ColorTokens, dark: boolean) => TextStyle;
  /** iOS/web dim the trigger on press; Android ripples instead (null). */
  triggerPressedOpacity: number | null;
  /** Android ripple over the trigger and rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// When the menu is open, the anchor is lifted into its own stacking context above
// sibling content. react-native-web gives every positioned View an implicit
// stacking context, so the card's own `zIndex` is scoped INSIDE the `relative`
// anchor and cannot rise above a later sibling. Raising the anchor's zIndex while
// open lifts the whole control — trigger and card together — above everything
// painted after it. Shared across platforms (the anchor shape is identical).
export const anchorLifted: ViewStyle = { zIndex: 50 };

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// A bordered popover card (min-w 180, 6 radius, 1px `border`, `popover` fill,
// p-1, shadow-lg) placed inline below the trigger; rounded-sm rows (px-2 py-1.5)
// with a 2-radius corner; hairline `border` separators split groups; destructive
// rows are red-700/red-300; the trigger and rows tint with `accent` on press.
export const webSkin: RowMenuSkin = {
  minTarget: null,
  anchor: { position: "relative", alignSelf: "flex-start" },
  // The Riskora row kebab: a 36px square with the control corner; its menu is
  // the card at the menu corner with an 8px inset and 40px rows with a 10px corner.
  trigger: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: shape.web.control,
  },
  triggerIconSize: 16,
  triggerPressed: (t) => ({ backgroundColor: t.accent }),
  menuCard: (t) => ({
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 8,
    ...shadow("lg", t),
  }),
  menuMinWidth: 200,
  menuLabel: (t) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: t["muted-foreground"],
  }),
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemPressed: (t) => ({ backgroundColor: t.accent }),
  separator: (t) => ({ marginVertical: 6, height: 1, backgroundColor: t.border }),
  rowTextSize: { fontSize: 14, lineHeight: 20 },
  iconSize: 16,
  rowTextColor: (item, links, t) => {
    if (item.destructive) return { color: destructiveText(t) };
    return { color: links ? t.foreground : t["popover-foreground"] };
  },
  triggerPressedOpacity: null,
  ripple: null,
};

// ---------- iOS 27 (Liquid Glass context menu): big-radius popover, leading icons, hairlines ----------
// Apple's iOS 26+/iOS 27 context menu: a floating, deeply rounded card (~28pt
// continuous corner, up from the old ~13pt) over `popover` with a soft shadow and
// NO border; rows are ~44pt tall with comfortable horizontal padding and a LEADING
// glyph; groups are split by full-bleed hairline separators; a destructive row is
// red; the pressed row tints with the `secondary` system fill (not a ripple). The
// ⋯ trigger dims to ~0.8 opacity on press. The larger radius is what reads as the
// modern Liquid Glass menu; the rest of the structure (leading icons, hairlines,
// destructive red, section titles) is unchanged from the HIG layout.
const IOS_RADIUS = 28;
export const iosSkin: RowMenuSkin = {
  minTarget: TOUCH_TARGET.ios,
  anchor: { position: "relative", alignSelf: "flex-start" },
  trigger: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  triggerIconSize: 17,
  // iOS dims the whole trigger on press (pressedOpacity); no fill tint.
  triggerPressed: () => ({}),
  menuCard: (t) => ({
    borderRadius: IOS_RADIUS,
    backgroundColor: t.popover,
    // The deep corner clips the first/last row fills cleanly; vertical inset keeps
    // the top/bottom rows clear of the rounded corners.
    paddingVertical: 6,
    overflow: "hidden",
    ...shadow("lg", t),
  }),
  menuMinWidth: 250,
  menuLabel: (t) => ({
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: t["muted-foreground"],
  }),
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
  },
  // The selected/pressed row uses the iOS system highlight (the `secondary` fill).
  itemPressed: (t) => ({ backgroundColor: t.secondary }),
  // A full-bleed hairline divider (no horizontal inset) splitting menu groups.
  separator: (t) => ({ height: 1, backgroundColor: t.border, marginVertical: 4 }),
  rowTextSize: { fontSize: 17, lineHeight: 22 },
  iconSize: 20,
  rowTextColor: (item, links, t) => {
    if (item.destructive) return { color: destructiveText(t) };
    return { color: links ? t.foreground : t["popover-foreground"] };
  },
  triggerPressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 menu): elevated surface, ripple rows, no dividers ----------
// M3 dropdown/context menu: an elevated surface (4dp radius, `popover` fill, soft
// shadow) with NO border; rows are ~48dp tall with a LEADING icon and a brand
// ripple on press (alpha(primary, 0.12) state layer); M3 menus do NOT draw
// dividers between every group, so separators are suppressed. Destructive rows
// are red. The ⋯ trigger shares the ripple.
const ANDROID_RADIUS = 4;
export const androidSkin: RowMenuSkin = {
  minTarget: TOUCH_TARGET.android,
  anchor: { position: "relative", alignSelf: "flex-start" },
  trigger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    // Clip the Material ripple to the circular outline (without this, the bounded
    // RippleDrawable paints a rectangle past the rounded corners on Android).
    overflow: "hidden",
  },
  triggerIconSize: 20,
  // Android tints the trigger via the ripple, not a fill.
  triggerPressed: () => ({}),
  menuCard: (t) => ({
    borderRadius: ANDROID_RADIUS,
    backgroundColor: t.popover,
    paddingVertical: 8,
    ...shadow("md", t),
  }),
  menuMinWidth: 200,
  menuLabel: (t) => ({
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: t["muted-foreground"],
  }),
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  // The M3 pressed state layer: the brand primary at ~12% alpha (the ripple tint).
  itemPressed: (t) => ({ backgroundColor: alpha(t.primary, 0.12) }),
  // M3 does not auto-draw a divider between every group, but an item that explicitly
  // requests `separatorBefore` gets the M3 menu divider (a 1dp full-width hairline).
  separator: (t) => ({ height: 1, backgroundColor: t.border, marginVertical: 4 }),
  rowTextSize: { fontSize: 16, lineHeight: 24 },
  iconSize: 20,
  rowTextColor: (item, links, t) => {
    if (item.destructive) return { color: destructiveText(t) };
    return { color: links ? t.foreground : t["popover-foreground"] };
  },
  triggerPressedOpacity: null,
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
};
