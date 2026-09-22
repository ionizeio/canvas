import { primaryText } from "../../style/primary-text.js";
import { StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, customShadow, alpha, FOCUS_RESET } from "../../style/index.js";
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
//   Web: the SAME capsule segmented control as iOS (the owner's call, 2026-09-18:
//     the web tab is to look like the iOS tab, and under glass that is the
//     capsule track with the liquid-glass puck the shared shell derives from
//     these fills). The one departure is the keyboard focus ring, which a web
//     page must keep. The former web look (an underline rule, the Riskora card
//     of hairlined segments) is gone; do not bring it back as a mode-dependent
//     shape, the skin owns the anatomy and the surface mode owns the material.

export type Variant = "underline" | "pills" | "vertical";

// --- shared layout fragments (color-free; identical across platforms) --------

// flex-1: an equal-flex trigger in block mode (shares the row width).
export const flex1: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// opacity-50: the dimmed disabled look the component applies per trigger.
export const disabledDim: ViewStyle = { opacity: 0.5 };

// The selection tint lives with the other glass selections (Navbar, Sidebar, TabBar)
// in src/style/selection-tint.ts; re-exported here so the Tabs tests and skins keep
// their import.
export { selectionTint } from "../../style/selection-tint.js";

export const clearSelectionShadow: ViewStyle = shadow("none");

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

// The wrapping (`wrap`) non-block row: the scroller's hug-and-cap contract on the
// tablist itself (hugs the triggers while they fit, caps at the container, shrinks
// beside Row siblings), with the overflow laid out on further lines instead of
// panned. No flexGrow reset: a View never claims spare space on its own.
export const wrapRow: ViewStyle = {
  flexWrap: "wrap",
  flexShrink: 1,
  alignSelf: "flex-start",
  maxWidth: "100%",
};

// =============================================================================
// iOS (iOS 27 / Liquid Glass segmented control): the in-page tab strip is a
// CAPSULE segmented control (mirroring button-group's iOS 27 treatment). A
// capsule gray track (radius 9999) holds raised white CAPSULE pills (radius
// 9999); the pills look stays a segmented track too; vertical stays a left
// rail. Press = opacity dim.
// =============================================================================

const IOS_PILL_SHADOW: ViewStyle = customShadow({ offsetY: 1, radius: 2, opacity: 0.18, elevation: 2 });

// The capsule track's inset around its pills, and the pill's own height (7px above
// and below the 18px label line). The WRAPPED track's corner follows from them: a
// wrapped track is taller than one pill, so the capsule's 9999 would round its ends
// into semicircles cutting across the corner pills; the concentric radius (the
// pill's half-height plus the inset) seats a corner pill in a wrapped track exactly
// as the single-line capsule seats it, and the same inset opens between the lines.
const CAPSULE_INSET = 3;
const CAPSULE_PILL_PAD_Y = 7;
const CAPSULE_LABEL_LINE = 18;
const CAPSULE_WRAP_RADIUS = (CAPSULE_PILL_PAD_Y * 2 + CAPSULE_LABEL_LINE) / 2 + CAPSULE_INSET;

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

