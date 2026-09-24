/**
 * A pre-rendered page is rendered for the URL it is served at.
 *
 * The export writes one document per route and renders each at a location it derives
 * from the file name by stripping a trailing `index`. Expo's CLI stripped those letters
 * from any last segment that merely ENDS in "index", so the Carousel's "Default index"
 * example, shipped as /components/carousel/defaultindex.html, was rendered for
 * /components/carousel/default. That name matches the page's default example, so the
 * server rendered the page's redirect to the bare component URL: no stage, no props,
 * and a canonical link to a page that does not exist. The client then hydrated the real
 * variant page over that markup and production React threw error #418. The docs carry a
 * patch for it (docs/patches/@expo%2Fcli@57.0.18.patch), and `bun run check:patches`
 * runs the export's own path function over a name ending in "index".
 *
 * This loads the page the defect shipped. The console gate (support/fixtures.ts) fails
 * the test on the #418 page error; the assertions below say what went wrong when it does.
 * The dev server renders every document at its request URL, so it never had the defect
 * and the test passes there too.
 */
import { BASE_PATH, gotoDocs, platformRow } from "../support/docs";
import { expect, test } from "../support/fixtures";

const ROUTE = "/components/carousel/defaultindex";

/** The path of the document's canonical link, the address its server render was for. */
function canonicalPath(html: string): string | null {
  const href = /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/.exec(html)?.[1];
  return href ? new URL(href).pathname : null;
}

test("a variant page whose name ends in index is pre-rendered for its own URL", async ({ page }) => {
  // The document as it ships, before any script runs.
  const response = await page.request.get(`${BASE_PATH}${ROUTE}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(canonicalPath(html), "the server rendered this document for another URL").toBe(ROUTE);
  // Rendered for the default example's name, the page was the redirect: no examples at all.
  expect(html, "the server rendered no Playground stage for this page").toContain("data-preview-card");

  await gotoDocs(page, ROUTE);
  await expect(page.getByTestId("playground-examples").getByRole("tab", { name: "Default index", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(platformRow(page, "web").getByRole("button", { name: "Slide 2 of 3, current slide" })).toHaveAttribute("aria-current", "true");
});
