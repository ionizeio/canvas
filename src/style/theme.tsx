// The theme runtime: a ThemeProvider that supplies the active color scheme and
// token map, and a useTheme hook components read to paint with scheme-aware
// colors. This is the one piece of shared state the raw-RN components depend on;
// everything else they style with plain RN objects built from these tokens.

import { type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { colorsByScheme, type BreakpointKey, type ColorScheme, type ColorTokens, type GlassTokens } from "./tokens.js";
import { type ThemeFonts } from "./fonts.js";
import { actionOverride } from "./action.js";
import { glassTintsFor } from "./glass-surface/glass-tints.js";
import { SsrBreakpointContext } from "./responsive.js";
import { liquidGlassAvailable } from "./glass-surface/liquid-glass.js";
import { useReducedTransparency, useIncreasedContrast } from "./a11y-preferences.js";
import { ThemeContext } from "./theme-context.js";

// Surface preference. "glass" requests role-appropriate material through shared
// renderers; "solid" requests the complete opaque skin. Content/static material,
// functional/liquid material, density and interaction motion are separate choices.
// It is a theming dimension, like the color scheme, not a per-component prop. The
// ThemeProvider spells it as a boolean axis (`<ThemeProvider glass>` /
// `<ThemeProvider solid>`); when neither is passed the PLATFORM DEFAULT applies:
// glass on iOS 26+ (where native Liquid Glass supports the functional layer),
// solid everywhere else. This value type remains the resolved form the theme
// carries, and the provider's legacy `surface` prop still accepts it.
export type Surface = "solid" | "glass";

/**
 * Brand token overrides for the ThemeProvider `tokens` prop. Two shapes:
 *
 * - A flat `Partial<ColorTokens>` applies the same overrides to BOTH schemes
 *   (the common rebrand: `tokens={{ primary: "#7c3aed" }}`).
 * - A `{ light, dark }` object overrides each scheme separately, for brands
 *   whose colors shift between appearances.
 * - An explicit `primary-text` overrides brand text independently. A primary-only
 *   override keeps its existing text color; custom brands own their contrast.
 * - `destructive-text` behaves the same way for error/action text; a destructive-only
 *   override retains its existing text color without changing the fill contract.
 *
 * The two shapes are unambiguous because `ColorTokens` has no `light`/`dark` key.
 */
export type ThemeTokenOverrides =
  | Partial<ColorTokens>
  | { light?: Partial<ColorTokens>; dark?: Partial<ColorTokens> };

// Resolve the overrides that apply to the active scheme: a { light, dark } shape
// contributes its per-scheme set; a flat Partial applies to both schemes as-is.
function overridesFor(tokens: ThemeTokenOverrides | undefined, scheme: ColorScheme): Partial<ColorTokens> | undefined {
  if (!tokens) return undefined;
  if ("light" in tokens || "dark" in tokens) {
    return (tokens as { light?: Partial<ColorTokens>; dark?: Partial<ColorTokens> })[scheme];
  }
  return tokens as Partial<ColorTokens>;
}

export interface ThemeValue {
  scheme: ColorScheme;
  surface: Surface;
  tokens: ColorTokens;
  /**
   * The glass material's own tokens for the active scheme (the `glass-tint` fill
   * GlassSurface paints under the material). Always present, because it describes what
   * glass LOOKS like in this scheme; whether glass actually paints is `surface` plus the
   * two accessibility flags below, and GlassSurface owns that ladder. Nothing else may
   * read this: hand-painting the tint outside GlassSurface would bypass the ladder and
   * the material (see CLAUDE.md, "no component hand-paints glass").
   */
  glass: GlassTokens;
  /**
   * The typefaces the app registered (the ThemeProvider `fonts` prop, or `{}` when
   * it passed none). The themed Text/TextInput primitives read this to put the
   * brand face on every kit label; nothing else needs to.
   */
  fonts: ThemeFonts;
  dark: boolean;
  /** OS "Reduce Transparency" is on: GlassSurface renders opaque (Apple AX). */
  reducedTransparency: boolean;
  /** OS "Increase Contrast" is on: GlassSurface renders opaque + a contrasting border (Apple AX). */
  increasedContrast: boolean;
}

const NO_FONTS: ThemeFonts = {};
const FALLBACK: ThemeValue = {
  scheme: "light",
  surface: "solid",
  tokens: colorsByScheme.light,
  glass: glassTintsFor("light"),
  fonts: NO_FONTS,
  dark: false,
  reducedTransparency: false,
  increasedContrast: false,
};

export interface ThemeProviderProps {
  // Scheme axis (pick one; omit both to follow the OS appearance). The color
  // scheme spelled like every other Canvas axis: the prop name is the value.
  // `dark` wins when both are passed.
  /** Force the dark color scheme. */
  dark?: boolean;
  /** Force the light color scheme. */
  light?: boolean;
  /**
   * Legacy value form of the scheme axis ("light" | "dark"), kept for
   * back-compat and for config-driven code that already holds a `ColorScheme`
   * value (a stored preference, an <html> hook). The boolean axis above wins
   * when both are passed.
   */
  scheme?: ColorScheme;
  /**
   * The scheme the SERVER rendered, for SSR/SSG apps (Next.js and the like)
   * whose client scheme can differ from it (a stored preference, the OS).
   * Canvas resolves colors in JS and serializes them into the server HTML as
   * literal inline styles, so when the hydration render disagrees with that
   * HTML, React logs a mismatch and keeps the server's colors on any element
   * that never re-renders again: components stay stuck in the server's scheme.
   * With `ssrScheme` set, the provider renders it on the server AND for the
   * hydration render (matching the server HTML exactly), then applies the
   * requested scheme (the boolean axis or the legacy `scheme` prop) right
   * after mount; that switch re-renders every consumer, which writes the
   * real colors to the DOM. Pass the same value the server resolves (e.g. the
   * next-themes `defaultTheme`). Omit in client-only apps and on native.
   */
  ssrScheme?: ColorScheme;
  /**
   * The breakpoint bucket the SERVER should assume, for SSR/SSG apps (the
   * `ssrScheme` contract applied to the viewport axis). The server cannot
   * measure a window, so `useBreakpoint`/`useResponsive`/`useFormFactor`
   * resolve to the desktop `base` there by default; an app that knows it is
   * serving a narrow client (UA hints) passes the bucket the server should
   * render instead (e.g. "sm" for phones). The server render and the
   * hydration render use it, then the real measured bucket re-renders every
   * consumer right after hydration. Omit in client-only apps and on native.
   */
  ssrBreakpoint?: BreakpointKey | "base";
  // Surface axis (pick one; omit for the platform default: glass on iOS 26+, the
  // native system material for that layer, solid elsewhere). The theming-level
  // glass switch, spelled like every other Canvas axis; there is no per-component
  // glass prop. `glass` wins when both are passed.
  /** Request role-appropriate glass: stable content material and functional
   *  Liquid Glass where supported. Semantic tokens remain opaque. */
  glass?: boolean;
  /** Request complete opaque surfaces without glass effects, even on iOS 26+. */
  solid?: boolean;
  /**
   * Legacy value form of the surface axis ("solid" | "glass"), kept for
   * back-compat and for config-driven code that already holds a `Surface`
   * value. The boolean axis above wins when both are passed.
   */
  surface?: Surface;
  /**
   * Brand token overrides, merged over the active scheme's base tokens so a
   * consumer can rebrand the kit (e.g. `tokens={{ primary: "#7c3aed" }}`)
   * without forking the token files. Pass a flat `Partial<ColorTokens>` to
   * apply the same overrides to both schemes, or `{ light, dark }` to override
   * each scheme separately. These are the SEMANTIC tokens only; the glass material
   * carries its own fill (`glassByScheme`) and is never rewritten by a rebrand, so
   * the two are independent. Pass a stable reference (a module constant or a memoized
   * object); an inline literal re-creates the theme value on every render.
   */
  tokens?: ThemeTokenOverrides;
  /**
   * The typefaces the app registered, so the kit can paint its labels in the brand
   * face (`typeface.sans` is Urbanist, `typeface.mono` Geist Mono). Each entry is
   * either one family name that carries every weight (a variable font, an
   * OS-installed family) or a map from weight to the face registered for that
   * weight (expo-google-fonts style: `{ "400": "Urbanist_400Regular", "500":
   * "Urbanist_500Medium" }`). Omit it and the kit renders in the platform's system
   * face, as it always has. Pass a stable reference (a module constant); an inline
   * literal re-creates the theme value on every render.
   */
  fonts?: ThemeFonts;
  children: ReactNode;
}

// The platform default surface. iOS 26 renders the functional layer (bars, overlays)
// as Liquid Glass by default, so a Canvas app matches the OS there; every other
// platform (web, Android, iOS < 26, Reduce Transparency) defaults to solid.
function defaultSurface(): Surface {
  return liquidGlassAvailable() ? "glass" : "solid";
}

export function ThemeProvider({ dark, light, scheme, ssrScheme, ssrBreakpoint, glass, solid, surface, tokens, fonts, children }: ThemeProviderProps) {
  const system = useColorScheme();
  // Reading the accessibility preferences here (not deep in a leaf) is what makes
  // glass REACTIVE: when the user toggles Reduce Transparency / Increase Contrast,
  // the provider re-renders, so defaultSurface() is re-evaluated (on iOS 26 the
  // native liquidGlassAvailable() flips) and every GlassSurface below re-runs its
  // accessibility ladder against the fresh flags.
  const reducedTransparency = useReducedTransparency();
  const increasedContrast = useIncreasedContrast();
  // Until the post-mount effect runs, honor `ssrScheme` so the server output is
  // deterministic and the hydration render reproduces it exactly (see the prop
  // doc). When the prop is absent this stays on the single-pass path: no state
  // flip, no extra render.
  const [hydrated, setHydrated] = useState(ssrScheme == null);
  useEffect(() => {
    if (!hydrated) setHydrated(true);
  }, [hydrated]);
  // Axis first-match (dark over light), then the legacy value form, then the OS
  // appearance. Mirrors the surface axis below: the prop name is the value.
  const active: ColorScheme = hydrated
    ? (dark ? "dark" : light ? "light" : (scheme ?? (system === "dark" ? "dark" : "light")))
    : (ssrScheme as ColorScheme);
  // Axis first-match (glass over solid), then the legacy value form, then the
  // platform default. Mirrors every component axis: the prop name is the value.
  const resolved: Surface = glass ? "glass" : solid ? "solid" : (surface ?? defaultSurface());
  const value = useMemo<ThemeValue>(() => {
    // Merge order: scheme base, then brand overrides. That is the WHOLE token merge:
    // the surface mode does not touch the semantic set at all. Glass used to swap
    // `popover` translucent here, which made every popover-filled surface see-through
    // the moment the theme went to glass (menus and select lists included), and the
    // beak an SVG draws outside any GlassSurface with it. The material now owns its
    // own fill (glassByScheme), so `popover` and `card` stay opaque in every mode and
    // only what renders through GlassSurface reads as glass.
    const brand = overridesFor(tokens, active);
    const base = brand ? {
      ...colorsByScheme[active],
      ...brand,
      // A primary-only or destructive-only rebrand keeps its existing text color.
      // Explicit text roles can improve readability without changing those fills.
      // Undefined is omission, so it cannot erase the scheme's authored role.
      "primary-text": brand["primary-text"] ?? brand.primary ?? colorsByScheme[active]["primary-text"],
      "destructive-text": brand["destructive-text"] ?? brand.destructive ?? colorsByScheme[active]["destructive-text"],
      // A primary-only rebrand repaints the call-to-action too, fill and ink together;
      // an explicit `action` wins (see actionOverride).
      ...actionOverride(colorsByScheme[active], brand),
    } : colorsByScheme[active];
    return {
      scheme: active,
      surface: resolved,
      tokens: base,
      // The material's tokens for this scheme. The provider resolves WHICH mode is
      // active (`surface`, above) and publishes the accessibility flags; GlassSurface
      // applies the ladder (solid / Reduce Transparency / Increase Contrast render an
      // opaque surface, and the skin's own fill is already opaque now that glass never
      // rewrites it), so no token has to lie about its value to carry that decision.
      glass: glassTintsFor(active),
      fonts: fonts ?? NO_FONTS,
      dark: active === "dark",
      reducedTransparency,
      increasedContrast,
    };
  }, [active, resolved, tokens, fonts, reducedTransparency, increasedContrast]);
  const themed = <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
  // The viewport axis' server assumption rides the theme provider (the only
  // provider Canvas apps already mount); useBreakpoint reads it as its server
  // snapshot only, so omitting the prop costs nothing at runtime.
  return ssrBreakpoint != null ? (
    <SsrBreakpointContext.Provider value={ssrBreakpoint}>{themed}</SsrBreakpointContext.Provider>
  ) : (
    themed
  );
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext) ?? FALLBACK;
}
