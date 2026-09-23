import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup, waitFor, screen } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider, useTheme } from "../src/style/theme.tsx";
import { lightColors, darkColors } from "../src/style/tokens.ts";
import { WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { GlassSurface as IOSGlassSurface } from "../src/style/glass-surface/glass-surface.ios.tsx";
import { GlassBox } from "../src/style/glass-surface/glass-surface.shared.tsx";

// The glass accessibility ladder: under Reduce Transparency / Increase Contrast a glass
// surface renders opaque (its skin fill, which is a SEMANTIC token glass never rewrites),
// and Increase Contrast additionally paints a contrasting foreground border on it.
// expo-blur is stubbed in the test setup, so GlassSurface renders its PlainSurface path,
// which is exactly where these rungs apply.
//
// Also pinned here: what the ThemeProvider actually resolves. The surface mode changes no
// semantic token at all now (`popover` is opaque in every mode); it selects the mode and
// publishes the glass material's own tokens (on the web, the web frost's tints in
// web-frost.ts), and GlassSurface applies the ladder.

afterEach(cleanup);

describe("GlassSurface accessibility landmarks", () => {
  for (const [platform, Surface] of [["web", GlassSurface], ["ios", IOSGlassSurface]] as const) {
    for (const [reducedTransparency, increasedContrast] of [[true, false], [false, true], [true, true]] as const) {
      it(`${platform} preserves the landmark with transparency=${reducedTransparency}, contrast=${increasedContrast}`, async () => {
        const spy = mockMatchMedia((query) =>
          (reducedTransparency && query.includes("prefers-reduced-transparency")) ||
          (increasedContrast && query.includes("prefers-contrast")),
        );
        try {
          render(
            <ThemeProvider light glass>
              <Surface role="navigation" testID="landmark" tint="#ff00ff" sheer interactive
                style={{ backgroundColor: "#ffffff", borderRadius: 12 }}>
                <Text>Page navigation</Text>
              </Surface>
              <SurfaceProbe />
            </ThemeProvider>,
          );
          await waitFor(() => expect(screen.getByText(new RegExp(`rt:${reducedTransparency}\\|ic:${increasedContrast}$`))).toBeDefined());
          const node = screen.getByRole("navigation");
          expect(node).toBe(screen.getByTestId("landmark"));
          expect(node.textContent).toBe("Page navigation");
          expect(node.style.backgroundColor).toMatch(/rgba?\(255, ?255, ?255/);
          expect(node.style.borderWidth).toBe(increasedContrast ? "1px" : "");
          expect(node.style.opacity).toBe("");
          expect(node.children).toHaveLength(1);
          expect(node.outerHTML).not.toMatch(/ff00ff|255, ?0, ?255|backdrop-filter|glass-material|isinteractive|sheer|tint=/i);
        } finally {
          spy.mockRestore();
        }
      });
    }
  }
});

function mockMatchMedia(matching: (query: string) => boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const spy = spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matching(query),
        media: query,
        addEventListener: (_e: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
        removeEventListener: (_e: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
        addListener: (cb: (e: { matches: boolean }) => void) => listeners.add(cb),
        removeListener: (cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
        onchange: null,
        dispatchEvent: () => true,
      }) as unknown as MediaQueryList,
  );
  return spy;
}

// What the provider resolves, all in one string: the surface mode, the popover token
// (the fill every menu/select/dialog skin paints), the glass material's own fill, and
// the two accessibility flags.
function SurfaceProbe() {
  const { surface, tokens, glass, reducedTransparency, increasedContrast } = useTheme();
  return (
    <Text>{`${surface}|popover:${tokens.popover}|tint:${glass["glass-tint"]}|rt:${reducedTransparency}|ic:${increasedContrast}`}</Text>
  );
}

describe("glass and the semantic tokens", () => {
  it("leaves popover OPAQUE in glass mode and publishes the material's own tint", async () => {
    // The bug: glass used to swap popover to rgba(255, 255, 255, 0.72), so every menu,
    // select list, and alert dialog turned see-through with the bars. The material has
    // its own fill now, and the semantic token is untouched.
    render(
      <ThemeProvider glass>
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText(`glass|popover:${lightColors.popover}|tint:${WEB_TINTS.light["glass-tint"]}|rt:false|ic:false`)).toBeDefined(),
    );
  });

  it("resolves the dark material's own tint, with popover still opaque", async () => {
    render(
      <ThemeProvider dark glass>
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText(`glass|popover:${darkColors.popover}|tint:${WEB_TINTS.dark["glass-tint"]}|rt:false|ic:false`)).toBeDefined(),
    );
  });

  it("keeps popover opaque in SOLID mode too (nothing to revert)", async () => {
    render(
      <ThemeProvider solid>
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^solid\|popover:#ffffff\|/)).toBeDefined());
  });

  it("keeps popover opaque under Reduce Transparency", async () => {
    const spy = mockMatchMedia((q) => q.includes("prefers-reduced-transparency"));
    try {
      render(
        <ThemeProvider glass>
          <SurfaceProbe />
        </ThemeProvider>,
      );
      await waitFor(() => expect(screen.getByText(/^glass\|popover:#ffffff\|.*\|rt:true\|ic:false$/)).toBeDefined());
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps popover opaque under Increase Contrast", async () => {
    const spy = mockMatchMedia((q) => q.includes("prefers-contrast"));
    try {
      render(
        <ThemeProvider glass>
          <SurfaceProbe />
        </ThemeProvider>,
      );
      await waitFor(() => expect(screen.getByText(/^glass\|popover:#ffffff\|.*\|rt:false\|ic:true$/)).toBeDefined());
    } finally {
      spy.mockRestore();
    }
  });
});

describe("GlassSurface increase-contrast border", () => {
  it("adds a 1px foreground border under Increase Contrast", async () => {
    const spy = mockMatchMedia((q) => q.includes("prefers-contrast"));
    try {
      render(
        <ThemeProvider glass>
          <GlassSurface testID="gs" style={{ borderRadius: 12 }}>
            <Text>content</Text>
          </GlassSurface>
        </ThemeProvider>,
      );
      await waitFor(() => {
        const node = screen.getByTestId("gs") as HTMLElement;
        expect(node.style.borderWidth).toBe("1px");
        // The foreground token, as react-native-web writes it.
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(lightColors.foreground.slice(i, i + 2), 16));
        expect(node.getAttribute("style")).toContain(`border-color: rgba(${r}, ${g}, ${b}`);
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("paints no border in ordinary glass mode", async () => {
    render(
      <ThemeProvider glass>
        <GlassSurface testID="gs" style={{ borderRadius: 12 }}>
          <Text>content</Text>
        </GlassSurface>
      </ThemeProvider>,
    );
    await waitFor(() => {
      const node = screen.getByTestId("gs") as HTMLElement;
      expect(node.style.borderWidth).toBe("");
    });
  });
});

// A consumer-style surface: skins paint tokens.popover as the fill, exactly like the
// real overlay skins do, so the rendered background is the one an accessibility rung
// has to leave opaque.
function GlassFillProbe({ testID }: { testID: string }) {
  const { tokens } = useTheme();
  return (
    <GlassSurface testID={testID} style={{ backgroundColor: tokens.popover, borderRadius: 12 }}>
      <Text>fill</Text>
    </GlassSurface>
  );
}

describe("GlassSurface reduce-transparency rung", () => {
  it("renders an OPAQUE surface under Reduce Transparency", async () => {
    const spy = mockMatchMedia((q) => q.includes("prefers-reduced-transparency"));
    try {
      render(
        <ThemeProvider glass>
          <GlassFillProbe testID="rt" />
        </ThemeProvider>,
      );
      await waitFor(() => {
        const node = screen.getByTestId("rt") as HTMLElement;
        const style = node.getAttribute("style") ?? "";
        // The solid light popover (#ffffff), at full alpha.
        expect(style).toMatch(/background-color: rgba?\(255, ?255, ?255(, ?1(\.0+)?)?\)/);
        // And no glass material anywhere: the rung returns PlainSurface, so the material
        // and its under-fill layer are never rendered at all. (The web's functional tint
        // has a two-decimal alpha, so react-native-web prints the token's own string.)
        expect(node.querySelector('[data-testid="glass-material"]')).toBeNull();
        expect(node.outerHTML).not.toContain(WEB_TINTS.light["glass-tint"]);
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("Increase Contrast wins when both settings are on (opaque + border)", async () => {
    const spy = mockMatchMedia((q) => q.includes("prefers-reduced-transparency") || q.includes("prefers-contrast"));
    try {
      render(
        <ThemeProvider glass>
          <GlassSurface testID="both" style={{ borderRadius: 12 }}>
            <Text>x</Text>
          </GlassSurface>
        </ThemeProvider>,
      );
      await waitFor(() => {
        const node = screen.getByTestId("both") as HTMLElement;
        expect(node.style.borderWidth).toBe("1px");
      });
    } finally {
      spy.mockRestore();
    }
  });
});

// The real material path: GlassBox is what every glass surface renders when a material
// module is present (the expo peers are stubbed under test, so GlassSurface itself
// never reaches it — rendering GlassBox directly covers the two-box structure that the
// pure splitSurfaceStyle unit cannot).
describe("GlassBox structure (real material path)", () => {
  it("preserves border geometry and clips only decoration, keeping content and padding on the host", () => {
    render(
      <GlassBox
        testID="gbox"
        style={{ borderRadius: 16, borderWidth: 1, borderColor: "#e4e4e7", padding: 8, width: 200 }}
        material={<Text>material-layer</Text>}
      >
        <Text>surface content</Text>
      </GlassBox>,
    );
    const outer = screen.getByTestId("gbox") as HTMLElement;
    const clip = screen.getByText("material-layer").parentElement as HTMLElement;
    expect(clip).toBe(outer.firstElementChild);
    // Keep layout geometry while the material supplies the visible edge.
    expect(outer.style.borderWidth).toBe("1px");
    expect(outer.style.borderColor).toMatch(/rgba\(0, ?0, ?0, ?0/);
    expect(clip.getAttribute("style") ?? "").not.toContain("border-width");
    // Radius lands on both boxes (rounded shadow on the outer, rounded clip inside).
    expect(outer.style.borderRadius).toBe("16px");
    expect(clip.style.borderRadius).toBe("16px");
    // The clip box clips the material and keeps the skin padding; the outer box owns
    // sizing. (react-native-web expands `overflow` to the two axis longhands.)
    expect(clip.style.overflowX).toBe("hidden");
    expect(clip.style.overflowY).toBe("hidden");
    expect(outer.style.padding).toBe("8px");
    expect(clip.style.padding).toBe("");
    expect(screen.getByText("surface content").parentElement).toBe(outer);
    expect(outer.style.width).toBe("200px");
    // The material renders behind (before) the content inside the clip box.
    expect(clip.firstElementChild?.textContent).toBe("material-layer");
    expect(screen.getByText("surface content")).toBeDefined();
  });
});

describe("iOS glass-surface platform file", () => {
  it("imports and renders without throwing (falls back to PlainSurface under the stubbed peers)", async () => {
    const mod = await import("../src/style/glass-surface/glass-surface.ios.tsx");
    render(
      <ThemeProvider glass>
        <mod.GlassSurface testID="ios-gs" style={{ borderRadius: 26 }}>
          <Text>ios</Text>
        </mod.GlassSurface>
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ios-gs")).toBeDefined());
  });
});

describe("ThemeProvider surface axis booleans", () => {
  // The boolean axis is the canonical spelling (<ThemeProvider glass>); the
  // legacy surface value prop stays supported underneath. These pin the
  // resolution order: glass > solid > surface > platform default. The observable is
  // the RESOLVED MODE the provider publishes, which is what GlassSurface branches on;
  // it is no longer inferred from a token whose value the mode rewrote.
  it("glass resolves the glass surface mode", async () => {
    render(
      <ThemeProvider glass>
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^glass\|/)).toBeDefined());
  });

  it("solid resolves the solid surface mode", async () => {
    render(
      <ThemeProvider solid>
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^solid\|/)).toBeDefined());
  });

  it("glass wins over solid (axis first-match), and both win over legacy surface", async () => {
    render(
      <ThemeProvider glass solid surface="solid">
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^glass\|/)).toBeDefined());
  });

  it("solid overrides a legacy surface=\"glass\"", async () => {
    render(
      <ThemeProvider solid surface="glass">
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^solid\|/)).toBeDefined());
  });

  it("legacy surface=\"glass\" alone still resolves to glass", async () => {
    render(
      <ThemeProvider surface="glass">
        <SurfaceProbe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/^glass\|/)).toBeDefined());
  });
});
