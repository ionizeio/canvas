/**
 * lookout config for the Canvas docs (https://github.com/ionizeio/lookout).
 *
 * Targets the running docs app (bun run dev in docs/, Metro on 8081) and derives
 * the component routes from nav.config.json, which check-nav-sync holds 1:1 with
 * the docs core, so this list cannot drift out from under the sweep.
 *
 * Solid remains the canonical pixel baseline. The separate glass pass covers
 * every route in the maintained material manifest, including inherited surfaces
 * whose unpainted anatomy must survive the theme change. Scheme switches use launch-URL seeding
 * (?scheme=dark|light), which also powers native light capture
 * (canvas:///components/button?scheme=light).
 *
 * Type-only imports: erased at runtime (bun executes this file directly), so
 * nothing here requires @nannier-com/lookout to be installed in canvas.
 */
import type { LookoutConfig, RouteDef, StateRecipe } from "@nannier-com/lookout";
import type { Page } from "playwright";
import navConfig from "./docs/src/data/nav.config.json";
import { MATERIAL_OVERLAY_RECIPES, TOAST_RECIPE } from "./e2e/support/overlay-recipes.ts";
import { MATERIAL_ROUTES, nativeMaterialRoutes, nativeMaterialTarget } from "./e2e/support/material-routes.ts";
import { fitElementForScreenshot } from "./e2e/support/docs.ts";

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
  ...Object.fromEntries(MATERIAL_OVERLAY_RECIPES.map(({ slug }) => [slug, `open-${slug}`])),
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

// ---------------------------------------------------------------------------
// Overlay recipes. The list itself lives in e2e/support/overlay-recipes.ts, shared
// with the end-to-end suite, because keeping two copies is what let four of these go
// stale unnoticed: Select was opened by the text of its current value, which stopped
// matching when the example changed, so the sweep judged a closed Select as an open
// one. Here they are wrapped as lookout StateRecipes: a settle pause after the click,
// Escape to restore, and element:null so the shot is the full page, since an open
// overlay portals to a stage-level outlet OUTSIDE the preview card.
// ---------------------------------------------------------------------------

const stage = (page: Page) => page.locator("[data-preview-stage]").filter({ has: page.locator("[data-preview-card]") }).first();

const states: Record<string, StateRecipe> = Object.fromEntries(
  MATERIAL_OVERLAY_RECIPES.map((recipe) => [
    OVERLAY_STATE[recipe.slug],
    {
      prepare: async (page: Page) => {
        await recipe.open(page, stage(page));
        const host = recipe.atDocumentRoot ? page : stage(page).locator("..");
        await host.getByRole(recipe.role).last().waitFor({ state: "visible" });
      },
      restore: async (page: Page) => {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      },
      element: null,
    } satisfies StateRecipe,
  ]),
);

// Keep the fixed-viewport rest shot and add complete component evidence. Tall
// preview cards live inside a docs scrollport, so Chromium cannot paint their
// offscreen rows merely by requesting an element crop beyond the viewport.
const contentViewports = new WeakMap<Page, { width: number; height: number }>();
states["full-content"] = {
  description: "Complete preview at the same width, with viewport height fitted to the content",
  prepare: async (page: Page) => {
    const viewport = page.viewportSize();
    if (viewport) contentViewports.set(page, viewport);
    await fitElementForScreenshot(page, page.locator("[data-preview-card]").first());
  },
  restore: async (page: Page) => {
    const viewport = contentViewports.get(page);
    if (viewport) await page.setViewportSize(viewport);
    contentViewports.delete(page);
  },
  element: "[data-preview-card]",
};

// Toasts auto-dismiss, so they are shot right after the trigger with no restore. The
// live region is already on the page and empty; the trigger fills it.
states[OVERLAY_STATE.toast] = {
  prepare: async (page: Page) => {
    await TOAST_RECIPE.open(page, stage(page));
    await page.waitForTimeout(350);
  },
  element: null,
};

