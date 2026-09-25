/**
 * A record of the protocol events that decide which JavaScript worlds Playwright can
 * reach in a page, for the E2E soak.
 *
 * Opt-in: on only when E2E_PROTOCOL_EVENTS is "1" (the soak's `protocol_events` input).
 * While a test runs it keeps, from the browser's protocol, the execution contexts
 * created, destroyed and cleared, the navigations and page-ready events, and every
 * evaluation Playwright sends with whether and how it was answered; a failed test gets
 * them attached as protocol-events.txt.
 *
 * Why it exists: in Firefox, gotoDocs' paint check sometimes never gets an answer. The
 * hang probe showed the page itself alive (a screenshot and a query in Playwright's
 * utility world both answer) while even a NEW evaluation in the page's own world does
 * not, which leaves the question of whether Playwright lost the page world's execution
 * context or the browser dropped the call. Only the event order answers it.
 *
 * It reads Playwright's own protocol log through the `debug` instance Playwright logs
 * with (playwright-core's utilsBundle, resolved from the `playwright` package this suite
 * runs, so the same module), enables its `pw:protocol` channel and takes over the
 * output function, passing every other channel's lines to stderr as before. The
 * screencast frames a trace records are skipped unparsed.
 */
import { createRequire } from "node:module";
import type { TestInfo } from "@playwright/test";

interface Debug {
  (namespace: string): unknown;
  enable(namespaces: string): void;
  log: (...args: unknown[]) => void;
}

/** The protocol methods worth keeping: the worlds, and what moves a page between them. */
const EVENTS = new Set([
  "Runtime.executionContextCreated",
  "Runtime.executionContextDestroyed",
  "Runtime.executionContextsCleared",
  "Page.navigationStarted",
  "Page.navigationCommitted",
  "Page.navigationAborted",
  "Page.sameDocumentNavigation",
  "Page.ready",
  "Page.frameAttached",
  "Page.frameDetached",
  "Page.crashed",
]);
const CALLS = new Set(["Runtime.evaluate", "Runtime.callFunction"]);

const LINE = /(SEND ►|◀ RECV) (\{.*)$/;

class ProtocolRecorder {
  private lines: string[] = [];
  private started = Date.now();
  /** Sent evaluations awaiting an answer, by message id. */
  private calls = new Map<number, string>();

  constructor(debug: Debug) {
    const write = (...args: unknown[]) => process.stderr.write(`${args.map(String).join(" ")}\n`);
    const passOn = debug.log ?? write;
    debug.log = (...args: unknown[]) => {
      const text = String(args[0] ?? "");
      if (!text.includes("pw:protocol")) return passOn(...args);
      this.take(text);
    };
    debug.enable([process.env.DEBUG, "pw:protocol"].filter(Boolean).join(","));
  }

  /** Start a test's record. */
  reset(): void {
    this.lines = [];
    this.calls.clear();
    this.started = Date.now();
  }

  private note(entry: string): void {
    this.lines.push(`${String(Date.now() - this.started).padStart(6)} ms  ${entry}`);
  }

  private take(text: string): void {
    const match = LINE.exec(text);
    if (!match) return;
    const [, direction, json] = match;
    if (json.startsWith('{"method":"Page.screencastFrame"')) return;
    if (direction === "SEND ►") {
      // {"method":…,"params":{…,"executionContextId":…},"id":…,"sessionId":…}
      const method = /^\{"method":"([^"]+)"/.exec(json)?.[1];
      if (!method || !CALLS.has(method)) return;
      const tail = /"executionContextId":"([^"]+)"\},"id":(\d+)(?:,"sessionId":"([^"]{0,8})[^"]*")?\}$/.exec(json);
      if (!tail) return;
      const call = `${method} #${tail[2]} in ${tail[1]} (session ${tail[3] ?? "?"})`;
      this.calls.set(Number(tail[2]), call);
      this.note(`send ${call}`);
      return;
    }
    const answer = /^\{"id":(\d+)(,"error")?/.exec(json);
    if (answer) {
      const call = this.calls.get(Number(answer[1]));
      if (!call) return;
      this.calls.delete(Number(answer[1]));
      this.note(answer[2] ? `error ${call}: ${json.slice(0, 300)}` : `answer ${call}`);
      return;
    }
    const method = /^\{"method":"([^"]+)"/.exec(json)?.[1];
    if (!method || !EVENTS.has(method)) return;
    this.note(`recv ${json.length > 400 ? `${json.slice(0, 400)}...` : json}`);
  }

  /** Attach the test's record, with every evaluation still unanswered. */
  async attach(testInfo: TestInfo): Promise<void> {
    const pending = [...this.calls.values()].map((call) => `         never answered: ${call}`);
    await testInfo.attach("protocol-events.txt", { body: [...this.lines, ...pending].join("\n"), contentType: "text/plain" });
  }
}

let recorder: ProtocolRecorder | null | undefined;

/**
 * The worker's recorder, or null when the soak did not ask for one. Created once per
 * worker process; the tests in a worker run one at a time, so one record serves.
 */
export function protocolRecorder(): ProtocolRecorder | null {
  if (recorder !== undefined) return recorder;
  if (process.env.E2E_PROTOCOL_EVENTS !== "1") return (recorder = null);
  const fromPlaywright = createRequire(require.resolve("playwright/package.json"));
  const { debug } = fromPlaywright("playwright-core/lib/utilsBundle") as { debug: Debug };
  return (recorder = new ProtocolRecorder(debug));
}
