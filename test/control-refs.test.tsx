import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, createRef, StrictMode, type ElementType, type ReactNode, type RefCallback } from "react";
import type { View } from "react-native";
import { Button } from "../src/atoms/button/button.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { RadioGroup } from "../src/atoms/radio/radio-group.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Slider } from "../src/atoms/slider/slider.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);
const themed = (node: ReactNode) => <ThemeProvider>{node}</ThemeProvider>;
const ui = (node: ReactNode) => render(themed(node));

// A one-setting Checkbox is the platform switch on iOS and Android (the design language's
// item 5), so its host announces `switch` there; a selection Checkbox stays a checkbox.
const cases = [
  { name: "Button", dir: "button", role: "button", props: { children: "Save" } },
  { name: "Checkbox", dir: "checkbox", role: "checkbox", nativeRole: "switch", props: { children: "Agree", description: "Terms" } },
  { name: "Checkbox", label: "selection Checkbox", dir: "checkbox", role: "checkbox", props: { children: "Row 1", selection: true } },
  { name: "Switch", dir: "switch", role: "switch", props: { children: "Wi-Fi", description: "Connection" } },
  { name: "Radio", dir: "radio", role: "radio", props: { children: "Daily", card: true } },
  { name: "Select", dir: "select", role: "button", props: { label: "Fruit", options: ["Apple", "Pear"] } },
  { name: "Slider", dir: "slider", role: "slider", props: { children: "Volume", description: "Speaker level", showValue: true, defaultValue: 40 } },
] as const;

for (const platform of ["web", "ios", "android"]) {
  for (const testCase of cases) {
    const { name, dir, props } = testCase;
    const role = platform !== "web" && "nativeRole" in testCase ? testCase.nativeRole : testCase.role;
    const suffix = platform === "web" ? "" : `.${platform}`;
    const module = await import(`../src/atoms/${dir}/${dir}${suffix}.tsx`);
    const Control = module[name] as ElementType;
    describe(`${platform} ${"label" in testCase ? testCase.label : name} host ref`, () => {
      it("exposes the interactive host, focuses without activation and clears on unmount", () => {
        const ref = createRef<View>();
        let activations = 0;
        const changed = () => { activations += 1; };
        const view = ui(createElement(Control, { ...props, ref, testID: "control", onPress: changed, onChange: changed, onSelect: changed, onOpenChange: changed }));
        const host = screen.getByTestId("control");
        expect(ref.current as unknown).toBe(host);
        expect(host.getAttribute("role")).toBe(role);
        expect(typeof ref.current?.measureInWindow).toBe("function");
        act(() => ref.current?.focus());
        expect(document.activeElement).toBe(host);
        expect(activations).toBe(0);
        act(() => ref.current?.blur());
        expect(document.activeElement).not.toBe(host);
        expect(activations).toBe(0);
        view.unmount();
        expect(ref.current).toBeNull();
      });

      it("replaces callback refs and runs returned cleanups through RNW", () => {
        const seen: (View | null)[] = [];
        const first: RefCallback<View> = (node) => { seen.push(node); };
        let attached: View | null = null;
        let disposed = 0;
        const second: RefCallback<View> = (node) => {
          expect(node).not.toBeNull();
          attached = node;
          return () => { attached = null; disposed += 1; };
        };
        const view = ui(createElement(Control, { ...props, ref: first, testID: "control" }));
        const host = screen.getByTestId("control");
        expect(seen as unknown[]).toEqual([host]);
        view.rerender(themed(createElement(Control, { ...props, ref: second, testID: "control" })));
        expect(seen as unknown[]).toEqual([host, null]);
        expect(attached as unknown).toBe(host);
        expect(disposed).toBe(0);
        view.unmount();
        expect(disposed).toBe(1);
        expect(attached).toBeNull();
      });

      it("keeps disabled semantics and suppresses activation with a ref", () => {
        const ref = createRef<View>();
        let activations = 0;
        const changed = () => { activations += 1; };
        ui(createElement(Control, { ...props, ref, disabled: true, testID: "control", onPress: changed, onChange: changed, onSelect: changed, onOpenChange: changed }));
        const host = screen.getByTestId("control");
        expect(ref.current as unknown).toBe(host);
        fireEvent.click(host);
        fireEvent.keyDown(host, { key: "ArrowRight" });
        fireEvent.keyUp(host, { key: "ArrowRight" });
        expect(activations).toBe(0);
        expect(host.getAttribute("aria-disabled")).toBe("true");
      });
    });
  }
}

it("balances ref attachment and cleanup in StrictMode and after a keyed host replacement", () => {
  let active = 0;
  let attachments = 0;
  let detachments = 0;
  const ref: RefCallback<View> = (node) => {
    expect(node).not.toBeNull();
    active += 1;
    attachments += 1;
    return () => { active -= 1; detachments += 1; };
  };
  const tree = (key: string) => themed(<StrictMode><Button key={key} ref={ref}>Save</Button></StrictMode>);
  const view = render(tree("first"));
  expect(active).toBe(1);
  view.rerender(tree("second"));
  expect(active).toBe(1);
  view.unmount();
  expect(active).toBe(0);
  expect(detachments).toBe(attachments);
});

