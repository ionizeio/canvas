import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useState, type ReactNode } from "react";
import { Pressable, Text, type ViewProps } from "react-native";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { DescriptionList } from "../src/molecules/description-lists/description-lists.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { DataTable } from "../src/organisms/data-table/data-table.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { useEscapeKey } from "../src/style/use-escape-key.ts";
import { layoutEntrance, layoutHostedEntrance } from "./entrance-layout.ts";

let measure: ReturnType<typeof spyOn>;
beforeEach(() => {
  // Real AnchoredOverlay waits for nonzero trigger measurements on the hosted
  // path. Supply layout geometry, not a Portal or overlay implementation mock.
  measure = spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const style = getComputedStyle(this);
    if (style.position === "absolute" && style.zIndex === "1000") {
      return { x: 0, y: 0, width: 1280, height: 800, top: 0, left: 0, right: 1280, bottom: 800, toJSON: () => ({}) } as DOMRect;
    }
    return { x: 10, y: 20, width: 160, height: 32, top: 20, left: 10, right: 170, bottom: 52, toJSON: () => ({}) } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  fireEvent.keyUp(document.body, { key: "Escape" });
  measure.mockRestore();
});

const themed = (node: ReactNode) => <ThemeProvider>{node}</ThemeProvider>;
const ui = (node: ReactNode) => render(themed(node));
const escape = (target: Element | Document = document.body) => {
  fireEvent.keyDown(target, { key: "Escape" });
  // The keydown can unmount its target. Physical keyup arrives at the current
  // focus target; use the connected body to exercise RNW Modal's real listener.
  fireEvent.keyUp(document.body, { key: "Escape" });
};
const focus = (node: HTMLElement) => act(() => node.focus());
const items = [{ label: "Rename" }, { label: "Archive" }];

// The fixtures use two 32px rows and 10px of card padding/border. Wait for the
// hidden structural mount, then supply layout before using accessible queries.
async function layoutOptions(hosted: boolean, role = "menu", root: ParentNode = document) {
  const panel = await waitFor(() => {
    const node = root.querySelector(`[role="${role}"]`);
    expect(node).not.toBeNull();
    return node!;
  });
  if (hosted) layoutHostedEntrance(panel, { width: 160, height: 74 }, { width: 150, height: 64 });
  else layoutEntrance(panel, { width: 160, height: 74 });
}


function NestedMenu({ hosted, initiallyOpen = false, cancelled, menuChanged }: {
  hosted: boolean; initiallyOpen?: boolean; cancelled: () => void; menuChanged: (value: boolean) => void;
}) {
  const [parentOpen, setParentOpen] = useState(initiallyOpen);
  const [childOpen, setChildOpen] = useState(initiallyOpen);
  const content = (
    <Dialog overlay={hosted} trigger="Open parent" accessibilityLabel="Parent dialog" open={parentOpen}
      onOpenChange={setParentOpen} onCancel={cancelled}>
      <Dropdown trigger="Menu" items={items} open={childOpen}
        onOpenChange={(next) => { menuChanged(next); setChildOpen(next); }} />
    </Dialog>
  );
  return hosted ? <OverlayProvider>{content}</OverlayProvider> : content;
}

