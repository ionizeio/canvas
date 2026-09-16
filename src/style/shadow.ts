import { Platform, type ViewStyle } from "react-native";

// Elevation presets, as ready-to-spread RN ViewStyle objects. The ladder is the
// Riskora kit's AMBIENT elevation: a shade with no offset that halos the surface
// evenly (the source's one shadow effect is a 0/0/20 drop in a 10% tint), tinted in
// the ink rather than pure black so it sits on the tinted page. `sm` keeps a 1px
// fall so a resting card still reads as lifted at the smallest step; every other
// level is centred. On native they resolve to the platform-correct shadow APIs (iOS
// `shadow*` props + Android `elevation`). On react-native-web the `shadow*` props are
// deprecated in favor of the cross-platform `boxShadow` string, so the web branch
// emits the equivalent boxShadow (the same conversion RN Web does internally, minus
// the console deprecation warning). Spread the result into a style: `{ ...shadow("md") }`.

export type ShadowLevel = "none" | "sm" | "DEFAULT" | "md" | "lg" | "xl";

// The shade is the light-scheme ink (`foreground`), so the halo reads as the surface's
// own shadow on the tinted page rather than as a gray smudge.
const INK = "#0d121b";

const NATIVE_SHADOWS: Record<ShadowLevel, ViewStyle> = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: { shadowColor: INK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 1, elevation: 1 },
  DEFAULT: { shadowColor: INK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  md: { shadowColor: INK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  lg: { shadowColor: INK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
  xl: { shadowColor: INK, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 12 },
};

// The same shades as a `boxShadow` string (offsetX offsetY blur color) for web; the
// CSS hand-off (styles/tokens/shadows.css) carries these verbatim.
const WEB_SHADOWS: Record<Exclude<ShadowLevel, "none">, string> = {
  sm: "0px 1px 2px rgba(13, 18, 27, 0.04)",
  DEFAULT: "0px 0px 20px rgba(13, 18, 27, 0.06)",
  md: "0px 0px 24px rgba(13, 18, 27, 0.1)",
  lg: "0px 0px 40px rgba(13, 18, 27, 0.14)",
  xl: "0px 0px 60px rgba(13, 18, 27, 0.18)",
};

/** The elevation preset for a level (defaults to the standard `shadow`). */
export function shadow(level: ShadowLevel = "DEFAULT"): ViewStyle {
  if (Platform.OS === "web") {
    return level === "none" ? { boxShadow: "none" } : { boxShadow: WEB_SHADOWS[level] };
  }
  return NATIVE_SHADOWS[level];
}

/**
 * A one-off drop shadow for components that need a shade off the preset scale. Returns
 * the platform-correct `shadow*` props (+ optional Android `elevation`) on native, and
 * the equivalent `boxShadow` string on web (so react-native-web does not warn). The
 * color must be a solid 6-digit hex; the opacity is applied to it.
 */
export function customShadow(opts: {
  color?: string;
  offsetY?: number;
  radius?: number;
  opacity?: number;
  elevation?: number;
}): ViewStyle {
  const { color = "#000000", offsetY = 1, radius = 2, opacity = 0.2, elevation } = opts;
  if (Platform.OS === "web") {
    return { boxShadow: `0px ${offsetY}px ${radius}px ${hexToRgba(color, opacity)}` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    ...(elevation != null ? { elevation } : null),
  };
}

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
