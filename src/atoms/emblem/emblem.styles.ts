import { type TextStyle, type ViewStyle } from "react-native";
import { type EmblemSize } from "./emblem.shared.js";

// Co-located Emblem skins. The box, icon size, and semantic tint (in the shell) are
// platform-neutral, and no platform ships an icon tile, so every platform takes Dark
// Factory's tile (the web skin below).

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
// Dark Factory's tile: its corner grows with the tile (10 / 12 / 14), the continuous corner
// curve where the platform draws one (iOS; ignored elsewhere), and a bold monogram. No
// platform ships an icon tile, so the native skins are the web skin.
export const webSkin: EmblemSkin = {
  box,
  iconSize,
  radius: { small: 10, default: 12, large: 14 },
  shape: { borderCurve: "continuous" },
  monogram: { fontWeight: "700" },
};

export const iosSkin: EmblemSkin = webSkin;
export const androidSkin: EmblemSkin = webSkin;
