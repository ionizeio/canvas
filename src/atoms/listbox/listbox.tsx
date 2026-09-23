import { createListbox } from "./listbox.shared.js";
import { webSkin } from "./listbox.styles.js";

// Web Listbox (the base; web bundlers resolve this, Metro falls back to it on
// native). Multi-select leads each row with the web selection Checkbox, the shell's
// default part.
export const Listbox = createListbox(webSkin);
export type { ListboxProps, ListboxItem } from "./listbox.shared.js";
