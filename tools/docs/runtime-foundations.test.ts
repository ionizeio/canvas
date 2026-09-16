import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const { readBuildInfo, sourceFingerprint } = require("../../docs/scripts/build-info.cjs");
const appConfig = require("../../docs/app.config.js");
const temporary: string[] = [];
afterEach(() => { for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true }); });

test("runtime identity changes with source bytes and preserves candidate versus source revisions", () => {
  const root = mkdtempSync(join(tmpdir(), "canvas-build-info-"));
  temporary.push(root);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@ionizeio/canvas", version: "2.62.1" }));
  writeFileSync(join(root, "src/index.ts"), "export const value = 1;");
  const inspect = () => ({ revision: "b".repeat(40), dirty: true });
  const first = readBuildInfo(root, { SOURCE_SHA: "a".repeat(40) }, inspect);
  expect(first.sourceRevision).toBe("a".repeat(40));
  expect(first.candidateRevision).toBe("b".repeat(40));
  expect(first.sourceDirty).toBe(true);
  expect(first.packageVersion).toBe("2.62.1");
  expect(first.inputMode).toBe("source");
  expect(sourceFingerprint(root)).toBe(first.sourceFingerprint);
  writeFileSync(join(root, "src/index.ts"), "export const value = 2;");
  expect(sourceFingerprint(root)).not.toBe(first.sourceFingerprint);
  const beforeFixture = sourceFingerprint(root);
  mkdirSync(join(root, "examples/starter/smoke/fixtures"), { recursive: true });
  writeFileSync(join(root, "examples/starter/smoke/fixtures/control-refs.tsx"), "export const fixture = 'shared';");
  expect(sourceFingerprint(root)).not.toBe(beforeFixture);
  expect(() => readBuildInfo(root, { SOURCE_SHA: "not-a-revision" }, inspect)).toThrow("Invalid source revision");
});

test("every docs testing route belongs to a declared native tab stack", () => {
  const root = resolve(import.meta.dir, "../..");
  const app = join(root, "docs/src/app");
  const nav = JSON.parse(readFileSync(join(root, "docs/src/data/nav.config.json"), "utf8"));
  const groups = new Set(nav.mobile.tabs.map((tab: { id: string }) => `(${tab.id})`));
  const fixtures = readdirSync(app, { recursive: true }).map(String).filter((name) => /(?:^|\/)testing\/.*\.tsx$/.test(name));
  expect(fixtures.length).toBeGreaterThanOrEqual(4);
  for (const fixture of fixtures) expect(groups.has(fixture.split("/")[0])).toBe(true);
});

test("build diagnostics preserve existing app configuration and subpath exports", () => {
  const previous = process.env.EXPO_BASE_URL;
  try {
    process.env.EXPO_BASE_URL = "/canvas";
    const actual = appConfig({ config: { name: "Canvas", experiments: { typedRoutes: true }, extra: { example: "retained" } } });
    expect(actual.name).toBe("Canvas");
    expect(actual.experiments).toEqual({ typedRoutes: true, baseUrl: "/canvas" });
    expect(actual.extra.example).toBe("retained");
    expect(actual.extra.canvasBuild.inputMode).toBe("source");
  } finally {
    if (previous === undefined) delete process.env.EXPO_BASE_URL;
    else process.env.EXPO_BASE_URL = previous;
  }
});
