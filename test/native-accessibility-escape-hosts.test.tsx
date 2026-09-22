import { afterEach, expect, it, spyOn } from "bun:test";
import { type ForwardedRef, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Platform, View, Text, type ViewProps } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Form } from "../src/molecules/form/form.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { GlassSurface as IOSGlassSurface } from "../src/style/glass-surface/glass-surface.ios.tsx";
import { GlassBox, PlainSurface, degradedGlassSurface } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { Calendar } from "../src/organisms/calendar/calendar.tsx";
import { layoutEntrance, layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);

type Host = { node: HTMLElement; props: ViewProps; escape: () => void };
async function withNativeHosts(run: (host: (content: Element) => Host) => void | Promise<void>) {
  // Observe props at the real RN View render boundary before RNW drops native
  // accessibility callbacks. Preserve the host, children and forwarded ref.
  // Invoking this callback proves wiring and behavior, not a VoiceOver gesture.
  const component = View as unknown as {
    render: (props: ViewProps, ref: ForwardedRef<unknown>) => ReactNode;
  };
  const original = component.render;
  const metadata = new WeakMap<HTMLElement, ViewProps>();
  const observer = spyOn(component, "render").mockImplementation((props, ref) => {
    if (!props.onAccessibilityEscape) return original(props, ref);
    return original(props, (node: unknown) => {
      if (node instanceof HTMLElement) metadata.set(node, props);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    });
  });
  const select = spyOn(Platform, "select").mockImplementation(specifics =>
    "ios" in specifics ? specifics.ios : "native" in specifics ? specifics.native : specifics.default,
  );
  const host = (content: Element): Host => {
    for (let node: Element | null = content; node; node = node.parentElement) {
      const props = metadata.get(node as HTMLElement);
      if (props?.onAccessibilityEscape) return { node: node as HTMLElement, props, escape: props.onAccessibilityEscape };
    }
    throw new Error("No native accessibility escape handler contains this content");
  };
  try { await run(host); } finally { cleanup(); select.mockRestore(); observer.mockRestore(); }
}
const ui = (node: ReactNode) => render(<ThemeProvider light solid>{node}</ThemeProvider>);

it("routes the actual Drawer host event through its controlled open request", async () => withNativeHosts(host => {
  const changes: boolean[] = [];
  ui(<Drawer open onOpenChange={next => changes.push(next)}><Text>Drawer content</Text></Drawer>);
  const current = host(screen.getByText("Drawer content"));
  expect(current.props.collapsable).toBe(false);
  expect(current.props.accessible).not.toBe(true);
  act(() => current.escape());
  act(() => current.escape());
  expect(changes).toEqual([false, false]);
  expect(screen.getByText("Drawer content")).toBeDefined();
}));

async function measuredMenu(hosted: boolean, role = "menu") {
  const panel = await waitFor(() => {
    const node = document.querySelector(`[role="${role}"]`);
    expect(node).not.toBeNull();
    return node!;
  });
  if (hosted) layoutHostedEntrance(panel, { width: 200, height: 90 }, { width: 190, height: 80 });
  else layoutEntrance(panel, { width: 200, height: 90 });
}
async function withMeasurements(run: () => Promise<void>) {
  const measure = spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const outlet = getComputedStyle(this).zIndex === "1000";
    const [x, y, width, height] = outlet ? [0, 0, 1280, 800] : [10, 20, 160, 32];
    return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) } as DOMRect;
  });
  try { await run(); } finally { measure.mockRestore(); }
}

for (const hosted of [false, true]) it(`${hosted ? "hosted" : "inline"} Dropdown exposes its real surface callback and dismisses without selection`, async () => withMeasurements(() => withNativeHosts(async host => {
  const picked: string[] = [];
  const changes: boolean[] = [];
  const menu = <Dropdown trigger="Open choices" items={[{ label: "Rename" }, { label: "Archive", disabled: true }]}
    onSelect={item => picked.push(item.label)} onOpenChange={next => changes.push(next)} />;
  ui(hosted ? <OverlayProvider>{menu}</OverlayProvider> : menu);
  fireEvent.click(screen.getByRole("button", { name: "Open choices" }));
  await measuredMenu(hosted);
  const current = host(screen.getByRole("menuitem", { name: "Archive" }));
  expect(current.props.collapsable).toBe(false);
  expect(current.props.accessible).not.toBe(true);
  act(() => current.escape());
  expect(screen.queryByRole("menu")).toBeNull();
  expect(changes).toEqual([true, false]);
  expect(picked).toEqual([]);
})));

