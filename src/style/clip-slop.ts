import { useState } from "react";
import { type Insets, type LayoutChangeEvent, type LayoutRectangle } from "react-native";

// The touch slop a clipping node carries so the pressables inside it keep theirs.
//
// React Native hit-tests a view that clips (overflow hidden or scroll) only inside its own
// bounds plus its OWN hitSlop: Android's TouchTargetHelper never asks the children about a
// point outside them, and iOS stops at a view that clips to its bounds. So a pressable's
// slop that reaches past a clipping ancestor is cut at the ancestor's edge. Where the
// ancestor and the pressable hug the same box (RippleClip) the ancestor simply passes the
// pressable's own slop. Where they do not (a pill holding a body and a remove glyph), the
// ancestor carries the part of each pressable's slop rectangle that reaches past it, which
// takes both boxes: this measures them.
//
// A kit mechanism, not public API: src/style/index.ts does not re-export this file.

type Slop = Insets | number | null | undefined;

/** A slop as its four sides, a bare number applying to each. */
export function slopSides(slop: Slop): Required<Pick<Insets, "top" | "bottom" | "left" | "right">> {
  if (typeof slop === "number") return { top: slop, bottom: slop, left: slop, right: slop };
  return { top: slop?.top ?? 0, bottom: slop?.bottom ?? 0, left: slop?.left ?? 0, right: slop?.right ?? 0 };
}

/**
 * The slop a clipping node of `size` must carry so each child keeps its own: per side, the
 * furthest any child's slop rectangle reaches past the node's edge. `frame` is the child's
 * layout inside the node (onLayout's x and y are measured from the node's own corner). A
 * child not yet measured adds nothing. Undefined when no slop reaches past.
 */
export function clipSlop(
  size: { width: number; height: number } | undefined,
  children: ReadonlyArray<{ frame: LayoutRectangle | undefined; slop: Slop }>,
): Insets | undefined {
  if (size == null) return undefined;
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;
  for (const { frame, slop } of children) {
    if (frame == null) continue;
    const s = slopSides(slop);
    top = Math.max(top, s.top - frame.y);
    left = Math.max(left, s.left - frame.x);
    bottom = Math.max(bottom, frame.y + frame.height + s.bottom - size.height);
    right = Math.max(right, frame.x + frame.width + s.right - size.width);
  }
  return top > 0 || bottom > 0 || left > 0 || right > 0 ? { top, bottom, left, right } : undefined;
}

const CLIP = "clip";

/**
 * Measure a clipping node and the slop-bearing pressables directly inside it, and return
 * the slop the node must carry. `enabled` is whether the node clips at all (a skin that
 * leaves it unclipped cuts nothing, so nothing is measured). Spread `measure()` on the node
 * and `measure(key)` on each pressable, then pass `slop({ key: theirSlop })` as the node's
 * hitSlop.
 */
export function useClipSlop(enabled: boolean): {
  measure: (key?: string) => { onLayout?: (event: LayoutChangeEvent) => void };
  slop: (children: Record<string, Slop>) => Insets | undefined;
} {
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  return {
    measure: (key = CLIP) => enabled ? {
      onLayout: (event: LayoutChangeEvent) => {
        const next = event.nativeEvent.layout;
        // Keep the same object when nothing moved: onLayout fires on every layout pass.
        setFrames((prev) => {
          const was = prev[key];
          return was && was.x === next.x && was.y === next.y && was.width === next.width && was.height === next.height
            ? prev
            : { ...prev, [key]: next };
        });
      },
    } : {},
    slop: (children) => enabled
      ? clipSlop(frames[CLIP], Object.entries(children).map(([key, slop]) => ({ frame: frames[key], slop })))
      : undefined,
  };
}
