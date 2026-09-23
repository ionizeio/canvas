import { type TextStyle, type ViewStyle } from "react-native";
import { type SwatchSize } from "./swatch.shared.js";

// Co-located Swatch skins. The block sizes, the label lockup, and every color (in the
// shell) are platform-neutral, and no platform ships a color sample, so every platform
// takes Dark Factory's tile (the web skin below), as Emblem does.
//
// The skins carry SHAPE and TYPE metrics only. No skin holds a color: the fill is the
// caller's `color`, and the hairline plus the three label colors come from the active
// theme tokens in the shell, so a Swatch follows light/dark without a per-OS palette.

export interface SwatchSkin {
  /** Block edge per size, in px (the block's HEIGHT when `block` stretches its width). */
  box: Record<SwatchSize, number>;
  /** Corner radius of the block per size, in px (ignored when `circle` is set). */
  radius: Record<SwatchSize, number>;
  /** Extra shape refinement on the block (iOS: the continuous superellipse corner curve). */
  shape: ViewStyle;
  /** Gap between the block and its label column. */
  gap: number;
  /** Gap between the label column's lines (a tight name/value/detail lockup). */
  lineGap: number;
  /** The name line's type (weight/tracking); size, line height, and color come from the shell. */
  name: TextStyle;
  /** The primary mono value line's type; size, line height, family, and color come from the shell. */
  value: TextStyle;
  /** The secondary mono detail line's type; size, line height, family, and color come from the shell. */
  detail: TextStyle;
}

// Platform-neutral metrics, shared by all three skins (the Emblem precedent: only a
// real per-OS difference is written out per skin).
const box: Record<SwatchSize, number> = { small: 40, default: 56, large: 72 };
const gap = 8;
const lineGap = 2;

// Web: the Riskora rounded square (12 at the default size), with a 500-weight name over its mono lines.
// Dark Factory's tile corners (10 / 12 / 14), the continuous corner curve where the
// platform draws one (iOS; ignored elsewhere), and its label weights. A color sample has
// no platform control, so the native skins are the web skin.
export const webSkin: SwatchSkin = {
  box,
  radius: { small: 10, default: 12, large: 14 },
  shape: { borderCurve: "continuous" },
  gap,
  lineGap,
  name: { fontWeight: "700" },
  value: { fontWeight: "500" },
  detail: { fontWeight: "400" },
};

export const iosSkin: SwatchSkin = webSkin;
export const androidSkin: SwatchSkin = webSkin;
