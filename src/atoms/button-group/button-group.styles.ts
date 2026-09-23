import { primaryText } from "../../style/primary-text.js";
import { actionFill, actionInk } from "../../style/action.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, shadow, customShadow, shape } from "../../style/index.js";
import { type ButtonGroupSkin, type Size } from "./button-group.shared.js";

// Co-located ButtonGroup skins, one per platform. The group is laid out per
// segment in JS (there are no `first:`/`last:` style variants, so the joined-
// corner and shared-border math is computed here). The BRAND survives on every
// platform (the indigo `primary` token and the semantic tokens, never a platform
// default), and only the native SHAPE, sizing, structure, and press feedback
// change per OS:
//   iOS (UISegmentedControl): a gray rounded CONTAINER (radius 8, muted fill,
//     ~3px inset) holding segments; the SELECTED segment is a raised white pill
//     (radius 6, small shadow) with NO visible dividers (iOS 13+ style); labels
//     ~13pt. Press = opacity dim.
//   Android (M3 SegmentedButton): the GROUP is a fully-rounded stadium (1dp
//     `border` outline); segments share 1dp borders (no gap); the SELECTED
//     segment is a tonal fill (alpha(primary, .12)) with a brand-indigo label and
//     a leading check; press = android_ripple.
//   Web: the established Canvas look (joined buttons; selected = solid primary
//     fill; shared 1px borders overlapped by -1px), lifted verbatim.

// --- shared size scales (brand type/sizing, identical across platforms) ------

// Height + horizontal padding per size, mirroring the docs segSize scale
// (h-8 px-3 / h-9 px-4 / h-10 px-5).
export const sizeContainer: Record<Size, ViewStyle> = {
  small: { height: 32, paddingHorizontal: 12 },
  default: { height: 36, paddingHorizontal: 16 },
  large: { height: 40, paddingHorizontal: 20 },
};

// Label type per size (text-xs for small, text-sm otherwise).
export const sizeLabel: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  default: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 14, lineHeight: 20 },
};

// Height-only per size, for cells whose padding differs from sizeContainer
// (the split chevron and the stepper's chevron cells: h-8 / h-9 / h-10).
export const sizeHeight: Record<Size, number> = {
  small: 32,
  default: 36,
  large: 40,
};

// Chevron glyph px per size (small gets the tighter 14px arrow).
export const chevronSize: Record<Size, number> = {
  small: 14,
  default: 16,
  large: 16,
};

// --- shared layout fragments (color-free; identical across platforms) --------

// Row of a centered label inside a cell. Border width is supplied by the skin
// (iOS segments are borderless; Android/web are 1px). Press feedback is applied
// by the component's Pressable.
export const segmentBase: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
};

// The dimmed look applied to a disabled group/segment (opacity-50).
export const dim: ViewStyle = { opacity: 0.5 };

// The split control's outer row, anchoring the (absolute) dropdown. Every group
// is HUG: the shell appends `useHugStyle()` (src/style/sizing.ts) at the root, so
// no container here carries a static alignSelf (which would pin a Row child to the
// top of a centered Row).
export const splitContainer: ViewStyle = {
  position: "relative",
  flexDirection: "row",
  alignItems: "center",
};

// When the split dropdown is open, the container is lifted into its own stacking
// context above sibling content. react-native-web gives every positioned View an
// implicit stacking context, so the menu's own `zIndex` is scoped INSIDE the
// `relative` container and cannot rise above a later sibling. Raising the
// container's zIndex while open lifts the whole control — buttons and menu
// together — above everything painted after it.
export const splitContainerLifted: ViewStyle = { zIndex: 50 };

// A split-menu dropdown row: padded, rounded; the pressed branch tints it.
export const splitMenuItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 2,
  paddingHorizontal: 8,
  paddingVertical: 6,
};

// The stepper's outer row.
export const stepperContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
};

// A plain row of detached peers separated by a gap (gap-2).
export const spacedContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
};

// The attached-segment row (no gap; segments share borders).
export const segmentedContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
};

