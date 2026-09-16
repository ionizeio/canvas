import { useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Svg, { Line } from "react-native-svg";
import { View, Text, useTheme, FILL, type StyleProp, type ViewStyle } from "../../style/index.js";
import { ScrubSurface } from "./chart-inspect.js";
import { bandScale, estimateTextWidth, formatCompact, linearScale, niceTicks, type Band } from "./chart-math.js";

// The shared cartesian plot frame for the Chart family's SVG types (line,
// area, scatter): it measures its width, sizes a y-axis gutter from the tick
// labels, draws the recessive grid/axis furniture, and hands the mark layer a
// coordinate system. Marks are SVG children rendered inside the frame's Svg;
// every piece of TEXT is a React Native Text positioned from the same
// computed coordinates - never SVG text - so chart type stays on the kit's
// token typography and behaves identically on iOS, Android, and web.
//
// Internal to the kit (not exported from the package barrel).

export interface CartesianLayout {
  /** Plot-area size in px (excludes the y gutter and x-label band). */
  plotW: number;
  plotH: number;
  /** Value -> y px (0 is the plot top). */
  y: (v: number) => number;
  /** Numeric x -> x px (identity of the x domain passed in `xDomain`). */
  x: (v: number) => number;
  /** Categorical band info when `xLabels` drives the x axis. */
  band: Band | null;
  /** The niced y domain and its ticks. */
  yTicks: number[];
  yMin: number;
  yMax: number;
}

export interface CartesianFrameProps {
  /** Raw data extent of the y axis (the frame nices it). */
  yExtent: [number, number];
  /** Categorical x axis: one label per band. Mutually exclusive with xDomain. */
  xLabels?: string[];
  /** Numeric x axis extent (scatter). Mutually exclusive with xLabels. */
  xDomain?: [number, number];
  /** Plot-area height in px (chart component picks it by density). */
  plotHeight: number;
  /**
   * Reserve this many px at the bottom of the plot for a docked companion
   * pane (e.g. candlestick volume): the y scale and its gridlines compress to
   * the region above it, while the plot, baseline, x labels, and scrub keep
   * the full height.
   */
  plotInsetBottom?: number;
  compact?: boolean;
  hideGrid?: boolean;
  hideAxes?: boolean;
  /** Tick/label formatter (defaults to compact "1.2k" notation). */
  formatValue?: (v: number) => string;
  /** The SVG mark layer, given the computed coordinate system. */
  children: (layout: CartesianLayout) => ReactNode;
  /** Optional RN layer absolutely positioned over the plot (tooltips, flags). */
  overlay?: (layout: CartesianLayout) => ReactNode;
  /**
   * Scrub-to-inspect: SET the selection to the band under the press/drag
   * (null clears, from a stationary tap on the selected band). The hit layer
   * is a responder-based ScrubSurface over the plot - never an SVG touchable,
   * whose web path leaks RN responder props onto DOM nodes.
   */
  onBandScrub?: (index: number | null) => void;
  /** Draw the selection guide through this category band. */
  selectedBand?: number | null;
}

// Space above the plot so the top tick's label (centered on the top gridline)
// is not clipped by the frame's edge.
const TOP_PAD = 8;
// Height of the x-label band under the plot.
const X_BAND = 20;
// Tick label typography (the token text-xs step).
const LABEL_SIZE = 12;
const LABEL_LINE = 16;

export function CartesianFrame(props: CartesianFrameProps) {
  const { yExtent, xLabels, xDomain, plotHeight, compact, hideGrid, hideAxes, children, overlay, onBandScrub, selectedBand } = props;
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);

  const formatValue = props.formatValue ?? formatCompact;
  const tickCount = compact ? 3 : 5;
  const { ticks, niceMin, niceMax } = niceTicks(yExtent[0], yExtent[1], tickCount);

  // Y gutter: widest tick label (estimated - RN has no synchronous text
  // measurement) plus breathing room, clamped so an extreme label cannot eat
  // the plot. Hidden axes drop the gutter entirely.
  const labels = ticks.map(formatValue);
  const widest = labels.reduce((m, l) => Math.max(m, estimateTextWidth(l, LABEL_SIZE)), 0);
  const gutter = hideAxes ? 0 : Math.min(64, Math.max(24, Math.ceil(widest) + 8));

  const plotW = Math.max(0, width - gutter);
  const plotH = plotHeight;
  const inset = Math.max(0, Math.min(props.plotInsetBottom ?? 0, plotH - 24));

  const y = linearScale(niceMin, niceMax, plotH - inset, 0);

  // X axis: categorical equal bands (labels centered under each band) or a
  // niced numeric domain (scatter).
  const band: Band | null = xLabels ? bandScale(xLabels.length, 0, plotW, 0, 0) : null;
  const xTicksInfo = xDomain ? niceTicks(xDomain[0], xDomain[1], compact ? 3 : 5) : null;
  const x = xTicksInfo ? linearScale(xTicksInfo.niceMin, xTicksInfo.niceMax, 0, plotW) : (v: number) => v;

  const layout: CartesianLayout = { plotW, plotH, y, x, band, yTicks: ticks, yMin: niceMin, yMax: niceMax };

  // Categorical labels collide on narrow plots: render every kth label so a
  // label never overflows its band step.
  let xLabelStep = 1;
  if (xLabels && band && xLabels.length > 0 && band.step > 0) {
    const widestX = xLabels.reduce((m, l) => Math.max(m, estimateTextWidth(l, LABEL_SIZE)), 0);
    xLabelStep = Math.max(1, Math.ceil((widestX + 6) / band.step));
  }

  const ready = width > 0 && plotW > 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
      <View style={{ height: TOP_PAD + plotH + (hideAxes ? 0 : X_BAND) }}>
        {ready ? (
          <>
            {/* Y tick labels, right-aligned in the gutter, centered on their gridline. */}
            {!hideAxes
              ? ticks.map((t, i) => (
                  <Text
                    key={`yl${i}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      width: gutter - 8,
                      top: TOP_PAD + y(t) - LABEL_LINE / 2,
                      textAlign: "right",
                      fontSize: LABEL_SIZE,
                      lineHeight: LABEL_LINE,
                      color: tokens["muted-foreground"],
                    }}
                    numberOfLines={1}
                  >
                    {labels[i]}
                  </Text>
                ))
              : null}

            {/* The plot: gridlines, baseline, then the mark layer. */}
            <View style={{ position: "absolute", left: gutter, top: TOP_PAD, width: plotW, height: plotH }}>
              <Svg width={plotW} height={plotH}>
                {!hideGrid
                  ? ticks.map((t, i) => (
                      <Line key={`g${i}`} x1={0} y1={y(t)} x2={plotW} y2={y(t)} stroke={tokens.border} strokeWidth={1} strokeDasharray="4,4" />
                    ))
                  : null}
                {/* Vertical gridlines only on a numeric x axis (scatter). */}
                {!hideGrid && xTicksInfo
                  ? xTicksInfo.ticks.map((t, i) => (
                      <Line key={`gv${i}`} x1={x(t)} y1={0} x2={x(t)} y2={plotH} stroke={tokens.border} strokeWidth={1} strokeDasharray="4,4" />
                    ))
                  : null}
                {/* Baseline hairline, kept even when the grid is hidden. */}
                {!hideAxes ? <Line x1={0} y1={plotH - 0.5} x2={plotW} y2={plotH - 0.5} stroke={tokens.border} strokeWidth={1} /> : null}
                {/* Selection guide through the inspected category. */}
                {selectedBand != null && band ? (
                  <Line x1={band.center(selectedBand)} y1={0} x2={band.center(selectedBand)} y2={plotH} stroke={tokens.border} strokeWidth={1} />
                ) : null}
                {children(layout)}
              </Svg>
              {/* Scrub-to-inspect hit layer, presentational (the plot's
                  accessible name already carries the data). */}
              {onBandScrub && band && xLabels && xLabels.length > 0 && band.step > 0 ? (
                <ScrubSurface
                  indexAt={(x) => Math.max(0, Math.min(xLabels.length - 1, Math.floor(x / band.step)))}
                  selected={selectedBand ?? null}
                  onScrub={onBandScrub}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              {overlay ? overlay(layout) : null}
            </View>

            {/* X labels: band-centered (categorical) or tick-positioned (numeric).
                A thinned label spans its whole stride (band.step * xLabelStep)
                centered on its band, so on a dense axis it has room to read in
                full instead of truncating to one narrow band's width. */}
            {!hideAxes && xLabels && band
              ? xLabels.map((label, i) => {
                  if (i % xLabelStep !== 0) return null;
                  const slot = band.step * xLabelStep;
                  return (
                    <Text
                      key={`xl${i}`}
                      style={{
                        position: "absolute",
                        left: gutter + band.center(i) - slot / 2,
                        width: slot,
                        top: TOP_PAD + plotH + 4,
                        textAlign: "center",
                        fontSize: LABEL_SIZE,
                        lineHeight: LABEL_LINE,
                        color: tokens["muted-foreground"],
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  );
                })
              : null}
            {!hideAxes && xTicksInfo
              ? xTicksInfo.ticks.map((t, i) => (
                  <Text
                    key={`xt${i}`}
                    style={{
                      position: "absolute",
                      left: gutter + x(t) - 30,
                      width: 60,
                      top: TOP_PAD + plotH + 4,
                      textAlign: "center",
                      fontSize: LABEL_SIZE,
                      lineHeight: LABEL_LINE,
                      color: tokens["muted-foreground"],
                    }}
                    numberOfLines={1}
                  >
                    {formatValue(t)}
                  </Text>
                ))
              : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The chart-root nature shared by the SVG chart types: a chart is FILL. It spans
 * the parent it is given (a Container step, a Row span, a Card body) and the
 * geometry measures that width; it never carries a standard width of its own.
 */
export const CHART_ROOT: ViewStyle = FILL;
