import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, shadow, FOCUS_RESET, shape } from "../../style/index.js";

// Co-located Calendar skins, one per platform. The shell resolves the density
// metrics (compact vs default cell sizing), the leading-blank padding, and the
// per-day selected/today/highlight state; the skin supplies only the native
// SHAPE, sizing, weekday-label style, day-cell fill, today treatment, and press
// feedback. The BRAND survives on every platform (the selected day fills with the
// indigo `primary` token, never a platform default), so each follows light/dark.
// The calendar frame uses static content frost in glass mode. The opaque `card`
// token remains its solid fallback; date labels and selection states stay crisp
// above the material. Glass swaps no semantic token.
//
//   iOS (HIG date picker): the SELECTED day is a filled `primary` circle
//     (radius 9999) with `primary-foreground` text; TODAY is `primary`-colored
//     text with no fill; weekday headers are ~13pt muted SF-style two-letter
//     labels; the month label sits between two ghost chevrons. Press = opacity
//     dim (~0.8).
//   Android (M3 date picker): the SELECTED day is a filled `primary` circle;
//     TODAY is an OUTLINED ring (1px `primary`) on a transparent fill; weekday
//     headers are single-letter; day cells get a circular `android_ripple`
//     (alpha(primary, 0.12)); slightly larger touch targets.
//   Web: the established Canvas look (rounded-full primary fill for any
//     highlighted day, Su/Mo two-letter weekday labels), lifted verbatim from the
//     original file.

export type Density = "compact" | "default";

// Per-density box sizes, in px. The grid width is exactly seven cell widths so the
// flex-wrap row breaks after the seventh cell.
export interface CellMetrics {
  /** A day cell (square). */
  cell: ViewStyle;
  /** The grid width = seven cell widths. */
  gridWidth: number;
  /** A weekday head cell. */
  head: ViewStyle;
  /** The day-label type scale. */
  label: TextStyle;
}

// Per-density sizes for the week/day timeline views. The containers are FILL and
// the day columns flex, so the same layout scales to any parent without a
// separate breakpoint.
export interface TimelineMetrics {
  /** One hour row, in px; event-block geometry multiplies against this. */
  hourHeight: number;
  /** The left hour-axis rail width. */
  axisWidth: number;
  /** The day-peek overlay card width. */
  peekWidth: number;
}

// The per-day visual state the shell resolves and hands the skin.
export interface DayState {
  /** The day equals `selected` (the primary highlight). */
  selected: boolean;
  /** The day equals `today` (the secondary highlight). */
  today: boolean;
}

// The platform-varying surface. Everything color/shape-bearing the calendar needs
// lives here, built from the active tokens (so each follows light/dark/glass) and
// the active density metrics.
export interface CalendarSkin {
  /** Per-density cell/grid/head/label metrics. */
  metrics: Record<Density, CellMetrics>;

  /** iOS/web dim the day cell on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over a pressed day cell; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean; radius?: number }) | null;

  // --- container ---
  /** The outer surface: border, radius, padding (layout-only). */
  containerBase: ViewStyle;
  /** The opaque surface fill and border, retained as the static content material's solid fallback. */
  containerSurface: (t: ColorTokens) => ViewStyle;

  // --- header (month label + prev/next chevrons) ---
  header: ViewStyle;
  /** A ghost chevron button box. */
  chevron: ViewStyle;
  /** The chevron glyph. */
  chevronText: (t: ColorTokens) => TextStyle;
  /** The month/year label. */
  monthLabel: (t: ColorTokens) => TextStyle;

  // --- weekday header row ---
  /** The weekday + day grid row (fixed width supplied per density). */
  grid: ViewStyle;
  /** A weekday head cell interior. */
  headCell: ViewStyle;
  /** The weekday label. */
  weekdayLabel: (t: ColorTokens) => TextStyle;
  /** The weekday header strings (single-letter on Android, two-letter elsewhere). */
  weekdays: string[];

  // --- day cell ---
  /** A day cell interior (size from metrics; selected/today fill applied on top). */
  dayCellBase: ViewStyle;
  /** The day-cell fill/outline per state (selected circle, today ring, etc.). */
  dayCellState: (t: ColorTokens, state: DayState) => ViewStyle;
  /** The day-label color/weight per state. */
  dayLabel: (t: ColorTokens, state: DayState) => TextStyle;

