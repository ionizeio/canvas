import Svg, { Path } from "react-native-svg";
import { View, Text, useTheme, statusColors, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";

// Gauge is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.

// Gauge: a 180 degree top semicircular arc (muted track + a tone-colored value
// arc), the percent readout sitting in the open center of the semicircle, and
// the optional label below the graphic.

export type GaugeTone = "primary" | "success" | "warning" | "destructive";

export interface GaugeProps {
  /** The value to display, 0–100. */
  value: number;
  /** A short caption beneath the number (e.g. "Uptime"). */
  label?: string;
  // Tone of the fill arc (pick one; default primary). Precedence when several
  // are passed: success > warning > destructive (first match wins).
  primary?: boolean;
  success?: boolean;
  warning?: boolean;
  destructive?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

// Tone precedence within the axis: success > warning > destructive (first match
// wins; no tone falls back to the brand primary). Each tone is its solid status color
// (statusColors' dot), so a warning gauge reads the same as a warning badge or alert.
// Exported for tests (not re-exported from the barrel).
export function gaugeFill(tokens: ColorTokens, p: GaugeProps): string {
  if (p.success) return statusColors(tokens, "success").dot;
  if (p.warning) return statusColors(tokens, "warning").dot;
  if (p.destructive) return statusColors(tokens, "error").dot;
  return tokens.primary;
}

// The graphic is a fixed 120 wide for now (per-instance sizing is a separate,
// deferred capability). The hand-off's semicircle metrics: a 10-wide stroke
// inset 10 from each side, so the arc's radius is half the width minus the
// inset, and the svg extends 12 below the arc baseline to fit the rounded caps.
const SIZE = 120;
const STROKE = 10;
const INSET = 10;
const RADIUS = SIZE / 2 - INSET;
const SEMICIRCUMFERENCE = Math.PI * RADIUS;
const GRAPHIC_HEIGHT = SIZE / 2 + 12;

// Pure semicircle geometry, exported for tests (not re-exported from the
// barrel), following the gaugeFill precedent. The track and value arcs share
// one path (a single 180 degree top sweep from the left end to the right end);
// the value arc reveals its share of the track's length through the dash
// pattern.
export function gaugeArc(v: number): { d: string; dasharray: string } {
  return {
    d: `M ${INSET} ${SIZE / 2} A ${RADIUS} ${RADIUS} 0 0 1 ${SIZE - INSET} ${SIZE / 2}`,
    dasharray: `${SEMICIRCUMFERENCE * (v / 100)} ${SEMICIRCUMFERENCE}`,
  };
}

export function Gauge(props: GaugeProps) {
  const { value, label, testID, style } = props;
  const { tokens } = useTheme();
  // Gauge is a 0–100 dial; an out-of-range value is clamped, but warn so the
  // developer notices the input was outside the supported range.
  devWarn(
    Number.isFinite(value) && (value < 0 || value > 100),
    "[canvas] <Gauge />: `value` is outside 0–100; it is clamped to that range.",
  );
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  // Per the hand-off, the readout shows a whole percent (the display rounds);
  // the arc keeps the fractional value so the fill stays exact. The accessible
  // name announces the same number the eye sees.
  const pct = Math.round(v);
  const fill = gaugeFill(tokens, props);
  const arc = gaugeArc(v);

  return (
    <View
      testID={testID}
      style={[{ width: SIZE, alignItems: "center", gap: 4 }, style]}
      accessibilityRole="image"
      accessibilityLabel={`${label ?? "Gauge"}: ${pct}%`}
      aria-label={`${label ?? "Gauge"}: ${pct}%`}
    >
      <Svg width={SIZE} height={GRAPHIC_HEIGHT} viewBox={`0 0 ${SIZE} ${GRAPHIC_HEIGHT}`}>
        <Path d={arc.d} fill="none" stroke={tokens.muted} strokeWidth={STROKE} strokeLinecap="round" />
        <Path
          d={arc.d}
          fill="none"
          stroke={fill}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={arc.dasharray}
        />
      </Svg>
      {/* The negative margin pulls the readout up into the open center of the
          semicircle; it is the component's own anatomy (per the hand-off), not
          a call-site shim. */}
      <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: "600", letterSpacing: -0.4, color: tokens.foreground, marginTop: -20 }}>{pct}%</Text>
      {label ? <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>{label}</Text> : null}
    </View>
  );
}
