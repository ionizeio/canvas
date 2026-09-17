import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
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

export interface MaterialMotionFrame {
  elapsedMs: number;
  frameIntervalMs: number;
  material: { x: number; y: number; width: number; height: number };
  foreground: { x: number; y: number; width: number; height: number } | null;
  connected: boolean;
  lensDefinitions: number;
}

/**
 * Sample real browser animation frames without changing the animation clock.
 * The motion project also retains video: rest/settle shots alone are not motion
 * evidence. DOM lens observations measure retained definitions and regeneration,
 * not GPU allocation or native capture resources.
 */
export async function captureMaterialMotion(
  page: Page,
  testInfo: TestInfo,
  name: string,
  material: Locator,
  foreground: Locator,
  action: () => Promise<void>,
  sampleMs = 1800,
) {
  const foregroundHandle = await foreground.elementHandle();
  if (!foregroundHandle) throw new Error("Motion evidence requires an attached foreground host");
  const key = `canvas-material-motion-${name}`;
  await material.evaluate((root, { key, sampleMs, foregroundNode }) => {
    const state = window as unknown as Record<string, unknown>;
    const frames: MaterialMotionFrame[] = [];
    const rect = (node: Element) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    };
    const lenses = () => document.querySelectorAll('filter[id^="cds-glass-lens-"]').length;
    let definitionsAdded = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('filter[id^="cds-glass-lens-"]')) definitionsAdded++;
        definitionsAdded += node.querySelectorAll('filter[id^="cds-glass-lens-"]').length;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const started = performance.now();
    let previous = started;
    const record = { done: false, frames, definitionsAtStart: lenses(), definitionsAdded: 0 };
    state[key] = record;
    function sample(now: number) {
      frames.push({
        elapsedMs: now - started,
        frameIntervalMs: now - previous,
        material: rect(root),
        foreground: foregroundNode?.isConnected ? rect(foregroundNode) : null,
        connected: root.isConnected,
        lensDefinitions: lenses(),
      });
      previous = now;
      if (now - started < sampleMs) requestAnimationFrame(sample);
      else {
        observer.disconnect();
        record.definitionsAdded = definitionsAdded;
        record.done = true;
      }
    }
    requestAnimationFrame(sample);
  }, { key, sampleMs, foregroundNode: foregroundHandle });
  try {
    await action();
    await page.waitForFunction((key) => (window as unknown as Record<string, { done?: boolean }>)[key]?.done, key);
    const recording = await page.evaluate((key) => {
      const state = window as unknown as Record<string, unknown>;
      const recording = state[key] as {
        frames: MaterialMotionFrame[];
        definitionsAtStart: number;
        definitionsAdded: number;
      };
      delete state[key];
      const intervals = recording.frames.slice(1).map((frame) => frame.frameIntervalMs).sort((a, b) => a - b);
      return {
        ...recording,
        runtime: "browser" as const,
        userAgent: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        p95FrameIntervalMs: intervals[Math.floor((intervals.length - 1) * 0.95)] ?? null,
        maxFrameIntervalMs: intervals.at(-1) ?? null,
      };
    }, key);
    const evidencePath = testInfo.outputPath(`${name}-motion.json`);
    await writeFile(evidencePath, JSON.stringify(recording, null, 2));
    await testInfo.attach(`${name}-motion.json`, { path: evidencePath, contentType: "application/json" });
    return recording;
  } finally {
    await foregroundHandle.dispose();
  }
}
