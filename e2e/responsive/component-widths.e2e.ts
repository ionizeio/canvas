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
 * itself, and the page's own scroller (docs/src/ui/page.tsx marks it).
 */
import { componentRoutes, contentRoutes } from "../support/routes";
import { gotoDocs, previewCard, setFormFactor, settled } from "../support/docs";
import { expect, test } from "../support/fixtures";

type Overflow = { document: number; page: number };

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
const KNOWN_OVERFLOW: Record<string, { past: number; why: string }> = {
  // 99 when recorded; re-measured at 106 on the Linux runner across four consecutive
  // main runs (e243db55 through 97b7c182) with no change to the page, and a macOS A/B
  // of the two commits around the shift measured 108 on both, so the extra 7px is the
  // runner's glyph metrics (the link labels set a touch wider), not the page.
  "/components/navbars": { past: 106, why: "the topbar link row does not collapse, so the links run past the card (99 once the card spans the full page column instead of a 384 Container, 106 as the Linux runner measures it)" },
};

test.describe("tablet width", () => {
  for (const route of contentRoutes()) {
    const known = KNOWN_OVERFLOW[route.path];
    test(`${route.kind} ${route.name} fits at 768`, async ({ page }) => {
      await gotoDocs(page, route.path, { scheme: "dark", viewport: { width: 768, height: 1024 } });
      const past = await overflow(page);
      // The document must never scroll sideways, recorded defect or not: that one is
      // whole-page chrome rather than a component that will not narrow.
      expect(past.document, "the document scrolls sideways").toBeLessThanOrEqual(0);

      if (!known) {
        expect(past.page, "the page scroller scrolls sideways").toBeLessThanOrEqual(0);
        return;
      }
      expect(past.page, `${route.path} got worse: ${known.why}`).toBeLessThanOrEqual(known.past);
      expect(
        past.page,
        `${route.path} no longer overflows; delete its KNOWN_OVERFLOW entry`,
      ).toBeGreaterThan(0);
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
