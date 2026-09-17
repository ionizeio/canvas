import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useMaterialTheme } from "./glass-surface/use-material-theme.js";
import { isGlass } from "./glass-fill.js";

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
