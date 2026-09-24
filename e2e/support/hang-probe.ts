/**
 * A record of what the browser was doing while a test hung.
 *
 * Opt-in: the probe is armed only when E2E_HANG_PROBE_MS is set (the soak workflow,
 * .github/workflows/e2e-soak.yml, sets it). A test still running that many
 * milliseconds after it started is almost certainly stuck, so the probe samples the
 * page's rendering state over the DevTools protocol, beside whatever call is stuck,
 * and attaches it to the test:
 *
 *   - the document's visibility, focus and viewport sizes, and Chromium's layout
 *     metrics for the page;
 *   - whether the renderer still runs animation frames. The page's own
 *     requestAnimationFrame cannot answer that: `page.clock` replaces it with a timer
 *     that fires with or without a frame. An isolated world keeps the real one;
 *   - every browser process's CPU time across the sample, which tells a process
 *     spinning in a loop from one waiting on another;
 *   - a Chromium trace of the compositor (cc, viz, gpu, the main-thread scheduler)
 *     over the same window, which shows which stage of the frame pipeline stopped.
 *
 * Why it exists: the glass material captures once hung in Chromium's
 * Page.captureScreenshot on the CI runner only, a few runs in thirty, and a Playwright
 * trace shows the call that never returned but not the renderer behind it.
 *
 * Chromium only. The probe reads, it never changes the page, and every step is
 * bounded so a probe of a wedged browser still finishes and attaches what it got.
 */
import type { CDPSession, Page, TestInfo } from "@playwright/test";

/** How long the probe watches the stuck page: long enough for several frames. */
const SAMPLE_MS = 3_000;

/** The trace categories that show the frame pipeline, from input to presentation. */
const TRACE_CATEGORIES = [
  "cc",
  "viz",
  "gpu",
  "benchmark",
  "toplevel",
  "renderer.scheduler",
  "disabled-by-default-cc.debug.scheduler",
  "disabled-by-default-cc.debug.scheduler.frames",
  "disabled-by-default-devtools.timeline.frame",
];

/** The probe delay from the environment, or null when the probe is off. */
export function hangProbeDelay(): number | null {
  const raw = process.env.E2E_HANG_PROBE_MS;
  if (!raw) return null;
  const delay = Number(raw);
  if (!Number.isFinite(delay) || delay <= 0) {
    throw new Error(`E2E_HANG_PROBE_MS must be a positive number of milliseconds, not "${raw}"`);
  }
  return delay;
}

/** Settle `promise`, or report that it did not within `ms`. */
async function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T | { timedOut: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<{ timedOut: string }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: `${what} did not answer within ${ms} ms` }), ms);
  });
  try {
    return await Promise.race([promise, late]);
  } finally {
    clearTimeout(timer);
  }
}

async function processCpu(browserSession: CDPSession) {
  const { processInfo } = await browserSession.send("SystemInfo.getProcessInfo");
  return new Map(processInfo.map((p) => [p.id, { type: p.type, cpuTime: p.cpuTime }]));
}

/** Whether two real animation frames run, from a world whose rAF `page.clock` never replaced. */
async function realFrames(session: CDPSession): Promise<string> {
  const { frameTree } = await session.send("Page.getFrameTree");
  const { executionContextId } = await session.send("Page.createIsolatedWorld", {
    frameId: frameTree.frame.id,
    worldName: "e2e-hang-probe",
  });
  const started = Date.now();
  const frames = await within(
    session.send("Runtime.evaluate", {
      contextId: executionContextId,
      expression: "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))",
      awaitPromise: true,
      returnByValue: true,
    }),
    SAMPLE_MS,
    "two real animation frames",
  );
  return "timedOut" in frames ? frames.timedOut : `two real animation frames ran in ${Date.now() - started} ms`;
}

async function documentState(session: CDPSession) {
  const { result } = await session.send("Runtime.evaluate", {
    expression: `({
      visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(),
      inner: [innerWidth, innerHeight],
      visualViewport: visualViewport ? [visualViewport.width, visualViewport.height, visualViewport.scale] : null,
      devicePixelRatio,
    })`,
    returnByValue: true,
  });
  return result.value as unknown;
}

/** Record the compositor for the sample window and return the trace as text. */
async function traceCompositor(browserSession: CDPSession, during: Promise<unknown>): Promise<string> {
  await browserSession.send("Tracing.start", {
    traceConfig: { includedCategories: TRACE_CATEGORIES, recordMode: "recordUntilFull" },
    transferMode: "ReturnAsStream",
  });
  await during;
  const complete = new Promise<string>((resolve) => {
    browserSession.once("Tracing.tracingComplete", (event) => resolve(event.stream ?? ""));
  });
  await browserSession.send("Tracing.end");
  const handle = await complete;
  if (!handle) return "";
  const chunks: string[] = [];
  for (;;) {
    const chunk = await browserSession.send("IO.read", { handle });
    chunks.push(chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data);
    if (chunk.eof) break;
  }
  await browserSession.send("IO.close", { handle });
  return chunks.join("");
}

/**
 * Sample the stuck page and attach what was found. Never throws: a failure to probe
 * is itself recorded, since a browser too wedged to answer is a finding too.
 */
export async function probeHang(page: Page, testInfo: TestInfo, afterMs: number): Promise<void> {
  const findings: Record<string, unknown> = { probedAfterMs: afterMs };
  let trace = "";
  let session: CDPSession | undefined;
  let browserSession: CDPSession | undefined;
  try {
    session = await page.context().newCDPSession(page);
    const browser = page.context().browser();
    if (browser) browserSession = await browser.newBrowserCDPSession();

    findings.document = await within(documentState(session), SAMPLE_MS, "the document state");
    findings.layoutMetrics = await within(session.send("Page.getLayoutMetrics"), SAMPLE_MS, "Page.getLayoutMetrics");

    const cpuBefore = browserSession ? await processCpu(browserSession) : null;
    const frames = within(realFrames(session), SAMPLE_MS * 2, "the animation frame check");
    const window = Promise.all([frames, new Promise((resolve) => setTimeout(resolve, SAMPLE_MS))]);
    if (browserSession) {
      const traced = await within(traceCompositor(browserSession, window), SAMPLE_MS * 3, "the compositor trace");
      if (typeof traced === "string") trace = traced;
      else findings.traceError = traced.timedOut;
    } else {
      await window;
    }
    const framesResult = await frames;
    findings.animationFrames = typeof framesResult === "string" ? framesResult : framesResult.timedOut;

    if (browserSession && cpuBefore) {
      const cpuAfter = await processCpu(browserSession);
      findings.cpuSecondsDuringSample = [...cpuAfter].map(([id, after]) => ({
        id,
        type: after.type,
        cpuSeconds: Number((after.cpuTime - (cpuBefore.get(id)?.cpuTime ?? 0)).toFixed(3)),
      }));
    }
  } catch (error) {
    findings.probeError = error instanceof Error ? error.message : String(error);
  } finally {
    await session?.detach().catch(() => {});
    await browserSession?.detach().catch(() => {});
  }
  await testInfo.attach("hang-probe.json", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
  if (trace) await testInfo.attach("hang-probe-trace.json", { body: trace, contentType: "application/json" });
}
