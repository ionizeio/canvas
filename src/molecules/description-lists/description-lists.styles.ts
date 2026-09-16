import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, MONO_FONT, FOCUS_RESET, shape } from "../../style/index.js";
import { type DescriptionListSkin } from "./description-lists.shared.js";

// Co-located DescriptionList skins and shared style fragments. Layout-only
// fragments are static objects; anything that reads a color is a function of the
// active tokens (so the card surface follows light/dark). DescriptionList is a
// CONTENT-layer surface that paints tokens.card, which stays SOLID under glass
// (only the functional/popover layer frosts). The per-OS pieces (card radius /
// corner curve / elevation, row density and metrics, the term/value/header type)
// come in through the DescriptionListSkin the shell holds.
//
// DescriptionList keeps one structure and one set of semantic colors on every
// platform, but the per-OS TYPE ROLES differ:
//   Web  — the established Canvas / Catalyst look, lifted verbatim: a card with
//          8 radius, a 1px `border`, the `card` fill, a soft shadow("sm"), 24
//          padding, gap 12 between rows; a 14/20 muted term beside a 14/20/500
//          foreground value; the stacked term is 12pt/500 uppercase with 0.4
//          letter-spacing.
//   iOS  — the iOS 27 kit Lists value row: the term is the PRIMARY SF Pro 17/22
//          Regular label (Labels/1) LEFT and the value is the SECONDARY gray
//          17/22 detail (Labels/2), the OPPOSITE emphasis and 3pt larger than the
//          web idiom; ~52pt center-aligned rows, 16 inset, inside a FLAT 26-radius
//          inset-grouped card with the continuous (superellipse) corner curve.
//   Android — Material 3 has no description-list control; key-value content is a
//          plain list/text layout, so the surface follows the M3 outlined card:
//          a 12-radius outlined surface kept FLAT (no shadow, elevation 0), 16dp
//          inset, a slightly more breathable 14 row gap, and M3 type roles (term
//          body-medium 14/20/+0.1, value title-small 14/20/500/+0.1, stacked
//          label-medium 12/16/500/+0.5, header title-medium 16/24/500/+0.15).

export type Layout = "inline" | "twoColumn" | "stacked";

// Card surface: rounded, bordered, card fill, per-OS corner curve + elevation.
// The radius, curve, and shadow come from the skin so the shape and elevation
// shift per platform; the border, fill, and the rest are shared. borderCurve is
// an iOS-only RN style prop (the continuous superellipse corner), a no-op on the
// web and Android.
export function cardSurface(tokens: ColorTokens, skin: DescriptionListSkin): ViewStyle {
  return {
    borderRadius: skin.cardRadius,
    borderCurve: skin.cardCurve,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    ...skin.cardShadow,
  };
}

// With a header, rows sit in their own group beneath the bordered band; the
// horizontal inset and the inter-row gap follow the per-OS skin.
export function rowsWrap(skin: DescriptionListSkin): ViewStyle {
  return { paddingHorizontal: skin.cardPadding, gap: skin.rowGap };
}

// --- term / value text ------------------------------------------------------

// Stacked term: uppercased and tracked so the label reads as secondary above a
// full-weight value. The per-OS tracking is layered on by the skin.
export function termStacked(tokens: ColorTokens): TextStyle {
  return {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    color: tokens["muted-foreground"],
  };
}

// The two-column term's fixed label column (w-40). Lands on a Text.
export const termColumn: TextStyle = { width: 160 };

// The label column narrows at phone widths so the value column keeps room to
// breathe (restores the pre-refactor Field behavior: 160 -> 120 at/below sm).
export const termColumnNarrow: TextStyle = { width: 120 };

// The inline value is right-aligned in its row.
export const valueAlignRight: TextStyle = { textAlign: "right" };

// Monospace value face, for tokens, scopes, identifiers.
export const valueMono: TextStyle = { fontFamily: MONO_FONT };

// A copyable value row: the value beside its ghost Copy button. The row itself
// must yield inside a tight value cell (flexShrink defaults to 0, which would
// push the button past the card edge), and the value text inside it yields to
// the button, ellipsizing instead of overflowing.
export const copyRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 };
export const copyValueText: TextStyle = { flexShrink: 1 };

// --- rows -------------------------------------------------------------------

