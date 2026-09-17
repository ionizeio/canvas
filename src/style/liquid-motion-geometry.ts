import type { LayoutRectangle } from "react-native";

/** Direction weights describe decorative deformation, never the semantic host. */
export interface LiquidDirection {
  horizontal: number;
  vertical: number;
}

export const HORIZONTAL_LIQUID_DIRECTION: LiquidDirection = { horizontal: 1, vertical: 0 };

/**
 * Resolve motion relative to the measured extent along its travel direction.
 * Horizontal pilots retain their width normalization. Vertical travel uses
 * height, and diagonal travel projects both dimensions without a rotation host.
 */
export function liquidTravel(
  previous: LayoutRectangle,
  next: LayoutRectangle,
  elapsed: number,
  followsPointer: boolean,
  pressed: boolean,
  previousDirection: LiquidDirection = HORIZONTAL_LIQUID_DIRECTION,
) {
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const distance = Math.hypot(dx, dy);
  const horizontal = distance === 0 ? previousDirection.horizontal : (dx / distance) ** 2;
  const vertical = distance === 0 ? previousDirection.vertical : (dy / distance) ** 2;
  const span = Math.max(1, Math.hypot(
    Math.max(previous.width, next.width) * Math.sqrt(horizontal),
    Math.max(previous.height, next.height) * Math.sqrt(vertical),
  ));
  // Pointer samples use elapsed time; selection and toggle keep their original
  // spring feel independently of how long the control rested before activation.
  const timeScale = followsPointer ? 16 / Math.max(8, Math.min(64, elapsed)) : 1;
  const impulse = followsPointer && !pressed ? 0 : 18 * Math.min(1.25, distance / span * timeScale);
  return { direction: { horizontal, vertical }, impulse };
}
