import { gotoDocs } from "../support/docs";
import { expect, test } from "../support/fixtures";
import AxeBuilder from "@axe-core/playwright";

for (const scheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test(`all skins contain usable disclosure targets (${scheme}, ${width}px)`, async ({ page }) => {
      await gotoDocs(page, "/testing/form-autocomplete?scenario=targets", { scheme, viewport: { width, height: 900 } });
      // iOS ships no autocomplete control, so the iOS row is the web skin: in the browser its
      // disclosure is the web's 24px box. Its 44pt reach on an iPhone is native slop, which a
      // browser does not hit-test (test/touch-target-seams.test.tsx holds it); Android's 48dp
      // is its own box.
      for (const [platform, minimum] of [["Web", 24], ["iOS", 24], ["Android", 48]] as const) {
        for (const size of ["small", "default", "large"] as const) {
          const field = page.getByRole("combobox", { name: `${platform} ${size}`, exact: true });
          const container = field.locator("..");
          const toggle = container.getByRole("button", { name: "Toggle options" });
          const inputBox = await field.boundingBox();
          const fieldBox = await container.boundingBox();
          const targetBox = await toggle.boundingBox();
          expect(targetBox!.width).toBeGreaterThanOrEqual(minimum);
          expect(targetBox!.height).toBeGreaterThanOrEqual(minimum);
          expect(targetBox!.y).toBeGreaterThanOrEqual(fieldBox!.y - 0.1);
          expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(fieldBox!.y + fieldBox!.height + 0.1);
          expect(targetBox!.x + targetBox!.width).toBeLessThanOrEqual(fieldBox!.x + fieldBox!.width + 0.1);
          expect(inputBox!.width).toBeGreaterThan(150);
          expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(targetBox!.x + 0.1);
          // The text fills the field's height (all but its 1px frame, or on Android the
          // indicator's 2px band), so a press anywhere in the well lands on the text.
          expect(inputBox!.height, `${platform} ${size}: the text's height`).toBeGreaterThanOrEqual(fieldBox!.height - 2 - 0.1);
          for (const expanded of [false, true]) {
            if (expanded) await toggle.click();
            await expect(field).toHaveAttribute("aria-expanded", String(expanded));
            await toggle.scrollIntoViewIfNeeded();
            const hitEdges = await toggle.evaluate((button, { minimum, expanded }) => {
              const box = button.getBoundingClientRect();
              const x = box.x + box.width / 2;
              const y = box.y + box.height / 2;
              const half = minimum / 2 - 0.25;
              return [[x - half, y], [x + half, y], [x, y - half], [x, y + half]].map(([px, py]) => {
                // An open hosted list deliberately puts its dismiss backdrop
                // above the field. The underlying hit stack still excludes any
                // area clipped by the field's border or an ancestor.
                const hits = document.elementsFromPoint(px!, py!);
                const clickable = expanded ? hits.some((hit) => button.contains(hit))
                  : !!hits[0] && button.contains(hits[0]);
                return { x: px, y: py, clickable };
              });
            }, { minimum, expanded });
            expect(hitEdges, `${platform} ${size}, expanded=${expanded}`).toEqual(
              hitEdges.map((edge) => ({ ...edge, clickable: true })),
            );
            if (expanded) {
              await page.keyboard.press("Escape");
              await expect(field).toHaveAttribute("aria-expanded", "false");
            }
          }
        }
      }
      const axe = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
      expect(axe.violations).toEqual([]);
    });

    test(`a press anywhere in the field's well focuses the text (${scheme}, ${width}px)`, async ({ page }) => {
      await gotoDocs(page, "/testing/form-autocomplete?scenario=targets", { scheme, viewport: { width, height: 900 } });
      for (const platform of ["Web", "iOS", "Android"] as const) {
        for (const size of ["small", "default", "large"] as const) {
          const field = page.getByRole("combobox", { name: `${platform} ${size}`, exact: true });
          const well = field.locator("..");
          await well.scrollIntoViewIfNeeded();
          const box = (await well.boundingBox())!;
          const input = (await field.boundingBox())!;
          // Just inside the frame at the top and the bottom, and at the text's own start: the
          // bands a text line centered in the field would leave dead.
          for (const y of [box.y + 3, box.y + box.height - 4]) {
            await page.mouse.click(input.x + 8, y);
            await expect(field, `${platform} ${size} at ${Math.round(y - box.y)}px`).toBeFocused();
            await expect(field).toHaveAttribute("aria-expanded", "true");
            await page.keyboard.press("Escape");
            await expect(field).toHaveAttribute("aria-expanded", "false");
            await field.blur();
            await expect(field).not.toBeFocused();
          }
        }
      }
    });

    test(`Autocomplete selects before Form submits (${scheme}, ${width}px)`, async ({ page }, testInfo) => {
      await gotoDocs(page, "/testing/form-autocomplete", { scheme, viewport: { width, height: 900 } });
      const field = page.getByRole("combobox", { name: "Fruit", exact: true });
      await field.focus();
      const list = page.getByRole("listbox", { name: "Fruit", exact: true });
      await expect(list).toBeVisible();
      await expect(field).toHaveAttribute("aria-controls", await list.getAttribute("id") as string);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      const apricot = page.getByRole("option", { name: "Apricot", exact: true });
      await expect(field).toHaveAttribute("aria-activedescendant", await apricot.getAttribute("id") as string);
      await expect(field).toBeFocused();
      const screenshot = testInfo.outputPath("autocomplete-active.png");
      await page.screenshot({ path: screenshot });
      await testInfo.attach("autocomplete-active", { path: screenshot, contentType: "image/png" });
      await page.keyboard.down("Enter");
      await expect(field).toHaveValue("Apricot");
      await page.keyboard.down("Enter");
      await page.keyboard.up("Enter");
      await expect(list).toHaveCount(0);
      await expect(field).toBeFocused();
      await expect(page.getByTestId("selection-count")).toHaveText("1");
      await expect(page.getByTestId("value-change-count")).toHaveText("1");
      await expect(page.getByTestId("submit-count")).toHaveText("0");
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("submit-count")).toHaveText("1");
      await expect(page.getByTestId("selection-count")).toHaveText("1");
    });
  }
}

