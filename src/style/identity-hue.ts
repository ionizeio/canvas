import { contrastRatio } from "./color.js";

// The Avatar's identity color, after Dark Factory's avatars (its theme/hue.ts): every
// identity owns a hue, and its disc is a diagonal blend from a pale tint of that hue to a
// deeper, warmer neighbour. Internal (not re-exported from the style barrel); the Avatar is
// its one reader, and `.tuning-harness.json` lists this file as the avatar's tunables.

/**
 * The tunables, one table (judged against the `df-avatar` reference card in
 * tools/native/liquid-motion.md). Dark Factory's own values: a 135 degree blend from
 * oklch(0.8 0.1 h) to oklch(0.6 0.17 h+35), over its ten stage hues.
 */
export const IDENTITY_GRADIENT = {
  /** The blend's direction in CSS degrees (135: top-left to bottom-right). */
  angle: 135,
  /** The pale stop at the top-left: OKLCH lightness and chroma, at the identity's hue. */
  light: { l: 0.8, c: 0.1 },
  /** The deep stop at the bottom-right: lightness, chroma, and its hue shift. */
  deep: { l: 0.6, c: 0.17, hueShift: 35 },
} as const;

/** Dark Factory's stage hues, the set an identity resolves into. */
export const IDENTITY_HUES = [20, 45, 335, 285, 255, 225, 195, 155, 115, 70] as const;

/**
 * The hue an identity string (a name, else the initials) resolves to: a stable,
 * deterministic hash (no RNG), so one person has the same color across sessions,
 * platforms and re-renders.
 */
export function identityHue(identity: string): number {
  let h = 0;
  for (let i = 0; i < identity.length; i++) h = (h * 31 + identity.charCodeAt(i)) | 0;
  return IDENTITY_HUES[Math.abs(h) % IDENTITY_HUES.length];
}

// OKLCH to sRGB hex exactly as Dark Factory converts it (theme/color.ts: OKLab to linear
// sRGB, each channel clamped before the sRGB curve), so a disc here is Dark Factory's
// disc bit for bit.
function oklch(l: number, c: number, h: number): string {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  return `#${linear
    .map((v) => {
      const x = v < 0 ? 0 : v > 1 ? 1 : v;
      const srgb = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, srgb)) * 255).toString(16).padStart(2, "0");
    })
    .join("")}`;
}

/** An identity disc: its two gradient stops, a solid stand-in, and the initials' ink. */
export interface IdentityDisc {
  /** The pale top-left stop. */
  from: string;
  /** The deep bottom-right stop. */
  to: string;
  /** The blend's midpoint, the one color that stands for the disc where a gradient cannot draw. */
  mid: string;
  /**
   * The initials' ink: white or near-black, whichever holds the better contrast against
   * BOTH stops (the kit's 4.5:1 text floor). On Dark Factory's ramp that is near-black
   * everywhere (4.59:1 at worst); its white initials measure 1.79 to 1.96:1.
   */
  ink: string;
}

const INKS = ["#ffffff", "#0a0a0a"] as const;

/** The disc for a hue. */
export function identityDisc(hue: number): IdentityDisc {
  const { light, deep } = IDENTITY_GRADIENT;
  const from = oklch(light.l, light.c, hue);
  const to = oklch(deep.l, deep.c, hue + deep.hueShift);
  const mid = oklch((light.l + deep.l) / 2, (light.c + deep.c) / 2, hue + deep.hueShift / 2);
  const worst = (ink: string) => Math.min(contrastRatio(ink, from), contrastRatio(ink, to));
  const ink = worst(INKS[0]) >= worst(INKS[1]) ? INKS[0] : INKS[1];
  return { from, to, mid, ink };
}
