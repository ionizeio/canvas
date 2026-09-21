// GlassPane: the glass material as a layer BEHIND a node's own content, for the
// surfaces a component cannot hand to GlassSurface outright because the node that
// draws them also owns something else: a Pressable's tap, ripple and pressed dim, an
// alert's live-region semantics, a text field's native input. The parent keeps its
// layout, its accessibility and its interaction; it drops its opaque fill under glass
// (see `paneStyle`) and renders a GlassPane as its first child, which paints the
// layer's tint, material and rim across the parent's box, clipped to the parent's
// corners, with taps passing through. In solid mode it renders nothing at all, so the
// solid tree is byte-identical to the pre-glass one.

import { useContext } from "react";
import { Animated, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type ThemeValue } from "../theme.js";
import { isGlass } from "../glass-fill.js";
import { PopupHandoffContext, shapeRadius } from "../popup-handoff.js";
import { GlassSurface } from "./glass-surface.js";
import { contrastBorder, type GlassLayer } from "./glass-surface.shared.js";

export interface GlassPaneProps {
  /** The layer of the glass model the parent belongs to (see GlassSurface). */
  layer?: GlassLayer;
  /** Stable frost independent of control/content density. */
  static?: boolean;
  /** Clear refraction with minimal frost instead of the usual material haze. */
  clear?: boolean;
  /** The parent's shape style: its corner radii shape the pane's clip and rim. */
  shape?: StyleProp<ViewStyle>;
  /** A `tint` override for the under-fill (see GlassSurface). */
  tint?: string;
  /** A `brand` colour for a brand-tinted puck (see GlassSurface). */
  brand?: string;
  /** Interactive Liquid Glass on iOS 26 (see GlassSurface). */
  interactive?: boolean;
  /** E2E hook forwarded to the pane. */
  testID?: string;
}

export function GlassPane({ layer = "control", shape, tint, brand, interactive, testID, static: stable, clear }: GlassPaneProps) {
  const theme = useTheme();
  // Inside a Dropdown-class trigger the pane takes part in the button-to-menu hand-off
  // (popup-handoff.tsx): it reports its shape, so the pill's corner is the pane's
  // progress-0 corner, and hides in place while the menu's material stands in for it.
  const handoff = useContext(PopupHandoffContext);
  if (!isGlass(theme)) return null;
  const flat = (StyleSheet.flatten(shape) ?? {}) as ViewStyle;
  const radii: ViewStyle = {
    backgroundColor: flat.backgroundColor,
    borderWidth: flat.borderWidth,
    borderColor: flat.borderColor,
    borderStyle: flat.borderStyle,
    borderRadius: flat.borderRadius,
    borderTopLeftRadius: flat.borderTopLeftRadius,
    borderTopRightRadius: flat.borderTopRightRadius,
    borderBottomLeftRadius: flat.borderBottomLeftRadius,
    borderBottomRightRadius: flat.borderBottomRightRadius,
    borderTopStartRadius: flat.borderTopStartRadius,
    borderTopEndRadius: flat.borderTopEndRadius,
    borderBottomStartRadius: flat.borderBottomStartRadius,
    borderBottomEndRadius: flat.borderBottomEndRadius,
    borderCurve: flat.borderCurve,
  };
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith("border")) (radii as Record<string, unknown>)[key] = value;
  }
  if (!handoff) return <GlassSurface static={stable} clear={clear} layer={layer} tint={tint} brand={brand} interactive={interactive} pointerEvents="none" testID={testID} style={[StyleSheet.absoluteFill, radii, { zIndex: -1 }]} />;
  const report = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) handoff.report({ radius: shapeRadius(radii), width, height, layer });
  };
  // The wrapper carries the hand-off's material opacity (1 or 0, never between; see
  // HANDOFF_RETURN) and its re-forming scale (whole at rest, growing back under a
  // closing drop), so the surface underneath keeps the same tree it has elsewhere.
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: -1, opacity: handoff.material, transform: [{ scale: handoff.growth }] }]}>
      <GlassSurface static={stable} clear={clear} layer={layer} tint={tint} brand={brand} interactive={interactive} pointerEvents="none" testID={testID} style={[StyleSheet.absoluteFill, radii]} onLayout={report} />
    </Animated.View>
  );
}

/**
 * A surface style for a node that renders a GlassPane behind its content: under
 * glass its opaque fill and its border are dropped (the pane's material and rim carry
 * them; a border would double the rim), in solid mode it is returned unchanged.
 */
export function paneStyle(appearance: boolean | ThemeValue, style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  const glass = typeof appearance === "boolean" ? appearance : isGlass(appearance);
  if (!glass) return typeof appearance !== "boolean" && appearance.increasedContrast
    ? [style, contrastBorder(appearance.tokens)] : style;
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const clear: Record<string, unknown> = { backgroundColor: "transparent", borderColor: "transparent" };
  for (const key of Object.keys(flat)) {
    if (key.startsWith("border") && key.endsWith("Color")) clear[key] = "transparent";
  }
  return [style, clear as ViewStyle];
}

/**
 * The style a TextInput takes when it sits beside a GlassPane. React Native Web
 * leaves a text input unpositioned (its View and Text are `position: relative`), and
 * CSS paints positioned boxes after in-flow ones, so the absolutely positioned pane
 * would paint OVER the input's text on the web; positioning the input restores the
 * sibling order. Native paints siblings in order regardless, so this is a no-op there.
 */
export const PANE_SIBLING_INPUT: ViewStyle = { position: "relative" };
