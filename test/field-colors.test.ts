import { describe, it, expect } from "bun:test";
import { fieldBorder, fieldErrorFill } from "../src/style/field-colors.ts";
import { lightColors, darkColors, type ColorTokens } from "../src/style/tokens.ts";

// The two colours the iOS field skins share (src/style/field-colors.ts): the
// resting border token with its legacy fallback, and the error wash derived from
// the destructive hue so a rebrand carries it.

const channels = (c: string): number[] => {
  const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(c);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
};
const within = (a: string, b: string, step: number) =>
  channels(a).every((v, i) => Math.abs(v - channels(b)[i]) <= step);

describe("fieldBorder", () => {
  it("reads the field-border token in both schemes", () => {
    expect(fieldBorder(lightColors)).toBe(lightColors["field-border"]!);
    expect(fieldBorder(darkColors)).toBe(darkColors["field-border"]!);
  });

  it("falls back to `input` for a legacy map that omits the token", () => {
    const legacy = { ...lightColors } as ColorTokens;
    delete legacy["field-border"];
    expect(fieldBorder(legacy)).toBe(lightColors.input);
  });
});

describe("fieldErrorFill", () => {
  // The reference's Background/Error: red-50 (#fef2f2) on the light box, #2c1b1b on
  // the dark one. Derived from `card` + `destructive`, so it lands within a channel
  // few steps of the source (the dark card carries a blue cast the source does not) rather
  // than restating it.
  it("reproduces the reference's light error wash from card + destructive", () => {
    expect(within(fieldErrorFill(lightColors), "#fef2f2", 2)).toBe(true);
  });

  it("tints the dark card toward the destructive red without leaving the dark surface", () => {
    // DF's dark card carries a violet cast the iOS field reference (#2c1b1b) never had, so
    // the dark wash is checked by what it must do: read redder than the card, stay dark.
    const [cr, cg, cb] = channels(darkColors.card);
    const [r, g, b] = channels(fieldErrorFill(darkColors));
    expect(r - cr).toBeGreaterThan(8);
    expect(r - cr).toBeGreaterThan(Math.max(g - cg, b - cb));
    expect(Math.max(r, g, b)).toBeLessThan(96);
  });

  it("follows a rebranded destructive hue", () => {
    const rebranded = { ...lightColors, destructive: "#0000ff" } as ColorTokens;
    const wash = channels(fieldErrorFill(rebranded));
    // A blue destructive hue washes the box toward blue: the blue channel stays
    // highest and the red channel drops below it.
    expect(wash[2]).toBeGreaterThanOrEqual(wash[0]);
  });
});