for (const hosted of [false, true]) {
  describe(`${hosted ? "hosted" : "inline"} nested Escape`, () => {
    it("dismisses the menu, restores its trigger, then dismisses the parent on a second key", async () => {
      const cancelled: string[] = [];
      const menus: boolean[] = [];
      ui(<NestedMenu hosted={hosted} cancelled={() => cancelled.push("parent")} menuChanged={(next) => menus.push(next)} />);
      const opener = screen.getByRole("button", { name: "Open parent" });
      focus(opener);
      fireEvent.click(opener);
      const menuTrigger = await screen.findByRole("button", { name: "Menu" });
      focus(menuTrigger);
      fireEvent.click(menuTrigger);
      await layoutOptions(hosted);
      const row = await screen.findByRole("menuitem", { name: "Rename" });
      focus(row);
      escape(row);
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(cancelled).toEqual([]);
      expect(menus).toEqual([true, false]);
      expect(document.activeElement === menuTrigger).toBe(true);
      expect(screen.getByRole("dialog", { name: "Parent dialog" })).toBeTruthy();
      escape(menuTrigger);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(cancelled).toEqual(["parent"]);
      expect(document.activeElement === opener).toBe(true);
    });

    it("prefers an initially open descendant even when its effect commits first", async () => {
      const cancelled: string[] = [];
      const menus: boolean[] = [];
      ui(<StrictMode><NestedMenu hosted={hosted} initiallyOpen cancelled={() => cancelled.push("parent")}
        menuChanged={(next) => menus.push(next)} /></StrictMode>);
      await layoutOptions(hosted);
      await screen.findByRole("menuitem", { name: "Rename" });
      escape();
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(cancelled).toEqual([]);
      expect(menus).toEqual([false]);
      escape();
      expect(cancelled).toEqual(["parent"]);
    });
  });
}

it("preserves ancestry through two nested hosted panels", async () => {
  const closed: string[] = [];
  function Tree() {
    const [dialog, setDialog] = useState(true);
    const [popover, setPopover] = useState(true);
    const [select, setSelect] = useState(true);
    return <OverlayProvider><Dialog overlay open={dialog} onOpenChange={setDialog} onCancel={() => closed.push("dialog")}>
      <Popover open={popover} title="Details" onOpenChange={(next) => { closed.push("popover"); setPopover(next); }}>
        <Select open={select} options={["One", "Two"]} onOpenChange={(next) => { closed.push("select"); setSelect(next); }} />
      </Popover>
    </Dialog></OverlayProvider>;
  }
  ui(<Tree />);
  const details = await screen.findByText("Details");
  layoutHostedEntrance(details, { width: 320, height: 120 }, { width: 286, height: 86 });
  await layoutOptions(true, "listbox");
  await screen.findByRole("option", { name: /Two/ });
  escape();
  await waitFor(() => expect(screen.queryByRole("option", { name: /Two/ })).toBeNull());
  expect(closed).toEqual(["select"]);
  escape();
  await waitFor(() => expect(screen.queryByText("Details")).toBeNull());
  expect(closed).toEqual(["select", "popover"]);
  escape();
  expect(closed).toEqual(["select", "popover", "dialog"]);
});

it("orders siblings by activation, supports reopening, and drops unmounted owners", async () => {
  const closed: string[] = [];
  function Siblings({ second = true }: { second?: boolean }) {
    return <><Dropdown testID="first-menu" trigger="First" items={items} onOpenChange={(next) => { if (!next) closed.push("first"); }} />
      {second ? <Dropdown testID="second-menu" trigger="Second" items={items} onOpenChange={(next) => { if (!next) closed.push("second"); }} /> : null}</>;
  }
  const view = ui(<Siblings />);
  const first = screen.getByRole("button", { name: "First" });
  const second = screen.getByRole("button", { name: "Second" });
  fireEvent.click(first);
  await layoutOptions(false, "menu", screen.getByTestId("first-menu"));
  fireEvent.click(second);
  await layoutOptions(false, "menu", screen.getByTestId("second-menu"));
  escape();
  expect(closed).toEqual(["second"]);
  fireEvent.click(second);
  await layoutOptions(false, "menu", screen.getByTestId("second-menu"));
  escape();
  expect(closed).toEqual(["second", "second"]);
  fireEvent.click(second);
  await layoutOptions(false, "menu", screen.getByTestId("second-menu"));
  view.rerender(themed(<Siblings second={false} />));
  escape();
  expect(closed).toEqual(["second", "second", "first"]);
});

it("does not let held Escape repeats dismiss the parent after the child closes", async () => {
  const closed: string[] = [];
  ui(<NestedMenu hosted={false} initiallyOpen cancelled={() => closed.push("parent")} menuChanged={() => {}} />);
  await layoutOptions(false);
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  fireEvent.keyDown(document.body, { key: "Escape", repeat: true });
  fireEvent.keyDown(document.body, { key: "Escape", repeat: true });
  fireEvent.keyUp(document.body, { key: "Escape" });
  expect(closed).toEqual([]);
  escape();
  expect(closed).toEqual(["parent"]);
});

