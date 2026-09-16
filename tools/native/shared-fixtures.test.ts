import { expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { installSmokeFixtures } from "./fixtures.mjs";

const root = resolve(import.meta.dir, "../..");

test("docs and native routes consume one maintained public-API fixture body", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "examples/starter/smoke/manifest.json"), "utf8"));
  for (const fixture of manifest.fixtures.filter((name: string) => name !== "diagnostics")) {
    const shared = readFileSync(resolve(root, `examples/starter/smoke/fixtures/${fixture}.tsx`), "utf8");
    const ast = ts.createSourceFile("fixture.tsx", shared, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        if (fixture === "form-autocomplete" && statement.moduleSpecifier.text === "react-native") {
          const bindings = statement.importClause?.namedBindings;
          expect(bindings && ts.isNamedImports(bindings) ? bindings.elements.map((entry) => entry.name.text) : []).toEqual(["Keyboard"]);
        } else if (fixture === "carousel" && statement.moduleSpecifier.text === "react-native") {
          const bindings = statement.importClause?.namedBindings;
          expect(bindings && ts.isNamedImports(bindings) ? bindings.elements.map((entry) => entry.name.text) : [])
            .toEqual(["Dimensions", "I18nManager", "PixelRatio", "Platform", "View"]);
        } else expect(["react", "@nannier-com/canvas"]).toContain(statement.moduleSpecifier.text);
      }
    }
    const native = readFileSync(resolve(root, `examples/starter/smoke/routes/${fixture}.tsx`), "utf8");
    expect(native).toContain(`../../testing/${fixture}`);
  }
  for (const fixture of ["form-autocomplete", "listbox", "escape-layers", "control-refs", "tabs"]) {
    const docs = readFileSync(resolve(root, `docs/src/app/(home)/testing/${fixture}.tsx`), "utf8");
    expect(docs).toContain(`examples/starter/smoke/fixtures/${fixture}`);
  }
  const metadata = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  expect(metadata.files).not.toContain("examples");
  expect(metadata.files).not.toContain("examples/starter");
  expect(existsSync(resolve(root, "examples/starter/src/testing"))).toBe(false);
  expect(existsSync(resolve(root, "examples/starter/src/app/testing"))).toBe(false);
});

test("candidate preparation installs exactly the manifest-listed bodies and routes without overwriting app files", () => {
  const app = mkdtempSync(join(tmpdir(), "canvas-smoke-fixtures-"));
  try {
    cpSync(resolve(root, "examples/starter/smoke"), join(app, "smoke"), { recursive: true });
    writeFileSync(join(app, "smoke/fixtures/unreviewed.tsx"), "export const unreviewed = true;");
    installSmokeFixtures(app);
    const manifest = JSON.parse(readFileSync(join(app, "smoke/manifest.json"), "utf8"));
    for (const [kind, destination] of [["fixtures", "src/testing"], ["routes", "src/app/testing"]]) {
      for (const name of manifest[kind]) {
        expect(readFileSync(join(app, destination!, `${name}.tsx`), "utf8"))
          .toBe(readFileSync(join(app, "smoke", kind!, `${name}.tsx`), "utf8"));
      }
    }
    expect(existsSync(join(app, "src/testing/unreviewed.tsx"))).toBe(false);
    const route = join(app, "src/app/testing/control-refs.tsx");
    writeFileSync(route, "Existing app route");
    expect(() => installSmokeFixtures(app)).toThrow("already exists");
    expect(readFileSync(route, "utf8")).toBe("Existing app route");
  } finally { rmSync(app, { recursive: true, force: true }); }
});

test("invalid smoke manifest paths fail before creating any app source", () => {
  const app = mkdtempSync(join(tmpdir(), "canvas-smoke-manifest-"));
  try {
    cpSync(resolve(root, "examples/starter/smoke"), join(app, "smoke"), { recursive: true });
    const manifestPath = join(app, "smoke/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, routes: ["../../escape"] }));
    expect(() => installSmokeFixtures(app)).toThrow("Invalid smoke routes manifest");
    expect(existsSync(join(app, "src"))).toBe(false);
  } finally { rmSync(app, { recursive: true, force: true }); }
});

test("every native flow link targets a route installed from the reviewed manifest", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "examples/starter/smoke/manifest.json"), "utf8"));
  const commands: unknown = ["candidate.yaml", "after-carousel.yaml"].map((file) => {
    const source = readFileSync(resolve(root, "tools/native/flows", file), "utf8");
    return Bun.YAML.parse(source.split("\n---\n")[1]!);
  });
  const routes = new Set<string>();
  function visit(value: unknown) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "openLink" && typeof child === "string") {
          const route = new URL(child).pathname.replace(/^\/testing\//, "");
          expect(manifest.routes).toContain(route);
          expect(manifest.fixtures).toContain(route);
          routes.add(route);
        }
        visit(child);
      }
    }
  }
  visit(commands);
  expect([...routes].sort()).toEqual([...manifest.fixtures].sort());
});
