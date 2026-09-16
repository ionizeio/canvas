import { type ViewStyle, type TextStyle } from "react-native";
import { shape } from "../../style/index.js";
import { type AlertSkin } from "./alert.shared.js";

// Per-OS Alert skins. Alert is a "Light" treatment: identical structure and semantic
// colors (those live in alert.shared.tsx); only shape radius, density/spacing, type
// tracking, and dismiss press feedback shift per OS. Neither iOS nor Material 3 ships
// an inline alert banner, so there is no native control to match — the per-OS skins
// keep the web structure and apply only platform conventions:
//   Web: the established Canvas look (shadcn callout banner, lifted verbatim) — 8 radius,
//     1px border, px-4 py-3, gap-3, 14/600 title, 14 body, dismiss press = opacity 0.7.
//   iOS (HIG/SF): a softer iOS corner (10 radius, matching grouped-list / card rounding),
//     SF type with the SF Pro Text 14pt tracking (-0.15 title and body), no elevation;
//     press = opacity dim (~0.7) on the dismiss control, whose 24pt box pads out to the
//     HIG 44x44pt minimum touch target via hitSlop 10.
//   Android (Material 3): the M3 medium shape (12 radius), M3 type roles (title =
//     title-small 14/20/500/+0.1, body = body-medium 14/20/400/+0.25), flat (M3 contained
//     banner carries no elevation); the dismiss control gets the brand android_ripple
//     (wired in shared), stays opaque under it (pressed opacity 1), and pads its 24dp box
//     out to the M3 48x48dp minimum touch target via hitSlop 12.

// Banner shell + density (the tone fill/border color is supplied by shared).
const CONTAINER: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 12,
  borderWidth: 1,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

// Dismiss control box: -mr-1 -mt-0.5 h-6 w-6 items-center justify-center.
const DISMISS: ViewStyle = {
  marginEnd: -4,
  marginTop: -2,
  height: 24,
  width: 24,
  alignItems: "center",
  justifyContent: "center",
};

// Footer action row: the action buttons in a row (gap 8), separated from the
// description above by a 12px lead. Identical on every platform today (the banner's
// action spacing), factored here alongside CONTAINER/DISMISS so a skin can still
// tune it per OS later.
const ACTIONS: ViewStyle = { flexDirection: "row", gap: 8, marginTop: 12 };

export const webSkin: AlertSkin = {
  container: { ...CONTAINER, borderRadius: shape.web.control },
  iconType: { fontSize: 16, lineHeight: 20 },
  titleType: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  bodyType: { fontSize: 14, lineHeight: 20 },
  dismissButton: { ...DISMISS, borderRadius: 8 },
  dismissType: { fontSize: 16, lineHeight: 16 },
  dismissPressedOpacity: 0.7,
  dismissHitSlop: null, // pointer targets stay visual on web
  actions: ACTIONS,
};

export const iosSkin: AlertSkin = {
  container: { ...CONTAINER, borderRadius: 10 },
  iconType: { fontSize: 16, lineHeight: 20 },
  // SF Pro Text tracking at 14pt = -0.15 (the SF tracking table).
  titleType: { fontSize: 14, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15 },
  bodyType: { fontSize: 14, lineHeight: 20, letterSpacing: -0.15 },
  dismissButton: { ...DISMISS, borderRadius: 8 },
  dismissType: { fontSize: 16, lineHeight: 16 },
  dismissPressedOpacity: 0.7,
  dismissHitSlop: 10, // 24pt box + 2*10 = HIG 44x44pt minimum touch target
  actions: ACTIONS,
};

export const androidSkin: AlertSkin = {
  container: { ...CONTAINER, borderRadius: 12 },
  iconType: { fontSize: 16, lineHeight: 20 },
  // M3 type roles: title = title-small (14/20/500/+0.1), body = body-medium (14/20/400/+0.25).
  titleType: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  bodyType: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  dismissButton: { ...DISMISS, borderRadius: 12 },
  dismissType: { fontSize: 16, lineHeight: 16 },
  dismissPressedOpacity: 1,
  dismissHitSlop: 12, // 24dp box + 2*12 = M3 48x48dp minimum touch target
  actions: ACTIONS,
};
