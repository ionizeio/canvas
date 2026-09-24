import { inverseFill, inverseInk, inversePrimary, inverseStatus } from "../../style/inverse.js";
import { type ViewStyle } from "react-native";
import { type ColorTokens, alpha, platformMinTarget, shadow, shape } from "../../style/index.js";
import { typeScale } from "../../style/type-scale.js";
import { type ToastSkin } from "./toast.shared.js";

// Co-located Toast skins. Under glass the shell renders the capsule through
// GlassSurface as a DENSE-layer surface; a capsule painted on the inverse surface (all
// of them now) takes the inverse dense tint, so its light ink keeps its contrast.
//
//   Web and iOS: Dark Factory's toast pill. The same deep `inverse` fill in every palette
//     and scheme, a pill while it carries no description (a long message wraps inside
//     the capsule) and the sheet corner once a description sits under the message, 11 x 18 padding, Dark Factory's toast
//     shadow, the message in its strong body (12.5 / 700) in `inverse-foreground`. Dark
//     Factory's toast carries nothing else, so the kit's extra parts take the inks the
//     Material 3 snackbar already solved for the pill: the description in the pill's
//     ink at 0.7, the action in `inverse-primary`, the dismiss in the pill's ink, and the
//     intent glyphs in the dark scheme's status inks (inverseStatus). Press = DF's 0.9
//     dim. iOS has no toast control, so it takes this skin; its action and dismiss reach
//     the 44pt HIG target through hitSlop.
//   Android (Material 3 snackbar): a small-radius (4dp) bar on the same inverse pill
//     with its white ink, 14sp body, NO leading intent glyph (the M3 snackbar anatomy
//     has none), the action in `inverse-primary`, the close x in the pill's ink at the
//     24dp spec size, trailing padding 8dp beside a trailing control, 48dp touch targets
//     via hitSlop, press = ripple in the pill's ink.

const ICON_SIZE = 18;
// M3 snackbar close icon: 24dp (inside a 48dp trailing target).
const DISMISS_SIZE_ANDROID = 24;
const MAX_WIDTH = 400;

// hitSlop insets that lift the Android snackbar's ~32dp action button and 24dp dismiss
// box to the M3 48dp minimum (32 + 2*8, 24 + 2*12).
const ANDROID_ACTION_HIT_SLOP = 8;
const ANDROID_DISMISS_HIT_SLOP = 12;

// The capsule shape shared structure; each platform overrides radius/density.
function capsule(t: ColorTokens, radius: number): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius,
    minHeight: 48,
    maxWidth: MAX_WIDTH,
    backgroundColor: t.popover,
    ...shadow("lg", t),
  };
}

const actionButton = (): ViewStyle => ({
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 10,
  // clip the Material ripple to the rounded outline (Android clipToOutline)
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
});

const dismissButton = (): ViewStyle => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  // clip the Material ripple to the rounded outline (Android clipToOutline)
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
});

// ---------- Dark Factory's toast pill (web, and iOS, which has no toast control) ----------
const PILL_ACTION_HEIGHT = 26; // 5 + 16 + 5
const PILL_DISMISS = 24;
// The platform's minimum touch target on iOS (44pt HIG); none on the web, which is
// pointer-first. Half the shortfall on every edge keeps each control centred in its area.
const MIN_TARGET = platformMinTarget();
const slopTo = (height: number) => (MIN_TARGET == null ? null : Math.ceil((MIN_TARGET - height) / 2));
// Dark Factory's toast shadow: a deep, tight drop under the pill.
const PILL_SHADOW = "0px 20px 40px -16px rgba(0, 0, 0, 0.55)";

export const webSkin: ToastSkin = {
  container: (t, hasTrailing, hasDescription) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingStart: 18,
    paddingEnd: hasTrailing ? 12 : 18,
    borderRadius: hasDescription ? shape.web.sheet : 9999,
    maxWidth: MAX_WIDTH,
    backgroundColor: inverseFill(t),
    boxShadow: PILL_SHADOW,
  }),
  intentIcon: true,
  iconSize: 16,
  intentColor: (t, intent) => (intent === "info" ? inversePrimary(t) : inverseStatus(t, intent)),
  message: (t) => ({ ...typeScale.bodyStrong, lineHeight: 17, color: inverseInk(t) }),
  description: (t) => ({ ...typeScale.caption, color: alpha(inverseInk(t), 0.7) }),
  actionButton: () => ({ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, alignItems: "center", justifyContent: "center" }),
  actionLabel: (t) => ({ ...typeScale.label, lineHeight: 16, fontWeight: "700", color: inversePrimary(t) }),
  actionHitSlop: slopTo(PILL_ACTION_HEIGHT),
  dismissButton: () => ({ width: PILL_DISMISS, height: PILL_DISMISS, borderRadius: 9999, alignItems: "center", justifyContent: "center" }),
  dismissIconSize: 14,
  dismissColor: (t) => alpha(inverseInk(t), 0.7),
  dismissHitSlop: slopTo(PILL_DISMISS),
  pressedOpacity: 0.9,
  ripple: null,
};

// iOS has no toast control: the web skin.
export const iosSkin: ToastSkin = webSkin;

// ---------- Android (Material 3 snackbar): a small-radius bar ----------
// M3 snackbars use the INVERSE surface, and in Dark Factory's colors that is its toast
// pill: `inverse` as the bar with `inverse-foreground` text, the same dark pill in the
// light and the dark scheme, as Dark Factory paints its toasts. The 4dp corner is M3's
// extra-small snackbar radius. Color roles on the bar follow M3 (the inverse primary
// action, the supporting text and close icon in the bar's ink); the ripple ink is the
// bar's ink too, since the foreground-ink ripple helpers would paint bar-on-bar here,
// invisible. Leading padding stays 16dp; the trailing edge drops to 8dp when a trailing
// action/dismiss is present (M3 measurements).
export const androidSkin: ToastSkin = {
  container: (t, hasTrailing) => ({
    ...capsule(t, 4),
    gap: 8,
    backgroundColor: inverseFill(t),
    paddingStart: 16,
    paddingEnd: hasTrailing ? 8 : 16,
  }),
  // The M3 snackbar anatomy has NO leading icon slot: suppress the auto intent
  // glyph (an explicit `icon` prop still renders; intent survives via wording).
  intentIcon: false,
  iconSize: ICON_SIZE + 2,
  intentColor: null,
  message: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "400", color: inverseInk(t) }),
  description: (t) => ({ fontSize: 13, lineHeight: 18, color: alpha(inverseInk(t), 0.7) }),
  actionButton,
  actionLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: inversePrimary(t) }),
  actionHitSlop: ANDROID_ACTION_HIT_SLOP,
  dismissButton,
  dismissIconSize: DISMISS_SIZE_ANDROID,
  dismissColor: (t) => inverseInk(t),
  dismissHitSlop: ANDROID_DISMISS_HIT_SLOP,
  pressedOpacity: null,
  ripple: (t) => ({ color: alpha(inverseInk(t), 0.12), borderless: false }),
};
