// Clip a BOUNDED Android ripple to a rounded control's corners.
//
// Why this exists (and why a same-node `overflow:"hidden"` does NOT work): a bounded
// `android_ripple` (borderless:false) is installed as the pressable's OWN background
// drawable, masked to a RECTANGLE (React Native's RippleDrawable mask is a full-bounds
// ColorDrawable — see ReactDrawableHelper.getMask). React Native implements
// `overflow:"hidden"` NOT via Android's clipToOutline but as a manual rounded path-clip
// applied only in `ViewGroup.dispatchDraw` — i.e. only to CHILD views. A view's own
// background (the ripple) is drawn in `View.draw()` BEFORE dispatchDraw, so a node can
// never clip its own ripple; the rectangle bleeds past the rounded corners. The only fix
// on this architecture is to make the ripple-bearing pressable a CHILD of a rounded,
// `overflow:"hidden"` parent, so the parent's dispatchDraw path-clip rounds the child's
// ripple. Setting `borderRadius` on that parent installs a rounded CompositeBackgroundDrawable,
// which is what makes the clip path rounded rather than a plain rect.
//
// `<RippleClip>` is that parent. It wraps a pressable and, ON ANDROID ONLY, clips it to
// the supplied `shape` (the same corner radii the pressable draws). On iOS and web there
// is no ripple to clip, so it adds no clip — it is a transparent layout passthrough that
// still owns the outer layout (`style`), keeping the node structure identical across
// platforms. Route every rounded, bounded-ripple control through it; borderless ripples
// (radial, unmasked) need no clip and must not use it.
//
// Being the control's outermost node, the one that never moves, it is also where hover
// is read (the pointer handlers of src/style/hover.tsx): a surface that lifts inside it
// would otherwise slide out from under a resting pointer.
//
// The clip also bounds the touch area, which is why it carries the child's `hitSlop`. React
// Native hit-tests a view that clips (overflow hidden or scroll) only inside its own bounds
// plus its OWN hitSlop: Android's TouchTargetHelper returns nothing for a point outside
// them and never asks the children, and iOS stops at a view that clips to its bounds. So a
// pressable's slop that reaches past this wrapper (the touch-target minimum of
// src/style/touch-target.ts) is swallowed on Android unless the wrapper admits the same
// area. Pass the insets the pressable carries: the wrapper holds the pressable (usually
// hugging it, sometimes stretched taller by a Row), so its bounds plus the same insets hold
// every point the pressable's slop reaches. On iOS the wrapper adds no clip and no
// handlers, so React Native flattens it away and the prop is inert until the wrapper turns
// into a real view; the web drops hitSlop.

import { type ReactNode } from "react";
import { Platform, StyleSheet, type Insets, type LayoutChangeEvent, type PointerEvent, type StyleProp, type ViewStyle } from "react-native";
import { View } from "./primitives.js";

// The clip itself. Kept separate (not merged into `shape`) so the rounded outline comes
// from the caller's radii while the masking is owned here.
const RIPPLE_CLIP: ViewStyle = { overflow: "hidden" };

/**
 * The wrapper's clip style: the rounded `shape` plus `overflow:"hidden"` on Android, and
 * nothing anywhere else. Pure and platform-parameterized so it is unit-testable without a
 * device (the render harness always reports `web`). `RippleClip` calls it with
 * `Platform.OS === "android"`.
 */
export function rippleClipWrapperStyle(
  shape: StyleProp<ViewStyle> | undefined,
  isAndroid: boolean,
): StyleProp<ViewStyle> {
  return isAndroid && shape != null ? [shape, RIPPLE_CLIP] : null;
}

