import Svg, { Path } from "react-native-svg";
import { View, Text, useTheme, statusColors, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";

// ProgressRing is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
//
// ProgressRing: the full-circle counterpart to the semicircular Gauge. A
// muted track ring, a tone-colored value arc revealed clockwise from 12
// o'clock with rounded caps, the percent readout centered inside the ring,
// and the optional label below the graphic. The API mirrors Gauge exactly:
// same value contract, same tone axis, same rounding split.

export interface ProgressRingProps {
  /** The value to display, 0-100. */
  value: number;
  /** A short caption beneath the number (e.g. "Complete"). */
  label?: string;
  // Tone of the value arc (pick one; default primary). Precedence when
  // several are passed: success > warning > destructive (first match wins).
  primary?: boolean;
  success?: boolean;
  warning?: boolean;
  destructive?: boolean;
  // Density (omit for the default 120 diameter; compact is 96).
  compact?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

// Tone precedence within the axis: success > warning > destructive (first
// match wins; no tone falls back to the brand primary). Identical to the
// Gauge recipe so the two dials always agree. Exported for tests (not
// re-exported from the barrel).
export function ringFill(tokens: ColorTokens, p: ProgressRingProps): string {
  if (p.success) return statusColors(tokens, "success").dot;
  if (p.warning) return statusColors(tokens, "warning").dot;
  if (p.destructive) return statusColors(tokens, "error").dot;
  return tokens.primary;
}

// The ring metrics per density: the graphic is a fixed square (per-instance
// sizing is a separate, deferred capability, as on Gauge), a 10-wide stroke
// inset so the rounded caps stay inside the viewBox.
const SIZE = { default: 120, compact: 96 } as const;
const STROKE = 10;
const INSET = 10;

// Pure ring geometry, exported for tests (not re-exported from the barrel),
// following the gaugeArc precedent. An SVG circle's dash origin sits at 3
// o'clock, so the ring is a stroked PATH instead: two half arcs starting at
// 12 o'clock and sweeping clockwise, making the dash reveal start at the top.
// The track and value arcs share the path; the value arc reveals its share of
// the circumference through the dash pattern.
export function ringDash(v: number, size: number = SIZE.default): { d: string; dasharray: string } {
  const r = size / 2 - INSET;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  return {
    // Top center, clockwise half to the bottom center, and back up.
    d: `M ${cx} ${INSET} A ${r} ${r} 0 0 1 ${cx} ${size - INSET} A ${r} ${r} 0 0 1 ${cx} ${INSET}`,
    dasharray: `${circumference * (v / 100)} ${circumference}`,
  };
}

export function ProgressRing(props: ProgressRingProps) {
  const { value, label, testID, style } = props;
  const { tokens } = useTheme();
  const size = props.compact ? SIZE.compact : SIZE.default;
  // A 0-100 dial; an out-of-range value is clamped, but warn so the developer
  // notices the input was outside the supported range.
  devWarn(
    Number.isFinite(value) && (value < 0 || value > 100),
    "[canvas] <ProgressRing />: `value` is outside 0-100; it is clamped to that range.",
  );
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  // The readout shows a whole percent (the display rounds); the arc keeps the
  // fractional value so the fill stays exact. The accessible name announces
  // the same number the eye sees. Identical to the Gauge split.
  const pct = Math.round(v);
  const fill = ringFill(tokens, props);
  const arc = ringDash(v, size);

  return (
    <View
      testID={testID}
      style={[{ width: size, alignItems: "center", gap: 4 }, style]}
      accessibilityRole="image"
      accessibilityLabel={`${label ?? "Progress"}: ${pct}%`}
      aria-label={`${label ?? "Progress"}: ${pct}%`}
    >
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
          <Path d={arc.d} fill="none" stroke={tokens.muted} strokeWidth={STROKE} strokeLinecap="round" />
          <Path d={arc.d} fill="none" stroke={fill} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={arc.dasharray} />
        </Svg>
        {/* The readout sits in the ring's open center. */}
        <Text style={{ fontSize: props.compact ? 20 : 24, lineHeight: props.compact ? 24 : 28, fontWeight: "600", letterSpacing: -0.4, color: tokens.foreground }}>
          {pct}%
        </Text>
      </View>
      {label ? <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>{label}</Text> : null}
    </View>
  );
}
