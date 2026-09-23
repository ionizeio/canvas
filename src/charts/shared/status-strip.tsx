import { View, statusColors, type ColorTokens } from "../../style/index.js";

// The period-pill strip shared by UptimeBar and ServiceHealthList: a single
// row of flex-grown pills, one per period, colored by the period's status.
// Kit-internal: only the UptimePeriod data type ships, via the consumers.
//
// The strip is a PLOT, not a text row: its pills run oldest to newest along a
// time axis, so the row keeps physical LTR ordering even under native RTL
// (the same convention the cartesian frame's plots follow).

export interface UptimePeriod {
  /** Stable identity, used as the React key when present. */
  id?: string | number;
  /** Names the period in the accessible summary (e.g. "Mar 4"). */
  label?: string;
  // Status (pick one; omit all for operational). Precedence when several are
  // passed: down > degraded > unknown (first match wins).
  down?: boolean;
  degraded?: boolean;
  unknown?: boolean;
}

export type PeriodStatus = "operational" | "degraded" | "down" | "unknown";

/** Status precedence, first match wins; an unmarked period is operational. */
export function periodStatus(p: UptimePeriod): PeriodStatus {
  if (p.down) return "down";
  if (p.degraded) return "degraded";
  if (p.unknown) return "unknown";
  return "operational";
}

/**
 * The pill fill per status: the solid status colors (statusColors' dot, so a degraded
 * pill reads the same warning as a warning badge), and the muted token for unknown.
 */
export function statusColor(tokens: ColorTokens, status: PeriodStatus): string {
  if (status === "down") return statusColors(tokens, "error").dot;
  if (status === "degraded") return statusColors(tokens, "warning").dot;
  if (status === "unknown") return tokens.muted;
  return statusColors(tokens, "success").dot;
}

/**
 * The strip's accessible summary: the label, the period count, and per-status
 * tallies with zero counts omitted ("API uptime, 90 periods: 87 operational,
 * 2 degraded, 1 down"). Pure, exported for tests.
 */
export function statusSummary(periods: UptimePeriod[], label?: string): string {
  const counts: Record<PeriodStatus, number> = { operational: 0, degraded: 0, down: 0, unknown: 0 };
  for (const p of periods) counts[periodStatus(p)]++;
  const parts = (["operational", "degraded", "down", "unknown"] as const)
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`);
  const head = `${label ?? "Uptime"}, ${periods.length} ${periods.length === 1 ? "period" : "periods"}`;
  return parts.length > 0 ? `${head}: ${parts.join(", ")}` : head;
}

/**
 * The raw pill row. Decorative on its own: the consumer wraps it in (or
 * beside) a node carrying the `statusSummary` as an accessible name.
 */
export function StatusStrip({ periods, height, tokens }: { periods: UptimePeriod[]; height: number; tokens: ColorTokens }) {
  return (
    <View style={{ flexDirection: "row", gap: 2, direction: "ltr" }}>
      {periods.map((p, i) => (
        <View
          key={p.id ?? i}
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: "0%",
            height,
            borderRadius: 2,
            backgroundColor: statusColor(tokens, periodStatus(p)),
          }}
        />
      ))}
    </View>
  );
}
