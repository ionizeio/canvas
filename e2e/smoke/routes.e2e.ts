/**
 * Every route the docs app serves, loaded in a real browser.
 *
 * The valuable assertion here is not "it rendered" but the automatic error gate in
 * e2e/support/fixtures.ts: a react-native-web screen whose effect throws still paints
 * a plausible page, so a screenshot proves very little and a console-clean load proves
 * a lot. On top of that each route must paint in the scheme it was asked for, stay on
 * its own URL unless it is a declared redirect, and not scroll sideways.
 *
 * Each route is loaded twice, crossing the axes rather than taking the full matrix:
 * desktop in dark and phone in light. The scheme is seeded app-wide from the launch
 * URL, so it does not interact with the route, and running two of the four cells
 * covers both schemes and both shells at half the page loads.
 */
import { allRoutes, aliasRoutes, type DocsRoute } from "../support/routes";
import { gotoDocs, previewCard, settled, BASE_PATH, type Scheme } from "../support/docs";
import { expect, test } from "../support/fixtures";

interface Variant {
  name: string;
  scheme: Scheme;
  viewport: { width: number; height: number };
}

// 375 rather than 390: it is the narrower of the two phone widths the docs' own
// form-factor switcher offers, so it is the stricter overflow case.
const VARIANTS: Variant[] = [
  { name: "desktop dark", scheme: "dark", viewport: { width: 1280, height: 900 } },
  { name: "phone light", scheme: "light", viewport: { width: 375, height: 812 } },
];

const routes = allRoutes();
const aliases = new Set(aliasRoutes().map((r) => r.path));

/**
 * How far the document runs past its own width, once the layout has settled.
 *
 * Sampling once races the components that size themselves from a measurement of
 * their own box, which is how the responsive suite grew a test that failed under
 * parallel workers and passed alone.
 */
async function documentOverflow(page: import("@playwright/test").Page): Promise<number> {
  return settled(() =>
    page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    }),
  );
}

for (const variant of VARIANTS) {
  test.describe(variant.name, () => {
    for (const route of routes as DocsRoute[]) {
      test(`${route.kind} ${route.name} loads`, async ({ page }) => {
        await gotoDocs(page, route.path, { scheme: variant.scheme, viewport: variant.viewport });

        if (route.redirects) {
          // A redirect shim must land somewhere real, not on the not-found page.
          await expect(page.getByText("Page not found")).toHaveCount(0);
          if (aliases.has(route.path)) {
            await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/components/[a-z0-9-]+`));
            await expect(previewCard(page).first()).toBeVisible();
          }
        } else {
          expect(new URL(page.url()).pathname).toBe(`${BASE_PATH}${route.path}`);
        }

        expect(await documentOverflow(page), "the document scrolls sideways").toBeLessThanOrEqual(0);
      });
    }

    test("an unknown route shows the not-found page", async ({ page, problems }) => {
      problems.expectNotFound = true;
      await gotoDocs(page, "/definitely-not-a-route", {
        scheme: variant.scheme,
        viewport: variant.viewport,
      });
      await expect(page.getByText("Page not found")).toBeVisible();
    });
  });
}
