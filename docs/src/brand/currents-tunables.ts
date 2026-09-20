import type { Energy } from "@ionizeio/canvas";

// The site-wide spectral currents. The existing hero orbit has its own artwork
// and clock and is deliberately independent of this background.
// Tune on /testing/currents and record the result in tools/native/liquid-motion.md.
export const CURRENTS = {
  energy: "default" as Energy,
  viewBox: { width: 1200, height: 720 },
  // Size against the longest edge so a rotating layer covers a tall phone as
  // reliably as a wide desktop. Translations below use the unpadded surface box.
  overscan: 0.14,
  samplesPerCycle: 24,
  ink: { dark: 1, light: 0.8 },
  // Broad color bands cross the content so glass has a changing backdrop to
  // sample. Keep a gentle veil for copy without erasing the center of the scene.
  veil: { opacity: 0.28, center: 0.6, fade: 0.66 },
  ribbon: { washWidth: 100, washOpacity: 0.22, bodyWidth: 42, bodyOpacity: 0.62, edgeWidth: 1.2, edgeOpacity: 0.65 },
  layers: {
    cool: {
      channel: "flight", cycles: 1, offset: 0,
      x: [-0.015, 0.025], y: [-0.015, 0.03], rotate: [-2, 2],
      scale: [1.02, 1.07], opacity: [0.55, 0.9], blur: 6,
    },
    warm: {
      channel: "drift", cycles: 5, offset: 0.072,
      x: [0.02, -0.03], y: [0.015, -0.02], rotate: [1.5, -2],
      scale: [1.03, 1.08], opacity: [0.78, 0.48], blur: 7,
    },
    violet: {
      channel: "drift", cycles: 4, offset: 0.133,
      x: [-0.01, 0.03], y: [0.02, -0.02], rotate: [-1, 2.5],
      scale: [1.05, 1.01], opacity: [0.4, 0.75], blur: 9,
    },
  },
} as const;

export type CurrentKind = keyof typeof CURRENTS.layers;
