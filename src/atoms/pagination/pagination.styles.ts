import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, type TouchTargetSkin, alpha, platformMinTarget } from "../../style/index.js";
import { hoverFill, webHover } from "../../style/hover.js";

// The Pagination skin. Neither iOS nor Material 3 ships a numbered pagination (PLATFORM-
// REFERENCES.md), and Dark Factory has no pager either, so every platform takes one look
// built from Dark Factory's own parts:
//   - a page number is a bare pill in the foreground ink (DF's plain IconButton), and the
//     current page DF's violet pill (its selected Chip: `primary` under
//     `primary-foreground`);
//   - Previous and Next are DF's hairline circles (the web outline Button: a `border`
//     hairline on no fill) around a chevron icon;
//   - the rows-per-page trigger is the same hairline pill around the value and a
//     chevron-down;
//   - the counts ("Page 2 of 12", "Rows per page") are DF's muted meta text, and the
//     truncation gap an ellipsis icon in the same ink.
// A resting cell takes DF's hover wash at once on the web (the current page never does;
// native pointer hover waits on the owner, so the shared skin declares it through
// webHover). Disabled is DF's look rather than a dim: the inks go muted, the hairlines
// stay, and a disabled current page keeps only its edge, drawn in the 3:1 `input` line
// since that edge is all that marks it. The cells are the web Button's pill heights
// (29 / 36 / 40) in its label type, so a pager lines up with a Button beside it.
//
// The press feedback mechanism stays each platform's own: the ripple is Android's (a
// no-op elsewhere) and the dim the rest's (pressDim skips it on Android), at DF's 0.9.
// The skin declares each platform's minimum touch target (44pt HIG, 48dp Material) and
// the shell extends the touch area toward it with measured hitSlop; where the cells sit
// 4px apart (the pages, and the arrows beside them) it grows vertically only
// (src/style/touch-target.ts).

export type Size = "small" | "default" | "large";

export interface PaginationSkin extends TouchTargetSkin {
  /** A Previous/Next arrow: the box behind the chevron. */
  controlBox: (t: ColorTokens) => ViewStyle;
  /** A numbered page. The current page carries the brand fill; a disabled one keeps only its edge. */
  pageBox: (t: ColorTokens, selected: boolean, disabled?: boolean) => ViewStyle;
  /** The rows-per-page trigger box (value + chevron). */
  selectorBox: (t: ColorTokens) => ViewStyle;
  /** An arrow's chevron ink (its color) and the selector's value; muted while disabled. */
  controlLabel: (t: ColorTokens, disabled?: boolean) => TextStyle;
  /** A page number: brand-on-fill when current, muted while disabled. */
  pageLabel: (t: ColorTokens, selected: boolean, disabled?: boolean) => TextStyle;
  /** The muted counts, and the ink (its color) of the selector's chevron and the gap's ellipsis. */
  mutedLabel: (t: ColorTokens) => TextStyle;
  /** The instant hover look of a resting cell (never the current page, never while disabled); null where there is none. */
  hover: ((t: ColorTokens) => ViewStyle) | null;
  /** The press dim where there is no ripple (see pressDim). */
  pressedOpacity: number;
  /** The Android ripple over a pressed cell (a no-op elsewhere). */
  ripple: ((t: ColorTokens, selected: boolean) => { color: string; borderless: boolean }) | null;
}

// --- sizes (identical across platforms) --------------------------------------

// A page pill per size: the web Button's heights (button.styles.ts), a circle for a short
// number that widens into a pill for a long one.
export const itemSize: Record<Size, ViewStyle> = {
  small: { height: 29, minWidth: 29, paddingHorizontal: 8 },
  default: { height: 36, minWidth: 36, paddingHorizontal: 10 },
  large: { height: 40, minWidth: 40, paddingHorizontal: 12 },
};

// A Previous/Next arrow: a circle at the page pill's height.
export const arrowSize: Record<Size, ViewStyle> = {
  small: { width: 29, height: 29 },
  default: { width: 36, height: 36 },
  large: { width: 40, height: 40 },
};

// The rows-per-page trigger: the page pill's height, padded for its value and chevron.
export const selectorSize: Record<Size, ViewStyle> = {
  small: { height: 29, paddingHorizontal: 10 },
  default: { height: 36, paddingHorizontal: 12 },
  large: { height: 40, paddingHorizontal: 14 },
};

// Label type per size: the web Button's (whole-pixel line heights).
export const labelSize: Record<Size, TextStyle> = {
  small: { fontSize: 11.5, lineHeight: 15 },
  default: { fontSize: 12, lineHeight: 16 },
  large: { fontSize: 13, lineHeight: 18 },
};

// Chevron and ellipsis icon px per size (the ButtonGroup stepper's arrows).
export const iconSize: Record<Size, number> = { small: 14, default: 16, large: 16 };

// --- layout fragments (color-free; identical across platforms) ----------------

// Row of [prev, numbers, next] for the numbered default.
export const numberedRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// Compact row: Prev/Next bracketing the "Page X of N" label.
export const compactRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// With-size outer row: the selector group, the indicator, and the controls.
export const withSizeRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 16 };

// The "Rows per page" label + selector cluster.
export const selectorCluster: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// The Prev/Next pair inside the with-size row.
export const controlPair: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// The truncation gap: the ellipsis icon with a small inset (the row centres it on the pages).
export const gapBox: ViewStyle = { paddingHorizontal: 4 };

// The centered-row base every cell shares (the skin layers fill, border and corners on top).
const CELL_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "center" };

const PILL = 9999;

// =============================================================================
// Dark Factory's pager, on every platform.
// =============================================================================

export const webSkin: PaginationSkin = {
  controlBox: (t) => ({ ...CELL_ROW, borderRadius: PILL, borderWidth: 1, borderColor: t.border, backgroundColor: "transparent" }),
  // Every page keeps a 1px edge (transparent at rest) so the current page's fill and the
  // disabled current page's hairline never change a pill's size.
  pageBox: (t, selected, disabled) => ({
    ...CELL_ROW,
    borderRadius: PILL,
    borderWidth: 1,
    borderColor: !selected ? "transparent" : disabled ? t.input : t.primary,
    backgroundColor: selected && !disabled ? t.primary : "transparent",
  }),
  selectorBox: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    borderRadius: PILL,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: "transparent",
  }),
  controlLabel: (t, disabled) => ({ fontWeight: "700", color: disabled ? t["muted-foreground"] : t.foreground }),
  pageLabel: (t, selected, disabled) => ({
    fontWeight: "700",
    color: disabled ? t["muted-foreground"] : selected ? t["primary-foreground"] : t.foreground,
  }),
  mutedLabel: (t) => ({ fontWeight: "500", color: t["muted-foreground"] }),
  hover: webHover((t: ColorTokens): ViewStyle => ({ backgroundColor: hoverFill(t) })),
  pressedOpacity: 0.9,
  // The state layer in the cell's own ink, as Material's is.
  ripple: (t, selected) => ({ color: alpha(selected ? t["primary-foreground"] : t.foreground, 0.1), borderless: false }),
  minTarget: platformMinTarget(),
};

// No platform pagination control: the native skins are the web skin.
export const iosSkin: PaginationSkin = webSkin;
export const androidSkin: PaginationSkin = webSkin;
