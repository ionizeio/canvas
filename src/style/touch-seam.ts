import { createContext, useContext } from "react";
import { type Insets } from "react-native";
import { isRTL } from "./rtl.js";

// Splitting the seam between two of a component's own controls.
//
// React Native hands a point that two siblings' touch areas both admit to the LATER
// sibling: Android's TouchTargetHelper and iOS's hit test both walk a view's children from
// the last to the first and take the first that admits the point, slop included. So a slop
// that reaches into an earlier sibling's box takes the taps aimed at it: a dismiss beside an
// Undo, an eye glyph beside a clear glyph, a + beside the value it steps.
//
// Where a component places two of its own controls side by side or stacked, it knows the
// gap between them, so it splits that gap between their facing slops (splitSeam): each keeps
// what it asks for up to half the gap, and takes the rest when the other asks for less. The
// two touch areas then meet without overlapping, and neither reaches into the other's
// visible box. The geometry is the component's own (its padding, gap and fixed sizes);
// nothing here reads a parent container. Where the two controls are parts the component
// renders as components of their own (the Board's drag handle and row menu), it hands each
// its share of the seam through SeamLimit, which only those parts read. Between components
// a caller places, the kit does not split the seam: that is the caller's layout (DESIGN.md,
// Shapes).
//
// A kit mechanism, not public API: src/style/index.ts does not re-export this file.

export type Slop = Insets | number | null | undefined;
export type Sides = Required<Pick<Insets, "top" | "bottom" | "left" | "right">>;

/** A slop as its four sides, a bare number applying to each. */
export function slopSides(slop: Slop): Sides {
  if (typeof slop === "number") return { top: slop, bottom: slop, left: slop, right: slop };
  return { top: slop?.top ?? 0, bottom: slop?.bottom ?? 0, left: slop?.left ?? 0, right: slop?.right ?? 0 };
}

/**
 * Split the `gap` between two neighbors' facing sides `a` and `b`: each keeps what it asks
 * for up to half the gap, and may take the rest when the other asks for less. The results
 * never add up to more than the gap, and neither grows.
 */
export function splitSeam(a: number, b: number, gap: number): [number, number] {
  const room = Math.max(0, gap);
  const half = room / 2;
  return [Math.min(a, Math.max(half, room - b)), Math.min(b, Math.max(half, room - a))];
}

/** The physical side a row's start or end is on: a row runs right to left under RTL. */
export function inlineSide(side: "start" | "end"): "left" | "right" {
  return (side === "start") !== isRTL() ? "left" : "right";
}

function tidy(sides: Sides): Insets | undefined {
  return sides.top > 0 || sides.bottom > 0 || sides.left > 0 || sides.right > 0 ? sides : undefined;
}

/**
 * The slops of two controls that sit `gap` apart in a row, `first` before `second` in the
 * layout direction, with the seam between them split: the first's end side and the second's
 * start side. Every other side is left as it is. A missing slop asks for nothing, and so
 * leaves its neighbor the whole gap.
 */
export function rowSeam(first: Slop, second: Slop, gap: number): [Insets | undefined, Insets | undefined] {
  const end = inlineSide("end");
  const start = inlineSide("start");
  const a = slopSides(first);
  const b = slopSides(second);
  const [aEnd, bStart] = splitSeam(a[end], b[start], gap);
  return [first == null ? undefined : tidy({ ...a, [end]: aEnd }), second == null ? undefined : tidy({ ...b, [start]: bStart })];
}

/**
 * The slops of two controls stacked `gap` apart, `upper` above `lower`, with the seam split
 * between the upper one's bottom and the lower one's top.
 */
export function columnSeam(upper: Slop, lower: Slop, gap: number): [Insets | undefined, Insets | undefined] {
  const a = slopSides(upper);
  const b = slopSides(lower);
  const [aBottom, bTop] = splitSeam(a.bottom, b.top, gap);
  return [upper == null ? undefined : tidy({ ...a, bottom: aBottom }), lower == null ? undefined : tidy({ ...b, top: bTop })];
}

/** The most a kit control's slop may reach on each side, in logical sides; a side left out is not held. */
export interface SeamLimit {
  top?: number;
  bottom?: number;
  start?: number;
  end?: number;
}

const SeamLimitContext = createContext<SeamLimit | undefined>(undefined);

/**
 * Hands a kit control its share of a seam: a kit component wraps each of two of its own parts
 * that it renders as components (the Board's drag handle and row menu) in one of these, with
 * the split of the gap between them. Only a part's own pressable reads it (useSeamLimit).
 */
export const SeamLimitProvider = SeamLimitContext.Provider;

/**
 * A control's slop held to the seam its kit parent handed it (SeamLimitProvider), or the slop
 * as it is where no parent did.
 */
export function useSeamLimit(slop: Slop): Slop {
  const limit = useContext(SeamLimitContext);
  if (limit == null || slop == null) return slop;
  const sides = slopSides(slop);
  const hold = (side: number, most: number | undefined) => (most == null ? side : Math.min(side, Math.max(0, most)));
  const start = inlineSide("start");
  const end = inlineSide("end");
  return tidy({
    ...sides,
    top: hold(sides.top, limit.top),
    bottom: hold(sides.bottom, limit.bottom),
    [start]: hold(sides[start], limit.start),
    [end]: hold(sides[end], limit.end),
  });
}
