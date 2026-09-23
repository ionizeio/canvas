import { createNavbar } from "./navbars.shared.js";
import { iosSkin } from "./navbars.styles.js";
// The literal `.ios` import (not the barrel) is required for the WEB docs 3-up,
// where a bare import would resolve the web parts in every column.
import { Dropdown } from "../../atoms/dropdown/dropdown.ios.js";
import { Button } from "../../atoms/button/button.ios.js";
import { Avatar } from "../../atoms/avatar/avatar.ios.js";

// iOS (HIG navigation bar) Navbar. Metro resolves this file on iOS; the docs import it for preview.
export const Navbar = createNavbar(iosSkin, { Dropdown, Button, Avatar });
export type { NavbarProps } from "./navbars.shared.js";
