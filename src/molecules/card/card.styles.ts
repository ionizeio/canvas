import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, customShadow, shape } from "../../style/index.js";
import { HOVER } from "../../style/motion.js";
import { type HoverMotion } from "../../style/hover.js";

// Per-OS Card skins. Card is a "Light" platform treatment: one structure and one
// set of (semantic) colors live in card.shared.tsx; only the small native touches
// shift per OS on the MAIN card surface, namely the corner radius (+ the iOS
// corner curve), the surface's border-vs-elevation treatment, the card's own
// content density (its padding + the gap between flat children), and the elevation
// / shadow. Press feedback (the interactive / onPress affordance) is handled in
// the shell: Android gets android_ripple, iOS/web get a pressed opacity dim.
//
// The composition subcomponents (CardHeader/CardTitle/CardContent/CardFooter/
// CardSeparator) are STATIC shared members, so their insets and type are shared
// (one value across platforms); only the main surface is skin-parameterized.
//
// - Web is the Riskora card: the card corner (`shape.web.card`), a soft 1px hairline, the
//   ambient standard shade at rest (raised lifts to md), a 24px inset; the default
//   density also carries the card's own flat-child gap (padding implies rhythm). A
//   pressable card takes Dark Factory's hover lift (`hover`).
// - iOS follows HIG conventions: iOS has no card control, so the structure is kept
//   and only iOS touches are applied: a larger 12pt radius with Apple's continuous
//   (superellipse) corner curve, and the shared Light-treatment 1px border. Native
//   iOS grouped surfaces are flat, so the resting card drops to no shadow (raised
//   still lifts).
// - Android matches Material 3 cards, where outline and elevation are mutually
//   exclusive: the default card is the M3 ELEVATED card (level-1 elevation, NO
//   visible outline), `flat` is the M3 OUTLINED card (1dp outline, elevation 0),
//   `raised` lifts the elevated card to M3 level 3 (6dp). Plus the M3 medium
//   shape (12dp corner radius) and tighter M3 density steps.

export type Elevation = "raised" | "flat" | "default";
export type Density = "compact" | "comfortable" | "default";

export interface CardSkin {
  /** Corner radius of the card surface. */
  radius: number;
  /** Corner curve; iOS sets "continuous" (Apple superellipse), a no-op elsewhere. */
  curve?: ViewStyle["borderCurve"];
  /** Surface colors (fill + border color), per elevation variant. */
  surface: (tokens: ColorTokens, e: Elevation) => ViewStyle;
  /** Elevation -> shadow mapping (resting/raised/flat differ per OS). */
  elevation: (e: Elevation, t: ColorTokens) => ViewStyle;
  /** The card's own content padding + flat-child gap, per density. The `default`
   *  row is the standard padded surface every plain card takes (what the `padded`
   *  prop makes explicit), so the surface owns the rhythm between flat children;
   *  `flush` opts out of the whole row. */
  density: Record<Density, ViewStyle>;
  /** The standard inset WITHOUT the flat-child gap. The Card shell no longer
   *  reads this (the default density row superseded it); it remains the gap-free
   *  inset that derived chrome spreads into its own row (Radio's `card` mode,
   *  which owns its internal ring-to-label gap). */
  padded: ViewStyle;
  /**
   * Hover feedback on a pressable card (one with `onPress`): the rise and its timing,
   * and the elevation the hovered card takes for each resting one. Omitted: the card
   * does not respond to hover (the iOS and Android skins, whose platforms deliver no
   * pointer hover by default; the Android card is Material 3's).
   */
  hover?: { motion: HoverMotion; elevation: (e: Elevation) => Elevation };
}

// The shared Light-treatment surface colors (web + iOS, and Android's outlined
// `flat`): the hairline tokens.border outline on the tokens.card fill.
const lightSurface = (tokens: ColorTokens): ViewStyle => ({ borderColor: tokens.border, backgroundColor: tokens.card });

// --- web (the Riskora card) --------------------------------------------------

const WEB_DENSITY: Record<Density, ViewStyle> = {
  compact: { padding: 16, gap: 12 },
  comfortable: { padding: 32, gap: 24 },
  // The default density IS the standard padded surface: the established 24px
  // inset plus the card's own rhythm between flat children (`padded` is the
  // explicit form of this default; `flush` opts out of the whole row).
  default: { padding: 24, gap: 16 },
};

