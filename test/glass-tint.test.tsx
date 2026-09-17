import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup, waitFor, screen } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { SHEER_FILL_OPACITY, BRAND_TINT_ALPHA, surfaceUnderFill, surfaceIntensity, type GlassLayer } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { glassByScheme, lightColors, darkColors, brandColors } from "../src/style/tokens.ts";

// The glass material's UNDER-FILL: the layer painted beneath the lens/frost/Liquid Glass
// so a near-clear material still has a body.
//
// The bug this file pins: that fill used to be the semantic `popover` token, which the
// theme swapped translucent whenever glass turned on. One token therefore carried two
// unrelated jobs, so the opacity of a dropdown menu and the opacity of the navbar could
// not be set independently, and every popover-filled surface went see-through together.
// The material owns `glass-tint` now; `popover` is opaque in every mode.
//
// The under-fill only renders on a MATERIAL path, and with the expo peers stubbed the one
// material reachable in this DOM is the Chromium web LENS, so these tests override the
// user agent the way glass-lens.test.tsx does. Layer order inside the clip box is
// under-fill, lens, specular rim, then the content.

afterEach(cleanup);

// Restore by deleting the own property: the real getter lives on the prototype.
function overrideUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  return () => {
    delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
  };
}

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// react-native-web emits an rgba() color verbatim, so a token's own string is the exact
// substring to look for, and the assertions below read from the token layer rather than
// restating a literal. `#ffffff` normalizes to this fully opaque form.
const LIGHT_TINT = glassByScheme.light["glass-tint"];
const DARK_TINT = glassByScheme.dark["glass-tint"];
const OPAQUE_WHITE = "rgba(255, 255, 255, 1.00)";

function mockMatchMedia(matching: (query: string) => boolean) {
  return spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matching(query),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => true,
      }) as unknown as MediaQueryList,
  );
}

// The material's first layer: the under-fill, inside the clip box of the two-box glass
// structure. Returns null when no material rendered at all (a degraded or solid surface).
async function underFillOf(testID: string): Promise<HTMLElement | null> {
  let fill: HTMLElement | null = null;
  await waitFor(() => {
    const outer = screen.getByTestId(testID) as HTMLElement;
    const clip = outer.firstElementChild as HTMLElement | null;
    fill = (clip?.firstElementChild as HTMLElement | null) ?? null;
    expect(clip).not.toBeNull();
  });
  return fill;
}

// A skin-shaped surface: the skin paints its own opaque fill, which GlassSurface strips
// and replaces with the material. Exactly what every real overlay/bar skin hands over.
function Panel({ testID, tint, sheer, layer, brand }: { testID: string; tint?: string; sheer?: boolean; layer?: GlassLayer; brand?: string }) {
  return (
    <GlassSurface testID={testID} style={{ backgroundColor: lightColors.popover, borderRadius: 12 }} tint={tint} sheer={sheer} layer={layer} brand={brand}>
      <Text>panel</Text>
    </GlassSurface>
  );
}

// sRGB helpers for the legibility checks below: composite an rgba tint over an opaque
// hex, then WCAG contrast between two opaque colours.
function rgbaOf(value: string): [number, number, number, number] {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])];
  const h = value.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
}
function over(tint: string, base: string): [number, number, number] {
  const [r, g, b, a] = rgbaOf(tint);
  const [br, bg, bb] = rgbaOf(base);
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];
}
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const rgb = (hex: string): [number, number, number] => { const [r, g, b] = rgbaOf(hex); return [r, g, b]; };

describe("GlassSurface under-fill", () => {
  it("paints the light scheme's glass-tint, NOT the popover token", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider light glass>
          <Panel testID="light-gs" />
        </ThemeProvider>,
      );
      const fill = await underFillOf("light-gs");
      const style = fill!.getAttribute("style") ?? "";
      // rgba(255, 255, 255, 0.20): white at a fifth alpha, the hand-off's --glass-tint.
      expect(style).toContain(`background-color: ${LIGHT_TINT}`);
      // The old behavior painted the swapped popover at 0.72 here, and the skin's own
      // opaque #ffffff is what the material replaces. Neither may reappear.
      expect(style).not.toContain("0.72");
      expect(style).not.toContain(OPAQUE_WHITE);
    } finally {
      restore();
    }
  });

  it("paints the dark scheme's dimmer glass-tint", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider dark glass>
          <Panel testID="dark-gs" />
        </ThemeProvider>,
      );
      const fill = await underFillOf("dark-gs");
      // rgba(22, 22, 28, 0.30): Apple's dark material is dimmer, not brighter.
      expect(fill!.getAttribute("style") ?? "").toContain(`background-color: ${DARK_TINT}`);
    } finally {
      restore();
    }
  });

  it("takes those tints from the token layer, which is not the popover token", async () => {
    // The two renders above assert against LIGHT_TINT / DARK_TINT, so this is what pins
    // those to the published values, and to being something other than popover.
    expect(LIGHT_TINT).toBe("rgba(255, 255, 255, 0.20)");
    expect(DARK_TINT).toBe("rgba(22, 22, 28, 0.30)");
    expect(LIGHT_TINT).not.toBe(lightColors.popover);
    expect(DARK_TINT).not.toBe(darkColors.popover);
  });

  it("still lets an explicit tint win (the Slider's bright Liquid Glass knob)", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider dark glass>
          <Panel testID="tinted-gs" tint="#ffffff" />
        </ThemeProvider>,
      );
      const fill = await underFillOf("tinted-gs");
      const style = fill!.getAttribute("style") ?? "";
      // The knob stays bright white on dark, where the material's own tint is near-black.
      expect(style).toContain(`background-color: ${OPAQUE_WHITE}`);
      expect(style).not.toContain(DARK_TINT);
    } finally {
      restore();
    }
  });

  it("thins the tint on a sheer surface instead of dropping it", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider light glass>
          <Panel testID="sheer-gs" sheer />
        </ThemeProvider>,
      );
      const fill = await underFillOf("sheer-gs");
      const style = fill!.getAttribute("style") ?? "";
      expect(style).toContain(`background-color: ${LIGHT_TINT}`);
      expect(style).toContain(`opacity: ${SHEER_FILL_OPACITY}`);
    } finally {
      restore();
    }
  });

  it("paints no tint at all under Reduce Transparency (the surface goes opaque)", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    const spy = mockMatchMedia((q) => q.includes("prefers-reduced-transparency"));
    try {
      render(
        <ThemeProvider light glass>
          <Panel testID="rt-gs" />
        </ThemeProvider>,
      );
      await waitFor(() => {
        const node = screen.getByTestId("rt-gs") as HTMLElement;
        // PlainSurface: one box carrying the skin's own opaque popover fill, no
        // material layers, so nothing tinted and nothing backdrop-filtered.
        expect(node.getAttribute("style") ?? "").toContain(`background-color: ${OPAQUE_WHITE}`);
        expect(node.outerHTML).not.toContain(LIGHT_TINT);
        expect(node.querySelector("[style*='backdrop-filter']")).toBeNull();
      });
    } finally {
      spy.mockRestore();
      restore();
    }
  });

  it("paints no tint in SOLID mode: the skin's own opaque fill survives untouched", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider light solid>
          <Panel testID="solid-gs" />
        </ThemeProvider>,
      );
      await waitFor(() => {
        const node = screen.getByTestId("solid-gs") as HTMLElement;
        expect(node.getAttribute("style") ?? "").toContain(`background-color: ${OPAQUE_WHITE}`);
        expect(node.outerHTML).not.toContain(LIGHT_TINT);
      });
    } finally {
      restore();
    }
  });
});

