import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { cleanup, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { View } from "react-native";
import {
  CELL_AXIS,
  FILL,
  HUG_IN_STRETCH_COLUMN,
  LayoutAxisProvider,
  ROW_AXIS,
  columnAxis,
  useFillStyle,
  useHugStyle,
  useLayoutAxis,
  useSizing,
} from "../src/style/sizing.ts";
import { resetDevWarnings } from "../src/style/dev-warn.ts";

// The sizing natures (src/style/sizing.ts). FILL is one static style: width:100%
// plus flexShrink:1 and minWidth:0, so a field fills a Column and shares a Row.
// HUG is resolved against the nearest kit layout container because Yoga ignores
// the intrinsic-size keywords against a stretching parent and a bare
// alignSelf:"flex-start" breaks cross-axis centering in Rows (both verified on
// iOS in the Phase 0 spike): alignSelf:"flex-start" inside a stretching Column,
// nothing anywhere else.

afterEach(cleanup);
beforeEach(resetDevWarnings);

const inAxis = (value: Parameters<typeof LayoutAxisProvider>[0]["value"]) =>
  ({ children }: { children: ReactNode }) => <LayoutAxisProvider value={value}>{children}</LayoutAxisProvider>;

describe("FILL", () => {
  it("is width:100% with the row-sharing pair", () => {
    expect(FILL).toEqual({ width: "100%", flexShrink: 1, minWidth: 0 });
  });

  it("useFillStyle returns FILL everywhere", () => {
    expect(renderHook(() => useFillStyle("Input")).result.current).toBe(FILL);
    expect(renderHook(() => useFillStyle("Input"), { wrapper: inAxis(ROW_AXIS) }).result.current).toBe(FILL);
    expect(renderHook(() => useFillStyle("Input"), { wrapper: inAxis(columnAxis(true, ROW_AXIS, true)) }).result.current).toBe(FILL);
  });

  it("warns once when the nearest cell is a bare Column inside a Row", () => {
    const seen: string[] = [];
    const original = console.warn;
    console.warn = (m: string) => { seen.push(m); };
    try {
      const hugging = columnAxis(true, ROW_AXIS, false);
      renderHook(() => useFillStyle("Input"), { wrapper: inAxis(hugging) });
      renderHook(() => useFillStyle("Input"), { wrapper: inAxis(hugging) });
      expect(seen).toHaveLength(1);
      expect(seen[0]).toContain("<Input />");
      expect(seen[0]).toContain("span={n} or fill");
      // A sized Column (span/fill/grow) inside a Row is a definite cell: no warning.
      renderHook(() => useFillStyle("Input"), { wrapper: inAxis(columnAxis(true, ROW_AXIS, true)) });
      // A Column inside a Column is definite too.
      renderHook(() => useFillStyle("Input"), { wrapper: inAxis(columnAxis(true, CELL_AXIS, false)) });
      expect(seen).toHaveLength(1);
    } finally {
      console.warn = original;
    }
  });
});

describe("HUG", () => {
  it("is nothing outside every kit layout container (a raw View keeps RN's stretch)", () => {
    expect(renderHook(() => useHugStyle()).result.current).toBeNull();
  });

  it("is alignSelf:flex-start inside a stretching Column", () => {
    expect(renderHook(() => useHugStyle(), { wrapper: inAxis(columnAxis(true, null, false)) }).result.current).toBe(HUG_IN_STRETCH_COLUMN);
    expect(renderHook(() => useHugStyle(), { wrapper: inAxis(CELL_AXIS) }).result.current).toEqual({ alignSelf: "flex-start" });
  });

  it("is nothing in a Row (content-sized already) and nothing in a non-stretch Column (centered by the column)", () => {
    expect(renderHook(() => useHugStyle(), { wrapper: inAxis(ROW_AXIS) }).result.current).toBeNull();
    expect(renderHook(() => useHugStyle(), { wrapper: inAxis(columnAxis(false, null, false)) }).result.current).toBeNull();
  });

  it("useSizing: block is FILL, otherwise the hug resolution", () => {
    expect(renderHook(() => useSizing({ block: true })).result.current).toBe(FILL);
    expect(renderHook(() => useSizing({}), { wrapper: inAxis(CELL_AXIS) }).result.current).toBe(HUG_IN_STRETCH_COLUMN);
    expect(renderHook(() => useSizing({}), { wrapper: inAxis(ROW_AXIS) }).result.current).toBeNull();
  });
});

describe("the layout axis context", () => {
  it("is null outside a container and the nearest container's value inside", () => {
    expect(renderHook(() => useLayoutAxis()).result.current).toBeNull();
    const nested = ({ children }: { children: ReactNode }) => (
      <LayoutAxisProvider value={ROW_AXIS}>
        <LayoutAxisProvider value={CELL_AXIS}>{children}</LayoutAxisProvider>
      </LayoutAxisProvider>
    );
    expect(renderHook(() => useLayoutAxis(), { wrapper: nested }).result.current).toBe(CELL_AXIS);
  });

  it("columnAxis: hugging only for an unsized Column whose parent is a Row", () => {
    expect(columnAxis(true, ROW_AXIS, false)).toEqual({ axis: "column", stretch: true, hugging: true });
    expect(columnAxis(true, ROW_AXIS, true)).toEqual({ axis: "column", stretch: true, hugging: false });
    expect(columnAxis(false, CELL_AXIS, false)).toEqual({ axis: "column", stretch: false, hugging: false });
    expect(columnAxis(true, null, false)).toEqual({ axis: "column", stretch: true, hugging: false });
  });

  it("renders through a provider without adding a host node", () => {
    const { container } = render(
      <LayoutAxisProvider value={CELL_AXIS}>
        <View testID="only" />
      </LayoutAxisProvider>,
    );
    expect(container.children).toHaveLength(1);
    expect((container.firstElementChild as HTMLElement).getAttribute("data-testid")).toBe("only");
  });
});

// The input-like controls are FILL: their outermost node carries width:100% plus
// the row-sharing pair and no cap of its own (the parent layout container provides
// the bounds; the docs stage is definite). This replaces the field-width axis tests:
// the fixed 320 / 240 / 480 widths and the block / narrow / wide / fit props are gone.
import { ThemeProvider } from "../src/style/theme.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Listbox } from "../src/atoms/listbox/listbox.tsx";
import { Slider } from "../src/atoms/slider/slider.tsx";
import { Progress } from "../src/atoms/progress/progress.tsx";
import { Row, Column } from "../src/atoms/layout/layout.tsx";

const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);
const at = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const expectFill = (el: HTMLElement | null) => {
  expect(el).not.toBeNull();
  expect(el!.style.width).toBe("100%");
  expect(el!.style.flexShrink).toBe("1");
  expect(el!.style.minWidth).toBe("0px");
  expect(el!.style.maxWidth).toBe("");
};
/** The nearest ancestor (or self) carrying the fill nature (its minWidth:0 marks it). */
const fillAncestor = (el: HTMLElement | null) => {
  let node: HTMLElement | null = el;
  while (node && !(node.style.minWidth === "0px" && node.style.width === "100%")) node = node.parentElement;
  return node;
};

