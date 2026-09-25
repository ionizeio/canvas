import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { LISTBOX, LISTBOX_ROLES } from "../src/style/listbox-role.ts";

// React Native parses a View's and a Text's `role` natively (Fabric's props), and its parser
// accepts only the roles below: anything else logs "Unsupported Role value" and a
// react_native_expect failure on every node that carries it, then falls back to no role
// (Android's view manager drops an unknown role as well). The accepted set is read from the
// parser itself, so this follows React Native if it ever changes it.
const ROOT = join(import.meta.dir, "..");
const RN = join(ROOT, "node_modules/react-native");
const parser = readFileSync(join(RN, "ReactCommon/react/renderer/components/view/accessibilityPropsConversions.h"), "utf8");
const parse = /fromRawValue\([^)]*\bRole &result\)\s*\{([\s\S]*?)\n\}/.exec(parser)?.[1] ?? "";
const roles = new Set([...parse.matchAll(/string == "(\w+)"/g)].map((match) => match[1]!));

// React Native's own `Role` type, the union a `role` prop type-checks against.
const typings = readFileSync(join(RN, "Libraries/Components/View/ViewAccessibility.d.ts"), "utf8");
const typedRoles = [...(/export type Role =([^;]*);/.exec(typings)?.[1] ?? "").matchAll(/'(\w+)'/g)].map((match) => match[1]!);

/** The code of every module that renders on a device (the kit, the docs, the starter and smoke
 * apps, the blur package), comments stripped: they quote rejected roles. */
const modules = ["src", "docs/src", "examples/starter/src", "examples/starter/smoke", "packages/canvas-blur/src"]
  .flatMap((dir) => [...new Glob(`${dir}/**/*.{ts,tsx}`).scanSync(ROOT)])
  .filter((file) => !file.endsWith(".d.ts"))
  .map((file) => ({
    file,
    code: readFileSync(join(ROOT, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  }));

/** Every `role` value a module writes: a JSX attribute's quoted value or braced expression
 * (across lines), or an object key's value up to the next comma, brace or line end. */
function roleValues(code: string): { expression: string; jsx: boolean }[] {
  return [...code.matchAll(/(?<![\w-])role(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})|:\s*([^,}\n]*))/g)].map((match) =>
    match[4] !== undefined
      ? { expression: match[4], jsx: false }
      : { expression: match[3] ?? `"${match[1] ?? match[2]}"`, jsx: true });
}

/** The literals an expression can evaluate to: its start and the branches after `?`, `:`
 * and `??`, not a comparison operand. */
function literalsOf(expression: string): string[] {
  return [...expression.matchAll(/(?:^\s*|[?:]\s*|\?\?\s*|\(\s*)["'`](\w+)["'`]/g)].map((match) => match[1]!);
}

// Files whose `role:` keys are data, not accessibility roles.
const DATA_ROLES: Record<string, string> = {
  "docs/src/app/(utilities)/tokens/typography.tsx": "each row's `role` names a type-scale role (display, lead, caption)",
  "docs/src/core/data/templates/team.tsx": "each member's `role` is a job (Admin, Editor, Viewer)",
  "docs/src/core/data/templates/identities.tsx": "each identity's `role` is a job (Admin, Editor, Viewer)",
};

describe("roles native can parse", () => {
  it("reads the accepted roles from React Native's prop parser", () => {
    expect(roles.size).toBeGreaterThan(60);
    for (const role of ["list", "option", "group", "dialog", "form", "radiogroup"]) expect(roles.has(role), role).toBe(true);
    for (const role of ["listbox", "search"]) expect(roles.has(role), role).toBe(false);
  });

  it("types a role as exactly what the parser accepts, so a role that type-checks without a cast parses", () => {
    expect(typedRoles.length).toBeGreaterThan(60);
    expect([...typedRoles].sort()).toEqual([...roles].sort());
  });

  it("gives an option list the web's listbox and a native role the parser accepts", () => {
    expect(LISTBOX_ROLES.web).toBe("listbox");
    expect(roles.has(LISTBOX_ROLES.native)).toBe(true);
    // This suite runs on React Native Web, so the container carries the web's spelling.
    expect(LISTBOX).toBe("listbox");
  });

  it("casts no role past React Native's Role type except the web's listbox", () => {
    expect(modules.length).toBeGreaterThan(200);
    const casts = modules.flatMap(({ file, code }) => [
      ...[...code.matchAll(/\bas Role\b/g)].map(() => `${file}: as Role`),
      // Any other cast on a role value (as never, as any, as ViewProps["role"]) hides it too.
      ...roleValues(code).flatMap(({ expression }) => [...expression.matchAll(/\bas\s+(?!const\b)(\S+)/g)].map((m) => `${file}: as ${m[1]}`)),
    ]);
    expect(casts).toEqual(["src/style/listbox-role.ts: as Role"]);
  });

  it("writes no role native rejects anywhere that renders on a device", () => {
    const written: { file: string; role: string }[] = [];
    const data = new Set<string>();
    for (const { file, code } of modules) {
      for (const { expression, jsx } of roleValues(code)) {
        for (const role of literalsOf(expression)) {
          if (!jsx && file in DATA_ROLES) data.add(file);
          else written.push({ file, role });
        }
      }
    }
    // The scan sees the kit's roles: the option rows, the charts' groups, the dialogs.
    expect(new Set(written.map(({ role }) => role))).toContain("option");
    expect(written.length).toBeGreaterThan(100);
    expect(written.filter(({ role }) => !roles.has(role)).map(({ file, role }) => `${file}: ${role}`)).toEqual([]);
    // The list stays honest: a data file whose `role:` keys are gone is removed.
    expect(Object.keys(DATA_ROLES).filter((file) => !data.has(file))).toEqual([]);
  });
});

