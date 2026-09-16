import { type ReactNode } from "react";
import { type ViewStyle, type TextStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { type ColorTokens, shadow, shape } from "../../style/index.js";

// Co-located Popover skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark and read as glass when the
// ThemeProvider's surface is "glass", since the shell renders the card through
// GlassSurface, which strips the skin's fill and paints the active material over
// its own `glass-tint`; the `popover` token itself is opaque in both modes and
// glass never rewrites it). The BRAND survives on every platform (the heading type
// and the primary action button stay the indigo brand, never a platform default);
// only the native SHAPE, fill, border treatment, elevation, and padding change
// per OS:
//   iOS 27 (iOS 26+, Liquid Glass) popover: a largely rounded card (~26 radius)
//     over the `popover` material, NO visible border, a soft lg shadow, ~16pt
//     padding, with a slim tapered BEAK pointing toward the anchor (up when the
//     card is below the trigger, down when above). The selection accent / action
//     button stay the brand indigo.
//   Android (no native popover): a flat-cornered ELEVATED surface (~12 radius)
//     over `popover`, M3 elevation (md shadow), NO border and NO arrow — an
//     elevated menu/dialog-style surface, mirroring the select Android menu.
//   Web: the established Canvas look (the current popover, lifted verbatim) — a
//     fixed 260px card, 8 radius, a full 1px `border`, `popover` fill, 16 padding,
//     shadow-lg; no arrow.

export type Placement = "top" | "bottom";

// The contract a platform skin fulfills. The shell resolves the placement axis
// and the inline/floating state and passes them in; the skin maps them to RN
// style objects. `arrow` RENDERS the anchor pointer node (a beak the shell draws in
// SOLID mode only) or is null when the platform draws no arrow. It renders a node
// rather than returning a ViewStyle so a platform can draw a true tapered beak with
// an SVG path (iOS) instead of being limited to a rotated box. Under glass the shell
// omits the beak: a flat token-filled beak cannot match the Liquid Glass material,
// so a beak-less rounded card (how iOS 26 menus read) is used instead.
export interface PopoverSkin {
  /** The card's fixed width in px. The shell hands it to AnchoredOverlay so a
   *  narrow outlet (a phone screen) clamps the card instead of overflowing. */
  cardWidth: number;
  /** The floating card frame: width, radius, border, fill, padding, shadow. */
  card: (t: ColorTokens) => ViewStyle;
  /** The popover heading. */
  title: (t: ColorTokens) => TextStyle;
  /** The supporting line beneath the title. */
  description: (t: ColorTokens) => TextStyle;
  /** Renders the anchor pointer toward the anchor, or null when the platform has none. */
  arrow: ((t: ColorTokens, placement: Placement, anchor?: { centerX: number; cardWidth: number }) => ReactNode) | null;
  /** Standoff reserved for the solid arrow's protrusion. */
  arrowGap?: number;
}

// --- shared layout fragments (identical across platforms) -------------------

// The outer wrapper when a trigger is present: it anchors the absolutely
// positioned card (`relative`) and hugs its content (`self-start`).
export const wrapper: ViewStyle = { position: "relative", alignSelf: "flex-start" };

// When the popover is open, the wrapper itself is lifted into its own stacking
// context above sibling content. react-native-web gives every positioned View an
// implicit stacking context, so the card's own `zIndex` is scoped INSIDE the
// `relative` wrapper and cannot rise above a later sibling (e.g. the next
// platform row in the docs preview, or any following element on a real page).
// Raising the wrapper's zIndex while open lifts the whole overlay — trigger and
// card together — above everything painted after it.
export const wrapperLifted: ViewStyle = { zIndex: 50 };

// The trigger button is wrapped so it hugs its content rather than stretching.
export const triggerWrap: ViewStyle = { alignSelf: "flex-start" };

// With a trigger, the card floats below it (the wrapper is `relative`): pinned
// to the wrapper's bottom-left, lifted above siblings, with a small gap.
export const cardFloating: ViewStyle = {
  position: "absolute",
  top: "100%",
  start: 0,
  zIndex: 50,
  marginTop: 8,
};

// The custom-content slot (`children`), spaced from the title/description block
// above it. The shell omits the margin when children are the panel's first content.
export const bodySlot: ViewStyle = { marginTop: 12 };

// The action row: a right-aligned button, spaced from the body above it.
export const actionRow: ViewStyle = { marginTop: 12, flexDirection: "row", justifyContent: "flex-end" };

// The card heading + description share this brand type scale across platforms
// (small, the brand face, not a platform-specific font).
const TITLE_TYPE: TextStyle = { fontSize: 14, lineHeight: 20, fontWeight: "600" };
const DESC_TYPE: TextStyle = { marginTop: 4, fontSize: 14, lineHeight: 20 };

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// A fixed 260px card, the menu radius (8), a full 1px `border`, the `popover`
// fill (translucent under glass), 16 padding, shadow-lg; no arrow.
export const webSkin: PopoverSkin = {
  cardWidth: 260,
  card: (t) => ({
    width: 260,
    maxWidth: "100%",
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 16,
    ...shadow("lg"),
  }),
  title: (t) => ({ ...TITLE_TYPE, color: t["popover-foreground"] }),
  description: (t) => ({ ...DESC_TYPE, color: t["muted-foreground"] }),
  arrow: null,
};

// ---------- iOS 27 (Liquid Glass popover): rounded material card, no border, beak ----------
// Apple's iOS 26+/Liquid Glass popover: a largely rounded rect (~26pt) over the
// `popover` material with NO visible border, a soft lg drop shadow, ~16pt
// padding, and a slim tapered BEAK pointing toward the anchor view. Brand
// type/accents survive.
//
// Beak geometry, transcribed from the iOS 27 UI Kit "Popovers (iPad Only)"
// symbol group (every placement variant draws the same silhouette): a slim
// triangular/teardrop nub that flows out of the card edge as ONE continuous
// silhouette — concave tangent fillets where the card edge curves up into the
// beak on both sides, tapering to a softly-rounded apex, and TALLER than its tip
// is wide. Base ~1/4 of the card width; protrusion >= the beak's own corner
// radii. Built as an SVG path (NOT a rotated rounded square, which reads as a
// chunky symmetric diamond with convex shoulders and no base fillet).
const IOS_BEAK_W = 30; // base width where the beak meets the card edge
const IOS_BEAK_H = 13; // protrusion past the card edge (taller than the tip is wide)
const IOS_BEAK_FILLET = 7; // concave shoulder fillet near the card edge
const IOS_BEAK_TIP = 3.5; // softly-rounded apex radius
const IOS_CARD_RADIUS = 26;

export function popoverArrowOffset(centerX: number, cardWidth: number): number {
  // Keep the shoulders on the straight card edge, including narrow hosts.
  const inset = Math.min(IOS_CARD_RADIUS, Math.max(0, (cardWidth - IOS_BEAK_W) / 2));
  return Math.max(inset, Math.min(centerX - IOS_BEAK_W / 2, cardWidth - inset - IOS_BEAK_W));
}

// The pointing-UP beak path (apex at the top), drawn on a IOS_BEAK_W x IOS_BEAK_H
// viewBox. Shoulders use cubic beziers whose first control point sits ON the card
// edge so the curve eases out of the flat edge CONCAVELY (tangent fillet) before
// climbing each flank toward the apex; the apex is a short rounded quadratic join.
// The card-edge-facing base is a straight line flush to the card. For the DOWN
// beak the same path is rendered mirrored vertically (scaleY: -1).
const beakUpPath = [
  // left foot, on the card edge
  `M 0 ${IOS_BEAK_H}`,
  // concave fillet off the card edge, then climb the left flank toward the apex
  `C ${IOS_BEAK_FILLET} ${IOS_BEAK_H}, ${IOS_BEAK_W / 2 - IOS_BEAK_TIP} ${IOS_BEAK_TIP}, ${IOS_BEAK_W / 2 - IOS_BEAK_TIP * 0.4} ${IOS_BEAK_TIP * 0.5}`,
  // rounded apex
  `Q ${IOS_BEAK_W / 2} 0, ${IOS_BEAK_W / 2 + IOS_BEAK_TIP * 0.4} ${IOS_BEAK_TIP * 0.5}`,
  // right flank back down, mirror of the left concave fillet
  `C ${IOS_BEAK_W / 2 + IOS_BEAK_TIP} ${IOS_BEAK_TIP}, ${IOS_BEAK_W - IOS_BEAK_FILLET} ${IOS_BEAK_H}, ${IOS_BEAK_W} ${IOS_BEAK_H}`,
  // close along the card edge
  "Z",
].join(" ");

export const iosSkin: PopoverSkin = {
  cardWidth: 260,
  card: (t) => ({
    width: 260,
    maxWidth: "100%",
    borderRadius: IOS_CARD_RADIUS,
    backgroundColor: t.popover,
    padding: 16,
    ...shadow("lg"),
  }),
  title: (t) => ({ ...TITLE_TYPE, color: t["popover-foreground"] }),
  description: (t) => ({ ...DESC_TYPE, color: t["muted-foreground"] }),
  // The beak is an SVG <Path> filled with the `popover` token so it reads as one
  // continuous silhouette with the card edge: the exact card fill, since the beak
  // is drawn in SOLID mode only (the shell omits it under glass, where a flat
  // token-filled beak could not match the material). The path's base overlaps the
  // card edge by ~1px to weld the two together. It is positioned
  // by the shell flush to the card's anchor-facing edge, inset from the left so it
  // sits under the trigger. The viewBox is flipped vertically for the `top`
  // placement so the apex points down toward an anchor above the card.
  arrowGap: IOS_BEAK_H - 1,
  arrow: (t, placement, anchor) => {
    const pointUp = placement === "bottom"; // card below the trigger -> beak points up
    return (
      <Svg
        width={IOS_BEAK_W}
        height={IOS_BEAK_H}
        viewBox={`0 0 ${IOS_BEAK_W} ${IOS_BEAK_H}`}
        style={{
          position: "absolute",
          ...(anchor ? { left: popoverArrowOffset(anchor.centerX, anchor.cardWidth) } : { start: 24 }),
          // Overlap the card edge by ~1px so the seam welds shut: ride the TOP
          // edge (pointing up) when the card is below the trigger, and the BOTTOM
          // edge (pointing down) when the card is above it.
          ...(pointUp ? { top: -(IOS_BEAK_H - 1) } : { bottom: -(IOS_BEAK_H - 1) }),
          // flip the upward path to point down for the `top` placement
          ...(pointUp ? null : { transform: [{ scaleY: -1 }] }),
        }}
      >
        <Path d={beakUpPath} fill={t.popover} />
      </Svg>
    );
  },
};

// ---------- Android (no native popover): flat-cornered elevated surface ----------
// Material 3 has no popover; the convention is an elevated menu/dialog-style
// surface. A flat-cornered card (~12dp radius) over `popover` with M3 elevation
// (md shadow), NO border and NO arrow — mirrors the select Android menu surface.
export const androidSkin: PopoverSkin = {
  cardWidth: 260,
  card: (t) => ({
    width: 260,
    maxWidth: "100%",
    borderRadius: 12,
    backgroundColor: t.popover,
    padding: 16,
    ...shadow("md"),
  }),
  title: (t) => ({ ...TITLE_TYPE, color: t["popover-foreground"] }),
  description: (t) => ({ ...DESC_TYPE, color: t["muted-foreground"] }),
  arrow: null,
};
