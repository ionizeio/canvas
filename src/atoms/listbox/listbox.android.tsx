import { createListbox } from "./listbox.shared.js";
import { androidSkin } from "./listbox.styles.js";
import { CheckboxIndicator } from "../checkbox/indicator/index.android.js";

// Material 3 Listbox. Material 3 has no listbox control (the exposed dropdown menu
// is the select idiom), so the rows keep the web look: androidSkin is the same
// object as webSkin, and multi-select leads each row with the Material 3 checkbox
// (the Android selection Checkbox), passed as the CheckboxIndicator part. The
// android_ripple on each row supplies the native press feedback. Metro resolves this
// file on Android; the docs import it for preview.
export const Listbox = createListbox(androidSkin, { CheckboxIndicator });
export type { ListboxProps, ListboxItem } from "./listbox.shared.js";