  // --- event mark (month grid + week strip) ---
  /** The event dot box: size + absolute seat near the cell's bottom edge. */
  eventDot: ViewStyle;
  /** The dot fill per day state (inverts to `primary-foreground` on the selected fill). */
  eventDotColor: (t: ColorTokens, state: DayState) => ViewStyle;

  // --- week/day timeline ---
  /** Per-density timeline sizes. */
  timeline: Record<Density, TimelineMetrics>;
  /** An hour label on the left axis rail. */
  hourLabel: (t: ColorTokens) => TextStyle;
  /** The hairline drawn across the top of each hour slot. */
  slotLine: (t: ColorTokens) => ViewStyle;
  /** The vertical hairline between week-view day columns. */
  colDivider: (t: ColorTokens) => ViewStyle;
  /** A timed event block: radius, padding, and the leading accent bar (layout-only). */
  eventBlock: ViewStyle;
  /** The event-block fill + accent color, tinted from `primary`. */
  eventBlockSurface: (t: ColorTokens) => ViewStyle;
  /** The event title line inside a block. */
  eventTitle: (t: ColorTokens) => TextStyle;
  /** The event time line inside a block. */
  eventTime: (t: ColorTokens) => TextStyle;

  // --- day-peek + hover overlays (anchored floating cards) ---
  /** The floating peek/hover card: shape, border, shadow, padding (an overlay
   *  surface, so it paints the `popover` token and frosts under glass via GlassSurface). */
  peekCard: (t: ColorTokens) => ViewStyle;
  /** The peek's day title / the hover card's event title line. */
  peekTitle: (t: ColorTokens) => TextStyle;
  /** The hover card's description body. */
  peekBody: (t: ColorTokens) => TextStyle;

  // --- range selection (month view) ---
  /** The tinted band behind range endpoints and the days between (the shell sets
   *  the left/right half per position; this carries the fill + vertical insets). */
  rangeBand: (t: ColorTokens) => ViewStyle;
}

// --- shared weekday strings ------------------------------------------------

const WEEKDAYS_TWO = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_ONE = ["S", "M", "T", "W", "T", "F", "S"];
// iOS reference uses UPPERCASE short weekday symbols (SUN/MON shortened to two
// letters here to stay distinct from Android's single-letter row); mixed-case
// "Su/Mo" is a web (shadcn) idiom, not the iOS date-picker reference.
const WEEKDAYS_TWO_UPPER = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// The day cells and chevrons spread the shared FOCUS_RESET so the react-native-web
// keyboard-focus ring (Tab onto a day cell or a chevron) is suppressed; a real iOS
// device never shows it (native iOS feedback is the press dim only). No-op natively,
// where `outlineStyle`/`outlineWidth` are not real CSS. Mirrors input/textarea/pagination.

// =============================================================================
// Web: the established Canvas look (lifted verbatim from the original file).
// Any highlighted day (selected OR today) gets a `primary` rounded-full fill.
// =============================================================================

