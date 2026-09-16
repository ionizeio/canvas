import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createConsumerSync } from "../../scripts/dev-sync.ts";

const roots: string[] = [];
const write = (root: string, file: string, content: string) => {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
};
const read = (root: string, file: string) => readFileSync(join(root, file), "utf8");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(nativeReady = true) {
  const workspace = mkdtempSync(join(tmpdir(), "canvas-consumer-sync-"));
  roots.push(workspace);
  const root = join(workspace, "canvas");
  const metadata = {
    name: "@ionizeio/canvas", version: "2.60.6",
    main: "./dist/index.js", module: "./dist/index.js", types: "./dist/index.d.ts",
    "react-native": "./dist/native/index.js",
    exports: {
      ".": { types: "./dist/index.d.ts", "react-native": "./dist/native/index.js", default: "./dist/index.js" },
      "./styles/*": "./styles/*", "./package.json": "./package.json",
    },
    dependencies: { example: "^1.2.3" },
    peerDependencies: { react: ">=18" },
  };
  write(root, "package.json", json(metadata));
  write(root, "dist/index.js", "export const web = true;\n");
  write(root, "dist/index.d.ts", "export declare const web: true;\n");
  write(root, "styles/canvas.css", ":root { color: black; }\n");
  write(root, "styles/tokens/colors.css", ":root { --primary: indigo; }\n");
  if (nativeReady) write(root, "dist/native/index.js", "export const native = true;\n");
  const sync = createConsumerSync(root);
  function consumer(name = "app", origin: string | null = root, scope = "@nannier-com") {
    const app = join(workspace, name);
    const target = join(app, "node_modules", scope, "canvas");
    write(app, "package.json", json({ name, dependencies: { "@ionizeio/canvas": "2.60.5" } }));
    write(target, "package.json", json({ name: `${scope}/canvas`, version: "2.60.5", "react-native": "./dist/index.js" }));
    write(target, "dist/index.js", "old consumer web\n");
    if (origin !== null) write(target, ".origin", origin);
    return { app, target };
  }
  return { workspace, root, metadata, sync, consumer };
}

test("existing overlays keep working metadata until native output exists, then receive the exact package", async () => {
  const f = fixture(false);
  const { app, target } = f.consumer();
  const oldPackage = read(target, "package.json");
  const appPackage = read(app, "package.json");
  write(target, "dist/stale.js", "obsolete output");
  expect((await f.sync()).pending).toContain("dist/native/index.js");
  expect(read(target, "package.json")).toBe(oldPackage);
  expect(read(target, "dist/index.js")).toBe("old consumer web\n");
  write(f.root, "dist/native/index.js", "export const native = true;\n");
  write(f.root, "dist/native/atoms/button.ios.js", "export const button = true;\n");
  const result = await f.sync();
  expect(result.pending).toBeUndefined();
  expect(result.metadata).toBe(1);
  expect(read(target, "package.json")).toBe(read(f.root, "package.json"));
  const installed = JSON.parse(read(target, "package.json"));
  expect(read(target, installed["react-native"])).toBe("export const native = true;\n");
  expect(read(target, "dist/native/atoms/button.ios.js")).toBe("export const button = true;\n");
  expect(read(target, "styles/tokens/colors.css")).toBe(read(f.root, "styles/tokens/colors.css"));
  expect(existsSync(join(target, "dist/stale.js"))).toBe(false);
  expect(read(app, "package.json")).toBe(appPackage);
  expect(read(target, ".origin")).toBe(f.root);
});

test("metadata-only changes preserve version and dependency ranges and serialize concurrent passes", async () => {
  const f = fixture();
  const { target } = f.consumer();
  await f.sync();
  const updated = { ...f.metadata, version: "2.60.7-beta.1+build.9", dependencies: { example: "~1.3.0", extra: ">=2 <4" } };
  write(f.root, "package.json", json(updated));
  const results = await Promise.all([f.sync(), f.sync()]);
  expect(results.map((result) => result.changed)).toEqual([0, 0]);
  expect(results.map((result) => result.metadata)).toEqual([1, 0]);
  expect(read(target, "package.json")).toBe(json(updated));
  expect(readdirSync(target).filter((name) => name.startsWith(".canvas-package-"))).toEqual([]);
});

