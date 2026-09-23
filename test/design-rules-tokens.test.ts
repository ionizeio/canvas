import { describe, it, expect } from "bun:test";
import {
  breakpoints,
  darkColors,
  fontWeight,
  lightColors,
  radius,
  spacing,
  widths,
  type ColorTokens,
} from "../src/style/tokens.ts";
import { customShadow, shadow, type ShadowLevel } from "../src/style/shadow.ts";
import { isRing, renderedContrast, shadeLayers, SHADE_LIMIT } from "../tools/tokens/shade.ts";

// Design rules, JS side: the token values and the elevation ladder.
//
// These come from the design-quality playbooks (the "redesign an existing project"
// defect list, the craft rules about elevation and radius, the mobile-aware typography
// and touch-target floors), reduced to the ones that are OBJECTIVE and that Canvas has
// actually decided in its favour. Taste that contradicts a declared choice is
// deliberately absent: Dark Factory's palette, its Manrope face and its tinted light
// surfaces are design decisions this kit has made and documented (see the neverFile list
// in lookout.config.ts), so no rule here second-guesses them.
//
// The companion files check the CSS hand-off (design-rules-css), the per-OS skins
// (design-rules-skins) and the source itself (design-rules-source).

const SURFACE_TOKENS: (keyof ColorTokens)[] = [
  "background",
  "card",
  "popover",
  "secondary",
  "muted",
  "accent",
];

const SCHEMES: [string, ColorTokens][] = [
  ["light", lightColors],
  ["dark", darkColors],
];

const LEVELS: ShadowLevel[] = ["none", "sm", "DEFAULT", "md", "lg", "xl"];

/** Relative luminance of a #rrggbb, for "is this actually black" questions. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("surface colours", () => {
  // Pure black is the single most reliable tell of an unconsidered dark theme: it
  // flattens every elevation cue, since a shadow cast on #000 is invisible, and it
  // reads as a hole rather than a surface. Canvas's dark background is an off-black
  // (zinc 950), which is the rule this locks in. The light scheme's #ffffff is NOT
  // the same defect and is not checked: white paper is a considered surface, and it
  // is the shadcn token set this kit is built on.
  for (const [name, tokens] of SCHEMES) {
    for (const token of SURFACE_TOKENS) {
      it(`${name} ${token} is not pure black`, () => {
        expect(tokens[token].toLowerCase()).not.toBe("#000000");
      });
    }
  }

  it("the dark background is an off-black, not a hole", () => {
    expect(luminance(darkColors.background)).toBeGreaterThan(0);
  });
});

describe("the radius scale", () => {
  it("is strictly increasing, so a step always means something", () => {
    const values = Object.values(radius);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it("ends at the pill, which is the only non-numeric step", () => {
    expect(Object.keys(radius).at(-1)).toBe("full");
    expect(radius.full).toBeGreaterThanOrEqual(9999);
  });

  it("has enough distinct steps to express a hierarchy", () => {
    // An inner element takes a tighter radius than its container, which needs at
    // least a few steps below the card radius to choose from.
    expect(new Set(Object.values(radius)).size).toBeGreaterThanOrEqual(6);
  });
});

describe("the weight ladder", () => {
  // Only Regular and Bold is the classic under-considered type system: the middle of
  // the ladder is where a label separates from body copy without shouting.
  it("carries medium and semibold, not just normal and bold", () => {
    expect(fontWeight.medium).toBe("500");
    expect(fontWeight.semibold).toBe("600");
  });
});

describe("elevation", () => {
  // The harness aliases react-native to react-native-web, so shadow() resolves its web
  // branch here: a boxShadow string, which is also what the CSS hand-off spells. The
  // weight is judged as rendered (tools/tokens/shade.ts): the darkest point the shade
  // paints beside the surface, against the page, the card and the popover of each
  // palette, bounded by the old nominal cap's own limit. xl is the top-layer separator
  // (a dialog's shade over a scrim or arbitrary content), held only to the direction rule.
  const boxShadowOf = (level: ShadowLevel, tokens?: ColorTokens) => (shadow(level, tokens) as { boxShadow?: string }).boxShadow ?? "";

  for (const [scheme, tokens] of [["light", lightColors], ["dark", darkColors]] as const) {
    for (const level of LEVELS.filter((l) => l !== "none" && l !== "xl")) {
      it(`${scheme} ${level} renders a diffuse shade, not a hard drop`, () => {
        const layers = shadeLayers(boxShadowOf(level, tokens)).filter((layer) => !layer.inset && !isRing(layer));
        expect(layers.length).toBeGreaterThan(0);
        for (const layer of layers) {
          for (const surface of [tokens.background, tokens.card, tokens.popover]) {
            // A shadow heavier than this reads as a border rather than depth.
            expect(renderedContrast(layer, surface), `${level} over ${surface}`).toBeLessThanOrEqual(SHADE_LIMIT);
          }
        }
      });
    }
  }

  it("tints the ladder by the palette's shade, and keeps the top layer black", () => {
    expect(boxShadowOf("DEFAULT", lightColors)).toContain(lightColors.shade as string);
    expect(boxShadowOf("DEFAULT", darkColors)).toContain(darkColors.shade as string);
    expect(boxShadowOf("xl", lightColors)).toBe(boxShadowOf("xl", darkColors));
  });

  it("none really is none", () => {
    expect((shadow("none") as { boxShadow?: string }).boxShadow).toBe("none");
  });

  for (const level of LEVELS.filter((l) => l !== "none")) {
    it(`${level} lights the scene from directly above`, () => {
      const value = (shadow(level) as { boxShadow?: string }).boxShadow ?? "";
      const [x, y] = value.split(/\s+/);
      // One light source across the whole ladder: no horizontal offset, and the
      // shadow always falls downward. Mixed directions in one view are the defect.
      expect(x).toBe("0px");
      expect(Number.parseFloat(y)).toBeGreaterThanOrEqual(0);
    });
  }

  it("the one-off shadow helper defaults into the same band", () => {
    const value = (customShadow({}) as { boxShadow?: string }).boxShadow ?? "";
    for (const layer of shadeLayers(value)) expect(renderedContrast(layer, "#ffffff")).toBeLessThanOrEqual(SHADE_LIMIT);
  });
});

describe("the scales the hand-off transcribes", () => {
  // Guards against a scale drifting into a shape the CSS parser or the DESIGN.md
  // generator cannot read back.
  it("spacing is a positive px scale", () => {
    for (const [name, value] of Object.entries(spacing)) {
      expect(Number.isFinite(value), `spacing.${name}`).toBe(true);
      expect(value, `spacing.${name}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("the breakpoints ascend", () => {
    const values = Object.values(breakpoints);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
  });

  it("the width scale ascends from xs to page and is Tailwind's max-w ladder, copied not depended on", () => {
    const values = Object.values(widths);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
    // max-w-xs .. max-w-2xl step by 64px (20rem .. 42rem); the strides then widen.
    expect([widths.xxxs, widths.xxs]).toEqual([192, 256]); // max-w-48 / max-w-64, the tile steps
    expect([widths.xs, widths.sm, widths.md, widths.lg, widths.xl, widths.xxl]).toEqual([320, 384, 448, 512, 576, 672]);
    expect([widths.xxxl, widths.wide, widths.wider, widths.widest, widths.page]).toEqual([768, 896, 1024, 1152, 1280]);
    expect(Object.keys(widths)).toHaveLength(13);
  });
});
