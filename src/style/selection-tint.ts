import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { channelsOf } from "./color.js";

// A moving glass selection keeps the skin's selected hue but never its full
// opacity: the surface travels over the track and over labels in flight, and a
// translucent tint keeps the ink readable on both. The ceiling is lower in the
// dark scheme, where the material under it is already dim.
export function selectionTint(style: StyleProp<ViewStyle>, dark: boolean): string | undefined {
  const fill = StyleSheet.flatten(style)?.backgroundColor;
  if (typeof fill !== "string") return undefined;
  const channels = channelsOf(fill);
  if (!channels) return fill;
  const [red, green, blue, opacity] = channels;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(opacity, dark ? 0.46 : 0.72)})`;
}

// Only the selection's appearance travels (fill, borders, shadow); the source
// trigger keeps its own spacing and hit area.
export function selectionSurface(style: ViewStyle): ViewStyle {
  const surface: Record<string, unknown> = { backgroundColor: style.backgroundColor };
  for (const [key, value] of Object.entries(style)) {
    if (key.startsWith("border") || key.startsWith("shadow") || key === "boxShadow" || key === "elevation") surface[key] = value;
  }
  return surface as ViewStyle;
}
