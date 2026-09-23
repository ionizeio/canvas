import type { ColorScheme, GlassTokens, Palette } from "../tokens.js";
import { WEB_TINTS } from "./web-frost.js";

// The glass material's tints on the web (and a platform without its own file), one per
// density layer, for the active scheme and palette. The ThemeProvider publishes them as
// `theme.glass`; each platform resolves its own file (glass-tints.ts, .ios.ts,
// .android.ts), so a web material change never moves a native one. The web takes Dark
// Factory's frost tints (web-frost.ts, the tuned table), mint's own shell under the mint
// palette; iOS and Android keep the public `glassByScheme` (CLAUDE.md, design language
// item 6), one set for every palette.
export function glassTintsFor(scheme: ColorScheme, palette: Palette = "blush"): GlassTokens {
  return scheme === "light" && palette === "mint" ? WEB_TINTS.mint : WEB_TINTS[scheme];
}
