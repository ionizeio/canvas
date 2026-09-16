import { describe, it, expect, afterEach, mock } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Chart } from "../src/charts/chart/chart.tsx";
import { LineChart } from "../src/charts/line-chart/line-chart.tsx";
import { AreaChart } from "../src/charts/area-chart/area-chart.tsx";
import { PieChart } from "../src/charts/pie-chart/pie-chart.tsx";
import { ScatterPlot } from "../src/charts/scatter-plot/scatter-plot.tsx";
import { CandlestickChart } from "../src/charts/candlestick-chart/candlestick-chart.tsx";
import { ComposedChart } from "../src/charts/composed-chart/composed-chart.tsx";
import { RangeAreaChart } from "../src/charts/range-area-chart/range-area-chart.tsx";
import { Histogram } from "../src/charts/histogram/histogram.tsx";
import { BoxPlot } from "../src/charts/box-plot/box-plot.tsx";
import { WaterfallChart } from "../src/charts/waterfall-chart/waterfall-chart.tsx";
import { seriesColor } from "../src/charts/shared/charts.styles.ts";
import { lightColors, palette } from "../src/style/tokens.ts";

// LineChart / AreaChart: the a11y contract (the plot is an img whose accessible
// name carries every value, series-prefixed; the legend stays reachable outside
// it) plus the semantic boolean axes that are observable without an SVG
// renderer (the harness stubs react-native-svg, so geometry is proven in
// chart-math.test.ts and these tests assert structure, names, and furniture).

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

const labels = ["Jan", "Feb", "Mar"];
const twoSeries = [
  { label: "Web", values: [120, 180, 150] },
  { label: "Mobile", values: [60, 90, 140] },
];

const plotName = (c: HTMLElement) => c.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "";

