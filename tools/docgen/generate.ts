// Build-time docs codegen (run with `bun run docs:gen`).
//
// Reads every component's co-located markdown (src/<category>/<dir>/<dir>.md),
// parses out the Playground examples and Do/Don't pairs with the shared grammar,
// and emits, for each fence, a real statically-importable example module under
// docs/src/core/examples/, one `<dir>-docs.tsx` module per component beside them that
// wires its fences up with their source strings and labels and carries its prop tables,
// and docs/src/core/registry.ts, which reaches those modules through a
// `require.context` whose mode follows expo-router's own route loading: synchronous
// on native and for the static render, lazy (one chunk per component) in the web
// export, so a component page ships only its own examples.
//
// This replaces the previous docs web shell's runtime engine (sucrase transpile + `new
// Function` against a live scope), which cannot run under React Native's Hermes engine
// (no runtime eval). The generated modules are ordinary TSX: Metro bundles them natively
// and `tsc` type-checks every fence against the real Canvas component types.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { splitDoc, scopeNamesFromLiveScope, bannedStyleViolations, widthShimViolations, bareWidthViolations, prosePhantomApiViolations, BARE_WIDTH_MIN, type Example, type DontPair } from "./parse-md.ts";
import { extractProps, type PropGroup } from "./extract-props.ts";
import { COMPONENTS } from "../../docs/src/core/data/components.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const CATEGORIES = ["atoms", "molecules", "organisms", "charts"] as const;
type Category = (typeof CATEGORIES)[number];

const EXAMPLES_DIR = path.join(REPO, "docs", "src", "core", "examples");
const REGISTRY_FILE = path.join(REPO, "docs", "src", "core", "registry.ts");
const CHUNKS_FILE = path.join(REPO, "docs", "src", "core", "docs-chunks.json");
const PREVIEWS_FILE = path.join(REPO, "docs", "src", "core", "previews.ts");

// `--check` (the pre-push gate) answers "is the generated output in sync with the
// component markdown?" without touching the working tree: every would-be write and
// every orphan is recorded as drift instead of applied, and the run exits non-zero
// naming the stale paths.
//
// The gate used to regenerate for real and then ask `git status --porcelain
// docs/src/core` whether the tree went dirty. That conflated two different things:
// docs/src/core holds the three paths below AND hand-written modules (photos.ts,
// build-scopes.*.ts, scope.ts), so any uncommitted edit to a hand-written file failed
// the push and blamed codegen for work codegen never did. Asking the generator itself
// keeps the gate scoped to exactly what it owns, needs no second copy of that path list
// here or in package.json, names the offending file instead of the whole directory, and
// leaves a dirty tree alone on failure.
const CHECK = process.argv.includes("--check");
const drift: string[] = [];
const rel = (file: string) => path.relative(REPO, file);

// The source files a dir's prop tables are extracted from: every `.tsx` in the dir
// except the platform forks (which only wire skins, no Props) and tests. Scanning
// all of them lets a dir with more than one Props-bearing file (e.g. charts.shared
// + charts-viz) contribute every group.
const IS_PROP_SOURCE = (name: string) =>
  name.endsWith(".tsx") &&
  !/\.(ios|android|web)\.tsx$/.test(name) &&
  !/\.test\.tsx$/.test(name);

// The names an example fence may reference, taken straight from the docs runtime
// scope so the destructure list never drifts from the single source of truth.
const SCOPE_NAMES = scopeNamesFromLiveScope(
  fs.readFileSync(path.join(REPO, "docs", "src", "core", "live-scope.ts"), "utf8"),
);
if (SCOPE_NAMES.length === 0) {
  throw new Error("Could not extract LIVE_SCOPE names from docs/src/core/live-scope.ts");
}

const SCOPE_NAME_SET = new Set(SCOPE_NAMES);

