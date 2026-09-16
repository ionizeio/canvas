import { createPhoneInput } from "./phone-input.shared.js";
import { webSkin } from "./phone-input.styles.js";

// Web PhoneInput (the base; Metro falls back to it on native, web bundlers resolve it).
export const PhoneInput = createPhoneInput(webSkin);
export type { PhoneInputProps, PhoneEntryProps } from "./phone-input.shared.js";
export { PHONE_COUNTRIES, flagOf, type PhoneCountry } from "./countries.js";
