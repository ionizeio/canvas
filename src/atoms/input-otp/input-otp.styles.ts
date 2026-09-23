import { type ViewStyle, type TextStyle } from "react-native";
import { alpha, shape, type ColorTokens } from "../../style/index.js";
import { fieldBorder } from "../../style/field-colors.js";
import { type InputOTPSkin, type Size } from "./input-otp.shared.js";

// Co-located InputOTP skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). The BRAND survives on every
// platform: the active/focused cell always lights up in the indigo `primary`/`ring`,
// never a platform default (no iOS system blue, no M3 default). Only the native
// SHAPE, sizing, and structure of the segmented field change per OS:
//   iOS (HIG): rounded-square cells (the 8 field radius) on a `secondary` field fill, SEPARATED
//     by a small gap; the active cell is ring-highlighted in `primary` (a 2pt brand
//     border). Base cell ~44x52.
//   Android (Material 3): OUTLINED cells (1dp `border`), SEPARATED by a gap, M3 medium
//     corner (~12 radius); the active cell border thickens to 2dp in `primary`. M3 type
//     scale. Base cell ~52x56.
//   Web: the established Canvas look, matched to shadcn input-otp — a CONNECTED group of
//     bordered cells that share borders (gap 0), only the outer corners rounded (md/6),
//     active cell tinted `ring` with a soft 3px ring at 50% alpha. Base cell ~36x36.
// Disabled dims the whole control (opacity in the shell). Each cell centers its digit;
// the empty active cell draws a thin caret bar — brand `primary` and blinking on the
// native rows (the iOS insertion point is always the tint color, the M3 cursor is the
// primary color, and both blink), static `foreground` on the web row (the established
// Canvas baseline).

// ---- shared geometry helpers ----
const CELL_BASE: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
};

// Digit type scale per size (the digit is the value; size scales it with the box).
// Used by the web (18 base, the established Canvas look) and iOS (600 weight) skins.
const DIGIT_SIZE: Record<Size, number> = { small: 15, base: 18, large: 22 };

function digitText(t: ColorTokens, size: Size, weight: TextStyle["fontWeight"]): TextStyle {
  const fontSize = DIGIT_SIZE[size];
  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.2),
    fontWeight: weight,
    color: t.foreground,
    textAlign: "center",
  };
}

// Android digit type, mapped to REAL M3 type roles (M3 has no OTP component, so the
// digit borrows the 500-weight title scale): title-small 14/20/+0.1 (small),
// title-medium 16/24/+0.15 (base), and the title-large 22/28 metrics for the large
// cell, held at the 500 title weight so the digit emphasis stays constant across sizes
// (title-large's 400 would read lighter than the base cell).
const M3_DIGIT: Record<Size, [number, number, number]> = {
  small: [14, 20, 0.1],
  base: [16, 24, 0.15],
  large: [22, 28, 0],
};

function androidDigitText(t: ColorTokens, size: Size): TextStyle {
  const [fontSize, lineHeight, letterSpacing] = M3_DIGIT[size];
  return {
    fontSize,
    lineHeight,
    letterSpacing,
    fontWeight: "500",
    color: t.foreground,
    textAlign: "center",
  };
}

// The dash between two `groups`. Muted so it reads as punctuation rather than a
// character of the code, sized to the skin's own digit so it sits on the same
// optical line, and carrying its own breathing room ON TOP of whatever gap the
// platform sets between cells (the connected web skin sets none).
const SEPARATOR_INSET = 8;

function separatorText(t: ColorTokens, fontSize: number): TextStyle {
  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.2),
    color: t["muted-foreground"],
    marginHorizontal: SEPARATOR_INSET,
  };
}

// The caret bar: a thin vertical rule centered in the empty active cell, sized to
// the digit cap height per size (matches shadcn's h-4 w-px caret geometry). The COLOR
// is per-skin: iOS/Android pass the brand `primary` (the native insertion-point/cursor
// idiom), web keeps the established `foreground` bar. The blink lives in the shell
// (see `caretBlink` on the skin contract).
function caretBar(color: string, size: Size): ViewStyle {
  const height = DIGIT_SIZE[size];
  return { width: 1.5, height, borderRadius: 1, backgroundColor: color };
}

// ---------- iOS: the reference's field box per cell, separated, ring on active ----------
// Each cell is the iOS input-field reference's box (see input.styles.ts): `card`
// fill, the 8pt corner, a 1pt resting `field-border` hairline that turns `ring` on
// the active cell, so a code field under an Input reads as the same family.
const IOS_W: Record<Size, number> = { small: 38, base: 44, large: 52 };
const IOS_H: Record<Size, number> = { small: 44, base: 52, large: 60 };

