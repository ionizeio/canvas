import type { ViewStyle } from "react-native";
import type { ThemeValue } from "./theme.js";
import { alpha } from "./color.js";

// Fills INSIDE a glass surface. A pane that renders through GlassSurface is a
// translucent material, so an opaque `muted` row hover, a `secondary` selected tab or
// an `accent` active tile painted on it would sit as an opaque patch and break the
// layering. In glass mode these roles become a translucent tint of the scheme's ink
// (a few percent of `foreground`), which reads as the same emphasis over the material
// and lets it show through; in solid mode they are the opaque tokens they always were.
//
//   faint  a hover, an alternating row, a divider band
//   soft   a selected row, a muted panel, a resting chip
//   firm   a pressed or active fill, a selected pill
//
// Every shell reads the theme value it already holds, so no skin has to know the
// surface mode: `innerFill(theme, "muted")` where it used to paint `tokens.muted`.

export type InnerFillRole = "muted" | "secondary" | "accent";
export type InnerFillStrength = "faint" | "soft" | "firm";

const STRENGTH: Record<InnerFillStrength, { light: number; dark: number }> = {
  faint: { light: 0.04, dark: 0.06 },
  soft: { light: 0.06, dark: 0.09 },
  firm: { light: 0.10, dark: 0.14 },
};

/** The fill a role paints inside a surface: the opaque token in solid mode, an ink tint under glass. */
export function innerFill(theme: Pick<ThemeValue, "tokens" | "surface" | "dark">, role: InnerFillRole, strength: InnerFillStrength = "soft"): string {
  if (theme.surface !== "glass") return theme.tokens[role];
  const a = STRENGTH[strength];
  return alpha(theme.tokens.foreground, theme.dark ? a.dark : a.light);
}

/** Whether the theme is painting the glass material right now (the layered model). */
export function isGlass(theme: Pick<ThemeValue, "surface" | "reducedTransparency" | "increasedContrast">): boolean {
  return theme.surface === "glass" && !theme.reducedTransparency && !theme.increasedContrast;
}

/**
 * A skin fill INSIDE a glass pane: under glass its opaque `backgroundColor` is replaced
 * by the ink tint of the given strength (so a header band, a stripe or a pressed row
 * stays translucent over the material); in solid mode the style is returned as is.
 */
export function withInnerFill(theme: Pick<ThemeValue, "tokens" | "surface" | "dark">, style: ViewStyle, strength: InnerFillStrength = "soft"): ViewStyle {
  if (theme.surface !== "glass" || style.backgroundColor == null) return style;
  return { ...style, backgroundColor: innerFill(theme, "muted", strength) };
}
