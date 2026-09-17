import { destructiveText } from "../../style/destructive-text.js";
import { fieldBorder, fieldErrorFill } from "../../style/field-colors.js";
import { type TextStyle } from "react-native";
import { type ColorTokens, shape, type FloatingLabelStyles } from "../../style/index.js";

// Co-located Textarea skins, one per platform. The field is a multiline
// TextInput, so every fragment is a TextStyle. The BRAND survives on every
// platform (the focus/active cue is always the indigo `ring`/`primary` token,
// the error cue the `destructive` token, never a platform default); only the
// native SHAPE, fill, border/underline, and focus feedback change per OS:
//   iOS: the "iOS Mobile Input Fields" reference (see input.styles.ts): the same
//     white `card` box as the single-line Input, an 8pt corner, the 1pt gray-300
//     resting hairline (`field-border`), `ring` on focus, `destructive` plus the
//     red-50 wash on error, a 16pt value; the brand cursor/selection is `primary`
//     (set on the shell, never a system blue).
//   Android (Material 3 filled): a subtle fill with a flat bottom active
//     indicator (underline). Top corners ~4, square bottom. The indicator is a
//     1px resting line that thickens to 2px indigo on focus (destructive on
//     error).
//   Web: the Riskora dashboard field — full-width, the 12px field corner,
//     1px border, on the card fill; border is error > focus(ring) > input.

export type Size = "small" | "base" | "large";

// State the shell resolves and hands to the skin's field builder.
export interface TextareaFieldState {
  /** Error/validation state (error or invalid prop). */
  error: boolean;
  /** The field currently holds keyboard focus. */
  focused: boolean;
}

// The field surface for a given state, plus the label-placement slice contributed
// by FloatingLabelStyles<Size> (iOS/web render the label ABOVE via `labelAbove`;
// Android FLOATS the M3 in-container label via `labelRest`/`labelFloated`/
// `labelReserve` — a MULTILINE float pinned to the top text line). `sizeText` and
// `minHeight` are shared (the brand type scale and the rows math are identical
// across platforms), so the shell composes them around the skin.
export interface TextareaSkin extends FloatingLabelStyles<Size> {
  field: (tokens: ColorTokens, state: TextareaFieldState) => TextStyle;
  /** The value's type scale per size; a skin that omits it reads the shared `sizeText`. */
  text?: (size: Size) => TextStyle;
  /**
   * The live character-count line the component renders under the field when
   * `showCount` is set (end-aligned, "N / max"). Muted at rest, `destructive-text`
   * once the count passes the soft cap so the overage reads as an error. The
   * BRAND survives (the semantic text role, never a platform red); only the
   * type conventions (SF caption tracking on iOS, M3 body-small tracking on
   * Android) change per OS.
   */
  count: (tokens: ColorTokens, over: boolean) => TextStyle;
}

// --- shared label type scale (mirrors the M3 Input, keyed to Textarea sizes) ---
// The Android floating label rests at the FIELD text size so it reads as the
// placeholder it replaces, then floats to body-small (12sp). M3 body tracking:
// body-large 0.5, body-medium 0.25, body-small 0.4.
function labelRestType(size: Size): TextStyle {
  if (size === "large") return { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 };
  if (size === "small") return { fontSize: 12, lineHeight: 16, letterSpacing: 0.4 };
  return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 };
}
function aboveLabelType(size: Size): TextStyle {
  if (size === "large") return { fontSize: 16, lineHeight: 24 };
  if (size === "small") return { fontSize: 12, lineHeight: 16 };
  return { fontSize: 14, lineHeight: 20 };
}

// --- shared, platform-neutral fragments -------------------------------------

// Text scale per size; mirrors the height the larger control reads as. Default
// is the base text-sm field (no size prop). Shared across platforms.
export function sizeText(size: Size): TextStyle {
  if (size === "large") return { fontSize: 16, lineHeight: 24 }; // text-base
  if (size === "small") return { fontSize: 12, lineHeight: 16 }; // text-xs
  return { fontSize: 14, lineHeight: 20 }; // text-sm
}

// Derived min height from the row count: each row ~22px plus the vertical
// padding. Falls back to the 80px floor when no rows are given. The row count is
// clamped to at least one whole visible row, so rows={0} or a negative/fractional
// value can never collapse the field below a usable single-line floor. The field
// still grows with content past this floor. Shared across platforms.
export function minHeight(rows?: number): TextStyle {
  const r = rows == null ? null : Math.max(1, Math.floor(rows));
  return { minHeight: r == null ? 80 : r * 22 + 16 };
}

