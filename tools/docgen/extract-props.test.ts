import { beforeAll, expect, test } from "bun:test";
import * as path from "node:path";
import * as ts from "typescript";
import { extractProps } from "./extract-props.ts";

const root = path.resolve(import.meta.dir, "../..");
const read = (dir: string) => extractProps([{ dir, file: path.join(root, `src/atoms/${dir}/${dir}.shared.tsx`) }])[dir];

// Loading the kit's full TypeScript project is fixture setup, not a five-second
// performance assertion on the first control. Keep a bounded cold-start budget.
beforeAll(() => { read("button"); }, 30_000);

test("public control refs are resolved from the factory return type and document their actual hosts", () => {
  for (const dir of ["button", "select", "checkbox", "switch", "radio", "slider"]) {
    const group = read(dir)[0];
    const rows = group.props.filter((prop) => prop.name === "ref");
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("React.Ref<View>");
    expect(rows[0].required).toBe(false);
    expect(rows[0].description).toContain("interactive");
    expect(rows[0].description).toContain("Native host behavior depends");
    expect(rows[0].description).toContain("React Native Web");
    expect(rows[0].description).toContain("DOM");
    expect(rows[0].description).toContain("accessibility focus");
    expect(group.props.some((prop) => prop.name === "disabled")).toBe(true);
    expect(group.props.some((prop) => prop.name === "key")).toBe(false);
  }
});

test("existing text input refs retain their resolved text host type", () => {
  const ref = read("input")[0].props.find((prop) => prop.name === "ref");
  expect(ref?.type).toMatch(/^React.Ref<(RNTextInput|TextInput)>$/);
  expect(ref?.type).not.toContain("<T>");
});

test("ordinary factories do not acquire an invented ref prop", () => {
  expect(read("badge")[0].props.some((prop) => prop.name === "ref")).toBe(false);
});

test("a matching factory name cannot attach another structurally identical props type's ref", () => {
  const file = path.join(import.meta.dir, "fixtures/ref-factories.tsx");
  const prog = ts.createProgram([file], {
    strict: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  expect(ts.getPreEmitDiagnostics(prog).map((diagnostic) => diagnostic.messageText)).toEqual([]);
  const groups = extractProps([{ dir: "fixtures", file }], prog).fixtures;
  expect(groups.find((group) => group.name === "CorrectProps")?.props.find((prop) => prop.name === "ref")?.description)
    .toBe("Ref owned by Correct.");
  expect(groups.find((group) => group.name === "MistakenProps")?.props.some((prop) => prop.name === "ref")).toBe(false);
  expect(groups.find((group) => group.name === "OtherProps")?.props.some((prop) => prop.name === "ref")).toBe(false);
});
