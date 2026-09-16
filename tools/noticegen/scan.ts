/*
 * Determines WHICH packages the Canvas docs app actually ships, and writes the answer to
 * tools/noticegen/shipped.json for tools/noticegen/generate.ts to turn into licence data.
 *
 * This is a separate, slow step on purpose. It runs a real Metro export, so it takes a
 * few minutes; `notices:gen` and its --check counterpart read the committed JSON and
 * stay fast enough for CI.
 *
 * WHY NOT JUST WALK package.json. The obvious approach, a breadth-first walk of the
 * runtime dependency closure, is wrong here, and quietly so. `expo` declares its own CLI
 * as a regular dependency, so the closure drags in the entire build toolchain: it reports
 * 531 packages including lightningcss (MPL-2.0), node-forge (BSD-3-Clause OR GPL-2.0),
 * argparse, caniuse-lite and mdn-data. None of those reach the app. Publishing that list
 * would attribute copyleft code the app does not contain, which is worse than useless on
 * a page whose whole job is to be accurate.
 *
 * FOUR SIGNALS, UNIONED:
 *
 *   1. JAVASCRIPT. Export ALL THREE platform bundles (web, iOS, Android) with source maps
 *      and read each map's `sources` array. Every entry under node_modules names a package
 *      that survived tree-shaking and is really in that bundle. The three differ: the web
 *      bundle resolves react-native-web where the native bundles carry react-native's own
 *      JS plus its helpers (@react-native/virtualized-lists, whatwg-fetch, promise, the
 *      css-select family from react-native-svg), so reading only the web map missed 26
 *      packages that ship in the .ipa/.aab.
 *
 *      The maps are written to a temp directory and thrown away. They must never land in
 *      docs/dist: the shipped source maps previously exposed 363 of the kit's own source
 *      files on the public site, which is why `build:web` no longer emits them.
 *
 *   2. EXPO NATIVE MODULES. A package with native code is linked into the .ipa/.aab
 *      whether or not its JavaScript survives, so tree-shaking says nothing about it.
 *      Expo autolinks any dependency carrying an expo-module.config.json, so that file is
 *      the signal.
 *
 *   3. CLASSIC NATIVE MODULES. Packages with native code but NO expo-module.config.json
 *      (a .podspec / android Gradle project: react-native-gesture-handler,
 *      react-native-reanimated, react-native-worklets) are linked by the react-native
 *      side of autolinking, which signal 2 cannot see; when their JavaScript is never
 *      imported, signal 1 cannot see them either, yet their native code ships. Rather
 *      than re-deriving the linking rules from the filesystem, ask the machinery the
 *      native build itself uses: `expo-modules-autolinking react-native-config`.
 *      react-native is the platform rather than anyone's dependency, so the config names
 *      it separately via `reactNativePath`.
 *
 *   4. BAKED DATA. tools/icongen transcribes lucide-static's icon geometry into
 *      src/atoms/icon/icon.glyphs.ts (shipped inside @ionizeio/canvas and drawn by every
 *      <Icon>), and tools/rastergen re-bakes those glyphs into the docs' menu-glyph PNGs.
 *      No lucide JavaScript survives into any bundle, but the shipped data is a copy of
 *      lucide's icons, and its ISC licence requires the copyright and permission notice
 *      to appear in all copies. Attribute the exact package the data is transcribed from.
 *
 * Run: bun run notices:scan   (then `bun run notices:gen`, then commit both outputs)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const docs = join(repo, "docs");
const OUT = join(here, "shipped.json");

// ---- signal 1: what is really in the JavaScript bundles ------------------------------

const outDir = mkdtempSync(join(tmpdir(), "canvas-noticescan-"));
console.log("notices:scan: exporting the web, iOS and Android bundles with source maps (this takes a few minutes)...");

try {
  execFileSync("npx", ["expo", "export", "-p", "all", "--source-maps", "--output-dir", outDir], {
    cwd: docs,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "1" },
  });
} catch (err) {
  console.error("notices:scan: the export failed, so the shipped set cannot be determined.");
  console.error(String((err as { stderr?: Buffer }).stderr ?? err));
  rmSync(outDir, { recursive: true, force: true });
  process.exit(1);
}

// One directory per platform; web emits .js.map, the Hermes platforms .hbc.map.
const jsRoot = join(outDir, "_expo/static/js");
const platforms = existsSync(jsRoot) ? readdirSync(jsRoot).sort() : [];
const fromBundle = new Set<string>();
let mapCount = 0;
let sourceFiles = 0;
for (const platform of platforms) {
  const dir = join(jsRoot, platform);
  for (const m of readdirSync(dir).filter((f) => f.endsWith(".map"))) {
    mapCount++;
    const map = JSON.parse(readFileSync(join(dir, m), "utf8")) as { sources: string[] };
    sourceFiles += map.sources.length;
    for (const src of map.sources) {
      // Take the LAST match so a nested node_modules attributes to the inner package.
      const hits = [...src.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)];
      if (hits.length) fromBundle.add(hits[hits.length - 1][1]);
    }
  }
}
rmSync(outDir, { recursive: true, force: true });
if (mapCount === 0) {
  console.error(`notices:scan: no source map found under ${jsRoot}; nothing to read.`);
  process.exit(1);
}

// ---- signal 2: what expo autolinks as native code ------------------------------------

const fromExpo = new Set<string>();
for (const base of [join(docs, "node_modules"), join(repo, "node_modules")]) {
  if (!existsSync(base)) continue;
  for (const entry of readdirSync(base)) {
    const dirs = entry.startsWith("@")
      ? readdirSync(join(base, entry)).map((s) => `${entry}/${s}`)
      : [entry];
    for (const name of dirs) {
      if (existsSync(join(base, name, "expo-module.config.json"))) fromExpo.add(name);
    }
  }
}

// ---- signal 3: what classic React Native autolinking links ---------------------------

const fromClassic = new Set<string>();
for (const platform of ["ios", "android"]) {
  let raw: string;
  try {
    raw = execFileSync(
      "npx",
      ["expo-modules-autolinking", "react-native-config", "-p", platform, "--json"],
      { cwd: docs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    console.error(`notices:scan: react-native-config failed for ${platform}; the classic native set cannot be determined.`);
    console.error(String((err as { stderr?: Buffer }).stderr ?? err));
    process.exit(1);
  }
  const cfg = JSON.parse(raw) as { reactNativePath?: string; dependencies?: Record<string, unknown> };
  for (const name of Object.keys(cfg.dependencies ?? {})) fromClassic.add(name);
  // react-native itself: the platform runtime every native binary contains.
  if (cfg.reactNativePath) {
    const pj = JSON.parse(readFileSync(join(cfg.reactNativePath, "package.json"), "utf8")) as { name: string };
    fromClassic.add(pj.name);
  }
}

// ---- signal 4: data baked in by the generators ----------------------------------------

// See the header: the lucide glyph geometry ships (in icon.glyphs.ts and the menu-glyph
// PNGs) even though the package's own code never does, and ISC requires the notice to
// travel with it. lucide-static, not lucide-react-native, is what tools/icongen reads.
const bakedData = ["lucide-static"];

// ---- union and write -----------------------------------------------------------------

const packages = [...new Set([...fromBundle, ...fromExpo, ...fromClassic, ...bakedData])].sort();
const nativeOnly = [...new Set([...fromExpo, ...fromClassic])].filter((n) => !fromBundle.has(n)).sort();

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      _comment:
        "GENERATED by tools/noticegen/scan.ts (bun run notices:scan). The packages the docs app actually ships: the union of what survives into the web, iOS and Android JS bundles (read from source-mapped exports), what autolinks native code (an expo-module.config.json, or the classic react-native-config autolinking that links podspec/gradle modules and react-native itself), and the lucide-static icon data the generators bake in. Re-run after changing the app's dependencies, then run notices:gen.",
      counts: {
        javascriptBundle: fromBundle.size,
        expoModules: fromExpo.size,
        classicModules: fromClassic.size,
        bakedData: bakedData.length,
        nativeOnly: nativeOnly.length,
        total: packages.length,
      },
      bakedData,
      nativeOnly,
      packages,
    },
    null,
    2,
  )}\n`,
);

console.log(`notices:scan: wrote ${OUT}`);
console.log(`  ${sourceFiles} source files across ${mapCount} maps (${platforms.join(", ")})`);
console.log(`  ${fromBundle.size} packages in the JS bundles`);
console.log(`  ${fromExpo.size} expo-autolinked native modules, ${fromClassic.size} classic (${nativeOnly.length} with no JS in any bundle)`);
console.log(`  ${bakedData.length} baked-data package (${bakedData.join(", ")})`);
console.log(`  ${packages.length} shipped packages in total`);