export const webSkin: CardSkin = {
  radius: shape.web.card,
  surface: lightSurface,
  elevation: (e, t) => (e === "raised" ? shadow("md", t) : e === "flat" ? shadow("none") : shadow("DEFAULT", t)),
  density: WEB_DENSITY,
  padded: { padding: 24 },
  // Dark Factory's card lift: a pressable card rises 2 px and its resting shade deepens
  // to the hovered one (md, DF's hovered card) in step; a raised or flat card rises with
  // its shade unchanged, as DF's other lifting surfaces do.
  hover: { motion: HOVER.card, elevation: (e) => (e === "default" ? "raised" : e) },
};

// --- iOS (HIG conventions: continuous corner curve, flat resting surface) ----

export const iosSkin: CardSkin = {
  radius: 12,
  // Apple's superellipse corner curve (an iOS-only RN style prop; device-only
  // visual, a no-op on other platforms and in the web docs preview).
  curve: "continuous",
  // iOS keeps the shared Light-treatment border (the documented cross-platform
  // choice; native grouped surfaces separate by fill, but the hairline is by design).
  surface: lightSurface,
  // Native iOS grouped surfaces are flat: the resting card carries no shadow;
  // raised still lifts, flat stays flat.
  elevation: (e, t) => (e === "raised" ? shadow("sm", t) : shadow("none")),
  density: WEB_DENSITY,
  padded: { padding: 24 },
};

// --- Android (Material 3 cards: 12dp medium shape, tighter M3 density) --------

const M3_DENSITY: Record<Density, ViewStyle> = {
  compact: { padding: 12, gap: 8 },
  comfortable: { padding: 24, gap: 20 },
  // The default density IS the standard padded surface: M3's 16dp content
  // padding plus the tighter M3 rhythm between flat children.
  default: { padding: 16, gap: 12 },
};

export const androidSkin: CardSkin = {
  // M3 medium shape token (cards).
  radius: 12,
  // M3 cards never combine an outline with nonzero elevation, so the default and
  // `raised` cards read as M3 ELEVATED (no visible outline) and `flat` reads as M3
  // OUTLINED (1dp outline, elevation 0). The non-outlined variants keep the shared
  // 1px border WIDTH but paint it transparent: content metrics stay identical
  // across variants and platforms, and `selected` can still recolor the hairline
  // to primary without shifting content.
  surface: (tokens, e) => ({
    borderColor: e === "flat" ? tokens.border : "transparent",
    backgroundColor: tokens.card,
  }),
  // M3 resting elevation = level 1 (1dp, our shadow-sm exactly); raised = level 3
  // (6dp: shadow("md")'s shade with the Android elevation corrected via
  // customShadow, since shadow("md") carries elevation 4, which matches no M3
  // level); flat / outlined drops elevation entirely.
  elevation: (e, t) =>
    e === "raised"
      ? customShadow({ offsetY: 4, radius: 6, opacity: 0.1, elevation: 6 })
      : e === "flat"
        ? shadow("none")
        : shadow("sm", t),
  density: M3_DENSITY,
  // M3 cards use 16dp content padding (gap-free; see the CardSkin.padded doc).
  padded: { padding: 16 },
};

// --- shared, color-bearing / layout styles (Light treatment: one set) --------
// These belong to the static composition subcomponents, so they are
// platform-neutral (one value across all three skins). The border WIDTH is shared
// too (the surface colors, including the border color, come from each skin's
// `surface`, so Android can paint the elevated card's border transparent while
// content metrics stay identical everywhere).

export const cardBase: ViewStyle = { borderWidth: 1 };

export const header: ViewStyle = { gap: 6, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 20 };

// Riskora's card title is Title/H6: 20 at the regular weight, no tracking.
export const title = (tokens: ColorTokens): TextStyle => ({ fontSize: 20, lineHeight: 30, fontWeight: "400", color: tokens["card-foreground"] });

export const description = (tokens: ColorTokens): TextStyle => ({ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] });

// The body section pads itself AND spaces its flat children, mirroring the plain
// padded surface's rhythm (gap is inert with a single child).
export const content: ViewStyle = { paddingHorizontal: 20, paddingVertical: 20, gap: 16 };

export const footer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 20,
  paddingBottom: 20,
  paddingTop: 16,
};

export const separator = (tokens: ColorTokens): ViewStyle => ({ height: 1, width: "100%", backgroundColor: tokens.border });

export const bodyText = (tokens: ColorTokens): TextStyle => ({ fontSize: 14, lineHeight: 20, color: tokens["card-foreground"] });

export const footerText = (tokens: ColorTokens): TextStyle => ({ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] });
