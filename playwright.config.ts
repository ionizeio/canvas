/**
 * The end-to-end suite: what the docs app actually does in a real browser.
 *
 * This is the DETERMINISTIC half of Canvas's visual verification. It asserts facts
 * (a route painted, nothing threw, nothing overflowed, Escape closed the overlay,
 * these pixels match the baseline). Taste is judged separately by lookout, which
 * reads lookout.config.ts and files opinions; the two are meant not to overlap.
 *
 * What it runs against, in order of preference:
 *
 *   E2E_BASE_URL set  Whatever is already serving, typically `cd docs && bun run dev`
 *                     (Metro on 8081). Convenient while writing a spec; note Metro is
 *                     a DEV build, so React's own development warnings reach the
 *                     console gate.
 *   otherwise         The web export in docs/dist, served by e2e/support/serve-dist.ts
 *                     the way Pages serves it (one document per route, a real 404 for a
 *                     miss) with the production Content-Security-Policy from
 *                     docs/public/_headers. This is the canonical run: it tests
 *                     the bytes that ship. Build it with `cd docs && bun run build:web`.
 *                     Production React does not report a hydration mismatch in an
 *                     attribute, so here the console gate cannot see one: the ids a
 *                     page hydrates are checked by e2e/behavior/hydration-ids.e2e.ts.
 *
 * There are no retries on purpose. A test that only passes sometimes is a defect in
 * the test or the app, and hiding it behind a retry is the shortcut this repo does
 * not take. Every wait in the suite is a wait on observable state, never a sleep.
 */
import { defineConfig, devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions, type Project } from "@playwright/test";

const CI = !!process.env.CI;

// The suite serves the export itself unless something is already running.
const OWN_SERVER_PORT = 4173;
const TOKENS_SERVER_PORT = 4174;
const baseURL = process.env.E2E_BASE_URL ?? `https://127.0.0.1:${OWN_SERVER_PORT}`;
const localCertificate = new URL(baseURL).protocol === "https:"
  && ["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname);
const basePath = process.env.E2E_BASE_PATH ?? "";

// Screenshot baselines are rasterized by the CI runner's font stack. macOS renders
// the same DOM with different glyph metrics, which shifts layout by whole pixels, so
// a macOS run executes every visual flow (selector rot still fails) but compares
// nothing. E2E_FORCE_VISUAL is the escape hatch for a run inside the Playwright
// container image.
const compareSnapshots = process.platform === "linux" || !!process.env.E2E_FORCE_VISUAL;

// Chromium draws unthrottled in every Chromium project. By default a renderer holds its
// next draw until the display compositor acknowledges the frame before it, and on the
// CI runner, where the software compositor takes about a second per frame of the glass
// pages' backdrop blurs, that acknowledgement sometimes never came: the renderer, its
// compositor and the GPU process's compositor all went to sleep, no frame was drawn
// again, and whatever step needed one next (a screenshot, a wait on real frames) hung
// until the test timed out, in 3 of about 26 Deploy runs. The E2E soak
// (.github/workflows/e2e-soak.yml, with e2e/support/hang-probe.ts) caught it in the
// act and measured it on the material spec: 8 hangs in 128 passes with Chromium's
// default pacing, 1 in 320 with this switch, the Linux screenshot baselines unchanged.
// The switch lifts that wait in the renderer's scheduler and the display's
// (IsDrawThrottled and the display scheduler in Chromium 148, which also drops vsync);
// nothing here depends on frame pacing, since the screenshots disable animations and
// the page clock drives the page's own timers. It mitigates a Chromium defect rather
// than curing it (the one hang left had the same profile), and it stays until a
// Chromium release is soaked clean without it.
export const CHROMIUM_ARGS = ["--disable-frame-rate-limit"];

type SuiteProject = Project<PlaywrightTestOptions, PlaywrightWorkerOptions>;

/** Add CHROMIUM_ARGS to every project that runs Chromium (the default browser here). */
function withChromiumArgs(projects: SuiteProject[]): SuiteProject[] {
  return projects.map((project) => (project.use?.browserName ?? "chromium") === "chromium"
    ? {
        ...project,
        use: {
          ...project.use,
          launchOptions: { ...project.use?.launchOptions, args: [...(project.use?.launchOptions?.args ?? []), ...CHROMIUM_ARGS] },
        },
      }
    : project);
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  // ubuntu-latest gives 4 vCPUs. If load-time variance ever bites, lower this;
  // never raise retries.
  workers: CI ? 4 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
    },
  },
  reporter: CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    // The fixture creates a short-lived loopback certificate. Trust it only in
    // these isolated browser contexts, never in the host's certificate store.
    ignoreHTTPSErrors: localCertificate,
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    // Reduced motion lives on contextOptions rather than beside viewport, which is
    // just where Playwright 1.60 keeps it. It matters more than it looks: the kit
    // reads prefers-reduced-motion through react-native-web's AccessibilityInfo
    // (src/style/motion.ts), so this genuinely stills the kit's entrance animations
    // instead of merely freezing CSS transitions.
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Recording costs CPU on every test to serve the rare failure; the trace already
    // carries per-action screenshots and DOM snapshots.
    video: "off",
  },

  projects: withChromiumArgs([
    { name: "smoke", testDir: "./e2e/smoke" },
    { name: "responsive", testDir: "./e2e/responsive" },
    { name: "behavior", testDir: "./e2e/behavior" },
    { name: "a11y", testDir: "./e2e/a11y" },
    ...(["chromium", "firefox", "webkit"] as const).map((browserName) => ({
      name: `journeys-${browserName}`,
      testDir: "./e2e/journeys",
      testMatch: ["**/keyboard.e2e.ts", "**/identity.e2e.ts", "**/control-refs.e2e.ts", "**/shell-search.e2e.ts", "**/carousel.e2e.ts", "**/overlay-placement.e2e.ts"],
      use: { browserName, userAgent: undefined },
    })),
    {
      name: "touch-chromium",
      testDir: "./e2e/journeys",
      testMatch: ["**/touch.e2e.ts", "**/identity.e2e.ts", "**/control-refs.e2e.ts", "**/shell-search.e2e.ts"],
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    {
      name: "touch-webkit",
      testDir: "./e2e/journeys",
      testMatch: ["**/touch.e2e.ts", "**/identity.e2e.ts", "**/control-refs.e2e.ts", "**/shell-search.e2e.ts"],
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "visual",
      testDir: "./e2e/visual",
      ignoreSnapshots: !compareSnapshots,
      snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
    },
  ]),

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: `bun e2e/support/serve-dist.ts --root docs/dist --port ${OWN_SERVER_PORT} --headers --https${basePath ? ` --base ${basePath}` : ""}`,
          url: `https://127.0.0.1:${OWN_SERVER_PORT}${basePath}/`,
          ignoreHTTPSErrors: true,
          reuseExistingServer: !CI,
          timeout: 20_000,
          stdout: "pipe",
        },
        {
          // The token stylesheet fixture (test/tokens.html) links ../styles/canvas.css
          // exactly as a consumer would, so it is served from the checkout root. No SPA
          // rewrite: this one may only answer with files that exist.
          command: `bun e2e/support/serve-dist.ts --root . --port ${TOKENS_SERVER_PORT} --no-spa`,
          url: `http://127.0.0.1:${TOKENS_SERVER_PORT}/test/tokens.html`,
          reuseExistingServer: !CI,
          timeout: 20_000,
          stdout: "pipe",
        },
      ],
});

/** Where the token stylesheet fixture is served, for the visual project. */
export const TOKENS_URL = `http://127.0.0.1:${TOKENS_SERVER_PORT}/test/tokens.html`;
