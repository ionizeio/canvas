import { useEffect, useMemo, useRef } from "react";
import { Animated, type LayoutRectangle } from "react-native";
import { useReducedMotion } from "./motion.js";
import { HORIZONTAL_LIQUID_DIRECTION, liquidTravel } from "./liquid-motion-geometry.js";

export type LiquidMotionProfile = "selection" | "drag" | "toggle" | "navigation";

export interface LiquidMotionOptions {
  enabled: boolean;
  pressed?: boolean;
  profile?: LiquidMotionProfile;
  /** Reconcile structural relayouts directly instead of treating them as selection travel. */
  resetKey?: string | number;
}

const PROFILES = {
  selection: { stretch: 1.34, squash: 0.88, recoil: 0.82, recoilCross: 1.14, liftWidth: 1.06, liftHeight: 1.5 },
  drag: { stretch: 1.24, squash: 0.92, recoil: 0.9, recoilCross: 1.14, liftWidth: 1.08, liftHeight: 1.16 },
  toggle: { stretch: 1.24, squash: 0.9, recoil: 0.9, recoilCross: 1.14, liftWidth: 1.04, liftHeight: 1.18 },
  // Navigation pills live beside labels: horizontal travel must never grow into
  // the label lane, including the cross-axis recoil after the stretch.
  navigation: { stretch: 1.18, squash: 0.96, recoil: 0.94, recoilCross: 1, liftWidth: 1.02, liftHeight: 1 },
} as const;

/** Maximum decorative reach for a horizontal selection inside a clipped scroller. */
export function liquidMotionInsets(layout: Pick<LayoutRectangle, "width" | "height">, profile: LiquidMotionProfile = "selection") {
  const recipe = PROFILES[profile];
  return {
    horizontal: Math.ceil(layout.width * (recipe.stretch * recipe.liftWidth - 1) / 2),
    vertical: Math.ceil(layout.height * (recipe.recoilCross * recipe.liftHeight - 1) / 2),
  };
}

/**
 * Decorative bounds only. Layout animation preserves native material rendering;
 * the semantic host, labels and hit targets never inherit a transform or opacity.
 * The travel/shape separation comes from Canvas's measured selection indicator.
 * The bounded distance/time coupling was checked against liquid-glass-studio at
 * f7b28c36305a862f5cffed3ddd51511cf1204f56 (src/App.tsx); no renderer or code copied.
 */
