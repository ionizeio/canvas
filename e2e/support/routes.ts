/**
 * Every route the docs app serves, derived from the same sources the app itself
 * reads so the suite cannot drift out from under it.
 *
 * docs/src/data/nav.config.json is the docs' single source of navigation truth and
 * is held 1:1 with the generated docs core by docs/scripts/check-nav-sync.ts in CI,
 * which is what makes it safe to enumerate from. It is also plain JSON: the pattern
 * and template data modules compose real kit components, so importing THOSE pulls in
 * React Native and does not parse outside Metro, which is how the screenshot script
 * this suite replaced used to die on startup.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { splitDoc } from "../../tools/docgen/parse-md.ts";
import { COMPONENTS } from "../../docs/src/core/data/components.ts";

/** Walk up from this file to the checkout root (the directory holding e2e/). */
function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name?: string };
      if (pkg.name === "@ionizeio/canvas") return dir;
    } catch {
      // not this level
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error(`could not find the canvas checkout root above ${__dirname}`);
}

export const ROOT = repoRoot();

interface NavConfig {
  routes: Record<string, { label: string; href: string }>;
  web: { sidebar: { group: string; base?: string; components?: { slug: string; name?: string }[] }[] };
}

const nav = JSON.parse(
  readFileSync(join(ROOT, "docs", "src", "data", "nav.config.json"), "utf8"),
) as NavConfig;

export type RouteKind = "guide" | "component" | "template" | "pattern" | "alias";

export interface DocsRoute {
  /** The path to load, e.g. "/components/button". */
  path: string;
  /** A filename-safe name for the test title and any snapshot. */
  name: string;
  kind: RouteKind;
  /** True when the route intentionally answers with a redirect to another path. */
  redirects?: boolean;
}

const KIND_BY_BASE: Record<string, RouteKind> = {
  "/components": "component",
  "/templates": "template",
  "/patterns": "pattern",
};

/** "/tokens/colors" -> "tokens-colors", "/" -> "home". */
function guideName(href: string): string {
  if (href === "/") return "home";
  return href.replace(/^\//, "").replace(/\//g, "-");
}

/**
 * The nav's own guide routes, plus three pages the sidebar does not link.
 *
 * All three answer with a redirect on the web. /tokens and /utilities are shims kept
 * from the pre-tokens URL scheme. /search is the native Search tab's screen: on the
 * web the tab opens the cmd-K palette instead, so the route sends you home
 * (docs/src/app/(search)/search.tsx returns <Redirect href="/" /> under Platform.OS
 * === "web"). Reaching the real screen means running on a device.
 */
export function guideRoutes(): DocsRoute[] {
  const linked = Object.values(nav.routes).map((r) => ({
    path: r.href,
    name: guideName(r.href),
    kind: "guide" as const,
  }));
  return [
    ...linked,
    { path: "/tokens", name: "tokens", kind: "guide", redirects: true },
    { path: "/utilities", name: "utilities", kind: "guide", redirects: true },
    { path: "/search", name: "search", kind: "guide", redirects: true },
  ];
}

/** Every component, template and pattern page: one per sidebar entry under a base. */
export function contentRoutes(): DocsRoute[] {
  return nav.web.sidebar.flatMap((group) =>
    group.base && group.components
      ? group.components.map((c) => ({
          path: `${group.base}/${c.slug}`,
          name: c.slug,
          kind: KIND_BY_BASE[group.base as string] ?? ("component" as const),
        }))
      : [],
  );
}

/** Just the component pages (the ones carrying a playground preview card). */
export function componentRoutes(): DocsRoute[] {
  return contentRoutes().filter((r) => r.kind === "component");
}

/**
 * The legacy component slugs that still resolve: each is a route file that renders
 * a <Redirect> to the slug that replaced it, and each shadows the [slug] route.
 */
export function aliasRoutes(): DocsRoute[] {
  const dir = join(ROOT, "docs", "src", "app", "(components)", "components");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx") && f !== "index.tsx")
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort()
    .map((slug) => ({ path: `/components/${slug}`, name: slug, kind: "alias" as const, redirects: true }));
}

/** Everything, in a stable order. */
export function allRoutes(): DocsRoute[] {
  return [...guideRoutes(), ...contentRoutes(), ...aliasRoutes()];
}

/** Absolute path to a kit component's markdown doc, or null when it has none. */
export function componentDocPath(category: string, dir: string): string {
  return resolve(ROOT, "src", category.toLowerCase(), dir, `${dir}.md`);
}

/**
 * Every Playground example on a component page, as the URL that opens it.
 *
 * The labels come from the component's own markdown (the same fences
 * tools/docgen turns into the generated examples), parsed with the docgen
 * parser rather than a second one, and slugified with the docs' own
 * variantSlug. So this enumeration and what the page renders cannot disagree
 * without one of them failing.
 */
export interface ExampleRoute {
  slug: string;
  /** The tab label shown in the Playground rail. */
  label: string;
  /** The canonical URL for this example: the bare route for the first one. */
  path: string;
}

/** The URL segment for an example label. Mirrors docs/src/lib/variant.ts. */
export function variantSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function examplesFor(slug: string, category: string, dir?: string): ExampleRoute[] {
  const source = componentDocPath(category, dir ?? slug);
  let markdown: string;
  try {
    markdown = readFileSync(source, "utf8");
  } catch {
    // A page with no markdown of its own (the raw React Native primitives) has
    // nothing to enumerate.
    return [];
  }
  const { examples } = splitDoc(markdown);
  return examples.map((example, index) => ({
    slug,
    label: example.label,
    path: index === 0 ? `/components/${slug}` : `/components/${slug}/${variantSlug(example.label)}`,
  }));
}

/** Every component that has markdown, with its examples. */
export function componentExamples(): { route: DocsRoute; examples: ExampleRoute[] }[] {
  const byCategory = new Map(COMPONENTS.map((c) => [c.slug, c]));
  return componentRoutes()
    .map((route) => {
      const doc = byCategory.get(route.name);
      if (!doc) return { route, examples: [] };
      return { route, examples: examplesFor(route.name, doc.category, doc.dir) };
    })
    .filter((entry) => entry.examples.length > 0);
}
