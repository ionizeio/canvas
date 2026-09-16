import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, surfaceRipple, shape } from "../../style/index.js";

// Co-located Board skins, one per platform. Board is a "Light" treatment: the structure (the
// horizontal lanes ScrollView, the DropZone columns, the Draggable cards and their anatomy)
// and every piece of logic live in board.shared.tsx; the skin carries only the per-OS deltas:
// the lane/column shape and density, the type scale, and the press feedback for a pressable
// card body. The BRAND survives everywhere (token colors, the primary drop affordances from
// the composed DnD family); only native shape/sizing/feedback shift per OS.
//
//   Web: the established Canvas look. Columns are rounded-lg (10) `muted` wells, 13/600
//     headers, 14/500 card titles + 12 muted descriptions; press = the accent surface.
//   iOS (HIG): columns as inset-grouped wells with the 26 continuous (superellipse) corner
//     curve over `muted` (fill-differentiated, borderless, per the iOS grouped conventions);
//     SF type (header subheadline 15/600 -0.24, title 15/600 -0.24, description footnote
//     13/18 -0.08); press = the accent surface plus the ~0.8 opacity dim.
//   Android (Material 3): columns as 16-radius `muted` surface containers; M3 type with M3
//     tracking (header title-small 14/20/500/+0.1, title title-small, description body-small
//     12/16/+0.4); press = android_ripple (the neutral surface state layer), no dim.
//
// Content cards stay SOLID on every platform (they render through the kit Card, whose `card`
// token never goes glass); the functional glass layer is not involved anywhere on the board.

export interface BoardSkin {
  /** The horizontal row of columns (the ScrollView content): direction, alignment, gap. */
  lanes: (compact: boolean) => ViewStyle;
  /** A column's lane surface (fill, radius, padding, header-to-list gap). */
  column: (t: ColorTokens, compact: boolean) => ViewStyle;
  /** The column header row (label + count badge). */
  columnHeader: ViewStyle;
  /** The column header label type. */
  columnLabel: (t: ColorTokens) => TextStyle;
  /** The card stack inside a column (gap; a minHeight keeps an empty column droppable). */
  cardList: (compact: boolean) => ViewStyle;
  /** The row inside a card: the (pressable) body column + the trailing cluster. */
  cardRow: ViewStyle;
  /** The card's text column (title, description, chips slot). */
  bodyColumn: (compact: boolean) => ViewStyle;
  /** The card title type. */
  cardTitle: (t: ColorTokens) => TextStyle;
  /** The muted, 2-line-clamped description type. */
  cardDescription: (t: ColorTokens) => TextStyle;
  /** The consumer `chips` slot row (wraps; spacing only, content is the consumer's). */
  chipsRow: ViewStyle;
  /** The trailing column: grip + kebab cluster on top, badge under it. */
  trailingColumn: ViewStyle;
  /** The grip + kebab row within the trailing column. */
  trailingCluster: ViewStyle;
  /** The muted empty-column message type. */
  emptyLabel: (t: ColorTokens) => TextStyle;
  /** The pressable card body's own shape (radius; Android clips its ripple to it). */
  pressableBody: ViewStyle;
  /** The fill applied to the pressed card body (web/iOS tint; Android ripples instead). */
  pressedSurface: (t: ColorTokens) => ViewStyle;
  /** iOS dims the pressed body on top of the tint; null elsewhere. */
  pressedOpacity: number | null;
  /** Android ripple over the pressable card body; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// Shared layout fragments (identical across platforms).
const HEADER: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 };
const CARD_ROW: ViewStyle = { flexDirection: "row", alignItems: "flex-start", gap: 8 };
const TRAILING: ViewStyle = { flexDirection: "column", alignItems: "flex-end", gap: 8 };
const CLUSTER: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 2 };
const CHIPS: ViewStyle = { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 };

// ---------- Web: the established Canvas look ----------
export const webSkin: BoardSkin = {
  lanes: (compact) => ({ flexDirection: "row", alignItems: "flex-start", gap: compact ? 12 : 16 }),
  column: (t, compact) => ({ backgroundColor: t.muted, borderRadius: shape.web.card, padding: compact ? 8 : 12, gap: compact ? 8 : 10 }),
  columnHeader: HEADER,
  columnLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  cardList: (compact) => ({ gap: compact ? 6 : 8, minHeight: 48 }),
  cardRow: CARD_ROW,
  bodyColumn: (compact) => ({ gap: compact ? 2 : 4 }),
  cardTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["card-foreground"] }),
  cardDescription: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  chipsRow: CHIPS,
  trailingColumn: TRAILING,
  trailingCluster: CLUSTER,
  emptyLabel: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  pressableBody: { borderRadius: shape.web.control },
  pressedSurface: (t) => ({ backgroundColor: t.accent }),
  pressedOpacity: null,
  ripple: null,
};

// ---------- iOS (HIG inset-grouped wells, SF type) ----------
export const iosSkin: BoardSkin = {
  lanes: (compact) => ({ flexDirection: "row", alignItems: "flex-start", gap: compact ? 12 : 16 }),
  column: (t, compact) => ({ backgroundColor: t.muted, borderRadius: 26, borderCurve: "continuous", padding: compact ? 10 : 14, gap: compact ? 8 : 12 }),
  columnHeader: HEADER,
  columnLabel: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: t.foreground }),
  cardList: (compact) => ({ gap: compact ? 8 : 10, minHeight: 52 }),
  cardRow: CARD_ROW,
  bodyColumn: (compact) => ({ gap: compact ? 2 : 4 }),
  cardTitle: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: t["card-foreground"] }),
  cardDescription: (t) => ({ fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] }),
  chipsRow: CHIPS,
  trailingColumn: TRAILING,
  trailingCluster: CLUSTER,
  emptyLabel: (t) => ({ fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] }),
  pressableBody: { borderRadius: 8, borderCurve: "continuous" },
  pressedSurface: (t) => ({ backgroundColor: t.accent }),
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 surface-container lanes, M3 type) ----------
export const androidSkin: BoardSkin = {
  lanes: (compact) => ({ flexDirection: "row", alignItems: "flex-start", gap: compact ? 12 : 16 }),
  column: (t, compact) => ({ backgroundColor: t.muted, borderRadius: 16, padding: compact ? 8 : 12, gap: compact ? 8 : 12 }),
  columnHeader: HEADER,
  columnLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t.foreground }),
  cardList: (compact) => ({ gap: compact ? 6 : 8, minHeight: 52 }),
  cardRow: CARD_ROW,
  bodyColumn: (compact) => ({ gap: compact ? 2 : 4 }),
  cardTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t["card-foreground"] }),
  cardDescription: (t) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: t["muted-foreground"] }),
  chipsRow: CHIPS,
  trailingColumn: TRAILING,
  trailingCluster: CLUSTER,
  emptyLabel: (t) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: t["muted-foreground"] }),
  // The bounded Material ripple is clipped to these corners by the shell's RippleClip
  // parent (a node can never clip its own ripple on Android; see src/style/ripple-clip.tsx).
  pressableBody: { borderRadius: 8 },
  pressedSurface: () => ({}),
  pressedOpacity: null,
  ripple: (t) => surfaceRipple(t),
};
