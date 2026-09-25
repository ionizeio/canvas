import { useEffect, type ComponentType, type ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { act, render, cleanup, fireEvent, screen } from "@testing-library/react";
import { AccessibilityInfo, Platform } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { DataTable, type DataTableProps } from "../src/organisms/data-table/data-table.tsx";
import { DataTable as AndroidDataTable } from "../src/organisms/data-table/data-table.android.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";

// Below the sm width a web or Android DataTable pans its columns inside a
// horizontal scroller. Crossing that width changes the layout only, never the
// element tree: a remount would drop a stateful cell's state, an open editor's
// text and focus, and a windowed body's scroll position, on every resize across
// 640 and once on every phone mount (the table is unmeasured on its first frame).

let warnSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  resetDevWarnings();
  warnSpy = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  cleanup();
});
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// happy-dom has no ResizeObserver, so RNW never fires onLayout on its own: deliver
// a node's measured width through the handler RNW attaches to it.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layOut(node: HTMLElement, width: number) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The node has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 400 } }, timeStamp: 1 }));
}
const measure = (width: number) => layOut(screen.getByTestId("table"), width);

// The horizontal scroller around the table, and its content container (whose layout
// React Native reports as the content size).
const content = () => screen.getByRole("table").parentElement as HTMLElement;
const scroller = () => content().parentElement as HTMLElement;
// Lay the table out at `width` with its scroller's content `contentWidth` wide, as the
// native layout would: the content is the scrollport's width unless the pan minimum
// is wider.
function layOutScroller(width: number, contentWidth = width) {
  measure(width);
  layOut(scroller(), width);
  layOut(content(), contentWidth);
}
// react-native-web renders `scrollEnabled={false}` as touch-action: none.
const takesDrags = () => getComputedStyle(scroller()).touchAction !== "none";

// Three 110px pan minimums: the scroller's content only carries this floor while
// the table pans.
const PAN_MIN = "330px";
const pansNow = () => content().style.minWidth === PAN_MIN;

// A cell that counts its mounts, standing in for any stateful custom cell.
let mounts = 0;
function Live({ label }: { label: string }) {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <Badge>{label}</Badge>;
}
beforeEach(() => {
  mounts = 0;
});

// Unmeasured (a phone's first frame), then across the breakpoint both ways.
function crossBreakpoint() {
  for (const [width, panning] of [[375, true], [1280, false], [375, true], [1280, false]] as const) {
    measure(width);
    expect(pansNow()).toBe(panning);
  }
}

const COLUMNS = ["Name", "Status", "Team"];