export const webSkin: CalendarSkin = {
  metrics: {
    compact: {
      cell: { width: 32, height: 32 },
      gridWidth: 224,
      head: { width: 32, height: 28 },
      label: { fontSize: 12, lineHeight: 16 },
    },
    default: {
      cell: { width: 36, height: 36 },
      gridWidth: 252,
      head: { width: 36, height: 32 },
      label: { fontSize: 14, lineHeight: 20 },
    },
  },

  pressedOpacity: 0.9,
  ripple: null,

  // The Riskora date card: the card corner, a hairline, a 16px inset.
  containerBase: {
    alignSelf: "flex-start",
    borderRadius: shape.web.card,
    borderWidth: 1,
    padding: 16,
  },
  containerSurface: (t) => ({ borderColor: t.border, backgroundColor: t.card }),

  // `mb-2 flex-row items-center justify-between`.
  header: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // A 32px month-step tile with the control corner.
  chevron: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: shape.web.control,
    backgroundColor: "transparent",
  },
  chevronText: (t) => ({ fontSize: 14, lineHeight: 20, color: t.foreground }),
  monthLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),

  grid: { flexDirection: "row", flexWrap: "wrap" },
  headCell: { alignItems: "center", justifyContent: "center" },
  weekdayLabel: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: t["muted-foreground"] }),
  weekdays: WEEKDAYS_TWO,

  // `items-center justify-center rounded-full`.
  dayCellBase: { alignItems: "center", justifyContent: "center", borderRadius: 9999 },
  // ONLY the selected day fills `bg-primary`; today (unselected) is a soft
  // primary tint. Filling both made an unselected today indistinguishable from a
  // selection — two adjacent filled circles read as a two-day range.
  dayCellState: (t, st) => {
    if (st.selected) return { backgroundColor: t.primary };
    if (st.today) return { backgroundColor: alpha(t.primary, 0.12) };
    return {};
  },
  // Selected -> `text-primary-foreground`; today (unselected) -> `primary` text.
  dayLabel: (t, st) => {
    if (st.selected) return { fontWeight: "500", color: t["primary-foreground"] };
    if (st.today) return { fontWeight: "500", color: primaryText(t) };
    return { color: t.foreground };
  },

  // A 4px dot seated just above the cell's bottom edge marks a day with events.
  eventDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 9999 },
  // On the filled (selected/today) cell the dot inverts to stay visible on `primary`.
  eventDotColor: (t, st) =>
    st.selected || st.today ? { backgroundColor: t["primary-foreground"] } : { backgroundColor: t.primary },

  timeline: {
    compact: { hourHeight: 40, axisWidth: 40, peekWidth: 272 },
    default: { hourHeight: 48, axisWidth: 44, peekWidth: 300 },
  },
  hourLabel: (t) => ({ fontSize: 10, lineHeight: 14, color: t["muted-foreground"] }),
  slotLine: (t) => ({ borderTopWidth: 1, borderTopColor: t.border }),
  colDivider: (t) => ({ borderLeftWidth: 1, borderLeftColor: t.border }),
  eventBlock: {
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: "hidden",
    ...FOCUS_RESET,
  },
  eventBlockSurface: (t) => ({ backgroundColor: alpha(t.primary, 0.12), borderLeftColor: t.primary }),
  eventTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: primaryText(t) }),
  eventTime: (t) => ({ fontSize: 10, lineHeight: 14, color: t["muted-foreground"] }),

  // Mirrors the web Popover card (the 16px menu corner, hairline border, lg
  // shadow) with the tighter padding a timeline slice wants.
  peekCard: (t) => ({
    borderRadius: shape.web.menu,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.popover,
    padding: 12,
    ...shadow("lg", t),
  }),
  peekTitle: (t) => ({ fontSize: 13, lineHeight: 18, fontWeight: "600", color: t["popover-foreground"] }),
  peekBody: (t) => ({ fontSize: 12, lineHeight: 16, color: t["popover-foreground"] }),

  // A soft primary wash between the range endpoints, inset from the cell edges.
  rangeBand: (t) => ({ position: "absolute", top: 4, bottom: 4, backgroundColor: alpha(t.primary, 0.15) }),
};

// =============================================================================
// iOS (HIG date picker): the SELECTED day is a filled `primary` circle with
// `primary-foreground` text; TODAY is `primary`-colored text with no fill;
// weekday headers ~13pt muted; the month label sits between two ghost chevrons.
// Press = opacity dim.
// =============================================================================