// The capsule segmented control, shared by iOS and web. iOS layers the
// keyboard-focus reset on top (below); web keeps the browser's focus ring.
const capsuleSkin: TabsSkin = {
  pressedOpacity: 0.8, // HIG: dim on press
  ripple: null,

  // --- underline -> capsule segmented control (gray track + raised pill) ---
  underlineRow(tokens, wrap) {
    // The capsule gray track (radius 9999, muted fill, 3px inset); wrapped, the
    // concentric corner and the inset between lines (see CAPSULE_WRAP_RADIUS).
    return {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 0,
      rowGap: wrap ? CAPSULE_INSET : 0,
      padding: CAPSULE_INSET,
      borderRadius: wrap ? CAPSULE_WRAP_RADIUS : 9999,
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
      paddingVertical: CAPSULE_PILL_PAD_Y,
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
    return { fontSize: 13, lineHeight: CAPSULE_LABEL_LINE, fontWeight: selected ? "600" : "500", color: tokens.foreground };
  },

  // --- pills (capsule segmented track, same gray-track + raised pill) ---
  pillsRow(tokens, wrap) {
    return {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 0,
      rowGap: wrap ? CAPSULE_INSET : 0,
      alignSelf: "flex-start",
      borderRadius: wrap ? CAPSULE_WRAP_RADIUS : 9999,
      backgroundColor: tokens.muted,
      padding: CAPSULE_INSET,
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
      paddingVertical: CAPSULE_PILL_PAD_Y,
    };
  },
  pillsFill(tokens, selected, dark) {
    return selected
      ? { ...IOS_PILL_SHADOW, backgroundColor: iosSelectedThumb(tokens, dark) }
      : { backgroundColor: "transparent" };
  },
  pillsLabel(tokens, selected) {
    return { fontSize: 13, lineHeight: CAPSULE_LABEL_LINE, fontWeight: selected ? "600" : "500", color: tokens.foreground };
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


// iOS: the capsule skin with the react-native-web blue keyboard-focus ring
// suppressed on its triggers; a real iOS segmented control never shows it.
// `outlineStyle`/`outlineWidth` are not in RN's ViewStyle (hence the cast inside
// FOCUS_RESET) and are ignored natively. Mirrors input/textarea/pagination's
// outline resets.
export const iosSkin: TabsSkin = { ...capsuleSkin, focusOutlineReset: FOCUS_RESET };

// Web: the capsule skin as is. The focus ring stays: keyboard users on the web
// need to see which segment holds focus, and the shared shell's roving tab
// stop makes the whole strip one Tab press away.
export const webSkin: TabsSkin = capsuleSkin;

// =============================================================================
// Android (Material 3): underline tabs. No container; each tab is text with a
// 3px brand `primary` indicator bar under the active tab; inactive labels read
// muted; press = android_ripple.
// =============================================================================

// The M3 pills track's inset and gap, and its pill's height (7dp around the 20sp
// label line): the wrapped track's concentric corner, as CAPSULE_WRAP_RADIUS above.
// The 4dp gap already opens between the lines, so nothing else changes wrapped.
const M3_PILL_INSET = 4;
const M3_PILL_PAD_Y = 7;
const M3_PILL_LABEL_LINE = 20;
const M3_PILL_WRAP_RADIUS = (M3_PILL_PAD_Y * 2 + M3_PILL_LABEL_LINE) / 2 + M3_PILL_INSET;

export const androidSkin: TabsSkin = {
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (tokens) => ({ color: alpha(tokens.primary, 0.12), borderless: false }),

  // --- underline (M3 primary tabs) ---
  underlineRow(tokens) {
    // M3 tabs sit on a hairline divider; no track fill. Wrapped, the lines stack
    // on the one divider, each tab's own indicator marking the active one.
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
  pillsRow(tokens, wrap) {
    return {
      flexDirection: "row",
      alignItems: "center",
      gap: M3_PILL_INSET,
      alignSelf: "flex-start",
      borderRadius: wrap ? M3_PILL_WRAP_RADIUS : 9999,
      backgroundColor: tokens.muted,
      padding: M3_PILL_INSET,
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
      paddingVertical: M3_PILL_PAD_Y,
    };
  },
  pillsFill(tokens, selected) {
    // Tonal selected fill (secondaryContainer ~ alpha(primary, .12)).
    return selected ? { backgroundColor: alpha(tokens.primary, 0.12) } : { backgroundColor: "transparent" };
  },
  pillsLabel(tokens, selected) {
    return { fontSize: 14, lineHeight: M3_PILL_LABEL_LINE, fontWeight: "500", color: selected ? primaryText(tokens) : tokens["muted-foreground"] };
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
