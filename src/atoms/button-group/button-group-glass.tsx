import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, type LayoutRectangle } from "react-native";
import { GlassSurface, alpha, useReducedMotion, useTheme } from "../../style/index.js";
import * as s from "./button-group.styles.js";

/** A material sibling behind the controls, so it never clips focus or intercepts taps. */
export function GroupGlass({ selected = false, testID }: { selected?: boolean; testID?: string }) {
  const { tokens, dark } = useTheme();
  return (
    <GlassSurface
      pointerEvents="none"
      testID={testID}
      interactive={selected}
      tint={selected ? alpha(dark ? tokens.foreground : tokens.background, dark ? 0.16 : 0.64) : undefined}
      style={[
        StyleSheet.absoluteFill,
        s.glassCorners,
        { backgroundColor: selected ? tokens.card : tokens.muted },
        selected ? s.glassSelectionShadow : null,
      ]}
    />
  );
}

/**
 * The selection travels and deforms independently: it stretches into a droplet
 * in flight, then recoils across its resting shape as it lands. Animate layout,
 * not scale transforms, which make Apple's native GlassView turn opaque.
 */
export function GlassSelection({ layout, pressed = false, disabled, testID }: { layout: LayoutRectangle; pressed?: boolean; disabled?: boolean; testID?: string }) {
  const reducedMotion = useReducedMotion();
  const previous = useRef(layout);
  const bounds = useRef({
    centerX: new Animated.Value(layout.x + layout.width / 2),
    centerY: new Animated.Value(layout.y + layout.height / 2),
    width: new Animated.Value(layout.width),
    height: new Animated.Value(layout.height),
  }).current;
  const deformation = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const previousLift = useRef({ x: layout.x, y: layout.y, pressed });
  const frame = useMemo(() => {
    // Clamp shape amplitude, not spring overshoot. Rapid reversals must retain
    // the recoil without letting a long jump stretch the pill across the row.
    const stretchedWidth = Animated.multiply(bounds.width, deformation.interpolate({
      inputRange: [-1, 0, 1], outputRange: [0.82, 1, 1.34], extrapolate: "clamp",
    }));
    const squashedHeight = Animated.multiply(bounds.height, deformation.interpolate({
      inputRange: [-1, 0, 1], outputRange: [1.14, 1, 0.88], extrapolate: "clamp",
    }));
    // The material lifts beyond the track while pressed or moving. Only this
    // decorative sibling grows; labels, hit targets, and focus stay in place.
    const width = Animated.multiply(stretchedWidth, lift.interpolate({
      inputRange: [0, 1], outputRange: [1, 1.06], extrapolate: "clamp",
    }));
    const height = Animated.multiply(squashedHeight, lift.interpolate({
      inputRange: [0, 1], outputRange: [1, 1.5], extrapolate: "clamp",
    }));
    return {
      left: Animated.subtract(bounds.centerX, Animated.divide(width, 2)),
      top: Animated.subtract(bounds.centerY, Animated.divide(height, 2)),
      width,
      height,
    };
  }, [bounds, deformation, lift]);
  const { x, y, width, height } = layout;
  useEffect(() => {
    const old = previous.current;
    previous.current = { x, y, width, height };
    const target = { centerX: x + width / 2, centerY: y + height / 2, width, height };
    if (reducedMotion || disabled) {
      for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) bounds[key].setValue(target[key]);
      deformation.setValue(0);
      return;
    }
    if (old.x === x && old.y === y && old.width === width && old.height === height) return;
    const distance = Math.hypot(x - old.x, y - old.y);
    // A velocity impulse starts at the current shape, so an interrupted switch
    // continues smoothly instead of resetting to a rigid pill for one frame.
    // Clear the old spring's velocity before applying the new impulse.
    deformation.stopAnimation();
    const animation = Animated.parallel([
      ...(Object.keys(bounds) as (keyof typeof bounds)[]).map((key) => Animated.spring(bounds[key], {
        toValue: target[key],
        useNativeDriver: false,
        stiffness: 500,
        damping: 36,
        mass: 1,
        overshootClamping: true,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
        isInteraction: false,
      })),
      Animated.spring(deformation, {
        toValue: 0,
        velocity: distance > 0 ? 18 * Math.min(1.25, distance / Math.max(old.width, width, 1)) : 0,
        stiffness: 240,
        damping: 11,
        mass: 1,
        overshootClamping: false,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.01,
        useNativeDriver: false,
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [bounds, deformation, x, y, width, height, reducedMotion, disabled]);
  useEffect(() => {
    const old = previousLift.current;
    previousLift.current = { x, y, pressed };
    if (reducedMotion || disabled) {
      lift.setValue(0);
      return;
    }
    if (old.x === x && old.y === y && old.pressed === pressed) return;
    let animation: Animated.CompositeAnimation | undefined;
    lift.stopAnimation((value) => {
      animation = Animated.spring(lift, {
        toValue: pressed ? 1 : 0,
        // A quick tap still lifts before settling; a held press is already up.
        velocity: pressed ? 0 : Math.max(0, 1 - value) * 24,
        stiffness: 210,
        damping: 13,
        mass: 1,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.01,
        useNativeDriver: false,
        isInteraction: false,
      });
      animation.start();
    });
    return () => animation?.stop();
  }, [lift, x, y, pressed, reducedMotion, disabled]);
  return (
    <Animated.View style={[s.glassSelectionPosition, frame, disabled ? s.dim : null]}>
      <GroupGlass selected testID={testID} />
    </Animated.View>
  );
}
