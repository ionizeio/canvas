import { readdir, readFile, mkdtemp, mkdir, cp, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import type { BuildOptions } from "esbuild";

const ROOT = join(import.meta.dir, "..");

// Core (component + pattern + token) CSS budget.
const CORE_MAX_TOTAL_GZIP = 30_720;
const CORE_MAX_FILE_GZIP = 2_048;

// Per-file exceptions to the 2KB rule above. That rule was written when `styles/` held
// ~25 per-component stylesheets (button.css, dialog.css, and so on), where 2KB is a
// generous ceiling for one component's rules. That layer is gone: since "Ship design
// tokens as plain CSS", `styles/` is nine per-concern token files, and they are not
// interchangeable in size. Listing the one structural outlier here keeps the 2KB guard
// live on the other eight (colors.css sits at ~2.0KB, so it still bites) instead of
// raising the global constant, which would blind the check for all nine at once.
const CORE_FILE_GZIP_OVERRIDES: Record<string, number> = {
  // platforms.css is the whole --p-* web hand-off in one file: three complete skin
  // tables (web / iOS 26 / Material 3, ~1,950 declarations) plus the prose naming each
  // group's upstream `*.styles.ts`. Splitting it per platform was considered and
  // rejected. The three tables share so much vocabulary that separate shards gzip to
  // ~18.1KB against ~15.9KB together, so the split costs bytes; no shard lands near 2KB
  // anyway (the smallest is ~5.6KB); canvas.css imports all three regardless ("Link this
  // one file"); `styles/*` is a public export path, so moving the file breaks anyone
  // importing it directly; and the docs and the design mirror flip `data-platform` at
  // runtime, so they need all three loaded at once. Measured at 15,915B gzip, so 20KB
  // leaves roughly the same 1.3x headroom the JS budget carries: enough for more skin
  // tokens, tight enough to catch a doubling. It also trips before the 30KB total does,
  // so a regression names the file rather than the whole layer.
  "styles/tokens/platforms.css": 20_480,
};

// The shipped JavaScript budget: the whole kit, bundled with react / react-native /
// react-native-svg and the optional peers externalized (what a consumer's bundler
// resolves from the outside), minified and gzipped. Raised from 135KB for the
// chart-buildout tier (13 further chart components beyond BarList and
// MetricBreakdown, each ~0.7-1KB gzip): measured 137.4KB gzip with the first two
// landed, so the old cap left no room for the planned roster. 160KB keeps the
// same intent: room for the deliberate growth, tight enough to catch an
// accidental doubling or a dependency creeping into the bundle.
//
// Raised again from 160KB for the GeoMap detail pass. The generated world data
// went from Natural Earth 1:110m land alone to 1:50m land PLUS the 1:50m internal
// country border mesh, on a viewBox widened from 1000 to 2000 units, which took
// src/charts/geo-map/geo-map.world.ts from 5.6KB to 23.8KB gzip and the measured
// bundle from 161.5KB to 180.8KB. The whole increase is one @generated data
// module: it is a pair of string constants with no logic, and it tree-shakes out
// entirely for a consumer who never imports GeoMap. 192KB leaves ~6% headroom over
// the measured figure. That is deliberately more slack than the 160KB cap ended up
// with (1.4%, which meant any addition at all failed CI) and still far under the
// 1.6x an accidental doubling would need.
export const JS_MAX_GZIP = 196_608; // 192 KB

export interface JavaScriptBudget {
  label: string;
  entry: string;
  maxGzip: number;
  requiredExports?: readonly string[];
  platform?: "web" | "ios" | "android";
}

// Each fixture imports from the public package name and keeps its component plus
// ThemeProvider exported, so tree shaking measures a usable named-import consumer.
// The complete-kit limit cannot catch dependencies moving into common components.
// Measured with esbuild 0.28.2 under Bun 1.4.0, in web / iOS / Android order:
// Button 3,617 / 3,799 / 3,655B; Input 31,895 / 32,203 / 32,210B;
// DataTable 38,051 / 38,373 / 38,222B; StackedList 50,241 / 49,006 / 50,443B.
// Button was 3,041 / 3,227 / 3,086B before the themed Text/TextInput primitives
// (ThemeProvider `fonts`, src/style/text.tsx + fonts.ts): every consumer now carries
// the face resolver, ~580B gzip, which is the cost of one brand face on every label
// without a fontFamily at any call site. The ceiling moved from 3,584 to 4,096B for
// that deliberate growth; the others keep their headroom.
// Input was 31,895 / 32,203 / 32,210B before the sizing natures (src/style/sizing.ts:
// FILL, the layout-axis context, the hugging-cell warning, the span math) replaced
// the fixed field width; measured after at 31,906 / 32,972 / 32,123B, so every field
// now carries the width contract, ~770B gzip on iOS. The Input ceiling moved from
// 32,768 to 34,816B for that deliberate growth.
// Fixed ceilings leave room for deliberate growth while catching a heavy import.
// These are independent budgets, not a combined total: shared modules legitimately
// occur in more than one consumer. Changes require a fresh measurement and rationale.
export const NAMED_IMPORT_BUDGETS: readonly JavaScriptBudget[] = [
  { label: "Button + ThemeProvider", entry: "scripts/size-fixtures/button.ts", maxGzip: 4_096, requiredExports: ["Button", "ThemeProvider"] },
  { label: "Input + ThemeProvider", entry: "scripts/size-fixtures/input.ts", maxGzip: 34_816, requiredExports: ["Input", "ThemeProvider"] },
  { label: "DataTable + ThemeProvider", entry: "scripts/size-fixtures/data-table.ts", maxGzip: 40_960, requiredExports: ["DataTable", "ThemeProvider"] },
  { label: "StackedList + ThemeProvider", entry: "scripts/size-fixtures/stacked-list.ts", maxGzip: 53_248, requiredExports: ["StackedList", "ThemeProvider"] },
];

export interface JavaScriptSize extends JavaScriptBudget {
  raw: number;
  gzip: number;
  exceeded: boolean;
}

// The small structural result type lets tests exercise failed/empty builds
// independently of the bundler's complete result shape.
export type BundleBuilder = (options: BuildOptions) => Promise<{
  success: boolean;
  outputs: readonly Pick<Blob, "arrayBuffer">[];
  logs: readonly unknown[];
}>;

// A pinned esbuild release provides supported conditional exports and extension
// ordering. Bun's build API accepts but ignores resolveExtensions, so it cannot
// measure Metro's platform files. This budgets distribution code, not an APK or
// a Metro application bundle; stock Metro runtime checks remain separate.
export const bundleJavaScript: BundleBuilder = async (options) => {
  const { build } = await import("esbuild");
  const result = await build(options);
  return { success: result.errors.length === 0, outputs: (result.outputFiles ?? []).map((file) => new Blob([file.contents])), logs: result.errors };
};

interface FileSize {
  path: string;
  raw: number;
  gzip: number;
}

async function collectCSSFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectCSSFiles(full)));
    else if (entry.name.endsWith(".css")) files.push(full);
  }
  return files;
}

