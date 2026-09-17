// Color helpers for building style objects from tokens.

/**
 * Apply an alpha to a hex color, returning an `rgba(...)` string. Replaces the
 * engine's `bg-primary/10`-style alpha suffix: `alpha(tokens.primary, 0.1)`.
 * Accepts #rgb, #rgba, #rrggbb and #rrggbbaa. The supplied opacity replaces any
 * existing hex alpha. Finite opacity is clamped to 0..1. Invalid hex, non-finite
 * opacity and non-hex inputs (including rgba() and "transparent") pass through.
 */
export function alpha(color: string, a: number): string {
  if (!/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(color) || !Number.isFinite(a)) return color;
  const h = color.slice(1);
  const full = h.length <= 4 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

// --- Oklab mixing -----------------------------------------------------------
// The web hand-off writes its blended fills as `color-mix(in oklab, <over> <n>%,
// <base>)`. Oklab is a perceptual space, so the mix is NOT a channel-wise sRGB
// lerp: it decodes both colours to linear light, converts to Oklab, interpolates
// there, and converts back. Doing it in sRGB instead lands a visibly different
// value (2/255 per channel at the 6% weight the identity pill uses), so native
// gets the real transform here rather than an approximation of it.
//
// The matrices are Björn Ottosson's reference Oklab conversion.

/** sRGB 0..255 channel -> linear-light 0..1. */
function toLinear(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** Linear-light 0..1 -> sRGB 0..255, clamped to the displayable range. */
function toSrgb(x: number): number {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/** `#rgb` / `#rrggbb` -> the three sRGB channels, or null when it is not a hex colour. */
function hexChannels(color: string): [number, number, number] | null {
  if (color[0] !== "#") return null;
  const h = color.slice(1);
  if (h.length !== 3 && h.length !== 6) return null;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** sRGB channels -> Oklab L, a, b. */
function oklabOf([r, g, b]: [number, number, number]): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Oklab L, a, b -> sRGB channels. */
function srgbOf([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * Blend `over` into `base` by `t` (a 0..1 fraction) in the Oklab space, returning
 * an `rgb(...)` string. The RN equivalent of the hand-off's
 * `color-mix(in oklab, <over> <t*100>%, <base>)`, matching it channel for channel,
 * so a skin can transcribe a blended CSS fill without a web colour function.
 *
 * Both colours must be opaque #rgb or #rrggbb hex (the default token shape).
 * Translucent hex (#rgba or #rrggbbaa), functional colors and "transparent"
 * return `base` unchanged. This helper does not discard or blend source alpha.
 */
export function mixOklab(base: string, over: string, t: number): string {
  const from = hexChannels(base);
  const to = hexChannels(over);
  if (!from || !to) return base;
  const a = oklabOf(from);
  const b = oklabOf(to);
  const [r, g, bl] = srgbOf([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  return `rgb(${r}, ${g}, ${bl})`;
}

// --- WCAG contrast -----------------------------------------------------------
// The kit tunes its translucent fills (the brand-tinted glass puck) against the ink
// they carry, so the legibility floor is computed where the fill is chosen rather than
// pinned by hand per token. `rgba(...)`, `rgb(...)` and hex all parse; anything else
// (a "transparent", a named colour) yields null and the caller keeps its default.

/** A colour's sRGB channels and alpha, or null when it is not a hex or rgb(a) string. */
export function channelsOf(color: string): [number, number, number, number] | null {
  const hex = hexChannels(color);
  if (hex) return [hex[0], hex[1], hex[2], 1];
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])];
}

/** `tint` composited over the opaque `base` (source-over), as an `rgb(...)` string. */
export function composite(tint: string, base: string): string {
  const t = channelsOf(tint);
  const b = channelsOf(base);
  if (!t || !b) return base;
  const a = t[3];
  const ch = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  return `rgb(${ch(t[0], b[0])}, ${ch(t[1], b[1])}, ${ch(t[2], b[2])})`;
}

/** WCAG 2 relative luminance of an opaque colour (alpha is ignored). */
export function relativeLuminance(color: string): number {
  const c = channelsOf(color);
  if (!c) return 0;
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

/** WCAG 2 contrast ratio between two opaque colours (1 when either does not parse). */
export function contrastRatio(a: string, b: string): number {
  if (!channelsOf(a) || !channelsOf(b)) return 1;
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The ink a colour carries best: white or near-black, whichever contrasts more. */
export function inkOn(color: string): string {
  return contrastRatio("#ffffff", color) >= contrastRatio("#0a0a0a", color) ? "#ffffff" : "#0a0a0a";
}
