import { StyleSheet } from "react-native";
import { NativeCaptureHost, useCaptureAvailability } from "./capture-runtime.js";
import { captureTargetOwner, useCaptureEnabled } from "./capture-target.js";
import type { GlassBackdropTargetProps } from "./glass-backdrop-target.js";

/** Only the decorative plane is sampled. Foreground surfaces are native siblings. */
export function GlassBackdropTarget({ targetRef, children }: GlassBackdropTargetProps) {
  const enabled = useCaptureEnabled(targetRef);
  const onAvailabilityChange = useCaptureAvailability(targetRef);
  if (!NativeCaptureHost) return children;
  return <NativeCaptureHost
    ref={captureTargetOwner(targetRef)?.attach ?? targetRef}
    captureEnabled={enabled}
    onAvailabilityChange={onAvailabilityChange}
    style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >{children}</NativeCaptureHost>;
}
