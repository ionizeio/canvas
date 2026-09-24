import { gotoDocs, stage } from "../support/docs";
import { expect, test } from "../support/fixtures";
import { OVERLAYS } from "../support/overlays";

for (const width of [1280, 390]) for (const scheme of ["light", "dark"] as const) {
  test(`scrolled material overlays stay in the viewport at ${width} in ${scheme}`, async ({ page }, info) => {
    // The fixture owns its own scheme. Start the surrounding shell in light so
    // the route loader's largest-background check agrees with the initial body.
    await gotoDocs(page, "/testing/materials", { scheme: "light", surface: "solid", viewport: { width, height: 900 } });
    await page.getByTestId("material-toggle").click();
    if (scheme === "dark") await page.getByRole("button", { name: "Switch scheme", exact: true }).click();
    await expect(page.getByTestId("material-mode")).toHaveText(`Mode: glass; scheme: ${scheme}`);
    const scroller = page.locator("[data-page-scroll]");
    const trigger = page.getByRole("button", { name: "Material dialog", exact: true });
    // Open from a scrolled page, the case this checks: scroll the page to its end (at 390
    // the fixture is taller than the viewport), then bring the trigger into view.
    await scroller.evaluate(element => element.scrollTo({ top: element.scrollHeight }));
    await trigger.evaluate(element => element.scrollIntoView({ block: "nearest" }));
    if (width === 390) expect(await scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Live dialog", exact: true });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => element.closest("[data-page-scroll]") !== null)).toBe(false);
    const band = (await scroller.boundingBox())!;
    const backdrop = (await dialog.boundingBox())!;
    expect(backdrop.y).toBeCloseTo(band.y, 0);
    expect(backdrop.height).toBeCloseTo(band.height, 0);
    for (const control of [dialog.getByText("Live dialog", { exact: true }), dialog.getByRole("textbox", { name: "Amount", exact: true }),
      dialog.getByRole("textbox", { name: "Reason", exact: true }), dialog.getByRole("button", { name: "Cancel", exact: true }),
      dialog.getByRole("button", { name: "Confirm", exact: true })]) {
      await expect(control).toBeInViewport({ ratio: 1 });
      const box = (await control.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(band.y);
      expect(box.y + box.height).toBeLessThanOrEqual(band.y + band.height);
    }
    const shot = info.outputPath(`material-dialog-${width}-${scheme}.png`);
    await page.screenshot({ path: shot });
    await info.attach("viewport dialog", { path: shot, contentType: "image/png" });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    const menuTrigger = page.getByRole("button", { name: "Material menu", exact: true });
    await menuTrigger.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Keep editor", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(menu.getByRole("menuitem", { name: "Review settings", exact: true })).toBeInViewport({ ratio: 1 });
    expect(await menu.evaluate(element => element.closest("[data-page-scroll]") !== null)).toBe(false);
    const menuShot = info.outputPath(`material-menu-${width}-${scheme}.png`);
    await page.screenshot({ path: menuShot });
    await info.attach("viewport menu", { path: menuShot, contentType: "image/png" });
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
}

for (const slug of ["dialog", "dropdown"]) test(`${slug} catalogue overlay keeps its contained host`, async ({ page }, info) => {
  await gotoDocs(page, `/components/${slug}`, { scheme: "dark", surface: "glass", viewport: { width: 390, height: 900 } });
  await expect(stage(page)).toBeVisible();
  const recipe = OVERLAYS.find(entry => entry.slug === slug)!;
  // The stage provider wraps both the preview and its sibling portal outlet.
  const panel = recipe.panel(page);
  const initial = await panel.count();
  await recipe.open(page);
  await expect(panel).toHaveCount(initial + recipe.adds);
  await expect(panel.last()).toBeVisible();
  const shot = info.outputPath(`catalogue-${slug}-contained.png`);
  await page.screenshot({ path: shot });
  await info.attach("contained catalogue overlay", { path: shot, contentType: "image/png" });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(initial);
});
