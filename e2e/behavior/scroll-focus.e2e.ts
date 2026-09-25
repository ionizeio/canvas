import type { Locator, Page } from "@playwright/test";
import { colorsFor } from "../../src/style/tokens.ts";
import { BLOCKING_IMPACTS, scan, scanStructure } from "../support/axe";
import { gotoDocs } from "../support/docs";
import { expect, test } from "../support/fixtures";

// The scrollport under a fixture section: the one tab stop, except in the Carousel,
// whose arrows and dots are buttons beside it.
const scrollportOf = (page: Page, name: string) =>
  page.getByTestId(`scroll-${name}`).locator(name === "carousel" ? '[tabindex="0"]:not([role="button"])' : '[tabindex="0"]');

// The frame around a focused scrollport, and the node that draws its ring. A scroller
// flush inside a clipping card cannot show its own (the card clips one outside it, and
// Chromium paints the scrolled content over one inside it), so the card draws it
// (src/style/focus-frame.tsx): the section's own root, or the Carousel's viewport
// around its paged scroller. The attached table sits flush in a card that clips it, so
// a layer just inside its edge draws the ring. The calendar Heatmap's scroller has room
// and draws its own.
const frameOf = (page: Page, name: string, scrollport: Locator) =>
  name === "heatmap" ? scrollport : name === "carousel" ? scrollport.locator("..") : page.getByTestId(`scroll-${name}`);
const ringOf = (page: Page, name: string, scrollport: Locator) =>
  name === "attached" ? page.getByTestId("scroll-attached").locator('[aria-hidden="true"]').last() : frameOf(page, name, scrollport);

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
// Whether the ring shows along each side of `frame`, read from the pixels: a computed
// outline proves nothing when a parent clips it or the scrolled content paints over it.
// The page decodes a screenshot of the frame's edges and looks for ring-coloured pixels
// along the middle of every side, within 6 px of the frame's edge on either side.
async function ringShows(page: Page, frame: Locator, color: string) {
  const box = await frame.boundingBox();
  if (!box) throw new Error("the frame has no box");
  const pad = 6;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(async ({ png, pad, color, clip }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    const [r, g, b] = (color.match(/\d+/g) ?? []).map(Number) as [number, number, number];
    const near = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b) < 60;
    };
    const band = Math.round(pad * 2 * (width / clip.width));
    // Nine in ten points along the middle three fifths of a side hold a ring pixel.
    const side = (horizontal: boolean, far: boolean) => {
      const length = horizontal ? width : height;
      const depthLimit = horizontal ? height : width;
      let points = 0;
      let hits = 0;
      for (let t = Math.round(length * 0.2); t < Math.round(length * 0.8); t++, points++) {
        for (let d = 0; d < band; d++) {
          const depth = far ? depthLimit - 1 - d : d;
          if (horizontal ? near(t, depth) : near(depth, t)) {
            hits++;
            break;
          }
        }
      }
      return hits >= points * 0.9;
    };
    return { top: side(true, false), right: side(false, true), bottom: side(true, true), left: side(false, false) };
  }, { png, pad, color, clip });
}
const ALL_SIDES = { top: true, right: true, bottom: true, left: true };

const outlineOf = (locator: Locator) =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, color: style.outlineColor };
  });

for (const width of [1280, 390]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`overflowing content is reachable and scrolls with the keyboard (${width}, ${scheme})`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/scroll-focus", { scheme, viewport: { width, height: 900 } });
      const ring = rgb(colorsFor("blush", scheme).ring);
      for (const name of ["plain", "numbered", "terminal", ...(width < 640 ? ["table", "attached", "heatmap"] : []), "carousel"]) {
        const scrollport = scrollportOf(page, name);
        await expect(scrollport).toHaveCount(1);
        await page.getByTestId(`before-${name}`).focus();
        await page.keyboard.press("Tab");
        await expect(scrollport).toBeFocused();
        // The theme's ring, drawn once: by the frame, with the scroller's own off.
        await expect.poll(() => outlineOf(ringOf(page, name, scrollport))).toEqual({ style: name === "heatmap" ? "auto" : "solid", color: ring });
        if (name !== "heatmap") {
          expect((await outlineOf(scrollport)).style).toBe("none");
          // And it is on screen: neither clipped by a parent nor painted over.
          expect(await ringShows(page, frameOf(page, name, scrollport), ring)).toEqual(ALL_SIDES);
        }
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

// A pointer press focuses a scrollport the way :focus-visible leaves unmarked, so no
// ring appears until a key is pressed on it.
test("a click into a scrollport draws no ring until a key is pressed", async ({ page }) => {
  await gotoDocs(page, "/testing/scroll-focus", { viewport: { width: 390, height: 900 } });
  for (const name of ["plain", "table", "carousel"]) {
    const scrollport = scrollportOf(page, name);
    await scrollport.click();
    await expect(scrollport).toBeFocused();
    expect((await outlineOf(ringOf(page, name, scrollport))).style).toBe("none");
    expect((await outlineOf(scrollport)).style).toBe("none");
    await page.keyboard.press("Shift");
    await expect.poll(async () => (await outlineOf(ringOf(page, name, scrollport))).style).toBe("solid");
  }
});

// An option list's port is a stop while its rows overflow the capped card, and it sits
// flush inside the card's clip, so the card draws its ring. Shift+Tab from the first
// row lands on the port.
for (const width of [1280, 390]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`an overflowing option list's card draws the ring for its port (${width}, ${scheme})`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/scroll-focus", { scheme, viewport: { width, height: 900 } });
      await page.getByTestId("scroll-options").click();
      const port = page.locator('[tabindex="0"]:has([role="listbox"])');
      await expect(port).toHaveCount(1);
      await port.getByRole("option").first().focus();
      await page.keyboard.press("Shift+Tab");
      await expect(port).toBeFocused();
      const frame = () => port.evaluate((node) => {
        for (let at = node.parentElement; at; at = at.parentElement) {
          const style = getComputedStyle(at);
          if (style.outlineStyle !== "none") return { style: style.outlineStyle, color: style.outlineColor, clips: style.overflow === "hidden" };
        }
        return null;
      });
      const ring = rgb(colorsFor("blush", scheme).ring);
      await expect.poll(frame).toEqual({ style: "solid", color: ring, clips: true });
      expect((await outlineOf(port)).style).toBe("none");
      // The card is the port's parent, and its ring is on screen on every side.
      expect(await outlineOf(port.locator(".."))).toEqual({ style: "solid", color: ring });
      expect(await ringShows(page, port.locator(".."), ring)).toEqual(ALL_SIDES);
      const screenshot = testInfo.outputPath("option-list-focused.png");
      await page.screenshot({ path: screenshot });
      await testInfo.attach("option-list-focused", { path: screenshot, contentType: "image/png" });
      // Back onto a row: the port lost focus, so the card's ring goes.
      await page.keyboard.press("Tab");
      await expect.poll(frame).toBeNull();
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
