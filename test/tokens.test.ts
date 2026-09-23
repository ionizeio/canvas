import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { CSSMediaRule, CSSStyleRule, Window } from "happy-dom";
import { lightColors, darkColors, colorsByScheme, glassByScheme, brandColors, palette } from "../src/style/tokens.ts";
import { WEB_FROST, WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { statusHues } from "../src/style/status-hue.ts";

const REQUIRED = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "muted",
  "muted-foreground",
  "accent",
  "destructive",
  "border",
  "input",
  "ring",
] as const;

describe("color tokens", () => {
  it("light and dark define every required token as a string", () => {
    for (const k of REQUIRED) {
      expect(typeof lightColors[k]).toBe("string");
      expect(typeof darkColors[k]).toBe("string");
    }
  });

  it("light and dark use distinct surface + text colors", () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.foreground).not.toBe(darkColors.foreground);
    expect(lightColors.primary).not.toBe(darkColors.primary);
  });

  it("colorsByScheme maps each scheme to its token set", () => {
    expect(colorsByScheme.light.background).toBe(lightColors.background);
    expect(colorsByScheme.dark.background).toBe(darkColors.background);
  });

  it("defines the eight categorical chart tokens in both schemes", () => {
    for (let i = 1; i <= 8; i++) {
      const key = `chart-${i}` as const;
      expect(lightColors[key]).toMatch(/^#[0-9a-f]{6}$/);
      expect(darkColors[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keeps series colors distinct and off the reserved status tokens", () => {
    for (const colors of [lightColors, darkColors]) {
      const series = Array.from({ length: 8 }, (_, i) => colors[`chart-${i + 1}` as keyof typeof colors]);
      // No duplicate slots: identity encoding needs eight distinct hues.
      expect(new Set(series).size).toBe(8);
      // Status colors are reserved for state, never reused as series identity.
      for (const status of [colors.destructive, colors.success, colors.warning]) {
        expect(series).not.toContain(status);
      }
    }
  });
});

describe("brandColors", () => {
  it("defines the three orb constants as lowercase hexes", () => {
    for (const key of ["orb-indigo", "orb-violet", "orb-cyan"] as const) {
      expect(brandColors[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("does not flip with the scheme, so it stays out of the light/dark token sets", () => {
    // A brand mark is one mark: it must not be reachable as a scheme-aware token.
    for (const key of Object.keys(brandColors)) {
      expect(lightColors).not.toHaveProperty(key);
      expect(darkColors).not.toHaveProperty(key);
    }
  });
});

describe("statusHues", () => {
  it("maps each semantic status tone to a palette hue family", () => {
    expect(statusHues).toEqual({ success: "green", warning: "amber", error: "red", info: "blue" });
  });

  it("names hues that exist at every step Alert and Badge reach for", () => {
    // Alert: 50/200 + 600/700/800 in light, 950/800 + 200/300/400 in dark.
    // Badge: the same pill surfaces, a 700/400 label, and a saturated 500 dot.
    const steps = [50, 200, 300, 400, 500, 600, 700, 800, 950];
    for (const hue of Object.values(statusHues)) {
      for (const step of steps) {
        expect(palette[`${hue}-${step}`]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe("glassByScheme and WEB_TINTS (the glass material's own tokens)", () => {
  it("gives the material its own rgba fill in each scheme", () => {
    // The native set: iOS Liquid Glass and frost and the Android blur read it, unchanged
    // since the web took Dark Factory's frost. The web's set is WEB_TINTS, which the CSS
    // hand-off carries (checked against the shipped stylesheet below, and by
    // scripts/validate-tokens.ts).
    expect(glassByScheme.light["glass-tint"]).toBe("rgba(255, 255, 255, 0.20)");
    expect(glassByScheme.dark["glass-tint"]).toBe("rgba(22, 22, 28, 0.30)");
    for (const scheme of ["light", "dark"] as const) {
      for (const tint of Object.values(WEB_TINTS[scheme])) expect(tint).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/);
    }
  });

  it("overrides NO semantic token, so a dense menu and a sheer bar are independent", () => {
    // The regression this shape exists to prevent: glass used to swap `popover`
    // translucent, so every popover-filled surface (menus, select lists, alert
    // dialogs) went see-through the moment glass turned on, and densifying one of
    // them would have densified the bars with it. The material carries its own
    // fills now, one per layer; the semantic set is untouched.
    for (const tints of [glassByScheme, WEB_TINTS]) {
      for (const scheme of ["light", "dark"] as const) {
        // One tint per LAYER of the glass model (functional, content, control, dense),
        // and nothing that names a semantic surface.
        expect(Object.keys(tints[scheme])).toEqual(["glass-tint", "glass-tint-content", "glass-tint-control", "glass-tint-dense"]);
        expect(tints[scheme]).not.toHaveProperty("popover");
        expect(tints[scheme]).not.toHaveProperty("card");
      }
    }
    // popover and card stay opaque in both schemes, exactly as the hand-off ships them.
    for (const colors of [lightColors, darkColors]) {
      expect(colors.popover).toMatch(/^#[0-9a-f]{6}$/);
      expect(colors.card).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keys the family by its CSS custom-property name, so the hand-off stays cross-checked", () => {
    // scripts/validate-tokens.ts matches these keys against `--<name>` in
    // styles/tokens/colors.css; a key renamed to a JS-style one would silently
    // drop out of that check, which is how the two layers drift.
    for (const tints of [glassByScheme, WEB_TINTS]) {
      for (const scheme of ["light", "dark"] as const) {
        for (const key of Object.keys(tints[scheme])) expect(key).toMatch(/^glass-[a-z-]+$/);
      }
    }
  });
});

describe("CSS material handoff fallbacks", () => {
  // Parse the shipping stylesheets through CSSOM. Resolve their real aliases so
  // an omitted layer cannot pass by checking just the first tint or blur token.
  const cssWindow = new Window();
  const sheet = new cssWindow.CSSStyleSheet();
  sheet.replaceSync(["colors", "shadows", "surface"].map((name) =>
    readFileSync(new URL(`../styles/tokens/${name}.css`, import.meta.url), "utf8"),
  ).join("\n"));

  function materialValues(dark: boolean, media?: string) {
    const values = new Map<string, string>();
    const apply = (rule: CSSStyleRule) => {
      for (let i = 0; i < rule.style.length; i++) {
        const key = rule.style.item(i);
        values.set(key, rule.style.getPropertyValue(key).trim());
      }
    };
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSStyleRule && [":root", ...(dark ? [".dark"] : []), '[data-surface="glass"]'].includes(rule.selectorText)) apply(rule);
      if (rule instanceof CSSMediaRule && rule.conditionText === media) {
        for (const nested of rule.cssRules) {
          if (nested instanceof CSSStyleRule && nested.selectorText === '[data-surface="glass"]') apply(nested);
        }
      }
    }
    function resolve(key: string, seen = new Set<string>()): string {
      if (seen.has(key)) throw new Error(`Circular CSS token: ${key}`);
      seen.add(key);
      const value = values.get(key);
      if (value === undefined) throw new Error(`Missing CSS token: ${key}`);
      return value.replace(/var\((--[a-z-]+)\)/g, (_, alias: string) => resolve(alias, new Set(seen)));
    }
    return resolve;
  }

  // An rgba() colour's four channels, so the stylesheet's spelling (no spaces) and the
  // JS tables' (spaced) compare as values.
  const channels = (value: string) => (/^rgba\(([^)]*)\)$/.exec(value)?.[1] ?? "").split(",").map(Number);

  for (const dark of [false, true]) {
    const scheme = dark ? "dark" : "light";
    it(`retains translucent ${scheme} material when no fallback is active`, () => {
      const value = materialValues(dark);
      // The hand-off is the WEB material: Dark Factory's frost, whose table is web-frost.ts.
      for (const [tint, fill] of Object.entries(WEB_TINTS[scheme])) {
        expect(value(`--${tint}`)).toMatch(/^rgba\(.+,0\.\d+\)$/);
        expect(channels(value(`--${tint}`))).toEqual(channels(fill));
      }
      // One blur with no saturation shift.
      expect(value("--glass-blur")).toBe(`${WEB_FROST.blur}px`);
      expect(value("--glass-frost")).toBe(`blur(${WEB_FROST.blur}px)`);
      // The lens is gone: its token is a deprecated alias of the frost, and the
      // illumination it drew went with it.
      expect(value("--glass-lens")).toBe(value("--glass-frost"));
      expect(value("--glass-illumination")).toBe("none");
      // The rim is one inset hairline in Dark Factory's shell line, no specular highlight.
      expect(channels(value("--glass-edge"))).toEqual(channels(WEB_FROST.shellLine[scheme]));
      expect(value("--glass-specular")).toBe(`inset 0 0 0 ${WEB_FROST.rimWidth}px ${value("--glass-edge")}`);
      // The page behind the frost is the app's own: the kit ships no backdrop.
      expect(value("--surface-backdrop")).toBe("none");
    });

    for (const media of ["(prefers-reduced-transparency:reduce)", "(prefers-contrast:more)", "print"]) {
      it(`restores every ${scheme} material layer to an opaque skin for ${media}`, () => {
        const value = materialValues(dark, media);
        for (const tint of Object.keys(WEB_TINTS[scheme])) {
          const fill = value(`--${tint}`);
          expect([value("--card"), value("--popover")]).toContain(fill);
          expect(fill).toMatch(/^oklch\([^/]+\)$/);
        }
        for (const effect of ["--glass-frost", "--glass-lens", "--glass-illumination"]) expect(value(effect)).toBe("none");
        expect([value("--border"), value("--input")]).toContain(value("--glass-edge"));
        expect(value("--glass-specular")).toBe(media === "print" ? "none" : value("--shadow-lg"));
        if (media === "print") expect(value("--surface-backdrop")).toBe("none");
        // Material fallback must not recolor the content placed above it.
        expect(value("--foreground")).toBe(materialValues(dark)("--foreground"));
      });
    }
  }
});

/**
 * WCAG 2.2 SC 1.4.11 (Non-text Contrast) holds "visual information required to
 * identify user interface components" to 3:1 against adjacent colour. In this
 * token set that clause lands squarely on `input`: it is the boundary the
 * unfilled controls draw themselves with (the outline Button, the text fields,
 * checkbox, radio, the switch track, select, autocomplete, pagination), and for
 * several of them it is the ONLY thing separating the control from the page.
 *
 * `border` is deliberately NOT held to the same floor. It separates two SURFACES
 * that differ in fill (a card edge, a divider, a table rule), so it is read
 * against that fill difference rather than on its own contrast.
 *
 * The regression this pins: `input` and `border` shipped the same hairline value
 * in both schemes, which put every unfilled control at 1.27:1 in light and
 * 1.34:1 in dark, i.e. a silhouette that disappeared into the page. Anyone
 * re-tuning `input` has to keep it above the floor for all three surfaces a
 * control sits on, not just the page.
 */
describe("control boundary contrast (WCAG 1.4.11)", () => {
  /** sRGB hex -> WCAG relative luminance. */
  function luminance(hex: string): number {
    const h = hex.replace("#", "");
    const channel = (i: number) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  }

  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  it("computes a known ratio, so a broken helper cannot pass the checks below", () => {
    // Black on white is the fixed 21:1 endpoint of the scale.
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  for (const scheme of ["light", "dark"] as const) {
    // Every surface a bordered control is placed on: the page, a card or popover,
    // and a muted/accent panel. The muted fill is the tightest of the three.
    it(`keeps \`input\` at 3:1 on every ${scheme} surface a control sits on`, () => {
      const t = colorsByScheme[scheme];
      for (const surface of [t.background, t.card, t.popover, t.muted, t.accent, t.secondary]) {
        expect(contrast(t.input, surface)).toBeGreaterThanOrEqual(3);
      }
    });

    it(`keeps the ${scheme} switch thumb readable against its unchecked track`, () => {
      // The web switch paints an unchecked track with `input` and the thumb with
      // `background`, so the thumb-on-track pair is a second consumer of the same
      // floor: it is the only thing that shows the switch is off.
      const t = colorsByScheme[scheme];
      expect(contrast(t.background, t.input)).toBeGreaterThanOrEqual(3);
    });
  }

  it("`field-border` is the field's resting hairline: between `border` and `input`, below the floor on purpose", () => {
    // A text field rests on Dark Factory's line densified until the box reads apart
    // from a divider (tools/darkfactory/derive-tokens.ts), a disclosed WCAG 1.4.11
    // trade-off scoped to the field skins (src/style/field-colors.ts). It must stay
    // distinct from both neighbours: collapsing it onto `input` would re-heavy the box,
    // collapsing it onto `border` would make the box vanish on the card.
    for (const t of [lightColors, darkColors]) {
      const rest = t["field-border"]!;
      expect(rest).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrast(rest, t.card)).toBeLessThan(3);
      expect(contrast(rest, t.card)).toBeGreaterThan(contrast(t.border, t.card));
      expect(contrast(rest, t.card)).toBeLessThan(contrast(t.input, t.card));
    }
  });

  it("does NOT hold `border` to the control floor, keeping the separator hairline", () => {
    // Guards the split from the other side: someone "fixing" the contrast run
    // by collapsing border back onto input would coarsen every divider and card
    // edge in the kit. These are expected to stay well under 3:1.
    expect(contrast(lightColors.border, lightColors.background)).toBeLessThan(3);
    expect(contrast(darkColors.border, darkColors.background)).toBeLessThan(3);
    expect(lightColors.border).not.toBe(lightColors.input);
    expect(darkColors.border).not.toBe(darkColors.input);
  });
});
