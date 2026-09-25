import { createInputOTP } from "./input-otp.shared.js";
import { iosSkin } from "./input-otp.styles.js";

// iOS InputOTP: iOS ships no one-time-code control, so its skin is the web's (Dark
// Factory's field frames). The capture input stays opaque and hides its ink instead: UIKit
// neither hit-tests nor exposes to VoiceOver a view below 0.01 alpha, so a see-through one
// could not be tapped or found. Its selection band and grabbers take the selection colour's
// hue at an alpha of their own, so no colour hides them: the field keeps no range there, and a
// range is pushed back to the end of the code like a stray caret. Metro resolves this file on
// iOS.
export const InputOTP = createInputOTP(iosSkin, { opaqueCapture: true, visibleSelection: true });
export type { InputOTPProps } from "./input-otp.shared.js";
