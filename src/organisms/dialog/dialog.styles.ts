import { destructiveText } from "../../style/destructive-text.js";
import { scrimFill } from "../../style/scrim.js";
import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha, widths, shape } from "../../style/index.js";

// Co-located Dialog skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark and read as glass when the
// shell renders the panel through GlassSurface, which strips the skin's fill and
// paints the active material over its own `glass-tint`; the `popover` token itself
// is opaque in both modes and glass never rewrites it). The BRAND
// survives on every platform (the indigo `primary` confirm action, the
// `destructive` red for an irreversible confirm); only the native SHAPE, sizing,
// title alignment, body type, footer layout, and backdrop dimming change per OS:
//   iOS (iOS 27 / Liquid Glass alert): a centered card (28 radius, `popover`
//     fill, NO border, soft lg shadow) over a ~0.30 black backdrop; a LEFT-aligned
//     ~20pt/700 title, a ~15pt muted LEFT body, and a side-by-side row of CAPSULE
//     action buttons (a gray `secondary` Cancel capsule + a `primary` indigo
//     Confirm capsule; a destructive confirm is a gray capsule with `destructive`
//     red text), NO hairline dividers; press = opacity dim (~0.8).
//   Android (Material 3 basic dialog): a card (28 radius, `popover` elevated
//     surface, shadow lg) over a ~0.32 black scrim; a LEFT-aligned ~22pt title,
//     a 14sp body, and TEXT-button actions (no fill) bottom-RIGHT in a row
//     (Cancel then Confirm) in brand-indigo text, an android_ripple on each, and
//     NO dividers.
//   Web: the established Canvas look (the current dialog, lifted verbatim) — a
//     bordered card (8 radius, `border`, `popover` fill, xl shadow) over a 0.50
//     black backdrop; a 16pt/600 left title, a 14pt muted body, and a
//     right-aligned action row of an outline Cancel + a primary/destructive
//     Confirm Button.

export type Size = "xs" | "small" | "medium" | "default" | "large" | "wide";

// The dialog card's max width per size, narrowest to widest, drawn from the
// shared width scale (src/style/tokens.ts `widths`): the default sits one step
// wider than `medium`, roomy enough for a short form; `xs`/`small` tighten the
// panel for a terse message, `large`/`wide` open it up for a longer form.
export const PANEL_MAX_WIDTH: Record<Size, number> = {
  xs: widths.xs,
  small: widths.sm,
  medium: widths.md,
  default: widths.lg,
  large: widths.xl,
  wide: widths.xxl,
};

// How the footer renders its actions. The web/Android footer is a horizontal
// row of Buttons (web) / text buttons (Android); iOS renders a side-by-side row
// of CAPSULE buttons (the iOS 27 alert: a gray Cancel capsule + a primary
// Confirm capsule, no dividers). The shell reads this to pick the footer
// structure.
export type FooterKind = "buttons" | "capsules";

// The contract a platform skin fulfills. The shell renders the backdrop, the
// centered card (shape/fill/border/shadow from the skin), the title, the body,
// the optional data-driven form, and the footer; the skin maps each piece onto
// the active platform's look. The footer kind picks between a Button row
// (web/Android) and iOS's side-by-side capsule row.
export interface DialogSkin {
  /** The dim backdrop behind the card (full black at the per-platform opacity). */
  backdrop: (t: ColorTokens) => ViewStyle;
  /** The card layout box: shape, fill, border (or lack of), shadow, padding. The
   *  shell supplies the per-size maxWidth inline. */
  card: (t: ColorTokens) => ViewStyle;
  /** The title type: size, weight, alignment, color. */
  title: (t: ColorTokens) => TextStyle;
  /** The body/description type: size, color, alignment. */
  body: (t: ColorTokens) => TextStyle;
  /** Whether the footer is a Button row or iOS's side-by-side capsule row. */
  footerKind: FooterKind;
  /** The footer container (the action row). */
  footer: (t: ColorTokens) => ViewStyle;
  // --- capsule (iOS) footer pieces; null on the Button-row platforms ---------
  /** A single capsule action button's box (shape/padding); each capsule grows to
   *  share the row evenly. `confirm` true for the primary/confirm capsule. */
  capsule: ((t: ColorTokens, confirm: boolean, destructive: boolean) => ViewStyle) | null;
  /** The label inside a capsule; `confirm` true for the primary confirm action
   *  (drawn on the indigo fill), `destructive` true for an irreversible confirm
   *  (red text on a gray capsule). */
  capsuleLabel: ((t: ColorTokens, confirm: boolean, destructive: boolean) => TextStyle) | null;
  /** Opacity applied to a pressed capsule (iOS dims; null elsewhere). */
  capsulePressedOpacity: number | null;
  // --- text-button (Android) footer pieces; null elsewhere -------------------
  /** An Android text-button touch target (no fill, brand-indigo label). */
  textButton: ViewStyle | null;
  /** The Android text-button label; `destructive` reds an irreversible confirm. */
  textButtonLabel: ((t: ColorTokens, destructive: boolean) => TextStyle) | null;
  /** The Android ripple over a text button; null on the other platforms. */
  textButtonRipple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  // --- data-driven body form (Amount + Reason) -------------------------------
  /** Wrapper above the form fields. */
  formBody: ViewStyle;
  /** A field label above an input. */
  fieldLabel: (t: ColorTokens) => TextStyle;
  /** Extra top inset for the second field label. */
  fieldLabelGap: ViewStyle;
  /** The Amount row (currency glyph + input). */
  amountRow: ViewStyle;
  /** The leading currency glyph; the Amount input beside it is FILL and takes the rest of the row. */
  currency: (t: ColorTokens) => TextStyle;
}

