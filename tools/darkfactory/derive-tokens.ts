// Derives Canvas's semantic color tokens from Dark Factory's palettes.
//
// Canvas takes the Dark Factory (DF) design language (CLAUDE.md, "Design language: Dark
// Factory"), so every semantic token is a DF value or a rule over DF values, never a
// number picked by eye. Each role in each palette is one of four kinds:
//
//   from    a DF value copied exactly;
//   derive  an exact formula over DF values (a translucent DF color composited on the
//           surface it sits on, since the kit's semantic tokens are opaque);
//   solved  a DF color with its OKLCH hue and chroma kept and only the lightness moved,
//           the fewest 0.001 steps that clear a kit legibility floor DF's own value
//           misses (DF's muted gray is 4.32:1 on its inset surface; the floor is 4.5);
//   kit     a role DF has no source for, with its formula (the control boundary).
//
// `bun run df:tokens` writes the result to tools/darkfactory/tokens.json, which
// scripts/check-df-parity.ts compares against styles/tokens/colors.css and
// src/style/tokens.ts; `bun run df:tokens:check` fails when the committed table no
// longer matches what the rules produce from tools/darkfactory/theme.json.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { composite, contrastRatio, mixOklab } from "../../src/style/color.ts";
import { oklchToHex } from "../tokens/css-tokens.ts";
import { contrast, composite as compositeRgba, destructiveStates, neighborhood, primaryTextSurfaces, rgba, type SrgbColor } from "../tokens/text-beds.ts";
import type { ColorTokens } from "../../src/style/tokens.ts";

export type Kind = "from" | "derive" | "solved" | "kit";
export interface Derived {
  /** The token's value: `#rrggbb` for an opaque role, `rgba(r, g, b, a)` for a translucent one. */
  value: string;
  /** The CSS hand-off's authoring form: an `oklch(L C H)` that round-trips to `value`, or the rgba. */
  css: string;
  kind: Kind;
  /** Where the value comes from, in words: the DF role, the formula, the floor it clears. */
  source: string;
}
export type PaletteName = "blush" | "mint" | "dark";
export type DerivedPalette = Record<string, Derived>;

const ROOT = join(import.meta.dir, "..", "..");
export const TABLE = join(ROOT, "tools", "darkfactory", "tokens.json");
const theme = JSON.parse(readFileSync(join(ROOT, "tools", "darkfactory", "theme.json"), "utf8"));

// --- OKLCH <-> hex ----------------------------------------------------------------
// The hand-off authors colors as `oklch(L C H)` with L and C to three decimals and H to
// one, and the kit carries the hex that string renders to. A derived value is therefore
// fixed as a rounded OKLCH triple first and its hex taken from that, so the CSS string is
// exact and the hex is its rendering; a DF value is found the other way round, as the
// rounded triple that renders to DF's hex exactly.

const toLinear = (v: number) => {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

export function oklchOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;
const fmt = (v: number, places: number) => String(round(v, places));
export const oklchCss = (L: number, C: number, H: number) =>
  C === 0 ? `oklch(${fmt(L, 3)} 0 0)` : `oklch(${fmt(L, 3)} ${fmt(C, 3)} ${fmt(H, 1)})`;

/** The rounded OKLCH authoring string that renders to exactly `hex`. */
export function exactOklch(hex: string): string {
  const target = hex.toLowerCase();
  if (target === "#ffffff") return "oklch(1 0 0)";
  if (target === "#000000") return "oklch(0 0 0)";
  const [L, C, H] = oklchOf(target);
  for (let dl = 0; dl <= 4; dl++) for (const sl of dl ? [-1, 1] : [1]) {
    for (let dc = 0; dc <= 4; dc++) for (const sc of dc ? [-1, 1] : [1]) {
      for (let dh = 0; dh <= 20; dh++) for (const sh of dh ? [-1, 1] : [1]) {
        const l = round(L, 3) + sl * dl * 0.001;
        const c = Math.max(0, round(C, 3) + sc * dc * 0.001);
        const h = ((round(H, 1) + sh * dh * 0.1) + 360) % 360;
        if (oklchToHex(l, c, h) === target) return oklchCss(l, c, h);
      }
    }
  }
  throw new Error(`No rounded oklch() renders ${hex}`);
}

// --- Composites and floors --------------------------------------------------------

export const hexOf = (color: string): string => {
  if (color.startsWith("#")) return color.toLowerCase();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!m) throw new Error(`Not an rgb color: ${color}`);
  return `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
};
/** A translucent DF color composited on an opaque surface, as hex. */
export const over = (translucent: string, surface: string) => hexOf(composite(translucent, surface));
/** `color` at opacity `a`, as the rgba string the kit's `alpha` writes for hex input. */
const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
const canonicalRgba = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (!m) throw new Error(`Not an rgba color: ${value}`);
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${m[4] ?? 1})`;
};

