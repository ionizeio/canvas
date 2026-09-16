import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens } from "../../style/index.js";
import { fieldBorder } from "../../style/field-colors.js";
import {
  webSkin as inputWeb,
  iosSkin as inputIos,
  androidSkin as inputAndroid,
  type InputSkin,
  type FieldState,
  type Size,
} from "../../atoms/input/input.styles.js";
import {
  webSkin as selectWeb,
  iosSkin as selectIos,
  androidSkin as selectAndroid,
  type SelectSkin,
} from "../../atoms/select/select.styles.js";

// Co-located PhoneInput skins, one per platform. A PhoneInput is the Input's grouped
// box with a COUNTRY segment where the prefix addon would be (a flag and a caret that
// open a country list) and the chosen country's dial code inline before the number.
// The box, the value type, the label, the dims and the press feedback are the
// platform's own Input skin, and the country list is the platform's own Select menu,
// both referenced rather than restated so the three fields can never drift apart.
// Only the country segment, the dial code, and the row's dial column are this
// component's own:
//   iOS: the "iOS Mobile Input Fields" reference's phone field: the country
//     segment is a white cluster (flag, 12pt gap, a small gray ▾ caret) with a 1pt
//     divider on the field side that takes the field's state colour (rest hairline,
//     ring on focus, destructive on error); the dial code sits inline in the
//     placeholder gray, 12pt from the divider, 12pt before the number.
//   Web: the Riskora addon box (a `muted` cluster with a `border` divider), the
//     ▾ caret in `muted-foreground`, the dial code inline.
//   Android (Material 3): an inline leading cluster with no fill and no divider
//     (M3 draws prefixes inline), a `muted-foreground` caret that turns `primary`
//     while the list is open, the dial code inline.

export type { Size };

export interface PhoneInputSkin {
  /** The platform's Input skin: the box, the value type, the label, dims, feedback. */
  field: InputSkin;
  /** The platform's Select skin: the country list's panel, rows, and selection mark. */
  menu: SelectSkin;
  /** The country segment: the pressable flag + caret cluster at the start of the box. */
  country: (t: ColorTokens, state: FieldState) => ViewStyle;
  /** The flag glyph's type per size. */
  flag: (size: Size) => TextStyle;
  /** The caret next to the flag; `open` lets a skin tint it while the list shows. */
  caret: (t: ColorTokens, open: boolean) => TextStyle;
  /** The caret character. */
  caretGlyph: string;
  /** The inline dial code before the number (its inset from the segment's divider). */
  dial: (t: ColorTokens) => TextStyle;
  /** The number's inset after the dial code. */
  numberGap: number;
  /** The row's trailing dial-code column. */
  rowDial: (t: ColorTokens) => TextStyle;
}

const FLAG_SIZE: Record<Size, TextStyle> = {
  small: { fontSize: 16, lineHeight: 20 },
  base: { fontSize: 20, lineHeight: 24 },
  large: { fontSize: 22, lineHeight: 28 },
};

// ---------- Web: the Riskora addon cluster ----------
export const webSkin: PhoneInputSkin = {
  field: inputWeb,
  menu: selectWeb,
  country: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: t.muted,
    borderColor: t.border,
    borderEndWidth: 1,
  }),
  flag: (size) => FLAG_SIZE[size],
  caret: (t) => ({ color: t["muted-foreground"], fontSize: 12, lineHeight: 16 }),
  caretGlyph: "▾",
  dial: (t) => ({ color: t["muted-foreground"], paddingStart: 16 }),
  numberGap: 8,
  rowDial: (t) => ({ color: t["muted-foreground"], marginStart: "auto" }),
};

// ---------- iOS: the reference's phone field ----------
export const iosSkin: PhoneInputSkin = {
  field: inputIos,
  menu: selectIos,
  // A white cluster (the reference's country box keeps the field fill) whose divider
  // follows the field's state, exactly like the boxed addon's.
  country: (t, { focused, error }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderColor: error ? t.destructive : focused ? t.ring : fieldBorder(t),
    borderEndWidth: 1,
  }),
  flag: (size) => FLAG_SIZE[size],
  // The reference's CaretDown: a small filled ▾ in its Icon/Default gray, unchanged
  // while the list is open.
  caret: (t) => ({ color: t["muted-foreground"], fontSize: 13, lineHeight: 16 }),
  caretGlyph: "▾",
  // "+1" in the placeholder gray, 12pt from the divider (the reference's number box inset).
  dial: (t) => ({ color: t["muted-foreground"], paddingStart: 12 }),
  numberGap: 12,
  rowDial: (t) => ({ color: t["muted-foreground"], marginStart: "auto" }),
};

// ---------- Android (Material 3): inline leading cluster ----------
export const androidSkin: PhoneInputSkin = {
  field: inputAndroid,
  menu: selectAndroid,
  country: () => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingStart: 16,
    paddingEnd: 8,
  }),
  flag: (size) => FLAG_SIZE[size],
  caret: (t, open) => ({ color: open ? t.primary : t["muted-foreground"], fontSize: 12, lineHeight: 16 }),
  caretGlyph: "▾",
  dial: (t) => ({ color: t["muted-foreground"], paddingStart: 0 }),
  numberGap: 8,
  rowDial: (t) => ({ color: t["muted-foreground"], marginStart: "auto" }),
};
