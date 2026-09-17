import { afterEach, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { SourceMap } from "node:module";
import ts from "typescript";
import { buildNative, nativeSpecifiers } from "../../scripts/build-native.ts";
import { verifyPackage } from "../../scripts/verify-package.ts";

const roots: string[] = [];
const root = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-package-test-")); roots.push(dir); return dir; };
const write = (root: string, name: string, source: string) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source); };
afterEach(() => { for (const dir of roots.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

test("native emit rewrites only relative JS module requests, preserving web emit and peer guards", () => {
  const source = '"use client";\nimport A from "./a.js"; export { B } from "../b.ios.js"; import "./side.js";\nconst load = () => import("./async.js");\ntry { require("./c.js"); require("expo-clipboard"); } catch {}\nconst asset = require("./image.png"); const text = "./keep.js"; import data from "./data.json";';
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true };
  const web = ts.transpileModule(source, { compilerOptions: options }).outputText;
  const native = ts.transpileModule(source, { compilerOptions: options, transformers: { before: [nativeSpecifiers] } }).outputText;
  expect(web).toContain('from "./a.js"');
  for (const request of ['from "./a"', 'from "../b.ios"', 'import "./side"', 'import("./async")', 'require("./c")']) expect(native).toContain(request);
  for (const unchanged of ['"use client"', 'require("expo-clipboard")', 'require("./image.png")', '"./keep.js"', 'from "./data.json"']) expect(native).toContain(unchanged);
});

function compilerFixture() {
  const dir = root();
  write(dir, "tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2020", module: "ESNext", moduleResolution: "bundler", rootDir: "src", outDir: "dist", sourceMap: true, inlineSources: true, skipLibCheck: true, noEmitOnError: true }, include: ["src/**/*.ts"] }));
  write(dir, "src/index.ts", 'export { value } from "./value.js";\n');
  write(dir, "src/value.ts", 'export const value = "first";\n');
  write(dir, "src/value.ios.ts", 'export const value = "native";\n');
  return dir;
}

test("native compiler emits real platform files and source maps containing the original source", () => {
  const dir = compilerFixture();
  expect(buildNative(path.join(dir, "tsconfig.json"))).toBe(true);
  expect(fs.readFileSync(path.join(dir, "dist/index.js"), "utf8")).toContain('from "./value"');
  expect(fs.existsSync(path.join(dir, "dist/value.ios.js"))).toBe(true);
  const map = JSON.parse(fs.readFileSync(path.join(dir, "dist/index.js.map"), "utf8"));
  expect(map.sources).toEqual(["../src/index.ts"]);
  expect(map.sourcesContent).toEqual([fs.readFileSync(path.join(dir, "src/index.ts"), "utf8")]);
  expect(map.mappings.length).toBeGreaterThan(0);
});

test("native source maps retain exact module-request positions and following code", () => {
  const source = 'import "./side.js";\nexport { value as renamed } from "./value.js";\nconst load = () => import("./async.js"); const marker = 7;\ntry { require("./peer.js"); } catch {}\n';
  const emitted = ts.transpileModule(source, {
    fileName: "index.ts",
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, sourceMap: true, inlineSources: true },
    transformers: { before: [nativeSpecifiers] },
  });
  // Node's built-in decoder is supported by Bun. Checking actual positions
  // catches lost ranges that a nonempty mappings/sourcesContent check cannot.
  const map = new SourceMap(JSON.parse(emitted.sourceMapText!));
  const generated = emitted.outputText.split("\n");
  const original = source.split("\n");
  for (const token of ['"./side', '"./value', '"./async', '"./peer', "marker"]) {
    const generatedLine = generated.findIndex((line) => line.includes(token));
    const originalLine = original.findIndex((line) => line.includes(token));
    const position = map.findEntry(generatedLine, generated[generatedLine].indexOf(token));
    expect(position.originalSource).toBe("index.ts");
    expect([position.originalLine, position.originalColumn]).toEqual([originalLine, original[originalLine].indexOf(token)]);
  }
});

