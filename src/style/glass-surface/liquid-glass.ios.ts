// Whether Apple's real Liquid Glass material is available on this iOS device —
// true on iOS 26+ with Reduce Transparency off (isLiquidGlassAvailable honors that
// accessibility setting), false otherwise. This drives BOTH the GlassSurface
// material choice AND the theme runtime's platform default (glass-by-default on
// iOS 26). Extracted into its own platform file so the theme runtime can import it
// without pulling in the GlassSurface/theme cycle, and so web/Android get the false
// stub (no expo-glass-effect import).
//
// isLiquidGlassAvailable() resolves the native ExpoGlassEffect module on first call
// (requireNativeModule), which THROWS when that module is not in the build (the
// optional peer dep was not linked, or the dev client predates it). The optional
// peer-dependency contract is graceful degradation, so swallow that and report false.

// expo-glass-effect is an OPTIONAL peer: consumers without it must still build,
// so it is loaded with a guarded literal require instead of a static import.
declare const require: (id: string) => unknown;
let ExpoGlass: { GlassView?: unknown; isLiquidGlassAvailable?: () => boolean } | undefined;
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as
  // a REQUIRED dependency. See src/style/glass-surface/material-runtime.ts.
  ExpoGlass = require("expo-glass-effect") as typeof ExpoGlass;
} catch {
  ExpoGlass = undefined;
}

const GlassView = ExpoGlass?.GlassView;
const isLiquidGlassAvailable = ExpoGlass?.isLiquidGlassAvailable;

export function liquidGlassAvailable(): boolean {
  if (!GlassView || !isLiquidGlassAvailable) return false;
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