for (const [platform, Table] of [["web", DataTable], ["android", AndroidDataTable]] as Array<[string, ComponentType<DataTableProps>]>) {
  describe(`DataTable panning keeps its tree (${platform})`, () => {
    it("keeps the header, the rows, stateful cells and an open editor with its text and focus", () => {
      const rows = [
        ["Ada", <Live key="a" label="Active" />, "Eng"],
        ["Bob", <Live key="b" label="Away" />, "Ops"],
      ];
      ui(<Table testID="table" inlineEdit onCellCommit={() => {}} columns={COLUMNS} rows={rows} />);
      fireEvent.click(screen.getByText("Eng"));
      const field = screen.getByDisplayValue("Eng") as HTMLInputElement;
      expect(document.activeElement).toBe(field);
      fireEvent.change(field, { target: { value: "Engineering" } });
      const nodes = [screen.getByText("Name"), ...screen.getAllByRole("row"), field];
      expect(mounts).toBe(2);

      crossBreakpoint();

      expect(mounts).toBe(2);
      expect([screen.getByText("Name"), ...screen.getAllByRole("row"), screen.getByDisplayValue("Engineering")]).toEqual(nodes);
      expect(nodes.every((node) => node.isConnected)).toBe(true);
      expect(document.activeElement).toBe(field);
    });

    it("keeps a stateful emptyMessage mounted", () => {
      ui(<Table testID="table" columns={COLUMNS} rows={[]} emptyMessage={<Live label="No users yet" />} />);
      const message = screen.getByText("No users yet");

      crossBreakpoint();

      expect(mounts).toBe(1);
      expect(screen.getByText("No users yet")).toBe(message);
    });

    it("clips the table and lets a panning, height-bounded table shrink its rows", () => {
      // The table clips what overflows it in both states (as its wrap did before the
      // scroller was always there); fitting, the rows stay rigid; panning, the scroller
      // keeps its own flex, so a bounded table clips its rows inside it and keeps its
      // footer.
      const rows = Array.from({ length: 12 }, (_, i) => [`Name ${i}`, "Active", "Eng"]);
      ui(<Table testID="table" paginated style={{ height: 220 }} columns={COLUMNS} rows={rows} />);
      for (const [width, panning] of [[1280, false], [375, true], [1280, false]] as const) {
        measure(width);
        expect(pansNow()).toBe(panning);
        expect(getComputedStyle(scroller()).overflowX).toBe("auto");
        expect(getComputedStyle(scroller()).flexShrink).toBe(panning ? "1" : "0");
        expect(getComputedStyle(screen.getByRole("table")).overflowX).toBe("hidden");
      }
    });

    it("bounds the panned width by the scrollport and the column minimums, never by the cells", () => {
      // A horizontal scroller lays its content out with no width bound, so content
      // that is free to grow sets each cell's text on one line and the longest cell
      // sets the table's width (a 1,507-character description made the docs' prop
      // table about 9,500 px wide on a phone, with every other row's description off
      // screen). The content is the scrollport's width, floored by the minimums while
      // panning, and the table fills it: the cells share that width and wrap.
      const long = "A description long enough to run far past any phone's width. ".repeat(20);
      ui(<Table testID="table" columns={COLUMNS} rows={[["Ada", long, "Eng"]]} />);
      for (const [width, panning] of [[1280, false], [375, true], [1280, false]] as const) {
        measure(width);
        expect(pansNow()).toBe(panning);
        for (const node of [content(), screen.getByRole("table")]) {
          const style = getComputedStyle(node);
          expect(style.width).toBe("100%");
          expect(style.flexGrow).not.toBe("1");
        }
        expect(getComputedStyle(content()).minWidth).toBe(panning ? PAN_MIN : "0px");
      }
    });

    it("keeps its scroller taking drags on the web, fitting or not", () => {
      // The docs' three-up renders the Android entry on the web as well. A disabled
      // scroller there would set touch-action: none, and a finger on a table that
      // fits could no longer scroll the page.
      ui(<Table testID="table" columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
      expect(takesDrags()).toBe(true);
      for (const [width, contentWidth] of [[1280, 1280], [375, 375], [320, 330], [1280, 1280]] as const) {
        layOutScroller(width, contentWidth);
        expect(takesDrags()).toBe(true);
        expect(getComputedStyle(scroller()).overflowX).toBe("auto");
      }
    });

    it("keeps a windowed body's scroller, and with it the scroll position", () => {
      const rows = Array.from({ length: 40 }, (_, i) => [`Name ${i}`, "Active", "Eng"]);
      ui(<Table testID="table" virtualized style={{ maxHeight: 300 }} columns={COLUMNS} rows={rows} />);
      const body = Array.from(screen.getByTestId("table").querySelectorAll("div")).find(
        (node) => getComputedStyle(node).overflowY === "auto",
      );
      if (!body) throw new Error("Expected the windowed body's vertical scroller");
      body.scrollTop = 120;

      crossBreakpoint();

      expect(body.isConnected).toBe(true);
      expect(body.scrollTop).toBe(120);
    });
  });
}

// Android's HorizontalScrollView claims any sideways drag past touch slop even when it
// cannot scroll, so on Android the scroller takes a drag only while the table
// overflows it: a fitting table must not cancel a row's press that drifts sideways or
// keep the page from scrolling. This holds for every entry an Android device renders
// (the docs' three-up draws the web entry there too). TalkBack's touch exploration is
// off here; while it is on the scroller stays enabled (test/scroll-focus.test.tsx).
async function onAndroid(run: () => Promise<void>) {
  const original = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
  const read = spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false);
  try {
    await run();
  } finally {
    cleanup();
    read.mockRestore();
    Object.defineProperty(Platform, "OS", original);
  }
}

for (const [platform, Table] of [["web", DataTable], ["android", AndroidDataTable]] as Array<[string, ComponentType<DataTableProps>]>) {
  it(`takes a drag on Android only while the table overflows its scroller (${platform} entry)`, () => onAndroid(async () => {
    const rows = [
      ["Ada", <Live key="a" label="Active" />, "Eng"],
      ["Bob", <Live key="b" label="Away" />, "Ops"],
    ];
    ui(<Table testID="table" onRowPress={() => {}} columns={COLUMNS} rows={rows} />);
    // Let the touch exploration read settle.
    await act(async () => {});
    const nodes = [scroller(), ...screen.getAllByRole("row")];
    expect(takesDrags()).toBe(false);
    // Fitting; panning with room to spare (three 110px minimums in 375); panning past
    // the scrollport (330 in 320); fitting again.
    for (const [width, contentWidth, drags] of [[1280, 1280, false], [375, 375, false], [320, 330, true], [1280, 1280, false]] as const) {
      layOutScroller(width, contentWidth);
      expect(takesDrags()).toBe(drags);
    }
    expect([scroller(), ...screen.getAllByRole("row")]).toEqual(nodes);
    expect(mounts).toBe(2);
  }));
}
