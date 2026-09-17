import { type ReactNode } from "react";
import { View, Text, useControllableState, devWarn, GlassPane, paneStyle, isGlass, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import * as s from "./charts.styles.js";
import { type Tone } from "./charts.styles.js";
import { type ChartSeries, type ChartSkin } from "./types.js";
import { CartesianFrame, CHART_ROOT, type CartesianLayout } from "./chart-frame.js";
import { ChartLegend } from "./chart-legend.js";
import { ChartValueFlag, announceSelection } from "./chart-inspect.js";
import { formatCompact, seriesAccessibleName, type Pt } from "./chart-math.js";

// The shared core of the categorical-x series charts (LineChart, AreaChart):
// the props contract, the per-chart setup hook (warnings, tone/color
// resolution, y extent, accessible name, scrub selection), and the card shell
// that wraps a mark layer in the frame, flag, and legend. Each chart type
// keeps only its own mark rendering.

export interface CartesianSeriesProps {
  /** Category labels along the x axis, one per data column. */
  labels: string[];
  /** The series to plot; colors follow the chart-1..8 tokens in fixed order, or a series' own `success`/`destructive` tone. */
  series: ChartSeries[];
  /** Optional heading shown above the plot. */
  title?: string;
  /** Y-axis maximum override. Defaults to a nice bound above the data max. */
  max?: number;
  /** Y-axis minimum override. Defaults to 0 (or the data min when negative). */
  min?: number;
  // Tone (single-series only; pick one; default is the primary fill).
  success?: boolean;
  destructive?: boolean;
  // Curve (omit for straight segments).
  curved?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
  hideLegend?: boolean;
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats tick labels and accessible values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Scrub-to-inspect: the selected category index (controlled). Pass null for none. */
  selected?: number | null;
  /** Scrub-to-inspect: the initially selected category (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press/scrub selects a category (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence matches Chart: success > destructive > primary.
function toneOf(p: CartesianSeriesProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

// Plot heights by density (taller than the bar Chart: these carry a y axis).
export const PLOT_HEIGHT = { default: 180, compact: 120 } as const;

export const finite = (v: number | undefined): number => (Number.isFinite(v) ? (v as number) : 0);

// Shared per-chart setup: warnings, tone/color resolution, the y extent, the
// accessible name, and the scrub selection. `displayName` is the component's
// name, used only to attribute the dev warnings.
export function useSeriesChart(
  displayName: string,
  props: CartesianSeriesProps,
  stacked: boolean,
  opts?: { extraExtent?: number[]; autoTone?: Tone; zeroBased?: boolean },
) {
  const { labels, series } = props;
  const theme = useMaterialTheme({ layer: "content" });
  const { tokens } = theme;
  // An explicit tone boolean always wins over a derived (gain/loss) tone.
  const tone = props.success || props.destructive ? toneOf(props) : (opts?.autoTone ?? toneOf(props));
  const multi = series.length > 1;
  const formatValue = props.formatValue ?? formatCompact;

  devWarn(series.length === 0, `[canvas] <${displayName} />: \`series\` is empty; the chart renders with no marks.`);
  devWarn(labels.length === 0, `[canvas] <${displayName} />: \`labels\` is empty; the chart renders with no columns.`);
  devWarn(
    series.some((sr) => sr.values.length !== labels.length),
    `[canvas] <${displayName} />: a series' \`values\` length differs from \`labels\`; missing values are treated as 0.`,
  );
  devWarn(
    multi && !!(props.success || props.destructive),
    `[canvas] <${displayName} />: tone props apply to single-series charts only; set \`success\`/\`destructive\` on a SERIES to color it by meaning, else multi-series charts use the chart-1..8 tokens.`,
  );

  // A series' own tone wins; a single series then takes the chart-level tone,
  // and a multi-series chart falls through to its ramp position.
  const colorOf = (i: number): string => s.seriesColor(tokens, series[i], i, multi ? null : tone);

  // Y extent: zero-based unless the data (or the caller) goes below.
  const values = series.flatMap((sr) => labels.map((_, i) => finite(sr.values[i])));
  let dataMax: number;
  if (stacked) {
    const totals = labels.map((_, i) => series.reduce((sum, sr) => sum + Math.max(0, finite(sr.values[i])), 0));
    dataMax = Math.max(0, ...totals);
  } else {
    dataMax = Math.max(0, ...values);
  }
  const extra = (opts?.extraExtent ?? []).filter((v) => Number.isFinite(v));
  // Category charts are zero-based (bars/areas encode magnitude); the price
  // idiom (a baseline) hugs the data range instead, like a scatter axis.
  const pool = [...values, ...extra];
  const dataMin = pool.length === 0 ? 0 : opts?.zeroBased === false ? Math.min(...pool) : Math.min(0, ...pool);
  const dataMaxAll = Math.max(dataMax, ...(extra.length ? extra : [-Infinity]));
  const yExtent: [number, number] = [props.min ?? dataMin, props.max ?? (dataMaxAll <= 0 ? 1 : dataMaxAll)];

  // The accessible name carries the data itself, series-prefixed, so a screen
  // reader hears "Revenue: Jan 12, Feb 19, ...; Costs: Jan 8, ..." (role="img"
  // subtrees are presentational, so the name is the data's only channel). Dense
  // series summarize their shape instead of listing every value.
  const name = series.map((sr) => seriesAccessibleName(sr.label, sr.values, labels, formatValue)).join("; ");

  // Scrub-to-inspect selection (controlled + uncontrolled), announced to
  // assistive tech since the visual flag is presentational. Repeat scrub
  // events on the same band are dropped so announcements fire once per band.
  const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
  const setSelected = (i: number | null) => {
    if (i === selected) return;
    setSelectedRaw(i);
    if (i != null && labels[i] != null) {
      announceSelection(`${labels[i]}: ${series.map((sr) => `${sr.label} ${formatValue(finite(sr.values[i]))}`).join(", ")}`);
    }
  };

  return { theme, tokens, tone, multi, formatValue, colorOf, yExtent, name, selected, setSelected };
}

// Points for series `sr` across the frame's categorical bands.
export function seriesPoints(sr: ChartSeries, labels: string[], layout: CartesianLayout): Pt[] {
  const band = layout.band!;
  return labels.map((_, i) => ({ x: band.center(i), y: layout.y(finite(sr.values[i])) }));
}

export function chartShell(
  skin: ChartSkin,
  props: CartesianSeriesProps,
  ctx: ReturnType<typeof useSeriesChart>,
  marks: (layout: CartesianLayout) => ReactNode,
) {
  const { labels, series, title, testID, style } = props;
  const compact = !!props.compact;
  const { theme, tokens, multi, formatValue, colorOf, yExtent, name } = ctx;
  const surfaceShape = s.surface(tokens, skin.surfaceRadius);

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
      {isGlass(theme) ? <GlassPane layer="content" shape={surfaceShape} /> : null}
      {title != null && title !== "" ? (
        <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
      ) : null}

      {/* The plot is the image; its accessible name carries every value. */}
      <View accessible accessibilityRole="image" role="img" accessibilityLabel={name} aria-label={name}>
        <CartesianFrame
          yExtent={yExtent}
          xLabels={labels}
          plotHeight={compact ? PLOT_HEIGHT.compact : PLOT_HEIGHT.default}
          compact={compact}
          hideGrid={props.hideGrid}
          hideAxes={props.hideAxes}
          formatValue={formatValue}
          selectedBand={ctx.selected}
          onBandScrub={ctx.setSelected}
          overlay={(layout) =>
            ctx.selected != null && layout.band && labels[ctx.selected] != null ? (
              <ChartValueFlag
                title={labels[ctx.selected]}
                rows={series.map((sr, i) => ({
                  label: multi ? sr.label : undefined,
                  color: multi ? colorOf(i) : undefined,
                  value: formatValue(Number.isFinite(sr.values[ctx.selected!]) ? sr.values[ctx.selected!]! : 0),
                }))}
                x={layout.band.center(ctx.selected)}
                plotW={layout.plotW}
              />
            ) : null
          }
        >
          {marks}
        </CartesianFrame>
      </View>

      {/* Identity legend for multiple series (a single series is named by the
          title); rendered outside the img subtree so it stays reachable. */}
      {multi && !props.hideLegend ? (
        <ChartLegend horizontal items={series.map((sr, i) => ({ label: sr.label, color: colorOf(i) }))} />
      ) : null}
    </View>
  );
}
