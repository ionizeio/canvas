import type { Locator, Page } from "@playwright/test";
import { colorsFor } from "../../src/style/tokens.ts";
import { BLOCKING_IMPACTS, scan, scanStructure } from "../support/axe";
import { gotoDocs } from "../support/docs";
import { ALL_SIDES, rgb, ringShows } from "../support/focus-ring";
import { expect, test } from "../support/fixtures";

// The windowed lists: a StackedList card, a plain StackedList, a connector Feed, an
// avatar Feed and a GridList gallery, each bounded, read-only and named: the card by its
// title, the rest by their `label`.
const WINDOWED_LISTS = ["stacked", "stacked-plain", "feed", "feed-avatar", "grid"];
// The text the fixture gives the row at each place in the list (1-based), so a row's
// announced place can be checked against the item it shows.
const PEOPLE = ["Ada", "Sam", "Lee", "Kim", "Noor", "Ravi", "Iris", "Theo"];
const person = (place: number) => `${PEOPLE[(place - 1) % PEOPLE.length]} ${place}`;
const ROW_TEXT: Record<string, (place: number) => string> = {
  stacked: person,
  "stacked-plain": person,
  feed: person,
  "feed-avatar": person,
  grid: (place) => `IMG_${1000 + place - 1}.jpg`,
};
const LIST_NAMES: Record<string, string> = {
  stacked: "Team",
  "stacked-plain": "People",
  feed: "Roster activity",
  "feed-avatar": "Roster activity by person",
  grid: "Photos",
};

// The scrollport under a fixture section: the one tab stop, except in the Carousel,
// whose arrows and dots are buttons beside it, in the windowed table, whose body row
// group scrolls its rows inside the scroller its columns pan in on a phone, and in the
// windowed lists, whose list scrolls its rows (the GridList's list is its root).
const scrollportOf = (page: Page, name: string) =>
  name === "windowed"
    ? page.getByTestId("scroll-windowed").getByRole("rowgroup")
    : name === "grid"
      ? page.getByTestId("scroll-grid")
      : WINDOWED_LISTS.includes(name)
        ? page.getByTestId(`scroll-${name}`).getByRole("list")
        : page.getByTestId(`scroll-${name}`).locator(name === "carousel" ? '[tabindex="0"]:not([role="button"])' : '[tabindex="0"]');

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


// A windowed list's rendered rows, read in one pass (the list keeps mounting rows in
// batches after it paints): each row's place and the list's size it announces, and the
// computed position of every wrapper between the list and the row.
const renderedRows = (list: Locator) =>
  list.evaluate((node) => [...node.querySelectorAll('[role="listitem"]')].map((row) => {
    const wrappers: string[] = [];
    for (let at = row.parentElement; at && at !== node; at = at.parentElement) wrappers.push(getComputedStyle(at).position);
    return { posinset: row.getAttribute("aria-posinset"), setsize: row.getAttribute("aria-setsize"), text: row.textContent ?? "", wrappers };
  }));

const outlineOf = (locator: Locator) =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, color: style.outlineColor };
  });
// Whether a node paints an outline at all. A node that paints its own focus state (or
// whose frame does) switches its outline off with a zero width (FOCUS_RESET), leaving its
// style `solid`, the value React Native's native parser accepts, so the style alone
// does not say. The browser's own `auto` ring ignores the width, so it always paints.
const drawsOutline = (locator: Locator) =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return style.outlineStyle === "auto" || (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0);
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
          expect(await drawsOutline(scrollport)).toBe(false);
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

