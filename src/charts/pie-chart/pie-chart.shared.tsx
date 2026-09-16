import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { View, Text, Pressable, useTheme, useControllableState, devWarn, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { seriesFill } from "../shared/charts.styles.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { announceSelection, pressPoint, DIM_OPACITY } from "../shared/chart-inspect.js";
import { arcPath, formatCompact, pieLayout } from "../shared/chart-math.js";
import { type StackedSegment } from "../shared/types.js";

// PieChart is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
// Slice colors come from the theme's chart-1..chart-8 tokens in fixed order.

// PieChart: proportional composition as arc slices (donut with the total and a
// label centered inside), colored by the chart-1..8 tokens in fixed order,
// with the StackedBar-style legend identifying each slice.

export interface PieChartProps {
  /** The slices, in order; each takes its share of the circle. */
  slices: StackedSegment[];
  /** What the pie measures (e.g. "Traffic sources"); leads the accessible name. */
  label?: string;
  /** Draw an annular ring with the total and label centered inside. */
  donut?: boolean;
  /** Hide the legend (the labelled dots beside percentages). */
  hideLegend?: boolean;
  /** Smaller diameter. */
  compact?: boolean;
  /** Press-to-inspect: the selected slice index (controlled). Pass null for none. */
  selected?: number | null;
  /** Press-to-inspect: the initially selected slice (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press selects a slice (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

export function PieChart(props: PieChartProps) {
  const { slices, label, donut, hideLegend, compact, testID, style } = props;
  const { tokens } = useTheme();
  const clean = slices.map((sl) => (Number.isFinite(sl.value) && sl.value > 0 ? sl.value : 0));
  const rawTotal = clean.reduce((a, b) => a + b, 0);
  const total = Math.max(1, rawTotal);
  const pctOf = (v: number) => Math.round(((Number.isFinite(v) && v > 0 ? v : 0) / total) * 100);

  devWarn(slices.length === 0, "[canvas] <PieChart />: `slices` is empty; the chart renders empty.");
  devWarn(slices.length > 0 && rawTotal <= 0, "[canvas] <PieChart />: all slice values are zero; the chart renders empty.");
  devWarn(
    slices.length > 8,
    "[canvas] <PieChart />: more than 8 slices cycles the series palette; fold small slices into an “Other” slice.",
  );

  const size = compact ? 120 : 160;
  const r = size / 2;
  const rInner = donut ? r * 0.62 : 0;
  const layout = pieLayout(clean);

  // Press-to-inspect: pressing a slice dims the others; a donut swaps its
  // center readout to the selected slice. Announced for assistive tech.
  const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
  const setSelected = (i: number | null) => {
    setSelectedRaw(i);
    if (i != null && slices[i]) announceSelection(`${slices[i].label}: ${pctOf(slices[i].value)}%`);
  };
  const toggle = (i: number) => setSelected(selected === i ? null : i);
  // Slice hit-testing from the press position (radius + clockwise angle from
  // 12 o'clock), on an RN Pressable - SVG touchables leak responder props to
  // the DOM on web. Pressing the donut hole (or outside the disc) clears.
  const onPlotPress = (locationX: number, locationY: number) => {
    const dx = locationX - r;
    const dy = locationY - r;
    const dist = Math.hypot(dx, dy);
    if (dist > r || (donut && dist < rInner)) {
      setSelected(null);
      return;
    }
    const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI);
    const idx = layout.findIndex((sl) => sl.fraction > 0 && angle >= sl.startAngle && angle < sl.endAngle);
    if (idx >= 0) toggle(idx);
  };

  // Same naming formula as StackedBar: the composition lives in the accessible
  // name, and the img role sits on the plot while the legend renders (hoisting
  // to the root when the legend is hidden).
  const name = `${label ?? "Pie chart"}: ${slices.map((sl) => `${sl.label} ${pctOf(sl.value)}%`).join(", ")}`;
  const img = { accessibilityRole: "image", accessibilityLabel: name, "aria-label": name } as const;

  return (
    <View testID={testID} style={style} {...(hideLegend ? img : {})}>
      <View {...(hideLegend ? {} : img)} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          {layout.map((slice, i) =>
            slice.fraction > 0 ? (
              <Path
                key={i}
                d={arcPath(r, r, r - 1, rInner, slice.startAngle, slice.endAngle)}
                fill={seriesFill(tokens, i)}
                fillOpacity={selected != null && selected !== i ? DIM_OPACITY : 1}
                // A hairline of the card surface keeps adjacent fills separable.
                stroke={tokens.card}
                strokeWidth={2}
              />
            ) : null,
          )}
        </Svg>
        {donut ? (
          // The center reads the total, or the selected slice while inspecting.
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: compact ? 20 : 24, lineHeight: compact ? 28 : 32, fontWeight: "600", color: tokens["card-foreground"] }}>
              {selected != null && slices[selected] ? `${pctOf(slices[selected].value)}%` : formatCompact(rawTotal)}
            </Text>
            {(selected != null && slices[selected] ? slices[selected].label : label) ? (
              <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>
                {selected != null && slices[selected] ? slices[selected].label : label}
              </Text>
            ) : null}
          </View>
        ) : null}
        {/* Empty hit layer on top: the press target must be this Pressable
            itself so web offsetX coordinates are plot-relative. */}
        <Pressable
          accessible={false}
          onPress={(e) => {
            const point = pressPoint(e);
            if (point) onPlotPress(point.x, point.y);
          }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {hideLegend ? null : (
        <ChartLegend
          items={slices.map((sl, i) => ({
            label: sl.label,
            color: seriesFill(tokens, i),
            detail: `${pctOf(sl.value)}%`,
          }))}
        />
      )}
    </View>
  );
}
