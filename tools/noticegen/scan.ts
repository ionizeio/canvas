/*
 * Determines WHICH packages the Canvas docs app actually ships, and WHERE each one
 * shipped from, and writes the answer to tools/noticegen/shipped.json for
 * tools/noticegen/generate.ts to turn into licence data.
 *
 * This is a separate, slow step on purpose. It runs a real Metro export, so it takes a
 * few minutes; `notices:gen` and its --check counterpart read the committed JSON and
 * stay fast enough for CI.
 *
 * WHY NOT JUST WALK package.json. The obvious approach, a breadth-first walk of the
 * runtime dependency closure, is wrong here, and quietly so. `expo` declares its own CLI
 * as a regular dependency, so the closure drags in the entire build toolchain: it reports
 * 531 packages including lightningcss (MPL-2.0), node-forge (BSD-3-Clause OR GPL-2.0),
 * argparse and caniuse-lite. None of those reach the app. Publishing that list would
 * attribute copyleft code the app does not contain, which is worse than useless on a page
 * whose whole job is to be accurate.
 *
 * WHY LOCATIONS, NOT JUST NAMES. One install can hold several copies of a package, and a
 * name alone does not say which one ships. When docs/package.json gained
 * @happy-dom/global-registrator, bun hoisted its entities@7 to docs/node_modules/entities
 * and moved dom-serializer's entities@4 under docs/node_modules/dom-serializer/
 * node_modules. A later by-name lookup cannot tell which copy the bundler took (here the
 * docs' Metro config resolves every bare import from docs/node_modules alone, so it took
 * the hoisted 7.0.1; with hierarchical lookup it would have taken the nested 4.5.0). So
 * every signal below records the repo-relative package directory its own tool reports,
 * and the generator reads version and licence from exactly there. A package that ships
 * from two directories is recorded with both.
 *
 * FOUR SIGNALS, UNIONED:
 *
 *   1. JAVASCRIPT. Export ALL THREE platform bundles (web, iOS, Android) with source maps
 *      and read each map's `sources` array. Every entry under node_modules names a file
 *      that survived tree-shaking and is really in that bundle. The three differ: the web
 *      bundle resolves react-native-web where the native bundles carry react-native's own
 *      JS plus its helpers (@react-native/virtualized-lists, whatwg-fetch, promise, the
 *      css-select family from react-native-svg), so reading only the web map missed 26
 *      packages that ship in the .ipa/.aab.
 *
 *      The export runs with --no-bytecode, so the native maps are Metro's own rather than
 *      the composed Hermes .hbc.map, for two reasons. The Hermes composition normalizes
 *      every source path, collapsing "/../src/x" into "/src/x", which makes the repo
 *      root and docs/ (the kit's src and the docs' src, the root's node_modules and the
 *      docs' node_modules) indistinguishable; Metro's map keeps each path relative to the
 *      server root, ".." included, so it resolves back to the exact file. And the
 *      composed map leaves some bundled modules out, JSON data among them: the CSS data
 *      css-tree loads from mdn-data is compiled into both native bundles (its strings are
 *      in the .hbc), yet never appeared in their .hbc.map. Hermes compiles exactly the JS
 *      that Metro serialized, so the plain export's module set is the one the bytecode
 *      carries (every module in the .hbc.map is also in the plain map).
 *
 *      The maps are written to a temp directory and thrown away. They must never land in
 *      docs/dist: the shipped source maps previously exposed 363 of the kit's own source
 *      files on the public site, which is why `build:web` no longer emits them.
 *
 *   2. EXPO NATIVE MODULES. A package with native code is linked into the .ipa/.aab
 *      whether or not its JavaScript survives, so tree-shaking says nothing about it.
 *      Ask Expo's autolinking which modules it links for each platform
 *      (`expo-modules-autolinking search`), the same search the Podfile and the Gradle
 *      plugin run; its `path` is the copy that gets linked (other copies it saw are
 *      listed as `duplicates` and are not linked).
 *
 *   3. CLASSIC NATIVE MODULES. Packages with native code but NO expo-module.config.json
 *      (a .podspec / android Gradle project: react-native-gesture-handler,
 *      react-native-reanimated, react-native-worklets) are linked by the react-native
 *      side of autolinking, which signal 2 cannot see; when their JavaScript is never
 *      imported, signal 1 cannot see them either, yet their native code ships. Rather
 *      than re-deriving the linking rules from the filesystem, ask the machinery the
 *      native build itself uses: `expo-modules-autolinking react-native-config`, whose
 *      `root` is each linked package's directory. react-native is the platform rather
 *      than anyone's dependency, so the config names it separately via
 *      `reactNativePath`.
 *
 *   4. BAKED DATA. tools/icongen transcribes lucide-static's icon geometry into
 *      src/atoms/icon/icon.glyphs.ts (shipped inside @ionizeio/canvas and drawn by every
 *      <Icon>), and tools/rastergen re-bakes those glyphs into the docs' menu-glyph PNGs.
 *      No lucide JavaScript survives into any bundle, but the shipped data is a copy of
 *      lucide's icons, and its ISC licence requires the copyright and permission notice
 *      to appear in all copies. Attribute the exact package the data is transcribed from.
 *      The same holds for the typefaces: docs/scripts/subset-fonts.mjs cuts the Manrope
 *      and Geist Mono faces down from the @expo-google-fonts packages into
 *      docs/assets/fonts, so those packages' JavaScript never ships while their font
 *      software does, under OFL-1.1, whose condition 2 is exactly that the notice travel
 *      with every copy, modified ones included. Each is located the way its own
 *      generator finds it, from that generator's directory.
 *
 * Run: bun run notices:scan   (then `bun run notices:gen`, then commit both outputs)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { lookupPackage, packageOfSource, repoPath } from "./locate.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const docs = join(repo, "docs");
const OUT = join(here, "shipped.json");

/** Every shipped package by name, with the repo-relative directories it shipped from. */
const locations = new Map<string, Set<string>>();

