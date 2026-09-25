import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, relative as relativePath } from "node:path";
import { Glob } from "bun";
import { ICON_STROKE_WIDTH } from "../src/atoms/icon/icon.stroke.ts";

// Design rules, source side: the handful that are properties of the code itself
// rather than of a token or a skin object.
//
// Each one is a defect that is easy to introduce, invisible in review, and cheap to
// detect: a font size too small to read, a z-index picked out of the air, a second
// icon stroke weight, an animation long enough to feel like a hang.
//
// Scope is src/**/*.ts(x). Markdown is excluded on purpose: a docs example is allowed
// to demonstrate the wrong thing inside a "Don't" fence, and one does (the Calendar
// page crams event titles into 7px slivers to show exactly why not).

const ROOT = join(import.meta.dir, "..");

const sources = [...new Glob("src/**/*.{ts,tsx}").scanSync(ROOT)]
  .filter((f) => !f.endsWith(".d.ts"))
  .sort()
  .map((file) => ({ file, text: readFileSync(join(ROOT, file), "utf8") }));

it("finds the kit source", () => {
  expect(sources.length).toBeGreaterThan(200);
});

describe("text stays legible", () => {
  // 10px is the floor the platforms themselves set: it is the iOS tab-bar label size
  // and sits just under Material's 12sp label-small. Below it a label stops being
  // readable at arm's length and starts being decoration. Markdown is out of scope on
  // purpose, since a docs example is allowed to demonstrate the wrong thing inside a
  // "Don't" fence, and the Calendar page does exactly that with 7px event slivers.
  const FLOOR = 10;

  it(`no rendered text is smaller than ${FLOOR}px`, () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/fontSize:\s*([\d.]+)/g)) {
          if (Number(m[1]) < FLOOR) offenders.push(`${file}:${i + 1} fontSize ${m[1]}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("tabular figures", () => {
  // react-native-web silently drops `fontVariant`, so the React Native spelling is a
  // no-op in a browser. src/style/numerals.ts is the one place that knows this; a raw
  // fontVariant anywhere else is a style that works on two platforms out of three.
  it("go through the helper, never the raw style prop", () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      if (file === "src/style/numerals.ts") continue;
      text.split("\n").forEach((line, i) => {
        if (/\bfontVariant\b/.test(line)) offenders.push(`${file}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("layering", () => {
  // The CSS hand-off documents a deliberately shallow scale (10 raised, 40 dropdown,
  // 50 overlay) and every in-tree layer uses it. The two exceptions are the portal
  // outlets, which are not on that scale at all: they are full-screen React Native
  // hosts that must sit above an app's own content, and they never coexist with a
  // CSS z-index. An arbitrary 9999 is the defect this keeps out.
  const ALLOWED = new Set([1, 10, 40, 50, 900, 1000]);
  const OUTLETS: Record<string, number> = {
    "src/style/portal.tsx": 1000,
    "src/organisms/drag-drop/drag-drop.shared.tsx": 900,
  };

  it("every z-index comes from the scale, or is a named portal outlet", () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/zIndex:\s*(\d+)/g)) {
          const value = Number(m[1]);
          if (!ALLOWED.has(value)) offenders.push(`${file}:${i + 1} zIndex ${value}`);
          if (value > 50 && OUTLETS[file] !== value) {
            offenders.push(`${file}:${i + 1} zIndex ${value} is above the scale but is not a declared outlet`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("one icon stroke", () => {
  it("is declared once and drawn nowhere else", () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      // Chart marks set their own stroke widths: a series line, an axis rule and a
      // pie separator are data, not iconography.
      if (file.startsWith("src/charts/")) continue;
      if (file === "src/atoms/icon/icon.stroke.ts") continue;
      text.split("\n").forEach((line, i) => {
        if (/strokeWidth[=:]\s*\{?\s*[\d.]/.test(line)) offenders.push(`${file}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("is the Lucide-matching weight the glyph set was drawn at", () => {
    expect(ICON_STROKE_WIDTH).toBe(1.75);
  });

  it("is what the raster generator bakes into the native menu glyphs", () => {
    // A native iOS UIMenu cannot render SVG, so tools/rastergen bakes PNGs. Those
    // glyphs sit beside live Icons in the same menu, so a second weight there would
    // be visible in the one place it is hardest to notice in review.
    const generator = readFileSync(join(ROOT, "tools", "rastergen", "generate.ts"), "utf8");
    expect(generator).toContain("ICON_STROKE_WIDTH");
    expect(generator).not.toMatch(/stroke-width="[\d.]/);
  });
});

describe("animation length", () => {
  // A transition under 100ms is a jump; over 700ms the interface feels like it is
  // waiting on something. Loops are a different thing entirely: a spinner revolution,
  // an indeterminate progress sweep and a caret's blink cycle are paced to read as
  // continuous motion, and a clock driver has no duration of its own.
  const LOOPS = new Set([
    "src/atoms/spinner/spinner.shared.tsx",
    "src/atoms/progress/progress.shared.tsx",
    "src/atoms/skeleton/skeleton.shared.tsx",
    "src/style/loop-native.ts",
  ]);

  it("every transition lands between 100ms and 700ms", () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      if (LOOPS.has(file)) continue;
      text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/duration:\s*(\d+)\b/g)) {
          const ms = Number(m[1]);
          if (ms < 100 || ms > 700) offenders.push(`${file}:${i + 1} duration ${ms}ms`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("every loop runs on the native driver and holds one timing", () => {
    // Under the New Architecture a JS-driven frame is a Fabric shadow-tree commit per
    // animated view, priced by the size of the whole tree, so a looping JS animation
    // saturates the JS thread of an idle screen (the docs app measured 150% CPU and rAF
    // near 3 frames per second before its loops moved to the native driver; see
    // src/style/motion.ts). A loop therefore gates its driver on supportsNativeDriver,
    // never a literal, and shapes its cycle with an easing: React Native refuses an
    // Animated.sequence inside a native loop and Animated.delay hardcodes the JS driver.
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      if (!text.includes("Animated.loop(")) continue;
      text.split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "");
        if (/useNativeDriver:\s*(true|false)\b/.test(code)) offenders.push(`${file}:${i + 1} literal driver flag in a looping file`);
        if (/Animated\.(sequence|delay|parallel|stagger)\(/.test(code)) offenders.push(`${file}:${i + 1} composite in a looping file`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("linear easing is reserved for the loops that need it", () => {
    // Linear on a transition reads mechanical; linear on a rotating spinner is the
    // only thing that keeps it from stuttering once per revolution.
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      if (LOOPS.has(file)) continue;
      if (text.includes("Easing.linear")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe("widths come from the parent", () => {
  // A component never renders AT a width of its own (src/style/sizing.ts): it is
  // FILL or HUG and the parent layout container provides the bounds. The pattern
  // this keeps out is the pre-layout-tier idiom `{ width: <px>, maxWidth: "100%" }`
  // on a component root (a fixed desktop width that shrinks in narrower parents),
  // which is how every field, dialog, and chart once defended itself against a
  // content-sized parent. The exceptions are the bounds providers themselves: the
  // shells that own a rail width (Sidebar, FilterPanel), whose width IS the layout.
  const SHELLS = new Set([
    "src/organisms/sidebar/sidebar.styles.ts",
    "src/organisms/filter-panel/filter-panel.styles.ts",
  ]);

  it("no component renders at a fixed width capped at 100%", () => {
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      if (SHELLS.has(file)) continue;
      text.split("\n").forEach((line, i) => {
        if (/\bwidth:(?!\s*"100%")[^,}]+,\s*maxWidth:\s*"100%"/.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("every numeric maxWidth in the kit is a step of the width scale", () => {
    const steps = new Set([192, 256, 320, 384, 448, 512, 576, 672, 768, 896, 1024, 1152, 1280]);
    const offenders: string[] = [];
    for (const { file, text } of sources) {
      text.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/maxWidth:\s*(\d+)/g)) {
          if (!steps.has(Number(m[1]))) offenders.push(`${file}:${i + 1} maxWidth ${m[1]}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
