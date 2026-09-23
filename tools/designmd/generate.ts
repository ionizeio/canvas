/**
 * DESIGN.md: what Canvas is made of, generated from what Canvas is made of.
 *
 * Consumers of this kit work under a rule that every UI element in their app is a
 * Canvas component, and increasingly the thing reading their code is an agent. An
 * agent asked to build a screen needs to know the spacing scale, the type roles, the
 * radius ladder and, more than any of those, the API grammar: that a variation is a
 * boolean prop named for its meaning, that there is no style escape hatch, that glass
 * is a theming mode rather than a per-component look. None of that was written down
 * anywhere a tool could read.
 *
 * The token half is GENERATED, from src/style/tokens.ts and styles/tokens/*.css
 * through the same parser the design-rule tests use, so it cannot drift: `--check` is
 * a CI gate exactly like docs:gen:check. The doctrine half is AUTHORED, in
 * template.md, because none of it is derivable from a number.
 *
 * The frontmatter follows the schema the design-md library uses for the 74 real
 * production systems it documents, so a tool that can read one of those can read this.
 *
 *   bun run designmd:gen         write DESIGN.md
 *   bun run designmd:gen:check   fail if it is out of date
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cssColorToHex,
  declarationsIn,
  parseFontShorthand,
  platformBlocks,
  platformValue,
  pxValue,
  resolveVars,
  type PlatformKey,
} from "../tokens/css-tokens.ts";
import { SKIN_FAMILIES } from "../tokens/skin-families.ts";
import {
  breakpoints,
  darkColors,
  widths,
  fontWeight,
  lightColors,
  radius,
  spacing,
  type ColorTokens,
} from "../../src/style/tokens.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "DESIGN.md");
const CHECK = process.argv.includes("--check");

const styles = (name: string) => readFileSync(join(ROOT, "styles", "tokens", `${name}.css`), "utf8");
const platforms = platformBlocks(styles("platforms"));
const typeDecls = declarationsIn(styles("typography"), ":root");
const motionDecls = declarationsIn(styles("motion"), ":root");
const shadowDecls = declarationsIn(styles("shadows"), ":root");
const spacingDecls = declarationsIn(styles("spacing"), ":root");

// ---------------------------------------------------------------------------
// YAML, for the values only. Every value here is a string, a number, or a map of
// those, so a full emitter would be more machinery than the job needs.
// ---------------------------------------------------------------------------

/**
 * Quote anything YAML would read as something other than a string.
 *
 * A hex colour is the case that matters: `#4f39f6` unquoted starts a comment, so the
 * whole palette parsed as null while the file still looked right. Only a plain
 * alphanumeric token is safe bare.
 */
const quote = (value: string) => (/^[A-Za-z][\w.-]*$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`);

function yamlMap(map: Record<string, string | number>, indent: string): string {
  return Object.entries(map)
    .map(([key, value]) => `${indent}${quote(key)}: ${typeof value === "number" ? value : quote(value)}`)
    .join("\n");
}

function yamlNested(map: Record<string, Record<string, string | number>>, indent: string): string {
  return Object.entries(map)
    .map(([key, value]) => `${indent}${quote(key)}:\n${yamlMap(value, indent + "  ")}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// The token blocks
// ---------------------------------------------------------------------------

/** The semantic colour set, minus the chart series (which get their own key). */
const semantic = (tokens: ColorTokens) =>
  Object.fromEntries(Object.entries(tokens).filter(([name]) => !name.startsWith("chart-"))) as Record<string, string>;

const chartSeries = (tokens: ColorTokens) =>
  Object.fromEntries(Object.entries(tokens).filter(([name]) => name.startsWith("chart-"))) as Record<string, string>;

/** Type roles, resolved from the shorthand the stylesheet composes them out of. */
function typography(): Record<string, Record<string, string | number>> {
  const roles: Record<string, Record<string, string | number>> = {};
  const family = resolveVars(typeDecls["font-sans"] ?? "", typeDecls);
  for (const [name, raw] of Object.entries(typeDecls)) {
    if (!name.startsWith("role-")) continue;
    const font = parseFontShorthand(resolveVars(raw, typeDecls));
    if (font.size === null) continue;
    roles[name.replace("role-", "")] = {
      fontFamily: family,
      fontSize: `${font.size}px`,
      fontWeight: font.weight ?? 400,
      lineHeight: `${font.lineHeight}px`,
    };
  }
  return roles;
}

/** The rounded scale, in the library's naming. */
function rounded(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(radius)) {
    out[name === "DEFAULT" ? "base" : name] = value >= 9999 ? "9999px" : `${value}px`;
  }
  return out;
}

