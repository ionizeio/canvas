/**
 * A picture of every overlay while it is open.
 *
 * The component baselines catch the resting state; an overlay's whole point is the
 * state you cannot see at rest. An open dialog's scrim, a menu's elevation, a
 * listbox's selected row: none of that appears in the card shot.
 *
 * Anchored overlays are placed within the Playground's stage (a card that closes on
 * an outside tap paints in the app root's outlet, over the stage), so the stage is the
 * frame: its screenshot takes whatever is painted over it. Drawer and ActionSheet go
 * through react-native-web's Modal, which renders at the document root, so those two
 * are full-page.
 */
import { OVERLAYS } from "../support/overlays";
import { fitElementForScreenshot, gotoDocs, settledBox, stage } from "../support/docs";
import { expect, test } from "../support/fixtures";

const FIXED_TIME = new Date("2026-01-15T12:00:00Z");

for (const scheme of ["dark", "light"] as const) {
  for (const recipe of OVERLAYS) {
    test(`${recipe.slug} open in ${scheme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME);
      await gotoDocs(page, `/components/${recipe.slug}`, { scheme, surface: "solid" });
      await expect(stage(page)).toBeVisible();

      await recipe.open(page);
      await expect(recipe.panel(page).last()).toBeVisible();
      // Visible is not settled. An anchored overlay portals into the stage, and the
      // stage grows to hold it a layout pass LATER, so a shot taken here catches the
      // closed height. toHaveScreenshot's own retry stabilises pixels, not the box,
      // so it cannot see the difference: it happily agreed with itself twice at the
      // wrong size and minted a baseline of a dialog that had not opened yet.
      await settledBox(stage(page));

      const name = `overlays/${recipe.slug}--${scheme}.png`;
      if (recipe.atDocumentRoot) {
        await expect(page).toHaveScreenshot(name, { fullPage: false });
      } else {
        await fitElementForScreenshot(page, stage(page));
        await expect(recipe.panel(page).last()).toBeVisible();
        await expect(stage(page)).toHaveScreenshot(name);
        await expect(recipe.panel(page).last()).toBeVisible();
      }
    });
  }
}