it("honors a target handler's preventDefault before choosing an overlay owner", () => {
  const closed: string[] = [];
  const keyboard = { onKeyDown: (event: { preventDefault: () => void }) => event.preventDefault() } as unknown as ViewProps;
  ui(<Dialog open onCancel={() => closed.push("parent")}><Pressable {...keyboard} accessibilityRole="button"><Text>Editor</Text></Pressable></Dialog>);
  escape(screen.getByRole("button", { name: "Editor" }));
  expect(closed).toEqual([]);
  escape();
  expect(closed).toEqual(["parent"]);
});

it("retains the public hook signature, fresh callbacks and cleanup", () => {
  const closed: string[] = [];
  function Subscriber({ active, label }: { active: boolean; label: string }) {
    useEscapeKey(active, () => closed.push(label));
    return null;
  }
  const view = ui(<Subscriber active label="old" />);
  view.rerender(themed(<Subscriber active label="current" />));
  escape();
  expect(closed).toEqual(["current"]);
  view.unmount();
  escape();
  expect(closed).toEqual(["current"]);
});

it("delegates TextInput Escape from Autocomplete, preserving its query and the parent", async () => {
  const closed: string[] = [];
  const queries: string[] = [];
  ui(<Dialog open onCancel={() => closed.push("parent")}><Autocomplete options={["Apple", "Apricot"]}
    onQueryChange={(next) => queries.push(next)} /></Dialog>);
  const field = screen.getByRole("combobox");
  fireEvent.change(field, { target: { value: "Ap" } });
  await layoutOptions(false, "listbox");
  expect(screen.getByRole("option", { name: /Apple/ })).toBeTruthy();
  escape(field);
  expect(screen.queryByRole("listbox")).toBeNull();
  expect((field as HTMLInputElement).value).toBe("Ap");
  expect(queries).toEqual(["Ap"]);
  expect(closed).toEqual([]);
  escape(field);
  expect(closed).toEqual(["parent"]);
});

it("delegates Command Escape with zero results without clearing its query", () => {
  const closed: string[] = [];
  const queries: string[] = [];
  ui(<Dialog open onCancel={() => closed.push("parent")}><Command trigger defaultOpen defaultQuery="missing"
    groups={[{ items: [{ label: "Open file" }] }]} onQueryChange={(next) => queries.push(next)} /></Dialog>);
  const field = screen.getByDisplayValue("missing");
  expect(screen.getByText("No results")).toBeTruthy();
  escape(field);
  expect(screen.queryByText("No results")).toBeNull();
  expect(queries).toEqual([]);
  expect(closed).toEqual([]);
  escape();
  expect(closed).toEqual(["parent"]);
});

