import { createCheckbox } from "./checkbox.shared.js";
import { iosSkin } from "./checkbox.styles.js";
import { Switch } from "../switch/switch.ios.js";

// iOS (HIG) Checkbox. Metro resolves this file on iOS; the docs import it for preview.
// iOS has no checkbox: a one-setting Checkbox renders the iOS switch, and a selection
// (`selection`, `indeterminate`) the edit-mode selection circle.
export const Checkbox = createCheckbox(iosSkin, { Standalone: Switch });
export type { CheckboxProps } from "./checkbox.shared.js";
