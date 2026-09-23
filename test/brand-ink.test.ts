import { describe, expect, it } from "bun:test";
import { brandInk, brandTint, surfaceUnderFill, BRAND_INK_CONTRAST } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { composite, contrastRatio, inkOn } from "../src/style/color.ts";
import { glassByScheme, lightColors, type ColorTokens } from "../src/style/tokens.ts";

// A brand-tinted glass puck is solved so the ink the SKIN paints on it keeps 4.5:1 over
// the page. The ink comes from the token pair the fill belongs to, not from a guess:
// on a violet where black is the stronger ink, `inkOn` picks black while the skin paints
// white on it.
const violet = "#7261e4";
const tokens: ColorTokens = { ...lightColors, primary: violet, "primary-foreground": "#ffffff", action: "#21804b", "action-foreground": "#ffffff" };

describe("brandInk", () => {
  it("returns the ink of the pair the fill belongs to, whatever the stronger ink would be", () => {
    // Dark Factory's raw violet: black is the stronger ink (4.95:1 against white's 4.00),
    // yet a skin pairing it with white paints white.
    const raw = "#7b6cf0";
    expect(inkOn(raw)).not.toBe("#ffffff");
    expect(brandInk({ ...tokens, primary: raw }, raw)).toBe("#ffffff");
    expect(brandInk(tokens, violet)).toBe("#ffffff");
    expect(brandInk(tokens, violet.toUpperCase())).toBe("#ffffff");
    expect(brandInk(tokens, "#21804b")).toBe("#ffffff");
    expect(brandInk(tokens, tokens.destructive)).toBe(tokens["destructive-foreground"]);
    expect(brandInk(tokens, tokens.success)).toBe(tokens["success-foreground"]);
    expect(brandInk(tokens, tokens.warning)).toBe(tokens["warning-foreground"]);
  });

  it("falls back to the stronger ink for a fill outside the pairs (an avatar hue)", () => {
    expect(brandInk(tokens, "#14b8a6")).toBe(inkOn("#14b8a6"));
  });
});

describe("the brand under-fill", () => {
  it("keeps the painted ink at 4.5:1 over the page", () => {
    const fill = surfaceUnderFill(glassByScheme.light, "control", violet, undefined, tokens);
    expect(fill).toBe(brandTint(violet, tokens.background, "#ffffff"));
    expect(contrastRatio(composite(fill, tokens.background), "#ffffff")).toBeGreaterThanOrEqual(BRAND_INK_CONTRAST);
  });
});
