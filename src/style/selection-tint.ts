import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { channelsOf } from "./color.js";

// A glass selection pane keeps the skin's selected hue but never its full opacity:
// the pane sits over the track behind its label, and a translucent tint keeps the
// ink readable on both. The ceiling is lower in the dark scheme, where the material
// under it is already dim.
export function selectionTint(style: StyleProp<ViewStyle>, dark: boolean): string | undefined {
  const fill = StyleSheet.flatten(style)?.backgroundColor;
  if (typeof fill !== "string") return undefined;
  const channels = channelsOf(fill);
  if (!channels) return fill;
  const [red, green, blue, opacity] = channels;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(opacity, dark ? 0.46 : 0.72)})`;
}