test("native watch transforms subsequent changes as well as the initial emit", async () => {
  const dir = compilerFixture();
  // The dev launcher runs the watcher in its own Bun process. Exercise that
  // boundary, including real filesystem events, without inheriting the suite's
  // compiler caches or global timers. The ready message follows watch creation.
  write(dir, "watch.ts", `import { watchNative } from ${JSON.stringify(path.resolve(import.meta.dir, "../../scripts/build-native.ts"))};\nwatchNative(${JSON.stringify(path.join(dir, "tsconfig.json"))});\nconsole.log("WATCH_READY");\n`);
  const watcher = Bun.spawn([process.execPath, path.join(dir, "watch.ts")], { stdout: "pipe", stderr: "pipe" });
  let output = "";
  const consume = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) output += decoder.decode(chunk, { stream: true });
  };
  const streams = Promise.all([consume(watcher.stdout), consume(watcher.stderr)]);
  const until = async (ready: () => boolean) => {
    const deadline = Date.now() + 10_000;
    while (!ready() && Date.now() < deadline && watcher.exitCode === null) await new Promise((done) => setTimeout(done, 50));
    expect(ready(), output).toBe(true);
  };
  try {
    await until(() => output.includes("WATCH_READY"));
    const read = () => fs.readFileSync(path.join(dir, "dist/index.js"), "utf8");
    expect(read()).toContain('from "./value"');
    write(dir, "src/index.ts", 'export { value as updated } from "./value.js";\n');
    await until(() => read().includes("updated"));
    expect(read()).toContain('value as updated } from "./value"');
  } finally {
    watcher.kill();
    await watcher.exited;
    await streams;
  }
}, 25_000);

function packageFixture() {
  const dir = root();
  const metadata = { main: "./dist/index.js", types: "./dist/index.d.ts", "react-native": "./dist/native/index.js", exports: { ".": { default: "./dist/index.js", types: "./dist/index.d.ts", "react-native": "./dist/native/index.js" } }, peerDependencies: { "new-optional-peer": "*", "expo-clipboard": "*" }, peerDependenciesMeta: { "new-optional-peer": { optional: true }, "expo-clipboard": { optional: true } } };
  write(dir, "package.json", JSON.stringify(metadata));
  for (const output of ["dist", "dist/native"]) {
    write(dir, `${output}/index.js`, 'export {};');
    write(dir, `${output}/control.ios.js`, 'export {};');
    write(dir, `${output}/control.android.js`, 'export {};');
  }
  write(dir, "dist/index.d.ts", 'export {};');
  return dir;
}

test("package guard rejects the old native entry and explicit native extensions", () => {
  const dir = packageFixture();
  expect(verifyPackage(dir)).toEqual([]);
  const metadata = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  metadata.exports["."]["react-native"] = "./dist/index.js";
  write(dir, "package.json", JSON.stringify(metadata));
  write(dir, "dist/native/index.js", 'export * from "./control.ios.js";');
  expect(verifyPackage(dir).join("\n")).toContain("legacy entry");
  expect(verifyPackage(dir).join("\n")).toContain("bypasses Metro platform resolution");
});

test("optional-peer guard derives all peers from metadata and checks AST block ownership", () => {
  const dir = packageFixture();
  write(dir, "dist/native/index.js", 'try { const braces = "{}"; require("new-optional-peer"); require("expo-clipboard"); } catch {}');
  expect(verifyPackage(dir)).toEqual([]);
  write(dir, "dist/native/index.js", 'try { if (true) { require("expo-clipboard"); } } catch {}\nexport * from "new-optional-peer/private";');
  const errors = verifyPackage(dir).join("\n");
  expect(errors).toContain("directly inside a try block");
  expect(errors).toContain("static/dynamic import of optional peer new-optional-peer/private");
});