/**
 * The lowest contrast `ink` keeps against `fill` and every color one 8-bit step away
 * from it on any channel: engines round a converted oklch() differently, so the kit's
 * floors hold over the whole neighborhood (test/text-contrast.test.tsx does the same).
 */
export function worstContrast(fill: string, ink: string): number {
  const n = parseInt(fill.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let worst = Infinity;
  for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
    const shifted = `#${channels.map((v, i) => Math.min(255, Math.max(0, v + [dr, dg, db][i]!)).toString(16).padStart(2, "0")).join("")}`;
    worst = Math.min(worst, contrastRatio(shifted, ink));
  }
  return worst;
}

/**
 * Move `base`'s OKLCH lightness in `direction` (-1 darker, +1 lighter) by the fewest
 * 0.001 steps until `passes` holds, keeping its hue and chroma (chroma shrinks only where
 * the lighter or darker color leaves the sRGB gamut). Returns the rounded triple's hex.
 */
export function solveLightness(base: string, direction: -1 | 1, passes: (hex: string) => boolean): { hex: string; css: string; steps: number } {
  const [L0, C0, H0] = oklchOf(base);
  let L = round(L0, 3);
  const C = round(C0, 3);
  const H = round(H0, 1);
  for (let steps = 0; steps <= 1000; steps++) {
    const l = round(L + direction * steps * 0.001, 3);
    if (l <= 0 || l >= 1) break;
    // Clamp chroma into gamut: shrink until the round trip lands on itself.
    let c = C;
    let hex = oklchToHex(l, c, H);
    while (c > 0 && !inGamut(l, c, H)) { c = round(c - 0.001, 3); hex = oklchToHex(l, c, H); }
    if (steps === 0 && hex === base.toLowerCase()) {
      if (passes(hex)) return { hex, css: exactOklch(hex), steps: 0 };
      continue;
    }
    if (passes(hex)) return { hex, css: oklchCss(l, c, H), steps };
  }
  throw new Error(`No lightness of ${base} clears the floor`);
}

function inGamut(L: number, C: number, H: number): boolean {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.every((v) => v >= -0.0005 && v <= 1.0005);
}

/**
 * The nearest color to `hex` (fewest 8-bit channel steps) whose OKLCH hue sits within
 * `tolerance` degrees, less a half-degree margin, of the median of its own hue and the
 * `partners`' hues; `hex` itself when it already does.
 */
function nudgeHue(hex: string, partners: number[], tolerance: number): string {
  const median = (hues: number[]) => [...hues].sort((a, b) => a - b)[Math.floor(hues.length / 2)]!;
  const fits = (candidate: string) => {
    const hues = [oklchOf(candidate)[2], ...partners];
    const m = median(hues);
    return hues.every((h) => Math.abs(h - m) <= tolerance - 0.5);
  };
  if (fits(hex)) return hex.toLowerCase();
  const n = parseInt(hex.slice(1), 16);
  const base = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let budget = 1; budget <= 6; budget++) {
    for (let dr = -budget; dr <= budget; dr++) for (let dg = -budget; dg <= budget; dg++) {
      const db = budget - Math.abs(dr) - Math.abs(dg);
      for (const sb of db === 0 ? [0] : [db, -db]) {
        const candidate = `#${[base[0]! + dr, base[1]! + dg, base[2]! + sb].map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0")).join("")}`;
        if (fits(candidate)) return candidate;
      }
    }
  }
  throw new Error(`No color near ${hex} fits the ink hue band`);
}

