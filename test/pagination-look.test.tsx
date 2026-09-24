import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { I18nManager } from "react-native";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as iconModule from "../src/atoms/icon/icon.tsx";
import * as touchTargetSeed from "../src/style/touch-target-seed.ts";
import { webHover } from "../src/style/hover.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { Pagination } from "../src/atoms/pagination/pagination.tsx";
import { arrowIcon } from "../src/atoms/pagination/pagination.shared.tsx";
import { Pagination as IOSPagination } from "../src/atoms/pagination/pagination.ios.tsx";
import { Pagination as AndroidPagination } from "../src/atoms/pagination/pagination.android.tsx";
import { webSkin, iosSkin, androidSkin, itemSize, arrowSize, labelSize, type Size } from "../src/atoms/pagination/pagination.styles.ts";
import { webSkin as buttonSkin } from "../src/atoms/button/button.styles.ts";

// Pagination has no platform control and no Dark Factory counterpart, so every platform
// takes one look built from Dark Factory's parts (SKN-4c): bare page pills in the
// foreground ink, the current page DF's violet pill, hairline arrow circles around chevron
// icons, DF's hover wash on a resting cell, and DF's disabled look in place of a dim.

afterEach(cleanup);

const t = lightColors;
const flat = (value: string) => value.replace(/\s/g, "");
const hex = (color: string) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
const rgbaOf = (color: string) => `rgba(${hex(color).join(",")},1.00)`;

