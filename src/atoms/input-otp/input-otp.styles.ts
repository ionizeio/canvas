import { type ViewStyle, type TextStyle } from "react-native";
import { platformMinTarget, type ColorTokens } from "../../style/index.js";
import { FIELD_HEIGHT, fieldDisabled, fieldFrame } from "../../style/field-look.js";
import { type InputOTPSkin, type Size } from "./input-otp.shared.js";

// The InputOTP skin: one look on every platform. Neither iOS nor Material 3 ships a
// one-time-code control (apps draw the segmented field over one text field with the
// platform's code autofill), so there is no native shape to keep and the design language
// gives all three Dark Factory's look (its item 3): each cell is Dark Factory's field
// frame from the field recipe (src/style/field-look.ts), the one the Input beside it takes:
//   - the translucent `field-fill` well at the 10px field corner with a 1px border, the
//     resting `field-border` line turning `ring` on the cell the next character lands in
//     (the field's own focus indicator; there is no halo);
//   - square cells as tall as the field at the same size (34 / 40 / 46 at small, base and
//     large, so a code field lines up with an Input beside it), set apart by 6 / 8 / 10, so
//     a code reads as a row of fields, not one box. Six base cells in two groups of three
//     fit a 375pt phone's column with room to spare;
//   - the digit at Dark Factory's field weight (600) in the `foreground` ink, 15 / 18 / 22;
//   - the caret the kit's field caret: a 1.5px bar in the brand `primary`, as tall as the
//     digit, blinking on the platform insertion point's one-second cycle (the shell runs
//     the blink on the loop primitive; Reduce Motion holds it solid);
//   - a disabled field takes the field's disabled look in place of a dim: each cell's
//     frame on the `border` hairline with no fill, the digits in the muted ink, and no
//     material under glass.
// Touch: the whole row is one text input, so a cell's height is the row's touch target.
// On an iPhone and on Android a cell grows taller to the platform minimum where the square
// is shorter (44pt, 48dp); the web keeps the squares (platformMinTarget, read once when the
// module loads, is null there).

// The gap between two cells.
const GAP: Record<Size, number> = { small: 6, base: 8, large: 10 };

// The digit per size (the value; it scales with the cell).
const DIGIT: Record<Size, number> = { small: 15, base: 18, large: 22 };

function digitText(t: ColorTokens, size: Size): TextStyle {
  const fontSize = DIGIT[size];
  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.2),
    fontWeight: "600",
    color: t.foreground,
    textAlign: "center",
  };
}

// The dash between two `groups`: muted so it reads as punctuation rather than a character
// of the code, at the digit's size so it sits on the same line, with its own room on top
// of the gap between the cells.
const SEPARATOR_INSET = 8;

/**
 * What the platforms sharing this skin differ by, read for the running platform when the
 * module loads, as platformMinTarget is. A parameter so the tests can build the skin an
 * iPhone or an Android phone runs in the web harness.
 */
export interface SharedSkinPlatform {
  /** The touch minimum: iOS's 44, Android's 48, none on the web. A cell grows to it. */
  minTarget: number | null;
}

/** The one InputOTP skin, for a platform's touch minimum. */
export function sharedSkin({ minTarget }: SharedSkinPlatform): InputOTPSkin {
  const height = (size: Size) => Math.max(FIELD_HEIGHT[size], minTarget ?? 0);
  return {
    liquid: true,
    gap: (size) => GAP[size],
    cell: (t, size, { active }): ViewStyle => ({
      alignItems: "center",
      justifyContent: "center",
      width: FIELD_HEIGHT[size],
      height: height(size),
      ...fieldFrame(t, { focused: active, error: false }),
    }),
    digit: digitText,
    separator: (t, size) => ({
      fontSize: DIGIT[size],
      lineHeight: Math.round(DIGIT[size] * 1.2),
      color: t["muted-foreground"],
      marginHorizontal: SEPARATOR_INSET,
    }),
    caret: (t, size) => ({ width: 1.5, height: DIGIT[size], borderRadius: 1, backgroundColor: t.primary }),
    disabledLook: fieldDisabled,
  };
}

export const webSkin: InputOTPSkin = sharedSkin({ minTarget: platformMinTarget() });

// No platform ships a one-time-code control, so iOS and Android take the web's (the design
// language's item 3).
export const iosSkin: InputOTPSkin = webSkin;
export const androidSkin: InputOTPSkin = webSkin;
