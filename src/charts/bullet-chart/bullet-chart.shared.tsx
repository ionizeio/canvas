import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { View, Text, alpha, devWarn, tabularNums, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { formatCompact } from "../shared/chart-math.js";

// Shared BulletChart shell. The goal-attainment rows: per datum a leading
// label, a track holding qualitative background bands (ascending `ranges`
// bounds in fading washes), the measure bar, and an absolute target tick,
// then the trailing formatted value. Following the classic bullet-graph
// anatomy, each row carries its OWN scale (goals rarely share units); pass
// `max` to force one shared scale when they do. Each row is one accessible
// item composing value and target.
//
// BulletChart is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop API, first-match precedence within an axis:
// - Measure tone (pick one; default primary): success > destructive.
// - Density: `compact` tightens the rows and thins the bars.

export interface BulletDatum {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** The row label (e.g. "Revenue"). */
  label: string;
  /** The measured value; sizes the bar. */
  value: number;
  /** The goal, drawn as a vertical tick over the track. */
  target?: number;
  /** Ascending qualitative band bounds (e.g. [150, 250, 350]); each band
   *  paints a fading muted wash behind the measure. */
  ranges?: number[];
}

export interface BulletChartProps {
  /** The rows to render, in order, each on its own scale. */
  data: BulletDatum[];
  /** Optional heading shown above the rows. */
  title?: string;
  /** Force one scale maximum shared by every row (only when the rows share a
   *  unit). Omit for the default per-row scale: each row's largest value,
   *  target, or range bound. */
  max?: number;
  // Measure tone (pick one; default primary). Precedence: success > destructive.
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default row spacing).
  compact?: boolean;
  /** Formats row values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence within the axis, first match wins.
function toneOf(p: BulletChartProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return "primary";
}

// Band washes, outermost (best) to innermost: fading muted alphas.
const BAND_ALPHAS = [0.35, 0.22, 0.12, 0.07];

export function createBulletChart(skin: ChartSkin) {
  return function BulletChart(props: BulletChartProps) {
    const { data, title, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const tone = toneOf(props);
    const formatValue = props.formatValue ?? formatCompact;
    const fill = s.barFill(tokens, tone);

    devWarn(data.length === 0, "[canvas] <BulletChart />: `data` is empty; the chart renders with no rows.");
    devWarn(
      data.some((d) => d.ranges != null && d.ranges.some((r, i) => i > 0 && r < (d.ranges as number[])[i - 1])),
      "[canvas] <BulletChart />: `ranges` must ascend; out-of-order bounds draw overlapping bands.",
    );

    // Per-row scales (the bullet-graph anatomy), unless the caller forces one
    // shared max because the rows genuinely share a unit.
    const rowPool = (d: BulletDatum): number[] => [
      Number.isFinite(d.value) ? d.value : 0,
      ...(d.target != null && Number.isFinite(d.target) ? [d.target] : []),
      ...(d.ranges ?? []).filter((r) => Number.isFinite(r)),
    ];
    const rowMax = (d: BulletDatum): number =>
      props.max != null && props.max > 0 ? props.max : Math.max(1, ...rowPool(d));
    devWarn(
      props.max != null && data.some((d) => rowPool(d).some((v) => v > (props.max as number))),
      "[canvas] <BulletChart />: a value, target, or range bound exceeds `max`; it is clamped to the scale.",
    );
    const pctOf = (v: number, max: number): number => Math.max(0, Math.min(100, ((Number.isFinite(v) ? v : 0) / max) * 100));

    const barH = compact ? 8 : 12;
    const trackH = compact ? 16 : 22;

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
        <View style={{ gap: compact ? 8 : 12 }}>
          {data.map((d, i) => {
            const max = rowMax(d);
            const name = `${d.label}: ${formatValue(Number.isFinite(d.value) ? d.value : 0)}${
              d.target != null && Number.isFinite(d.target) ? ` of target ${formatValue(d.target)}` : ""
            }`;
            return (
              <View
                key={d.id ?? i}
                accessible
                accessibilityRole="image"
                role="img"
                accessibilityLabel={name}
                aria-label={name}
                style={s.horizontalRow}
              >
                <Text numberOfLines={1} style={s.horizontalLabel(tokens)}>{d.label}</Text>
                {/* The track: bands under the measure bar under the target
                    tick. Bands paint widest (lightest) first so the narrower,
                    denser washes sit on top of them. */}
                <View style={[s.horizontalTrack, { height: trackH, alignItems: "center" }]}>
                  {(d.ranges ?? [])
                    .map((bound, bi) => ({ bound, wash: BAND_ALPHAS[Math.min(bi, BAND_ALPHAS.length - 1)] }))
                    .reverse()
                    .map((band, ri) => (
                      <View
                        key={ri}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${pctOf(band.bound, max)}%`,
                          backgroundColor: alpha(tokens["muted-foreground"], band.wash),
                          borderRadius: 2,
                        }}
                      />
                    ))}
                  <View style={{ position: "absolute", left: 0, top: (trackH - barH) / 2, height: barH, width: `${pctOf(d.value, max)}%`, backgroundColor: fill, borderTopEndRadius: skin.barRadius, borderBottomEndRadius: skin.barRadius }} />
                  {d.target != null && Number.isFinite(d.target) ? (
                    <View style={{ position: "absolute", left: `${pctOf(d.target, max)}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: tokens["card-foreground"] }} />
                  ) : null}
                </View>
                <Text style={[s.horizontalValue(tokens), { ...tabularNums() }]}>{formatValue(Number.isFinite(d.value) ? d.value : 0)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };
}