// The `block` modifier, pure color-free layout that is identical on every
// platform (so it lives here once, not in the skins): the group row is FILL
// (`useSizing({ block })` in the shell), and each segment flexes to an equal
// share. RN's `flex: 1` sets flex-basis 0, so segments split evenly regardless
// of how long their labels are.
export const blockSegment: ViewStyle = { flex: 1 };

// Glass is a theme material, shared across skins. Native controls retain their
// platform feedback and glyphs; GlassSurface resolves the platform's material.
export const glassCorners: ViewStyle = { borderRadius: 9999 };
export const glassStartCorners: ViewStyle = { borderTopStartRadius: 9999, borderBottomStartRadius: 9999 };
export const glassEndCorners: ViewStyle = { borderTopEndRadius: 9999, borderBottomEndRadius: 9999 };
export const glassSegmentedContainer: ViewStyle = {
  ...segmentedContainer,
  padding: 3,
  ...glassCorners,
};
export const glassSelectionPosition: ViewStyle = { position: "absolute", pointerEvents: "none" };
export const glassSelectionShadow: ViewStyle = customShadow({ offsetY: 1, radius: 3, opacity: 0.12, elevation: 2 });
export const glassCell: ViewStyle = {
  backgroundColor: "transparent",
  borderWidth: 0,
  borderTopWidth: 0,
  borderBottomWidth: 0,
  borderStartWidth: 0,
  marginStart: 0,
};
export const glassSegmentLabel = (t: ColorTokens, selected: boolean): TextStyle => ({
  color: selected ? primaryText(t) : t.foreground,
  fontWeight: selected ? "600" : "500",
});
export const glassDivider = (t: ColorTokens, height: number): ViewStyle => ({
  width: 1,
  height: height / 2,
  backgroundColor: t.border,
});

// =============================================================================
// Web: the Riskora control (the 12px corner on a run's outer edges, the sky fill on
// the selected segment, the `card` fill with the 3:1 `input` boundary otherwise).
// =============================================================================

const WEB_R = shape.web.control;

export const webSkin: ButtonGroupSkin = {
  // No wrapper around segmented (the row is bare); selected lifts above its
  // neighbors so its primary border wins on the shared edges.
  segmentedWrap: () => null,
  segmentBorderWidth: 1,
  joinCorners(index, count) {
    if (count === 1) return { borderRadius: WEB_R };
    if (index === 0) return { borderTopStartRadius: WEB_R, borderBottomStartRadius: WEB_R };
    if (index === count - 1) return { borderTopEndRadius: WEB_R, borderBottomEndRadius: WEB_R };
    return {};
  },
  spacedCorners: { borderRadius: WEB_R },
  // All but the leading segment overlap the previous border by 1px (-ml-px).
  overlap: { marginStart: -1 },
  segmentSurface(t, selected) {
    return selected
      ? { zIndex: 10, borderColor: t.primary, backgroundColor: t.primary }
      : { borderColor: t.input, backgroundColor: t.card };
  },
  segmentLabel(t, selected) {
    return { fontWeight: "500", color: selected ? t["primary-foreground"] : t.foreground };
  },
  // Glyphs track the label: on-primary over the selected fill, foreground otherwise.
  segmentIconColor: (selected) => (selected ? "primaryForeground" : "foreground"),
  showSelectedCheck: false,

  // --- split ---
  splitPrimary(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopStartRadius: WEB_R,
      borderBottomStartRadius: WEB_R,
      backgroundColor: actionFill(t),
    };
  },
  splitPrimaryLabel(t) {
    return { fontWeight: "500", color: actionInk(t) };
  },
  splitDivider(t, height) {
    return { width: 1, height, backgroundColor: alpha(actionInk(t), 0.2) };
  },
  splitTrigger(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopEndRadius: WEB_R,
      borderBottomEndRadius: WEB_R,
      backgroundColor: actionFill(t),
      paddingHorizontal: 10,
      height,
    };
  },
  splitMenu(t) {
    return {
      position: "absolute",
      top: "100%",
      end: 0,
      zIndex: 50,
      marginTop: 4,
      minWidth: 180,
      borderRadius: shape.web.menu,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.popover,
      padding: 8,
      ...shadow("lg"),
    };
  },
  splitMenuItemPressed(t) {
    return { backgroundColor: t.accent };
  },
  splitMenuText(t) {
    return { fontSize: 14, lineHeight: 20, color: t["popover-foreground"] };
  },

  // --- stepper ---
  stepperArrow(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.input,
      backgroundColor: t.background,
      paddingHorizontal: 8,
      height,
    };
  },
  stepperArrowLeft: { borderTopStartRadius: 6, borderBottomStartRadius: 6 },
  stepperArrowRight: { marginStart: -1, borderTopEndRadius: 6, borderBottomEndRadius: 6 },
  stepperMiddle(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      marginStart: -1,
      borderColor: t.input,
      backgroundColor: t.background,
    };
  },
  stepperLabel(t) {
    return { fontWeight: "500", color: t.foreground };
  },
  stepperChevronColor: "muted",

  pressedOpacity: 0.9,
};

