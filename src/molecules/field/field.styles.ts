import { destructiveText } from "../../style/destructive-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens } from "../../style/index.js";

// Co-located Field skins, one per platform. Field is a "Light" platform treatment: ONE structure
// (a label above, the control, then one message line) and one set of semantic colors, which live
// in field.shared.tsx driven by the active tokens so light/dark and the glass surface keep working.
// Only per-OS type tracking and the stack rhythm shift here.
//
// Field paints no surface and owns no pressable of its own: the control it wraps brings its own
// per-OS press feedback from its own skin, so nothing here declares ripple or opacity.
//
//   Web: the Riskora form row — a 14/20 medium label, an 8px stack gap, and a 12/16
//     message line. Matches what Input already renders above itself, so a wrapped and an unwrapped
//     field line up in one column.
//   iOS: the "iOS Mobile Input Fields" reference (Figma N8TScrzAPwpmwxFS1032my): a 14pt
//     REGULAR secondary title (its Text/Label, `muted-foreground`) 8 above the box, and the
//     12pt message 8 below it, red only when it is the error. SF Pro Text tracking on the
//     label (-0.15 at 14pt) per Apple's SF tracking table. iOS places field labels above the
//     control, which is what the shell already does, and Input's own above-label matches.
//   Android (Material 3): M3 type roles — the label is body-large 16/24 at +0.5 tracking when it
//     stays above, and the supporting text below a text field is body-small 12/16 at +0.4. The
//     stack opens to 4px because M3's supporting text sits tighter under the box.
export interface FieldSkin {
  /** Outer stack of label / control / message: the inter-element gap. */
  stack: ViewStyle;
  /** The static label above the control, used when the label is NOT delegated. */
  label: (t: ColorTokens) => TextStyle;
  /** The helper or error line below the control. `error` swaps the muted tone for destructive. */
  message: (t: ColorTokens, error: boolean) => TextStyle;
}

export const webSkin: FieldSkin = {
  stack: { flexDirection: "column", gap: 8 },
  label: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  message: (t, error) => ({
    fontSize: 12,
    lineHeight: 16,
    color: error ? destructiveText(t) : t["muted-foreground"],
  }),
};

export const iosSkin: FieldSkin = {
  stack: { flexDirection: "column", gap: 8 },
  label: (t) => ({
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: -0.15,
    color: t["muted-foreground"],
  }),
  message: (t, error) => ({
    fontSize: 12,
    lineHeight: 16,
    color: error ? destructiveText(t) : t["muted-foreground"],
  }),
};

export const androidSkin: FieldSkin = {
  stack: { flexDirection: "column", gap: 4 },
  label: (t) => ({
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0.5,
    color: t.foreground,
  }),
  message: (t, error) => ({
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: error ? destructiveText(t) : t["muted-foreground"],
  }),
};
