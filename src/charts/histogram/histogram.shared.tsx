import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { StyleSheet } from "react-native";
import { Path } from "react-native-svg";
import { View, Text, useControllableState, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT } from "../shared/chart-frame.js";
import { ChartValueFlag, ScrubSurface, announceSelection, DIM_OPACITY } from "../shared/chart-inspect.js";
import { PLOT_HEIGHT } from "../shared/cartesian-series.js";
import { binValues, formatCompact, topRoundedRect } from "../shared/chart-math.js";

// Histogram: an auto-binned frequency distribution on a numeric x axis. Pass
// raw samples; the chart bins them into nice-edged uniform buckets (Sturges'
// rule by default) and draws contiguous bars between the bin edges on the
// cartesian frame's numeric-x mode. Bars and hit-testing both go through the
// frame's x scale: the frame nices the numeric domain, so bins neither start
// at pixel 0 nor tile the plot width. A "Shared" platform treatment - data
// visualization is platform-neutral - so one implementation serves iOS,
// Android, and the web.
//
// Boolean-prop axes (one boolean per choice, first-match precedence per axis):
// - Tone (pick one; default primary): `success` > `destructive`.
// - Density: `compact`. Furniture: `hideGrid`, `hideAxes` (numeric x draws
//   vertical gridlines; `hideGrid` drops both directions).

export interface HistogramProps {
  /** Raw sample values; the chart bins them. */
  values: number[];
  /** Bucket count override. Defaults to Sturges' rule on the sample size. */
  bins?: number;
  /** Optional heading shown above the plot. */
  title?: string;
  /** Names the distribution (e.g. "Response times"); leads the accessible name. */
  label?: string;
  // Tone (pick one; default primary). Precedence: success > destructive.
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats bin edges in ticks, the flag, and the accessible name. */
  formatValue?: (v: number) => string;
  /** Press-to-inspect: the selected bin index (controlled). Pass null for none. */
  selected?: number | null;
  /** Press-to-inspect: the initially selected bin (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press selects a bin (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence within the axis, first match wins.
function toneOf(p: HistogramProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

/** Build a Histogram from a platform skin. */
export function createHistogram(skin: ChartSkin) {
  return function Histogram(props: HistogramProps) {
    const { title, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;
    const fill = s.barFill(tokens, toneOf(props));

    devWarn(props.values.length === 0, "[canvas] <Histogram />: `values` is empty; the chart renders with no bars.");
    const { edges, counts } = binValues(props.values, props.bins);
    devWarn(
      props.values.length > 0 && counts.length === 0,
      "[canvas] <Histogram />: `values` has no finite samples; the chart renders with no bars.",
    );

    const chartLabel = props.label ?? "Distribution";
    const total = counts.reduce((a, b) => a + b, 0);
    // The accessible name lists each bin's range and count.
    const name =
      counts.length > 0
        ? `${chartLabel}: ${total} samples in ${counts.length} bins: ${counts.map((c, i) => `${formatValue(edges[i])} to ${formatValue(edges[i + 1])} ${c}`).join(", ")}`
        : `${chartLabel}: no samples`;

    // Press-to-inspect over the bins, announced like every cartesian chart.
    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null && counts[i] != null) {
        announceSelection(`${formatValue(edges[i])} to ${formatValue(edges[i + 1])}: ${counts[i]}`);
      }
    };

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
        <View accessible accessibilityRole="image" role="img" accessibilityLabel={name} aria-label={name}>
          <CartesianFrame
            yExtent={[0, Math.max(1, ...counts)]}
            xDomain={counts.length > 0 ? [edges[0], edges[edges.length - 1]] : [0, 1]}
            plotHeight={compact ? PLOT_HEIGHT.compact : PLOT_HEIGHT.default}
            compact={compact}
            hideGrid={props.hideGrid}
            hideAxes={props.hideAxes}
            formatValue={formatValue}
            overlay={(layout) => {
              // The bin hit-test finds the containing edge pair through the
              // frame's x scale (the niced domain shifts the bins off pixel
              // 0), clamped to the range; the empty absolute Pressable idiom
              // does not apply here because bins want drag-scrub too.
              const indexAt = (x: number): number | null => {
                if (counts.length === 0) return null;
                for (let i = 0; i < counts.length; i++) {
                  if (x < layout.x(edges[i + 1])) return i;
                }
                return counts.length - 1;
              };
              return (
                <>
                  <ScrubSurface indexAt={indexAt} selected={selected} onScrub={setSelected} style={StyleSheet.absoluteFill} />
                  {selected != null && counts[selected] != null ? (
                    <ChartValueFlag
                      title={`${formatValue(edges[selected])} to ${formatValue(edges[selected + 1])}`}
                      rows={[{ value: String(counts[selected]) }]}
                      x={(layout.x(edges[selected]) + layout.x(edges[selected + 1])) / 2}
                      plotW={layout.plotW}
                    />
                  ) : null}
                </>
              );
            }}
          >
            {(layout) => (
              <>
                {counts.map((c, i) => {
                  if (c <= 0) return null;
                  const x0 = layout.x(edges[i]);
                  const x1 = layout.x(edges[i + 1]);
                  const y = layout.y(c);
                  const h = Math.max(0, layout.plotH - y);
                  return (
                    <Path
                      key={i}
                      d={topRoundedRect(x0 + 0.5, y, Math.max(1, x1 - x0 - 1), h, skin.barRadius)}
                      fill={fill}
                      opacity={selected != null && selected !== i ? DIM_OPACITY : 1}
                    />
                  );
                })}
              </>
            )}
          </CartesianFrame>
        </View>
      </View>
    );
  };
}