it("does not let a child's consumed keyup close its Drawer after the child unmounts", async () => {
  const closed: string[] = [];
  function Tree() {
    const [child, setChild] = useState(true);
    return <Drawer open onOpenChange={() => closed.push("drawer")}><Text>Drawer body</Text>
      {child ? <Dropdown open trigger="Menu" items={items} onOpenChange={() => { closed.push("menu"); setChild(false); }} /> : null}
    </Drawer>;
  }
  ui(<Tree />);
  await layoutOptions(true);
  fireEvent.keyDown(await screen.findByRole("menuitem", { name: "Rename" }), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  fireEvent.keyUp(screen.getByText("Drawer body"), { key: "Escape" });
  expect(closed).toEqual(["menu"]);
  escape(screen.getByText("Drawer body"));
  expect(closed).toEqual(["menu", "drawer"]);
});

it("keeps a pending Escape consumed when another key overlaps it", async () => {
  const closed: string[] = [];
  function Tree() {
    const [child, setChild] = useState(true);
    return <Drawer open onOpenChange={() => closed.push("drawer")}><Text>Drawer body</Text>
      {child ? <Dropdown open trigger="Menu" items={items} onOpenChange={() => { closed.push("menu"); setChild(false); }} /> : null}
    </Drawer>;
  }
  ui(<Tree />);
  await layoutOptions(true);
  fireEvent.keyDown(await screen.findByRole("menuitem", { name: "Rename" }), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  const body = screen.getByText("Drawer body");
  fireEvent.keyDown(body, { key: "Shift" });
  fireEvent.keyUp(body, { key: "Shift" });
  fireEvent.keyUp(body, { key: "Escape" });
  expect(closed).toEqual(["menu"]);
  escape(body);
  expect(closed).toEqual(["menu", "drawer"]);
});

it("gives a nested ActionSheet one close request and leaves Drawer for the next Escape", () => {
  const closed: string[] = [];
  function Tree() {
    const [sheet, setSheet] = useState(true);
    return <Drawer open onOpenChange={() => closed.push("drawer")}><Text>Drawer body</Text>
      <ActionSheet open={sheet} actions={[{ label: "Share", onPress: () => {} }]}
        onOpenChange={(next) => { closed.push("sheet"); setSheet(next); }} />
    </Drawer>;
  }
  ui(<Tree />);
  escape(screen.getByText("Share"));
  expect(closed).toEqual(["sheet"]);
  escape(screen.getByText("Drawer body"));
  expect(closed).toEqual(["sheet", "drawer"]);
});

it("supports a standalone ActionSheet's keyup-only request", () => {
  const closed: boolean[] = [];
  ui(<ActionSheet open actions={[{ label: "Share", onPress: () => {} }]} onOpenChange={(next) => closed.push(next)} />);
  fireEvent.keyUp(screen.getByText("Share"), { key: "Escape" });
  expect(closed).toEqual([false]);
});

it("does not carry a consumed key from an unmounted root into a new Modal", async () => {
  const previous = ui(<Dropdown open trigger="Old menu" items={items} />);
  await layoutOptions(false);
  fireEvent.keyDown(document.body, { key: "Escape" });
  previous.unmount();
  const closed: boolean[] = [];
  ui(<Drawer open onOpenChange={(next) => closed.push(next)}><Text>New drawer</Text></Drawer>);
  fireEvent.keyUp(screen.getByText("New drawer"), { key: "Escape" });
  expect(closed).toEqual([false]);
});

it("keeps DataTable's local Escape cancellation inside its Drawer", () => {
  const closed: boolean[] = [];
  const commits: unknown[] = [];
  ui(<Drawer open onOpenChange={(next) => closed.push(next)}><Text>Drawer body</Text>
    <DataTable columns={[{ label: "Name" }]} rows={[["Alice"]]} inlineEdit onCellCommit={(...args) => commits.push(args)} />
  </Drawer>);
  fireEvent.click(screen.getByText("Alice"));
  const field = screen.getByDisplayValue("Alice");
  fireEvent.change(field, { target: { value: "Changed" } });
  escape(field);
  expect(screen.queryByDisplayValue("Changed")).toBeNull();
  expect(screen.getByText("Alice")).toBeTruthy();
  expect(commits).toEqual([]);
  expect(closed).toEqual([]);
});

it("keeps DescriptionList's local Escape cancellation inside its Drawer", () => {
  const closed: boolean[] = [];
  const commits: unknown[] = [];
  ui(<Drawer open onOpenChange={(next) => closed.push(next)}><Text>Drawer body</Text>
    <DescriptionList items={[{ term: "Name", value: "Alice", update: true }]} onUpdate={(...args) => commits.push(args)} />
  </Drawer>);
  fireEvent.click(screen.getByLabelText("Update Name"));
  const field = screen.getByDisplayValue("Alice");
  fireEvent.change(field, { target: { value: "Changed" } });
  escape(field);
  expect(screen.queryByDisplayValue("Changed")).toBeNull();
  expect(screen.getByText("Alice")).toBeTruthy();
  expect(commits).toEqual([]);
  expect(closed).toEqual([]);
});
