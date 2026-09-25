import { Platform } from "react-native";
import { createInputOTP, type InputOTPParts } from "./input-otp.shared.js";
import { androidSkin } from "./input-otp.styles.js";

/**
 * The capture input's parts on an Android API level. React Native inks the cursor and the
 * selection handles in a colour only from Android 10 (API 29), through setTextCursorDrawable
 * and a colour filter on the handle drawables. Below it, it cannot: on Android 9 its
 * cursorColor and selectionHandleColor setters return early, and on 8.1 and older their
 * reflection looks the fields up on its own EditText subclass, which never declares them, so
 * nothing is recoloured and a caret or handle left on would paint the theme's accent over the
 * middle of the row. There the caret stays off and a range goes back to the end of the code,
 * as before. A parameter so the tests can build either in the web harness.
 */
export function androidParts(apiLevel: number): InputOTPParts {
  const inks = apiLevel >= 29;
  return { opaqueCapture: true, inklessCaret: inks, visibleSelection: !inks };
}

// Android InputOTP: Material 3 has no one-time-code component, so its skin is the web's
// (Dark Factory's field frames). The capture input stays opaque and hides its ink instead:
// Android does not expose a zero-alpha view to TalkBack, so a see-through one could not be
// found. From Android 10 its caret stays on and paints nothing, because Android's editor
// opens the long-press Paste popup only while the cursor is on, and a range the platform
// selects is kept, because its selection toolbar (Cut, Copy, Paste) lasts only as long as the
// range. Metro resolves this file on Android.
export const InputOTP = createInputOTP(androidSkin, androidParts(Number(Platform.Version)));
export type { InputOTPProps } from "./input-otp.shared.js";
