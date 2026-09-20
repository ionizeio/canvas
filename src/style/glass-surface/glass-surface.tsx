// Shared native/web material host. Only decoration changes when appearance does.
import { useContext, useState } from "react";
import { Animated, Platform, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme.js";
import { useSizedGlassLens } from "./glass-lens.js";
import { type PopupSize } from "../popup-motion.js";
import { FrostView, useMaterialCapabilities, requiresBlurTarget } from "./material-runtime.js";
import { NativeCaptureFrost } from "./capture-runtime.js";
import { useReadyCaptureTarget, useCaptureDemand } from "./capture-target.js";
import { resolveMaterial } from "./material-resolution.js";
import {
  GlassBox, CLEAR_INTENSITY, brandOverMaterial, clearSurfaceTint, contrastBorder, frostMethodProps, GlassBlurTargetContext,
  MaterialOriginContext, MaterialShapeContext, SHEER_FILL_OPACITY, materialFill, surfaceUnderFill, surfaceIntensity, useMaterialFill, useSpecularRim, type GlassSurfaceProps,
} from "./glass-surface.shared.js";

const EMPTY_TARGET = { current: null };

// The lens layer sizes its filter definition for its own box, measured on layout,
// except while its surface MOVES: a popup's material wrapper is resized on almost
// every frame of the opening spring, and a definition per layout there is a fresh
// data-URI SVG document for Chromium to parse and two commits on this layer per
// frame. A moving lens takes the bounds the frame settles at (the popup's measured
// card, MaterialShapeContext.rest) and holds that ONE definition through the travel,
// so the layer never re-measures and the rest is exactly the definition its own
// layout would have acquired. The map is anchored at the layer's top-left, so while
// the pane is smaller than its rest the left and top rims bend and the right and
// bottom bands sit past the edge (the 2026-09-20 rows of tools/native/liquid-motion.md
// record how that reads); at rest the layout is the resting box and every band is
// in place. A change of mode remounts the node (the key): react-native-web decides
// whether a node is observed for layout when the node mounts and never revisits it,
// so a layer that stopped moving on the same node (Reduce Motion switched on under
// an open popup) would carry its handler again but never be measured.
function GlassLensLayer({ style, clear }: { style: Animated.WithAnimatedValue<ViewStyle>; clear?: boolean }) {
  const rest = useContext(MaterialShapeContext)?.rest;
  return <LensLayer key={rest ? "rest" : "layout"} style={style} clear={clear} rest={rest} />;
}

function LensLayer({ style, clear, rest }: { style: Animated.WithAnimatedValue<ViewStyle>; clear?: boolean; rest?: PopupSize }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const filter = useSizedGlassLens(rest ? rest.width : size.w, rest ? rest.height : size.h, clear);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w > 0 && h > 0) setSize((prev) => prev.w === w && prev.h === h ? prev : { w, h });
  };
  return <Animated.View onLayout={rest ? undefined : onLayout} style={[style, { backdropFilter: filter, pointerEvents: "none" } as ViewStyle]} />;
}

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
  // The layers wear the skin's radii, or the moving shape's while a popup opens.
  const fill = useMaterialFill(style);
  const rim = useSpecularRim(style, theme.dark);
  // The native frosts keep the skin's own corners: the animated clip above them
  // shapes the droplet and the rim carries its edge.
  const frostFill = materialFill(style);
  const frost = `blur(${intensity * 0.2}px) saturate(${clear ? 115 : 150}%)`;
  const nativeCapture = NativeCaptureFrost !== undefined && target !== null && !solid;
  // A hand-off pane paints its trigger's layer as a second under-fill, the two
  // cross-fading on the popup's travel (a sheer surface is content-only, so the
  // sheer opacity and the blend never meet).
  const origin = useContext(MaterialOriginContext);
  const tintLayer = <Animated.View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, layer, brand, tint ?? (clear && brand == null ? clearSurfaceTint(theme.tokens, theme.dark) : undefined), theme.tokens.background), opacity: origin ? origin.blend.own : translucent ? SHEER_FILL_OPACITY : 1 }]} />;
  const originLayer = origin ? <Animated.View style={[fill, { backgroundColor: surfaceUnderFill(theme.glass, origin.layer, undefined, undefined, theme.tokens.background), opacity: origin.blend.trigger }]} /> : null;
  // The fill paints beneath the material, except over the Android capture frost
  // (which samples a separate plane) and for a brand colour (see brandOverMaterial).
  const over = nativeCapture || brandOverMaterial(brand, tint);
  const material = solid ? null : <>
    {over ? null : <>{tintLayer}{originLayer}</>}
    {resolved.renderer === "lens" ? <GlassLensLayer style={fill} clear={clear} />
      : Platform.OS === "web" ? <Animated.View style={[fill, { backdropFilter: frost, WebkitBackdropFilter: frost } as ViewStyle]} />
      : NativeCaptureFrost && target ? <NativeCaptureFrost targetRef={target} intensity={intensity} tint={theme.dark ? "dark" : "light"} style={frostFill} />
      : FrostView ? <FrostView intensity={intensity} tint={theme.dark ? "dark" : "light"} {...frostMethodProps(requiresBlurTarget, target)} style={frostFill} /> : null}
    {over ? <>{tintLayer}{originLayer}</> : null}
    <Animated.View style={rim} />
  </>;
  return <GlassBox {...props} style={theme.increasedContrast ? [style, contrastBorder(theme.tokens)] : style} solid={solid} material={material} />;
}
