// Native iOS: intentional content frost and functional Apple Liquid Glass.
import { View } from "react-native";
import { useTheme } from "../theme.js";
import { FrostView, LiquidView, useMaterialCapabilities } from "./material-runtime.ios.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, clearSurfaceTint, contrastBorder, specularRim, SHEER_FILL_OPACITY, materialFill,
  surfaceUnderFill, surfaceIntensity, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const { style, layer = "functional", brand, tint, clear, interactive = false } = props;
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), false);
  const solid = resolved.renderer === "solid";
  const translucent = props.sheer && layer === "content";
  const fill = materialFill(style);
  const native = resolved.renderer === "liquid";
  const material = solid ? null : <>
    {!native || brand == null || tint != null ? <View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens.background), opacity: translucent ? SHEER_FILL_OPACITY : 1 }]} /> : null}
    {native && LiquidView ? <LiquidView glassEffectStyle={clear ? "clear" : "regular"} isInteractive={interactive} tintColor={brand} colorScheme={theme.dark ? "dark" : "light"} style={fill} />
      : FrostView ? <FrostView intensity={clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent)} tint={theme.dark ? "dark" : "light"} style={fill} /> : null}
    {!native ? <View style={specularRim(style, theme.dark)} /> : null}
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorder(theme.tokens)] : style} solid={solid} material={material} />;
}
