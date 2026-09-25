import type { TextStyle, ViewStyle } from "react-native";
import type { InnerFillStrength } from "./glass-fill.js";
import { hoverFill } from "./hover.js";
import { primaryText } from "./primary-text.js";
import { shadow } from "./shadow.js";
import { shape, type ColorTokens } from "./tokens.js";
import { typeScale } from "./type-scale.js";

// Dark Factory's menu, the one look every web menu takes: its Popover panel of MenuItems
// (~/Workspaces/Argus/Ui/Components/src/components/Popover.tsx). Internal, not re-exported;
// the web Dropdown and RowMenu skins read it, and so do the option lists (the web Select,
// Autocomplete and PhoneInput's countries) and the Listbox's chosen row, so no two menus
// can drift apart.
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
//
// An option list marks its chosen row. Dark Factory paints that row's label green; the kit
// keeps selection violet (the design language reserves green for calls to action, and green
// on the hover wash falls under 4.5:1 in blush) and never marks it by colour alone: the
// label in `primary-text` and a checkmark in `primary` in a gutter every row reserves, so
// labels line up whether or not a row is chosen, and no fill. An option list's panel is the
// menu's under the kit's list cap, scrolling inside it.

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
  return { backgroundColor: hoverFill(t) };
}

/** A row while pressed. */
export function menuRowPressed(t: ColorTokens): ViewStyle {
  return { backgroundColor: t.accent };
}

/**
 * How firm a pressed row's fill is inside a glass menu (the ink tint `withInnerFill` paints
 * for it), on every menu that tints a pressed row: the firm tint, or the soft one on a row
 * that carries a muted detail (a shortcut, a dial code). Over the dense list the firm tint
 * drops that detail to 4.1 to 4.3:1 and the soft one keeps it at 4.5:1 or more in every
 * palette; the row's own label keeps its contrast on either. Solid mode paints
 * `menuRowPressed` as it is.
 */
export function menuRowPressStrength(detail: boolean): InnerFillStrength {
  return detail ? "soft" : "firm";
}

/** The width of the checkmark gutter an option list reserves on every row. */
export const MENU_CHECK_WIDTH = 14;

/** The chosen row's checkmark: the row label's type in the selection violet, in its gutter. */
export function menuCheck(t: ColorTokens): TextStyle {
  return { width: MENU_CHECK_WIDTH, ...menuRowLabel, color: t.primary };
}

/** The chosen row's label, over the plain one: the selection violet's text role. */
export function menuChosenLabel(t: ColorTokens): TextStyle {
  return { color: primaryText(t) };
}

/** The tallest an option list's panel grows before its rows scroll. */
export const MENU_LIST_MAX_HEIGHT = 280;

/** An option list's panel: the menu's, capped, clipping its rows to the corner as they scroll. */
export function menuListPanel(t: ColorTokens): ViewStyle {
  return { ...menuPanel(t), maxHeight: MENU_LIST_MAX_HEIGHT, overflow: "hidden" };
}
