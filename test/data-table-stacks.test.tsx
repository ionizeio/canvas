import { useEffect, type ComponentType, type ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { act, render, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { DataTable, type DataTableProps } from "../src/organisms/data-table/data-table.tsx";
import { DataTable as AndroidDataTable } from "../src/organisms/data-table/data-table.android.tsx";
import { DataTable as IosDataTable } from "../src/organisms/data-table/data-table.ios.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { resizeViewport } from "./viewport.ts";

// DataTable `stacks`: at or below `stackBreakpoint` (default sm, 640) of its own
// container, each row lays its cells out top to bottom at the full width, every
// cell after the first under its column label, and the header row is drawn only
// while it holds a control. Crossing the breakpoint restyles the rows; it never
// remounts them, their cells, or an open editor.

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
// the table's measured width through the handler RNW attaches to it.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function measure(width: number) {
  const handler = (screen.getByTestId("table") as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The table has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 400 } }, timeStamp: 1 }));
}

const dataRows = () => screen.getAllByRole("row").filter((row) => within(row).queryAllByRole("columnheader").length === 0);
// A `stacks` table groups each row's cells in one box: a row side by side, a
// column stacked.
const stackedNow = () => {
  const group = within(dataRows()[0]!).getAllByRole("cell").at(-1)!.parentElement!;
  return getComputedStyle(group).flexDirection === "column";
};

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

const COLUMNS = ["Name", "Status", "Team"];
const ENTRIES = [["web", DataTable], ["android", AndroidDataTable], ["ios", IosDataTable]] as Array<[string, ComponentType<DataTableProps>]>;

