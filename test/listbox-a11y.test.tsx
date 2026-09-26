import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import React, { type ForwardedRef, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Listbox } from "../src/atoms/listbox/listbox.tsx";

afterEach(cleanup);

const items = [{ label: "Backend" }, { label: "Frontend", detail: "Web applications" }, { label: "Design" }];
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);
const focus = (node: HTMLElement) => act(() => node.focus());
const keyPress = (node: HTMLElement, key: string) => {
  fireEvent.keyDown(node, { key });
  fireEvent.keyUp(node, { key });
};

describe("Listbox accessible structure", () => {
  it("names the single-select list and retains option selection states", () => {
    const { getByRole, getAllByRole, rerender } = ui(<Listbox items={items} defaultSelected={1} />);
    const list = getByRole("listbox", { name: "Options" });
    const options = getAllByRole("option");
    expect([...list.children]).toEqual(options);
    expect(options.map((row) => row.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(getByRole("option", { name: "Frontend, Web applications" })).toBe(options[1]);
    rerender(<ThemeProvider><Listbox items={items} accessibilityLabel="Teams" /></ThemeProvider>);
    expect(getByRole("listbox", { name: "Teams" })).toBe(list);
    rerender(<ThemeProvider><Listbox items={items} accessibilityLabel="  " /></ThemeProvider>);
    expect(getByRole("listbox", { name: "Options" })).toBe(list);
  });

  it("exposes multi-select as a named group containing only the row checkboxes", () => {
    const { getByRole, getAllByRole, queryByRole } = ui(
      <Listbox multi items={items} accessibilityLabel="Teams" defaultSelected={[0, 2]} />,
    );
    const group = getByRole("group", { name: "Teams" });
    const rows = getAllByRole("checkbox");
    expect(queryByRole("listbox")).toBeNull();
    expect([...group.children]).toEqual(rows);
    expect(rows).toHaveLength(items.length);
    expect(getByRole("checkbox", { name: "Frontend, Web applications" })).toBe(rows[1]);
    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["true", "false", "true"]);
    expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);

    // An aria-hidden wrapper alone does not remove a nested control from the tab
    // order. The glyph subtree must contain no interactive or focusable host.
    const indicators = group.querySelectorAll('[aria-hidden="true"]');
    expect(indicators).toHaveLength(items.length);
    for (const indicator of indicators) {
      expect(indicator.querySelector('[role], [tabindex], button, input, select, textarea, a[href], [contenteditable="true"]')).toBeNull();
    }
  });

  it("provides a fallback name for a bare multi-select group", () => {
    const { getByRole } = ui(<Listbox multi items={items} />);
    expect(getByRole("group", { name: "Options" })).toBeDefined();
  });

  it("toggles once when pressing the indicator within a checkbox row", () => {
    const changes: (number | number[])[] = [];
    const picks: number[] = [];
    const { getByRole } = ui(
      <Listbox multi items={items} onChange={(next) => changes.push(next)} onSelect={(index) => picks.push(index)} />,
    );
    const row = getByRole("checkbox", { name: "Backend" });
    fireEvent.click(row.querySelector('[aria-hidden="true"]')!);
    expect(changes).toEqual([[0]]);
    expect(picks).toEqual([0]);
    expect(row.getAttribute("aria-checked")).toBe("true");
  });

  it("keeps disabled rows out of the tab order and ignores pointer and keyboard activation", () => {
    const changes: (number | number[])[] = [];
    const picks: number[] = [];
    const { getByRole, getAllByRole } = ui(
      <Listbox multi disabled items={items} onChange={(next) => changes.push(next)} onSelect={(index) => picks.push(index)} />,
    );
    const group = getByRole("group", { name: "Options" });
    const rows = getAllByRole("checkbox");
    expect(group.querySelector('[tabindex="0"]')).toBeNull();
    for (const row of rows) {
      expect(row.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(row);
      keyPress(row, "Enter");
      keyPress(row, " ");
    }
    expect(changes).toEqual([]);
    expect(picks).toEqual([]);
    expect(rows.every((row) => row.getAttribute("aria-checked") === "false")).toBe(true);
  });
});

// Fabric removes a View whose props neither paint nor mark it (ViewShadowNode::initialize in
// React Native's ReactCommon), and a role or a label does not count. A View that only paints
// (a border, a fill) or carries a testID stays a node, but its children are hoisted out of it
// unless it also forms a stacking context (sliceChildShadowNodeViewPairs.cpp). So the list's
// name and role reached no screen reader when unbordered, and sat on an empty node beside the
// rows when bordered or given a testID; only a disabled list (its opacity) held its rows.
// `collapsable={false}` forms the stacking context in every configuration (the rows staying
// inside it was checked on devices). React Native Web drops the prop before the DOM, so it is
// read at React Native's View render boundary.
describe("Listbox native container", () => {
  const component = View as unknown as { render: (props: ViewProps, ref: ForwardedRef<unknown>) => ReactNode };
  const isContainer = (props: ViewProps) => props["aria-label"] === "Teams";

  function containerProps(node: ReactNode) {
    const original = component.render;
    const named: ViewProps[] = [];
    const observer = spyOn(component, "render").mockImplementation((props, ref) => {
      if (isContainer(props)) named.push(props);
      return original(props, ref);
    });
    try {
      ui(node);
      return named.at(-1);
    } finally {
      observer.mockRestore();
    }
  }

  const configurations = [false, true].flatMap((multi) => [false, true].flatMap((bordered) =>
    [false, true].flatMap((disabled) => [undefined, "teams"].map((testID) => ({ multi, bordered, disabled, testID })))));
  const nameOf = ({ multi, bordered, disabled, testID }: (typeof configurations)[number]) =>
    [multi ? "multi" : "single", bordered && "bordered", disabled && "disabled", testID && "testID"].filter(Boolean).join(" ");
  const listbox = (config: (typeof configurations)[number]) => (
    <Listbox items={items} accessibilityLabel="Teams" {...config} />
  );

  for (const config of configurations) {
    it(`keeps the ${nameOf(config)} list's named container from being flattened (collapsable false)`, () => {
      const props = containerProps(listbox(config));
      expect(props).toBeDefined();
      expect(props!.collapsable).toBe(false);
      expect(props!.accessibilityLabel).toBe("Teams");
      expect(props!.testID).toBe(config.testID);
    });
  }

  it("leaves the web's DOM exactly as a container without the prop renders it", () => {
    // React drops a false value on an unknown attribute (and warns only once per process), so a
    // forwarded `collapsable` would not show in the DOM: watch the props react-native-web hands
    // React for each DOM element, and compare the whole DOM with a render that never had the prop.
    const hostProps: string[][] = [];
    const createElement = React.createElement;
    const host = spyOn(React, "createElement").mockImplementation(((type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => {
      if (typeof type === "string" && props) hostProps.push(Object.keys(props));
      return (createElement as (...args: unknown[]) => unknown)(type, props, ...children);
    }) as typeof React.createElement);
    try {
      for (const config of configurations) {
        const kept = ui(listbox(config)).container.innerHTML;
        cleanup();
        const original = component.render;
        const strip = spyOn(component, "render").mockImplementation((props, ref) => {
          if (!isContainer(props)) return original(props, ref);
          const { collapsable: _collapsable, ...rest } = props;
          return original(rest, ref);
        });
        let bare: string;
        try {
          bare = ui(listbox(config)).container.innerHTML;
        } finally {
          strip.mockRestore();
        }
        cleanup();
        expect(kept, nameOf(config)).toBe(bare);
      }
    } finally {
      host.mockRestore();
    }
    // The watch saw react-native-web's DOM elements, and none of them was handed the prop.
    expect(hostProps.some((keys) => keys.includes("aria-label"))).toBe(true);
    expect(hostProps.filter((keys) => keys.includes("collapsable"))).toEqual([]);
  });
});

describe("Listbox complete keyboard presses", () => {
  for (const key of ["Enter", " ", "Spacebar"]) {
    it(`toggles a multi-select row exactly once per ${JSON.stringify(key)} press`, () => {
      const changes: (number | number[])[] = [];
      const picks: number[] = [];
      const { getByRole } = ui(
        <Listbox multi items={items} onChange={(next) => changes.push(next)} onSelect={(index) => picks.push(index)} />,
      );
      const row = getByRole("checkbox", { name: "Backend" });
      focus(row);
      keyPress(row, key);
      expect(row.getAttribute("aria-checked")).toBe("true");
      expect(changes).toEqual([[0]]);
      expect(picks).toEqual([0]);
      keyPress(row, key);
      expect(row.getAttribute("aria-checked")).toBe("false");
      expect(changes).toEqual([[0], []]);
      expect(picks).toEqual([0, 0]);
    });
  }

  for (const key of ["Enter", " "]) {
    it(`selects once in single-select mode with ${JSON.stringify(key)}`, () => {
      const changes: (number | number[])[] = [];
      const picks: number[] = [];
      const { getByRole } = ui(
        <Listbox items={items} onChange={(next) => changes.push(next)} onSelect={(index) => picks.push(index)} />,
      );
      const row = getByRole("option", { name: "Backend" });
      focus(row);
      keyPress(row, key);
      expect(row.getAttribute("aria-selected")).toBe("true");
      expect(changes).toEqual([0]);
      expect(picks).toEqual([0]);
    });
  }

  it("does not toggle repeatedly while Space is held", () => {
    const changes: (number | number[])[] = [];
    const { getByRole } = ui(<Listbox multi items={items} onChange={(next) => changes.push(next)} />);
    const row = getByRole("checkbox", { name: "Backend" });
    focus(row);
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: " ", repeat: true });
    fireEvent.keyDown(row, { key: " ", repeat: true });
    fireEvent.keyUp(row, { key: " " });
    expect(changes).toEqual([[0]]);
    expect(row.getAttribute("aria-checked")).toBe("true");
  });

  it("emits one controlled update and waits for the parent to accept it", () => {
    const changes: (number | number[])[] = [];
    const picks: number[] = [];
    const onChange = (next: number | number[]) => changes.push(next);
    const onSelect = (index: number) => picks.push(index);
    const { getByRole, rerender } = ui(
      <Listbox multi items={items} selected={[]} onChange={onChange} onSelect={onSelect} />,
    );
    const row = getByRole("checkbox", { name: "Backend" });
    focus(row);
    keyPress(row, "Enter");
    expect(changes).toEqual([[0]]);
    expect(picks).toEqual([0]);
    expect(row.getAttribute("aria-checked")).toBe("false");
    rerender(<ThemeProvider><Listbox multi items={items} selected={[0]} onChange={onChange} onSelect={onSelect} /></ThemeProvider>);
    expect(row.getAttribute("aria-checked")).toBe("true");
    keyPress(row, "Enter");
    expect(changes).toEqual([[0], []]);
    expect(picks).toEqual([0, 0]);
    expect(row.getAttribute("aria-checked")).toBe("true");
  });

  it("moves real focus with arrows and Home/End without changing multi-selection", () => {
    const changes: (number | number[])[] = [];
    const { getAllByRole, getByRole } = ui(
      <Listbox multi items={items} defaultSelected={[1]} onChange={(next) => changes.push(next)} />,
    );
    const rows = getAllByRole("checkbox");
    const group = getByRole("group", { name: "Options" });
    focus(rows[1]);
    for (const [key, index] of [["ArrowDown", 2], ["ArrowDown", 0], ["End", 2], ["Home", 0]] as const) {
      keyPress(document.activeElement as HTMLElement, key);
      expect(document.activeElement).toBe(rows[index]);
      expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
      expect(rows[index].getAttribute("tabindex")).toBe("0");
    }
    expect(changes).toEqual([]);
    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
  });
});
