import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { Circle, G, Line, Rect } from "react-native-svg";
import { View, Text, useControllableState, alpha, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT } from "../shared/chart-frame.js";
import { ChartValueFlag, announceSelection, DIM_OPACITY } from "../shared/chart-inspect.js";
import { PLOT_HEIGHT } from "../shared/cartesian-series.js";
import { boxStats, formatCompact } from "../shared/chart-math.js";

// BoxPlot: quartile boxes, whiskers, and outlier dots per category. Pass raw
// samples per category; the chart computes the Tukey five-number summary
// (quartiles by linear interpolation, whiskers at the most extreme data
// inside the 1.5 IQR fences, outliers beyond) and draws each category as a
// box on the cartesian frame. The y domain spans whisker ends and outliers,
// not zero. A "Shared" platform treatment - data visualization is
// platform-neutral - so one implementation serves iOS, Android, and the web.
//
// Boolean-prop axes (one boolean per choice, first-match precedence per axis):
// - Tone (pick one; default primary): `success` > `destructive`.
// - Density: `compact`. Furniture: `hideGrid`, `hideAxes`.

export interface BoxSample {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** The category label under the box. */
  label: string;
  /** Raw samples; the chart computes quartiles, whiskers, and outliers. */
  values: number[];
}

export interface BoxPlotProps {
  /** One box per category, in order. */
  data: BoxSample[];
  /** Optional heading shown above the plot. */
  title?: string;
  // Tone (pick one; default primary). Precedence: success > destructive.
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility.
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats tick labels, the flag, and the accessible name. */
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

// Tone precedence within the axis, first match wins.
function toneOf(p: BoxPlotProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

const MIN_SAMPLES = 5;

/** Build a BoxPlot from a platform skin. */
export function createBoxPlot(skin: ChartSkin) {
  return function BoxPlot(props: BoxPlotProps) {
    const { data, title, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;
    const fill = s.barFill(tokens, toneOf(props));

    devWarn(data.length === 0, "[canvas] <BoxPlot />: `data` is empty; the chart renders with no boxes.");
    devWarn(
      data.some((d) => d.values.filter((v) => Number.isFinite(v)).length < MIN_SAMPLES),
      `[canvas] <BoxPlot />: a category has fewer than ${MIN_SAMPLES} samples; its quartiles are not meaningful.`,
    );

    const stats = data.map((d) => boxStats(d.values));
    const labels = data.map((d) => d.label);

    // The domain spans whisker ends and outliers, hugging the data.
    const pool = stats.flatMap((st) => [st.min, st.max, ...st.outliers]);
    const yExtent: [number, number] = pool.length > 0 ? [Math.min(...pool), Math.max(...pool)] : [0, 1];

    // The accessible name gives each category its five-number summary.
    const name = data
      .map((d, i) => {
        const st = stats[i];
        const outliers = st.outliers.length > 0 ? `, ${st.outliers.length} ${st.outliers.length === 1 ? "outlier" : "outliers"}` : "";
        return `${d.label}: median ${formatValue(st.median)}, quartiles ${formatValue(st.q1)} to ${formatValue(st.q3)}, range ${formatValue(st.min)} to ${formatValue(st.max)}${outliers}`;
      })
      .join("; ");

    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null && stats[i] != null) {
        const st = stats[i];
        announceSelection(`${labels[i]}: median ${formatValue(st.median)}, quartiles ${formatValue(st.q1)} to ${formatValue(st.q3)}`);
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
              selected != null && layout.band && stats[selected] != null ? (
                <ChartValueFlag
                  title={labels[selected]}
                  rows={[
                    { label: "Max", value: formatValue(stats[selected].max) },
                    { label: "Q3", value: formatValue(stats[selected].q3) },
                    { label: "Median", value: formatValue(stats[selected].median) },
                    { label: "Q1", value: formatValue(stats[selected].q1) },
                    { label: "Min", value: formatValue(stats[selected].min) },
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
              // The box takes most of the band; whiskers span half the box.
              const boxW = Math.max(6, Math.min(40, band.bandWidth * 0.5));
              return (
                <>
                  {stats.map((st, i) => {
                    const cx = band.center(i);
                    const dim = selected != null && selected !== i ? DIM_OPACITY : 1;
                    return (
                      <G key={data[i].id ?? i} opacity={dim}>
                        {/* Whisker spine and caps. */}
                        <Line x1={cx} y1={layout.y(st.max)} x2={cx} y2={layout.y(st.min)} stroke={fill} strokeWidth={1.5} />
                        <Line x1={cx - boxW / 4} y1={layout.y(st.max)} x2={cx + boxW / 4} y2={layout.y(st.max)} stroke={fill} strokeWidth={1.5} />
                        <Line x1={cx - boxW / 4} y1={layout.y(st.min)} x2={cx + boxW / 4} y2={layout.y(st.min)} stroke={fill} strokeWidth={1.5} />
                        {/* The interquartile box over the spine. */}
                        <Rect
                          x={cx - boxW / 2}
                          y={layout.y(st.q3)}
                          width={boxW}
                          height={Math.max(1, layout.y(st.q1) - layout.y(st.q3))}
                          rx={Math.min(skin.barRadius, boxW / 4)}
                          fill={alpha(fill, 0.25)}
                          stroke={fill}
                          strokeWidth={1.5}
                        />
                        {/* Median line. */}
                        <Line x1={cx - boxW / 2} y1={layout.y(st.median)} x2={cx + boxW / 2} y2={layout.y(st.median)} stroke={fill} strokeWidth={2} />
                        {/* Outliers beyond the fences. */}
                        {st.outliers.map((v, oi) => (
                          <Circle key={oi} cx={cx} cy={layout.y(v)} r={2.5} fill="none" stroke={fill} strokeWidth={1.5} />
                        ))}
                      </G>
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
