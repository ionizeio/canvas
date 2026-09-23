import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { typeScale } from "../src/style/type-scale.ts";
import { webSkin } from "../src/atoms/typography/typography.styles.ts";
import { declarationsIn, parseFontShorthand, resolveVars } from "../tools/tokens/css-tokens.ts";

// The kit's Dark Factory type table is derived, not typed in: each style is Dark
// Factory's theme `typeScale` entry with tracking converted from em to px, the line
// height rounded up to a whole pixel, and sizes under the 10px source floor raised to
// it. A hand edit to src/style/type-scale.ts, or a new Dark Factory snapshot, fails
// here and names the style.
interface DfStyle { size: number; weight: number; tracking: number; lineHeight: number; uppercase?: boolean }
const theme = JSON.parse(readFileSync(new URL("../tools/darkfactory/theme.json", import.meta.url), "utf8")) as { typeScale: Record<string, DfStyle> };
const FLOOR = 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function derive(style: DfStyle) {
  const size = Math.max(FLOOR, style.size);
  const out: Record<string, unknown> = {
    fontSize: size,
    // Rounded to a hundredth first so a product like 16 x 1.25 cannot ceil to 21.
    lineHeight: Math.ceil(round2(size * style.lineHeight)),
    fontWeight: String(style.weight),
  };
  const tracking = round2(style.tracking * size);
  if (tracking !== 0) out.letterSpacing = tracking;
  if (style.uppercase) out.textTransform = "uppercase";
  return out;
}

describe("Dark Factory type scale", () => {
  it("equals the table derived from the vendored theme", () => {
    for (const [name, style] of Object.entries(theme.typeScale)) {
      expect({ name, ...typeScale[name as keyof typeof typeScale] }).toEqual({ name, ...derive(style) });
    }
  });

  it("adds only the featured title, the one style Dark Factory sets inline", () => {
    const extra = Object.keys(typeScale).filter((name) => !(name in theme.typeScale));
    expect(extra).toEqual(["featuredTitle"]);
    expect(typeScale.featuredTitle).toEqual(derive({ size: 20, weight: 700, tracking: -0.01, lineHeight: 1.25 }));
  });

  it("keeps every line height whole and every size at the floor or above", () => {
    for (const style of Object.values(typeScale)) {
      expect(Number.isInteger(style.lineHeight)).toBe(true);
      expect(style.fontSize).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});

// The CSS hand-off spells the same roles as font shorthands for web consumers and
// DESIGN.md; they must not drift from what the component renders.

describe("Typography roles in the CSS hand-off", () => {
  const css = readFileSync(new URL("../styles/tokens/typography.css", import.meta.url), "utf8");
  const decls = declarationsIn(css, ":root");
  const roles = Object.keys(decls).filter((name) => name.startsWith("role-")).map((name) => name.slice(5));

  it("covers the Typography size roles", () => {
    expect(roles.sort()).toEqual(["body", "caption", "display", "h1", "h2", "h3", "h4", "h5", "lead", "small", "tiny"]);
  });

  for (const role of ["body", "caption", "display", "h1", "h2", "h3", "h4", "h5", "lead", "small", "tiny"] as const) {
    it(`--role-${role} equals the component's ${role} role`, () => {
      const font = parseFontShorthand(resolveVars(decls[`role-${role}`] ?? "", decls));
      const style = webSkin.roleType[role];
      expect({ size: font.size, lineHeight: font.lineHeight, weight: font.weight }).toEqual({
        size: style.fontSize as number,
        lineHeight: style.lineHeight as number,
        weight: Number(style.fontWeight),
      });
    });
  }
});
