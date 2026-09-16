import { describe, it, expect } from "bun:test";
import { alpha, mixOklab } from "../src/style/color.ts";
import { lightColors, darkColors } from "../src/style/tokens.ts";

describe("alpha", () => {
  it("converts a 6-digit hex to rgba with the given alpha", () => {
    expect(alpha("#4f46e5", 0.1)).toBe("rgba(79, 70, 229, 0.1)");
    expect(alpha("#000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
    expect(alpha("#ffffff", 0)).toBe("rgba(255, 255, 255, 0)");
  });

  it("expands a 3-digit hex before converting", () => {
    expect(alpha("#fff", 1)).toBe("rgba(255, 255, 255, 1)");
    expect(alpha("#f00", 0.25)).toBe("rgba(255, 0, 0, 0.25)");
  });

  it("replaces existing hex alpha consistently in short and long notation", () => {
    expect(alpha("#0f08", 0.12)).toBe("rgba(0, 255, 0, 0.12)");
    expect(alpha("#00ff0088", 0.12)).toBe("rgba(0, 255, 0, 0.12)");
    expect(alpha("#AbCd", 1)).toBe("rgba(170, 187, 204, 1)");
    expect(alpha("#AABBCC00", 1)).toBe("rgba(170, 187, 204, 1)");
  });

  it("does not emit invalid channels or opacity for malformed input", () => {
    for (const color of ["", "#", "#ff", "#fffff", "#1234567", "#123456789", "#ggg", "#12zz00", "#12345z00"]) {
      expect(alpha(color, 0.5)).toBe(color);
    }
    for (const opacity of [NaN, Infinity, -Infinity]) expect(alpha("#123456", opacity)).toBe("#123456");
    expect(alpha("#123456", -0.2)).toBe("rgba(18, 52, 86, 0)");
    expect(alpha("#123456", 1.2)).toBe("rgba(18, 52, 86, 1)");
  });

  it("returns non-hex values unchanged (already-translucent tokens, transparent)", () => {
    expect(alpha("transparent", 0.5)).toBe("transparent");
    expect(alpha("rgba(0, 0, 0, 0.2)", 0.5)).toBe("rgba(0, 0, 0, 0.2)");
    expect(alpha("hsl(0 0% 0%)", 0.5)).toBe("hsl(0 0% 0%)");
  });
});

describe("mixOklab", () => {
  // The web hand-off writes its blended fills as `color-mix(in oklab, <over> n%,
  // <base>)`. Oklab is perceptual, so the mix is not a channel-wise sRGB lerp:
  // both colours go to linear light, then to Oklab, and the interpolation happens
  // there. These lock the transform against the reference conversion.
  it("matches the CSS engine at the midpoint of black and white", () => {
    // The textbook Oklab result: L interpolates to 0.5, which is rgb(99, 99, 99),
    // not the sRGB lerp's rgb(128, 128, 128).
    expect(mixOklab("#000000", "#ffffff", 0.5)).toBe("rgb(99, 99, 99)");
    expect(mixOklab("#ffffff", "#000000", 0.5)).toBe("rgb(99, 99, 99)");
  });

  it("returns the endpoints exactly at t = 0 and t = 1", () => {
    expect(mixOklab("#f4f4f5", "#09090b", 0)).toBe("rgb(244, 244, 245)");
    expect(mixOklab("#f4f4f5", "#09090b", 1)).toBe("rgb(9, 9, 11)");
  });

  it("computes the identity pill's 6% open fill in both schemes", () => {
    // color-mix(in oklab, var(--foreground) 6%, var(--secondary)) per scheme.
    expect(mixOklab(lightColors.secondary, lightColors.foreground, 0.06)).toBe("rgb(230, 231, 233)");
    expect(mixOklab(darkColors.secondary, darkColors.foreground, 0.06)).toBe("rgb(44, 46, 50)");
  });

  it("lands away from the sRGB channel lerp it replaces", () => {
    // The sRGB shortcut lands 2/255 per channel too light in light.
    const srgb = (base: string, over: string, t: number) => {
      const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
      return `rgb(${[0, 1, 2].map((i) => Math.round(ch(base, i) + (ch(over, i) - ch(base, i)) * t)).join(", ")})`;
    };
    expect(srgb(lightColors.secondary, lightColors.foreground, 0.06)).toBe("rgb(232, 233, 235)");
    expect(mixOklab(lightColors.secondary, lightColors.foreground, 0.06)).not.toBe(
      srgb(lightColors.secondary, lightColors.foreground, 0.06),
    );
  });

  it("expands a 3-digit hex before mixing", () => {
    expect(mixOklab("#fff", "#000", 0.5)).toBe(mixOklab("#ffffff", "#000000", 0.5));
  });

  it("returns the base unchanged for translucent hex and non-hex inputs", () => {
    expect(mixOklab("#0f08", "#ffffff", 0.5)).toBe("#0f08");
    expect(mixOklab("#00ff0088", "#ffffff", 0.5)).toBe("#00ff0088");
    expect(mixOklab("#ffffff", "#0f08", 0.5)).toBe("#ffffff");
    expect(mixOklab("transparent", "#000000", 0.5)).toBe("transparent");
    expect(mixOklab("#000000", "transparent", 0.5)).toBe("#000000");
    expect(mixOklab("rgba(0, 0, 0, 0.2)", "#ffffff", 0.5)).toBe("rgba(0, 0, 0, 0.2)");
  });
});
