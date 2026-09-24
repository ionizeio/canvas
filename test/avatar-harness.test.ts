import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import * as JSX from "react/jsx-runtime";
import ts from "typescript";
import { IDENTITY_HUES, identityHue } from "../src/style/identity-hue.ts";

// The `/testing/avatar` harness labels its discs with the stage hue each name resolves to.
// The fixture may import only the public package, so it cannot compute the hue itself; this
// test holds every label to the hash, so a changed hash or hue set cannot leave the harness
// naming hues its discs no longer show.

type Entry = { hue: number; name: string };

function fixtureTables(): { STAGES: readonly Entry[]; PEOPLE: readonly Entry[] } {
  const source = readFileSync(resolve(import.meta.dir, "../examples/starter/smoke/fixtures/avatar.tsx"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  // Reading the tables evaluates no component, so the kit resolves to an empty module.
  const modules: Record<string, unknown> = { react: React, "react/jsx-runtime": JSX, "@nannier-com/canvas": {} };
  new Function("require", "exports", compiled)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected fixture import ${name}`);
    return modules[name];
  }, exports);
  return exports as { STAGES: readonly Entry[]; PEOPLE: readonly Entry[] };
}

test("every harness disc is labelled with the hue its name resolves to", () => {
  const { STAGES, PEOPLE } = fixtureTables();
  for (const entry of [...STAGES, ...PEOPLE]) expect({ name: entry.name, hue: identityHue(entry.name) }).toEqual(entry);
});

test("the harness covers every stage hue once, in the reference's order", () => {
  const { STAGES, PEOPLE } = fixtureTables();
  expect(STAGES.map((entry) => entry.hue)).toEqual([...IDENTITY_HUES]);
  expect(PEOPLE.map((entry) => entry.hue)).toEqual([...IDENTITY_HUES]);
});
