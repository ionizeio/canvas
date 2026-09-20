import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { keyframes, supportsNativeDriver, useReducedMotion } from "./motion.js";
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
export interface MaterialMotion { frame: Animated.WithAnimatedValue<ViewStyle>; rest: PopupSize }
/** Only the owning surface consumes this motion; nested surfaces stay independent. */
export const MaterialMotionContext = createContext<MaterialMotion | null>(null);
/**
 * The trigger's frame in the card's own coordinates and the corner its material wears:
 * the shape the pane's material is at progress 0 when a popup hands off with its
 * trigger (see popup-handoff.tsx). Above a card that opens below its trigger, `y` is
 * negative.
 */
export interface PopupOrigin { x: number; y: number; width: number; height: number; radius: number }
/** The opacities of the two under-fills a hand-off pane paints: the trigger's layer's and its own. */
export interface PopupBlend { trigger: Animated.AnimatedInterpolation<number>; own: Animated.AnimatedInterpolation<number> }

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
    open: { stiffness: 650, damping: 38 },
    close: { stiffness: 720, damping: 42 },
  },
  /** Where an opening from the closed state seats progress before its spring runs: the droplet. */
  seed: 0.35,
  /**
   * The pane's extent ACROSS the anchor axis at progress 0, as a fraction of its
   * resting extent (along the axis the extent is progress itself).
   */
  across: 0.3,
  /**
   * The droplet's corner radius as a fraction of its shorter side (never under the
   * skin's own), and the progress by which the skin's radius is back. The corner is
   * exact on the seed shape's shorter side (a capsule there at and below the seed)
   * and follows the scale's ratio on the other, see `radiusTable`.
   */
  radius: { droplet: 0.5, settled: 0.85 },
  /** The rows, scaled with the pane, cross-fade in between these progress marks. */
  content: { fadeFrom: 0.15, fadeTo: 0.7 },
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
     * The pane keeps the trigger's extent ACROSS the anchor axis until this progress
     * and widens to the card's from there, so the droplet is pill-wide and a closing
     * pane is the pill's width before its height is gone.
     */
    widen: 0.45,
    /**
     * The trigger's label: out over `hideMs` from the frame the pane exists (the
     * droplet takes its place; a beat rather than a cut, because the native glass
     * can trail the label's commit by a frame and a bare pill for that frame reads
     * as a flash), and back over `returnMs` once the pane has re-formed the pill and
     * left. The pane sits above the trigger (the overlay outlet), so a label fading
     * in under the pane's glass would read dimmed and blurred through it; the native
     * menu's icons fade over the last hundred milliseconds of its merge, and this is
     * the same fade a beat later, on the trigger's own material.
     */
    label: { hideMs: 50, returnMs: 140 },
    /**
     * The material's under-fill is the TRIGGER's layer (the bright control puck) at
     * progress 0 and the pane's own (the dense menu tint) from this progress on,
     * cross-fading between: the pill that vanishes and the pill that re-forms are
     * the trigger's material, not a menu-tinted copy of it.
     */
    tint: 0.55,
    /** The close back onto the trigger: slower than a plain close, so the pill re-forms readably. */
    close: { stiffness: 520, damping: 40 },
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

const { travel: TRAVEL, seed: SEED, across: ACROSS, radius: RADIUS, content: CONTENT, contour: CONTOUR, handoff: HANDOFF } = POPUP_PRESENTATION;

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
// presentation turns at (progress 0, the seed, the settled mark, 1), so the corner is
// exact where the curve has a corner of its own and within a fraction of a pixel between.
const RADIUS_STEPS = 20;

/**
 * The uniform corner radius the material wears in its UNSCALED box at each progress.
 * The box is scaled, never re-laid out, so a corner drawn at radius R shows as an
 * ellipse of R times the scale on each axis; this table divides the displayed radius
 * the presentation asks for (`displayed`, the pill's corner, the droplet's, the
 * skin's) by the scale on the axis the corner is exact on (`scale`, the seed shape's
 * shorter side), so that side shows the asked radius exactly (a capsule at the seed,
 * the skin's own corner at rest) and the other side follows the ratio of the two
 * scales. `floor` keeps a non-hand-off pane, whose along scale reaches 0, a capsule
 * below the seed instead of dividing by nothing. Sampled once per graph; the table
 * runs in the native animated module like every other node of the frame.
 */
