/**
 * The `test` every spec imports.
 *
 * Two automatic fixtures wrap every test in every project:
 *
 *   errors    Fails the test if the page logged a console error, threw, violated the
 *             Content-Security-Policy, or failed to load a same-origin asset. This is
 *             the whole reason the suite is worth running at all on most routes: a
 *             react-native-web screen that throws in an effect still paints, so
 *             "it rendered" proves very little on its own. On the export it cannot
 *             catch an attribute that hydrated with the wrong value: production React
 *             logs nothing for one. e2e/behavior/hydration-ids.e2e.ts checks those.
 *   registry  Stubs the npm registry. docs/src/ui/use-latest-version.ts re-fetches
 *             the published version EVERY time a screen gains focus, so leaving it
 *             live would make every test depend on the network and on npm's latency.
 *
 * Both are `auto`, so a spec gets them without naming them.
 */
import { test as base, expect, type Page } from "@playwright/test";

export interface PageProblems {
  consoleErrors: string[];
  pageErrors: string[];
  cspViolations: string[];
  badResponses: string[];
  failedRequests: string[];
  /**
   * Set by a test that navigates to a route which does not exist. The export is
   * static, so a miss is a real 404 document (Pages serves 404.html with that status)
   * carrying the not-found page: the gate then requires that status instead of
   * refusing it, so a server that quietly answered 200 would fail the test too.
   */
  expectNotFound: boolean;
  /** The status of the last document (navigation) response, for the gate above. */
  documentStatus: number | null;
}

/**
 * Requests the browser aborts on purpose. A navigation that supersedes an in-flight
 * fetch cancels it, and that is not a defect.
 */
const BENIGN_FAILURES = /net::ERR_ABORTED/;

async function watchForProblems(page: Page): Promise<PageProblems> {
  const problems: PageProblems = {
    consoleErrors: [],
    pageErrors: [],
    cspViolations: [],
    badResponses: [],
    failedRequests: [],
    expectNotFound: false,
    documentStatus: null,
  };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Chrome logs the 404 of an expected not-found document as a console error too.
    if (problems.expectNotFound && /status of 404/.test(message.text())) return;
    problems.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    problems.pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    // Same-origin only: a third-party URL an example links to is not this app's
    // problem. Matching on the page's own origin rather than on a hard-coded
    // 127.0.0.1 is what keeps the gate armed when E2E_BASE_URL points the suite at a
    // running Metro on localhost, which is the documented way to run it locally.
    const origin = new URL(page.url() === "about:blank" ? response.url() : page.url()).origin;
    const isDocument = response.request().isNavigationRequest() && response.request().resourceType() === "document";
    if (isDocument) problems.documentStatus = response.status();
    if (isDocument && response.status() === 404 && problems.expectNotFound) return;
    if (response.status() >= 400 && response.url().startsWith(origin)) {
      problems.badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (BENIGN_FAILURES.test(failure)) return;
    problems.failedRequests.push(`${failure} ${request.url()}`);
  });

  // The docs ship `require-trusted-types-for 'script'` and a strict script-src, and
  // the static server replays that policy, so a Trusted Types sink on an import path
  // (the failure that once served the whole site blank) surfaces here as an event.
  await page.exposeFunction("__e2eReportCspViolation", (detail: string) => {
    problems.cspViolations.push(detail);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = event as SecurityPolicyViolationEvent;
      const reporter = (window as unknown as Record<string, unknown>).__e2eReportCspViolation;
      if (typeof reporter === "function") {
        (reporter as (detail: string) => void)(
          `${report.violatedDirective} blocked ${report.blockedURI || "(inline)"}`,
        );
      }
    });
  });

  return problems;
}

function describe(problems: PageProblems): string[] {
  const lines: string[] = [];
  const add = (label: string, items: string[]) => {
    for (const item of items) lines.push(`${label}: ${item}`);
  };
  add("page error", problems.pageErrors);
  add("console error", problems.consoleErrors);
  add("CSP violation", problems.cspViolations);
  add("response", problems.badResponses);
  add("request failed", problems.failedRequests);
  return lines;
}

export const test = base.extend<{ problems: PageProblems; registry: void }>({
  registry: [
    async ({ page }, use) => {
      await page.route("https://registry.npmjs.org/**", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ version: "0.0.0-e2e" }),
        }),
      );
      await use();
    },
    { auto: true },
  ],

  problems: [
    async ({ page }, use, testInfo) => {
      const problems = await watchForProblems(page);
      await use(problems);
      // Only gate a test that was otherwise passing: on a test that already failed,
      // these are usually consequences of the real failure and would bury it.
      if (testInfo.status !== testInfo.expectedStatus) return;
      const lines = describe(problems);
      expect(lines, `the page reported ${lines.length} problem(s):\n  ${lines.join("\n  ")}`).toEqual([]);
      if (problems.expectNotFound) {
        expect(problems.documentStatus, "an unknown route must be a real 404, not a 200 with the not-found page in it").toBe(404);
      }
    },
    { auto: true },
  ],
});

export { expect };