export const iosSkin: InputOTPSkin = {
  gap: (size) => (size === "large" ? 10 : size === "small" ? 6 : 8),
  connected: false,
  cell: (t, size, { active }) => ({
    ...CELL_BASE,
    width: IOS_W[size],
    height: IOS_H[size],
    borderRadius: shape.ios.field,
    // Apple rounded rects are superellipses: the continuous corner curve (iOS-only
    // RN style prop, a no-op elsewhere), not the default circular arc.
    borderCurve: "continuous",
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: active ? t.ring : fieldBorder(t),
  }),
  digit: (t, size) => digitText(t, size, "600"),
  separator: (t, size) => separatorText(t, DIGIT_SIZE[size]),
  // iOS insertion-point idiom: the caret is the tint color (brand primary) and blinks.
  caret: (t, size) => caretBar(t.primary, size),
  caretBlink: true,
  disabledOpacity: 0.5,
};

// ---------- Android (Material 3): outlined cells, separated, 2dp primary on active ----------
const M3_RADIUS = 12; // M3 medium-component corner
const M3_W: Record<Size, number> = { small: 44, base: 52, large: 60 };
const M3_H: Record<Size, number> = { small: 48, base: 56, large: 64 };

export const androidSkin: InputOTPSkin = {
  gap: (size) => (size === "large" ? 12 : size === "small" ? 6 : 8),
  connected: false,
  cell: (t, size, { active }) => ({
    ...CELL_BASE,
    width: M3_W[size],
    height: M3_H[size],
    borderRadius: M3_RADIUS,
    backgroundColor: "transparent",
    // M3 outlined field: 1dp outline at rest, thickening to a 2dp brand outline when active.
    borderWidth: active ? 2 : 1,
    borderColor: active ? t.primary : t.border,
  }),
  // M3 title-role digit scale (see androidDigitText).
  digit: androidDigitText,
  separator: (t, size) => separatorText(t, M3_DIGIT[size][0]),
  // M3 text-field cursor idiom: the caret is the primary color and blinks.
  caret: (t, size) => caretBar(t.primary, size),
  caretBlink: true,
  disabledOpacity: 0.38, // M3 disabled opacity
};

// ---------- Web: the Riskora field, as a connected run of cells ----------
// Connected group of bordered cells sharing borders (gap 0): the left edge is drawn
// only on the cell that STARTS a run, every cell draws top/right/bottom, and only a
// run's outer corners are rounded (md). With `groups` the row holds several runs, one
// per chunk, so each chunk closes and rounds its own ends (the 12px field corner). The active cell tints to
// `ring` with a soft 3px ring.
const WEB_RADIUS = shape.web.field;
const WEB_SIZE: Record<Size, number> = { small: 40, base: 48, large: 56 };

export const webSkin: InputOTPSkin = {
  liquid: true,
  gap: () => 0,
  connected: true,
  cell: (t, size, { active, groupStart, groupEnd }) => {
    const d = WEB_SIZE[size];
    return {
      ...CELL_BASE,
      width: d,
      height: d,
      position: "relative",
      backgroundColor: t.card,
      // Shared borders: every cell draws top/right/bottom; only a run's first draws the left.
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderEndWidth: 1,
      borderStartWidth: groupStart ? 1 : 0,
      borderColor: active ? t.ring : fieldBorder(t),
      // Only a run's outer corners are rounded (its first cell's left, its last cell's right).
      borderTopStartRadius: groupStart ? WEB_RADIUS : 0,
      borderBottomStartRadius: groupStart ? WEB_RADIUS : 0,
      borderTopEndRadius: groupEnd ? WEB_RADIUS : 0,
      borderBottomEndRadius: groupEnd ? WEB_RADIUS : 0,
      // shadcn's data-[active]: a 3px ring at 50% alpha + raised z so it overlaps neighbors.
      // Drawn with the cross-platform `boxShadow` spread (a 0-radius shadow* cannot make an
      // outer ring, and shadow* is deprecated on react-native-web).
      ...(active
        ? {
            zIndex: 10,
            boxShadow: `0 0 0 3px ${alpha(t.ring, 0.5)}`,
          }
        : null),
    } as ViewStyle;
  },
  digit: (t, size) => digitText(t, size, "500"),
  separator: (t, size) => separatorText(t, DIGIT_SIZE[size]),
  // The established Canvas caret: a static `foreground` bar (the web row is the baseline).
  caret: (t, size) => caretBar(t.foreground, size),
  caretBlink: false,
  disabledOpacity: 0.5,
};
