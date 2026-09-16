import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, surfaceRipple } from "../../style/index.js";

// Co-located DataTable skins, one per platform. The table is laid out as flex
// rows of equal-width flex-1 cells (there is no CSS table primitive). Layout-only
// fragments are static; anything that reads a color is a function of the active
// brand tokens (so the header tint, hairlines, stripes, and press tint follow
// light/dark — the table is a CONTENT-LAYER surface, so it stays SOLID and never
// goes glass).
//
// DataTable is a "Light" treatment: ONE structure (header band + flex-row grid)
// with small per-OS touches. The BRAND survives on every platform (the tokens
// carry the indigo brand; no platform default color leaks in); only the native
// row rhythm, header type/tracking, hairline, stripe fill, outer radius, and
// press feedback change per OS:
//   Web (the established Canvas / shadcn look, lifted VERBATIM): an 8-radius
//     bordered wrap; header band on `muted` with px-16/py-8 (py-6 compact),
//     12/16 uppercase muted-foreground labels at +0.4 tracking; data cells
//     px-16/py-12 (py-8 compact) with 14/20 foreground text; 1px `border`
//     hairline under each row; stripe = muted @ 30%; press = `accent` fill.
//     Header and data cells both carry per-cell horizontal padding (shadcn th/td
//     px-2 class) so labels never jam, and the wrap holds a 320 width floor.
//   iOS (SwiftUI Table / grouped-list rhythm): a 10-radius CONTINUOUS outer
//     corner; the header reads as regular-case secondary labels (13/18, weight
//     400, -0.08 tracking — HIG title-style column headings, NOT the uppercase
//     grouped-section-header idiom); ~52pt-rhythm rows (py-15, py-8 compact) with
//     17/22 body text at -0.43 SF tracking; thin ~0.5pt separator hairlines INSET
//     16pt to the content leading edge; stripe = muted @ 24%; press = `secondary`
//     system fill. Below the compact (sm) width the table collapses to its
//     PRIMARY (first) column, matching SwiftUI Table on iPhone.
//   Android (Material 3 list rhythm; M3 has no data table, so the M3 LIST
//     conventions apply): a flat 8-radius wrap (M3 surfaces are flat, no
//     shadow); the header is an M3 label-medium band (12/16, weight 500, +0.5
//     tracking, NOT uppercased — M3 labels are sentence/normal case); ~52dp
//     rows (py-14, py-10 compact) with 16/24/+0.5 body-large text; 1px
//     outline-variant hairlines; stripe = surface-variant (muted) @ 20%; press
//     = an android_ripple carrying the M3 on-surface state layer (surfaceRipple).

export type Density = "compact" | "regular" | "comfortable";

