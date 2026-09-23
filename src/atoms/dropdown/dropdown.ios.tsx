import { createDropdown } from "./dropdown.shared.js";
import { iosSkin } from "./dropdown.styles.js";
import { Button } from "../button/button.ios.js";

// iOS (HIG pull-down menu) Dropdown. Metro resolves this file on iOS; the docs import it for preview.
export const Dropdown = createDropdown(iosSkin, { Button });
export type { DropdownProps, DropdownItem } from "./dropdown.shared.js";
