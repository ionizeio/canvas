import { destructiveText } from "../../style/destructive-text.js";
import { scrimFill } from "../../style/scrim.js";
import { primaryText } from "../../style/primary-text.js";
import { type ComponentType } from "react";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha, widths, shape } from "../../style/index.js";
import { type InputProps } from "../../atoms/input/input.shared.js";

// The confirmation field is rendered through the platform-correct Input atom,
// passed to `createAlertDialog` by each platform's thin `.tsx`/`.ios`/`.android`
// file. Typing it as the atom's component preserves the public Input API.
export type InputComponent = ComponentType<InputProps>;

// Co-located AlertDialog skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). The card is OPAQUE on every
// theming surface: `popover` is an opaque token in both schemes and glass mode
// never rewrites it, so the prompt that stops the user to confirm a destructive
// action is never see-through. The BRAND survives on every platform (the `primary`
// confirm and the `destructive` red); only the native SHAPE, sizing, title
// alignment, action layout, and press feedback change per OS:
//   iOS (iOS 27 / Liquid Glass alert): a rounded card (~28 radius, `popover`
//     fill, soft shadow, no border), a LEFT-aligned bold title and a left-aligned
//     `muted-foreground` message; exactly two actions rendered as two CAPSULES
//     side by side (no divider) — a gray Cancel capsule (`secondary` fill, 400
//     label) and a Confirm capsule. The non-destructive PRIMARY confirm is a
//     FILLED `primary` capsule with a white 600 label; the DESTRUCTIVE confirm
//     keeps the same gray `secondary` fill and tints only its 600 LABEL red
//     (`destructive`), it is NOT a red-filled capsule. The body confirmation
//     field renders the iOS-styled Input (the skin owns it), a flat gray-filled
//     borderless field with no focus ring. Press = opacity dim (~0.85).
//   Android (Material 3 AlertDialog): an elevated surface (28 radius, `popover`
//     fill, soft shadow), a LEFT-aligned title and left-aligned body; two M3 TEXT
//     buttons bottom-right (Cancel then Confirm/Delete), the confirm tinted with
//     the brand `primary` and a destructive confirm in the `destructive` red.
//     Press = android_ripple (brand state layer).
//   Web: the established Canvas look (the current alert-dialog, lifted verbatim) —
//     a bordered, dim-backed card (8 radius, 1px `border`, `popover` fill,
//     shadow-xl, padding 24), a left-aligned 16pt/600 title and 14pt
//     `muted-foreground` description, with a right-aligned action row of an
//     `outline` Cancel Button plus a `primary`/`destructive` confirm Button.

export type Width = "narrow" | "small" | "medium" | "large";

// Panel width per width axis, drawn from the shared width scale (xs..lg). Shared
// by every platform; the native skins narrow the medium/large footprint a touch
// but the axis mapping is one source of truth. The panel is a floating container
// (a bounds provider for its own content): it spans its definite backdrop and caps
// at the step.
export const panelWidth: Record<Width, ViewStyle> = {
  narrow: { width: "100%", maxWidth: widths.xs },
  small: { width: "100%", maxWidth: widths.sm },
  medium: { width: "100%", maxWidth: widths.md },
  large: { width: "100%", maxWidth: widths.lg },
};

// How the action row is structured. "buttons" renders the shell's Button-based
// right-aligned row (web/Android); "capsule" renders the iOS side-by-side pair of
// pill buttons drawn by the skin's own action styles (no divider).
export type ActionLayout = "buttons" | "capsule";

