import { type ColorTokens, alpha, shadow, controlRipple, shape } from "../../style/index.js";
import { type CarouselSkin } from "./carousel.shared.js";

// Co-located Carousel skins, one per platform. The shell resolves the paging,
// the controlled/uncontrolled current index, the viewport measurement, and the
// accessibility; the skin supplies only the native SHAPE: the slide corner
// radius, the arrow button shape/feedback, and the dot indicator look (size,
// shape, the active-dot widening + brand tint). The BRAND survives on every
// platform (the indigo `primary` token, never a platform default), so each
// follows light/dark.
//
//   iOS: the App Store paged-card idiom with a UIPageControl dot strip. Small
//     circular dots (7px): the active one fills brand `primary`,
//     inactive ones are `muted-foreground` at low alpha. Slide radius 12 with
//     Apple's continuous (superellipse) corners. Arrows default OFF (App Store
//     cards swipe with page-control dots, no overlay chrome); the `showArrows`
//     prop opts them in as a subtle translucent circular chip, press = dim ~0.8.
//   Android M3: the M3 carousel feel. Rounded slide corners (28dp, extra-large on
//     every M3 layout) with snap-scroll navigation. The M3 carousel anatomy is
//     container + items ONLY, so there are NO overlay arrows and NO position/dot
//     indicator: both default OFF here, and `showArrows`/`showDots` opt them back
//     in for a common Android pager. When shown, an arrow is a flat `card` chip
//     with a hairline border and a `controlRipple` press (no shadow), and the
//     active dot widens to a brand `primary` pill while inactive dots stay small.
//   Web (Embla/shadcn): visible circular OUTLINE arrow buttons (32px, radius
//     9999, `card` fill + 1px `border`) overlaid on the left/right edges, with a
//     small drop shadow; the dot strip sits below (active = wider `primary`
//     pill, inactive = `muted-foreground` alpha). Press = opacity dim.

// =============================================================================
// Web (Embla / shadcn): outline circular arrow buttons + dot strip below.
// =============================================================================

export const webSkin: CarouselSkin = {
  pressedOpacity: 0.9,
  ripple: null,

  // Web (pointer): the established Canvas look shows both arrows and dots, and a
  // mouse has no minimum touch target, so no hitSlop padding.
  defaultShowArrows: true,
  defaultShowDots: true,
  dotTarget: { minWidth: 24, height: 24, alignItems: "center", justifyContent: "center" },

  slide(tokens) {
    return {
      borderRadius: shape.web.card,
      overflow: "hidden",
      backgroundColor: tokens.card,
    };
  },

  // shadcn CarouselPrevious/Next: variant="outline" size="icon" -> size-8
  // (32px), rounded-full, a 1px border over the `card` fill, with a small lift.
  arrow(tokens) {
    return {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.card,
      borderWidth: 1,
      borderColor: tokens.border,
      ...shadow("sm"),
    };
  },
  arrowIconSize: 18,
  arrowInset: 8,

  dotsRow() {
    return {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: 12,
    };
  },
  // Active dot widens to a `primary` pill; inactive dots are muted alpha circles.
  dot(tokens, active) {
    return {
      height: 8,
      width: active ? 18 : 8,
      borderRadius: 9999,
      backgroundColor: active ? tokens.primary : alpha(tokens["muted-foreground"], 0.4),
    };
  },

  slideText(tokens) {
    return { fontSize: 16, lineHeight: 24, fontWeight: "500", color: tokens.foreground };
  },
};

// =============================================================================
// iOS: App Store paged cards with a UIPageControl dot strip. Small round dots,
// active filled brand `primary`, inactive muted-alpha; slide radius 12,
// continuous corners. Arrows default OFF (opt in via `showArrows`); when shown
// they are a subtle translucent chip. Press = opacity dim.
// =============================================================================

export const iosSkin: CarouselSkin = {
  pressedOpacity: 0.8, // HIG: dim on press
  ripple: null,

  // App Store paged cards: swipe + UIPageControl dots, no overlay arrows by
  // default (the `showArrows` prop opts them back in for pointer/iPad).
  defaultShowArrows: false,
  defaultShowDots: true,
  // Keep the small painted dot inside a real, non-overlapping HIG target.
  arrowHitSlop: 7,
  dotTarget: { minWidth: 44, height: 44, alignItems: "center", justifyContent: "center" },

  slide(tokens) {
    return {
      borderRadius: 12,
      borderCurve: "continuous", // Apple superellipse corners on the rounded slide
      overflow: "hidden",
      backgroundColor: tokens.card,
    };
  },

  // Subtle translucent chip (no border, no shadow), so the arrows read as a
  // light affordance over the card rather than a prominent button.
  arrow(tokens) {
    return {
      width: 30,
      height: 30,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: alpha(tokens.card, 0.7),
    };
  },
  arrowIconSize: 18,
  arrowInset: 8,

  dotsRow() {
    return {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      paddingTop: 12,
    };
  },
  // UIPageControl-style: equal small round dots; active fills brand `primary`,
  // inactive sit at low alpha. No widening (the fill is the affordance).
  dot(tokens, active) {
    return {
      height: 7,
      width: 7,
      borderRadius: 9999,
      backgroundColor: active ? tokens.primary : alpha(tokens["muted-foreground"], 0.35),
    };
  },

  // SF Pro Text at 17pt: line height 22, tracking -0.43 (Apple SF tracking table).
  slideText(tokens) {
    return { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43, color: tokens.foreground };
  },
};

// =============================================================================
// Android (Material 3): rounded slide corners + snap-scroll. Per the M3 carousel
// anatomy (container + items only) there are NO arrows and NO position/dot
// indicator, so both default OFF. When opted in, arrows are flat `card` chips
// with a hairline border (controlRipple on press, no shadow) and the active dot
// widens to a brand `primary` pill.
// =============================================================================

export const androidSkin: CarouselSkin = {
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (tokens) => controlRipple(tokens), // borderless 12%-alpha foreground ripple

  // M3 carousel anatomy = container + items ONLY: no overlay arrows and no
  // position/dot indicator. Both default OFF; `showArrows`/`showDots` opt them
  // back in for a common Android pager.
  defaultShowArrows: false,
  defaultShowDots: false,
  // Keep the opt-in dots inside real, non-overlapping Material touch targets.
  arrowHitSlop: 8,
  dotTarget: { minWidth: 48, height: 48, alignItems: "center", justifyContent: "center" },

  slide(tokens) {
    return {
      borderRadius: 28, // M3 carousel item corner radius (extra-large, all layouts)
      overflow: "hidden",
      backgroundColor: tokens.card,
    };
  },

  // Flat M3 chip: `card` fill, hairline border, NO shadow (the ripple carries
  // the press feedback).
  arrow(tokens) {
    return {
      width: 32,
      height: 32,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.card,
      borderWidth: 1,
      borderColor: tokens.border,
      overflow: "hidden",
    };
  },
  arrowIconSize: 20,
  arrowInset: 8,

  dotsRow() {
    return {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: 12,
    };
  },
  // Off-anatomy for M3 (which defines no position indicator), so `showDots`
  // defaults off; when opted in, the active item widens to a brand `primary`
  // pill and inactive items stay small muted-alpha circles (a common Android pager).
  dot(tokens, active) {
    return {
      height: 8,
      width: active ? 20 : 8,
      borderRadius: 9999,
      backgroundColor: active ? tokens.primary : alpha(tokens["muted-foreground"], 0.4),
    };
  },

  // M3 title-medium: 16/24/500 with +0.15 tracking.
  slideText(tokens) {
    return { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: tokens.foreground };
  },
};
