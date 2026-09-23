import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, alpha, shape } from "../../style/index.js";
import { type NavbarSkin } from "./navbars.shared.js";

// Co-located Navbar skins, one per platform. The shell resolves the surface axis
// (default / bordered / floating), the brand + link cluster, and the action +
// avatar cluster; the skin supplies only the native SHAPE, sizing, label weight,
// fill, separator, and press feedback. The BRAND survives on every platform (the
// indigo `primary` token and the semantic tokens, never a platform default), so
// each follows light/dark and the glass surface.
//
//   iOS (iOS 26+ / Liquid Glass navigation bar): a slim 44pt bar with a 1px
//     hairline bottom separator (no heavy shadow); the brand reads as a ~17pt
//     weight-600 SF title. Bar-button items are CIRCULAR tinted toolbar buttons
//     (a translucent neutral `secondary` circle), the glyph/label tints the
//     brand `primary`; the active item reads as a brand-FILLED circle. Press =
//     opacity dim 0.8.
//   Android (M3 top app bar): a 64dp bar with a ~22sp weight-500 LEADING title;
//     no hairline border, a flat `background` surface (soft elevation only when
//     `floating`); nav links use a tonal `primary` active fill; press =
//     android_ripple.
//   Web: the established Canvas look (h-14 bar, bottom hairline / rounded outline
//     / floating shadowed card), lifted verbatim from the original file.

export type Surface = "default" | "bordered" | "floating";

// =============================================================================
// Web: the established Canvas look (lifted verbatim from the original file).
// =============================================================================

export const webSkin: NavbarSkin = {
  // The original bar dims links on press (active:opacity-90); no ripple.
  pressedOpacity: 0.9,
  ripple: null,

  // The Riskora top bar: 72px tall with a 24px gutter, the brand at left, the
  // link pills in the middle, the search field and the 44px icon tiles at right.
  bar() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 72,
      paddingHorizontal: 24,
    };
  },
  // bg-background fill (token-driven, follows the scheme/glass surface).
  surface(tokens) {
    return { backgroundColor: tokens.background };
  },
  // The surface axis. default rests flush with a bottom hairline; bordered boxes
  // it in a rounded outline; floating lifts it as a rounded, shadowed card.
  surfaceContainer(tokens, surface) {
    switch (surface) {
      case "default":
        return { borderBottomWidth: 1, borderColor: tokens.border };
      case "bordered":
        return { borderRadius: shape.web.card, borderWidth: 1, borderColor: tokens.border };
      case "floating":
        return { borderRadius: shape.web.card, borderWidth: 1, borderColor: tokens.border, ...shadow("md", tokens) };
    }
  },

  // flex-row items-center gap-6
  leftGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 24 };
  },
  // The wordmark: Label/Large at the medium weight.
  brand(tokens) {
    return { fontSize: 18, lineHeight: 28, fontWeight: "500", color: tokens.foreground };
  },
  // flex-row items-center gap-1
  linksRow() {
    return { flexDirection: "row", alignItems: "center", gap: 4 };
  },
  // A 40px link pill with the control corner; the active pill fills the soft
  // `accent` panel (Riskora's "Dashboard" pill).
  linkTile(tokens, active) {
    return {
      borderRadius: shape.web.control,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: active ? tokens.accent : "transparent",
    };
  },
  // text-sm font-medium; active reads in the foreground, inactive in muted.
  linkLabel(tokens, active) {
    return {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: active ? tokens.foreground : tokens["muted-foreground"],
    };
  },
  linkSelection: "tint",

  // flex-row items-center gap-3
  rightGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 12 };
  },
};

// =============================================================================
// iOS (iOS 26+ / Liquid Glass): a slim navigation bar. A 44pt bar with a 1px
// hairline bottom separator and no heavy shadow; the brand is a ~17pt weight-600
// SF title. Bar-button items are CIRCULAR tinted toolbar buttons: a translucent
// neutral `secondary` circle that the brand `primary` glyph/label sits on; the
// active destination reads as a brand-FILLED circle. Press = opacity dim 0.8.
// =============================================================================

