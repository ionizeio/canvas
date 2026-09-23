// Web material host (and the fallback for a platform without its own host): the
// layer's tint, then the Chromium lens or the CSS backdrop frost, then the specular rim.
// Only decoration changes when appearance does. Android and iOS are their own files
// (glass-surface.android.tsx: the canvas-blur capture and expo-blur frost;
// glass-surface.ios.tsx: Liquid Glass and frost), so a web material change never
// reaches a native build.
import { useState } from "react";
import { Platform, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme.js";
import { useSizedGlassLens } from "./glass-lens.js";
import { FrostView, useMaterialCapabilities, requiresBlurTarget } from "./material-runtime.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, brandOverMaterial, clearSurfaceTint, contrastBorder, frostMethodProps,
  SHEER_FILL_OPACITY, materialFill, specularRim, surfaceUnderFill, surfaceIntensity, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

// The lens layer sizes its filter definition for its own box, measured on layout.
function GlassLensLayer({ style, clear }: { style: StyleProp<ViewStyle>; clear?: boolean }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const filter = useSizedGlassLens(size.w, size.h, clear);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w > 0 && h > 0) setSize((prev) => prev.w === w && prev.h === h ? prev : { w, h });
  };
  return <View onLayout={onLayout} style={[style, { backdropFilter: filter, pointerEvents: "none" } as ViewStyle]} />;
}

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const { layer = "functional", sheer, tint, brand, style, clear } = props;
  // No capture target here: the browser's backdrop filter samples the page itself, and
  // only Android's frost needs a target (glass-surface.android.tsx).
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), false);
  const solid = resolved.renderer === "solid";
  // Sheer is a content-only treatment. It must never thin a menu or error verdict.
  const translucent = sheer && layer === "content";
  const intensity = clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent);
  const fill = materialFill(style);
  const rim = specularRim(style, theme.dark);
  const frost = `blur(${intensity * 0.2}px) saturate(${clear ? 115 : 150}%)`;
  const tintLayer = <View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens), opacity: translucent ? SHEER_FILL_OPACITY : 1 }]} />;
  // The fill paints beneath the material, except for a brand colour (see brandOverMaterial).
  const over = brandOverMaterial(brand, tint);
  const material = solid ? null : <>
    {over ? null : tintLayer}
    {resolved.renderer === "lens" ? <GlassLensLayer style={fill} clear={clear} />
      : Platform.OS === "web" ? <View style={[fill, { backdropFilter: frost, WebkitBackdropFilter: frost } as ViewStyle]} />
      : FrostView ? <FrostView intensity={intensity} tint={theme.dark ? "dark" : "light"} {...frostMethodProps(requiresBlurTarget, null)} style={fill} /> : null}
    {over ? tintLayer : null}
    <View style={rim} />
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorder(theme.tokens)] : style} solid={solid} material={material} />;
}
