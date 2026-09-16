import { type TextStyle, type ViewStyle } from "react-native";
import { type EmblemSize } from "./emblem.shared.js";

// Co-located Emblem skins. Emblem is a "Light" treatment: the box, icon size,
// and semantic tint (in the shell) are platform-neutral; only the corner radius,
// the iOS corner curve, and the monogram label type shift per OS (Material rounds
// icon containers more than iOS/web; iOS draws its app-icon tiles with the
// continuous superellipse curve; Material label type is 500 weight with positive
// tracking).

export interface EmblemSkin {
  /** Square edge per size, in px. */
  box: Record<EmblemSize, number>;
  /** Rendered icon glyph size per size, in px. */
  iconSize: Record<EmblemSize, number>;
  /** Corner radius (rounded-square shape) per size, in px. */
  radius: Record<EmblemSize, number>;
  /** Extra shape refinement on the emblem root (iOS: the app-icon continuous superellipse corner curve). */
  shape: ViewStyle;
  /** Monogram label type (weight/tracking); size, line-height, and color come from the shell. */
  monogram: TextStyle;
}

const box: Record<EmblemSize, number> = { small: 32, default: 40, large: 48 };
const iconSize: Record<EmblemSize, number> = { small: 16, default: 20, large: 24 };

// Web: the Riskora identity tile (a 12px rounded square at the default size).
export const webSkin: EmblemSkin = {
  box,
  iconSize,
  radius: { small: 8, default: 12, large: 16 },
  shape: {},
  monogram: { fontWeight: "600" },
};

// iOS: the same rounded square, drawn with Apple's continuous (superellipse)
// corner curve to match the app-icon idiom. borderCurve is an iOS-only RN style
// prop (a no-op elsewhere).
export const iosSkin: EmblemSkin = {
  ...webSkin,
  shape: { borderCurve: "continuous" },
};

// Material 3 rounds the icon container more; the monogram reads as a Material
// label (500 weight, +0.1 tracking, the kit's Avatar-initials precedent).
export const androidSkin: EmblemSkin = {
  box,
  iconSize,
  radius: { small: 8, default: 12, large: 16 },
  shape: {},
  monogram: { fontWeight: "500", letterSpacing: 0.1 },
};
