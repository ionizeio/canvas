import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState, type ReactNode } from "react";
import { UIManager, type TextInput } from "react-native";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Autocomplete as AutocompleteIos } from "../src/atoms/autocomplete/autocomplete.ios.tsx";
import { Autocomplete as AutocompleteAndroid } from "../src/atoms/autocomplete/autocomplete.android.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Form } from "../src/molecules/form/form.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { layoutEntrance, layoutHostedEntrance, type FixtureSize } from "./entrance-layout.ts";

const options = ["Apple", "Banana", "Cherry"];
const themed = (node: ReactNode) => <ThemeProvider>{node}</ThemeProvider>;
const ui = (node: ReactNode) => render(themed(node));
const focus = (node: HTMLElement) => act(() => node.focus());
const layoutSuggestions = (field: HTMLElement, size: FixtureSize = { width: 320, height: 144 }) => {
  const list = document.getElementById(field.getAttribute("aria-controls")!);
  expect(list).not.toBeNull();
  layoutEntrance(list!, size);
};
// RNW PressResponder activates some controls on keyup. Always complete the
// physical sequence, including when keydown closes and unmounts an option.
const key = (target: HTMLElement, value: string, init: KeyboardEventInit = {}) => {
  const accepted = fireEvent.keyDown(target, { key: value, ...init });
  fireEvent.keyUp(target.isConnected ? target : document.body, { key: value, ...init });
  return accepted;
};
const active = (field: HTMLElement) => {
  const id = field.getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};
afterEach(() => {
  cleanup();
  fireEvent.keyUp(document.body, { key: "Escape" });
});

for (const [platform, Component] of [["web", Autocomplete], ["ios", AutocompleteIos], ["android", AutocompleteAndroid]] as const) {
  describe(`Autocomplete ${platform} keyboard contract`, () => {
    for (const size of ["small", "default", "large"] as const) {
      it(`contains a real platform disclosure target in its ${size} field`, () => {
        ui(<Component small={size === "small"} large={size === "large"} narrow label="Fruit" options={options} />);
        const button = screen.getByRole("button", { name: "Toggle options" });
        const field = screen.getByRole("combobox").parentElement!;
        const target = getComputedStyle(button);
        const box = getComputedStyle(field);
        // The iOS Autocomplete is the web skin (SKN-6b), whose 24px box is the pointer's
        // target; on an iPhone its touch area reaches 44pt through slop that stops at the text
        // (test/touch-target-seams.test.tsx), which this browser render cannot see.
        const minimum = platform === "android" ? 48 : 24;
        const number = (value: string) => parseFloat(value) || 0;
        expect(number(target.width)).toBeGreaterThanOrEqual(minimum);
        expect(number(target.minHeight)).toBeGreaterThanOrEqual(minimum);
        expect(number(box.height)).toBeGreaterThanOrEqual(minimum);
        const contentHeight = number(box.height) - number(box.borderTopWidth) - number(box.borderBottomWidth)
          - number(box.paddingTop) - number(box.paddingBottom);
        // The target's actual layout includes the field's border/indicator band,
        // rather than relying on hitSlop clipped by the smaller native parent.
        expect(contentHeight - number(target.marginTop) - number(target.marginBottom)).toBeGreaterThanOrEqual(minimum);
      });
    }

    it("keeps input focus while navigating and emits one selection for a full Enter press", () => {
      const selected: string[] = [];
      const values: string[] = [];
      const queries: string[] = [];
      const ref = createRef<TextInput>();
      ui(<Component ref={ref} label="Fruit" options={options} onSelect={(value) => selected.push(value)}
        onValueChange={(value) => values.push(value)} onQueryChange={(value) => queries.push(value)} />);
      const field = screen.getByRole("combobox") as HTMLInputElement;
      expect(ref.current).toBe(field as unknown as TextInput);
      focus(field);
      layoutSuggestions(field);
      // All three skins still run in the browser here. Suggestions never enter
      // its Tab order, even though native rows retain Pressable click support.
      expect(screen.getAllByRole("option").map((row) => row.tabIndex)).toEqual([-1, -1, -1]);
      const listId = screen.getByRole("listbox").id;
      expect(field.getAttribute("aria-controls")).toBe(listId);
      expect(field.getAttribute("aria-autocomplete")).toBe("list");
      expect(active(field)).toBeNull();
      key(field, "ArrowDown");
      expect(active(field)).toBe(screen.getByRole("option", { name: "Apple" }));
      key(field, "ArrowDown");
      expect(active(field)).toBe(screen.getByRole("option", { name: "Banana" }));
      expect(active(field)?.getAttribute("aria-selected")).toBe("false");
      expect(document.activeElement).toBe(field);
      expect(screen.getAllByRole("option").every((row) => row.tabIndex === -1)).toBe(true);
      expect(key(field, "Enter")).toBe(false);
      expect(selected).toEqual(["Banana"]);
      expect(values).toEqual(["Banana"]);
      expect(queries).toEqual([""]);
      expect(field.value).toBe("Banana");
      expect(field.getAttribute("aria-expanded")).toBe("false");
      expect(active(field)).toBeNull();
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(field);
      key(field, "ArrowUp");
      layoutSuggestions(field);
      expect(screen.getByRole("listbox").id).toBe(listId);
      expect(active(field)).toBe(screen.getByRole("option", { name: "Cherry" }));
      expect(screen.getByRole("option", { name: "Banana" }).getAttribute("aria-selected")).toBe("true");
    });
  });
}