// Every capitalized JSX tag a fence uses must be a known scope name; otherwise the
// generated module would destructure nothing for it and reference an unbound
// identifier (a cryptic `tsc` "Cannot find name" / a runtime ReferenceError). The
// scope (docs/src/core/live-scope.ts) and the type each fence is checked against (the
// `@ionizeio/canvas` barrel) are separate sources, so a component added to the
// barrel and used in a fence — but not to the scope — would slip through. Collect
// any such tags during generation and fail fast with a clear, source-located error.
const tagViolations: { tag: string; source: string }[] = [];
function recordFenceTags(code: string, source: string) {
  for (const m of code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    if (!SCOPE_NAME_SET.has(m[1])) tagViolations.push({ tag: m[1], source });
  }
}

// Style-shim guardrail (CLAUDE.md "No styling escape hatches"). Run only over the
// example and "Do" fences — "Don't" fences hand-roll the wrong way on purpose.
// The example sweep reached zero, so this HARD-FAILS by default: any new banned
// `style={{…}}` in a fence breaks `docs:gen` (and thus the pre-push hook + CI).
// Set DOCGEN_STYLE_STRICT=0 to downgrade to a warning (a last-resort escape).
const STYLE_STRICT = process.env.DOCGEN_STYLE_STRICT !== "0";
// The primitive doc pages legitimately style the raw primitive: their whole point
// is to teach `<View style={…}>` / `<Image style={…}>` etc. The 6 primitives are
// the explicitly-allowed foundation (and RN's Image can't take semantic props), so
// their own pages are exempt from the styling-escape-hatch guardrail.
const EXEMPT_STYLE_DIRS = new Set(["view", "text", "text-input", "pressable", "scroll-view", "image"]);
// Prose guardrail (companion to the style guardrail): the intro + "Do" captions
// must name the real component API, not a web/CSS-framework idiom the RN kit does
// not expose (a Tailwind class, a CSS property, an HTML element). Same STRICT gate.
const proseViolations: { source: string; hits: { line: number; token: string; kind: string }[] }[] = [];
function recordProse(md: string, source: string) {
  const hits = prosePhantomApiViolations(md);
  if (hits.length) proseViolations.push({ source, hits });
}

// Bare-width guardrail: a fixed width >= BARE_WIDTH_MIN with no maxWidth in the
// same style overflows the docs page at phone width (the content box is the
// viewport minus 56px). Runs over EVERY fence — "Don't" fences included (a
// wrong-way demo must still not overflow the page) — and over the primitive
// pages too (EXEMPT_STYLE_DIRS covers WHICH style keys they may teach, not
// overflow). Same STRICT gate and `// docgen-allow-style` line opt-out.
const bareWidthFindings: { source: string; kind: string; widths: string[] }[] = [];
function recordFenceBareWidth(code: string, source: string, kind: string) {
  const widths = bareWidthViolations(code);
  if (widths.length) bareWidthFindings.push({ source, kind, widths });
}

const styleViolations: { source: string; kind: string; props: string[] }[] = [];
function recordFenceStyle(code: string, source: string, kind: string, dir: string) {
  if (EXEMPT_STYLE_DIRS.has(dir)) return;
  // width/max/minWidth directly on a non-layout tag is the shim the layout tier
  // (Container steps, Row spans) replaced; report it alongside the banned style
  // keys.
  const props = [...bannedStyleViolations(code), ...widthShimViolations(code)];
  if (props.length) styleViolations.push({ source, kind, props });
}

const GENERATED_HEADER = "/* @generated by tools/docgen. DO NOT EDIT. Run `bun run docs:gen`. */";

// Absolute paths of every example module this run produces. Used to prune orphan
// modules left by deleted fences without nuking the whole tree up front (see
// pruneOrphans), so an unchanged run touches nothing on disk.
const writtenExampleFiles = new Set<string>();

// Write `content` to `file` only when it differs from what's already on disk, so a
// no-op codegen run leaves the file's mtime and inode untouched. Metro's module map
// and watchman key off mtime, so rewriting byte-identical files on every push would
// invalidate the docs dev client's index and break the running iOS bundler.
function writeFileIfChanged(file: string, content: string): void {
  let existing: string | null = null;
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    existing = null;
  }
  if (existing === content) return;
  if (CHECK) {
    drift.push(`${rel(file)} (${existing === null ? "never generated" : "stale"})`);
    return;
  }
  fs.writeFileSync(file, content);
}

