import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useState } from "react";
import Svg, { Line, Path } from "react-native-svg";
import { View, Text, alpha, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSeries, type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { estimateTextWidth, formatCompact, niceTicks, polarPoint, polygonPath, seriesAccessibleName } from "../shared/chart-math.js";

// Shared RadarChart shell. A polygonal multi-axis comparison: concentric
// polygon gridlines at nice tick fractions, a spoke per axis, and one closed
// polygon per series (ramp stroke, soft matching wash), with the spoke
// labels as real RN Text just beyond the outer ring (never SVG text). The
// accessible name folds every axis and value; scrub-to-inspect is deferred
// scope, named in the docs.
//
// RadarChart is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop axes (one boolean per choice, first-match precedence per axis):
// - Tone (single-series only; default primary): `success` > `destructive`.
// - Density: `compact`. Furniture: `hideLegend`, `hideGrid` (rings and
//   spokes; the labels always render).

export interface RadarChartProps {
  /** Spoke labels, clockwise from 12 o'clock. */
  axes: string[];
  /** One polygon per series; values aligned to `axes` by index. */
  series: ChartSeries[];
  /** Optional heading shown above the plot. */
  title?: string;
  /** Outer-ring maximum. Defaults to a nice bound above the data max. */
  max?: number;
  // Tone (single-series only; pick one; default primary). Precedence:
  // success > destructive.
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  /** Hide the series legend (multi-series charts show one by default). */
  hideLegend?: boolean;
  /** Hide the rings and spokes (the labels always render). */
  hideGrid?: boolean;
  /** Formats accessible values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence within the axis, first match wins.
function toneOf(p: RadarChartProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

// The graphic's height, ring radius, and the label margin around the rings.
const PLOT = { default: { height: 240, radius: 88 }, compact: { height: 180, radius: 62 } } as const;
const MIN_AXES = 3;
const MAX_SERIES = 4;
const LABEL_W = 84;

export function createRadarChart(skin: ChartSkin) {
  return function RadarChart(props: RadarChartProps) {
    const { axes, series, title, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;
    const plot = compact ? PLOT.compact : PLOT.default;
    const multi = series.length > 1;

    devWarn(series.length === 0, "[canvas] <RadarChart />: `series` is empty; the chart renders with no polygons.");
    devWarn(axes.length > 0 && axes.length < MIN_AXES, `[canvas] <RadarChart />: fewer than ${MIN_AXES} axes cannot form a polygon.`);
    devWarn(
      series.some((sr) => sr.values.length !== axes.length),
      "[canvas] <RadarChart />: a series' `values` length differs from `axes`; missing values are treated as 0.",
    );
    devWarn(series.length > MAX_SERIES, `[canvas] <RadarChart />: more than ${MAX_SERIES} overlapping polygons read poorly.`);
    devWarn(
      multi && !!(props.success || props.destructive),
      "[canvas] <RadarChart />: tone props apply to single-series charts only; set `success`/`destructive` on a SERIES to color it by meaning, else multi-series charts use the chart-1..8 tokens.",
    );

    const finite = (v: number | undefined): number => (Number.isFinite(v) ? (v as number) : 0);
    const dataMax = Math.max(1, ...series.flatMap((sr) => axes.map((_, i) => finite(sr.values[i]))));
    // A nice outer bound so the outer ring reads as a round number.
    const { niceMax, ticks } = niceTicks(0, props.max != null && props.max > 0 ? props.max : dataMax, compact ? 3 : 4);
    const rOf = (v: number): number => Math.max(0, Math.min(1, v / niceMax)) * plot.radius;
    const angleOf = (i: number): number => (i / Math.max(1, axes.length)) * 2 * Math.PI;

    // A series' own tone wins; a single series then takes the chart-level
    // tone, and a multi-series chart falls through to its ramp position.
    const colorOf = (i: number): string => s.seriesColor(tokens, series[i], i, multi ? null : toneOf(props));

    // The accessible name folds every axis and value, series-prefixed.
    const name = series.map((sr) => seriesAccessibleName(sr.label, sr.values, axes, formatValue)).join("; ");

    // The polygons need the measured center (the card is fluid); the labels
    // position from the same coordinates.
    const [width, setWidth] = useState(0);
    const cx = width / 2;
    const cy = plot.height / 2;

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          paneStyle(theme, surfaceShape),
          compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {/* The chart frame is a CONTENT-layer pane under glass (nothing in solid mode). */}
        {glass ? <GlassPane layer="content" shape={surfaceShape} /> : null}
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <View
          accessible
          accessibilityRole="image"
          role="img"
          accessibilityLabel={name}
          aria-label={name}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: plot.height }}
        >
          {width > 0 && axes.length >= MIN_AXES ? (
            <>
              <Svg width={width} height={plot.height} style={{ position: "absolute" }}>
                {/* Concentric polygon rings at each tick fraction, and a
                    spoke per axis. */}
                {!props.hideGrid
                  ? ticks
                      .filter((t) => t > 0)
                      .map((t, ti) => (
                        <Path
                          key={`r${ti}`}
                          d={polygonPath(axes.map((_, i) => polarPoint(cx, cy, rOf(t), angleOf(i))))}
                          fill="none"
                          stroke={tokens.border}
                          strokeWidth={1}
                        />
                      ))
                  : null}
                {!props.hideGrid
                  ? axes.map((_, i) => {
                      const p = polarPoint(cx, cy, plot.radius, angleOf(i));
                      return <Line key={`s${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={tokens.border} strokeWidth={1} />;
                    })
                  : null}
                {/* One closed polygon per series: ramp stroke, soft wash. */}
                {series.map((sr, si) => {
                  const pts = axes.map((_, i) => polarPoint(cx, cy, rOf(finite(sr.values[i])), angleOf(i)));
                  return (
                    <Path
                      key={sr.id ?? si}
                      d={polygonPath(pts)}
                      fill={alpha(colorOf(si), 0.15)}
                      stroke={colorOf(si)}
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  );
                })}
              </Svg>
              {/* Spoke labels: real RN Text just beyond the outer ring,
                  centered on the spoke's direction. */}
              {axes.map((axis, i) => {
                const p = polarPoint(cx, cy, plot.radius + 12, angleOf(i));
                // Shift the label box along the spoke direction so top labels
                // sit above, bottom labels below, and side labels beside.
                const dx = Math.sin(angleOf(i));
                const dy = -Math.cos(angleOf(i));
                const w = Math.min(LABEL_W, Math.ceil(estimateTextWidth(axis, 11)) + 12);
                return (
                  <Text
                    key={i}
                    numberOfLines={1}
                    style={{
                      position: "absolute",
                      left: p.x - w / 2 + dx * (w / 2) * 0.9,
                      top: p.y - 7 + dy * 8,
                      width: w,
                      textAlign: "center",
                      fontSize: 11,
                      lineHeight: 14,
                      color: tokens["muted-foreground"],
                    }}
                  >
                    {axis}
                  </Text>
                );
              })}
            </>
          ) : null}
        </View>
        {/* Identity legend for multiple series, outside the img subtree. */}
        {multi && !props.hideLegend ? (
          <ChartLegend horizontal items={series.map((sr, i) => ({ label: sr.label, color: colorOf(i) }))} />
        ) : null}
      </View>
    );
  };
}
