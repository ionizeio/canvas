import { View, Text, useTheme, devWarn, type StyleProp, type ViewStyle } from "../../style/index.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { StatusStrip, statusSummary, type UptimePeriod } from "../shared/status-strip.js";

// UptimeBar is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
//
// UptimeBar: the statuspage strip. A single row of per-period status pills
// (operational green, degraded amber, down red, unknown muted), oldest on the
// left, with an optional summary caption above and edge captions below
// ("90 days ago" / "Today"). The strip is a plot: it keeps physical LTR
// ordering, and the edge captions stay pinned to their physical edges, even
// under native RTL.

export type { UptimePeriod } from "../shared/status-strip.js";

export interface UptimeBarProps {
  /** The periods to render, oldest first; each becomes one pill. */
  periods: UptimePeriod[];
  /** What the strip measures (e.g. "API uptime"); leads the accessible name. */
  label?: string;
  /** A summary line above the strip (e.g. "99.98% uptime"). */
  caption?: string;
  /** Caption under the strip's left (oldest) edge (e.g. "90 days ago"). */
  startLabel?: string;
  /** Caption under the strip's right (latest) edge (e.g. "Today"). */
  endLabel?: string;
  // Density (omit for the default pill height).
  compact?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

const PILL_HEIGHT = { default: 24, compact: 14 } as const;

export function UptimeBar(props: UptimeBarProps) {
  const { periods, label, caption, startLabel, endLabel, testID, style } = props;
  const { tokens } = useTheme();
  const compact = !!props.compact;

  devWarn(periods.length === 0, "[canvas] <UptimeBar />: `periods` is empty; the strip renders with no pills.");

  const name = statusSummary(periods, label);
  const hasEdges = (startLabel != null && startLabel !== "") || (endLabel != null && endLabel !== "");

  return (
    <View testID={testID} style={[CHART_ROOT, { gap: 6 }, style]}>
      {caption != null && caption !== "" ? (
        <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens["card-foreground"] }}>{caption}</Text>
      ) : null}
      {/* The strip is the image; its name tallies every status. */}
      <View accessible accessibilityRole="image" role="img" accessibilityLabel={name} aria-label={name}>
        <StatusStrip periods={periods} height={compact ? PILL_HEIGHT.compact : PILL_HEIGHT.default} tokens={tokens} />
      </View>
      {/* Edge captions pin to the strip's physical edges (a time axis). */}
      {hasEdges ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", direction: "ltr" }}>
          <Text style={{ fontSize: 11, lineHeight: 14, color: tokens["muted-foreground"] }}>{startLabel ?? ""}</Text>
          <Text style={{ fontSize: 11, lineHeight: 14, color: tokens["muted-foreground"] }}>{endLabel ?? ""}</Text>
        </View>
      ) : null}
    </View>
  );
}