// Remove any file under `root` this run did not (re)generate, then drop directories
// left empty by the removal. Replaces the old up-front rmSync of EXAMPLES_DIR: a
// deleted fence still loses its orphan module, but surviving modules keep their
// identity when their content is unchanged.
function pruneOrphans(root: string): void {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      pruneOrphans(full);
      if (!CHECK && fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    } else if (!writtenExampleFiles.has(full)) {
      if (CHECK) drift.push(`${rel(full)} (orphan; its fence is gone)`);
      else fs.rmSync(full);
    }
  }
}

// A valid JS identifier fragment for a dir/name (e.g. "button-group" -> "button_group").
const ident = (s: string) => s.replace(/[^A-Za-z0-9_$]/g, "_");

// The scope names a fence references (word-boundary match). False positives (a name
// that only appears inside a string) are harmless — an unused destructure binding —
// while every real JSX tag and helper resolves. All SCOPE_NAMES are value exports,
// so the destructure is always valid.
function usedScopeNames(code: string): string[] {
  return SCOPE_NAMES.filter((name) => new RegExp(`\\b${name}\\b`).test(code));
}

// Emit one example module. `depth` is how many dirs the module sits below docs/src/core
// (examples/<category>/<dir>/ = 3), used to reach docs/src/core/scope.ts.
function exampleModule(code: string, source: string): string {
  const used = usedScopeNames(code);
  const destructure = used.length ? `  const { ${used.join(", ")} } = scope;\n` : "";
  return `${GENERATED_HEADER}
// Source: ${source}
import type { ExampleScope } from "../../../scope";

export default function Example(scope: ExampleScope) {
${destructure}  return (
${code.trim()}
  );
}
`;
}

type ExampleRef = { label: string; code: string; importName: string; file: string };
type DontRef = {
  title?: string;
  do: { caption: string; code: string; importName: string; file: string };
  dont: { caption: string; code: string; importName: string; file: string };
};
type Entry = { dir: string; category: Category; examples: ExampleRef[]; donts: DontRef[] };