// A windowed table's body scrolls its rows under the fixed header on its own, so it is
// a stop of its own while they overflow, after the scroller its columns pan in on a
// phone. Left alone, Chromium and Firefox made it an unmanaged stop that drew the
// browser's ring (clipped to one edge on a phone) and WebKit skipped it; the table's
// card draws the theme's ring for it, as for the pan scroller.
for (const width of [1280, 390]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`a windowed table's overflowing body is a stop its card rings (${width}, ${scheme})`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/scroll-focus", { scheme, viewport: { width, height: 900 } });
      const ring = rgb(colorsFor("blush", scheme).ring);
      const table = page.getByTestId("scroll-windowed");
      const body = scrollportOf(page, "windowed");
      await expect(table.locator('[tabindex="0"]')).toHaveCount(width < 640 ? 2 : 1);
      await page.getByTestId("before-windowed").focus();
      await page.keyboard.press("Tab");
      if (width < 640) {
        // The pan scroller surrounds the table, so it comes first.
        await expect(table.locator('[tabindex="0"]').first()).toBeFocused();
        await page.keyboard.press("Tab");
      }
      await expect(body).toBeFocused();
      // Chromium's own node for the stop: the table's row group, with no name taken from
      // its rows, so focusing it does not read every rendered row's text out as its name.
      const session = await page.context().newCDPSession(page);
      const { result } = await session.send("Runtime.evaluate", { expression: "document.activeElement" });
      const { node } = await session.send("DOM.describeNode", { objectId: result.objectId });
      const { nodes } = await session.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false });
      expect(nodes.map((ax) => ({ role: ax.role?.value, name: ax.name?.value }))).toEqual([{ role: "rowgroup", name: "" }]);
      await expect.poll(() => outlineOf(table)).toEqual({ style: "solid", color: ring });
      expect(await drawsOutline(body)).toBe(false);
      expect(await ringShows(page, table, ring)).toEqual(ALL_SIDES);
      await page.keyboard.press("ArrowDown");
      await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      const screenshot = testInfo.outputPath("scroll-windowed-focused.png");
      await page.screenshot({ path: screenshot });
      await testInfo.attach("scroll-windowed-focused", { path: screenshot, contentType: "image/png" });
      await page.keyboard.press("Tab");
      await expect(page.getByTestId("after-windowed")).toBeFocused();
      await expect.poll(async () => (await outlineOf(table)).style).toBe("none");
    });
  }
}

