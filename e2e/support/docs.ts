/**
 * Driving the docs app from a browser: how to open a route in a known look, and
 * where the tooling hooks are.
 *
 * Two things about this app make a naive `goto` unreliable, and both are handled
 * here rather than in every spec:
 *
 *   1. The root layout renders NOTHING until the Geist faces load (a deliberate
 *      trade recorded in docs/src/app/_layout.tsx: rendering early moved Cumulative
 *      Layout Shift from 0.006 to 0.16). So "loaded" is not "painted", and the wait
 *      has to be for paint.
 *   2. The scheme and surface are seeded from the LAUNCH url only (?scheme, ?surface,
 *      read once via a ref in docs/src/theme/docs-theme.tsx, since the docs store
 *      nothing by privacy declaration). A client-side navigation cannot change them,
 *      and the app defaults to dark + glass.
 *
 * Reading the scheme back off the painted pixels covers both at once, and it is what
 * keeps a silent no-op from passing as a capture: the screenshot script this suite
 * replaced once seeded a localStorage key no part of the docs app reads (it belongs
 * to the kit's web CSS hand-off, which the docs do not use), so an entire "light"
 * screenshot set was really dark and nothing said so. This function fails instead.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export type Scheme = "dark" | "light";
export type Surface = "solid" | "glass";
export type FormFactor = "phone" | "largePhone" | "tablet" | "laptop" | "desktop" | "full";

/** The prefix an EXPO_BASE_URL build is mounted under; empty for a root-served export. */
export const BASE_PATH = (process.env.E2E_BASE_PATH ?? "").replace(/\/+$/, "");

/**
 * The largest opaque background on the page, as [r, g, b].
 *
 * The docs are react-native-web, so the DOM carries only generated `css-*` class
 * names: there is no `.dark` class and no data attribute to read the scheme off.
 * Reading what the app actually paints is the only honest answer. `body` is in the
 * scan for the one route that is not the RN app: the baked static page under
 * docs/public shadows /privacy and paints its background straight onto body.
 *
 * Runs in the page, so it must stay self-contained.
 */
