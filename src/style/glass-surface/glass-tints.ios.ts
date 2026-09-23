import { glassByScheme, type ColorScheme, type GlassTokens } from "../tokens.js";

// The glass material's tints on iOS, under Liquid Glass and the iOS frost, one per
// density layer, for the active scheme. The ThemeProvider publishes them as
// `theme.glass`; each platform resolves its own file (glass-tints.ts, .ios.ts,
// .android.ts), so a web material change never moves a native one. The owner froze the
// native tints: native glass keeps its own material and tints (CLAUDE.md, design
// language item 6).
export function glassTintsFor(scheme: ColorScheme): GlassTokens {
  return glassByScheme[scheme];
}
