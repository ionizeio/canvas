import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { type GestureResponderEvent, type View as RNView, type ScrollView as RNScrollView } from "react-native";
import { View, Pressable, Text, ScrollView, RippleClip, cornerRadii, useControllableState, useMeasuredWidth, FILL, type StyleProp, type ViewStyle, type LayoutStyle, GlassSurface, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import { LiquidAnchoredOverlay } from "../../style/liquid-anchored-overlay.js";
import { ButtonGroup } from "../../atoms/button-group/button-group.js";
import { type CalendarSkin, type DayState, type Density } from "./calendar.styles.js";
import { calendarDayAccessibility } from "./calendar.accessibility.js";

// Shared Calendar shell. The structure (header with prev/next chevrons + view
// label, the month grid, and the week/day timelines), the density and view
// precedence, the leading-blank padding, the event model, the range-selection
// state machine, the hour format, the accessibility, and the press handlers live
// here once; a platform file supplies only its skin (the native
// container/header/cell shape, weekday-label style, selected/today day
// treatment, event dot/block/band treatment, and press feedback) and calls
// createCalendar.
//
// Views (one axis, month is the default):
//   month — a header, a weekday label row, and a 6x7 grid of day cells. Today and
//     the selected day are highlighted; leading blanks pad the first row to the
//     correct weekday; a day with events carries a dot under its number. With
//     `range`, day presses pick a start/end pair instead of a single day, with a
//     tinted band across the days between (a travel-site check-in/check-out).
//   week — a strip of the seven day cells around the selected day, over an
//     hour-axis time grid; timed events render as positioned blocks in their day
//     column. Chevrons page a week at a time within the month.
//   day — a single-day hour timeline of the selected day's timed events.
//     Chevrons page a day at a time within the month.
// In week/day views the chevrons move the selection (so a bare calendar pages out
// of the box) and fire onPrev/onNext only when the step would leave the month —
// the month itself is a prop, so crossing it is the consumer's move.
//
// The week/day timelines span the full day (0–24 by default) inside a vertical
// scroller whose initial window shows 8 AM–5 PM; the built-in 12h/24h segmented
// toggle flips the hour labels (12-hour by default). On pointer platforms,
// hovering an event block floats a detail card (title, day + span, description).
//
// There is no CSS grid, so the month grid is a `flex-row flex-wrap` of fixed-width
// cells. Seven cells per row times the cell width gives the grid a fixed width,
// set explicitly so wrapping lands exactly seven-per-row (width supplied by the
// skin's per-density metrics). The timelines instead flex their day columns inside
// the container, so week/day scale to any parent without a breakpoint.

// Every calendar container is FILL (src/style/sizing.ts): it spans the parent it is
// given and the fluid cell math below does the shrinking.
const ROOT: ViewStyle = FILL;

// The container's horizontal chrome (padding + border on both sides) between its
// measured outer width and the width the seven-cell grid can actually use.
function containerChrome(base: ViewStyle): number {
  const pad = typeof base.padding === "number" ? base.padding : 0;
  const border = typeof base.borderWidth === "number" ? base.borderWidth : 0;
  return 2 * (pad + border);
}

/** Fluid month cell (pure, tested): the skin's preferred cell, shrunk so seven
 *  fit the measured container (32px floor), or kept as-is while unmeasured or
 *  when the container fits. Converges: the grid re-lays-out at 7*cell, which is
 *  never wider than the measurement that produced it. */
export function monthCellSize(preferred: number, measuredWidth: number, chrome: number): number {
  if (measuredWidth <= 0) return preferred;
  const fit = Math.floor((measuredWidth - chrome) / 7);
  return Math.max(32, Math.min(preferred, fit));
}

export interface CalendarEvent {
  /** Day of month the event falls on (1-based). */
  day: number;
  /** Title shown on the event block in the week/day timelines and read to assistive tech. */
  title?: string;
  /** Start hour, 0-24; fractions are minutes (9.5 = 9:30). Untimed events (no start) mark the day with a dot but stay out of the timelines. */
  start?: number;
  /** End hour, 0-24; defaults to one hour after `start`. */
  end?: number;
  /** Longer detail shown in the day peek's hover card when a pointer hovers the event block. */
  description?: string;
}

export interface CalendarProps {
  /** Month + year label shown in the header, e.g. "June 2026". */
  month?: string;
  /** The day number currently selected (CONTROLLED, primary highlight). Omit for uncontrolled use. */
  selected?: number;
  /** Initial selected day for uncontrolled use (a bare calendar highlights the day on press). */
  defaultSelected?: number;
  /** The day number that is today (primary highlight when unselected). */
  today?: number;
  /** Number of days in the month. */
  daysInMonth?: number;
  /** Weekday (0=Sun .. 6=Sat) the 1st falls on; sets leading blank cells. */
  startWeekday?: number;
  /** Events to mark: dots on their days in the month grid and week strip, timed blocks in the week/day timelines. */
  events?: CalendarEvent[];
  /** Fired with the day number when a day cell is pressed (and when week/day chevron paging moves the selection). */
  onSelect?: (day: number) => void;
  /** Fired with the event when a timed block in the week/day timeline is pressed. */
  onEventPress?: (event: CalendarEvent) => void;
  /** Fired when the previous chevron is pressed in the month view, or when week/day paging would cross into the previous month. */
  onPrev?: (event: GestureResponderEvent) => void;
  /** Fired when the next chevron is pressed in the month view, or when week/day paging would cross into the next month. */
  onNext?: (event: GestureResponderEvent) => void;

  // View (pick one; default is the month grid). Precedence: day, then week.
  /** Seven-day strip over an hour timeline; chevrons page by week. */
  week?: boolean;
  /** Single-day hour timeline; chevrons page by day. */
  day?: boolean;

  /** Month view: pressing a day that has events also opens that day's hour timeline in an anchored overlay (a tooltip-style day peek) beside the cell — to its right, to its left when the right lacks room, and below it when neither side fits — dismissed by an outside tap or Escape. */
  dayPeek?: boolean;

  // Range selection (month view): a travel-site check-in/check-out picker.
  /** Month view: two-tap range selection — the first press sets the start day, the second (later) press the end; a press before the start restarts. Days between carry a tinted band. */
  range?: boolean;
  /** The range's start day (CONTROLLED with `rangeEnd`). Omit both for uncontrolled use. */
  rangeStart?: number;
  /** The range's end day (CONTROLLED with `rangeStart`). */
  rangeEnd?: number;
  /** Initial range start for uncontrolled use. */
  defaultRangeStart?: number;
  /** Initial range end for uncontrolled use. */
  defaultRangeEnd?: number;
  /** Fired as the range is picked: with (start, undefined) after the first press, (start, end) after the second. */
  onRangeChange?: (start?: number, end?: number) => void;

  /** First hour of the week/day timeline (0-24; default 0, the full day). */
  startHour?: number;
  /** Last hour of the week/day timeline (0-24; default 24). The scroller initially windows 8 AM–5 PM and scrolls to the rest. */
  endHour?: number;

  // Hour format (12-hour by default; the timeline's built-in segmented toggle flips it).
  /** Timeline labels in 24-hour format (CONTROLLED). Omit to let the built-in 12h/24h toggle manage it. */
  hour24?: boolean;
  /** Initial hour format for uncontrolled use (default false = 12-hour AM/PM). */
  defaultHour24?: boolean;
  /** Fired when the hour format changes (true = 24-hour). */
  onHour24Change?: (hour24: boolean) => void;

  // Density (pick one; default is the comfortable cell).
  /** Tighter cells and smaller type, for dense surfaces. */
  compact?: boolean;

  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Density precedence: `compact` wins, otherwise the default cell.
function densityOf(p: CalendarProps): Density {
  if (p.compact) return "compact";
  return "default";
}

// View precedence: `day` wins, then `week`, otherwise the month grid.
function viewOf(p: CalendarProps): "month" | "week" | "day" {
  if (p.day) return "day";
  if (p.week) return "week";
  return "month";
}

const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The initial scroll window over a full-day timeline: 8 AM through 5 PM.
const WINDOW_START_HOUR = 8;
const WINDOW_HOURS = 9;

// "9 AM" / "9:30 AM" (12-hour, the default), or "09:00" / "09:30" (24-hour).
function formatHour(h: number, hour24 = false): string {
  const clamped = Math.max(0, Math.min(24, h));
  const whole = Math.floor(clamped);
  const minutes = Math.round((clamped - whole) * 60);
  if (hour24) return `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const suffix = whole % 24 >= 12 ? "PM" : "AM";
  const twelve = ((whole + 11) % 12) + 1;
  return minutes > 0 ? `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}` : `${twelve} ${suffix}`;
}

// A timed event's [start, end) hours, with the end defaulted and a floor so a
// zero-length event still draws a visible block.
function spanOf(e: CalendarEvent): [number, number] {
  const start = e.start ?? 0;
  return [start, Math.max(e.end ?? start + 1, start + 0.25)];
}

// Greedy cluster/lane layout for one day's timed events: overlapping events split
// the column into side-by-side lanes; non-overlapping clusters get the full width
// back. Returns each event with its lane and its cluster's lane count.
function layoutLanes(events: CalendarEvent[]): { event: CalendarEvent; lane: number; lanes: number }[] {
  const sorted = [...events].sort((a, b) => spanOf(a)[0] - spanOf(b)[0] || spanOf(a)[1] - spanOf(b)[1]);
  const placed: { event: CalendarEvent; lane: number; lanes: number }[] = [];
  let cluster: { event: CalendarEvent; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const c of cluster) placed.push({ ...c, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };
  for (const event of sorted) {
    const [start, end] = spanOf(event);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    cluster.push({ event, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return placed;
}

/** Build a Calendar component from a platform skin. */
export function createCalendar(skin: CalendarSkin) {
  return function Calendar(props: CalendarProps) {
    const {
      month = "June 2026",
      today,
      daysInMonth = 30,
      startWeekday = 0,
      events = [],
      onSelect,
      onEventPress,
      onPrev,
      onNext,
      testID,
      style,
    } = props;

    // Controlled when `selected` is provided, self-managed otherwise, so a bare
    // calendar highlights the pressed day (and pages its week/day) instead of
    // ignoring the tap.
    const [selected, setSelected] = useControllableState<number | undefined>(props.selected, props.defaultSelected);
    // The check-in/check-out pair for `range` mode (undefined end = mid-pick).
    const [range, setRange] = useControllableState<{ start?: number; end?: number }>(
      props.rangeStart !== undefined || props.rangeEnd !== undefined
        ? { start: props.rangeStart, end: props.rangeEnd }
        : undefined,
      { start: props.defaultRangeStart, end: props.defaultRangeEnd },
    );
    // Hour-label format, flipped by the timeline's built-in 12h/24h toggle.
    const [hour24, setHour24] = useControllableState<boolean>(props.hour24, props.defaultHour24 ?? false, props.onHour24Change);
    // The day whose timeline the anchored peek overlay is showing (dayPeek only).
    const [peekDay, setPeekDay] = useState<number | null>(null);
    // The timeline block a pointer is hovering (its detail card key).
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    // Every day cell / event block registers its node so an overlay can anchor to it.
    const cellRefs = useRef(new Map<number, RNView>());
    const blockRefs = useRef(new Map<string, RNView>());
    const peekAnchorRef = useRef<RNView | null>(null);
    const hoverAnchorRef = useRef<RNView | null>(null);
    const hoverEventRef = useRef<CalendarEvent | null>(null);
    // What the day peek and the hover card showed while open, kept for their exits.
    const lastPeek = useRef<{ key: number; content: ReactNode } | null>(null);
    const lastHover = useRef<{ key: string; content: ReactNode } | null>(null);
    const scrollRef = useRef<RNScrollView | null>(null);
    // Which view's scroller has been positioned on its initial window.
    const scrollInitFor = useRef<string | null>(null);
    const theme = useMaterialTheme({ layer: "content" });
    const dayTheme = useMaterialTheme({ layer: "control" });
    const { tokens } = theme;
    const dayGlass = isGlass(dayTheme);
    const density = densityOf(props);
    const view = viewOf(props);
    // Month-grid fluid cells: the grid is seven fixed-width cells, so a container
    // narrower than the natural grid (a phone screen with page padding) shrinks
    // the cell toward a 32px floor instead of overflowing; the month root is
    // capped at 100% and measured below. Only the month view attaches the
    // measurement, so the week/day timelines keep the skin metrics untouched.
    const { width: monthMeasuredWidth, onLayout: onMonthLayout } = useMeasuredWidth();
    const baseMetrics = skin.metrics[density];
    const preferredCell = baseMetrics.cell.width as number;
    const fluidCell =
      view === "month"
        ? monthCellSize(preferredCell, monthMeasuredWidth, containerChrome(skin.containerBase))
        : preferredCell;
    const m =
      fluidCell === preferredCell
        ? baseMetrics
        : {
            ...baseMetrics,
            cell: { ...baseMetrics.cell, width: fluidCell, height: fluidCell },
            head: { ...baseMetrics.head, width: fluidCell },
            gridWidth: fluidCell * 7,
          };
    const tm = skin.timeline[density];
    const lead = ((startWeekday % 7) + 7) % 7;
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    const eventsOn = (dayNum: number) => events.filter((e) => e.day === dayNum);
    const weekdayOf = (dayNum: number) => (lead + dayNum - 1) % 7;

    // The peek belongs to one month's grid: close it when the month swaps out
    // from under it, and let Escape dismiss it like any overlay.
    useEffect(() => setPeekDay(null), [month]);
    const escapeScope = useEscapeLayer(peekDay != null, () => setPeekDay(null));
    const hoverEscapeScope = useEscapeLayer(hoverKey != null, () => setHoverKey(null));

    // The day the week/day views revolve around.
    const anchor = Math.min(Math.max(selected ?? today ?? 1, 1), daysInMonth);
    // Day-of-month the anchor's week starts on; ≤ 0 in a leading-blank first week.
    const weekStart = anchor - weekdayOf(anchor);

    const pick = (dayNum: number) => {
      setSelected(dayNum);
      onSelect?.(dayNum);
    };

    // Range mode: first press sets the start, a later-or-equal press sets the
    // end, an earlier press restarts the pick.
    const pickRange = (dayNum: number) => {
      const cur = range ?? {};
      const next =
        cur.start == null || cur.end != null || dayNum < cur.start
          ? { start: dayNum, end: undefined }
          : { start: cur.start, end: dayNum };
      setRange(next);
      props.onRangeChange?.(next.start, next.end);
    };

    // Week/day chevrons page the selection within the month and only hand the
    // press to onPrev/onNext when the step would cross the month boundary.
    const page = (delta: number, handler: ((e: GestureResponderEvent) => void) | undefined) => (e: GestureResponderEvent) => {
      if (view === "month") {
        handler?.(e);
        return;
      }
      if (view === "day") {
        const next = anchor + delta;
        if (next < 1 || next > daysInMonth) handler?.(e);
        else pick(next);
        return;
      }
      const nextStart = weekStart + delta * 7;
      // A week exists in this month if any of its seven days lands inside it.
      if (nextStart > daysInMonth || nextStart + 6 < 1) handler?.(e);
      else pick(Math.min(Math.max(nextStart, 1), daysInMonth));
    };

    // Visible hour range: the full day unless the consumer narrows it.
    const hoursFrom = Math.max(0, Math.floor(props.startHour ?? 0));
    const hoursTo = Math.min(24, Math.max(Math.ceil(props.endHour ?? 24), hoursFrom + 1));
    const hours = Array.from({ length: hoursTo - hoursFrom }, (_, i) => hoursFrom + i);

    const chevronUnit = view === "month" ? "month" : view;
    const monthName = month.split(" ")[0];

    const header = (label: string) => (
      <View style={skin.header}>
        <Pressable
          style={({ pressed }) => [
            skin.chevron,
            skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
          android_ripple={ripple ? { ...ripple, borderless: true } : undefined}
          onPress={page(-1, onPrev)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Previous ${chevronUnit}`}
        >
          <Text style={skin.chevronText(tokens)}>{"‹"}</Text>
        </Pressable>
        <Text style={skin.monthLabel(tokens)}>{label}</Text>
        <Pressable
          style={({ pressed }) => [
            skin.chevron,
            skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
          android_ripple={ripple ? { ...ripple, borderless: true } : undefined}
          onPress={page(1, onNext)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Next ${chevronUnit}`}
        >
          <Text style={skin.chevronText(tokens)}>{"›"}</Text>
        </Pressable>
      </View>
    );

    // The 12h/24h format toggle, right-aligned under the timeline header.
    const formatToggle = (
      <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
        <ButtonGroup
          segmented
          small
          items={["12h", "24h"]}
          active={hour24 ? 1 : 0}
          onSelect={(i) => setHour24(i === 1)}
        />
      </View>
    );

    // Range-mode band + endpoint resolution for one day.
    const rangeOf = (dayNum: number) => {
      const start = range?.start;
      const end = range?.end;
      return {
        isStart: start === dayNum,
        isEnd: end === dayNum,
        between: start != null && end != null && dayNum > start && dayNum < end,
        spans: start != null && end != null && end > start,
      };
    };

    // One selectable day cell (month grid + week strip): number, state fill, the
    // event dot, and in range mode the tinted band behind the endpoints and the
    // days between. The band renders OUTSIDE the RippleClip (whose Android
    // overflow clip would round it to the cell circle). The bounded ripple is
    // clipped by the RippleClip parent (a node can never clip its own ripple on
    // Android).
    const dayCell = (dayNum: number) => {
      const r = props.range ? rangeOf(dayNum) : null;
      const isSelected = r ? r.isStart || r.isEnd : selected != null && dayNum === selected;
      const isToday = today != null && dayNum === today;
      const state: DayState = { selected: isSelected, today: isToday };
      const count = eventsOn(dayNum).length;
      // Under glass the SELECTED day is a BRAND-tinted CONTROL-layer puck (a GlassPane
      // behind the label; the cell drops its brand fill). An unselected today keeps its
      // soft tint, which is translucent already and reads as a wash on the pane.
      const selectedPuck = dayGlass && isSelected;
      const daySurface = [skin.dayCellBase, skin.dayCellState(tokens, state)];
      const rangeNote = r?.isStart ? ", start of range" : r?.isEnd ? ", end of range" : r?.between ? ", in range" : "";
      const band =
        r && r.spans && (r.isStart || r.isEnd || r.between) ? (
          <View
            style={[
              skin.rangeBand(tokens),
              r.between ? { left: 0, right: 0 } : r.isStart ? { left: "50%", right: 0 } : { left: 0, right: "50%" },
            ]}
          />
        ) : null;
      return (
        <View key={dayNum} style={{ position: "relative" }}>
          {band}
          <RippleClip shape={cornerRadii(skin.dayCellBase)}>
            <Pressable
              ref={(node) => {
                if (node) cellRefs.current.set(dayNum, node);
                else cellRefs.current.delete(dayNum);
              }}
              style={({ pressed }) => [
                isSelected ? paneStyle(dayTheme, daySurface) : daySurface,
                m.cell,
                skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              ]}
              android_ripple={ripple}
              onPress={() => {
                if (props.range && view === "month") {
                  pickRange(dayNum);
                  onSelect?.(dayNum);
                } else {
                  pick(dayNum);
                }
                if (props.dayPeek && view === "month") {
                  if (count > 0) {
                    peekAnchorRef.current = cellRefs.current.get(dayNum) ?? null;
                    setPeekDay(dayNum);
                  } else {
                    setPeekDay(null);
                  }
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dayNum}${isToday ? ", today" : ""}${isSelected ? ", selected" : ""}${rangeNote}${
                count > 0 ? `, ${count} event${count === 1 ? "" : "s"}` : ""
              }`}
              {...calendarDayAccessibility(isSelected)}
            >
              {selectedPuck ? <GlassPane layer="control" shape={daySurface} brand={tokens.primary} interactive /> : null}
              <Text style={[m.label, skin.dayLabel(tokens, state)]}>{dayNum}</Text>
              {count > 0 ? <View style={[skin.eventDot, skin.eventDotColor(tokens, state)]} /> : null}
            </Pressable>
          </RippleClip>
        </View>
      );
    };

    // The absolutely-positioned timed blocks for one day, laid over the hour
    // slots inside an inset layer (insets beat absolute-in-padding differences
    // between Yoga and the web). `rs`/`re` bound the visible hours (the views use
    // the shared range; the day peek passes a tighter slice). Hovering a block on
    // a pointer platform floats its detail card; `hoverable: false` (the peek's
    // own slice) leaves hover off so the peek never opens a card over itself.
    const eventLayer = (dayNum: number, showTime: boolean, rs = hoursFrom, re = hoursTo, hoverable = true) => {
      const timedDay = events.filter((e) => e.start != null && e.day === dayNum);
      const blocks = layoutLanes(timedDay);
      if (blocks.length === 0) return null;
      return (
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 2, right: 2 }}>
          {blocks.map(({ event, lane, lanes }, i) => {
            const [start, end] = spanOf(event);
            const top = (Math.max(start, rs) - rs) * tm.hourHeight;
            const bottom = (Math.min(end, re) - rs) * tm.hourHeight;
            if (bottom <= 0 || top >= (re - rs) * tm.hourHeight) return null;
            const key = `${dayNum}-${i}`;
            const label = `${event.title ?? "Event"}, ${formatHour(start, hour24)} to ${formatHour(end, hour24)}`;
            const position: ViewStyle = {
              position: "absolute",
              top,
              height: Math.max(bottom - top, 12),
              left: `${(lane / lanes) * 100}%`,
              width: `${100 / lanes}%`,
            };
            const hoverProps = hoverable
              ? {
                  onHoverIn: () => {
                    hoverAnchorRef.current = blockRefs.current.get(key) ?? null;
                    hoverEventRef.current = event;
                    setHoverKey(key);
                  },
                  onHoverOut: () => setHoverKey((cur) => (cur === key ? null : cur)),
                }
              : {};
            const body = (
              <>
                {event.title != null ? (
                  <Text numberOfLines={1} style={skin.eventTitle(tokens)}>{event.title}</Text>
                ) : null}
                {showTime ? (
                  <Text numberOfLines={1} style={skin.eventTime(tokens)}>{`${formatHour(start, hour24)} – ${formatHour(end, hour24)}`}</Text>
                ) : null}
              </>
            );
            return (
              <RippleClip key={key} shape={cornerRadii(skin.eventBlock)} style={position}>
                <Pressable
                  ref={(node) => {
                    if (node) blockRefs.current.set(key, node);
                    else blockRefs.current.delete(key);
                  }}
                  style={({ pressed }) => [
                    skin.eventBlock,
                    skin.eventBlockSurface(tokens),
                    { flex: 1 },
                    onEventPress && skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                  ]}
                  android_ripple={onEventPress && ripple ? { color: ripple.color, borderless: false } : undefined}
                  onPress={onEventPress ? () => onEventPress(event) : undefined}
                  {...hoverProps}
                  accessibilityRole={onEventPress ? "button" : undefined}
                  accessible
                  accessibilityLabel={label}
                >
                  {body}
                </Pressable>
              </RippleClip>
            );
          })}
        </View>
      );
    };

    // The left hour rail: one row per hour, its label hugging the slot line.
    const axisFor = (hrs: number[]) => (
      <View style={{ width: tm.axisWidth }}>
        {hrs.map((h) => (
          <View key={h} style={{ height: tm.hourHeight, alignItems: "flex-end", paddingRight: 6 }}>
            <Text style={skin.hourLabel(tokens)}>{formatHour(h, hour24)}</Text>
          </View>
        ))}
      </View>
    );

    // The stacked hour slots that draw the horizontal grid lines.
    const slotsFor = (hrs: number[]) =>
      hrs.map((h) => <View key={h} style={[{ height: tm.hourHeight }, skin.slotLine(tokens)]} />);

    const hourAxis = axisFor(hours);
    const slotLines = slotsFor(hours);

    // The full-day timeline scrolls inside a fixed window (8 AM–5 PM initially);
    // a narrowed range shorter than the window just renders in full.
    const totalHeight = (hoursTo - hoursFrom) * tm.hourHeight;
    const windowHeight = Math.min(WINDOW_HOURS, hoursTo - hoursFrom) * tm.hourHeight;
    const initialScrollY = Math.max(0, Math.min((WINDOW_START_HOUR - hoursFrom) * tm.hourHeight, totalHeight - windowHeight));
    const timeScroller = (content: ReactNode) => (
      <ScrollView
        ref={scrollRef}
        style={{ height: windowHeight }}
        nestedScrollEnabled
        onLayout={() => {
          if (scrollInitFor.current === view) return;
          scrollInitFor.current = view;
          scrollRef.current?.scrollTo({ y: initialScrollY, animated: false });
        }}
      >
        {content}
      </ScrollView>
    );

    // The floating detail card for the hovered timeline block (pointer platforms;
    // no backdrop, so the page stays interactive and hover-out hides it). The card
    // rides the liquid popup policy, so it stays mounted through its exit showing
    // the snapshot of what it showed while open; a hover onto another block keys
    // a fresh card.
    const hoverCard = () => {
      if (hoverKey != null && hoverEventRef.current != null) {
        const e = hoverEventRef.current;
        const [start, end] = spanOf(e);
        lastHover.current = {
          key: hoverKey,
          content: (
            <EscapeLayerProvider scope={hoverEscapeScope}>
            <Text style={skin.peekTitle(tokens)}>{e.title ?? "Event"}</Text>
            <Text style={[skin.eventTime(tokens), { marginTop: 2 }]}>
              {`${WEEKDAYS_FULL[weekdayOf(e.day)]}, ${monthName} ${e.day} · ${formatHour(start, hour24)} – ${formatHour(end, hour24)}`}
            </Text>
            {e.description != null ? (
              <Text style={[skin.peekBody(tokens), { marginTop: 6 }]}>{e.description}</Text>
            ) : null}
          </EscapeLayerProvider>
          ),
        };
      }
      const shown = lastHover.current;
      if (shown == null) return null;
      return (
        <LiquidAnchoredOverlay
          onAccessibilityEscape={hoverEscapeScope.onAccessibilityEscape}
          key={shown.key}
          open={hoverKey != null}
          onDismiss={() => setHoverKey(null)}
          triggerRef={hoverAnchorRef}
          gap={6}
          cardWidth={tm.peekWidth}
          preferSide
          dismissable={false}
          cardStyle={[skin.peekCard(tokens), { width: tm.peekWidth }]}
          inlineStyle={{ position: "absolute", top: "100%", left: 0 }}
        >
          {shown.content}
        </LiquidAnchoredOverlay>
      );
    };

    // The anchored day peek: the pressed day's timeline in a floating overlay
    // card. Untimed events list as title rows; timed events render the same
    // hour-slice timeline the day view draws, bounded to the day's events. On the
    // liquid popup policy the card stays mounted through its exit, showing the
    // snapshot of the day it showed while open (a month swap closes it, so the
    // leaving card never re-titles itself); pressing another event day keys a
    // fresh card on that cell.
    const dayPeekOverlay = () => {
      if (peekDay != null) {
        const dayEvents = eventsOn(peekDay);
        const timedDay = dayEvents.filter((e) => e.start != null);
        const untimed = dayEvents.filter((e) => e.start == null);
        // Bound the slice to this day's events (min two hours so a lone half-hour
        // event still reads as a timeline).
        const rs = timedDay.length ? Math.max(0, Math.floor(Math.min(...timedDay.map((e) => spanOf(e)[0])))) : 0;
        const re = timedDay.length ? Math.min(24, Math.max(Math.ceil(Math.max(...timedDay.map((e) => spanOf(e)[1]))), rs + 2)) : 0;
        const peekHours = Array.from({ length: re - rs }, (_, i) => rs + i);
        lastPeek.current = {
          key: peekDay,
          content: (
            <EscapeLayerProvider scope={escapeScope}>
            <Text style={skin.peekTitle(tokens)}>{`${WEEKDAYS_FULL[weekdayOf(peekDay)]}, ${monthName} ${peekDay}`}</Text>
            {untimed.map((e, i) => (
              <View key={`untimed-${i}`} style={{ marginTop: 6 }}>
                <Text numberOfLines={1} style={skin.eventTitle(tokens)}>{e.title ?? "Event"}</Text>
              </View>
            ))}
            {timedDay.length > 0 ? (
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                {axisFor(peekHours)}
                <View style={{ flex: 1 }}>
                  {slotsFor(peekHours)}
                  {eventLayer(peekDay, true, rs, re, false)}
                </View>
              </View>
            ) : null}
          </EscapeLayerProvider>
          ),
        };
      }
      const shown = lastPeek.current;
      if (shown == null) return null;
      return (
        <LiquidAnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          key={shown.key}
          open={peekDay != null}
          onDismiss={() => setPeekDay(null)}
          triggerRef={peekAnchorRef}
          gap={6}
          cardWidth={tm.peekWidth}
          preferSide
          cardStyle={[skin.peekCard(tokens), { width: tm.peekWidth }]}
          inlineStyle={{ position: "absolute", top: "100%", left: 0 }}
        >
          {shown.content}
        </LiquidAnchoredOverlay>
      );
    };

    if (view === "day") {
      const label = `${WEEKDAYS_FULL[weekdayOf(anchor)]}, ${monthName} ${anchor}`;
      return (
        <GlassSurface layer="content" testID={testID} style={[skin.containerBase, skin.containerSurface(tokens), ROOT, style]}>
          {header(label)}
          {formatToggle}
          {timeScroller(
            <View style={{ flexDirection: "row" }}>
              {hourAxis}
              <View style={{ flex: 1 }}>
                {slotLines}
                {eventLayer(anchor, true)}
              </View>
            </View>,
          )}
          {hoverCard()}
        </GlassSurface>
      );
    }

    if (view === "week") {
      const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
      return (
        <GlassSurface layer="content" testID={testID} style={[skin.containerBase, skin.containerSurface(tokens), ROOT, style]}>
          {header(month)}
          {formatToggle}
          {/* Week strip: weekday label over the selectable day cell, aligned to the timeline columns below. */}
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: tm.axisWidth }} />
            {weekDays.map((dayNum, i) => (
              <View key={`strip-${i}`} style={{ flex: 1, alignItems: "center" }}>
                {/* The strip starts at the week's first weekday, so column i is weekday i. */}
                <View style={skin.headCell}>
                  <Text style={skin.weekdayLabel(tokens)}>{skin.weekdays[i]}</Text>
                </View>
                {dayNum >= 1 && dayNum <= daysInMonth ? (
                  dayCell(dayNum)
                ) : (
                  <View style={[skin.headCell, m.cell]} />
                )}
              </View>
            ))}
          </View>
          <View style={{ marginTop: 4 }}>
            {timeScroller(
              <View style={{ flexDirection: "row" }}>
                {hourAxis}
                {weekDays.map((dayNum, i) => (
                  <View key={`col-${i}`} style={[{ flex: 1 }, skin.colDivider(tokens)]}>
                    {slotLines}
                    {dayNum >= 1 && dayNum <= daysInMonth ? eventLayer(dayNum, false) : null}
                  </View>
                ))}
              </View>,
            )}
          </View>
          {hoverCard()}
        </GlassSurface>
      );
    }

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return (
      <GlassSurface layer="content" testID={testID} onLayout={onMonthLayout} style={[skin.containerBase, skin.containerSurface(tokens), ROOT, style]}>
        {header(month)}

        {/* Weekday label row. */}
        <View style={[skin.grid, { width: m.gridWidth }]}>
          {skin.weekdays.map((wd, i) => (
            <View key={`wd-${i}`} style={[skin.headCell, m.head]}>
              <Text style={skin.weekdayLabel(tokens)}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* Day grid: leading blanks, then one cell per day. */}
        <View style={[skin.grid, { width: m.gridWidth }]}>
          {Array.from({ length: lead }, (_, i) => (
            <View key={`blank-${i}`} style={[skin.headCell, m.cell]} />
          ))}
          {days.map((dayNum) => dayCell(dayNum))}
        </View>

        {dayPeekOverlay()}
      </GlassSurface>
    );
  };
}
