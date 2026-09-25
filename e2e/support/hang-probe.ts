/**
 * A record of what the browser was doing while a test hung.
 *
 * Opt-in: the probe is armed only when E2E_HANG_PROBE_MS is set (the soak workflow,
 * .github/workflows/e2e-soak.yml, sets it). A test still running that many
 * milliseconds after it started is almost certainly stuck, so the probe samples the
 * browser beside whatever call is stuck and attaches what it found to the test:
 *
 *   - every browser process's CPU time across a quiet window, and on Linux each
 *     renderer and GPU thread's name, scheduler state, kernel wait channel and CPU
 *     ticks across the same window, which tells a thread spinning in a loop from one
 *     blocked on another;
 *   - the JavaScript stack, if the page's main thread is running script: the
 *     debugger's pause interrupts a running script, where an ordinary evaluation
 *     waits behind it;
 *   - the document's visibility, focus and viewport sizes;
 *   - whether the renderer still runs animation frames. The page's own
 *     requestAnimationFrame cannot answer that: `page.clock` replaces it with a timer
 *     that fires with or without a frame. An isolated world keeps the real one;
 *   - a Chromium trace of the compositor (cc, viz, gpu, the main-thread scheduler).
 *
 * Why it exists: the glass material captures hung in Chromium's Page.captureScreenshot
 * on the CI runner only, a few runs in thirty, and a Playwright trace shows the call
 * that never returned but not the renderer behind it. This probe showed every process
 * asleep with no frames, which led to the cause and the fix (CHROMIUM_ARGS in
 * playwright.config.ts).
 *
 * Firefox and WebKit have no DevTools protocol here, so they get what Playwright itself
 * can ask: on Linux what each of their processes' threads did across the same window,
 * whether a NEW evaluation in the page's own world answers and whether one in
 * Playwright's utility world does, the document's loading and font state, and whether a
 * screenshot comes back. A stuck call beside a page that still answers a new one was
 * lost on its way, not held up by the page.
 *
 * Every step is bounded and records its own outcome, the passive samples come first,
 * and nothing waits on the stuck renderer to let go of a session, so a probe of a
 * wedged browser still finishes and attaches what it got.
 */
import fs from "node:fs";
import type { CDPSession, Page, TestInfo } from "@playwright/test";
import { animationFrames } from "./docs";

/** How long a single protocol call may take before the probe records it as stuck. */
const STEP_MS = 3_000;

/** The quiet window the CPU and thread samples span. */
const WINDOW_MS = 2_000;

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
  // setTimeout holds at most 2^31 - 1 ms and fires at once for anything longer.
  if (!Number.isInteger(delay) || delay <= 0 || delay > 2 ** 31 - 1) {
    throw new Error(`E2E_HANG_PROBE_MS must be a whole number of milliseconds a timer can hold, not "${raw}"`);
  }
  return delay;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Settle `work`, or report in words that it did not within `ms`, or how it failed. */
