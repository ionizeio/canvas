import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Emblem } from "../src/atoms/emblem/emblem.tsx";
import { colorFormats } from "../docs/src/ui/color.ts";

afterEach(cleanup);

describe("hex alpha theme overrides", () => {
  it("renders the same tinted component for four- and eight-digit overrides", () => {
    const { rerender } = render(
      <ThemeProvider light tokens={{ primary: "#0f08" }}><Emblem primary testID="tint" /></ThemeProvider>,
    );
    // The primary tile washes with the primary's soft role, which a rebrand derives at Dark
    // Factory's alpha for the scheme (0.14 light, 0.16 dark).
    expect(screen.getByTestId("tint").style.backgroundColor).toBe("rgba(0, 255, 0, 0.14)");
    rerender(<ThemeProvider dark tokens={{ dark: { primary: "#00ff0088" } }}><Emblem primary testID="tint" /></ThemeProvider>);
    expect(screen.getByTestId("tint").style.backgroundColor).toBe("rgba(0, 255, 0, 0.16)");
  });

  it("preserves existing functional color overrides", () => {
    render(<ThemeProvider tokens={{ primary: "rgba(0, 255, 0, 0.4)" }}><Emblem primary testID="tint" /></ThemeProvider>);
    const channels = screen.getByTestId("tint").style.backgroundColor.match(/[\d.]+/g)?.map(Number);
    expect(channels).toEqual([0, 255, 0, 0.4]);
  });

  it("shows the actual channels and alpha in the docs color formats", () => {
    expect(colorFormats("#0f08")).toEqual(colorFormats("#00ff0088"));
    expect(colorFormats("#0f08")[0]).toBe("hex(#00ff0088)");
    expect(colorFormats("#0f0f")).toEqual(colorFormats("#00ff00"));
  });
});