function report(
  label: string,
  files: FileSize[],
  maxTotal: number,
  maxFile: number,
  overrides: Record<string, number> = {},
): boolean {
  const budgetFor = (path: string) => overrides[path] ?? maxFile;
  const totalRaw = files.reduce((s, f) => s + f.raw, 0);
  const totalGzip = files.reduce((s, f) => s + f.gzip, 0);

  console.log(`\n${label}`);
  console.log("=".repeat(label.length) + "\n");
  console.log(`${"File".padEnd(50)} ${"Raw".padStart(8)} ${"Gzip".padStart(8)}`);
  console.log("-".repeat(68));

  const oversized: FileSize[] = [];
  for (const f of files) {
    const flag = f.gzip > budgetFor(f.path) ? " !" : "";
    console.log(`${f.path.padEnd(50)} ${(f.raw + "B").padStart(8)} ${(f.gzip + "B").padStart(8)}${flag}`);
    if (f.gzip > budgetFor(f.path)) oversized.push(f);
  }

  console.log("-".repeat(68));
  console.log(`${"Total".padEnd(50)} ${(totalRaw + "B").padStart(8)} ${(totalGzip + "B").padStart(8)}`);
  console.log(`Budget: ${maxTotal}B gzip total, ${maxFile}B gzip per file`);
  for (const [path, budget] of Object.entries(overrides)) {
    console.log(`  except ${path}: ${budget}B gzip (justified in check-size.ts)`);
  }

  let failed = false;
  if (totalGzip > maxTotal) {
    console.log(`\n${label} total gzip ${totalGzip}B exceeds budget ${maxTotal}B`);
    failed = true;
  }
  if (oversized.length) {
    console.log(`\n${oversized.length} ${label} file(s) exceed their per-file budget:`);
    for (const f of oversized) console.log(`  ${f.path} (${f.gzip}B > ${budgetFor(f.path)}B)`);
    failed = true;
  }

  // An override whose file was renamed or deleted is dead config: the file itself would
  // fall back to the default and fail loudly, but the stale entry would sit here reading
  // as a live exemption. Catch it here rather than at the next person to read the table.
  const known = new Set(files.map((f) => f.path));
  const stale = Object.keys(overrides).filter((path) => !known.has(path));
  if (stale.length) {
    console.log(`\n${stale.length} per-file budget override(s) name a file that no longer exists:`);
    for (const path of stale) console.log(`  ${path}`);
    failed = true;
  }
  return failed;
}