// The contract a platform skin fulfills. The shell renders the wrapper, the dim
// backdrop, the card, the title/description, the optional confirmation field, and
// the action row; the skin maps the active platform's shape/fill/sizing/type/
// feedback onto each piece.
export interface AlertDialogSkin {
  /** The contained dim scrim that centers the card within the preview area. */
  backdrop: (t: ColorTokens) => ViewStyle;
  /** The card base: shape, border (or lack of), padding, shadow. tokens drive fill. */
  card: (t: ColorTokens) => ViewStyle;
  /** Title type + alignment (centered on iOS, left on Android/web). */
  title: (t: ColorTokens) => TextStyle;
  /** Description type + alignment + color. */
  description: (t: ColorTokens) => TextStyle;
  /** The confirmation-field block container ("Type DELETE to confirm" + input). */
  inputBlock: ViewStyle;
  /** The confirmation-field label. */
  inputLabel: (t: ColorTokens) => TextStyle;
  /** Which action structure the shell renders. */
  actionLayout: ActionLayout;
  // --- "buttons" layout (web/Android): a right-aligned row of shell Buttons ----
  /** The right-aligned Button row container (the "buttons" layout). */
  actions: ViewStyle;
  /** The size prop passed to the shell's Cancel/Confirm Buttons. */
  buttonSmall: boolean;
  /** The intent props for the Cancel Button (web = outline). */
  cancelButton: { outline?: boolean; ghost?: boolean };
  // --- Android text-button actions (buttons layout, no fill); null on iOS/web ---
  /** An Android text-button touch target (no fill). When set, the shell renders
   *  the Cancel/Confirm actions as flat M3 TEXT buttons instead of Button atoms,
   *  so a destructive confirm is a red LABEL on a transparent button, never a
   *  filled red button (mirrors the plain Dialog). */
  textButton: ViewStyle | null;
  /** The Android text-button label; brand `primary`, `destructive` reds an
   *  irreversible confirm. */
  textButtonLabel: ((t: ColorTokens, destructive: boolean) => TextStyle) | null;
  /** The Android ripple over a text button; null on the other platforms. */
  textButtonRipple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  // --- "capsule" layout (iOS): two side-by-side pill buttons, no divider --------
  /** The action row that holds the two equal-width capsules with a gap. */
  capsuleRow: ViewStyle | null;
  /** A single capsule cell base (shape/sizing); fill comes from the *Fill helpers. */
  capsuleCell: ViewStyle | null;
  /** The Cancel (gray) capsule fill. */
  cancelFill: ((t: ColorTokens) => ViewStyle) | null;
  /** The Confirm capsule fill. Non-destructive = filled `primary`; destructive
   *  keeps the gray `secondary` fill (the kit fills only the primary confirm). */
  confirmFill: ((t: ColorTokens, destructive: boolean) => ViewStyle) | null;
  /** The Cancel capsule label (regular 400 weight, on-secondary color). */
  cancelLabelStyle: ((t: ColorTokens) => TextStyle) | null;
  /** The Confirm capsule label (semibold 600; white on the filled primary fill,
   *  `destructive-text` over the gray fill when destructive). */
  confirmLabelStyle: ((t: ColorTokens, destructive: boolean) => TextStyle) | null;
  /** iOS/web dim on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the action cells; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- shared layout fragments (identical across platforms) -------------------

// The outer wrapper fills its container's width so the modal panel can cap to the
// width actually available (see panelWidth): a narrow container (a phone screen, the
// docs preview cell) then shrinks the panel to fit instead of letting its fixed
// per-size width overflow the screen. `minWidth: 0` lets it shrink below the panel's
// content width when it is a flex item in a row. The trigger is wrapped in
// `triggerWrap` so it keeps its natural width rather than stretching to this width.
// The overlay presentation: fills the nearest OverlayProvider rather than taking
// part in page flow, so the scrim covers the page behind it and `aria-modal` is
// a true statement.
export const backdropOverlay: ViewStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  minWidth: 0,
};

export const root: ViewStyle = { width: "100%", minWidth: 0 };

// Keeps the optional trigger button at its natural (content) width and leading-aligned,
// so the full-width `root` above does not stretch it across the container.
export const triggerWrap: ViewStyle = { alignSelf: "flex-start" };

// Gap between the trigger button and the modal when the trigger renders above it.
export const triggerGap: ViewStyle = { marginTop: 12 };

// The card is full-width within its max-width; the per-platform skin supplies the
// shape/fill/padding/shadow on top of this.
export const cardBase: ViewStyle = { width: "100%" };

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// The current alert-dialog: a contained dim scrim (rounded-md, black/50) centering
// a bordered card (rounded-md border bg-popover p-6 shadow-xl); a left-aligned
// 16pt/600 title and 14pt muted description; a right-aligned action row (gap-2,
// mt-6) of an outline Cancel Button plus a primary/destructive confirm Button.
export const webSkin: AlertDialogSkin = {
  backdrop: (t) => ({
    alignItems: "center",
    justifyContent: "center",
    borderRadius: shape.web.dialog,
    backgroundColor: scrimFill(t, 0.6),
    padding: 32,
  }),
  card: (t) => ({
    borderRadius: shape.web.dialog,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 24,
    ...shadow("xl"),
  }),
  title: (t) => ({ fontSize: 18, lineHeight: 28, fontWeight: "500", color: t["popover-foreground"] }),
  description: (t) => ({ marginTop: 8, fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  inputBlock: { marginTop: 16 },
  inputLabel: (t) => ({ marginBottom: 6, fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  actionLayout: "buttons",
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 },
  buttonSmall: true,
  cancelButton: { outline: true },
  textButton: null,
  textButtonLabel: null,
  textButtonRipple: null,
  capsuleRow: null,
  capsuleCell: null,
  cancelFill: null,
  confirmFill: null,
  cancelLabelStyle: null,
  confirmLabelStyle: null,
  pressedOpacity: null,
  ripple: null,
};

// ---------- iOS 27 (Liquid Glass alert): rounded card, left text, capsule actions ----------
// iOS 26+/27 alert (per Apple's design kit): a rounded card (~28pt radius) over the
// `popover` fill with a soft shadow and NO border; a LEFT-aligned bold title and a
// LEFT-aligned `muted-foreground` message. The two actions are CAPSULES side by
// side (no hairline divider): a gray Cancel capsule (`secondary` fill,
// `secondary-foreground` text) and a primary Confirm capsule with its paired
// foreground. A destructive confirm keeps secondary fill and destructive-text. The brand
// survives: the iOS system blue becomes the indigo `primary` token. Press = opacity
// dim (~0.85).
const IOS_RADIUS = 28;
const IOS_CAPSULE_RADIUS = 999;
export const iosSkin: AlertDialogSkin = {
  backdrop: (t) => ({
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: scrimFill(t, 0.4),
    padding: 32,
  }),
  // Rounded card with content padding; no border, soft shadow.
  card: (t) => ({
    borderRadius: IOS_RADIUS,
    backgroundColor: t.popover,
    padding: 24,
    ...shadow("lg"),
  }),
  title: (t) => ({
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
    color: t["popover-foreground"],
  }),
  description: (t) => ({
    marginTop: 8,
    fontSize: 16,
    lineHeight: 21,
    color: t["muted-foreground"],
  }),
  inputBlock: { marginTop: 16 },
  inputLabel: (t) => ({ marginBottom: 6, fontSize: 14, lineHeight: 18, fontWeight: "600", color: t.foreground }),
  actionLayout: "capsule",
  // Unused in the capsule layout, but the contract requires concrete values.
  actions: { flexDirection: "row" },
  buttonSmall: true,
  cancelButton: {},
  textButton: null,
  textButtonLabel: null,
  textButtonRipple: null,
  // Two equal-width capsules side by side, separated by a gap (no divider).
  capsuleRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  capsuleCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
    borderRadius: IOS_CAPSULE_RADIUS,
  },
  cancelFill: (t) => ({ backgroundColor: t.secondary }),
  // iOS 27 kit: ONLY the non-destructive primary confirm is a filled (brand)
  // capsule with a white label. The destructive action keeps the NEUTRAL gray
  // `secondary` fill (same as Cancel) and tints only its LABEL red; it is NOT a
  // red-filled capsule (per the kit's "3 Destructive" action part / "Buttons
  // Stacked" alert).
  confirmFill: (t, destructive) => ({ backgroundColor: destructive ? t.secondary : t.primary }),
  // Secondary/Cancel capsule label reads regular (400), lighter than the confirm
  // (the kit's Default alert / "2 Secondary" part).
  cancelLabelStyle: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "400", color: t["secondary-foreground"] }),
  // Confirm label is the heavier of the two at semibold (600), per the kit's
  // filled "1 Primary" capsule. Destructive tints the label red over the gray
  // fill (`destructive`), not white over a red fill.
  confirmLabelStyle: (t, destructive) => ({
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: destructive ? destructiveText(t) : t["primary-foreground"],
  }),
  pressedOpacity: 0.85,
  ripple: null,
};

// ---------- Android (Material 3 AlertDialog): elevated surface, text buttons ----------
// M3 basic dialog: an elevated surface (28dp radius) over `popover` with a soft
// shadow; a LEFT-aligned 24sp/headline-small title and a left-aligned 14sp body in
// `muted-foreground`. Two M3 TEXT buttons sit bottom-right (Cancel then Confirm/
// Delete) — the confirm carries the brand `primary`, a destructive confirm the
// `destructive` red. The shell renders these with its ghost (text) Buttons; press =
// android_ripple, supplied here as the brand state layer.
export const androidSkin: AlertDialogSkin = {
  backdrop: (t) => ({
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: scrimFill(t, 0.32),
    padding: 32,
  }),
  card: (t) => ({
    borderRadius: 28,
    backgroundColor: t.popover,
    padding: 24,
    ...shadow("md"),
  }),
  title: (t) => ({ fontSize: 24, lineHeight: 32, fontWeight: "400", color: t["popover-foreground"] }),
  description: (t) => ({ marginTop: 16, fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  inputBlock: { marginTop: 16 },
  inputLabel: (t) => ({ marginBottom: 6, fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  actionLayout: "buttons",
  // M3 places the action buttons bottom-right with 8dp gap and 24dp above.
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 },
  buttonSmall: true,
  // Unused on Android (the textButton path renders the actions), but the contract
  // requires a concrete value.
  cancelButton: { ghost: true },
  // M3 dialog actions are flat TEXT buttons (no fill): a Cancel then a Confirm,
  // both in brand `primary`, with a destructive confirm tinting only its
  // LABEL the `destructive` red — never a filled red button (mirrors the plain
  // Dialog's Android footer). Label = M3 Label Large (14/20, weight 500).
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
  capsuleRow: null,
  capsuleCell: null,
  cancelFill: null,
  confirmFill: null,
  cancelLabelStyle: null,
  confirmLabelStyle: null,
  pressedOpacity: null,
  // The capsule-cell ripple is iOS-layout-only; Android's text buttons use
  // textButtonRipple instead.
  ripple: null,
};