// Row layout per axis. The horizontal rows (inline / two-column) take the skin's
// cross-axis alignment (iOS centers its 52pt Lists row; web/Android sit on the
// baseline) and an optional minimum height (the iOS list-row height).
export function rowLayout(layout: Layout, skin: DescriptionListSkin): ViewStyle {
  if (layout === "stacked") return { gap: 4 };
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: skin.rowAlign,
    gap: 16,
    ...(skin.rowMinHeight != null ? { minHeight: skin.rowMinHeight } : null),
  };
  if (layout === "inline") return { ...base, justifyContent: "space-between" };
  return base; // twoColumn
}

// A divided list pads each row beneath the rule so it sits clear of the text.
// iOS lands the hairline flush at the bottom of the centered 52pt row (pad 0);
// web/Android carry the row height in the padding.
export function rowDividedPad(skin: DescriptionListSkin): ViewStyle {
  return { paddingBottom: skin.dividedPadBottom };
}

// The hairline beneath every divided row except the last.
export function rowDivider(tokens: ColorTokens): ViewStyle {
  return { borderBottomWidth: 1, borderColor: tokens.border };
}

// The two-column value cell: grows to fill, with the value and trailing
// affordance pushed to opposite ends.
export const twoColumnValueCell: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 16,
};

// --- inline edit -------------------------------------------------------------

// The editing cluster: the draft input growing to fill the cell with the
// Save / Cancel links trailing. minWidth 0 lets the input shrink inside a
// tight cell instead of pushing the links out of the card.
export const editRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
};

// The inline layout's value cell has no width of its own; while editing it
// takes the row's free space so the draft input has room to type into.
export const editCellGrow: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// The draft input: rendered in the row's own value type but lifted to the full
// foreground color (typing reads primary even where the resting value is the
// secondary gray, as on iOS), over a hairline ring-colored underline that marks
// the active field. No inner padding, so the row height holds still while a row
// flips between reading and editing.
export function editInput(tokens: ColorTokens): TextStyle {
  return {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 80,
    paddingVertical: 0,
    paddingHorizontal: 0,
    color: tokens.foreground,
    borderBottomWidth: 1,
    borderColor: tokens.ring,
    ...FOCUS_RESET,
  };
}

// --- header band ------------------------------------------------------------

export function headerBand(tokens: ColorTokens, skin: DescriptionListSkin): ViewStyle {
  return {
    borderBottomWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: skin.cardPadding,
    paddingVertical: 16,
    gap: 2,
  };
}

export function headerSubtitle(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

// --- per-OS skins -----------------------------------------------------------

// Web: the current Canvas look, preserved verbatim.
export const webSkin: DescriptionListSkin = {
  cardRadius: shape.web.card,
  cardCurve: "circular",
  cardShadow: shadow("sm"),
  rowGap: 12,
  cardPadding: 24,
  rowAlign: "baseline",
  dividedPadBottom: 12,
  termType: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  valueType: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  stackedTermTracking: { letterSpacing: 0.4 },
  stackedValueType: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  headerTitleType: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "600", color: t.foreground }),
};

// iOS (iOS 27 kit Lists value rows in a flat inset-grouped card): the term is the
// PRIMARY 17/22 SF label and the value the SECONDARY gray 17/22 detail (emphasis
// inverted, 3pt larger), 52pt center-aligned rows, 16 inset, a flat 26-radius
// card with the continuous corner curve. SF Pro Text tracking at 17pt = -0.43;
// the 14pt stacked value = -0.15.
export const iosSkin: DescriptionListSkin = {
  cardRadius: 26,
  cardCurve: "continuous",
  cardShadow: shadow("none"),
  rowGap: 12,
  cardPadding: 16,
  rowAlign: "center",
  rowMinHeight: 52,
  dividedPadBottom: 0,
  termType: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: t.foreground }),
  valueType: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: t["muted-foreground"] }),
  stackedTermTracking: { letterSpacing: 0.06 },
  stackedValueType: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: -0.15, color: t.foreground }),
  headerTitleType: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "600", letterSpacing: -0.2, color: t.foreground }),
};

// Android (Material 3 outlined surface): a rounder, FLAT outlined card (no
// shadow), 16dp inset, slightly more breathing room, and M3 type roles/tracking.
export const androidSkin: DescriptionListSkin = {
  cardRadius: 12,
  cardCurve: "circular",
  cardShadow: shadow("none"),
  rowGap: 14,
  cardPadding: 16,
  rowAlign: "baseline",
  dividedPadBottom: 12,
  termType: (t) => ({ fontSize: 14, lineHeight: 20, letterSpacing: 0.1, color: t["muted-foreground"] }),
  valueType: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t.foreground }),
  stackedTermTracking: { letterSpacing: 0.5 },
  stackedValueType: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t.foreground }),
  headerTitleType: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: t.foreground }),
};
