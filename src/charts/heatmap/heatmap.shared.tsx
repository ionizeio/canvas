import { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { View, Text, Pressable, useTheme, alpha, shadow, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { announceSelection } from "../shared/chart-inspect.js";
import { estimateTextWidth } from "../shared/chart-math.js";

// Heatmap is a "Shared" platform treatment (data visualization is
// platform-neutral): one implementation serves iOS, Android, and the web.
//
// Density cells whose fill encodes each value (0–1). Two layouts share the same
// data and legend:
//   • the default wrapping grid (a wash of the primary hue per cell), and
//   • `calendar` — a GitHub-contribution-graph: week columns of seven day cells,
//     weekday + month labels, discrete less-to-more levels, and press/hover-to-
//     inspect showing the day's count and date.

// pointerEvents must come from StyleSheet.create on react-native-web (an inline
// object silently fails to compile the pointer-events declaration), so the
// heatmap inspect flag never intercepts a hover/press meant for a cell.
const vizStyles = StyleSheet.create({ passthrough: { pointerEvents: "none" } });

/** One heatmap cell. A bare number is shorthand for `{ value }`. */
export interface HeatmapCell {
  /** Intensity 0–1; drives the cell's fill (bucketed into levels in calendar mode). */
  value: number;
  /** The exact tally shown in the inspect tooltip (e.g. GitHub's contribution count). */
  count?: number;
  /** ISO date (`YYYY-MM-DD`); shown in the tooltip and drives the calendar's month labels. */
  date?: string;
  /** Overrides the tooltip's derived "N contributions" heading. */
  label?: string;
}

export type HeatmapValue = number | HeatmapCell;

export interface HeatmapProps {
  /** The cells: intensities 0–1, or `{ value, count?, date?, label? }` for inspectable data. */
  values: HeatmapValue[];
  /** What the grid measures (e.g. "Contribution activity"); leads the accessible name. */
  label?: string;
  /** GitHub-style: lay the cells into seven-row week columns with weekday + month labels. */
  calendar?: boolean;
  /** A summary line above the grid (e.g. "248 contributions in the last year"). */
  caption?: string;
  /** Hide the less-to-more legend row. */
  hideLegend?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only. */
  style?: LayoutStyle;
}

const HEATMAP_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// GitHub labels alternating rows so the seven-day column reads without crowding.
const HEATMAP_WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];
// Level 0 is the empty (no-activity) box; 1–4 climb the primary hue.
const HEATMAP_LEVEL_ALPHA = [0, 0.28, 0.5, 0.75, 1];

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const normCell = (v: HeatmapValue): HeatmapCell => (typeof v === "number" ? { value: v } : v);

/** Bucket a 0–1 intensity into the five discrete GitHub-style levels. */
function heatLevel(value: number): number {
  const t = clamp01(value);
  if (t <= 0) return 0;
  if (t < 0.25) return 1;
  if (t < 0.5) return 2;
  if (t < 0.75) return 3;
  return 4;
}

/** The fill for a level: the muted track for empty (0), else a primary-hue step. */
function levelFill(tokens: ColorTokens, lvl: number): string {
  return lvl <= 0 ? tokens.muted : alpha(tokens.primary, HEATMAP_LEVEL_ALPHA[Math.min(4, lvl)]);
}

interface ParsedDate { y: number; mo: number; day: number }
function parseISO(d?: string): ParsedDate | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? { y: +m[1], mo: +m[2] - 1, day: +m[3] } : null;
}
const fmtDate = (d: ParsedDate) => `${HEATMAP_MONTHS[d.mo]} ${d.day}, ${d.y}`;

/** The tooltip heading for a cell: an explicit label, a count, or a percent. */
function cellHeading(cell: HeatmapCell): string {
  if (cell.label != null) return cell.label;
  if (cell.count != null) return `${cell.count} ${cell.count === 1 ? "contribution" : "contributions"}`;
  return `${Math.round(clamp01(cell.value) * 100)}%`;
}

export function Heatmap(props: HeatmapProps) {
  // No values means no cells: warn so an empty grid is not mistaken for one that
  // failed to style. Both layouts share this guard.
  devWarn(props.values.length === 0, "[canvas] <Heatmap />: `values` is empty; the grid renders with no cells.");
  const cells = props.values.map(normCell);
  return props.calendar ? <CalendarHeatmap {...props} cells={cells} /> : <GridHeatmap {...props} cells={cells} />;
}

