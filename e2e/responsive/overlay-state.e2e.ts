import { animationFrames, fitElementForScreenshot, gotoDocs, previewCard, settledBox, stage } from "../support/docs";
import { expect, test } from "../support/fixtures";
import { OVERLAYS } from "../support/overlays";

const dialog = OVERLAYS.find((recipe) => recipe.slug === "dialog")!;

test("an open dialog and its draft survive narrow and desktop layouts", async ({ page }) => {
  await gotoDocs(page, "/components/dialog", { scheme: "light" });
  await dialog.open(page);
  const panel = dialog.panel(page);
  await expect(panel).toBeVisible();
  const draft = panel.getByRole("textbox").last();
  await draft.fill("Keep this refund draft");
  const originalStage = await stage(page).elementHandle();
  const originalDialog = await panel.elementHandle();

  // At 1024 the navigation changes; at 1023 the Playground rail moves. Exercise
  // both boundaries separately so neither ancestor can silently remount the form.
  for (const width of [1024, 1023, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    // The actual shell and rail must reach their new layout before checking state.
    await expect(page.getByRole("tab", { name: "Components", exact: true })).toHaveCount(width <= 1024 ? 1 : 0);
    await settledBox(stage(page));
    expect(await originalStage!.evaluate((node) => node.isConnected), "resize remounted the preview stage").toBe(true);
    expect(await originalDialog!.evaluate((node) => node.isConnected), "resize remounted the open dialog").toBe(true);
    await expect(panel).toBeVisible();
    await expect(draft).toHaveValue("Keep this refund draft");
  }

  await originalStage!.dispose();
  await originalDialog!.dispose();
});

for (const slug of ["dialog", "calendar", "grid-lists"] as const) {
  test(`${slug} screenshot does not resize the browser viewport`, async ({ page }, testInfo) => {
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00Z"));
    await gotoDocs(page, `/components/${slug}`, { scheme: slug === "dialog" ? "light" : "dark" });
    const frame = slug === "dialog" ? stage(page) : previewCard(page).first();
    await expect(frame).toBeVisible();
    if (slug === "dialog") {
      await dialog.open(page);
      await expect(dialog.panel(page)).toBeVisible();
    } else {
      // These resting examples reproduce the same oversized crop as an open dialog.
      expect((await settledBox(frame)).height).toBeGreaterThan(page.viewportSize()!.height);
    }
    await fitElementForScreenshot(page, frame);

    const viewportChanges = await page.evaluateHandle(() => {
      const sizes: number[][] = [];
      const record = () => sizes.push([innerWidth, innerHeight, visualViewport?.width ?? 0, visualViewport?.height ?? 0]);
      window.addEventListener("resize", record);
      visualViewport?.addEventListener("resize", record);
      return {
        sizes,
        stop: () => {
          window.removeEventListener("resize", record);
          visualViewport?.removeEventListener("resize", record);
        },
      };
    });

    try {
      const screenshot = await frame.screenshot({ animations: "disabled" });
      await testInfo.attach(`${slug} crop`, { body: screenshot, contentType: "image/png" });
      // Real frames: a resize event is delivered in a rendering update, and page.clock
      // fakes the page's own requestAnimationFrame.
      await animationFrames(page, 2);
      expect(await viewportChanges.evaluate((audit) => audit.sizes), "capturing the element changed the responsive viewport").toEqual([]);
      if (slug === "dialog") await expect(dialog.panel(page)).toBeVisible();
    } finally {
      await viewportChanges.evaluate((audit) => audit.stop());
      await viewportChanges.dispose();
    }
  });
}
