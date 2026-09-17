import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { G, Line, Path, Rect } from "react-native-svg";
import { View, Text, useControllableState, alpha, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSeries, type ChartSkin } from "../shared/types.js";
import { CartesianFrame, CHART_ROOT, type CartesianLayout } from "../shared/chart-frame.js";
import { ChartLegend } from "../shared/chart-legend.js";
import { ChartValueFlag, announceSelection, DIM_OPACITY } from "../shared/chart-inspect.js";
import { DENSE_SERIES, formatCompact, linePath, linearScale } from "../shared/chart-math.js";

// CandlestickChart: the trading instrument view. OHLC candles (a body between
// open and close, a wick between high and low) colored by direction from the
// kit's success/destructive tokens, an optional docked volume pane sharing the
// x axis, and optional overlay series (moving averages) in the chart-1..8
// token colors. A "Shared" platform treatment like the rest of the family.

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlestickChartProps {
  /** Period labels along the x axis, one per candle. */
  labels: string[];
  /** One OHLC candle per label. */
  candles: Candle[];
  /** Optional volume per candle, drawn as a docked pane under the price plot. */
  volume?: number[];
  /** Optional overlay series (e.g. moving averages), colored by the chart-1..8 tokens (or an overlay's own `success`/`destructive` tone). */
  overlays?: ChartSeries[];
  /** Optional heading shown above the plot. */
  title?: string;
  /** Y-axis overrides. Defaults to nice bounds around the lows/highs (not zero-based). */
  max?: number;
  min?: number;
  // Density (omit for the default plot size).
  compact?: boolean;
  // Furniture visibility (legend lists the overlays when present).
  hideLegend?: boolean;
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Formats tick labels and accessible values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Scrub-to-inspect: the selected candle index (controlled). Pass null for none. */
  selected?: number | null;
  /** Scrub-to-inspect: the initially selected candle (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press/scrub selects a candle (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

const PLOT_HEIGHT = { default: 220, compact: 150 } as const;
const VOLUME_PANE = { default: 40, compact: 26 } as const;

const num = (v: number | undefined): number => (Number.isFinite(v) ? (v as number) : 0);

function candleColor(tokens: ColorTokens, c: Candle): string {
  return c.close >= c.open ? tokens.success : tokens.destructive;
}

/** Build a CandlestickChart from a platform skin. */
export function createCandlestickChart(skin: ChartSkin) {
  return function CandlestickChart(props: CandlestickChartProps) {
    const { labels, candles, volume, overlays = [], title, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;

    devWarn(candles.length === 0, "[canvas] <CandlestickChart />: `candles` is empty; the chart renders with no candles.");
    devWarn(
      candles.length !== labels.length,
      "[canvas] <CandlestickChart />: `candles` length differs from `labels`; extra entries are ignored.",
    );
    devWarn(
      volume != null && volume.length !== labels.length,
      "[canvas] <CandlestickChart />: `volume` length differs from `labels`; missing values are treated as 0.",
    );
    devWarn(
      overlays.some((sr) => sr.values.length !== labels.length),
      "[canvas] <CandlestickChart />: an overlay's `values` length differs from `labels`; missing values are treated as 0.",
    );
    // Price extent from lows/highs plus any overlays; never forced through 0.
    const count = Math.min(labels.length, candles.length);
    const lows = candles.slice(0, count).map((c) => num(c.low));
    const highs = candles.slice(0, count).map((c) => num(c.high));
    const overlayValues = overlays.flatMap((sr) => labels.map((_, i) => num(sr.values[i])));
    const dataMin = Math.min(...(lows.length ? lows : [0]), ...(overlayValues.length ? overlayValues : [Infinity]));
    const dataMax = Math.max(...(highs.length ? highs : [1]), ...(overlayValues.length ? overlayValues : [-Infinity]));
    const yExtent: [number, number] = [props.min ?? dataMin, props.max ?? dataMax];

    const maxVolume = Math.max(1, ...(volume ?? []).map(num));
    const volumePane = volume ? VOLUME_PANE[compact ? "compact" : "default"] : 0;

    // The accessible name carries every candle's OHLC (and volume), per the
    // chart a11y contract. A dense chart summarizes the period instead: listing
    // 30+ candles' OHLC is unusable to a screen reader, so it names the range,
    // endpoints, and extremes (scrubbing still announces the focused candle).
    let name: string;
    if (count > DENSE_SERIES) {
      const closes = candles.slice(0, count).map((c) => num(c.close));
      name = `${title ?? "Candlestick chart"}: ${count} periods from ${labels[0]} to ${labels[count - 1]}, open ${formatValue(num(candles[0].open))}, close ${formatValue(closes[count - 1])}, low ${formatValue(Math.min(...lows))}, high ${formatValue(Math.max(...highs))}`;
    } else {
      name = labels
        .slice(0, count)
        .map((l, i) => {
          const c = candles[i];
          const vol = volume ? `, volume ${formatValue(num(volume[i]))}` : "";
          return `${l} open ${formatValue(num(c.open))}, high ${formatValue(num(c.high))}, low ${formatValue(num(c.low))}, close ${formatValue(num(c.close))}${vol}`;
        })
        .join("; ");
    }

    // Scrub-to-inspect selection; announcements mirror the flag.
    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      if (i === selected) return;
      setSelectedRaw(i);
      if (i != null && i < count) {
        const c = candles[i];
        announceSelection(
          `${labels[i]}: open ${formatValue(num(c.open))}, high ${formatValue(num(c.high))}, low ${formatValue(num(c.low))}, close ${formatValue(num(c.close))}`,
        );
      }
    };

    const marks = (layout: CartesianLayout) => {
      const band = layout.band!;
      const bodyW = Math.max(3, Math.min(14, band.step * 0.55));
      const volY = linearScale(0, maxVolume, 0, Math.max(0, volumePane - 6));
      return (
        <>
          {/* Volume pane, docked under the price region. */}
          {volume
            ? labels.slice(0, count).map((_, i) => {
                const h = Math.max(1, volY(num(volume[i])));
                return (
                  <Rect
                    key={`v${i}`}
                    x={band.center(i) - bodyW / 2}
                    y={layout.plotH - h}
                    width={bodyW}
                    height={h}
                    fill={alpha(candleColor(tokens, candles[i]), 0.35)}
                    opacity={selected != null && selected !== i ? DIM_OPACITY : 1}
                  />
                );
              })
            : null}
          {/* Candles: wick then body. */}
          {candles.slice(0, count).map((c, i) => {
            const color = candleColor(tokens, c);
            const cx = band.center(i);
            const yTop = layout.y(Math.max(num(c.open), num(c.close)));
            const yBottom = layout.y(Math.min(num(c.open), num(c.close)));
            const dim = selected != null && selected !== i ? DIM_OPACITY : 1;
            return (
              <G key={`c${i}`} opacity={dim}>
                <Line x1={cx} y1={layout.y(num(c.high))} x2={cx} y2={layout.y(num(c.low))} stroke={color} strokeWidth={1.5} />
                <Rect x={cx - bodyW / 2} y={yTop} width={bodyW} height={Math.max(1, yBottom - yTop)} fill={color} rx={1} />
              </G>
            );
          })}
          {/* Overlay series (e.g. moving averages). */}
          {overlays.map((sr, i) => (
            <Path
              key={`o${sr.id ?? i}`}
              d={linePath(labels.slice(0, count).map((_, j) => ({ x: band.center(j), y: layout.y(num(sr.values[j])) })))}
              stroke={s.seriesColor(tokens, sr, i)}
              strokeWidth={1.5}
              fill="none"
              strokeLinejoin="round"
            />
          ))}
        </>
      );
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
            xLabels={labels.slice(0, count)}
            plotHeight={PLOT_HEIGHT[compact ? "compact" : "default"]}
            plotInsetBottom={volumePane}
            compact={compact}
            hideGrid={props.hideGrid}
            hideAxes={props.hideAxes}
            formatValue={formatValue}
            selectedBand={selected}
            onBandScrub={setSelected}
            overlay={(layout) =>
              selected != null && selected < count && layout.band ? (
                <ChartValueFlag
                  title={labels[selected]}
                  rows={[
                    { label: "Open", value: formatValue(num(candles[selected].open)) },
                    { label: "High", value: formatValue(num(candles[selected].high)) },
                    { label: "Low", value: formatValue(num(candles[selected].low)) },
                    { label: "Close", value: formatValue(num(candles[selected].close)) },
                    ...(volume ? [{ label: "Vol", value: formatValue(num(volume[selected])) }] : []),
                  ]}
                  x={layout.band.center(selected)}
                  plotW={layout.plotW}
                />
              ) : null
            }
          >
            {marks}
          </CartesianFrame>
        </View>

        {overlays.length > 0 && !props.hideLegend ? (
          <ChartLegend horizontal items={overlays.map((sr, i) => ({ label: sr.label, color: s.seriesColor(tokens, sr, i) }))} />
        ) : null}
      </View>
    );
  };
}