function dominantBackground(): [number, number, number] | null {
  let bestArea = 0;
  let best: [number, number, number] | null = null;
  for (const el of Array.from(document.querySelectorAll("body, div"))) {
    const box = el.getBoundingClientRect();
    const area = box.width * box.height;
    if (area < 20000 || area <= bestArea) continue;
    const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(
      getComputedStyle(el).backgroundColor,
    );
    // Skip the translucent scrims and glass fills layered over the page: only an
    // opaque surface says which scheme is being painted.
    if (!m || (m[4] !== undefined && Number(m[4]) < 0.9)) continue;
    bestArea = area;
    best = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return best;
}

/** The scheme the page is currently painting, or null before it has painted at all. */
export async function readScheme(page: Page): Promise<Scheme | null> {
  const rgb = await page.evaluate(dominantBackground).catch(() => null);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? "dark" : "light";
}

export interface GotoOptions {
  scheme?: Scheme;
  /** Solid is the default here (glass frosts are GPU-nondeterministic). */
  surface?: Surface;
  /** Resize before navigating, so the app lays out once at the target width. */
  viewport?: { width: number; height: number };
}

/**
 * Open a docs route in a known look and wait until it is live and has painted in
 * that look.
 *
 * Every page is pre-rendered, so it paints (in the server's dark glass) before its
 * bundle has run; the app marks the document `data-hydrated` once React has taken
 * over (docs/src/ui/docs-head.tsx), and that is the moment a click means anything.
 * The seeded look is applied one commit after hydration, so the paint check comes
 * after the marker.
 *
 * `emulateMedia` matters for exactly one page: the baked static /privacy export
 * follows prefers-color-scheme, since it is plain HTML and never sees the seed.
 */
export async function gotoDocs(page: Page, route: string, options: GotoOptions = {}): Promise<void> {
  const scheme = options.scheme ?? "dark";
  const surface = options.surface ?? "solid";
  if (options.viewport) await page.setViewportSize(options.viewport);
  await page.emulateMedia({ colorScheme: scheme });
  const query = `scheme=${scheme}&surface=${surface}`;
  const separator = route.includes("?") ? "&" : "?";
  await page.goto(`${BASE_PATH}${route}${separator}${query}`, { waitUntil: "load" });
  // The baked /privacy page is plain HTML with no app root and nothing to hydrate.
  if ((await page.locator("#root").count()) > 0) {
    await page.locator("html[data-hydrated]").waitFor({ state: "attached", timeout: 20_000 });
  }
  await expect
    .poll(() => readScheme(page), {
      timeout: 20_000,
      message: `${route} never painted in ${scheme} (a missing font or a failed bundle both look like this)`,
    })
    .toBe(scheme);
}

/**
 * The Playground stage: the platform rows, the form-factor switcher and the code
 * block, plus the outlet an opened overlay portals into.
 *
 * Filtered by the preview card because docs/src/ui/dont.tsx stamps the same
 * data-preview-stage attribute on every Do/Don't frame, and only the Playground's
 * stage contains a preview card.
 */
export function stage(page: Page): Locator {
  return page.locator("[data-preview-stage]").filter({ has: page.locator("[data-preview-card]") });
}

/** The preview card: the three platform rows, without the switcher row or the code block. */
export function previewCard(page: Page): Locator {
  return page.locator("[data-preview-card]");
}

/** One platform's row inside the preview card. */
export function platformRow(page: Page, platform: "ios" | "android" | "web"): Locator {
  return page.locator(`[data-platform-row="${platform}"]`);
}

const FORM_FACTOR_LABEL: Record<FormFactor, string> = {
  phone: "Phone width (375px)",
  largePhone: "Large phone width (640px)",
  tablet: "Tablet width (768px)",
  laptop: "Laptop width (1024px)",
  desktop: "Desktop width (1280px)",
  full: "Full width",
};

/**
 * Click the docs' own form-factor switcher, which clamps the preview card AND pins
 * the kit's viewport bucket (BreakpointOverride) so components measure as they would
 * on that tier. Web-only, and absent when the page has a single example.
 */
export async function setFormFactor(page: Page, factor: FormFactor): Promise<void> {
  const group = page.getByRole("tablist", { name: "Preview form factor" });
  const tab = group.getByRole("tab", { name: FORM_FACTOR_LABEL[factor] });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/**
 * Read a measurement until it stops changing.
 *
 * Several components size themselves from a measurement of their own box, and an
 * overlay's container grows AFTER the overlay becomes visible, so a single sample
 * races the layout. Agreeing samples across `holdMs` is a wait on the settled state
 * rather than on a clock, and it is direction-agnostic: a value that is genuinely
 * wrong settles too, and fails on the real number.
 *
 * This is not a nicety. Sampling the page's overflow once produced a test that failed
 * under parallel workers and passed alone; sampling an overlay's stage height once
 * produced a screenshot baseline of a stage that had not finished opening. And two
 * samples 50 ms apart were not enough either: a pre-rendered page paints its static
 * markup, hydrates, and only then delivers the container measurements its grids and
 * charts lay out from, one animation frame after another, so on a loaded runner the
 * DashboardGrid's preview card read 900 px twice, was fitted, and stood at 1,801 px by
 * the capture. The value now has to hold for the whole window.
 */
export async function settled<T>(read: () => Promise<T>, timeoutMs = 5_000, holdMs = 250): Promise<T> {
  let previous = await read();
  let heldSince = Date.now();
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const current = await read();
    const now = Date.now();
    if (JSON.stringify(current) !== JSON.stringify(previous)) {
      previous = current;
      heldSince = now;
    } else if (now - heldSince >= holdMs) return current;
    if (now > deadline) return current;
  }
}

/**
 * Wait for `count` animation frames the browser really runs.
 *
 * The page's own requestAnimationFrame cannot promise that in the visual specs:
 * `page.clock` (they pin the date with it) replaces it with a timer that fires
 * whether or not a frame is drawn. An isolated world keeps the browser's own, so the
 * wait runs there, through the DevTools protocol, which makes it Chromium only (every
 * spec that waits on frames here runs in a Chromium project).
 *
 * Bounded: a browser that runs no frame for `timeoutMs` has a stalled frame pipeline,
 * and that fails here, by name, rather than as an anonymous test timeout further on.
 */
export async function animationFrames(page: Page, count: number, timeoutMs = 15_000): Promise<void> {
  const browser = page.context().browser()?.browserType().name();
  if (browser !== "chromium") throw new Error(`animationFrames needs Chromium's DevTools protocol, not ${browser}`);
  const session = await page.context().newCDPSession(page);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(
      `the browser ran fewer than ${count} animation frames in ${timeoutMs} ms: its frame pipeline has stalled`,
    )), timeoutMs);
  });
  try {
    await Promise.race([stalled, (async () => {
      const { frameTree } = await session.send("Page.getFrameTree");
      const { executionContextId } = await session.send("Page.createIsolatedWorld", {
        frameId: frameTree.frame.id,
        worldName: "e2e-animation-frames",
      });
      await session.send("Runtime.evaluate", {
        contextId: executionContextId,
        expression: `new Promise((resolve) => {
          let left = ${count};
          const tick = () => (--left > 0 ? requestAnimationFrame(tick) : resolve(true));
          requestAnimationFrame(tick);
        })`,
        awaitPromise: true,
      });
    })()]);
  } finally {
    clearTimeout(timer);
    // Not awaited: a stalled renderer may never acknowledge the detach.
    void session.detach().catch(() => {});
  }
}

