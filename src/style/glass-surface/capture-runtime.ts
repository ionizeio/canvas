import { useCallback, type ComponentType, type Ref, type RefObject } from "react";
import { findNodeHandle, Platform, type View, type ViewProps } from "react-native";
import { captureTargetOwner } from "./capture-target.js";

type AvailabilityEvent = { nativeEvent: { targetId: number; available: boolean } };

interface CaptureHostProps extends ViewProps {
  ref?: Ref<View>;
  captureEnabled: boolean;
  onAvailabilityChange?: (event: AvailabilityEvent) => void;
}
interface CaptureFrostProps extends ViewProps {
  targetRef: RefObject<View | null>;
  intensity: number;
  tint: "light" | "dark";
}
interface CaptureModule {
  available?: boolean;
  PaintHost?: ComponentType<ViewProps>;
  CaptureHost?: ComponentType<CaptureHostProps>;
  FrostView?: ComponentType<CaptureFrostProps>;
}

declare const require: (id: string) => unknown;
let integration: CaptureModule | undefined;
try {
  integration = require("@ionizeio/canvas-blur") as CaptureModule;
} catch { /* Optional native module absent: use supported Expo frost or the solid skin. */ }

// A partial or older integration cannot preserve paint ownership. Resolve all
// three together so every consumer takes the same complete solid fallback.
export function resolveCaptureComponents(platform: string, module?: CaptureModule) {
  if (platform !== "android" || !module?.available || !module.PaintHost || !module.CaptureHost || !module.FrostView) return undefined;
  return { PaintHost: module.PaintHost, CaptureHost: module.CaptureHost, FrostView: module.FrostView };
}
const components = resolveCaptureComponents(Platform.OS, integration);
export const NativePaintHost = components?.PaintHost;
export const NativeCaptureHost = components?.CaptureHost;
export const NativeCaptureFrost = components?.FrostView;
export const nativeCaptureAvailable = components !== undefined;

/** Ignore delayed events from a replaced native host sharing the same React ref. */
export function useCaptureAvailability(targetRef: RefObject<View | null>) {
  return useCallback((event: AvailabilityEvent) => {
    const view = targetRef.current;
    if (view && findNodeHandle(view) === event.nativeEvent.targetId) {
      captureTargetOwner(targetRef)?.setAvailable(view, event.nativeEvent.available);
    }
  }, [targetRef]);
}
