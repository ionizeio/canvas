import { createAvatar, createAvatarGroup } from "./avatar.shared.js";
import { createAvatarMenu } from "./avatar-menu.shared.js";
import { createDropdown } from "../dropdown/dropdown.shared.js";
import { iosSkin as dropdownIosSkin } from "../dropdown/dropdown.styles.js";
import { iosSkin, iosMenuSkin } from "./avatar.styles.js";

// iOS (HIG) Avatar. The shared shell chooses static identity material;
// GlassPane selects the real native frost for this platform.
export const Avatar = createAvatar(iosSkin);
export const AvatarGroup = createAvatarGroup(iosSkin);

// The pill's menu is THIS platform's Dropdown, injected rather than imported: a bare
// import resolves the web module in a browser bundler, which would render the web menu
// under the iOS and Android pills in the docs. The native account menu stands off by 6
// where a plain native dropdown uses 4, and that lives in the skin, not in a prop.
const MenuDropdown = createDropdown({ ...dropdownIosSkin, menuGap: 6 });
export const AvatarMenu = createAvatarMenu(iosMenuSkin, MenuDropdown);
export type { AvatarProps, AvatarGroupProps } from "./avatar.shared.js";
export type { AvatarMenuProps } from "./avatar-menu.shared.js";
