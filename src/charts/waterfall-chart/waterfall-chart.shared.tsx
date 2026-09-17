import { Line, Rect } from "react-native-svg";
import { View, Text, useTheme, useControllableState, palette, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT } from "../shared/chart-frame.js";
import { ChartValueFlag, announceSelection, DIM_OPACITY } from "../shared/chart-inspect.js";
import { PLOT_HEIGHT } from "../shared/cartesian-series.js";
import { formatCompact, waterfallLayout } from "../shared/chart-math.js";

// WaterfallChart: the running-total bridge (a P&L walk, a headcount bridge).
// Each step floats from the running total by its signed value; a `total`
// step snapshots the running total as an absolute bar from zero. The
// coloring is fixed semantics, not a prop: rises green, falls red, totals
// the brand primary, so every bridge reads the same way. Hairline
// connectors link each bar's end to the next bar's start. A "Shared"
// platform treatment - data visualization is platform-neutral - so one
// implementation serves iOS, Android, and the web.
//
// Boolean-prop axes: density (`compact`) and furniture (`hideGrid`,
// `hideAxes`); per-step `total` marks a snapshot bar.

export interface WaterfallStep {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** The step label under the bar. */
  label: string;
  /** Signed change for this step. On a `total` step, a non-zero value
   *  (re)sets the running total to that absolute level instead. */
  value?: number;
  /** Render an absolute bar from zero: the running total so far (omit
   *  `value` or pass 0), or an opening/re-based total (a non-zero `value`). */
  total?: boolean;
}

export interface WaterfallChartProps {
  /** The bridge's steps, in order. */
  steps: WaterfallStep[];
  /** Optional heading shown above the plot. */
  title?: string;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats tick labels, the flag, and the accessible name. */
  formatValue?: (v: number) => string;
  /** Scrub-to-inspect: the selected step index (controlled). Pass null for none. */
  selected?: number | null;
  /** Scrub-to-inspect: the initially selected step (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press/scrub selects a step (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

/** Build a WaterfallChart from a platform skin. */
export function createWaterfallChart(skin: ChartSkin) {
  return function WaterfallChart(props: WaterfallChartProps) {
    const { steps, title, testID, style } = props;
    const theme = useTheme();
    const { tokens } = theme;
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;

    devWarn(steps.length === 0, "[canvas] <WaterfallChart />: `steps` is empty; the chart renders with no bars.");

    const { bars, min, max } = waterfallLayout(steps);
    const labels = steps.map((st) => st.label);

    // Fixed semantic coloring: rises green, falls red, totals primary.
    const barFill = (kind: "rise" | "fall" | "total"): string =>
      kind === "rise" ? palette["green-500"] : kind === "fall" ? palette["red-500"] : tokens.primary;

    // The accessible name walks the bridge: signed steps and running totals.
    const phrase = (i: number): string => {
      const st = steps[i];
      const bar = bars[i];
      if (bar.kind === "total") return `${st.label} total ${formatValue(bar.end)}`;
      const v = st.value != null && Number.isFinite(st.value) ? st.value : 0;
      return `${st.label} ${v < 0 ? "down" : "up"} ${formatValue(Math.abs(v))} to ${formatValue(bar.end)}`;
    };
    const name = steps.length > 0 ? `${title ?? "Bridge"}: ${steps.map((_, i) => phrase(i)).join(", ")}` : `${title ?? "Bridge"}: no steps`;

    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null && bars[i] != null) announceSelection(phrase(i));
    };

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          s.surface(tokens, skin.surfaceRadius, glass),
          compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {/* The chart frame is a CONTENT-layer pane under glass (nothing in solid mode). */}
        <GlassPane layer="content" shape={{ borderRadius: skin.surfaceRadius }} />
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <View accessible accessibilityRole="image" role="img" accessibilityLabel={name} aria-label={name}>
          <CartesianFrame
            yExtent={[min, max]}
            xLabels={labels}
            plotHeight={compact ? PLOT_HEIGHT.compact : PLOT_HEIGHT.default}
            compact={compact}
            hideGrid={props.hideGrid}
            hideAxes={props.hideAxes}
            formatValue={formatValue}
            selectedBand={selected}
            onBandScrub={setSelected}
            overlay={(layout) =>
              selected != null && layout.band && bars[selected] != null ? (
                <ChartValueFlag
                  title={labels[selected]}
                  rows={
                    bars[selected].kind === "total"
                      ? [{ label: "Total", value: formatValue(bars[selected].end) }]
                      : [
                          { label: "Change", value: formatValue(steps[selected].value != null && Number.isFinite(steps[selected].value) ? (steps[selected].value as number) : 0) },
                          { label: "Running", value: formatValue(bars[selected].end) },
                        ]
                  }
                  x={layout.band.center(selected)}
                  plotW={layout.plotW}
                />
              ) : null
            }
          >
            {(layout) => {
              const band = layout.band;
              if (!band) return null;
              const barW = Math.max(4, band.bandWidth * 0.6);
              return (
                <>
                  {bars.map((bar, i) => {
                    const x = band.center(i) - barW / 2;
                    const yTop = layout.y(Math.max(bar.start, bar.end));
                    const yBot = layout.y(Math.min(bar.start, bar.end));
                    const dim = selected != null && selected !== i ? DIM_OPACITY : 1;
                    return (
                      <Rect
                        key={steps[i].id ?? i}
                        x={x}
                        y={yTop}
                        width={barW}
                        height={Math.max(1, yBot - yTop)}
                        rx={Math.min(skin.barRadius / 2, barW / 4)}
                        fill={barFill(bar.kind)}
                        opacity={dim}
                      />
                    );
                  })}
                  {/* Hairline connectors from each bar's end to the next start. */}
                  {bars.map((bar, i) => {
                    if (i === bars.length - 1) return null;
                    const next = bars[i + 1];
                    const yEnd = layout.y(bar.end);
                    const from = next.kind === "total" ? yEnd : layout.y(next.start);
                    return (
                      <Line
                        key={`c${i}`}
                        x1={band.center(i) + barW / 2}
                        y1={yEnd}
                        x2={band.center(i + 1) - barW / 2}
                        y2={from}
                        stroke={tokens.border}
                        strokeWidth={1}
                      />
                    );
                  })}
                </>
              );
            }}
          </CartesianFrame>
        </View>
      </View>
    );
  };
}
