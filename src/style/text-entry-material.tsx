import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useMaterialTheme } from "./glass-surface/use-material-theme.js";
import { isGlass } from "./glass-fill.js";
import { cornerRadii } from "./ripple-clip.js";

/** Clear web editing surfaces; native fields retain their stable material. */
export function useTextEntryMaterial(webSkin: boolean) {
  const liquid = webSkin && Platform.OS === "web";
  const theme = useMaterialTheme({ static: !liquid, layer: "control" });
  const foregroundStateBorder = liquid && isGlass(theme);
  const stateBorder = (shape: StyleProp<ViewStyle>, active: boolean) => {
    if (!foregroundStateBorder || !active) return null;
    const flat = StyleSheet.flatten(shape) ?? {};
    const border = Object.fromEntries(Object.entries(flat).filter(([key]) => key.startsWith("border"))) as ViewStyle;
    const width = flat.borderWidth ?? 0;
    for (const [key, value] of Object.entries(border)) {
      if (key.endsWith("Radius") && typeof value === "number") {
        (border as Record<string, unknown>)[key] = Math.max(0, value - width);
      }
    }
    return <View testID="text-entry-state-border" accessible={false} aria-hidden
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      // The host retains its transparent layout border. Inset the state stroke
      // inside its padding clip so grouped fields can keep overflow hidden.
      style={[border, StyleSheet.absoluteFill, { zIndex: 1, pointerEvents: "none" }]} />;
  };
  return {
    theme, foregroundStateBorder, stateBorder,
    paneProps: { static: !liquid, clear: liquid, layer: "control" as const },
  };
}

/**
 * The shape a GlassPane takes when it is the CHILD of the box it paints (an InputOTP cell,
 * the Command's trigger). An Input's pane is the field's sibling and covers the field's
 * whole box; a child pane fills the box's padding box, inside the box's border. It
 * therefore takes the corner radii alone, each inset by that border so the corners stay
 * concentric, and no border of its own: the clear well and its rim then sit flush inside
 * the box's ring, as an Input's do, and a material that keeps the pane's own paint (a
 * frost that resolves solid, such as Android's with no capture target) draws no second
 * outline inside the box's.
 */
export function paneShapeInside(shape: ViewStyle): ViewStyle {
  const inset = typeof shape.borderWidth === "number" ? shape.borderWidth : 0;
  const radii = cornerRadii(shape) as Record<string, unknown>;
  for (const [key, value] of Object.entries(radii)) {
    if (typeof value === "number") radii[key] = Math.max(0, value - inset);
  }
  return radii as ViewStyle;
}
