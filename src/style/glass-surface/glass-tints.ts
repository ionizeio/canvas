import type { ColorScheme, GlassTokens } from "../tokens.js";
import { WEB_TINTS } from "./web-frost.js";

// The glass material's tints on the web (and a platform without its own file), one per
// density layer, for the active scheme. The ThemeProvider publishes them as
// `theme.glass`; each platform resolves its own file (glass-tints.ts, .ios.ts,
// .android.ts), so a web material change never moves a native one. The web takes Dark
// Factory's frost tints (web-frost.ts, the tuned table); iOS and Android keep the public
// `glassByScheme` (CLAUDE.md, design language item 6).
export function glassTintsFor(scheme: ColorScheme): GlassTokens {
  return WEB_TINTS[scheme];
}
