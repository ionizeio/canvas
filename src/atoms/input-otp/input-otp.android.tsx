import { createInputOTP } from "./input-otp.shared.js";
import { androidSkin } from "./input-otp.styles.js";

// Android InputOTP: Material 3 has no one-time-code component, so its skin is the web's
// (Dark Factory's field frames). Metro resolves this file on Android.
export const InputOTP = createInputOTP(androidSkin);
export type { InputOTPProps } from "./input-otp.shared.js";
