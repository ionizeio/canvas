import { Path } from "react-native-svg";
import { View, Text, useTheme, useControllableState, alpha, devWarn, type StyleProp, type ViewStyle } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT } from "../shared/chart-frame.js";
import { ChartValueFlag, announceSelection } from "../shared/chart-inspect.js";
import { PLOT_HEIGHT } from "../shared/cartesian-series.js";
import { areaBandPath, formatCompact, linePath, monotonePath, DENSE_SERIES, type Pt } from "../shared/chart-math.js";

// RangeAreaChart: a min/max envelope (forecast band, error envelope, daily
// temperature range) as a translucent band between the low and high edges,
// with an optional solid mid line, on the categorical cartesian frame. The
// y domain hugs the data (an envelope is the price idiom, not a magnitude
// bar), niced by the frame. A "Shared" platform treatment - data
// visualization is platform-neutral - so one implementation serves iOS,
// Android, and the web.
//
// Boolean-prop axes (one boolean per choice, first-match precedence per axis):
// - Tone (pick one; default primary): `success` > `destructive`.
// - Curve: `curved` bends the edges (monotone cubic).
// - Density: `compact`. Furniture: `hideGrid`, `hideAxes`.

export interface RangePoint {
  /** The envelope's lower edge at this label. */
  low: number;
  /** The envelope's upper edge at this label. */
  high: number;
  /** An optional central line value (e.g. the mean or forecast). */
  mid?: number;
}

export interface RangeAreaChartProps {
  /** Category labels along the x axis, one per data column. */
  labels: string[];
  /** One range per label, aligned by index. */
  data: RangePoint[];
  /** Names the envelope (e.g. "Forecast"); leads the accessible name and the flag. */
  label?: string;
  /** Optional heading shown above the plot. */
  title?: string;
  // Tone (pick one; default primary). Precedence: success > destructive.
  success?: boolean;
  destructive?: boolean;
  // Curve (omit for straight segments).
  curved?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
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
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Tone precedence within the axis, first match wins.
function toneOf(p: RangeAreaChartProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

const fin = (v: number | undefined): number => (Number.isFinite(v) ? (v as number) : 0);

/** Build a RangeAreaChart from a platform skin. */
export function createRangeAreaChart(skin: ChartSkin) {
  return function RangeAreaChart(props: RangeAreaChartProps) {
    const { labels, data, title, testID, style } = props;
    const { tokens } = useTheme();
    const compact = !!props.compact;
    const curved = !!props.curved;
    const formatValue = props.formatValue ?? formatCompact;
    const fill = s.barFill(tokens, toneOf(props));

    devWarn(data.length === 0 || labels.length === 0, "[canvas] <RangeAreaChart />: `labels` or `data` is empty; the chart renders with no band.");
    devWarn(
      data.length !== labels.length && data.length > 0 && labels.length > 0,
      "[canvas] <RangeAreaChart />: `data` length differs from `labels`; missing ranges are treated as 0.",
    );
    devWarn(
      data.some((r) => fin(r.low) > fin(r.high)),
      "[canvas] <RangeAreaChart />: a range's `low` exceeds its `high`; the pair is swapped.",
    );

    // Normalized ranges: low <= high, aligned to the labels.
    const ranges = labels.map((_, i) => {
      const r = data[i];
      const lo = fin(r?.low);
      const hi = fin(r?.high);
      return { low: Math.min(lo, hi), high: Math.max(lo, hi), mid: r?.mid != null && Number.isFinite(r.mid) ? r.mid : undefined };
    });

    // The envelope hugs the data; the frame nices the extent.
    const lows = ranges.map((r) => r.low);
    const highs = ranges.map((r) => r.high);
    const yExtent: [number, number] = ranges.length > 0 ? [Math.min(...lows), Math.max(...highs)] : [0, 1];

    // The accessible name folds every range; dense envelopes summarize.
    const chartLabel = props.label ?? "Range";
    const name =
      labels.length > DENSE_SERIES
        ? `${chartLabel}: ${labels.length} ranges, low ${formatValue(Math.min(...lows))}, high ${formatValue(Math.max(...highs))}`
        : `${chartLabel}: ${labels.map((l, i) => `${l} ${formatValue(ranges[i].low)} to ${formatValue(ranges[i].high)}${ranges[i].mid != null ? ` around ${formatValue(ranges[i].mid as number)}` : ""}`).join(", ")}`;

    // Scrub selection with deduped announcements (the cartesian contract).
    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null && labels[i] != null) {
        const r = ranges[i];
        announceSelection(`${labels[i]}: low ${formatValue(r.low)}, high ${formatValue(r.high)}${r.mid != null ? `, mid ${formatValue(r.mid)}` : ""}`);
      }
    };

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          s.surface(tokens, skin.surfaceRadius),
          compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <View accessible accessibilityRole="image" role="img" accessibilityLabel={name} aria-label={name}>
          <CartesianFrame
            yExtent={yExtent}
            xLabels={labels}
            plotHeight={compact ? PLOT_HEIGHT.compact : PLOT_HEIGHT.default}
            compact={compact}
            hideGrid={props.hideGrid}
            hideAxes={props.hideAxes}
            formatValue={formatValue}
            selectedBand={selected}
            onBandScrub={setSelected}
            overlay={(layout) =>
              selected != null && layout.band && labels[selected] != null ? (
                <ChartValueFlag
                  title={labels[selected]}
                  rows={[
                    { label: "High", value: formatValue(ranges[selected].high) },
                    ...(ranges[selected].mid != null ? [{ label: "Mid", value: formatValue(ranges[selected].mid as number) }] : []),
                    { label: "Low", value: formatValue(ranges[selected].low) },
                  ]}
                  x={layout.band.center(selected)}
                  plotW={layout.plotW}
                />
              ) : null
            }
          >
            {(layout) => {
              const band = layout.band;
              if (!band) return null;
              const top: Pt[] = labels.map((_, i) => ({ x: band.center(i), y: layout.y(ranges[i].high) }));
              const bottom: Pt[] = labels.map((_, i) => ({ x: band.center(i), y: layout.y(ranges[i].low) }));
              const mids: Pt[] = ranges.every((r) => r.mid != null)
                ? labels.map((_, i) => ({ x: band.center(i), y: layout.y(ranges[i].mid as number) }))
                : [];
              return (
                <>
                  <Path d={areaBandPath(top, bottom, curved)} fill={alpha(fill, 0.2)} stroke={alpha(fill, 0.45)} strokeWidth={1} />
                  {mids.length > 0 ? (
                    <Path
                      d={curved ? monotonePath(mids) : linePath(mids)}
                      stroke={fill}
                      strokeWidth={2}
                      fill="none"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                </>
              );
            }}
          </CartesianFrame>
        </View>
      </View>
    );
  };
}
