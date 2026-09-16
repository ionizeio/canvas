import { createPhoneInput } from "./phone-input.shared.js";
import { iosSkin } from "./phone-input.styles.js";

// iOS PhoneInput (the iOS input-field reference). Metro resolves this file on iOS;
// the docs import it for preview.
export const PhoneInput = createPhoneInput(iosSkin);
export type { PhoneInputProps, PhoneEntryProps } from "./phone-input.shared.js";
export { PHONE_COUNTRIES, flagOf, type PhoneCountry } from "./countries.js";