describe("Autocomplete active options", () => {
  it("navigates past repeated labels and retains the active identity when options reorder", () => {
    const selected: string[] = [];
    const props = { defaultOpen: true, onSelect: (value: string) => selected.push(value) };
    const { rerender } = ui(<Autocomplete {...props} options={["Apple", "Apple", "Banana"]} />);
    const field = screen.getByRole("combobox");
    layoutSuggestions(field);
    const rows = screen.getAllByRole("option");
    key(field, "ArrowDown");
    expect(active(field)).toBe(rows[0]!);
    key(field, "ArrowDown");
    expect(active(field)).toBe(rows[1]!);
    key(field, "ArrowDown");
    expect(active(field)).toBe(rows[2]!);
    rerender(themed(<Autocomplete {...props} options={["Banana", "Apple", "Apple"]} />));
    expect(active(field)).toBe(screen.getByRole("option", { name: "Banana" }));
    key(field, "Enter");
    expect(selected).toEqual(["Banana"]);
  });

  it("clamps arrows and reserves Home/End for editing until a suggestion is active", () => {
    ui(<Autocomplete options={options} />);
    const field = screen.getByRole("combobox");
    focus(field);
    layoutSuggestions(field);
    expect(key(field, "Home")).toBe(true);
    expect(key(field, "End")).toBe(true);
    key(field, "ArrowUp");
    key(field, "ArrowDown");
    expect(active(field)?.getAttribute("aria-label")).toBe("Cherry");
    key(field, "Home");
    key(field, "ArrowUp");
    expect(active(field)?.getAttribute("aria-label")).toBe("Apple");
    key(field, "End");
    expect(active(field)?.getAttribute("aria-label")).toBe("Cherry");
    expect(key(field, "Home", { metaKey: true })).toBe(true);
    expect(active(field)?.getAttribute("aria-label")).toBe("Cherry");
  });

  it("filters with stable row IDs and clears stale active options when typing or options change", () => {
    const { rerender } = ui(<Autocomplete options={options} defaultOpen />);
    const field = screen.getByRole("combobox");
    layoutSuggestions(field);
    const bananaId = screen.getByRole("option", { name: "Banana" }).id;
    key(field, "ArrowDown");
    fireEvent.change(field, { target: { value: "ban" } });
    expect(active(field)).toBeNull();
    expect(screen.getByRole("option", { name: "Banana" }).id).toBe(bananaId);
    key(field, "ArrowDown");
    expect(active(field)?.id).toBe(bananaId);
    rerender(themed(<Autocomplete options={["Apple", "Cherry"]} defaultOpen />));
    expect(active(field)).toBeNull();
    expect(screen.getByText("No results")).toBeTruthy();
    expect(document.getElementById(field.getAttribute("aria-controls")!)).toBe(screen.getByRole("listbox"));
    expect(key(field, "Enter")).toBe(true);
    key(field, "ArrowDown");
    expect(active(field)).toBeNull();
    rerender(themed(<Autocomplete options={options} defaultOpen />));
    expect(active(field)).toBeNull();
  });

  it("closes on Tab without selecting, and resets the active suggestion after reopening", () => {
    const values: string[] = [];
    ui(<Autocomplete options={options} onValueChange={(value) => values.push(value)} />);
    const field = screen.getByRole("combobox");
    key(field, "ArrowDown");
    layoutSuggestions(field);
    expect(key(field, "Tab")).toBe(true);
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(values).toEqual([]);
    key(field, "ArrowUp");
    layoutSuggestions(field);
    expect(active(field)?.getAttribute("aria-label")).toBe("Cherry");
  });

  it("reports pointer selection and supports both object and callback input refs", () => {
    const selected: string[] = [];
    const values: string[] = [];
    let ref: TextInput | null = null;
    const { unmount } = ui(<Autocomplete ref={(node) => { ref = node; }} options={options} defaultOpen
      onSelect={(value) => selected.push(value)} onValueChange={(value) => values.push(value)} />);
    layoutSuggestions(screen.getByRole("combobox"));
    expect(ref).toBe(screen.getByRole("combobox") as unknown as TextInput);
    fireEvent.click(screen.getByRole("option", { name: "Apple" }));
    expect(selected).toEqual(["Apple"]);
    expect(values).toEqual(["Apple"]);
    unmount();
    expect(ref).toBeNull();
  });

  it("activates an accessible option once through RNW's complete PressResponder key sequence", () => {
    const selected: string[] = [];
    ui(<Autocomplete options={options} defaultOpen onSelect={(value) => selected.push(value)} />);
    layoutSuggestions(screen.getByRole("combobox"));
    const option = screen.getByRole("option", { name: "Banana" });
    focus(option);
    key(option, "Enter");
    expect(selected).toEqual(["Banana"]);
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
  });

  it("gives simultaneous Autocompletes distinct list and option IDs", () => {
    ui(<><Autocomplete label="First" options={options} defaultOpen />
      <Autocomplete label="Second" options={options} defaultOpen /></>);
    const fields = screen.getAllByRole("combobox");
    for (const field of fields) layoutSuggestions(field);
    key(fields[0]!, "ArrowDown");
    key(fields[1]!, "ArrowDown");
    expect(fields[0]!.getAttribute("aria-controls")).not.toBe(fields[1]!.getAttribute("aria-controls"));
    expect(active(fields[0]!)?.id).not.toBe(active(fields[1]!)?.id);
    for (const field of fields) {
      const list = document.getElementById(field.getAttribute("aria-controls")!)!;
      expect(list.contains(active(field))).toBe(true);
    }
  });

  it("scrolls measured variable-height rows into view through ScrollView's native API", () => {
    ui(<Autocomplete options={options} defaultOpen />);
    const field = screen.getByRole("combobox");
    layoutSuggestions(field, { width: 160, height: 100 });
    const rows = screen.getAllByRole("option");
    // happy-dom has no layout engine. Feed RNW's installed onLayout handlers
    // the same events native Yoga sends, leaving the real ScrollView/ref intact.
    type LayoutNode = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void; getScrollableNode?: () => HTMLElement };
    const layout = (node: HTMLElement, y: number, height: number) => act(() => {
      const onLayout = (node as LayoutNode).__reactLayoutHandler;
      expect(typeof onLayout).toBe("function");
      onLayout!({ nativeEvent: { layout: { x: 0, y, width: 160, height } } });
    });
    let scroll: LayoutNode | null = screen.getByRole("listbox");
    while (scroll && !scroll.getScrollableNode) scroll = scroll.parentElement;
    expect(scroll?.getScrollableNode?.()).toBe(scroll!);
    const scrollTo = spyOn(scroll!, "scrollTo").mockImplementation(() => {});
    const geometry = [{ y: 0, height: 50 }, { y: 50, height: 120 }, { y: 170, height: 50 }];
    const measure = spyOn(UIManager, "measureLayout").mockImplementation((node, _relative, _failure, success) => {
      const row = geometry[rows.indexOf(node as unknown as HTMLElement)]!;
      success(0, row.y, 160, row.height);
    });
    try {
      layout(scroll!, 0, 100);
      layout(rows[0]!, 0, 50);
      layout(rows[1]!, 50, 120);
      layout(rows[2]!, 170, 50);
      key(field, "ArrowDown");
      expect(scrollTo).not.toHaveBeenCalled();
      key(field, "End");
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 120, animated: false });
      key(field, "Home");
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
      key(field, "ArrowDown");
      // A wrapped row taller than the viewport exposes its beginning, so the
      // user can read it and scroll the remainder rather than starting mid-label.
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 50, animated: false });
    } finally {
      scrollTo.mockRestore();
      measure.mockRestore();
    }
  });

  it("uses the latest active option when queued opening-layout measurements arrive after navigation", () => {
    ui(<Autocomplete options={options} defaultOpen />);
    const field = screen.getByRole("combobox");
    type LayoutNode = HTMLElement & {
      __reactLayoutHandler?: (event: unknown) => void;
      getScrollableNode?: () => HTMLElement;
    };
    layoutSuggestions(field, { width: 160, height: 100 });
    const rows = screen.getAllByRole("option") as LayoutNode[];
    let scroll: LayoutNode | null = screen.getByRole("listbox");
    while (scroll && !scroll.getScrollableNode) scroll = scroll.parentElement;
    // RNW snapshots the handler when ResizeObserver fires, then measures via
    // asynchronous UIManager. These callbacks were queued with no active row.
    const viewportLayout = scroll!.__reactLayoutHandler!;
    const rowLayouts = rows.map((row) => row.__reactLayoutHandler!);
    const scrollTo = spyOn(scroll!, "scrollTo").mockImplementation(() => {});
    const measure = spyOn(UIManager, "measureLayout").mockImplementation((node, _relative, _failure, success) => {
      success(0, rows.indexOf(node as unknown as LayoutNode) * 80, 160, 80);
    });
    try {
      key(field, "ArrowDown");
      key(field, "End");
      expect(active(field)).toBe(rows[2]!);
      expect(scrollTo).not.toHaveBeenCalled();
      act(() => {
        viewportLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 100 } } });
        rowLayouts.forEach((onLayout, index) => onLayout({
          nativeEvent: { layout: { x: 0, y: index * 80, width: 160, height: 80 } },
        }));
      });
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 140, animated: false });
    } finally {
      scrollTo.mockRestore();
      measure.mockRestore();
    }
  });

  it("remeasures surviving rows after filtering moves them without changing their size", () => {
    const labels = [...Array.from({ length: 10 }, (_, i) => `A${i}`), ...Array.from({ length: 10 }, (_, i) => `B${i}`)];
    ui(<Autocomplete options={labels} defaultOpen />);
    const field = screen.getByRole("combobox");
    type MeasuredNode = HTMLElement & {
      __reactLayoutHandler?: (event: unknown) => void;
      getScrollableNode?: () => HTMLElement;
      measureLayout: (relative: unknown, callback: (x: number, y: number, width: number, height: number) => void) => void;
    };
    layoutSuggestions(field, { width: 160, height: 100 });
    const rows = screen.getAllByRole("option") as MeasuredNode[];
    let scroll: MeasuredNode | null = screen.getByRole("listbox") as MeasuredNode;
    while (scroll && !scroll.getScrollableNode) scroll = scroll.parentElement as MeasuredNode | null;
    const scrollTo = spyOn(scroll!, "scrollTo").mockImplementation(() => {});
    let filtered = false;
    const measurement = spyOn(UIManager, "measureLayout").mockImplementation((node, _relative, _failure, success) => {
      const index = rows.indexOf(node as unknown as MeasuredNode);
      success(0, (filtered ? index - 10 : index) * 50, 160, 50);
    });
    try {
      act(() => {
        scroll!.__reactLayoutHandler!({ nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 100 } } });
        rows.forEach((row, index) => row.__reactLayoutHandler!({
          nativeEvent: { layout: { x: 0, y: index * 50, width: 160, height: 50 } },
        }));
      });
      key(field, "ArrowDown");
      expect(scrollTo).not.toHaveBeenCalled();
      filtered = true;
      fireEvent.change(field, { target: { value: "B" } });
      // ResizeObserver does not notify position-only movement. Surviving B rows
      // retain their nodes and sizes, so deliberately send no second onLayout.
      expect(screen.getByRole("option", { name: "B0" })).toBe(rows[10]!);
      key(field, "ArrowDown");
      expect(active(field)).toBe(rows[10]!);
      expect(scrollTo).not.toHaveBeenCalled();
      key(field, "End");
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 400, animated: false });
    } finally {
      scrollTo.mockRestore();
      measurement.mockRestore();
    }
  });

  it("remeasures reordered variable-height rows and rejects an older result for the same option", () => {
    const { rerender } = ui(<Autocomplete options={options} defaultOpen />);
    const field = screen.getByRole("combobox");
    type LayoutNode = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void; getScrollableNode?: () => HTMLElement };
    layoutSuggestions(field, { width: 160, height: 100 });
    let scroll: LayoutNode | null = screen.getByRole("listbox");
    while (scroll && !scroll.getScrollableNode) scroll = scroll.parentElement;
    const scrollTo = spyOn(scroll!, "scrollTo").mockImplementation(() => {});
    const pending: (() => void)[] = [];
    let reordered = false;
    const measurement = spyOn(UIManager, "measureLayout").mockImplementation((node, relative, _failure, success) => {
      expect(relative as unknown).toBe(screen.getByRole("listbox"));
      const label = (node as unknown as HTMLElement).getAttribute("aria-label");
      const y = label === "Apple" ? 0 : label === "Banana" ? (reordered ? 100 : 50) : (reordered ? 50 : 250);
      const height = label === "Banana" ? 200 : 50;
      pending.push(() => success(0, y, 160, height));
    });
    try {
      act(() => scroll!.__reactLayoutHandler!({ nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 100 } } }));
      key(field, "ArrowDown");
      key(field, "ArrowDown");
      const oldResult = pending.at(-1)!;
      const banana = screen.getByRole("option", { name: "Banana" });
      reordered = true;
      rerender(themed(<Autocomplete options={["Apple", "Cherry", "Banana"]} defaultOpen />));
      expect(active(field)).toBe(banana);
      act(() => pending.at(-1)!());
      expect(scrollTo).toHaveBeenLastCalledWith({ y: 100, animated: false });
      const count = scrollTo.mock.calls.length;
      act(oldResult);
      expect(scrollTo.mock.calls.length).toBe(count);
    } finally {
      scrollTo.mockRestore();
      measurement.mockRestore();
    }
  });

  it("ignores native measurements delivered after navigation or popup unmount", () => {
    ui(<Autocomplete options={options} defaultOpen />);
    const field = screen.getByRole("combobox");
    type LayoutNode = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void; getScrollableNode?: () => HTMLElement };
    layoutSuggestions(field, { width: 160, height: 100 });
    let scroll: LayoutNode | null = screen.getByRole("listbox");
    while (scroll && !scroll.getScrollableNode) scroll = scroll.parentElement;
    const scrollTo = spyOn(scroll!, "scrollTo").mockImplementation(() => {});
    const pending: (() => void)[] = [];
    const measurement = spyOn(UIManager, "measureLayout").mockImplementation((node, _relative, _failure, success) => {
      const label = (node as unknown as HTMLElement).getAttribute("aria-label");
      pending.push(() => success(0, label === "Cherry" ? 500 : 0, 160, 50));
    });
    try {
      act(() => scroll!.__reactLayoutHandler!({ nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 100 } } }));
      key(field, "ArrowUp");
      const lastOptionResult = pending.at(-1)!;
      key(field, "Home");
      act(() => pending.at(-1)!());
      act(lastOptionResult);
      expect(scrollTo).not.toHaveBeenCalled();
      key(field, "End");
      const closedResult = pending.at(-1)!;
      key(field, "Escape");
      act(closedResult);
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      scrollTo.mockRestore();
      measurement.mockRestore();
    }
  });

  it("keeps controlled value/query/open state with the parent while reporting all requested changes", () => {
    const values: string[] = [];
    const selected: string[] = [];
    const queries: string[] = [];
    const opens: boolean[] = [];
    ui(<Autocomplete value="Apple" query="" open options={options}
      onValueChange={(value) => values.push(value)} onSelect={(value) => selected.push(value)}
      onQueryChange={(value) => queries.push(value)} onOpenChange={(value) => opens.push(value)} />);
    const field = screen.getByRole("combobox") as HTMLInputElement;
    layoutSuggestions(field);
    key(field, "ArrowUp");
    key(field, "Enter");
    expect(values).toEqual(["Cherry"]);
    expect(selected).toEqual(["Cherry"]);
    expect(queries).toEqual([""]);
    expect(opens).toEqual([false]);
    expect(field.value).toBe("Apple");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(active(field)).toBeNull();
  });

  it("notifies controlled clearing with an empty string, without sending a fake selection", () => {
    const values: string[] = [];
    const selected: string[] = [];
    function Controlled() {
      const [value, setValue] = useState("Apple");
      return <Autocomplete options={options} value={value}
        onValueChange={(next) => { values.push(next); setValue(next); }}
        onSelect={(next) => selected.push(next)} />;
    }
    ui(<Controlled />);
    const field = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "" } });
    expect(field.value).toBe("");
    expect(values).toEqual([""]);
    expect(selected).toEqual([]);
    layoutSuggestions(field);
    key(field, "ArrowDown");
    key(field, "Enter");
    expect(field.value).toBe("Apple");
    expect(values).toEqual(["", "Apple"]);
    expect(selected).toEqual(["Apple"]);
    fireEvent.change(field, { target: { value: "" } });
    expect(values).toEqual(["", "Apple", ""]);
    expect(selected).toEqual(["Apple"]);
  });

  it("keeps controlled query changes separate from selection changes", () => {
    const values: string[] = [];
    function ControlledQuery() {
      const [query, setQuery] = useState("");
      return <Autocomplete options={options} defaultValue="Apple" query={query} onQueryChange={setQuery}
        onValueChange={(next) => values.push(next)} />;
    }
    ui(<ControlledQuery />);
    const field = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "ban" } });
    expect(field.value).toBe("ban");
    expect(values).toEqual([]);
    layoutSuggestions(field);
    key(field, "ArrowDown");
    key(field, "Enter");
    expect(field.value).toBe("Banana");
    expect(values).toEqual(["Banana"]);
  });

  it("suppresses disabled state mutations and callbacks, then restores stored open state", () => {
    const changes: unknown[] = [];
    const props = { options, defaultOpen: true, defaultValue: "Apple", onOpenChange: (v: boolean) => changes.push(v),
      onQueryChange: (v: string) => changes.push(v), onValueChange: (v: string) => changes.push(v) };
    const { rerender } = ui(<Autocomplete {...props} />);
    const field = screen.getByRole("combobox") as HTMLInputElement;
    layoutSuggestions(field);
    key(field, "ArrowDown");
    rerender(themed(<Autocomplete {...props} disabled />));
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(field.getAttribute("aria-disabled")).toBe("true");
    expect(active(field)).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "" } });
    key(field, "ArrowDown");
    key(field, "Enter");
    key(field, "Escape");
    fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
    expect(changes).toEqual([]);
    expect(field.value).toBe("Apple");
    rerender(themed(<Autocomplete {...props} />));
    layoutSuggestions(field);
    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(active(field)).toBeNull();
    key(field, "ArrowDown");
    key(field, "Enter");
    expect(changes).toEqual(["Apple", "", false]);
  });
});

