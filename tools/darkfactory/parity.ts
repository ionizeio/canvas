// Dark Factory parity: the kit's shipped color tokens equal the table the rules derive
// from Dark Factory's palettes (tools/darkfactory/tokens.json, written by
// derive-tokens.ts). It replaces the Riskora Figma parity: the design source is DF now,
// and every token is a DF value or a recorded rule over DF values, never a hand edit.
//
// Checked both ways for the blush (light), mint (light) and dark palettes, on both sides
// of the hand-off: every role in the table is present in styles/tokens/colors.css and in
// src/style/tokens.ts with the table's value, and neither file carries a semantic role
// the table does not know. The mint block is read over :root, as the cascade applies it,
// and only under its anchored selector, which never matches in a dark context, so the
// one dark palette wins over mint on the web exactly as it does on the ThemeProvider
// (a bare `[data-palette="mint"]` block reads as missing here).
// scripts/check-df-parity.ts runs it in CI and test/df-parity.test.ts runs it in the
// pre-push suite.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MINT_SELECTOR, cssColorToHex, cssRgbaToCanonical, declarationsIn } from "../tokens/css-tokens.ts";
import { darkColors, lightColors, mintColors, type ColorTokens } from "../../src/style/tokens.ts";

interface Table {
  source: { commit: string };
  chart: string[];
  palettes: Record<string, Record<string, { value: string; kind: string; source: string }>>;
}

const ROOT = join(import.meta.dir, "..", "..");
export { MINT_SELECTOR };

export function readTable(): Table {
  return JSON.parse(readFileSync(join(ROOT, "tools", "darkfactory", "tokens.json"), "utf8"));
}

/** The failures, one line each; empty when the hand-off and the kit equal the table. */
export function checkParity(table: Table = readTable(), css = readFileSync(join(ROOT, "styles", "tokens", "colors.css"), "utf8")): string[] {
  const failures: string[] = [];
  const cssLight = declarationsIn(css, ":root");
  const mintBlock = declarationsIn(css, MINT_SELECTOR);
  const cssMint = { ...cssLight, ...mintBlock };
  const cssDark = { ...cssLight, ...declarationsIn(css, ".dark") };
  if (!Object.keys(mintBlock).length) failures.push(`styles/tokens/colors.css has no ${MINT_SELECTOR} block`);
  const same = (a: string, b: string) => {
    if (a.startsWith("rgba") || b.startsWith("rgba")) return cssRgbaToCanonical(a) !== null && cssRgbaToCanonical(a) === cssRgbaToCanonical(b);
    return a.toLowerCase() === b.toLowerCase();
  };
  const cssValue = (raw: string | undefined) => {
    if (raw === undefined) return undefined;
    return cssColorToHex(raw) ?? cssRgbaToCanonical(raw) ?? raw.trim();
  };
  for (const [scheme, palette, css, js] of [
    ["light", "blush", cssLight, lightColors],
    ["mint", "mint", cssMint, mintColors],
    ["dark", "dark", cssDark, darkColors],
  ] as const) {
    const roles = table.palettes[palette];
    if (!roles) { failures.push(`tokens.json has no ${palette} palette`); continue; }
    for (const [role, { value }] of Object.entries(roles)) {
      const fromCss = cssValue(css[role]);
      if (fromCss === undefined) failures.push(`${scheme} --${role}: missing from styles/tokens/colors.css`);
      else if (!same(fromCss, value)) failures.push(`${scheme} --${role}: css ${fromCss} != DF table ${value}`);
      const fromJs = js[role as keyof ColorTokens];
      if (fromJs === undefined) failures.push(`${scheme} ${role}: missing from src/style/tokens.ts`);
      else if (!same(fromJs, value)) failures.push(`${scheme} ${role}: tokens.ts ${fromJs} != DF table ${value}`);
    }
    table.chart.forEach((series, i) => {
      const role = `chart-${i + 1}` as keyof ColorTokens;
      if (js[role]?.toLowerCase() !== series) failures.push(`${scheme} ${role}: tokens.ts ${js[role]} != DF table ${series}`);
      if (cssValue(css[role]) !== series) failures.push(`${scheme} --${role}: css ${css[role]} != DF table ${series}`);
    });
    // Nothing semantic outside the table: every JS color role is derived.
    for (const role of Object.keys(js)) {
      if (!(role in roles) && !role.startsWith("chart-")) failures.push(`${scheme} ${role}: in src/style/tokens.ts but not derived in tools/darkfactory/tokens.json`);
    }
  }
  return failures;
}