export function useLiquidMotion(
  layout: LayoutRectangle,
  { enabled, pressed = false, profile = "selection", resetKey }: LiquidMotionOptions,
) {
  const reducedMotion = useReducedMotion();
  const animate = enabled && !reducedMotion;
  const previous = useRef({ ...layout, time: Date.now(), pressed, resetKey });
  const reset = previous.current.resetKey !== resetKey;
  const direction = useRef(HORIZONTAL_LIQUID_DIRECTION);
  const bounds = useRef({
    centerX: new Animated.Value(layout.x + layout.width / 2),
    centerY: new Animated.Value(layout.y + layout.height / 2),
    width: new Animated.Value(layout.width),
    height: new Animated.Value(layout.height),
  }).current;
  // Independent axis channels retain their current painted values on direction
  // changes. Replacing a direction coefficient would snap an in-flight shape.
  const deformation = useRef({ horizontal: new Animated.Value(0), vertical: new Animated.Value(0) }).current;
  const lift = useRef({ horizontal: new Animated.Value(0), vertical: new Animated.Value(0) }).current;
  const previousLift = useRef({ x: layout.x, y: layout.y, pressed, resetKey });
  const recipe = PROFILES[profile];
  const followsPointer = profile === "drag";
  const directX = followsPointer ? layout.x : 0;
  const directY = followsPointer ? layout.y : 0;
  const directWidth = followsPointer ? layout.width : 0;
  const directHeight = followsPointer ? layout.height : 0;
  const frame = useMemo(() => {
    const shape = (parallel: Animated.Value, perpendicular: Animated.Value) => Animated.add(
      parallel.interpolate({
        inputRange: [-1, 0, 1], outputRange: [recipe.recoil, 1, recipe.stretch], extrapolate: "clamp",
      }),
      perpendicular.interpolate({
        inputRange: [-1, 0, 1], outputRange: [recipe.recoilCross - 1, 0, recipe.squash - 1], extrapolate: "clamp",
      }),
    ).interpolate({
      inputRange: [Math.min(recipe.recoil, recipe.squash), Math.max(recipe.stretch, recipe.recoilCross)],
      outputRange: [Math.min(recipe.recoil, recipe.squash), Math.max(recipe.stretch, recipe.recoilCross)],
      extrapolate: "clamp",
    });
    const raised = (parallel: Animated.Value, perpendicular: Animated.Value) => Animated.add(
      parallel.interpolate({ inputRange: [0, 1], outputRange: [1, recipe.liftWidth], extrapolate: "clamp" }),
      perpendicular.interpolate({ inputRange: [0, 1], outputRange: [0, recipe.liftHeight - 1], extrapolate: "clamp" }),
    ).interpolate({
      inputRange: [1, Math.max(recipe.liftWidth, recipe.liftHeight)],
      outputRange: [1, Math.max(recipe.liftWidth, recipe.liftHeight)],
      extrapolate: "clamp",
    });
    const width = Animated.multiply(
      Animated.multiply(followsPointer ? directWidth : bounds.width, shape(deformation.horizontal, deformation.vertical)),
      raised(lift.horizontal, lift.vertical),
    );
    const height = Animated.multiply(
      Animated.multiply(followsPointer ? directHeight : bounds.height, shape(deformation.vertical, deformation.horizontal)),
      raised(lift.vertical, lift.horizontal),
    );
    return {
      // Drag centers come from this render's value, not an effect-updated node.
      // The announced value, filled rail and thumb therefore commit together.
      left: Animated.subtract(followsPointer ? directX + directWidth / 2 : bounds.centerX, Animated.divide(width, 2)),
      top: Animated.subtract(followsPointer ? directY + directHeight / 2 : bounds.centerY, Animated.divide(height, 2)),
      width,
      height,
    };
  }, [bounds, deformation, lift, recipe, followsPointer, directX, directY, directWidth, directHeight]);
  const { x, y, width, height } = layout;
  useEffect(() => {
    const old = previous.current;
    const now = Date.now();
    previous.current = { x, y, width, height, time: now, pressed, resetKey };
    const target = { centerX: x + width / 2, centerY: y + height / 2, width, height };
    const keys = Object.keys(bounds) as (keyof typeof bounds)[];
    if (!animate || old.resetKey !== resetKey) {
      for (const key of keys) bounds[key].setValue(target[key]);
      deformation.horizontal.setValue(0);
      deformation.vertical.setValue(0);
      direction.current = HORIZONTAL_LIQUID_DIRECTION;
      return;
    }
    if (old.x === x && old.y === y && old.width === width && old.height === height && old.pressed === pressed) return;
    const travel = liquidTravel(old, { x, y, width, height }, now - old.time, followsPointer, pressed, direction.current);
    direction.current = travel.direction;
    // Drag position follows the authoritative value immediately. Only its shape
    // has inertia, so a controlled value or a release cannot lag behind the rail.
    deformation.horizontal.stopAnimation();
    deformation.vertical.stopAnimation();
    const animation = Animated.parallel([
      ...(followsPointer ? [] : keys.map((key) => Animated.spring(bounds[key], {
        toValue: target[key], useNativeDriver: false,
        stiffness: 500, damping: 36, mass: 1, overshootClamping: true,
        restDisplacementThreshold: 0.1, restSpeedThreshold: 0.1, isInteraction: false,
      }))),
      ...(["horizontal", "vertical"] as const).map((axis) => Animated.spring(deformation[axis], {
        toValue: 0, velocity: travel.impulse * travel.direction[axis], stiffness: 240, damping: 11, mass: 1,
        overshootClamping: false, restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.01, useNativeDriver: false, isInteraction: false,
      })),
    ]);
    animation.start();
    return () => animation.stop();
  }, [animate, bounds, deformation, x, y, width, height, followsPointer, pressed, resetKey]);
  useEffect(() => {
    const old = previousLift.current;
    previousLift.current = { x, y, pressed, resetKey };
    if (!animate || old.resetKey !== resetKey) {
      lift.horizontal.setValue(0);
      lift.vertical.setValue(0);
      return;
    }
    if (old.x === x && old.y === y && old.pressed === pressed) return;
    const animations: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    for (const axis of ["horizontal", "vertical"] as const) {
      lift[axis].stopAnimation((value) => {
        if (cancelled) return;
        const weight = direction.current[axis];
        const animation = Animated.spring(lift[axis], {
          toValue: pressed ? weight : 0,
          velocity: pressed || profile === "drag" ? 0 : Math.max(0, weight - value) * 24,
          stiffness: 210, damping: 13, mass: 1,
          restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
          useNativeDriver: false, isInteraction: false,
        });
        animations.push(animation);
        animation.start();
      });
    }
    return () => { cancelled = true; animations.forEach((animation) => animation.stop()); };
  }, [animate, lift, x, y, pressed, profile, resetKey]);
  return animate && !reset ? frame : { left: x, top: y, width, height };
}