/**
 * Let the frames already started go through Chromium's frame pipeline before a capture
 * starts one of its own.
 *
 * A capture that starts while a resize, a scroll or an opened overlay is still in that
 * pipeline can wedge it for good. On the CI runner, where the software compositor takes
 * about a second per frame of the glass pages' backdrop blurs, the material captures hung
 * in Page.captureScreenshot in 3 of about 26 Deploy runs and about 1 soak pass in 26, 8
 * times in 9 right after fitElementForScreenshot resized the viewport, with the renderer,
 * its compositor and the GPU process's compositor all asleep (e2e/support/hang-probe.ts,
 * the E2E soak workflow).
 *
 * Four real frames is what the renderer's scheduler needs to pass the change along:
 * main-frame-before-activation is off for renderers, so a main frame cannot start while
 * the previous commit waits to activate, and a commit activates only once the tree before
 * it was drawn, a draw that itself waits for the display compositor to accept the frame
 * before it. By the fourth frame the change committed in the first has been activated and
 * the frames before it handed to the display compositor. It is not proof that the display
 * has drawn the change (frames with nothing to commit move faster), so the E2E soak, not
 * this reasoning, is what judges it.
 */
export async function drainFramePipeline(page: Page): Promise<void> {
  await animationFrames(page, 4);
}

/**
 * The box of a locator, once it has stopped moving. Two animation frames pass
 * before the first sample: react-native-web reports a layout through a resize
 * observer on the frame after the commit, and a measured component re-renders from
 * it on the next, so a sample taken straight after hydration reads the pre-rendered
 * markup, not the laid-out component.
 */
export async function settledBox(locator: Locator): Promise<{ width: number; height: number }> {
  await animationFrames(locator.page(), 2);
  return settled(async () => {
    const box = await locator.boundingBox();
    return { width: Math.round(box?.width ?? -1), height: Math.round(box?.height ?? -1) };
  });
}

/**
 * Fit a preview card or opened stage inside the viewport before cropping it.
 *
 * Chromium captures an element taller than its viewport with captureBeyondViewport.
 * That can emit a temporary 1x1 visualViewport resize, which RNW treats as a real
 * responsive layout change. Grow only the viewport height from the measured element,
 * leaving enough room above and below for the docs' floating navigation bar.
 * Document-root Modal screenshots keep their configured viewport instead.
 *
 * It returns once the resize and the scroll have gone through the frame pipeline
 * (drainFramePipeline): a capture started earlier could wedge it on the CI runner.
 */
export async function fitElementForScreenshot(page: Page, frame: Locator): Promise<void> {
  const box = await settledBox(frame);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("An element screenshot requires a configured viewport");
  const bannerLocator = page.getByRole("banner").first();
  const banner = await bannerLocator.count() ? await bannerLocator.boundingBox() : null;
  const scrollLocator = page.locator("[data-page-scroll]").first();
  const scrollport = await scrollLocator.count() ? await scrollLocator.boundingBox() : null;
  // The phone bottom navigation floats OVER the scrollport (the iOS 26 capsule) and can
  // be taller than the overlaid banner, so measure it directly; the docked case, where
  // the scrollport stops above the bar, still counts through the height difference.
  // Account for both rather than assuming symmetry.
  const navigationLocator = page.getByRole("navigation", { name: "Primary", exact: true }).first();
  const navigation = await navigationLocator.count() ? await navigationLocator.boundingBox() : null;
  const chrome = Math.max(scrollport ? viewport.height - scrollport.height : 0, navigation?.height ?? 0);
  const inset = Math.ceil(Math.max(banner?.height ?? 0, chrome));
  const height = Math.max(viewport.height, box.height + 2 * inset);
  if (height !== viewport.height) await page.setViewportSize({ ...viewport, height });
  // A preceding element capture may leave the card just beneath a fixed banner.
  // Center explicitly, since scrollIntoViewIfNeeded ignores that occluding bar.
  await frame.evaluate((node) => node.scrollIntoView({ block: "center", inline: "nearest" }));
  if (scrollport && banner) {
    // Centering is relative to the nested scrollport, whose top can sit behind
    // the banner. Align against the measured exposed edge of that scrollport.
    await frame.evaluate((node, top) => {
      const scroller = node.closest<HTMLElement>("[data-page-scroll]");
      if (scroller) scroller.scrollTop += node.getBoundingClientRect().top - top;
    }, Math.max(scrollport.y, banner.y + banner.height));
  }
  const fitted = await settledBox(frame);
  expect(fitted.width, "the element exceeds the screenshot viewport width").toBeLessThanOrEqual(viewport.width);
  expect(fitted.height, "the element exceeds the screenshot viewport height").toBeLessThanOrEqual(height);
  await drainFramePipeline(page);
}
