import { colorsFor, glassByScheme, type ColorScheme, type ColorTokens, type GlassTokens, type Palette } from "../../src/style/tokens.ts";
import { glassTintsFor } from "../../src/style/glass-surface/glass-tints.ts";
import { MINT_SELECTOR } from "../../tools/tokens/css-tokens.ts";

// The three looks the kit ships, one entry per palette in its scheme: blush (the light
// default), mint (the light alternative, `<ThemeProvider mint>`) and Dark Factory's one
// dark palette. The token-level legibility gates iterate these, so a palette the kit adds
// is held to every rule at once instead of to the ones someone remembered to extend.

export interface Look {
  /** The name a test title uses. */
  name: "blush" | "mint" | "dark";
  scheme: ColorScheme;
  palette: Palette;
  tokens: ColorTokens;
  /** The block of styles/tokens/colors.css that declares this look's palette. */
  selector: string;
  /** The web frost's tints under glass (web-frost.ts, through the web tint resolver). */
  webGlass: GlassTokens;
  /** The native glass tints (iOS Liquid Glass and frost, the Android blur): one per scheme. */
  nativeGlass: GlassTokens;
}

function look(name: Look["name"], scheme: ColorScheme, palette: Palette, selector: Look["selector"]): Look {
  return { name, scheme, palette, tokens: colorsFor(palette, scheme), selector, webGlass: glassTintsFor(scheme, palette), nativeGlass: glassByScheme[scheme] };
}

export const LOOKS: readonly Look[] = [
  look("blush", "light", "blush", ":root"),
  look("mint", "light", "mint", MINT_SELECTOR),
  look("dark", "dark", "blush", ".dark"),
];

/** The ThemeProvider props that render a look. */
export function lookProps(l: Look): { scheme: ColorScheme; mint: boolean } {
  return { scheme: l.scheme, mint: l.palette === "mint" };
}