async function bounded<T>(work: () => Promise<T>, ms: number, what: string): Promise<T | string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<string>((resolve) => {
    timer = setTimeout(() => resolve(`${what}: no answer within ${ms} ms`), ms);
  });
  try {
    return await Promise.race([work(), late]);
  } catch (error) {
    return `${what}: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    clearTimeout(timer);
  }
}

interface ProcessSample {
  id: number;
  type: string;
  cpuTime: number;
}

/** One line of /proc/<pid>/task/<tid>/stat, reduced to what tells spinning from waiting. */
interface ThreadSample {
  tid: string;
  name: string;
  state: string;
  wchan: string;
  ticks: number;
}

function readThreads(pid: number): ThreadSample[] {
  const task = `/proc/${pid}/task`;
  let tids: string[];
  try {
    tids = fs.readdirSync(task);
  } catch {
    // The process exited: the probe samples every browser on the machine, and other
    // workers' content processes come and go with their contexts.
    return [];
  }
  return tids.flatMap((tid) => {
    try {
      const stat = fs.readFileSync(`${task}/${tid}/stat`, "utf8");
      // The command name is parenthesized and may hold spaces; the fields after it
      // are space separated: state is the first, utime and stime the 12th and 13th.
      const close = stat.lastIndexOf(")");
      const name = stat.slice(stat.indexOf("(") + 1, close);
      const fields = stat.slice(close + 2).split(" ");
      const wchan = fs.readFileSync(`${task}/${tid}/wchan`, "utf8").trim();
      return [{ tid, name, state: fields[0] ?? "?", wchan, ticks: Number(fields[11]) + Number(fields[12]) }];
    } catch {
      return [];
    }
  });
}

/** The threads of `pids` across the window: what each did, busiest first. */
function threadActivity(before: Map<number, ThreadSample[]>, after: Map<number, ThreadSample[]>) {
  return [...after].map(([pid, threads]) => {
    const earlier = new Map((before.get(pid) ?? []).map((t) => [t.tid, t]));
    return {
      pid,
      threads: threads
        .map((t) => ({ name: t.name, state: t.state, wchan: t.wchan, ticks: t.ticks - (earlier.get(t.tid)?.ticks ?? t.ticks) }))
        .sort((a, b) => b.ticks - a.ticks),
    };
  });
}

/**
 * The Firefox and WebKit processes on this machine, by the kernel's (15 character)
 * command names: Gecko's parent and content processes, and WebKit's MiniBrowser with
 * its web and network processes in both Linux builds Playwright ships (WPE, which it
 * runs headless, and GTK). A soak lane runs a browser per worker, so these are all of
 * them, not just the stuck test's: a content process spinning or blocked still stands
 * out.
 */
const ENGINE_PROCESS = /^(firefox|GeckoMain|Isolated Web Co|Web Content|MiniBrowser|WPEWebProcess|WPENetworkProc|WebKitWebProces|WebKitNetworkPr)/;

function engineProcesses(): { pid: number; name: string }[] {
  return fs.readdirSync("/proc").filter((entry) => /^\d+$/.test(entry)).flatMap((entry) => {
    try {
      const name = fs.readFileSync(`/proc/${entry}/comm`, "utf8").trim();
      return ENGINE_PROCESS.test(name) ? [{ pid: Number(entry), name }] : [];
    } catch {
      return [];
    }
  });
}

/** What Playwright can ask a stuck Firefox or WebKit page without a DevTools protocol. */
async function probeOtherEngine(page: Page): Promise<Record<string, unknown>> {
  const findings: Record<string, unknown> = {};
  // Passive first, as for Chromium.
  if (process.platform === "linux") {
    const processes = engineProcesses();
    const before = new Map(processes.map(({ pid }) => [pid, readThreads(pid)]));
    await sleep(WINDOW_MS);
    const after = new Map(processes.map(({ pid }) => [pid, readThreads(pid)]));
    const names = new Map(processes.map(({ pid, name }) => [pid, name]));
    findings.threads = threadActivity(before, after).map(({ pid, threads }) => ({
      pid,
      process: names.get(pid),
      busiest: threads.slice(0, 8),
    }));
  }
  findings.utilityWorld = await bounded(async () => {
    const hydrated = await page.locator("html").getAttribute("data-hydrated", { timeout: STEP_MS });
    return `answered: data-hydrated ${hydrated === null ? "absent" : "present"}`;
  }, STEP_MS * 2, "utility-world query");
  findings.mainWorld = await bounded(() => page.evaluate(() => ({
    readyState: document.readyState,
    visibilityState: document.visibilityState,
    hasFocus: document.hasFocus(),
    fontsStatus: document.fonts.status,
    fontFaces: document.fonts.size,
    fontFaceRules: Array.from(document.styleSheets).reduce((count, sheet) => {
      try {
        return count + Array.from(sheet.cssRules).filter((rule) => rule instanceof CSSFontFaceRule).length;
      } catch {
        return count;
      }
    }, 0),
    msSinceNavigation: Math.round(performance.now()),
  })), STEP_MS, "main-world evaluation");
  findings.screenshot = await bounded(async () => `${(await page.screenshot({ timeout: STEP_MS })).length} bytes`, STEP_MS * 2, "screenshot");
  return findings;
}

/** The JavaScript stack of the page's main thread, if it is running script. */
async function scriptStack(session: CDPSession) {
  const enabled = await bounded(() => session.send("Debugger.enable"), STEP_MS, "Debugger.enable");
  if (typeof enabled === "string") return enabled;
  const paused = new Promise<{ reason: string; frames: string[] }>((resolve) => {
    session.once("Debugger.paused", (event) => {
      resolve({
        reason: event.reason,
        frames: event.callFrames.slice(0, 40).map((f) =>
          `${f.functionName || "(anonymous)"} ${f.url}:${f.location.lineNumber + 1}:${(f.location.columnNumber ?? 0) + 1}`),
      });
    });
  });
  try {
    const pause = await bounded(() => session.send("Debugger.pause"), STEP_MS, "Debugger.pause");
    if (typeof pause === "string") return pause;
    // No pause within the step means no script is running: the main thread is idle
    // or blocked outside JavaScript.
    return await bounded(() => paused, STEP_MS, "Debugger.paused (no script running)");
  } finally {
    // Always cancel: a pause still pending would stop the page at its next statement.
    void session.send("Debugger.resume").catch(() => {});
    void session.send("Debugger.disable").catch(() => {});
  }
}

/** Whether two real animation frames run (animationFrames uses a world `page.clock` never touched). */
async function realFrames(page: Page): Promise<string> {
  const started = Date.now();
  await animationFrames(page, 2, STEP_MS);
  return `two real animation frames ran in ${Date.now() - started} ms`;
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

/** Record the compositor for a window and return the trace as text. */
async function traceCompositor(browserSession: CDPSession): Promise<string> {
  await browserSession.send("Tracing.start", {
    traceConfig: { includedCategories: TRACE_CATEGORIES, recordMode: "recordUntilFull" },
    transferMode: "ReturnAsStream",
  });
  await sleep(WINDOW_MS);
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
 * Sample the stuck browser and attach what was found. Never throws: a step that fails
 * or does not answer is recorded as such, since a renderer too wedged to answer is a
 * finding too.
 */
export async function probeHang(page: Page, testInfo: TestInfo, afterMs: number, browserName: string): Promise<void> {
  if (browserName !== "chromium") {
    const findings = { probedAfterMs: afterMs, browserName, ...(await probeOtherEngine(page)) };
    await testInfo.attach("hang-probe.json", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
    return;
  }
  const findings: Record<string, unknown> = { probedAfterMs: afterMs };
  let trace = "";

  const browser = page.context().browser();
  const browserSession = browser
    ? await bounded(() => browser.newBrowserCDPSession(), STEP_MS, "browser session")
    : "no browser";
  const session = await bounded(() => page.context().newCDPSession(page), STEP_MS, "page session");

  // Passive first: nothing here asks the renderer for anything.
  if (typeof browserSession !== "string") {
    const processes = async () => (await browserSession.send("SystemInfo.getProcessInfo")).processInfo as ProcessSample[];
    const before = await bounded(processes, STEP_MS, "SystemInfo.getProcessInfo");
    const watched = typeof before === "string" ? [] : before.filter((p) => p.type === "renderer" || p.type === "GPU");
    const threadsBefore = new Map(watched.map((p) => [p.id, readThreads(p.id)]));
    await sleep(WINDOW_MS);
    const threadsAfter = new Map(watched.map((p) => [p.id, readThreads(p.id)]));
    const after = await bounded(processes, STEP_MS, "SystemInfo.getProcessInfo");
    if (typeof before === "string" || typeof after === "string") {
      findings.processes = typeof before === "string" ? before : after;
    } else {
      const cpuBefore = new Map(before.map((p) => [p.id, p.cpuTime]));
      findings.processes = after.map((p) => ({
        id: p.id,
        type: p.type,
        cpuSecondsInWindow: Number((p.cpuTime - (cpuBefore.get(p.id) ?? p.cpuTime)).toFixed(3)),
      }));
    }
    if (process.platform === "linux") findings.threads = threadActivity(threadsBefore, threadsAfter);
  } else {
    findings.processes = browserSession;
  }

  if (typeof session !== "string") {
    findings.scriptStack = await bounded(() => scriptStack(session), STEP_MS * 3, "script stack");
    findings.document = await bounded(() => documentState(session), STEP_MS, "document state");
    findings.animationFrames = await bounded(() => realFrames(page), STEP_MS * 2, "animation frames");
  } else {
    findings.pageSession = session;
  }

  if (typeof browserSession !== "string") {
    const traced = await bounded(() => traceCompositor(browserSession), STEP_MS * 4, "compositor trace");
    if (traced.startsWith("{") || traced.startsWith("[")) trace = traced;
    else findings.trace = traced || "empty";
  }

  // Let go of the sessions without waiting on them: a wedged renderer may never
  // acknowledge the detach.
  if (typeof session !== "string") void session.detach().catch(() => {});
  if (typeof browserSession !== "string") void browserSession.detach().catch(() => {});

  await testInfo.attach("hang-probe.json", { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
  if (trace) await testInfo.attach("hang-probe-trace.json", { body: trace, contentType: "application/json" });
}
