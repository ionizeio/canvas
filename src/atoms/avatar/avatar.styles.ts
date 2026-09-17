import { type TextStyle, type ViewStyle } from "react-native";
import { alpha, controlRipple, mixOklab, shape, type ColorTokens } from "../../style/index.js";
import { type AvatarSkin, type Size } from "./avatar.shared.js";
import { type AvatarMenuSkin } from "./avatar-menu.shared.js";

// Per-OS Avatar skins. Avatar is a "Light" treatment: identical structure, box
// sizes, per-name fallback colour, circle radius, and ring outline (those live in
// avatar.shared.tsx); only the rounded-square corner radius, the initials type,
// and the press feedback shift per OS.
//
// Web is the Riskora identity tile: a 12px rounded square (the control corner) and a
// medium-weight (500) initials. iOS uses SF conventions: semibold (600) initials,
// SF Pro Text tracking per point size, and a softer 10px continuous-feel corner;
// press dims opacity to 0.8 (HIG). Android follows Material 3: a 12px rounded
// square (M3 medium shape token), a medium (500) label with M3's slight positive
// tracking, and a native ripple on press (no opacity dim). Each skin also carries
// its platform minimum touch target (HIG 44pt / M3 48dp) so the shell can pad a
// pressable trigger's hit area with hitSlop.

// Web initials type, ~40% of the diameter (the current Canvas look), weight 500.
// `tiny` keeps `small`'s 12px glyph rather than scaling on to 10: that is the type
// the hand-off sets on its own 24px avatar, and a proportional 10px pair of
// initials stops reading at that diameter.
const WEB_LABEL: Record<Size, TextStyle> = {
  tiny: { fontWeight: "500", fontSize: 12, lineHeight: 16 },
  small: { fontWeight: "500", fontSize: 12, lineHeight: 16 },
  default: { fontWeight: "500", fontSize: 16, lineHeight: 24 },
  large: { fontWeight: "500", fontSize: 18, lineHeight: 28 },
};

// iOS SF conventions: semibold initials, tracked per the SF Pro Text table for
// each point size (12pt = 0, 16pt = -0.31, 18pt = -0.43), so dense initials read
// crisply without over-tightening the small size.
const IOS_LABEL: Record<Size, TextStyle> = {
  tiny: { fontWeight: "600", fontSize: 12, lineHeight: 16 },
  small: { fontWeight: "600", fontSize: 12, lineHeight: 16 },
  default: { fontWeight: "600", fontSize: 16, lineHeight: 24, letterSpacing: -0.31 },
  large: { fontWeight: "600", fontSize: 18, lineHeight: 28, letterSpacing: -0.43 },
};

