// Vendors Dark Factory's theme source into tools/darkfactory/theme.json.
//
// Canvas takes the Dark Factory (DF) design language (CLAUDE.md "Design language: Dark
// Factory"). DF's palettes, type scale, radii, shadows, materials and hue ramp live in its
// own repo (Ui/Components/src/theme); this script loads those modules as they are and
// writes one JSON snapshot with the source commit, so the kit's token mapping and its
// parity check read DF's real values without a sibling checkout (CI has none).
//
//   bun run df:vendor          rewrite the snapshot from the DF checkout
//   bun run df:vendor:check    fail when the snapshot no longer matches the DF checkout
//
// The DF checkout defaults to the sibling folder `../Argus` (the Dark Factory repository,
// moved there from `../Dark Factory` on 2026-09-23); DARK_FACTORY_DIR
// points elsewhere. Only DF's pure theme modules are loaded (palettes, tokens, materials,
// hue and color); the ones that import React Native (motion, responsive, insets) are not,
// and DF's motion is recorded as a reference card instead (tools/native/liquid-motion.md,
// `df-hover-lift`).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
export const SNAPSHOT = join(ROOT, "tools", "darkfactory", "theme.json");

// DF's stage hues (Apps/Argus/src/domain/stages.ts) plus its avatar default (260): the
// samples the identity-hue work compares against.
const HUE_SAMPLES = [20, 45, 70, 115, 155, 195, 225, 255, 260, 285, 335];

export async function buildSnapshot(dfDir: string) {
  const theme = join(dfDir, "Ui", "Components", "src", "theme");
  if (!existsSync(join(theme, "palettes.ts"))) {
    throw new Error(`No Dark Factory theme at ${theme}; set DARK_FACTORY_DIR to the DF checkout.`);
  }
  const { PALETTES, THEME_NAMES, THEME_SWATCHES } = await import(join(theme, "palettes.ts"));
  const { radius, breakpoints, MANROPE, typeScale, shadows } = await import(join(theme, "tokens.ts"));
  const { MATERIALS, WEDGES } = await import(join(theme, "materials.ts"));
  const { hueGradient, hueRing, hueInk } = await import(join(theme, "hue.ts"));
  const commit = execFileSync("git", ["-C", dfDir, "rev-parse", "--short", "HEAD"]).toString().trim();
  const names = THEME_NAMES as string[];
  return {
    source: {
      repo: "Dark Factory",
      commit,
      files: ["palettes.ts", "tokens.ts", "materials.ts", "hue.ts", "color.ts"].map((f) => `Ui/Components/src/theme/${f}`),
    },
    themes: names,
    palettes: PALETTES,
    swatches: THEME_SWATCHES,
    radius,
    breakpoints,
    fonts: MANROPE,
    typeScale,
    shadows: Object.fromEntries(names.map((name) => [name, shadows(PALETTES[name])])),
    materials: MATERIALS,
    wedges: WEDGES,
    hues: HUE_SAMPLES.map((hue) => ({
      hue,
      gradient: hueGradient(hue),
      ring: hueRing(hue),
      ink: { light: hueInk(hue, false), dark: hueInk(hue, true) },
    })),
  };
}

// The snapshot's values without its provenance, so a DF commit that changes nothing in
// the theme does not read as drift.
function values(snapshot: { source?: unknown }) {
  const { source: _source, ...rest } = snapshot;
  return JSON.stringify(rest);
}

if (import.meta.main) {
  const dfDir = resolve(process.env.DARK_FACTORY_DIR ?? join(ROOT, "..", "Argus"));
  const snapshot = await buildSnapshot(dfDir);
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const committed = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, "utf8")) : null;
    if (!committed || values(committed) !== values(snapshot)) {
      console.error(`tools/darkfactory/theme.json is stale against Dark Factory ${snapshot.source.commit}; run \`bun run df:vendor\`.`);
      process.exit(1);
    }
    const note = committed.source?.commit === snapshot.source.commit ? "" : ` (snapshot recorded at ${committed.source?.commit}; the theme values are unchanged)`;
    console.log(`df:vendor --check: tools/darkfactory/theme.json matches Dark Factory ${snapshot.source.commit}${note}.`);
  } else {
    mkdirSync(dirname(SNAPSHOT), { recursive: true });
    writeFileSync(SNAPSHOT, text);
    console.log(`df:vendor wrote tools/darkfactory/theme.json from Dark Factory ${snapshot.source.commit}.`);
  }
}
