import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { DataTable, type DataTableSort } from "../src/organisms/data-table/data-table.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { Pressable, Text } from "../src/style/index.js";

// DataTable behavior: the column model, sorting, row selection, pagination, and
// the loading/empty states. Rendering is react-native-web under happy-dom, so
// assertions read the DOM roles + aria aliases (the same thing a web screen
// reader sees).

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

// The data rows' visible text, in render order (skips the header row).
const rowTexts = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="row"]'))
    .slice(1) // header row
    .map((r) => r.textContent ?? "");

const COLUMNS = ["Name", "Role"];
const ROWS: ReactNode[][] = [
  ["Bob", "PM"],
  ["Ada", "Eng"],
  ["Cat", "Ops"],
];

describe("DataTable columns", () => {
  it("accepts string and descriptor columns mixed", () => {
    const { container } = ui(
      <DataTable columns={["Name", { label: "Amount", numeric: true }]} rows={[["Ada", "12"]]} />,
    );
    expect(screen.getByText("Amount")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
    expect(container.querySelectorAll('[role="columnheader"]').length).toBe(2);
  });
});

describe("DataTable sorting", () => {
  it("cycles ascending, descending, off on header press (uncontrolled)", () => {
    const { container } = ui(<DataTable sortable columns={COLUMNS} rows={ROWS} />);
    const original = rowTexts(container);
    expect(original[0]).toContain("Bob");

    fireEvent.click(screen.getByText("Name"));
    expect(rowTexts(container)[0]).toContain("Ada"); // ascending
    const header = container.querySelector('[aria-sort="ascending"]');
    expect(header?.textContent).toContain("Name");

    fireEvent.click(screen.getByText("Name"));
    expect(rowTexts(container)[0]).toContain("Cat"); // descending
    expect(container.querySelector('[aria-sort="descending"]')).not.toBeNull();

    fireEvent.click(screen.getByText("Name"));
    expect(rowTexts(container)[0]).toContain("Bob"); // original order
  });

  it("starts from defaultSort and reports changes", () => {
    let last: DataTableSort | null | undefined;
    const { container } = ui(
      <DataTable
        sortable
        defaultSort={{ column: "Name", descending: true }}
        onSortChange={(s) => {
          last = s;
        }}
        columns={COLUMNS}
        rows={ROWS}
      />,
    );
    expect(rowTexts(container)[0]).toContain("Cat");
    fireEvent.click(screen.getByText("Name"));
    expect(last).toBeNull(); // desc -> off
  });

  it("keeps the order fixed under a controlled sort and only reports the next sort", () => {
    let next: DataTableSort | null | undefined;
    const { container } = ui(
      <DataTable
        sortable
        sort={{ column: "Name" }}
        onSortChange={(s) => {
          next = s;
        }}
        columns={COLUMNS}
        rows={ROWS}
      />,
    );
    fireEvent.click(screen.getByText("Name"));
    expect(next).toEqual({ column: "Name", descending: true });
    expect(rowTexts(container)[0]).toContain("Ada"); // still the controlled ascending order
  });

  it("sorts numerically-aware ('9' before '10')", () => {
    const { container } = ui(
      <DataTable sortable defaultSort={{ column: "N" }} columns={["N"]} rows={[["10"], ["9"], ["2"]]} />,
    );
    expect(rowTexts(container)).toEqual(["2", "9", "10"]);
  });

  it("sorts custom ReactNode cells through the column sortValue", () => {
    const rows: ReactNode[][] = [
      ["Ada", <Badge key="b">beta</Badge>],
      ["Bob", <Badge key="a">alpha</Badge>],
    ];
    const { container } = ui(
      <DataTable
        defaultSort={{ column: "Status" }}
        columns={["Name", { label: "Status", sortable: true, sortValue: (_cell, row) => (row[0] === "Ada" ? "beta" : "alpha") }]}
        rows={rows}
      />,
    );
    expect(rowTexts(container)[0]).toContain("Bob"); // alpha first
  });

  it("only marks sortable columns pressable when sortable is per-column", () => {
    const { container } = ui(
      <DataTable columns={[{ label: "Name", sortable: true }, "Role"]} rows={ROWS} />,
    );
    expect(container.querySelectorAll("[aria-sort]").length).toBe(1);
  });
});

describe("DataTable selection", () => {
  it("toggles a row through its checkbox and reports the keys (uncontrolled)", () => {
    let keys: Array<string | number> = [];
    const { container } = ui(
      <DataTable selectable columns={COLUMNS} rows={ROWS} onSelectionChange={(k) => (keys = k)} />,
    );
    const boxes = container.querySelectorAll('[role="checkbox"]');
    expect(boxes.length).toBe(4); // select-all + one per row
    fireEvent.click(boxes[1]!);
    expect(keys).toEqual([0]);
    expect(boxes[1]!.getAttribute("aria-checked")).toBe("true");
    // Partial selection marks the select-all indeterminate (mixed).
    expect(boxes[0]!.getAttribute("aria-checked")).toBe("mixed");
  });

  it("selects and clears every row through the select-all checkbox", () => {
    let keys: Array<string | number> = [];
    const { container } = ui(
      <DataTable
        selectable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => String(row[0])}
        onSelectionChange={(k) => (keys = k)}
      />,
    );
    const all = container.querySelector('[aria-label="Select all rows"]')!;
    fireEvent.click(all);
    expect(keys).toEqual(["Bob", "Ada", "Cat"]);
    expect(all.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(all);
    expect(keys).toEqual([]);
  });

  it("toggles selection on a row press when there is no onRowPress", () => {
    let keys: Array<string | number> = [];
    ui(<DataTable selectable columns={COLUMNS} rows={ROWS} onSelectionChange={(k) => (keys = k)} />);
    fireEvent.click(screen.getByText("Ada"));
    expect(keys).toEqual([1]);
  });

  it("keeps the checkbox press isolated from onRowPress", () => {
    let pressed = -1;
    let keys: Array<string | number> | null = null;
    const { container } = ui(
      <DataTable
        selectable
        columns={COLUMNS}
        rows={ROWS}
        onRowPress={(_row, i) => {
          pressed = i;
        }}
        onSelectionChange={(k) => (keys = k)}
      />,
    );
    const boxes = container.querySelectorAll('[role="checkbox"]');
    fireEvent.click(boxes[1]!);
    expect(keys).toEqual([0]);
    expect(pressed).toBe(-1); // the checkbox tap must not also fire the row action
    fireEvent.click(screen.getByText("Ada"));
    expect(pressed).toBe(1);
  });

  it("honors a controlled selection", () => {
    const { container } = ui(
      <DataTable selectable selectedKeys={[0, 2]} columns={COLUMNS} rows={ROWS} />,
    );
    const boxes = container.querySelectorAll('[role="checkbox"]');
    expect(boxes[1]!.getAttribute("aria-checked")).toBe("true");
    expect(boxes[2]!.getAttribute("aria-checked")).toBe("false");
    expect(boxes[3]!.getAttribute("aria-checked")).toBe("true");
  });
});

describe("DataTable pagination", () => {
  const MANY = Array.from({ length: 25 }, (_, i) => [`Item ${i + 1}`, `r${i + 1}`]);

  it("slices rows to the page and shows the item range", () => {
    ui(<DataTable paginated columns={COLUMNS} rows={MANY} />);
    expect(screen.getByText("Item 1")).toBeDefined();
    expect(screen.queryByText("Item 11")).toBeNull();
    expect(screen.getByText("Showing 1-10 of 25")).toBeDefined();
  });

  it("navigates through the footer pagination (uncontrolled)", () => {
    const { container } = ui(<DataTable paginated pageSize={10} columns={COLUMNS} rows={MANY} />);
    fireEvent.click(container.querySelector('[aria-label="Next page"]')!);
    expect(screen.getByText("Item 11")).toBeDefined();
    expect(screen.queryByText("Item 1")).toBeNull();
    expect(screen.getByText("Showing 11-20 of 25")).toBeDefined();
  });

  it("sorts across the whole data set before paging", () => {
    ui(
      <DataTable
        paginated
        sortable
        defaultSort={{ column: "Name", descending: true }}
        columns={COLUMNS}
        rows={MANY}
      />,
    );
    expect(screen.getByText("Item 25")).toBeDefined(); // the global maximum leads page 1
    expect(screen.queryByText("Item 1")).toBeNull();
  });

  it("shows the selection count in the footer", () => {
    ui(
      <DataTable paginated selectable defaultSelectedKeys={[0, 1]} columns={COLUMNS} rows={MANY} />,
    );
    expect(screen.getByText("2 of 25 selected")).toBeDefined();
  });
});

describe("DataTable row actions", () => {
  it("renders a pencil and bin per row with the first cell folded into their names", () => {
    const { container } = ui(
      <DataTable columns={COLUMNS} rows={ROWS} onRowEdit={() => {}} onRowDelete={() => {}} />,
    );
    expect(screen.getByLabelText("Edit Bob")).toBeDefined();
    expect(screen.getByLabelText("Delete Bob")).toBeDefined();
    expect(screen.getByLabelText("Edit Ada")).toBeDefined();
    // The trailing actions column adds an (unlabeled) header spacer.
    expect(container.querySelectorAll('[role="columnheader"]').length).toBe(COLUMNS.length + 1);
  });

  it("arms delete on the first press and fires onRowDelete only on the confirming second press", () => {
    let deleted = -1;
    ui(<DataTable columns={COLUMNS} rows={ROWS} onRowDelete={(i) => (deleted = i)} />);
    fireEvent.click(screen.getByLabelText("Delete Ada"));
    // Armed: the accessible name says confirm, nothing fired yet.
    expect(deleted).toBe(-1);
    expect(screen.getByLabelText("Confirm delete Ada")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Confirm delete Ada"));
    expect(deleted).toBe(1); // Ada's original index in `rows`
    expect(screen.queryByLabelText("Confirm delete Ada")).toBeNull(); // disarmed again
  });

  it("disarms when anything else in the table is pressed", () => {
    let deleted = -1;
    ui(
      <DataTable
        sortable
        columns={COLUMNS}
        rows={ROWS}
        onRowEdit={() => {}}
        onRowDelete={(i) => (deleted = i)}
      />,
    );
    fireEvent.click(screen.getByLabelText("Delete Bob"));
    expect(screen.getByLabelText("Confirm delete Bob")).toBeDefined();
    fireEvent.click(screen.getByText("Name")); // a sort press disarms
    expect(screen.queryByLabelText("Confirm delete Bob")).toBeNull();
    expect(screen.getByLabelText("Delete Bob")).toBeDefined();
    // Arming another row's bin moves the armed state there.
    fireEvent.click(screen.getByLabelText("Delete Cat"));
    fireEvent.click(screen.getByLabelText("Delete Bob"));
    expect(screen.queryByLabelText("Confirm delete Cat")).toBeNull();
    expect(screen.getByLabelText("Confirm delete Bob")).toBeDefined();
    expect(deleted).toBe(-1);
  });

  it("reports the ORIGINAL row index for a delete under an active sort", () => {
    let deleted = -1;
    ui(
      <DataTable
        sortable
        defaultSort={{ column: "Name" }}
        columns={COLUMNS}
        rows={ROWS}
        onRowDelete={(i) => (deleted = i)}
      />,
    );
    // Ascending puts Ada first, but Ada is rows[1].
    fireEvent.click(screen.getByLabelText("Delete Ada"));
    fireEvent.click(screen.getByLabelText("Confirm delete Ada"));
    expect(deleted).toBe(1);
  });

  it("pencil opens row edit mode: fields with focus, Save commits the edited cells", () => {
    let edited = -1;
    let committed: [number, ReactNode[]] | null = null;
    ui(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        onRowEdit={(i) => (edited = i)}
        onRowCommit={(i, cells) => (committed = [i, cells])}
      />,
    );
    fireEvent.click(screen.getByLabelText("Edit Ada"));
    expect(edited).toBe(1);
    const field = screen.getByDisplayValue("Ada") as HTMLInputElement;
    // The a11y contract: the (first) editing field takes focus on open.
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute("aria-label")).toBe("Edit Name for Ada");
    fireEvent.change(field, { target: { value: "Ada L." } });
    fireEvent.click(screen.getByLabelText("Save Ada"));
    expect(committed).toEqual([1, ["Ada L.", "Eng"]]);
    // The editor closed; the pencil is back.
    expect(screen.queryByDisplayValue("Ada L.")).toBeNull();
    expect(screen.getByLabelText("Edit Ada")).toBeDefined();
  });

  it("Cancel and Escape close row edit mode without committing", () => {
    let committed = false;
    ui(<DataTable columns={COLUMNS} rows={ROWS} onRowEdit={() => {}} onRowCommit={() => (committed = true)} />);
    fireEvent.click(screen.getByLabelText("Edit Bob"));
    fireEvent.change(screen.getByDisplayValue("Bob"), { target: { value: "Robert" } });
    fireEvent.click(screen.getByLabelText("Cancel editing Bob"));
    expect(committed).toBe(false);
    expect(screen.getByText("Bob")).toBeDefined(); // restored
    // Escape in a field cancels too.
    fireEvent.click(screen.getByLabelText("Edit Bob"));
    fireEvent.keyDown(screen.getByDisplayValue("Bob"), { key: "Escape" });
    expect(committed).toBe(false);
    expect(screen.queryByDisplayValue("Bob")).toBeNull();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  // A pressable row is a ROW, not a button. Rolling it a button renders a real
  // <button> on web, which strands every `role="cell"` outside a row and turns
  // any control the cells carry into a focusable descendant of a button: on
  // /identities that logged "In HTML, <button> cannot be a descendant of
  // button" for every row, because the row menu's trigger sat inside the row.
  it("gives a pressable row role=row, owning its cells, and nests no control inside a button", () => {
    const menu = (
      <Pressable key="m" role="button" accessibilityLabel="Actions for Ada" aria-label="Actions for Ada">
        <Text>...</Text>
      </Pressable>
    );
    const { container } = ui(
      <DataTable
        selectable
        columns={[...COLUMNS, "Actions"]}
        rows={[["Ada", "Eng", menu]]}
        onRowPress={() => {}}
      />,
    );
    // The row is a row, and every cell in the table is owned by one.
    const rows = container.querySelectorAll('[role="row"]');
    expect(rows.length).toBe(2); // header + the data row
    const cells = Array.from(container.querySelectorAll('[role="cell"]'));
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.parentElement?.closest('[role="row"]') != null)).toBe(true);
    // Nothing focusable sits inside a button: not the caller's row menu, not
    // the select checkbox, not the activator.
    const controls = Array.from(container.querySelectorAll('[role="button"], [role="checkbox"]'));
    expect(controls.some((c) => c.parentElement?.closest('[role="button"]') != null)).toBe(false);
    expect(container.querySelector("button button")).toBeNull();
  });

  // The row action has to stay reachable without a pointer. It moves from the
  // row onto a button in the leading cell, which is the tab stop and the thing
  // a screen reader announces.
  it("puts the row action on a named button in the first cell, firing once", () => {
    let presses: number[] = [];
    ui(<DataTable columns={COLUMNS} rows={ROWS} onRowPress={(_row, i) => presses.push(i)} />);
    // Named off the row's plain cells, one per row.
    const activator = screen.getByLabelText("Ada, Eng");
    expect(activator.closest('[role="cell"]')).not.toBeNull();
    expect(activator.closest('[role="cell"]')!.previousElementSibling).toBeNull(); // the FIRST cell
    fireEvent.click(activator);
    expect(presses).toEqual([1]); // once, not twice: the row press must not double-fire
  });

  // Custom cells carry their own labels, so there is no plain text to name the
  // activator from; its content names it instead of an empty aria-label.
  it("leaves the activator to be named by its content when the row has no plain cells", () => {
    const { container } = ui(
      <DataTable
        columns={COLUMNS}
        rows={[[<Badge key="n">Ada</Badge>, <Badge key="r">Eng</Badge>]]}
        onRowPress={() => {}}
      />,
    );
    const activator = container.querySelector('[role="row"]:not(:first-child) [role="button"]')!;
    expect(activator).not.toBeNull();
    expect(activator.getAttribute("aria-label")).toBeNull();
    expect(activator.textContent).toBe("Ada");
  });

  it("keeps action buttons SIBLINGS of the row press area, isolated from onRowPress", () => {
    const presses: number[] = [];
    const { container } = ui(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        onRowPress={(_row, i) => presses.push(i)}
        onRowEdit={() => {}}
        onRowDelete={() => {}}
      />,
    );
    // No button may nest inside another button (invalid DOM; the console gate's
    // structural assert): the actions cell rides beside the row press area.
    const buttons = Array.from(container.querySelectorAll('[role="button"]'));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.some((b) => b.parentElement?.closest('[role="button"]') != null)).toBe(false);
    // An action press never doubles as a row press; a cell press still rows,
    // once, even though the activator sits inside the row's own press area.
    fireEvent.click(screen.getByLabelText("Delete Bob"));
    expect(presses).toEqual([]);
    fireEvent.click(screen.getByText("Ada"));
    expect(presses).toEqual([1]);
  });

  it("passes custom ReactNode cells through a row commit unchanged", () => {
    let cells: ReactNode[] = [];
    const badge = <Badge key="b">Ops</Badge>;
    ui(
      <DataTable
        columns={COLUMNS}
        rows={[["Cat", badge]]}
        onRowEdit={() => {}}
        onRowCommit={(_i, next) => (cells = next)}
      />,
    );
    fireEvent.click(screen.getByLabelText("Edit Cat"));
    fireEvent.change(screen.getByDisplayValue("Cat"), { target: { value: "Cathy" } });
    fireEvent.click(screen.getByLabelText("Save Cat"));
    expect(cells[0]).toBe("Cathy");
    expect(cells[1]).toBe(badge); // the ReactNode cell is not editable and passes through
  });
});

