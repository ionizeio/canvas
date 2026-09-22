import { afterEach, expect, it, spyOn } from "bun:test";
import { act, cleanup, createEvent, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { Platform } from "react-native";
import { Input } from "../src/atoms/input/input.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { EscapeLayerProvider, useEscapeLayer, useInputEscapeBridge } from "../src/style/escape-layer.ts";
import { layoutEntrance } from "./entrance-layout.ts";

afterEach(() => {
  cleanup();
  // Match the end of any physical key held by a test before the next case.
  fireEvent.keyUp(document.body, { key: "Escape" });
});
const ui = (children: ReactNode) => render(<ThemeProvider light solid>{children}</ThemeProvider>);
const focus = (node: HTMLElement) => act(() => node.focus());
const release = () => fireEvent.keyUp(document.body, { key: "Escape" });
const controls = [["Input", Input], ["Textarea", Textarea]] as const;

for (const overlay of [false, true]) it(`focused built-in AlertDialog field cancels and resets (${overlay ? "overlay" : "contained"})`, () => {
  let cancelled = 0;
  let confirmed = 0;
  const changes: boolean[] = [];
  ui(<AlertDialog overlay={overlay} trigger="Open alert" title="Delete draft?" withInput
    onCancel={() => cancelled++} onConfirm={() => confirmed++} onOpenChange={next => changes.push(next)} />);
  const trigger = screen.getByRole("button", { name: "Open alert" });
  focus(trigger);
  fireEvent.click(trigger);
  const field = screen.getByRole("textbox", { name: "Type DELETE to confirm" });
  focus(field);
  fireEvent.change(field, { target: { value: "DEL" } });
  expect(screen.getByRole("button", { name: "Continue" }).getAttribute("aria-disabled")).toBe("true");
  expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(false);
  release();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(cancelled).toBe(1);
  expect(confirmed).toBe(0);
  expect(changes).toEqual([true, false]);
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  expect((screen.getByRole("textbox", { name: "Type DELETE to confirm" }) as HTMLInputElement).value).toBe("");
  expect(screen.getByRole("button", { name: "Continue" }).getAttribute("aria-disabled")).toBe("true");
});

for (const label of ["Amount", "Reason"]) it(`Dialog built-in ${label} field forwards focused Escape to cancellation`, () => {
  let cancelled = 0;
  let confirmed = 0;
  ui(<Dialog trigger="Show refund" title="Refund" withBody onCancel={() => cancelled++} onConfirm={() => confirmed++} />);
  fireEvent.click(screen.getByRole("button", { name: "Show refund" }));
  const field = screen.getByRole("textbox", { name: label });
  focus(field);
  fireEvent.keyDown(field, { key: "Escape" });
  release();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(cancelled).toBe(1);
  expect(confirmed).toBe(0);
});

for (const [name, Control] of controls) {
  it(`custom ${name} calls its handler before canceling its Dialog`, () => {
    const calls: string[] = [];
    ui(<Dialog trigger="Open custom" accessibilityLabel="Custom form" onCancel={() => calls.push("cancel")}>
      <Control label="Draft" defaultValue="Retained" onKeyPress={event => calls.push(event.nativeEvent.key)} />
    </Dialog>);
    fireEvent.click(screen.getByRole("button", { name: "Open custom" }));
    const field = screen.getByRole("textbox", { name: "Draft" });
    focus(field);
    expect(fireEvent.keyDown(field, { key: "x" })).toBe(true);
    fireEvent.keyDown(field, { key: "Escape" });
    release();
    expect(calls).toEqual(["x", "Escape", "cancel"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it(`${name} local preventDefault owns Escape through the parent Modal keyup`, () => {
    let cancelled = 0;
    let edited = 0;
    ui(<Drawer open onOpenChange={() => cancelled++}>
      <Control label="Local editor" defaultValue="Keep" onKeyPress={event => {
        if (event.nativeEvent.key === "Escape") { edited++; event.preventDefault(); }
      }} />
    </Drawer>);
    const field = screen.getByRole("textbox", { name: "Local editor" });
    focus(field);
    expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(false);
    release();
    expect(edited).toBe(1);
    expect(cancelled).toBe(0);
    expect((field as HTMLInputElement).value).toBe("Keep");
    expect(document.activeElement).toBe(field);
  });

  it(`${name} nested Dialog closes before Drawer without keyup fallthrough`, () => {
    let parentCloses = 0;
    let childCloses = 0;
    ui(<Drawer open onOpenChange={() => parentCloses++}>
      <Dialog trigger="Open inner" accessibilityLabel="Inner dialog" onCancel={() => childCloses++}>
        <Control label="Inner field" />
      </Dialog>
    </Drawer>);
    const trigger = screen.getByRole("button", { name: "Open inner" });
    focus(trigger);
    fireEvent.click(trigger);
    const field = screen.getByRole("textbox", { name: "Inner field" });
    focus(field);
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "Escape", repeat: true });
    release();
    expect(screen.queryByRole("textbox", { name: "Inner field" })).toBeNull();
    expect(childCloses).toBe(1);
    expect(parentCloses).toBe(0);
    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    release();
    expect(parentCloses).toBe(1);
  });

  for (const composition of [{ isComposing: true }, { keyCode: 229 }]) it(`${name} IME ${Object.keys(composition)[0]} retains candidate default and blocks Modal cancellation`, () => {
    let cancelled = 0;
    let localCalls = 0;
    ui(<Drawer open onOpenChange={() => cancelled++}>
      <Control label="Composing" defaultValue="候補" onKeyPress={() => localCalls++} />
    </Drawer>);
    const field = screen.getByRole("textbox", { name: "Composing" });
    focus(field);
    const event = createEvent.keyDown(field, { key: "Escape", ...composition });
    fireEvent(field, event);
    expect(event.defaultPrevented).toBe(false);
    release();
    expect(cancelled).toBe(0);
    expect(localCalls).toBe(1);
    expect((field as HTMLInputElement).value).toBe("候補");
    fireEvent.keyDown(field, { key: "Escape" });
    release();
    expect(cancelled).toBe(1);
  });

  it(`${name} without an overlay preserves Escape default and editing value`, () => {
    const keys: string[] = [];
    ui(<Control label="Ordinary field" defaultValue="Unchanged" onKeyPress={event => keys.push(event.nativeEvent.key)} />);
    const field = screen.getByRole("textbox", { name: "Ordinary field" });
    focus(field);
    expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(true);
    release();
    expect(keys).toEqual(["Escape"]);
    expect((field as HTMLInputElement).value).toBe("Unchanged");
    expect(document.activeElement).toBe(field);
  });
}

it("a web Input outside the open owner follows the existing document-top Escape policy", () => {
  let cancelled = 0;
  ui(<><Input label="Outside" /><Dialog open title="Controlled dialog" onCancel={() => cancelled++} /></>);
  const field = screen.getByRole("textbox", { name: "Outside" });
  focus(field);
  fireEvent.keyDown(field, { key: "Escape" });
  release();
  expect(cancelled).toBe(1);
});

it("a semantic field does not displace an active Autocomplete owner or select its option", () => {
  let parentCloses = 0;
  let selections = 0;
  ui(<Dialog open accessibilityLabel="Custom form" onCancel={() => parentCloses++}>
    <Input label="Sibling field" /><Autocomplete label="Fruit" options={["Apple", "Apricot"]} onSelect={() => selections++} />
  </Dialog>);
  const combo = screen.getByRole("combobox", { name: "Fruit" });
  focus(combo);
  fireEvent.change(combo, { target: { value: "Ap" } });
  const panel = document.querySelector('[role="listbox"]');
  expect(panel).not.toBeNull();
  layoutEntrance(panel!, { width: 200, height: 90 });
  const field = screen.getByRole("textbox", { name: "Sibling field" });
  focus(field);
  fireEvent.keyDown(field, { key: "Escape" });
  release();
  expect(screen.queryByRole("listbox")).toBeNull();
  expect((combo as HTMLInputElement).value).toBe("Ap");
  expect(selections).toBe(0);
  expect(parentCloses).toBe(0);
});

function withRuntime(runtime: "ios" | "android", run: () => void) {
  const select = spyOn(Platform, "select").mockImplementation(specifics =>
    runtime in specifics ? specifics[runtime] : "native" in specifics ? specifics.native : specifics.default,
  );
  try { run(); } finally { cleanup(); select.mockRestore(); }
}

for (const runtime of ["ios", "android"] as const) {
  for (const [name, Control] of controls) it(`${runtime} ${name} uses its native owner and preserves controlled refusal`, () => withRuntime(runtime, () => {
    let parentCloses = 0;
    let childCloses = 0;
    ui(<Drawer open onOpenChange={() => parentCloses++}>
      <Dialog open accessibilityLabel="Retained child" onCancel={() => childCloses++}>
        <Control label="Native field" />
      </Dialog>
    </Drawer>);
    const field = screen.getByRole("textbox", { name: "Native field" });
    focus(field);
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(childCloses).toBe(2);
    expect(parentCloses).toBe(0);
    expect(screen.getByRole("textbox", { name: "Native field" })).toBe(field);
  }));

  it(`${runtime} unowned input cannot dismiss an unrelated native owner`, () => withRuntime(runtime, () => {
    let cancelled = 0;
    ui(<><Input label="Unowned" /><Dialog open title="Separate owner" onCancel={() => cancelled++} /></>);
    const field = screen.getByRole("textbox", { name: "Unowned" });
    focus(field);
    expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(true);
    expect(cancelled).toBe(0);
  }));

  for (const prevention of ["synthetic", "native"] as const) it(`${runtime} honors ${prevention} event default prevention`, () => withRuntime(runtime, () => {
    let cancelled = 0;
    function Owner({ children }: { children: ReactNode }) {
      const scope = useEscapeLayer(true, () => cancelled++);
      return <EscapeLayerProvider scope={scope}>{children}</EscapeLayerProvider>;
    }
    const { result } = renderHook(() => useInputEscapeBridge(undefined), { wrapper: Owner });
    let prevented = 0;
    // RN metadata contract, invoked through the actual bridge and committed owner.
    // This is not a native keyboard or accessibility gesture simulation.
    const event = {
      nativeEvent: { key: "Escape", defaultPrevented: prevention === "native" },
      defaultPrevented: prevention === "synthetic", preventDefault: () => prevented++,
    } as unknown as Parameters<typeof result.current>[0];
    act(() => result.current(event));
    expect(cancelled).toBe(0);
    expect(prevented).toBe(0);
  }));
}
