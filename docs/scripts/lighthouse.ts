#!/usr/bin/env bun
/**
 * Score the docs the way the deployment is scored: `bun run lighthouse` exports the
 * web app, serves the artifact as Cloudflare Pages would (gzip, clean URLs, the
 * `_headers` policy, including the strict CSP), and runs Lighthouse against it in
 * both form factors. The Metro dev server is deliberately NOT a target: it serves an
 * unminified bundle with the HMR client attached and scores in the 30s no matter what
 * the source does, which is a number about Metro, not about the site.
 *
 * Usage:
 *   bun run lighthouse                          # export, then score the default routes
 *   bun run lighthouse --skip-build             # reuse docs/dist from the last export
 *   bun run lighthouse --routes /,/components   # a comma-separated route list
 *   bun run lighthouse --mobile | --desktop     # one form factor instead of both
 *   bun run lighthouse --url https://canvas.nannier.com   # score a deployment instead
 *
 * Every run writes the JSON and HTML reports to docs/.lighthouse/ (ignored by git); the
 * HTML report is the thing to open when a number moves and the table does not say why.
 * Lighthouse's mobile pass simulates a slow 4G link and a 4x slower CPU, which is why
 * the mobile score is the one worth chasing: it is what PageSpeed Insights reports.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "../../e2e/support/static-server";

const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(DOCS, "dist");
const OUT = join(DOCS, ".lighthouse");
const DEFAULT_ROUTES = ["/", "/components/button-group", "/components/data-table"];

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return undefined;
  const next = argv[at + 1];
  return next && !next.startsWith("--") ? next : "";
};
const has = (name: string) => argv.includes(`--${name}`);

type FormFactor = "mobile" | "desktop";
const formFactors: FormFactor[] = has("mobile") && !has("desktop") ? ["mobile"] : has("desktop") && !has("mobile") ? ["desktop"] : ["mobile", "desktop"];
const routes = (flag("routes") ?? DEFAULT_ROUTES.join(",")).split(",").map((r) => r.trim()).filter(Boolean);
const external = flag("url")?.replace(/\/+$/, "");

interface Metric {
  displayValue: string;
  score: number;
}
interface Row {
  route: string;
  formFactor: FormFactor;
  scores: Record<string, number>;
  metrics: Record<string, Metric>;
  savings: string[];
  report: string;
}

// The category weights that make up the performance score, so the table can name what
// to chase: LCP and TBT together carry 55 of the 100 points.
const METRICS = [
  ["first-contentful-paint", "FCP"],
  ["largest-contentful-paint", "LCP"],
  ["total-blocking-time", "TBT"],
  ["cumulative-layout-shift", "CLS"],
  ["speed-index", "SI"],
] as const;

function exportWeb(): void {
  console.log("Exporting the web docs (bun run build:web)...");
  const result = spawnSync("bun", ["run", "build:web"], { cwd: DOCS, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`build:web failed with status ${result.status}`);
}

async function runLighthouse(url: string, formFactor: FormFactor, slug: string): Promise<Row> {
  mkdirSync(OUT, { recursive: true });
  const base = join(OUT, `${slug}-${formFactor}`);
  const args = [
    url,
    "--output=json",
    "--output=html",
    `--output-path=${base}`,
    "--quiet",
    "--chrome-flags=--headless=new --no-sandbox",
    ...(formFactor === "desktop" ? ["--preset=desktop"] : []),
  ];
  await new Promise<void>((ok, fail) => {
    const child = spawn(join(DOCS, "node_modules", ".bin", "lighthouse"), args, { cwd: DOCS, stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", fail);
    child.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`lighthouse exited with ${code} for ${url} (${formFactor})`))));
  });
  const report = JSON.parse(readFileSync(`${base}.report.json`, "utf8"));
  const scores: Record<string, number> = {};
  for (const category of Object.values(report.categories) as Array<{ id: string; score: number | null }>) {
    scores[category.id] = Math.round((category.score ?? 0) * 100);
  }
  const metrics: Record<string, Metric> = {};
  for (const [id, label] of METRICS) {
    const audit = report.audits[id];
    if (audit) metrics[label] = { displayValue: audit.displayValue ?? "", score: Math.round((audit.score ?? 0) * 100) };
  }
  // The audits that estimate savings, largest first: what would move the needle.
  const savings = (Object.values(report.audits) as Array<{ id: string; details?: { overallSavingsMs?: number; overallSavingsBytes?: number } }>)
    .map((audit) => ({ id: audit.id, ms: audit.details?.overallSavingsMs ?? 0, bytes: audit.details?.overallSavingsBytes ?? 0 }))
    .filter((s) => s.ms >= 100 || s.bytes >= 50 * 1024)
    .sort((a, b) => b.ms - a.ms || b.bytes - a.bytes)
    .slice(0, 5)
    .map((s) => `${s.id}${s.ms ? ` ~${Math.round(s.ms)}ms` : ""}${s.bytes ? ` ~${Math.round(s.bytes / 1024)}KB` : ""}`);
  return { route: url, formFactor, scores, metrics, savings, report: `${base}.report.html` };
}

function print(rows: Row[]): void {
  const cell = (s: string, width: number) => s.padEnd(width);
  const header = ["route", "form", "perf", "a11y", "bp", "seo", ...METRICS.map(([, l]) => l)];
  const widths = [40, 8, 5, 5, 4, 4, 14, 14, 14, 14, 14];
  console.log("");
  console.log(header.map((h, i) => cell(h, widths[i])).join(" "));
  for (const row of rows) {
    const values = [
      row.route.replace(/^https?:\/\/[^/]+/, "") || "/",
      row.formFactor,
      String(row.scores.performance ?? "-"),
      String(row.scores.accessibility ?? "-"),
      String(row.scores["best-practices"] ?? "-"),
      String(row.scores.seo ?? "-"),
      ...METRICS.map(([, l]) => (row.metrics[l] ? `${row.metrics[l].displayValue} (${row.metrics[l].score})` : "-")),
    ];
    console.log(values.map((v, i) => cell(v, widths[i])).join(" "));
    if (row.savings.length) console.log(`  savings: ${row.savings.join(", ")}`);
    console.log(`  report:  ${row.report}`);
  }
  console.log("");
}

async function main() {
  let origin = external;
  let close: (() => Promise<void>) | undefined;
  if (!origin) {
    if (!has("skip-build")) exportWeb();
    if (!existsSync(join(DIST, "index.html"))) throw new Error(`No export under ${DIST}; drop --skip-build or run bun run build:web first`);
    const server = await startStaticServer({ root: DIST, headers: true, spa: true });
    origin = server.url;
    close = server.close;
    console.log(`Serving ${DIST} at ${origin} with the _headers policy applied`);
  }
  const rows: Row[] = [];
  try {
    for (const route of routes) {
      const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/[^\w-]+/g, "_");
      for (const formFactor of formFactors) {
        console.log(`Lighthouse ${formFactor}: ${origin}${route}`);
        rows.push(await runLighthouse(`${origin}${route}`, formFactor, slug));
      }
    }
  } finally {
    await close?.();
  }
  print(rows);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