/** Record that `name` ships from the absolute directory `dir`, as found by `signal`. */
function record(signal: Set<string>, name: string, dir: string): void {
  signal.add(name);
  const at = locations.get(name) ?? new Set<string>();
  at.add(repoPath(dir, repo));
  locations.set(name, at);
}

function fail(message: string, err?: unknown): never {
  console.error(`notices:scan: ${message}`);
  if (err !== undefined) console.error(String((err as { stderr?: Buffer }).stderr ?? err));
  process.exit(1);
}

// ---- signal 1: what is really in the JavaScript bundles ------------------------------

const outDir = mkdtempSync(join(tmpdir(), "canvas-noticescan-"));
console.log("notices:scan: exporting the web, iOS and Android bundles with source maps (this takes a few minutes)...");

try {
  execFileSync(
    "npx",
    ["expo", "export", "-p", "all", "--source-maps", "--no-bytecode", "--output-dir", outDir],
    { cwd: docs, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } },
  );
} catch (err) {
  rmSync(outDir, { recursive: true, force: true });
  fail("the export failed, so the shipped set cannot be determined.", err);
}

// The map paths are relative to the Metro server root, which Expo derives with this same
// function (getDefaultConfig sets `server.unstable_serverRoot` from it; the docs' Metro
// config keeps it). Every path is then checked on disk below, so a drift here fails
// loudly instead of attributing a file to the wrong copy.
const { getMetroServerRoot } = createRequire(join(docs, "package.json"))("@expo/config/paths") as {
  getMetroServerRoot: (projectRoot: string) => string;
};
const serverRoot = getMetroServerRoot(docs);

// One directory per platform, each holding its bundle(s) and their .js.map.
const jsRoot = join(outDir, "_expo/static/js");
const platforms = existsSync(jsRoot) ? readdirSync(jsRoot).sort() : [];
const fromBundle = new Set<string>();
const unattributed = new Set<string>();
let mapCount = 0;
let sourceFiles = 0;
for (const platform of platforms) {
  const dir = join(jsRoot, platform);
  for (const m of readdirSync(dir).filter((f) => f.endsWith(".map"))) {
    mapCount++;
    const map = JSON.parse(readFileSync(join(dir, m), "utf8")) as { sources: string[] };
    sourceFiles += map.sources.length;
    for (const src of map.sources) {
      const pkg = packageOfSource(src, serverRoot);
      if (!pkg) continue;
      if (!existsSync(join(pkg.dir, "package.json"))) unattributed.add(src);
      else record(fromBundle, pkg.name, pkg.dir);
    }
  }
}
rmSync(outDir, { recursive: true, force: true });
if (mapCount === 0) fail(`no source map found under ${jsRoot}; nothing to read.`);
if (unattributed.size) {
  const list = [...unattributed];
  fail(
    `${list.length} bundled node_modules files do not resolve to an installed package from the server root ${serverRoot}, ` +
      `so their copy cannot be attributed:\n  ${list.slice(0, 12).join("\n  ")}${list.length > 12 ? `\n  +${list.length - 12} more` : ""}`,
  );
}

