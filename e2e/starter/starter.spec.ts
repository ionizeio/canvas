import { expect, test, type Locator, type Page } from "@playwright/test";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(__dirname, "../..");
const starter = resolve(repo, "examples/starter");
const packageRoot = resolve(starter, "node_modules/@ionizeio/canvas");

test.beforeAll(async ({}, testInfo) => {
  const declared = JSON.parse(readFileSync(resolve(starter, "package.json"), "utf8"));
  const installed = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  const pin = declared.dependencies["@ionizeio/canvas"];
  expect(pin, "The ordinary starter must retain an exact registry version.").toMatch(/^\d+\.\d+\.\d+$/);
  expect(installed.version).toBe(pin);
  expect(realpathSync(packageRoot), "The consumer must use a real installed directory.").toBe(packageRoot);
  expect(existsSync(resolve(packageRoot, ".origin")), "A local development overlay cannot stand in for the registry package.").toBe(false);
  expect(installed.main).toMatch(/^\.\/dist\//);
  expect(existsSync(resolve(packageRoot, installed.main))).toBe(true);
  await testInfo.attach("registry-package", {
    body: JSON.stringify({ packageName: installed.name, packageVersion: pin, packageRoot, entry: installed.main }, null, 2),
    contentType: "application/json",
  });
});

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  // Assert in teardown too, so a late React error cannot be missed by a successful click.
  errorLogs.set(page, errors);
});

const errorLogs = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(errorLogs.get(page) ?? [], "The ordinary starter emitted browser errors.").toEqual([]);
});

async function activate(locator: Locator, touch: boolean) {
  if (touch) await locator.tap();
  else await locator.click();
}

async function workspace(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your workspace", exact: true })).toBeVisible();
}

async function navigate(page: Page, screen: "Workspace" | "Preferences", touch: boolean) {
  await activate(page.getByRole("button", { name: "Open workspace menu", exact: true }), touch);
  const drawer = page.getByRole("dialog", { name: "Workspace menu", exact: true });
  await activate(drawer.getByRole("button", { name: "Navigate to", exact: true }), touch);
  const menu = drawer.getByRole("menu", { name: "Screens", exact: true });
  await activate(menu.getByRole("menuitem", { name: screen, exact: true }), touch);
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole("heading", { name: screen === "Workspace" ? "Your workspace" : "Preferences", exact: true })).toBeVisible();
}

async function saved(page: Page, name: string, city: string, workstreams: string) {
  await expect(page.getByRole("heading", { name: "Saved workspace", exact: true })).toBeVisible();
  // These are rendered summary values. Inputs expose their draft through value,
  // and the workstream controls have descriptions, so they cannot satisfy this check.
  for (const value of [name, city, workstreams]) await expect(page.getByRole("main").getByText(value, { exact: true })).toBeVisible();
}

const workstream = (page: Page, name: string) => page.getByRole("group", { name: "Workspace workstreams", exact: true })
  .getByRole("checkbox", { name: new RegExp(`^${name},`) });
const appearance = (page: Page, name: string) => page.getByRole("listbox", { name: "Appearance", exact: true })
  .getByRole("option", { name: new RegExp(`^${name},`) });
const summarySwitch = (page: Page) => page.getByRole("switch", { name: /^Show workspace summary/ });
const headingColor = (page: Page) => page.getByRole("heading", { name: "Preferences", exact: true }).evaluate((node) => getComputedStyle(node).color);

test("workspace validates and commits selected values only on Save", async ({ page, hasTouch }) => {
  await workspace(page);
  const name = page.getByRole("textbox", { name: "Workspace name", exact: true });
  await name.fill("x");
  await activate(page.getByRole("button", { name: "Save workspace", exact: true }), hasTouch);
  await expect(page.getByText("Enter a workspace name with at least two characters.", { exact: true })).toBeVisible();
  await expect(name).toBeFocused();
  await saved(page, "My workspace", "Toronto", "Design, Engineering");

  await name.fill("  Atlas studio  ");
  const city = page.getByRole("combobox", { name: "Home city", exact: true });
  await city.fill("Lon");
  await activate(page.getByRole("option", { name: "London", exact: true }), hasTouch);
  await expect(city).toHaveValue("London");
  await activate(workstream(page, "Design"), hasTouch);
  await activate(workstream(page, "Research"), hasTouch);
  await expect(workstream(page, "Design")).not.toBeChecked();
  await expect(workstream(page, "Research")).toBeChecked();
  await saved(page, "My workspace", "Toronto", "Design, Engineering");
  await expect(page.getByText("Atlas studio", { exact: true })).not.toBeVisible();

  await activate(page.getByRole("button", { name: "Save workspace", exact: true }), hasTouch);
  await expect(page.getByRole("alert").getByText("Workspace saved for this session.", { exact: true })).toBeVisible();
  await expect(name).toHaveValue("Atlas studio");
  await saved(page, "Atlas studio", "London", "Engineering, Research");
});