function radiusTable(progress: Animated.Value, displayed: (progress: number) => number, scale: (progress: number) => number, floor: number): Animated.AnimatedInterpolation<number> {
  const marks = new Set<number>([0, 1, SEED, RADIUS.settled, floor]);
  for (let step = 0; step <= RADIUS_STEPS; step++) marks.add(step / RADIUS_STEPS);
  const inputRange = [...marks].filter((mark) => mark >= 0 && mark <= 1).sort((a, b) => a - b);
  const outputRange = inputRange.map((mark) => {
    const at = Math.max(mark, floor);
    return displayed(at) / scale(at);
  });
  return progress.interpolate({ inputRange, outputRange, extrapolate: "clamp" });
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
  const [readable, setReadable] = useState(!animate);
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
    const current = latest.current;
    if (!animate || restoredAtRest) {
      progress.setValue(open ? 1 : 0);
      contour.setValue(0);
      setReadable(open && ready);
      if (!open) exited.current();
      return;
    }
    if (!ready || !measured) {
      if (!open) exited.current();
      return;
    }
    if (!open) setReadable(false);
    // An opening from the closed state starts at the droplet, not at nothing: the
    // pane appears already a few rows tall with the rows inside it, the way the
    // native menu blooms out of its button. A reopen mid-exit grows from wherever
    // the pane is.
    if (open && current <= 0) progress.setValue(SEED);
    const travel = Animated.spring(progress, {
      toValue: open ? 1 : 0,
      ...(open ? TRAVEL.open : origin ? HANDOFF.close : TRAVEL.close), mass: 1,
      // The opening overshoots on purpose (the native menu's bounce); a close never undershoots.
      overshootClamping: !open, restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.01, ...DRIVER, isInteraction: false,
    });
    const shape = Animated.spring(contour, {
      toValue: 0, velocity: open ? CONTOUR.openVelocity : CONTOUR.closeVelocity,
      stiffness: CONTOUR.stiffness, damping: CONTOUR.damping, mass: 1,
      restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
      ...DRIVER, isInteraction: false,
    });
    // Travel owns presence; contour is independent decoration. A live result
    // resize may replace its spring without canceling the logical opening or
    // having travel completion stop a newer contour midway through recoil.
    travel.start(({ finished }) => {
      if (!finished || generation !== lifecycle.current) return;
      progress.setValue(open ? 1 : 0);
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
    });
    shape.start();
    return () => { lifecycle.current++; travel.stop(); shape.stop(); cancelAnimationFrame(leaving.current); };
    // The origin only picks the close's spring; a hand-off never changes it mid-flight.
  }, [animate, open, ready, measured, progress, contour]);

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
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });
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
      const originAlongCentre = horizontal ? box.x + box.width / 2 : box.y + box.height / 2;
      const originAcrossCentre = horizontal ? box.y + box.height / 2 : box.x + box.width / 2;
      const remainingAlong = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolateLeft: "clamp", extrapolateRight: "extend" });
      const remainingAcross = progress.interpolate({ inputRange: [0, HANDOFF.widen, 1], outputRange: [1, 1, 0], extrapolate: "clamp" });
      const graph: Graph = {
        scaleAlong: Animated.multiply(Animated.subtract(1, Animated.multiply(remainingAlong, 1 - originAlong / along)), stretch),
        scaleAcross: Animated.multiply(Animated.subtract(1, Animated.multiply(remainingAcross, 1 - originAcross / acrossExtent)), squash),
        shiftAlong: Animated.multiply(remainingAlong, originAlongCentre - along / 2),
        shiftAcross: Animated.multiply(remainingAcross, originAcrossCentre - acrossExtent / 2),
        // The rows scale from the trigger's centre.
        translateX: Animated.multiply(remaining, box.x + box.width / 2 - width / 2),
        translateY: Animated.multiply(remaining, box.y + box.height / 2 - height / 2),
      };
      if (shaped) {
        // The corner is the trigger's at the pill, the droplet's at the seed (as round
        // as the seed shape's shorter side allows), and the skin's once settled.
        const seedAlong = originAlong + (along - originAlong) * SEED;
        const seedAcross = originAcross + (acrossExtent - originAcross) * handoffAcross(SEED);
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedAlong, seedAcross));
        const displayed = keyframes([[0, box.radius], [SEED, droplet], [RADIUS.settled, radius]]);
        const alongScale = (at: number) => originAlong / along + at * (1 - originAlong / along);
        const acrossScale = (at: number) => originAcross / acrossExtent + handoffAcross(at) * (1 - originAcross / acrossExtent);
        graph.corner = radiusTable(progress, displayed, seedAlong <= seedAcross ? alongScale : acrossScale, 0);
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
        // The droplet is as round as its shorter side allows; the skin's corner is
        // back by the time the pane has nearly filled out. Below the seed (a close)
        // the pane keeps the capsule as it shrinks.
        const seedAlong = along * SEED;
        const seedAcross = acrossExtent * (ACROSS + (1 - ACROSS) * SEED);
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedAlong, seedAcross));
        const displayed = keyframes([[SEED, droplet], [RADIUS.settled, radius]]);
        const alongScale = (at: number) => at;
        const acrossScale = (at: number) => ACROSS + (1 - ACROSS) * at;
        graph.corner = radiusTable(progress, displayed, seedAlong <= seedAcross ? alongScale : acrossScale, SEED);
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
      trigger: progress.interpolate({ inputRange: [0, HANDOFF.tint], outputRange: [1, 0], extrapolate: "clamp" }),
      own: progress.interpolate({ inputRange: [0, HANDOFF.tint], outputRange: [0, 1], extrapolate: "clamp" }),
    } : null;
    return { frame, content, blend };
  }, [progress, contour, width, height, horizontal, edge, xFraction, yFraction, radius, origin]);
  const moving = animate && measured;
  return { frame: moving ? frame : null, content: moving ? content : null, blend: moving ? blend : null, readable: open && ready && (!animate || readable), animate };
}