for (const composition of [{ isComposing: true }, { keyCode: 229 }]) {
  describe(`IME ${JSON.stringify(composition)}`, () => {
    it("leaves the composing Escape default and its Drawer open through Modal keyup", () => {
      const closed: string[] = [];
      ui(<Drawer trigger="Open drawer" onOpenChange={(next) => { if (!next) closed.push("drawer"); }}>
        <Autocomplete options={options} />
      </Drawer>);
      fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
      const field = screen.getByRole("combobox");
      focus(field);
      key(field, "ArrowDown");
      expect(key(field, "Escape", composition)).toBe(true);
      expect(field.getAttribute("aria-expanded")).toBe("true");
      expect(closed).toEqual([]);
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    it("does not submit a Form while confirming a composition in an ordinary input", () => {
      const submitted: string[] = [];
      ui(<Form onSubmit={() => submitted.push("submit")}><Input label="Name" /></Form>);
      const field = screen.getByRole("textbox");
      expect(key(field, "Enter", composition)).toBe(true);
      expect(submitted).toEqual([]);
      key(field, "Enter");
      expect(submitted).toEqual(["submit"]);
    });

    it("does not navigate, select, dismiss, or submit while the Autocomplete input is composing", () => {
      const submitted: string[] = [];
      const selected: string[] = [];
      ui(<Form onSubmit={() => submitted.push("submit")}>
        <Autocomplete options={options} defaultQuery="a" onSelect={(value) => selected.push(value)} />
      </Form>);
      const field = screen.getByRole("combobox");
      key(field, "ArrowDown");
      layoutSuggestions(field);
      const initial = active(field);
      for (const value of ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"]) {
        key(field, value, composition);
        expect(active(field)).toBe(initial);
      }
      expect(field.getAttribute("aria-expanded")).toBe("true");
      expect(selected).toEqual([]);
      expect(submitted).toEqual([]);
      key(field, "Enter");
      expect(selected).toEqual(["Apple"]);
      expect(submitted).toEqual([]);
    });
  });
}

for (const hosted of [false, true]) {
  describe(`${hosted ? "hosted" : "inline"} Form and Autocomplete`, () => {
    it("selects first, ignores held Enter repeats, then submits on the next fresh Enter", async () => {
      const measure = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
        x: 10, y: 20, width: 160, height: 32, top: 20, left: 10, right: 170, bottom: 52,
        toJSON: () => ({}),
      } as DOMRect);
      try {
        const submitted: string[] = [];
        const selected: string[] = [];
        const form = <Form onSubmit={() => submitted.push("submit")}>
          <Autocomplete options={options} onSelect={(value) => selected.push(value)} />
        </Form>;
        ui(hosted ? <OverlayProvider>{form}</OverlayProvider> : form);
        const field = screen.getByRole("combobox");
        focus(field);
        if (hosted) {
          let list: HTMLElement | null = null;
          await waitFor(() => {
            list = document.getElementById(field.getAttribute("aria-controls")!);
            expect(list).not.toBeNull();
          });
          layoutHostedEntrance(list!, { width: 160, height: 144 });
        } else layoutSuggestions(field);
        await screen.findByRole("listbox");
        key(field, "ArrowDown");
        key(field, "ArrowDown");
        await waitFor(() => expect(active(field)?.getAttribute("aria-label")).toBe("Banana"));
        fireEvent.keyDown(field, { key: "Enter" });
        fireEvent.keyDown(field, { key: "Enter", repeat: true });
        fireEvent.keyUp(field, { key: "Enter" });
        expect(selected).toEqual(["Banana"]);
        expect(submitted).toEqual([]);
        expect(document.activeElement).toBe(field);
        expect(active(field)).toBeNull();
        key(field, "Enter");
        expect(submitted).toEqual(["submit"]);
        expect(selected).toEqual(["Banana"]);
      } finally {
        cleanup();
        measure.mockRestore();
      }
    });
  });
}

it("preserves child Escape ownership, query, and focus before a second Escape closes the Dialog", () => {
  const cancelled: string[] = [];
  ui(<Dialog trigger="Edit fruit" accessibilityLabel="Edit" onCancel={() => cancelled.push("dialog")}>
    <Autocomplete defaultQuery="a" options={options} />
  </Dialog>);
  fireEvent.click(screen.getByRole("button", { name: "Edit fruit" }));
  const field = screen.getByRole("combobox") as HTMLInputElement;
  focus(field);
  layoutSuggestions(field);
  key(field, "ArrowDown");
  key(field, "Escape");
  expect(field.value).toBe("a");
  expect(field.getAttribute("aria-expanded")).toBe("false");
  expect(active(field)).toBeNull();
  expect(cancelled).toEqual([]);
  expect(document.activeElement).toBe(field);
  key(field, "Escape");
  expect(cancelled).toEqual(["dialog"]);
});
