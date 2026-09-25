import { createInputOTP } from "./input-otp.shared.js";
import { iosSkin } from "./input-otp.styles.js";

// iOS InputOTP: iOS ships no one-time-code control, so its skin is the web's (Dark
// Factory's field frames). The capture input stays opaque and hides its ink instead: UIKit
// neither hit-tests nor exposes to VoiceOver a view below 0.01 alpha, so a see-through one
// could not be tapped or found. Metro resolves this file on iOS.
export const InputOTP = createInputOTP(iosSkin, { opaqueCapture: true });
export type { InputOTPProps } from "./input-otp.shared.js";
