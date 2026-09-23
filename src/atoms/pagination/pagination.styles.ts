import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, FOCUS_RESET, shape } from "../../style/index.js";

// Co-located Pagination skins, one per platform. The page buttons, Prev/Next
// controls, and the size selector are square-ish boxes whose footprint scales
// with the size axis; labels scale on a smaller type ramp. The BRAND survives on
// every platform (the active page reads the indigo `primary` token, never a
// platform default), and only the native SHAPE (cell radius / border) and press
// feedback change per OS. This is a LIGHT platform touch: neither iOS nor
// Material 3 ships a true numbered pagination, so the prev/next/numbered
// structure stays identical and each platform applies only its shape + feedback.
//   iOS (HIG page controls): pill-rounded cells (radius 8), no cell border, the
//     ACTIVE page filled `primary`; press = opacity dim 0.8.
//   Android (M3): flat cells (radius 8), no border, the ACTIVE page a tonal
//     alpha(primary, .12) fill with a brand-indigo label; press = android_ripple.
//   Web: the established Canvas look (1px bordered boxes, radius 6, the active
//     page a solid `primary` fill/border), lifted verbatim.

export type Size = "small" | "default" | "large";

// The platform-varying surface. Everything color/shape-bearing the cells need
// lives here, built from the active tokens (so fills/borders follow light/dark
// and the glass surface). Layout (gaps, rows) is shared and stays in this file's
// static fragments below.
export interface PaginationSkin {
  /** A Prev/Next chevron control: the bordered/filled box behind the glyph. */
  controlBox: (t: ColorTokens) => ViewStyle;
  /** A numbered page cell. Selected reads the brand fill; the rest are plain. */
  pageBox: (t: ColorTokens, selected: boolean) => ViewStyle;
  /** The rows-per-page selector trigger box (value + caret). */
  selectorBox: (t: ColorTokens) => ViewStyle;
  /** Control glyph / selector value color (foreground). */
  controlLabel: (t: ColorTokens) => TextStyle;
  /** A numbered page label; brand-on-fill when selected, foreground otherwise. */
  pageLabel: (t: ColorTokens, selected: boolean) => TextStyle;
  /** Muted supporting text: the "Page X of N" indicator, "Rows per page", caret. */
  mutedLabel: (t: ColorTokens) => TextStyle;
  /** The truncation ellipsis: muted, with a small horizontal inset. */
  gapLabel: (t: ColorTokens) => TextStyle;
  /** iOS/web dim the cell on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over a pressed cell; null on iOS/web. */
  ripple?: (t: ColorTokens, selected: boolean) => { color: string; borderless: boolean };
  /**
   * Web-only focus-outline reset for the cell Pressables. iOS sets this so the
   * react-native-web keyboard-focus blue ring (which a real iOS device never
   * shows) is suppressed, leaving the press dim as the only feedback. Undefined
   * on web/Android, which keep their own focus treatment. No-op natively, where
   * `outlineStyle`/`outlineWidth` are not real CSS.
   */
  focusOutlineReset?: ViewStyle;
}

// --- shared size scales (brand type/sizing, identical across platforms) ------

// Square-ish button footprint per size: height + matching min width + the
// horizontal pad (`h-8 min-w-8 px-2` / `h-9 min-w-9 px-2.5` / `h-10 min-w-10 px-3`).
export const itemSize: Record<Size, ViewStyle> = {
  small: { height: 36, minWidth: 36, paddingHorizontal: 10 },
  default: { height: 40, minWidth: 40, paddingHorizontal: 12 },
  large: { height: 44, minWidth: 44, paddingHorizontal: 14 },
};

// Label type per size (`text-xs` for small, `text-sm` otherwise).
export const labelSize: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 14, lineHeight: 20 },
};

// --- shared layout fragments (color-free; identical across platforms) --------

// Row of [prev, numbers, next] for the numbered default (`gap-1`).
export const numberedRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// Compact row: Prev/Next bracketing the "Page X of N" label (`gap-2`).
export const compactRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// With-size outer row: the selector group, the indicator, and the controls (`gap-4`).
export const withSizeRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 16 };

// The "Rows per page" label + selector cluster (`gap-2`).
export const selectorCluster: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// The Prev/Next pair inside the with-size row (`gap-1`).
export const controlPair: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// The centered-row base every cell shares (the skin layers fill/border/radius on top).
const CELL_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "center" };

// =============================================================================
// Web: the Riskora pager (40px tiles at the control corner on the card fill, the current
// page on the brand primary).
// =============================================================================

