import { destructiveText } from "../../style/destructive-text.js";
import { StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, shadow, surfaceRipple, shape } from "../../style/index.js";

// Co-located ActionSheet skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark and read as glass when the
// shell renders the sheet through GlassSurface, which strips the skin's fill and
// paints the active material over its own `glass-tint`; the `popover` token itself
// is opaque in both modes and glass never rewrites it). ActionSheet is a
// platform-forward "Full" treatment: the BRAND survives on every platform (the
// semantic foreground labels and the `destructive` red), only the native SHAPE,
// structure, sizing, type, and press feedback change per OS:
//
//   iOS (iOS 27 Liquid Glass action sheet): ONE container anchored to the bottom —
//     corner radius 34 with continuous (superellipse) corners, 14pt inner padding,
//     a LEFT-aligned header (17/22 semibold primary-label title + 15/18 secondary
//     message) over a vertical stack of DETACHED ~48pt full-capsule action buttons
//     (gap 10, translucent neutral fill, 17/22 MEDIUM primary-label labels; red
//     `destructive` only, no hairline dividers). Cancel is a SEPARATE detached
//     capsule below it, aligned with the action buttons. ~8pt side inset, capped at
//     640 on wide viewports. Press = opacity dim (~0.8).
//   Android (Material 3 modal bottom sheet): a SINGLE rounded-top (28dp) sheet that
//     spans the width, a 32x4 drag handle at the top, then left-aligned list items
//     at 16sp; the destructive item tints its label red. Cancel is the LAST row in
//     the same sheet (M3 has no separate cancel card). Flat (the sheet's own
//     elevation comes from the scrim), press = android_ripple (neutral state layer).
//   Web: the established Canvas look (two separated rounded-14 cards with a centered
//     gray header and hairline-divided rows), since no web library ships an action
//     sheet. The stack is capped at 640 and centered so it never renders edge-to-edge
//     on a wide desktop window. Press = opacity dim.

// Ordinary action labels use the surface foreground for readable text in both
// schemes. Destructive actions retain their semantic red.

// How the Cancel affordance is structured. "separateCard" (iOS/web) renders a
// second rounded card below the actions card holding a bold Cancel row;
// "lastRow" (Android) folds Cancel into the single sheet as its final list row.
export type CancelLayout = "separateCard" | "lastRow";

