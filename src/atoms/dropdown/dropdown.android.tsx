import { createDropdown } from "./dropdown.shared.js";
import { androidSkin } from "./dropdown.styles.js";
import { Button } from "../button/button.android.js";

// Material 3 (menu) Dropdown. Metro resolves this file on Android; the docs import it for preview.
export const Dropdown = createDropdown(androidSkin, { Button });
export type { DropdownProps, DropdownItem } from "./dropdown.shared.js";