for (const composition of [{ isComposing: true }, { keyCode: 229 }]) {
  test(`composing Escape survives Drawer Modal keyup (${JSON.stringify(composition)})`, async ({ page }) => {
    await gotoDocs(page, "/testing/form-autocomplete?scenario=modal");
    await page.getByRole("button", { name: "Open fruit drawer" }).click();
    const field = page.getByRole("combobox", { name: "Drawer fruit", exact: true });
    await field.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await field.dispatchEvent("keydown", { key: "Escape", bubbles: true, cancelable: true, ...composition });
    await field.dispatchEvent("keyup", { key: "Escape", bubbles: true, ...composition });
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test(`composition owns Enter in Form and Autocomplete (${JSON.stringify(composition)})`, async ({ page }) => {
    await gotoDocs(page, "/testing/form-autocomplete");
    const name = page.getByRole("textbox", { name: "Name", exact: true });
    await name.focus();
    await name.dispatchEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...composition });
    await name.dispatchEvent("keyup", { key: "Enter", bubbles: true, ...composition });
    await expect(page.getByTestId("submit-count")).toHaveText("0");
    const field = page.getByRole("combobox", { name: "Fruit", exact: true });
    await field.fill("ap");
    await page.keyboard.press("ArrowDown");
    const active = await field.getAttribute("aria-activedescendant");
    for (const key of ["ArrowDown", "Enter", "Escape"]) {
      await field.dispatchEvent("keydown", { key, bubbles: true, cancelable: true, ...composition });
      await field.dispatchEvent("keyup", { key, bubbles: true, ...composition });
    }
    await expect(field).toHaveAttribute("aria-activedescendant", active as string);
    await expect(field).toHaveValue("ap");
    await expect(page.getByTestId("selection-count")).toHaveText("0");
    await expect(page.getByTestId("value-change-count")).toHaveText("0");
    await expect(page.getByTestId("submit-count")).toHaveText("0");
    await page.keyboard.press("Enter");
    await expect(field).toHaveValue("Apple");
    await expect(page.getByTestId("selection-count")).toHaveText("1");
    await expect(page.getByTestId("submit-count")).toHaveText("0");
  });
}

