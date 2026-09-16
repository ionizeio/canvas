import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, customShadow, alpha, FOCUS_RESET, shape } from "../../style/index.js";
import { type TabsSkin } from "./tabs.shared.js";

// Co-located Tabs skins, one per platform. The shell resolves the look axis
// (underline / pills / vertical), the selection/block/disabled state, and the
// badges; the skin supplies only the native SHAPE, sizing, label weight, fill,
// indicator, and press feedback. The BRAND survives on every platform (the
// indigo `primary` token and the semantic tokens, never a platform default), so
// each follows light/dark and the glass surface.
//
//   iOS (iOS 27 / Liquid Glass segmented control): the default underline look
//     becomes a CAPSULE gray track (radius 9999, muted fill, 3px inset); the
//     SELECTED tab is a raised white/elevated CAPSULE pill (radius 9999, small
//     shadow); labels ~13pt; no underline rule. Both labels stay on-foreground
//     (the white pill is the selected affordance, not a brand fill), mirroring
//     the button-group iOS 27 segmented treatment. Press = dim.
//   Android (M3 underline tabs): no container; each tab is text with a 3px brand
//     `primary` indicator bar under the active tab; inactive labels read in
//     `muted-foreground`; title-case ~14sp; press = android_ripple.
//   Web: the established Canvas look (underline rule / muted pill track / accent
//     rail), lifted verbatim from the original file.

export type Variant = "underline" | "pills" | "vertical";

// --- shared layout fragments (color-free; identical across platforms) --------

// flex-1: an equal-flex trigger in block mode (shares the row width).
export const flex1: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// opacity-50: the dimmed disabled look the component applies per trigger.
export const disabledDim: ViewStyle = { opacity: 0.5 };

// w-full vs self-start: in block mode the row fills the available width so
// equal-flex triggers stretch it; otherwise the row hugs its triggers.
export function blockWidth(block: boolean): ViewStyle {
  return block ? { width: "100%" } : { alignSelf: "flex-start" };
}

// The horizontal overflow scroller around a non-block underline/pills row: hugs
// the row like `blockWidth(false)` (alignSelf flex-start), caps at the container
// (maxWidth 100%) so a long row pans instead of clipping, and zeroes ScrollView's
// default flexGrow:1 so the scroller never claims spare space in a flex parent.
export const overflowScroller: ViewStyle = {
  flexGrow: 0,
  flexShrink: 1,
  alignSelf: "flex-start",
  maxWidth: "100%",
};

// =============================================================================
// Web: the established Canvas look (lifted verbatim from the original file).
// =============================================================================

export const webSkin: TabsSkin = {
  // The selected underline tab carries no track ripple; press dims the trigger.
  pressedOpacity: 0.9,
  ripple: null,

  // --- underline ---
  underlineRow(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: tokens.border,
    };
  },
  underlineTrigger() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    };
  },
  // A 2px primary rule drawn as an explicit sliver pinned to the trigger's
  // bottom edge (absolute bottom-0 left-0 right-0 h-0.5 rounded-full).
  underlineIndicator(tokens, selected) {
    return {
      position: "absolute",
      bottom: 0,
      start: 0,
      end: 0,
      height: 2,
      borderRadius: 9999,
      backgroundColor: selected ? tokens.primary : "transparent",
    };
  },
  underlineLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? tokens.foreground : tokens["muted-foreground"] };
  },

  // --- pills ---
  // The Riskora section tabs: a white 16px-cornered bar holding 12px-cornered
  // segments with a hairline each; the selected segment drops its hairline for a
  // sky tint (the "Employees" tab on the company profile).
  pillsRow(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      borderRadius: shape.web.menu,
      borderWidth: 1,
      borderColor: tokens.border,
      backgroundColor: tokens.card,
      padding: 8,
    };
  },
  pillsTrigger() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: shape.web.control,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 10,
    };
  },
  pillsFill(tokens, selected) {
    return selected
      ? { backgroundColor: alpha(tokens.primary, 0.14), borderColor: "transparent" }
      : { backgroundColor: "transparent", borderColor: tokens.border };
  },
  pillsLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? tokens.foreground : tokens["muted-foreground"] };
  },

  // --- vertical ---
  verticalTrigger() {
    return {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: shape.web.control,
      paddingHorizontal: 12,
      paddingVertical: 12,
    };
  },
  verticalFill(tokens, selected) {
    return { backgroundColor: selected ? tokens.accent : "transparent" };
  },
  verticalLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? tokens["accent-foreground"] : tokens["muted-foreground"] };
  },

  // --- count badge ---
  countBadgeBox(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: tokens.secondary,
      paddingHorizontal: 6,
      paddingVertical: 2,
    };
  },
  countBadgeLabel(tokens, muted) {
    return { fontSize: 12, lineHeight: 16, fontWeight: "500", color: muted ? tokens["muted-foreground"] : tokens["secondary-foreground"] };
  },
};

