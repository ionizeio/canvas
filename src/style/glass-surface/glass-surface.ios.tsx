// Native iOS: intentional content frost and functional Apple Liquid Glass.
import { View } from "react-native";
import { useTheme } from "../theme.js";
import { FrostView, LiquidView, useMaterialCapabilities } from "./material-runtime.ios.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, brandOverMaterial, clearSurfaceTint, contrastBorderFor, SHEER_FILL_OPACITY, materialFill,
  specularRim, surfaceUnderFill, surfaceIntensity, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const { style, layer = "functional", brand, tint, clear, interactive = false } = props;
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), false);
  const solid = resolved.renderer === "solid";
  const translucent = props.sheer && layer === "content";
  const fill = materialFill(style);
  const rim = specularRim(style, theme.dark);
  const native = resolved.renderer === "liquid";
  // Liquid Glass takes a brand as its own tintColor and paints no fill for it; the
  // frost paints the fill, a brand one OVER the blur (see brandOverMaterial).
  const fillLayer = <View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens), opacity: translucent ? SHEER_FILL_OPACITY : 1 }]} />;
  const paintsFill = !native || brand == null || tint != null;
  const over = !native && brandOverMaterial(brand, tint);
  const material = solid ? null : <>
    {paintsFill && !over ? fillLayer : null}
    {native && LiquidView ? <LiquidView glassEffectStyle={clear ? "clear" : "regular"} isInteractive={interactive} tintColor={brand} colorScheme={theme.dark ? "dark" : "light"} style={fill} />
      : FrostView ? <FrostView intensity={clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent)} tint={theme.dark ? "dark" : "light"} style={fill} /> : null}
    {paintsFill && over ? fillLayer : null}
    {!native ? <View style={rim} /> : null}
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorderFor(theme.tokens, style, props.stateBorder)] : style} solid={solid} material={material} />;
}
