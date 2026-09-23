// Web material host (and the fallback for a platform without its own host): Dark
// Factory's plain frost. The layer's tint, a backdrop blur with no saturation shift, and
// a 1px inset hairline; no refraction and no specular highlight. Every number is in
// web-frost.ts, the tuned table. Only decoration changes when appearance does. Android
// and iOS are their own files (glass-surface.android.tsx: the canvas-blur capture and
// expo-blur frost; glass-surface.ios.tsx: Liquid Glass and frost), so a web material
// change never reaches a native build.
import { Platform, View, type ViewStyle } from "react-native";
import { useTheme } from "../theme.js";
import { FrostView, useMaterialCapabilities, requiresBlurTarget } from "./material-runtime.js";
import { resolveMaterial } from "./material-resolution.js";
import { WEB_FROST, webRimColor } from "./web-frost.js";
import {
  GlassBox, CLEAR_INTENSITY, brandOverMaterial, clearSurfaceTint, contrastBorder, frostMethodProps,
  materialFill, surfaceUnderFill, surfaceIntensity, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const { layer = "functional", sheer, tint, brand, style, clear } = props;
  // No capture target here: the browser's backdrop filter samples the page itself, and
  // only Android's frost needs a target (glass-surface.android.tsx).
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), false);
  const solid = resolved.renderer === "solid";
  // Sheer is a content-only treatment. It must never thin a menu or error verdict.
  const translucent = sheer && layer === "content";
  const fill = materialFill(style);
  const blur = clear ? WEB_FROST.clearBlur : WEB_FROST.blur;
  const frost = blur > 0 ? `blur(${blur}px)` : undefined;
  const scheme = theme.dark ? "dark" : "light";
  const rim: ViewStyle = { ...fill, boxShadow: `inset 0 0 0 ${WEB_FROST.rimWidth}px ${webRimColor(layer, scheme, theme.tokens.border)}` };
  const tintLayer = <View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens), opacity: translucent ? WEB_FROST.sheerFillOpacity : 1 }]} />;
  // The fill paints beneath the material, except for a brand colour (see brandOverMaterial).
  const over = brandOverMaterial(brand, tint);
  // A platform without its own host and without a browser's backdrop filter frosts
  // through expo-blur when it is installed; the web never reaches that branch.
  const intensity = clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent);
  const material = solid ? null : <>
    {over ? null : tintLayer}
    {Platform.OS === "web"
      ? frost ? <View style={[fill, { backdropFilter: frost, WebkitBackdropFilter: frost } as ViewStyle]} /> : null
      : FrostView ? <FrostView intensity={intensity} tint={theme.dark ? "dark" : "light"} {...frostMethodProps(requiresBlurTarget, null)} style={fill} /> : null}
    {over ? tintLayer : null}
    <View style={rim} />
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorder(theme.tokens)] : style} solid={solid} material={material} />;
}