// =============================================================================
// iOS (iOS 27 / Liquid Glass segmented control): the in-page tab strip is a
// CAPSULE segmented control (mirroring button-group's iOS 27 treatment). A
// capsule gray track (radius 9999) holds raised white CAPSULE pills (radius
// 9999); the pills look stays a segmented track too; vertical stays a left
// rail. Press = opacity dim.
// =============================================================================

const IOS_PILL_SHADOW: ViewStyle = customShadow({ offsetY: 1, radius: 2, opacity: 0.18, elevation: 2 });

// Blend two hex colors by `t` (0 = a, 1 = b). Used to lift the dark-mode selected
// thumb to a lighter gray than the track (Apple's tertiary/secondary system-fill
// layering) while staying token-driven.
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

// The iOS segmented thumb fill. Light mode: the white `background` reads clearly
// against the gray `muted` track. Dark mode: `background` (#09090b) is DARKER than
// the `muted` track (#27272a), so it would sink in; instead lift the track 28%
// toward `foreground` to a medium-light gray thumb that pops off the track, as in
// Apple's iOS 27 dark segmented control. Token-driven, so it follows the scheme.
function iosSelectedThumb(tokens: ColorTokens, dark: boolean): string {
  return dark ? mix(tokens.muted, tokens.foreground, 0.28) : tokens.background;
}

export const iosSkin: TabsSkin = {
  pressedOpacity: 0.8, // HIG: dim on press
  ripple: null,
  // Suppress the react-native-web blue keyboard-focus ring on iOS triggers; a
  // real iOS segmented control never shows it. `outlineStyle`/`outlineWidth` are
  // not in RN's ViewStyle (hence the cast inside FOCUS_RESET) and are ignored
  // natively. Mirrors input/textarea/pagination's outline resets.
  focusOutlineReset: FOCUS_RESET,

  // --- underline -> capsule segmented control (gray track + raised pill) ---
  underlineRow(tokens) {
    // The capsule gray track (radius 9999, muted fill, 3px inset).
    return {
      flexDirection: "row",
      alignItems: "center",
      gap: 0,
      padding: 3,
      borderRadius: 9999,
      backgroundColor: tokens.muted,
    };
  },
  underlineTrigger(tokens, selected, dark) {
    // Each tab is an independent capsule pill (radius 9999) inside the track;
    // the selected one is a raised, elevated thumb that reads lighter than the
    // track in both schemes (white in light, lifted gray in dark).
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 9999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      ...(selected ? { ...IOS_PILL_SHADOW, backgroundColor: iosSelectedThumb(tokens, dark) } : { backgroundColor: "transparent" }),
    };
  },
  // No underline rule on iOS: the raised capsule pill is the selected affordance.
  underlineIndicator() {
    return { display: "none" };
  },
  underlineLabel(tokens, selected) {
    // ~13pt SF label; selected reads slightly heavier. Both stay on-foreground
    // (the white pill is the selected affordance, not a brand fill).
    return { fontSize: 13, lineHeight: 18, fontWeight: selected ? "600" : "500", color: tokens.foreground };
  },

  // --- pills (capsule segmented track, same gray-track + raised pill) ---
  pillsRow(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      gap: 0,
      alignSelf: "flex-start",
      borderRadius: 9999,
      backgroundColor: tokens.muted,
      padding: 3,
    };
  },
  pillsTrigger() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 9999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    };
  },
  pillsFill(tokens, selected, dark) {
    return selected
      ? { ...IOS_PILL_SHADOW, backgroundColor: iosSelectedThumb(tokens, dark) }
      : { backgroundColor: "transparent" };
  },
  pillsLabel(tokens, selected) {
    return { fontSize: 13, lineHeight: 18, fontWeight: selected ? "600" : "500", color: tokens.foreground };
  },

  // --- vertical (HIG grouped rail; active item is an accent-filled row) ---
  verticalTrigger() {
    return {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
    };
  },
  verticalFill(tokens, selected) {
    return { backgroundColor: selected ? tokens.accent : "transparent" };
  },
  verticalLabel(tokens, selected) {
    return { fontSize: 15, lineHeight: 20, fontWeight: selected ? "600" : "400", color: selected ? tokens["accent-foreground"] : tokens.foreground };
  },

  // --- count badge ---
  countBadgeBox(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 9999,
      borderWidth: 0,
      borderColor: "transparent",
      backgroundColor: tokens.secondary,
      paddingHorizontal: 7,
      paddingVertical: 1,
    };
  },
  countBadgeLabel(tokens, muted) {
    return { fontSize: 12, lineHeight: 16, fontWeight: "600", color: muted ? tokens["muted-foreground"] : tokens["secondary-foreground"] };
  },
};

