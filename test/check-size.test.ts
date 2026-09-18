import { afterEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  JS_MAX_GZIP, NAMED_IMPORT_BUDGETS, measureBundle, measureJavaScript, bundleJavaScript,
  type BundleBuilder, type JavaScriptBudget,
} from "../scripts/check-size.ts";

const ROOT = join(import.meta.dir, "..");
const temporary: string[] = [];
const temporaryRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "canvas-size-test-"));
  temporary.push(root);
  return root;
};
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const budget: JavaScriptBudget = { label: "Example", entry: "example.js", maxGzip: 100, requiredExports: ["Example"] };
const output = (source: string): BundleBuilder => async () => ({ success: true, outputs: [new Blob([source])], logs: [] });
const fixtureRoot = async () => {
  const root = await temporaryRoot();
  await writeFile(join(root, budget.entry), "export const Example = 1;");
  return root;
};

describe("JavaScript size gate", () => {
  it("is import-safe outside a built checkout", async () => {
    const root = await temporaryRoot();
    const module = join(root, "check-size.ts");
    await copyFile(join(ROOT, "scripts/check-size.ts"), module);
    // This copy has no package metadata, styles, or dist next to it. Importing
    // must only define helpers, without starting a check or changing exit state.
    const exitCode = process.exitCode;
    const imported = await import(module);
    expect(typeof imported.measureJavaScript).toBe("function");
    expect(typeof imported.checkSize).toBe("function");
    expect(process.exitCode).toBe(exitCode);
  });

  it("fails without built dist instead of skipping all JavaScript budgets", async () => {
    const root = await temporaryRoot();
    let built = false;
    await expect(measureJavaScript(root, async () => {
      built = true;
      return { success: true, outputs: [], logs: [] };
    })).rejects.toThrow("Run `bun run build`");
    expect(built).toBe(false);
  });

  it("measures gzip bytes exactly and fails a fixture above its fixed ceiling", async () => {
    const root = await fixtureRoot();
    const source = "export const Example = 'kept alive';";
    const measured = await measureBundle(root, budget, [], output(source));
    expect(measured.raw).toBe(Buffer.byteLength(source));
    expect(measured.gzip).toBe(gzipSync(source).length);
    expect(measured.exceeded).toBe(false);
    expect((await measureBundle(root, { ...budget, maxGzip: measured.gzip }, [], output(source))).exceeded).toBe(false);
    expect((await measureBundle(root, { ...budget, maxGzip: measured.gzip - 1 }, [], output(source))).exceeded).toBe(true);
  });

  it("fails for missing fixtures and failed, absent, split, or empty build output", async () => {
    const root = await fixtureRoot();
    await expect(measureBundle(root, { ...budget, entry: "missing.js" }, [], output(""))).rejects.toThrow("missing missing.js");
    await expect(measureBundle(root, budget, [], async () => ({ success: false, outputs: [], logs: ["resolution failed"] }))).rejects.toThrow("resolution failed");
    await expect(measureBundle(root, budget, [], async () => ({ success: true, outputs: [], logs: [] }))).rejects.toThrow("received 0");
    await expect(measureBundle(root, budget, [], async () => ({ success: true, outputs: [new Blob(), new Blob()], logs: [] }))).rejects.toThrow("received 2");
    await expect(measureBundle(root, budget, [], output(""))).rejects.toThrow("output is empty");
  });

  it("rejects missing exports and the Bun self-reference failure with unbound exports", async () => {
    const root = await fixtureRoot();
    await expect(measureBundle(root, budget, [], output("export const Other = 1;"))).rejects.toThrow("lost required exports: Example");
    await expect(measureBundle(root, budget, [], output("export { missing as Example };"))).rejects.toThrow("invalid JavaScript or unbound exports");
  });

  it("retains real named imports through the public root in every fixture", async () => {
    const metadata = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
    expect(JS_MAX_GZIP).toBe(229_376);
    for (const fixture of NAMED_IMPORT_BUDGETS) {
      const source = await readFile(join(ROOT, fixture.entry), "utf8");
      const scan = new Bun.Transpiler({ loader: "ts" }).scan(source);
      expect(scan.imports).toEqual([{ kind: "import-statement", path: metadata.name }]);
      expect(scan.exports.sort()).toEqual([...fixture.requiredExports!].sort());
    }
  });

  it("rejects a fixture that bypasses the public package root", async () => {
    const root = await temporaryRoot();
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist/index.js"), "export const Example = 1;");
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "size-example", peerDependencies: { react: "*" },
      exports: { ".": { "react-native": "./dist/index.js" } },
    }));
    const first = NAMED_IMPORT_BUDGETS[0]!;
    await mkdir(dirname(join(root, first.entry)), { recursive: true });
    await writeFile(join(root, first.entry), "import { Button, ThemeProvider } from '../../dist/index.js'; export { Button, ThemeProvider };");
    await expect(measureJavaScript(root, output("export const Example = 1;"))).rejects.toThrow("fixture must import only from the public package root size-example");
  });

  // Like dist-smoke, this integration leg runs after build in pre-push and CI.
  // The missing-build regression above always runs, even in a source-only checkout.
  it.skipIf(!existsSync(join(ROOT, "dist/index.js")))("bundles the built public package in an ordinary consumer with metadata-derived externals", async () => {
    const metadata = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
    const entries: string[] = [];
    const measured = await measureJavaScript(ROOT, async (options) => {
      expect(options.external).toEqual(Object.keys(metadata.peerDependencies));
      expect(options.minify).toBe(true);
      expect(["browser", "neutral"]).toContain(options.platform);
      entries.push((options.entryPoints as string[])[0]!);
      return bundleJavaScript(options);
    });
    const groupSize = NAMED_IMPORT_BUDGETS.length + 1;
    expect(measured.length).toBe(groupSize * 3);
    for (const [platformIndex, platform] of ["web", "ios", "android"].entries()) {
      const offset = platformIndex * groupSize;
      expect(entries[offset]).toBe(join(ROOT, platform === "web" ? "dist/index.js" : metadata.exports["."]["react-native"]));
      for (const [index, fixture] of NAMED_IMPORT_BUDGETS.entries()) {
        const position = offset + index + 1;
        const entry = entries[position]!;
        expect(entry.startsWith(ROOT)).toBe(false);
        expect(entry.endsWith(fixture.entry)).toBe(true);
        expect(measured[position]!.platform).toBe(platform);
        expect(measured[position]!.raw).toBeGreaterThan(1_000);
        expect(measured[position]!.requiredExports).toEqual(fixture.requiredExports);
        // The temporary consumer must not leave files behind after a passing run.
        expect(existsSync(dirname(entry))).toBe(false);
      }
    }
    expect(measured.every((size) => !size.exceeded)).toBe(true);
  });

  it("resolves each native platform through its public export condition and platform files", async () => {
    const root = await temporaryRoot();
    const pkg = join(root, "node_modules", "platform-example");
    await mkdir(pkg, { recursive: true });
    await writeFile(join(pkg, "package.json"), JSON.stringify({
      name: "platform-example", type: "module",
      exports: { ".": { "react-native": "./native.js", default: "./web.js" } },
    }));
    await writeFile(join(pkg, "web.js"), "export const Example = 'web-value';");
    await writeFile(join(pkg, "native.js"), "export { Example } from './host';");
    await writeFile(join(pkg, "host.js"), "export const Example = 'wrong-fallback';");
    for (const platform of ["ios", "android"]) {
      await writeFile(join(pkg, `host.${platform}.js`), `export const Example = '${platform}-value';`);
    }
    await writeFile(join(root, budget.entry), "export { Example } from 'platform-example';");
    for (const platform of ["web", "ios", "android"] as const) {
      let source = "";
      await measureBundle(root, { ...budget, platform }, [], async (options) => {
        const result = await bundleJavaScript(options);
        source = new TextDecoder().decode(await result.outputs[0]!.arrayBuffer());
        return result;
      });
      expect(source).toContain(`${platform}-value`);
      expect(source).not.toContain("wrong-fallback");
    }
  });

  it.skipIf(!existsSync(join(ROOT, "dist/index.js")))("cleans the ordinary consumer after a build failure", async () => {
    let consumerEntry: string | undefined;
    let calls = 0;
    await expect(measureJavaScript(ROOT, async (options) => {
      calls += 1;
      if (calls === 1) return bundleJavaScript(options);
      consumerEntry = (options.entryPoints as string[])[0]!;
      throw new Error("fixture build rejected");
    })).rejects.toThrow("fixture build rejected");
    expect(consumerEntry).toBeDefined();
    expect(existsSync(dirname(consumerEntry!))).toBe(false);
  });
});