// =============================================================================
// iOS (UISegmentedControl): gray rounded container, raised white selected pill.
// =============================================================================

const IOS_PILL_SHADOW: ViewStyle = customShadow({ offsetY: 1, radius: 2, opacity: 0.18, elevation: 2 });

export const iosSkin: ButtonGroupSkin = {
  // The gray CAPSULE track that holds the segments (radius 9999, muted fill, a
  // 3px inset so the selected pill floats inside). iOS 26+ (Liquid Glass) draws
  // the segmented control as a capsule, not a rounded rectangle.
  segmentedWrap(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      padding: 3,
      borderRadius: 9999,
      backgroundColor: t.muted,
    };
  },
  segmentBorderWidth: 0, // iOS 13+ has no visible dividers/borders
  joinCorners() {
    // Every segment is an independent CAPSULE pill (radius 9999) inside the
    // track; the selected one floats as a raised white capsule.
    return { borderRadius: 9999 };
  },
  spacedCorners: { borderRadius: 8 },
  overlap: null, // no shared borders; the track's padding spaces them
  segmentSurface(t, selected) {
    return selected
      ? { ...IOS_PILL_SHADOW, backgroundColor: t.background }
      : { backgroundColor: "transparent" };
  },
  segmentLabel(t, selected) {
    // ~13pt SF label; selected reads slightly heavier. Both stay on-foreground
    // (the selected pill is white/elevated, not a brand fill).
    return { fontWeight: selected ? "600" : "500", color: t.foreground };
  },
  // Glyphs track the label: on-foreground on and off the white/elevated thumb.
  segmentIconColor: () => "foreground",
  showSelectedCheck: false,

  // --- split (HIG: primary action + chevron, brand fill, capsule) ---
  // The split is two prominent iOS buttons joined by a hairline, so the outer
  // corners read as one capsule group (radius 9999), matching button.styles.ts
  // (iOS 27 prominent buttons are full pills) and this skin's segmented pills.
  splitPrimary(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopStartRadius: 9999,
      borderBottomStartRadius: 9999,
      backgroundColor: actionFill(t),
    };
  },
  splitPrimaryLabel(t) {
    return { fontWeight: "600", color: actionInk(t) };
  },
  splitDivider(t, height) {
    return { width: 1, height, backgroundColor: alpha(actionInk(t), 0.2) };
  },
  splitTrigger(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopEndRadius: 9999,
      borderBottomEndRadius: 9999,
      backgroundColor: actionFill(t),
      paddingHorizontal: 10,
      height,
    };
  },
  splitMenu(t) {
    return {
      position: "absolute",
      top: "100%",
      end: 0,
      zIndex: 50,
      marginTop: 6,
      minWidth: 200,
      borderRadius: 12, // HIG menu sheet
      borderWidth: 0,
      borderColor: t.border,
      backgroundColor: t.popover,
      padding: 6,
      ...shadow("lg"),
    };
  },
  splitMenuItemPressed(t) {
    return { backgroundColor: t.accent };
  },
  splitMenuText(t) {
    return { fontSize: 15, lineHeight: 20, color: t["popover-foreground"] };
  },

  // --- stepper (HIG: gray-tracked prev/current/next, rounded 8) ---
  stepperArrow(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
      backgroundColor: t.muted,
      paddingHorizontal: 10,
      height,
    };
  },
  stepperArrowLeft: { borderTopStartRadius: 8, borderBottomStartRadius: 8 },
  stepperArrowRight: { marginStart: 1, borderTopEndRadius: 8, borderBottomEndRadius: 8 },
  stepperMiddle(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
      marginStart: 1,
      backgroundColor: t.muted,
    };
  },
  stepperLabel(t) {
    return { fontWeight: "600", color: t.foreground };
  },
  stepperChevronColor: "foreground",

  pressedOpacity: 0.8,
};

