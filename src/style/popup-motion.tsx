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
} as const;

const { travel: TRAVEL, seed: SEED, across: ACROSS, radius: RADIUS, content: CONTENT, contour: CONTOUR } = POPUP_PRESENTATION;

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
  open, enabled, ready, size, edge = "top", anchorX, anchorY, radius, onExited,
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
  onExited: () => void;
}) {
  const reduced = useReducedMotion();
  const animate = enabled && !reduced;
  const progress = useRef(new Animated.Value(0)).current;
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
      ...(open ? TRAVEL.open : TRAVEL.close), mass: 1,
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
  const { frame, content } = useMemo(() => {
    // The pane's extent along the anchor axis is progress itself; across it the
    // pane starts at the droplet's width. Both let the opening's overshoot through.
    const along = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const across = progress.interpolate({ inputRange: [0, 1], outputRange: [ACROSS, 1], extrapolateLeft: "clamp", extrapolateRight: "extend" });
    const stretch = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.stretch.recoil, 1, CONTOUR.stretch.peak], extrapolate: "clamp" });
    const squash = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [CONTOUR.squash.recoil, 1, CONTOUR.squash.peak], extrapolate: "clamp" });
    const w = Animated.multiply(width, Animated.multiply(horizontal ? along : across, horizontal ? stretch : squash));
    const h = Animated.multiply(height, Animated.multiply(horizontal ? across : along, horizontal ? squash : stretch));
    const frame: Animated.WithAnimatedValue<ViewStyle> = {
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
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });
    const remaining = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: "clamp" });
    const alongShift = ((horizontal ? width : height) / 2) * ((horizontal ? edge === "right" : edge === "bottom") ? 1 : -1);
    const acrossShift = (horizontal ? height : width) * (1 - ACROSS) * ((horizontal ? yFraction : xFraction) - 0.5);
    const translateX = Animated.multiply(remaining, horizontal ? alongShift : acrossShift);
    const translateY = Animated.multiply(remaining, horizontal ? acrossShift : alongShift);
    const content: Animated.WithAnimatedValue<ViewStyle> = {
      opacity: progress.interpolate({ inputRange: [CONTENT.fadeFrom, CONTENT.fadeTo], outputRange: [0, 1], extrapolate: "clamp" }),
      transform: [{ translateX }, { translateY }, { scale }],
    };
    return { frame, content };
  }, [progress, contour, width, height, horizontal, edge, xFraction, yFraction, radius]);
  const moving = animate && measured;
  return { frame: moving ? frame : null, content: moving ? content : null, readable: open && ready && (!animate || readable), animate };
}