// --- outer shell (identical across platforms) -------------------------------

// The outermost wrapper fills its container's width so the modal panel can cap to
// the width actually available (see cardWidth): a narrow container (a phone screen,
// the docs preview cell) then shrinks the panel to fit instead of letting its fixed
// per-size width overflow the screen. `minWidth: 0` lets it shrink below the panel's
// content width when it is a flex item in a row. The trigger button is wrapped in
// `triggerWrap` so it keeps its natural width rather than stretching to this full width.
export const root: ViewStyle = { width: "100%", minWidth: 0 };

// Keeps the optional trigger button at its natural (content) width and leading-aligned,
// so the full-width `root` above does not stretch it across the container.
export const triggerWrap: ViewStyle = { alignSelf: "flex-start" };

// Inset between the trigger button and the backdrop when a trigger is rendered.
export const backdropTriggerGap: ViewStyle = { marginTop: 12 };

// The contained backdrop sizing (centered, with presence in the docs preview via
// an explicit minHeight). The per-platform fill/radius come from the skin.
// `minWidth: 0` lets the backdrop shrink below the card's content width so a narrow
// container caps the panel (the card's maxWidth:"100%") instead of overflowing.
// The overlay presentation: fills the nearest OverlayProvider rather than
// taking part in page flow, so the scrim genuinely covers the page behind it and
// `aria-modal` is a true statement. No minHeight here, the layer supplies it.
export const backdropOverlay: ViewStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  minWidth: 0,
};

export const backdropLayout: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  minHeight: 220,
  minWidth: 0,
};

// The card layout box (width up to its per-size cap). Shape/fill/shadow come
// from the skin; this owns the box-model that every platform shares.
export const cardLayout: ViewStyle = { width: "100%", padding: 24 };

// The sizing box for the animated Entrance wrapper: it fills the centered backdrop
// (up to cardWidth's cap) so the card keeps its width while the wrapper owns the
// scale-fade. The card's own padding stays on cardLayout, inside the wrapper.
export const cardSizing: ViewStyle = { width: "100%" };

// Per-size panel width: a dialog is a floating container (a bounds provider for
// its own content), so it spans its backdrop and caps at its size's step of the
// width scale. The backdrop is definite (the viewport, a host, the docs stage),
// which is what lets `width:"100%"` resolve; a content-sized parent would
// collapse it, and the docs stage stopped being one for exactly that reason.
export function cardWidth(size: Size): ViewStyle {
  return { width: "100%", maxWidth: PANEL_MAX_WIDTH[size] };
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// The current dialog: a card (rounded-lg border bg-popover p-6 shadow-xl) over a
// bg-black/50 backdrop; a 16/24 600 title, a 14/20 muted-foreground body, and a
// right-aligned action row (gap-2, mt-6) of an outline Cancel + a primary/
// destructive Confirm Button.
// The Riskora dialog: a 16px-cornered card under a 60% scrim, the ambient xl shade,
// an 18px medium title over muted body copy.
export const webSkin: DialogSkin = {
  backdrop: (t) => ({ borderRadius: shape.web.dialog, backgroundColor: scrimFill(t, 0.6) }),
  card: (t) => ({
    borderRadius: shape.web.dialog,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    ...shadow("xl"),
  }),
  title: (t) => ({ fontSize: 18, lineHeight: 28, fontWeight: "500", color: t["popover-foreground"] }),
  body: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"], marginTop: 8 }),
  footerKind: "buttons",
  footer: () => ({ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 }),
  capsule: null,
  capsuleLabel: null,
  capsulePressedOpacity: null,
  textButton: null,
  textButtonLabel: null,
  textButtonRipple: null,
  formBody: { marginTop: 20 },
  fieldLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground, marginBottom: 6 }),
  fieldLabelGap: { marginTop: 16 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  currency: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"], marginEnd: 8 }),
};

