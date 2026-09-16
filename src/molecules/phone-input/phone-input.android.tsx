import { createPhoneInput } from "./phone-input.shared.js";
import { androidSkin } from "./phone-input.styles.js";

// Android (Material 3) PhoneInput. Metro resolves this file on Android; the docs
// import it for preview.
export const PhoneInput = createPhoneInput(androidSkin);
export type { PhoneInputProps, PhoneEntryProps } from "./phone-input.shared.js";
export { PHONE_COUNTRIES, flagOf, type PhoneCountry } from "./countries.js";
