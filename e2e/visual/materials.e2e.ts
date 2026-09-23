/**
 * Full manifest coverage for material mode, independent of the solid PNG baselines.
 * Browser screenshots of iOS/Android rows establish skin anatomy only. Native
 * material evidence comes from the explicit native Lookout targets.
 */
import { MATERIAL_ROUTES } from "../support/material-routes";
import { MATERIAL_OVERLAYS, TOAST } from "../support/overlays";
import { gotoDocs, platformRow, previewCard, stage } from "../support/docs";
import { attachMaterialEvidence, expectNoMaterialEffects, readMaterialEffects } from "../support/material-evidence";
import { expect, test } from "../support/fixtures";

const FIXED_TIME = new Date("2026-01-15T12:00:00Z");
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 390, height: 844 },
} as const;

// These actual default examples own a surface. Other families can be bare at
// rest or delegate their surface to a child; their captures record the effect
// count without pretending every declared material is visible in every variant.
const SURFACED_DEFAULTS = new Set(["button", "button-group", "card", "input", "checkbox", "switch", "badge", "data-table"]);
// A text field under glass is Dark Factory's clear well: its own tint and hairline over
// an unblurred backdrop (web-frost.ts `clearBlur`), so it owns a clear material rather
// than a frosted one.
const CLEAR_DEFAULTS = new Set(["input"]);

for (const scheme of ["dark", "light"] as const) {
  for (const [formFactor, viewport] of Object.entries(VIEWPORTS)) {
    for (const route of MATERIAL_ROUTES) {
      test(`material ${route.slug} ${scheme} ${formFactor}`, async ({ page }, testInfo) => {
        await page.clock.setFixedTime(FIXED_TIME);
        await gotoDocs(page, route.path, { scheme, surface: "glass", viewport });
        const card = previewCard(page).first();
        const row = platformRow(page, "web").first();
        await expect(row).toBeVisible();
        if (SURFACED_DEFAULTS.has(route.slug)) {
          const clear = CLEAR_DEFAULTS.has(route.slug);
          await expect.poll(async () => {
            const effects = await readMaterialEffects(row);
            return clear ? effects.clearMaterials : effects.activeBackdropEffects;
          }, {
            message: `${route.slug} must paint its own material, not only the surrounding docs card`,
          }).toBeGreaterThan(0);
        }
        const metadata = { route: route.path, roles: route.roles, scheme, formFactor, surface: "glass", reducedMotion: true };
        await attachMaterialEvidence(page, testInfo, "glass-rest", card, metadata);

        const overlay = MATERIAL_OVERLAYS.find(({ slug }) => slug === route.slug);
        if (overlay) {
          const closed = await overlay.panel(page).count();
          await overlay.open(page);
          await expect(overlay.panel(page)).toHaveCount(closed + overlay.adds);
          await expect(overlay.panel(page).last()).toBeVisible();
          await attachMaterialEvidence(page, testInfo, "glass-open", stage(page), metadata, overlay.atDocumentRoot);
          await page.keyboard.press("Escape");
          await expect(overlay.panel(page)).toHaveCount(closed);
        } else if (route.slug === "toast") {
          const speaking = TOAST.region(page).filter({ hasText: /\S/ });
          const before = await speaking.count();
          await TOAST.open(page);
          await expect(speaking).toHaveCount(before + 1);
          await attachMaterialEvidence(page, testInfo, "glass-notification", stage(page), metadata, true);
        }

        // Preserve the existing solid image baselines and additionally verify
        // that this route does no browser backdrop work when glass is disabled.
        await gotoDocs(page, route.path, { scheme, surface: "solid", viewport });
        await expect(row).toBeVisible();
        await expectNoMaterialEffects(row);
        if (overlay) {
          await overlay.open(page);
          await expect(overlay.panel(page).last()).toBeVisible();
          const host = overlay.atDocumentRoot ? page.locator("body") : stage(page).locator("..");
          await expectNoMaterialEffects(host);
        }
      });
    }
  }
}
