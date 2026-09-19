import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "./motion.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

/** Internal activation only. Public overlay helpers retain their existing behavior. */
export const PopupMotionPolicy = createContext(false);
/** Suppress the ordinary whole-content entrance when decoration owns motion. */
export const StationaryEntranceContext = createContext(false);
/** Retained decoration does not participate in input or accessibility. */
export const PopupInteractionContext = createContext(true);
/** Only the owning surface consumes this frame; nested surfaces stay independent. */
export const MaterialMotionContext = createContext<Animated.WithAnimatedValue<ViewStyle> | null>(null);

export type PopupEdge = "top" | "bottom" | "left" | "right";
export interface PopupSize { width: number; height: number }
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
   * skin's own), and the progress by which the skin's radius is back.
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

/**
 * The material grows from its fitted anchor, then deforms independently of travel.
 * The panel's semantic/layout host never inherits a transform. Its foreground
 * follows the pane only while the pane opens (scale and opacity, identity at rest)
 * and stays inert, hidden from assistive tech, until the pane has settled.
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
   * owns a value of its own otherwise.
   */
  progress?: Animated.Value;
  onExited: () => void;
}) {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced;
  const own = useRef<Animated.Value | null>(null);
  if (!shared && !own.current) own.current = new Animated.Value(0);
  const progress = shared ?? own.current!;
  const contour = useRef(new Animated.Value(0)).current;
  const [readable, setReadable] = useState(!animate);
  const lifecycle = useRef(0);
  const previousPolicy = useRef({ animate, open });
  const previous = useRef({ width: size.width, height: size.height, open });
  const exited = useRef(onExited);
  exited.current = onExited;
  const { width, height } = size;
  const measured = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

  useEffect(() => {
    if (!animate) return;
    // The foreground becomes interactive once the material first covers its resting
    // content area, which with the opening's overshoot is before the settle.
    const subscription = progress.addListener(({ value }) => {
      if (value >= 0.995) setReadable(true);
    });
    return () => progress.removeListener(subscription);
  }, [animate, progress]);

  useIsomorphicLayoutEffect(() => {
    const generation = ++lifecycle.current;
    const restoredAtRest = animate && !previousPolicy.current.animate && previousPolicy.current.open === open;
    previousPolicy.current = { animate, open };
    let current = 0;
    progress.stopAnimation((value) => { current = value; });
    contour.stopAnimation();
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
      restSpeedThreshold: 0.01, useNativeDriver: false, isInteraction: false,
    });
    const shape = Animated.spring(contour, {
      toValue: 0, velocity: open ? CONTOUR.openVelocity : CONTOUR.closeVelocity,
      stiffness: CONTOUR.stiffness, damping: CONTOUR.damping, mass: 1,
      restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
      useNativeDriver: false, isInteraction: false,
    });
    // Travel owns presence; contour is independent decoration. A live result
    // resize may replace its spring without canceling the logical opening or
    // having travel completion stop a newer contour midway through recoil.
    travel.start(({ finished }) => {
      if (!finished || generation !== lifecycle.current) return;
      progress.setValue(open ? 1 : 0);
      if (open) setReadable(true);
      else exited.current();
    });
    shape.start();
    return () => { lifecycle.current++; travel.stop(); shape.stop(); };
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
      useNativeDriver: false, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, open, ready, measured, width, height, contour]);

  const horizontal = edge === "left" || edge === "right";
  const xFraction = Math.max(0, Math.min(1, (anchorX ?? width / 2) / Math.max(width, 1)));
  const yFraction = Math.max(0, Math.min(1, (anchorY ?? height / 2) / Math.max(height, 1)));
  const { frame, content, blend } = useMemo(() => {
    const stretch = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.stretch.recoil, 1, CONTOUR.stretch.peak], extrapolate: "clamp" });
    const squash = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.squash.recoil, 1, CONTOUR.squash.peak], extrapolate: "clamp" });
    // The pane's extent along the anchor axis is progress itself (the opening's
    // overshoot passes through); across it the pane starts at the droplet's width, or
    // under a hand-off holds the trigger's width until `widen` and never overshoots
    // (the along axis carries the bounce, as the native menu's does).
    const along = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const across = origin
      ? progress.interpolate({ inputRange: [0, HANDOFF.widen, 1], outputRange: [0, 0, 1], extrapolate: "clamp" })
      : progress.interpolate({ inputRange: [0, 1], outputRange: [ACROSS, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });
    const remaining = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: "clamp" });
    let frame: Animated.WithAnimatedValue<ViewStyle>;
    let translateX: Animated.AnimatedNode;
    let translateY: Animated.AnimatedNode;
    if (origin) {
      // The material travels between two boxes: the trigger's (progress 0) and the
      // card's (progress 1), each extent on its own curve, the centre following the
      // extent so the drop stays under the pill while the pill's width is held.
      const wShare = horizontal ? along : across;
      const hShare = horizontal ? across : along;
      const w = Animated.multiply(Animated.add(origin.width, Animated.multiply(wShare, width - origin.width)), horizontal ? stretch : squash);
      const h = Animated.multiply(Animated.add(origin.height, Animated.multiply(hShare, height - origin.height)), horizontal ? squash : stretch);
      const originX = origin.x + origin.width / 2;
      const originY = origin.y + origin.height / 2;
      const centreX = Animated.add(originX, Animated.multiply(wShare, width / 2 - originX));
      const centreY = Animated.add(originY, Animated.multiply(hShare, height / 2 - originY));
      frame = {
        position: "absolute",
        left: Animated.subtract(centreX, Animated.divide(w, 2)),
        top: Animated.subtract(centreY, Animated.divide(h, 2)),
        right: undefined, bottom: undefined, width: w, height: h,
      };
      if (radius != null && Number.isFinite(radius)) {
        // The corner is the trigger's at the pill, the droplet's at the seed (as round
        // as the seed shape's shorter side allows), and the skin's once settled.
        const seedWidth = origin.width + (width - origin.width) * (horizontal ? SEED : handoffAcross(SEED));
        const seedHeight = origin.height + (height - origin.height) * (horizontal ? handoffAcross(SEED) : SEED);
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedWidth, seedHeight));
        frame.borderRadius = progress.interpolate({ inputRange: [0, SEED, RADIUS.settled], outputRange: [origin.radius, droplet, radius], extrapolate: "clamp" });
      }
      // The rows scale from the trigger's centre.
      translateX = Animated.multiply(remaining, originX - width / 2);
      translateY = Animated.multiply(remaining, originY - height / 2);
    } else {
      const w = Animated.multiply(width, Animated.multiply(horizontal ? along : across, horizontal ? stretch : squash));
      const h = Animated.multiply(height, Animated.multiply(horizontal ? across : along, horizontal ? squash : stretch));
      frame = {
        position: "absolute",
        left: Animated.multiply(Animated.subtract(width, w), horizontal ? edge === "right" ? 1 : 0 : xFraction),
        top: Animated.multiply(Animated.subtract(height, h), horizontal ? yFraction : edge === "bottom" ? 1 : 0),
        right: undefined, bottom: undefined, width: w, height: h,
      };
      if (radius != null && Number.isFinite(radius)) {
        // The droplet is as round as its shorter side allows; the skin's corner is
        // back by the time the pane has nearly filled out.
        const seedWidth = width * (horizontal ? SEED : ACROSS + (1 - ACROSS) * SEED);
        const seedHeight = height * (horizontal ? ACROSS + (1 - ACROSS) * SEED : SEED);
        const droplet = Math.max(radius, RADIUS.droplet * Math.min(seedWidth, seedHeight));
        frame.borderRadius = progress.interpolate({ inputRange: [SEED, RADIUS.settled], outputRange: [droplet, radius], extrapolate: "clamp" });
      }
      // The rows scale with the pane's extent along the anchor axis, sit centred
      // across it, and cross-fade in. Every term is linear in the remaining travel,
      // so at rest the foreground is exactly the identity.
      const alongShift = ((horizontal ? width : height) / 2) * ((horizontal ? edge === "right" : edge === "bottom") ? 1 : -1);
      const acrossShift = (horizontal ? height : width) * (1 - ACROSS) * ((horizontal ? yFraction : xFraction) - 0.5);
      translateX = Animated.multiply(remaining, horizontal ? alongShift : acrossShift);
      translateY = Animated.multiply(remaining, horizontal ? acrossShift : alongShift);
    }
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