// The LAYERED model: every surface renders through the material, and the layers differ
// by tint so nested glass reads as distinct planes and text keeps its floor on each.
describe("GlassSurface layers", () => {
  it("paints each layer's own tint, from the token layer", () => {
    for (const scheme of ["light", "dark"] as const) {
      const g = glassByScheme[scheme];
      expect(surfaceUnderFill(g, "functional")).toBe(g["glass-tint"]);
      expect(surfaceUnderFill(g, "content")).toBe(g["glass-tint-content"]);
      expect(surfaceUnderFill(g, "control")).toBe(g["glass-tint-control"]);
      expect(surfaceUnderFill(g, "dense")).toBe(g["glass-tint-dense"]);
      // Four distinct tints: a layer that shared another's would not read as its own plane.
      expect(new Set([g["glass-tint"], g["glass-tint-content"], g["glass-tint-control"], g["glass-tint-dense"]]).size).toBe(4);
    }
  });

  it("renders the content and dense tints on the material path", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider light glass>
          <Panel testID="content-gs" layer="content" />
          <Panel testID="dense-gs" layer="dense" />
          <Panel testID="control-gs" layer="control" />
        </ThemeProvider>,
      );
      expect((await underFillOf("content-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${glassByScheme.light["glass-tint-content"]}`);
      expect((await underFillOf("dense-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${glassByScheme.light["glass-tint-dense"]}`);
      expect((await underFillOf("control-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${glassByScheme.light["glass-tint-control"]}`);
    } finally {
      restore();
    }
  });

  it("orders the tints by density: functional < content < dense, and the control puck is the light one in dark", () => {
    const a = (v: string) => rgbaOf(v)[3];
    for (const scheme of ["light", "dark"] as const) {
      const g = glassByScheme[scheme];
      expect(a(g["glass-tint"])).toBeLessThan(a(g["glass-tint-content"]));
      expect(a(g["glass-tint-content"])).toBeLessThan(a(g["glass-tint-dense"]));
    }
    expect(rgbaOf(glassByScheme.dark["glass-tint-control"]).slice(0, 3)).toEqual([255, 255, 255]);
  });

  it("keeps foreground text at 4.5:1 on a content pane and a dense pane over the page AND over the brand aurora", () => {
    const aurora = [brandColors["orb-indigo"], brandColors["orb-violet"], brandColors["orb-cyan"]];
    for (const scheme of ["light", "dark"] as const) {
      const g = glassByScheme[scheme];
      const t = scheme === "light" ? lightColors : darkColors;
      for (const base of [t.background, ...aurora]) {
        for (const tint of [g["glass-tint-content"], g["glass-tint-dense"]]) {
          expect(contrast(over(tint, base), rgb(t.foreground)), `${scheme} foreground on ${tint} over ${base}`).toBeGreaterThanOrEqual(4.5);
        }
        // The muted label role keeps the large-text floor on a content pane over the page.
      }
      expect(contrast(over(g["glass-tint-content"], t.background), rgb(t["muted-foreground"]))).toBeGreaterThanOrEqual(3);
    }
  });

  it("a brand puck carries the primary-foreground ink at 4.5:1 over the page in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const t = scheme === "light" ? lightColors : darkColors;
      const fill = surfaceUnderFill(glassByScheme[scheme], "control", t.primary);
      expect(fill).toContain(`${BRAND_TINT_ALPHA}`);
      expect(contrast(over(fill, t.background), rgb(t["primary-foreground"]))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("blurs a content pane a touch less than the functional layer, and a sheer surface least", () => {
    expect(surfaceIntensity("content", false)).toBeLessThan(surfaceIntensity("functional", false));
    expect(surfaceIntensity("control", false)).toBe(surfaceIntensity("functional", false));
    expect(surfaceIntensity("content", true)).toBeLessThan(surfaceIntensity("content", false));
  });
});

