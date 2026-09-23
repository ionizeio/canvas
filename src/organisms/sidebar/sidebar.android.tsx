import { createSidebar } from "./sidebar.shared.js";
import { androidSkin } from "./sidebar.styles.js";
import { Drawer } from "../drawer/drawer.android.js";
import { Badge } from "../../atoms/badge/badge.android.js";

// Material 3 (navigation drawer) Sidebar. Metro resolves this file on Android; the docs import it for preview.
export const Sidebar = createSidebar(androidSkin, { Drawer, Badge });
export type { SidebarProps, SidebarItem, SidebarSection } from "./sidebar.shared.js";
