import { View, Text, useTheme, palette, statusHues, devWarn, tabularNums, type ColorTokens, type StyleProp, type ViewStyle } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { formatCompact } from "../shared/chart-math.js";
import { BreakdownRows, type BreakdownRow } from "../shared/breakdown-rows.js";
import { Sparkline } from "../sparkline/sparkline.js";
import { Chip } from "../../atoms/chip/chip.js";

// Shared MetricBreakdown shell. The decomposed-metric dashboard card: a
// preformatted headline value with its caption, an optional secondary rate
// readout top right, an optional trend strip (the kit Sparkline's line
// variant) with a floating latest-value tag, per-category breakdown rows with
// proportional share bars, and a chip footer for recent notable codes. Every
// section is independently optional; the card renders exactly what it is
// given.
//
// MetricBreakdown is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop API, first-match precedence within an axis:
// - Rate tone (slot-scoped booleans, since the tone colors the `rate` slot,
//   not the card): `rateSuccess` > `rateWarning` > `rateDestructive`; omit
//   all three for the muted default.
// - Per-row color: each breakdown row's chart1..8 slot, else the ramp by
//   index (matching the multi-series charts).
// - Per-chip tone: success > warning > destructive > info; omit for the
//   neutral tag.
// - Density: `compact`. Surface: `plain` strips the card (mirrors Stats).

export type { BreakdownRow } from "../shared/breakdown-rows.js";

export interface MetricBreakdownChip {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** The chip label (e.g. an error code). */
  label: string;
  /** A tally rendered after the label (e.g. how often the code fired). */
  count?: number;
  // Chip tone (pick one; default the neutral tag). Precedence:
  // success > warning > destructive > info (first match wins).
  success?: boolean;
  warning?: boolean;
  destructive?: boolean;
  info?: boolean;
}

