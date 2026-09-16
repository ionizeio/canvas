import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  blockDeclarations,
  declarationsIn,
  parseFontShorthand,
  platformBlocks,
  platformValue,
  pxValue,
  resolveVars,
  rgbaAlphas,
  shadowLayers,
  type PlatformKey,
} from "../tools/tokens/css-tokens.ts";
import { breakpoints, fieldWidths, radius, spacing, widths } from "../src/style/tokens.ts";

// Design rules, CSS side: the web hand-off under styles/tokens.
//
// This layer is a TRANSCRIPTION of the kit (the skins are the implementation; the CSS
// exists so a web surface and the design-system mirror can paint the same three looks),
// and a transcription with no test drifts. It already had: an iOS Stats and EmptyState
// fragment sat inside the WEB block, silently overriding the web values declared a few
// lines above, and setting --p-min-target to 44px on the one platform whose minimum is 0.
// Both blocks still resolved to plausible numbers, so nothing anywhere failed.

const STYLES = join(import.meta.dir, "..", "styles", "tokens");
const read = (name: string) => readFileSync(join(STYLES, `${name}.css`), "utf8");

const platformsCss = read("platforms");
const blocks = platformBlocks(platformsCss);
const PLATFORMS: PlatformKey[] = ["web", "ios", "android"];

describe("the platform blocks", () => {
  // A custom property declared twice in one block is never a style choice: the second
  // silently replaces the first, so the earlier value is dead while whoever wrote it
  // believes it is live. That is exactly how the iOS fragment hid inside the web block.
  for (const platform of PLATFORMS) {
    it(`${platform} declares each custom property once`, () => {
      expect(blocks[platform].present, `no ${platform} block found`).toBe(true);
      expect(blocks[platform].duplicates).toEqual([]);
    });
  }

  it("web declares no minimum touch target, and the two native platforms declare theirs", () => {
    // Pointer targets are visual-sized on the web; HIG is 44pt and Material 3 is 48dp.
    expect(pxValue(platformValue(blocks, "web", "p-min-target"))).toBe(0);
    expect(pxValue(platformValue(blocks, "ios", "p-min-target"))).toBe(44);
    expect(pxValue(platformValue(blocks, "android", "p-min-target"))).toBe(48);
  });
});

describe("nested corners", () => {
  // A nested surface with a LARGER corner than the container it sits flush inside
  // reads as a mistake: the container's corner cuts the inner one. Only pairs that
  // actually sit flush are listed. Deliberately absent: the iOS action sheet's
  // capsule rows inside their 34pt container (iOS 26 detaches and insets them, so
  // the corners never meet) and the accordion card, whose container radius is 0 on
  // web and Android because there is no container.
  const NESTED: [string, string, string][] = [
    ["menu row", "p-menu-row-radius", "p-menu-radius"],
    ["select row", "p-select-row-radius", "p-select-panel-radius"],
    ["autocomplete row", "p-ac-row-radius", "p-ac-menu-radius"],
    ["one-time-code cell", "p-otp-inner-radius", "p-otp-radius"],
    ["segmented thumb", "p-seg-inner-radius", "p-seg-radius"],
    ["tab pill", "p-tab-pill-radius", "p-tab-pill-track-radius"],
    ["slider thumb", "p-slider-thumb-radius", "p-slider-track-radius"],
    ["board card", "p-board-card-radius", "p-board-col-radius"],
  ];

  for (const [label, inner, outer] of NESTED) {
    for (const platform of PLATFORMS) {
      it(`${platform}: the ${label} is no rounder than what contains it`, () => {
        const innerPx = pxValue(platformValue(blocks, platform, inner));
        const outerPx = pxValue(platformValue(blocks, platform, outer));
        expect(innerPx, `--${inner}`).not.toBeNull();
        expect(outerPx, `--${outer}`).not.toBeNull();
        expect(innerPx as number).toBeLessThanOrEqual(outerPx as number);
      });
    }
  }
});