// Material 3: a medium (500) label with M3's slight positive tracking
// (label/title styles carry +0.1 tracking), the same proportional sizes.
const ANDROID_LABEL: Record<Size, TextStyle> = {
  tiny: { fontWeight: "500", fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  small: { fontWeight: "500", fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  default: { fontWeight: "500", fontSize: 16, lineHeight: 24, letterSpacing: 0.1 },
  large: { fontWeight: "500", fontSize: 18, lineHeight: 28, letterSpacing: 0.1 },
};

// Web: the Riskora look. Rounded square at the 12px control corner; the
// pressable trigger dims opacity on press, no ripple.
export const webSkin: AvatarSkin = {
  roundedRadius: shape.web.control,
  labelType: WEB_LABEL,
  ripple: null,
  pressedOpacity: 0.9,
  // Inert for pointer input; keeps a touch-driven web tap area at the 44px floor.
  minTarget: 44,
};

// iOS (HIG): composed from an image view / person.crop.circle SF Symbol. A softer
// 10px continuous-feel rounded square, SF semibold initials, and a 0.8 opacity dim
// on press (the iOS pressed-state convention), no ripple.
export const iosSkin: AvatarSkin = {
  roundedRadius: 10,
  labelType: IOS_LABEL,
  ripple: null,
  pressedOpacity: 0.8,
  // HIG minimum tappable area: 44x44pt.
  minTarget: 44,
};

// Material 3: avatars live inside lists, chips, and app bars. A 12px rounded
// square (M3 medium shape token), an M3 label with positive tracking, and a native
// ripple on press (the M3 state layer carries the feedback, so no opacity dim).
export const androidSkin: AvatarSkin = {
  roundedRadius: 12,
  labelType: ANDROID_LABEL,
  ripple: (tokens: ColorTokens) => controlRipple(tokens),
  pressedOpacity: null,
  // Material 3 accessibility minimum touch target: 48x48dp.
  minTarget: 48,
};

// ---------------------------------------------------------------------------
// AvatarMenu: the identity-pill entries added to each Avatar skin.
// ---------------------------------------------------------------------------
// The capsule that opens the account menu. Its per-OS numbers are the ones the
// web hand-off carries as the `--p-idpill-*` custom properties in
// styles/tokens/platforms.css; they are transcribed here so NATIVE reads them
// from this file and never from the CSS (the CSS layer is the web hand-off only).
// Where the CSS expresses a fill with `color-mix(in oklab, ...)`, the same mix is
// computed below with the kit's own `mixOklab` helper instead of a web colour
// function, so the native fill matches the hand-off's exactly. (Blending the two
// channel-wise in sRGB instead lands too light in both schemes, by 2/255 on every
// channel in light, rgb(230, 230, 231) against the hand-off's rgb(228, 228, 229),
// and by 2/2/1 in dark.)
//
// Each capsule holds a `tiny` (24px) Avatar, the disc the hand-off draws inside
// it, so the inset around the photo is the hand-off's 4 on web, 6 on iOS, and 8
// on Android (half of height - 24, hairline included).
//
//   web     32px capsule, gap 8, padding 4/10, `secondary` fill, a 1px hairline
//           that is transparent when closed and `input`-coloured when open, and
//           an open fill 6% lifted toward `foreground`; name 13/16 weight 500.
//   iOS     36pt capsule, padding 5/12, a `border` hairline that is ALWAYS
//           visible over a transparent fill, `secondary` when open; SF name
//           15/20 semibold with -0.15 tracking.
//   Android 40dp tonal M3 pill, padding 6/14, no visible outline: `primary` at
//           12% closed and 20% open; M3 name 14/20 weight 500, +0.1 tracking.
//
// The 11/14 secondary (email) line and the 14px muted chevron are the same on
// every platform; only the tracking follows the platform's name tracking.

// The capsule's shared box: a row that centres the avatar, the identity column,
// and the chevron on one baseline, with the gap the hand-off keeps at 8 on every
// platform. The radius is applied by the shell (a capsule at every height).
const PILL_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// The muted 11/14 secondary line, shared; each skin adds its own tracking.
const PILL_SECONDARY: TextStyle = { fontSize: 11, lineHeight: 14 };

// The trailing chevron is 14px and muted on every platform.
const PILL_CHEVRON = 14;

// Web (--p-idpill-* in the :root block of platforms.css): a 32px `secondary`
// capsule. The hairline is always 1px so opening never changes the pill's box;
// it is transparent when closed and takes the `input` colour on open, over a fill
// lifted 6% toward `foreground`. Dropdown owns disabled dim in solid mode; under
// glass the capsule dims its foreground only, preserving the native material.
export const webMenuSkin: AvatarMenuSkin = {
  ...webSkin,
  menuPill: { ...PILL_ROW, height: 32, paddingStart: 4, paddingEnd: 10, borderWidth: 1 },
  menuPillFill: (t, open) => ({
    backgroundColor: open ? mixOklab(t.secondary, t.foreground, 0.06) : t.secondary,
    borderColor: open ? t.input : "transparent",
  }),
  menuPillName: { fontSize: 13, lineHeight: 16, fontWeight: "500" },
  menuPillSecondary: PILL_SECONDARY,
  menuChevronSize: PILL_CHEVRON,
  menuDisabledOpacity: 0.5,
};

// iOS (the [data-platform="ios"] --p-idpill-* block): a 36pt capsule outlined with
// a permanent `border` hairline over a transparent fill, filling with `secondary`
// while the menu is open. SF Pro Text name at 15/20 semibold, tracked -0.15 per
// the SF tracking table, and the same -0.15 on the secondary line.
export const iosMenuSkin: AvatarMenuSkin = {
  ...iosSkin,
  menuPill: { ...PILL_ROW, height: 36, paddingStart: 5, paddingEnd: 12, borderWidth: 1 },
  menuPillFill: (t, open) => ({ backgroundColor: open ? t.secondary : "transparent", borderColor: t.border }),
  menuPillName: { fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15 },
  menuPillSecondary: { ...PILL_SECONDARY, letterSpacing: -0.15 },
  menuChevronSize: PILL_CHEVRON,
  menuDisabledOpacity: 0.4,
};

// Android (the [data-platform="android"] --p-idpill-* block): Material 3's tonal
// pill, 40dp tall, filled with `primary` at 12% and lifting to 20% while open (the
// M3 state-layer model), with no visible outline. The 1px hairline is still
// reserved but transparent, so the box never shifts between the three platforms or
// between states. M3 name at 14/20 weight 500 with +0.1 tracking.
export const androidMenuSkin: AvatarMenuSkin = {
  ...androidSkin,
  menuPill: { ...PILL_ROW, height: 40, paddingStart: 6, paddingEnd: 14, borderWidth: 1 },
  menuPillFill: (t, open) => ({ backgroundColor: alpha(t.primary, open ? 0.2 : 0.12), borderColor: "transparent" }),
  menuPillName: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  menuPillSecondary: { ...PILL_SECONDARY, letterSpacing: 0.1 },
  menuChevronSize: PILL_CHEVRON,
  menuDisabledOpacity: 0.38,
};