// ---- Shipped JavaScript budget --------------------------------------------------
export async function measureBundle(
  root: string,
  budget: JavaScriptBudget,
  external: string[],
  build: BundleBuilder = bundleJavaScript,
): Promise<JavaScriptSize> {
  const entry = join(root, budget.entry);
  if (!existsSync(entry)) throw new Error(`${budget.label}: missing ${budget.entry}`);
  const built = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    logLevel: "silent",
    minify: true,
    platform: budget.platform && budget.platform !== "web" ? "neutral" : "browser",
    format: "esm",
    external,
    ...(budget.platform && budget.platform !== "web" ? {
      conditions: ["react-native"],
      // Match Metro's platform-first source selection within the native entry.
      resolveExtensions: [`.${budget.platform}.js`, ".native.js", ".js", ".json", ".ts", ".tsx"],
    } : {}),
  });
  if (!built.success) {
    throw new Error(`${budget.label}: bundle failed\n${built.logs.map(String).join("\n")}`);
  }
  // These fixtures contain JavaScript only and do not split chunks. Measuring
  // just the first output after that changes would hide uncounted shipped bytes.
  if (built.outputs.length !== 1) {
    throw new Error(`${budget.label}: expected one JavaScript output, received ${built.outputs.length}`);
  }
  const bytes = new Uint8Array(await built.outputs[0].arrayBuffer());
  if (bytes.length === 0) throw new Error(`${budget.label}: JavaScript output is empty`);
  if (budget.requiredExports) {
    let scan: ReturnType<Bun.Transpiler["scan"]>;
    try {
      scan = new Bun.Transpiler({ loader: "js" }).scan(new TextDecoder().decode(bytes));
    } catch {
      throw new Error(`${budget.label}: bundle contains invalid JavaScript or unbound exports`);
    }
    const missing = budget.requiredExports.filter((name) => !scan.exports.includes(name));
    if (missing.length) throw new Error(`${budget.label}: bundle lost required exports: ${missing.join(", ")}`);
  }
  const raw = bytes.length;
  const gzip = gzipSync(bytes).length;
  return { ...budget, raw, gzip, exceeded: gzip > budget.maxGzip };
}

