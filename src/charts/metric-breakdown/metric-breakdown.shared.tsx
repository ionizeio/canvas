import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { View, Text, palette, statusHues, devWarn, tabularNums, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { formatCompact } from "../shared/chart-math.js";
import { BreakdownRows, type BreakdownRow } from "../shared/breakdown-rows.js";
import { Sparkline } from "../sparkline/sparkline.js";
import { Chip as WebChip } from "../../atoms/chip/chip.js";

// Shared MetricBreakdown shell. The decomposed-metric dashboard card: a
// preformatted headline value with its caption, an optional secondary rate
// readout top right, an optional trend strip (the kit Sparkline's line
// variant) with a latest-value caption, per-category breakdown rows with
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
  /** Unit suffix on the latest-value caption (e.g. "req/s"). */
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
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
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

/**
 * The components a MetricBreakdown draws with that look different per platform. The web
 * builds are the defaults; the iOS and Android entries pass their own, so the docs'
 * platform columns render them truthfully (a device resolves them by platform either way).
 */
export interface MetricBreakdownParts {
  Chip?: typeof WebChip;
}

export function createMetricBreakdown(skin: ChartSkin, parts: MetricBreakdownParts = {}) {
  const Chip = parts.Chip ?? WebChip;
  return function MetricBreakdown(props: MetricBreakdownProps) {
    const { value, label, rate, rateLabel, sparkUnit, breakdown, chips, chipsLabel, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const surfaceShape = s.surface(tokens, skin.surfaceRadius);
    const glass = isGlass(theme);
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
    // The latest-value caption inherits the rate tone when one is set.
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
          props.plain ? null : paneStyle(theme, surfaceShape),
          props.plain ? null : compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          { gap: sectionGap },
          style,
        ]}
      >
        {/* The chart frame is a CONTENT-layer pane under glass (nothing in solid mode). */}
        {glass && !props.plain ? <GlassPane layer="content" shape={surfaceShape} /> : null}
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

        {/* Reserve a reading row so the caption needs no opaque knockout and
            never hides a trend point, including in plain compositions. */}
        {spark != null ? (
          <View>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ alignSelf: "flex-end", paddingHorizontal: 4 }}
            >
              <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "500", color: tagColor, ...tabularNums() }}>
                {sparkUnit != null && sparkUnit !== "" ? `${formatValue(last)} ${sparkUnit}` : formatValue(last)}
              </Text>
            </View>
            <Sparkline line values={spark} compact={compact} accessibilityLabel={`${label} trend`} />
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
