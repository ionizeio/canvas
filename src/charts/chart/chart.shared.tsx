import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { View, Text, useControllableState, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { ChartValueFlag, ScrubSurface, announceSelection, DIM_OPACITY } from "../shared/chart-inspect.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { type ChartSeries, type ChartSkin } from "../shared/types.js";

// Shared Chart shell. The structure (a token-themed bar chart built entirely from
// View views, no SVG and no CSS grid), the boolean-prop axes (tone + orientation +
// density), the value-to-pixel math, the data-shape types, and the token-backed fill
// logic all live here once; a platform file supplies only its skin (the surface and
// bar corner radii) and calls createChart.
//
// Chart: each datum is a vertical (or horizontal) bar whose length is a pixel height
// computed in JS from its value against the axis max. A label sits under (or beside)
// each bar.
//
// This is Canvas's faithful, SVG-free take on the docs "charts" organism: the other
// chart types in that entry (sparkline, gauge, heatmap, stacked) lean on SVG and grid,
// so they are approximated by the bar chart here.
//
// Chart is a "Shared" platform treatment: data visualization is platform-neutral. The
// iOS HIG Charts page (Swift Charts) and the shadcn web chart are the same plotted-bar
// idiom, and Material 3 ships no charts component at all, so there is no native shape to
// diverge on. The skin therefore carries the same values on iOS, Android, and web; the
// per-OS files exist only so the architecture is uniform across the kit.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match precedence
// within an axis (mirrors Button's intentOf). Axes:
//
// - Tone (pick one; default is the primary fill): `success` paints bars green,
//   `destructive` paints them red. Precedence: success > destructive > default.
// - Orientation: `horizontal` lays bars out as sideways rows; omit for the
//   default vertical column chart.
// - Arrangement (grouped mode): `stacked` accumulates the series within one
//   column per category (composition), measured against the per-category
//   totals; omit for side-by-side clusters (comparison).
// - Density: `compact` shrinks the plot area and tightens the gaps; omit for
//   the default density.

export interface ChartDatum {
  /**
   * Stable identity for this datum, used as the React key when present. Supply
   * it when the data can reorder or when labels are not unique; otherwise the
   * array index is used.
   */
  id?: string | number;
  /** Bucket label shown under (vertical) or beside (horizontal) the bar. */
  label: string;
  /** The bar's magnitude. Compared against `max` to size the bar. */
  value: number;
}

export interface ChartProps {
  /** The bars to render, in order (single-series mode). */
  data?: ChartDatum[];
  /** Category labels along the x axis (grouped mode, with `series`). */
  labels?: string[];
  /** Multiple series rendered as grouped columns per category, colored by the chart-1..8 tokens (or a series' own `success`/`destructive` tone). */
  series?: ChartSeries[];
  /** Stack the grouped series within one column per category (composition) instead of clustering them side by side. */
  stacked?: boolean;
  /** Optional heading shown above the plot. */
  title?: string;
  /** Axis maximum. Defaults to the largest value in the data (the largest category TOTAL when `stacked`). */
  max?: number;
  // Tone (pick one; default is the primary fill). Single-series only.
  success?: boolean;
  destructive?: boolean;
  // Orientation (default is a vertical column chart). Single-series only.
  horizontal?: boolean;
  // Density (default is the standard plot size).
  compact?: boolean;
  /** Hide the series legend (grouped mode shows one by default). */
  hideLegend?: boolean;
  /** Press-to-inspect: the selected category index (controlled). Pass null for none. Vertical charts only. */
  selected?: number | null;
  /** Press-to-inspect: the initially selected category (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press selects a category (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence when more than one is passed: first match wins.
function toneOf(p: ChartProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

// Plot length in px (bar travel: chart height for vertical, bar width for
// horizontal), by density.
const PLOT_LENGTH = { default: 140, compact: 96 } as const;
// The standard chart width when the caller leaves the chart unsized. Without
// it, a content-sized parent (native Fabric especially) collapses the flex
// columns to their intrinsic minimum: pencil bars and letter-wrapped labels.

export function createChart(skin: ChartSkin) {
  return function Chart(props: ChartProps) {
    const { title, testID, style } = props;
    const tone = toneOf(props);
    const compact = !!props.compact;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);

    // Grouped mode: `labels` + `series` render clustered columns per category.
    // Single-series mode: the original `data` shape. Exactly one applies.
    const grouped = props.series != null && props.series.length > 0;
    const series = props.series ?? [];
    const labels = props.labels ?? [];
    const data = props.data ?? [];
    const horizontal = !!props.horizontal && !grouped;
    // Stacking is an arrangement of GROUPED series (a column is the category's
    // composition); single-series data has nothing to accumulate.
    const stacked = !!props.stacked && grouped;

    devWarn(
      props.data != null && props.series != null,
      "[canvas] <Chart />: pass either `data` (single series) or `labels`+`series` (grouped), not both; `series` wins.",
    );
    devWarn(
      props.data == null && props.series == null,
      "[canvas] <Chart />: pass `data` (single series) or `labels`+`series` (grouped); the chart renders with no bars.",
    );
    // Empty data renders a bare surface with no bars: warn so the developer sees
    // the omission instead of a silently blank chart.
    devWarn(props.data != null && data.length === 0, "[canvas] <Chart />: `data` is empty; the chart renders with no bars.");
    devWarn(grouped && labels.length === 0, "[canvas] <Chart />: `series` needs `labels` for the category axis; the chart renders with no columns.");
    devWarn(
      grouped && series.some((sr) => sr.values.length !== labels.length),
      "[canvas] <Chart />: a series' `values` length differs from `labels`; missing values are treated as 0.",
    );
    devWarn(
      grouped && !!props.horizontal,
      "[canvas] <Chart />: `horizontal` applies to single-series charts only; grouped series render vertical columns.",
    );
    devWarn(
      !!props.stacked && !grouped,
      "[canvas] <Chart />: `stacked` applies to grouped charts (`labels`+`series`) only; a single `data` series has nothing to accumulate.",
    );
    devWarn(
      grouped && !!(props.success || props.destructive),
      "[canvas] <Chart />: tone props apply to single-series charts only; set `success`/`destructive` on a SERIES to color it by meaning, else grouped series use the chart-1..8 tokens.",
    );

    const fill = s.barFill(tokens, tone);
    const plot = compact ? PLOT_LENGTH.compact : PLOT_LENGTH.default;
    // A segment's contribution to a stacked column: negatives and non-finite
    // values carry no length, so they count as 0 (matching the stacked area
    // chart's running sums).
    const positive = (value: number | undefined): number => (Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0);
    // The category totals a stacked chart is measured against: the column IS
    // the sum, so the tallest column, not the largest single value, sets the axis.
    const totals = labels.map((_, i) => series.reduce((sum, sr) => sum + positive(sr.values[i]), 0));
    // Axis max: the caller's, else the largest finite value, else 1 to avoid /0.
    // Non-finite data (NaN / Infinity) is filtered here so a single bad datum
    // cannot poison `max` (and thus every bar) with NaN.
    const values = stacked
      ? totals
      : grouped
        ? series.flatMap((sr) => sr.values).filter((v) => Number.isFinite(v))
        : data.map((d) => d.value).filter((v) => Number.isFinite(v));
    const max = props.max != null && props.max > 0 ? props.max : Math.max(1, ...values);

    // Map a value to a clamped pixel length along the plot axis. A non-finite
    // value (NaN / Infinity) is treated as 0 so it never reaches a style
    // dimension (an invalid `height` / `width` would break the bar's layout).
    const lengthPx = (value: number): number => {
      const v = Number.isFinite(value) ? value : 0;
      const ratio = Math.max(0, Math.min(1, v / max));
      return Math.max(2, Math.round(ratio * plot));
    };

    // One stacked category's segment heights, bottom series first. An empty
    // segment paints nothing (a 2px floor would inflate the column past its
    // total), a non-empty one keeps a 1px hairline, and the running sum is
    // clamped to the plot so a caller-supplied `max` below the true total
    // cannot overflow the column.
    const stackHeights = (i: number): number[] => {
      let used = 0;
      return series.map((sr) => {
        const v = positive(sr.values[i]);
        if (v === 0) return 0;
        const h = Math.min(Math.max(1, Math.round((v / max) * plot)), plot - used);
        used += h;
        return h;
      });
    };

    // Per-bar gap by density: gap-1.5 (6) compact, gap-2 (8) default.
    const gap = compact ? 6 : 8;

    // Press-to-inspect (vertical charts): pressing a category toggles its
    // selection, dims the other categories, and (grouped) flags the values.
    // The announcement mirrors the flag for assistive tech.
    const categoryName = (i: number): string => {
      if (!grouped) return `${data[i]?.label}: ${data[i]?.value}`;
      const parts = series.map((sr) => `${sr.label} ${Number.isFinite(sr.values[i]) ? sr.values[i] : 0}`).join(", ");
      // A stacked column's height encodes the category total, and no other
      // channel carries it, so the accessible item names it after the segments.
      return stacked ? `${labels[i]}: ${parts}, total ${totals[i]}` : `${labels[i]}: ${parts}`;
    };
    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null) announceSelection(categoryName(i));
    };
    const dimmed = (i: number): number => (selected != null && selected !== i ? DIM_OPACITY : 1);
    // The flag and the scrub surface position against the measured plot row
    // (flex columns have no px coordinates until layout).
    const [plotWidth, setPlotWidth] = useState(0);
    const count = grouped ? labels.length : data.length;
    const columnStep = count > 0 ? (plotWidth + gap) / count : 0;
    const columnCenter = (i: number): number => {
      const colW = count > 0 ? (plotWidth - gap * (count - 1)) / count : 0;
      return i * (colW + gap) + colW / 2;
    };
    const columnAt = (x: number): number | null =>
      columnStep > 0 ? Math.max(0, Math.min(count - 1, Math.floor(x / columnStep))) : null;

    // Summarize the chart for assistive tech: the title if there is one, else a
    // generic name. The container is grouped (role="group") so a screen reader
    // announces the summary and then walks into the per-bar items below.
    const chartName = title != null && title !== "" ? `${title} chart` : "Bar chart";

    return (
      <View
        role="group"
        accessibilityLabel={chartName}
        aria-label={chartName}
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

        {grouped ? (
          // Grouped: each category is a cluster of series bars sharing the
          // column, colored by the chart-1..8 tokens in fixed series order (or
          // by a series' own success/destructive tone). A 2px gap keeps
          // adjacent fills separable (the dataviz spacer rule). `stacked` turns
          // the cluster into ONE column whose segments accumulate.
          <View>
            <View onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)} style={[s.verticalBars, { gap, height: plot }]}>
              {labels.map((label, i) => {
                // Stacked: segment heights bottom-up, and the topmost NON-EMPTY
                // segment carries the column's rounded cap (a zero-height top
                // series must not square off the column).
                const heights = stacked ? stackHeights(i) : null;
                const cap = heights ? heights.reduce((top, h, j) => (h > 0 ? j : top), -1) : -1;
                return (
                  // Each category is one accessible item announcing every
                  // series' value ("Mon: Revenue 45, Costs 30"); the scrub
                  // surface below drives the inspection flag.
                  <View
                    key={i}
                    accessible
                    accessibilityRole="image"
                    role="img"
                    accessibilityLabel={categoryName(i)}
                    aria-label={categoryName(i)}
                    style={s.verticalColumn}
                  >
                    {heights ? (
                      // column-reverse stacks the first series on the baseline,
                      // matching the stacked AreaChart's band order. The
                      // segments abut (no gap), like StackedBar, so the column
                      // reads as one total.
                      <View style={{ flexDirection: "column-reverse", opacity: dimmed(i) }}>
                        {series.map((sr, j) => (
                          <View
                            key={sr.id ?? j}
                            style={s.verticalBar(s.seriesColor(tokens, sr, j), heights[j], j === cap ? skin.barRadius : 0)}
                          />
                        ))}
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, opacity: dimmed(i) }}>
                        {series.map((sr, j) => (
                          <View
                            key={sr.id ?? j}
                            style={[
                              s.verticalBar(s.seriesColor(tokens, sr, j), lengthPx(sr.values[i] ?? 0), skin.barRadius),
                              { flexGrow: 1, flexShrink: 1, flexBasis: "0%" },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              <ScrubSurface indexAt={columnAt} selected={selected} onScrub={setSelected} style={StyleSheet.absoluteFill} />
              {selected != null && labels[selected] != null ? (
                <ChartValueFlag
                  title={labels[selected]}
                  rows={series.map((sr, j) => ({
                    label: sr.label,
                    color: s.seriesColor(tokens, sr, j),
                    value: String(Number.isFinite(sr.values[selected]) ? sr.values[selected] : 0),
                  }))}
                  x={columnCenter(selected)}
                  plotW={plotWidth}
                />
              ) : null}
            </View>
            {/* Baseline under the clusters. */}
            <View style={s.baseline(tokens)} />
            <View style={[s.verticalLabelsRow, { gap }]}>
              {labels.map((label, i) => (
                <Text key={i} style={s.verticalLabel(tokens)}>
                  {label}
                </Text>
              ))}
            </View>
            {/* Series identity, outside the per-category img items. */}
            {props.hideLegend ? null : (
              <ChartLegend horizontal items={series.map((sr, j) => ({ label: sr.label, color: s.seriesColor(tokens, sr, j) }))} />
            )}
          </View>
        ) : horizontal ? (
          // Horizontal: each row is a label, a track-aligned bar, and the value.
          <View style={[s.horizontalStack, { gap }]}>
            {data.map((d, i) => (
              // Each row is one accessible item announcing "label: value", so the
              // bar's magnitude is reachable assistively (the bar itself is a bare
              // colored View). role="image" gives the RNW DOM an img element.
              <View
                key={d.id ?? i}
                accessible
                accessibilityRole="image"
                role="img"
                accessibilityLabel={`${d.label}: ${d.value}`}
                aria-label={`${d.label}: ${d.value}`}
                style={s.horizontalRow}
              >
                <Text style={s.horizontalLabel(tokens)}>{d.label}</Text>
                <View style={s.horizontalTrack}>
                  <View style={s.horizontalBar(fill, lengthPx(d.value), skin.barRadius)} />
                </View>
                <Text style={s.horizontalValue(tokens)}>{d.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          // Vertical: a baseline-aligned row of columns, each a value over a bar,
          // with the category label beneath the baseline.
          <View>
            <View onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)} style={[s.verticalBars, { gap, height: plot }]}>
              {data.map((d, i) => (
                // Each column is one accessible item announcing "label: value".
                // The value is also rendered as visible Text above the bar so the
                // magnitude is present in both the UI and the accessibility tree
                // (it was previously only shown in the horizontal orientation).
                // Pressing or scrubbing a column focuses it (the others dim).
                <View
                  key={d.id ?? i}
                  accessible
                  accessibilityRole="image"
                  role="img"
                  accessibilityLabel={`${d.label}: ${d.value}`}
                  aria-label={`${d.label}: ${d.value}`}
                  style={s.verticalColumn}
                >
                  <View style={{ opacity: dimmed(i) }}>
                    <Text style={s.verticalValue(tokens)}>{d.value}</Text>
                    <View style={s.verticalBar(fill, lengthPx(d.value), skin.barRadius)} />
                  </View>
                </View>
              ))}
              <ScrubSurface indexAt={columnAt} selected={selected} onScrub={setSelected} style={StyleSheet.absoluteFill} />
            </View>
            {/* Baseline under the bars. */}
            <View style={s.baseline(tokens)} />
            <View style={[s.verticalLabelsRow, { gap }]}>
              {data.map((d, i) => (
                <Text key={d.id ?? i} style={s.verticalLabel(tokens)}>
                  {d.label}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };
}
