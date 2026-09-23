import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import {
  AreaChart, BarList, BoxPlot, BulletChart, CandlestickChart, Chart, ComposedChart,
  DepthChart, FunnelChart, Gauge, GeoMap, Heatmap, Histogram, LineChart,
  MetricBreakdown, PieChart, ProgressRing, RadarChart, RadialBarChart,
  RangeAreaChart, ScatterPlot, ServiceHealthList, Sparkline, StackedBar,
  Treemap, UptimeBar, WaterfallChart,
} from "../src/charts/index.ts";
import { ChartValueFlag } from "../src/charts/shared/chart-inspect.tsx";
import * as materialRuntime from "../src/style/glass-surface/material-runtime.ts";
import { WEB_FROST } from "../src/style/glass-surface/web-frost.ts";

// These tests verify material ownership, fallback and state wiring in RNW.
// SVG is stubbed by the harness; screenshots and native runs verify rendered ink.
const restores: Array<() => void> = [];
afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach((restore) => restore());
});

// The browser's one material question: does it render a CSS backdrop filter? The web's
// only material is the frost, so a browser that answers no gets every solid skin.
function browser(frost: boolean) {
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => frost } });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as unknown as Record<string, unknown>).CSS;
  });
}

// A platform that renders Liquid Glass but no frost: iOS 26 with expo-glass-effect and
// without expo-blur. Only there do the two roles render differently: a surface that
// asks for the liquid material keeps it while a static one falls to its solid skin. The
// web never reports liquid (its one material is the frost), so the capability hook is
// stubbed; the shells that choose each role are shared by every skin, so the web host
// shows which surfaces asked for which.
function liquidWithoutFrost() {
  const spy = spyOn(materialRuntime, "useMaterialCapabilities").mockImplementation(
    () => ({ platform: "ios", frost: false, liquid: true, requiresTarget: false }),
  );
  restores.push(() => spy.mockRestore());
}

// The material GlassBox paints behind a surface, found by its wrapper so a clear surface
// (which frosts nothing) counts too, and the frost layer inside one, if it has any.
const materials = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[data-testid="glass-material"]')];
const frostOf = (material: HTMLElement) => material.querySelector<HTMLElement>('[style*="backdrop-filter"]');
const ui = (child: ReactElement, glass: boolean, dark = false) => <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark}>{child}</ThemeProvider>;
const series = [{ label: "Requests", values: [4, 7, 5] }];
const labels = ["Mon", "Tue", "Wed"];
const framed: Record<string, ReactElement<{ testID?: string; plain?: boolean }>> = {
  AreaChart: <AreaChart labels={labels} series={series} />,
  BarList: <BarList items={[{ label: "GET", value: 4 }]} />,
  BoxPlot: <BoxPlot data={[{ label: "GET", values: [1, 2, 3, 4, 5] }]} />,
  BulletChart: <BulletChart data={[{ label: "Requests", value: 4, target: 8, ranges: [5, 10] }]} />,
  CandlestickChart: <CandlestickChart labels={["Mon"]} candles={[{ open: 1, high: 3, low: 0.5, close: 2 }]} />,
  Chart: <Chart data={[{ label: "Mon", value: 4 }]} />,
  ComposedChart: <ComposedChart labels={labels} series={series} />,
  DepthChart: <DepthChart bids={[{ price: 10, size: 5 }]} asks={[{ price: 11, size: 4 }]} />,
  FunnelChart: <FunnelChart stages={[{ label: "Visits", value: 100 }, { label: "Paid", value: 20 }]} />,
  GeoMap: <GeoMap points={[{ label: "London", lat: 51.5, lng: -0.13, count: 40 }]} />,
  Histogram: <Histogram values={[1, 2, 2, 3]} />,
  LineChart: <LineChart labels={labels} series={series} />,
  MetricBreakdown: <MetricBreakdown value="16" label="Requests" spark={[4, 7, 5]} />,
  RadarChart: <RadarChart axes={["A", "B", "C"]} series={series} />,
  RangeAreaChart: <RangeAreaChart labels={["Mon"]} data={[{ low: 1, high: 3, mid: 2 }]} />,
  ScatterPlot: <ScatterPlot series={[{ label: "Load", points: [{ x: 1, y: 2 }] }]} />,
  ServiceHealthList: <ServiceHealthList items={[{ label: "API" }]} />,
  Treemap: <Treemap data={[{ label: "Media", value: 6 }]} />,
  WaterfallChart: <WaterfallChart steps={[{ label: "Start", value: 100, total: true }, { label: "Growth", value: 30 }]} />,
};
const intrinsic: Record<string, ReactElement<{ testID?: string; plain?: boolean }>> = {
  Gauge: <Gauge value={72} label="Uptime" />,
  Heatmap: <Heatmap values={[0.2, 0.8]} />,
  PieChart: <PieChart slices={[{ label: "GET", value: 4 }]} />,
  ProgressRing: <ProgressRing value={72} />,
  RadialBarChart: <RadialBarChart data={[{ label: "GET", value: 4 }]} />,
  Sparkline: <Sparkline values={[4, 7, 5]} />,
  StackedBar: <StackedBar segments={[{ label: "GET", value: 4 }]} />,
  UptimeBar: <UptimeBar periods={[{}, { down: true }]} />,
};

