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
