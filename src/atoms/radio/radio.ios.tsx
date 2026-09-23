import { createRadio } from "./radio.shared.js";
import { createRadioGroup } from "./radio-group.shared.js";
import { iosSkin } from "./radio.styles.js";

// iOS (HIG) Radio and RadioGroup: iOS has no radio button, so a single choice is a
// checkmark list (the inline picker of a grouped Form). Metro resolves this file on
// iOS; the docs import it for preview.
export const Radio = createRadio(iosSkin);
export const RadioGroup = createRadioGroup(iosSkin);
export type { RadioProps } from "./radio.shared.js";
export type { RadioGroupProps } from "./radio-group.shared.js";
