import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { Platform } from "react-native";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Listbox } from "../src/atoms/listbox/listbox.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { RadioGroup } from "../src/atoms/radio/radio.tsx";
import { Form } from "../src/molecules/form/form.tsx";
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { useRovingFocus } from "../src/style/use-roving-focus.ts";
import { layoutEntrance } from "./entrance-layout.ts";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);
const key = (node: HTMLElement, value: string) => {
  fireEvent.keyDown(node, { key: value });
  fireEvent.keyUp(node, { key: value });
};

type Runtime = "web" | "ios" | "android";
function withRuntime(runtime: Runtime, run: () => void) {
  // Exercise runtime metadata, not a native skin in the browser. RNW still
  // renders these hosts, so native click/hover behavior requires device checks.
  // Keep this override synchronous and restore it even if an assertion fails.
  const select = spyOn(Platform, "select").mockImplementation((specifics) =>
    runtime in specifics ? specifics[runtime] : "native" in specifics ? specifics.native : specifics.default,
  );
  try {
    run();
  } finally {
    cleanup();
    select.mockRestore();
  }
}

for (const runtime of ["web", "ios", "android"] as const) {
  describe(`${runtime} focus metadata`, () => {
    it("preserves required roving fields and registered refs as the active row changes", () => withRuntime(runtime, () => {
      const focused: number[] = [];
      const nodes = [0, 1, 2].map((index) => ({ focus: () => focused.push(index) }));
      const { result, rerender } = renderHook(({ active }) => useRovingFocus({
        count: 3, active, onActivate: () => {},
      }), { initialProps: { active: 0 } });
      const initial = [0, 1, 2].map((index) => result.current.getItemProps(index));
      initial.forEach((props, index) => props.ref(nodes[index]));

      for (const active of [0, 2, 1]) {
        rerender({ active });
        const rows = [0, 1, 2].map((index) => result.current.getItemProps(index));
        expect(rows.map((props) => props.focusable)).toEqual(runtime === "web"
          ? [0, 1, 2].map((index) => index === active) : [true, true, true]);
        expect(rows.map((props) => props.tabIndex)).toEqual(runtime === "web"
          ? [0, 1, 2].map((index) => index === active ? 0 : -1) : [0, 0, 0]);
        rows.forEach((props, index) => expect(props.ref).toBe(initial[index]!.ref));
        result.current.focusItem(active);
      }
      expect(focused).toEqual([0, 2, 1]);
    }));

    it("keeps enabled inactive owners selectable and disabled Dropdown, Tabs, and Radio rows inert", () => withRuntime(runtime, () => {
      const picked: string[] = [];
      const { getByRole, getAllByRole } = ui(<>
        <Dropdown open onOpenChange={() => {}} items={[
          { label: "Rename" }, { label: "Archive" }, { label: "Locked action", disabled: true },
        ]} onSelect={(item) => picked.push(item.label)} />
        <Tabs tabs={["First tab", "Second tab", { label: "Locked tab", disabled: true }]}
          onSelect={(index) => picked.push(`tab ${index}`)} />
        <RadioGroup defaultValue="first" onChange={(value) => picked.push(`radio ${value}`)}>
          <Radio value="first">First radio</Radio>
          <Radio value="second">Second radio</Radio>
          <Radio value="locked" disabled>Locked radio</Radio>
        </RadioGroup>
        <Listbox items={[{ label: "First option" }, { label: "Second option" }]} defaultSelected={0}
          onSelect={(index) => picked.push(`option ${index}`)} />
      </>);

      layoutEntrance(getByRole("menu", { hidden: true }), { width: 240, height: 120 });
      for (const role of ["menuitem", "tab", "radio", "option"] as const) {
        const rows = getAllByRole(role).filter((row) => row.getAttribute("aria-disabled") !== "true");
        expect(rows.map((row) => row.tabIndex)).toEqual(runtime === "web" ? [0, -1] : [0, 0]);
      }
      for (const [role, name] of [["menuitem", "Locked action"], ["tab", "Locked tab"], ["radio", "Locked radio"]] as const) {
        const row = getByRole(role, { name });
        expect(row.getAttribute("aria-disabled")).toBe("true");
        // Native disabled behavior comes from the owner's disabled state, not
        // browser Tab order. RNW preserves an explicitly supplied native 0.
        if (runtime === "web") expect(row.tabIndex).toBe(-1);
        fireEvent.click(row);
        key(row, "Enter");
        key(row, " ");
      }
      expect(picked).toEqual([]);

      fireEvent.click(getByRole("menuitem", { name: "Archive" }));
      fireEvent.click(getByRole("tab", { name: "Second tab" }));
      fireEvent.click(getByRole("radio", { name: "Second radio" }));
      fireEvent.click(getByRole("option", { name: "Second option" }));
      expect(picked).toEqual(["Archive", "tab 1", "radio second", "option 1"]);
      expect(getByRole("tab", { name: "Second tab" }).getAttribute("aria-selected")).toBe("true");
      expect(getByRole("radio", { name: "Second radio" }).getAttribute("aria-checked")).toBe("true");
      expect(getByRole("option", { name: "Second option" }).getAttribute("aria-selected")).toBe("true");
    }));

    it("preserves whole-control disabling for Listbox, Tabs, RadioGroup, and Dropdown", () => withRuntime(runtime, () => {
      const picked: string[] = [];
      const { container, getByRole } = ui(<>
        <Listbox disabled items={[{ label: "Option A" }, { label: "Option B" }]} defaultSelected={0}
          onSelect={(index) => picked.push(`option ${index}`)} />
        <Tabs disabled tabs={["Tab A", "Tab B"]} onSelect={(index) => picked.push(`tab ${index}`)} />
        <RadioGroup disabled defaultValue="a" onChange={(value) => picked.push(`radio ${value}`)}>
          <Radio value="a">Radio A</Radio><Radio value="b">Radio B</Radio>
        </RadioGroup>
        <Dropdown disabled open trigger="Disabled menu" items={[{ label: "Never mounted" }]}
          onOpenChange={() => picked.push("open")} onSelect={() => picked.push("menu")} />
      </>);
      const rows = [...container.querySelectorAll<HTMLElement>('[role="option"], [role="tab"], [role="radio"]')];
      expect(rows).toHaveLength(6);
      for (const row of [...rows, getByRole("button", { name: "Disabled menu" })]) {
        expect(row.getAttribute("aria-disabled")).toBe("true");
        expect(row.tabIndex).toBe(-1);
        fireEvent.click(row);
        for (const value of ["Enter", " ", "ArrowRight", "Home", "End"]) key(row, value);
      }
      expect(picked).toEqual([]);
      expect(container.querySelector('[role="menuitem"]')).toBeNull();
      expect(getByRole("option", { name: "Option A" }).getAttribute("aria-selected")).toBe("true");
      expect(getByRole("tab", { name: "Tab A" }).getAttribute("aria-selected")).toBe("true");
      expect(getByRole("radio", { name: "Radio A" }).getAttribute("aria-checked")).toBe("true");
    }));
  });
}

for (const runtime of ["ios", "android"] as const) {
  it(`leaves ${runtime} Autocomplete suggestions focusable while preserving the editing and form contract`, () => withRuntime(runtime, () => {
    const selected: string[] = [];
    const submitted: string[] = [];
    const { getByRole, getAllByRole, queryByRole } = ui(<Form onSubmit={() => submitted.push("submit")}>
      <Autocomplete label="Fruit" options={["Apple", "Apricot", "Pineapple"]} onSelect={(value) => selected.push(value)} />
    </Form>);
    const field = getByRole("combobox") as HTMLInputElement;
    act(() => field.focus());
    fireEvent.change(field, { target: { value: "Ap" } });
    layoutEntrance(getByRole("listbox", { hidden: true }), { width: 320, height: 120 });
    expect(getAllByRole("option").map((row) => row.tabIndex)).toEqual([0, 0, 0]);
    expect(document.activeElement).toBe(field);
    fireEvent.click(getByRole("option", { name: "Pineapple" }));
    expect(selected).toEqual(["Pineapple"]);
    expect(submitted).toEqual([]);
    expect(field.value).toBe("Pineapple");
    expect(document.activeElement).toBe(field);
    expect(queryByRole("listbox")).toBeNull();
  }));
}