// ---- signal 2: what expo autolinks as native code ------------------------------------

const fromExpo = new Set<string>();
for (const platform of ["apple", "android"]) {
  let raw: string;
  try {
    raw = execFileSync("npx", ["expo-modules-autolinking", "search", "-p", platform, "--json"], {
      cwd: docs,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    fail(`expo-modules-autolinking search failed for ${platform}; the expo native set cannot be determined.`, err);
  }
  const found = JSON.parse(raw) as Record<string, { path: string }>;
  for (const [name, mod] of Object.entries(found)) record(fromExpo, name, mod.path);
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
    fail(`react-native-config failed for ${platform}; the classic native set cannot be determined.`, err);
  }
  const cfg = JSON.parse(raw) as {
    reactNativePath?: string;
    dependencies?: Record<string, { root: string }>;
  };
  for (const [name, dep] of Object.entries(cfg.dependencies ?? {})) record(fromClassic, name, dep.root);
  // react-native itself: the platform runtime every native binary contains.
  if (cfg.reactNativePath) {
    const pj = JSON.parse(readFileSync(join(cfg.reactNativePath, "package.json"), "utf8")) as { name: string };
    record(fromClassic, pj.name, cfg.reactNativePath);
  }
}

// ---- signal 4: data baked in by the generators ----------------------------------------

// See the header: the lucide glyph geometry ships (in icon.glyphs.ts and the menu-glyph
// PNGs) even though the package's own code never does, and ISC requires the notice to
// travel with it. lucide-static, not lucide-react-native, is what tools/icongen reads.
// The two typeface packages ship as the subset faces in docs/assets/fonts (OFL-1.1).
// `from` is the directory the generator resolves the package from: tools/icongen reads
// the root's node_modules/lucide-static, docs/scripts/subset-fonts.mjs require.resolves
// the faces from docs/scripts.
const BAKED_DATA = [
  { name: "@expo-google-fonts/geist-mono", from: "docs/scripts" },
  { name: "@expo-google-fonts/manrope", from: "docs/scripts" },
  { name: "lucide-static", from: "tools/icongen" },
];
const fromBaked = new Set<string>();
for (const { name, from } of BAKED_DATA) {
  const dir = lookupPackage(name, join(repo, from), repo);
  if (!dir) fail(`${name} is not installed where ${from} resolves it; run \`bun install\` in the root and docs/.`);
  record(fromBaked, name, dir);
}

// ---- union and write -----------------------------------------------------------------

const names = [...locations.keys()].sort();
const packages = Object.fromEntries(names.map((n) => [n, [...locations.get(n)!].sort()]));
const bakedData = [...fromBaked].sort();
const nativeOnly = [...new Set([...fromExpo, ...fromClassic])].filter((n) => !fromBundle.has(n)).sort();
const multiCopy = names.filter((n) => locations.get(n)!.size > 1);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      _comment:
        "GENERATED by tools/noticegen/scan.ts (bun run notices:scan). The packages the docs app actually ships, each mapped to the repo-relative package directories it ships from: the union of what survives into the web, iOS and Android JS bundles (read from source-mapped exports, whose paths name the exact copy), what autolinks native code (Expo autolinking's search, and the classic react-native-config autolinking that links podspec/gradle modules and react-native itself, both of which report the linked directory), and the data the generators bake in (the lucide-static icon geometry, the subset Manrope and Geist Mono faces, located the way each generator resolves them). notices:gen reads version and licence from exactly these directories. Re-run after changing the app's dependencies or reinstalling with a different layout, then run notices:gen.",
      counts: {
        javascriptBundle: fromBundle.size,
        expoModules: fromExpo.size,
        classicModules: fromClassic.size,
        bakedData: bakedData.length,
        nativeOnly: nativeOnly.length,
        total: names.length,
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
console.log(`  ${bakedData.length} baked-data packages (${bakedData.join(", ")})`);
console.log(`  ${names.length} shipped packages in total`);
if (multiCopy.length) {
  console.log(`  shipped from more than one directory: ${multiCopy.map((n) => `${n} (${[...locations.get(n)!].join(", ")})`).join("; ")}`);
}
