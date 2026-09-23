import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup, waitFor, screen } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { BRAND_TINT_ALPHA, clearSurfaceTint, surfaceUnderFill, surfaceIntensity, type GlassLayer } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { glassTintsFor } from "../src/style/glass-surface/glass-tints.ts";
import { WEB_FROST, WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { glassByScheme, lightColors, darkColors, brandColors } from "../src/style/tokens.ts";
import { LOOKS } from "./fixtures/looks.ts";

// The glass material's UNDER-FILL: the layer painted beneath the frost or Liquid Glass
// so a near-clear material still has a body.
//
// The bug this file pins: that fill used to be the semantic `popover` token, which the
// theme swapped translucent whenever glass turned on. One token therefore carried two
// unrelated jobs, so the opacity of a dropdown menu and the opacity of the navbar could
// not be set independently, and every popover-filled surface went see-through together.
// The material owns `glass-tint` now; `popover` is opaque in every mode.
//
// The under-fill only renders on a MATERIAL path, and with the expo peers stubbed the one
// material reachable in this DOM is the web frost, which renders wherever the browser
// supports a CSS backdrop-filter (the test DOM's CSS.supports says it does). Layer order
// inside the clip box is under-fill, frost, hairline rim, then the content.
//
// The web renders the web frost's own tints (web-frost.ts, which the ThemeProvider
// publishes as `theme.glass` there); `glassByScheme` is the native set (iOS Liquid Glass
// and frost, the Android blur). The token-level checks below hold both sets.

afterEach(cleanup);

// The assertions below read from the token layer rather than restating a literal, and
// find a token's rendered form through `printed`. `#ffffff` normalizes to this fully
// opaque form.
const LIGHT_TINT = WEB_TINTS.light["glass-tint"];
const DARK_TINT = WEB_TINTS.dark["glass-tint"];
const OPAQUE_WHITE = "rgba(255, 255, 255, 1.00)";
// Both tint sets, for the checks that hold on every platform.
const TINT_SETS = [["web", WEB_TINTS], ["native", glassByScheme]] as const;

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
// GlassBox anatomy: the outer host, then the clip box, whose first child is the
// under-fill the layer tint paints.
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
function Panel({ testID, tint, sheer, layer, brand, clear }: { testID: string; tint?: string; sheer?: boolean; layer?: GlassLayer; brand?: string; clear?: boolean }) {
  return (
    <GlassSurface testID={testID} style={{ backgroundColor: lightColors.popover, borderRadius: 12 }} tint={tint} sheer={sheer} layer={layer} brand={brand} clear={clear}>
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
// A colour as react-native-web renders it: it stores the alpha as an 8-bit channel and
// prints it with two decimals, so white at 0.045 renders as rgba(255, 255, 255, 0.04).
function printed(value: string): string {
  const [r, g, b, a] = rgbaOf(value);
  return `rgba(${r}, ${g}, ${b}, ${(Math.round(a * 255) / 255).toFixed(2)})`;
}

describe("GlassSurface under-fill", () => {
  it("paints the light scheme's glass-tint, NOT the popover token", async () => {
    render(
      <ThemeProvider light glass>
        <Panel testID="light-gs" />
      </ThemeProvider>,
    );
    const fill = await underFillOf("light-gs");
    const style = fill!.getAttribute("style") ?? "";
    // rgba(255, 255, 255, 0.52): white at about half alpha, Dark Factory's shell and the
    // hand-off's --glass-tint.
    expect(style).toContain(`background-color: ${printed(LIGHT_TINT)}`);
    // The old behavior painted the swapped popover at 0.72 here, and the skin's own
    // opaque #ffffff is what the material replaces. Neither may reappear.
    expect(style).not.toContain("0.72");
    expect(style).not.toContain(OPAQUE_WHITE);
  });

  it("paints the dark scheme's own glass-tint", async () => {
    render(
      <ThemeProvider dark glass>
        <Panel testID="dark-gs" />
      </ThemeProvider>,
    );
    const fill = await underFillOf("dark-gs");
    // rgba(255, 255, 255, 0.045): Dark Factory's near-clear dark shell, printed at its
    // 8-bit alpha.
    expect(fill!.getAttribute("style") ?? "").toContain(`background-color: ${printed(DARK_TINT)}`);
  });

  it("takes those tints from the token layer, which is not the popover token", async () => {
    // The two renders above assert against LIGHT_TINT / DARK_TINT, so this is what pins
    // those to what the ThemeProvider publishes on the web (the web frost's table, which
    // the CSS hand-off carries; tokens.test.ts holds the two together), and to being
    // something other than popover.
    expect(glassTintsFor("light")["glass-tint"]).toBe(LIGHT_TINT);
    expect(glassTintsFor("dark")["glass-tint"]).toBe(DARK_TINT);
    expect(LIGHT_TINT).not.toBe(lightColors.popover);
    expect(DARK_TINT).not.toBe(darkColors.popover);
  });

  // Mint frosts over its own shell (Dark Factory's mint shell, white 0.58), and the one
  // dark palette keeps the dark frost whichever light palette was asked for.
  it("paints the mint palette's own shell tint, and the dark frost under dark mint", async () => {
    expect(glassTintsFor("light", "mint")).toBe(WEB_TINTS.mint);
    expect(glassTintsFor("dark", "mint")).toBe(WEB_TINTS.dark);
    render(
      <>
        <ThemeProvider mint glass><Panel testID="mint-gs" /></ThemeProvider>
        <ThemeProvider dark mint glass><Panel testID="dark-mint-gs" /></ThemeProvider>
      </>,
    );
    expect((await underFillOf("mint-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${printed(WEB_TINTS.mint["glass-tint"])}`);
    expect((await underFillOf("dark-mint-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${printed(DARK_TINT)}`);
  });

  it("still lets an explicit tint win (the Slider's bright Liquid Glass knob)", async () => {
    render(
      <ThemeProvider dark glass>
        <Panel testID="tinted-gs" tint="#ffffff" />
      </ThemeProvider>,
    );
    const fill = await underFillOf("tinted-gs");
    const style = fill!.getAttribute("style") ?? "";
    // The knob stays bright white on dark, where the material's own tint is near-clear.
    expect(style).toContain(`background-color: ${OPAQUE_WHITE}`);
    expect(style).not.toContain(printed(DARK_TINT));
  });

  it("thins only the static content tint on a sheer surface", async () => {
    render(
      <ThemeProvider light glass>
        <Panel testID="sheer-gs" sheer layer="content" />
      </ThemeProvider>,
    );
    const fill = await underFillOf("sheer-gs");
    const style = fill!.getAttribute("style") ?? "";
    expect(style).toContain(`background-color: ${printed(WEB_TINTS.light["glass-tint-content"])}`);
    expect(style).toContain(`opacity: ${WEB_FROST.sheerFillOpacity}`);
  });

  it("paints no tint at all under Reduce Transparency (the surface goes opaque)", async () => {
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
        expect(node.outerHTML).not.toContain(printed(LIGHT_TINT));
        expect(node.querySelector('[data-testid="glass-material"]')).toBeNull();
        expect(node.querySelector("[style*='backdrop-filter']")).toBeNull();
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("paints no tint in SOLID mode: the skin's own opaque fill survives untouched", async () => {
    render(
      <ThemeProvider light solid>
        <Panel testID="solid-gs" />
      </ThemeProvider>,
    );
    await waitFor(() => {
      const node = screen.getByTestId("solid-gs") as HTMLElement;
      expect(node.getAttribute("style") ?? "").toContain(`background-color: ${OPAQUE_WHITE}`);
      expect(node.outerHTML).not.toContain(printed(LIGHT_TINT));
    });
  });
});

// The LAYERED model: every surface renders through the material, and the layers differ
// by tint so nested glass reads as distinct planes and text keeps its floor on each.
describe("GlassSurface layers", () => {
  it("paints each layer's own tint, from the token layer", () => {
    for (const [platform, tints] of TINT_SETS) {
      for (const scheme of ["light", "dark"] as const) {
        const g = tints[scheme];
        expect(surfaceUnderFill(g, "functional")).toBe(g["glass-tint"]);
        expect(surfaceUnderFill(g, "content")).toBe(g["glass-tint-content"]);
        expect(surfaceUnderFill(g, "control")).toBe(g["glass-tint-control"]);
        expect(surfaceUnderFill(g, "dense")).toBe(g["glass-tint-dense"]);
        // Four distinct tints: a layer that shared another's would not read as its own plane.
        expect(new Set([g["glass-tint"], g["glass-tint-content"], g["glass-tint-control"], g["glass-tint-dense"]]).size, `${platform} ${scheme}`).toBe(4);
      }
    }
  });

  it("renders the content and dense tints on the material path", async () => {
    render(
      <ThemeProvider light glass>
        <Panel testID="content-gs" layer="content" />
        <Panel testID="dense-gs" layer="dense" />
        <Panel testID="control-gs" layer="control" />
      </ThemeProvider>,
    );
    expect((await underFillOf("content-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${printed(WEB_TINTS.light["glass-tint-content"])}`);
    expect((await underFillOf("dense-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${printed(WEB_TINTS.light["glass-tint-dense"])}`);
    expect((await underFillOf("control-gs"))!.getAttribute("style") ?? "").toContain(`background-color: ${printed(WEB_TINTS.light["glass-tint-control"])}`);
  });

  it("renders Dark Factory's frost on the web: the layer's tint, one 24px blur with no saturation, then a 1px inset hairline", async () => {
    // The rim is Dark Factory's shell line on the floating and content layers, and the
    // palette's hairline on the controls and the dense menus.
    const rimColor = (layer: GlassLayer, scheme: "light" | "dark") =>
      layer === "functional" || layer === "content" ? WEB_FROST.shellLine[scheme] : (scheme === "light" ? lightColors : darkColors).border;
    const layers = [["functional", "glass-tint"], ["content", "glass-tint-content"], ["control", "glass-tint-control"], ["dense", "glass-tint-dense"]] as const;
    for (const scheme of ["light", "dark"] as const) {
      for (const [layer, tint] of layers) {
        const id = `${scheme}-${layer}-frost`;
        const view = render(
          <ThemeProvider light={scheme === "light"} dark={scheme === "dark"} glass>
            <Panel testID={id} layer={layer} />
          </ThemeProvider>,
        );
        const painted = Array.from((await underFillOf(id))!.parentElement!.children) as HTMLElement[];
        // Exactly the under-fill, the frost and the rim: no refraction layer, no highlight.
        expect(painted).toHaveLength(3);
        expect(painted[0].style.backgroundColor).toBe(printed(WEB_TINTS[scheme][tint]));
        expect(painted[1].style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
        expect(painted[2].style.boxShadow).toBe(`inset 0 0 0 ${WEB_FROST.rimWidth}px ${rimColor(layer, scheme)}`);
        view.unmount();
      }
    }
    // A clear surface (a field on its pane) frosts nothing: its light neutral veil and the
    // same hairline, the unblurred translucent fill Dark Factory draws its fields with.
    render(
      <ThemeProvider light glass>
        <Panel testID="clear-gs" layer="control" clear />
      </ThemeProvider>,
    );
    const clear = Array.from((await underFillOf("clear-gs"))!.parentElement!.children) as HTMLElement[];
    expect(clear).toHaveLength(2);
    expect(clear[0].style.backgroundColor).toBe(printed(clearSurfaceTint(lightColors, false)));
    expect(clear[1].style.boxShadow).toBe(`inset 0 0 0 ${WEB_FROST.rimWidth}px ${lightColors.border}`);
    expect(screen.getByTestId("clear-gs").querySelector("[style*='backdrop-filter']")).toBeNull();
  });

  it("orders the tints by density: functional < content < dense, and the control puck is the light one in dark", () => {
    const a = (v: string) => rgbaOf(v)[3];
    for (const look of LOOKS) {
      for (const [platform, g] of [["web", look.webGlass], ["native", look.nativeGlass]] as const) {
        expect(a(g["glass-tint"]), `${platform} ${look.name}`).toBeLessThan(a(g["glass-tint-content"]));
        expect(a(g["glass-tint-content"]), `${platform} ${look.name}`).toBeLessThan(a(g["glass-tint-dense"]));
      }
    }
    for (const [platform, tints] of TINT_SETS) {
      expect(rgbaOf(tints.dark["glass-tint-control"]).slice(0, 3), platform).toEqual([255, 255, 255]);
    }
  });

  it("keeps foreground text at 4.5:1 on a content pane and a dense pane over the page AND over the brand aurora", () => {
    const aurora = [brandColors["orb-indigo"], brandColors["orb-violet"], brandColors["orb-cyan"]];
    for (const look of LOOKS) {
      const t = look.tokens;
      for (const [platform, g] of [["web", look.webGlass], ["native", look.nativeGlass]] as const) {
        for (const base of [t.background, ...aurora]) {
          for (const tint of [g["glass-tint-content"], g["glass-tint-dense"]]) {
            expect(contrast(over(tint, base), rgb(t.foreground)), `${platform} ${look.name} foreground on ${tint} over ${base}`).toBeGreaterThanOrEqual(4.5);
          }
        }
        // The muted label role keeps the large-text floor on a content pane over the page.
        expect(contrast(over(g["glass-tint-content"], t.background), rgb(t["muted-foreground"])), `${platform} ${look.name} muted`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("a brand puck carries the primary-foreground ink at 4.5:1 over the page in every palette", () => {
    for (const look of LOOKS) {
      const t = look.tokens;
      // Without tokens the resolver can only return the sheer floor; with them it solves the
      // tint for the ink the skin paints (the primary pair).
      expect(surfaceUnderFill(look.nativeGlass, "control", t.primary)).toContain(`${BRAND_TINT_ALPHA}`);
      const fill = surfaceUnderFill(look.nativeGlass, "control", t.primary, undefined, t);
      expect(contrast(over(fill, t.background), rgb(t["primary-foreground"])), look.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The native frost's strength (expo-blur on Android and iOS < 26, and a platform without
  // its own host). The web frost blurs every layer that frosts at Dark Factory's one
  // 24px, pinned above.
  it("blurs a content pane a touch less than the functional layer, and a sheer surface least", () => {
    expect(surfaceIntensity("content", false)).toBeLessThan(surfaceIntensity("functional", false));
    expect(surfaceIntensity("control", false)).toBe(surfaceIntensity("functional", false));
    expect(surfaceIntensity("content", true)).toBeLessThan(surfaceIntensity("content", false));
  });
});

