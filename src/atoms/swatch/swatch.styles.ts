import { type TextStyle, type ViewStyle } from "react-native";
import { type SwatchSize } from "./swatch.shared.js";

// Co-located Swatch skins. Swatch is a "Light" treatment, exactly like Emblem: the
// block sizes, the label lockup, and every color (in the shell) are platform-neutral;
// only the corner radius, the iOS corner curve, and the label type shift per OS
// (Material rounds containers more than iOS/web; iOS draws its tiles with the
// continuous superellipse curve; Material label type carries positive tracking while
// iOS tracks its labels slightly tighter).
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
export const webSkin: SwatchSkin = {
  box,
  radius: { small: 8, default: 12, large: 16 },
  shape: {},
  gap,
  lineGap,
  name: { fontWeight: "500" },
  value: { fontWeight: "500" },
  detail: { fontWeight: "400" },
};

// iOS: the same rounded square, drawn with Apple's continuous (superellipse) corner
// curve to match the tile idiom (borderCurve is an iOS-only RN style prop, a no-op
// elsewhere). HIG labels track slightly tighter than the web default, so the name
// pulls in by 0.08. The mono lines keep neutral tracking: Menlo's fixed advance
// already sets their rhythm, and tightening it would break the column alignment that
// makes a stack of hex values scannable.
export const iosSkin: SwatchSkin = {
  ...webSkin,
  shape: { borderCurve: "continuous" },
  name: { fontWeight: "500", letterSpacing: -0.08 },
};

// Material 3 rounds containers more (the M3 container ladder: 8 / 12 / 16), and its
// label type carries +0.1 tracking, which M3 applies to every label line.
export const androidSkin: SwatchSkin = {
  box,
  radius: { small: 8, default: 12, large: 16 },
  shape: {},
  gap,
  lineGap,
  name: { fontWeight: "500", letterSpacing: 0.1 },
  value: { fontWeight: "500", letterSpacing: 0.1 },
  detail: { fontWeight: "400", letterSpacing: 0.1 },
};
