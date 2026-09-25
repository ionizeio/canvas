import { type ComponentType, type ReactNode } from "react";
import { describe, it, expect, afterEach } from "bun:test";
import { act, render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { FOCUS_RING_OFFSET } from "../src/style/pressable.tsx";
import { Heatmap, type HeatmapProps } from "../src/charts/heatmap/heatmap.tsx";
import { Heatmap as IOSHeatmap } from "../src/charts/heatmap/heatmap.ios.tsx";
import { Heatmap as AndroidHeatmap } from "../src/charts/heatmap/heatmap.android.tsx";
import { LOOKS, lookProps } from "./fixtures/looks.ts";

// The calendar Heatmap's day cells are pointer-only: the grid's image role and
// summarizing name carry the data, so a year of days is not a year of tab stops.
// react-native-web's Pressable stays a tab stop whatever `focusable` says, so each cell
// also passes tabIndex={-1}. The keyboard's one stop is then the scroller, and only
// while the grid overflows it (the scrollport hook DataTable, CodeBlock and Carousel
// share): Tab lands on it and the arrow keys pan it. It takes no role or name of its
// own, since Chromium names it from the one image inside
// (e2e/behavior/scroll-focus.e2e.ts reads that name), and it carries the
// kit's themed ring like any focusable node that is not a Pressable. Every entry the
// docs' three-up renders on the web behaves the same, and the element tree stays put
// while the stop comes and goes.

afterEach(cleanup);

// happy-dom has no ResizeObserver, so RNW never fires onLayout on its own: deliver a
// node's measured width through the handler RNW attaches to it.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layOut(node: HTMLElement, width: number) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The node has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 120 } }, timeStamp: 1 }));
}

// The one horizontal scroller in the tree: RNW styles it overflow-x auto, or hidden
// with touch-action none while scrolling is disabled. Its content container (whose
// layout RNW reports as the content size) is its first child.
function scroller(): HTMLElement {
  const found = (Array.from(document.body.querySelectorAll("div")) as HTMLElement[]).filter((node) => {
    const { overflowX, touchAction } = getComputedStyle(node);
    return overflowX === "auto" || (overflowX === "hidden" && touchAction === "none");
  });
  if (found.length !== 1) throw new Error(`expected one horizontal scroller, found ${found.length}`);
  return found[0]!;
}
const content = () => scroller().firstElementChild as HTMLElement;

// Lay the scroller out `viewport` wide around content `contentWidth` wide.
function layOutScroller(viewport: number, contentWidth: number) {
  layOut(scroller(), viewport);
  layOut(content(), contentWidth);
}

// The docs page's numbers: a 773 px year in a 284 px phone stage, and a stage wide
// enough to hold it. Fitting; overflowing; fitting again at a wider scrollport.
const STATES = [[900, 773, false], [284, 773, true], [900, 773, false]] as const;

// 21 days fill three whole weeks, so no empty slot pads the last column; their counts
// add up to 210.
const days = Array.from({ length: 21 }, (_, i) => ({ value: (i % 5) / 4, count: i, date: `2026-03-${String(i + 1).padStart(2, "0")}` }));
const NAME = "Activity, 21 days, 210 total";

const image = () => screen.getByRole("img", { name: NAME });

// The grid's day cells, in column order: its only 11px squares (the weekday gutter's
// rows are 11px tall but carry no width).
function dayCells(): HTMLElement[] {
  return (Array.from(image().querySelectorAll("div")) as HTMLElement[]).filter(
    (node) => node.style.width === "11px" && node.style.height === "11px",
  );
}

// Every node under `root` that Tab would stop on, named so a failure prints readably
// (a failed match over DOM nodes would try to print their React internals).
function tabStops(root: HTMLElement): string[] {
  const cells = dayCells();
  return (Array.from(root.querySelectorAll("*")) as HTMLElement[])
    .filter((node) => node.tabIndex >= 0)
    .map((node) => (node === scroller() ? "scroller" : cells.includes(node) ? `day ${cells.indexOf(node) + 1}` : node.outerHTML.slice(0, 80)));
}

const ENTRIES: Array<[string, ComponentType<HeatmapProps>]> = [["web", Heatmap], ["ios", IOSHeatmap], ["android", AndroidHeatmap]];

const ui = (node: ReactNode, props: { scheme?: "light" | "dark"; mint?: boolean } = {}) => render(<ThemeProvider solid {...props}>{node}</ThemeProvider>);

for (const [entry, Entry] of ENTRIES) {
  describe(`calendar Heatmap keyboard stop (${entry} entry)`, () => {
    it("keeps every day cell out of the tab order and stops on the scroller only while the grid overflows", () => {
      ui(<Entry calendar label="Activity" values={days} testID="heatmap" />);
      const root = screen.getByTestId("heatmap");
      expect(dayCells().length).toBe(21);
      const kept = [scroller(), content(), image(), ...dayCells()];
      // Unmeasured, it cannot know the grid overflows.
      expect(tabStops(root)).toEqual([]);
      for (const [viewport, contentWidth, overflows] of STATES) {
        layOutScroller(viewport, contentWidth);
        expect(tabStops(root)).toEqual(overflows ? ["scroller"] : []);
        expect(scroller().getAttribute("tabindex")).toBe(overflows ? "0" : "-1");
        for (const cell of dayCells()) expect(cell.getAttribute("tabindex")).toBe("-1");
      }
      const now = [scroller(), content(), image(), ...dayCells()];
      expect(now.length).toBe(kept.length);
      expect(now.every((node, i) => node === kept[i])).toBe(true);
    });

    it("leaves the stop's name to the one image inside it", () => {
      ui(<Entry calendar label="Activity" values={days} />);
      layOutScroller(284, 773);
      expect(scroller().getAttribute("role")).toBeNull();
      expect(scroller().getAttribute("aria-label")).toBeNull();
      expect(content().children.length).toBe(1);
      expect(content().firstElementChild === image()).toBe(true);
    });

    it("still inspects a day on press", () => {
      ui(<Entry calendar label="Activity" values={days} />);
      layOutScroller(284, 773);
      // The ninth day (March 9, in the second week column) opens its inspect flag.
      fireEvent.click(dayCells()[8]!);
      expect(screen.getByText("Mar 9, 2026")).toBeTruthy();
    });
  });
}

const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};

describe("calendar Heatmap scroller focus ring", () => {
  for (const look of LOOKS) {
    it(`takes the ${look.name} palette's ring, around the scroller`, () => {
      ui(<Heatmap calendar label="Activity" values={days} />, lookProps(look));
      layOutScroller(284, 773);
      const node = scroller();
      expect(channels(node.style.getPropertyValue("outline-color"))).toBe(channels(look.tokens.ring));
      expect(node.style.getPropertyValue("outline-offset")).toBe(`${FOCUS_RING_OFFSET}px`);
      // The browser draws it: no style is forced, so it only shows on keyboard focus.
      expect(node.style.getPropertyValue("outline-style")).toBe("");
    });
  }
});
