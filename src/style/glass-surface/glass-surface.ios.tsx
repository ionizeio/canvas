// GlassSurface — iOS. Renders Apple's real Liquid Glass via expo-glass-effect's
// GlassView on iOS 26+ (gated by isLiquidGlassAvailable, which also honors the
// reduce-transparency accessibility setting); on iOS < 26 it falls to the same
// expo-blur frost the other platforms use; with neither module it degrades to a plain
// View carrying the skin's own opaque fill. Both modules are optional peer dependencies.

import type * as ExpoGlassTypes from "expo-glass-effect";
import type * as ExpoBlurTypes from "expo-blur";
import { View } from "react-native";
import { useTheme } from "../theme.js";
import { liquidGlassAvailable } from "./liquid-glass.js";
import {
  GlassBox,
  PlainSurface,
  degradedGlassSurface,
  specularRim,
  SHEER_FILL_OPACITY,
  materialFill,
  surfaceUnderFill,
  surfaceIntensity,
  type GlassSurfaceProps,
} from "./glass-surface.shared.js";

// Both modules are OPTIONAL peers: consumers without them must still build, so
// each is loaded with a guarded literal require (bundlers that have it installed
// include it; missing packages degrade to the translucent fallback) instead of a
// static import (which fails module resolution for everyone who skipped it).
declare const require: (id: string) => unknown;
let GlassView: typeof ExpoGlassTypes.GlassView | undefined;
let BlurView: typeof ExpoBlurTypes.BlurView | undefined;
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as
  // a REQUIRED dependency. See src/organisms/backdrop/skia-runtime.ts.
  GlassView = (require("expo-glass-effect") as { GlassView?: typeof ExpoGlassTypes.GlassView }).GlassView;
} catch {
  GlassView = undefined;
}
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as
  // a REQUIRED dependency. See src/organisms/backdrop/skia-runtime.ts.
  BlurView = (require("expo-blur") as { BlurView?: typeof ExpoBlurTypes.BlurView }).BlurView;
} catch {
  BlurView = undefined;
}

export function GlassSurface({ style, children, pointerEvents, testID, role, onLayout, onAccessibilityEscape, interactive = false, sheer, tint, brand, layer = "functional" }: GlassSurfaceProps) {
  const { surface, dark, tokens, glass, reducedTransparency, increasedContrast } = useTheme();
  // The under-fill behind the material: the caller's `tint` for a bright glass control
  // (the Slider knob), else the `brand` colour of a tinted puck, else the LAYER's own
  // glass tint. It is never the `popover` token: popover is the opaque fill of a menu
  // card, and borrowing it here is what once made every popover see-through in glass mode.
  const underFill = surfaceUnderFill(glass, layer, brand, tint, tokens.background);
  const intensity = surfaceIntensity(layer, sheer);

  if (surface !== "glass") {
    return (
      <PlainSurface style={style} pointerEvents={pointerEvents} testID={testID} role={role} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>
        {children}
      </PlainSurface>
    );
  }

  // Accessibility rungs (Reduce Transparency / Increase Contrast) win over every
  // material below, including the native GlassView: the wrapper's adaptation under
  // Increase Contrast is unverifiable, so the kit guarantees the opaque + bordered
  // result itself.
  const degraded = degradedGlassSurface({ reducedTransparency, increasedContrast, tokens }, { style, children, pointerEvents, testID, role, onLayout, onAccessibilityEscape });
  if (degraded) return degraded;

  // iOS 26+: the genuine system Liquid Glass material. The glass tint sits UNDER the
  // GlassView, exactly as the frost path below layers it under the blur: a bare
  // regular-glass panel composites nearly clear over a flat surface (and clear over the
  // page in a portaled overlay), which turns a fill-and-border-stripped glass bar or
  // dialog into an invisible hole. The tint guarantees a legible material (Apple:
  // functional-layer glass must stay legible) while the GlassView still refracts through
  // the remaining translucency. (The `GlassView &&` also narrows it for the JSX below;
  // liquidGlassAvailable() does the safe availability check.)
  //
  // A BRAND puck hands its colour to the GlassView's own `tintColor` instead: Apple's
  // tinted Liquid Glass is the prominent-button material (the colour saturates the
  // glass and the system keeps its ink legible), so the brand under-fill the lens and
  // frost paths need is dropped here, where layering both read as an opaque capsule.
  if (GlassView && liquidGlassAvailable()) {
    return (
      <GlassBox
        style={style}
        pointerEvents={pointerEvents}
        testID={testID}
        role={role}
        onLayout={onLayout}
        onAccessibilityEscape={onAccessibilityEscape}
        material={
          <>
            {brand == null || tint != null ? <View style={[materialFill(style), { backgroundColor: underFill, opacity: sheer ? SHEER_FILL_OPACITY : 1, pointerEvents: "none" }]} /> : null}
            <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={brand} colorScheme={dark ? "dark" : "light"} style={materialFill(style)} />
          </>
        }
      >
        {children}
      </GlassBox>
    );
  }

  // iOS < 26: the same frost as web/Android. The glass tint sits UNDER the blur so the
  // frost keeps a body (the blur alone is too faint over a flat surface), matching the
  // web/Android layering.
  if (BlurView) {
    return (
      <GlassBox
        style={style}
        pointerEvents={pointerEvents}
        testID={testID}
        role={role}
        onLayout={onLayout}
        onAccessibilityEscape={onAccessibilityEscape}
        material={
          <>
            <View style={[materialFill(style), { backgroundColor: underFill, opacity: sheer ? SHEER_FILL_OPACITY : 1, pointerEvents: "none" }]} />
            <BlurView intensity={intensity} tint={dark ? "dark" : "light"} style={materialFill(style)} />
            {/* Specular edge (below the content): a lit rim that supplies the surface's
                edge now that skin borders are stripped under glass. iOS 26's native
                GlassView above is never decorated. */}
            <View style={[specularRim(style, dark), { pointerEvents: "none" }]} />
          </>
        }
      >
        {children}
      </GlassBox>
    );
  }

  return (
    <PlainSurface style={style} pointerEvents={pointerEvents} testID={testID} role={role} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>
      {children}
    </PlainSurface>
  );
}