it("a Drawer host event dismisses its hosted child before requesting the Drawer close", async () => withMeasurements(() => withNativeHosts(async host => {
  const parent: boolean[] = [];
  const child: boolean[] = [];
  ui(<Drawer open onOpenChange={next => parent.push(next)}><Text>Parent content</Text>
    <Dropdown trigger="Open child" items={[{ label: "Archive" }]} onOpenChange={next => child.push(next)} />
  </Drawer>);
  const parentHost = host(screen.getByText("Parent content"));
  fireEvent.click(screen.getByRole("button", { name: "Open child" }));
  await measuredMenu(true);
  expect(host(screen.getByRole("menuitem", { name: "Archive" })).node).not.toBe(parentHost.node);
  act(() => parentHost.escape());
  expect(screen.queryByRole("menu")).toBeNull();
  expect(child).toEqual([true, false]);
  expect(parent).toEqual([]);
  act(() => parentHost.escape());
  expect(parent).toEqual([false]);
})));

it("nested Drawer host escape closes only the innermost owner", async () => withNativeHosts(async host => {
  const parent: boolean[] = [];
  const child: boolean[] = [];
  ui(<Drawer open onOpenChange={next => parent.push(next)}><Text>Outer panel</Text>
    <Drawer trigger="Open inner" onOpenChange={next => child.push(next)}><Text>Inner panel</Text></Drawer>
  </Drawer>);
  fireEvent.click(screen.getByRole("button", { name: "Open inner" }));
  act(() => host(screen.getByText("Inner panel")).escape());
  await waitFor(() => expect(screen.queryByText("Inner panel")).toBeNull());
  expect(child).toEqual([true, false]);
  expect(parent).toEqual([]);
  act(() => host(screen.getByText("Outer panel")).escape());
  expect(parent).toEqual([false]);
}));

it("ActionSheet host escape cancels without activating a disabled or enabled action", async () => withNativeHosts(async host => {
  const changes: boolean[] = [];
  let selected = 0;
  ui(<ActionSheet trigger="Show sheet" title="Sheet choices" actions={[
    { label: "Enabled", onPress: () => selected++ }, { label: "Disabled", disabled: true, onPress: () => selected++ },
  ]} onOpenChange={next => changes.push(next)} />);
  fireEvent.click(screen.getByRole("button", { name: "Show sheet" }));
  act(() => host(screen.getByText("Sheet choices")).escape());
  await waitFor(() => expect(screen.queryByText("Sheet choices")).toBeNull());
  expect(changes).toEqual([true, false]);
  expect(selected).toBe(0);
}));

for (const custom of [false, true]) it(`Dialog ${custom ? "custom destructive" : "built-in"} host escape uses cancel once`, async () => withNativeHosts(host => {
  let cancelled = 0;
  let confirmed = 0;
  ui(<Dialog trigger="Show dialog" title="Confirmation" description="Built-in body" destructive={custom}
    accessibilityLabel={custom ? "Custom confirmation" : undefined} onCancel={() => cancelled++} onConfirm={() => confirmed++}>
    {custom ? <Text>Custom body</Text> : undefined}
  </Dialog>);
  fireEvent.click(screen.getByRole("button", { name: "Show dialog" }));
  act(() => host(screen.getByText(custom ? "Custom body" : "Built-in body")).escape());
  expect(screen.queryByRole(custom ? "alertdialog" : "dialog")).toBeNull();
  expect(cancelled).toBe(1);
  expect(confirmed).toBe(0);
}));