function solidStyle(node: HTMLElement) {
  const style = getComputedStyle(node);
  return [style.backgroundColor, style.borderColor, style.borderWidth, style.boxShadow, style.borderRadius, style.padding];
}

for (const [name, chart] of Object.entries(framed)) {
  it(`${name} uses one stable frame and restores its complete opaque skin`, () => {
    browser(true);
    const child = cloneElement(chart, { testID: "chart" });
    const result = render(ui(child, false));
    const host = screen.getByTestId("chart");
    const before = solidStyle(host);
    const dataNames = () => [...host.querySelectorAll('[role="img"]')].map((node) => node.getAttribute("aria-label"));
    const names = dataNames();
    result.rerender(ui(child, true));
    expect(screen.getByTestId("chart")).toBe(host);
    expect(materials(host)).toHaveLength(1);
    expect(frostOf(materials(host)[0])?.style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
    expect(dataNames()).toEqual(names);
    result.rerender(ui(child, false));
    expect(materials(host)).toHaveLength(0);
    expect(solidStyle(host)).toEqual(before);
    expect(dataNames()).toEqual(names);
  });
}

for (const [name, chart] of Object.entries(intrinsic)) {
  it(`${name} retains its intrinsic unframed anatomy in glass mode`, () => {
    browser(true);
    const result = render(ui(chart, true));
    expect(materials(result.container)).toHaveLength(0);
  });
}

describe("chart capability, accessibility and plain variants", () => {
  it("restores every static frame where Liquid Glass renders but no frost", () => {
    liquidWithoutFrost();
    for (const dark of [false, true]) {
      for (const chart of Object.values(framed)) {
        const child = cloneElement(chart, { testID: "chart" });
        const result = render(ui(child, true, dark));
        const fallback = solidStyle(screen.getByTestId("chart"));
        const fallbackChildren = screen.getByTestId("chart").childElementCount;
        expect(materials(result.container)).toHaveLength(0);
        result.rerender(ui(child, false, dark));
        expect(solidStyle(screen.getByTestId("chart"))).toEqual(fallback);
        expect(screen.getByTestId("chart").childElementCount).toBe(fallbackChildren);
        result.unmount();
      }
    }
  });

  it("preserves unpainted plain compositions without a hidden material pane", () => {
    browser(true);
    for (const chart of [framed.BarList, framed.MetricBreakdown, framed.ServiceHealthList]) {
      const child = cloneElement(chart, { testID: "chart", plain: true });
      const result = render(ui(child, false));
      const before = solidStyle(screen.getByTestId("chart"));
      result.rerender(ui(child, true));
      expect(materials(result.container)).toHaveLength(0);
      expect(solidStyle(screen.getByTestId("chart"))).toEqual(before);
      result.unmount();
    }
  });

  for (const preference of ["prefers-contrast", "prefers-reduced-transparency"]) {
    it(`uses a solid chart and flag under ${preference}`, () => {
      browser(true);
      const media = spyOn(window, "matchMedia").mockImplementation((query) => ({
        matches: query.includes(preference), addEventListener() {}, removeEventListener() {},
      }) as unknown as MediaQueryList);
      restores.push(() => media.mockRestore());
      const result = render(ui(<Chart testID="chart" labels={labels} series={series} defaultSelected={1} />, true));
      expect(materials(result.container)).toHaveLength(0);
      expect(screen.getByTestId("chart").style.backgroundColor).not.toContain("0.00");
      expect(screen.getByText("7")).toBeDefined();
    });
  }
});

it("shares inspection material without changing a flag's positioning or value", () => {
  browser(true);
  const child = <ChartValueFlag title="Tuesday" rows={[{ value: "7" }]} x={50} plotW={300} />;
  const result = render(ui(child, false));
  const host = screen.getByText("Tuesday").parentElement!;
  const placement = [host.style.top, host.style.left, host.style.width];
  result.rerender(ui(child, true));
  expect(screen.getByText("Tuesday").parentElement).toBe(host);
  expect(materials(host)).toHaveLength(1);
  expect([host.style.top, host.style.left, host.style.width]).toEqual(placement);
  expect(screen.getByText("7")).toBeDefined();
  result.rerender(ui(child, false));
  expect(materials(host)).toHaveLength(0);
});

it("keeps Heatmap inspection selection and scrolling in both material directions", () => {
  browser(true);
  const child = <Heatmap testID="heatmap" calendar values={[{ value: 0.8, count: 9, date: "2026-09-16" }]} />;
  const result = render(ui(child, false));
  const root = screen.getByTestId("heatmap");
  const cell = root.querySelector('[style*="height: 11px"][style*="width: 11px"][tabindex]');
  expect(cell).not.toBeNull();
  fireEvent.click(cell!);
  const flag = screen.getByText("9 contributions").parentElement!;
  const placement = [flag.style.top, flag.style.left, flag.style.width];
  const scroll = root.firstElementChild as HTMLElement;
  scroll.scrollLeft = 20;
  for (const glass of [true, false, true]) {
    result.rerender(ui(child, glass));
    expect(screen.getByText("9 contributions").parentElement).toBe(flag);
    expect([flag.style.top, flag.style.left, flag.style.width]).toEqual(placement);
    expect(scroll.scrollLeft).toBe(20);
    expect(materials(root)).toHaveLength(glass ? 1 : 0);
  }
});

it("keeps a selected Chart datum while switching appearance both ways", () => {
  browser(true);
  const child = <Chart testID="chart" labels={labels} series={series} defaultSelected={1} />;
  const result = render(ui(child, false));
  for (const glass of [true, false, true]) {
    result.rerender(ui(child, glass));
    expect(screen.getByText("7")).toBeDefined();
    expect(materials(screen.getByTestId("chart"))).toHaveLength(glass ? 2 : 0);
  }
});

it("places MetricBreakdown latest value outside the plot without an opaque patch", () => {
  browser(true);
  const result = render(ui(<MetricBreakdown value="16" label="Requests" spark={[4, 7, 5]} sparkUnit="req/s" />, true));
  const caption = screen.getByText("5 req/s").parentElement!;
  expect(caption.style.position).not.toBe("absolute");
  expect(caption.style.backgroundColor).toBe("");
  expect(caption.nextElementSibling?.getAttribute("aria-label")).toBe("Requests trend");
  expect(materials(result.container)).toHaveLength(1);
});
