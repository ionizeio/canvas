// Keep token tinting on the kit's validated color helper, including hex alpha.
export { alpha } from "@ionizeio/canvas";

// Convert an HSL color to a 6-digit hex string. Pure math (no DOM, RN-safe), so
// the chart/accent palettes (authored as HSL on the colors page) can show the
// hex they resolve to alongside the HSL. h in degrees, s/l in percent.
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert a CSS HSL triplet string ("12 76% 61%") to hex — the shape the chart
// palette stores its values in.
export function hslTripletToHex(triplet: string): string {
  const [h, s, l] = triplet.replace(/%/g, "").trim().split(/\s+/).map(Number);
  return hslToHex(h, s, l);
}

// Pick black or white for a label sitting on top of a hex fill, using the WCAG
// relative-luminance crossover (~0.179) where black and white read equally well.
// Lets the L/D markers on a split swatch stay legible on any color.
export function readableText(hex: string): string {
  const lum =
    0.2126 * srgbToLinear(parseInt(hex.replace("#", "").slice(0, 2), 16)) +
    0.7152 * srgbToLinear(parseInt(hex.replace("#", "").slice(2, 4), 16)) +
    0.0722 * srgbToLinear(parseInt(hex.replace("#", "").slice(4, 6), 16));
  return lum > 0.179 ? "#000000" : "#ffffff";
}

// --- Format conversions for the token reference ------------------------------
// The colors page derives every notation from the one color a swatch actually
// renders, so the hex/hsl/oklch shown always describe the same pixel — and the
// same alpha, for translucent fills — and never drift apart. All pure math (no
// DOM), so it runs identically on native and web.

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Parse a hex (#rgb / #rgba / #rrggbb / #rrggbbaa) or rgb()/rgba() string into 0-255
// channels plus a 0-1 alpha, so translucent token fills convert like opaque ones.
function parseColor(value: string): { r: number; g: number; b: number; a: number } {
  const v = value.trim();
  if (v.startsWith("#")) {
    let h = v.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const n = v.replace(/rgba?\(|\)/gi, "").split(/[\s,/]+/).map((s) => parseFloat(s)).filter((x) => !Number.isNaN(x));
  return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n.length > 3 ? n[3] : 1 };
}

// A ` / a` alpha suffix for hsl()/oklch(), omitted when fully opaque.
function alphaSuffix(a: number): string {
  return a < 1 ? ` / ${Math.round(a * 100) / 100}` : "";
}

function channelHex(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0");
}

// → `#rrggbb`, or `#rrggbbaa` when translucent.
function toHexString(r: number, g: number, b: number, a: number): string {
  const base = `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;
  return a < 1 ? `${base}${channelHex(a * 255)}` : base;
}

// → CSS `hsl(H S% L%)`, with a ` / a` alpha when translucent.
function toHslString(r: number, g: number, b: number, a: number): string {
  const [rr, gg, bb] = [r, g, b].map((v) => v / 255);
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%${alphaSuffix(a)})`;
}

// → CSS `oklch(L C H)`, with a ` / a` alpha when translucent, via Björn Ottosson's
// sRGB → OKLab transform.
function toOklchString(r: number, g: number, b: number, a: number): string {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const aa = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(aa * aa + bb * bb);
  let H = Math.atan2(bb, aa) * (180 / Math.PI);
  if (H < 0) H += 360;
  const hue = C < 0.0005 ? 0 : Math.round(H); // hue is undefined for achromatic colors
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${hue}${alphaSuffix(a)})`;
}

// Wrap a hex string as `hex(#rrggbb)` so it lines up with the hsl()/oklch()
// function syntax used elsewhere on the colors page. `hex()` is a display
// convention here, not a real CSS function. Non-hex values pass through unchanged.
export function wrapHex(value: string): string {
  return value.startsWith("#") ? `hex(${value})` : value;
}

// All three notations for a single color value (hex or rgb/rgba), derived from it
// so they are always mutually consistent — alpha included for translucent fills.
// Returned in display order: hex, hsl, oklch.
export function colorFormats(value: string): string[] {
  const { r, g, b, a } = parseColor(value);
  return [wrapHex(toHexString(r, g, b, a)), toHslString(r, g, b, a), toOklchString(r, g, b, a)];
}