describe("the fields are FILL", () => {
  it("Input: the bare field, the labeled wrapper, and the grouped (addon) container", () => {
    const bare = ui(<Input placeholder="Email" />);
    expectFill(bare.container.querySelector("input"));
    cleanup();
    const labeled = ui(<Input label="Email" placeholder="ada@acme.dev" />);
    expectFill(fillAncestor(labeled.container.querySelector("input")));
    cleanup();
    const grouped = ui(<Input prefix="$" placeholder="0.00" />);
    const inner = grouped.container.querySelector("input") as HTMLElement;
    // The group container, not the inner field, is the FILL node.
    expect(inner.style.minWidth).not.toBe("0px");
    expectFill(fillAncestor(inner.parentElement));
  });

  it("Textarea, Select, and Autocomplete on their outermost node", () => {
    const t = ui(<Textarea placeholder="Notes" />);
    expectFill(fillAncestor(t.container.querySelector("textarea")));
    cleanup();
    const s = ui(<Select label="Region" options={["EU", "US"]} />);
    expectFill(s.container.firstElementChild as HTMLElement);
    cleanup();
    const a = ui(<Autocomplete label="City" options={["Paris", "Oslo"]} />);
    expectFill(a.container.firstElementChild as HTMLElement);
  });

  it("Listbox, Progress, and Slider roots", () => {
    const l = ui(<Listbox testID="lb" items={[{ label: "Backend" }, { label: "Frontend" }]} />);
    expectFill(at(l.container, "lb"));
    cleanup();
    const p = ui(<Progress testID="p" value={0.5} />);
    expectFill(at(p.container, "p"));
    cleanup();
    const sl = ui(<Slider testID="s" defaultValue={40} />);
    expectFill(at(sl.container, "s"));
  });

  it("the width is the same at every viewport: there is no width to drop", () => {
    const { container } = ui(<Input placeholder="Email" />);
    expectFill(container.querySelector("input"));
  });

  it("warns once when a field lands in a bare Column inside a Row, and not inside a span", () => {
    const seen: string[] = [];
    const original = console.warn;
    console.warn = (m: string) => { seen.push(m); };
    try {
      ui(
        <Row>
          <Column>
            <Input placeholder="collapses" />
          </Column>
          <Column span={6}>
            <Input placeholder="fine" />
          </Column>
        </Row>,
      );
      const hits = seen.filter((m) => m.includes("<Input />") && m.includes("bare <Column>"));
      expect(hits).toHaveLength(1);
      // A Select's content is its value, so the bare Column is the toolbar cell
      // (Bootstrap .col-auto), not a defect: no warning.
      ui(
        <Row>
          <Column>
            <Select options={["All", "Active"]} defaultValue="All" />
          </Column>
        </Row>,
      );
      expect(seen.filter((m) => m.includes("<Select />"))).toHaveLength(0);
    } finally {
      console.warn = original;
    }
  });
});

