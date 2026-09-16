import { useEffect, useRef } from "react";
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

/** Layout animation keeps Apple's native visual effect intact, unlike a scaled ancestor. */
export function GlassSelection({ layout, disabled, testID }: { layout: LayoutRectangle; disabled?: boolean; testID?: string }) {
  const reducedMotion = useReducedMotion();
  const bounds = useRef({
    left: new Animated.Value(layout.x),
    top: new Animated.Value(layout.y),
    width: new Animated.Value(layout.width),
    height: new Animated.Value(layout.height),
  }).current;
  const { x, y, width, height } = layout;
  useEffect(() => {
    const target = { left: x, top: y, width, height };
    if (reducedMotion) {
      for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) bounds[key].setValue(target[key]);
      return;
    }
    const animation = Animated.parallel(
      (Object.keys(bounds) as (keyof typeof bounds)[]).map((key) => Animated.spring(bounds[key], {
        toValue: target[key],
        useNativeDriver: false,
        tension: 210,
        friction: 24,
        overshootClamping: true,
      })),
    );
    animation.start();
    return () => animation.stop();
  }, [bounds, x, y, width, height, reducedMotion]);
  return (
    <Animated.View style={[s.glassSelectionPosition, bounds, disabled ? s.dim : null]}>
      <GroupGlass selected testID={testID} />
    </Animated.View>
  );
}
