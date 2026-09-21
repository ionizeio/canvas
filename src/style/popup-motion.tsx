import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { JS_DRIVER, keyframes, supportsNativeDriver, useReducedMotion } from "./motion.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

/** Internal activation only. Public overlay helpers retain their existing behavior. */
export const PopupMotionPolicy = createContext(false);
/** Suppress the ordinary whole-content entrance when decoration owns motion. */
export const StationaryEntranceContext = createContext(false);
/** Retained decoration does not participate in input or accessibility. */
export const PopupInteractionContext = createContext(true);
export type PopupEdge = "top" | "bottom" | "left" | "right";
export interface PopupSize { width: number; height: number }
/**
 * A moving material, as its surface's GlassBox reads it: the frame its wrapper wears
 * this frame (`usePopupMotion`'s `frame`), and the bounds that frame settles at (the
 * card's measured size). The layers take the frame's radius through
 * MaterialShapeContext; the web lens sizes its one filter definition for `rest`
 * instead of following the wrapper's layout frame by frame (see GlassLensLayer).
 */
export interface MaterialMotion {
  frame: Animated.WithAnimatedValue<ViewStyle>;
  rest: PopupSize;
  /** The material's own under-fill opacity: faint at the droplet's birth, full once grown (see `birth`); its rim stays whole. */
  presence: Animated.Value;
}
/** Only the owning surface consumes this motion; nested surfaces stay independent. */
export const MaterialMotionContext = createContext<MaterialMotion | null>(null);
/**
 * The trigger's frame in the card's own coordinates and the corner its material wears:
 * the shape the pane's material is at progress 0 when a popup hands off with its
 * trigger (see popup-handoff.tsx). Above a card that opens below its trigger, `y` is
 * negative.
 */
export interface PopupOrigin {
  x: number; y: number; width: number; height: number; radius: number;
  /**
   * Whether the drop HANGS from the trigger's far edge at the seed (a whole trigger's
   * pill: the pill's spot is empty and the drop sits under it, as the reference's
   * does) or is born over the trigger's box and slides off it (a field, which is
   * read or typed into while its list is open and returns the moment the pane has
   * cleared its box, see `fieldCoverMark`).
   */
  hangs?: boolean;
}
/** The opacities of the two under-fills a hand-off pane paints: the trigger's layer's and its own. */
export interface PopupBlend { trigger: Animated.AnimatedInterpolation<number>; own: Animated.AnimatedInterpolation<number> }
/**
 * The rows' focus on its own JS-driven wrapper (a `filter` runs on no native driver,
 * and a JS-driven value may not share a node with the native-driven ones): the blur
 * they sharpen from at the birth and blur into as ghosts on a dismiss, as the CSS
 * filter string every platform's `filter` style accepts, and the ghosts' fade.
 */
export interface PopupFocus { filter: Animated.AnimatedInterpolation<string>; opacity: Animated.Value }

/**
 * The presentation of a liquid popup, in one table. Modelled on the iOS 26 menu
 * behind the docs header's hamburger, recorded at 30 fps (tools/native/liquid-motion.md,
 * 2026-09-19): the pane opens FROM a droplet at its anchor with the rows already inside
 * it, scaled down and faint, grows a few percent past its resting size and settles
 * while the rows sharpen; on close the rows vanish at once and the pane shrinks back
 * into the anchor edge. Tuned on the /testing/popup harness. Never a public prop.
 *
 * The whole presentation is transforms, opacity and a corner radius, so on iOS and
 * Android every frame runs in the native animated module (see `usePopupMotion`).
 */