/**
 * The dark scheme's ink on a light intent fill: DF's own dark ink (`accentInk`, the ink
 * it paints on its green) carried to the fill's hue at the same lightness and chroma.
 */
function darkInk(p: Record<string, string>, fill: string): string {
  const [L, C] = oklchOf(p.accentInk!);
  const [, , H] = oklchOf(fill);
  return oklchToHex(round(L, 3), round(C, 3), round(H, 1));
}

// --- The mapping ------------------------------------------------------------------

const BODY_TEXT = 4.5;
const BRAND_TEXT = 4.65; // primary-text holds 4.65 so its 0.9 hover still clears 4.5
const CONTROL = 3;

export function derivePalette(name: PaletteName): DerivedPalette {
  const p: Record<string, string> = theme.palettes[name];
  const dark = name === "dark";
  const out: DerivedPalette = {};
  const put = (role: string, value: string, kind: Kind, source: string, css?: string) => {
    const translucent = value.startsWith("rgba");
    out[role] = { value: translucent ? canonicalRgba(value) : value.toLowerCase(), css: css ?? (translucent ? canonicalRgba(value) : exactOklch(value)), kind, source };
  };
  const from = (role: string, dfRole: string) => put(role, p[dfRole]!, "from", `DF ${dfRole}`);

  // Surfaces.
  from("card", "card");
  from("popover", "card");
  from("secondary", "card2");
  from("muted", "card2");
  put("background", over(p.shell!, p.bg2!), "derive", "DF shell composited on bg2 (the frosted panel the content sits on)");
  put("accent", over(p.hover!, p.card!), "derive", "DF hover composited on card (the hover and pressed wash)");
  put("border", over(p.line!, p.card!), "derive", "DF line composited on card (the hairline)");
  const surfaces = [out.background!.value, out.card!.value, out.popover!.value, out.muted!.value, out.accent!.value, out.secondary!.value];

  // Ink on the surfaces. The kit keeps each neutral class on one hue (the inks within
  // 6 degrees of their median, test/design-rules-css.test.ts), and DF's dark text sits
  // 8.8 degrees from its own muted ink, so it moves the fewest 8-bit steps that land its
  // hue inside the band; blush and mint already sit there.
  {
    const partners = [p.muted!, hexOf(mixOklab(p.card!, p.text!, 0.5))].map((hex) => oklchOf(hex)[2]);
    const text = nudgeHue(p.text!, partners, 6);
    const kind: Kind = text === p.text!.toLowerCase() ? "from" : "solved";
    const source = kind === "from" ? "DF text" : "DF text, one 8-bit step toward the ink hue band";
    for (const role of ["foreground", "card-foreground", "popover-foreground", "secondary-foreground", "accent-foreground"]) put(role, text, kind, source);
  }
  {
    // Both colors perturbed by one 8-bit step, as the text-contrast test perturbs them.
    const s = solveLightness(p.muted!, dark ? 1 : -1, (hex) => surfaces.every((surface) => {
      for (const fg of neighborhood(hex)) for (const bg of neighborhood(surface)) if (contrast(fg, bg) < BODY_TEXT) return false;
      return true;
    }));
    put("muted-foreground", s.hex, s.steps ? "solved" : "from", s.steps ? `DF muted, ${s.steps} lightness steps to ${BODY_TEXT}:1 on every surface` : "DF muted", s.css);
  }

  // The brand (violet): selection, checked, current, links, focus.
  const primaryInk = dark ? darkInk(p, p.accent2!) : "#ffffff";
  {
    const s = solveLightness(p.accent2!, dark ? 1 : -1, (hex) => worstContrast(hex, primaryInk) >= BODY_TEXT);
    put("primary", s.hex, s.steps ? "solved" : "from", s.steps ? `DF accent2, ${s.steps} lightness steps to carry its ink at ${BODY_TEXT}:1` : "DF accent2", s.css);
  }
  put("primary-foreground", primaryInk, dark ? "kit" : "from", dark ? "DF accentInk's lightness and chroma at accent2's hue" : "white, DF's ink on accent2");
  put("primary-soft", p.accent2Soft!, "from", "DF accent2Soft");
  // Seeded here; solved below against the kit's painted beds once every role exists.
  put("primary-text", p.accent2!, "solved", "DF accent2");
  from("ring", "accent2");

  // The call to action (green).
  from("action", "accent");
  from("action-foreground", "accentInk");

  // Status: the fill, the ink on it, the wash, and (for errors) the text on neutral.
  from("destructive", "neg");
  put("destructive-foreground", dark ? darkInk(p, p.neg!) : "#ffffff", dark ? "kit" : "from", dark ? "DF accentInk's lightness and chroma at neg's hue" : "white, DF's ink on neg");
  put("destructive-soft", p.negSoft!, "from", "DF negSoft");
  put("destructive-text", p.neg!, "solved", "DF neg");
  for (const [role, df, soft] of [["success", "pos", "posSoft"], ["warning", "warn", "warnSoft"]] as const) {
    const ink = dark ? (role === "success" ? p.accentInk! : darkInk(p, p[df]!)) : "#ffffff";
    const beds = [...surfaces, ...[out.background!.value, out.card!.value, out.muted!.value].map((s) => over(p[soft]!, s))];
    const s = solveLightness(p[df]!, dark ? 1 : -1, (hex) => beds.every((bed) => worstContrast(bed, hex) >= BODY_TEXT) && worstContrast(hex, ink) >= BODY_TEXT);
    put(role, s.hex, s.steps ? "solved" : "from", s.steps ? `DF ${df}, ${s.steps} lightness steps to ${BODY_TEXT}:1 as text on every surface and its wash, and to carry its ink` : `DF ${df}`, s.css);
    put(`${role}-foreground`, ink, dark && role !== "success" ? "kit" : "from", dark ? (role === "success" ? "DF accentInk" : `DF accentInk's lightness and chroma at ${df}'s hue`) : `white, DF's ink on ${df}`);
    put(`${role}-soft`, p[soft]!, "from", `DF ${soft}`);
  }

  // Control boundaries. DF draws a control's edge with its `line` hairline, which no
  // surface can carry at WCAG 1.4.11's 3:1, so `input` is the kit's own: the text ink
  // mixed into the card in Oklab, the least that clears 3:1 on every surface a control
  // sits on. `field-border` rests a text field between the hairline and that floor: DF's
  // line densified on the card until the box reads apart from a divider.
  {
    let input = "";
    for (let t = 0.001; t <= 1; t += 0.001) {
      const hex = hexOf(mixOklab(p.card!, p.text!, round(t, 3)));
      if (surfaces.every((surface) => worstContrast(surface, hex) >= CONTROL)) { input = hex; break; }
    }
    put("input", input, "kit", "the text ink mixed into the card in Oklab, the least that clears 3:1 on every surface");
    const line = /rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)/.exec(p.line!)!;
    const borderContrast = contrastRatio(out.border!.value, p.card!);
    const target = Math.max(borderContrast + 0.15, 1.45);
    let field = "";
    for (let a = Number(line[4]); a <= 1; a = round(a + 0.01, 2)) {
      const hex = over(`rgba(${line[1]}, ${line[2]}, ${line[3]}, ${a})`, p.card!);
      if (contrastRatio(hex, p.card!) >= target) { field = hex; break; }
    }
    put("field-border", field, "derive", `DF line densified on the card to ${round(target, 2)}:1, apart from the hairline and under the 3:1 control floor`);
  }

  // Surfaces DF paints that the kit names for later phases.
  from("field-fill", "input");
  from("scrim", "dim");
  from("shade", "shadow");
  from("inverse", "toastBg");
  from("inverse-foreground", "toastText");

  // The two text roles the kit paints over skin composites (a tonal pill, a nav tile, a
  // calendar band, the pressed and ripple states of the menus and sheets) are solved
  // against those painted beds, the same ones test/text-contrast.test.tsx checks
  // (tools/tokens/text-beds.ts), perturbing the text and the bed by one 8-bit step each.
  const tokens = (): ColorTokens => ({ ...Object.fromEntries(Object.entries(out).map(([k, d]) => [k, d.value])), ...chartTokens() }) as ColorTokens;
  const holds = (text: SrgbColor, bed: SrgbColor, floor: number) => {
    if (contrast(text, bed) < floor) return false;
    for (const fg of neighborhood(text)) for (const bg of neighborhood(bed)) if (contrast(fg, bg) < BODY_TEXT) return false;
    return true;
  };
  {
    const soft = p.accent2Soft!;
    const s = solveLightness(p.accent2!, dark ? 1 : -1, (hex) => {
      const t = { ...tokens(), "primary-text": hex };
      const washes = [t.background, t.card, t.muted].map((surface) => over(soft, surface));
      const [r, g, b] = rgba(hex);
      return primaryTextSurfaces(t).every(([, bed]) => holds(hex, bed, BRAND_TEXT))
        && washes.every((bed) => holds(hex, bed, BRAND_TEXT))
        && (["background", "card", "popover", "muted"] as const).every((key) => holds(compositeRgba([r, g, b, 0.9], t[key]), t[key], BRAND_TEXT));
    });
    put("primary-text", s.hex, "solved", `DF accent2, ${s.steps} lightness steps to ${BRAND_TEXT}:1 on every painted bed and its wash, and at the 0.9 hover`, s.css);
  }
  {
    const s = solveLightness(p.neg!, dark ? 1 : -1, (hex) => {
      const t = { ...tokens(), "destructive-text": hex };
      const washes = [t.background, t.card, t.muted].map((surface) => over(p.negSoft!, surface));
      // A state whose text does not read `destructive-text` (a menu's fixed red) is the
      // skin's own constant: test/text-contrast.test.tsx checks it, no token can move it.
      const probe = destructiveStates({ ...t, "destructive-text": "#000000" });
      return destructiveStates(t).every(({ text, fill }, i) => JSON.stringify(text) === JSON.stringify(probe[i]!.text) || holds(text, fill, BODY_TEXT))
        && washes.every((bed) => holds(hex, bed, BODY_TEXT));
    });
    put("destructive-text", s.hex, s.steps ? "solved" : "from", s.steps ? `DF neg, ${s.steps} lightness steps to ${BODY_TEXT}:1 on every painted bed, pressed state and its wash` : "DF neg", s.css);
  }
  return out;
}

