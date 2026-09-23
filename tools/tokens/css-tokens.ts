/**
 * Reading the CSS token hand-off.
 *
 * styles/tokens/*.css is the WEB hand-off: custom properties a browser (and the
 * design-system mirror) resolve, including the `--p-*` platform-skin variables that
 * `data-platform` switches between three looks. Native never reads any of it, so
 * nothing keeps the two sides honest except tools that parse this file, and this is
 * the shared parser those tools use.
 *
 * The oklch conversion and the three colour helpers were extracted from
 * scripts/validate-tokens.ts, which now imports them: that script runs its checks at
 * import time and calls process.exit, so nothing could import from it.
 *
 * Everything takes CSS text rather than a path, so the callers own the file reading
 * and the functions stay directly testable.
 */

/** Remove `/* ... *\/` comments, which appear INSIDE values (`var(--x) /* @kind other *\/`). */
export function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

// --- OKLCH -> sRGB -------------------------------------------------------
// The hand-off authors its semantic colors in oklch(), which React Native cannot
// parse, so src/style/tokens.ts carries the hex those values resolve to. To compare
// the two sides at all, the CSS has to be converted back. Standard Oklab matrices
// (Ottosson), then the sRGB transfer function; the result is the same 8-bit triple a
// browser paints, so an exact string compare is the right test.
export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  const channel = (v: number) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${linear.map(channel).join("")}`;
}

/**
 * Resolve a raw CSS declaration to a comparable hex, or null when it is not a plain
 * color (a var() alias, a gradient, a shadow list, a blur filter).
 */
export function cssColorToHex(raw: string): string | null {
  const value = stripComments(raw).trim().toLowerCase();
  const oklch = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (oklch) return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value)) return `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  return null;
}

/**
 * The glass material's tokens are authored as rgba() on BOTH sides (React Native parses
 * rgba natively, so nothing has to be transcribed into another notation), which is exactly
 * the case cssColorToHex declines: a hex compare would drop the alpha, and the alpha is the
 * whole point of a material fill. Canonicalize the four channels instead, so spacing and
 * `0.20` vs `0.2` count as formatting while a real difference still fails.
 */
export function cssRgbaToCanonical(raw: string): string | null {
  const value = stripComments(raw).trim().toLowerCase();
  const m = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return `rgba(${Number(m[1])}, ${Number(m[2])}, ${Number(m[3])}, ${alpha})`;
}

/**
 * One custom-property declaration.
 *
 * The value runs to the next `;` or `}`, rather than requiring a semicolon: the last
 * declaration in a block is allowed to omit it, and a nested at-rule's closing brace
 * has to end a value too or the next block's contents would be swallowed into it.
 */
const DECLARATION = /--([\w-]+)\s*:\s*([^;}]+)/g;

/** The body of one selector's block, brace-matched so nested at-rules cannot end it early. */
function blockBody(css: string, selector: string): string | null {
  const start = css.indexOf(selector + "{");
  if (start === -1) return null;
  const open = start + selector.length;
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === "{") depth++;
    else if (css[end] === "}" && --depth === 0) break;
  }
  return css.slice(open, end);
}

/**
 * The selector of the mint palette's block in styles/tokens/colors.css: the attribute,
 * excluded on a `.dark` element and under one (Dark Factory has one dark palette), the
 * exclusion inside :where() so the block keeps the specificity of one attribute and the
 * accessibility fallbacks in surface.css still win over its frost tints.
 */
export const MINT_SELECTOR = '[data-palette="mint"]:not(:where(.dark, .dark *))';

/**
 * Pull the declarations out of one selector block, so the light (:root), mint
 * (MINT_SELECTOR) and dark (.dark) color sets can be compared against their own JS
 * counterpart. Later declarations win, exactly as the cascade resolves them.
 */
export function declarationsIn(css: string, selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = blockBody(css, selector);
  if (body === null) return out;
  for (const m of body.matchAll(DECLARATION)) out[m[1]] = m[2].trim();
  return out;
}

export interface BlockDeclarations {
  /** The resolved value of each custom property: last declaration wins. */
  decls: Record<string, string>;
  /** Names declared more than once in this block, in source order of the repeat. */
  duplicates: string[];
  /** True when the selector has a block at all. */
  present: boolean;
}

/**
 * Like declarationsIn, but it also reports what the cascade quietly swallowed.
 *
 * A custom property declared twice in one block is not a style choice: the second
 * declaration silently replaces the first, so the earlier value is dead and whoever
 * wrote it believes it is live. That is exactly how an iOS fragment ended up inside
 * the web block of platforms.css overriding the web Stats and EmptyState metrics.
 */
