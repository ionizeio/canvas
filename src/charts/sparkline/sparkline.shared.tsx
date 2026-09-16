import { useId, useState } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { View, useTheme, alpha, palette, devWarn, FILL, type ColorTokens, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { type SparklineSkin } from "./sparkline.styles.js";

// Shared Sparkline shell. A compact trend strip that plots a series of values,
// so no call site hand-composes a row of `flexGrow` + `height` +
// `backgroundColor` Views to draw an inline trend (the recurring stat-card /
// dashboard sparkline). Pass `values`; the component sizes each mark against
// the series and paints the tone.
//
// The look follows the standard sparkline anatomy: the series renders in a
// soft de-emphasis wash of the tone while the latest period carries the full
// accent (the last bar, or the line's end marker), bars round at the data end
// and stay square at the baseline, and the line variant grounds itself with a
// gradient area wash that fades toward the baseline.
//
// Sparkline is a "Shared" platform treatment: a token-colored trend strip is
// identical on iOS, Android, and the web, so the three skins carry the same
// bar radius / gap / heights.

export type Tone = "primary" | "success" | "destructive" | "muted";
export type Size = "compact" | "default" | "tall";

export interface SparklineProps {
  /** The series to plot; each value becomes one bar, sized against the max. */
  values: number[];
  // Tone (pick one; default `primary`). Colors the marks.
  primary?: boolean;
  success?: boolean;
  destructive?: boolean;
  muted?: boolean;
  // Height (pick one; default medium).
  compact?: boolean;
  tall?: boolean;
  /** A continuous 2px trend line with an area wash and end marker, instead of the bar strip. */
  line?: boolean;
  /** Paint the plot area with the muted track, giving the strip a visible frame.
   *
   *  Two things it buys: a flat or all-zero series reads as a chart sitting at
   *  zero rather than as one that failed to load, and a row of strips scans
   *  evenly because every one of them holds the same band whatever its data. Use
   *  it wherever strips sit side by side (a Stats row); a lone sparkline inside
   *  running text is usually better without. */
  track?: boolean;
  /** Accessible summary (e.g. "requests, last 11 days"). */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only (e.g. maxWidth); not a styling escape hatch. */
  style?: LayoutStyle;
}

function toneOf(p: SparklineProps): Tone {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  if (p.muted) return "muted";
  return "primary";
}

function sizeOf(p: SparklineProps): Size {
  if (p.compact) return "compact";
  if (p.tall) return "tall";
  return "default";
}

// A data-derived accessible name for a sparkline that has no explicit
// `accessibilityLabel`, so it never ships as an unnamed `role="img"` (WCAG 1.1.1).
// Summarizes the series by count, range, and latest value.
function fallbackLabel(values: number[]): string {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return "Sparkline: no data";
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const latest = finite[finite.length - 1];
  return `Sparkline: ${finite.length} points, from ${fmt(min)} to ${fmt(max)}, latest ${fmt(latest)}`;
}

// The solid tone color; washes derive from it via `alpha`.
function toneColor(tokens: ColorTokens, tone: Tone): string {
  switch (tone) {
    case "primary":
      return tokens.primary;
    case "success":
      return palette["green-500"];
    case "destructive":
      return tokens.destructive;
    case "muted":
      return tokens["muted-foreground"];
  }
}

/** Build a Sparkline from a platform skin. */
export function createSparkline(skin: SparklineSkin) {
  return function Sparkline(props: SparklineProps) {
    const { values, accessibilityLabel, testID, style } = props;
    const { tokens } = useTheme();
    const tone = toneOf(props);
    const plot = skin.height[sizeOf(props)];
    const base = toneColor(tokens, tone);
    // The series sits in a de-emphasis wash; the latest period carries the
    // accent. Muted stays muted: even its accent is a wash, just a denser one.
    const rest = alpha(base, tone === "muted" ? 0.25 : 0.35);
    const accent = tone === "muted" ? alpha(base, 0.75) : base;
    // Always carry an accessible name: the caller's, else a summary of the data.
    const label = accessibilityLabel ?? fallbackLabel(values);

    // No values means no bars: warn so an empty series is not mistaken for a
    // flat trend.
    devWarn(values.length === 0, "[canvas] <Sparkline />: `values` is empty; the strip renders with no bars.");

    // Bar height maps its value against the series max (finite values only), with
    // a 2px floor so a zero/empty bucket still reads as a bar.
    const finite = values.filter((v) => Number.isFinite(v));
    const max = Math.max(1, ...finite);

    // The bars grow with `flexGrow`, so the strip needs a definite width or they
    // collapse to 0 and render blank: the strip is FILL (src/style/sizing.ts) and
    // takes the bounds its parent provides (a Stats item, a Container step).
    const root: ViewStyle = { flexDirection: "row", alignItems: "flex-end", gap: skin.gap, height: plot, ...FILL };
    // The frame sits on the root, so it holds the band in both variants and the
    // marks draw over it. Same radius as a bar's data end, so the band and what
    // it holds read as one shape.
    if (props.track) {
      root.backgroundColor = tokens.muted;
      root.borderRadius = skin.barRadius;
    }

    // The accent marks the latest real period: the last FINITE value, so a
    // trailing missing bucket never wears the accent (which would contradict
    // the accessible name's "latest").
    let accentIndex = -1;
    for (let i = values.length - 1; i >= 0; i--) {
      if (Number.isFinite(values[i])) {
        accentIndex = i;
        break;
      }
    }

    // The line variant plots one continuous 2px trend line over a gradient
    // area wash, with an accent dot marking the latest point; it needs a
    // measured pixel width (the bar strip flexes instead). SVG gradient ids
    // resolve document-wide on the web, so each instance mints its own.
    const [lineWidth, setLineWidth] = useState(0);
    const gradientId = `canvas-sparkline-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    if (props.line) {
      const dotR = 3;
      const pad = dotR + 1; // room for the end marker and half the stroke, so nothing clips
      const min = Math.min(...(finite.length ? finite : [0]));
      const lineMax = Math.max(...(finite.length ? finite : [0]));
      const span = lineMax - min;
      const points = values.map((v, i) => {
        const value = Number.isFinite(v) ? v : min;
        const x = values.length > 1 ? (i / (values.length - 1)) * (lineWidth - pad * 2) + pad : lineWidth / 2;
        // A flat (or single-value) series sits mid-strip instead of hugging an edge.
        const y = span > 0 ? plot - pad - ((value - min) / span) * (plot - pad * 2) : plot / 2;
        return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
      });
      const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
      // The wash: the line's silhouette closed down to the strip's bottom edge.
      // Guarded so an empty series renders the named empty strip, never throws.
      const areaPath =
        points.length > 0 ? `${linePath} L${points[points.length - 1].x},${plot} L${points[0].x},${plot} Z` : "";
      const marker = accentIndex >= 0 ? points[accentIndex] : null;
      return (
        <View
          role="img"
          accessibilityLabel={label}
          aria-label={label}
          testID={testID}
          onLayout={(e) => setLineWidth(e.nativeEvent.layout.width)}
          style={[root, style]}
        >
          {lineWidth > 0 && values.length > 0 ? (
            <Svg width={lineWidth} height={plot}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={base} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={base} stopOpacity={0.02} />
                </LinearGradient>
              </Defs>
              {values.length > 1 ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              <Path d={linePath} stroke={accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {marker ? <Circle cx={marker.x} cy={marker.y} r={dotR} fill={accent} /> : null}
            </Svg>
          ) : null}
        </View>
      );
    }

    return (
      <View
        role="img"
        accessibilityLabel={label}
        aria-label={label}
        testID={testID}
        style={[root, style]}
      >
        {values.map((v, i) => {
          const value = Number.isFinite(v) ? v : 0;
          const h = Math.max(2, Math.round((value / max) * plot));
          return (
            <View
              key={i}
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: "0%",
                // Rounded at the data end, square at the baseline.
                borderTopLeftRadius: skin.barRadius,
                borderTopRightRadius: skin.barRadius,
                backgroundColor: i === accentIndex ? accent : rest,
                height: h,
              }}
            />
          );
        })}
      </View>
    );
  };
}
