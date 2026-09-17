import { gotoDocs } from "../support/docs";
import { captureMaterialMotion, readMaterialEffects } from "../support/material-evidence";
import { expect, test } from "../support/fixtures";

// A separate project uses no-preference and retains video. These are real native
// component shells rendered by RNW, not a replacement for native device evidence.
for (const scheme of ["light", "dark"] as const) {
  test(`existing liquid controls preserve geometry in ${scheme}`, async ({ page }, testInfo) => {
    await gotoDocs(page, "/testing/materials", { scheme, viewport: { width: 1280, height: 1400 } });
    if (scheme === "dark") await page.getByRole("button", { name: "Switch scheme", exact: true }).click();
    await page.getByTestId("material-toggle").click();
    await expect(page.getByTestId("material-mode")).toHaveText(`Mode: glass; scheme: ${scheme}`);
    const group = page.getByTestId("material-segments");
    const selection = page.getByTestId("material-segments-selection");
    await expect(selection).toBeVisible();
    await expect.poll(async () => (await readMaterialEffects(group)).activeBackdropEffects).toBeGreaterThan(0);
    const rest = testInfo.outputPath(`${scheme}-rest.png`);
    await page.screenshot({ path: rest });
    await testInfo.attach(`${scheme}-rest.png`, { path: rest, contentType: "image/png" });

    const settings = group.getByRole("tab", { name: "Settings", exact: true });
    const groupFrames = await captureMaterialMotion(page, testInfo, `${scheme}-button-group`, selection, group, async () => {
      await settings.hover();
      await page.mouse.down();
      // Hold until observed lift, rather than waiting a guessed press duration.
      await expect.poll(async () => (await selection.boundingBox())?.height ?? 0).toBeGreaterThan(38);
      await page.mouse.up();
    });
    await expect(settings).toHaveAttribute("aria-selected", "true");
    expect(groupFrames.reducedMotion).toBe(false);
    expect(groupFrames.frames.some((frame) => frame.material.height > 38)).toBe(true);
    const groupStart = groupFrames.frames[0]!.foreground!;
    expect(groupFrames.frames.every((frame) => frame.foreground?.x === groupStart.x && frame.foreground?.y === groupStart.y
      && frame.foreground?.height === groupStart.height)).toBe(true);

    const toggle = page.getByTestId("material-switch");
    const switchThumb = page.getByTestId("material-switch-thumb-motion");
    const switchFrames = await captureMaterialMotion(page, testInfo, `${scheme}-switch`, switchThumb, toggle, () => toggle.click());
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    const switchWidths = switchFrames.frames.map((frame) => frame.material.width);
    expect(Math.max(...switchWidths) - Math.min(...switchWidths)).toBeGreaterThan(0.5);

    const slider = page.getByTestId("material-slider");
    const sliderThumb = page.getByTestId("material-slider-thumb-motion");
    const box = await slider.boundingBox();
    if (!box) throw new Error("Slider must be measured before dragging");
    const sliderFrames = await captureMaterialMotion(page, testInfo, `${scheme}-slider`, sliderThumb, slider, async () => {
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 16 });
      await page.mouse.up();
    });
    const sliderWidths = sliderFrames.frames.map((frame) => frame.material.width);
    expect(Math.max(...sliderWidths) - Math.min(...sliderWidths)).toBeGreaterThan(0.5);
    expect(Number(await slider.getAttribute("aria-valuenow"))).toBeGreaterThan(60);
    for (const recording of [groupFrames, switchFrames, sliderFrames]) {
      expect(recording.frames.every((frame) => frame.connected)).toBe(true);
      expect(recording.frames.at(-1)!.lensDefinitions).toBe(recording.definitionsAtStart);
      // One CSS pixel is a visual tolerance, not an exact spring-internal value.
      // The last sampled frames must be still after the finite interaction.
      for (const axis of ["x", "y", "width", "height"] as const) {
        const settledBounds = recording.frames.slice(-10).map((frame) => frame.material[axis]);
        expect(Math.max(...settledBounds) - Math.min(...settledBounds)).toBeLessThan(1);
      }
    }
    const settled = testInfo.outputPath(`${scheme}-settled.png`);
    await page.screenshot({ path: settled });
    await testInfo.attach(`${scheme}-settled.png`, { path: settled, contentType: "image/png" });
  });
}