export const POPUP_PRESENTATION = {
  /**
   * Travel, progress 0 (nothing at the anchor) to 1 (the resting bounds): an
   * underdamped opening, so the pane overshoots and settles, and a clamped close.
   */
  travel: {
    /**
     * Slow off the seed, then most of the growth inside two frames, full at about
     * +150 with a few percent past rest and a settle to about +330: the reference's
     * drop is a third of its menu at +33, half at +67, over ninety percent at +100,
     * full at +167 and at rest by +467 (the `ios-native-menu` card). 400/28 was a
     * frame behind through the middle (75% tall at +129 against the reference's
     * 92%), 600/34 still 81% at +107; 650/38 was full at the same time but at rest
     * 200 ms early. No single spring is both at ninety-five percent by +100 and
     * two percent past rest until +280 as the reference is; this one is eighty
     * percent at +100, past rest from +160, and settled by about +380 (37 of
     * damping settled by +280, a frame or two before the reference's rows come to
     * rest).
     */
    open: { stiffness: 700, damping: 33 },
    close: { stiffness: 720, damping: 42 },
  },
  /**
   * Where an opening from the closed state seats progress before its spring runs:
   * the droplet. The drop's extents at the seed are the birth's (`birth.along`,
   * `handoff.droplet`), so the seed's value is about the marks on the travel: above
   * `handoff.reform` (an opening never shows the pill under its drop), at
   * `handoff.widen` (the drop widens from birth, the reference's is 40% of its menu
   * at +33 and 62% at +67), and a close reaches the drop's shape here.
   */
  seed: 0.45,
  /**
   * The droplet's birth (the card's first quality, an opening only). `along` is the
   * drop's extent ALONG the anchor axis at the seed as a fraction of the card's (the
   * reference's drop is about 35% of its menu's height one frame after the tap; a
   * hand-off drop is never shorter than the trigger it replaces). Under a hand-off
   * the drop HANGS from the trigger's far edge (the pill's bottom, for a card that
   * opens below it): the reference's drop sits under its pill with its tip on the
   * pill's bottom edge and the pill's spot empty, and a drop born over the pill's
   * lower half (the first 2026-09-20 cut) read as a lozenge in the button's
   * footprint. Its tone at birth is the TRIGGER's (the bright control puck, see
   * `handoff.tint`) at `fill` of its opacity, whole `fillMs` later (a native-driven
   * timing): a sheer light body, lighter than the page it floats over, with its rim
   * whole from the first frame. The reference's drop sits eleven levels of luminance
   * over its page one frame after the tap; the puck whole sat twenty-seven over it,
   * the brightest frame of the sequence, and at 0.35 it was a dark smudge with no
   * body (both 2026-09-20 cuts). The rows inside it are born blurred by `blur` px and sharpen on
   * their own clock, sharp `sharpMs` after the birth (the reference's rows are soft
   * through +133, nearly sharp at +167 and sharp from +233; the pane mounts a frame
   * after the tap, and 200 read a frame soft against the reference at +120 and
   * +160), soft through the first half of that and sharpening through the second. The blur is a `filter`, which no
   * native driver animates, so it rides a wrapper of its own on the JS driver for
   * those frames.
   */
  birth: { along: 0.35, fill: 0.5, fillMs: 180, blur: 6, sharpMs: 170 },
  /**
   * The pane's extent ACROSS the anchor axis at progress 0, as a fraction of its
   * resting extent (along the axis the extent is progress itself).
   */
  across: 0.3,
  /**
   * The corner. At the seed the drop is a capsule on its shorter side (`droplet` of
   * that side, never under the skin's own); it stays ROUNDER than the skin's corner
   * while it grows, wearing `grown` of the full pane's shorter side at progress 1
   * (the reference's pane at full size, +167, is a capsule, its corner half its
   * menu's width; 0.37 read as a rounded rectangle beside it);
   * and it relaxes to the skin's corner only once the pane is full, over
   * `settle.ms` from `settle.holdMs` after the birth (the reference's corner is
   * twice its menu's at +200, 1.4 times at +240, 1.2 at +280 and at rest by +360;
   * a hold of 167 with 166 of ease-out ran a frame or two late, still 1.3 times at
   * +320, 133 with 150 a frame early against a 0.37 corner, and 150 with 166 a
   * frame late against the capsule), on a native-driven timing of its own. A close relaxes the other way as
   * the pane shrinks, back to the capsule by the seed. The corner is exact on the
   * seed shape's shorter side and follows the scale's ratio on the other, see
   * `radiusTable`.
   */
  radius: { droplet: 0.5, grown: 0.5, settle: { holdMs: 120, ms: 166 } },
  /**
   * The rows, scaled with the pane, cross-fade in between these progress marks:
   * faint at the seed and full as the pane fills out (the reference's rows are
   * smudges one frame after the tap and legible by +133).
   */
  content: { fadeFrom: 0.3, fadeTo: 0.9 },
  /**
   * The dismiss. The rows RETIRE as blurred ghosts rather than in a cut: on the
   * close's first frame they are blurred by the birth's `blur` and at `keep` of their
   * ink, and the ghosts fade out over `fadeMs` on the same JS-driven wrapper (the
   * reference's rows are faint blurred ghosts one frame after the tap, about an
   * eighth of their ink, still there at +67 and gone by +100; a 33 ms blur with a
   * 90 ms fade left three quarters of the ink in the first frame). The emptied pane
   * goes SHEER the same frame: its under-fills thin to `sheer` of their opacity over
   * `sheerMs` (the page text under the reference's pane, hidden at rest, shows
   * through at +33 and stays so while it shrinks; its rim stays whole, a bounded
   * body), and stay so until it leaves; the re-formed pill under it is at its own
   * full tone, so the two bodies never add up to a flash.
   */
  dismiss: { ghost: { keep: 0.15, fadeMs: 70 }, sheer: 0.35, sheerMs: 33 },
  /** The contour: a stretch and squash around the travel, independent of it. */
  contour: {
    stiffness: 320, damping: 15,
    openVelocity: 10, closeVelocity: -5, resizeVelocity: 14,
    stretch: { recoil: 0.98, peak: 1.055 },
    squash: { recoil: 1.018, peak: 0.975 },
  },
  /**
   * The button-to-menu hand-off of a Dropdown-class trigger (popup-handoff.tsx): the
   * pane's material IS the trigger's pill at progress 0 and the resting card at 1, so
   * the pill vanishes into the droplet on open and the pane re-forms the pill on close.
   * Modelled on the native menu's dismiss (frames 169 to 176 of the reference): the
   * pane narrows to the button first, the drop left under it absorbs upward, and the
   * button's icons fade back while the last of the drop is still merging.
   */
  handoff: {
    /**
     * The droplet's extent ACROSS the anchor axis at the seed, as a fraction of the
     * card's, and never wider than the trigger's own: the reference's drop is about
     * 45% of its menu's width and narrower than the pill it replaces (frame 075). A
     * narrow pill is its own droplet (the cap never bites); a wide trigger (a field
     * that fills its column) vanishes whole and a compact drop forms centred under it
     * instead of a bar the field's full width. Progress 0 is still the trigger's whole
     * box, so a close re-widens the drop into the box before the hand-back and the
     * trigger's own material returns onto the same shape.
     */
    droplet: 0.45,
    /**
     * The pane keeps the droplet's extent ACROSS the anchor axis until this progress
     * and widens to the card's from there, so the droplet keeps its shape while it
     * grows along the axis and a closing pane narrows to the drop before its height
     * is gone.
     */
    widen: 0.45,
    /**
     * The trigger's label: out over `hideMs` from the frame the pane exists (0 is a
     * cut on that frame: the droplet takes the label's place the way the reference's
     * pill vanishes whole, icons and glass in one frame; a 33 ms fade left half the
     * label under the drop's blur in the +33 tile, and 16 still raced the tile on
     * the web, where the fade only starts a frame after the pane's mount), and back
     * over `returnMs` from `returnDelayMs` after the pane has re-formed the pill and
     * left. The reference's icons come up over its merged glass from about +170
     * (faint) to +333 (whole), the frames its neck is absorbed in; the pane here
     * slides onto the pill and leaves at about +205, so the label starts as it
     * leaves and takes 130 to be whole at about +335 (a delay of 60 put its start
     * two frames behind the reference's, and 100 had it whole 50 ms early). On iOS the native glass can trail the commit by a frame (the
     * 2026-09-19 `ios-handoff-01` row): that frame shows the pill's glass without
     * its label, a flash no fade of the label fixes, since the reference's pill is
     * gone whole in that frame. The pane sits above the trigger (the overlay outlet), so a label fading
     * in under the pane's glass would read dimmed and blurred through it; the native
     * menu's icons fade over the last hundred milliseconds of its merge, and this is
     * the same fade a beat later, on the trigger's own material.
     */
    label: { hideMs: 0, returnDelayMs: 0, returnMs: 130 },
    /**
     * The progress below which a closing pane counts as MERGED with the trigger: it
     * snaps home there instead of crawling the spring's last pixels, so the trigger's
     * material and label come back the frame the drop has been absorbed, the way the
     * reference's icons are back within 100 ms of its merge. 0.06 of the travel is
     * under 2 px of the along extent between the drop and the pill on the docs
     * Dropdown, invisible at 30 fps; at 0.015 the spring's tail kept the drop on the
     * pill for 120 ms after it had visibly landed (label back two tiles after the
     * reference's), and the wait for the numeric rest before that left the re-formed
     * pill empty ~230 ms.
     */
    merged: 0.06,
    /**
     * The progress below which a closing pane's TRIGGER re-forms its own material
     * above the hanging drop, a second body: the reference's pill is back as a small
     * body of its own at +120 to +133, the frame after its blob has narrowed to the
     * drop, and the two merge from +200. The drop hangs under the trigger from here
     * down to `slide` and then slides onto its box, so the two bodies touch and
     * overlap rather than bridge (no neck: the material has no metaball pass). Under
     * the seed, so an opening never shows the pill under its droplet.
     */
    reform: 0.4,
    /**
     * How the trigger's material RE-FORMS at `reform`: it comes back at `from` of
     * its size, scaled about its centre, and springs to whole (the reference's pill
     * is a small oval a third of its width at +133, half at +167, 86% at +200 and
     * whole by +267; 500/30 was still 87% at +240).
     * A scale, never an opacity: the material is whole or absent, never partial.
     */
    reformGrowth: { from: 0.35, stiffness: 800, damping: 40 },
    /**
     * The progress below which a closing drop SLIDES from under the trigger onto its
     * box (above it the drop hangs from the trigger's far edge): the reference's blob
     * hangs separate under its re-formed pill at +167 and is absorbed over +200 to
     * +233, so the slide begins after the pill has re-formed (`reform`) and takes
     * the spring's last part of the travel. An opening drop is born above this
     * mark, so the slide never shows on the way out.
     */
    slide: 0.2,
    /**
     * The material's under-fill is the TRIGGER's layer (the bright control puck) up
     * to the seed and the pane's own (the dense menu tint) from this progress on,
     * cross-fading between: the drop is born with the pill's tone (the reference's
     * drop is a light sheer body, lighter than the page, one frame after the tap)
     * and darkens to the menu's as it grows, and the pill that re-forms is the
     * trigger's material, not a menu-tinted copy of it.
     */
    tint: 0.7,
    /**
     * The close back onto the trigger. On the reference the rows vanish at +33 and
     * the emptied pane CONTRACTS in that frame, to about 86% of its width and 82% of
     * its height about its centre, holds there through +67, then shrinks fast (a
     * narrowing blob under half its width by +100, on the button by +167) and merges
     * by +233: `contract` is the scale the pane steps to ABOUT ITS CENTRE over
     * `contractMs` (a factor of its own on both axes, released back to 1 over
     * `releaseMs` as the spring runs, so the pane ends on the pill's box exactly),
     * then a `hold`, then a stiff, near-critically damped spring. Without
     * the hold the shrink began a tile early and front-loaded (65% at +67, 37% at
     * +100); a softer spring alone (320/30) put the merge at +233 but kept the early
     * start; 520/40 with a 60 ms hold was a tile late through the shrink (77% wide
     * at +120, on the button at +200, the 2026-09-20 `web-dropdown-page-08` judge),
     * and 900/54 still 80% wide at +105: the reference's pane goes from full to
     * under half its width inside the 40 ms after +80, so the spring must cover half
     * the travel in that time (1400/70 with a 45 ms hold and no contraction ran a
     * tile early: 74% at +92 and on the button at +116; with the contraction and a
     * 20 ms hold it had the drop sliding onto the pill from +150 and merged by +190,
     * a frame before the reference's merge begins, so 1000/58 lets the tail take
     * the reference's +200 to +233). The hold is counted from the contraction's
     * end, itself a frame and 33 ms after the tap, so 10 lands the spring's start at
     * about +65, the reference's shrink beginning after +67, and its pill re-forming
     * (`reform`) at about +140, the reference's at +120 to +160.
     */
    close: { contract: 0.85, contractMs: 33, releaseMs: 120, hold: 10, stiffness: 1000, damping: 58 },
    /**
     * The FIELD hand-off (Autocomplete, Select, PhoneInput): the same travel between
     * the field's box and the card as a menu button's, so the field vanishes into the
     * droplet on open and the pane absorbs back onto the box on close, with one
     * difference the anatomy forces: a field is read or typed into while its list is
     * open, so its material and text are only hidden while the pane COVERS the box
     * (from the snap up to the cover mark) and are back as soon as the pane has left
     * it, both on the way out and on the way home. `margin` is the share of the
     * travel by which the field hides before the pane's edge reaches the box (the
     * contour's stretch carries the edge a few pixels past the unstretched frame).
     */
    field: { margin: 0.03 },
  },
} as const;

