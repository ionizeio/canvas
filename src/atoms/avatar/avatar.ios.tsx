import type { ReactNode } from "react";
import { createAvatar, createAvatarGroup } from "./avatar.shared.js";
import { createAvatarMenu } from "./avatar-menu.shared.js";
import { createDropdown } from "../dropdown/dropdown.shared.js";
import { iosSkin as dropdownIosSkin } from "../dropdown/dropdown.styles.js";
import { iosSkin, iosMenuSkin } from "./avatar.styles.js";
import { GlassSurface, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";

// iOS (HIG) Avatar. Metro resolves this file on iOS; the docs import it for preview.
//
// The initials fallback renders on Apple's real, INTERACTIVE Liquid Glass: a glass
// account chip that refracts the content behind it (a topbar avatar over the page) and
// responds to touch with the system fluid press animation. GlassSurface degrades on its
// own to the solid muted fill when the app is in solid surface mode or Reduce
// Transparency is on. Web and Android never receive this surface (createAvatar keeps
// their plain box and never imports GlassSurface), so the glass material is iOS-only.
function IosGlassAvatarSurface({ style, testID, children }: { style?: LayoutStyle; testID?: string; children?: ReactNode }) {
  return (
    <GlassSurface interactive style={style} testID={testID}>
      {children}
    </GlassSurface>
  );
}

export const Avatar = createAvatar(iosSkin, IosGlassAvatarSurface);
export const AvatarGroup = createAvatarGroup(iosSkin);

// The pill's menu is THIS platform's Dropdown, injected rather than imported: a bare
// import resolves the web module in a browser bundler, which would render the web menu
// under the iOS and Android pills in the docs. The hand-off stands the account menu off
// by 6 where a plain dropdown uses 4, and that lives in the skin, not in a prop.
const MenuDropdown = createDropdown({ ...dropdownIosSkin, menuGap: 6 });
export const AvatarMenu = createAvatarMenu(iosMenuSkin, MenuDropdown);
export type { AvatarProps, AvatarGroupProps } from "./avatar.shared.js";
export type { AvatarMenuProps } from "./avatar-menu.shared.js";
