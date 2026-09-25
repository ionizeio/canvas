import { Platform } from "react-native";
import { createInputOTP } from "./input-otp.shared.js";
import { androidSkin } from "./input-otp.styles.js";

// React Native inks Android's cursor and selection handles in a colour on every version but
// Android 9 (API 28), which offers no way to recolour them (ReactTextInputManager's
// cursorColor and selectionHandleColor setters return early there), so they would paint the
// theme's accent over the middle of the row.
const INKS_CURSOR = Platform.Version !== 28;

// Android InputOTP: Material 3 has no one-time-code component, so its skin is the web's
// (Dark Factory's field frames). The capture input stays opaque and hides its ink instead:
// Android does not expose a zero-alpha view to TalkBack, so a see-through one could not be
// found. Its caret stays on and paints nothing, because Android's editor opens the long-press
// Paste popup only while the cursor is on, and a range the platform selects is kept, because
// its selection toolbar (Cut, Copy, Paste) lasts only as long as the range. On Android 9 the
// cursor and handles cannot be inked clear, so there the caret stays off and a range is
// pushed back to the end of the code, as before. Metro resolves this file on Android.
export const InputOTP = createInputOTP(androidSkin, {
  opaqueCapture: true,
  inklessCaret: INKS_CURSOR,
  visibleSelection: !INKS_CURSOR,
});
export type { InputOTPProps } from "./input-otp.shared.js";
