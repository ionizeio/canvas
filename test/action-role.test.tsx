import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, type ThemeTokenOverrides } from "../src/style/theme.tsx";
import { colorsByScheme, lightColors, type ColorTokens } from "../src/style/tokens.ts";
import { actionFill, actionInk, actionOverride } from "../src/style/action.ts";
import { primaryText } from "../src/style/primary-text.ts";
import { brandTint } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Typography } from "../src/atoms/typography/typography.tsx";

// `action` / `action-foreground`: the call-to-action fill and its ink, apart from
// `primary` (what is selected, checked, current, linked or focused). The Dark Factory
// design language paints actions green and selection violet; until the palette lands
// the scheme maps carry no action role and every action paints with `primary`, so this
// file pins both the seam (actions read the action role) and its no-change fallback.

afterEach(cleanup);

// react-native-web prints colours as rgb()/rgba() with a two-decimal alpha; compare numbers.
function rgb(color: string): string {
  const hex = /^#([\da-f]{6})$/i.exec(color);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16)).join(",");
  const m = color.match(/[\d.]+/g) ?? [];
  return m.slice(0, 3).join(",");
}
const fillOf = (name: string) => rgb(screen.getByRole("button", { name }).style.backgroundColor);
const inkOf = (text: string) => rgb(screen.getByText(text).style.color);

function Actions() {
  return <>
    <Button primary>Save</Button>
    <Typography primary>Selected</Typography>
  </>;
}

describe("the action role", () => {
  for (const scheme of ["light", "dark"] as const) {
    it(`paints ${scheme} actions with primary while the scheme carries no action role`, () => {
      render(<ThemeProvider scheme={scheme}><Actions /></ThemeProvider>);
      const tokens = colorsByScheme[scheme];
      expect(fillOf("Save")).toBe(rgb(actionFill(tokens)));
      expect(fillOf("Save")).toBe(rgb(tokens.primary));
      expect(inkOf("Save")).toBe(rgb(actionInk(tokens)));
    });
  }

  it("repaints actions with a primary-only rebrand, fill and ink together", () => {
    const tokens: ThemeTokenOverrides = { primary: "#7c3aed", "primary-foreground": "#ffffff" };
    render(<ThemeProvider light tokens={tokens}><Actions /></ThemeProvider>);
    expect(fillOf("Save")).toBe(rgb("#7c3aed"));
    expect(inkOf("Save")).toBe(rgb("#ffffff"));
  });

  it("lets an explicit action override win while selection keeps primary", () => {
    const tokens: ThemeTokenOverrides = { action: "#21804b", "action-foreground": "#ffffff" };
    render(<ThemeProvider light tokens={tokens}><Actions /></ThemeProvider>);
    expect(fillOf("Save")).toBe(rgb("#21804b"));
    expect(inkOf("Save")).toBe(rgb("#ffffff"));
    expect(inkOf("Selected")).toBe(rgb(primaryText(lightColors)));
  });

  it("resolves per-scheme overrides", () => {
    const tokens: ThemeTokenOverrides = { light: { action: "#21804b" }, dark: { action: "#5fd18a" } };
    render(<ThemeProvider dark tokens={tokens}><Actions /></ThemeProvider>);
    expect(fillOf("Save")).toBe(rgb("#5fd18a"));
  });

  it("paints the split button's action half, label and chevron with the action pair", () => {
    const tokens: ThemeTokenOverrides = { action: "#21804b", "action-foreground": "#ffffff" };
    render(<ThemeProvider light tokens={tokens}><ButtonGroup split items={["Publish"]} menu={["Schedule"]} /></ThemeProvider>);
    expect(fillOf("Publish")).toBe(rgb("#21804b"));
    expect(inkOf("Publish")).toBe(rgb("#ffffff"));
    expect(fillOf("More actions")).toBe(rgb("#21804b"));
  });

  it("tints a glass primary puck with the action fill", async () => {
    const restore = (() => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        configurable: true,
      });
      return () => { delete (window.navigator as unknown as Record<string, unknown>)["userAgent"]; };
    })();
    try {
      const { container } = render(<ThemeProvider light glass tokens={{ action: "#21804b", "action-foreground": "#ffffff" }}><Button primary testID="go">Go</Button></ThemeProvider>);
      await waitFor(() => expect(container.querySelectorAll("[style*='backdrop-filter']").length).toBeGreaterThan(0));
      const button = container.querySelector('[data-testid="go"]') as HTMLElement;
      const lens = button.querySelector("[style*='backdrop-filter']") as HTMLElement;
      const fill = (lens.nextElementSibling as HTMLElement | null)?.style.backgroundColor ?? "";
      expect(rgb(fill)).toBe(rgb(brandTint("#21804b", lightColors.background)));
    } finally {
      restore();
    }
  });
});

describe("actionOverride", () => {
  const base: ColorTokens = { ...lightColors, action: "#21804b", "action-foreground": "#ffffff" };

  it("keeps the scheme's action pair when the override touches neither role", () => {
    expect(actionOverride(base, { "primary-foreground": "#101010" })).toEqual({ action: "#21804b", "action-foreground": "#ffffff" });
  });

  it("follows a rebranded primary with its own pair", () => {
    expect(actionOverride(base, { primary: "#7c3aed", "primary-foreground": "#fafafa" })).toEqual({ action: "#7c3aed", "action-foreground": "#fafafa" });
    expect(actionOverride(base, { primary: "#7c3aed" })).toEqual({ action: "#7c3aed", "action-foreground": base["primary-foreground"] });
  });

  it("takes an explicit action and keeps the scheme's action ink unless one is named", () => {
    expect(actionOverride(base, { action: "#0a733f" })).toEqual({ action: "#0a733f", "action-foreground": "#ffffff" });
    expect(actionOverride(base, { action: "#0a733f", primary: "#7c3aed", "action-foreground": "#f0f0f0" })).toEqual({ action: "#0a733f", "action-foreground": "#f0f0f0" });
  });
});
