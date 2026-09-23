import { createListbox } from "./listbox.shared.js";
import { iosSkin } from "./listbox.styles.js";

// iOS (HIG) Listbox. iOS has no listbox control, so the rows keep the kit's look, but
// a choice is marked the way an iOS list marks it: a trailing check on every chosen
// row, in single and multi select alike, so no selection Checkbox is composed. Metro
// resolves this file on iOS; the docs import it for preview.
export const Listbox = createListbox(iosSkin);
export type { ListboxProps, ListboxItem } from "./listbox.shared.js";
