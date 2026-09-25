/**
 * The E2E soak's configuration (.github/workflows/e2e-soak.yml): the suite's own, plus
 * the Chromium launch overrides a soak passes in, so a soak can test a hypothesis about
 * the browser on the CI runner without touching the configuration every other run uses.
 *
 *   E2E_SOAK_CHANNEL        "chromium" runs full Chromium in its new headless mode
 *                           instead of the headless shell Playwright launches by default.
 *   E2E_SOAK_CHROMIUM_ARGS  extra Chromium command-line switches, space separated.
 *   E2E_SOAK_DEFAULT_PACING "1" drops the suite's own CHROMIUM_ARGS, so a soak can see
 *                           what a Chromium release does with its default frame pacing.
 *
 * They apply to the Chromium projects only. It sits beside playwright.config.ts so the
 * paths that configuration spells relative to itself mean the same thing here.
 */
import { defineConfig } from "@playwright/test";
import base, { CHROMIUM_ARGS } from "./playwright.config";

const channel = process.env.E2E_SOAK_CHANNEL || undefined;
if (channel !== undefined && channel !== "chromium") {
  throw new Error(`E2E_SOAK_CHANNEL must be "chromium" or empty, not "${channel}"`);
}
const args = (process.env.E2E_SOAK_CHROMIUM_ARGS ?? "").split(/\s+/).filter(Boolean);
const notASwitch = args.find((arg) => !/^--[a-z0-9-]+(=\S+)?$/.test(arg));
if (notASwitch) throw new Error(`E2E_SOAK_CHROMIUM_ARGS takes --switches only, not "${notASwitch}"`);

type SuiteProject = NonNullable<typeof base.projects>[number];
const isChromium = (project: SuiteProject) => (project.use?.browserName ?? "chromium") === "chromium";
const defaultPacing = process.env.E2E_SOAK_DEFAULT_PACING === "1";
const suiteArgs = (project: SuiteProject) => (project.use?.launchOptions?.args ?? [])
  .filter((arg) => !(defaultPacing && CHROMIUM_ARGS.includes(arg)));

export default defineConfig({
  ...base,
  projects: (base.projects ?? []).map((project) => isChromium(project)
    ? {
        ...project,
        use: {
          ...project.use,
          ...(channel ? { channel } : {}),
          launchOptions: {
            ...project.use?.launchOptions,
            args: [...suiteArgs(project), ...args],
          },
        },
      }
    : project),
});