export const iosSkin: CalendarSkin = {
  // Slightly larger, airier cells in the HIG date-picker spirit.
  metrics: {
    compact: {
      cell: { width: 34, height: 34 },
      gridWidth: 238,
      head: { width: 34, height: 28 },
      label: { fontSize: 15, lineHeight: 20 },
    },
    default: {
      cell: { width: 38, height: 38 },
      gridWidth: 266,
      head: { width: 38, height: 30 },
      label: { fontSize: 17, lineHeight: 22 },
    },
  },

  pressedOpacity: 0.8, // HIG: dim on press
  ripple: null,

  containerBase: {
    alignSelf: "flex-start",
    borderRadius: 12, // HIG larger corner radius
    borderWidth: 1,
    padding: 12,
  },
  containerSurface: (t) => ({ borderColor: t.border, backgroundColor: t.card }),

  header: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chevron: {
    height: 30,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: "transparent",
    // Suppress the react-native-web keyboard focus ring; no-op natively.
    ...FOCUS_RESET,
  },
  // HIG: the chevrons carry the brand indigo (system-accent style), heavier glyph.
  chevronText: (t) => ({ fontSize: 22, lineHeight: 24, fontWeight: "500", color: t.primary }),
  // HIG: a bold ~17pt month/year title.
  monthLabel: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "600", color: t.foreground }),

  grid: { flexDirection: "row", flexWrap: "wrap" },
  headCell: { alignItems: "center", justifyContent: "center" },
  // ~13pt muted SF-style weekday header.
  weekdayLabel: (t) => ({ fontSize: 13, lineHeight: 16, fontWeight: "600", color: t["muted-foreground"] }),
  // iOS reference: uppercase two-letter weekday symbols.
  weekdays: WEEKDAYS_TWO_UPPER,

  // Suppress the react-native-web keyboard focus ring on the day cell; no-op natively.
  dayCellBase: { alignItems: "center", justifyContent: "center", borderRadius: 9999, ...FOCUS_RESET },
  // Selected wins: filled `primary` circle. Today (when not selected): no fill
  // (the day label carries the brand indigo instead).
  dayCellState: (t, st) => (st.selected ? { backgroundColor: t.primary } : {}),
  // Selected -> `primary-foreground`; today (unselected) -> `primary` colored
  // text, semibold; otherwise plain foreground.
  dayLabel: (t, st) => {
    if (st.selected) return { fontWeight: "600", color: t["primary-foreground"] };
    if (st.today) return { fontWeight: "600", color: primaryText(t) };
    return { color: t.foreground };
  },

  // HIG month grids mark event days with a small dot under the number (~5pt).
  eventDot: { position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: 9999 },
  // Inverts on the selected `primary` fill; rides the brand indigo otherwise
  // (including on today's unfilled cell, whose label is already `primary`).
  eventDotColor: (t, st) =>
    st.selected ? { backgroundColor: t["primary-foreground"] } : { backgroundColor: t.primary },

  // Slightly taller hour rows in the iOS calendar's airier spirit.
  timeline: {
    compact: { hourHeight: 44, axisWidth: 44, peekWidth: 288 },
    default: { hourHeight: 50, axisWidth: 48, peekWidth: 320 },
  },
  hourLabel: (t) => ({ fontSize: 11, lineHeight: 13, fontWeight: "500", color: t["muted-foreground"] }),
  slotLine: (t) => ({ borderTopWidth: 1, borderTopColor: t.border }),
  colDivider: (t) => ({ borderLeftWidth: 1, borderLeftColor: t.border }),
  // iOS event blocks: tinted rounded rectangle with a leading accent bar.
  eventBlock: {
    borderRadius: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: "hidden",
    ...FOCUS_RESET,
  },
  eventBlockSurface: (t) => ({ backgroundColor: alpha(t.primary, 0.12), borderLeftColor: t.primary }),
  eventTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "600", color: primaryText(t) }),
  eventTime: (t) => ({ fontSize: 11, lineHeight: 14, color: t["muted-foreground"] }),

  // The iOS popover DNA (borderless rounded card, lg shadow), tightened for a
  // timeline slice.
  peekCard: (t) => ({
    borderRadius: 20,
    backgroundColor: t.popover,
    padding: 12,
    ...shadow("lg", t),
  }),
  peekTitle: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", color: t["popover-foreground"] }),
  peekBody: (t) => ({ fontSize: 13, lineHeight: 18, color: t["popover-foreground"] }),

  // A soft primary wash between the range endpoints (HIG range selection).
  rangeBand: (t) => ({ position: "absolute", top: 4, bottom: 4, backgroundColor: alpha(t.primary, 0.15) }),
};

// =============================================================================
// Android (M3 date picker): the SELECTED day is a filled `primary` circle;
// TODAY is an OUTLINED ring (1px `primary`) on transparent; weekday headers are
// single-letter; day cells get a circular `android_ripple`; larger touch targets.
// =============================================================================

