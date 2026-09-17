import { StyleSheet } from "react-native";
import { Circle } from "react-native-svg";
import { View, Text, Pressable, useTheme, useControllableState, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT } from "../shared/chart-frame.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { ChartValueFlag, announceSelection, pressPoint, DIM_OPACITY } from "../shared/chart-inspect.js";
import { formatCompact } from "../shared/chart-math.js";

// ScatterPlot: numeric x/y point clouds through the shared CartesianFrame
// (niced ticks and gridlines on BOTH axes). A "Shared" platform treatment
// like the rest of the Chart family: one implementation for iOS, Android,
// and the web.

export interface ScatterPoint {
  x: number;
  y: number;
  /** Optional name for this point, used in the accessible data. */
  label?: string;
}

export interface ScatterSeries {
  /** Stable identity for React keys when series can reorder. */
  id?: string | number;
  /** Series name, shown in the legend and leading the accessible data. */
  label: string;
  points: ScatterPoint[];
}

/** A scatter selection addresses one point: series index + point index. */
export interface ScatterSelection {
  series: number;
  point: number;
}

export interface ScatterPlotProps {
  /** The point clouds; colors follow the chart-1..8 tokens in fixed order. */
  series: ScatterSeries[];
  /** Optional heading shown above the plot. */
  title?: string;
  // Tone (single-series only; pick one; default is the primary fill).
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
  hideLegend?: boolean;
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats tick labels and accessible values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Press-to-inspect: the selected point (controlled). Pass null for none. */
  selected?: ScatterSelection | null;
  /** Press-to-inspect: the initially selected point (uncontrolled). */
  defaultSelected?: ScatterSelection;
  /** Fired when a press selects a point (or clears it with null). */
  onSelect?: (selection: ScatterSelection | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

function toneOf(p: ScatterPlotProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

const PLOT_HEIGHT = { default: 180, compact: 120 } as const;

/** Build a ScatterPlot from a platform skin. */
export function createScatterPlot(skin: ChartSkin) {
  return function ScatterPlot(props: ScatterPlotProps) {
    const { series, title, testID, style } = props;
    const theme = useTheme();
    const { tokens } = theme;
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const multi = series.length > 1;
    const tone = toneOf(props);
    const formatValue = props.formatValue ?? formatCompact;

    devWarn(series.length === 0, "[canvas] <ScatterPlot />: `series` is empty; the plot renders with no points.");
    devWarn(
      multi && !!(props.success || props.destructive),
      "[canvas] <ScatterPlot />: tone props apply to single-series plots only; multi-series plots use the chart-1..8 tokens.",
    );
    const pointCount = series.reduce((n, sr) => n + sr.points.length, 0);
    devWarn(
      pointCount > 50,
      `[canvas] <ScatterPlot />: the accessible name carries every point and this plot has ${pointCount}; consider pre-aggregating.`,
    );

    const colorOf = (i: number): string => (multi ? s.seriesFill(tokens, i) : s.barFill(tokens, tone));

    // Position encodes both axes, so neither is forced through zero: domains
    // are the (niced) data extents.
    const finitePoints = series.flatMap((sr) => sr.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
    const xs = finitePoints.map((p) => p.x);
    const ys = finitePoints.map((p) => p.y);
    const xDomain: [number, number] = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
    const yExtent: [number, number] = ys.length ? [Math.min(...ys), Math.max(...ys)] : [0, 1];

    // Press-to-inspect: pressing a point flags its coordinates and dims the
    // rest; announced for assistive tech.
    const [selected, setSelectedRaw] = useControllableState<ScatterSelection | null>(
      props.selected,
      props.defaultSelected ?? null,
      props.onSelect,
    );
    const pointText = (sel: ScatterSelection): string => {
      const p = series[sel.series]?.points[sel.point];
      if (!p) return "";
      return `${p.label ?? series[sel.series].label}: (${formatValue(Number.isFinite(p.x) ? p.x : 0)}, ${formatValue(Number.isFinite(p.y) ? p.y : 0)})`;
    };
    const setSelected = (sel: ScatterSelection | null) => {
      setSelectedRaw(sel);
      if (sel != null) announceSelection(pointText(sel));
    };
    const toggle = (sel: ScatterSelection) =>
      setSelected(selected != null && selected.series === sel.series && selected.point === sel.point ? null : sel);
    const isSelected = (i: number, j: number) => selected != null && selected.series === i && selected.point === j;
    const selectedPoint = selected != null ? series[selected.series]?.points[selected.point] : undefined;

    // The plot's accessible name carries every point, series-prefixed
    // ("Trial A: (1, 2.4), (2, 3.1); Trial B: ...").
    const name = series
      .map(
        (sr) =>
          `${sr.label}: ${sr.points
            .map((p) => `${p.label ? `${p.label} ` : ""}(${formatValue(Number.isFinite(p.x) ? p.x : 0)}, ${formatValue(Number.isFinite(p.y) ? p.y : 0)})`)
            .join(", ")}`,
      )
      .join("; ");

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
            yExtent={yExtent}
            xDomain={xDomain}
            plotHeight={compact ? PLOT_HEIGHT.compact : PLOT_HEIGHT.default}
            compact={compact}
            hideGrid={props.hideGrid}
            hideAxes={props.hideAxes}
            formatValue={formatValue}
            overlay={(layout) => (
              <>
                {/* Nearest-point hit layer: one Pressable over the plot (r=4
                    marks are too small to press; SVG touchables leak responder
                    props to the DOM on web). Empty space clears. */}
                <Pressable
                  accessible={false}
                  onPress={(e) => {
                    const point = pressPoint(e);
                    if (!point) return;
                    const lx = point.x;
                    const ly = point.y;
                    let best: ScatterSelection | null = null;
                    let bestD = 14 * 14;
                    series.forEach((sr, i) =>
                      sr.points.forEach((p, j) => {
                        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
                        const dx = layout.x(p.x) - lx;
                        const dy = layout.y(p.y) - ly;
                        const d = dx * dx + dy * dy;
                        if (d < bestD) {
                          bestD = d;
                          best = { series: i, point: j };
                        }
                      }),
                    );
                    if (best) toggle(best);
                    else setSelected(null);
                  }}
                  style={StyleSheet.absoluteFill}
                />
                {selected && selectedPoint && Number.isFinite(selectedPoint.x) && Number.isFinite(selectedPoint.y) ? (
                  <ChartValueFlag
                    title={selectedPoint.label ?? series[selected.series]?.label}
                    rows={[
                      {
                        color: multi ? colorOf(selected.series) : undefined,
                        value: `(${formatValue(selectedPoint.x)}, ${formatValue(selectedPoint.y)})`,
                      },
                    ]}
                    x={layout.x(selectedPoint.x)}
                    plotW={layout.plotW}
                  />
                ) : null}
              </>
            )}
          >
            {(layout) => (
              <>
                {series.map((sr, i) => {
                  const color = colorOf(i);
                  return sr.points.map((p, j) =>
                    Number.isFinite(p.x) && Number.isFinite(p.y) ? (
                      <Circle
                        key={`${sr.id ?? `s${i}`}p${j}`}
                        cx={layout.x(p.x)}
                        cy={layout.y(p.y)}
                        r={4}
                        fill={color}
                        fillOpacity={selected != null && !isSelected(i, j) ? DIM_OPACITY : 1}
                        // A surface ring keeps overlapping points separable.
                        stroke={tokens.card}
                        strokeWidth={1.5}
                      />
                    ) : null,
                  );
                })}
                {/* Selection ring under the hit layer. */}
                {selectedPoint && Number.isFinite(selectedPoint.x) && Number.isFinite(selectedPoint.y) ? (
                  <Circle
                    cx={layout.x(selectedPoint.x)}
                    cy={layout.y(selectedPoint.y)}
                    r={7}
                    fill="none"
                    stroke={colorOf(selected!.series)}
                    strokeWidth={2}
                  />
                ) : null}
              </>
            )}
          </CartesianFrame>
        </View>

        {multi && !props.hideLegend ? (
          <ChartLegend horizontal items={series.map((sr, i) => ({ label: sr.label, color: colorOf(i) }))} />
        ) : null}
      </View>
    );
  };
}