describe("Dark Factory's pager on every platform", () => {
  it("is one skin on the web, iOS and Android", () => {
    expect(iosSkin).toBe(webSkin);
    expect(androidSkin).toBe(webSkin);
  });

  it("draws the pages as pills, the current one DF's violet pill, in 700 labels", () => {
    expect(webSkin.pageBox(t, false)).toMatchObject({ borderRadius: 9999, borderWidth: 1, borderColor: "transparent", backgroundColor: "transparent" });
    expect(webSkin.pageBox(t, true)).toMatchObject({ borderRadius: 9999, borderWidth: 1, borderColor: t.primary, backgroundColor: t.primary });
    expect(webSkin.pageLabel(t, false)).toEqual({ fontWeight: "700", color: t.foreground });
    expect(webSkin.pageLabel(t, true)).toEqual({ fontWeight: "700", color: t["primary-foreground"] });
  });

  it("draws the arrows and the rows-per-page trigger as transparent hairline pills", () => {
    for (const box of [webSkin.controlBox(t), webSkin.selectorBox(t)]) {
      expect(box).toMatchObject({ borderRadius: 9999, borderWidth: 1, borderColor: t.border, backgroundColor: "transparent" });
    }
    expect(webSkin.controlLabel(t, false).color).toBe(t.foreground);
    expect(webSkin.mutedLabel(t)).toEqual({ fontWeight: "500", color: t["muted-foreground"] });
  });

  it("is the web Button's pill heights and label type at every size, so it lines up beside one", () => {
    const opts = { icon: true, block: false, dim: false, disabled: false };
    const buttonSize = { small: "small", default: "base", large: "large" } as const;
    for (const size of ["small", "default", "large"] as Size[]) {
      const square = buttonSkin.container(t, "outline", buttonSize[size], opts);
      expect(itemSize[size].height, size).toBe(square.height);
      expect(arrowSize[size], size).toEqual({ width: square.width, height: square.height });
      const label = buttonSkin.label(t, "outline", buttonSize[size], opts);
      expect(labelSize[size], size).toEqual({ fontSize: label.fontSize, lineHeight: label.lineHeight });
    }
  });

  it("shows DF's disabled look rather than a dim: muted inks, the hairlines kept, the current page a hairline pill", () => {
    // The edge is all that marks a disabled current page, so it is the 3:1 `input` line.
    expect(webSkin.pageBox(t, true, true)).toMatchObject({ borderColor: t.input, backgroundColor: "transparent" });
    expect(webSkin.pageLabel(t, true, true).color).toBe(t["muted-foreground"]);
    expect(webSkin.pageLabel(t, false, true).color).toBe(t["muted-foreground"]);
    expect(webSkin.controlLabel(t, true).color).toBe(t["muted-foreground"]);
    render(<ThemeProvider light solid><Pagination disabled total={3} defaultPage={2} /></ThemeProvider>);
    for (const button of screen.getAllByRole("button")) expect(button.style.opacity, button.getAttribute("aria-label") ?? "").toBe("");
    const current = screen.getByRole("button", { name: "Page 2" });
    expect(flat(current.style.borderTopColor)).toBe(rgbaOf(t.input));
    expect(current.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
  });
});

describe("the pager renders kit icons, not text glyphs", () => {
  // The test DOM stubs react-native-svg (tools/rnw-preload.ts), so an Icon draws nothing
  // there; a spy on the Icon export reads which glyph each one was asked for, in order.
  const glyphs = (ui: React.ReactElement) => {
    const spy = spyOn(iconModule, "Icon");
    try {
      render(ui);
      return spy.mock.calls.map(([props]) => Object.keys(props).find((key) => key !== "decorative" && (props as Record<string, unknown>)[key] === true));
    } finally {
      spy.mockRestore();
    }
  };

  it("draws a chevron in each arrow and an ellipsis in each gap, and no text glyph", () => {
    const drawn = glyphs(<ThemeProvider light solid><Pagination total={12} defaultPage={6} testID="pages" /></ThemeProvider>);
    expect(drawn).toEqual(["chevronLeft", "moreHorizontal", "moreHorizontal", "chevronRight"]);
    for (const name of ["Previous page", "Next page"]) expect(screen.getByRole("button", { name }).textContent, name).toBe("");
    expect((screen.getByTestId("pages").textContent ?? "")).not.toMatch(/[‹›…▾]/);
  });

  it("draws a chevron-down in the rows-per-page trigger", () => {
    const drawn = glyphs(<ThemeProvider light solid><Pagination withSize total={12} /></ThemeProvider>);
    expect(drawn).toEqual(["chevronDown", "chevronLeft", "chevronRight"]);
    expect(screen.getByRole("button", { name: "Rows per page" }).textContent).toBe("10");
  });

  it("points Previous along the reading direction, so it points right under right-to-left", () => {
    expect([arrowIcon("previous", false), arrowIcon("next", false)]).toEqual(["chevronLeft", "chevronRight"]);
    expect([arrowIcon("previous", true), arrowIcon("next", true)]).toEqual(["chevronRight", "chevronLeft"]);
    const original = I18nManager.getConstants;
    I18nManager.getConstants = () => ({ ...original.call(I18nManager), isRTL: true });
    try {
      expect(glyphs(<ThemeProvider light solid><Pagination total={3} defaultPage={2} /></ThemeProvider>)).toEqual(["chevronRight", "chevronLeft"]);
    } finally {
      I18nManager.getConstants = original;
    }
  });
});

describe("hover and platforms", () => {
  it("washes a resting page and an arrow at once on hover, never the current page or a disabled arrow", () => {
    render(<ThemeProvider light solid><Pagination total={3} defaultPage={1} /></ThemeProvider>);
    const wash = /rgba\(123,\s*108,\s*240,\s*0\.08\)/;
    for (const name of ["Page 2", "Next page"]) {
      const cell = screen.getByRole("button", { name });
      expect(cell.style.getPropertyValue("transition-property"), name).toBe("");
      fireEvent.pointerEnter(cell, { pointerType: "mouse" });
      expect(cell.style.backgroundColor, name).toMatch(wash);
      fireEvent.pointerLeave(cell);
      expect(cell.style.backgroundColor, name).not.toMatch(wash);
    }
    const current = screen.getByRole("button", { name: "Page 1" });
    fireEvent.pointerEnter(current, { pointerType: "mouse" });
    expect(flat(current.style.backgroundColor)).toBe(rgbaOf(t.primary));
    // Page 1 is the first page, so Previous is disabled.
    const previous = screen.getByRole("button", { name: "Previous page" });
    fireEvent.pointerEnter(previous, { pointerType: "mouse" });
    expect(previous.style.backgroundColor).not.toMatch(wash);
  });

  it("washes the rows-per-page trigger on hover, and nothing in a disabled pager", () => {
    const wash = /rgba\(123,\s*108,\s*240,\s*0\.08\)/;
    render(<ThemeProvider light solid><Pagination withSize total={3} /></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: "Rows per page" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(trigger.style.backgroundColor).toMatch(wash);
    cleanup();
    render(
      <ThemeProvider light solid>
        <Pagination disabled total={3} defaultPage={1} />
        <Pagination disabled withSize total={3} />
      </ThemeProvider>,
    );
    for (const cell of [screen.getByRole("button", { name: "Page 2" }), screen.getByRole("button", { name: "Rows per page" }), ...screen.getAllByRole("button", { name: "Next page" })]) {
      fireEvent.pointerEnter(cell, { pointerType: "mouse" });
      expect(cell.style.backgroundColor, cell.getAttribute("aria-label") ?? "").not.toMatch(wash);
    }
  });

  it("declares the wash on the web only: native pointer hover waits on the owner", () => {
    const look = { backgroundColor: t.hover };
    expect(webHover(look, "web")).toBe(look);
    expect(webHover(look, "ios")).toBeNull();
    expect(webHover(look, "android")).toBeNull();
    // The test DOM is the web build, where the shared skin keeps its wash.
    expect(webSkin.hover?.(t)).toEqual(look);
  });

  it("grows the arrows' touch area vertically beside a page, and both ways beside the compact count", () => {
    const axes = (ui: React.ReactElement) => {
      const spy = spyOn(touchTargetSeed, "useSeededMinTargetSlop");
      try {
        render(ui);
        return spy.mock.calls.map(([, , options]) => options?.axis ?? "both");
      } finally {
        spy.mockRestore();
        cleanup();
      }
    };
    // Numbered: the two arrows and three pages, all 4px apart.
    expect(axes(<ThemeProvider light solid><Pagination total={3} /></ThemeProvider>)).toEqual(["vertical", "vertical", "vertical", "vertical", "vertical"]);
    // Compact: the two arrows sit beside the count.
    expect(axes(<ThemeProvider light solid><Pagination compact total={3} /></ThemeProvider>)).toEqual(["both", "both"]);
    // With size: the trigger has room; the arrows sit 4px apart.
    expect(axes(<ThemeProvider light solid><Pagination withSize total={3} /></ThemeProvider>)).toEqual(["both", "vertical", "vertical"]);
  });

  it("reads the item range beside the size selector when itemCount is set, as the prop promises", () => {
    render(<ThemeProvider light solid><Pagination withSize itemCount={118} total={12} defaultPage={2} defaultPageSize={10} /></ThemeProvider>);
    expect(screen.getByText("Showing 11-20 of 118")).toBeTruthy();
    cleanup();
    render(<ThemeProvider light solid><Pagination withSize total={12} defaultPage={2} /></ThemeProvider>);
    expect(screen.getByText("Page 2 of 12")).toBeTruthy();
  });

  it("renders the same pager from the iOS and Android entries", () => {
    render(
      <ThemeProvider light solid>
        <IOSPagination total={3} defaultPage={2} testID="ios" />
        <AndroidPagination total={3} defaultPage={2} testID="android" />
      </ThemeProvider>,
    );
    for (const id of ["ios", "android"]) {
      const current = document.querySelector(`[data-testid="${id}"] [aria-current="page"]`) as HTMLElement;
      expect(flat(current.style.backgroundColor), id).toBe(rgbaOf(t.primary));
      expect(flat(getComputedStyle(current.querySelector("div") as HTMLElement).color), id).toBe(rgbaOf(t["primary-foreground"]));
    }
  });
});
