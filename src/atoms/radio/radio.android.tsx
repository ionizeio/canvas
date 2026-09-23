import { createRadio } from "./radio.shared.js";
import { createRadioGroup } from "./radio-group.shared.js";
import { androidSkin } from "./radio.styles.js";

// Material 3 Radio and RadioGroup. Metro resolves this file on Android; the docs import it for preview.
export const Radio = createRadio(androidSkin);
export const RadioGroup = createRadioGroup(androidSkin);
export type { RadioProps } from "./radio.shared.js";
export type { RadioGroupProps } from "./radio-group.shared.js";
