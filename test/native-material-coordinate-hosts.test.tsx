import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ForwardedRef, ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Switch as WebSwitch } from "../src/atoms/switch/switch.tsx";
import { Switch as IOSSwitch } from "../src/atoms/switch/switch.ios.tsx";
import { Switch as AndroidSwitch } from "../src/atoms/switch/switch.android.tsx";
import { ButtonGroup as WebButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { ButtonGroup as IOSButtonGroup } from "../src/atoms/button-group/button-group.ios.tsx";
import { ButtonGroup as AndroidButtonGroup } from "../src/atoms/button-group/button-group.android.tsx";

afterEach(cleanup);

function withNativeHostProps(run: (props: (node: Element) => ViewProps) => void) {
  // Inspect the actual RN View boundary before RNW drops collapsable. The
  // browser cannot reproduce Fabric flattening, so device shape proof is separate.
  const component = View as unknown as { render: (props: ViewProps, ref: ForwardedRef<unknown>) => ReactNode };
  const original = component.render;
  const metadata = new WeakMap<HTMLElement, ViewProps>();
  const observer = spyOn(component, "render").mockImplementation((props, ref) => original(props, (node: unknown) => {
    if (node instanceof HTMLElement) metadata.set(node, props);
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }));
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => true } });
  try {
    run((node) => {
      const props = metadata.get(node as HTMLElement);
      expect(props).toBeDefined();
      return props!;
    });
  } finally {
    cleanup();
    observer.mockRestore();
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as Record<string, unknown>).CSS;
  }
}

const themed = (children: ReactNode, glass: boolean) => <ThemeProvider light glass={glass} solid={!glass}>{children}</ThemeProvider>;

describe("native material coordinate hosts", () => {
  for (const [platform, Switch] of [["web", WebSwitch], ["ios", IOSSwitch], ["android", AndroidSwitch]] as const) {
    it(`${platform} Switch preserves the measured track, shape and state through both material directions`, () => withNativeHostProps(props => {
      // No testID: a native test ID itself prevents flattening and would mask this defect.
      const children = <Switch defaultChecked>Live updates</Switch>;
      const result = render(themed(children, false));
      const control = screen.getByRole("switch");
      const track = control.lastElementChild as HTMLElement;
      const initial = [track.style.width, track.style.height, track.style.borderRadius, track.style.backgroundColor];
      expect(props(track).collapsable).toBe(false);
      expect(props(track).onLayout).toBeDefined();
      expect(props(track).testID).toBeUndefined();
      for (const glass of [true, false, true, false]) {
        result.rerender(themed(children, glass));
        expect(screen.getByRole("switch")).toBe(control);
        expect(control.lastElementChild).toBe(track);
        expect(props(track).collapsable).toBe(false);
        expect(control.getAttribute("aria-checked")).toBe("true");
        expect([track.style.width, track.style.height, track.style.borderRadius]).toEqual(initial.slice(0, 3));
        if (!glass) expect(track.style.backgroundColor).toBe(initial[3]);
      }
      fireEvent.click(control);
      expect(control.getAttribute("aria-checked")).toBe("false");
      result.rerender(themed(children, true));
      expect(control.getAttribute("aria-checked")).toBe("false");
      expect(control.lastElementChild).toBe(track);
      expect(props(track).collapsable).toBe(false);
    }));
  }

  for (const [platform, ButtonGroup] of [["web", WebButtonGroup], ["ios", IOSButtonGroup], ["android", AndroidButtonGroup]] as const) {
    it(`${platform} ButtonGroup keeps its coordinate root and focused selection without a test ID`, () => withNativeHostProps(props => {
      const children = <ButtonGroup items={["Day", "Week", "Month"]} />;
      const result = render(themed(children, false));
      const root = screen.getByRole("tablist");
      const week = screen.getByRole("tab", { name: "Week" });
      fireEvent.click(week);
      week.focus();
      for (const glass of [true, false, true]) {
        result.rerender(themed(children, glass));
        expect(screen.getByRole("tablist")).toBe(root);
        expect(props(root).collapsable).toBe(false);
        expect(props(root).testID).toBeUndefined();
        expect(screen.getByRole("tab", { name: "Week" })).toBe(week);
        expect(week.getAttribute("aria-selected")).toBe("true");
        expect(document.activeElement).toBe(week);
      }
    }));
  }
});
