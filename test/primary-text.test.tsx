import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { renderToString } from "react-dom/server";
import { ThemeProvider, useTheme, type ThemeTokenOverrides } from "../src/style/theme.tsx";
import { colorsByScheme, type ColorScheme } from "../src/style/tokens.ts";
import { primaryText } from "../src/style/primary-text.ts";
import { actionFill, actionInk } from "../src/style/action.ts";
import { Typography } from "../src/atoms/typography/typography.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { Emblem } from "../src/atoms/emblem/emblem.tsx";
import { Emblem as IOSEmblem } from "../src/atoms/emblem/emblem.ios.tsx";
import { Emblem as AndroidEmblem } from "../src/atoms/emblem/emblem.android.tsx";
import { TabBar } from "../src/organisms/tab-bar/tab-bar.tsx";
import { TabBar as IOSTabBar } from "../src/organisms/tab-bar/tab-bar.ios.tsx";
import { TabBar as AndroidTabBar } from "../src/organisms/tab-bar/tab-bar.android.tsx";
import { galleryBlockFill } from "../src/molecules/grid-lists/grid-lists.styles.ts";

afterEach(cleanup);

const renderedColor = (id: string) => cssColor(screen.getByTestId(id).style.color);
function cssColor(color: string): string {
  const hex = /^#([\da-f]{3,8})$/i.exec(color);
  let channels: number[];
  if (hex) {
    const value = hex[1]!.length <= 4 ? [...hex[1]!].map(channel => channel + channel).join("") : hex[1]!;
    channels = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
    channels.push(value.length === 8 ? parseInt(value.slice(6), 16) / 255 : 1);
  } else {
    channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
    if (channels.length === 3) channels.push(1);
  }
  if (channels.length !== 4) throw new Error(`Expected a rendered color: ${color}`);
  // RNW serializes alpha to two decimal places; compare channels, not syntax.
  return `${channels.slice(0, 3).join(",")},${channels[3]!.toFixed(2)}`;
}
function Probe() {
  const { tokens, scheme } = useTheme();
  return <>
    <Typography primary testID="primary-text">Brand text</Typography>
    <Button primary>Filled action</Button>
    <Button link>Text action</Button>
    <Text testID="resolved">{`${scheme}:${tokens["primary-text"]}`}</Text>
  </>;
}

