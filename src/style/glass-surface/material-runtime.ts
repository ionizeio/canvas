import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Platform } from "react-native";
import type { MaterialCapabilities } from "./material-resolution.js";
import { nativeCaptureAvailable } from "./capture-runtime.js";
import { glassLensRenderable } from "./glass-lens.js";

export interface FrostProps {
  intensity: number;
  tint: "light" | "dark";
  style: StyleProp<ViewStyle>;
  experimentalBlurMethod?: "dimezisBlurView";
  blurMethod?: "dimezisBlurView" | "none";
  blurTarget?: React.RefObject<import("react-native").View | null>;
}

declare const require: (id: string) => unknown;
export let FrostView: ComponentType<FrostProps> | undefined;
export let requiresBlurTarget = false;
try {
  const mod = require("expo-blur") as { BlurView?: ComponentType<FrostProps>; BlurTargetView?: unknown };
  FrostView = mod.BlurView;
  requiresBlurTarget = mod.BlurTargetView !== undefined;
} catch { /* Optional peer absent: preserve the complete solid skin. */ }

/** Browser frost uses the same RN style handoff as the existing shared lens. */
export function backdropFrostSupported(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function"
    && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
}

export function materialCapabilities(): MaterialCapabilities {
  const web = Platform.OS === "web";
  return {
    platform: web ? "web" : Platform.OS === "android" ? "android" : "other",
    frost: web ? backdropFrostSupported() : nativeCaptureAvailable || FrostView !== undefined,
    lens: web && glassLensRenderable(),
    liquid: false,
    requiresTarget: Platform.OS === "android" && (nativeCaptureAvailable || requiresBlurTarget),
  };
}