// The measure axis (MeasureProps, src/style/sizing.ts): Container's steps on a
// component. A step is FILL capped at that width of the scale (maxWidth), so it is
// still the parent's bounds below the step; it centers in its column unless
// `start` pins it, and in a Row only the cap applies (alignSelf is the cross axis
// there). Narrowest wins when several steps are passed, and on a hug component a
// step wins over `block`.
import { Button } from "../src/atoms/button/button.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Field } from "../src/molecules/field/field.tsx";
import { Form } from "../src/molecules/form/form.tsx";
import { Container } from "../src/atoms/container/container.tsx";
import { widths } from "../src/style/tokens.ts";
import { measureStyle, stepOf, useMeasureStyle } from "../src/style/sizing.ts";

const expectMeasured = (el: HTMLElement | null, step: keyof typeof widths, align: "center" | "flex-start" | "") => {
  expect(el).not.toBeNull();
  expect(el!.style.width).toBe("100%");
  expect(el!.style.flexShrink).toBe("1");
  expect(el!.style.minWidth).toBe("0px");
  expect(el!.style.maxWidth).toBe(`${widths[step]}px`);
  expect(el!.style.alignSelf).toBe(align);
};
/** The nearest ancestor (or self) carrying a max width (the measured node). */
const measuredAncestor = (el: HTMLElement | null) => {
  let node: HTMLElement | null = el;
  while (node && node.style.maxWidth === "") node = node.parentElement;
  return node;
};