export function blockDeclarations(css: string, selector: string): BlockDeclarations {
  const decls: Record<string, string> = {};
  const duplicates: string[] = [];
  const body = blockBody(css, selector);
  if (body === null) return { decls, duplicates, present: false };
  for (const m of body.matchAll(DECLARATION)) {
    if (m[1] in decls) duplicates.push(m[1]);
    decls[m[1]] = m[2].trim();
  }
  return { decls, duplicates, present: true };
}

export type PlatformKey = "web" | "ios" | "android";

/**
 * The three blocks of styles/tokens/platforms.css. Web is the unprefixed default, so
 * it shares its block with :root; the other two key off the data-platform attribute
 * the docs and any consuming web surface stamp on a subtree.
 */
export const PLATFORM_SELECTOR: Record<PlatformKey, string> = {
  web: ':root,[data-platform="web"]',
  ios: '[data-platform="ios"]',
  android: '[data-platform="android"]',
};

export function platformBlocks(css: string): Record<PlatformKey, BlockDeclarations> {
  return {
    web: blockDeclarations(css, PLATFORM_SELECTOR.web),
    ios: blockDeclarations(css, PLATFORM_SELECTOR.ios),
    android: blockDeclarations(css, PLATFORM_SELECTOR.android),
  };
}

/**
 * Resolve a `--p-*` value for one platform, falling back to web the way the cascade
 * does: an iOS or Android block only overrides what it names, and inherits the rest.
 */
export function platformValue(
  blocks: Record<PlatformKey, BlockDeclarations>,
  platform: PlatformKey,
  name: string,
): string | undefined {
  return blocks[platform].decls[name] ?? blocks.web.decls[name];
}

/** "12px" -> 12, "0" -> 0, "-0.15px" -> -0.15. Null for anything that is not a length. */
export function pxValue(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = stripComments(raw).trim();
  const m = /^(-?[\d.]+)(px)?$/.exec(value);
  return m ? Number(m[1]) : null;
}

/** Every rgba alpha appearing in a value, so a shadow list can be checked as a whole. */
export function rgbaAlphas(raw: string): number[] {
  const out: number[] = [];
  for (const m of stripComments(raw).matchAll(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)/g)) {
    out.push(m[1] === undefined ? 1 : Number(m[1]));
  }
  return out;
}

export interface ShadowLayer {
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
}

/**
 * Split a box-shadow value into its layers, keeping the offsets.
 *
 * Only the geometry is parsed: the colour is left to rgbaAlphas. `none` and any layer
 * whose lengths do not parse are skipped rather than guessed at.
 */
export function shadowLayers(raw: string): ShadowLayer[] {
  const value = stripComments(raw).trim();
  if (value === "" || value === "none") return [];
  // Split on the commas that separate layers, not the ones inside rgba(...).
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);

  const layers: ShadowLayer[] = [];
  for (const part of parts) {
    const inset = /\binset\b/.test(part);
    const lengths = part
      .replace(/rgba?\([^)]*\)/g, " ")
      .replace(/\binset\b/g, " ")
      .trim()
      .split(/\s+/)
      .map((t) => pxValue(t))
      .filter((n): n is number => n !== null);
    if (lengths.length < 2) continue;
    layers.push({
      inset,
      x: lengths[0],
      y: lengths[1],
      blur: lengths[2] ?? 0,
      spread: lengths[3] ?? 0,
    });
  }
  return layers;
}

/**
 * Substitute `var(--x)` references from a declaration map, repeatedly, so a value
 * built out of other tokens (the `--role-*` font shorthands) resolves to literals.
 *
 * Stops after a bounded number of passes rather than trusting the input to be
 * acyclic, and leaves any reference it cannot resolve in place so the caller sees
 * what was missing instead of an empty string.
 */
export function resolveVars(value: string, decls: Record<string, string>, passes = 6): string {
  let out = stripComments(value).trim();
  for (let i = 0; i < passes && out.includes("var("); i++) {
    out = out.replace(/var\(\s*--([\w-]+)\s*(?:,[^)]*)?\)/g, (whole, name: string) => {
      const next = decls[name];
      return next === undefined ? whole : stripComments(next).trim();
    });
  }
  return out;
}

export interface FontShorthand {
  weight: number | null;
  size: number | null;
  lineHeight: number | null;
  family: string | null;
}

/**
 * Parse a CSS `font` shorthand of the shape the `--role-*` tokens use:
 * `<weight> <size>/<line-height> <family>`. Anything it cannot read comes back null
 * rather than as a guess.
 */
export function parseFontShorthand(value: string): FontShorthand {
  const text = stripComments(value).trim();
  const m = /^(\d{3})\s+([\d.]+px)\s*\/\s*([\d.]+px)\s+(.+)$/.exec(text);
  if (!m) return { weight: null, size: null, lineHeight: null, family: null };
  return {
    weight: Number(m[1]),
    size: pxValue(m[2]),
    lineHeight: pxValue(m[3]),
    family: m[4].trim(),
  };
}