// =============================================================================
// Android (Material 3): underline tabs. No container; each tab is text with a
// 3px brand `primary` indicator bar under the active tab; inactive labels read
// muted; press = android_ripple.
// =============================================================================

export const androidSkin: TabsSkin = {
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (tokens) => ({ color: alpha(tokens.primary, 0.12), borderless: false }),

  // --- underline (M3 primary tabs) ---
  underlineRow(tokens) {
    // M3 tabs sit on a hairline divider; no track fill.
    return {
      flexDirection: "row",
      alignItems: "stretch",
      borderBottomWidth: 1,
      borderColor: tokens.border,
    };
  },
  underlineTrigger() {
    // Taller M3 tab target; the indicator hugs the bottom edge.
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
    };
  },
  // M3 indicator: a 3px brand `primary` bar with a slight top rounding under
  // the active tab.
  underlineIndicator(tokens, selected) {
    return {
      position: "absolute",
      bottom: 0,
      start: 0,
      end: 0,
      height: 3,
      borderTopStartRadius: 3,
      borderTopEndRadius: 3,
      backgroundColor: selected ? tokens.primary : "transparent",
    };
  },
  underlineLabel(tokens, selected) {
    // M3 titleSmall ~14sp; active label carries the brand indigo, inactive muted.
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? primaryText(tokens) : tokens["muted-foreground"] };
  },

  // --- pills (M3 keeps the muted-track + tonal selected fill) ---
  pillsRow(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      borderRadius: 9999,
      backgroundColor: tokens.muted,
      padding: 4,
    };
  },
  pillsTrigger() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 9999,
      // clip the Material ripple to the rounded (capsule) outline
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingVertical: 7,
    };
  },
  pillsFill(tokens, selected) {
    // Tonal selected fill (secondaryContainer ~ alpha(primary, .12)).
    return selected ? { backgroundColor: alpha(tokens.primary, 0.12) } : { backgroundColor: "transparent" };
  },
  pillsLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? primaryText(tokens) : tokens["muted-foreground"] };
  },

  // --- vertical (M3 navigation rail row; active item is a tonal pill) ---
  verticalTrigger() {
    return {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 9999,
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingVertical: 9,
    };
  },
  verticalFill(tokens, selected) {
    return { backgroundColor: selected ? alpha(tokens.primary, 0.12) : "transparent" };
  },
  verticalLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: selected ? primaryText(tokens) : tokens["muted-foreground"] };
  },

  // --- count badge ---
  countBadgeBox(tokens) {
    return {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 9999,
      borderWidth: 0,
      borderColor: "transparent",
      backgroundColor: tokens.secondary,
      paddingHorizontal: 7,
      paddingVertical: 1,
    };
  },
  countBadgeLabel(tokens, muted) {
    return { fontSize: 12, lineHeight: 16, fontWeight: "500", color: muted ? tokens["muted-foreground"] : tokens["secondary-foreground"] };
  },
};