// The contract a platform skin fulfills. The shell owns the structure (header
// band + flex-row grid, the selection column, the striped/pressable rows); the
// skin maps tokens and density to RN style objects and declares its press mode
// (iOS/web tint the row fill, Android ripples).
export interface DataTableSkin {
  /** The outer wrap (clips the rounded corners). */
  wrap: ViewStyle;
  /** The `bordered` rounded outline around the whole table. */
  borderedOutline: (t: ColorTokens) => ViewStyle;
  /** The header band (a flex row on the muted surface). */
  headerRow: (t: ColorTokens) => ViewStyle;
  /** Header vertical padding per density (horizontal padding lives on the cell). */
  headerPad: Record<Density, ViewStyle>;
  /**
   * A header column label — TYPE ONLY (size/weight/case/tracking/color). The
   * shell owns the header cell BOX (the equal-width flex share, the horizontal
   * padding, the label+sort-icon row), so the label can sit beside a sort
   * indicator without each skin re-declaring the layout.
   */
  headerCell: (t: ColorTokens) => TextStyle;
  /** Size (px) of the sort-direction indicator icon beside a sortable header label. */
  sortIconSize: number;
  /**
   * Muted caption type: the footer's "N selected" count and the built-in
   * `emptyMessage` text.
   */
  captionText: (t: ColorTokens) => TextStyle;
  /** The leading checkbox column (narrow, fixed width). */
  selectCol: ViewStyle;
  /** The selection cell in a data row (the narrow column plus row padding). */
  selectCell: ViewStyle;
  /** A data row (flex row, vertically centered, with a hairline beneath it). */
  dataRow: (t: ColorTokens) => ViewStyle;
  /** The striped tint on alternating (odd-index) rows. */
  stripeTint: (t: ColorTokens) => ViewStyle;
  /** The pressed tint for a pressable row (iOS/web tint via this; Android ripples). */
  pressTint: (t: ColorTokens) => ViewStyle;
  /** Cell vertical/horizontal padding per density. */
  cellPad: Record<Density, ViewStyle>;
  /** A content cell (equal-width column box; padding added per density). */
  dataCell: ViewStyle;
  /** A data cell's text (the platform's body type on the foreground color). */
  cellText: (t: ColorTokens) => TextStyle;
  /**
   * An inset row separator hairline (iOS lists inset the separator to the content
   * leading edge). When set, the shell renders it as an absolutely-positioned
   * bottom hairline inside each row and the `dataRow` carries no borderBottom;
   * null keeps the full-bleed borderBottom on `dataRow` (web/Android).
   */
  separator: ((t: ColorTokens) => ViewStyle) | null;
  /**
   * Fixed width of the trailing row-actions column (`onRowEdit`/`onRowDelete`):
   * two icon buttons at the platform touch-target size, plus the cell padding.
   */
  actionsColWidth: number;
  /**
   * One icon action button (pencil / bin / save / cancel): a square box at the
   * platform touch-target size (web 28, iOS 44pt, Android 48dp), centered.
   */
  actionButton: ViewStyle;
  /** Size (px) of the glyphs inside the trailing action buttons. */
  actionIconSize: number;
  /**
   * The inline cell editor (`inlineEdit` / pencil-opened row editing): the
   * platform's cell type inside a primary-ringed field on the background fill.
   */
  editInput: (t: ColorTokens) => TextStyle;
  /** The wash over a row while it is in pencil-opened edit mode. */
  editTint: (t: ColorTokens) => ViewStyle;
  /**
   * Collapse a multicolumn table to its PRIMARY (first) column below the compact
   * (`sm`) width, matching SwiftUI Table's compact-width behavior on iPhone. iOS
   * only; web/Android render every column at every width.
   */
  collapsesToPrimaryColumn?: boolean;
  /**
   * Minimum height for a pressable row so the tap target clears the platform
   * minimum (iOS 44pt / M3 48dp), applied only when `onRowPress` is set. Web omits
   * it (no touch-target requirement on the pointer web).
   */
  pressableMinHeight?: number;
  /** Android ripple over a pressable row; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- shared layout fragments (identical structure across platforms) ---------

// The table clips its rounded corners so the header tint and bottom hairlines
// stay inside the bordered outline. A 320px width floor (the `xs` step of the
// width scale) keeps the table usable in content-sized contexts (a
// shrink-to-fit Card): without it the flex-1 columns collapse to the header
// labels' min-content and jam together. In a bounded parent the table still
// stretches to fill — minWidth only sets the floor, it does not cap growth.
const WRAP: ViewStyle = { overflow: "hidden", minWidth: 320 };

// The leading checkbox column, kept narrow and fixed (flex-none) so it does not
// eat into the flex-1 content cells.
const SELECT_COL: ViewStyle = {
  width: 40,
  alignItems: "center",
  justifyContent: "center",
  flexGrow: 0,
  flexShrink: 0,
  flexBasis: "auto",
};

// A content cell: equal-width column box (padding added per density).
const DATA_CELL: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// ---------- Web: the established Canvas look (lifted VERBATIM) ----------
export const webSkin: DataTableSkin = {
  wrap: WRAP,
  borderedOutline: (t) => ({ borderRadius: 8, borderWidth: 1, borderColor: t.border }),
  headerRow: (t) => ({ flexDirection: "row", backgroundColor: t.muted }),
  headerPad: {
    compact: { paddingVertical: 6 },
    regular: { paddingVertical: 8 },
    comfortable: { paddingVertical: 10 },
  },
  // Type only; the shell's header cell box carries the flex share and the px-16
  // horizontal padding (shadcn th px-2 class) so headings sit over their columns.
  headerCell: (t) => ({
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: t["muted-foreground"],
  }),
  sortIconSize: 14,
  captionText: (t) => ({ fontSize: 13, lineHeight: 18, color: t["muted-foreground"] }),
  selectCol: SELECT_COL,
  selectCell: { ...SELECT_COL },
  dataRow: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: t.border,
  }),
  stripeTint: (t) => ({ backgroundColor: alpha(t.muted, 0.3) }),
  pressTint: (t) => ({ backgroundColor: t.accent }),
  cellPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 8 },
    regular: { paddingHorizontal: 16, paddingVertical: 12 },
    comfortable: { paddingHorizontal: 16, paddingVertical: 16 },
  },
  dataCell: DATA_CELL,
  cellText: (t) => ({ fontSize: 14, lineHeight: 20, color: t.foreground }),
  separator: null,
  // Row actions: 28px icon buttons (the pointer web needs no touch minimum);
  // two of them plus the gap and px-12 cell padding set the 92px column.
  actionsColWidth: 92,
  actionButton: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  actionIconSize: 15,
  // The inline editor: the 14/20 cell type inside a primary-ringed 28px field.
  editInput: (t) => ({
    alignSelf: "stretch",
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: t.primary,
    backgroundColor: t.background,
    color: t.foreground,
    paddingHorizontal: 6,
    paddingVertical: 0,
    fontSize: 14,
    lineHeight: 20,
  }),
  editTint: (t) => ({ backgroundColor: alpha(t.primary, 0.06) }),
  ripple: null,
};

// ---------- iOS (SwiftUI Table / grouped-list rhythm) ----------
// The header reads like SwiftUI Table column headings (title-style / regular
// case, 13pt regular, secondary color — HIG "descriptive column headings ...
// title-style capitalization", NOT the uppercase grouped-section-header idiom);
// rows sit on the iOS one-line list rhythm (52pt) with 17pt body text and thin
// (~0.5pt) separator hairlines inset 16pt to the content leading edge; a 10pt
// continuous outer corner; pressed rows take the iOS `secondary` system fill (no
// ripple). Below the compact width the table collapses to its primary column.
export const iosSkin: DataTableSkin = {
  wrap: WRAP,
  borderedOutline: (t) => ({ borderRadius: 10, borderCurve: "continuous", borderWidth: 1, borderColor: t.border }),
  headerRow: (t) => ({ flexDirection: "row", backgroundColor: t.muted }),
  headerPad: {
    compact: { paddingVertical: 6 },
    regular: { paddingVertical: 8 },
    comfortable: { paddingVertical: 10 },
  },
  headerCell: (t) => ({
    fontSize: 13,
    lineHeight: 18,
    // Title-style secondary label (SwiftUI Table column heading): regular weight,
    // sentence/title case (no textTransform), SF Pro Text 13pt tracking.
    fontWeight: "400",
    letterSpacing: -0.08,
    color: t["muted-foreground"],
  }),
  sortIconSize: 14,
  captionText: (t) => ({ fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] }),
  selectCol: SELECT_COL,
  selectCell: { ...SELECT_COL },
  dataRow: () => ({
    flexDirection: "row",
    alignItems: "center",
    // The hairline is a separate inset element (skin.separator), not a full-bleed
    // borderBottom, so it aligns with the content leading edge (iOS list idiom).
  }),
  stripeTint: (t) => ({ backgroundColor: alpha(t.muted, 0.24) }),
  // The iOS system row highlight on press.
  pressTint: (t) => ({ backgroundColor: t.secondary }),
  cellPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 8 },
    // 22pt line + 2x15 = 52pt, the iOS one-line list/table row rhythm.
    regular: { paddingHorizontal: 16, paddingVertical: 15 },
    // 22pt line + 2x19 = 60pt, the roomier two-line-ish rhythm.
    comfortable: { paddingHorizontal: 16, paddingVertical: 19 },
  },
  dataCell: DATA_CELL,
  cellText: (t) => ({ fontSize: 17, lineHeight: 22, letterSpacing: -0.43, color: t.foreground }),
  // Thin (~0.5pt) separator inset 16pt from the leading edge to align with the
  // content (iOS list/table separators do not run full-bleed).
  separator: (t) => ({ position: "absolute", left: 16, right: 0, bottom: 0, height: 0.5, backgroundColor: t.border }),
  // Row actions: 44pt HIG touch targets; two of them plus the gap and px-12
  // cell padding set the column width.
  actionsColWidth: 116,
  actionButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionIconSize: 17,
  // The inline editor: the 17/22 SF cell type inside a primary-ringed 32pt field
  // with the continuous iOS corner.
  editInput: (t) => ({
    alignSelf: "stretch",
    height: 32,
    borderRadius: 6,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: t.primary,
    backgroundColor: t.background,
    color: t.foreground,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.43,
  }),
  editTint: (t) => ({ backgroundColor: alpha(t.primary, 0.06) }),
  collapsesToPrimaryColumn: true,
  pressableMinHeight: 44,
  ripple: null,
};

// ---------- Android (Material 3 list rhythm) ----------
// M3 has no data table; the M3 LIST conventions apply. The header is an M3
// label-medium band (NOT uppercased — M3 labels are normal case), rows sit on the
// M3 list rhythm with 16sp body-large text (+0.5 tracking) and 1px outline-variant
// hairlines, the wrap is flat (M3 surfaces carry no shadow), and press = an
// android_ripple carrying the M3 on-surface state layer (surfaceRipple: the
// foreground token at low alpha, NOT the primary tint).
export const androidSkin: DataTableSkin = {
  wrap: WRAP,
  borderedOutline: (t) => ({ borderRadius: 8, borderWidth: 1, borderColor: t.border }),
  headerRow: (t) => ({ flexDirection: "row", backgroundColor: t.muted }),
  headerPad: {
    compact: { paddingVertical: 8 },
    regular: { paddingVertical: 10 },
    comfortable: { paddingVertical: 12 },
  },
  headerCell: (t) => ({
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: t["muted-foreground"],
  }),
  // M3 data tables pair the header label with a 16dp sorting arrow.
  sortIconSize: 16,
  // M3 body-small caption.
  captionText: (t) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: t["muted-foreground"] }),
  selectCol: SELECT_COL,
  selectCell: { ...SELECT_COL },
  dataRow: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: t.border,
  }),
  stripeTint: (t) => ({ backgroundColor: alpha(t.muted, 0.2) }),
  // Press feedback comes from the ripple on Android; this fill is the SELECTED
  // row tint (the M3 primary state layer at 12%).
  pressTint: (t) => ({ backgroundColor: alpha(t.primary, 0.12) }),
  cellPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 10 },
    regular: { paddingHorizontal: 16, paddingVertical: 14 },
    comfortable: { paddingHorizontal: 16, paddingVertical: 18 },
  },
  dataCell: DATA_CELL,
  // M3 body-large: 16/24/400 with +0.5 tracking.
  cellText: (t) => ({ fontSize: 16, lineHeight: 24, letterSpacing: 0.5, color: t.foreground }),
  separator: null,
  // Row actions: 48dp M3 touch targets on a circular state layer (the shell
  // ripples them with controlRipple); two plus the gap and px-12 padding.
  actionsColWidth: 124,
  actionButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  actionIconSize: 18,
  // The inline editor: the 16/24 body-large cell type in a primary-ringed 36dp field.
  editInput: (t) => ({
    alignSelf: "stretch",
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: t.primary,
    backgroundColor: t.background,
    color: t.foreground,
    paddingHorizontal: 8,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  }),
  // The M3 primary state layer as the row-in-edit wash.
  editTint: (t) => ({ backgroundColor: alpha(t.primary, 0.08) }),
  pressableMinHeight: 48,
  // M3 list-row state layer: on-surface (foreground) ink at ~10% alpha, routed
  // through the shared ripple helper (the wrap's overflow:"hidden" clips it).
  ripple: (t) => surfaceRipple(t),
};
