import { type ViewStyle } from "react-native";
import { type BadgeSkin } from "./badge.shared.js";

// Per-OS Badge skins. Badge is a "Light" treatment: identical structure and semantic colors
// (those live in badge.shared.tsx); only shape radius, label type, and dot size shift per OS.
// Web is the Riskora pill (fully rounded, a 10/4 inset); iOS uses SF-style semibold type at the SF Pro
// Text metrics (tracking at 12pt is 0, so the label carries no extra tracking); Android
// matches Material 3's more-rounded label (M3 label-small: 11sp / +0.5 tracking /
// weight 500).

// Badges are HUG: the shell appends `useHugStyle()` (src/style/sizing.ts) at the
// root instead of a static alignSelf, which would pin a Row child to the top.
const META: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  paddingHorizontal: 8,
  paddingVertical: 2,
};

const STATUS: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  borderWidth: 1,
  borderRadius: 9999,
  paddingHorizontal: 8,
  paddingVertical: 2,
};

export const webSkin: BadgeSkin = {
  metaBase: { ...META, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBase: { ...STATUS, paddingHorizontal: 10, paddingVertical: 4 },
  labelType: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  dotSize: 6,
};

export const iosSkin: BadgeSkin = {
  metaBase: { ...META, borderRadius: 6 },
  statusBase: STATUS,
  labelType: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0 },
  dotSize: 6,
};

export const androidSkin: BadgeSkin = {
  metaBase: { ...META, borderRadius: 8 },
  statusBase: STATUS,
  labelType: { fontSize: 11, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  dotSize: 6,
};
