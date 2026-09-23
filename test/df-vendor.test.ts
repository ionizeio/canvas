import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The vendored Dark Factory theme (tools/darkfactory/theme.json, written by
// `bun run df:vendor` from DF's own theme modules). The kit's token mapping reads these
// values, and it leans on a few facts about DF's palettes that this file pins, so a DF
// change that breaks one of them fails here and names the mapping it invalidates.
const snapshot = JSON.parse(readFileSync(join(import.meta.dir, "..", "tools", "darkfactory", "theme.json"), "utf8"));
const THEMES = ["blush", "mint", "dark"] as const;

// Every palette role the mapping and the docs page look read.
const ROLES = [
  "bg1", "bg2", "bg3", "shell", "shellLine", "card", "card2", "shadow", "stack", "text", "muted", "line",
  "accent", "accentInk", "accentSoft", "accent2", "accent2Soft", "warn", "warnSoft", "pos", "posSoft",
  "neg", "negSoft", "info", "infoSoft", "input", "hover", "featured", "promo", "orb1", "orb2", "orb3",
  "dim", "toastBg", "toastText",
];

describe("vendored Dark Factory theme", () => {
  it("records its source commit and the three themes", () => {
    expect(snapshot.source.repo).toBe("Dark Factory");
    expect(snapshot.source.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(snapshot.themes).toEqual([...THEMES]);
  });

  it("carries every palette role the mapping reads, in every theme", () => {
    for (const theme of THEMES) {
      for (const role of ROLES) expect(snapshot.palettes[theme][role], `${theme}.${role}`).toBeDefined();
    }
  });

  it("keeps info equal to the violet accent, so `primary` covers both", () => {
    for (const theme of THEMES) {
      const p = snapshot.palettes[theme];
      expect(p.info, theme).toBe(p.accent2);
      expect(p.infoSoft, theme).toBe(p.accent2Soft);
    }
  });

  it("keeps the positive status equal to the green action, so `success-soft` covers the action wash", () => {
    for (const theme of THEMES) {
      const p = snapshot.palettes[theme];
      expect(p.pos, theme).toBe(p.accent);
      expect(p.posSoft, theme).toBe(p.accentSoft);
    }
  });

  it("paints the toast the same inverse pill in every theme", () => {
    const [first, ...rest] = THEMES.map((theme) => snapshot.palettes[theme]);
    for (const p of rest) {
      expect(p.toastBg).toBe(first.toastBg);
      expect(p.toastText).toBe(first.toastText);
    }
  });

  it("carries the type scale, radii, fonts, shadows and materials the kit maps", () => {
    for (const variant of ["display", "title", "heading", "subheading", "body", "bodyStrong", "label", "small", "caption", "micro", "tag", "eyebrow", "eyebrowLg"]) {
      expect(snapshot.typeScale[variant], variant).toBeDefined();
    }
    expect(Object.keys(snapshot.radius).sort()).toEqual(["card", "chip", "dialog", "field", "key", "logo", "pill", "shell", "tile"]);
    expect(Object.keys(snapshot.fonts).sort()).toEqual(["400", "500", "600", "700", "800"]);
    for (const theme of THEMES) expect(snapshot.shadows[theme].card, theme).toContain("-24px");
    expect(snapshot.materials.shell).toEqual({ blur: 24, radius: 22 });
  });
});