const { travel: TRAVEL, seed: SEED, birth: BIRTH, across: ACROSS, radius: RADIUS, content: CONTENT, dismiss: DISMISS, contour: CONTOUR, handoff: HANDOFF } = POPUP_PRESENTATION;

/**
 * The progress below which a hand-off trigger's own material is back. The material
 * must never sit at a partial opacity (a native glass ancestor at a fractional alpha
 * may not paint; a web backdrop under one loses its sampling root), and the close
 * spring is clamped: it crosses 0 with velocity and is snapped to exactly 0 on the
 * frame it does, so the last value it paints before that can be arbitrarily small (a
 * web run painted 8e-6). The step is therefore as sharp as the interpolation allows:
 * anything above this reads as 0, and only the snapped 0 itself reads as 1.
 */
export const HANDOFF_RETURN = 1e-9;

/** The across extent's share of its travel at `progress` under the hand-off (held at the trigger's until `widen`). */
export function handoffAcross(progress: number): number {
  return progress <= HANDOFF.widen ? 0 : Math.min(1, (progress - HANDOFF.widen) / (1 - HANDOFF.widen));
}

/**
 * Where a field's material hides and returns: the progress at which the pane's box,
 * travelling between the field's box and the card, has its near edge on the field's
 * near edge, less the table's margin. Below it the pane covers the field (hidden);
 * from it up the pane has left the box (back). `extent` is the field's size along the
 * anchor axis and `gap` the standoff between the two boxes; boxes that touch or
 * overlap cover the field for the whole travel (1).
 */