const px = (map: Record<string, number>) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, `${v}px`])) as Record<string, string>;

/** The elevation ladder, straight from the stylesheet. */
const elevation = () =>
  Object.fromEntries(
    Object.entries(shadowDecls)
      .filter(([name]) => name.startsWith("shadow"))
      .map(([name, value]) => [name === "shadow" ? "base" : name.replace("shadow-", ""), value.trim()]),
  ) as Record<string, string>;

const motion = () =>
  Object.fromEntries(
    Object.entries(motionDecls)
      .filter(([name]) => name.startsWith("duration-") || name.startsWith("ease-"))
      .map(([name, value]) => [name, value.replace(/\/\*[\s\S]*?\*\//g, "").trim()]),
  ) as Record<string, string>;

/**
 * Component recipes, for the families whose skins are compared against the hand-off.
 * Values reference the token keys above rather than repeating them, which is how the
 * library's own documents are written and what makes them retargetable.
 */
function componentRecipes(): Record<string, Record<string, string | number>> {
  const out: Record<string, Record<string, string | number>> = {};
  for (const family of SKIN_FAMILIES) {
    const recipe: Record<string, string | number> = {};
    for (const check of family.checks) {
      const value = platformValue(platforms, "web", check.token);
      if (value === undefined) continue;
      recipe[check.token.replace(/^p-/, "")] = value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    }
    if (Object.keys(recipe).length > 0) out[family.name.toLowerCase()] = recipe;
  }
  return out;
}

/** What one platform changes about those same families. */
function platformOverrides(platform: Exclude<PlatformKey, "web">): Record<string, Record<string, string | number>> {
  const out: Record<string, Record<string, string | number>> = {};
  for (const family of SKIN_FAMILIES) {
    const recipe: Record<string, string | number> = {};
    for (const check of family.checks) {
      const own = platforms[platform].decls[check.token];
      if (own === undefined) continue;
      recipe[check.token.replace(/^p-/, "")] = own.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    }
    if (Object.keys(recipe).length > 0) out[family.name.toLowerCase()] = recipe;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The prose blocks
// ---------------------------------------------------------------------------

function colorTable(): string {
  const light = semantic(lightColors);
  const dark = semantic(darkColors);
  const rows = Object.keys(light).map((name) => `| \`${name}\` | \`${light[name]}\` | \`${dark[name]}\` |`);
  return ["| Token | Light | Dark |", "| --- | --- | --- |", ...rows].join("\n");
}

function typeTable(): string {
  const rows = Object.entries(typography()).map(
    ([name, role]) => `| \`${name}\` | ${role.fontSize} | ${role.lineHeight} | ${role.fontWeight} |`,
  );
  return ["| Role | Size | Line height | Weight |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

function shapeTable(): string {
  const rows = (["web", "ios", "android"] as PlatformKey[]).map((platform) => {
    const at = (token: string) => platformValue(platforms, platform, token) ?? "-";
    return `| ${platform} | ${at("p-btn-radius")} | ${at("p-card-radius")} | ${at("p-field-radius")} | ${at("p-min-target")} |`;
  });
  return [
    "| Platform | Button | Card | Field | Minimum touch target |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function elevationTable(): string {
  const rows = Object.entries(elevation()).map(([name, value]) => `| \`${name}\` | \`${value}\` |`);
  return ["| Level | Value |", "| --- | --- |", ...rows].join("\n");
}

function motionTable(): string {
  const rows = Object.entries(motion()).map(([name, value]) => `| \`--${name}\` | \`${value}\` |`);
  return ["| Token | Value |", "| --- | --- |", ...rows].join("\n");
}

function spacingLine(): string {
  return Object.entries(spacing)
    .map(([name, value]) => `\`${name}\` ${value}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const frontmatter = [
  "version: 1",
  "name: Canvas",
  "description: >-",
  "  A universal React Native UI kit: one component API and one codebase rendering",
  "  natively on iOS and Android and, through React Native Web, in the browser. Every",
  "  visual variation is a semantic boolean prop; there is no style escape hatch.",
  "colors:",
  yamlMap(semantic(lightColors), "  "),
  "colorsDark:",
  yamlMap(semantic(darkColors), "  "),
  "chart:",
  yamlMap(chartSeries(lightColors), "  "),
  "typography:",
  yamlNested(typography(), "  "),
  "spacing:",
  yamlMap(px(spacing), "  "),
  "rounded:",
  yamlMap(rounded(), "  "),
  "shadows:",
  yamlMap(elevation(), "  "),
  "motion:",
  yamlMap(motion(), "  "),
  "breakpoints:",
  yamlMap(px(breakpoints as unknown as Record<string, number>), "  "),
  "widths:",
  yamlMap(px(widths), "  "),
  "touchTargets:",
  yamlMap({ ios: `${pxValue(spacingDecls["target-ios"])}px`, android: `${pxValue(spacingDecls["target-android"])}px`, web: "none" }, "  "),
  "fontWeights:",
  yamlMap(fontWeight, "  "),
  "components:",
  yamlNested(componentRecipes(), "  "),
  "platformSkins:",
  "  ios:",
  yamlNested(platformOverrides("ios"), "    "),
  "  android:",
  yamlNested(platformOverrides("android"), "    "),
].join("\n");

const BLOCKS: Record<string, string> = {
  colors: colorTable(),
  typography: typeTable(),
  spacing: spacingLine(),
  shapes: shapeTable(),
  elevation: elevationTable(),
  motion: motionTable(),
};

const template = readFileSync(join(HERE, "template.md"), "utf8");

// The frontmatter is replaced as a whole rather than through a marker, because a
// marker inside the fence would be a comment in the middle of the YAML and nothing
// could parse it. The template carries a one-line placeholder fence for the same
// reason: it has to stay valid on its own.
const FENCE = /^---\n[\s\S]*?\n---\n/;
if (!FENCE.test(template)) throw new Error("template.md must open with a frontmatter fence");
const withFrontmatter = template.replace(FENCE, `---\n${frontmatter}\n---\n`);

const filled = withFrontmatter.replace(
  /<!-- @generated:([\w-]+) -->[\s\S]*?<!-- @\/generated -->/g,
  (_whole, name: string) => {
    const body = BLOCKS[name];
    if (body === undefined) throw new Error(`template.md asks for a "${name}" block that generate.ts does not produce`);
    return `<!-- @generated:${name} -->\n${body}\n<!-- @/generated -->`;
  },
);

// Every block the generator produces must be placed, or a token family silently
// stops being documented while the file still looks complete.
for (const name of Object.keys(BLOCKS)) {
  if (!filled.includes(`<!-- @generated:${name} -->`)) {
    throw new Error(`generate.ts produces a "${name}" block that template.md never places`);
  }
}

const next = filled;

let current: string | null = null;
try {
  current = readFileSync(OUT, "utf8");
} catch {
  current = null;
}

if (CHECK) {
  if (current !== next) {
    console.error(
      `designmd:gen --check: ${relative(ROOT, OUT)} is ${current === null ? "missing" : "out of date"}. ` +
        "Run `bun run designmd:gen` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`designmd:gen --check verified ${Object.keys(BLOCKS).length} generated blocks; DESIGN.md is in sync.`);
} else if (current === next) {
  console.log("designmd:gen: DESIGN.md already in sync.");
} else {
  writeFileSync(OUT, next);
  console.log(`designmd:gen: wrote ${relative(ROOT, OUT)} (${Object.keys(BLOCKS).length} generated blocks).`);
}
