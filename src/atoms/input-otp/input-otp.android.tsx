import { createInputOTP } from "./input-otp.shared.js";
import { androidSkin } from "./input-otp.styles.js";

// Android InputOTP: Material 3 has no one-time-code component, so its skin is the web's
// (Dark Factory's field frames). The capture input stays opaque and hides its ink instead:
// Android does not expose a zero-alpha view to TalkBack, so a see-through one could not be
// found. Metro resolves this file on Android.
export const InputOTP = createInputOTP(androidSkin, { opaqueCapture: true });
export type { InputOTPProps } from "./input-otp.shared.js";