describe("primary-text compatibility", () => {
  it("resolves the optional role consistently in named gallery tints", () => {
    const legacy = { ...colorsByScheme.light };
    delete legacy["primary-text"];
    expect(galleryBlockFill(legacy, "primary-text")).toEqual(galleryBlockFill(legacy, "primary"));
    expect(galleryBlockFill({ ...legacy, "primary-text": "#102030" }, "primary-text").backgroundColor).toBe("rgba(16, 32, 48, 0.2)");
    expect(galleryBlockFill(legacy, "unknown-token")).toEqual(galleryBlockFill(legacy, "muted-foreground"));
  });
  for (const scheme of ["light", "dark"] as const) {
    it(`resolves the authored ${scheme} text role without changing the primary fill`, () => {
      render(<ThemeProvider scheme={scheme}><Probe /></ThemeProvider>);
      const tokens = colorsByScheme[scheme];
      expect(renderedColor("primary-text")).toBe(cssColor(primaryText(tokens)));
      // The filled call-to-action paints the scheme's action pair (the Dark Factory green),
      // apart from the brand text above.
      expect(cssColor(screen.getByRole("button", { name: "Filled action" }).style.backgroundColor)).toBe(cssColor(actionFill(tokens)));
      expect(cssColor(screen.getByText("Filled action").style.color)).toBe(cssColor(actionInk(tokens)));
      expect(cssColor(screen.getByText("Text action").style.color)).toBe(cssColor(primaryText(tokens)));
    });

    for (const primary of ["#7c3aed", "#0f08", "#00ff0088", "rgba(0, 255, 0, 0.4)"]) {
      it(`preserves a ${scheme} primary-only override ${primary}`, () => {
        render(<ThemeProvider scheme={scheme} tokens={{ primary }}><Probe /></ThemeProvider>);
        expect(renderedColor("primary-text")).toBe(cssColor(primary));
        expect(cssColor(screen.getByText("Text action").style.color)).toBe(cssColor(primary));
        expect(cssColor(screen.getByRole("button", { name: "Filled action" }).style.backgroundColor)).toBe(cssColor(primary));
      });
    }

    it(`honors an explicit ${scheme} text role and treats undefined as omission`, () => {
      const { rerender } = render(<ThemeProvider scheme={scheme} tokens={{ primary: "#7c3aed", "primary-text": "#a78bfa" }}><Probe /></ThemeProvider>);
      expect(renderedColor("primary-text")).toBe(cssColor("#a78bfa"));
      expect(cssColor(screen.getByRole("button", { name: "Filled action" }).style.backgroundColor)).toBe(cssColor("#7c3aed"));
      rerender(<ThemeProvider scheme={scheme} tokens={{ primary: "#7c3aed", "primary-text": undefined }}><Probe /></ThemeProvider>);
      expect(renderedColor("primary-text")).toBe(cssColor("#7c3aed"));
      rerender(<ThemeProvider scheme={scheme} tokens={{ "primary-text": undefined }}><Probe /></ThemeProvider>);
      expect(renderedColor("primary-text")).toBe(cssColor(primaryText(colorsByScheme[scheme])));
      rerender(<ThemeProvider scheme={scheme} tokens={{ "primary-text": "#123456" }}><Probe /></ThemeProvider>);
      expect(renderedColor("primary-text")).toBe(cssColor("#123456"));
      expect(cssColor(screen.getByRole("button", { name: "Filled action" }).style.backgroundColor)).toBe(cssColor(actionFill(colorsByScheme[scheme])));
    });

    for (const [platform, Monogram, Navigation] of [
      ["web", Emblem, TabBar], ["ios", IOSEmblem, IOSTabBar], ["android", AndroidEmblem, AndroidTabBar],
    ] as const) {
      it(`renders ${scheme} ${platform} primary monograms and small TabBar captions with the text role`, () => {
        render(<ThemeProvider scheme={scheme}>
          <Monogram primary small label="AB" />
          <Navigation items={[{ key: "home", label: "Home", icon: () => null }]} active="home" onSelect={() => {}} />
        </ThemeProvider>);
        const expected = cssColor(primaryText(colorsByScheme[scheme]));
        expect(cssColor(screen.getByText("AB").style.color)).toBe(expected);
        expect(screen.getByText("AB").style.fontSize).toBe("14px");
        expect(cssColor(screen.getByText("Home").style.color)).toBe(expected);
      });
    }
  }

  it("updates the per-scheme override as appearance changes", () => {
    const tokens: ThemeTokenOverrides = { light: { primary: "#123456" }, dark: { primary: "#654321", "primary-text": "#fedcba" } };
    const view = (scheme: ColorScheme) => <ThemeProvider scheme={scheme} tokens={tokens}><Probe /></ThemeProvider>;
    const { rerender } = render(view("light"));
    expect(renderedColor("primary-text")).toBe(cssColor("#123456"));
    rerender(view("dark"));
    expect(renderedColor("primary-text")).toBe(cssColor("#fedcba"));
    expect(cssColor(screen.getByRole("button", { name: "Filled action" }).style.backgroundColor)).toBe(cssColor("#654321"));
  });

  it("resolves the server text role from ssrScheme before applying the client scheme", () => {
    const ui = <ThemeProvider dark ssrScheme="light"><Probe /></ThemeProvider>;
    const html = renderToString(ui);
    expect(html).toContain(`light:${primaryText(colorsByScheme.light)}`);
    expect(html).not.toContain(`dark:${primaryText(colorsByScheme.dark)}`);
    render(ui);
    expect(screen.getByTestId("resolved").textContent).toBe(`dark:${primaryText(colorsByScheme.dark)}`);
    expect(renderedColor("primary-text")).toBe(cssColor(primaryText(colorsByScheme.dark)));
  });

  it("keeps a loading link indicator in the same foreground as its label", () => {
    render(<ThemeProvider dark tokens={{ primary: "#123456", "primary-text": "#abcdef" }}><Button link loading>Loading action</Button></ThemeProvider>);
    const progress = screen.getByRole("progressbar");
    const indicator = progress.querySelector("circle:last-child");
    expect(indicator).not.toBeNull();
    expect(cssColor((indicator as SVGElement).style.stroke)).toBe(cssColor("#abcdef"));
    expect(cssColor(screen.getByText("Loading action").style.color)).toBe(cssColor("#abcdef"));
  });

  it("preserves independent nested providers instead of introducing token or scheme inheritance", () => {
    const outer = { primary: "#123456", "primary-text": "#abcdef" };
    const { rerender } = render(<ThemeProvider dark tokens={outer}><ThemeProvider glass><Probe /></ThemeProvider></ThemeProvider>);
    expect(screen.getByTestId("resolved").textContent).toBe(`light:${primaryText(colorsByScheme.light)}`);
    rerender(<ThemeProvider dark tokens={outer}><ThemeProvider dark glass tokens={outer}><Probe /></ThemeProvider></ThemeProvider>);
    expect(screen.getByTestId("resolved").textContent).toBe("dark:#abcdef");
  });

  it("falls back for legacy complete token maps without changing explicit text colors", () => {
    const legacy = { ...colorsByScheme.dark };
    delete legacy["primary-text"];
    expect(primaryText(legacy)).toBe(legacy.primary);
    expect(primaryText({ ...legacy, "primary-text": "rgba(1, 2, 3, 0.5)" })).toBe("rgba(1, 2, 3, 0.5)");
  });
});
