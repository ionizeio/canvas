import type { Locator, Page, TestInfo } from "@playwright/test";
import { scanStructure } from "../support/axe";
import { expect, test } from "../support/fixtures";
import { gotoDocs, platformRow } from "../support/docs";

async function withDrawerFocusDiagnostics(page: Page, testInfo: TestInfo, run: () => Promise<void>) {
  await page.addInitScript(() => {
    const events: Record<string, unknown>[] = [];
    const describe = (node: EventTarget | null) => node instanceof Element ? {
      tag: node.tagName,
      role: node.getAttribute("role"),
      label: node.getAttribute("aria-label"),
      text: node.textContent?.trim().slice(0, 100),
      testID: node.getAttribute("data-testid"),
      tabIndex: node.getAttribute("tabindex"),
      connected: node.isConnected,
      inMenu: !!node.closest('[role="menu"]'),
      inDialog: !!node.closest('[role="dialog"]'),
    } : null;
    const record = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      events.push({
        time: performance.now(), type: event.type,
        key: event instanceof KeyboardEvent ? event.key : undefined,
        target: describe(event.target), activeElement: describe(document.activeElement),
        documentHasFocus: document.hasFocus(), defaultPrevented: event.defaultPrevented,
      });
      if (events.length > 60) events.shift();
    };
    for (const type of ["focusin", "focusout", "keydown", "keyup"]) document.addEventListener(type, record, true);
    for (const type of ["focus", "blur"]) window.addEventListener(type, record);
    Object.assign(window, { __canvasDrawerFocusSnapshot: () => ({
      activeElement: describe(document.activeElement), documentHasFocus: document.hasFocus(), events,
    }) });
  });
  try {
    await run();
  } catch (error) {
    const focus = await page.evaluate(() => {
      const snapshot = (window as unknown as { __canvasDrawerFocusSnapshot?: () => unknown }).__canvasDrawerFocusSnapshot;
      return snapshot?.() ?? { unavailable: "The fixture did not initialize" };
    }).catch((captureError) => ({ unavailable: String(captureError) }));
    await testInfo.attach("drawer-focus-failure", {
      body: JSON.stringify(focus, null, 2), contentType: "application/json",
    });
    throw error;
  }
}

async function checkDrawerMenuClose(page: Page, scheme: "light" | "dark", waitForRowFocus: boolean) {
  await gotoDocs(page, "/testing/escape-layers?scenario=drawer", { scheme });
  await page.getByRole("button", { name: "Open drawer" }).click();
  const dialog = page.getByRole("dialog");
  const trigger = dialog.getByRole("button", { name: "Open menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  if (waitForRowFocus) {
    await expect(dialog.getByRole("menu")).toBeVisible();
    await expect(dialog.getByRole("menuitem", { name: "Rename", exact: true })).toBeFocused();
  } else {
    // Wait only for the open state, then close without waiting for card layout
    // or the first row's focus effect. This preserves the rapid-Escape contract.
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("child-close-count")).toHaveText("1");
  await expect(page.getByTestId("parent-close-count")).toHaveText("0");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("parent-close-count")).toHaveText("1");
  await expect(page.getByTestId("child-close-count")).toHaveText("1");
}

for (const scheme of ["light", "dark"] as const) {
  test(`autocomplete selects before submitting in ${scheme}`, { tag: "@interaction:autocomplete-form-keyboard" }, async ({ page }) => {
    await gotoDocs(page, "/testing/form-autocomplete", { scheme });
    const input = page.getByRole("combobox", { name: "Fruit", exact: true });
    await input.fill("Ap");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Apricot");
    await expect(input).toBeFocused();
    await expect(page.getByTestId("selection-count")).toHaveText("1");
    await expect(page.getByTestId("submit-count")).toHaveText("0");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("submit-count")).toHaveText("1");
  });

  test(`listbox has one tab stop and toggles once in ${scheme}`, { tag: "@interaction:listbox-keyboard" }, async ({ page }) => {
    await gotoDocs(page, "/testing/listbox", { scheme });
    const group = page.getByRole("group", { name: "Project teams" });
    const first = group.getByRole("checkbox", { name: "Backend", exact: true });
    const second = group.getByRole("checkbox", { name: "Frontend, Web applications" });
    await page.getByRole("button", { name: "Before teams" }).focus();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(second).toBeFocused();
    await page.keyboard.press("Space");
    await expect(second).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("multi-change-count")).toHaveText("Changes: 1");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "After teams" })).toBeFocused();
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  });

  test(`drawer owns its hosted menu and closes one layer in ${scheme}`, { tag: "@interaction:drawer-nested-keyboard" }, async ({ page }, testInfo) => {
    await withDrawerFocusDiagnostics(page, testInfo, () => checkDrawerMenuClose(page, scheme, true));
  });

  test(`drawer handles Escape immediately after opening its menu in ${scheme}`, async ({ page }, testInfo) => {
    await withDrawerFocusDiagnostics(page, testInfo, () => checkDrawerMenuClose(page, scheme, false));
  });
}