describe("elevation in the hand-off", () => {
  const shadowsCss = read("shadows");
  const rootShadows = declarationsIn(shadowsCss, ":root");

  // Every shadow the hand-off ships, from the ladder and from the per-OS skins.
  // Scrims are excluded by name: a scrim is a deliberate blackout behind a modal,
  // not an elevation cue, and the specular highlight is part of the glass material.
  const everyShadow = (): [string, string][] => {
    const out: [string, string][] = Object.entries(rootShadows)
      .filter(([name]) => name.startsWith("shadow"))
      .map(([name, value]) => [name, value]);
    for (const platform of PLATFORMS) {
      for (const [name, value] of Object.entries(blocks[platform].decls)) {
        if (!name.endsWith("-shadow") && !name.includes("-shadow-")) continue;
        if (name.includes("scrim") || name.includes("specular")) continue;
        out.push([`${platform} --${name}`, value]);
      }
    }
    return out;
  };

  for (const [name, value] of everyShadow()) {
    it(`${name} is a diffuse shade cast from above`, () => {
      for (const alpha of rgbaAlphas(value)) {
        // Heavier than this and the shadow reads as a border, which is the "harsh
        // dark drop shadow" defect rather than depth.
        expect(alpha, `${name} alpha`).toBeLessThanOrEqual(0.2);
      }
      for (const layer of shadowLayers(value)) {
        if (layer.inset) continue;
        // One light source across the whole system: no horizontal offset, and the
        // shade always falls downward.
        expect(layer.x, `${name} x offset`).toBe(0);
        expect(layer.y, `${name} y offset`).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it("the ladder matches the shadow() the components spread", async () => {
    const { shadow } = await import("../src/style/shadow.ts");
    const pairs: [string, string][] = [
      ["shadow-none", "none"],
      ["shadow-sm", "sm"],
      ["shadow", "DEFAULT"],
      ["shadow-md", "md"],
      ["shadow-lg", "lg"],
      ["shadow-xl", "xl"],
    ];
    const flat = (v: string) => v.replace(/\s+/g, "");
    for (const [token, level] of pairs) {
      const js = (shadow(level as never) as { boxShadow?: string }).boxShadow ?? "";
      expect(flat(rootShadows[token] ?? ""), `--${token}`).toBe(flat(js));
    }
  });
});

describe("one neutral family", () => {
  // Mixing a warm gray with a cool one in the same interface is the defect; every
  // neutral here should sit on one hue with almost no chroma. The chromatic tokens
  // (primary, destructive, success, warning, ring) are intents and are excluded, as
  // are the chart series and the brand orbs.
  const colorsCss = read("colors");
  const NEUTRALS = [
    "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
    "secondary", "secondary-foreground", "muted", "muted-foreground", "accent",
    "accent-foreground", "border", "input",
  ];

  for (const scheme of [":root", ".dark"] as const) {
    const decls = declarationsIn(colorsCss, scheme);
    const parsed = NEUTRALS.map((name) => {
      const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec((decls[name] ?? "").trim());
      return m ? { name, chroma: Number(m[2]), hue: Number(m[3]) } : null;
    }).filter((v): v is { name: string; chroma: number; hue: number } => v !== null);

    it(`${scheme} neutrals carry almost no chroma`, () => {
      expect(parsed.length).toBeGreaterThan(8);
      for (const { name, chroma } of parsed) {
        expect(chroma, `--${name}`).toBeLessThanOrEqual(0.02);
      }
    });

    it(`${scheme} neutrals share one hue`, () => {
      // A zero-chroma value has no meaningful hue, so it says nothing either way.
      const hues = parsed.filter((p) => p.chroma > 0).map((p) => p.hue).sort((a, b) => a - b);
      expect(hues.length).toBeGreaterThan(4);
      const median = hues[Math.floor(hues.length / 2)];
      for (const hue of hues) expect(Math.abs(hue - median)).toBeLessThanOrEqual(6);
    });
  }
});

describe("motion", () => {
  const motionCss = read("motion");
  // declarationsIn takes the FIRST :root block, which is the base one; the
  // prefers-reduced-motion override below it zeroes these on purpose.
  const decls = declarationsIn(motionCss, ":root");

  for (const [name, value] of Object.entries(decls).filter(([n]) => n.startsWith("duration-"))) {
    it(`--${name} is long enough to read and short enough not to wait on`, () => {
      const ms = Number(/^([\d.]+)ms$/.exec(value.replace(/\/\*[\s\S]*?\*\//g, "").trim())?.[1]);
      // Under 100ms a transition is a jump; over 700ms the interface feels slow.
      expect(ms).toBeGreaterThanOrEqual(100);
      expect(ms).toBeLessThanOrEqual(700);
    });
  }

  for (const [name, value] of Object.entries(decls).filter(([n]) => n.startsWith("ease-"))) {
    it(`--${name} is a real curve, not linear`, () => {
      expect(value.replace(/\/\*[\s\S]*?\*\//g, "").trim()).toMatch(/^cubic-bezier\(/);
    });
  }

  it("the press dim is visible without being a blackout", () => {
    for (const name of ["press-opacity", "press-opacity-ios"]) {
      const value = Number(decls[name]?.replace(/\/\*[\s\S]*?\*\//g, "").trim());
      expect(value, `--${name}`).toBeGreaterThanOrEqual(0.6);
      expect(value, `--${name}`).toBeLessThanOrEqual(0.95);
    }
  });

  it("reduced motion zeroes every duration", () => {
    // Non-essential motion is dropped entirely rather than merely shortened.
    const reduced = motionCss.slice(motionCss.indexOf("prefers-reduced-motion"));
    for (const name of Object.keys(decls).filter((n) => n.startsWith("duration-"))) {
      expect(reduced, `--${name}`).toContain(`--${name}:0ms`);
    }
  });
});

describe("type", () => {
  const typeCss = read("typography");
  const decls = declarationsIn(typeCss, ":root");
  const role = (name: string) => parseFontShorthand(resolveVars(decls[`role-${name}`] ?? "", decls));

  it("body copy never drops below 14px", () => {
    // The floor every mobile-aware guideline agrees on; below it, body text stops
    // being comfortably readable on a phone.
    expect(role("body").size).toBeGreaterThanOrEqual(14);
    expect(role("small").size).toBeGreaterThanOrEqual(14);
    expect(role("lead").size).toBeGreaterThanOrEqual(14);
  });

  it("even the smallest role stays legible", () => {
    expect(role("tiny").size).toBeGreaterThanOrEqual(12);
  });

  it("headings lead tighter than body copy", () => {
    const ratio = (name: string) => (role(name).lineHeight as number) / (role(name).size as number);
    for (const heading of ["display", "h1", "h2", "h3", "h4"]) {
      expect(ratio(heading), heading).toBeLessThan(ratio("body"));
      expect(ratio(heading), heading).toBeGreaterThanOrEqual(1);
    }
    expect(ratio("body")).toBeGreaterThanOrEqual(1.4);
  });

  it("the middle of the weight ladder exists", () => {
    expect(decls["weight-medium"]?.trim()).toBe("500");
    expect(decls["weight-semibold"]?.trim()).toBe("600");
  });
});

describe("the scales agree with src/style/tokens.ts", () => {
  const spacingCss = read("spacing");
  const radiusCss = read("radius");
  const spacingDecls = declarationsIn(spacingCss, ":root");
  const radiusDecls = declarationsIn(radiusCss, ":root");

  it("every spacing step matches", () => {
    for (const [name, value] of Object.entries(spacing)) {
      // "0.5" is spelled --space-0-5, since a dot cannot appear in a property name.
      const token = `space-${name.replace(".", "-")}`;
      expect(pxValue(spacingDecls[token]), `--${token}`).toBe(value);
    }
  });

  it("every radius step matches", () => {
    for (const [name, value] of Object.entries(radius)) {
      const token = name === "DEFAULT" ? "radius" : `radius-${name}`;
      expect(pxValue(radiusDecls[token]), `--${token}`).toBe(value);
    }
  });

  it("the field widths match", () => {
    for (const [name, value] of Object.entries(fieldWidths)) {
      expect(pxValue(spacingDecls[`field-${name}`]), `--field-${name}`).toBe(value);
    }
  });

  it("the breakpoints match", () => {
    for (const [name, value] of Object.entries(breakpoints)) {
      expect(pxValue(spacingDecls[`bp-${name}`]), `--bp-${name}`).toBe(value);
    }
  });

  it("the width scale matches", () => {
    for (const [name, value] of Object.entries(widths)) {
      expect(pxValue(spacingDecls[`width-${name}`]), `--width-${name}`).toBe(value);
    }
  });

  it("the platform touch-target minimums are the platform minimums", () => {
    expect(pxValue(spacingDecls["target-ios"])).toBe(44);
    expect(pxValue(spacingDecls["target-android"])).toBe(48);
  });

  it("a control is tighter than the card it sits on, on every platform", () => {
    expect(pxValue(radiusDecls["radius-control"]) as number).toBeLessThan(
      pxValue(radiusDecls["radius-card"]) as number,
    );
    expect(pxValue(radiusDecls["radius-control-ios"]) as number).toBeLessThan(
      pxValue(radiusDecls["radius-card-ios"]) as number,
    );
  });
});

describe("the z-index scale", () => {
  const spacingDecls = declarationsIn(read("spacing"), ":root");
  it("is shallow and ordered", () => {
    const raised = Number(spacingDecls["z-raised"]?.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    const dropdown = Number(spacingDecls["z-dropdown"]?.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    const overlay = Number(spacingDecls["z-overlay"]?.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    expect(raised).toBeLessThan(dropdown);
    expect(dropdown).toBeLessThan(overlay);
    // Arbitrary numbers like 9999 are the defect this guards against.
    expect(overlay).toBeLessThanOrEqual(100);
  });
});

describe("platforms.css stays parseable", () => {
  it("has a block for each platform with a substantial set of declarations", () => {
    for (const platform of PLATFORMS) {
      const count = Object.keys(blocks[platform].decls).length;
      expect(count, `${platform} declarations`).toBeGreaterThan(400);
    }
  });

  it("declares nothing outside the three platform blocks", () => {
    // A --p-* declared at the top level would apply to every platform while looking
    // like it belonged to one.
    const outside = blockDeclarations(platformsCss, ":root");
    expect(outside.present && Object.keys(outside.decls).length > 0 ? "found a bare :root block" : "ok").toBe("ok");
  });
});
