import { createSidebar } from "./sidebar.shared.js";
import { iosSkin } from "./sidebar.styles.js";
import { Drawer } from "../drawer/drawer.ios.js";
import { Badge } from "../../atoms/badge/badge.ios.js";

// iOS (HIG sidebar) Sidebar. Metro resolves this file on iOS; the docs import it for preview.
export const Sidebar = createSidebar(iosSkin, { Drawer, Badge });
export type { SidebarProps, SidebarItem, SidebarSection } from "./sidebar.shared.js";
