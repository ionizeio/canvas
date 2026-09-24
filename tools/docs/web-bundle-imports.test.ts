import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Packages the docs app may import only from native modules (`*.native.*`, `*.ios.*`,
// `*.android.*`), so they never enter the web client or server bundles, with the reason.
const NATIVE_ONLY: Record<string, string> = {
  // Its UpdatesEmitter subscribes at evaluation time to a process-wide web module object,
  // and the dev server evaluates the web server bundle once per rendered document: every
  // render pinned a whole bundle until the server ran out of heap (docs/src/core/update-identity.ts).
  "expo-updates": "subscribes at evaluation time to a process-wide object, leaking one server bundle per dev render",
};

const docsSrc = resolve(import.meta.dir, "../../docs/src");
const sources = readdirSync(docsSrc, { recursive: true })
  .map(String)
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

test("native-only packages are imported only from native modules in the docs app", () => {
  const offenders: string[] = [];
  for (const file of sources) {
    if (/\.(native|ios|android)\.[jt]sx?$/.test(file)) continue;
    const text = readFileSync(join(docsSrc, file), "utf8");
    for (const name of Object.keys(NATIVE_ONLY)) {
      const specifier = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      const imports = new RegExp(`(?:from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*|import\\s+)["']${specifier}(?:/[^"']*)?["']`);
      if (imports.test(text)) offenders.push(`${file} imports ${name} (${NATIVE_ONLY[name]})`);
    }
  }
  expect(offenders).toEqual([]);
});

test("the guard sees an import it should reject", () => {
  const specifier = "expo-updates";
  const imports = new RegExp(`(?:from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*|import\\s+)["']${specifier}(?:/[^"']*)?["']`);
  expect(imports.test('import * as Updates from "expo-updates";')).toBe(true);
  expect(imports.test("const u = require('expo-updates/build/Updates');")).toBe(true);
  expect(imports.test('import "expo-updates";')).toBe(true);
  expect(imports.test('// the docs never import "expo-updates-interface" on the web')).toBe(false);
});
