/**
 * A template's fields survive the phone cut: typed text, focus, and the node itself.
 *
 * The templates used to branch on `useFormFactor()` and return a Column on phones and
 * a Row elsewhere. Swapping the element type remounts everything inside, so a window
 * resized across 640 dropped the field's focus (and its text, where the state lived
 * below the swap), and a phone load remounted every field right after hydration,
 * because the server renders the desktop variant and the client switches. A two-pane
 * template is now a `Row stacks` of spans (the Row measures its own container and only
 * its layout changes), and a breakpoint flag drives props only.
 *
 * Each case holds the field's DOM node from the first render and checks that the same
 * node is still connected, focused, and holding the typed text after every resize. The
 * arrangement of the field against a partner in the other pane is asserted too, so the
 * layout really switched: a Row that never stacked would pass the node checks
 * trivially.
 */
import type { Locator, Page } from "@playwright/test";
import { gotoDocs, settled } from "../support/docs";
import { expect, test } from "../support/fixtures";
import { LINE_END } from "../support/keys";

type Arrangement = "beside" | "above";

interface Case {
  slug: string;
  field: (page: Page) => Locator;
  /** A node in the other pane; omitted where the template has one pane (kanban). */
  partner?: (page: Page) => Locator;
  /** Where the partner sits at the desktop width; it sits above once stacked. */
  wide?: Arrangement;
  /** One-pane templates prove their phone layout by the field itself: a density
   *  prop flips on phones and the field grows taller. */
  tallerOnPhones?: boolean;
}

const CASES: Case[] = [
  {
    // The split-screen form (the centered card above it also has an Email field).
    slug: "signin",
    field: (page) => page.getByLabel("Email", { exact: true }).nth(1),
    partner: (page) => page.getByText("Welcome back", { exact: true }),
    wide: "beside",
  },
  {
    slug: "settings",
    field: (page) => page.getByLabel("Workspace URL", { exact: true }),
    partner: (page) => page.getByRole("tab", { name: "Notifications" }),
    wide: "beside",
  },
  {
    slug: "inbox",
    field: (page) => page.getByPlaceholder("Reply to Rachel…"),
    partner: (page) => page.getByText("Ada Lovelace", { exact: true }),
    wide: "beside",
  },
  {
    slug: "kanban",
    field: (page) => page.getByPlaceholder("Search tasks…"),
    tallerOnPhones: true,
  },
];

/** Where the partner sits relative to the field, once neither is moving. */
async function arrangement(field: Locator, partner: Locator): Promise<Arrangement | "overlapping"> {
  const [f, p] = await settled(async () => [await field.boundingBox(), await partner.boundingBox()]);
  if (!f || !p) return "overlapping";
  if (p.x + p.width <= f.x) return "beside";
  if (p.y + p.height <= f.y) return "above";
  return "overlapping";
}

for (const c of CASES) {
  test(`${c.slug}: a typed field keeps its node, text and focus across the phone cut`, async ({ page }) => {
    await gotoDocs(page, `/templates/${c.slug}`, { scheme: "light", viewport: { width: 1280, height: 900 } });
    const field = c.field(page);
    await field.scrollIntoViewIfNeeded();
    await field.fill("");
    await field.pressSequentially("kept across the cut");
    const typed = await field.inputValue();
    const node = await field.elementHandle();
    expect(node, `${c.slug}: the field has no node`).not.toBeNull();
    const desktopHeight = (await field.boundingBox())?.height ?? 0;

    // 600 and 390 are phone widths, below every pane split's stacking cut; 1280 in
    // between and at the end crosses back.
    for (const width of [600, 1280, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      if (c.partner && c.wide) {
        await expect
          .poll(() => arrangement(field, c.partner!(page)), { message: `${c.slug} never reached its ${width}px layout` })
          .toBe(width >= 1280 ? c.wide : "above");
      } else if (c.tallerOnPhones) {
        const height = async () => (await settled(async () => field.boundingBox()))?.height ?? 0;
        if (width >= 1280) {
          await expect.poll(height, { message: `${c.slug} never reached its ${width}px layout` }).toBe(desktopHeight);
        } else {
          await expect.poll(height, { message: `${c.slug} never reached its ${width}px layout` }).toBeGreaterThan(desktopHeight);
        }
      }
      expect(await node!.evaluate((n) => n.isConnected), `${c.slug}: resizing to ${width} remounted the field`).toBe(true);
      expect(await node!.evaluate((n) => n === document.activeElement), `${c.slug}: resizing to ${width} dropped focus`).toBe(true);
      await expect(field).toHaveValue(typed);
    }
    await node!.dispose();
  });

  test(`${c.slug}: a phone load never remounts a field after hydration`, async ({ page }) => {
    // Record every removal of a node that holds a field, from the first byte on: the
    // server renders the desktop variant, so a template that branched on the viewport
    // threw its fields away in the commit right after hydration.
    await page.addInitScript(() => {
      const removed: string[] = [];
      (window as unknown as { __removedFields: string[] }).__removedFields = removed;
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.removedNodes)) {
            if (node instanceof Element && (node.matches("input, textarea") || node.querySelector("input, textarea"))) {
              removed.push(node.outerHTML.slice(0, 120));
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await gotoDocs(page, `/templates/${c.slug}`, { scheme: "dark", viewport: { width: 390, height: 844 } });
    const field = c.field(page);
    await field.scrollIntoViewIfNeeded();
    if (c.partner) {
      await expect.poll(() => arrangement(field, c.partner!(page)), { message: `${c.slug} never stacked at 390` }).toBe("above");
    }
    const node = await field.elementHandle();
    // Settings' fields hold a saved value; type after it. The line's end, not End:
    // a Mac's End scrolls the page (support/keys.ts).
    await field.press(LINE_END);
    await field.pressSequentially("typed on a phone");
    await settled(async () => field.boundingBox());
    expect(await page.evaluate(() => (window as unknown as { __removedFields: string[] }).__removedFields)).toEqual([]);
    expect(await node!.evaluate((n) => n.isConnected && n === document.activeElement)).toBe(true);
    await expect(field).toHaveValue(/typed on a phone$/);
    await node!.dispose();
  });
}
