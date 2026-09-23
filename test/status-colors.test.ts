import { describe, expect, it } from "bun:test";
import { composite, contrastRatio } from "../src/style/color.ts";
import { statusColors, type StatusColorTone } from "../src/style/status.ts";
import { lightColors } from "../src/style/tokens.ts";
import { LOOKS } from "./fixtures/looks.ts";

// statusColors is the one place a toned surface reads its colors (src/style/status.ts):
// every tone's ink names the tone in text over its own wash and over a plain surface, and
// its dot marks it beside text. The ink is held to 4.5:1 (text), the dot to 3:1 (a
// non-text mark, WCAG 1.4.11), on the card and on the page, in every palette the kit ships.

const TONES: StatusColorTone[] = ["success", "warning", "error", "info", "neutral"];

describe("statusColors", () => {
  for (const look of LOOKS) {
    const t = look.tokens;
    for (const tone of TONES) {
      it(`keeps the ${tone} ink and dot legible in ${look.name}`, () => {
        const { ink, wash, dot } = statusColors(t, tone);
        for (const surface of [t.card, t.background]) {
          const bed = composite(wash, surface);
          expect(contrastRatio(ink, bed)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(dot, surface)).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }

  it("reads the theme's roles, so an override repaints every toned surface", () => {
    const tokens = { ...lightColors, success: "#0f6b3a", "success-soft": "rgba(15, 107, 58, 0.1)" };
    expect(statusColors(tokens, "success")).toEqual({ ink: "#0f6b3a", wash: "rgba(15, 107, 58, 0.1)", dot: "#0f6b3a" });
    expect(statusColors(tokens, "info").dot).toBe(tokens.primary);
    expect(statusColors(tokens, "error").ink).toBe(tokens["destructive-text"]);
  });

  it("falls back to Dark Factory's wash alphas when a map omits the soft roles", () => {
    const { "success-soft": _s, "warning-soft": _w, "destructive-soft": _d, "primary-soft": _p, ...legacy } = lightColors;
    expect(statusColors(legacy, "success").wash).toMatch(/^rgba\(.*0\.12\)$/);
    expect(statusColors(legacy, "warning").wash).toMatch(/^rgba\(.*0\.18\)$/);
    expect(statusColors(legacy, "error").wash).toMatch(/^rgba\(.*0\.12\)$/);
    expect(statusColors(legacy, "info").wash).toMatch(/^rgba\(.*0\.14\)$/);
  });
});
