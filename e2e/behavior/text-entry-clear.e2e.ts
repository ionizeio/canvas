import type { Locator, Page } from "@playwright/test";
import { gotoDocs, platformRow } from "../support/docs";
import { readMaterialEffects } from "../support/material-evidence";
import { expect, test } from "../support/fixtures";

interface EntryCase {
  slug: string;
  variant?: string;
  value: string;
  role?: "textbox" | "combobox" | "spinbutton";
  otp?: boolean;
  open?: (row: Locator) => Promise<void>;
}
const fields: EntryCase[] = [
  { slug: "input", value: "Clear material preserves this draft" },
  { slug: "textarea", value: "First line\nClear material preserves this draft" },
  { slug: "autocomplete", value: "Ada", role: "combobox" },
  { slug: "input-otp", value: "123", otp: true },
  { slug: "stepper", value: "7", role: "spinbutton" },
  { slug: "phone-input", value: "4165550123" },
];
const additional: EntryCase[] = [
  { slug: "input", variant: "Prefix", value: "canvas.dev/draft" },
  { slug: "input-otp", variant: "Grouped", value: "123", otp: true },
  { slug: "data-table", variant: "Inline editing", value: "/new-path",
    open: row => row.getByRole("button", { name: "Edit Page for /pricing", exact: true }).click() },
];

async function entry(page: Page, recipe: EntryCase, scheme: "light" | "dark", width: number, surface: "glass" | "solid" = "glass") {
  await gotoDocs(page, `/components/${recipe.slug}`, { scheme, surface, viewport: { width, height: 900 } });
  if (recipe.variant) await page.getByRole("tab", { name: recipe.variant, exact: true }).click();
  const row = platformRow(page, "web").first();
  if (recipe.open) await recipe.open(row);
  const field = row.getByRole(recipe.role ?? "textbox").first();
  await field.scrollIntoViewIfNeeded();
  await expect(field).toBeVisible();
  return { row, field };
}

function localBox(field: Locator) {
  return field.evaluate(node => {
    const box = node.getBoundingClientRect();
    const row = node.closest("[data-platform-row]")!.getBoundingClientRect();
    return { x: box.x - row.x, y: box.y - row.y, width: box.width, height: box.height };
  });
}

for (const recipe of [...fields, ...additional]) for (const width of [1280, 390]) for (const scheme of ["light", "dark"] as const) {
  if ((recipe.variant === "Prefix" || recipe.variant === "Grouped") && (width !== 390 || scheme !== "dark")) continue;
  test(`${recipe.slug} ${recipe.variant ?? "Usage"} clear field preserves editing at ${width} in ${scheme}`, async ({ page }, info) => {
    const { row, field } = await entry(page, recipe, scheme, width);
    const original = await field.elementHandle();
    const before = (await field.boundingBox())!;
    const geometry = await localBox(field);
    await field.click({ position: { x: Math.max(4, before.width * 0.19), y: before.height * 0.45 } });
    // Autocomplete opens its dismiss layer during editing. Focus by real pointer
    // first, then type through the focused field without clicking that backdrop.
    await field.fill(recipe.value);
    await expect(field).toBeFocused();
    if (recipe.otp) {
      await field.press("4");
      await expect(field).toHaveValue("1234");
    } else if (recipe.role === "spinbutton" || recipe.slug === "data-table") {
      // Home/End adjust a spinbutton's bounds and can scroll a table viewport.
      // Select-all tests the editor's native selection without those commands.
      await field.press("ControlOrMeta+a");
    } else {
      await field.press("Home");
      await field.press("Shift+ArrowRight");
      await field.press("Shift+ArrowRight");
    }
    const selection = await field.evaluate(node => ({ start: (node as HTMLInputElement).selectionStart, end: (node as HTMLInputElement).selectionEnd }));
    if (!recipe.otp) expect(selection.end! - selection.start!).toBe(recipe.role === "spinbutton" || recipe.slug === "data-table" ? recipe.value.length : 2);
    await expect.poll(async () => (await readMaterialEffects(row)).effects.some(effect => effect.filter.includes("-clear"))).toBe(true);
    const screenshot = info.outputPath("clear-field.png");
    await row.screenshot({ path: screenshot });
    await info.attach("clear field", { path: screenshot, contentType: "image/png" });
    await expect(field).toHaveValue(recipe.otp ? "1234" : recipe.value);
    await expect(field).toBeFocused();
    expect(await original!.evaluate(node => node.isConnected)).toBe(true);
    expect(await field.evaluate(node => ({ start: (node as HTMLInputElement).selectionStart, end: (node as HTMLInputElement).selectionEnd }))).toEqual(selection);
    // Element screenshots may scroll the docs page to fit a tall table row.
    // Check the field's layout within that row, independent of viewport scroll.
    expect(await localBox(field)).toEqual(geometry);
    await info.attach("painted material", { body: JSON.stringify(await readMaterialEffects(row), null, 2), contentType: "application/json" });
    await original!.dispose();
  });
}

for (const recipe of fields.filter(field => ["input", "input-otp", "phone-input"].includes(field.slug))) {
  test(`${recipe.slug} solid field retains editing and no clear material`, async ({ page }) => {
    const { row, field } = await entry(page, recipe, "light", 390, "solid");
    await field.click();
    await field.fill(recipe.value);
    await expect(field).toHaveValue(recipe.value);
    await expect(field).toBeFocused();
    expect((await readMaterialEffects(row)).activeBackdropEffects).toBe(0);
  });

  test(`${recipe.slug} disabled field rejects edits`, async ({ page }) => {
    const { field } = await entry(page, { ...recipe, variant: "Disabled" }, "dark", 390);
    const value = await field.inputValue();
    const box = (await field.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.type("9");
    await expect(field).toHaveValue(value);
    // Existing editable:false maps to readonly on RNW; Input and PhoneInput
    // can still receive focus. This material change must preserve that contract.
    await expect(field).toHaveAttribute("readonly", "");
  });
}
