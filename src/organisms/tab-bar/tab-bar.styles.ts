import { StyleSheet } from "react-native";
import { alpha, customShadow, shadow, type ColorTokens, type ViewStyle } from "../../style/index.js";
import { type TabBarSkin } from "./tab-bar.shared.js";

// Per-OS TabBar skins. iOS = the iOS 26 floating Liquid Glass tab bar; web = the same
// capsule (the owner's call, 2026-09-18: the web tab bar is to look like the iOS one
// with liquid glass); Android = the Material 3 navigation bar. Colors are token-driven:
// the bar's fill comes from `fill`, the active label's color is applied by the shared
// shell, and the skin carries shape, label type, the active indicator and press feedback.

// Blend two hex colors by `t` (0 = a, 1 = b): the dark scheme's selected capsule is the
// track lifted toward the ink, the same layering the iOS segmented Tabs use, so the
// capsule reads lighter than the bar in both schemes while staying token-driven.
function mix(a: string, b: string, t: number): string {
  const parse = (c: string) => {
    const h = c.replace("#", "");
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${ch(ar, br)}, ${ch(ag, bg)}, ${ch(ab, bb)})`;
}

// The iOS 26 floating tab bar: a capsule inset 16pt from the sides, hovering 8pt above
// the bottom edge (or reaching 12pt into a safe-area inset, so on a device with a home
// indicator the capsule's bottom sits 22pt up, clear of the indicator), 58pt tall with a
// 4pt inset around the destination cells, a soft ambient shadow so the solid capsule
// reads as lifted. The selected destination is a capsule covering its whole cell: a
// raised white thumb on the muted track in light, a lifted gray one in dark, the same
// thumb the segmented Tabs raise. Under glass the bar is the functional-layer material
// and the thumb becomes the measured liquid puck that travels between destinations
// (real Liquid Glass on iOS 26, the lens on Chromium). Icons 22pt over ~10pt SF labels;
// press = dim.
const FLOATING_BAR: ViewStyle = { borderWidth: StyleSheet.hairlineWidth, borderRadius: 9999, paddingTop: 4, paddingHorizontal: 4, minHeight: 58, ...shadow("md") };
const FLOATING: NonNullable<TabBarSkin["floating"]> = { horizontal: 16, bottom: 8, clearance: 12 };
const CELL_SHADOW: ViewStyle = customShadow({ offsetY: 1, radius: 2, opacity: 0.18, elevation: 2 });

function floatingFill(t: ColorTokens): { backgroundColor: string; borderColor: string } {
  return { backgroundColor: t.muted, borderColor: t.border };
}

function cellThumb(t: ColorTokens, dark: boolean): ViewStyle {
  return { borderRadius: 9999, ...CELL_SHADOW, backgroundColor: dark ? mix(t.muted, t.foreground, 0.28) : t.background };
}

export const iosSkin: TabBarSkin = {
  bar: FLOATING_BAR,
  fill: floatingFill,
  floating: FLOATING,
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 6, borderRadius: 9999 },
  label: (active) => ({ fontSize: 10, lineHeight: 13, fontWeight: active ? "600" : "500", letterSpacing: -0.2 }),
  ripple: null,
  pressedOpacity: 0.6,
  pill: cellThumb,
  pillCovers: "cell",
};

// Web: the iOS 26 capsule as is, with the web's slightly larger label (11pt against the
// phone's 10) since a desktop browser sits farther from the eye than a phone. The former
// docked web bar with its M3 icon pill is gone; a web app shell that pairs this bar with a
// Sidebar still marks the current destination the same way at both widths, since the
// Sidebar's active row is a filled surface too.
export const webSkin: TabBarSkin = {
  ...iosSkin,
  label: (active) => ({ fontSize: 11, lineHeight: 14, fontWeight: active ? "600" : "500", letterSpacing: -0.1 }),
  pressedOpacity: 0.7,
};

// Material 3 navigation bar: docked and full-bleed, taller, M3 label type with positive
// tracking, brand ripple, no top hairline (M3 elevates the bar instead).
export const androidSkin: TabBarSkin = {
  bar: { borderTopWidth: 0, paddingTop: 8, minHeight: 64 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  label: (active) => ({ fontSize: 12, lineHeight: 16, fontWeight: active ? "600" : "500", letterSpacing: 0.5 }),
  ripple: (t: ColorTokens) => ({ color: alpha(t.primary, 0.12), borderless: true, radius: 36 }),
  pressedOpacity: null,
  // M3 active-indicator pill: 56x32dp, fully rounded (16 radius). Fill is a tonal brand
  // tint (alpha(primary, 0.16)) standing in for M3's secondary-container: this shadcn
  // token set has no secondary-container, and the flat `secondary` gray is nearly the bar
  // fill, so it would not read as a pill. It carries NO insets: an absolutely-positioned
  // child with no left/top is placed by the parent's alignItems/justifyContent, so the
  // centering wrapper puts it dead-center behind the icon on native Android AND web alike
  // (percentage left/top + negative margins centered on RN Web but drifted on native).
  pill: (t: ColorTokens): ViewStyle => ({
    position: "absolute",
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: alpha(t.primary, 0.16),
  }),
};
