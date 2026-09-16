// Guards the single source of truth: every component/template/pattern enumerated in
// src/data/nav.config.json must exist in the docs core data (and vice versa), so a page can
// never silently drift out of the navigation. Run by CI (ci.yml) and `bun run check:nav`.
//
// Stays free of React Native so it runs in plain bun/node: the component registry is
// a plain data module (imported), while the pattern/template data files now compose
// real kit components (they import @ionizeio/canvas), so their slugs are read straight
// from the source text instead of importing the module graph.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import navConfig from "../src/data/nav.config.json";
import { COMPONENTS } from "../src/core/data/components";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "core", "data");
// Each pattern/template doc entry carries one top-level `slug: "..."`; sections have
// none, and the `getX(slug: string)` params have no quote, so this matches only entries.
function slugsIn(text: string): string[] {
  return [...text.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
}
function dataSlugs(file: string): string[] {
  return slugsIn(readFileSync(join(DATA_DIR, file), "utf8"));
}
// Templates are one live-component module per doc under templates/ (templates.tsx is
// now just a thin registry that imports them and carries no slug literals), so read
// each module's slug from source text — same RN-free approach as the single-file data.
function templateDirSlugs(): string[] {
  const dir = join(DATA_DIR, "templates");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .flatMap((f) => slugsIn(readFileSync(join(dir, f), "utf8")));
}
const templateSlugs = templateDirSlugs();
const patternSlugs = dataSlugs("patterns.tsx");

interface SidebarGroup {
  group: string;
  base?: string;
  components?: { slug: string }[];
}
const sidebar = (navConfig as { web: { sidebar: SidebarGroup[] } }).web.sidebar;

function navLeafSlugs(base: string): string[] {
  return sidebar
    .filter((g) => g.base === base && Array.isArray(g.components))
    .flatMap((g) => g.components!.map((c) => c.slug));
}

function diff(name: string, navSlugs: string[], coreSlugs: string[]): string[] {
  const errs: string[] = [];
  const navSet = new Set<string>();
  for (const s of navSlugs) {
    if (navSet.has(s)) errs.push(`${name}: duplicate slug "${s}" in nav.config.json`);
    navSet.add(s);
  }
  const coreSet = new Set(coreSlugs);
  for (const s of coreSlugs) if (!navSet.has(s)) errs.push(`${name}: "${s}" is in the docs core but missing from nav.config.json`);
  for (const s of navSet) if (!coreSet.has(s)) errs.push(`${name}: "${s}" is in nav.config.json but not in the docs core`);
  return errs;
}

const errors = [
  ...diff("components", navLeafSlugs("/components"), COMPONENTS.map((c) => c.slug)),
  ...diff("templates", navLeafSlugs("/templates"), templateSlugs),
  ...diff("patterns", navLeafSlugs("/patterns"), patternSlugs),
];

if (errors.length) {
  console.error("✗ nav.config.json is out of sync with the docs core:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

console.log(
  `✓ nav.config.json in sync with the docs core ` +
    `(${COMPONENTS.length} components, ${templateSlugs.length} templates, ${patternSlugs.length} patterns)`,
);
