import { createCheckbox } from "./checkbox.shared.js";
import { androidSkin } from "./checkbox.styles.js";
import { Switch } from "../switch/switch.android.js";

// Material 3 Checkbox. Metro resolves this file on Android; the docs import it for preview.
// Material 3 sets a single setting with a switch, so a one-setting Checkbox renders the
// Android switch; a selection (`selection`, `indeterminate`) keeps the M3 checkbox.
export const Checkbox = createCheckbox(androidSkin, { Standalone: Switch });
export type { CheckboxProps } from "./checkbox.shared.js";
