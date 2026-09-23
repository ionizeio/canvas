// The rendered weight of a shadow: what the eye sees next to the surface, not the alpha
// the value spells.
//
// The old gate capped a shadow's nominal alpha at 0.20, which was exact for the ladder it
// was written for (a zero-offset, zero-spread halo reaches its full alpha at the box's
// edge). It is wrong for Dark Factory's shades in both directions. A negative spread tucks
// most of the shade under the box: DF's card spells 0.22 but renders a peak of about 0.09
// where it meets the page. And a dark palette needs black at 0.5 to show any depth at all
// on a near-black card. So the gate measures the darkest point a layer actually renders
// outside its box and bounds the contrast that point makes with the surface it falls on.
//
// The bound is the old rule's own limit, computed rather than restated: black at 0.20,
// unblurred, on white (#cccccc against #ffffff, 1.6:1). White is the worst backdrop for a
// shade, so every shadow the old rule admitted still passes.

import { composite, contrast, rgba, type Rgba } from "./text-beds.ts";
import { stripComments, pxValue } from "./css-tokens.ts";

export interface ShadeLayer {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  /** The layer's colour as written (rgba(), rgb() or hex). */
  color: string;
}

/** Split a box-shadow into its layers, keeping each layer's colour. `none` is no layers. */
export function shadeLayers(raw: string): ShadeLayer[] {
  const value = stripComments(raw).trim();
  if (value === "" || value === "none") return [];
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);

  const layers: ShadeLayer[] = [];
  for (const part of parts) {
    const color = /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/i.exec(part)?.[0];
    if (!color) continue;
    const lengths = part
      .replace(color, " ")
      .replace(/\binset\b/g, " ")
      .trim()
      .split(/\s+/)
      .map((t) => pxValue(t))
      .filter((n): n is number => n !== null);
    if (lengths.length < 2) continue;
    layers.push({ inset: /\binset\b/.test(part), x: lengths[0], y: lengths[1], blur: lengths[2] ?? 0, spread: lengths[3] ?? 0, color });
  }
  return layers;
}

/** The standard normal CDF, from the Abramowitz and Stegun erf approximation (error < 1.5e-7). */
function phi(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * The darkest alpha a layer paints outside its box. The shade is the box grown by the
 * spread, moved down by y and blurred with sigma = blur / 2, and a box-shadow is not drawn
 * under the box itself, so the darkest visible point is where the box's lower edge meets
 * the blurred shade: alpha x PHI((y + spread) / sigma). With no blur the shade is a hard
 * band, full alpha if it reaches past the edge and nothing otherwise.
 */
export function peakAlpha(layer: ShadeLayer): number {
  const alpha = rgba(layer.color)[3];
  const reach = layer.y + layer.spread;
  if (layer.blur === 0) return reach > 0 || layer.spread > 0 ? alpha : 0;
  return alpha * phi(reach / (layer.blur / 2));
}

/** The contrast the layer's darkest rendered point makes with the surface it falls on. */
export function renderedContrast(layer: ShadeLayer, surface: string): number {
  const [r, g, b] = rgba(layer.color);
  const point: Rgba = [r, g, b, peakAlpha(layer)];
  const bed = rgba(surface);
  return contrast(composite(point, bed), bed);
}

/** The old nominal cap as a rendered contrast: black at 0.20, unblurred, on white. */
export const SHADE_LIMIT = contrast(composite(rgba("rgba(0, 0, 0, 0.2)"), rgba("#ffffff")), rgba("#ffffff"));

/**
 * A zero-blur layer with no offset is a ring (a hairline drawn as a shadow). It is a
 * border, judged by the border rules, not a shade.
 */
export function isRing(layer: ShadeLayer): boolean {
  return layer.blur === 0 && layer.x === 0 && layer.y === 0;
}
