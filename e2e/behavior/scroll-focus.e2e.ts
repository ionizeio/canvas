import { BLOCKING_IMPACTS, scan, scanStructure } from "../support/axe";
import { gotoDocs } from "../support/docs";
import { expect, test } from "../support/fixtures";

for (const width of [1280, 390]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`overflowing content is reachable and scrolls with the keyboard (${width}, ${scheme})`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/scroll-focus", { scheme, viewport: { width, height: 900 } });
      for (const name of ["plain", "numbered", "terminal", ...(width < 640 ? ["table", "heatmap"] : [])]) {
        const content = page.getByTestId(`scroll-${name}`);
        const scrollport = content.locator('[tabindex="0"]');
        await expect(scrollport).toHaveCount(1);
        await page.getByTestId(`before-${name}`).focus();
        await page.keyboard.press("Tab");
        await expect(scrollport).toBeFocused();
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => scrollport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        const screenshot = testInfo.outputPath(`scroll-${name}-focused.png`);
        await page.screenshot({ path: screenshot });
        await testInfo.attach(`scroll-${name}-focused`, { path: screenshot, contentType: "image/png" });
      }
      await expect(page.getByTestId("scroll-wrap").locator('[tabindex="0"]')).toHaveCount(0);
      await expect(page.getByTestId("scroll-inline").locator('[tabindex="0"]')).toHaveCount(0);
      // The heatmap's day cells are pointer-only at every width, so a year that fits
      // on the desktop page is no tab stop at all.
      if (width >= 640) await expect(page.getByTestId("scroll-heatmap").locator('[tabindex="0"]')).toHaveCount(0);
      const findings = await scan(page, "body");
      expect(findings.filter((finding) => BLOCKING_IMPACTS.has(finding.impact))).toEqual([]);
      expect(await scanStructure(page, "body", ["scrollable-region-focusable"])).toEqual([]);
    });
  }
}

// The heatmap's stop wraps its image-role grid and takes no role or name of its own,
// so Chromium names it from that one image: the stop announces the grid's summary,
// and a role or name on the scroller would only repeat it (a region would also add a
// landmark). This reads Chromium's own accessibility node for the focused stop.
test("the calendar heatmap's keyboard stop announces the grid's summary", async ({ page }) => {
  await gotoDocs(page, "/testing/scroll-focus", { viewport: { width: 390, height: 900 } });
  const heatmap = page.getByTestId("scroll-heatmap");
  const name = await heatmap.getByRole("img").getAttribute("aria-label");
  expect(name).toMatch(/^Contribution activity, 371 days, \d+ total$/);
  const scrollport = heatmap.locator('[tabindex="0"]');
  await expect(scrollport).toHaveCount(1);
  await page.getByTestId("before-heatmap").focus();
  await page.keyboard.press("Tab");
  await expect(scrollport).toBeFocused();
  expect(await scrollport.evaluate((node) => [node.getAttribute("role"), node.getAttribute("aria-label")])).toEqual([null, null]);
  const session = await page.context().newCDPSession(page);
  const { result } = await session.send("Runtime.evaluate", { expression: "document.activeElement" });
  const { node } = await session.send("DOM.describeNode", { objectId: result.objectId });
  const { nodes } = await session.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false });
  expect(nodes.map((ax) => ({
    role: ax.role?.value,
    name: ax.name?.value,
    focused: ax.properties?.find((property) => property.name === "focused")?.value.value,
  }))).toEqual([{ role: "generic", name, focused: true }]);
  await page.keyboard.press("Tab");
  await expect(heatmap.locator(":focus")).toHaveCount(0);
});

test("content replacement and container resizing update keyboard stops without remounting", async ({ page }) => {
  await gotoDocs(page, "/testing/scroll-focus", { viewport: { width: 390, height: 900 } });
  const plain = page.getByTestId("scroll-plain");
  const table = page.getByTestId("scroll-table");
  const heatmap = page.getByTestId("scroll-heatmap");
  await expect(plain.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(table.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(heatmap.locator('[tabindex="0"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Use short content", exact: true }).click();
  await expect(plain.locator('[tabindex="0"]')).toHaveCount(0);
  await page.getByTestId("before-plain").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("after-plain")).toBeFocused();
  await page.getByRole("button", { name: "Use long content", exact: true }).click();
  await expect(plain.locator('[tabindex="0"]')).toHaveCount(1);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(table.locator('[tabindex="0"]')).toHaveCount(0);
  await expect(heatmap.locator('[tabindex="0"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(table.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(heatmap.locator('[tabindex="0"]')).toHaveCount(1);
});

for (const scheme of ["light", "dark"] as const) {
  test(`the narrow token reference has headings and keyboard-accessible regions (${scheme})`, async ({ page }, testInfo) => {
    await gotoDocs(page, "/tokens/colors", { scheme, viewport: { width: 390, height: 900 } });
    await expect(page.getByRole("heading", { level: 1, name: "Colors & Theme" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    const screenshot = testInfo.outputPath(`token-colors-phone-${scheme}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("token-colors-phone", { path: screenshot, contentType: "image/png" });
    const findings = await scan(page, "body");
    expect(findings.filter((finding) => BLOCKING_IMPACTS.has(finding.impact))).toEqual([]);
    expect(await scanStructure(page, "body", ["page-has-heading-one", "scrollable-region-focusable"])).toEqual([]);
  });
}