// The default wrapping grid: one alpha-washed square per value, with the shared
// less-to-more legend. Unchanged behavior from the original Heatmap.
function GridHeatmap({ cells, label, hideLegend, testID, style }: HeatmapProps & { cells: HeatmapCell[] }) {
  const { tokens } = useTheme();
  const cell = (intensity: number, box: number, key: number) => (
    <View key={key} style={{ borderRadius: 2, height: box, width: box, backgroundColor: alpha(tokens.primary, Math.max(0.08, clamp01(intensity))) }} />
  );
  // Name the grid with its size so assistive tech hears the scope of the data.
  const name = `${label ?? "Heatmap"}, ${cells.length} cells`;
  // Same img-placement rule as StackedBar: while the less-to-more legend renders,
  // the image role sits on the cell grid only so the legend text stays reachable.
  const img = { accessibilityRole: "image", accessibilityLabel: name, "aria-label": name } as const;
  return (
    <View testID={testID} style={style} {...(hideLegend ? img : {})}>
      <View {...(hideLegend ? {} : img)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>{cells.map((c, i) => cell(c.value, 18, i))}</View>
      {hideLegend ? null : (
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Less</Text>
          {[0.2, 0.4, 0.6, 0.8, 1].map((v, i) => cell(v, 12, 100 + i))}
          <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>More</Text>
        </View>
      )}
    </View>
  );
}

// The discrete less-to-more legend for calendar mode: the empty box plus the
// four climbing levels, matching the cells' bucketing.
function HeatmapLevelLegend({ tokens }: { tokens: ColorTokens }) {
  return (
    <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Less</Text>
      {[0, 1, 2, 3, 4].map((lvl) => (
        <View
          key={lvl}
          style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: levelFill(tokens, lvl), borderWidth: 1, borderColor: lvl === 0 ? tokens.border : "transparent" }}
        />
      ))}
      <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>More</Text>
    </View>
  );
}

// The GitHub contribution graph: week columns of seven day cells, weekday + month
// labels, and press/hover-to-inspect. The grid scrolls horizontally so a full
// year stays legible on a phone. Cells are pointer-only (accessible={false}); the
// grid's image role + summarizing name carry the data for assistive tech, so a
// year of days is not 365 tab stops.
const CAL_CELL = 11;
const CAL_GAP = 3;
const CAL_PITCH = CAL_CELL + CAL_GAP;
const CAL_ROWS = 7;
const CAL_GUTTER = 32; // weekday-label column, wide enough for "Wed" at 10px
const CAL_MONTH_H = 15; // month-label row

