import { createInputOTP } from "./input-otp.shared.js";
import { iosSkin } from "./input-otp.styles.js";

// iOS InputOTP: iOS ships no one-time-code control, so its skin is the web's (Dark
// Factory's field frames). Metro resolves this file on iOS.
export const InputOTP = createInputOTP(iosSkin);
export type { InputOTPProps } from "./input-otp.shared.js";