const chartTokens = () => Object.fromEntries(CHART_SERIES.map((c, i) => [`chart-${i + 1}`, c]));

// DF has no chart palette. These eight series are anchored on DF hues (its violet, the
// promo teal and peach, the orb pink, mint's blue, the orb mint, the promo magenta, a
// gold), set dark enough to hold 3:1 on every card and inset surface of every palette.
// The order is the dataviz validator's (categorical, adjacent pairs, 2026-09-23): every
// neighbour clears the colorblind target (worst protan 11.9 against the 8 target) and
// the normal-vision floor (worst 15.2 against 15), and the first three series stay apart
// as a set (14.5), since most charts draw two or three. From five series on, the violet
// and the blue (chart-1 and chart-5) sit close even in full color (8.3), so a chart that
// wide relies on its legend and direct labels, as the dataviz rules require anyway.
export const CHART_SERIES = ["#7b6cf0", "#03919d", "#d36225", "#d25798", "#4382e3", "#009574", "#b560cf", "#a37e05"] as const;

export function deriveAll(): Record<PaletteName, DerivedPalette> {
  return { blush: derivePalette("blush"), mint: derivePalette("mint"), dark: derivePalette("dark") };
}

if (import.meta.main) {
  const table = { source: theme.source, chart: CHART_SERIES, palettes: deriveAll() };
  const text = `${JSON.stringify(table, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (readFileSync(TABLE, "utf8") !== text) {
      console.error("tools/darkfactory/tokens.json is stale against the rules; run `bun run df:tokens`.");
      process.exit(1);
    }
    console.log("df:tokens --check: tools/darkfactory/tokens.json matches the rules.");
  } else {
    writeFileSync(TABLE, text);
    for (const [name, palette] of Object.entries(table.palettes)) {
      console.log(`\n${name}`);
      for (const [role, d] of Object.entries(palette)) console.log(`  ${role.padEnd(24)} ${d.value.padEnd(28)} ${d.kind.padEnd(7)} ${d.source}`);
    }
  }
}
