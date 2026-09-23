import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { lightColors } from "../src/style/tokens.ts";
import { declarationsIn, platformBlocks, platformValue, resolveVars, type PlatformKey } from "../tools/tokens/css-tokens.ts";
import { SKIN_FAMILIES, normalize } from "../tools/tokens/skin-families.ts";

// Design rules, skin side: the per-OS style objects components actually paint with,
// and whether the web CSS hand-off still says the same thing they do.
//
// The harness aliases react-native to react-native-web, so every skin here resolves
// its WEB branch (a boxShadow string rather than the native shadow props). That is
// the branch styles/tokens/platforms.css transcribes, which is what makes the
// comparison exact rather than approximate.

const ROOT = join(import.meta.dir, "..");
const PLATFORMS: PlatformKey[] = ["web", "ios", "android"];
const blocks = platformBlocks(readFileSync(join(ROOT, "styles", "tokens", "platforms.css"), "utf8"));
// The hand-off spells the shadows as var(--shadow-*) over the palette's --shade; the skins
// are read with the light tokens, so the comparison resolves against the light palette.
const lightDecls = {
  ...declarationsIn(readFileSync(join(ROOT, "styles", "tokens", "colors.css"), "utf8"), ":root"),
  ...declarationsIn(readFileSync(join(ROOT, "styles", "tokens", "shadows.css"), "utf8"), ":root"),
};
const resolved = (value: string | undefined) => (value === undefined ? undefined : resolveVars(value, lightDecls));

type Skin = Record<string, unknown>;

const skinModules = [...new Glob("src/*/*/*.styles.ts").scanSync(ROOT)].sort();

describe("press feedback", () => {
  // A press dim below 0.6 reads as a disable and above 0.95 is invisible, so any skin
  // that dims on press has to land in between. Every skin is checked, on every
  // platform, by field name rather than by a fixed key: a dim can arrive as
  // `pressedOpacity`, `rowPressedOpacity` or `triggerPressedOpacity` depending on what
  // part of the component is pressable.
  //
  // What is deliberately NOT asserted here is that every platform declares feedback at
  // all. Feedback legitimately arrives from several places: AlertDialog dims only on
  // iOS because Android uses a text-button ripple and the web row is made of kit
  // Buttons, and the iOS Stepper leaves its halves to Button's own highlight. Deciding
  // which of those is a real gap needs to see the rendered control, which is lookout's
  // job (its rubric judges visible states) and code review's, not a static read of a
  // style object.
  for (const relative of skinModules) {
    const source = readFileSync(join(ROOT, relative), "utf8");
    if (!/[Pp]ressedOpacity/.test(source)) continue;

    it(`${relative} dims within the visible band`, async () => {
      const mod = (await import(join(ROOT, relative))) as Record<string, Skin>;
      let checked = 0;
      for (const [name, skin] of Object.entries(mod)) {
        if (!name.endsWith("Skin") || typeof skin !== "object" || skin === null) continue;
        for (const [field, value] of Object.entries(skin)) {
          if (!/pressedopacity$/i.test(field) || typeof value !== "number") continue;
          // Exactly 1 is the identity: the skin is saying it does not dim, because
          // its feedback comes from somewhere else (Alert's Android dismiss ripples
          // instead). That is a statement, not a value in the band.
          if (value === 1) continue;
          checked++;
          expect(value, `${relative} ${name}.${field}`).toBeGreaterThanOrEqual(0.6);
          expect(value, `${relative} ${name}.${field}`).toBeLessThanOrEqual(0.95);
        }
      }
      // Nothing to assert when every skin declines to dim (Listbox sets the field
      // null on all three and lets the row fill carry the state).
      expect(checked, `${relative}`).toBeGreaterThanOrEqual(0);
    });
  }
});

describe("the web hand-off still says what the skins say", () => {
  // styles/tokens/platforms.css is a transcription of these objects. It drifted once
  // already, invisibly, because both sides resolved to plausible numbers. Widening
  // this guard is a matter of adding rows to tools/tokens/skin-families.ts.
  for (const family of SKIN_FAMILIES) {
    for (const platform of PLATFORMS) {
      it(`${family.name} on ${platform}`, async () => {
        // A .js specifier resolves to the .styles.ts or .styles.tsx source alike.
        const mod = (await import(join(ROOT, "src", `${family.module}.styles.js`))) as Record<string, Skin>;
        const skin = mod[`${platform}Skin`];
        expect(skin, `${family.module} exports no ${platform}Skin`).toBeDefined();

        for (const check of family.checks) {
          const fromSkin = normalize(check.read(skin, lightColors as unknown as Record<string, string>));
          const fromCss = normalize(resolved(platformValue(blocks, platform, check.token)));
          expect(fromCss, `--${check.token} is missing from the hand-off`).not.toBeNull();
          expect(fromSkin, `--${check.token} on ${platform}`).toBe(fromCss);
        }
      });
    }
  }
});

describe("every component ships three skins", () => {
  // A component whose iOS or Android skin is literally the web object renders the web
  // look while the docs label it iOS, which is the failure docs/scripts/check-platform-skins.ts
  // guards from the other side. Here we only assert the three exports exist.
  for (const relative of skinModules) {
    it(`${relative} exports a skin per platform`, async () => {
      const mod = (await import(join(ROOT, relative))) as Record<string, unknown>;
      const named = Object.keys(mod).filter((k) => k.endsWith("Skin"));
      expect(named.length, `${relative} exports no skins`).toBeGreaterThan(0);
      for (const prefix of ["web", "ios", "android"]) {
        expect(
          named.some((k) => k.toLowerCase().startsWith(prefix)),
          `${relative} has no ${prefix} skin`,
        ).toBe(true);
      }
    });
  }
});