export const webSkin: PaginationSkin = {
  // A Prev/Next chevron control: a square bordered tile on the card fill.
  controlBox(t) {
    return {
      ...CELL_ROW,
      borderRadius: shape.web.control,
      borderWidth: 1,
      borderColor: t.input,
      backgroundColor: t.card,
    };
  },
  // A numbered page tile. Selected uses the primary fill/border; the rest match
  // the bordered card tile.
  pageBox(t, selected) {
    return {
      ...CELL_ROW,
      borderRadius: shape.web.control,
      borderWidth: 1,
      borderColor: selected ? t.primary : t.input,
      backgroundColor: selected ? t.primary : t.card,
    };
  },
  // The size selector trigger: value + caret pushed apart in a bordered tile.
  selectorBox(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      borderRadius: shape.web.control,
      borderWidth: 1,
      borderColor: t.input,
      backgroundColor: t.card,
    };
  },
  // Control glyph / selector value color (`font-medium text-foreground`).
  controlLabel(t) {
    return { fontWeight: "500", color: t.foreground };
  },
  // A numbered page label: medium weight, primary-foreground when selected
  // (`font-medium` + `text-primary-foreground` / `text-foreground`).
  pageLabel(t, selected) {
    return { fontWeight: "500", color: selected ? t["primary-foreground"] : t.foreground };
  },
  // Muted supporting text (`text-muted-foreground`).
  mutedLabel(t) {
    return { color: t["muted-foreground"] };
  },
  // The truncation ellipsis: muted, with a small horizontal inset (`px-1`).
  gapLabel(t) {
    return { paddingHorizontal: 4, color: t["muted-foreground"] };
  },
  pressedOpacity: 0.9,
};

// =============================================================================
// iOS (HIG page controls): pill-rounded cells, the active page filled primary.
// =============================================================================

export const iosSkin: PaginationSkin = {
  // Pill-rounded (radius 8), no border; the chevron reads as a plain glyph that is
  // truly hollow (transparent) on any host surface, so the numbered cells carry the
  // shape. Transparent (not `t.background`) keeps the control consistent on light,
  // dark, and glass surfaces (HIG page control: hollow rest).
  controlBox() {
    return {
      ...CELL_ROW,
      borderRadius: 8,
      backgroundColor: "transparent",
    };
  },
  // The active page is a filled `primary` pill (radius 8); inactive pages are
  // truly hollow (transparent) on any surface, no border (HIG dots: filled current,
  // hollow rest). Transparent, not `t.background`, so the resting look does not flip
  // between dark chips and invisible cells depending on the host surface.
  pageBox(t, selected) {
    return {
      ...CELL_ROW,
      borderRadius: 8,
      backgroundColor: selected ? t.primary : "transparent",
    };
  },
  // The rows-per-page selector: a muted-filled pill trigger (radius 8), value +
  // caret pushed apart, no border (iOS controls favor fills over outlines).
  selectorBox(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      borderRadius: 8,
      backgroundColor: t.muted,
    };
  },
  controlLabel(t) {
    // SF-scale control glyph reads slightly heavier on iOS.
    return { fontWeight: "600", color: t.foreground };
  },
  pageLabel(t, selected) {
    return { fontWeight: "600", color: selected ? t["primary-foreground"] : t.foreground };
  },
  mutedLabel(t) {
    return { color: t["muted-foreground"] };
  },
  gapLabel(t) {
    return { paddingHorizontal: 4, color: t["muted-foreground"] };
  },
  pressedOpacity: 0.8,
  // react-native-web paints the browser's blue keyboard-focus ring around a
  // focused Pressable; a real iOS device never shows it (native iOS feedback is
  // the press dim only). Suppress it so Tab-focusing a cell or chevron paints no
  // box. Web-only: `outlineStyle`/`outlineWidth` are not in RN's ViewStyle (hence
  // the cast inside FOCUS_RESET) and are ignored natively. Mirrors input/textarea.
  focusOutlineReset: FOCUS_RESET,
};

// =============================================================================
// Android (Material 3): flat cells, the active page a tonal primary fill.
// =============================================================================

export const androidSkin: PaginationSkin = {
  // Flat cell (radius 8), no border, transparent over the surface; the ripple is
  // the press feedback.
  controlBox() {
    return {
      ...CELL_ROW,
      borderRadius: 8,
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
      backgroundColor: "transparent",
    };
  },
  // The active page is a tonal fill (secondaryContainer ≈ alpha(primary, .12)),
  // M3's selected-cell treatment; inactive pages are flat/transparent.
  pageBox(t, selected) {
    return {
      ...CELL_ROW,
      borderRadius: 8,
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
      backgroundColor: selected ? alpha(t.primary, 0.12) : "transparent",
    };
  },
  // The selector trigger: a flat tonal pill (alpha(primary, .08)) with the value
  // and caret pushed apart; the ripple supplies the press feedback.
  selectorBox(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      borderRadius: 8,
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
      backgroundColor: alpha(t.primary, 0.08),
    };
  },
  controlLabel(t) {
    return { fontWeight: "500", color: t.foreground };
  },
  pageLabel(t, selected) {
    // labelMedium; the active page reads in the brand color (onSecondaryContainer ≈ primary).
    return { fontWeight: "500", color: selected ? primaryText(t) : t.foreground };
  },
  mutedLabel(t) {
    return { color: t["muted-foreground"] };
  },
  gapLabel(t) {
    return { paddingHorizontal: 4, color: t["muted-foreground"] };
  },
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
};
