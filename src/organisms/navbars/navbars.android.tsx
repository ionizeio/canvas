import { createNavbar } from "./navbars.shared.js";
import { androidSkin } from "./navbars.styles.js";
// The literal `.android` import (not the barrel) is required for the WEB docs
// 3-up, where a bare import would resolve the web parts in every column.
import { Dropdown } from "../../atoms/dropdown/dropdown.android.js";
import { Button } from "../../atoms/button/button.android.js";
import { Avatar } from "../../atoms/avatar/avatar.android.js";

// Material 3 (top app bar) Navbar. Metro resolves this file on Android; the docs import it for preview.
export const Navbar = createNavbar(androidSkin, { Dropdown, Button, Avatar });
export type { NavbarProps } from "./navbars.shared.js";