it("AlertDialog escape cancels while confirm is gated and resets its input for reopening", async () => withNativeHosts(host => {
  let cancelled = 0;
  let confirmed = 0;
  ui(<AlertDialog trigger="Show alert" title="Remove record" description="Confirm carefully" withInput
    onCancel={() => cancelled++} onConfirm={() => confirmed++} />);
  fireEvent.click(screen.getByRole("button", { name: "Show alert" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "DEL" } });
  expect(screen.getByRole("button", { name: "Continue" }).getAttribute("aria-disabled")).toBe("true");
  act(() => host(screen.getByText("Confirm carefully")).escape());
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(cancelled).toBe(1);
  expect(confirmed).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Show alert" }));
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
}));

it("controlled AlertDialog refusal retains the panel and consumes every request as cancel", async () => withNativeHosts(host => {
  let cancelled = 0;
  const changes: boolean[] = [];
  ui(<AlertDialog open title="Retained confirmation" withInput onCancel={() => cancelled++} onOpenChange={next => changes.push(next)} />);
  const current = host(screen.getByText("Retained confirmation"));
  act(() => current.escape());
  act(() => current.escape());
  expect(screen.getByRole("alertdialog")).toBeDefined();
  expect(cancelled).toBe(2);
  expect(changes).toEqual([false, false]);
}));

it("Select and RowMenu host escape close without selecting an item", async () => withNativeHosts(async host => {
  const selected: string[] = [];
  ui(<><Select options={["Small", "Large"]} placeholder="Size" onSelect={value => selected.push(String(value))} />
    <RowMenu items={[{ label: "Archive" }]} onSelect={item => selected.push(item.label)} /></>);
  fireEvent.click(screen.getByRole("button", { name: "Size" }));
  await measuredMenu(false, "listbox");
  act(() => host(screen.getByRole("option", { name: "Large" })).escape());
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  await measuredMenu(false);
  act(() => host(screen.getByRole("menuitem", { name: "Archive" })).escape());
  expect(screen.queryByRole("menu")).toBeNull();
  expect(selected).toEqual([]);
}));

it("Autocomplete host escape retains the editing value without selecting or submitting", async () => withNativeHosts(async host => {
  const selected: string[] = [];
  let submitted = 0;
  ui(<Form submitLabel="Save fruit" onSubmit={() => submitted++}>
    <Autocomplete label="Fruit" options={["Apple", "Apricot"]} onSelect={value => selected.push(value)} />
  </Form>);
  const input = screen.getByRole("combobox") as HTMLInputElement;
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "Ap" } });
  await measuredMenu(false, "listbox");
  act(() => host(screen.getByRole("option", { name: "Apricot" })).escape());
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(input.value).toBe("Ap");
  expect(document.activeElement).toBe(input);
  expect(submitted).toBe(0);
  expect(selected).toEqual([]);
}));

it("triggered Command and floating Popover escape, while persistent content has no dismiss handler", async () => withNativeHosts(async host => {
  let selected = 0;
  ui(<><Command trigger placeholder="Find command" groups={[{ items: [{ label: "Archive" }] }]} onSelect={() => selected++} />
    <Popover trigger="Show details" title="Floating details" />
    <Popover inline title="Persistent details" />
    <Command placeholder="Persistent commands" groups={[]} /></>);
  expect(() => host(screen.getByText("Persistent details"))).toThrow("No native accessibility escape handler");
  expect(() => host(screen.getByPlaceholderText("Persistent commands"))).toThrow("No native accessibility escape handler");
  fireEvent.click(screen.getByRole("button", { name: /Search/ }));
  const input = screen.getByPlaceholderText("Find command");
  layoutEntrance(input, { width: 320, height: 160 });
  act(() => host(input).escape());
  expect(screen.queryByPlaceholderText("Find command")).toBeNull();
  expect(selected).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Show details" }));
  const title = screen.getByText("Floating details");
  layoutEntrance(title, { width: 240, height: 100 });
  act(() => host(title).escape());
  expect(screen.queryByText("Floating details")).toBeNull();
  expect(screen.getByText("Persistent details")).toBeDefined();
}));

it("split overflow escape closes its menu without invoking a primary or menu action", async () => withNativeHosts(async host => {
  let selected = 0;
  ui(<ButtonGroup split items={["Save"]} menu={["Save draft", "Archive"]} onSelect={() => selected++} />);
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
  await measuredMenu(false);
  act(() => host(screen.getByRole("menuitem", { name: "Archive" })).escape());
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.getByRole("button", { name: "More actions" }).getAttribute("aria-expanded")).toBe("false");
  expect(selected).toBe(0);
}));

