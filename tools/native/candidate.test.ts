import { afterEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appInventory, assertInstalledPackage, packageIdentity } from "./candidate.mjs";

const temporary: string[] = [];
afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const manifest = {
  name: "@ionizeio/canvas", source: "a".repeat(40), candidate: "b".repeat(40), version: "2.62.1",
  packageFile: "canvas.tgz", files: [{ name: "canvas.tgz", sha256: "c".repeat(64) }],
};

test("native identity names the exact sealed package and rejects invented metadata", () => {
  expect(packageIdentity(manifest)).toEqual({
    schema: 1, inputMode: "package", packageName: manifest.name, sourceRevision: manifest.source,
    candidateRevision: manifest.candidate, packageVersion: manifest.version, packageSha256: "c".repeat(64),
  });
  for (const invalid of [{ ...manifest, source: "main" }, { ...manifest, files: [] }, { ...manifest, version: "latest" }]) {
    expect(() => packageIdentity(invalid)).toThrow("Invalid native candidate identity");
  }
});

test("native consumer proof rejects changed package bytes, overlays and linked packages", () => {
  const directory = mkdtempSync(join(tmpdir(), "canvas-native-candidate-"));
  temporary.push(directory);
  const packed = join(directory, "package");
  const installed = join(directory, "installed");
  mkdirSync(join(packed, "dist/native"), { recursive: true });
  writeFileSync(join(packed, "dist/native/index.js"), "export const native = true;");
  writeFileSync(join(packed, "package.json"), JSON.stringify({ name: manifest.name, version: manifest.version }));
  cpSync(packed, installed, { recursive: true });
  expect(() => assertInstalledPackage(packed, installed)).not.toThrow();
  writeFileSync(join(installed, "dist/native/index.js"), "export const native = false;");
  expect(() => assertInstalledPackage(packed, installed)).toThrow("bytes differ");
  cpSync(packed, installed, { recursive: true });
  writeFileSync(join(installed, ".origin"), "/a/checkout");
  expect(() => assertInstalledPackage(packed, installed)).toThrow("local source overlay");
  const linked = join(directory, "linked");
  symlinkSync(packed, linked);
  expect(() => assertInstalledPackage(packed, linked)).toThrow("local source overlay");
});

test("prepared app inputs detect fixture edits while excluding generated native outputs", () => {
  const app = mkdtempSync(join(tmpdir(), "canvas-native-inputs-"));
  temporary.push(app);
  mkdirSync(join(app, "src"));
  writeFileSync(join(app, "src/fixture.tsx"), "export const fixture = 'candidate';");
  const before = appInventory(app);
  mkdirSync(join(app, "ios"));
  writeFileSync(join(app, "ios/generated.pbxproj"), "generated");
  expect(appInventory(app)).toEqual(before);
  writeFileSync(join(app, "src/fixture.tsx"), "export const fixture = 'different';");
  expect(appInventory(app)).not.toEqual(before);
});