function writeModule(category: Category, dir: string, name: string, code: string, source: string): {
  importName: string;
  file: string;
} {
  const outDir = path.join(EXAMPLES_DIR, category, dir);
  if (!CHECK) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.tsx`);
  writeFileIfChanged(file, exampleModule(code, source));
  writtenExampleFiles.add(file);
  return {
    importName: `e_${ident(category)}_${ident(dir)}_${ident(name)}`,
    file: `./examples/${category}/${dir}/${name}`,
  };
}

function buildEntry(category: Category, dir: string, examples: Example[], donts: DontPair[]): Entry {
  const source = `src/${category}/${dir}/${dir}.md`;
  for (const ex of examples) { recordFenceTags(ex.code, source); recordFenceStyle(ex.code, source, "example", dir); recordFenceBareWidth(ex.code, source, "example"); }
  for (const d of donts) {
    recordFenceTags(d.do.code, source);
    recordFenceTags(d.dont.code, source);
    // Only the "Do" side is held to the no-escape-hatches rule; the "Don't" side
    // intentionally hand-rolls the anti-pattern it is teaching against.
    recordFenceStyle(d.do.code, source, "Do", dir);
    // The bare-width rule binds BOTH sides: a "Don't" demo still renders on the
    // page, so it must not overflow it either.
    recordFenceBareWidth(d.do.code, source, "Do");
    recordFenceBareWidth(d.dont.code, source, "Don't");
  }
  const exampleRefs: ExampleRef[] = examples.map((ex, i) => {
    const m = writeModule(category, dir, `example-${i}`, ex.code, source);
    return { label: ex.label, code: ex.code, importName: m.importName, file: m.file };
  });
  const dontRefs: DontRef[] = donts.map((d, i) => {
    const doMod = writeModule(category, dir, `dont-${i}-do`, d.do.code, source);
    const dontMod = writeModule(category, dir, `dont-${i}-dont`, d.dont.code, source);
    return {
      title: d.title,
      do: { caption: d.do.caption, code: d.do.code, importName: doMod.importName, file: doMod.file },
      dont: { caption: d.dont.caption, code: d.dont.code, importName: dontMod.importName, file: dontMod.file },
    };
  });
  return { dir, category, examples: exampleRefs, donts: dontRefs };
}

// The module a component's docs live in, beside its example modules: the DocEntry
// (its fences with their sources and labels) and its prop tables. Everything a
// component page needs, and nothing another page's needs, so the web export can
// ship it as that page's own chunk.
// Named `<dir>-docs`, one token with no dot: Metro names a split chunk after the part of
// the module basename before its first dot, and `<dir>` alone collides with the routes
// that share a component's name (carousel, tabs, listbox, layout, typography).
const docsModuleFile = (category: Category, dir: string) => path.join(EXAMPLES_DIR, category, dir, `${dir}-docs.tsx`);

function renderDocsModule(e: Entry, props: PropGroup[]): string {
  const imports: string[] = [];
  const local = (file: string) => `./${path.basename(file)}`;
  for (const ex of e.examples) imports.push(`import ${ex.importName} from "${local(ex.file)}";`);
  for (const d of e.donts) {
    imports.push(`import ${d.do.importName} from "${local(d.do.file)}";`);
    imports.push(`import ${d.dont.importName} from "${local(d.dont.file)}";`);
  }
  const examples = e.examples
    .map((ex) => `    { label: ${JSON.stringify(ex.label)}, code: ${JSON.stringify(ex.code)}, render: ${ex.importName} },`)
    .join("\n");
  const donts = e.donts
    .map((d) => {
      const title = d.title === undefined ? "" : `title: ${JSON.stringify(d.title)}, `;
      const side = (s: DontRef["do"]) =>
        `{ caption: ${JSON.stringify(s.caption)}, code: ${JSON.stringify(s.code)}, render: ${s.importName} }`;
      return `    { ${title}do: ${side(d.do)}, dont: ${side(d.dont)} },`;
    })
    .join("\n");
  return `${GENERATED_HEADER}
// Source: src/${e.category}/${e.dir}/${e.dir}.md
import type { ComponentDocs } from "../../../scope";
${imports.join("\n")}

export const docs: ComponentDocs = {
  dir: ${JSON.stringify(e.dir)},
  category: ${JSON.stringify(e.category)},
  examples: [
${examples}
  ],
  donts: [
${donts}
  ],
  // Extracted from the component's exported \`*Props\` interfaces by
  // tools/docgen/extract-props.ts (the TypeScript checker).
  props: ${JSON.stringify(props)},
};
`;
}

// The first fence's source per component, for the pages that quote a component's API
// without rendering it (the home page's three-looks rotator): a few kilobytes of
// strings, so no page has to load a component's whole docs chunk for a code chip.
function renderPreviews(entries: Entry[]): string {
  const rows = entries
    .filter((e) => e.examples.length > 0)
    .map((e) => `  ${JSON.stringify(e.dir)}: ${JSON.stringify(e.examples[0].code)},`)
    .join("\n");
  return `${GENERATED_HEADER}
// The verbatim source of each documented component's first (default) example, keyed by
// its source directory. The full docs (every fence, rendered, plus the prop tables) live
// in the per-component modules the registry loads; this is the light companion for a
// page that only quotes the API.
export const FIRST_EXAMPLE_CODE: Record<string, string> = {
${rows}
};
`;
}

// The registry reaches every component's docs module through one require.context in
// lazy mode, the mode expo-router loads its routes with: Metro emits one chunk per
// module in a split web export, and hands back Expo's async require promise, whose
// `_result` is the module itself whenever the module is already registered. That is
// the case on native and in the static render (single bundles) and on a component
// page that ships its own docs chunk, so those reads are synchronous; only a
// client-side navigation to a component whose chunk is not on the page waits. (The
// mode is a literal on purpose: Expo inlines EXPO_ROUTER_IMPORT_MODE as "sync" for
// every file outside expo-router itself, so following the router's constant would
// never split.)
function renderRegistry(entries: Entry[]): string {
  const keys = entries
    .map((e) => `  ${JSON.stringify(e.dir)}: ${JSON.stringify(`./${e.category}/${e.dir}/${e.dir}-docs.tsx`)},`)
    .join("\n");
  return `${GENERATED_HEADER}
import type { ComponentDocs } from "./scope";

// The context key of every documented component's docs module, by its source directory
// (the \`.md\` stem). The consuming page maps a URL slug to its dir via the components
// data, then loads that module (see loadComponentDocs and use-component-docs.ts).
export const COMPONENT_DOC_KEYS: Record<string, string> = {
${keys}
};

// Lazy on purpose (a split web export gets one chunk per module); the promise carries
// \`_result\`, the module itself, wherever the module is already registered.
const context = require.context("./examples", true, /\\/[^/]+-docs\\.tsx$/, "lazy");

export type LoadedComponentDocs = { docs: ComponentDocs };
export type ComponentDocsRequest = Promise<LoadedComponentDocs> & { _result?: LoadedComponentDocs | Promise<LoadedComponentDocs> };

/** The docs module request for a component dir, or undefined for a dir with no fences. */
export function loadComponentDocs(dir: string): ComponentDocsRequest | undefined {
  const key = COMPONENT_DOC_KEYS[dir];
  if (key === undefined) return undefined;
  return context(key) as ComponentDocsRequest;
}
`;
}

function main() {
  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });

  const entries: Entry[] = [];
  const propSources: { dir: string; file: string }[] = [];
  let exampleCount = 0;
  let dontCount = 0;

  for (const category of CATEGORIES) {
    const catDir = path.join(REPO, "src", category);
    if (!fs.existsSync(catDir)) continue;
    for (const dir of fs.readdirSync(catDir).sort()) {
      const md = path.join(catDir, dir, `${dir}.md`);
      if (!fs.existsSync(md)) continue;
      const content = fs.readFileSync(md, "utf8");
      recordProse(content, `src/${category}/${dir}/${dir}.md`);
      const { examples, donts } = splitDoc(content);
      if (examples.length === 0 && donts.length === 0) continue;
      entries.push(buildEntry(category, dir, examples, donts));
      // Collect this dir's Props-bearing source files for the prop tables.
      for (const f of fs.readdirSync(path.join(catDir, dir)).sort()) {
        if (IS_PROP_SOURCE(f)) propSources.push({ dir, file: path.join(catDir, dir, f) });
      }
      exampleCount += examples.length;
      dontCount += donts.length;
    }
  }

  if (tagViolations.length) {
    const uniq = [...new Map(tagViolations.map((v) => [`${v.tag}|${v.source}`, v])).values()];
    throw new Error(
      `docs:gen — ${uniq.length} JSX tag(s) used in a fence are not in the example scope ` +
        `(docs/src/core/live-scope.ts LIVE_SCOPE); the generated module would reference an unbound ` +
        `identifier. Add them to LIVE_SCOPE:\n` +
        uniq.map((v) => `  <${v.tag}> in ${v.source}`).join("\n"),
    );
  }

  if (styleViolations.length) {
    const bySource = new Map<string, Set<string>>();
    for (const v of styleViolations) {
      const set = bySource.get(v.source) ?? new Set<string>();
      v.props.forEach((p) => set.add(p));
      bySource.set(v.source, set);
    }
    const lines = [...bySource.entries()]
      .sort()
      .map(([src, props]) => `    ${src}: ${[...props].sort().join(", ")}`);
    const header =
      `${styleViolations.length} example/"Do" fence(s) across ${bySource.size} component(s) still pass a banned ` +
      `style={{…}} (CLAUDE.md "No styling escape hatches"). Fix with Row/Column, Typography tone/weight, Chip, ` +
      `Emblem, Divider, or the component's own props.`;
    if (STYLE_STRICT) {
      throw new Error(`docs:gen — ${header}\n${lines.join("\n")}`);
    }
    console.warn(`\n⚠ docs:gen — ${header}\n${lines.join("\n")}\n  (warning only; set DOCGEN_STYLE_STRICT=1 to fail.)\n`);
  }

  if (bareWidthFindings.length) {
    const bySource = new Map<string, Set<string>>();
    for (const v of bareWidthFindings) {
      const set = bySource.get(v.source) ?? new Set<string>();
      v.widths.forEach((w) => set.add(w));
      bySource.set(v.source, set);
    }
    const lines = [...bySource.entries()]
      .sort()
      .map(([src, widths]) => `    ${src}: ${[...widths].sort().join(", ")}`);
    const header =
      `${bareWidthFindings.length} fence(s) across ${bySource.size} component(s) pin a bare fixed width >= ` +
      `${BARE_WIDTH_MIN} with no maxWidth in the same style; that overflows the docs page at phone width. ` +
      `Add maxWidth: "100%" beside the width ("Don't" fences included).`;
    if (STYLE_STRICT) {
      throw new Error(`docs:gen: ${header}\n${lines.join("\n")}`);
    }
    console.warn(`\n⚠ docs:gen: ${header}\n${lines.join("\n")}\n  (warning only; set DOCGEN_STYLE_STRICT=1 to fail.)\n`);
  }

  if (proseViolations.length) {
    const totalHits = proseViolations.reduce((n, v) => n + v.hits.length, 0);
    const lines = proseViolations
      .sort((a, b) => a.source.localeCompare(b.source))
      .flatMap((v) => v.hits.map((h) => `    ${v.source}:${h.line}  "${h.token}"  (${h.kind})`));
    const header =
      `${totalHits} web/CSS-framework idiom(s) in prose across ${proseViolations.length} component(s). Canvas is a ` +
      `React Native kit: docs prose must name the real prop or token (rows, mono, links, the muted tone, the width ` +
      `axis), not a Tailwind class, CSS property, or HTML element. Reword the "Do"/intro text, or add ` +
      `docgen-allow-prose to the line as a last resort.`;
    if (STYLE_STRICT) {
      throw new Error(`docs:gen — ${header}\n${lines.join("\n")}`);
    }
    console.warn(`\n⚠ docs:gen — ${header}\n${lines.join("\n")}\n  (warning only; set DOCGEN_STYLE_STRICT=1 to fail.)\n`);
  }

  const props = extractProps(propSources);
  for (const e of entries) {
    const file = docsModuleFile(e.category, e.dir);
    writeFileIfChanged(file, renderDocsModule(e, props[e.dir] ?? []));
    writtenExampleFiles.add(file);
  }

  // Drop modules from fences that no longer exist before writing the registry that
  // reaches them, so a stale orphan can't satisfy a key that should have failed.
  pruneOrphans(EXAMPLES_DIR);

  writeFileIfChanged(REGISTRY_FILE, renderRegistry(entries));
  writeFileIfChanged(PREVIEWS_FILE, renderPreviews(entries));
  // Which chunk carries each page's docs, for the export's post-processing: a page's
  // URL slug maps to a docs module basename, which Metro names the chunk after.
  const chunks: Record<string, string> = {};
  for (const c of COMPONENTS) {
    const dir = c.dir ?? c.slug;
    if (entries.some((e) => e.dir === dir)) chunks[c.slug] = `${dir}-docs`;
  }
  writeFileIfChanged(CHUNKS_FILE, `${JSON.stringify(chunks, null, 2)}\n`);
  const propGroupCount = Object.values(props).reduce((n, groups) => n + groups.length, 0);
  const propRowCount = Object.values(props).reduce(
    (n, groups) => n + groups.reduce((m, g) => m + g.props.length, 0),
    0,
  );

  if (CHECK) {
    if (drift.length) {
      throw new Error(
        `docs:gen --check found ${drift.length} generated file(s) out of sync with the component markdown. ` +
          `Run \`bun run docs:gen\` and commit the result:\n${drift
            .sort()
            .map((d) => `    ${d}`)
            .join("\n")}`,
      );
    }
    console.log(`docs:gen --check verified ${entries.length} components; the generated output is in sync.`);
    return;
  }

  console.log(
    `docs:gen — ${entries.length} components, ${exampleCount} examples, ${dontCount} Do/Don't pairs ` +
      `(${exampleCount + dontCount * 2} modules); ${propGroupCount} prop tables, ${propRowCount} rows → docs/src/core/`,
  );
}

main();
