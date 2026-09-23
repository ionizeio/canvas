import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Typography } from "../src/atoms/typography/typography.tsx";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// The resolved line height of the single Text a Typography renders.
const lineHeightOf = (container: HTMLElement) => {
  const el = container.firstElementChild as HTMLElement;
  return getComputedStyle(el).lineHeight;
};

describe("Typography leading axis", () => {
  it("tightLeading pulls a role's reading line box in to 1.25x", () => {
    // lead is 14/21 (a 1.5 reading ratio); tight caps it at round(14 * 1.25) = 18.
    expect(lineHeightOf(ui(<Typography lead>Canvas</Typography>).container)).toBe("21px");
    expect(lineHeightOf(ui(<Typography lead tightLeading>Canvas</Typography>).container)).toBe("18px");

    // tiny is 11/15; tight caps it at round(11 * 1.25) = 14.
    expect(lineHeightOf(ui(<Typography tiny>design system</Typography>).container)).toBe("15px");
    expect(lineHeightOf(ui(<Typography tiny tightLeading>design system</Typography>).container)).toBe("14px");
  });

  it("only ever tightens: roles already at or below 1.25x keep their own line box", () => {
    // Some titles already lead at or under 1.25 (display 24/27 = 1.13, h1 20/25 = 1.25,
    // h3 16/20 = 1.25). Without the min() clamp the ratio would LOOSEN these, so the
    // prop would be unsafe on the roles most likely to carry a lockup's first line.
    for (const [node, expected] of [
      [<Typography display tightLeading>Canvas</Typography>, "27px"],
      [<Typography h1 tightLeading>Canvas</Typography>, "25px"],
      [<Typography h3 tightLeading>Canvas</Typography>, "20px"],
    ] as const) {
      expect(lineHeightOf(ui(node).container)).toBe(expected);
    }
  });

  it("is orthogonal: it changes the line box and nothing else", () => {
    const plain = ui(<Typography lead semibold>Canvas</Typography>).container.firstElementChild as HTMLElement;
    const tight = ui(<Typography lead semibold tightLeading>Canvas</Typography>).container
      .firstElementChild as HTMLElement;
    const a = getComputedStyle(plain);
    const b = getComputedStyle(tight);
    expect(b.fontSize).toBe(a.fontSize);
    expect(b.fontWeight).toBe(a.fontWeight);
    expect(b.color).toBe(a.color);
    expect(b.lineHeight).not.toBe(a.lineHeight);
  });

  it("omitting it leaves the role's reading leading untouched", () => {
    expect(lineHeightOf(ui(<Typography body>The quick brown fox</Typography>).container)).toBe("19px");
    expect(lineHeightOf(ui(<Typography lead>The quick brown fox</Typography>).container)).toBe("21px");
  });
});
