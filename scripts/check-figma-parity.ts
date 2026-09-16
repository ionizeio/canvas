/**
 * Compares the colours the kit ships against the design source's variables.
 *
 * `validate-tokens` proves styles/tokens/colors.css and src/style/tokens.ts agree with each
 * other; both live behind this commit, so it can only prove the kit is internally consistent.
 * This leg reads the vendored Figma variable export (tools/figma/riskora-variables.json, taken
 * from the Riskora Dashboard UI Kit through the Figma MCP) and checks every semantic token
 * against the variable it derives from, within the per-channel slack the oklch re-authoring
 * allows. A token that deliberately departs from the source (a contrast floor the source does
 * not clear, a status colour the series palette may not reuse) is recorded as `solved`, with
 * the reason; a token that is neither mapped nor explained fails, so a new role cannot slip in
 * without a provenance.
 *
 * The vendored export is itself behind this commit: a green run proves the kit has not drifted
 * from the snapshot, not that the snapshot matches the live file. Re-read the variables (the
 * frames are named in the file's `source`) when the Figma kit changes; that refresh is the real
 * check.
 *
 * Usage: bun run check-figma
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brandColors, darkColors, lightColors, type ColorTokens } from "../src/style/tokens.ts";

type Scheme = "light" | "dark";
interface Mapped { variable: string; mode?: Scheme; tolerance: number; note?: string }
interface Solved { solved: string }
type Rule = Mapped | Solved | { light: Mapped | Solved; dark: Mapped | Solved };

interface Export {
  source: { name: string; fileKey: string };
  colors: Record<string, Record<Scheme, string>>;
  mapping: { tokens: Record<string, Rule>; brand: Record<string, Mapped> };
}

const ROOT = join(import.meta.dir, "..");
const data = JSON.parse(await readFile(join(ROOT, "tools/figma/riskora-variables.json"), "utf8")) as Export;

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function within(a: string, b: string, tolerance: number): boolean {
  const [x, y] = [channels(a), channels(b)];
  return x.every((v, i) => Math.abs(v - y[i]) <= tolerance);
}

const failures: string[] = [];
let checked = 0;
let solved = 0;

function check(token: string, scheme: Scheme, actual: string, rule: Mapped | Solved) {
  if ("solved" in rule) {
    solved += 1;
    return;
  }
  const source = data.colors[rule.variable];
  if (!source) {
    failures.push(`${scheme} ${token}: maps to unknown variable "${rule.variable}"`);
    return;
  }
  const expected = source[rule.mode ?? scheme];
  if (expected.length !== 7) {
    failures.push(`${scheme} ${token}: variable "${rule.variable}" carries alpha (${expected}); map an opaque one or mark it solved`);
    return;
  }
  checked += 1;
  if (!within(actual, expected, rule.tolerance)) {
    failures.push(`${scheme} ${token}: ${actual} is not within ${rule.tolerance}/255 of ${rule.variable} ${expected}`);
  }
}

const schemes: Record<Scheme, ColorTokens> = { light: lightColors, dark: darkColors };
for (const [scheme, tokens] of Object.entries(schemes) as [Scheme, ColorTokens][]) {
  for (const [token, value] of Object.entries(tokens) as [string, string][]) {
    const rule = data.mapping.tokens[token];
    if (!rule) {
      failures.push(`${scheme} ${token}: no mapping and no \`solved\` note in tools/figma/riskora-variables.json`);
      continue;
    }
    const perScheme = "light" in rule && "dark" in rule ? rule[scheme] : (rule as Mapped | Solved);
    check(token, scheme, value, perScheme);
  }
}
for (const [name, value] of Object.entries(brandColors)) {
  const rule = data.mapping.brand[name];
  if (!rule) failures.push(`brand ${name}: no mapping in tools/figma/riskora-variables.json`);
  else check(name, "light", value, rule);
}

if (failures.length) {
  console.error(`\nFigma parity failed against ${data.source.name} (${data.source.fileKey}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Figma parity: ${checked} token values within tolerance of ${data.source.name}, ${solved} documented deviations.`);