test("cancel restores the saved workspace after draft edits", async ({ page, hasTouch }) => {
  await workspace(page);
  const name = page.getByRole("textbox", { name: "Workspace name", exact: true });
  const city = page.getByRole("combobox", { name: "Home city", exact: true });
  await name.fill("Atlas studio");
  await activate(page.getByRole("button", { name: "Save workspace", exact: true }), hasTouch);
  await saved(page, "Atlas studio", "Toronto", "Design, Engineering");
  await name.fill("Discard this draft");
  await city.fill("Tok");
  await activate(page.getByRole("option", { name: "Tokyo", exact: true }), hasTouch);
  await activate(workstream(page, "Design"), hasTouch);
  await activate(workstream(page, "Research"), hasTouch);
  await saved(page, "Atlas studio", "Toronto", "Design, Engineering");
  await activate(page.getByRole("button", { name: "Cancel changes", exact: true }), hasTouch);
  await expect(page.getByRole("alert").getByText("Unsaved workspace changes discarded.", { exact: true })).toBeVisible();
  await expect(name).toHaveValue("Atlas studio");
  await expect(city).toHaveValue("Toronto");
  await expect(workstream(page, "Design")).toBeChecked();
  await expect(workstream(page, "Research")).not.toBeChecked();
  await saved(page, "Atlas studio", "Toronto", "Design, Engineering");
});

test("preferences preview immediately and Cancel restores saved values", async ({ page, hasTouch }) => {
  await page.goto("/preferences");
  await expect(appearance(page, "System")).toHaveAttribute("aria-selected", "true");
  const lightColor = await headingColor(page);
  await activate(appearance(page, "Dark"), hasTouch);
  await expect.poll(() => headingColor(page)).not.toBe(lightColor);
  await activate(summarySwitch(page), hasTouch);
  await navigate(page, "Workspace", hasTouch);
  await expect(page.getByRole("heading", { name: "Saved workspace", exact: true })).not.toBeVisible();
  await navigate(page, "Preferences", hasTouch);
  await activate(page.getByRole("button", { name: "Cancel changes", exact: true }), hasTouch);
  await expect(page.getByRole("alert").getByText("Unsaved preference changes discarded.", { exact: true })).toBeVisible();
  await expect(appearance(page, "System")).toHaveAttribute("aria-selected", "true");
  await expect(summarySwitch(page)).toBeChecked();
  await expect.poll(() => headingColor(page)).toBe(lightColor);
  await navigate(page, "Workspace", hasTouch);
  await saved(page, "My workspace", "Toronto", "Design, Engineering");
});

test("saved preferences survive navigation and reset restores the sample session", async ({ page, hasTouch }) => {
  await workspace(page);
  await page.getByRole("textbox", { name: "Workspace name", exact: true }).fill("Atlas studio");
  await activate(page.getByRole("button", { name: "Save workspace", exact: true }), hasTouch);
  await navigate(page, "Preferences", hasTouch);
  await activate(appearance(page, "Dark"), hasTouch);
  await activate(summarySwitch(page), hasTouch);
  await activate(page.getByRole("button", { name: "Save preferences", exact: true }), hasTouch);
  await expect(page.getByRole("alert").getByText("Preferences saved for this session.", { exact: true })).toBeVisible();
  await navigate(page, "Workspace", hasTouch);
  await expect(page.getByRole("heading", { name: "Saved workspace", exact: true })).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue("Atlas studio");
  await navigate(page, "Preferences", hasTouch);
  await expect(appearance(page, "Dark")).toHaveAttribute("aria-selected", "true");
  await activate(appearance(page, "Light"), hasTouch);
  await activate(summarySwitch(page), hasTouch);
  await activate(page.getByRole("button", { name: "Cancel changes", exact: true }), hasTouch);
  await expect(appearance(page, "Dark")).toHaveAttribute("aria-selected", "true");
  await expect(summarySwitch(page)).not.toBeChecked();

  await activate(page.getByRole("button", { name: "Open workspace menu", exact: true }), hasTouch);
  const drawer = page.getByRole("dialog", { name: "Workspace menu", exact: true });
  await expect(drawer.getByText("Atlas studio", { exact: true })).toBeVisible();
  await activate(drawer.getByRole("button", { name: "Reset session", exact: true }), hasTouch);
  await expect(drawer).not.toBeVisible();
  await saved(page, "My workspace", "Toronto", "Design, Engineering");
  await expect(page.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue("My workspace");
  await navigate(page, "Preferences", hasTouch);
  await expect(appearance(page, "System")).toHaveAttribute("aria-selected", "true");
  await expect(summarySwitch(page)).toBeChecked();
});

test("Escape dismisses the nested menu before its Drawer and restores focus", async ({ page, hasTouch }) => {
  await workspace(page);
  const opener = page.getByRole("button", { name: "Open workspace menu", exact: true });
  await activate(opener, hasTouch);
  const drawer = page.getByRole("dialog", { name: "Workspace menu", exact: true });
  const trigger = drawer.getByRole("button", { name: "Navigate to", exact: true });
  await activate(trigger, hasTouch);
  await expect(drawer.getByRole("menu", { name: "Screens", exact: true })).toBeVisible();
  // Touch contexts exercise an attached hardware keyboard for this keyboard contract.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Screens", exact: true })).not.toBeVisible();
  await expect(drawer).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("ordinary builds exclude internal smoke routes and offer a return to the workspace", async ({ page, hasTouch }) => {
  await page.goto("/testing/diagnostics");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.getByText("Candidate runtime identity", { exact: true })).not.toBeVisible();
  await activate(page.getByRole("button", { name: "Back to workspace", exact: true }), hasTouch);
  await expect(page.getByRole("heading", { name: "Your workspace", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
