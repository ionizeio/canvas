import { Platform, type Insets, type LayoutChangeEvent } from "react-native";
import { useSeededMinTargetSlop, type MinTargetOptions } from "./touch-target-seed.js";

/**
 * Meeting the platform minimum touch target without changing what anything looks like.
 *
 * Apple asks for 44pt and Material 3 for 48dp, and plenty of controls are smaller than
 * that on purpose: a small text button, an icon square, a checkbox, a segmented item.
 * Growing them to the minimum would be the wrong fix, because the minimum is about the
 * area a finger can hit, not the area the design should occupy.
 *
 * So the shape stays and the TOUCH area grows. A skin declares its platform's minimum,
 * the shell measures what the control actually rendered at, and hitSlop makes up the
 * shortfall symmetrically. Nothing moves: hitSlop is not layout. On the web the skins
 * declare no minimum at all, because a pointer target is visual-sized and a mouse does
 * not have a fingertip.
 *
 * The pattern started on Button and lives here so every pressable can use it, and so
 * the coverage test has one thing to look for rather than a family of near-copies.
 *
 * Where the touch area reaches on iOS and Android is React Native's own contract, and two
 * of its rules bound it.
 *
 * A slop never reaches past a native ancestor that does not contain it. React Native
 * hit-tests from the root down, and each native view on the way admits a point only
 * inside its own bounds plus its own hitSlop, or, for a view that does not clip, the
 * overflow Yoga recorded at its last layout (its children's frames and their hitSlop):
 *
 *  - A layout-only parent (a plain Row, Column or View that paints nothing and carries no
 *    testID, handler or transform) is flattened away and never stops it.
 *  - A native parent that clips (overflow hidden or scroll, a ScrollView's viewport) stops
 *    it at its edge unless the parent carries the slop as its own hitSlop: Android's
 *    TouchTargetHelper never asks the children about a point outside a clipping view's
 *    bounds plus its own slop, and iOS stops at a view that clips to its bounds. Every
 *    clipping view the kit owns carries the slop of the controls inside it, RippleClip
 *    first (src/style/ripple-clip.tsx), or holds them far enough inside its edge;
 *    test/touch-target-clips.test.tsx holds it, and records the one view that does
 *    neither (the terminal CodeBlock's window over a chrome that hosts tabs).
 *  - A native parent that does not clip (painted, bordered, a testID, pointer handlers)
 *    admits the slop through the overflow it recorded at its last layout, and a commit
 *    that changes only hitSlop lays nothing out. The kit's controls seed their slop from
 *    the box their skin gives, so it is in place at the first layout
 *    (src/style/touch-target-seed.ts). This hook has no box to seed from: a caller's
 *    native view that hugs the control can stop the slop until it lays out again.
 *
 * Where two touch areas overlap, the later sibling takes the tap: Android and iOS both
 * walk a view's children from the last to the first. Inside a component the kit splits
 * the gap between two of its own controls, from its own geometry, so neither takes a tap
 * inside the other (src/style/touch-seam.ts; test/touch-target-seams.test.tsx holds it).
 * Between controls a caller places, it does not: this hook reaches the minimum whatever
 * sits beside the control. So in a caller's layout, leave at least twice the slop between
 * two small controls, or split the seam in a control of your own.
 */

/** The platform minimums, from the two platforms' own guidance. */
export const TOUCH_TARGET = { ios: 44, android: 48 } as const;

/**
 * The running platform's minimum, for a component that ships ONE shared skin across
 * all three platforms (its look is genuinely platform-neutral, so there is nothing
 * per-OS to declare). A skin object is evaluated once, in the platform's own bundle,
 * so this resolves to that platform's number.
 */
export function platformMinTarget(): number | null {
  if (Platform.OS === "ios") return TOUCH_TARGET.ios;
  if (Platform.OS === "android") return TOUCH_TARGET.android;
  return null;
}

/** Skins that own a pressable declare this: the minimum, or null for none. */
export interface TouchTargetSkin {
  /** iOS 44, Android 48, web null. */
  minTarget: number | null;
}

// The maths and the measurement live in touch-target-seed.ts, beside the seed the kit's
// own controls take from their declared box (not public API); these are the public names.
export { minTargetSlop, type MinTargetOptions } from "./touch-target-seed.js";

/**
 * Measure a pressable and extend its touch area to the platform minimum.
 *
 * Spread the result onto the Pressable:
 *
 *   <Pressable {...useMinTargetSlop(skin.minTarget)} onPress={…} />
 *
 * A null minimum (the web skins) returns nothing at all, so the web pays no
 * measurement cost and the Pressable gets no onLayout it does not need.
 */
export function useMinTargetSlop(
  minTarget: number | null,
  options: MinTargetOptions = {},
): { onLayout?: (event: LayoutChangeEvent) => void; hitSlop?: Insets } {
  // A caller's control declares no box, so there is no seed: the slop arrives with the
  // first layout. A later layout that differs by less than a device pixel keeps it.
  return useSeededMinTargetSlop(minTarget, undefined, options);
}