export function fieldCoverMark(extent: number, gap: number): number {
  if (!(extent > 0) || !(gap > 0)) return 1;
  return Math.min(1, extent / (extent + gap) + HANDOFF.field.margin);
}

/**
 * A card's resting corner radius when it is one uniform value, the only shape the
 * droplet can ease into. A card with per-corner radii keeps its skin's corners
 * throughout (its layers never switch to a uniform radius).
 */
export function restingRadius(style: StyleProp<ViewStyle>): number | undefined {
  const flat = StyleSheet.flatten(style) ?? {};
  const corners = [
    flat.borderTopLeftRadius, flat.borderTopRightRadius, flat.borderBottomLeftRadius, flat.borderBottomRightRadius,
    flat.borderTopStartRadius, flat.borderTopEndRadius, flat.borderBottomStartRadius, flat.borderBottomEndRadius,
  ];
  if (corners.some((corner) => corner != null)) return undefined;
  return typeof flat.borderRadius === "number" ? flat.borderRadius : undefined;
}

/** Logical opening and retained paint are independent. No animation owns open state. */
export function usePopupPresence(open: boolean, enabled: boolean) {
  const [retained, setRetained] = useState(open);
  const [previousOpen, setPreviousOpen] = useState(open);
  const [opening, setOpening] = useState(0);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) { setRetained(true); setOpening(value => value + 1); }
  }
  const currentOpen = useRef(open);
  currentOpen.current = open;
  const finish = useRef(() => { if (!currentOpen.current) setRetained(false); }).current;
  return { present: open || (enabled && retained), opening, finish };
}

// The animated values are native from birth where the platform has the driver (the
// same public configuration entrance.tsx uses), so the FIRST paint of an opening, the
// seed flush, already runs in the native animated module: a value made native only by
// its first spring would flush the seed through the JS driver, and on Fabric that is a
// shadow-tree commit per animated view (src/style/motion.ts).
const DRIVER = { useNativeDriver: supportsNativeDriver } as const;

// The progress from which the pane counts as settled on its resting box: the foreground
// becomes interactive here (before the opening's overshoot has died down), and a close
// that starts from here is a close from rest.
const SETTLED = 0.995;

// The radius table's grid. The table is sampled on this grid PLUS the marks the
// presentation turns at (progress 0, the seed, 1), so the corner is exact where the
// curve has a corner of its own and within a fraction of a pixel between.
const RADIUS_STEPS = 20;

/**
 * The uniform corner radius the material wears in its UNSCALED box at each progress.
 * The box is scaled, never re-laid out, so a corner drawn at radius R shows as an
 * ellipse of R times the scale on each axis; this table divides the displayed radius
 * the presentation asks for (`displayed`, the pill's corner, the droplet's, the grown
 * pane's) by the scale on the axis the corner is exact on (`scale`, the seed shape's
 * shorter side), so that side shows the asked radius exactly (a capsule at the seed,
 * the skin's own corner at rest) and the other side follows the ratio of the two
 * scales. The corner the SETTLE relaxes to is a second table under the settle value
 * (`relax`, 0 while the pane grows and 1 once it has relaxed): the displayed corner
 * is `displayed(p) + relax * (resting - displayed(1)) * weight(p)`, where `weight`
 * is 0 at the seed and 1 at rest, so an open holds the grown corner until its settle
 * relaxes it and a close (relax at 1) relaxes back to the capsule as the pane
 * shrinks. `floor` keeps a non-hand-off pane, whose along scale reaches 0, a capsule
 * below the seed instead of dividing by nothing. Sampled once per graph; both tables
 * run in the native animated module like every other node of the frame.
 */
function radiusTable(progress: Animated.Value, relax: Animated.Value, resting: number, displayed: (progress: number) => number, scale: (progress: number) => number, floor: number): Animated.AnimatedNode {
  const marks = new Set<number>([0, 1, SEED, floor]);
  for (let step = 0; step <= RADIUS_STEPS; step++) marks.add(step / RADIUS_STEPS);
  const inputRange = [...marks].filter((mark) => mark >= 0 && mark <= 1).sort((a, b) => a - b);
  const grown = displayed(1);
  const weight = (at: number) => Math.max(0, Math.min(1, (at - SEED) / (1 - SEED)));
  const held = progress.interpolate({ inputRange, outputRange: inputRange.map((mark) => { const at = Math.max(mark, floor); return displayed(at) / scale(at); }), extrapolate: "clamp" });
  const relaxed = progress.interpolate({ inputRange, outputRange: inputRange.map((mark) => { const at = Math.max(mark, floor); return weight(at) * (resting - grown) / scale(at); }), extrapolate: "clamp" });
  return Animated.add(held, Animated.multiply(relax, relaxed));
}

/**
 * The material grows from its fitted anchor, then deforms independently of travel.
 * The panel's semantic/layout host never inherits a transform. Its foreground
 * follows the pane only while the pane opens (scale and opacity, identity at rest)
 * and stays inert, hidden from assistive tech, until the pane has settled.
 *
 * The frame is a TRANSFORM of the material's resting box (a scale on each axis and
 * the translation that keeps the anchor edge, or the trigger's centre, where it is)
 * plus the uniform corner radius the clip and the layers wear (`radiusTable`), never
 * a width, height or offset: those are layout, which only the JS driver can animate,
 * and on Fabric a JS-driven frame is a shadow-tree commit per animated view. With
 * transforms, opacity and a radius the whole graph (the springs, the interpolations,
 * the products) runs in the native animated module on iOS and Android and the JS
 * thread is idle between frames; the web runs the same graph on its JS driver. At
 * rest every term is exactly the identity: scale 1, translation 0, the skin's radius.
 */
