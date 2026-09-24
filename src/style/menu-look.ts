import type { TextStyle, ViewStyle } from "react-native";
import { shadow } from "./shadow.js";
import { shape, type ColorTokens } from "./tokens.js";
import { typeScale } from "./type-scale.js";

// Dark Factory's menu, the one look every web menu takes: its Popover panel of MenuItems
// (~/Workspaces/Argus/Ui/Components/src/components/Popover.tsx). Internal, not re-exported;
// the web Dropdown and RowMenu skins read it, so the two menus cannot drift apart.
//
// The panel is the `popover` card at the menu corner with an 8px inset, Dark Factory's
// popover shadow and its hairline. Dark Factory draws the hairline as a 1px ring outside
// the box; the kit keeps it as the card's own 1px `border`, the same line one pixel in,
// which is what the glass material replaces with its rim. Rows sit 2px apart: an 8px
// corner, 8 x 10 padding and a 12.5 / 700 label at Dark Factory's 1.3 line height (33
// tall), with 14px icons. A resting row takes the `hover` wash at once, as Dark Factory's
// do; a pressed one the firmer `accent`. The section heading is Dark Factory's eyebrow
// (MenuSection), a trailing detail its muted caption, and a disabled row Dark Factory's
// muted ink rather than a dim.

/** The panel: shape, fill, hairline, shadow and inset. The shell adds the measured minimum width. */
export function menuPanel(t: ColorTokens): ViewStyle {
  return {
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 8,
    ...shadow("lg", t),
  };
}

/** The space between rows, and between the trigger and the panel (Dark Factory's popover offset). */
export const MENU_ROW_GAP = 2;
export const MENU_OFFSET = 8;

/** A row: the icon, the label and any trailing detail on one line. */
export const menuRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
};

/** The row label: Dark Factory's strong body at the MenuItem's 1.3 line height. */
export const menuRowLabel: TextStyle = { ...typeScale.bodyStrong, lineHeight: 17 };

/** The leading icon, sized to the 12.5px label. */
export const MENU_ICON = 14;

/** The section heading above the rows: Dark Factory's eyebrow in the muted ink. */
export function menuSection(t: ColorTokens): TextStyle {
  return { ...typeScale.eyebrow, paddingTop: 6, paddingHorizontal: 10, paddingBottom: 4, color: t["muted-foreground"] };
}

/** A trailing detail (a shortcut, a count): Dark Factory's muted caption. */
export function menuDetail(t: ColorTokens): TextStyle {
  return { ...typeScale.caption, marginStart: "auto", color: t["muted-foreground"] };
}

/** The hairline between groups. */
export function menuSeparator(t: ColorTokens): ViewStyle {
  return { height: 1, marginTop: 4, marginBottom: 4, backgroundColor: t.border };
}

/** A resting row under the pointer. */
export function menuRowHover(t: ColorTokens): ViewStyle {
  return { backgroundColor: t.hover };
}

/** A row while pressed. */
export function menuRowPressed(t: ColorTokens): ViewStyle {
  return { backgroundColor: t.accent };
}