export async function measureJavaScript(root = ROOT, build: BundleBuilder = bundleJavaScript): Promise<JavaScriptSize[]> {
  if (!existsSync(join(root, "dist", "index.js"))) {
    throw new Error("dist/index.js not found. Run `bun run build` before checking size budgets.");
  }
  const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const nativeEntry = metadata.exports?.["."]?.["react-native"];
  if (typeof nativeEntry !== "string" || !existsSync(join(root, nativeEntry))) {
    throw new Error("Built react-native package entry not found. Run `bun run build` before checking size budgets.");
  }
  // Required and optional peers belong to the consuming application. Read the
  // published metadata so new peers cannot accidentally creep into measured JS.
  const external = Object.keys(metadata.peerDependencies);
  const sizes: JavaScriptSize[] = [];

  // Copy the real build and metadata into an ordinary consumer's node_modules,
  // so package exports resolve as they do for an app. This also avoids measuring
  // package self-reference special cases; the export/parse gate protects against
  // the invalid, tiny self-reference output previously observed with Bun 1.4.
  const consumer = await mkdtemp(join(tmpdir(), "canvas-size-consumer-"));
  try {
    const packageDir = join(consumer, "node_modules", metadata.name);
    await mkdir(packageDir, { recursive: true });
    await copyFile(join(root, "package.json"), join(packageDir, "package.json"));
    await cp(join(root, "dist"), join(packageDir, "dist"), { recursive: true });
    for (const budget of NAMED_IMPORT_BUDGETS) {
      const source = await readFile(join(root, budget.entry), "utf8");
      const scan = new Bun.Transpiler({ loader: "ts" }).scan(source);
      if (scan.imports.length !== 1 || scan.imports[0].path !== metadata.name) {
        throw new Error(`${budget.label}: fixture must import only from the public package root ${metadata.name}`);
      }
      const target = join(consumer, budget.entry);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(root, budget.entry), target);
    }
    for (const platform of ["web", "ios", "android"] as const) {
      sizes.push(await measureBundle(root, {
        label: `${platform} whole kit`, platform,
        entry: platform === "web" ? "dist/index.js" : nativeEntry,
        maxGzip: JS_MAX_GZIP,
      }, external, build));
      for (const budget of NAMED_IMPORT_BUDGETS) {
        sizes.push(await measureBundle(consumer, { ...budget, platform, label: `${platform} ${budget.label}` }, external, build));
      }
    }
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
  return sizes;
}

export async function checkSize(root = ROOT): Promise<boolean> {
  const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const expectedBun = metadata.packageManager?.replace(/^bun@/, "");
  if (!expectedBun || Bun.version !== expectedBun) {
    throw new Error(`Size budgets require the recorded toolchain ${metadata.packageManager ?? "(missing packageManager)"}; running bun@${Bun.version}.`);
  }
  const files = await collectCSSFiles(join(root, "styles"));
  const sizes: FileSize[] = [];
  for (const file of files) {
    const content = await readFile(file);
    sizes.push({ path: relative(root, file), raw: content.length, gzip: gzipSync(content).length });
  }
  sizes.sort((a, b) => b.gzip - a.gzip);
  const cssFailed = report("Core CSS", sizes, CORE_MAX_TOTAL_GZIP, CORE_MAX_FILE_GZIP, CORE_FILE_GZIP_OVERRIDES);

  const jsSizes = await measureJavaScript(root);
  console.log("\nJavaScript\n==========\n");
  console.log(`${"Consumer".padEnd(32)} ${"Raw".padStart(10)} ${"Gzip".padStart(10)} ${"Budget".padStart(10)}`);
  for (const size of jsSizes) {
    console.log(`${size.label.padEnd(32)} ${(size.raw + "B").padStart(10)} ${(size.gzip + "B").padStart(10)} ${(size.maxGzip + "B").padStart(10)}${size.exceeded ? " !" : ""}`);
    if (size.exceeded) console.log(`  ${size.label} gzip ${size.gzip}B exceeds budget ${size.maxGzip}B`);
  }
  console.log("Required and optional peer dependencies are externalized in every JavaScript measurement.");

  const grandRaw = sizes.reduce((s, f) => s + f.raw, 0);
  const grandGzip = sizes.reduce((s, f) => s + f.gzip, 0);
  console.log(`\nCSS grand total (informational): ${grandRaw}B raw, ${grandGzip}B gzip`);
  const passed = !cssFailed && !jsSizes.some((size) => size.exceeded);
  if (passed) console.log("\nSize check passed.");
  return passed;
}

if (import.meta.main) {
  try {
    if (!await checkSize()) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
