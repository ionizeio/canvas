import { createFilterPanel } from "./filter-panel.shared.js";
import { androidSkin } from "./filter-panel.styles.js";
import { CheckboxIndicator as CheckboxAndroid } from "../../atoms/checkbox/indicator/index.android.js";
import { Badge as BadgeAndroid } from "../../atoms/badge/badge.android.js";
import { Button as ButtonAndroid } from "../../atoms/button/button.android.js";
import { Drawer as DrawerAndroid } from "../drawer/drawer.android.js";

// Material 3 FilterPanel. Metro resolves this file on Android; the docs import it
// for preview. The option rows render the M3-styled Checkbox, the counts the
// M3-styled Badge, and the header Clear action the M3 text Button so the panel
// reads native. The literal `.android` atom imports are required for the WEB docs
// 3-up, where a barrel import would resolve the web atoms.
export const FilterPanel = createFilterPanel(androidSkin, { CheckboxVisual: CheckboxAndroid, Badge: BadgeAndroid, Button: ButtonAndroid, Drawer: DrawerAndroid });
export type { FilterPanelProps, FilterOption, FilterGroup } from "./filter-panel.shared.js";
