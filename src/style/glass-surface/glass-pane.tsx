// GlassPane: the glass material as a layer BEHIND a node's own content, for the
// surfaces a component cannot hand to GlassSurface outright because the node that
// draws them also owns something else: a Pressable's tap, ripple and pressed dim, an
// alert's live-region semantics, a text field's native input. The parent keeps its
// layout, its accessibility and its interaction; it drops its opaque fill under glass
// (see `paneStyle`) and renders a GlassPane as its first child, which paints the
// layer's tint, material and rim across the parent's box, clipped to the parent's
// corners, with taps passing through. In solid mode it renders nothing at all, so the
// solid tree is byte-identical to the pre-glass one.

import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme.js";
import { isGlass } from "../glass-fill.js";
import { GlassSurface } from "./glass-surface.js";
import type { GlassLayer } from "./glass-surface.shared.js";

export interface GlassPaneProps {
  /** The layer of the glass model the parent belongs to (see GlassSurface). */
  layer?: GlassLayer;
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

export function GlassPane({ layer = "control", shape, tint, brand, interactive, testID }: GlassPaneProps) {
  const theme = useTheme();
  if (!isGlass(theme)) return null;
  const flat = (StyleSheet.flatten(shape) ?? {}) as ViewStyle;
  const radii: ViewStyle = {
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
  return <GlassSurface layer={layer} tint={tint} brand={brand} interactive={interactive} pointerEvents="none" testID={testID} style={[StyleSheet.absoluteFill, radii]} />;
}

/**
 * A surface style for a node that renders a GlassPane behind its content: under
 * glass its opaque fill and its border are dropped (the pane's material and rim carry
 * them; a border would double the rim), in solid mode it is returned unchanged.
 */
export function paneStyle(glass: boolean, style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  if (!glass) return style;
  return [style, { backgroundColor: "transparent", borderColor: "transparent" }];
}

/**
 * The style a TextInput takes when it sits beside a GlassPane. React Native Web
 * leaves a text input unpositioned (its View and Text are `position: relative`), and
 * CSS paints positioned boxes after in-flow ones, so the absolutely positioned pane
 * would paint OVER the input's text on the web; positioning the input restores the
 * sibling order. Native paints siblings in order regardless, so this is a no-op there.
 */
export const PANE_SIBLING_INPUT: ViewStyle = { position: "relative" };
