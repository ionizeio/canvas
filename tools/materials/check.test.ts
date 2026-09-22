import { expect, test } from "bun:test";
import { resolve } from "node:path";
import ts from "typescript";
import { checkMaterialCoverage } from "./check";
import { renderableExports } from "./discover";
import { materialComponentRoutes, materialCoverage } from "./manifest";
import type { MaterialCoverageEntry, PublicRenderable } from "./types";

const api: PublicRenderable = { name: "Field", files: ["src/atoms/field/field.shared.tsx"] };
const catalog = [{ slug: "field", category: "Atoms" }];
const field: MaterialCoverageEntry = {
  name: "Field", tier: "atoms", family: "field", docsRoute: "components/field",
  roles: ["static"], target: "Stable field well; caret and text remain sharp.",
  unpaintedVariants: "The label remains unpainted.",
  verification: ["solid-appearance", "glass-appearance", "mode-switch", "accessibility-fallback", "runtime-capability", "semantic-state"],
};

test("material coverage rejects new/removed APIs, duplicates and docs drift", () => {
  expect(checkMaterialCoverage([api], catalog, [field]).errors).toEqual([]);
  expect(checkMaterialCoverage([api, { name: "Extra", files: [] }], catalog, [field]).errors).toContain("Unclassified public renderable: Extra");
  expect(checkMaterialCoverage([], catalog, [field]).errors).toContain("Removed or non-renderable API still registered: Field");
  expect(checkMaterialCoverage([api], catalog, [field, field]).errors).toContain("Duplicate material API: Field");
  expect(checkMaterialCoverage([api], [...catalog, { slug: "new", category: "Atoms" }], [field]).errors).toContain("Unclassified component docs route: components/new");
  expect(checkMaterialCoverage([api], [], [field]).errors).toContain("Unknown docs route for Field: components/field");
});

test("material coverage ties a component to its actual source and docs family", () => {
  expect(checkMaterialCoverage([api], catalog, [{ ...field, family: "wrong" }]).errors).toContain("Wrong source family for Field: expected src/atoms/wrong/");
  expect(checkMaterialCoverage([api], [{ ...catalog[0], dir: "other" }], [field]).errors).toContain("Docs family mismatch for Field: components/field");
  expect(checkMaterialCoverage([api], catalog, [{ ...field, docsRoute: null }]).errors).toContain("Product API has no docs route: Field");
});

test("surface decisions require complete solid, fallback and both-direction expectations", () => {
  const entries = [{ ...field, target: "", unpaintedVariants: "", verification: ["glass-appearance"] }];
  const errors = checkMaterialCoverage([api], catalog, entries).errors;
  expect(errors).toContain("Missing surface context for Field");
  expect(errors).toContain("Missing unpainted-variant policy for Field");
  expect(errors).toContain("Missing solid-appearance expectation for Field");
  expect(errors).toContain("Missing mode-switch expectation for Field");
  expect(errors).toContain("Missing accessibility-fallback expectation for Field");
  const result = checkMaterialCoverage([api], catalog, [field]);
  expect(result.implementationVerified).toBe(false);
  expect(result.runtimeEvidence).toBe("not-recorded");
});

test("inherited primitives require composition evidence without inventing surfaces", () => {
  const inherited: MaterialCoverageEntry = {
    ...field, roles: ["inherited"],
    target: "Unsurfaced layout host.", verification: ["inherited-composition", "semantic-state"],
  };
  expect(checkMaterialCoverage([api], catalog, [inherited]).errors).toEqual([]);
  const routes = materialComponentRoutes();
  expect(new Set(routes.map(({ path }) => path)).size).toBe(routes.length);
  expect(routes.some(({ path }) => !path.startsWith("/components/"))).toBe(false);
  for (const name of ["Row", "Column", "Grid", "GridItem", "CardHeader", "RadioGroup", "ToastProvider"]) {
    expect(materialCoverage.find((entry) => entry.name === name)?.roles).toEqual(["inherited"]);
  }
  // Similar names and structural wrappers can still own distinct sub-surfaces.
  expect(materialCoverage.find((entry) => entry.name === "Alert")?.roles).toEqual(["static"]);
  expect(materialCoverage.find((entry) => entry.name === "AlertDialog")?.roles).toEqual(["liquid"]);
  expect(materialCoverage.find((entry) => entry.name === "AvatarGroup")?.roles).toEqual(["static", "inherited"]);
  expect(materialCoverage.find((entry) => entry.name === "Heatmap")?.roles).toEqual(["liquid", "inherited"]);
});

test("export discovery resolves aliases, classes, forwardRef and null-rendering compound members", () => {
  const root = resolve(import.meta.dir, "../..");
  const file = resolve(root, "tools/materials/virtual-entry.tsx");
  const source = `
    import * as React from "react";
    const Internal = () => React.createElement("div");
    export { Internal as Aliased };
    export const Forward = React.forwardRef<HTMLDivElement>((_, ref) => React.createElement("div", { ref }));
    export class Classic extends React.Component { render() { return null; } }
    export const Compound = Object.assign(() => null, { Child: () => null });
    export async function Async() { return React.createElement("div"); }
    export const Context = React.createContext(false);
    export const CONSTANT = { value: 1 };
    export function DataHelper() { return { value: 1 }; }
    export function useHidden() { return null; }
    export type Shape = { value: number };
  `;
  const options: ts.CompilerOptions = { strict: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) => path === file
    ? ts.createSourceFile(path, source, languageVersion, true, ts.ScriptKind.TSX)
    : getSourceFile(path, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([file], options, host);
  expect(renderableExports(program, file, root).map(({ name }) => name)).toEqual(["Aliased", "Async", "Classic", "Compound", "Compound.Child", "Forward"]);
});
