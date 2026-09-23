import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { Text } from "react-native";
import { ThemeProvider, useTheme } from "../src/style/theme.tsx";
import { colorsFor, darkColors, lightColors, mintColors } from "../src/style/tokens.ts";
import { WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { Button } from "../src/atoms/button/button.tsx";
import { getPalette, setPalette } from "../src/theme.ts";

// The palette axis: Dark Factory's two light palettes in the boolean grammar
// (<ThemeProvider mint>, blush when omitted). The dark scheme has one palette, so `dark`
// wins over `mint` exactly as `.dark` wins over `[data-palette="mint"]` in the CSS
// hand-off (tools/darkfactory/parity.ts holds that order). `ssrPalette` is the ssrScheme
// contract on this axis.

afterEach(cleanup);

function Probe() {
  const { palette, scheme, tokens, glass } = useTheme();
  return <Text>{`palette:${palette}|scheme:${scheme}|primary:${tokens.primary}|background:${tokens.background}|shell:${glass["glass-tint"]}`}</Text>;
}

const probe = (palette: string, scheme: string, tokens: { primary: string; background: string }, shell: string) =>
  `palette:${palette}|scheme:${scheme}|primary:${tokens.primary}|background:${tokens.background}|shell:${shell}`;

describe("ThemeProvider palette axis", () => {
  it("omitting mint paints blush, the light default", () => {
    render(<ThemeProvider light><Probe /></ThemeProvider>);
    expect(screen.getByText(probe("blush", "light", lightColors, WEB_TINTS.light["glass-tint"]))).toBeTruthy();
  });

  it("mint paints Dark Factory's mint palette and frosts over mint's own shell", () => {
    render(<ThemeProvider light mint><Probe /></ThemeProvider>);
    expect(screen.getByText(probe("mint", "light", mintColors, WEB_TINTS.mint["glass-tint"]))).toBeTruthy();
  });

  it("dark wins over mint: the one dark palette, with the requested palette still named", () => {
    render(<ThemeProvider dark mint><Probe /></ThemeProvider>);
    expect(screen.getByText(probe("mint", "dark", darkColors, WEB_TINTS.dark["glass-tint"]))).toBeTruthy();
    expect(colorsFor("mint", "dark")).toBe(darkColors);
    expect(colorsFor("blush", "light")).toBe(lightColors);
  });

  it("merges a rebrand over the mint base, and a primary-only rebrand repaints the action", () => {
    function Tokens() {
      const { tokens } = useTheme();
      return <Text>{`${tokens.primary}|${tokens.background}|${tokens.action}|${tokens["inverse-primary"]}`}</Text>;
    }
    render(<ThemeProvider light mint tokens={{ primary: "#123456" }}><Tokens /></ThemeProvider>);
    // The rebrand leaves inverse-primary alone (ColorTokens documents it: name it too).
    expect(screen.getByText(`#123456|${mintColors.background}|#123456|${mintColors["inverse-primary"]}`)).toBeTruthy();
  });

  it("paints kit components in the mint roles", () => {
    render(
      <ThemeProvider light mint solid>
        <Button primary testID="cta">Save</Button>
        <Button link>Details</Button>
      </ThemeProvider>,
    );
    const cta = screen.getByTestId("cta");
    expect(channelsOf(cta.style.backgroundColor)).toBe(channelsOf(mintColors.action!));
    expect(channelsOf(screen.getByText("Details").style.color)).toBe(channelsOf(mintColors["primary-text"]!));
  });
});

describe("ThemeProvider ssrPalette", () => {
  it("pins the server render to ssrPalette even when `mint` disagrees, colours and frost included", () => {
    const html = renderToString(<ThemeProvider light mint ssrPalette="blush"><Probe /></ThemeProvider>);
    expect(html).toContain(probe("blush", "light", lightColors, WEB_TINTS.light["glass-tint"]));
    expect(html).not.toContain(mintColors.primary);
  });

  it("applies the requested palette after mount on the client", () => {
    render(<ThemeProvider light mint ssrPalette="blush"><Probe /></ThemeProvider>);
    // Effects have flushed by the time render() returns.
    expect(screen.getByText(probe("mint", "light", mintColors, WEB_TINTS.mint["glass-tint"]))).toBeTruthy();
  });

  it("holds the requested scheme through hydration when only the palette is pinned", () => {
    const html = renderToString(<ThemeProvider dark mint ssrPalette="blush"><Probe /></ThemeProvider>);
    expect(html).toContain(probe("blush", "dark", darkColors, WEB_TINTS.dark["glass-tint"]));
  });
});

describe("the web palette switch", () => {
  afterEach(() => {
    delete document.documentElement.dataset.palette;
    try { localStorage.removeItem("canvas-palette"); } catch {}
  });

  it("marks the root element for the mint block and clears it for blush", () => {
    setPalette("mint");
    expect(document.documentElement.dataset.palette).toBe("mint");
    expect(getPalette()).toBe("mint");
    setPalette("blush");
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(getPalette()).toBe("blush");
  });

  it("persists the choice, so it survives the attribute being gone (a reload)", () => {
    setPalette("mint");
    expect(localStorage.getItem("canvas-palette")).toBe("mint");
    delete document.documentElement.dataset.palette;
    expect(getPalette()).toBe("mint");
    setPalette("blush");
    expect(localStorage.getItem("canvas-palette")).toBe("blush");
  });

  it("reads the root element when nothing is stored", () => {
    try { localStorage.removeItem("canvas-palette"); } catch {}
    document.documentElement.dataset.palette = "mint";
    expect(getPalette()).toBe("mint");
  });
});

/** The r,g,b channels of a #rrggbb or of the rgb()/rgba() string the DOM prints. */
function channelsOf(color: string): string {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  return m ? `${m[1]},${m[2]},${m[3]}` : color;
}
