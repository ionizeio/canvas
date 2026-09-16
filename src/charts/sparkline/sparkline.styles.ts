import { type Size } from "./sparkline.shared.js";

// Co-located Sparkline skins. Sparkline is a "Shared" treatment: a token-colored
// bar strip renders identically on every platform, so iosSkin and androidSkin
// reference the same bar radius / gap / heights as webSkin.

export interface SparklineSkin {
  /** Corner radius of each bar's data end (the top; the baseline stays square), in px. */
  barRadius: number;
  /** Gap between bars, in px. */
  gap: number;
  /** Strip height per size, in px (the tallest bar reaches this). */
  height: Record<Size, number>;
}

/**
 * The default strip height, shared by every skin.
 *
 * Exported because it is the height a SIBLING strip has to reserve to line up
 * with a Sparkline: Stats draws a composition strip in the same slot as the
 * trend strip, and a row that mixes the two keeps one card height only if both
 * occupy this.
 */
export const SPARK_STRIP_HEIGHT = 24;

export const webSkin: SparklineSkin = {
  barRadius: 4,
  gap: 2,
  height: { compact: 16, default: SPARK_STRIP_HEIGHT, tall: 32 },
};

export const iosSkin: SparklineSkin = webSkin;
export const androidSkin: SparklineSkin = webSkin;
