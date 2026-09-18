import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, UIManager, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Pagination as WebPagination } from "../src/atoms/pagination/pagination.tsx";
import { Pagination as IOSPagination } from "../src/atoms/pagination/pagination.ios.tsx";
import { Pagination as AndroidPagination } from "../src/atoms/pagination/pagination.android.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

// In glass mode the numbered Pagination's selected brand puck travels as one
// measured control-layer surface between page cells, keyed by page number. A
// window shift re-measures every cell first: the surface travels when the page
// it sits on kept its frame and resets in place when that page moved or left
// the window, never inventing travel from a stale slot. Compact variants and
// solid mode keep their anatomy.

afterEach(cleanup);

const platforms = [["web", WebPagination], ["ios", IOSPagination], ["android", AndroidPagination]] as const;

function measurePage(page: number, rect: LayoutRectangle) {
  const cell = screen.getByRole("button", { name: `Page ${page}` });
  for (let host = cell.parentElement; host; host = host.parentElement) {
    if ((host as unknown as { __reactLayoutHandler?: unknown }).__reactLayoutHandler) {
      layoutElement(host, rect);
      return;
    }
  }
  throw new Error(`Missing measured cell for page ${page}`);
}
const slot = (index: number): LayoutRectangle => ({ x: 44 + index * 44, y: 0, width: 40, height: 40 });
// A shifted window re-measures its cells through measureLayout against the row;
// the test DOM has no layout, so the measurement answers from this table (page
// number -> rect), which each scenario fills in for the window it expects.
const table: Record<number, LayoutRectangle> = {};
function mockCellMeasurement() {
  return spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, onFail, onSuccess) => {
    const label = (node as unknown as HTMLElement).querySelector('[role="button"]')?.getAttribute("aria-label") ?? "";
    const rect = table[Number(label.replace("Page ", ""))];
    if (rect) onSuccess(rect.x, rect.y, rect.width, rect.height);
    else onFail();
  });
}
function fill(pages: number[]) {
  for (const key of Object.keys(table)) delete table[Number(key)];
  pages.forEach((page, index) => { table[page] = slot(index); });
}
function frame() {
  const { style } = screen.getByTestId("pages-selection-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}

describe("Pagination moving glass selection", () => {
  for (const [platform, Pagination] of platforms) {
    it(`${platform}: travels between visible pages, keeping numbers and aria-current fixed`, async () => {
      const { unmount } = render(<ThemeProvider glass><Pagination total={5} defaultPage={2} testID="pages" /></ThemeProvider>);
      await act(async () => {});
      for (let p = 1; p <= 5; p++) measurePage(p, slot(p - 1));
      const four = screen.getByRole("button", { name: "Page 4" });
      const label = screen.getByText("4");
      const clock = animationClock();
      try {
        expect(screen.getAllByTestId("pages-selection")).toHaveLength(1);
        expect(frame()).toEqual(slot(1));
        fireEvent.click(four);
        expect(four.getAttribute("aria-current")).toBe("page");
        expect(screen.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBeNull();
        expect(frame().x).toBe(slot(1).x);
        clock.advance(80);
        expect(frame().width).toBeGreaterThan(40);
        expect(screen.getByText("4")).toBe(label);
        expect(label.style.transform).toBe("");
        clock.advance(1600);
        expect(frame()).toEqual(slot(3));
      } finally { unmount(); clock.restore(); }
    });
  }

  it("travels across a window shift when the page it sits on keeps its frame, and resets when that page moves or leaves", async () => {
    const measure = mockCellMeasurement();
    const { unmount } = render(<ThemeProvider glass><WebPagination total={20} defaultPage={2} testID="pages" /></ThemeProvider>);
    await act(async () => {});
    // Window at page 2: 1 2 3 … 20
    measurePage(1, slot(0)); measurePage(2, slot(1)); measurePage(3, slot(2)); measurePage(20, slot(4));
    expect(frame()).toEqual(slot(1));
    const clock = animationClock();
    try {
      // 2 -> 3 grows the window to 1 2 3 4 … 20. Page 2 keeps its frame, so the
      // surface glides from it to page 3 like any selection.
      fill([1, 2, 3, 4, 20]);
      fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
      expect(screen.getByRole("button", { name: "Page 3" }).getAttribute("aria-current")).toBe("page");
      expect(frame().x).toBe(slot(1).x);
      clock.advance(80);
      expect(frame().width).toBeGreaterThan(40);
      clock.advance(1600);
      expect(frame()).toEqual(slot(2));
      // 3 -> 20 shifts to 1 … 19 20: page 3 leaves the window, so the surface
      // resets onto page 20's fresh frame with no travel.
      fill([1, 3, 19, 20]);
      table[19] = slot(2); table[20] = slot(3); delete table[3];
      fireEvent.click(screen.getByRole("button", { name: "Page 20" }));
      expect(frame()).toEqual(slot(3));
      clock.advance(80);
      expect(frame()).toEqual(slot(3));
      // 20 -> 19 shifts to 1 … 18 19 20: page 20 moves one slot right, so the
      // surface resets onto page 19 instead of gliding from the stale slot.
      fill([1, 18, 19, 20]);
      table[18] = slot(2); table[19] = slot(3); table[20] = slot(4);
      fireEvent.click(screen.getByRole("button", { name: "Page 19" }));
      expect(frame()).toEqual(slot(3));
      clock.advance(80);
      expect(frame()).toEqual(slot(3));
      expect(screen.getAllByTestId("pages-selection")).toHaveLength(1);
    } finally { unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("holds its place while a shifted window is still being measured", async () => {
    const pendingMeasure = spyOn(UIManager, "measureLayout").mockImplementation(() => {});
    const { unmount } = render(<ThemeProvider glass><WebPagination total={20} defaultPage={2} testID="pages" /></ThemeProvider>);
    await act(async () => {});
    measurePage(1, slot(0)); measurePage(2, slot(1)); measurePage(3, slot(2)); measurePage(20, slot(4));
    expect(frame()).toEqual(slot(1));
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
      // The measurement never answers: the surface stays on page 2's frame and the
      // selected cell paints no puck of its own beneath the label.
      clock.advance(200);
      expect(frame()).toEqual(slot(1));
      expect(screen.getAllByTestId("pages-selection")).toHaveLength(1);
      // A cell reporting its own frame under the shifted window does not release it either.
      measurePage(4, slot(3));
      expect(frame()).toEqual(slot(1));
    } finally { unmount(); clock.restore(); pendingMeasure.mockRestore(); }
  });

  it("keeps the compact variant and solid mode without a moving surface", async () => {
    const compact = render(<ThemeProvider glass><WebPagination compact total={5} defaultPage={2} testID="pages" /></ThemeProvider>);
    await act(async () => {});
    expect(screen.queryByTestId("pages-selection-motion")).toBeNull();
    compact.unmount();
    const solid = render(<ThemeProvider solid><WebPagination total={5} defaultPage={2} testID="pages" /></ThemeProvider>);
    await act(async () => {});
    measurePage(2, slot(1));
    expect(screen.queryByTestId("pages-selection-motion")).toBeNull();
    solid.unmount();
  });

  it("selects the measured bounds immediately under Reduce Motion", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(<ThemeProvider glass><WebPagination total={5} defaultPage={1} testID="pages" /></ThemeProvider>);
      await act(async () => {});
      for (let p = 1; p <= 5; p++) measurePage(p, slot(p - 1));
      fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
      await act(async () => {});
      expect(frame()).toEqual(slot(4));
      unmount();
    } finally { reduced.mockRestore(); }
  });
});