export interface RippleClipProps {
  /**
   * The rounded corners to clip the child's bounded ripple to, matching the child node's
   * own radii (e.g. `{ borderRadius: 9999 }`, or per-corner radii for a segment). Applied
   * only on Android; omit it (or pass undefined) where the child has no bounded ripple.
   */
  shape?: StyleProp<ViewStyle>;
  /**
   * Outer layout composition carried on the wrapper so it stays the outermost node on every
   * platform: block/full width, flex, `alignSelf`, and the consumer's own `style`. Positioning
   * lives here, not on the wrapped pressable, so layout is identical with or without the clip.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Layout observation on the wrapper (the control's outermost node), so a parent that
   * positions its children — a tab row scrolling the active trigger into view — measures
   * the same frame on every platform, clip or no clip.
   */
  onLayout?: (event: LayoutChangeEvent) => void;
  /**
   * Pointer enter and leave on the wrapper: the hover target of a control whose surface
   * moves on hover (`useHover` in src/style/hover.tsx), since the wrapper never moves.
   */
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  /**
   * The touch slop of the pressable inside, the same insets it carries (a
   * `useMinTargetSlop` result's `hitSlop`, or the skin's static slop). The Android clip
   * would otherwise cut the pressable's touch area at the wrapper's edge: a clipping view
   * is hit-tested only inside its own bounds plus its own slop (see the file header).
   * Omit it when the pressable has no slop.
   */
  hitSlop?: Insets | number;
  children: ReactNode;
}

/** Rounded clip parent for a bounded-ripple pressable. See the file header for the why. */
export function RippleClip({ shape, style, onLayout, onPointerEnter, onPointerLeave, hitSlop, children }: RippleClipProps): ReactNode {
  return (
    <View hitSlop={hitSlop} onLayout={onLayout} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} style={[rippleClipWrapperStyle(shape, Platform.OS === "android"), style]}>{children}</View>
  );
}

// Every corner-radius key, so `cornerRadii` matches a per-corner shape (a split button, a
// top-only field) as well as a uniform `borderRadius`.
const RADIUS_KEYS = [
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopStartRadius",
  "borderTopEndRadius",
  "borderBottomStartRadius",
  "borderBottomEndRadius",
] as const;

/**
 * Extract only the corner-radius keys from a resolved style, so a `<RippleClip>` parent can
 * clip to the SAME corners its child draws with no hard-coded, drift-prone radius. Pass the
 * child's own (static) shape style: `<RippleClip shape={cornerRadii(skin.trigger(tokens))}>`.
 */
export function cornerRadii(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) as Record<string, unknown> | undefined;
  if (!flat) return {};
  const out: Record<string, unknown> = {};
  for (const key of RADIUS_KEYS) {
    if (flat[key] != null) out[key] = flat[key];
  }
  return out as ViewStyle;
}

/**
 * Split an elevation/shadow style for an ELEVATED node whose ripple is being clipped by a
 * `<RippleClip>` parent. On Android the parent's child-clip would cut the child's own elevation
 * shadow, so the Android `elevation` must move to the PARENT (whose own elevation shadow, drawn
 * around its outline, is not clipped by its child-overflow). The iOS `shadow*` props must stay on
 * the child, exactly where they are today, so iOS is byte-identical.
 *
 * Returns `{ parent, child }`:
 *  - `parent`: the Android `elevation` to spread on the RippleClip (null off Android).
 *  - `child`: the original shadow with `elevation` zeroed on Android (so it is not drawn twice),
 *    and returned UNCHANGED off Android (iOS keeps its shadow* verbatim).
 *
 * Usage: `const { parent, child } = splitElevation(skin.elevation(e, tokens));`
 * then `<RippleClip shape={...} style={parent}><Pressable style={[base, child, ...]} .../>`.
 */
export function splitElevation(shadowStyle: StyleProp<ViewStyle>): {
  parent: ViewStyle | null;
  child: ViewStyle;
} {
  const flat = (StyleSheet.flatten(shadowStyle) ?? {}) as ViewStyle;
  if (Platform.OS !== "android") return { parent: null, child: flat };
  const { elevation, ...rest } = flat as ViewStyle & { elevation?: number };
  return { parent: elevation ? { elevation } : null, child: { ...rest, elevation: 0 } };
}
