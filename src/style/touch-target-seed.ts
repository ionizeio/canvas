import { useMemo, useState } from "react";
import { PixelRatio, type Insets, type LayoutChangeEvent, type ViewStyle } from "react-native";

// The touch-target measurement behind useMinTargetSlop (src/style/touch-target.ts), with
// one addition the kit's own controls use: a seed from the box their skin fixes.
//
// A measured slop arrives after the first layout (onLayout, then a commit that changes only
// hitSlop), and a commit that changes only hitSlop lays nothing out. A native ancestor that
// does not clip admits a descendant's slop only through the overflow React Native recorded
// at its last layout (YogaLayoutableShadowNode adds each child's hitSlop to it), so one that
// hugs the control can keep a record without the slop until something lays it out again: a
// Tooltip's own root (a native view, for its pointer handlers) around a Button, a component
// root that carries a testID, the CodeBlock's floating copy wrapper. Seeding the slop from
// the control's declared box puts it in place before the first layout, so every ancestor
// records it from the first frame; the measurement then refines it. A seed must never be
// smaller than the measured slop, or an ancestor's record misses the difference: seed from a
// box no larger than the control renders (its fixed size, or the least its padding, border
// and one line of its label add up to).
//
// A kit mechanism, not public API: src/style/index.ts does not re-export this file, and
// touch-target.ts re-exports only minTargetSlop and MinTargetOptions from it.

export interface MinTargetOptions {
  /**
   * Which axes to extend. "both" is the default and is right for a control with space
   * around it. "vertical" is for a control that abuts its siblings horizontally (tabs,
   * breadcrumb links, a segmented track): extending sideways there would overlap the
   * neighbor's slop and make a tap near the seam ambiguous.
   */
  axis?: "both" | "vertical";
}

/**
 * The insets that bring a `width` x `height` control up to `minTarget`, or undefined
 * when it already meets it. Half the shortfall per side, so the control stays centered
 * in its own touch area.
 */
export function minTargetSlop(
  minTarget: number,
  width: number,
  height: number,
  options: MinTargetOptions = {},
): Insets | undefined {
  const h = options.axis === "vertical" ? 0 : Math.max(0, (minTarget - width) / 2);
  const v = Math.max(0, (minTarget - height) / 2);
  return h > 0 || v > 0 ? { top: v, bottom: v, left: h, right: h } : undefined;
}

/** The least box a control renders at, from its skin: either side unknown when nothing bounds it. */
export interface TargetBox {
  width?: number;
  height?: number;
}

/** The slop a declared box needs; an unknown side seeds nothing on that axis. */
export function seedSlop(minTarget: number, box: TargetBox, options: MinTargetOptions = {}): Insets | undefined {
  return minTargetSlop(minTarget, box.width ?? minTarget, box.height ?? minTarget, options);
}

const num = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);

/**
 * The least height a line of text of `lineHeight` renders at: the line itself, or less under
 * a system font scale below 1 (React Native scales the line height with the font).
 */
export function leastLine(lineHeight: number): number {
  return lineHeight * Math.min(1, PixelRatio.getFontScale());
}

type Edge = "top" | "bottom" | "start" | "end";
const LOGICAL: Record<Edge, { name: string; physical: string; axis: "Vertical" | "Horizontal" }> = {
  top: { name: "Top", physical: "Top", axis: "Vertical" },
  bottom: { name: "Bottom", physical: "Bottom", axis: "Vertical" },
  start: { name: "Start", physical: "Left", axis: "Horizontal" },
  end: { name: "End", physical: "Right", axis: "Horizontal" },
};

/** A side's padding plus border, resolved the way Yoga does (a logical edge before a physical one). */
function inset(style: Record<string, unknown>, edge: Edge): number {
  const { name, physical, axis } = LOGICAL[edge];
  const padding = num(style[`padding${name}`]) ?? num(style[`padding${physical}`]) ?? num(style[`padding${axis}`]) ?? num(style.padding) ?? 0;
  const border = num(style[`border${name}Width`]) ?? num(style[`border${physical}Width`]) ?? num(style.borderWidth) ?? 0;
  return padding + border;
}

/**
 * The least box a control's resolved style renders at: a numeric width or height as it is,
 * and otherwise its padding and border on that axis (plus one line of `lineHeight` for the
 * height), raised to a numeric minWidth or minHeight. Content only makes the control bigger,
 * which keeps the seed at or above the measured slop. Pass `lineHeight` only when the
 * control renders a line of label; a system font scale under 1 shrinks that line, so it
 * counts at the scaled size.
 */
export function styleBox(style: ViewStyle, lineHeight?: number): TargetBox {
  const s = style as Record<string, unknown>;
  const line = lineHeight == null ? 0 : leastLine(lineHeight);
  const floor = (fixed: unknown, least: unknown, sum: number) => num(fixed) ?? Math.max(num(least) ?? 0, sum);
  return {
    width: floor(s.width, s.minWidth, inset(s, "start") + inset(s, "end")),
    height: floor(s.height, s.minHeight, inset(s, "top") + inset(s, "bottom") + line),
  };
}

/** Whether two slops differ by less than a device pixel on every side (a missing slop counts as zero). */
function sameSlop(a: Insets | undefined, b: Insets | undefined): boolean {
  const pixel = 1 / PixelRatio.get();
  return (["top", "bottom", "left", "right"] as const).every((side) => Math.abs((a?.[side] ?? 0) - (b?.[side] ?? 0)) < pixel);
}

/**
 * Measure a pressable and extend its touch area to the platform minimum, seeded from its
 * declared `box` when the skin gives one (see the file header). useMinTargetSlop is this
 * without a box. A changed box seeds again, until the next layout measures it.
 */
export function useSeededMinTargetSlop(
  minTarget: number | null,
  box?: TargetBox,
  options: MinTargetOptions = {},
): { onLayout?: (event: LayoutChangeEvent) => void; hitSlop?: Insets } {
  const axis = options.axis;
  const width = box?.width;
  const height = box?.height;
  const key = box == null ? "" : `${width}x${height}`;
  const seed = useMemo(
    () => (minTarget == null || key === "" ? undefined : seedSlop(minTarget, { width, height }, { axis })),
    [minTarget, key, width, height, axis],
  );
  // The measurement, tagged with the box it was taken for: a box that changes (a Button that
  // turns small or gains an icon) starts from its new seed rather than the old measurement.
  const [state, setState] = useState<{ key: string; slop: Insets | undefined }>(() => ({ key, slop: seed }));
  const hitSlop = state.key === key ? state.slop : seed;
  if (minTarget == null) return {};
  return {
    hitSlop,
    onLayout: (event: LayoutChangeEvent) => {
      const { width: w, height: h } = event.nativeEvent.layout;
      const next = minTargetSlop(minTarget, w, h, { axis });
      // Keep the SAME reference unless the insets changed by a device pixel or more:
      // onLayout fires on every layout pass (a fresh object each time would re-render
      // forever), and a laid-out box is snapped to the pixel grid, so a seed from the
      // declared box differs from the measurement by a fraction of a pixel.
      setState((previous) => {
        const current = previous.key === key ? previous.slop : seed;
        if (!sameSlop(current, next)) return { key, slop: next };
        return previous.key === key ? previous : { key, slop: current };
      });
    },
  };
}