// Where keyboard focus sits relative to `scope`, in words a failure can print: its bare
// <video>, one of its nodes hidden from assistive technology, another of its nodes by role
// and name, or outside it.
function focusIn(scope: Locator): Promise<string> {
  return scope.evaluate((root) => {
    const node = document.activeElement;
    if (!node || !root.contains(node)) return "outside";
    if (node.tagName === "VIDEO") return "the bare <video>";
    if (node.closest('[aria-hidden="true"], [inert]')) return `a hidden ${node.tagName.toLowerCase()}`;
    return `${node.getAttribute("role") ?? node.tagName.toLowerCase()} ${node.getAttribute("aria-label") ?? ""}`.trim();
  });
}

test("a video's picture is never a keyboard stop, in every engine", async ({ page }) => {
  // On the web the picture is expo-video's <video>, which carries no controls of its own:
  // the kit draws them (the picture's play control inline, the bar under it with
  // `controls`). Firefox makes a controls-less <video> a tab stop, one with no role or
  // name, in front of the player's first named control; Chromium and WebKit do not. And
  // beside the bar the picture's tap target is hidden from assistive technology, so a
  // stop there would be announced as nothing (axe's aria-hidden-focus). The web row holds
  // the player alone, so Shift+Tab from its first named control must leave the row, for
  // the Android preview above it (its <video> with the browser's own controls on the
  // controls page, its picture's play control inline), and Tab must come straight back.
  for (const [route, name] of [
    ["/components/video/controls", "Play Sample clip with controls"],
    ["/components/video", "Play Sample clip"],
  ] as const) {
    await gotoDocs(page, route, { scheme: "dark" });
    const web = platformRow(page, "web");
    const play = web.getByRole("button", { name, exact: true });
    await expect(play).toBeVisible();
    await play.focus();
    await page.keyboard.press("Shift+Tab");
    expect(await focusIn(web), `Shift+Tab from "${name}"`).toBe("outside");
    await page.keyboard.press("Tab");
    await expect(play, `Tab back to "${name}"`).toBeFocused();
    expect(await scanStructure(page, '[data-platform-row="web"]', ["aria-hidden-focus"])).toEqual([]);
  }
});

test("a video still goes full screen from the keyboard", async ({ page }) => {
  // The picture's <video> sits in an inert layer so it is never a stop, and full screen
  // is a request made on that <video>: the bar's button must still put it in full screen.
  await gotoDocs(page, "/components/video/controls", { scheme: "dark" });
  test.skip(!(await page.evaluate(() => document.fullscreenEnabled)), "This browser build has no Fullscreen API.");
  const web = platformRow(page, "web");
  const fullScreen = web.getByRole("button", { name: "Show Sample clip with controls full screen" });
  // What is full screen: the web row's own <video>, another node, or nothing.
  const inFullScreen = () => web.evaluate((root) => {
    const node = document.fullscreenElement;
    if (!node) return "nothing";
    return node.tagName === "VIDEO" && root.contains(node) ? "the player's <video>" : `a ${node.tagName.toLowerCase()} outside the player`;
  });
  await fullScreen.focus();
  await page.keyboard.press("Enter");
  await expect.poll(inFullScreen).toBe("the player's <video>");
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(inFullScreen).toBe("nothing");
});

test("a windowed table's overflowing body is one keyboard stop, in every engine", async ({ page }) => {
  // A virtualized DataTable scrolls its rows in a list of their own under the fixed
  // header. Left to the browser, Chromium and Firefox made that list a stop when nothing
  // inside it could take focus (a read-only table's rows) and drew their own ring on it,
  // while WebKit skipped it, so its keyboard could not reach the rows below the fold.
  // The table makes the body its row group and a stop while the rows overflow, and its
  // surface draws the theme's ring for it. PageDown scrolls a focused scroller in every
  // engine; Playwright's WebKit on a Mac scrolls none with the arrow keys.
  await gotoDocs(page, "/testing/scroll-focus", { scheme: "light", viewport: { width: 1280, height: 900 } });
  const table = page.getByTestId("scroll-windowed");
  const body = table.getByRole("rowgroup");
  const outline = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).outlineStyle);
  await page.getByTestId("before-windowed").focus();
  await page.keyboard.press("Tab");
  await expect(body).toBeFocused();
  await expect.poll(() => outline(table)).toBe("solid");
  expect(await outline(body)).toBe("none");
  await page.keyboard.press("PageDown");
  await expect.poll(() => body.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("after-windowed")).toBeFocused();
  await expect.poll(() => outline(table)).toBe("none");
});
