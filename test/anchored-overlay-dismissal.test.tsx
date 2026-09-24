import { describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { BackHandler, Platform } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Command } from "../src/organisms/command/command.tsx";

// Android's hardware back on an open anchored card. A reviewer opened a RowMenu on
// the Android docs app and pressed back: the page navigated away with the menu still
// open. The Dropdown did exactly the same, and so did every card AnchoredOverlay
// floats, because none of them had ever subscribed to back; only the full-screen
// overlays (Dialog, AlertDialog, Drawer, ActionSheet) and the Sidebar drill-down did.
// AnchoredOverlay now owns the subscription for all of them, so these cases lock the
// contract per consumer: open subscribes, back closes the card and is consumed (the
// navigator never sees it), and the subscription is gone once the card is.
//
// The harness runs react-native-web, whose BackHandler is a stub, so Platform is
// switched to Android and BackHandler.addEventListener recorded, the way the Dialog
// suite does it.

type Back = () => boolean | null | undefined;

function withBackEvents(run: (handlers: Set<Back>) => void, native = true) {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  const handlers = new Set<Back>();
  const add = spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    expect(event).toBe("hardwareBackPress");
    handlers.add(handler);
    return { remove: () => { handlers.delete(handler); } };
  });
  const select = spyOn(Platform, "select").mockImplementation(specifics => native
    ? "android" in specifics ? specifics.android : "native" in specifics ? specifics.native : specifics.default
    : specifics.web ?? specifics.default);
  Object.defineProperty(Platform, "OS", { configurable: true, value: native ? "android" : "web" });
  try { run(handlers); } finally {
    cleanup();
    expect(handlers.size).toBe(0);
    add.mockRestore();
    select.mockRestore();
    Object.defineProperty(Platform, "OS", originalOS);
  }
}

// What Android does with one press: the newest subscription first, and an earlier one
// only while every later one declines. Returns whether anything consumed it; false is
// the press the navigator would have taken.
function pressBack(handlers: Set<Back>): boolean {
  let consumed = false;
  act(() => {
    for (const handler of [...handlers].reverse()) {
      if (handler()) { consumed = true; break; }
    }
  });
  return consumed;
}

const ui = (node: ReactElement, hosted: boolean) =>
  render(<ThemeProvider light solid>{hosted ? <OverlayProvider>{node}</OverlayProvider> : node}</ThemeProvider>);

const expanded = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-expanded") === "true";
// Whether any trigger or field reports its card open. A hosted list mounts only once
// its trigger measures a real box, which happy-dom never reports, so the lists are read
// from their combobox or trigger rather than from the list itself.
const anyExpanded = () => document.querySelector('[aria-expanded="true"]') != null;

interface Case {
  name: string;
  render: () => ReactElement;
  open: () => void;
  isOpen: () => boolean;
}

const cases: Case[] = [
  {
    name: "RowMenu",
    render: () => <RowMenu items={[{ label: "Edit" }, { label: "Delete", destructive: true }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
    isOpen: () => expanded("More options"),
  },
  {
    name: "Dropdown",
    render: () => <Dropdown trigger="Actions" items={[{ label: "Edit" }, { label: "Duplicate" }]} />,
    open: () => fireEvent.click(screen.getByText("Actions")),
    isOpen: () => expanded("Actions"),
  },
  {
    name: "Select",
    render: () => <Select options={["Small", "Medium", "Large"]} placeholder="Choose a size" />,
    open: () => fireEvent.click(screen.getByText("Choose a size")),
    isOpen: anyExpanded,
  },
  {
    name: "Popover",
    render: () => <Popover trigger="Details" title="Heads up" />,
    open: () => fireEvent.click(screen.getByText("Details")),
    isOpen: () => expanded("Details"),
  },
  {
    name: "Autocomplete",
    render: () => <Autocomplete options={["Apple", "Banana", "Cherry"]} />,
    open: () => fireEvent.click(screen.getByLabelText("Toggle options")),
    isOpen: anyExpanded,
  },
  {
    name: "ButtonGroup split menu",
    render: () => <ButtonGroup split items={["Save"]} menu={["Save as draft", "Save a copy"]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
    isOpen: () => expanded("More actions"),
  },
  {
    name: "Command",
    render: () => <Command trigger items={[{ label: "Open file" }]} />,
    open: () => fireEvent.click(screen.getByText("Search...")),
    isOpen: anyExpanded,
  },
];

describe("hardware back closes an open anchored card", () => {
  for (const { name, render: node, open, isOpen } of cases) {
    for (const hosted of [true, false]) {
      it(`${name} (${hosted ? "hosted" : "inline"}) subscribes while open, closes on back, and consumes it`, () => withBackEvents(handlers => {
        ui(node(), hosted);
        expect(handlers.size).toBe(0);
        open();
        expect(isOpen()).toBe(true);
        expect(handlers.size).toBeGreaterThan(0);
        expect(pressBack(handlers)).toBe(true);
        expect(isOpen()).toBe(false);
        // Closed, nothing is left listening: the next back belongs to the page.
        expect(handlers.size).toBe(0);
        expect(pressBack(handlers)).toBe(false);
      }));
    }
  }

  it("RowMenu and Dropdown register the same way: one subscription each, only while open", () => withBackEvents(handlers => {
    ui(
      <>
        <RowMenu items={[{ label: "Edit" }]} />
        <Dropdown trigger="Actions" items={[{ label: "Edit" }]} />
      </>,
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(handlers.size).toBe(1);
    pressBack(handlers);
    fireEvent.click(screen.getByText("Actions"));
    expect(handlers.size).toBe(1);
    pressBack(handlers);
    expect(handlers.size).toBe(0);
  }));

  it("reports a controlled close through onOpenChange and consumes back even when the owner stays open", () => withBackEvents(handlers => {
    const changes: boolean[] = [];
    ui(<RowMenu open items={[{ label: "Edit" }]} onOpenChange={next => changes.push(next)} />, true);
    expect(pressBack(handlers)).toBe(true);
    expect(pressBack(handlers)).toBe(true);
    expect(changes).toEqual([false, false]);
    expect(handlers.size).toBe(1);
  }));

  it("leaves back to the page when the card cannot close (pinned open, no onOpenChange)", () => withBackEvents(handlers => {
    ui(
      <>
        <RowMenu open items={[{ label: "Edit" }]} />
        <Dropdown trigger="Actions" open items={[{ label: "Edit" }]} />
      </>,
      true,
    );
    expect(handlers.size).toBe(0);
  }));

  it("closes a card nested in another card before its parent", () => withBackEvents(handlers => {
    ui(
      <Popover trigger="Details" title="Heads up">
        <Select options={["Small", "Large"]} placeholder="Choose a size" />
      </Popover>,
      false,
    );
    fireEvent.click(screen.getByText("Details"));
    const popoverBack = [...handlers][0]!;
    fireEvent.click(screen.getByText("Choose a size"));
    const listbox = () => document.querySelector('[role="listbox"]') != null;
    expect(listbox()).toBe(true);
    // Even the parent's own subscription routes through its escape scope to the open
    // child first, the way the Dialog's does.
    act(() => { expect(popoverBack()).toBe(true); });
    expect(listbox()).toBe(false);
    expect(expanded("Details")).toBe(true);
    expect(pressBack(handlers)).toBe(true);
    expect(expanded("Details")).toBe(false);
  }));

  it("never subscribes to the unsupported web BackHandler", () => withBackEvents(handlers => {
    ui(<RowMenu open onOpenChange={() => {}} items={[{ label: "Edit" }]} />, true);
    expect(handlers.size).toBe(0);
  }, false));
});
