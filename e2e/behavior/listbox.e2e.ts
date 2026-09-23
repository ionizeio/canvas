import { attach, describe as describeViolations, scan } from "../support/axe";
import { fitElementForScreenshot, gotoDocs, platformRow } from "../support/docs";
import { expect, test } from "../support/fixtures";

for (const controlled of [false, true]) {
  test(`Listbox selects once per complete key press (${controlled ? "controlled" : "uncontrolled"})`, async ({ page }) => {
    await gotoDocs(page, `/testing/listbox?controlled=${controlled}`);
    const single = page.getByRole("listbox", { name: "Primary team" });
    const group = page.getByRole("group", { name: "Project teams" });
    await expect(single.getByRole("option")).toHaveCount(3);
    await expect(group.getByRole("checkbox")).toHaveCount(3);
    await expect(group.getByRole("listbox")).toHaveCount(0);
    const row = group.getByRole("checkbox", { name: "Frontend, Web applications" });
    await row.focus();

    for (const [key, checked, count] of [["Enter", true, 1], ["Enter", false, 2], ["Space", true, 3], ["Space", false, 4]] as const) {
      await page.keyboard.press(key);
      await expect(row).toHaveAttribute("aria-checked", String(checked));
      await expect(page.getByTestId("multi-change-count")).toHaveText(`Changes: ${count}`);
      await expect(page.getByTestId("multi-pick-count")).toHaveText(`Picks: ${count}`);
    }

    const option = single.getByRole("option", { name: "Frontend, Web applications" });
    await option.focus();
    await page.keyboard.press("Enter");
    await expect(option).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("single-change-count")).toHaveText("Changes: 1");
    await expect(page.getByTestId("single-pick-count")).toHaveText("Picks: 1");
    await page.keyboard.press("Space");
    await expect(option).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("single-change-count")).toHaveText("Changes: 2");
    await expect(page.getByTestId("single-pick-count")).toHaveText("Picks: 2");
  });
}

test("multi-select Tab skips decorative indicators and keeps one roving row", async ({ page }) => {
  await gotoDocs(page, "/testing/listbox");
  const group = page.getByRole("group", { name: "Project teams" });
  const first = group.getByRole("checkbox", { name: "Backend", exact: true });
  const second = group.getByRole("checkbox", { name: "Frontend, Web applications" });
  const before = page.getByRole("button", { name: "Before teams" });
  const after = page.getByRole("button", { name: "After teams" });
  await expect(group.locator('[aria-hidden="true"] [tabindex]')).toHaveCount(0);
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  await before.focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(after).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(second).toBeFocused();
  await expect(page.getByTestId("multi-change-count")).toHaveText("Changes: 0");
  await page.keyboard.press("Tab");
  await expect(after).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(second).toBeFocused();
  await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
});

test("Listbox multi previews retain each platform's selection indicator dimensions", async ({ page }, testInfo) => {
  await gotoDocs(page, "/components/listbox/multi");
  for (const [platform, width] of [["ios", 22], ["android", 18], ["web", 20]] as const) {
    const group = platformRow(page, platform).getByRole("group", { name: "Teams" });
    const row = group.getByRole("checkbox", { name: "Backend", exact: true });
    await expect(row).toHaveAttribute("aria-checked", "true");
    // Match the platform's selection Checkbox, border included: the iOS edit-mode
    // circle (22), the Android M3 box (18), the web box (20). A bare nested import in
    // the shared shell would make all three the same size.
    const box = row.locator('[aria-hidden="true"] > div > div');
    await expect(box).toHaveCSS("width", `${width}px`);
    await expect(box).toHaveCSS("height", `${width}px`);
  }
  const findings = await scan(page, '[data-platform-row="web"]');
  await attach(testInfo, "listbox-multi", findings);
  expect(findings, describeViolations(findings)).toEqual([]);
});

for (const scheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`Listbox and Checkbox remain accessible (${scheme}, ${width}px)`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/listbox", { scheme, viewport: { width, height: 900 } });
      const content = page.getByTestId("listbox-checks");
      await expect(content).toBeVisible();
      const findings = await scan(page, '[data-testid="listbox-checks"]');
      await attach(testInfo, "listbox", findings);
      expect(findings, describeViolations(findings)).toEqual([]);
      await fitElementForScreenshot(page, content);
      const screenshot = testInfo.outputPath("listbox-and-checkbox.png");
      await content.screenshot({ path: screenshot });
      await testInfo.attach("listbox-and-checkbox", { path: screenshot, contentType: "image/png" });
    });
  }
}
