import { View, Text, Pressable, useTheme, surfaceRipple, pressDim, devWarn, tabularNums, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { StatusStrip, statusColor, statusSummary, type UptimePeriod, type PeriodStatus } from "../shared/status-strip.js";

// Shared ServiceHealthList shell. The status-overview card: one row per
// service with a status dot, the service name, an optional right-aligned
// detail ("99.98% uptime"), and, when the item carries `periods`, an embedded
// mini uptime strip on a second line. It shares the strip renderer with
// UptimeBar, so the two never drift.
//
// ServiceHealthList is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop API, first-match precedence within an axis:
// - Per-item status: `down` > `degraded` (first match wins; an unmarked
//   service is operational).
// - Density: `compact` hides the embedded strips and tightens the rows.
// - Surface: `plain` strips the card surface for nesting (mirrors Stats).

export type { UptimePeriod } from "../shared/status-strip.js";

export interface ServiceHealthItem {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** The service name. Truncates to one line. */
  label: string;
  /** Right-aligned detail (e.g. "99.98% uptime"). */
  detail?: string;
  /** Per-period history rendered as an embedded uptime strip (hidden by `compact`). */
  periods?: UptimePeriod[];
  // Current status (pick one; omit both for operational). Precedence:
  // down > degraded (first match wins).
  down?: boolean;
  degraded?: boolean;
}

export interface ServiceHealthListProps {
  /** The services to render, in order. */
  items: ServiceHealthItem[];
  /** Optional heading shown above the rows. */
  title?: string;
  // Density (omit for the default rows with embedded strips).
  compact?: boolean;
  /** Strip the card surface for nesting inside an existing card (mirrors Stats). */
  plain?: boolean;
  /** Rows become tappable drill-in targets (open the service) when set. */
  onPressItem?: (index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Item status precedence, first match wins.
function itemStatus(item: ServiceHealthItem): PeriodStatus {
  if (item.down) return "down";
  if (item.degraded) return "degraded";
  return "operational";
}


export function createServiceHealthList(skin: ChartSkin) {
  return function ServiceHealthList(props: ServiceHealthListProps) {
    const { items, title, testID, style } = props;
    const { tokens } = useTheme();
    const compact = !!props.compact;

    devWarn(items.length === 0, "[canvas] <ServiceHealthList />: `items` is empty; the list renders with no rows.");

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          props.plain ? null : s.surface(tokens, skin.surfaceRadius),
          props.plain ? null : compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <View style={{ gap: compact ? 8 : 12 }}>
          {items.map((item, i) => {
            const status = itemStatus(item);
            // The header line's composed name; the embedded strip carries its
            // own tallying summary as a sibling image.
            const name = `${item.label}: ${status}${item.detail != null && item.detail !== "" ? `, ${item.detail}` : ""}`;
            const header = (
              <>
                {/* Status dot, decorative beside the composed name. */}
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: statusColor(tokens, status) }} />
                <Text numberOfLines={1} style={{ flexGrow: 1, flexShrink: 1, fontSize: 14, lineHeight: 20, color: tokens["card-foreground"] }}>
                  {item.label}
                </Text>
                {item.detail != null && item.detail !== "" ? (
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"], ...tabularNums() }}>{item.detail}</Text>
                ) : null}
              </>
            );
            return (
              <View key={item.id ?? i} style={{ gap: 6 }}>
                {props.onPressItem ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    aria-label={name}
                    onPress={() => props.onPressItem?.(i)}
                    android_ripple={surfaceRipple(tokens)}
                    style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 8 }, pressDim(pressed, 0.85)]}
                  >
                    {header}
                  </Pressable>
                ) : (
                  <View
                    accessible
                    accessibilityRole="image"
                    role="img"
                    accessibilityLabel={name}
                    aria-label={name}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    {header}
                  </View>
                )}
                {item.periods != null && item.periods.length > 0 && !compact ? (
                  <View
                    accessible
                    accessibilityRole="image"
                    role="img"
                    accessibilityLabel={statusSummary(item.periods, item.label)}
                    aria-label={statusSummary(item.periods, item.label)}
                  >
                    <StatusStrip periods={item.periods} height={8} tokens={tokens} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  };
}
