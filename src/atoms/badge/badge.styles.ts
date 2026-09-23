import { type ViewStyle } from "react-native";
import { typeScale } from "../../style/type-scale.js";
import { type BadgeSkin } from "./badge.shared.js";

// Per-OS Badge skins. Badge is Dark Factory's Pill on every platform: neither iOS nor
// Material 3 ships a label pill (their badges are the count dots on an icon), so there is
// no native shape to keep and the iOS and Android skins are the web skin. The pill is
// fully round, its 11px bold label (Dark Factory's class pill) sits 2px above and 8px
// beside a 1px border that stays transparent unless the outline tone draws it (the border
// plus padding give Dark Factory's 3px by 9px inset), and a status pill leads with a 7px
// dot. The tone colors live in badge.shared.tsx.

// Badges are HUG: the shell appends `useHugStyle()` (src/style/sizing.ts) at the
// root instead of a static alignSelf, which would pin a Row child to the top.
const PILL: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderRadius: 9999,
  paddingHorizontal: 8,
  paddingVertical: 2,
};

export const webSkin: BadgeSkin = {
  metaBase: PILL,
  statusBase: { ...PILL, gap: 6 },
  labelType: { ...typeScale.caption, fontWeight: "700" },
  dotSize: 7,
};

// No native label pill on either platform: the native skins are the web skin.
export const iosSkin: BadgeSkin = webSkin;
export const androidSkin: BadgeSkin = webSkin;
