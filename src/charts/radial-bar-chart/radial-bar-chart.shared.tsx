import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { View, Pressable, useTheme, useControllableState, devWarn, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { seriesFill } from "../shared/charts.styles.js";
import { type StackedSegment } from "../shared/types.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { announceSelection, pressPoint, DIM_OPACITY } from "../shared/chart-inspect.js";
import { formatCompact } from "../shared/chart-math.js";

// RadialBarChart is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
//
// RadialBarChart: concentric arc rings, one per category, innermost first.
// Each ring pairs a muted full-circle track with a ramp-colored value arc
// revealed clockwise from 12 o'clock (the ProgressRing anatomy, stacked),
// with a column legend carrying the formatted values. Pressing a ring
// selects it (the others dim); pressing outside the rings clears.

export interface RadialBarChartProps {
  /** One ring per entry, inner to outer. */
  data: StackedSegment[];
  /** What the rings measure (e.g. "Platform activation"); leads the accessible name. */
  label?: string;
  /** The value of a full sweep. Defaults to the largest entry. */
  max?: number;
  // Density (omit for the default 160 disc; compact is 120).
  compact?: boolean;
  /** Hide the value legend (the accessible name still carries every value). */
  hideLegend?: boolean;
  /** Formats legend values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Press-to-inspect: the selected ring index (controlled). Pass null for none. */
  selected?: number | null;
  /** Press-to-inspect: the initially selected ring (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press selects a ring (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

const MAX_RINGS = 6;

// A full circle as a stroked path: two half arcs from 12 o'clock, so a dash
// reveal starts at the top (an SVG circle's dash origin sits at 3 o'clock).
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`;
}

export function RadialBarChart(props: RadialBarChartProps) {
  const { data, testID, style } = props;
  const { tokens } = useTheme();
  const compact = !!props.compact;
  const formatValue = props.formatValue ?? formatCompact;

  devWarn(data.length === 0, "[canvas] <RadialBarChart />: `data` is empty; the chart renders with no rings.");
  devWarn(
    data.length > MAX_RINGS,
    `[canvas] <RadialBarChart />: more than ${MAX_RINGS} rings read poorly; aggregate the tail into fewer categories.`,
  );

  const clean = data.map((d) => (Number.isFinite(d.value) && d.value > 0 ? d.value : 0));
  const max = props.max != null && props.max > 0 ? props.max : Math.max(1, ...clean);
  const pctOf = (v: number): number => Math.round(Math.max(0, Math.min(1, v / max)) * 100);

  const size = compact ? 120 : 160;
  const stroke = compact ? 8 : 10;
  const gap = 4;
  const center = size / 2;
  // Rings grow outward from an inner hole; the outermost ring hugs the disc.
  const rOuter = center - stroke / 2;
  const radiusOf = (i: number): number => rOuter - (data.length - 1 - i) * (stroke + gap);

  // Press-to-inspect: nearest ring by press radius, cleared elsewhere.
  const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
  const setSelected = (i: number | null) => {
    setSelectedRaw(i);
    if (i != null && data[i]) announceSelection(`${data[i].label}: ${pctOf(clean[i])}%`);
  };
  const toggle = (i: number) => setSelected(selected === i ? null : i);
  const onPlotPress = (x: number, y: number) => {
    const dist = Math.hypot(x - center, y - center);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(dist - radiusOf(i)) <= stroke / 2 + 2) {
        toggle(i);
        return;
      }
    }
    setSelected(null);
  };

  // The composition lives in the accessible name (each ring's share of the
  // full sweep); the img role hoists to the root when the legend is hidden.
  const name = `${props.label ?? "Radial bar chart"}: ${data.map((d, i) => `${d.label} ${pctOf(clean[i])}%`).join(", ")}`;
  const img = { accessibilityRole: "image", accessibilityLabel: name, "aria-label": name } as const;

  return (
    <View testID={testID} style={style} {...(props.hideLegend ? img : {})}>
      <View {...(props.hideLegend ? {} : img)} style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          {data.map((d, i) => {
            const r = radiusOf(i);
            if (r < stroke) return null;
            const dim = selected != null && selected !== i ? DIM_OPACITY : 1;
            return <Path key={i} d={circlePath(center, center, r)} fill="none" stroke={tokens.muted} strokeWidth={stroke} opacity={dim} />;
          })}
          {data.map((d, i) => {
            const r = radiusOf(i);
            if (r < stroke) return null;
            const circumference = 2 * Math.PI * r;
            const dim = selected != null && selected !== i ? DIM_OPACITY : 1;
            const fraction = Math.max(0, Math.min(1, clean[i] / max));
            if (fraction <= 0) return null;
            return (
              <Path
                key={`v${i}`}
                d={circlePath(center, center, r)}
                fill="none"
                stroke={seriesFill(tokens, i)}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${circumference * fraction} ${circumference}`}
                opacity={dim}
              />
            );
          })}
        </Svg>
        {/* Empty hit layer on top: the press target must be this Pressable
            itself so web offsetX coordinates stay plot-relative. */}
        <Pressable
          accessible={false}
          onPress={(e) => {
            const point = pressPoint(e);
            if (point) onPlotPress(point.x, point.y);
          }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {props.hideLegend ? null : (
        <View style={{ marginTop: 12 }}>
          <ChartLegend
            items={data.map((d, i) => ({
              label: d.label,
              color: seriesFill(tokens, i),
              detail: formatValue(clean[i]),
            }))}
          />
        </View>
      )}
    </View>
  );
}
