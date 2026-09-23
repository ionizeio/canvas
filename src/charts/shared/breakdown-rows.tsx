import { View, Text, Pressable, useTheme, surfaceRipple, pressDim, tabularNums, type ColorTokens } from "../../style/index.js";
import * as s from "./charts.styles.js";
import { type Tone } from "./charts.styles.js";
import { estimateTextWidth } from "./chart-math.js";
import { deltaTone } from "../../molecules/stats/stats.styles.js";

// The proportional row engine shared by BarList and MetricBreakdown: a column
// of rows, each a color swatch, a truncating label, a right-aligned value, an
// optional Stats-style delta, and a 3px track bar sized to the row's share.
// Kit-internal: consumed by the two card charts, never exported from the
// package barrel (only the BreakdownRow data type ships, via the consumers).

export interface BreakdownRow {
  /** Stable identity, used as the React key when the rows can reorder. */
  id?: string | number;
  /** The category name. Truncates to one line. */
  label: string;
  /** The category's magnitude. Sizes the row's bar. */
  value: number;
  /** Preformatted change indicator (e.g. "+4.2%"). Omit to hide. */
  delta?: string;
  /** Color the delta red (a decline) instead of the default green (a rise). */
  down?: boolean;
  /** Render the delta muted, for a qualifier that is not a change claim
   *  ("last 30 days"). Takes precedence over `down`, matching Stats. */
  steady?: boolean;
  // Color slot from the categorical ramp (pick one; first match wins). Omit
  // for the ramp-by-index default, which matches the multi-series charts.
  chart1?: boolean;
  chart2?: boolean;
  chart3?: boolean;
  chart4?: boolean;
  chart5?: boolean;
  chart6?: boolean;
  chart7?: boolean;
  chart8?: boolean;
}

// Slot precedence, first match wins (the StatItem accent scan).
function slotOf(row: BreakdownRow): string | null {
  if (row.chart1) return "chart-1";
  if (row.chart2) return "chart-2";
  if (row.chart3) return "chart-3";
  if (row.chart4) return "chart-4";
  if (row.chart5) return "chart-5";
  if (row.chart6) return "chart-6";
  if (row.chart7) return "chart-7";
  if (row.chart8) return "chart-8";
  return null;
}

/** True when any per-row color slot is set (the consumers' tone-conflict warn). */
export function hasSlot(row: BreakdownRow): boolean {
  return slotOf(row) != null;
}

/**
 * A row's fill: its own chart slot first, then the component-level tone, then
 * the categorical ramp by index (identity follows the row, never its rank).
 */
export function rowFill(tokens: ColorTokens, row: BreakdownRow, i: number, tone: Tone | null): string {
  const slot = slotOf(row);
  if (slot) return tokens[slot as keyof ColorTokens] as string;
  if (tone) return s.barFill(tokens, tone);
  return s.seriesFill(tokens, i);
}

/**
 * The accessible name for one row: label, formatted value, the share percent
 * when the bar encodes one (the bar is the share's only visual carrier), and
 * the delta with its direction spelled out ("up"/"down"; a steady delta is a
 * qualifier, not a change claim, so it reads verbatim). Pure, exported for
 * tests.
 */
export function rowAccessibleLabel(row: BreakdownRow, sharePct: number | null, fmt: (v: number) => string): string {
  let out = `${row.label}: ${fmt(Number.isFinite(row.value) ? row.value : 0)}`;
  if (sharePct != null) out += `, ${sharePct}% of total`;
  if (row.delta != null && row.delta !== "") {
    out += row.steady ? `, ${row.delta}` : `, ${row.down ? "down" : "up"} ${row.delta}`;
  }
  return out;
}