it("Calendar day-peek escape closes only the peek without changing the selected date", async () => withNativeHosts(host => {
  const selected: number[] = [];
  ui(<Calendar dayPeek month="May 2026" daysInMonth={31} startWeekday={4}
    events={[{ day: 8, title: "Offsite" }]} onSelect={day => selected.push(day)} />);
  fireEvent.click(screen.getByRole("button", { name: "8, 1 event" }));
  const title = screen.getByText("Offsite");
  layoutEntrance(title, { width: 260, height: 100 });
  act(() => host(title).escape());
  expect(screen.queryByText("Offsite")).toBeNull();
  expect(selected).toEqual([8]);
  expect(screen.getByRole("button", { name: "8, selected, 1 event" })).toBeDefined();
}));


it("Calendar hover-card escape clears only the hover owner without selecting or activating its event", async () => withNativeHosts(host => {
  let selected = 0;
  let activated = 0;
  ui(<Calendar day selected={8} month="May 2026" startHour={8} endHour={12}
    events={[{ day: 8, start: 9, end: 10, title: "Planning", description: "Review milestones" }]}
    onSelect={() => selected++} onEventPress={() => activated++} />);
  const event = screen.getByRole("button", { name: "Planning, 9 AM to 10 AM" });
  fireEvent.pointerEnter(event, { pointerType: "mouse" });
  const description = screen.getByText("Review milestones");
  layoutEntrance(description, { width: 260, height: 100 });
  act(() => host(description).escape());
  expect(screen.queryByText("Review milestones")).toBeNull();
  expect(screen.getByRole("button", { name: "Planning, 9 AM to 10 AM" })).toBe(event);
  expect(selected).toBe(0);
  expect(activated).toBe(0);
}));

for (const [name, Surface] of [["base", GlassSurface], ["iOS", IOSGlassSurface]] as const) {
  for (const glass of [false, true]) it(`${name} surface forwards escape in ${glass ? "optional-peer fallback" : "solid"} mode`, async () => withNativeHosts(host => {
    let cancelled = 0;
    render(<ThemeProvider light glass={glass} solid={!glass}>
      <Surface onAccessibilityEscape={() => cancelled++}><Text>Surface content</Text></Surface>
    </ThemeProvider>);
    const current = host(screen.getByText("Surface content"));
    expect(current.props.collapsable).toBe(false);
    expect(current.props.accessible).not.toBe(true);
    act(() => current.escape());
    expect(cancelled).toBe(1);
  }));
}

it("the real material container retains escape on its plain outer host without grouping content", async () => withNativeHosts(host => {
  let cancelled = 0;
  ui(<GlassBox onAccessibilityEscape={() => cancelled++} material={<View testID="material" />}>
    <Text>Material content</Text>
  </GlassBox>);
  const current = host(screen.getByText("Material content"));
  expect(current.props.collapsable).toBe(false);
  expect(current.props.accessible).not.toBe(true);
  expect(current.node.contains(screen.getByTestId("material"))).toBe(true);
  expect(screen.getByText("Material content").parentElement).toBe(current.node);
  act(() => current.escape());
  expect(cancelled).toBe(1);
}));

for (const increasedContrast of [false, true]) it(`accessibility degradation preserves escape with increased contrast ${increasedContrast}`, async () => withNativeHosts(host => {
  let cancelled = 0;
  ui(degradedGlassSurface({ increasedContrast, reducedTransparency: true, tokens: lightColors }, {
    onAccessibilityEscape: () => cancelled++, children: <Text>Opaque content</Text>,
  }));
  const current = host(screen.getByText("Opaque content"));
  expect(current.props.collapsable).toBe(false);
  act(() => current.escape());
  expect(cancelled).toBe(1);
}));

it("surfaces without an escape owner do not gain a native callback", async () => withNativeHosts(host => {
  ui(<PlainSurface><Text>Persistent surface</Text></PlainSurface>);
  expect(() => host(screen.getByText("Persistent surface"))).toThrow("No native accessibility escape handler");
}));
