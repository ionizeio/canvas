import { View, Text, useTheme, devWarn, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, isGlass } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type Tone } from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { formatCompact } from "../shared/chart-math.js";
import { BreakdownRows, hasSlot, type BreakdownRow } from "../shared/breakdown-rows.js";

// Shared BarList shell. The ranked label/value list (top pages, referrers,
// sources): one row per category with a color swatch, a truncating label, a
// right-aligned value, an optional Stats-style delta, and a proportional track
// bar. Bars size against the largest row by default (the ranking idiom);
// `share` sizes them against the sum and appends percent readouts (the
// composition idiom). Rows become drill-in buttons with `onPressItem`.
//
// BarList complements the bar `Chart`: `Chart horizontal` compares magnitudes
// on a shared axis; BarList is the ranked LIST idiom, with deltas, share
// percents, per-row ramp slots, drill-in presses, and a `plain` mode for
// nesting inside an existing card.
//
// BarList is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop API, first-match precedence within an axis:
// - Tone (single-hue lists; pick one; default is the ramp by index):
//   `success` > `destructive`. A row's chart1..8 slot beats the tone.
// - Basis: `share` sizes bars against the sum, with percent readouts.
// - Density: `compact` tightens the rows.
// - Surface: `plain` strips the card surface for nesting (mirrors Stats).

export type { BreakdownRow } from "../shared/breakdown-rows.js";

export interface BarListProps {
  /** The rows to render, in order. */
  items: BreakdownRow[];
  /** Optional heading shown above the rows. */
  title?: string;
  /** Bars proportional to the sum of all rows, with percent readouts, instead
   *  of relative to the largest row. */
  share?: boolean;
  // Tone (single-hue lists; pick one; default is the ramp by index).
  // Precedence: success > destructive; a row's chartN slot beats the tone.
  success?: boolean;
  destructive?: boolean;
  // Density (omit for the default row spacing).
  compact?: boolean;
  /** Strip the card surface for nesting inside an existing card (mirrors Stats). */
  plain?: boolean;
  /** Formats row values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Rows become tappable drill-in targets when set. */
  onPressItem?: (index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence within the axis, first match wins; no tone means the ramp.
function toneOf(p: BarListProps): Tone | null {
  if (p.success) return "success";
  if (p.destructive) return "destructive";
  return null;
}


export function createBarList(skin: ChartSkin) {
  return function BarList(props: BarListProps) {
    const { items, title, testID, style } = props;
    const theme = useTheme();
    const { tokens } = theme;
    const glass = isGlass(theme);
    const compact = !!props.compact;
    const tone = toneOf(props);
    const formatValue = props.formatValue ?? formatCompact;

    devWarn(items.length === 0, "[canvas] <BarList />: `items` is empty; the list renders with no rows.");
    devWarn(
      items.some((r) => Number.isFinite(r.value) && r.value < 0),
      "[canvas] <BarList />: a row's `value` is negative; proportional bars treat it as 0.",
    );
    devWarn(
      tone != null && items.some(hasSlot),
      "[canvas] <BarList />: a row's chart1..8 slot beats the list tone; drop one of the two.",
    );

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          props.plain ? null : s.surface(tokens, skin.surfaceRadius, glass),
          props.plain ? null : compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {/* The chart frame is a CONTENT-layer pane under glass (nothing in solid mode). */}
        <GlassPane layer="content" shape={{ borderRadius: skin.surfaceRadius }} />
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <BreakdownRows
          rows={items}
          share={!!props.share}
          percent={!!props.share}
          tone={tone}
          compact={compact}
          formatValue={formatValue}
          onPressRow={props.onPressItem}
        />
      </View>
    );
  };
}
