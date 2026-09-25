/**
 * Keyboard operability, driven by a real keyboard.
 *
 * The happy-dom twin of this (test/keyboard-nav.test.tsx) is faster and covers more
 * components, and it stays. What it cannot cover is that the keys arrive at all:
 * react-native-web routes key handling through its own responder and normalisation
 * layer, and a synthetic DOM event does not always take the same path a browser's
 * does. The Autocomplete's Escape is the case in point: two suites asserted it
 * worked, and in a browser the keydown never left the text field.
 */
import type { Locator, Page } from "@playwright/test";
import { gotoDocs, platformRow, stage } from "../support/docs";
import { expect, test } from "../support/fixtures";

test("a tab set walks with every key the roving-focus pattern promises", async ({ page }) => {
  // The web row, the one whose behaviour is native to the browser being driven. Tabs,
  // RadioGroup, Listbox and the Dropdown menu all share src/style/use-roving-focus.ts,
  // so this is the one place the arrows, Home and End are all exercised for real.
  await gotoDocs(page, "/components/tabs", { scheme: "dark" });
  const tabs = platformRow(page, "web").getByRole("tab");
  const selectedIndex = async () => {
    const flags = await tabs.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-selected")));
    return flags.indexOf("true");
  };
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const count = await tabs.count();
  expect(count).toBeGreaterThan(2);

  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(selectedIndex).toBe(1);
  await page.keyboard.press("End");
  await expect.poll(selectedIndex).toBe(count - 1);
  await page.keyboard.press("Home");
  await expect.poll(selectedIndex).toBe(0);
});

test("a radio group moves the checked option with the arrows", async ({ page }) => {
  await gotoDocs(page, "/components/radio", { scheme: "dark" });
  const radios = platformRow(page, "web").getByRole("radio");
  await expect(radios.first()).toBeVisible();
  const checkedIndex = async () => {
    const flags = await radios.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-checked")));
    return flags.indexOf("true");
  };
  // The example does not start on the first option, and the group is ONE tab stop:
  // only the checked radio is reachable by Tab, so that is where an arrow starts.
  const start = await checkedIndex();
  expect(start).toBeGreaterThanOrEqual(0);
  await radios.nth(start).focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(checkedIndex).toBe(start + 1);
  await page.keyboard.press("ArrowUp");
  await expect.poll(checkedIndex).toBe(start);
});

test("the example rail selects with the arrow keys and addresses the example", async ({ page }) => {
  await gotoDocs(page, "/components/badge", { scheme: "dark" });
  const tabs = page.locator('[data-testid="playground-examples"]').getByRole("tab");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

  await tabs.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  // Selecting an example is addressable: the URL names it.
  await expect(page).toHaveURL(/\/components\/badge\/solid(\?|$)/);
  // Formerly a KNOWN GAP: selecting used to drop keyboard focus to the document body,
  // because /components/badge and /components/badge/solid are different route files
  // and router.replace remounted the whole screen out from under the focused tab. The
  // docs page now updates the address bar in place instead of navigating, so the
  // component and its children stay mounted and the kit's own roving-focus keeps focus
  // on the newly selected tab, exactly like the component in isolation (the test
  // above); a second arrow press keeps walking the rail instead of landing on nothing.
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/components\/badge\/outline(\?|$)/);
  await expect(tabs.nth(2)).toBeFocused();
});

test("a slider moves its value with the arrows", async ({ page }) => {
  await gotoDocs(page, "/components/slider", { scheme: "dark" });
  const slider = platformRow(page, "web").getByRole("slider").first();
  await expect(slider).toBeVisible();
  const before = Number(await slider.getAttribute("aria-valuenow"));
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
    .toBeGreaterThan(before);
  await page.keyboard.press("Home");
  await expect
    .poll(async () => Number(await slider.getAttribute("aria-valuenow")))
    .toBeLessThanOrEqual(before);
});

test("the code block's copy button is reachable by Tab, not just by a mouse", async ({ page }) => {
  // A control that only responds to a mouse is the most common keyboard defect in a
  // component kit, and the copy button is the one every component page carries.
  // locator.focus() would prove nothing: it calls element.focus() directly, which
  // succeeds even on tabindex="-1". Tabbing to it is the actual claim.
  await gotoDocs(page, "/components/button", { scheme: "dark" });
  const copy = stage(page).getByRole("button", { name: /Copy/ }).first();
  await expect(copy).toBeVisible();
  await expect(copy).toHaveAttribute("tabindex", "0");

  // Walk the tab order from the code block's own region until it arrives, rather
  // than from the top of a page with a whole navigation shell in front of it.
  await stage(page).getByRole("tab").last().focus();
  let reached = false;
  for (let press = 0; press < 12 && !reached; press++) {
    await page.keyboard.press("Tab");
    reached = await copy.evaluate((node) => node === document.activeElement);
  }
  expect(reached, "Tab never reached the copy button").toBe(true);
});

// Where keyboard focus is, by role and name, or "outside" once it has left `scope`.
function focusIn(scope: Locator): Promise<string> {
  return scope.evaluate((root) => {
    const node = document.activeElement as HTMLElement | null;
    if (!node || !root.contains(node)) return "outside";
    return `${node.getAttribute("role") ?? node.tagName.toLowerCase()} ${node.getAttribute("aria-label") ?? node.textContent ?? ""}`;
  });
}

// Press Tab `count` times from wherever focus is, and record where each press lands: the
// tab order the browser itself builds, which locator.focus() would skip.
async function tabWalk(page: Page, scope: Locator, count: number): Promise<string[]> {
  const stops: string[] = [];
  for (let press = 0; press < count; press++) {
    await page.keyboard.press("Tab");
    stops.push(await focusIn(scope));
  }
  return stops;
}

test("a selectable table's rows stay pointer-only: Tab crosses the checkboxes, never a row", async ({ page }) => {
  // A press on a row toggles it as a pointer convenience; the row's checkbox is the
  // keyboard path. The row asks to stay out of the tab order with focusable={false},
  // which react-native-web's Pressable overrides with a tab index of its own unless the
  // kit's Pressable spells the request as tab index -1. Each row used to cost an extra
  // press of Tab that landed on the unnamed row before its checkbox.
  await gotoDocs(page, "/components/data-table/selectable", { scheme: "dark" });
  const web = platformRow(page, "web");
  const boxes = web.getByRole("checkbox");
  await expect(boxes).toHaveCount(4);
  await boxes.first().focus();
  expect(await tabWalk(page, web, 4)).toEqual([
    "checkbox Alice Johnson, alice@example.com, Admin",
    "checkbox Bob Smith, bob@example.com, Editor",
    "checkbox Rachel Chen, rachel@example.com, Admin",
    "outside",
  ]);
  // Out of the tab order, the row still answers a pointer: a press on its text selects it.
  const rachel = web.getByRole("checkbox", { name: "Rachel Chen, rachel@example.com, Admin" });
  await expect(rachel).toHaveAttribute("aria-checked", "false");
  await web.getByText("rachel@example.com").click();
  await expect(rachel).toHaveAttribute("aria-checked", "true");
});
