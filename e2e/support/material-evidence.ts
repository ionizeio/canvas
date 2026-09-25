import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { fitElementForScreenshot, type Surface } from "./docs";

/**
 * Actual painted browser effects, not React wrapper names or an iOS skin label.
 *
 * `activeBackdropEffects` counts the backdrop blurs. `clearMaterials` counts the material
 * layers that paint without one: Dark Factory's clear well (a text field under glass),
 * the layer's translucent tint and a hairline rim over an unblurred backdrop. A material
 * layer counts only when something in it is painted (a translucent fill, an inset rim),
 * so an empty wrapper proves nothing.
 */
export async function readMaterialEffects(scope: Locator) {
  return scope.evaluate((root) => {
    const visible = (node: Element) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const backdropOf = (node: Element) => {
      const style = getComputedStyle(node);
      const filter = style.getPropertyValue("backdrop-filter") || style.getPropertyValue("-webkit-backdrop-filter");
      return filter && filter !== "none" ? filter : null;
    };
    const effects: { filter: string; width: number; height: number }[] = [];
    for (const node of [root, ...Array.from(root.querySelectorAll("*"))]) {
      if (!visible(node)) continue;
      const filter = backdropOf(node);
      if (filter) {
        const box = node.getBoundingClientRect();
        effects.push({ filter, width: Math.round(box.width), height: Math.round(box.height) });
      }
    }
    const translucent = (color: string) => {
      const m = /rgba?\(([^)]+)\)/.exec(color);
      const alpha = m ? Number(m[1]!.split(/[,/\s]+/).filter(Boolean)[3] ?? 1) : 1;
      return alpha > 0 && alpha < 1;
    };
    let clearMaterials = 0;
    for (const material of Array.from(root.querySelectorAll('[data-testid="glass-material"]'))) {
      if (!visible(material)) continue;
      const layers = Array.from(material.querySelectorAll("*"));
      if (layers.some((layer) => backdropOf(layer))) continue;
      const painted = layers.some((layer) => {
        const style = getComputedStyle(layer);
        return translucent(style.backgroundColor) || style.boxShadow.includes("inset");
      });
      if (painted) clearMaterials++;
    }
    return {
      runtime: "browser" as const,
      userAgent: navigator.userAgent,
      supportsBackdropFilter: CSS.supports("backdrop-filter", "blur(1px)"),
      activeBackdropEffects: effects.length,
      clearMaterials,
      effects,
    };
  });
}

/** Solid must stop backdrop work and every material layer, including after changing modes without a reload. */
export async function expectNoMaterialEffects(scope: Locator) {
  await expect.poll(async () => {
    const { activeBackdropEffects, clearMaterials } = await readMaterialEffects(scope);
    return activeBackdropEffects + clearMaterials;
  }, {
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