// ---------- iOS (iOS 27 alert): rounded card, no border, side-by-side capsules ----------
// iOS 27 (iOS 26+ / Liquid Glass) alert: a centered card (28pt radius) over the
// `popover` fill with NO border and a soft shadow, on a ~0.30 black backdrop; a
// LEFT-aligned 20pt/700 title, a 15pt muted LEFT body, and a side-by-side row of
// CAPSULE action buttons — a gray `secondary` Cancel capsule + a `primary`
// indigo Confirm capsule, with NO hairline dividers. A destructive confirm keeps
// the gray `secondary` capsule but draws its label in the `destructive` red. Each
// capsule shares the row evenly; a pressed capsule dims (no ripple) at 0.8.
const IOS_RADIUS = 28;
const IOS_CAPSULE_RADIUS = 22;
export const iosSkin: DialogSkin = {
  backdrop: (t) => ({ borderRadius: 8, backgroundColor: scrimFill(t, 0.3) }),
  card: (t) => ({
    borderRadius: IOS_RADIUS,
    backgroundColor: t.popover,
    ...shadow("lg"),
  }),
  title: (t) => ({
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    color: t["popover-foreground"],
    textAlign: "left",
  }),
  body: (t) => ({
    fontSize: 15,
    lineHeight: 20,
    color: t["muted-foreground"],
    textAlign: "left",
    marginTop: 8,
  }),
  footerKind: "capsules",
  footer: () => ({ flexDirection: "row", gap: 12, marginTop: 20 }),
  // A capsule sized to share the row evenly. The Confirm capsule fills with the
  // indigo `primary`; Cancel and a destructive Confirm both fill with the gray
  // `secondary` surface (the destructive variant only reds its label).
  capsule: (t, confirm, destructive) => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
    borderRadius: IOS_CAPSULE_RADIUS,
    backgroundColor: confirm && !destructive ? t.primary : t.secondary,
  }),
  capsuleLabel: (t, confirm, destructive) => ({
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: destructive
      ? destructiveText(t)
      : confirm
        ? t["primary-foreground"]
        : t["secondary-foreground"],
    textAlign: "center",
  }),
  capsulePressedOpacity: 0.8,
  textButton: null,
  textButtonLabel: null,
  textButtonRipple: null,
  formBody: { marginTop: 16 },
  fieldLabel: (t) => ({ fontSize: 13, lineHeight: 18, fontWeight: "500", color: t.foreground, marginBottom: 6 }),
  fieldLabelGap: { marginTop: 14 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  currency: (t) => ({ fontSize: 15, lineHeight: 20, color: t["muted-foreground"], marginEnd: 8 }),
};

// ---------- Android (Material 3 basic dialog): 28 radius, left title, text-button row ----------
// M3 basic dialog: a card (28dp radius) over the `popover` ELEVATED surface (soft
// shadow) on a ~0.32 black scrim; a LEFT-aligned ~22sp title, a 14sp body, and
// TEXT-button actions (no fill) bottom-RIGHT in a row — Cancel then Confirm — in
// brand-indigo text, an android_ripple on each, and NO dividers.
const ANDROID_RADIUS = 28;
export const androidSkin: DialogSkin = {
  backdrop: (t) => ({ borderRadius: 8, backgroundColor: scrimFill(t, 0.32) }),
  card: (t) => ({
    borderRadius: ANDROID_RADIUS,
    backgroundColor: t.popover,
    ...shadow("lg"),
  }),
  title: (t) => ({ fontSize: 22, lineHeight: 28, fontWeight: "500", color: t["popover-foreground"] }),
  body: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"], marginTop: 12 }),
  footerKind: "buttons",
  footer: () => ({ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 24 }),
  capsule: null,
  capsuleLabel: null,
  capsulePressedOpacity: null,
  // A flat text-button: no fill, comfortable touch target, rounded for the ripple.
  textButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    // clip the Material ripple to the rounded outline (else it bleeds past the corners as a rectangle)
    overflow: "hidden",
    minHeight: 40,
  },
  textButtonLabel: (t, destructive) => ({
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    color: destructive ? destructiveText(t) : primaryText(t),
  }),
  textButtonRipple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false }),
  formBody: { marginTop: 20 },
  fieldLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground, marginBottom: 6 }),
  fieldLabelGap: { marginTop: 16 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  currency: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"], marginEnd: 8 }),
};
