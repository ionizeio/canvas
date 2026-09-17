import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { MaterialCapabilities } from "./material-resolution.js";
import { liquidGlassAvailable } from "./liquid-glass.js";

interface FrostProps { intensity: number; tint: "light" | "dark"; style: StyleProp<ViewStyle> }
interface LiquidProps {
  glassEffectStyle: "regular" | "clear";
  isInteractive: boolean;
  tintColor?: string;
  colorScheme: "light" | "dark";
  style: StyleProp<ViewStyle>;
}

declare const require: (id: string) => unknown;
export let FrostView: ComponentType<FrostProps> | undefined;
export let LiquidView: ComponentType<LiquidProps> | undefined;
try {
  FrostView = (require("expo-blur") as { BlurView?: ComponentType<FrostProps> }).BlurView;
} catch { /* Optional peer absent. */ }
try {
  LiquidView = (require("expo-glass-effect") as { GlassView?: ComponentType<LiquidProps> }).GlassView;
} catch { /* Optional peer absent. */ }

export function materialCapabilities(): MaterialCapabilities {
  return { platform: "ios", frost: FrostView !== undefined, liquid: LiquidView !== undefined && liquidGlassAvailable(), lens: false, requiresTarget: false };
}
