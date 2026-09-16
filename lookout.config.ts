/**
 * lookout config for the Canvas docs (https://github.com/ionizeio/lookout).
 *
 * Targets the running docs app (bun run dev in docs/, Metro on 8081) and derives
 * the component routes from nav.config.json, which check-nav-sync holds 1:1 with
 * the docs core, so this list cannot drift out from under the sweep.
 *
 * Canonical judging runs on the SOLID surface (?surface=solid pinned via the
 * target query): glass frosts are GPU-nondeterministic and would churn the
 * judge's hash cache. The 14 functional-layer components get a separate
 * glass-target pass. Scheme switches ride the docs' launch-URL seeding
 * (?scheme=dark|light), which also powers native light capture
 * (canvas:///components/button?scheme=light).
 *
 * Type-only imports: erased at runtime (bun executes this file directly), so
 * nothing here requires @nannier-com/lookout to be installed in canvas.
 */
import type { LookoutConfig, RouteDef, StateRecipe } from "@nannier-com/lookout";
import type { Page } from "playwright";
import navConfig from "./docs/src/data/nav.config.json";
import { OVERLAY_RECIPES, TOAST_RECIPE } from "./e2e/support/overlay-recipes.ts";

// ---------------------------------------------------------------------------
// Routes: every component page, element-shot on the preview card (the 3-up
// platform rows without the switcher row or code block; data-preview-card is
// the docs' tooling hook). Overlay-bearing routes add an open-state recipe.
// ---------------------------------------------------------------------------

const sidebar = (navConfig as {
  web: { sidebar: { base?: string; components?: { slug: string }[] }[] };
}).web.sidebar;

/** Overlay routes and the state that opens them (see states below). */
const OVERLAY_STATE: Record<string, string> = {
  dialog: "open-dialog",
  "alert-dialog": "open-alert-dialog",
  dropdown: "open-dropdown",
  popover: "open-popover",
  "action-sheet": "open-action-sheet",
  drawer: "open-drawer",
  "row-menu": "open-row-menu",
  select: "open-select",
  autocomplete: "open-autocomplete",
  command: "open-command",
  toast: "show-toast",
};

// Each sidebar group carries the path base its entries live under (/components,
// /templates, /patterns); a component can appear in more than one group, so a path is
// captured once. Only the component reference renders the preview card: the template
// and pattern pages (MockupDocPage) are shot full-page and open no overlay.
const seenPaths = new Set<string>();
const componentRoutes: RouteDef[] = sidebar.flatMap((group) =>
  (group.components ?? []).flatMap((c): RouteDef[] => {
    const base = group.base ?? "/components";
    const path = `${base}/${c.slug}`;
    if (seenPaths.has(path)) return [];
    seenPaths.add(path);
    if (base !== "/components") return [{ path, name: `${base.slice(1)}/${c.slug}` }];
    return [
      {
        path,
        name: c.slug,
        element: "[data-preview-card]",
        states: OVERLAY_STATE[c.slug] ? [OVERLAY_STATE[c.slug]!] : [],
      },
    ];
  }),
);

/** Functional-layer components: the ones that render the glass material. */
const FUNCTIONAL_LAYER = [
  "dialog",
  "alert-dialog",
  "dropdown",
  "select",
  "autocomplete",
  "popover",
  "tooltip",
  "action-sheet",
  "drawer",
  "command",
  "row-menu",
  "navbars",
  "sidebar",
  "toast",
];

// ---------------------------------------------------------------------------
// Overlay recipes. The list itself lives in e2e/support/overlay-recipes.ts, shared
// with the end-to-end suite, because keeping two copies is what let four of these go
// stale unnoticed: Select was opened by the text of its current value, which stopped
// matching when the example changed, so the sweep judged a closed Select as an open
// one. Here they are wrapped as lookout StateRecipes: a settle pause after the click,
// Escape to restore, and element:null so the shot is the full page, since an open
// overlay portals to a stage-level outlet OUTSIDE the preview card.
// ---------------------------------------------------------------------------

const stage = (page: Page) => page.locator("[data-preview-stage]").first();

