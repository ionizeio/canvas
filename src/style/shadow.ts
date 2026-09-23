import { Platform, type ViewStyle } from "react-native";
import { lightColors, type ColorTokens } from "./tokens.js";

// Elevation presets, as ready-to-spread RN ViewStyle objects. The web ladder is Dark
// Factory's: a shade cast straight down with a negative spread, so it pools under the
// surface's lower edge instead of haloing it, tinted by the palette (`shade`, a violet
// wash in the light palettes and black in the dark one) so a card reads as lifted off
// the page rather than ringed in gray. sm is DF's tile, DEFAULT its card, md its hovered
// card, lg its popover (DF's 1px ring stays the skin's own border), and xl its dialog,
// the one top-layer shade, which is black at every palette because it separates a modal
// from whatever lies under it rather than lifting a surface off the page.
//
// On native the levels keep the platform geometry they always had (iOS `shadow*` props,
// Android `elevation`), retinted from the ink to the palette's shade. On
// react-native-web the `shadow*` props are deprecated in favor of the cross-platform
// `boxShadow` string, so the web branch emits boxShadow. Pass the active tokens to tint
// by the active palette: `{ ...shadow("md", t) }`. Without them the light palette's
// shade stands in.

export type ShadowLevel = "none" | "sm" | "DEFAULT" | "md" | "lg" | "xl";

// The web ladder's geometry, [offsetY, blur, spread], painted in the palette's shade.
const LADDER: Record<Exclude<ShadowLevel, "none" | "xl">, readonly [number, number, number]> = {
  sm: [16, 32, -22],
  DEFAULT: [20, 44, -24],
  md: [30, 54, -24],
  lg: [26, 50, -20],
};
// Dark Factory's dialog shade: a top-layer separator, the same on every palette.
const TOP_LAYER = "0px 50px 100px -30px rgba(0, 0, 0, 0.45)";

const NATIVE_SHADOWS: Record<Exclude<ShadowLevel, "none">, ViewStyle> = {
  sm: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 1.5, elevation: 1 },
  DEFAULT: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  md: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  lg: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
  xl: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 12 },
};

/** The palette's shade, or the light palette's when a caller passes no tokens. */
function shadeOf(tokens?: Pick<ColorTokens, "shade">): string {
  return tokens?.shade ?? lightColors.shade ?? "rgba(0, 0, 0, 0.2)";
}

/** An rgba() or hex colour as an opaque rgb(), for the native shadowColor (the level sets the opacity). */
function opaque(color: string): string {
  const functional = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(color);
  if (functional) return `rgb(${functional[1]}, ${functional[2]}, ${functional[3]})`;
  return color.length === 9 ? color.slice(0, 7) : color;
}

/**
 * The elevation preset for a level (defaults to the standard `shadow`), tinted by the
 * palette's `shade` when the active tokens are passed.
 */
export function shadow(level: ShadowLevel = "DEFAULT", tokens?: Pick<ColorTokens, "shade">): ViewStyle {
  if (Platform.OS === "web") {
    if (level === "none") return { boxShadow: "none" };
    if (level === "xl") return { boxShadow: TOP_LAYER };
    const [y, blur, spread] = LADDER[level];
    return { boxShadow: `0px ${y}px ${blur}px ${spread}px ${shadeOf(tokens)}` };
  }
  if (level === "none") return { shadowOpacity: 0, elevation: 0 };
  // The top layer stays black on native too, like the web's dialog shade.
  return { ...NATIVE_SHADOWS[level], shadowColor: level === "xl" ? "#000000" : opaque(shadeOf(tokens)) };
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