for (const [platform, Table] of ENTRIES) {
  describe(`DataTable stacks (${platform})`, () => {
    it("stacks at and below the breakpoint and keeps rows, stateful cells and an open editor", () => {
      const rows = [
        ["Ada", <Live key="a" label="Active" />, "Eng"],
        ["Bob", <Live key="b" label="Away" />, "Ops"],
      ];
      ui(<Table testID="table" stacks inlineEdit onCellCommit={() => {}} columns={COLUMNS} rows={rows} />);
      fireEvent.click(screen.getByText("Eng"));
      const field = screen.getByDisplayValue("Eng") as HTMLInputElement;
      fireEvent.change(field, { target: { value: "Engineering" } });
      const nodes = [...dataRows(), field, screen.getByText("Active")];
      expect(mounts).toBe(2);

      for (const [width, stacked] of [[1280, false], [641, false], [640, true], [375, true], [1280, false]] as const) {
        measure(width);
        expect(stackedNow()).toBe(stacked);
        // Every column shows at every width (iOS stacks instead of collapsing).
        for (const row of dataRows()) expect(within(row).getAllByRole("cell")).toHaveLength(3);
        // Side by side the header names the columns; stacked, the later cells do.
        expect(screen.queryAllByRole("columnheader")).toHaveLength(stacked ? 0 : 3);
        const first = dataRows()[0]!;
        expect(within(first).queryByText("Status") != null).toBe(stacked);
        expect(within(first).queryByText("Team") != null).toBe(stacked);
        expect(within(first).queryByText("Name")).toBeNull();
      }

      expect(mounts).toBe(2);
      expect([...dataRows(), screen.getByDisplayValue("Engineering"), screen.getByText("Active")]).toEqual(nodes);
      expect(document.activeElement).toBe(field);
    });

    it("keeps a header that holds a control, as a wrapping band with no actions spacer", () => {
      ui(
        <Table
          testID="table"
          stacks
          sortable
          selectable
          onRowEdit={() => {}}
          onRowCommit={() => {}}
          columns={COLUMNS}
          rows={[["Ada", "Active", "Eng"]]}
        />,
      );
      // Side by side: select-all, three columns, and the actions spacer.
      expect(screen.getAllByRole("columnheader")).toHaveLength(5);
      measure(375);
      const headers = screen.getAllByRole("columnheader");
      expect(headers).toHaveLength(4);
      expect(within(headers[0]!).getByLabelText("Select all rows")).toBeTruthy();
      expect(getComputedStyle(headers[1]!.parentElement!).flexWrap).toBe("wrap");
      // Sorting still works from the stacked header.
      fireEvent.click(screen.getByLabelText("Name, sortable"));
      expect(screen.getByLabelText("Name, sorted ascending")).toBeTruthy();
      // The row keeps its selection box and its actions.
      expect(within(dataRows()[0]!).getByLabelText("Edit Ada")).toBeTruthy();
      expect(within(dataRows()[0]!).getAllByRole("checkbox")).toHaveLength(1);
    });

    it("labels no stacked cell whose column has no label", () => {
      // A trailing menu column is often unlabelled (the Profile and API keys
      // templates): stacked, its cell carries the menu alone.
      ui(<Table testID="table" stacks columns={["Name", "Status", ""]} rows={[["Ada", "Active", "Menu"]]} />);
      measure(375);
      const [, status, menu] = within(dataRows()[0]!).getAllByRole("cell");
      expect(status!.childElementCount).toBe(2);
      expect(menu!.childElementCount).toBe(1);
    });

    it("centers a stacked row's selection box and actions on its first line of cell text", () => {
      ui(
        <Table testID="table" stacks selectable onRowEdit={() => {}} onRowCommit={() => {}} columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />,
      );
      const cells = () => within(dataRows()[0]!).getAllByRole("cell");
      const bands = () => [cells()[0]!, cells().at(-1)!].map((cell) => getComputedStyle(cell).height);
      // Side by side the row centers them; stacked each fills one padded line.
      expect(bands()).toEqual(["", ""]);
      measure(375);
      const [first] = bands();
      expect(first).toMatch(/^\d+px$/);
      expect(bands()).toEqual([first, first]);
    });

    it("stacks its loading placeholders", () => {
      ui(<Table testID="table" stacks loading columns={COLUMNS} rows={[]} />);
      measure(375);
      expect(stackedNow()).toBe(true);
      measure(1280);
      expect(stackedNow()).toBe(false);
    });

    it("restyles a windowed body's rows across the breakpoint", () => {
      const rows = Array.from({ length: 30 }, (_, i) => [`Name ${i}`, "Active", "Eng"]);
      ui(<Table testID="table" stacks virtualized style={{ maxHeight: 300 }} columns={COLUMNS} rows={rows} />);
      const first = dataRows()[0]!;
      measure(375);
      expect(stackedNow()).toBe(true);
      measure(1280);
      expect(stackedNow()).toBe(false);
      expect(dataRows()[0]).toBe(first);
    });

    it("honors stackBreakpoint", () => {
      ui(<Table testID="table" stacks stackBreakpoint="md" columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
      measure(700);
      expect(stackedNow()).toBe(true);
      measure(800);
      expect(stackedNow()).toBe(false);
    });

    it("stacks a phone's first frame from the window, before the table measures", () => {
      resizeViewport(375);
      ui(<Table testID="table" stacks columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
      expect(stackedNow()).toBe(true);
    });

    it("leaves the cells the row's own children without stacks", () => {
      ui(<Table testID="table" columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
      const row = dataRows()[0]!;
      for (const cell of within(row).getAllByRole("cell")) expect(cell.parentElement).toBe(row);
    });
  });
}

describe("DataTable stacks with the other narrow layouts", () => {
  it("never pans a stacked web or Android table", () => {
    for (const Table of [DataTable, AndroidDataTable]) {
      // Four 110px minimums (440) exceed a 375 container: without `stacks` it pans.
      const columns = [...COLUMNS, "Role"];
      const { unmount } = ui(<Table testID="table" columns={columns} rows={[["Ada", "Active", "Eng", "Admin"]]} />);
      measure(375);
      expect(screen.getByRole("table").parentElement!.style.minWidth).toBe("440px");
      unmount();
      ui(<Table testID="table" stacks columns={columns} rows={[["Ada", "Active", "Eng", "Admin"]]} />);
      measure(375);
      expect(screen.getByRole("table").parentElement!.style.minWidth).toBe("");
      cleanup();
    }
  });

  it("stacks on iOS where it would otherwise collapse to the first column", () => {
    ui(<IosDataTable testID="table" columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
    measure(375);
    expect(within(dataRows()[0]!).getAllByRole("cell")).toHaveLength(1);
    cleanup();
    ui(<IosDataTable testID="table" stacks columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
    measure(375);
    expect(within(dataRows()[0]!).getAllByRole("cell")).toHaveLength(3);
  });

  it("warns when stackBreakpoint is passed without stacks", () => {
    ui(<DataTable testID="table" stackBreakpoint="md" columns={COLUMNS} rows={[["Ada", "Active", "Eng"]]} />);
    expect(warnSpy.mock.calls.some(([message]) => String(message).includes("<DataTable stackBreakpoint>"))).toBe(true);
  });
});