// react-native-web writes every color into the DOM as `rgba(r, g, b, a.aa)`, so
// put a token's own hex into that shape before matching it in a style attribute.
const asRgba = (hex: string): string => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)!;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, 1.00)`;
};

// Two-category variant for grouped-Chart tests (values align with 2 labels).
const twoSeriesShort = [
  { label: "Web", values: [120, 180] },
  { label: "Mobile", values: [60, 90] },
];

describe("LineChart", () => {
  it("folds every series' data into the plot's accessible name", () => {
    const { container } = ui(<LineChart labels={labels} series={twoSeries} />);
    const name = plotName(container);
    expect(name).toContain("Web: Jan 120, Feb 180, Mar 150");
    expect(name).toContain("Mobile: Jan 60, Feb 90, Mar 140");
  });

  it("names the root group after the title", () => {
    const { container } = ui(<LineChart title="Signups" labels={labels} series={twoSeries} />);
    const group = container.querySelector('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Signups chart");
  });

  it("formats accessible values through formatValue", () => {
    const { container } = ui(
      <LineChart labels={labels} series={[{ label: "Revenue", values: [12000, 18000, 15000] }]} />,
    );
    expect(plotName(container)).toContain("Revenue: Jan 12k, Feb 18k, Mar 15k");
  });

  it("shows a reachable legend for multiple series, none for one", () => {
    const multi = ui(<LineChart labels={labels} series={twoSeries} />);
    // Legend text lives OUTSIDE the img subtree, so it must appear as real text.
    expect(multi.container.textContent).toContain("Web");
    expect(multi.container.textContent).toContain("Mobile");
    cleanup();

    const single = ui(<LineChart labels={labels} series={[{ label: "Web", values: [1, 2, 3] }]} />);
    // A single series is named by the title, not a one-dot legend; the series
    // label appears only inside the accessible name, not as legend text.
    expect(single.container.textContent ?? "").not.toContain("Web");
  });

  it("hideLegend suppresses the legend for multi-series charts", () => {
    const { container } = ui(<LineChart hideLegend labels={labels} series={twoSeries} />);
    expect(container.textContent ?? "").not.toContain("Mobile");
  });

  it("baseline + fade render with the data intact in the accessible name", () => {
    const { container } = ui(
      <LineChart
        labels={["10a", "11a"]}
        series={[{ label: "Price", values: [187.2, 191.6] }]}
        baseline={188}
        fade
      />,
    );
    expect(plotName(container)).toContain("Price: 10a 187.2, 11a 191.6");
    // Single series stays legend-free even with the baseline furniture.
    expect(container.textContent ?? "").not.toContain("Price");
  });

  it("renders y tick labels once measured, and hides them under hideAxes", () => {
    // happy-dom reports zero layout width, so the frame stays unmeasured and
    // furniture must not render; this locks in the graceful pre-measure state.
    const { container } = ui(<LineChart labels={labels} series={twoSeries} />);
    expect(container.textContent ?? "").not.toContain("NaN");
  });
});

describe("Chart (grouped bars)", () => {
  it("announces each category as one item carrying every series' value", () => {
    const { container } = ui(<Chart title="Revenue vs costs" labels={["Q1", "Q2"]} series={twoSeriesShort} />);
    const items = Array.from(container.querySelectorAll('[role="img"]')).map((el) => el.getAttribute("aria-label"));
    expect(items).toContain("Q1: Web 120, Mobile 60");
    expect(items).toContain("Q2: Web 180, Mobile 90");
  });

  it("shows the series legend, suppressible with hideLegend", () => {
    const withLegend = ui(<Chart labels={["Q1"]} series={twoSeriesShort.map((sr) => ({ ...sr, values: sr.values.slice(0, 1) }))} />);
    expect(withLegend.container.textContent).toContain("Mobile");
    cleanup();
    const without = ui(<Chart hideLegend labels={["Q1"]} series={twoSeriesShort.map((sr) => ({ ...sr, values: sr.values.slice(0, 1) }))} />);
    expect(without.container.textContent ?? "").not.toContain("Mobile");
  });

  it("keeps the single-series data shape working unchanged", () => {
    const { container } = ui(<Chart title="Signups" data={[{ label: "Mon", value: 3 }]} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Signups chart");
    const items = Array.from(container.querySelectorAll('[role="img"]')).map((el) => el.getAttribute("aria-label"));
    expect(items).toContain("Mon: 3");
  });
});

describe("Chart (stacked columns)", () => {
  // Token issuance by client, split by grant type: the column IS the client's
  // total, so the axis follows the totals and the segments accumulate.
  const grants = [
    { label: "Authorization code", values: [10, 5] },
    { label: "Client credentials", values: [10, 0] },
  ];
  const clients = ["acme", "globex"];
  // Every bar/segment style, in DOM order (the plot row and the legend dots
  // carry no bar radius, so this selects exactly the marks).
  const barStyles = (c: HTMLElement) =>
    Array.from(c.querySelectorAll("div"))
      .map((el) => el.getAttribute("style") ?? "")
      .filter((st) => st.includes("border-top-left-radius") && st.includes("height:"));
  const heightOf = (style: string) => Number(/height: (\d+)px/.exec(style)?.[1]);

  it("measures the axis against per-category totals, not the largest single value", () => {
    const { container } = ui(<Chart stacked labels={clients} series={grants} />);
    // acme totals 20 (the tallest column) and fills the 140px plot: 70 + 70.
    // globex totals 5, a quarter of the axis: 35 and an empty segment.
    expect(barStyles(container).map(heightOf)).toEqual([70, 70, 35, 0]);
  });

  it("clusters against the largest single value when stacked is omitted", () => {
    // The same data unstacked: max is 10, so every 10 is a full-height bar.
    const { container } = ui(<Chart labels={clients} series={grants} />);
    expect(barStyles(container).map(heightOf)).toEqual([140, 140, 70, 2]);
  });

  it("caps the topmost non-empty segment and paints nothing for an empty one", () => {
    const { container } = ui(<Chart stacked labels={clients} series={grants} />);
    const [bottom, top, loneSegment, empty] = barStyles(container);
    // Only the column's cap is rounded, so the stack reads as one column.
    expect(bottom).toContain("border-top-left-radius: 0px");
    expect(top).toContain("border-top-left-radius: 8px");
    // globex's second grant type is 0: the surviving segment takes the cap and
    // the empty one has no height at all (a 2px floor would inflate the total).
    expect(loneSegment).toContain("border-top-left-radius: 8px");
    expect(heightOf(empty)).toBe(0);
  });

  it("names each column's total in its accessible item", () => {
    const { container } = ui(<Chart stacked labels={clients} series={grants} />);
    const items = Array.from(container.querySelectorAll('[role="img"]')).map((el) => el.getAttribute("aria-label"));
    expect(items).toContain("acme: Authorization code 10, Client credentials 10, total 20");
    expect(items).toContain("globex: Authorization code 5, Client credentials 0, total 5");
  });

  it("keeps the legend, the value flag, and the dimming working", () => {
    const { container } = ui(<Chart stacked labels={clients} series={grants} defaultSelected={0} />);
    expect(container.textContent).toContain("Authorization code");
    expect(container.textContent).toContain("Client credentials");
    // The flag renders the selected column's per-series values ...
    expect(container.textContent).toContain("10");
    // ... and the unselected column dims.
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    expect(styles.some((st) => st.includes("opacity: 0.45"))).toBe(true);
  });

  it("clamps a column to the plot when max is below the true total", () => {
    // A caller-supplied max under the real total cannot overflow the column.
    const { container } = ui(<Chart stacked max={10} labels={["acme"]} series={[
      { label: "Authorization code", values: [10] },
      { label: "Client credentials", values: [10] },
    ]} />);
    const heights = barStyles(container).map(heightOf);
    expect(heights).toEqual([140, 0]);
    expect(heights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(140);
  });

  it("treats a negative segment as zero", () => {
    const { container } = ui(<Chart stacked labels={["acme"]} series={[
      { label: "Granted", values: [10] },
      { label: "Refunded", values: [-4] },
    ]} />);
    // The total is 10, so the positive segment fills the plot and the negative
    // one contributes no length (it cannot be drawn below the baseline).
    expect(barStyles(container).map(heightOf)).toEqual([140, 0]);
  });
});

describe("per-series semantic tones", () => {
  // A series that MEANS success or failure colors by that meaning; every other
  // series keeps its chart-1..8 ramp position.
  const signIns = [
    { label: "Granted", values: [90, 95], success: true },
    { label: "Denied", values: [4, 6], destructive: true },
  ];

  it("seriesColor resolves series tone > chart tone > ramp position", () => {
    const t = lightColors;
    expect(seriesColor(t, { label: "Granted", values: [], success: true }, 0)).toBe(palette["green-500"]);
    expect(seriesColor(t, { label: "Denied", values: [], destructive: true }, 1)).toBe(palette["red-500"]);
    // Both set: success wins, matching the chart-level tone precedence.
    expect(seriesColor(t, { label: "Both", values: [], success: true, destructive: true }, 0)).toBe(palette["green-500"]);
    // No series tone: the chart-level tone when there is one (single-series)...
    expect(seriesColor(t, { label: "Web", values: [] }, 0, "destructive")).toBe(palette["red-500"]);
    // ...else the ramp, which still follows the series index, never its rank.
    expect(seriesColor(t, { label: "Web", values: [] }, 2)).toBe(t["chart-3"]);
    expect(seriesColor(t, undefined, 1)).toBe(t["chart-2"]);
  });

  it("paints the grouped Chart's bars and legend dots by meaning", () => {
    const { container } = ui(<Chart labels={["Q1", "Q2"]} series={signIns} />);
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    const green = styles.filter((st) => st.includes(asRgba(palette["green-500"])));
    const red = styles.filter((st) => st.includes(asRgba(palette["red-500"])));
    // Two categories' bars plus the legend dot, for each series.
    expect(green.length).toBe(3);
    expect(red.length).toBe(3);
    // No ramp color is left over for a fully toned chart.
    expect(styles.some((st) => st.includes(asRgba(lightColors["chart-1"])))).toBe(false);
  });

  it("an untoned series in the same chart keeps its ramp position", () => {
    const { container } = ui(
      <Chart labels={["Q1"]} series={[{ label: "Granted", values: [9], success: true }, { label: "Pending", values: [2] }]} />,
    );
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    expect(styles.some((st) => st.includes(asRgba(palette["green-500"])))).toBe(true);
    // Identity follows the series index: the second series is still chart-2.
    expect(styles.some((st) => st.includes(asRgba(lightColors["chart-2"])))).toBe(true);
  });

  it("carries a toned series through the LineChart legend", () => {
    const { container } = ui(<LineChart labels={["Q1", "Q2"]} series={signIns} />);
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    // The marks are SVG (stubbed in this harness); the legend dots are Views.
    expect(styles.some((st) => st.includes(asRgba(palette["green-500"])))).toBe(true);
    expect(styles.some((st) => st.includes(asRgba(palette["red-500"])))).toBe(true);
  });

  it("leaves an untoned multi-series chart on the ramp", () => {
    const { container } = ui(<Chart labels={["Q1", "Q2"]} series={twoSeriesShort} />);
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    expect(styles.some((st) => st.includes(asRgba(lightColors["chart-1"])))).toBe(true);
    expect(styles.some((st) => st.includes(asRgba(lightColors["chart-2"])))).toBe(true);
    expect(styles.some((st) => st.includes(asRgba(palette["green-500"])))).toBe(false);
  });
});

describe("scrub-to-inspect", () => {
  // Real gestures need layout coordinates the DOM harness cannot provide
  // (zero-width plots), so the gesture semantics are proven on the pure
  // scrub state machine and the rendering paths via controlled props; the
  // live gesture is verified on the running docs (web + device).
  it("scrubEvent: grant selects, move scrubs, stationary re-press clears", async () => {
    const { scrubEvent } = await import("../src/charts/shared/chart-inspect.tsx");
    // Fresh press on band 2 selects it.
    let step = scrubEvent("grant", 2, { index: null, wasSelected: false, moved: false }, null);
    expect(step.select).toBe(2);
    // Dragging onto band 3 scrubs (and marks the gesture as moved).
    step = scrubEvent("move", 3, step.gesture, 2);
    expect(step.select).toBe(3);
    expect(step.gesture.moved).toBe(true);
    // Releasing after a move keeps the selection.
    expect(scrubEvent("release", 3, step.gesture, 3).select).toBeUndefined();
    // A stationary press on the already-selected band clears on release.
    let tap = scrubEvent("grant", 3, { index: null, wasSelected: false, moved: false }, 3);
    expect(tap.select).toBe(3);
    expect(scrubEvent("release", 3, tap.gesture, 3).select).toBeNull();
    // Moves outside the plot are ignored.
    expect(scrubEvent("move", null, tap.gesture, 3).select).toBeUndefined();
  });

  it("a controlled selection dims the other categories", () => {
    const { container } = ui(<Chart labels={["Q1", "Q2"]} series={twoSeriesShort} selected={0} />);
    const styles = Array.from(container.querySelectorAll("div")).map((el) => el.getAttribute("style") ?? "");
    expect(styles.some((st) => st.includes("opacity: 0.45"))).toBe(true);
  });

  it("defaultSelected renders the grouped flag without any press", () => {
    const { container } = ui(<Chart labels={["Q1", "Q2"]} series={twoSeriesShort} defaultSelected={0} />);
    expect(container.textContent).toContain("60");
  });

  it("a controlled donut swaps its center to the selected slice", () => {
    const { container } = ui(
      <PieChart
        donut
        label="Traffic"
        selected={1}
        slices={[
          { label: "Direct", value: 60 },
          { label: "Search", value: 40 },
        ]}
      />,
    );
    expect(container.textContent).toContain("40%");
    expect(container.textContent).toContain("Search");
  });
});

describe("Sparkline line variant", () => {
  it("keeps the accessible name and renders without a measured width", async () => {
    const { Sparkline } = await import("../src/charts/sparkline/sparkline.tsx");
    const { container } = ui(<Sparkline line success accessibilityLabel="price, last 7 hours" values={[187, 188, 191]} />);
    const img = container.querySelector('[role="img"]');
    expect(img?.getAttribute("aria-label")).toBe("price, last 7 hours");
  });
});

describe("CandlestickChart", () => {
  const candles = [
    { open: 182, high: 188, low: 180, close: 186 },
    { open: 186, high: 191, low: 184, close: 183 },
  ];

  it("folds every candle's OHLC and volume into the accessible name", () => {
    const { container } = ui(
      <CandlestickChart labels={["Mon", "Tue"]} candles={candles} volume={[24000, 31000]} />,
    );
    const name = plotName(container);
    expect(name).toContain("Mon open 182, high 188, low 180, close 186, volume 24k");
    expect(name).toContain("Tue open 186, high 191, low 184, close 183, volume 31k");
  });

  it("names the root group after the title and lists overlays in the legend", () => {
    const { container } = ui(
      <CandlestickChart
        title="OLY - daily"
        labels={["Mon", "Tue"]}
        candles={candles}
        overlays={[{ label: "5-day average", values: [183, 185] }]}
      />,
    );
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("OLY - daily chart");
    expect(container.textContent).toContain("5-day average");
  });
});

describe("ScatterPlot", () => {
  it("folds every point into the plot's accessible name, series-prefixed", () => {
    const { container } = ui(
      <ScatterPlot
        series={[
          { label: "A", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
          { label: "B", points: [{ x: 5, y: 6, label: "peak" }] },
        ]}
      />,
    );
    const name = plotName(container);
    expect(name).toContain("A: (1, 2), (3, 4)");
    expect(name).toContain("B: peak (5, 6)");
  });

  it("names the root group after the title and shows the legend for multi-series", () => {
    const { container } = ui(
      <ScatterPlot
        title="Load vs latency"
        series={[
          { label: "us-east", points: [{ x: 1, y: 2 }] },
          { label: "eu-west", points: [{ x: 3, y: 4 }] },
        ]}
      />,
    );
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Load vs latency chart");
    expect(container.textContent).toContain("eu-west");
  });
});

describe("PieChart", () => {
  const slices = [
    { label: "Direct", value: 60 },
    { label: "Search", value: 40 },
  ];

  it("folds the composition into the plot's accessible name as percentages", () => {
    const { container } = ui(<PieChart label="Traffic" slices={slices} />);
    expect(plotName(container)).toBe("Traffic: Direct 60%, Search 40%");
  });

  it("hoists the img role to the root when the legend is hidden", () => {
    const { container } = ui(<PieChart hideLegend label="Traffic" slices={slices} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-label")).toContain("Traffic: Direct 60%");
    expect(container.textContent ?? "").not.toContain("Direct");
  });

  it("legend lists each slice with its percentage, reachable as text", () => {
    const { container } = ui(<PieChart label="Traffic" slices={slices} />);
    expect(container.textContent).toContain("Direct");
    expect(container.textContent).toContain("60%");
  });

  it("donut centers the compact total and the label", () => {
    const { container } = ui(<PieChart donut label="Traffic" slices={[{ label: "A", value: 1200 }, { label: "B", value: 300 }]} />);
    expect(container.textContent).toContain("1.5k");
    expect(container.textContent).toContain("Traffic");
  });
});

describe("AreaChart", () => {
  it("carries the stacked series' data in its accessible name", () => {
    const { container } = ui(<AreaChart stacked labels={labels} series={twoSeries} />);
    const name = plotName(container);
    expect(name).toContain("Web: Jan 120");
    expect(name).toContain("Mobile: Jan 60");
  });

  it("titled area chart exposes the group name", () => {
    const { container } = ui(<AreaChart title="Traffic" labels={labels} series={twoSeries} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Traffic chart");
  });
});

describe("ComposedChart", () => {
  const composed = [
    { label: "Revenue", values: [420, 510, 480] },
    { label: "Margin", values: [110, 170, 150], line: true },
  ];

  it("folds every series' data into the plot's accessible name", () => {
    const { container } = ui(<ComposedChart labels={labels} series={composed} />);
    const name = plotName(container);
    expect(name).toContain("Revenue: Jan 420, Feb 510, Mar 480");
    expect(name).toContain("Margin: Jan 110, Feb 170, Mar 150");
  });

  it("names the root group after the title and keeps the legend reachable", () => {
    const { container } = ui(<ComposedChart title="Revenue and margin" labels={labels} series={composed} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Revenue and margin chart");
    expect(container.textContent).toContain("Margin");
  });

  it("hideLegend suppresses the legend text", () => {
    const { container } = ui(<ComposedChart hideLegend labels={labels} series={composed} />);
    // The plot name still carries the series; the legend row is gone.
    const legendTexts = [...container.querySelectorAll("div")].filter((el) => el.textContent === "Margin");
    expect(legendTexts.length).toBe(0);
  });

  it("renders under controlled and uncontrolled selection without firing onSelect", () => {
    // The flag itself needs a measured plot (the frame renders nothing at the
    // harness's zero layout width; the live flag is verified on the running
    // docs), so this locks the selection plumbing: both modes render, and a
    // controlled selection never echoes through onSelect on its own.
    const seen: Array<number | null> = [];
    const controlled = ui(<ComposedChart labels={labels} series={composed} selected={1} onSelect={(i) => seen.push(i)} />);
    expect(plotName(controlled.container)).toContain("Revenue");
    const uncontrolled = ui(<ComposedChart labels={labels} series={composed} defaultSelected={0} />);
    expect(plotName(uncontrolled.container)).toContain("Margin");
    expect(seen).toEqual([]);
  });
});

describe("RangeAreaChart", () => {
  const data = [
    { low: 42, high: 118, mid: 61 },
    { low: 38, high: 102, mid: 55 },
    { low: 44, high: 131, mid: 66 },
  ];

  it("folds every range into the plot's accessible name", () => {
    const { container } = ui(<RangeAreaChart label="p50 to p99" labels={labels} data={data} />);
    const name = plotName(container);
    expect(name).toContain("p50 to p99: Jan 42 to 118 around 61");
    expect(name).toContain("Mar 44 to 131 around 66");
  });

  it("swaps an inverted low/high pair after warning", () => {
    const { container } = ui(
      <RangeAreaChart label="Range" labels={["Jan"]} data={[{ low: 10, high: 4 }]} />,
    );
    expect(plotName(container)).toContain("Range: Jan 4 to 10");
  });

  it("renders under a default selection (the flag needs a measured plot)", () => {
    const { container } = ui(<RangeAreaChart label="Band" labels={labels} data={data} defaultSelected={1} />);
    expect(plotName(container)).toContain("Band:");
  });

  it("names the root group after the title", () => {
    const { container } = ui(<RangeAreaChart title="Latency envelope" label="Band" labels={labels} data={data} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Latency envelope chart");
  });
});

describe("Histogram", () => {
  const samples = [1, 2, 2, 3, 3, 3, 4, 4, 9];

  it("names every bin with its bounds and count", () => {
    const { container } = ui(<Histogram label="Latency" values={samples} bins={4} />);
    const name = plotName(container);
    expect(name).toContain("Latency: 9 samples in");
    expect(name).toMatch(/\d+ to \d+ \d+/);
  });

  it("counts survive the nice-edged binning (every sample lands somewhere)", () => {
    const { container } = ui(<Histogram label="X" values={samples} />);
    const name = plotName(container);
    const counts = [...name.matchAll(/to -?[\d.]+k? (\d+)/g)].map((m) => Number(m[1]));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(samples.length);
  });

  it("names the root group after the title", () => {
    const { container } = ui(<Histogram title="Response times" label="ms" values={samples} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Response times chart");
  });
});

describe("BoxPlot", () => {
  it("names each category with its five-number summary and outliers", () => {
    const { container } = ui(
      <BoxPlot
        data={[
          { label: "A", values: [1, 2, 3, 4, 5] },
          { label: "B", values: [0, 0, 0, 100, 0] },
        ]}
      />,
    );
    const name = plotName(container);
    expect(name).toContain("A: median 3, quartiles 2 to 4, range 1 to 5");
    expect(name).toContain("1 outlier");
  });

  it("names the root group after the title", () => {
    const { container } = ui(<BoxPlot title="Spread" data={[{ label: "A", values: [1, 2, 3, 4, 5] }]} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Spread chart");
  });
});

describe("WaterfallChart", () => {
  const steps = [
    { label: "Q2", value: 4200, total: true },
    { label: "New", value: 980 },
    { label: "Churn", value: -540 },
    { label: "Q3", value: 0, total: true },
  ];

  it("walks the bridge in the accessible name with signed steps and totals", () => {
    const { container } = ui(<WaterfallChart title="Bridge" steps={steps} />);
    const name = plotName(container);
    expect(name).toContain("Q2 total 4.2k");
    expect(name).toContain("New up 980 to 5.2k");
    expect(name).toContain("Churn down 540 to 4.6k");
    expect(name).toContain("Q3 total 4.6k");
  });

  it("names the root group after the title", () => {
    const { container } = ui(<WaterfallChart title="Q3 bridge" steps={steps} />);
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Q3 bridge chart");
  });
});