const states: Record<string, StateRecipe> = Object.fromEntries(
  OVERLAY_RECIPES.map((recipe) => [
    OVERLAY_STATE[recipe.slug],
    {
      prepare: async (page: Page) => {
        await recipe.open(page, stage(page));
        await page.waitForTimeout(400);
      },
      restore: async (page: Page) => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      },
      element: null,
    } satisfies StateRecipe,
  ]),
);

// Toasts auto-dismiss, so they are shot right after the trigger with no restore. The
// live region is already on the page and empty; the trigger fills it.
states[OVERLAY_STATE.toast] = {
  prepare: async (page: Page) => {
    await TOAST_RECIPE.open(page, stage(page));
    await page.waitForTimeout(350);
  },
  element: null,
};

// ---------------------------------------------------------------------------

const config: LookoutConfig = {
  project: "canvas",

  targets: [
    {
      name: "docs",
      url: "http://localhost:8081",
      startHint: "cd docs && bun run dev  (Metro on 8081, preview opener on 8790)",
      query: { surface: "solid" },
      routes: componentRoutes,
    },
    {
      // Glass regression pass: the functional-layer components under the
      // glass material, judged for glass-specific defects only.
      name: "glass",
      url: "http://localhost:8081",
      startHint: "cd docs && bun run dev",
      query: { surface: "glass" },
      routes: FUNCTIONAL_LAYER.map((slug) => ({
        path: `/components/${slug}`,
        name: `${slug}-glass`,
        element: "[data-preview-card]",
        states: OVERLAY_STATE[slug] ? [OVERLAY_STATE[slug]!] : [],
      })),
    },
  ],

  // The docs seed theme state from the launch URL (docs-theme.tsx).
  scheme: { mode: "url-param", param: "scheme" },

  states,

  rubric: "./lookout.rubric.md",

  neverFile: [
    "brand sky primary instead of Material dynamic color: the kit's palette is the Riskora token set by design",
    "no tonal container / surface-tint palette on Android: by-design token approximation",
    "the brand type family (Urbanist) everywhere, with titles at the regular weight: only size, weight, and line-height must map to platform roles",
    "glass mode stripping hairline borders: intended material behavior",
    "Android press ripple absent in WEB-ROW previews: ripple is device-only; never judge it from web shots in either direction",
    "the react-native-web blue focus outline box on web: a known RNW artifact, not a skin bug",
    "the small uppercase platform watermark (iOS / ANDROID / WEB) in each preview row corner: a docs harness label, not component content",
    "the iOS and Android rows on WEB captures are browser previews of the native skins: judge their metrics and anatomy, but material and feedback fidelity only from device shots",
    "Lucide-derived outline glyphs at one 1.75 stroke: the kit's icon set, drawn from a single constant",
    "white cards on a faintly tinted light page, soft hairline card borders and the ambient (no-offset) shadow ladder: the Riskora surfaces this kit is built on",
    "the circular indicator in Spinner and in a loading Button: information-bearing motion by design; Skeleton is the shimmer",
    "pill-shaped chips and badges on the iOS and Android rows: platform shape, not a rounding accident",
    "10pt tab-bar labels on iOS rows: the HIG size for that control",
    "sample names, addresses and figures in the examples: illustrative data, unless it is literally placeholder text",
  ],

  // Where a defect gets fixed. This repository IS the kit, so a finding on a docs
  // page is almost always a fix in src/, not in the page that showed it.
  designSystem: {
    name: "Canvas",
    packageRoot: ".",
    componentRoots: ["./src/atoms", "./src/molecules", "./src/organisms", "./src/charts"],
    importPrefixes: ["@nannier-com/canvas"],
    tokenFiles: ["./src/style/tokens.ts", "./styles/canvas.css"],
  },

  native: {
    target: "docs",
    ios: { deepLinkScheme: "canvas", bundleId: "com.nannier.canvas", appearanceParam: "scheme" },
    android: {
      deepLinkScheme: "canvas",
      bundleId: "com.nannier.canvas",
      appearanceParam: "scheme",
      settleMs: 14000,
    },
  },
};

export default config;