it("follows a Button host changing between a link and a disabled control", () => {
  const ref = createRef<View>();
  const view = ui(<Button ref={ref} href="/destination">Destination</Button>);
  const link = screen.getByRole("link");
  expect(ref.current as unknown).toBe(link);
  act(() => ref.current?.focus());
  expect(document.activeElement).toBe(link);
  view.rerender(themed(<Button ref={ref} href="/destination" disabled>Destination</Button>));
  expect(ref.current as unknown).toBe(screen.getByRole("link"));
  expect(screen.getByRole("link").hasAttribute("href")).toBe(false);
});

it("preserves RadioGroup registration after selection, ref replacement and option reorder", () => {
  const first = createRef<View>();
  const second = createRef<View>();
  const tree = (ref: typeof first, reverse = false) => themed(
    <RadioGroup defaultValue="a">
      {(reverse ? ["b", "a"] : ["a", "b"]).map((value) => (
        <Radio key={value} value={value} ref={value === "a" ? ref : undefined}>{value}</Radio>
      ))}
    </RadioGroup>,
  );
  const view = render(tree(first));
  act(() => first.current?.focus());
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: "b" }));
  view.rerender(tree(second, true));
  expect(first.current).toBeNull();
  expect(second.current as unknown).toBe(screen.getByRole("radio", { name: "a" }));
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(document.activeElement as unknown).toBe(second.current);
  expect(screen.getByRole("radio", { name: "a" }).getAttribute("aria-checked")).toBe("true");
});

it("does not reattach a stable consumer Radio ref when group selection changes", () => {
  let attached = 0;
  let detached = 0;
  const autofocus: RefCallback<View> = (node) => {
    attached += 1;
    node?.focus();
    return () => { detached += 1; };
  };
  const view = ui(<RadioGroup defaultValue="a"><Radio value="a" ref={autofocus}>a</Radio><Radio value="b">b</Radio></RadioGroup>);
  expect(attached).toBe(1);
  expect(document.activeElement === screen.getByRole("radio", { name: "a" })).toBe(true);
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(document.activeElement === screen.getByRole("radio", { name: "b" })).toBe(true);
  expect(attached).toBe(1);
  expect(detached).toBe(0);
  fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
  expect(document.activeElement === screen.getByRole("radio", { name: "a" })).toBe(true);
  expect(attached).toBe(1);
  view.unmount();
  expect(detached).toBe(1);
});

it("preserves Select's hosted trigger measurement when its public ref changes", async () => {
  const originalBounds = Element.prototype.getBoundingClientRect;
  const bounds = spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const outlet = getComputedStyle(this).zIndex === "1000";
    const trigger = this.getAttribute("aria-haspopup") === "listbox";
    if (!outlet && !trigger) return originalBounds.call(this);
    const [x, y, width, height] = outlet ? [0, 0, 640, 800] : [10, 20, 160, 40];
    return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) };
  });
  try {
    const first = createRef<View>();
    const second = createRef<View>();
    const tree = (ref: typeof first) => themed(<OverlayProvider><Select ref={ref} label="Fruit" options={["Apple", "Pear"]} /></OverlayProvider>);
    const view = render(tree(first));
    act(() => first.current?.focus());
    fireEvent.click(screen.getByRole("button", { name: "Fruit" }));
    const mountedList = await screen.findByRole("listbox", { hidden: true });
    layoutHostedEntrance(mountedList, { width: 160, height: 74 }, { width: 150, height: 64 });
    expect(screen.getByRole("listbox")).toBe(mountedList);
    view.rerender(tree(second));
    expect(first.current).toBeNull();
    expect(second.current as unknown).toBe(screen.getByRole("button", { name: "Fruit" }));
    fireEvent.click(screen.getByRole("option", { name: "Pear" }));
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Fruit" }));
    const reopenedList = await screen.findByRole("listbox", { hidden: true });
    layoutHostedEntrance(reopenedList, { width: 160, height: 74 }, { width: 150, height: 64 });
    expect(screen.getByRole("listbox")).toBe(reopenedList);
    expect(second.current).not.toBeNull();
  } finally { bounds.mockRestore(); }
});

it("keeps Slider's interactive target and keyboard behavior when its header changes", async () => {
  const ref = createRef<View>();
  let next = 0;
  const view = ui(<Slider ref={ref} defaultValue={40} onChange={(value) => { next = value; }} accessibilityLabel="Volume" />);
  act(() => ref.current?.focus());
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(next).toBe(41);
  view.rerender(themed(<Slider ref={ref} defaultValue={40} onChange={(value) => { next = value; }} showValue description="Speaker">Volume</Slider>));
  expect(ref.current as unknown).toBe(screen.getByRole("slider"));
  act(() => ref.current?.focus());
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(next).toBe(42);
  await act(async () => {});
});

it("restores modal focus to a Button focused through the public ref", async () => {
  const ref = createRef<View>();
  const tree = (open: boolean) => themed(<OverlayProvider><Button ref={ref}>Opener</Button><Dialog open={open} title="Details" /></OverlayProvider>);
  const view = render(tree(false));
  act(() => ref.current?.focus());
  view.rerender(tree(true));
  const panel = await screen.findByRole("dialog");
  await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
  view.rerender(tree(false));
  await waitFor(() => expect(document.activeElement as unknown).toBe(ref.current));
});