export const androidSkin: CalendarSkin = {
  // M3 calendar cells are ~40dp/48dp targets; bump the grid accordingly.
  metrics: {
    compact: {
      cell: { width: 36, height: 36 },
      gridWidth: 252,
      head: { width: 36, height: 28 },
      label: { fontSize: 12, lineHeight: 16 },
    },
    default: {
      cell: { width: 40, height: 40 },
      gridWidth: 280,
      head: { width: 40, height: 32 },
      label: { fontSize: 14, lineHeight: 20 },
    },
  },

  pressedOpacity: null, // Android uses a ripple instead
  // Circular ripple roughly matching the cell radius (default 40/2 = 20dp).
  ripple: (t) => ({ color: alpha(t.primary, 0.12), borderless: false, radius: 20 }),

  containerBase: {
    alignSelf: "flex-start",
    borderRadius: 12, // M3 large corner
    borderWidth: 1,
    padding: 12,
  },
  containerSurface: (t) => ({ borderColor: t.border, backgroundColor: t.card }),

  header: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chevron: {
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    backgroundColor: "transparent",
  },
  chevronText: (t) => ({ fontSize: 22, lineHeight: 24, color: t["muted-foreground"] }),
  // M3 labelLarge-ish month label.
  monthLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),

  grid: { flexDirection: "row", flexWrap: "wrap" },
  headCell: { alignItems: "center", justifyContent: "center" },
  // M3 single-letter weekday headers, muted.
  weekdayLabel: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: t["muted-foreground"] }),
  weekdays: WEEKDAYS_ONE,

  // overflow:"hidden" clips the Material ripple to the rounded outline (the bounded
  // android_ripple otherwise bleeds past the circle as a rectangle).
  dayCellBase: { alignItems: "center", justifyContent: "center", borderRadius: 9999, overflow: "hidden" },
  // Selected -> filled `primary` circle. Today (unselected) -> a 1px `primary`
  // ring on a transparent fill.
  dayCellState: (t, st) => {
    if (st.selected) return { backgroundColor: t.primary };
    if (st.today) return { borderWidth: 1, borderColor: t.primary, backgroundColor: "transparent" };
    return {};
  },
  // Selected -> `primary-foreground`; today (unselected) -> `primary` text;
  // otherwise plain foreground.
  dayLabel: (t, st) => {
    if (st.selected) return { fontWeight: "500", color: t["primary-foreground"] };
    if (st.today) return { fontWeight: "500", color: primaryText(t) };
    return { color: t.foreground };
  },

  // M3 date pickers mark event days with a 4dp dot under the number.
  eventDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 9999 },
  // Inverts on the selected `primary` fill; `primary` otherwise (incl. inside today's ring).
  eventDotColor: (t, st) =>
    st.selected ? { backgroundColor: t["primary-foreground"] } : { backgroundColor: t.primary },

  // M3 schedule rows lean taller for the 48dp-ish touch rhythm.
  timeline: {
    compact: { hourHeight: 44, axisWidth: 44, peekWidth: 272 },
    default: { hourHeight: 52, axisWidth: 48, peekWidth: 304 },
  },
  hourLabel: (t) => ({ fontSize: 11, lineHeight: 16, fontWeight: "500", color: t["muted-foreground"] }),
  slotLine: (t) => ({ borderTopWidth: 1, borderTopColor: t.border }),
  colDivider: (t) => ({ borderLeftWidth: 1, borderLeftColor: t.border }),
  // M3 event chips: larger radius, tonal `primary` container with an accent bar.
  eventBlock: {
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  eventBlockSurface: (t) => ({ backgroundColor: alpha(t.primary, 0.12), borderLeftColor: t.primary }),
  eventTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: primaryText(t) }),
  eventTime: (t) => ({ fontSize: 11, lineHeight: 16, color: t["muted-foreground"] }),

  // The M3 menu-surface treatment (medium radius + md shadow), tightened for a
  // timeline slice.
  peekCard: (t) => ({
    borderRadius: 12,
    backgroundColor: t.popover,
    padding: 12,
    ...shadow("md", t),
  }),
  peekTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t["popover-foreground"] }),
  peekBody: (t) => ({ fontSize: 12, lineHeight: 16, color: t["popover-foreground"] }),

  // M3 range selection: the tonal container band spans the full cell height.
  rangeBand: (t) => ({ position: "absolute", top: 0, bottom: 0, backgroundColor: alpha(t.primary, 0.15) }),
};
