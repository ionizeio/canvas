import { useEffect, type ComponentType, type ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { act, render, cleanup, fireEvent, screen } from "@testing-library/react";
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
// the table's measured width through the handler RNW attaches to the root node.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function measure(width: number) {
  const handler = (screen.getByTestId("table") as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The table root has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 400 } }, timeStamp: 1 }));
}

// Three 110px pan minimums: the table only carries this floor while it pans.
const PAN_MIN = "330px";
const pansNow = () => screen.getByRole("table").style.minWidth === PAN_MIN;

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
