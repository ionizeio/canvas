// The kit's typefaces, and how a loaded face is matched to a text style.
//
// React Native has no font loading of its own: an app registers faces (expo-font,
// a native asset, an @font-face rule on the web) and refers to them by the family
// name it registered. So the kit cannot bundle Manrope; it names the brand faces
// (`typeface`) and lets the app hand the registered families to the ThemeProvider
// (`fonts`), from which the themed Text/TextInput primitives (src/style/text.tsx)
// paint every kit label. With no `fonts` the kit renders in the platform's system
// face, exactly as before the brand faces existed, so no consumer breaks.
//
// Two shapes are accepted, because registrations come in two shapes:
// - ONE family name that carries every weight: a variable font, or a family the
//   platform resolves by weight (a web @font-face with a `font-weight` range, a
//   font installed on the OS). `fontWeight` stays on the style.
// - A MAP from weight to the face registered for it (expo-google-fonts ships one
//   module per weight: Manrope_400Regular, Manrope_500Medium, ...). The face
//   already encodes the weight, so the resolver picks the nearest registered face
//   and DROPS `fontWeight`: on iOS a weight on a single-weight family falls back
//   to the system face, and on the web the browser would synthesize a fake bold.

/** The RN string weights a style can carry. */
export type FontWeightKey = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

/** A registered typeface: one family for every weight, or a face per weight. */
export type FontFaces = string | Partial<Record<FontWeightKey, string>>;

/** The families an app hands to the ThemeProvider. Both optional: a missing face keeps the system default. */
export interface ThemeFonts {
  /** The text face (the brand's is `typeface.sans`). */
  sans?: FontFaces;
  /** The monospace face, substituted wherever the kit asks for `MONO_FONT`. */
  mono?: FontFaces;
}

/**
 * The brand faces by name: what the design specifies and what an app is expected
 * to register. Manrope is Dark Factory's face, registered there as static faces from
 * 400 to 800 (`@expo-google-fonts/manrope`); Geist Mono stays the kit's code face,
 * since Dark Factory has none and its x-height sits within a hundredth of an em of
 * Manrope's.
 */
export const typeface = {
  sans: "Manrope",
  mono: "Geist Mono",
} as const;

/**
 * Normalize an RN fontWeight (string, number, "bold"/"normal") to a weight key,
 * snapped to the hundreds the keys use (RN accepts e.g. "550" on some platforms).
 */
export function weightKey(weight: string | number | undefined): FontWeightKey {
  const n = weight === "bold" ? 700 : typeof weight === "number" ? weight : parseInt(String(weight ?? ""), 10);
  return (Number.isFinite(n) ? String(Math.min(900, Math.max(100, Math.round(n / 100) * 100))) : "400") as FontWeightKey;
}

export interface ResolvedFace {
  fontFamily: string;
  /** True when the face already carries its weight and the style's fontWeight must go. */
  dropWeight: boolean;
}

/**
 * Pick the registered face for a requested weight. A single family resolves as-is
 * (the platform picks the weight). A map resolves to the exact weight when it was
 * registered, else the nearest registered weight (ties go to the heavier face, so a
 * semibold request on a {400, 500, 700} registration reads as emphasis, not body).
 * Returns null when nothing was registered, so callers leave the style untouched.
 */
export function resolveFontFace(faces: FontFaces | undefined, weight: string | number | undefined): ResolvedFace | null {
  if (!faces) return null;
  if (typeof faces === "string") return { fontFamily: faces, dropWeight: false };
  const target = parseInt(weightKey(weight), 10);
  let fontFamily: string | undefined;
  let bestDistance = Infinity;
  for (const [key, family] of Object.entries(faces)) {
    const w = parseInt(key, 10);
    const distance = Math.abs(w - target);
    // On a tie the heavier face wins (keys iterate ascending, so it comes second).
    if (family && (distance < bestDistance || (distance === bestDistance && w > target))) {
      fontFamily = family;
      bestDistance = distance;
    }
  }
  return fontFamily ? { fontFamily, dropWeight: true } : null;
}
