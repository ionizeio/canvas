import { expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BackHandler, Platform } from "react-native";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";

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

const cases = [["Dialog", Dialog], ["AlertDialog", AlertDialog]] as const;
for (const [name, Component] of cases) {
  it(`${name} consumes native Back as cancel and removes its subscription on close`, () => withBackEvents(handlers => {
    const changes: boolean[] = [];
    let cancelled = 0;
    let confirmed = 0;
    render(<ThemeProvider light solid><OverlayProvider>
      <Component overlay trigger="Open panel" title="Current panel" onOpenChange={next => changes.push(next)}
        onCancel={() => cancelled++} onConfirm={() => confirmed++} />
    </OverlayProvider></ThemeProvider>);
    expect(handlers.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(handlers.size).toBe(1);
    act(() => { expect([...handlers][0]!()).toBe(true); });
    expect(screen.queryByText("Current panel")).toBeNull();
    expect(changes).toEqual([true, false]);
    expect(cancelled).toBe(1);
    expect(confirmed).toBe(0);
    expect(handlers.size).toBe(0);
  }));

  it(`${name} consumes repeated native Back requests when its controlled owner keeps it open`, () => withBackEvents(handlers => {
    const changes: boolean[] = [];
    render(<ThemeProvider light solid><OverlayProvider>
      <Component overlay open title="Controlled panel" onOpenChange={next => changes.push(next)} />
    </OverlayProvider></ThemeProvider>);
    act(() => { expect([...handlers][0]!()).toBe(true); });
    act(() => { expect([...handlers][0]!()).toBe(true); });
    expect(changes).toEqual([false, false]);
    expect(screen.getByText("Controlled panel")).toBeDefined();
    expect(handlers.size).toBe(1);
  }));

  it(`${name} leaves native Back to the page for an inline catalogue panel`, () => withBackEvents(handlers => {
    render(<ThemeProvider light solid><Component open title="Contained panel" /></ThemeProvider>);
    expect(handlers.size).toBe(0);
  }));

  it(`${name} never subscribes to the unsupported web BackHandler`, () => withBackEvents(handlers => {
    render(<ThemeProvider light solid><Component open overlay title="Web panel" /></ThemeProvider>);
    expect(handlers.size).toBe(0);
  }, false));
}

it("Dialog Back routes to a nested overlay before requesting parent cancellation", () => withBackEvents(handlers => {
  const parents: boolean[] = [];
  const children: boolean[] = [];
  render(<ThemeProvider light solid><OverlayProvider>
    <Dialog overlay open accessibilityLabel="Parent panel" onOpenChange={next => parents.push(next)}>
      <AlertDialog overlay trigger="Open child" title="Child panel" onOpenChange={next => children.push(next)} />
    </Dialog>
  </OverlayProvider></ThemeProvider>);
  const parentBack = [...handlers][0]!;
  fireEvent.click(screen.getByRole("button", { name: "Open child" }));
  expect(handlers.size).toBe(2);
  act(() => { expect(parentBack()).toBe(true); });
  expect(screen.queryByText("Child panel")).toBeNull();
  expect(children).toEqual([true, false]);
  expect(parents).toEqual([]);
  expect(handlers.size).toBe(1);
  act(() => { expect(parentBack()).toBe(true); });
  expect(parents).toEqual([false]);
}));
