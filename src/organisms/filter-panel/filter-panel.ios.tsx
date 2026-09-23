import { createFilterPanel } from "./filter-panel.shared.js";
import { iosSkin } from "./filter-panel.styles.js";
import { Badge as BadgeIOS } from "../../atoms/badge/badge.ios.js";
import { Button as ButtonIOS } from "../../atoms/button/button.ios.js";
import { Drawer as DrawerIOS } from "../drawer/drawer.ios.js";

// iOS (HIG) FilterPanel. Metro resolves this file on iOS; the docs import it for
// preview. The option rows mark a chosen filter with the iOS list's trailing check
// (the skin's optionMark, so no Checkbox is composed), the counts render the
// iOS-styled Badge, and the header Clear action the iOS ghost Button so the panel
// reads native. The literal `.ios` atom imports are required for the WEB docs
// 3-up, where a barrel import would resolve the web atoms.
export const FilterPanel = createFilterPanel(iosSkin, { Badge: BadgeIOS, Button: ButtonIOS, Drawer: DrawerIOS });
export type { FilterPanelProps, FilterOption, FilterGroup } from "./filter-panel.shared.js";
