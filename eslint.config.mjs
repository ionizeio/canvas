// Focused ESLint flat config. This is NOT a full style linter (Prettier/format is
// deliberately not adopted); it enables ONLY the rule classes the 2026 audit proved
// this hook-heavy kit needs and that tsc + the test suite cannot catch:
//   - react-hooks/rules-of-hooks: a hook called conditionally is a real bug.
//   - react-hooks/exhaustive-deps: a stale-closure warning (non-blocking).
//   - react/jsx-no-constructed-context-values: a fresh context value object every
//     render re-renders every consumer (the RadioGroup finding).
//   - no static imports of the optional peers in src/** (they load via a guarded
//     require(); a value import breaks consumers who skip the peer).
//   - no Trusted Types sinks in src/**: they throw under a strict CSP, and a sink
//     on a module's import path takes the whole consuming app down with it.
import { readFileSync } from "node:fs";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const OPTIONAL_PEERS = Object.keys(packageMetadata.peerDependencies).filter(
  (name) => packageMetadata.peerDependenciesMeta?.[name]?.optional,
);

// Every hand-written TypeScript tree in the repo, kit AND docs app. The docs app used
// to be ignored wholesale ("docs/**"), which did two bad things at once: it left the
// docs sources completely unlinted (the root `eslint .` is the only lint CI runs), and
// it made `cd docs && bun run lint` a hard failure, since the docs workspace has no
// config of its own, so ESLint resolves THIS file and then found every path it was
// handed already ignored (ESLint 9 exits 2 on that). Docs source is React Native code
// with the same hooks hazards as the kit, so it gets the same rules.
const SOURCES = [
  "src/**/*.{ts,tsx}",
  "packages/*/src/**/*.{ts,tsx}",
  "tools/**/*.ts",
  "tools/native/*.mjs",
  "tools/package/consumer-support/*.{tsx,jsx}",
  "scripts/**/*.{ts,mjs}",
  "test/**/*.{ts,tsx}",
  "docs/src/**/*.{ts,tsx}",
  "docs/scripts/**/*.ts",
  "examples/starter/src/**/*.{ts,tsx}",
  "examples/starter/smoke/**/*.{ts,tsx}",
  "e2e/**/*.ts",
  "playwright.config.ts",
];

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "packages/*/dist/**",
      "packages/*/android/build/**",
      "packages/*/android/.gradle/**",
      "packages/*/android/.cxx/**",
      "**/node_modules/**",
      "**/*.d.ts",
      // The docs app's build output and its generated native projects, never its source.
      "docs/dist/**",
      "docs/.expo/**",
      "docs/android/**",
      "docs/ios/**",
      "examples/starter/dist/**",
      "examples/starter/.expo/**",
      "examples/starter/android/**",
      "examples/starter/ios/**",
      // Local Claude Code session state. It is gitignored, and it holds nested git
      // worktrees whose checkouts would otherwise be linted as if they were this one.
      ".claude/**",
    ],
  },
  {
    files: SOURCES,
    plugins: { "react-hooks": reactHooks, react, "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-no-constructed-context-values": "error",
    },
  },
  {
    // The optional-peer import ban is the source-level half of the verify-package
    // dist scan; allowTypeImports keeps the erased `import type` in qrcode legal.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: { parser: tseslint.parser },
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: OPTIONAL_PEERS.map((name) => ({
            name,
            allowTypeImports: true,
            message: `${name} is an optional peer: load it via a guarded require(), not a static import.`,
          })),
        },
      ],
      // Trusted Types sinks. The docs site sends `require-trusted-types-for
      // 'script'` (docs/public/_headers) and any consumer may send it too; under
      // that CSP Chromium throws a TypeError on every string assigned to one of
      // these. Because kit modules run their DOM setup at import time, such a
      // throw escapes the module factory and blanks the whole app rather than
      // merely losing an effect: that is how the web glass lens took
      // canvas.nannier.com down. Build DOM with createElementNS + setAttribute.
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
          message:
            "innerHTML/outerHTML is a Trusted Types sink and throws under a require-trusted-types-for CSP. Build nodes with document.createElementNS + setAttribute instead.",
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message:
            "insertAdjacentHTML is a Trusted Types sink and throws under a require-trusted-types-for CSP. Build nodes with document.createElementNS + setAttribute instead.",
        },
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
          message:
            "document.write is a Trusted Types sink and throws under a require-trusted-types-for CSP. Build nodes with document.createElementNS + setAttribute instead.",
        },
      ],
    },
  },
);