function CalendarHeatmap({ cells, label, caption, hideLegend, testID, style }: HeatmapProps & { cells: HeatmapCell[] }) {
  const { tokens } = useTheme();
  const [active, setActive] = useState<number | null>(null);

  const cols = Math.ceil(cells.length / CAL_ROWS);
  const gridW = cols * CAL_PITCH - CAL_GAP;
  const gridH = CAL_ROWS * CAL_PITCH - CAL_GAP;
  const hasDates = cells.some((c) => c.date);

  // Place a month abbreviation at each column where the (topmost dated) month changes.
  const monthLabels: (string | null)[] = [];
  let prevMonth = -1;
  for (let c = 0; c < cols; c++) {
    let mo = -1;
    for (let r = 0; r < CAL_ROWS; r++) {
      const p = parseISO(cells[c * CAL_ROWS + r]?.date);
      if (p) { mo = p.mo; break; }
    }
    if (mo >= 0 && mo !== prevMonth) { monthLabels.push(HEATMAP_MONTHS[mo]); prevMonth = mo; } else monthLabels.push(null);
  }

  // The inspect flag for the active cell, pinned above (or below, near the top).
  const activeCell = active != null ? cells[active] : null;
  const activeDate = activeCell ? parseISO(activeCell.date) : null;
  const flagTitle = activeCell ? cellHeading(activeCell) : "";
  const flagSub = activeDate ? fmtDate(activeDate) : undefined;
  const flagW = Math.ceil(Math.max(estimateTextWidth(flagTitle, 12), flagSub ? estimateTextWidth(flagSub, 11) : 0)) + 20;
  const flagH = flagSub ? 44 : 26;
  const aCol = active != null ? Math.floor(active / CAL_ROWS) : 0;
  const aRow = active != null ? active % CAL_ROWS : 0;
  const cellX = aCol * CAL_PITCH;
  const cellY = aRow * CAL_PITCH;
  const flagAbove = aRow >= 3;
  const flagTop = flagAbove ? cellY - flagH - 4 : cellY + CAL_CELL + 4;
  const flagLeft = Math.max(0, Math.min(gridW - flagW, cellX + CAL_CELL / 2 - flagW / 2));

  // The image role + name summarize the whole grid (a screen reader hears the
  // scope, not 365 individual cells).
  const total = cells.reduce((n, c) => n + (c.count ?? 0), 0);
  const name = `${label ?? "Activity heatmap"}, ${cells.length} days${total > 0 ? `, ${total} total` : ""}`;
  const img = { accessibilityRole: "image", accessibilityLabel: name, "aria-label": name } as const;

  const inspect = (i: number, toggle: boolean) => {
    setActive((prev) => (toggle && prev === i ? null : i));
    const c = cells[i];
    const p = parseISO(c.date);
    announceSelection(`${cellHeading(c)}${p ? ` on ${fmtDate(p)}` : ""}`);
  };

  return (
    <View testID={testID} style={style}>
      {caption ? (
        <Text style={{ marginBottom: 10, fontSize: 13, lineHeight: 18, fontWeight: "500", color: tokens["card-foreground"] }}>{caption}</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View {...img}>
          {hasDates ? (
            // Month labels are absolutely placed at their column so each abbreviation
            // renders in full, overflowing its narrow slot to the right (GitHub style),
            // rather than being clipped to one cell's width.
            <View style={{ height: CAL_MONTH_H, marginLeft: CAL_GUTTER, width: gridW }}>
              {monthLabels.map((m, c) =>
                m ? (
                  <Text key={c} numberOfLines={1} style={{ position: "absolute", left: c * CAL_PITCH, top: 0, fontSize: 10, lineHeight: CAL_MONTH_H, color: tokens["muted-foreground"] }}>
                    {m}
                  </Text>
                ) : null,
              )}
            </View>
          ) : null}
          <View style={{ flexDirection: "row" }}>
            {/* Weekday gutter: Mon / Wed / Fri, aligned to the cell rows. */}
            <View style={{ width: CAL_GUTTER, gap: CAL_GAP, paddingRight: 4 }}>
              {HEATMAP_WEEKDAYS.map((wd, r) => (
                <View key={r} style={{ height: CAL_CELL, justifyContent: "center" }}>
                  {wd ? <Text numberOfLines={1} style={{ fontSize: 10, lineHeight: 11, textAlign: "right", color: tokens["muted-foreground"] }}>{wd}</Text> : null}
                </View>
              ))}
            </View>
            <View>
              <View style={{ flexDirection: "row", gap: CAL_GAP }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <View key={c} style={{ gap: CAL_GAP }}>
                    {Array.from({ length: CAL_ROWS }).map((_, r) => {
                      const idx = c * CAL_ROWS + r;
                      const cell = cells[idx];
                      if (!cell) return <View key={r} style={{ width: CAL_CELL, height: CAL_CELL }} />;
                      const lvl = heatLevel(cell.value);
                      const isActive = active === idx;
                      return (
                        <Pressable
                          key={r}
                          accessible={false}
                          focusable={false}
                          onPress={() => inspect(idx, true)}
                          onHoverIn={() => inspect(idx, false)}
                          onHoverOut={() => setActive((prev) => (prev === idx ? null : prev))}
                          style={{
                            width: CAL_CELL,
                            height: CAL_CELL,
                            borderRadius: 2,
                            backgroundColor: levelFill(tokens, lvl),
                            borderWidth: 1,
                            borderColor: isActive ? tokens.foreground : lvl === 0 ? tokens.border : "transparent",
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
              {activeCell ? (
                <View
                  style={[
                    vizStyles.passthrough,
                    {
                      position: "absolute",
                      top: flagTop,
                      left: flagLeft,
                      width: flagW,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      backgroundColor: tokens.card,
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      gap: 1,
                      ...shadow("md"),
                    },
                  ]}
                >
                  <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: tokens["card-foreground"] }}>{flagTitle}</Text>
                  {flagSub ? <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 15, color: tokens["muted-foreground"] }}>{flagSub}</Text> : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
      {hideLegend ? null : <HeatmapLevelLegend tokens={tokens} />}
    </View>
  );
}