// A windowed StackedList, Feed or GridList scrolls its rows in a list of its own, so the
// list is a stop while they overflow. Left alone, Chromium and Firefox made a read-only list's
// scroller an unmanaged stop that drew the browser's ring (inside a card that clipped
// it) and WebKit skipped it. The card draws the theme's ring for a StackedList or Feed;
// the GridList's scroller is its root, with no card around it, and draws its own.
for (const width of [1280, 390]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`a windowed list's overflowing rows are one stop its frame rings (${width}, ${scheme})`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/scroll-focus", { scheme, viewport: { width, height: 900 } });
      const ring = rgb(colorsFor("blush", scheme).ring);
      const session = await page.context().newCDPSession(page);
      for (const name of WINDOWED_LISTS) {
        const list = page.getByTestId(`scroll-${name}`);
        const scroller = scrollportOf(page, name);
        await expect(scroller).toHaveCount(1);
        await expect(scroller).toHaveAttribute("tabindex", "0");
        await page.getByTestId(`before-${name}`).focus();
        await page.keyboard.press("Tab");
        await expect(scroller).toBeFocused();
        // Chromium's own node for the stop: the list, named by its title or label, so
        // focusing it does not read every rendered row's text out as its name (an unnamed
        // scroller, a list included, took them all).
        const { result } = await session.send("Runtime.evaluate", { expression: "document.activeElement" });
        const { node } = await session.send("DOM.describeNode", { objectId: result.objectId });
        const { nodes } = await session.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false });
        expect(nodes.map((ax) => ({ role: ax.role?.value, name: ax.name?.value }))).toEqual([{ role: "list", name: LIST_NAMES[name] }]);
        // A windowed list mounts only the rows near its viewport, and each says where it
        // sits in the whole list, so the list's count is every row, not the rendered ones.
        // FlatList's own wrappers between the list and a row stay static: Chromium does
        // not count a list's items through a positioned wrapper.
        const atTop = await renderedRows(scroller);
        expect(atTop.length).toBeGreaterThan(0);
        expect(atTop.length).toBeLessThan(200);
        expect(atTop.map((row) => [row.posinset, row.setsize])).toEqual(atTop.map((_, index) => [String(index + 1), "200"]));
        expect(atTop.flatMap((row) => row.wrappers).filter((position) => position !== "static")).toEqual([]);
        // The theme's ring, drawn once, on the list's root, and on screen along every side.
        await expect.poll(() => outlineOf(list)).toEqual({ style: "solid", color: ring });
        if (name !== "grid") expect(await drawsOutline(scroller)).toBe(false);
        // Tab scrolls the focused box into view, not the ring outside it, so a list that
        // lands on the viewport's edge has its ring just past it: center it first.
        await list.evaluate((node) => node.scrollIntoView({ block: "center" }));
        await expect.poll(() => ringShows(page, list, ring)).toEqual(ALL_SIDES);
        await page.keyboard.press("ArrowDown");
        await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        // Scrolled on down, the list unmounts rows between its first few (FlatList keeps
        // `initialNumToRender` mounted for a jump back to the top) and its window, and
        // every row it mounts still says where it sits, which its own text confirms. The
        // list learns its rows' heights as it renders them, so it grows as it scrolls:
        // each poll scrolls to its current end.
        await expect.poll(async () => {
          await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
          const rows = await renderedRows(scroller);
          return Number(rows.at(-1)?.posinset) - rows.length;
        }).toBeGreaterThan(0);
        const midway = await renderedRows(scroller);
        const places = midway.map((row) => Number(row.posinset));
        expect(places.every((place, index) => index === 0 || place > places[index - 1]!)).toBe(true);
        expect(midway.filter((row) => row.setsize !== "200")).toEqual([]);
        expect(midway.filter((row) => !row.text.includes(ROW_TEXT[name]!(Number(row.posinset))))).toEqual([]);
        const screenshot = testInfo.outputPath(`scroll-${name}-focused.png`);
        await page.screenshot({ path: screenshot });
        await testInfo.attach(`scroll-${name}-focused`, { path: screenshot, contentType: "image/png" });
        await page.keyboard.press("Tab");
        await expect(page.getByTestId(`after-${name}`)).toBeFocused();
        await expect.poll(() => drawsOutline(list)).toBe(false);
      }
    });
  }
}

// A pointer press focuses a scrollport the way :focus-visible leaves unmarked, so no
// ring appears until a key is pressed on it.
test("a click into a scrollport draws no ring until a key is pressed", async ({ page }) => {
  await gotoDocs(page, "/testing/scroll-focus", { viewport: { width: 390, height: 900 } });
  for (const name of ["plain", "table", "windowed", ...WINDOWED_LISTS, "carousel"]) {
    const scrollport = scrollportOf(page, name);
    await scrollport.click();
    await expect(scrollport).toBeFocused();
    expect(await drawsOutline(ringOf(page, name, scrollport))).toBe(false);
    expect(await drawsOutline(scrollport)).toBe(false);
    await page.keyboard.press("Shift");
    // A frame that is its own scroller (the GridList) rests on the reset's zero-width solid
    // outline, so the ring appearing is its width, not its style.
    await expect.poll(() => drawsOutline(ringOf(page, name, scrollport))).toBe(true);
    expect((await outlineOf(ringOf(page, name, scrollport))).style).toBe("solid");
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
          if (style.outlineStyle === "auto" || (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0)) return { style: style.outlineStyle, color: style.outlineColor, clips: style.overflow === "hidden" };
        }
        return null;
      });
      const ring = rgb(colorsFor("blush", scheme).ring);
      await expect.poll(frame).toEqual({ style: "solid", color: ring, clips: true });
      expect(await drawsOutline(port)).toBe(false);
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
