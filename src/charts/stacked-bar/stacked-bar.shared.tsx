import { View, useTheme, devWarn, alpha, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { seriesFill } from "../shared/charts.styles.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { type StackedSegment } from "../shared/types.js";

// StackedBar is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
// Series colors come from the theme's chart-1..chart-8 tokens via seriesFill,
// so the categorical palette is brandable through ThemeProvider overrides.

// StackedBar: one proportional horizontal bar split into colored segments, with a
// legend (dot + label + %) so each band is identified.

// The wash `subtle` draws its segments at: the density a Sparkline gives its
// own marks, so a composition and a trend sitting side by side carry the same
// ink.
const SUBTLE_ALPHA = 0.35;

// The `tall` size, matching what a Sparkline plots in: the same band height and
// the same radius its bars carry, so the two draw as one family.
const STRIP_HEIGHT = 24;
const STRIP_BAR_RADIUS = 4;

export interface StackedBarProps {
  segments: StackedSegment[];
  /** What the bar measures (e.g. "Traffic sources"); leads the accessible name. */
  label?: string;
  /** Hide the legend (the labelled dots below the bar). */
  hideLegend?: boolean;
  /** Paint the unfilled remainder as a muted rail, so a bar whose segments sum
   *  to zero still reads as a bar rather than as blank space. A composition of
   *  nothing (an empty queue, a metric at zero) is a real state to draw, and
   *  without the rail it draws as an absence. */
  track?: boolean;
  /** The metric-strip size: a 24 band carrying the chart bar radius, instead of
   *  the default 10 pill. It is the height a Sparkline plots in, so a
   *  composition drawn at this size sits in the same band as a trend and a row
   *  holding both scans as one set. */
  tall?: boolean;
  /** Draw the segments as washes of their ramp colours rather than at full
   *  strength. For a bar that supports a headline rather than being one (the
   *  strip under a metric's value), where a solid bar outweighs everything
   *  around it. */
  subtle?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

export function StackedBar({ segments, label, hideLegend, track, tall, subtle, testID, style }: StackedBarProps) {
  const { tokens } = useTheme();
  const rawTotal = segments.reduce((sum, seg) => sum + Math.max(0, Number.isFinite(seg.value) ? seg.value : 0), 0);
  // Floor the divisor at 1 so an all-zero (or empty) bar divides cleanly to 0%
  // widths rather than producing NaN.
  const total = Math.max(1, rawTotal);
  const pct = (v: number) => (Math.max(0, Number.isFinite(v) ? v : 0) / total) * 100;

  // No segments, or every segment zero, both render an empty bar: warn so the
  // developer sees the degenerate input instead of a silently blank strip.
  devWarn(segments.length === 0, "[canvas] <StackedBar />: `segments` is empty; the bar renders empty.");
  // An all-zero bar is a mistake when nothing is drawn for it, and a deliberate
  // state once `track` is set: the rail is there to show a composition of
  // nothing. So the warning speaks only for the trackless case.
  devWarn(
    segments.length > 0 && rawTotal <= 0 && !track,
    "[canvas] <StackedBar />: all segment values are zero and no `track` is set; the bar renders empty.",
  );

  // The accessible name carries the data itself, so a screen reader hears the
  // composition ("Traffic sources: Direct 42%, …"), not a bare "Stacked bar".
  const name = `${label ?? "Stacked bar"}: ${segments.map((seg) => `${seg.label} ${Math.round(pct(seg.value))}%`).join(", ")}`;
  // role="img" makes its whole subtree presentational to assistive tech, which
  // would silence the legend text; so while the legend renders, the image role
  // (and data-bearing name) sits on the plot row only, leaving the legend
  // reachable. With the legend hidden, the root itself is the image.
  const img = { accessibilityRole: "image", accessibilityLabel: name, "aria-label": name } as const;

  return (
    <View testID={testID} style={style} {...(hideLegend ? img : {})}>
      <View
        {...(hideLegend ? {} : img)}
        style={{
          flexDirection: "row",
          overflow: "hidden",
          borderRadius: tall ? STRIP_BAR_RADIUS : 9999,
          height: tall ? STRIP_HEIGHT : 10,
          ...(track ? { backgroundColor: tokens.muted } : {}),
        }}
      >
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              width: `${pct(seg.value)}%`,
              backgroundColor: subtle ? alpha(seriesFill(tokens, i), SUBTLE_ALPHA) : seriesFill(tokens, i),
            }}
          />
        ))}
      </View>
      {hideLegend ? null : (
        <ChartLegend
          items={segments.map((seg, i) => ({
            label: seg.label,
            color: seriesFill(tokens, i),
            detail: `${Math.round(pct(seg.value))}%`,
          }))}
        />
      )}
    </View>
  );
}