describe("the measure axis", () => {
  it("stepOf: null without a step, narrowest first when several are passed", () => {
    // The precedence is the scale's own declaration order, so the scale must be ascending.
    const values = Object.values(widths);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(Object.keys(widths)[0]).toBe("xxxs");
    expect(stepOf({})).toBeNull();
    expect(stepOf({ start: true })).toBeNull();
    expect(stepOf({ lg: true })).toBe("lg");
    expect(stepOf({ page: true, xs: true, xxl: true })).toBe("xs");
  });

  it("measureStyle: FILL capped at the step; centered or pinned in a column, the cap alone in a Row", () => {
    expect(measureStyle("sm", false, null)).toEqual({ ...FILL, maxWidth: widths.sm, alignSelf: "center" });
    expect(measureStyle("sm", true, CELL_AXIS)).toEqual({ ...FILL, maxWidth: widths.sm, alignSelf: "flex-start" });
    expect(measureStyle("sm", true, ROW_AXIS)).toEqual({ ...FILL, maxWidth: widths.sm });
  });

  it("the hooks read the measure from the props; a step wins over block, and no step is the plain nature", () => {
    expect(renderHook(() => useMeasureStyle({})).result.current).toBeNull();
    expect(renderHook(() => useMeasureStyle({ md: true })).result.current).toEqual(measureStyle("md", false, null));
    expect(renderHook(() => useFillStyle("Input", {})).result.current).toBe(FILL);
    expect(renderHook(() => useFillStyle("Input", { md: true, start: true }), { wrapper: inAxis(CELL_AXIS) }).result.current).toEqual(measureStyle("md", true, CELL_AXIS));
    expect(renderHook(() => useSizing({ block: true, xs: true })).result.current).toEqual(measureStyle("xs", false, null));
    expect(renderHook(() => useSizing({ xs: true }), { wrapper: inAxis(ROW_AXIS) }).result.current).toEqual(measureStyle("xs", false, ROW_AXIS));
    expect(renderHook(() => useSizing({}), { wrapper: inAxis(CELL_AXIS) }).result.current).toBe(HUG_IN_STRETCH_COLUMN);
  });

  it("Container reads the same booleans with the same precedence", () => {
    const { container } = ui(<Container xl sm start testID="c"><View /></Container>);
    const c = at(container, "c");
    expect(c.style.maxWidth).toBe(`${widths.sm}px`);
    expect(c.style.alignSelf).toBe("flex-start");
  });

  it("caps every field's outermost node at the step, centered, and pins it with start", () => {
    const i = ui(<Input sm placeholder="Email" />);
    expectMeasured(i.container.querySelector("input"), "sm", "center");
    cleanup();
    const labeled = ui(<Input lg start label="Email" placeholder="ada@acme.dev" />);
    expectMeasured(measuredAncestor(labeled.container.querySelector("input")), "lg", "flex-start");
    cleanup();
    const t = ui(<Textarea xs start placeholder="Notes" />);
    expectMeasured(measuredAncestor(t.container.querySelector("textarea")), "xs", "flex-start");
    cleanup();
    const s = ui(<Select md label="Region" options={["EU", "US"]} />);
    expectMeasured(s.container.firstElementChild as HTMLElement, "md", "center");
    cleanup();
    const a = ui(<Autocomplete xs start label="City" options={["Paris", "Oslo"]} />);
    expectMeasured(a.container.firstElementChild as HTMLElement, "xs", "flex-start");
    cleanup();
    const l = ui(<Listbox sm start testID="lb" items={[{ label: "Backend" }, { label: "Frontend" }]} />);
    expectMeasured(at(l.container, "lb"), "sm", "flex-start");
    cleanup();
    const p = ui(<Progress xxs start testID="p" value={0.5} />);
    expectMeasured(at(p.container, "p"), "xxs", "flex-start");
    cleanup();
    const sl = ui(<Slider lg testID="s" defaultValue={40} />);
    expectMeasured(at(sl.container, "s"), "lg", "center");
    cleanup();
    const f = ui(<Field sm start testID="f" label="ZIP"><Input placeholder="94103" /></Field>);
    expectMeasured(at(f.container, "f"), "sm", "flex-start");
    // The control inside a measured Field (labeled by delegation) fills the Field, with no cap of its own.
    expectFill(fillAncestor(f.container.querySelector("input")));
    cleanup();
    const fm = ui(<Form md start testID="fm"><Input placeholder="Name" /></Form>);
    expectMeasured(at(fm.container, "fm"), "md", "flex-start");
  });

  it("makes a Button FILL up to the step (its wrapper, the outermost node) and pins it with start", () => {
    const b = ui(<Button md testID="b">Continue</Button>);
    const wrapper = at(b.container, "b").parentElement as HTMLElement;
    expectMeasured(wrapper, "md", "center");
    cleanup();
    const pinned = ui(<Column><Button xs start testID="b">Continue</Button></Column>);
    expectMeasured(at(pinned.container, "b").parentElement as HTMLElement, "xs", "flex-start");
    cleanup();
    // Without a step the button keeps HUG, and block keeps plain FILL.
    const hug = ui(<Column><Button testID="b">Continue</Button></Column>);
    expect((at(hug.container, "b").parentElement as HTMLElement).style.alignSelf).toBe("flex-start");
    expect((at(hug.container, "b").parentElement as HTMLElement).style.maxWidth).toBe("");
    cleanup();
    const block = ui(<Button block testID="b">Continue</Button>);
    expectFill(at(block.container, "b").parentElement as HTMLElement);
  });

  it("stretches a segmented ButtonGroup to the step and flexes its segments like block does", () => {
    const { container } = ui(<ButtonGroup segmented defaultActive={0} items={["Day", "Week", "Month"]} sm start />);
    expectMeasured(container.querySelector('[role="tablist"]') as HTMLElement, "sm", "flex-start");
    for (const tab of Array.from(container.querySelectorAll('[role="tab"]')) as HTMLElement[]) expect(tab.style.flexGrow).toBe("1");
  });

  it("in a Row the cap applies and alignSelf does not: the Row places the box on its own axis", () => {
    const { container } = ui(
      <Row>
        <Input sm start placeholder="Search" />
        <Button lg testID="b">Go</Button>
      </Row>,
    );
    expectMeasured(container.querySelector("input"), "sm", "");
    expectMeasured(at(container, "b").parentElement as HTMLElement, "lg", "");
  });
});
