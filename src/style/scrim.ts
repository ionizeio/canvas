import { alpha } from "./color.js";
import type { ColorTokens } from "./tokens.js";

/**
 * The fill of a modal backdrop: the theme's `scrim` role (Dark Factory's tinted dim,
 * the same on every platform), or, for a legacy token map without one, black at the
 * skin's own alpha. A backdrop that fades in paints this color and animates its opacity
 * from 0 to 1, so the color's own alpha is the resting dim.
 */
export function scrimFill(tokens: ColorTokens, legacyAlpha: number): string {
  return tokens.scrim ?? alpha("#000000", legacyAlpha);
}
