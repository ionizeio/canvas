/**
 * The ids a pre-rendered page ships are the ids the client builds.
 *
 * Every docs page is rendered on the server and hydrated on the client, and every id
 * the kit derives from React's useId (a field's label id, the listbox an Autocomplete
 * controls, an avatar disc's gradient) is only correct if both sides build the same
 * tree above it. Expo's static renderer used to render the app inside the +html
 * document, whose <html> and <body> each hold two children, while the client hydrates
 * #root alone, so every useId below #root differed between the two. React never patches
 * a hydrated attribute, so the page kept the server's ids beside client-rendered nodes
 * that use the client's: the Autocomplete's aria-controls pointed at nothing. The docs
 * now carry a patch for that (docs/patches/@expo%2Frouter-server@57.0.7.patch), and a
 * second one for the development wrapper that added the same kind of shift on the dev
 * server only (docs/patches/expo@57.0.16.patch).
 *
 * The console gate (support/fixtures.ts) cannot catch this on the export: production
 * React does not diff hydrated attributes at all, so the canonical run reports nothing.
 * These tests check the effect instead, which holds in both builds.
 */
import type { Page } from "@playwright/test";
import { contentRoutes } from "../support/routes";
import { gotoDocs } from "../support/docs";
import { expect, test } from "../support/fixtures";

test("the Autocomplete's aria-controls names the listbox it opens", async ({ page }) => {
  await gotoDocs(page, "/components/autocomplete");
  const field = page.getByRole("combobox", { name: "Assigned to", exact: true }).first();
  // Read before opening: the attribute is set at hydration and never changes after,
  // which is exactly why a server id that differs from the client's is never repaired.
  const controls = await field.getAttribute("aria-controls");
  expect(controls, "the combobox names no listbox").toBeTruthy();
  await field.focus();
  const list = page.getByRole("listbox", { name: "Assigned to", exact: true });
  await expect(list).toHaveCount(1);
  await expect(list).toBeVisible();
  await expect(list).toHaveAttribute("id", controls!);
});

/** The DOM attributes that carry an id, with the React prop each one is written from. */
const ID_ATTRIBUTES: Record<string, string> = {
  id: "id",
  for: "htmlFor",
  "aria-labelledby": "aria-labelledby",
  "aria-describedby": "aria-describedby",
  "aria-controls": "aria-controls",
  "aria-activedescendant": "aria-activedescendant",
  "aria-owns": "aria-owns",
};

interface IdSweep {
  checked: number;
  mismatches: string[];
}

/**
 * Compare every id-bearing attribute under #root with the prop the client rendered it
 * from.
 *
 * `__reactProps$<random>` is where react-dom keeps a host node's current props (the
 * key has been stable since React 17). Reading it is the only way to see a hydrated
 * attribute diff in production, since the production build keeps no other record of
 * one. A node React never rendered has no such key and is skipped.
 */
async function sweepIds(page: Page): Promise<IdSweep> {
  return page.evaluate((attributes) => {
    const root = document.getElementById("root");
    const result = { checked: 0, mismatches: [] as string[] };
    if (!root) return result;
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const key = Object.keys(element).find((name) => name.startsWith("__reactProps$"));
      if (!key) continue;
      const props = (element as unknown as Record<string, Record<string, unknown>>)[key]!;
      for (const [attribute, prop] of Object.entries(attributes)) {
        const dom = element.getAttribute(attribute);
        if (dom === null) continue;
        result.checked += 1;
        const client = props[prop];
        if (client === undefined || String(client) !== dom) {
          result.mismatches.push(`<${element.tagName.toLowerCase()}> ${attribute}: the page has "${dom}", the client rendered ${JSON.stringify(client)}`);
        }
      }
    }
    return result;
  }, ID_ATTRIBUTES);
}

/**
 * The pages swept: every template (13 of the 18 carry useId-derived ids), and the
 * component pages with the most of them in their pre-rendered markup.
 */
const SWEPT = [
  ...contentRoutes().filter((route) => route.kind === "template").map((route) => route.path),
  "/components/form",
  "/components/select",
  "/components/autocomplete",
];

/** Pages that must carry id references, so the sweep can never pass by checking nothing. */
const CARRIES_IDS = new Set(["/templates/signin", "/templates/team", "/components/form", "/components/select", "/components/autocomplete"]);

for (const path of SWEPT) {
  test(`every id on ${path} is the one the client rendered`, async ({ page }) => {
    await gotoDocs(page, path);
    const sweep = await sweepIds(page);
    if (CARRIES_IDS.has(path)) expect(sweep.checked, `${path} carries no id attributes to check`).toBeGreaterThan(0);
    expect(sweep.mismatches, `${sweep.mismatches.length} of ${sweep.checked} id attribute(s) differ from the client's`).toEqual([]);
  });
}
