import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { webSkin } from "../src/atoms/button-group/button-group.styles.ts";
import { actionFill, actionInk } from "../src/style/action.ts";
import { brandTint } from "../src/style/glass-surface/glass-surface.shared.tsx";

// The web ButtonGroup is Dark Factory's segmented control (SKN-4b): the row sits in a
// card2 pill track with a hairline, a 3px inset and a 2px gap; each segment is a pill and
// the selected one DF's white card thumb on its segment shadow, with 700 labels in
// foreground or muted. The split, stepper and spaced kinds are the web Button's pills.

afterEach(cleanup);

const t = lightColors;
const rgba = (hex: string) => alpha(hex, 1).replace(/\s/g, "").replace(/,1\)$/, ",1.00)");
const flat = (value: string) => value.replace(/\s/g, "");

describe("the web ButtonGroup is Dark Factory's segmented control", () => {
  it("draws the track, the pill segments and the white thumb", () => {
    expect(webSkin.segmentedWrap(t)).toMatchObject({ padding: 3, gap: 2, borderRadius: 9999, borderWidth: 1, borderColor: t.border, backgroundColor: t.secondary });
    expect(webSkin.joinCorners(0, 3)).toEqual({ borderRadius: 9999 });
    expect(webSkin.joinCorners(1, 3)).toEqual({ borderRadius: 9999 });
    expect(webSkin.segmentSurface(t, true)).toEqual({ backgroundColor: t.card, boxShadow: `0px 4px 12px -6px ${t.shade}` });
    expect(webSkin.segmentSurface(t, false)).toEqual({ backgroundColor: "transparent" });
    expect(webSkin.segmentLabel(t, true)).toEqual({ fontWeight: "700", color: t.foreground });
    expect(webSkin.segmentLabel(t, false)).toEqual({ fontWeight: "700", color: t["muted-foreground"] });
  });

  it("sits its 27 px segments in a 35 px track at the default size, DF's, and steps 4 either way", () => {
    const track = (size: "small" | "default" | "large") => (webSkin.segmentSize![size].height as number) + 2 * 3 + 2;
    expect([track("small"), track("default"), track("large")]).toEqual([31, 35, 39]);
  });

  it("renders the selected segment on the thumb and the rest bare, inside the track", () => {
    render(<ThemeProvider light solid><ButtonGroup items={["Day", "Week", "Month"]} defaultActive={0} accessibilityLabel="Range" /></ThemeProvider>);
    const track = screen.getByRole("tablist", { name: "Range" });
    expect(flat(track.style.backgroundColor)).toBe(rgba(t.secondary));
    const [day, week] = screen.getAllByRole("tab");
    expect(flat(day.style.backgroundColor)).toBe(rgba(t.card));
    expect(day.style.boxShadow).toContain("-6px");
    expect(week.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
  });

  it("gives the split, stepper and spaced cells the Button's pill heights", () => {
    expect([webSkin.cellSize!.small.height, webSkin.cellSize!.default.height, webSkin.cellSize!.large.height]).toEqual([29, 36, 40]);
    expect(webSkin.spacedSurface!(t)).toEqual({ borderWidth: 1, borderColor: t.border, backgroundColor: "transparent" });
    expect(webSkin.splitPrimary(t)).toMatchObject({ borderTopStartRadius: 9999, borderBottomStartRadius: 9999 });
    expect(webSkin.stepperArrowLeft).toEqual({ borderTopStartRadius: 9999, borderBottomStartRadius: 9999 });
  });
});

describe("the split under glass is its call to action's brand glass", () => {
  it("tints the material with the action colour and keeps the action ink on top, as a primary Button does", async () => {
    const { container } = render(<ThemeProvider light glass><ButtonGroup split items={["Save"]} menu={["Save copy"]} testID="split" /></ThemeProvider>);
    await waitFor(() => expect(container.querySelectorAll('[data-testid="glass-material"]').length).toBeGreaterThan(0));
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(actionInk(t).slice(i, i + 2), 16));
    expect(flat(screen.getByText("Save").style.color)).toBe(`rgba(${r},${g},${b},1.00)`);
    const tint = flat(brandTint(actionFill(t), t.background, actionInk(t)));
    const fills = [...container.querySelectorAll<HTMLElement>('[data-testid="split"] *')].map((node) => flat(node.style.backgroundColor));
    expect(fills.some((fill) => fill.startsWith(tint.slice(0, tint.lastIndexOf(","))))).toBe(true);
  });
});
