import { useEffect, useSyncExternalStore } from "react";
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
// simulator until its decorative loops (since removed) moved to the native driver, after
// which the JS thread was idle and rAF ran at 60 frames per second (2026-09-18,
// tools/native/liquid-motion.md). On the native driver the whole graph (timing, the
// interpolations, multiply, the view props) runs in the native animated module and the
// JS thread is not involved between frames.
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
// (the Skeleton shimmer, the Spinner and the indeterminate Progress all run on it).
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

// Dark Factory's hover feedback (the design language's item 9), the one table of its
// tunables, judged against the `df-hover-lift` reference card in
// tools/native/liquid-motion.md: a pressable card rises 2 px while its resting shade
// deepens in step, a primary button rises 1 px, a nav row's wash fades in, all on CSS
// `ease` and symmetric on leave. Every other hover in the design language switches
// instantly. Internal: the style barrel names this file's public exports, so these
// values never become API (src/style/hover.tsx applies them).
export const HOVER = {
  /** A pressable card: the rise and the shade change run together. */
  card: { distance: 2, duration: 180 },
  /** A primary button. */
  button: { distance: 1, duration: 150 },
  /** A nav row's hover wash; nothing moves. */
  wash: { distance: 0, duration: 150 },
} as const;

/** CSS `ease`, the curve of every hover transition, spelled out as the reference's own. */
export const HOVER_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";

// Whether the user has asked the OS to reduce motion (iOS "Reduce Motion", Android
// "Remove animations", and the web `prefers-reduced-motion` media query, which
// react-native-web maps onto AccessibilityInfo). Components read this to drop or
// shorten NON-ESSENTIAL animation (a skeleton shimmer, an accordion's expand
// transition, a carousel's animated scroll, a hover lift) so the kit honors WCAG 2.3.3
// on every platform from one codebase. Essential, information-bearing motion (a
// loading spinner, a determinate progress fill) is left intact.
//
// One subscription serves every consumer. Two reasons: the hover feedback puts this
// hook in every Button, Card and Sidebar row, and react-native-web's AccessibilityInfo
// keys its change handlers by the handler's string form, and every React state setter
// is a bound function that stringifies to the same native-code placeholder, so one
// subscription per component
// overwrote the previous one's entry and an unmount removed the wrong media listener
// while the others leaked. The shared listener is a named module function, subscribed
// while any consumer is mounted and released with the last one, when the value resets
// so the next consumer starts from the same unread state.
let reducedMotion = false;
const reducedMotionListeners = new Set<() => void>();
let reducedMotionSubscription: { remove?: () => void } | undefined;

function onReduceMotionChanged(value: boolean) {
  if (value === reducedMotion) return;
  reducedMotion = value;
  for (const listener of reducedMotionListeners) listener();
}

function subscribeReducedMotion(listener: () => void): () => void {
  reducedMotionListeners.add(listener);
  if (reducedMotionSubscription == null) {
    reducedMotionSubscription = AccessibilityInfo.addEventListener("reduceMotionChanged", onReduceMotionChanged) ?? {};
  }
  return () => {
    reducedMotionListeners.delete(listener);
    if (reducedMotionListeners.size > 0) return;
    reducedMotionSubscription?.remove?.();
    reducedMotionSubscription = undefined;
    reducedMotion = false;
  };
}

const readReducedMotion = () => reducedMotion;
const serverReducedMotion = () => false;

// Returns false until the first async read resolves, then tracks live changes. Each
// consumer still reads the setting when it mounts (the read is a promise, not a
// listener), so a consumer mounted after the setting changed never trusts a stale
// value, and a test that stubs the read per render sees its own stub.
export function useReducedMotion(): boolean {
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverReducedMotion);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) onReduceMotionChanged(value);
    });
    return () => {
      mounted = false;
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