// Keep the lifted material visible in regression evidence. The selection must
// extend beyond its track without stretching labels or clipping nearby rows.
states["button-group-held"] = {
  prepare: async (page: Page) => {
    // Lookout normally requests Reduce Motion. This state explicitly verifies
    // the interactive lift; the rest capture still checks the reduced version.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await stage(page).getByRole("tab", { name: "Week", exact: true }).first().hover();
    await page.mouse.down();
    await page.waitForTimeout(400);
  },
  restore: async (page: Page) => {
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: "reduce" });
  },
  element: "[data-preview-card]",
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
      // Browser skin previews prove browser rendering, never native materials.
      name: "glass",
      url: "http://localhost:8081",
      startHint: "cd docs && bun run dev",
      query: { surface: "glass" },
      routes: MATERIAL_ROUTES.map(({ path, slug }) => ({
        path,
        name: `${slug}-glass`,
        element: "[data-preview-card]",
        states: ["full-content", ...(slug === "button-group" ? ["button-group-held"] : OVERLAY_STATE[slug] ? [OVERLAY_STATE[slug]!] : [])],
      })),
    },
    ...(["glass", "solid"] as const).map((surface) => ({
      name: `native-${surface}`,
      url: "http://localhost:8081",
      startHint: "cd docs && bun run dev; boot a simulator or emulator with the Canvas docs app installed",
      // Native capture currently supports resting deep links only. Browser state
      // recipes cannot establish an opened native overlay or native liquid motion.
      routes: nativeMaterialRoutes(surface).map(({ path, slug }) => ({
        path,
        name: `${slug}-native-${surface}`,
        platforms: ["ios", "android"] as ("ios" | "android")[],
      })),
    })),
  ],

  // The docs seed theme state from the launch URL (docs-theme.tsx).
  scheme: { mode: "url-param", param: "scheme" },

  states,

  rubric: "./lookout.rubric.md",

  neverFile: [
    "the Dark Factory palette (a violet selection color, a green call to action) instead of Material dynamic color: the kit's palette is Dark Factory's by design",
    "no tonal container / surface-tint palette on Android: by-design token approximation",
    "the brand type family (Manrope) everywhere, with titles at the regular weight: only size, weight, and line-height must map to platform roles",
    "glass mode stripping hairline borders: intended material behavior",
    "Android press ripple absent in WEB-ROW previews: ripple is device-only; never judge it from web shots in either direction",
    "the react-native-web blue focus outline box on web: a known RNW artifact, not a skin bug",
    "the small uppercase platform watermark (iOS / ANDROID / WEB) in each preview row corner: a docs harness label, not component content",
    "the iOS and Android rows on WEB captures are browser previews of the native skins: judge their metrics and anatomy, but material and feedback fidelity only from device shots",
    "Lucide-derived outline glyphs at one 1.75 stroke: the kit's icon set, drawn from a single constant",
    "white cards on a lavender-tinted light page, soft hairline card borders and the ambient (no-offset) shadow ladder: the surfaces this kit is built on",
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
    importPrefixes: ["@ionizeio/canvas"],
    tokenFiles: ["./src/style/tokens.ts", "./styles/canvas.css"],
  },

  native: {
    // Default native run captures glass. For the matching solid run set
    // CANVAS_LOOKOUT_NATIVE_SURFACE=solid and select --targets native-solid.
    target: nativeMaterialTarget(),
    ios: {
      deepLinkScheme: "canvas",
      bundleId: "com.nannier.canvas",
      appearanceParam: "scheme",
      startHint: "Boot an iOS simulator with com.nannier.canvas installed, then run cd docs && bun run dev",
    },
    android: {
      deepLinkScheme: "canvas",
      bundleId: "com.nannier.canvas",
      appearanceParam: "scheme",
      settleMs: 14000,
      startHint: "Boot an Android emulator with com.nannier.canvas installed; set ADB to the SDK adb path if needed; run cd docs && bun run dev",
    },
  },
};

export default config;