// The contract a platform skin fulfills. The shell owns the full-screen Modal, the
// dimmed scrim, the bottom-anchored stack, the header (title/message), the action
// rows, the Cancel affordance, the open/close state, and the a11y wiring; the skin
// maps the active platform's shape/structure/sizing/type/feedback onto each piece,
// reading the tokens so light/dark keep working.
export interface ActionSheetSkin {
  /** The scrim dimming alpha behind the sheet (iOS/web ~0.4, Android ~0.32). */
  scrimOpacity: number;
  /** Where the Cancel affordance lives: a separate card (iOS/web) or the last row (Android). */
  cancelLayout: CancelLayout;
  /** The bottom-anchored stack container (side inset + gap between the cards). */
  stack: ViewStyle;
  /**
   * contentContainerStyle for the action-rows ScrollView. iOS uses it to space the
   * detached capsule buttons (gap 10); web/Android leave it undefined so the rows
   * sit flush (their separation comes from hairline dividers or M3 list spacing).
   */
  rowsContent?: ViewStyle;
  /** The actions card surface shape (radius, fill, shadow); fed to GlassSurface. */
  actionsCard: (t: ColorTokens) => ViewStyle;
  /** The separate Cancel card surface shape (iOS/web only); null on Android. */
  cancelCard: ((t: ColorTokens) => ViewStyle) | null;
  /** An optional drag handle at the top of the sheet (Android); null elsewhere. */
  handle: ((t: ColorTokens) => ViewStyle) | null;
  /** The title/message header block container (padding + alignment). */
  header: ViewStyle;
  /** The header title type (centered gray on iOS/web, left on Android). */
  headerTitle: (t: ColorTokens) => TextStyle;
  /** The header message type. */
  headerMessage: (t: ColorTokens) => TextStyle;
  /** A hairline divider drawn between the header and rows, and between rows (iOS/web). */
  divider: ((t: ColorTokens) => ViewStyle) | null;
  /** A single action row container (sizing + alignment). */
  row: ViewStyle;
  /**
   * A token-derived fill painted on each action row (iOS gives each capsule a
   * translucent neutral fill); null on web/Android, where the rows are flush and
   * take the card's fill.
   */
  rowFill: ((t: ColorTokens) => ViewStyle) | null;
  /** An action row label; `destructive` tints it red, `disabled` dims it. */
  rowLabel: (t: ColorTokens, destructive: boolean, disabled: boolean) => TextStyle;
  /** The Cancel row container (its own card on iOS/web; the last list row on Android). */
  cancelRow: ViewStyle;
  /** The Cancel row label (bold on iOS/web; a plain list label on Android). */
  cancelLabel: (t: ColorTokens) => TextStyle;
  /** iOS/web dim-on-press opacity; null on Android (the ripple carries press). */
  pressedOpacity: number | null;
  /** Android ripple over the rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- shared scrim (identical across platforms) ------------------------------

// The full-screen scrim container that fills the Modal and lays the stack against
// the bottom edge. It is a plain (non-interactive) TRANSPARENT layout View: the dim
// itself is a separate absolute-fill Animated layer the shell fades in, so the
// backdrop stays stationary while only the sheet slides (the skin's `scrimOpacity`
// is that layer's target alpha). The tap-to-dismiss target is likewise a separate
// absolute-fill Pressable, a sibling behind the sheet, so its <button> never wraps
// the action rows.
export const scrim: ViewStyle = { flex: 1, flexDirection: "column", justifyContent: "flex-end" };

// The dim layer itself: a full-bleed black fill whose opacity the shell animates
// from 0 to the skin's `scrimOpacity`. Black is fixed here and the alpha rides on
// `opacity` so the fade can run on the native driver (an animated backgroundColor
// cannot). It is inert to touch so the dismiss Pressable stacked over it takes
// every tap; that pointerEvents goes through StyleSheet.create because
// react-native-web silently drops the declaration from an inline style object.
export const scrimDim = StyleSheet.create({
  dim: { backgroundColor: "rgb(0, 0, 0)", pointerEvents: "none" },
}).dim;

// The sheet content layer. It sits ABOVE the absolute-fill dismiss backdrop (a
// preceding sibling): zIndex lifts the in-flow content over the out-of-flow
// backdrop so a tap on the sheet hits the sheet, and only a tap on the exposed
// scrim reaches the dismiss control.
export const scrimContent: ViewStyle = { zIndex: 1 };

// ---------- Web: the established Canvas look (= the iOS action sheet) ----------
// No web library ships an action sheet, so the kit's web look is the iOS idiom:
// two separated rounded-14 cards anchored to the bottom, a centered gray header,
// hairline-divided ~17pt foreground action rows, a red destructive label, and a
// separate bold Cancel card. Press = opacity dim.
const WEB_RADIUS = shape.web.dialog;
// Cap the bottom stack so it never spans a wide desktop window edge-to-edge (an
// uncapped action sheet reads as broken at ~2000px). 640 mirrors the M3 bottom-sheet
// max-width; alignSelf centers it in the scrim.
const STACK_MAX_WIDTH = 640;
export const webSkin: ActionSheetSkin = {
  scrimOpacity: 0.4,
  cancelLayout: "separateCard",
  // paddingBottom keeps the Cancel card off the viewport edge (the safe-area inset
  // is 0 on web); Android stays flush per M3, so the padding lives in these skins.
  stack: { width: "100%", maxWidth: STACK_MAX_WIDTH, alignSelf: "center", paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  actionsCard: (t) => ({ borderRadius: WEB_RADIUS, backgroundColor: t.popover, ...shadow("lg") }),
  cancelCard: (t) => ({ borderRadius: WEB_RADIUS, backgroundColor: t.popover, ...shadow("lg") }),
  handle: null,
  header: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  headerTitle: (t) => ({ fontSize: 13, lineHeight: 18, fontWeight: "600", color: t["muted-foreground"], textAlign: "center" }),
  headerMessage: (t) => ({ marginTop: 2, fontSize: 13, lineHeight: 18, color: t["muted-foreground"], textAlign: "center" }),
  divider: (t) => ({ height: 1, backgroundColor: t.border }),
  row: { minHeight: 57, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  rowFill: null,
  rowLabel: (t, destructive, disabled) => ({
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    textAlign: "center",
    color: destructive ? destructiveText(t) : t["popover-foreground"],
    opacity: disabled ? 0.4 : 1,
  }),
  cancelRow: { minHeight: 57, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  cancelLabel: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "600", textAlign: "center", color: t["popover-foreground"] }),
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- iOS 27 (Liquid Glass action sheet): ONE container, capsule rows ----------
// The iOS 26/27 redesign (iOS 27 UI Kit "Action Sheets" symbol, inspected 2026-07-12).
// A single Liquid Glass container anchored to the bottom over a dimmed scrim:
//   - Container: corner radius 34, continuous (superellipse) corners, 14pt inner
//     padding. GlassSurface supplies the material (fill stripped under glass); the
//     `popover` fill + shadow render on the solid fallback.
//   - Header: LEFT-aligned inside padding 8 (sides/top) / 24 (bottom), 10pt gap.
//     Title = SF Pro Semibold (600) 17/22 in the PRIMARY label color (foreground);
//     message = SF Pro Regular (400) 15/18 at 68% foreground (secondary label).
//   - Actions: a vertical stack of DETACHED full-capsule buttons, each 48pt tall
//     with a translucent neutral fill, gap 10, no hairline dividers. Labels are
//     SF Pro MEDIUM (500) 17/22 CENTERED in the primary label color — red is
//     reserved for `destructive`; a disabled row swaps to the tertiary gray label
//     (not a faded accent). The brand tint no longer stands in for system blue: the
//     current OS idiom is neutral-labeled.
//   - Cancel: a SEPARATE detached capsule below the container (its own glass card),
//     aligned with the action buttons via a 14pt side margin; bold (600) primary
//     label. Press = opacity dim (~0.8).
const IOS_RADIUS = 34;
const IOS_CAPSULE = 9999; // full capsule (calc(infinity*1px)); the renderer clamps to height/2
const IOS_ROW_FILL = 0.1; // translucent neutral fill on the capsules (iOS system-fill idiom)
export const iosSkin: ActionSheetSkin = {
  scrimOpacity: 0.4,
  cancelLayout: "separateCard",
  // paddingBottom floats the sheet off the bottom edge, composing with the
  // safe-area inset above the home indicator (the iOS 26/27 detached-sheet gap).
  stack: { width: "100%", maxWidth: STACK_MAX_WIDTH, alignSelf: "center", paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  rowsContent: { gap: 10 },
  actionsCard: (t) => ({ borderRadius: IOS_RADIUS, borderCurve: "continuous", padding: 14, backgroundColor: t.popover, ...shadow("lg") }),
  // A separate standalone Cancel capsule, inset 14 so it lines up with the action
  // buttons inside the container's 14pt padding.
  cancelCard: (t) => ({ marginHorizontal: 14, borderRadius: IOS_CAPSULE, borderCurve: "continuous", backgroundColor: t.popover, ...shadow("lg") }),
  handle: null,
  header: { paddingTop: 8, paddingHorizontal: 8, paddingBottom: 24, gap: 10, alignItems: "flex-start" },
  headerTitle: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43, color: t.foreground }),
  headerMessage: (t) => ({ fontSize: 15, lineHeight: 18, fontWeight: "400", letterSpacing: -0.24, color: alpha(t.foreground, 0.72) }),
  divider: null,
  row: {
    minHeight: 48,
    borderRadius: IOS_CAPSULE,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  // The translucent neutral capsule fill. It sits on the row (not on the
  // GlassSurface itself), so it survives the glass fill-strip and shows as a subtle
  // capsule on the frosted/solid surface; it adapts to the scheme via foreground.
  rowFill: (t) => ({ backgroundColor: alpha(t.foreground, IOS_ROW_FILL) }),
  rowLabel: (t, destructive, disabled) => ({
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "500",
    letterSpacing: -0.43,
    textAlign: "center",
    // Neutral primary label; red only for destructive; a disabled row goes tertiary
    // gray (the iOS "swap to the tertiary label color" disabled treatment).
    color: disabled ? alpha(t.foreground, 0.3) : destructive ? destructiveText(t) : t.foreground,
  }),
  cancelRow: { minHeight: 56, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  cancelLabel: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43, textAlign: "center", color: t.foreground }),
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 modal bottom sheet): one rounded-top sheet ----------
// M3 has no action sheet; the equivalent is a modal bottom sheet of list items. A
// SINGLE sheet spans the width and rounds its top corners 28dp, with a 32x4 drag
// handle at the top. The header sits left-aligned, then left-aligned list items at
// 16sp (the destructive item tints its label red). Cancel folds into the SAME
// sheet as its last list row (no separate cancel card). Press = android_ripple
// (neutral state layer); the sheet is flat (the scrim supplies the separation).
const ANDROID_RADIUS = 28;
export const androidSkin: ActionSheetSkin = {
  scrimOpacity: 0.32,
  cancelLayout: "lastRow",
  // M3 bottom sheets span the full width only up to 640dp; on a wider window they
  // cap at 640dp and center (fixes the edge-to-edge render on a desktop window).
  stack: { width: "100%", maxWidth: STACK_MAX_WIDTH, alignSelf: "center" },
  rowsContent: undefined,
  actionsCard: (t) => ({
    borderTopStartRadius: ANDROID_RADIUS,
    borderTopEndRadius: ANDROID_RADIUS,
    backgroundColor: t.popover,
    paddingBottom: 8,
  }),
  cancelCard: null,
  // The M3 drag handle: a 32x4 rounded bar, centered at the top, in the on-surface
  // color at low alpha (the M3 "surfaceContainerHighest on-surface variant" cue).
  // M3 pads it 22dp top AND bottom so the handle sits in a ~48dp touch zone.
  handle: (t) => ({
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 22,
    marginBottom: 22,
    backgroundColor: alpha(t["muted-foreground"], 0.4),
  }),
  header: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 24, alignItems: "flex-start" },
  // M3 title-medium: 16/24/500 with +0.15 tracking.
  headerTitle: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: t["popover-foreground"] }),
  headerMessage: (t) => ({ marginTop: 4, fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  // M3 list items are flush (no hairline rules between rows).
  divider: null,
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
  rowFill: null,
  // M3 body-large: 16/24/400 with +0.5 tracking.
  rowLabel: (t, destructive, disabled) => ({
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    letterSpacing: 0.5,
    color: destructive ? destructiveText(t) : t["popover-foreground"],
    opacity: disabled ? 0.38 : 1,
  }),
  cancelRow: { minHeight: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 24 },
  cancelLabel: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0.5, color: t["popover-foreground"] }),
  pressedOpacity: null,
  // Route the neutral M3 state-layer ripple through the shared helper (same output
  // as the previous inline value; keeps the ripple definition in one place).
  ripple: (t) => surfaceRipple(t),
};
