// Android material host: the layer's tint, then the canvas-blur capture frost when the
// app installed @ionizeio/canvas-blur and a safe capture target is ready, else
// expo-blur's frost, then the specular rim. Only decoration changes when appearance
// does. The web and iOS hosts are their own files (glass-surface.tsx and
// glass-surface.ios.tsx), so a web material change never reaches Android.
import { useContext } from "react";
import { View } from "react-native";
import { useTheme } from "../theme.js";
import { FrostView, useMaterialCapabilities, requiresBlurTarget } from "./material-runtime.android.js";
import { NativeCaptureFrost } from "./capture-runtime.js";
import { useReadyCaptureTarget, useCaptureDemand } from "./capture-target.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, brandOverMaterial, clearSurfaceTint, contrastBorderFor, frostMethodProps, GlassBlurTargetContext,
  SHEER_FILL_OPACITY, materialFill, specularRim, surfaceUnderFill, surfaceIntensity, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

const EMPTY_TARGET = { current: null };

export function GlassSurface(props: GlassSurfaceProps) {
  const theme = useTheme();
  const requestedTarget = useContext(GlassBlurTargetContext);
  const target = useReadyCaptureTarget(requestedTarget);
  const { layer = "functional", sheer, tint, brand, style, clear } = props;
  const resolved = resolveMaterial(theme, props, useMaterialCapabilities(), target !== null);
  const solid = resolved.renderer === "solid";
  useCaptureDemand(requestedTarget ?? EMPTY_TARGET, !solid && NativeCaptureFrost !== undefined);
  // Sheer is a content-only treatment. It must never thin a menu or error verdict.
  const translucent = sheer && layer === "content";
  const intensity = clear ? CLEAR_INTENSITY : surfaceIntensity(layer, translucent);
  const fill = materialFill(style);
  const rim = specularRim(style, theme.dark);
  const nativeCapture = NativeCaptureFrost !== undefined && target !== null && !solid;
  const tintLayer = <View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens), opacity: translucent ? SHEER_FILL_OPACITY : 1 }]} />;
  // The fill paints beneath the material, except over the capture frost (which samples
  // a separate plane) and for a brand colour (see brandOverMaterial).
  const over = nativeCapture || brandOverMaterial(brand, tint);
  const material = solid ? null : <>
    {over ? null : tintLayer}
    {NativeCaptureFrost && target ? <NativeCaptureFrost targetRef={target} intensity={intensity} tint={theme.dark ? "dark" : "light"} style={fill} />
      : FrostView ? <FrostView intensity={intensity} tint={theme.dark ? "dark" : "light"} {...frostMethodProps(requiresBlurTarget, target)} style={fill} /> : null}
    {over ? tintLayer : null}
    <View style={rim} />
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorderFor(theme.tokens, style, props.stateBorder)] : style} solid={solid} material={material} />;
}
