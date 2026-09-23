import { glassByScheme, type ColorScheme, type GlassTokens } from "../tokens.js";

// The glass material's tints on the web (and a platform without its own file), one per
// density layer, for the active scheme. The ThemeProvider publishes them as
// `theme.glass`; each platform resolves its own file (glass-tints.ts, .ios.ts,
// .android.ts), so a web material change never moves a native one. Today the web shares
// the native values; the Dark Factory frost gives the web its own tints (CLAUDE.md,
// design language item 6).
export function glassTintsFor(scheme: ColorScheme): GlassTokens {
  return glassByScheme[scheme];
}
