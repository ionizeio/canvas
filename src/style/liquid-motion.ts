import { useEffect, useMemo, useRef } from "react";
import { Animated, type LayoutRectangle } from "react-native";
import { useReducedMotion } from "./motion.js";

export type LiquidMotionProfile = "selection" | "drag" | "toggle";

const PROFILES = {
  selection: { stretch: 1.34, squash: 0.88, recoil: 0.82, liftWidth: 1.06, liftHeight: 1.5 },
  drag: { stretch: 1.24, squash: 0.92, recoil: 0.9, liftWidth: 1.08, liftHeight: 1.16 },
  toggle: { stretch: 1.24, squash: 0.9, recoil: 0.9, liftWidth: 1.04, liftHeight: 1.18 },
} as const;

/**
 * Decorative bounds only. Layout animation preserves native material rendering;
 * the semantic host, labels and hit targets never inherit a transform or opacity.
 * The travel/shape separation comes from Canvas's measured selection indicator.
 * The bounded distance/time coupling was checked against liquid-glass-studio at
 * f7b28c36305a862f5cffed3ddd51511cf1204f56 (src/App.tsx); no renderer or code copied.
 */
export function useLiquidMotion(
  layout: LayoutRectangle,
  { enabled, pressed = false, profile = "selection" }: { enabled: boolean; pressed?: boolean; profile?: LiquidMotionProfile },
) {
  const reducedMotion = useReducedMotion();
  const animate = enabled && !reducedMotion;
  const previous = useRef({ ...layout, time: Date.now(), pressed });
  const bounds = useRef({
    centerX: new Animated.Value(layout.x + layout.width / 2),
    centerY: new Animated.Value(layout.y + layout.height / 2),
    width: new Animated.Value(layout.width),
    height: new Animated.Value(layout.height),
  }).current;
  const deformation = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const previousLift = useRef({ x: layout.x, y: layout.y, pressed });
  const recipe = PROFILES[profile];
  const followsPointer = profile === "drag";
  const directX = followsPointer ? layout.x : 0;
  const directY = followsPointer ? layout.y : 0;
  const directWidth = followsPointer ? layout.width : 0;
  const directHeight = followsPointer ? layout.height : 0;
  const frame = useMemo(() => {
    const width = Animated.multiply(
      Animated.multiply(followsPointer ? directWidth : bounds.width, deformation.interpolate({
        inputRange: [-1, 0, 1], outputRange: [recipe.recoil, 1, recipe.stretch], extrapolate: "clamp",
      })),
      lift.interpolate({ inputRange: [0, 1], outputRange: [1, recipe.liftWidth], extrapolate: "clamp" }),
    );
    const height = Animated.multiply(
      Animated.multiply(followsPointer ? directHeight : bounds.height, deformation.interpolate({
        inputRange: [-1, 0, 1], outputRange: [1.14, 1, recipe.squash], extrapolate: "clamp",
      })),
      lift.interpolate({ inputRange: [0, 1], outputRange: [1, recipe.liftHeight], extrapolate: "clamp" }),
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
    previous.current = { x, y, width, height, time: now, pressed };
    const target = { centerX: x + width / 2, centerY: y + height / 2, width, height };
    const keys = Object.keys(bounds) as (keyof typeof bounds)[];
    if (!animate) {
      for (const key of keys) bounds[key].setValue(target[key]);
      deformation.setValue(0);
      return;
    }
    if (old.x === x && old.y === y && old.width === width && old.height === height && old.pressed === pressed) return;
    const distance = Math.hypot(x - old.x, y - old.y);
    const normalizedTravel = distance / Math.max(old.width, width, 1);
    // Drag position follows the authoritative value immediately. Only its shape
    // has inertia, so a controlled value or a release cannot lag behind the rail.
    const timeScale = followsPointer ? 16 / Math.max(8, Math.min(64, now - old.time)) : 1;
    const impulse = followsPointer && !pressed ? 0 : 18 * Math.min(1.25, normalizedTravel * timeScale);
    deformation.stopAnimation();
    const animation = Animated.parallel([
      ...(followsPointer ? [] : keys.map((key) => Animated.spring(bounds[key], {
        toValue: target[key], useNativeDriver: false,
        stiffness: 500, damping: 36, mass: 1, overshootClamping: true,
        restDisplacementThreshold: 0.1, restSpeedThreshold: 0.1, isInteraction: false,
      }))),
      Animated.spring(deformation, {
        toValue: 0, velocity: impulse, stiffness: 240, damping: 11, mass: 1,
        overshootClamping: false, restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.01, useNativeDriver: false, isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [animate, bounds, deformation, x, y, width, height, followsPointer, pressed]);
  useEffect(() => {
    const old = previousLift.current;
    previousLift.current = { x, y, pressed };
    if (!animate) {
      lift.setValue(0);
      return;
    }
    if (old.x === x && old.y === y && old.pressed === pressed) return;
    let animation: Animated.CompositeAnimation | undefined;
    lift.stopAnimation((value) => {
      animation = Animated.spring(lift, {
        toValue: pressed ? 1 : 0,
        velocity: pressed || profile === "drag" ? 0 : Math.max(0, 1 - value) * 24,
        stiffness: 210, damping: 13, mass: 1,
        restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
        useNativeDriver: false, isInteraction: false,
      });
      animation.start();
    });
    return () => animation?.stop();
  }, [animate, lift, x, y, pressed, profile]);
  return animate ? frame : { left: x, top: y, width, height };
}