export interface BreakdownRowsProps {
  rows: BreakdownRow[];
  /** Size bars against the sum of rows (composition) instead of the largest row (ranking). */
  share: boolean;
  /** Append a muted percent readout after each value (BarList's share mode). */
  percent?: boolean;
  /** Component-level tone; null paints the ramp by index. A row's slot beats both. */
  tone: Tone | null;
  compact?: boolean;
  formatValue: (v: number) => string;
  /** Rows become buttons (drill into the category) when set. */
  onPressRow?: (index: number) => void;
}

/** The shared renderer. Each row is one accessible item; the bar is decorative. */
export function BreakdownRows({ rows, share, percent, tone, compact, formatValue, onPressRow }: BreakdownRowsProps) {
  const { tokens } = useTheme();
  // Negative and non-finite values cannot carry a proportional bar; they are
  // treated as 0 (the consumers devWarn).
  const values = rows.map((r) => (Number.isFinite(r.value) && r.value > 0 ? r.value : 0));
  const sum = values.reduce((a, b) => a + b, 0);
  const basis = share ? sum : Math.max(0, ...values);
  // The delta column is sized to the longest delta via the estimator so the
  // column aligns by layout; tabular figures are inconsistent across Android
  // fonts and stay a progressive enhancement.
  const deltas = rows.filter((r) => r.delta != null && r.delta !== "");
  const deltaWidth = deltas.length > 0 ? Math.ceil(Math.max(...deltas.map((r) => estimateTextWidth(r.delta as string, 11)))) + 2 : 0;

  return (
    <View style={{ gap: compact ? 6 : 8 }}>
      {rows.map((row, i) => {
        const v = values[i];
        const widthPct = basis > 0 ? Math.max(0, Math.min(100, (v / basis) * 100)) : 0;
        const sharePct = sum > 0 ? Math.round((v / sum) * 100) : 0;
        const fill = rowFill(tokens, row, i, tone);
        const name = rowAccessibleLabel(row, share ? sharePct : null, formatValue);
        const inner = (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Decorative swatch tying the row to its bar color. */}
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: fill }} />
              <Text numberOfLines={1} style={{ flexGrow: 1, flexShrink: 1, fontSize: 12, lineHeight: 16, color: tokens["card-foreground"] }}>
                {row.label}
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens["card-foreground"], ...tabularNums() }}>
                {formatValue(Number.isFinite(row.value) ? row.value : 0)}
              </Text>
              {percent ? (
                <Text style={{ fontSize: 11, lineHeight: 16, color: tokens["muted-foreground"], ...tabularNums() }}>{sharePct}%</Text>
              ) : null}
              {row.delta != null && row.delta !== "" ? (
                <Text
                  style={[
                    { fontSize: 11, lineHeight: 16, fontWeight: "500", minWidth: deltaWidth, textAlign: "right" },
                    row.steady ? { color: tokens["muted-foreground"] } : deltaTone(tokens, !!row.down),
                  ]}
                >
                  {row.delta}
                </Text>
              ) : null}
            </View>
            {/* The proportional bar: muted track, row-colored fill. Decorative;
                the share reaches AT through the row's name. */}
            <View style={{ height: 3, borderRadius: 999, backgroundColor: tokens.muted, overflow: "hidden" }}>
              <View style={{ height: 3, borderRadius: 999, backgroundColor: fill, width: `${widthPct}%` }} />
            </View>
          </>
        );
        if (onPressRow) {
          return (
            <Pressable
              key={row.id ?? i}
              accessibilityRole="button"
              accessibilityLabel={name}
              aria-label={name}
              onPress={() => onPressRow(i)}
              android_ripple={surfaceRipple(tokens)}
              style={({ pressed }) => [{ gap: 4 }, pressDim(pressed, 0.85)]}
            >
              {inner}
            </Pressable>
          );
        }
        return (
          <View
            key={row.id ?? i}
            accessible
            accessibilityRole="image"
            role="img"
            accessibilityLabel={name}
            aria-label={name}
            style={{ gap: 4 }}
          >
            {inner}
          </View>
        );
      })}
    </View>
  );
}
