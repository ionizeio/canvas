import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Platform } from "react-native";
import type { MaterialCapabilities } from "./material-resolution.js";
import { nativeCaptureAvailable } from "./capture-runtime.js";
import { glassLensRenderable } from "./glass-lens.js";
import { useHydrated } from "../use-hydrated.js";

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

// What a server assumes about the browser it is rendering for: frost, never the
// lens. Frost is one `backdrop-filter` blur, which every evergreen engine renders,
// and where an engine does not the markup still degrades to the layer's tint fill.
// The lens is Chromium-only and needs a user agent to say so, which a server never has.
const SERVER_WEB_CAPABILITIES: MaterialCapabilities = { platform: "web", frost: true, lens: false, liquid: false, requiresTarget: false };

/**
 * The capabilities a surface renders with, safe to read during render on every
 * platform. On the web the probes above (`CSS.supports`, the user agent) are facts
 * only the browser knows, so a server render cannot see them and a hydration render
 * must not act on them: React would find markup the server never shipped and rebuild
 * the tree. Both of those renders get the server assumption instead, and the real
 * probes land in the commit right after, the same contract `useHydrated` gives the
 * viewport axis. A plain client render (no server markup) reads the probes at once.
 */
export function useMaterialCapabilities(): MaterialCapabilities {
  const hydrated = useHydrated();
  return Platform.OS === "web" && !hydrated ? SERVER_WEB_CAPABILITIES : materialCapabilities();
}
