import { AnchoredOverlay, type AnchoredOverlayProps } from "./anchored-overlay.js";
import { PopupMotionPolicy } from "./popup-motion.js";

/** Kit-owned popup policy. Deliberately absent from the public export barrels. */
export function LiquidAnchoredOverlay(props: AnchoredOverlayProps) {
  return <PopupMotionPolicy.Provider value><AnchoredOverlay {...props} /></PopupMotionPolicy.Provider>;
}