// =============================================================================
// Android (Material 3 SegmentedButton): stadium group, tonal selected fill.
// =============================================================================

export const androidSkin: ButtonGroupSkin = {
  // The group is a fully-rounded stadium outlined in 1dp `border`; the segments
  // sit inside and supply their own shared 1dp dividers.
  segmentedWrap(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: t.border,
      overflow: "hidden",
    };
  },
  segmentBorderWidth: 0, // the wrap draws the outer outline; dividers are drawn below
  joinCorners() {
    // The stadium wrap clips the corners; segments themselves are square.
    return {};
  },
  // overflow:hidden clips the Material ripple to the rounded outline (spaced peers are pills).
  spacedCorners: { borderRadius: 9999, overflow: "hidden" },
  // Each segment after the first draws a 1dp leading divider in the outline color.
  overlap: null,
  segmentDivider: (t) => ({ borderStartWidth: 1, borderStartColor: t.border }),
  segmentSurface(t, selected) {
    // Selected = tonal fill (secondaryContainer ≈ alpha(primary, .12)).
    return selected ? { backgroundColor: alpha(t.primary, 0.12) } : { backgroundColor: "transparent" };
  },
  segmentLabel(t, selected) {
    // labelMedium; selected reads in brand indigo (onSecondaryContainer ≈ primary).
    return { fontWeight: "500", color: selected ? primaryText(t) : t.foreground };
  },
  // Glyphs track the label: brand indigo on the tonal selected fill.
  segmentIconColor: (selected) => (selected ? "primary" : "foreground"),
  showSelectedCheck: true,

  // --- split (M3: brand-filled primary + chevron, stadium) ---
  splitPrimary(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopStartRadius: 9999,
      borderBottomStartRadius: 9999,
      backgroundColor: actionFill(t),
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
    };
  },
  splitPrimaryLabel(t) {
    return { fontWeight: "500", color: actionInk(t) };
  },
  splitDivider(t, height) {
    return { width: 1, height, backgroundColor: alpha(actionInk(t), 0.24) };
  },
  splitTrigger(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopEndRadius: 9999,
      borderBottomEndRadius: 9999,
      backgroundColor: actionFill(t),
      paddingHorizontal: 10,
      height,
      // clip the Material ripple to the rounded outline
      overflow: "hidden",
    };
  },
  splitMenu(t) {
    return {
      position: "absolute",
      top: "100%",
      end: 0,
      zIndex: 50,
      marginTop: 4,
      minWidth: 200,
      borderRadius: 4, // M3 menu container
      borderWidth: 0,
      borderColor: t.border,
      backgroundColor: t.popover,
      paddingVertical: 8,
      ...shadow("lg"),
    };
  },
  splitMenuItemPressed(t) {
    return { backgroundColor: alpha(t.primary, 0.12) };
  },
  splitMenuText(t) {
    return { fontSize: 14, lineHeight: 20, color: t["popover-foreground"] };
  },

  // --- stepper (M3: outlined stadium prev/current/next) ---
  stepperArrow(t, height) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: "transparent",
      paddingHorizontal: 10,
      height,
      // clip the Material ripple to the rounded stadium outline (the arrow cells are pill-cornered)
      overflow: "hidden",
    };
  },
  stepperArrowLeft: { borderTopStartRadius: 9999, borderBottomStartRadius: 9999 },
  stepperArrowRight: { marginStart: -1, borderTopEndRadius: 9999, borderBottomEndRadius: 9999 },
  stepperMiddle(t) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      marginStart: -1,
      borderColor: t.border,
      backgroundColor: "transparent",
    };
  },
  stepperLabel(t) {
    return { fontWeight: "500", color: t.foreground };
  },
  stepperChevronColor: "muted",

  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
};
