import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { fitElementForScreenshot, type Surface } from "./docs";

/** Actual painted browser effects, not React wrapper names or an iOS skin label. */
export async function readMaterialEffects(scope: Locator) {
  return scope.evaluate((root) => {
    const effects: { filter: string; width: number; height: number }[] = [];
    for (const node of [root, ...Array.from(root.querySelectorAll("*"))]) {
      const box = node.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) continue;
      const style = getComputedStyle(node);
      const filter = style.getPropertyValue("backdrop-filter") || style.getPropertyValue("-webkit-backdrop-filter");
      if (filter && filter !== "none" && style.visibility !== "hidden" && style.display !== "none") {
        effects.push({ filter, width: Math.round(box.width), height: Math.round(box.height) });
      }
    }
    return {
      runtime: "browser" as const,
      userAgent: navigator.userAgent,
      supportsBackdropFilter: CSS.supports("backdrop-filter", "blur(1px)"),
      activeBackdropEffects: effects.length,
      effects,
    };
  });
}

/** Solid must stop backdrop work, including after changing modes without a reload. */
export async function expectNoMaterialEffects(scope: Locator) {
  await expect.poll(async () => (await readMaterialEffects(scope)).activeBackdropEffects, {
    message: "solid mode must remove active browser backdrop material",
  }).toBe(0);
}

/** Change the real docs appearance control. This intentionally moves input focus. */
export async function setDocsSurface(page: Page, surface: Surface) {
  const control = page.getByRole("tablist", { name: "Surface", exact: true }).first();
  const tab = control.getByRole("tab", { name: surface === "glass" ? "Glass" : "Solid", exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/** Glass evidence is attached for review, not treated as a portable GPU pixel baseline. */
export async function attachMaterialEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
  frame: Locator,
  metadata: Record<string, unknown>,
  atDocumentRoot = false,
) {
  if (!atDocumentRoot) await fitElementForScreenshot(page, frame);
  const png = atDocumentRoot ? await page.screenshot() : await frame.screenshot();
  await testInfo.attach(`${name}.png`, { body: png, contentType: "image/png" });
  await testInfo.attach(`${name}.json`, {
    body: JSON.stringify({ ...metadata, ...await readMaterialEffects(frame) }, null, 2),
    contentType: "application/json",
  });
}
