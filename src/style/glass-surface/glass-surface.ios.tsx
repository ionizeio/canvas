// Native iOS: intentional content frost and functional Apple Liquid Glass.
import { useContext } from "react";
import { Animated } from "react-native";
import { useTheme } from "../theme.js";
import { MaterialMotionContext } from "../popup-motion.js";
import { FrostView, LiquidView, useMaterialCapabilities } from "./material-runtime.ios.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, MaterialOriginContext, presentOpacity, brandOverMaterial, clearSurfaceTint, contrastBorder, SHEER_FILL_OPACITY, materialFill,
  surfaceUnderFill, surfaceIntensity, useMaterialFill, useSpecularRim, type GlassSurfaceProps, originFills,
} from "./glass-surface.shared.js";

// The native glass takes the moving shape's radius as a live style (react-native
// hands `style.borderRadius` to the native view as its corner prop), so a popup's
// droplet is Apple's own rounded edge, not a clip over a square material.
const AnimatedLiquidView = LiquidView ? Animated.createAnimatedComponent(LiquidView) : undefined;

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const { style, layer = "functional", brand, tint, clear, interactive = false } = props;
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), false);
  const solid = resolved.renderer === "solid";
  const translucent = props.sheer && layer === "content";
  // The layers wear the skin's radii, or the moving shape's while a popup opens.
  const fill = useMaterialFill(style);
  const rim = useSpecularRim(style, theme.dark);
  // The frost keeps the skin's corners: the animated clip shapes the droplet and the rim carries its edge.
  const frostFill = materialFill(style);
  const native = resolved.renderer === "liquid";
  // Liquid Glass takes a brand as its own tintColor and paints no fill for it; the
  // frost paints the fill, a brand one OVER the blur (see brandOverMaterial). A
  // hand-off pane paints its trigger's layer as a second under-fill, the two
  // cross-fading on the popup's travel (a sheer surface is content-only, so the sheer
  // opacity and the blend never meet).
  const origin = useContext(MaterialOriginContext);
  // A moving material is born faint: its under-fills ride the popup's presence (see
  // MaterialMotionContext); Apple's glass itself is never at a partial alpha (UIKit
  // drops a visual effect under one), and the frost's rim stays whole, so only the
  // fills thin.
  const presence = useContext(MaterialMotionContext)?.presence;
  const fillLayer = <Animated.View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens.background), opacity: presentOpacity(origin ? origin.blend.own : translucent ? SHEER_FILL_OPACITY : 1, presence) }]} />;
  const originLayer = origin ? originFills(origin, theme.tokens, theme.dark, theme.glass, theme.tokens.background, presence).map(({ color, opacity }, index) => <Animated.View key={index} style={[fill, { backgroundColor: color, opacity }]} />) : null;
  const paintsFill = !native || brand == null || tint != null;
  const over = !native && brandOverMaterial(brand, tint);
  const material = solid ? null : <>
    {paintsFill && !over ? <>{fillLayer}{originLayer}</> : null}
    {native && AnimatedLiquidView ? <AnimatedLiquidView glassEffectStyle={clear ? "clear" : "regular"} isInteractive={interactive} tintColor={brand} colorScheme={theme.dark ? "dark" : "light"} style={fill} />
      : FrostView ? <FrostView intensity={clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent)} tint={theme.dark ? "dark" : "light"} style={frostFill} /> : null}
    {paintsFill && over ? <>{fillLayer}{originLayer}</> : null}
    {!native ? <Animated.View style={rim} /> : null}
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorder(theme.tokens)] : style} solid={solid} material={material} />;
}
