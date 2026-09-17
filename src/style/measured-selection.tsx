import type { ReactNode } from "react";
import { Animated, StyleSheet, type LayoutRectangle } from "react-native";
import { useLiquidMotion, type LiquidMotionProfile } from "./liquid-motion.js";

/**
 * Internal decorative frame. The owner measures its selection in this frame's
 * parent coordinates and supplies the skin's material, radius and elevation.
 * Foreground and interactive hosts remain siblings outside this motion graph.
 */
export function MeasuredSelection({ layout, enabled, pressed = false, resetKey, profile, children, testID }: {
  layout: LayoutRectangle;
  enabled: boolean;
  pressed?: boolean;
  profile?: LiquidMotionProfile;
  /** Change for structural relayouts that must reconcile without selection travel. */
  resetKey?: string | number;
  children: ReactNode;
  testID?: string;
}) {
  const frame = useLiquidMotion(layout, { enabled, pressed, resetKey, profile });
  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      testID={testID}
      style={[styles.frame, frame]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ frame: { position: "absolute", overflow: "visible", pointerEvents: "none" } });
