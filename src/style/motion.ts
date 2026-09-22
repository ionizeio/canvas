import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, UIManager, type EasingFunction } from "react-native";

// Whether the platform has React Native's native animated module, and therefore whether
// `useNativeDriver: true` engages an off-thread animation. True on iOS/Android, false on
// web (react-native-web ships no native animated module). Gate EVERY driver flag on it:
// a one-shot fade or move and a looping clock alike.
//
// Loops in particular MUST take the native driver wherever it exists. Under the New
// Architecture a JS-driven frame is not a cheap prop write: every Animated.View updated
// from the JS thread is its own Fabric shadow-tree commit (`setNativeProps` clones the
// node's ancestors and their siblings, re-runs Yoga's pixel-grid rounding over the WHOLE
// tree, and mounts a transaction that makes every ScrollView re-walk its subtree). The
// cost scales with the size of the tree, not with the animation, so a slow decorative
// loop is the most expensive thing an idle screen can run: the docs app sat at 150% CPU
// with the JS thread saturated and rAF near 3 frames per second on the iPhone 17 Pro
// simulator until its three loops (the Backdrop clock, the hero orbit, a catalog pulse)
// moved to the native driver, after which the JS thread was idle, rAF ran at 60 frames
// per second and the process sat near 20%, all of it the native animated module updating
// the scene's forty views (2026-09-18, tools/native/liquid-motion.md). On the native
// driver the whole graph (timing, the interpolations, multiply, the view props) runs in
// the native animated module and the JS thread is not involved between frames.
//
// Two constraints follow, and `useNativeDriver: supportsNativeDriver` is the whole gate:
//   - A native loop must be ONE `Animated.timing` inside `Animated.loop`. React Native
//     refuses `Animated.sequence` inside a native loop and `Animated.delay` hardcodes the
//     JS driver, so a cycle with a there-and-back or a hold is shaped by its EASING
//     instead (`thereAndBack`, `holdThen`, `keyframes` below); the timing's `frames` carry the shape
//     natively and the JS driver evaluates the same function on web.
//   - On react-native-web the flag must be false: loop() picks its strategy from the raw
//     flag, and the native-loop path's per-iteration restart waits on a native onEnd
//     callback that never fires there, so a `true` loop runs one pass and freezes.
//
// The earlier note here that a native loop "does not advance under the New Architecture
// on iOS" came from the 2026-06 Spinner, whose loop then drove a
// `createAnimatedComponent(Svg)` root, which the native driver's direct view updates
// do not reach. A native loop on an `Animated.View` advances on RN 0.86 / iOS 26 Fabric
// (the Backdrop clock, the hero orbit and the catalog pulse all run on it).
//
// Platform.OS is fixed per bundle, so this is evaluated once.
export const supportsNativeDriver: boolean = Platform.OS !== "web";

/** Shape one loop iteration as an out-and-back: `easing` carries the value from 0 to 1
 *  over the first half of the cycle and back down over the second, so a pulse, a breath
 *  or a shimmer is a single `Animated.timing` from 0 to 1 that ends where it began. The
 *  returned function is 0 at both ends, which is what lets `Animated.loop` restart it
 *  without a visible seam on either driver (the native frame driver restarts from its
 *  first frame; the JS driver resets to the constructor value). Mirrors the second half
 *  exactly, so `Easing.inOut(...)` in gives the same symmetric curve a two-step
 *  `Animated.sequence` produced. */
export function thereAndBack(easing: EasingFunction): EasingFunction {
  return (t) => (t < 0.5 ? easing(t * 2) : easing(2 - t * 2));
}

/** Shape one loop iteration as a hold followed by a sweep: the value stays parked at 0
 *  for the first `hold` fraction of the cycle (0..1), then `easing` carries it 0 to 1
 *  over the remainder. Replaces `Animated.sequence([Animated.delay(...), Animated.timing(...)])`
 *  for a rare-event loop (a comet, a flash), which the native driver cannot run as a
 *  sequence. */
export function holdThen(hold: number, easing: EasingFunction): EasingFunction {
  const sweep = 1 - hold;
  return (t) => (t <= hold || sweep <= 0 ? 0 : easing(Math.min(1, (t - hold) / sweep)));
}

/** Shape one loop iteration from keyframes: `points` are `[t, value]` pairs with t rising
 *  from 0 to 1, joined by straight lines, so a blink (visible, a quick fade out, hidden, a
 *  quick fade in) is a single `Animated.timing` whose easing IS the schedule. Give the last
 *  point the first point's value for a seam-free loop. */
export function keyframes(points: ReadonlyArray<readonly [number, number]>): EasingFunction {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return t1 === t0 ? v1 : v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
      }
    }
    return points[points.length - 1][1];
  };
}

// Whether the user has asked the OS to reduce motion (iOS "Reduce Motion", Android
// "Remove animations", and the web `prefers-reduced-motion` media query, which
// react-native-web maps onto AccessibilityInfo). Components read this to drop or
// shorten NON-ESSENTIAL animation (a skeleton shimmer, an accordion's expand
// transition, a carousel's animated scroll) so the kit honors WCAG 2.3.3 on every
// platform from one codebase. Essential, information-bearing motion (a loading
// spinner, a determinate progress fill) is left intact.
//
// Returns false until the first async read resolves, then tracks live changes.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

// React Native's New Architecture (Fabric / Bridgeless) enables LayoutAnimation by default, and
// `UIManager.setLayoutAnimationEnabledExperimental` is a no-op there that LOGS A WARNING on every
// call. The OLD (Paper) architecture still needs the flag flipped on Android. So detect Fabric via
// the global the runtime installs, and only flip the experimental flag on old-arch Android — a
// no-op on iOS, web, and the New Architecture. Call once at module scope from any component that
// drives LayoutAnimation (Accordion, Collapsible). Evaluated per bundle; Fabric is known by then.
const IS_FABRIC = (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager != null;

export function enableAndroidLayoutAnimations(): void {
  if (Platform.OS === "android" && !IS_FABRIC && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