// ---------- Web: the Riskora dashboard field ----------
// Full width, a white (`card`) box with the 12px field corner and a full 1px
// border, 16px inset, with the foreground text color. Border resolves error >
// focus(ring) > the resting `field-border` hairline (see src/style/field-colors.ts).
export const webSkin: TextareaSkin = {
  field: (t, st) => ({
    width: "100%",
    borderRadius: shape.web.field,
    borderWidth: 1,
    borderColor: st.error ? t.destructive : st.focused ? t.ring : fieldBorder(t),
    backgroundColor: t.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: t.foreground,
  }),
  // The label sits ABOVE the field (14/20 medium weight per size, matching the
  // Field/Form composers and the Input).
  floatingLabel: false,
  labelAbove: (t, size) => ({ ...aboveLabelType(size), fontWeight: "500", color: t.foreground }),
  // The count line: the established Canvas caption (12/16), muted, turning
  // destructive once the count passes the soft cap.
  count: (t, over) => ({ fontSize: 12, lineHeight: 16, color: over ? destructiveText(t) : t["muted-foreground"] }),
};

// ---------- iOS: the iOS input-field reference, multiline ----------
// The same box as the single-line Input's iOS skin (input.styles.ts), so a Textarea
// under an Input reads as one family: `card` fill, `shape.ios.field` corner, a 1pt
// border resolving error (`destructive`, with the red-50 wash) > focus (`ring`) >
// the resting `field-border` hairline, and the 16pt value.
export const iosSkin: TextareaSkin = {
  field: (t, st) => ({
    width: "100%",
    borderRadius: shape.ios.field,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: st.error ? t.destructive : st.focused ? t.ring : fieldBorder(t),
    backgroundColor: st.error ? fieldErrorFill(t) : t.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: t.foreground,
  }),
  text: (size) => {
    if (size === "large") return { fontSize: 17, lineHeight: 26 };
    if (size === "small") return { fontSize: 13, lineHeight: 18 };
    return { fontSize: 16, lineHeight: 24 };
  },
  // The label sits ABOVE the field: the reference's 14pt regular secondary title,
  // with SF Pro Text's tracking (-0.15), mirroring the single-line Input.
  floatingLabel: false,
  labelAbove: (t, size) => ({ ...aboveLabelType(size), fontWeight: "400", letterSpacing: -0.15, color: t["muted-foreground"] }),
  // The count line: an SF Pro caption (12/16, -0.08 tracking), the secondary
  // gray, turning destructive once the count passes the soft cap.
  count: (t, over) => ({ fontSize: 12, lineHeight: 16, letterSpacing: -0.08, color: over ? destructiveText(t) : t["muted-foreground"] }),
};

// ---------- Android (Material 3 filled): subtle fill + active indicator ------
// An opaque muted fill, shared with the other M3 filled fields, with rounded
// top corners (~4) and a square bottom, carrying a bottom active indicator
// (underline). The indicator is a 1px resting line (the input token) that
// thickens to 2px indigo `primary` on focus, or destructive on error.
export const androidSkin: TextareaSkin = {
  field: (t, st) => ({
    width: "100%",
    borderTopStartRadius: 4,
    borderTopEndRadius: 4,
    borderBottomStartRadius: 0,
    borderBottomEndRadius: 0,
    backgroundColor: t.muted,
    // The active indicator: only the bottom edge is drawn.
    borderBottomWidth: st.focused || st.error ? 2 : 1,
    // Rest baseline must read clearly (on-surface-variant ~ muted-foreground) so the
    // M3 filled field is distinct from the iOS lineless capsule.
    borderBottomColor: st.error ? t.destructive : st.focused ? t.primary : t["muted-foreground"],
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    color: t.foreground,
  }),
  // Android (Material 3): the IN-CONTAINER FLOATING label. M3 multiline fields DO
  // float the label — but pinned to the TOP text line (the value is top-aligned),
  // not the box middle. At rest the label sits on the first line like a placeholder
  // (at the FIELD text size per size); when the field is focused OR filled it floats
  // to the top, shrinking to body-small. `labelReserve` is the top padding the value
  // gives up so it starts below the floated label; the shell renders the FloatingLabel
  // in `multiline` mode. The label is rendered at `labelRest` and scaled on the
  // transform driver (`labelFloated`'s fontSize supplies the scale ratio only).
  floatingLabel: true,
  labelRest: (_t, size) => labelRestType(size),
  labelFloated: (_t, _size) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4 }),
  labelReserve: (size) => ({ paddingTop: size === "large" ? 26 : size === "small" ? 20 : 24 }),
  // The count line: M3 supporting text (body-small 12/16, 0.4 tracking), the
  // on-surface-variant gray, turning destructive (M3 error) once the count
  // passes the soft cap.
  count: (t, over) => ({ fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: over ? destructiveText(t) : t["muted-foreground"] }),
};