describe("DataTable inline editing", () => {
  it("pressing a string cell opens a focused field; Enter commits the changed value", () => {
    let commit: [number, number, string] | null = null;
    ui(
      <DataTable
        inlineEdit
        columns={COLUMNS}
        rows={ROWS}
        onCellCommit={(r, c, next) => (commit = [r, c, next])}
      />,
    );
    fireEvent.click(screen.getByText("Eng"));
    const field = screen.getByDisplayValue("Eng") as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: "Design" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(commit).toEqual([1, 1, "Design"]); // Ada's row, Role column
    expect(screen.queryByDisplayValue("Design")).toBeNull(); // editor closed
  });

  it("blur commits a changed value, and an unchanged value commits nothing", () => {
    let commits: Array<[number, number, string]> = [];
    ui(
      <DataTable
        inlineEdit
        columns={COLUMNS}
        rows={ROWS}
        onCellCommit={(r, c, next) => commits.push([r, c, next])}
      />,
    );
    fireEvent.click(screen.getByText("Cat"));
    fireEvent.change(screen.getByDisplayValue("Cat"), { target: { value: "Catherine" } });
    fireEvent.blur(screen.getByDisplayValue("Catherine"));
    expect(commits).toEqual([[2, 0, "Catherine"]]);
    // Open again and blur without changing: no commit fires.
    fireEvent.click(screen.getByText("Cat"));
    fireEvent.blur(screen.getByDisplayValue("Cat"));
    expect(commits.length).toBe(1);
  });

  it("Escape restores the cell without committing (and the following blur stays inert)", () => {
    let fired = false;
    ui(<DataTable inlineEdit columns={COLUMNS} rows={ROWS} onCellCommit={() => (fired = true)} />);
    fireEvent.click(screen.getByText("PM"));
    const field = screen.getByDisplayValue("PM");
    fireEvent.change(field, { target: { value: "CTO" } });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.blur(field);
    expect(fired).toBe(false);
    expect(screen.queryByDisplayValue("CTO")).toBeNull();
    expect(screen.getByText("PM")).toBeDefined();
  });

  it("names the editable cells as buttons when the row itself is not pressable", () => {
    ui(<DataTable inlineEdit columns={COLUMNS} rows={ROWS} onCellCommit={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit Role for Ada" })).toBeDefined();
  });

  it("does not open editors for custom ReactNode cells", () => {
    const { container } = ui(
      <DataTable
        inlineEdit
        columns={COLUMNS}
        rows={[["Bob", <Badge key="b">PM</Badge>]]}
        onCellCommit={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("PM")); // the Badge text, not an editable string cell
    expect(container.querySelector("input")).toBeNull();
  });
});

describe("DataTable row-interaction per-OS skins", () => {
  // Every other case renders the web build; this smoke-mounts the iOS and
  // Android builds with the new row-interaction surface so a skin referencing
  // a missing token cannot ship untested (the skins-smoke convention).
  for (const platform of ["ios", "android"] as const) {
    it(`renders actions and an open inline editor with the ${platform} skin`, async () => {
      const mod = (await import(`../src/organisms/data-table/data-table.${platform}.tsx`)) as {
        DataTable: typeof DataTable;
      };
      const Table = mod.DataTable;
      expect(Table).toBeDefined();
      const { container } = ui(
        <Table inlineEdit columns={COLUMNS} rows={ROWS} onRowEdit={() => {}} onRowDelete={() => {}} onCellCommit={() => {}} />,
      );
      expect(screen.getAllByLabelText("Edit Bob").length).toBeGreaterThan(0);
      // Open an editor so the skin's editInput/editTint styles render too.
      // (iOS collapses to the primary column below the compact width only when
      // measured; unmeasured test layout keeps all columns.)
      fireEvent.click(screen.getByText("Eng"));
      expect(container.querySelector("input")).not.toBeNull();
      cleanup();
    });
  }
});

describe("DataTable loading and empty states", () => {
  it("renders skeleton placeholder rows instead of data while loading", () => {
    const { container } = ui(<DataTable loading columns={COLUMNS} rows={ROWS} />);
    expect(screen.queryByText("Ada")).toBeNull();
    // 5 placeholder rows x 2 columns, each a progressbar-role Skeleton line.
    expect(container.querySelectorAll('[role="progressbar"]').length).toBe(10);
  });

  it("renders the emptyMessage centered under the header when there are no rows", () => {
    ui(<DataTable columns={COLUMNS} rows={[]} emptyMessage="No users found." />);
    expect(screen.getByText("No users found.")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined(); // header intact
  });

  it("renders nothing extra when rows are empty and no emptyMessage is given", () => {
    ui(<DataTable columns={COLUMNS} rows={[]} />);
    expect(screen.queryByText("No users found.")).toBeNull();
  });
});

// The web header band: Riskora's soft 10px-cornered band when the table stands
// alone, squared to the frame when the table is framed (its own `bordered`
// outline, or an `attached` parent frame), so no fill peeks out under the band's
// bottom corners inside a clipped panel.
describe("DataTable header band framing (web)", () => {
  const band = (container: HTMLElement) => container.querySelector('[role="row"]') as HTMLElement;

  it("floats the band with rounded corners when the table stands alone", () => {
    const { container } = ui(<DataTable columns={COLUMNS} rows={ROWS} />);
    expect(band(container).style.borderRadius).toBe("10px");
  });

  it("`attached` squares the band to a frame the parent draws", () => {
    const { container } = ui(<DataTable attached columns={COLUMNS} rows={ROWS} />);
    expect(band(container).style.borderRadius).toBe("0px");
  });

  it("`bordered` squares the band to the table's own outline", () => {
    const { container } = ui(<DataTable bordered columns={COLUMNS} rows={ROWS} />);
    expect(band(container).style.borderRadius).toBe("0px");
  });
});
