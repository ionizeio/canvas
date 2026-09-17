import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { DataTable } from "../src/organisms/data-table/data-table.tsx";
import { DataTable as IOSDataTable } from "../src/organisms/data-table/data-table.ios.tsx";
import { DataTable as AndroidDataTable } from "../src/organisms/data-table/data-table.android.tsx";

let css: PropertyDescriptor | undefined;
beforeEach(() => {
  css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => true } });
});
afterEach(() => {
  cleanup();
  if (css) Object.defineProperty(globalThis, "CSS", css);
  else Reflect.deleteProperty(globalThis, "CSS");
});

function expectEditor(field: HTMLInputElement, current: HTMLElement, value: string) {
  expect(current).toBe(field);
  expect(document.activeElement).toBe(field);
  expect(field.value).toBe(value);
  expect([field.selectionStart, field.selectionEnd]).toEqual([1, 3]);
}

describe("DataTable clear editor material", () => {
  for (const rowEditing of [false, true]) {
    it(`retains DataTable ${rowEditing ? "row" : "cell"} draft hosts and commit policy across modes`, () => {
      const commits: unknown[] = [];
      const tree = (glass: boolean) => <ThemeProvider glass={glass} solid={!glass}>
        <DataTable columns={["Name", "Role"]} rows={[["Ada", "Engineer"]]}
          inlineEdit={!rowEditing} onRowEdit={rowEditing ? () => {} : undefined}
          onCellCommit={(row, col, value) => commits.push([row, col, value])}
          onRowCommit={(row, cells) => commits.push([row, cells])} />
      </ThemeProvider>;
      const result = render(tree(false));
      fireEvent.click(rowEditing ? result.getByRole("button", { name: "Edit Ada" }) : result.getByText("Ada"));
      const field = result.getByRole("textbox", { name: "Edit Name for Ada" }) as HTMLInputElement;
      fireEvent.change(field, { target: { value: "Ada Lovelace" } });
      field.setSelectionRange(1, 3);
      for (const glass of [true, false, true]) {
        result.rerender(tree(glass));
        expectEditor(field, result.getByRole("textbox", { name: "Edit Name for Ada" }), "Ada Lovelace");
        expect(field.parentElement?.querySelectorAll('[style*="backdrop-filter"]').length).toBe(glass ? 1 : 0);
        expect(commits).toEqual([]);
      }
      if (rowEditing) {
        fireEvent.blur(field);
        expect(commits).toEqual([]);
        fireEvent.click(result.getByRole("button", { name: "Save Ada" }));
        expect(commits).toEqual([[0, ["Ada Lovelace", "Engineer"]]]);
      } else {
        fireEvent.keyDown(field, { key: "Escape" });
        fireEvent.blur(field);
        expect(commits).toEqual([]);
        expect(result.getByText("Ada")).toBeDefined();
      }
    });
  }

  for (const [name, Table] of [["iOS", IOSDataTable], ["Android", AndroidDataTable]] as const) {
    it(`leaves the ${name} skin's raw editor surface unchanged`, () => {
      const result = render(<ThemeProvider glass>
        <Table columns={["Name"]} rows={[["Ada"]]} inlineEdit onCellCommit={() => {}} />
      </ThemeProvider>);
      fireEvent.click(result.getByText("Ada"));
      const field = result.getByRole("textbox", { name: "Edit Name for Ada" });
      expect(field.parentElement?.querySelector('[style*="backdrop-filter"]')).toBeNull();
      expect(field.parentElement?.getAttribute("role")).toBe("cell");
    });
  }
});
