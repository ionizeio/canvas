// Material press feedback. On Android, a tappable surface shows a native ripple
// "state layer"; iOS and web have no ripple and dim opacity on press instead.
// These helpers keep that platform split in one place so any Pressable can adopt
// the Android ripple while keeping the iOS/web opacity dim, the same way the
// platform-skinned controls (Button, Checkbox, ...) already do it in their skins.
import { Platform } from "react-native";
import { alpha } from "./color.js";
import { type ColorTokens } from "./tokens.js";

// A neutral ink ripple bounded to a content surface (card, list row, tile). The
// ink is the foreground token at low alpha, so it reads on both themes: dark ink
// on light surfaces, light ink on dark.
export function surfaceRipple(tokens: ColorTokens) {
  return { color: alpha(tokens.foreground, 0.1), borderless: false };
}

// A borderless ripple for a circular or icon-sized control (avatar, icon button),
// where the ripple should radiate from the touch point rather than fill a rect.
export function controlRipple(tokens: ColorTokens) {
  return { color: alpha(tokens.foreground, 0.12), borderless: true };
}

// The press opacity dim for iOS and web. On Android the ripple carries the press
// feedback, so this returns null there to avoid double-signaling. Pass the
// component's own dim value; it stays the iOS/web look unchanged.
export function pressDim(pressed: boolean, opacity = 0.9) {
  return pressed && Platform.OS !== "android" ? { opacity } : null;
}

// The dim each platform's own disabled controls take (the hand-off's --p-disabled): iOS's
// 0.4, Material 3's 0.38, and 0.5 on the web. For a skin that one component shares across
// every platform, evaluated once in the platform's own bundle like platformMinTarget.
// Platform-parameterized for tests.
export function platformDisabledDim(os: string = Platform.OS): number {
  if (os === "ios") return 0.4;
  if (os === "android") return 0.38;
  return 0.5;
}

// Android-only `overflow:"hidden"`. Add it to a rounded PARENT so it clips a bounded-ripple
// CHILD (a menu/list card whose rows carry the ripple) to the parent's rounded corners. The
// clip is Android-only so an iOS shadow on the parent (which `overflow:"hidden"` would mask)
// survives; the Android elevation shadow is drawn around the outline by the platform and is
// not clipped by the parent's own overflow.
//
// IMPORTANT — this only works on a PARENT of the ripple node, never on the ripple node
// ITSELF. React Native does not use clipToOutline; it clips `overflow:"hidden"` as a manual
// path-clip in `ViewGroup.dispatchDraw`, which affects only CHILD views. A bounded ripple is
// the node's OWN background drawable (a rectangle, drawn before dispatchDraw), so a node can
// never clip its own ripple. When the ripple node is itself the rounded surface (no clipping
// parent exists), use `<RippleClip>` to introduce one instead. See src/style/ripple-clip.tsx.
export function rippleClip() {
  return Platform.OS === "android" ? ({ overflow: "hidden" } as const) : null;
}