export interface MetricBreakdownProps {
  /** The headline figure, preformatted (e.g. "3,771"). */
  value: string;
  /** Small caption under the headline (e.g. "Tokens issued"). */
  label: string;
  /** Secondary metric, top right (e.g. "1.39%"). */
  rate?: string;
  /** Caption under the rate (e.g. "Error rate"). */
  rateLabel?: string;
  // Rate tone (slot-scoped; pick one; default muted). Precedence:
  // rateSuccess > rateWarning > rateDestructive (first match wins).
  rateSuccess?: boolean;
  rateWarning?: boolean;
  rateDestructive?: boolean;
  /** Trend series rendered as a Sparkline line strip under the header.
   *  Needs at least two points to draw. */
  spark?: number[];
  /** Unit suffix on the floating latest-value tag (e.g. "req/s"). */
  sparkUnit?: string;
  /** Per-category rows with proportional share bars. */
  breakdown?: BreakdownRow[];
  /** Footer chips rendered with the kit Chip (e.g. top error codes). */
  chips?: MetricBreakdownChip[];
  /** Leading caption on the chip row (e.g. "Errors"). Omit to hide. */
  chipsLabel?: string;
  /** Formats row values and the spark tag (data formatting, not styling). */
  formatValue?: (v: number) => string;
  // Density (omit for the default spacing).
  compact?: boolean;
  /** Strip the card surface for nesting inside an existing card (mirrors Stats). */
  plain?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// The rate readout's color: the gaugeFill recipe for the toned states, the
// muted foreground otherwise (a rate is contextual until a tone claims it).
// Exported for tests (not re-exported from the barrel).
export function rateColor(tokens: ColorTokens, p: MetricBreakdownProps): string {
  if (p.rateSuccess) return palette["green-500"];
  if (p.rateWarning) return palette[`${statusHues.warning}-500`];
  if (p.rateDestructive) return palette["red-500"];
  return tokens["muted-foreground"];
}


// The uppercase caption under the headline and the rate (11/14 muted).
function captionStyle(tokens: ColorTokens) {
  return {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color: tokens["muted-foreground"],
  };
}

export function createMetricBreakdown(skin: ChartSkin) {
  return function MetricBreakdown(props: MetricBreakdownProps) {
    const { value, label, rate, rateLabel, sparkUnit, breakdown, chips, chipsLabel, testID, style } = props;
    const { tokens } = useTheme();
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;

    // The spark needs two points to draw a trend; a single point is skipped.
    const spark = props.spark != null && props.spark.length > 1 ? props.spark : null;
    devWarn(
      props.spark != null && props.spark.length === 1,
      "[canvas] <MetricBreakdown />: `spark` has a single point; a trend needs at least two, so the strip is not rendered.",
    );
    devWarn(
      (breakdown ?? []).some((r) => Number.isFinite(r.value) && r.value < 0),
      "[canvas] <MetricBreakdown />: a breakdown row's `value` is negative; share bars treat it as 0.",
    );

    const hasRate = (rate != null && rate !== "") || (rateLabel != null && rateLabel !== "");
    const hasRows = breakdown != null && breakdown.length > 0;
    const hasChips = chips != null && chips.length > 0;
    // The chip footer draws its divider only when a section precedes it.
    const chipsDivided = hasChips && (spark != null || hasRows);
    // The floating tag inherits the rate tone when one is set; muted otherwise.
    const tagColor = props.rateSuccess || props.rateWarning || props.rateDestructive ? rateColor(tokens, props) : tokens["muted-foreground"];
    const last = spark != null ? spark[spark.length - 1] : 0;
    const sectionGap = compact ? 10 : 14;

    return (
      <View
        role="group"
        accessibilityLabel={label}
        aria-label={label}
        testID={testID}
        style={[
          props.plain ? null : s.surface(tokens, skin.surfaceRadius),
          props.plain ? null : compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          { gap: sectionGap },
          style,
        ]}
      >
        {/* Header: headline + caption left, rate + caption right. */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text style={{ fontSize: 22, lineHeight: 26, fontWeight: "600", letterSpacing: -0.4, color: tokens["card-foreground"], ...tabularNums() }}>
              {value}
            </Text>
            <Text numberOfLines={1} style={captionStyle(tokens)}>{label}</Text>
          </View>
          {hasRate ? (
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              {rate != null && rate !== "" ? (
                <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: "500", color: rateColor(tokens, props), ...tabularNums() }}>
                  {rate}
                </Text>
              ) : null}
              {rateLabel != null && rateLabel !== "" ? <Text numberOfLines={1} style={captionStyle(tokens)}>{rateLabel}</Text> : null}
            </View>
          ) : null}
        </View>

        {/* Trend strip: the kit Sparkline, with a floating latest-value tag
            knocked out over the line on the opaque card fill (charts are the
            solid content layer, so the knockout holds in glass mode too). */}
        {spark != null ? (
          <View style={{ position: "relative" }}>
            <Sparkline line values={spark} compact={compact} accessibilityLabel={`${label} trend`} style={{ width: "100%" }} />
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ position: "absolute", top: 0, right: 0, backgroundColor: props.plain ? undefined : tokens.card, paddingHorizontal: 4 }}
            >
              <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "500", color: tagColor, ...tabularNums() }}>
                {sparkUnit != null && sparkUnit !== "" ? `${formatValue(last)} ${sparkUnit}` : formatValue(last)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Per-category share rows (share of the visible rows' sum). */}
        {breakdown != null && breakdown.length > 0 ? (
          <BreakdownRows rows={breakdown} share percent={false} tone={null} compact={compact} formatValue={formatValue} />
        ) : null}

        {/* Chip footer, divided from the sections above it. Chip's own color
            scan matches this tier's precedence (success > warning > error >
            info), so the booleans pass straight through; `destructive` maps to
            Chip's `error` name. */}
        {chips != null && chips.length > 0 ? (
          <View
            style={[
              { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
              chipsDivided ? { borderTopWidth: 1, borderColor: tokens.border, paddingTop: compact ? 8 : 10 } : null,
            ]}
          >
            {chipsLabel != null && chipsLabel !== "" ? <Text style={captionStyle(tokens)}>{chipsLabel}</Text> : null}
            {chips.map((chip, i) => (
              <Chip key={chip.id ?? i} success={chip.success} warning={chip.warning} error={chip.destructive} info={chip.info}>
                {chip.count != null ? `${chip.label} · ${chip.count}` : chip.label}
              </Chip>
            ))}
          </View>
        ) : null}
      </View>
    );
  };
}
