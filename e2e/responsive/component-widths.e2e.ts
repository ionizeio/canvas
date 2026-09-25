/**
 * Nothing scrolls sideways, and the form-factor switcher really clamps the preview.
 *
 * Responsiveness is a core requirement of every Canvas component rather than an
 * add-on, and horizontal overflow is how a failure of it shows up: a table that will
 * not narrow, a row that refuses to stack, a fixed width with no maxWidth beside it.
 * The docgen guardrail already refuses a bare `width >= 280` in an example, which
 * catches the authored cause; this catches the rendered effect, including the causes
 * that live in the component rather than in the example.
 *
 * Two nodes are checked, because the docs scroll in an INNER view: the document
 * itself, and the page's own scroller (docs/src/ui/page.tsx marks it). Both at tablet
 * width and at phone width: the form-factor switcher below clamps the preview card
 * only, so a Do/Don't frame, which the viewport lays out, is caught by the phone pass
 * alone (the Radio page's card example ran 44 px past a 390 px page before RadioGroup
 * took the FILL nature).
 */
import { componentRoutes, contentRoutes } from "../support/routes";
import { gotoDocs, previewCard, setFormFactor, settled } from "../support/docs";
import { expect, test } from "../support/fixtures";

type Overflow = { document: number; page: number };

/**
 * How far past its scrollport the widest Props table's content runs (0 without one).
 * A DataTable clips inside its own horizontal scroller, so a table that will not
 * narrow never reaches the page overflow above: the Props tables once grew to their
 * longest description on one line (9,468 px on the Input page at 390), every
 * description off screen, while the page itself fit.
 */
async function readPropTableOverflow(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const past = [...document.querySelectorAll('[data-testid="prop-table"]')].map((table) => {
      const scroller = [...table.querySelectorAll("div")].find((node) => getComputedStyle(node).overflowX === "auto");
      return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
    });
    return Math.max(0, ...past);
  });
}

/** How far past its own box a node's content runs right now, in CSS pixels. */
async function readOverflow(page: import("@playwright/test").Page): Promise<Overflow> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const scroller = document.querySelector("[data-page-scroll]");
    return {
      document: doc.scrollWidth - doc.clientWidth,
      page: scroller ? scroller.scrollWidth - scroller.clientWidth : 0,
    };
  });
}

/** The overflow once the layout has stopped moving. See `settled` in support/docs. */
async function overflow(page: import("@playwright/test").Page): Promise<Overflow> {
  return settled(() => readOverflow(page));
}

/**
 * Pages that still run past their column at tablet width, with the amount measured
 * when this suite was written.
 *
 * These are real defects, not exemptions: each one is content that will not shrink
 * below the column it sits in, and because the page scroller is overflow-hidden the
 * right-hand side is silently CUT OFF rather than scrolled to. They are recorded
 * rather than ignored so the gate still holds the line: a page not listed here must
 * not overflow at all, and a page listed here must not get worse.
 */
const KNOWN_OVERFLOW: KnownOverflow = {
  // Empty since the Dark Factory Button (0f2505e4): its smaller pills let the Navbar's
  // topbar fit at 768 (the record was 124 on the Linux runner with Manrope), so any page
  // that stops fitting fails outright. The link row still does not collapse into a menu
  // when it runs out of room; ADP-6 owns that.
};

type KnownOverflow = Record<string, { past: number; why: string }>;

/**
 * Pages that still run past their column at phone width, measured the same way. Empty:
 * every page fits at 390, so any page that stops fitting fails outright.
 */
const KNOWN_PHONE_OVERFLOW: KnownOverflow = {};

/** Load a page at a viewport and hold it to the known record for that width. */
async function expectFits(page: import("@playwright/test").Page, path: string, viewport: { width: number; height: number }, known: KnownOverflow[string] | undefined) {
  await gotoDocs(page, path, { scheme: "dark", viewport });
  const past = await overflow(page);
  // The document must never scroll sideways, recorded defect or not: that one is
  // whole-page chrome rather than a component that will not narrow.
  expect(past.document, "the document scrolls sideways").toBeLessThanOrEqual(0);

  if (!known) {
    expect(past.page, "the page scroller scrolls sideways").toBeLessThanOrEqual(0);
    return;
  }
  expect(past.page, `${path} got worse: ${known.why}`).toBeLessThanOrEqual(known.past);
  expect(
    past.page,
    `${path} no longer overflows; delete its known-overflow entry`,
  ).toBeGreaterThan(0);
}

test.describe("tablet width", () => {
  for (const route of contentRoutes()) {
    test(`${route.kind} ${route.name} fits at 768`, async ({ page }) => {
      await expectFits(page, route.path, { width: 768, height: 1024 }, KNOWN_OVERFLOW[route.path]);
    });
  }
});

test.describe("phone width", () => {
  for (const route of contentRoutes()) {
    test(`${route.kind} ${route.name} fits at 390`, async ({ page }) => {
      await expectFits(page, route.path, { width: 390, height: 844 }, KNOWN_PHONE_OVERFLOW[route.path]);
      // A component page's Props tables stack on a phone, so none scrolls sideways.
      expect(await settled(() => readPropTableOverflow(page)), "a Props table scrolls sideways").toBeLessThanOrEqual(0);
    });
  }
});

test.describe("the form-factor switcher", () => {
  // It does two things at once: clamps the preview card to the tier's width AND pins
  // the kit's viewport bucket, so a component measures itself as it would on that
  // tier rather than inside a 1280px desktop page.
  for (const route of componentRoutes()) {
    test(`${route.name} previews at phone and tablet width`, async ({ page }) => {
      await gotoDocs(page, route.path, { scheme: "dark" });
      const card = previewCard(page).first();
      await expect(card).toBeVisible();

      await setFormFactor(page, "phone");
      const phone = await card.boundingBox();
      expect(phone, "the preview card has no box at phone width").not.toBeNull();
      expect(phone!.width).toBeLessThanOrEqual(375);
      expect(phone!.width).toBeGreaterThan(300);
      expect((await overflow(page)).document, "phone width overflows").toBeLessThanOrEqual(0);

      await setFormFactor(page, "tablet");
      const tablet = await card.boundingBox();
      expect(tablet!.width).toBeLessThanOrEqual(768);
      expect(tablet!.width).toBeGreaterThan(phone!.width);
      expect((await overflow(page)).document, "tablet width overflows").toBeLessThanOrEqual(0);
    });
  }
});
