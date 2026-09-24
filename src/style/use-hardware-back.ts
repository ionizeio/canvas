import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

// Hardware-back-to-dismiss for open overlays (Drawer, ActionSheet, Dialog and
// AlertDialog over the page, the Sidebar drill-down, and every card AnchoredOverlay
// floats: the menus, lists, popovers and peeks): the native mirror of useEscapeKey. While `active`, a BackHandler
// subscription catches the Android hardware/gesture back, calls `onBack` (close
// the overlay, or pop a level), and consumes the event so the app does not
// navigate back or exit underneath the overlay. BackHandler fires on Android
// only; on iOS the subscription is a documented no-op, but react-native-web's
// shim logs a console.error on EVERY addEventListener call ("BackHandler is not
// supported on web"), so on web we never subscribe at all. Like useEscapeKey,
// this is a behavioral guard around a platform-specific event API, not a
// web-only rendering branch, so it stays inside the kit's cross-platform rules.

export function useHardwareBack(
  /** Subscribe only while true (pass the overlay's open state). */
  active: boolean,
  /** Called when hardware back is pressed while active; the event is consumed. */
  onBack: () => void,
): void {
  // Latch the latest callback so the subscription never re-registers when the
  // caller passes a fresh closure each render (the usual `() => setOpen(false)`).
  const callback = useRef(onBack);
  callback.current = onBack;

  useEffect(() => {
    if (!active || Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      callback.current();
      return true;
    });
    return () => sub.remove();
  }, [active]);
}
