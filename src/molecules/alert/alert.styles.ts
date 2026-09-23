import { type ViewStyle, type TextStyle } from "react-native";
import { platformMinTarget, shape } from "../../style/index.js";
import { typeScale } from "../../style/type-scale.js";
import { type AlertSkin } from "./alert.shared.js";

// Per-OS Alert skins. Neither iOS nor Material 3 ships an inline alert banner, so the
// Alert is Dark Factory's panel on every platform and the native skins are the web skin:
// Dark Factory's 12px tile corner, a 1px border (the neutral card's hairline,
// transparent on a toned wash), 16 by 12 padding, its dense type (a 12.5 bold title over
// a 12.5 body), and a 24px dismiss control that dims on press (Android's ripple carries
// its press instead, see pressDim) and pads its touch area out to each platform's minimum
// (HIG 44pt, Material 3 48dp) through hitSlop, with none on the web.

const DISMISS_BOX = 24;
const MIN_TARGET = platformMinTarget();

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 12,
  borderWidth: 1,
  borderRadius: shape.web.tile,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const DISMISS: ViewStyle = {
  marginEnd: -4,
  marginTop: -2,
  height: DISMISS_BOX,
  width: DISMISS_BOX,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
};

const ACTIONS: ViewStyle = { flexDirection: "row", gap: 8, marginTop: 12 };

// The icon sits on the title's first line (its line height), a touch larger than the text.
const ICON_TYPE: TextStyle = { fontSize: 16, lineHeight: typeScale.bodyStrong.lineHeight };

export const webSkin: AlertSkin = {
  container: CONTAINER,
  iconType: ICON_TYPE,
  titleType: typeScale.bodyStrong,
  bodyType: typeScale.body,
  dismissButton: DISMISS,
  dismissType: { fontSize: 16, lineHeight: 16 },
  dismissPressedOpacity: 0.7,
  dismissHitSlop: MIN_TARGET == null ? null : (MIN_TARGET - DISMISS_BOX) / 2,
  actions: ACTIONS,
};

// No native inline banner on either platform: the native skins are the web skin.
export const iosSkin: AlertSkin = webSkin;
export const androidSkin: AlertSkin = webSkin;
