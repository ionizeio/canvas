import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dir, "..");
const fixture = path.join(root, "test/fixtures/control-refs-consumer.tsx");
const declaration = path.join(root, "dist/index.d.ts");

// Match dist-smoke: CI builds before testing. Do not silently fall back to src,
// which would miss lost RefAttributes or a broken public declaration export.
describe.skipIf(!fs.existsSync(declaration))("public control ref declarations", () => {
  for (const [name, module, moduleResolution] of [
    ["Bundler", ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
    ["NodeNext", ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
  ] as const) {
    test(`consumer refs typecheck through the package export with ${name}`, () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        module, moduleResolution, strict: true, skipLibCheck: true, noEmit: true,
        types: ["react"],
      };
      const resolved = ts.resolveModuleName("@ionizeio/canvas", fixture, options, ts.sys).resolvedModule;
      expect(resolved?.resolvedFileName).toBe(declaration);
      const program = ts.createProgram({ rootNames: [fixture], options });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (name) => name,
        getNewLine: () => "\n",
      })).toBe("");
    }, 15_000);
  }
});
