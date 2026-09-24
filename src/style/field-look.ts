import type { TextStyle, ViewStyle } from "react-native";
import { destructiveText } from "./destructive-text.js";
import { fieldBorder, fieldFill } from "./field-colors.js";
import { shape, type ColorTokens } from "./tokens.js";
import { typeScale } from "./type-scale.js";

// Dark Factory's text field, the one look every web field takes: its TextField and
// FieldFrame (~/Workspaces/Argus/Ui/Components/src/components/fields.tsx). Internal, not
// re-exported; the web Input, Textarea and Field skins read it (PhoneInput reads it through
// the Input skin), so the field families cannot drift apart. It sits beside menu-look.ts,
// the recipe of the menus a field opens.
//
// The frame is Dark Factory's: a 10px corner, a 1px border and the translucent white
// `field-fill` well (in dark it lifts the field off the card, as Dark Factory's does). The
// border is `ring` on focus (Dark Factory's accent2 exactly) and `destructive` on an error,
// which Dark Factory does not have; at rest it is the kit's `field-border`, a step darker
// than Dark Factory's line on purpose (the disclosed trade-off in field-colors.ts). The value
// is 13 / 600 with a 12px inset; the base field is Dark Factory's, 40 tall, and small and
// large are derived, as the Button's large was (Dark Factory has one field size): a pixel of
// type and 2px of vertical inset either way (34 and 46 tall). A multiline field keeps Dark
// Factory's 10 x 12 inset at every size. The label is Dark Factory's eyebrow in the muted ink,
// 6 above the box at every size, and the helper, message and count lines its `small` type.
// Dark Factory has no disabled field: a disabled one takes the disabled look of its buttons
// and menu rows (the frame on the `border` hairline with no fill, the value in the muted
// ink, no dim). Addons, glyphs and the clear and password affordances have no Dark Factory
// equivalent and keep the kit's anatomy in Dark Factory's parts: the addon box on `muted`
// (Dark Factory's card2) with a `field-border` divider, glyphs at its SearchField's 15px with
// its 10px gap to the text.

export type FieldSize = "small" | "base" | "large";

/** The frame's state: error wins over focus. */
export interface FieldFrameState {
  focused: boolean;
  error: boolean;
}

/** The border by state: `destructive` on an error, `ring` on focus, the resting field line otherwise. */
export function fieldEdge(t: ColorTokens, { focused, error }: FieldFrameState): string {
  return error ? t.destructive : focused ? t.ring : fieldBorder(t);
}

/** The frame: the field corner, the 1px border by state and the field well. */
export function fieldFrame(t: ColorTokens, state: FieldFrameState): ViewStyle {
  return {
    borderRadius: shape.web.field,
    borderWidth: 1,
    borderColor: fieldEdge(t, state),
    backgroundColor: fieldFill(t),
  };
}

/** The horizontal inset of the value (and of an addon's text). */
export const FIELD_INSET = 12;

/** The vertical inset of a multiline field (a single-line field is centered in its height). */
export const FIELD_INSET_Y = 10;

/** The single-line box height per size: Dark Factory's 40 at base (its 10px inset around the value). */
export const FIELD_HEIGHT: Record<FieldSize, number> = { small: 34, base: 40, large: 46 };

// The value per size: Dark Factory's 13 / 600 at base, a step either way. Single-line line
// heights keep the box's inset even (the height less the border, less the line, halved);
// multiline takes Dark Factory's 1.5 ratio, rounded up to a whole pixel.
const VALUE: Record<FieldSize, { fontSize: number; lineHeight: number; multiline: number }> = {
  small: { fontSize: 12, lineHeight: 16, multiline: 18 },
  base: { fontSize: 13, lineHeight: 18, multiline: 20 },
  large: { fontSize: 14, lineHeight: 20, multiline: 21 },
};

/** The value's type in a single-line field. */
export function fieldValue(size: FieldSize): TextStyle {
  const v = VALUE[size];
  return { fontSize: v.fontSize, lineHeight: v.lineHeight, fontWeight: "600" };
}

/** The value's type in a multiline field. */
export function fieldMultilineValue(size: FieldSize): TextStyle {
  const v = VALUE[size];
  return { fontSize: v.fontSize, lineHeight: v.multiline, fontWeight: "600" };
}

/** The label above the box: Dark Factory's eyebrow in the muted ink, at every size. */
export function fieldLabel(t: ColorTokens): TextStyle {
  return { ...typeScale.eyebrow, color: t["muted-foreground"] };
}

/** The gap between the label and the box. */
export const FIELD_LABEL_GAP = 6;

/** A helper, message or count line under the box: Dark Factory's `small`, muted or the error text. */
export function fieldNote(t: ColorTokens, error: boolean): TextStyle {
  return { ...typeScale.small, color: error ? destructiveText(t) : t["muted-foreground"] };
}

/** How a disabled field reads: its frame (and each addon box) and the ink of its value. */
export interface FieldDisabledLook {
  frame: ViewStyle;
  ink: string;
}

/**
 * The disabled field: the frame on the `border` hairline with no fill and the value in the
 * muted ink, with no dim. A disabled field the keyboard reaches keeps its `ring` so focus
 * stays visible; it shows no error edge (its message, under a Field, still does).
 */
export function fieldDisabled(t: ColorTokens, focused: boolean): FieldDisabledLook {
  return { frame: { borderColor: focused ? t.ring : t.border, backgroundColor: "transparent" }, ink: t["muted-foreground"] };
}

/** A prefix or suffix addon box: `muted` with a `field-border` divider on the field side. */
export function fieldAddon(t: ColorTokens, side: "left" | "right"): ViewStyle {
  return {
    justifyContent: "center",
    backgroundColor: t.muted,
    paddingHorizontal: FIELD_INSET,
    borderColor: fieldBorder(t),
    ...(side === "left" ? { borderEndWidth: 1 } : { borderStartWidth: 1 }),
  };
}

/** The glyph size (a leading or trailing icon, the clear and password glyphs). */
export const FIELD_ICON = 15;

/** The gap between a glyph and the value. */
export const FIELD_ICON_GAP = 10;

/** The value's inset beside a glyph: the field inset, the glyph and its gap. */
export const FIELD_ICON_GUTTER = FIELD_INSET + FIELD_ICON + FIELD_ICON_GAP;
