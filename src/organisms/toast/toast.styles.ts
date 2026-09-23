import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, darkColors, lightColors, shadow, shape } from "../../style/index.js";
import { type ToastSkin } from "./toast.shared.js";

// Co-located Toast skins, one per platform, all driven by the brand tokens (passed
// in from useTheme so they follow light/dark). Each skin's own fill (the web
// hand-off's `--p-toast-fill`, i.e. the `popover` token, and the M3 inverse-surface
// bar on Android) is the solid-mode bar; under glass the shell renders the capsule
// through GlassSurface as a DENSE-layer surface, the densest tint so the message
// stays readable, with the inverse bars taking the inverse dense tint.
// Toast is a "Full" treatment: the BRAND survives on every platform
// (the indigo `primary` action tint, the semantic `success`/`error`/`warning` intents),
// only the native shape, type, and press feedback change per OS:
//
//   iOS (HIG banner): a rounded-16 floating capsule (continuous corner curve), 15pt
//     medium message over a 13pt secondary description (SF tracking), a brand-tinted
//     action, an x dismiss (both hit-slopped to the 44pt HIG target). Press = opacity dim.
//   Android (Material 3 snackbar): a small-radius (4dp) bar on the INVERSE surface
//     (dark `foreground` bar with light `background` text in a light theme), 14sp
//     body, NO leading intent glyph (the M3 snackbar anatomy has none), the action
//     in the INVERSE-primary brand indigo (the opposite scheme's `primary`, per the
//     M3 inverse-primary role, kept on-brand), the close x in the inverse on-surface
//     tone at the 24dp spec size, trailing padding 8dp beside a trailing control,
//     48dp touch targets via hitSlop, press = ripple in background-family ink. M3
//     snackbars have no glass idiom of their own, so under glass the bar is the
//     kit's inverse dense surface, keeping the inverse read.
//   Web (sonner): a rounded-12 card with shadow-lg, 14px medium message + 13px muted
//     description, a brand action, an x dismiss. Press = opacity dim.

const ICON_SIZE = 18;
const DISMISS_SIZE = 16;
// M3 snackbar close icon: 24dp (inside a 48dp trailing target).
const DISMISS_SIZE_ANDROID = 24;
const MAX_WIDTH = 400;

// hitSlop insets that lift the ~32px-tall action button and the 24px dismiss box to
// the platform minimum touch targets: iOS HIG 44pt (32 + 2*6, 24 + 2*10), Android
// M3 48dp (32 + 2*8, 24 + 2*12). Web stays pointer-first (null).
const IOS_ACTION_HIT_SLOP = 6;
const IOS_DISMISS_HIT_SLOP = 10;
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
    ...shadow("lg"),
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

// Coarse dark/light call on a hex fill (sRGB weights, no gamma; all the
// inverse-primary pick below needs). Non-hex fills read as light.
function isDarkFill(color: string): boolean {
  if (color[0] !== "#") return false;
  const h = color.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

// The M3 inverse-primary role, brand-preserving: the OPPOSITE scheme's brand text color,
// picked off the bar's own fill (`foreground`) so the action reads on the inverted
// surface: the lighter dark-scheme text role on the near-black light-mode bar,
// the deeper light-scheme text role on the near-white dark-mode bar. Keep the
// existing opposite-base-palette policy, independent of custom primary overrides.
function inversePrimary(t: ColorTokens): string {
  return primaryText(isDarkFill(t.foreground) ? darkColors : lightColors);
}

// ---------- Web: the Riskora notification card (the 16px dialog corner) ----------
export const webSkin: ToastSkin = {
  container: (t) => capsule(t, shape.web.dialog),
  intentIcon: true,
  iconSize: ICON_SIZE,
  message: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["popover-foreground"] }),
  description: (t) => ({ fontSize: 13, lineHeight: 18, color: t["muted-foreground"] }),
  actionButton,
  actionLabel: (t) => ({ fontSize: 13, lineHeight: 18, fontWeight: "600", color: primaryText(t) }),
  actionHitSlop: null,
  dismissButton,
  dismissIconSize: DISMISS_SIZE,
  dismissColor: null,
  dismissHitSlop: null,
  pressedOpacity: 0.6,
  ripple: null,
};

// ---------- iOS (HIG floating banner): a rounded-16 capsule ----------
// SF Pro Text tracking: -0.24 at 15pt (message/action), -0.08 at 13pt (description).
// borderCurve "continuous" gives the capsule Apple's superellipse corner (iOS-only
// style prop; a no-op on Android/web).
export const iosSkin: ToastSkin = {
  container: (t) => ({ ...capsule(t, 16), borderCurve: "continuous" }),
  intentIcon: true,
  iconSize: ICON_SIZE + 1,
  message: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: t["popover-foreground"] }),
  description: (t) => ({ fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] }),
  actionButton,
  actionLabel: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: primaryText(t) }),
  actionHitSlop: IOS_ACTION_HIT_SLOP,
  dismissButton,
  dismissIconSize: DISMISS_SIZE,
  dismissColor: null,
  dismissHitSlop: IOS_DISMISS_HIT_SLOP,
  pressedOpacity: 0.7,
  ripple: null,
};

// ---------- Android (Material 3 snackbar): a small-radius bar ----------
// M3 snackbars use the INVERSE surface: a dark bar with light text in a light theme
// (`foreground` bg, `background` text), inverting in dark mode, so the bar contrasts
// with the page. The 4dp corner is M3's extra-small snackbar radius. Color roles on
// the inverted fill follow M3 (inverse primary action via inversePrimary(), inverse
// on-surface supporting text + close icon via `background`-family tones); the ripple
// ink is background-family too — the foreground-ink ripple helpers would paint
// bar-on-bar here, invisible. Leading padding stays 16dp; the trailing edge drops to
// 8dp when a trailing action/dismiss is present (M3 measurements).
export const androidSkin: ToastSkin = {
  container: (t, hasTrailing) => ({
    ...capsule(t, 4),
    gap: 8,
    backgroundColor: t.foreground,
    paddingStart: 16,
    paddingEnd: hasTrailing ? 8 : 16,
  }),
  // The M3 snackbar anatomy has NO leading icon slot: suppress the auto intent
  // glyph (an explicit `icon` prop still renders; intent survives via wording).
  intentIcon: false,
  iconSize: ICON_SIZE + 2,
  message: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "400", color: t.background }),
  description: (t) => ({ fontSize: 13, lineHeight: 18, color: alpha(t.background, 0.7) }),
  actionButton,
  actionLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: inversePrimary(t) }),
  actionHitSlop: ANDROID_ACTION_HIT_SLOP,
  dismissButton,
  dismissIconSize: DISMISS_SIZE_ANDROID,
  dismissColor: (t) => t.background,
  dismissHitSlop: ANDROID_DISMISS_HIT_SLOP,
  pressedOpacity: null,
  ripple: (t) => ({ color: alpha(t.background, 0.12), borderless: false }),
};