export function usePopupMotion({
  open, enabled, ready, size, edge = "top", anchorX, anchorY, radius, origin, progress: shared, onExited,
}: {
  open: boolean;
  enabled: boolean;
  ready: boolean;
  size: PopupSize;
  edge?: PopupEdge;
  anchorX?: number;
  anchorY?: number;
  /** The card's resting corner radius when uniform (see `restingRadius`); the droplet eases into it. */
  radius?: number;
  /**
   * The trigger's frame and corner in card coordinates: with it the material is the
   * trigger's pill at progress 0 instead of a sliver on the anchor edge (the hand-off).
   */
  origin?: PopupOrigin;
  /**
   * The travel value an owner shares with its trigger (see `usePopupHandoff`), so the
   * trigger's material and label read the same node the pane paints from. The hook
   * owns a value of its own otherwise. A shared value must be native where the
   * platform has the driver (`usePopupHandoff` constructs it so).
   */
  progress?: Animated.Value;
  onExited: () => void;
}) {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced;
  const own = useRef<Animated.Value | null>(null);
  if (!shared && !own.current) own.current = new Animated.Value(0, DRIVER);
  const progress = shared ?? own.current!;
  const contourValue = useRef<Animated.Value | null>(null);
  if (!contourValue.current) contourValue.current = new Animated.Value(0, DRIVER);
  const contour = contourValue.current;
  // The rows' focus, on the JS driver: a `filter` is on no native allowlist, and a
  // JS-driven value may not share a node with the native-driven ones, so the blur
  // (0 sharp, 1 the birth's blur) and the ghosts' fade paint on a wrapper of their
  // own (see `focus`), on timings of their own: the sharpening from the birth and the
  // ghosting on a dismiss. Both are the identity at rest.
  const blurValue = useRef<Animated.Value | null>(null);
  if (!blurValue.current) blurValue.current = new Animated.Value(0);
  const blur = blurValue.current;
  const ghostValue = useRef<Animated.Value | null>(null);
  if (!ghostValue.current) ghostValue.current = new Animated.Value(1);
  const ghost = ghostValue.current;
  // The material's presence (its under-fill opacity): faint at an opening's birth
  // and full `birth.ms` later; native from construction like the travel.
  const presenceValue = useRef<Animated.Value | null>(null);
  if (!presenceValue.current) presenceValue.current = new Animated.Value(1, DRIVER);
  const presence = presenceValue.current;
  // The corner's settle: 0 while the pane grows, wearing the grown corner, 1 once
  // the settle has relaxed it to the skin's (see `radius.settle`); native like the travel.
  const relaxValue = useRef<Animated.Value | null>(null);
  if (!relaxValue.current) relaxValue.current = new Animated.Value(1, DRIVER);
  const relax = relaxValue.current;
  // A dismiss's contraction about the pane's centre (see `handoff.close.contract`):
  // 1 at rest and through every opening; native like the travel.
  const shrinkValue = useRef<Animated.Value | null>(null);
  if (!shrinkValue.current) shrinkValue.current = new Animated.Value(1, DRIVER);
  const shrink = shrinkValue.current;
  const [readable, setReadable] = useState(!animate);
  // Whether the rows' focus wrapper is painting (the birth's sharpening or a
  // dismiss's ghosting runs): its style is the identity, and absent, otherwise.
  const [focusing, setFocusing] = useState(false);
  // Whether a dismiss's ghosts are still fading: the rows stay in the tree until they have.
  const [retiring, setRetiring] = useState(false);
  const lifecycle = useRef(0);
  const previousPolicy = useRef({ animate, open });
  const previous = useRef({ width: size.width, height: size.height, open });
  const exited = useRef(onExited);
  exited.current = onExited;
  // Where the travel value is, from its own listener: a natively driven value cannot
  // report its position synchronously (`stopAnimation`'s callback is a round trip to
  // the native module), and the seed decision below is made inside a layout effect.
  // A fresh hook starts at 0 whatever the shared value holds: a card only mounts once
  // the previous exit has snapped the value home.
  const latest = useRef(0);
  const animating = useRef(animate);
  animating.current = animate;
  const leaving = useRef(0);
  const holding = useRef(0);
  const { width, height } = size;
  const measured = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

  useIsomorphicLayoutEffect(() => {
    const subscription = progress.addListener(({ value }) => {
      latest.current = value;
      // The foreground becomes interactive once the material first covers its resting
      // content area, which with the opening's overshoot is before the settle.
      if (value >= SETTLED && animating.current) setReadable(true);
    });
    return () => progress.removeListener(subscription);
  }, [progress]);

  useIsomorphicLayoutEffect(() => {
    const generation = ++lifecycle.current;
    const restoredAtRest = animate && !previousPolicy.current.animate && previousPolicy.current.open === open;
    previousPolicy.current = { animate, open };
    progress.stopAnimation();
    contour.stopAnimation();
    cancelAnimationFrame(leaving.current);
    cancelAnimationFrame(holding.current);
    const current = latest.current;
    presence.stopAnimation();
    relax.stopAnimation();
    shrink.stopAnimation();
    blur.stopAnimation();
    ghost.stopAnimation();
    if (!animate || restoredAtRest) {
      progress.setValue(open ? 1 : 0);
      contour.setValue(0);
      presence.setValue(1);
      relax.setValue(1);
      shrink.setValue(1);
      blur.setValue(0);
      ghost.setValue(1);
      setFocusing(false);
      setRetiring(false);
      setReadable(open && ready);
      if (!open) exited.current();
      return;
    }
    if (!ready || !measured) {
      if (!open) exited.current();
      return;
    }
    if (!open) setReadable(false);
    // The rows' focus and the material's tone, each on its own timing. An opening
    // from the closed state starts at the droplet, not at nothing: the pane appears
    // already a few rows tall with the rows inside it, the way the native menu
    // blooms out of its button, born faint with its rows blurred and sharpening on
    // their own clock, its corner grown round and relaxing once it is full. A reopen
    // mid-exit grows from wherever the pane is, its tone and its rows coming back
    // from wherever the dismiss left them, its corner as relaxed as it was. A dismiss
    // ghosts the rows (blurred and fading) and keeps the pane's tone whole.
    const tone: Animated.CompositeAnimation[] = [];
    const focus: Animated.CompositeAnimation[] = [];
    const afterFocus = ({ finished }: { finished: boolean }) => {
      if (!finished || generation !== lifecycle.current) return;
      setFocusing(false);
      setRetiring(false);
    };
    if (open) {
      const born = current <= 0;
      if (born) {
        blur.setValue(1);
        ghost.setValue(1);
        presence.setValue(BIRTH.fill);
        relax.setValue(0);
        progress.setValue(SEED);
        // The settle: the grown corner held for `holdMs`, then relaxed over `ms`.
        const hold = RADIUS.settle.holdMs / (RADIUS.settle.holdMs + RADIUS.settle.ms);
        tone.push(Animated.timing(relax, {
          toValue: 1, duration: RADIUS.settle.holdMs + RADIUS.settle.ms,
          easing: (t) => t <= hold ? 0 : Easing.out(Easing.quad)((t - hold) / (1 - hold)),
          ...DRIVER, isInteraction: false,
        }));
      }
      // The drop's fills come up to whole over the birth; a reopen mid-exit brings
      // the sheer pane back to its tone over the ghosts' span.
      tone.push(Animated.timing(presence, { toValue: 1, duration: born ? BIRTH.fillMs : DISMISS.ghost.fadeMs, easing: Easing.out(Easing.quad), ...DRIVER, isInteraction: false }));
      setFocusing(true);
      setRetiring(false);
      // Sharp `sharpMs` after the birth, soft through the first half of the growth
      // and sharpening through the second (an ease in and out on the way to 0: the
      // reference's rows are still soft at +133 and nearly sharp at +167); a reopen
      // mid-ghost comes back over the ghosts' own span.
      focus.push(Animated.timing(blur, { toValue: 0, duration: born ? BIRTH.sharpMs : DISMISS.ghost.fadeMs, easing: born ? Easing.inOut(Easing.quad) : Easing.out(Easing.quad), ...JS_DRIVER, isInteraction: false }));
      focus.push(Animated.timing(ghost, { toValue: 1, duration: DISMISS.ghost.fadeMs, easing: Easing.out(Easing.quad), ...JS_DRIVER, isInteraction: false }));
    } else {
      tone.push(Animated.timing(presence, { toValue: DISMISS.sheer, duration: DISMISS.sheerMs, easing: Easing.out(Easing.quad), ...DRIVER, isInteraction: false }));
      setFocusing(true);
      setRetiring(true);
      // The rows are ghosts on this frame's flush; only the ghosts' fade is a timing.
      blur.setValue(1);
      ghost.setValue(DISMISS.ghost.keep);
      focus.push(Animated.timing(ghost, { toValue: 0, duration: DISMISS.ghost.fadeMs, easing: Easing.out(Easing.quad), ...JS_DRIVER, isInteraction: false }));
    }
    const focusing = Animated.parallel(focus, { stopTogether: true });
    const { contract, contractMs, releaseMs, hold: closeHold, ...closeSpring } = HANDOFF.close;
    const travel = Animated.spring(progress, {
      toValue: open ? 1 : 0,
      ...(open ? TRAVEL.open : origin ? closeSpring : TRAVEL.close), mass: 1,
      // The opening overshoots on purpose (the native menu's bounce); a close never
      // undershoots. A hand-off close rests as soon as the drop has merged with the
      // trigger (`handoff.merged`): the spring's last pixels would otherwise keep the
      // re-formed pill empty while they crawl in.
      overshootClamping: !open, restDisplacementThreshold: !open && origin ? HANDOFF.merged : 0.001,
      // The merge is a displacement mark, not a speed: the stiff close crosses it at
      // about one travel per second, and a speed threshold under that kept the drop
      // crawling on the pill for two more frames after it had landed.
      restSpeedThreshold: !open && origin ? 5 : 0.01, ...DRIVER, isInteraction: false,
    });
    let contraction: Animated.CompositeAnimation | null = null;
    let release: Animated.CompositeAnimation | null = null;
    const shape = Animated.spring(contour, {
      toValue: 0, velocity: open ? CONTOUR.openVelocity : CONTOUR.closeVelocity,
      stiffness: CONTOUR.stiffness, damping: CONTOUR.damping, mass: 1,
      restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
      ...DRIVER, isInteraction: false,
    });
    // Travel owns presence; contour is independent decoration. A live result
    // resize may replace its spring without canceling the logical opening or
    // having travel completion stop a newer contour midway through recoil.
    const onTravelEnd = ({ finished }: { finished: boolean }) => {
      if (!finished || generation !== lifecycle.current) return;
      progress.setValue(open ? 1 : 0);
      // The contraction's release has all but finished by the snap; the hand-back
      // is the trigger's box exactly, so it ends here whatever its last pixel was.
      release?.stop();
      shrink.setValue(1);
      if (open) { setReadable(true); return; }
      // A closed pane leaves on the NEXT animation frame, not in the task that snapped
      // it home. Under a hand-off the snap is also the frame the trigger's own material
      // comes back (its opacity steps to 1 at exactly 0), and on iOS 26 the native
      // glass takes a frame to paint after that; a pane removed in the same task
      // uncovered a pill with no material yet, one empty frame in the recordings. With
      // the hold the pane stands on the pill's box, wearing the trigger's fill, while
      // the pill's glass comes up beneath it, and leaves once it has.
      leaving.current = requestAnimationFrame(() => {
        if (generation === lifecycle.current) exited.current();
      });
    };
    // A hand-off close from rest contracts the emptied pane about its centre in its
    // first frames and holds it there for a beat before it shrinks (the reference's
    // pane is a little smaller the frame its rows go, its edges all drawn in, and
    // holds so through +67): the contraction is a short timing of its own factor,
    // released back to 1 as the spring runs; the hold is counted on frames from the
    // contraction's end rather than on a timer so the spring's start lands on a paint.
    if (!open && origin && current >= SETTLED && (closeHold > 0 || contractMs > 0)) {
      const wait = (since: number) => () => {
        if (generation !== lifecycle.current) return;
        if (Date.now() - since >= closeHold) {
          travel.start(onTravelEnd);
          release = Animated.timing(shrink, { toValue: 1, duration: releaseMs, easing: Easing.out(Easing.quad), ...DRIVER, isInteraction: false });
          release.start();
        } else holding.current = requestAnimationFrame(wait(since));
      };
      contraction = Animated.timing(shrink, { toValue: contract, duration: contractMs, easing: Easing.out(Easing.quad), ...DRIVER, isInteraction: false });
      contraction.start(({ finished }) => {
        if (!finished || generation !== lifecycle.current) return;
        holding.current = requestAnimationFrame(wait(Date.now()));
      });
    } else {
      shrink.setValue(1);
      travel.start(onTravelEnd);
    }
    shape.start();
    for (const animation of tone) animation.start();
    focusing.start(afterFocus);
    return () => {
      lifecycle.current++;
      travel.stop(); shape.stop(); focusing.stop(); contraction?.stop(); release?.stop();
      for (const animation of tone) animation.stop();
      cancelAnimationFrame(leaving.current); cancelAnimationFrame(holding.current);
    };
    // The origin only picks the close's spring; a hand-off never changes it mid-flight.
  }, [animate, open, ready, measured, progress, contour, blur, ghost, presence, relax, shrink]);

  useEffect(() => {
    const old = previous.current;
    previous.current = { width, height, open };
    if (!animate || !open || !ready || !measured || !old.open || old.width <= 0 || old.height <= 0) return;
    const change = Math.hypot(width - old.width, height - old.height) / Math.max(width, height, 1);
    if (change < 0.005) return;
    // Filter results update layout and scroll immediately; only the contour has
    // inertia. This avoids uncovering a newly visible row with a lagging pane.
    const animation = Animated.spring(contour, {
      toValue: 0, velocity: Math.min(change, 0.5) * CONTOUR.resizeVelocity,
      stiffness: CONTOUR.stiffness, damping: 18, mass: 1,
      restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
      ...DRIVER, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, open, ready, measured, width, height, contour]);

  const horizontal = edge === "left" || edge === "right";
  const xFraction = Math.max(0, Math.min(1, (anchorX ?? width / 2) / Math.max(width, 1)));
  const yFraction = Math.max(0, Math.min(1, (anchorY ?? height / 2) / Math.max(height, 1)));
  const { frame, content, blend } = useMemo(() => {
    // The contour stretches the pane along the anchor axis and squashes it across.
    const stretch = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.stretch.recoil, 1, CONTOUR.stretch.peak], extrapolate: "clamp" });
    const squash = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.squash.recoil, 1, CONTOUR.squash.peak], extrapolate: "clamp" });
    // The rows ride the opening's overshoot with the pane (the reference's rows sit
    // a few percent wider than at rest while its pane is past rest).
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const remaining = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: "clamp" });
    // The resting extents along the anchor axis and across it, and where the anchor
    // sits on each (the pane hangs from its start edge, or its end edge for a bottom
    // or right anchor; across the axis it sits where the trigger is).
    const along = horizontal ? width : height;
    const acrossExtent = horizontal ? height : width;
    const alongAnchor = (horizontal ? edge === "right" : edge === "bottom") ? 1 : 0;
    const acrossAnchor = horizontal ? yFraction : xFraction;
    const shaped = radius != null && Number.isFinite(radius);
    interface Graph {
      scaleAlong: Animated.AnimatedNode; scaleAcross: Animated.AnimatedNode;
      shiftAlong: Animated.AnimatedNode; shiftAcross: Animated.AnimatedNode;
      corner?: Animated.AnimatedNode; translateX: Animated.AnimatedNode; translateY: Animated.AnimatedNode;
    }
    // The material travels between two boxes: the trigger's (progress 0) and the
    // card's (progress 1), each extent on its own curve (the across one held at the
    // trigger's until `widen`, the along one carrying the overshoot), the centre
    // following the extent so the drop stays under the pill while its width is held.
    // Each scale is 1 less the remaining share of the way from the trigger's extent,
    // and each shift the remaining share of the way from the trigger's centre, so at
    // rest both are the identity exactly.
    const fromOrigin = (box: PopupOrigin): Graph => {
      const originAlong = horizontal ? box.width : box.height;
      const originAcross = horizontal ? box.height : box.width;
      const originAcrossCentre = horizontal ? box.y + box.height / 2 : box.x + box.width / 2;
      // The drop the pane is at the seed. Across the axis: the trigger's extent for
      // a narrow pill, a compact drop centred on the trigger for a wide one (see
      // `handoff.droplet`). Along it: the birth's share of the card, never shorter
      // than the trigger (see `birth.along`); the trigger's box at 0 and the card at 1.
      const dropletAcross = Math.min(originAcross, HANDOFF.droplet * acrossExtent);
      const dropletAlong = Math.max(originAlong, BIRTH.along * along);
      const alongShare = (at: number) => at <= SEED
        ? (originAlong + (dropletAlong - originAlong) * (at / SEED)) / along
        : (dropletAlong + (along - dropletAlong) * ((at - SEED) / (1 - SEED))) / along;
      const alongScale = progress.interpolate({
        inputRange: [0, SEED, 1], outputRange: [originAlong / along, dropletAlong / along, 1],
        extrapolateLeft: "clamp", extrapolateRight: "extend",
      });
      // The pane's ANCHOR-SIDE edge (the top of a card that opens below its
      // trigger) is the trigger's near edge at 0 (the pane IS the pill), the
      // trigger's FAR edge at `handoff.slide` (the drop hangs from the pill's bottom,
      // its tip on that edge and the pill's spot empty, as the reference's does one
      // frame after the tap and while its blob hangs under the re-formed pill) and
      // the card's edge at 1; so a close narrows to the drop under the pill, holds
      // it there while the pill re-forms above, and then slides it up onto the pill's
      // box, the way the reference's blob is absorbed upward into its pill. In card coordinates the
      // edges are offsets from the card's own anchor-side edge. A box scaled about
      // its centre by s has that edge moved inward by half of (1 - s) of its extent,
      // so the shift is the edge's travel less that.
      const originNear = horizontal ? (alongAnchor ? box.x + box.width - along : box.x) : (alongAnchor ? box.y + box.height - along : box.y);
      const originFar = alongAnchor ? originNear - originAlong : originNear + originAlong;
      // A field's drop is born over the field's box instead and slides off it (the
      // field returns the moment the pane has cleared the box, `fieldCoverMark`).
      const edge = box.hangs
        ? progress.interpolate({ inputRange: [0, HANDOFF.slide, 1], outputRange: [originNear, originFar, 0], extrapolateLeft: "clamp", extrapolateRight: "extend" })
        : progress.interpolate({ inputRange: [0, 1], outputRange: [originNear, 0], extrapolateLeft: "clamp", extrapolateRight: "extend" });
      const shiftAlong = Animated.add(
        edge,
        Animated.multiply(Animated.subtract(1, alongScale), (alongAnchor ? 1 : -1) * (along / 2)),
      );
      // Across the axis the pane is the trigger's box at 0, the drop from the seed
      // to `widen`, and the card at 1. The box and the drop share the trigger's
      // centre, so the shift only has to carry the pane from that centre to the
      // card's as it widens.
      const acrossShare = progress.interpolate({
        inputRange: [0, SEED, HANDOFF.widen, 1],
        outputRange: [originAcross / acrossExtent, dropletAcross / acrossExtent, dropletAcross / acrossExtent, 1],
        extrapolate: "clamp",
      });
      const remainingAcross = progress.interpolate({ inputRange: [0, HANDOFF.widen, 1], outputRange: [1, 1, 0], extrapolate: "clamp" });
      const graph: Graph = {
        scaleAlong: Animated.multiply(Animated.multiply(alongScale, stretch), shrink),
        scaleAcross: Animated.multiply(Animated.multiply(acrossShare, squash), shrink),
        shiftAlong,
        shiftAcross: Animated.multiply(remainingAcross, originAcrossCentre - acrossExtent / 2),
        // The rows scale from the pane's centre, which follows its anchor-side edge.
        translateX: horizontal ? shiftAlong : Animated.multiply(remaining, box.x + box.width / 2 - width / 2),
        translateY: horizontal ? Animated.multiply(remaining, box.y + box.height / 2 - height / 2) : shiftAlong,
      };
      if (shaped) {
        // The corner is the trigger's at the pill, the droplet's at the seed (as round
        // as the seed shape's shorter side allows), the grown pane's at 1, and the
        // skin's once the settle has relaxed it.
        const seedAlong = dropletAlong;
        const seedAcross = dropletAcross;
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedAlong, seedAcross));
        const grown = Math.max(radius, RADIUS.grown * Math.min(along, acrossExtent));
        const displayed = keyframes([[0, box.radius], [SEED, droplet], [1, grown]]);
        const acrossScale = (at: number) => at <= SEED
          ? (originAcross + (dropletAcross - originAcross) * (at / SEED)) / acrossExtent
          : dropletAcross / acrossExtent + handoffAcross(at) * (1 - dropletAcross / acrossExtent);
        graph.corner = radiusTable(progress, relax, radius, displayed, seedAlong <= seedAcross ? alongShare : acrossScale, 0);
      }
      return graph;
    };
    // The pane's extent along the anchor axis is progress itself (the opening's
    // overshoot passes through); across it the pane starts at the droplet's width
    // and never overshoots (the along axis carries the bounce, as the native
    // menu's does). The shift keeps the anchor edge where it is: a box scaled about
    // its centre by s moves its edges by half of (1 - s) of its extent.
    const fromAnchor = (): Graph => {
      const travelAlong = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
      const travelAcross = progress.interpolate({ inputRange: [0, 1], outputRange: [ACROSS, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
      const scaleAlong = Animated.multiply(travelAlong, stretch);
      const scaleAcross = Animated.multiply(travelAcross, squash);
      // The rows scale with the pane's extent along the anchor axis, sit centred
      // across it, and cross-fade in. Every term is linear in the remaining travel,
      // so at rest the foreground is exactly the identity.
      const alongShift = (along / 2) * (alongAnchor ? 1 : -1);
      const acrossShift = acrossExtent * (1 - ACROSS) * (acrossAnchor - 0.5);
      const graph: Graph = {
        scaleAlong,
        scaleAcross,
        shiftAlong: Animated.multiply(Animated.subtract(1, scaleAlong), along * (alongAnchor - 0.5)),
        shiftAcross: Animated.multiply(Animated.subtract(1, scaleAcross), acrossExtent * (acrossAnchor - 0.5)),
        translateX: Animated.multiply(remaining, horizontal ? alongShift : acrossShift),
        translateY: Animated.multiply(remaining, horizontal ? acrossShift : alongShift),
      };
      if (shaped) {
        // The droplet is as round as its shorter side allows, the grown pane rounder
        // than the skin's corner until its settle relaxes it. Below the seed (a
        // close) the pane keeps the capsule as it shrinks.
        const seedAlong = along * SEED;
        const seedAcross = acrossExtent * (ACROSS + (1 - ACROSS) * SEED);
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedAlong, seedAcross));
        const grown = Math.max(radius, RADIUS.grown * Math.min(along, acrossExtent));
        const displayed = keyframes([[SEED, droplet], [1, grown]]);
        const alongScale = (at: number) => at;
        const acrossScale = (at: number) => ACROSS + (1 - ACROSS) * at;
        graph.corner = radiusTable(progress, relax, radius, displayed, seedAlong <= seedAcross ? alongScale : acrossScale, SEED);
      }
      return graph;
    };
    const { scaleAlong, scaleAcross, shiftAlong, shiftAcross, corner, translateX, translateY } = origin ? fromOrigin(origin) : fromAnchor();
    const frame: Animated.WithAnimatedValue<ViewStyle> = {
      transform: [
        { translateX: horizontal ? shiftAlong : shiftAcross },
        { translateY: horizontal ? shiftAcross : shiftAlong },
        { scaleX: horizontal ? scaleAlong : scaleAcross },
        { scaleY: horizontal ? scaleAcross : scaleAlong },
      ],
    };
    if (corner) frame.borderRadius = corner;
    const content: Animated.WithAnimatedValue<ViewStyle> = {
      opacity: progress.interpolate({ inputRange: [CONTENT.fadeFrom, CONTENT.fadeTo], outputRange: [0, 1], extrapolate: "clamp" }),
      transform: [{ translateX }, { translateY }, { scale }],
    };
    // Under a hand-off the material's under-fill is the trigger's at the pill and the
    // pane's own from `tint` on (see MaterialOriginContext).
    const blend: PopupBlend | null = origin ? {
      trigger: progress.interpolate({ inputRange: [0, SEED, HANDOFF.tint], outputRange: [1, 1, 0], extrapolate: "clamp" }),
      own: progress.interpolate({ inputRange: [0, SEED, HANDOFF.tint], outputRange: [0, 0, 1], extrapolate: "clamp" }),
    } : null;
    return { frame, content, blend };
  }, [progress, relax, shrink, contour, width, height, horizontal, edge, xFraction, yFraction, radius, origin]);
  // The rows' focus wrapper's style: the blur as the filter string every platform's
  // `filter` accepts (react-native-web knows no filter object list), and the ghosts' fade.
  const focus = useMemo<PopupFocus>(() => ({
    filter: blur.interpolate({ inputRange: [0, 1], outputRange: ["blur(0px)", `blur(${BIRTH.blur}px)`] }),
    opacity: ghost,
  }), [blur, ghost]);
  const moving = animate && measured;
  return {
    frame: moving ? frame : null, content: moving ? content : null, presence: moving ? presence : null,
    focus: moving && focusing ? focus : null, blend: moving ? blend : null,
    readable: open && ready && (!animate || readable), retiring: moving && retiring, animate,
  };
}