export const iosSkin: NavbarSkin = {
  pressedOpacity: 0.8, // HIG: dim on press
  ripple: null,
  // Slim 44pt bar. iOS navigation bars are shorter than the Canvas web bar.
  bar() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 44,
      paddingHorizontal: 16,
    };
  },
  surface(tokens) {
    return { backgroundColor: tokens.background };
  },
  // default: a 1px hairline bottom separator only (no shadow). bordered keeps the
  // rounded outline; floating lifts a light card (HIG keeps elevation subtle).
  surfaceContainer(tokens, surface) {
    switch (surface) {
      case "default":
        return { borderBottomWidth: 1, borderColor: tokens.border };
      case "bordered":
        return { borderRadius: 10, borderWidth: 1, borderColor: tokens.border };
      case "floating":
        return { borderRadius: 10, borderWidth: 1, borderColor: tokens.border, ...shadow("sm", tokens) };
    }
  },

  leftGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 16 };
  },
  // ~17pt SF title, weight 600 (iOS inline navigation title).
  brand(tokens) {
    return { fontSize: 17, lineHeight: 22, fontWeight: "600", color: tokens.foreground };
  },
  linksRow() {
    return { flexDirection: "row", alignItems: "center", gap: 8 };
  },
  // iOS 26 bar-button items are CIRCULAR tinted toolbar buttons. Each chip is a
  // 32pt fully-rounded pill on a translucent neutral `secondary` fill; the active
  // destination flips to a solid brand `primary` fill (the filled-circle state).
  // minWidth == height keeps a single short label reading as a true circle while
  // a longer label grows the pill horizontally, matching the iOS capsule.
  linkTile(tokens, active) {
    return {
      height: 32,
      minWidth: 32,
      borderRadius: 9999,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: active ? tokens.primary : alpha(tokens.secondary, 0.9),
    };
  },
  // The glyph/label tints the brand `primary` on the neutral chip; on the active
  // filled circle it reads in the contrasting `primary-foreground`.
  linkLabel(tokens, active) {
    return {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600",
      textAlign: "center",
      color: active ? tokens["primary-foreground"] : primaryText(tokens),
    };
  },
  linkSelection: "brand",

  rightGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 8 };
  },
};

// =============================================================================
// Android (Material 3): a top app bar. A 64dp bar with a ~22sp weight-500
// LEADING title and no hairline border; the surface is flat `background` (soft
// elevation only when floating). Nav links use a tonal `primary` active fill.
// Press = android_ripple.
// =============================================================================

export const androidSkin: NavbarSkin = {
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (tokens) => ({ color: alpha(tokens.primary, 0.12), borderless: false }),

  // 64dp M3 small top app bar (M3 container height; Material 2 was 56dp).
  bar() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 64,
      paddingHorizontal: 16,
    };
  },
  surface(tokens) {
    return { backgroundColor: tokens.background };
  },
  // M3 small top app bar is borderless and flat at rest; we rely on the
  // background fill. bordered/floating keep a container so those layouts still
  // box (floating gets the M3 elevated-surface shadow on scroll).
  surfaceContainer(tokens, surface) {
    switch (surface) {
      case "default":
        return {}; // flat, no hairline; the background fill carries the bar
      case "bordered":
        return { borderRadius: 12, borderWidth: 1, borderColor: tokens.border };
      case "floating":
        return { borderRadius: 12, ...shadow("md", tokens) };
    }
  },

  leftGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 16 };
  },
  // M3 titleLarge ~22sp, weight 500, leading.
  brand(tokens) {
    return { fontSize: 22, lineHeight: 28, fontWeight: "500", color: tokens.foreground };
  },
  linksRow() {
    return { flexDirection: "row", alignItems: "center", gap: 4 };
  },
  // M3 active destination carries a tonal `primary` fill (secondaryContainer ~
  // alpha(primary, .12)); inactive sits flat with a muted label.
  linkTile(tokens, active) {
    return {
      borderRadius: 9999,
      // clip the Material ripple to the rounded outline (without this, the bounded
      // android_ripple paints a rectangle past the pill corners).
      overflow: "hidden",
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: active ? alpha(tokens.primary, 0.12) : "transparent",
    };
  },
  linkLabel(tokens, active) {
    return {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: active ? primaryText(tokens) : tokens["muted-foreground"],
    };
  },
  linkSelection: "tint",

  rightGroup() {
    return { flexDirection: "row", alignItems: "center", gap: 8 };
  },
};
