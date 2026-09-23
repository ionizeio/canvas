// The web glass material: Dark Factory's plain frost, the one material a browser
// renders under `<ThemeProvider glass>` (decision 5b of the Dark Factory direction:
// it replaced the Chromium lens). This table is the only place its numbers live, the
// tunables the tuning harness judges against the `df-frost` reference card
// (tools/native/liquid-motion.md; harness route /testing/materials). The gate in
// .tuning-harness.json refuses a push that changes a value here without an evidence row.
//
// iOS Liquid Glass and the Android blur do not read this file: their tints are the
// public `glassByScheme` (glass-tints.ios.ts, glass-tints.android.ts), unchanged.

import type { ColorScheme, GlassTokens } from "../tokens.js";
import type { GlassLayer } from "./glass-surface.shared.js";

export const WEB_FROST = {
  /** The backdrop blur in px: DF's shell, `blur(24px)`, with no saturation shift. */
  blur: 24,
  /**
   * A clear surface (a field on its pane, a pill) frosts nothing: DF draws its fields
   * as an unblurred translucent fill, so the backdrop reads through them unsoftened.
   */
  clearBlur: 0,
  /** The sheer content treatment: the layer's fill drawn at this opacity. */
  sheerFillOpacity: 0.75,
  /** The rim: one inset hairline, no specular highlight and no refraction. */
  rimWidth: 1,
  /** DF's shell line, the rim on the functional and content layers. */
  shellLine: { light: "rgba(255, 255, 255, 0.75)", dark: "rgba(255, 255, 255, 0.08)" } as Record<ColorScheme, string>,
} as const;

/**
 * The layer tints: DF's shell over its pastel page for the functional layer (white 0.52,
 * and white 0.045 in dark), DF's input fill for the control puck (0.70, and 0.06 in dark),
 * and denser content and dense panes, seeded between DF's shell and its opaque card so
 * text keeps its contrast (test/glass-tint.test.tsx holds the ordering and the floors).
 */
export const WEB_TINTS: Record<ColorScheme, GlassTokens> = {
  light: {
    "glass-tint": "rgba(255, 255, 255, 0.52)",
    "glass-tint-content": "rgba(255, 255, 255, 0.72)",
    "glass-tint-control": "rgba(255, 255, 255, 0.70)",
    "glass-tint-dense": "rgba(255, 255, 255, 0.92)",
  },
  dark: {
    "glass-tint": "rgba(255, 255, 255, 0.045)",
    "glass-tint-content": "rgba(37, 39, 65, 0.72)",
    "glass-tint-control": "rgba(255, 255, 255, 0.06)",
    "glass-tint-dense": "rgba(37, 39, 65, 0.92)",
  },
};

/**
 * The rim colour for a layer: DF's shell line on the floating and content layers, and
 * the palette's hairline on controls and the dense menus, which DF edges with its line.
 */
export function webRimColor(layer: GlassLayer, scheme: ColorScheme, border: string): string {
  return layer === "functional" || layer === "content" ? WEB_FROST.shellLine[scheme] : border;
}
