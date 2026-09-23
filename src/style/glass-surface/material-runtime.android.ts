import type { ComponentType } from "react";
import type { MaterialCapabilities } from "./material-resolution.js";
import type { FrostProps } from "./material-runtime.js";
import { nativeCaptureAvailable } from "./capture-runtime.js";

// Android's material runtime: expo-blur's frost, and the canvas-blur capture
// integration when the app installed it (capture-runtime.ts). The web and iOS runtimes
// are their own files. The optional peer is loaded through the guarded require that
// material-runtime.ts explains; keep the require directly inside the try block, or
// Metro registers it as a required dependency.
declare const require: (id: string) => unknown;
export let FrostView: ComponentType<FrostProps> | undefined;
export let requiresBlurTarget = false;
try {
  const mod = require("expo-blur") as { BlurView?: ComponentType<FrostProps>; BlurTargetView?: unknown };
  FrostView = mod.BlurView;
  requiresBlurTarget = mod.BlurTargetView !== undefined;
} catch { /* Optional peer absent: preserve the complete solid skin. */ }

export function materialCapabilities(): MaterialCapabilities {
  return {
    platform: "android",
    frost: nativeCaptureAvailable || FrostView !== undefined,
    lens: false,
    liquid: false,
    requiresTarget: nativeCaptureAvailable || requiresBlurTarget,
  };
}

/** Native never hydrates server markup, so the hook is the plain read; it exists so shared callers have one name. */
export function useMaterialCapabilities(): MaterialCapabilities {
  return materialCapabilities();
}
