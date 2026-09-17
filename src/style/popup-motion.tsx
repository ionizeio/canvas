import { createContext, useEffect, useRef, useState } from "react";
import { Animated, type ViewStyle } from "react-native";
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
 * The panel's semantic/layout host and its foreground never inherit a transform.
 */
export function usePopupMotion({
  open, enabled, ready, size, edge = "top", anchorX, anchorY, onExited,
}: {
  open: boolean;
  enabled: boolean;
  ready: boolean;
  size: PopupSize;
  edge?: PopupEdge;
  anchorX?: number;
  anchorY?: number;
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
    // Foreground enters only when the material covers its resting content area.
    const subscription = progress.addListener(({ value }) => {
      if (value >= 0.995) setReadable(true);
    });
    return () => progress.removeListener(subscription);
  }, [animate, progress]);

  useIsomorphicLayoutEffect(() => {
    const generation = ++lifecycle.current;
    const restoredAtRest = animate && !previousPolicy.current.animate && previousPolicy.current.open === open;
    previousPolicy.current = { animate, open };
    progress.stopAnimation();
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
    const travel = Animated.spring(progress, {
      toValue: open ? 1 : 0,
      stiffness: open ? 650 : 720, damping: 42, mass: 1,
      overshootClamping: true, restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.01, useNativeDriver: false, isInteraction: false,
    });
    const shape = Animated.spring(contour, {
      toValue: 0, velocity: open ? 10 : -5,
      stiffness: 320, damping: 15, mass: 1,
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
      toValue: 0, velocity: Math.min(change, 0.5) * 14,
      stiffness: 320, damping: 18, mass: 1,
      restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
      useNativeDriver: false, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animate, open, ready, measured, width, height, contour]);

  const horizontal = edge === "left" || edge === "right";
  const along = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });
  const across = progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1], extrapolate: "clamp" });
  const stretch = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 1.055], extrapolate: "clamp" });
  const squash = contour.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.018, 1, 0.975], extrapolate: "clamp" });
  const w = Animated.multiply(width, Animated.multiply(horizontal ? along : across, horizontal ? stretch : squash));
  const h = Animated.multiply(height, Animated.multiply(horizontal ? across : along, horizontal ? squash : stretch));
  const xFraction = Math.max(0, Math.min(1, (anchorX ?? width / 2) / Math.max(width, 1)));
  const yFraction = Math.max(0, Math.min(1, (anchorY ?? height / 2) / Math.max(height, 1)));
  const frame: Animated.WithAnimatedValue<ViewStyle> = {
    position: "absolute",
    left: Animated.multiply(Animated.subtract(width, w), horizontal ? edge === "right" ? 1 : 0 : xFraction),
    top: Animated.multiply(Animated.subtract(height, h), horizontal ? yFraction : edge === "bottom" ? 1 : 0),
    right: undefined, bottom: undefined, width: w, height: h,
  };
  return { frame: animate && measured ? frame : null, readable: open && ready && (!animate || readable), animate };
}