test("controlled clearing reports an empty value and keeps onSelect selection-only", async ({ page }) => {
  await gotoDocs(page, "/testing/form-autocomplete?scenario=clear");
  const field = page.getByRole("combobox", { name: "Fruit", exact: true });
  await expect(field).toHaveValue("Apple");
  await field.fill("");
  await expect(field).toHaveValue("");
  await expect(page.getByTestId("fruit-value")).toHaveText("No fruit selected");
  await expect(page.getByTestId("value-change-count")).toHaveText("1");
  await expect(page.getByTestId("selection-count")).toHaveText("0");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Apple");
  await expect(page.getByTestId("value-change-count")).toHaveText("2");
  await expect(page.getByTestId("selection-count")).toHaveText("1");
  await field.fill("");
  await expect(field).toHaveValue("");
  await expect(page.getByTestId("value-change-count")).toHaveText("3");
  await expect(page.getByTestId("selection-count")).toHaveText("1");
});

test("disabled Autocomplete stays closed and becomes keyboard-operable when enabled", async ({ page }) => {
  await gotoDocs(page, "/testing/form-autocomplete?scenario=disabled");
  const field = page.getByRole("combobox", { name: "Fruit", exact: true });
  await expect(field).not.toBeEditable();
  await expect(field).toHaveAttribute("aria-disabled", "true");
  await field.dispatchEvent("keydown", { key: "ArrowDown", bubbles: true });
  await field.dispatchEvent("keyup", { key: "ArrowDown", bubbles: true });
  await expect(field).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByTestId("value-change-count")).toHaveText("0");
  await page.getByRole("switch", { name: "Lock fruit", exact: true }).click();
  await expect(field).toBeEditable();
  await field.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Watermelon");
  await expect(page.getByTestId("selection-count")).toHaveText("1");
});

test("active rows scroll into view and Home restores the top of the list", async ({ page }) => {
  await gotoDocs(page, "/testing/form-autocomplete");
  const field = page.getByRole("combobox", { name: "Fruit", exact: true });
  await field.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  const last = page.getByRole("option", { name: "Watermelon", exact: true });
  await expect(field).toHaveAttribute("aria-activedescendant", await last.getAttribute("id") as string);
  const rowVisibility = async (name: string) => page.getByRole("option", { name, exact: true }).evaluate((row) => {
    let scroll = row.parentElement;
    while (scroll && !["auto", "scroll"].includes(getComputedStyle(scroll).overflowY)) scroll = scroll.parentElement;
    if (!scroll) return null;
    const viewport = scroll.getBoundingClientRect();
    const item = row.getBoundingClientRect();
    return { visible: item.top >= viewport.top - 1 && item.bottom <= viewport.bottom + 1, offset: scroll.scrollTop };
  });
  await expect.poll(async () => (await rowVisibility("Watermelon"))?.visible).toBe(true);
  expect((await rowVisibility("Watermelon"))!.offset).toBeGreaterThan(0);
  await expect(field).toBeFocused();
  await page.keyboard.press("Home");
  await expect.poll(async () => (await rowVisibility("Apple"))?.visible).toBe(true);
  await expect.poll(async () => (await rowVisibility("Apple"))?.offset).toBe(0);
  // Filtering moves surviving rows without resizing them. In RNW that emits
  // no row onLayout, so cached pre-filter positions would hide the first match.
  await field.fill("r");
  await page.keyboard.press("ArrowUp");
  await expect.poll(async () => (await rowVisibility("Watermelon"))?.visible).toBe(true);
  await page.keyboard.press("Home");
  const firstMatch = page.getByRole("option", { name: "Apricot", exact: true });
  await expect(field).toHaveAttribute("aria-activedescendant", await firstMatch.getAttribute("id") as string);
  await expect.poll(async () => (await rowVisibility("Apricot"))?.visible).toBe(true);
  await expect.poll(async () => (await rowVisibility("Apricot"))?.offset).toBe(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByTestId("selection-count")).toHaveText("0");
});