test("invalid JSON and a newly referenced missing entry retain the last valid consumer package", async () => {
  const f = fixture();
  const { target } = f.consumer();
  await f.sync();
  const valid = read(target, "package.json");
  write(f.root, "package.json", "{\n");
  expect((await f.sync()).pending).toContain("not valid JSON");
  expect(read(target, "package.json")).toBe(valid);
  const metadata = { ...f.metadata, "react-native": "./dist/native/next.js" };
  write(f.root, "package.json", json(metadata));
  expect((await f.sync()).pending).toContain("dist/native/next.js");
  expect(read(target, "package.json")).toBe(valid);
  write(f.root, "dist/native/next.js", "export const next = true;\n");
  await f.sync();
  expect(read(target, "package.json")).toBe(json(metadata));
  expect(read(target, "dist/native/next.js")).toBe("export const next = true;\n");
});

test("source entry overrides never turn a compiled overlay into a source alias", async () => {
  const f = fixture();
  const { target } = f.consumer();
  await f.sync();
  const valid = read(target, "package.json");
  write(f.root, "src/index.ts", "export const source = true;\n");
  write(f.root, "package.json", json({ ...f.metadata, "react-native": "./src/index.ts" }));
  expect((await f.sync()).pending).toContain("outside the compiled output");
  expect(read(target, "package.json")).toBe(valid);
  expect(existsSync(join(target, "src"))).toBe(false);
});

test("only matching real-directory registrations sync, and revoking .origin stops later writes", async () => {
  const f = fixture();
  const registered = f.consumer("registered");
  const registry = f.consumer("registry", null);
  const otherRoot = join(f.workspace, "other-canvas");
  mkdirSync(otherRoot);
  const other = f.consumer("other", otherRoot);
  const linked = f.consumer("linked");
  const linkedSource = join(f.workspace, "linked-source");
  write(linkedSource, ".origin", f.root);
  write(linkedSource, "package.json", "source-link sentinel");
  rmSync(linked.target, { recursive: true });
  symlinkSync(linkedSource, linked.target);
  const registryPackage = read(registry.target, "package.json");
  const otherPackage = read(other.target, "package.json");
  expect((await f.sync()).consumers).toEqual(["registered"]);
  expect(read(registry.target, "package.json")).toBe(registryPackage);
  expect(read(other.target, "package.json")).toBe(otherPackage);
  expect(read(linkedSource, "package.json")).toBe("source-link sentinel");
  expect(existsSync(join(linkedSource, "dist"))).toBe(false);
  const last = read(registered.target, "package.json");
  const output = read(registered.target, "dist/index.js");
  rmSync(join(registered.target, ".origin"));
  write(f.root, "package.json", json({ ...f.metadata, version: "2.60.8" }));
  write(f.root, "dist/index.js", "new output that must not sync\n");
  await f.sync();
  expect(read(registered.target, "package.json")).toBe(last);
  expect(read(registered.target, "dist/index.js")).toBe(output);
});

test("late and legacy registrations receive a full copy without waiting for a build edit", async () => {
  const f = fixture();
  expect((await f.sync()).consumers).toEqual([]);
  const { target } = f.consumer("ionize/app", f.root, "@nannier");
  const result = await f.sync();
  expect(result.consumers).toEqual(["app"]);
  expect(result.metadata).toBe(1);
  expect(read(target, "package.json")).toBe(read(f.root, "package.json"));
  write(f.root, "dist/native/removed.js", "temporary output\n");
  await f.sync();
  expect(existsSync(join(target, "dist/native/removed.js"))).toBe(true);
  rmSync(join(f.root, "dist/native/removed.js"));
  await f.sync();
  expect(existsSync(join(target, "dist/native/removed.js"))).toBe(false);
});
