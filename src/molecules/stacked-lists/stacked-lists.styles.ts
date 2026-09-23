import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, surfaceRipple, shape } from "../../style/index.js";

// Co-located StackedList skins, one per platform. StackedList is a "Light"
// treatment: identical structure and semantic colors (those live in
// stacked-lists.shared.tsx); only the frame shape/shadow, row density/spacing,
// type tracking, divider inset, and press feedback shift per OS. The BRAND
// survives on every platform (the primary token and the type stay the same);
// only the native shape/sizing/feedback change.
//
//   Web: the established Canvas look, lifted verbatim. A rounded-lg (8) bordered
//     card with shadow-sm; rows px-5 py-3 (20/12); a full-width 1px hairline
//     between ruled rows; text-sm/font-medium name + text-xs muted detail; a
//     14/600 header title; the overflow menu rounded-md (6). Press = the accent
//     surface (no opacity dim, no ripple), matching the current web behavior.
//   iOS (SF / HIG inset-grouped list, iOS 27 kit Lists/Rows/Large): a 26-radius
//     card with the continuous (superellipse) corner curve, FLAT and BORDERLESS
//     (the iOS 27 grouped Table View is fill-differentiated, not outlined, and
//     separators are the only hairlines); the two-line row is a FIXED 68pt
//     centered horizontal stack, gap 16, padding 16 sides / 0 vertical; hairline
//     separators INSET from the leading content (left margin past the avatar, per
//     iOS), plus an accent press surface AND a press-opacity dim (~0.8); SF type
//     (name Title 17/22 regular -0.43, subtitle 15/18 regular -0.24, trailing
//     detail 17/22 regular -0.43); a 15/600 header title -0.24; the drilldown
//     chevron is an SF semibold 17/22 tertiary glyph; overflow menu rounded-md
//     (6) with a 44pt hitSlop target.
//   Android (Material 3 list / card): a 12-radius bordered card, FLAT (no shadow,
//     M3 outlined card); the two-line list item is a FIXED 72dp row (M3 lists
//     token); a full-width hairline divider; M3 body type with M3 tracking
//     (name body-large 16/24/+0.5, subtitle body-medium 14/20/+0.25 on muted,
//     trailing supporting text label-small 11/16/500/+0.5); a 16/500/+0.15
//     title-medium header; the drilldown chevron is a 24dp Icon (the M3 trailing
//     affordance); overflow menu rounded-full with a 48dp hitSlop target. Press =
//     android_ripple (a neutral surface state layer); no opacity dim.

// The contract a platform skin fulfills. The shell renders the outer frame, the
// optional titled header, and the rows; the skin maps the active platform's
// frame shape/shadow, row density, type, divider, and feedback onto each piece.
export interface StackedListSkin {
  /** The card surface used by the `card` variant and as the optional frame when a
   *  title is supplied (radius, border, fill, shadow/elevation). */
  cardSurface: (t: ColorTokens) => ViewStyle;
  /** A single row's layout (flex row, alignment, gap, padding/density). */
  rowBase: ViewStyle;
  /** The hairline between ruled rows (color + optional leading inset). */
  rowDivider: (t: ColorTokens) => ViewStyle;
  /** The press surface for clickable rows and the overflow menu button. */
  pressedSurface: (t: ColorTokens) => ViewStyle;
  /** The primary (name) line type. */
  nameLabel: (t: ColorTokens) => TextStyle;
  /** The secondary (detail/subtitle) line type. */
  mutedLabel: (t: ColorTokens) => TextStyle;
  /** The trailing metadata text type (distinct from the subtitle line: iOS 27
   *  detail 17/22, M3 trailing supporting text label-small 11/16). */
  metaLabel: (t: ColorTokens) => TextStyle;
  /** The titled header container (row, justify, rule, padding). */
  header: (t: ColorTokens) => ViewStyle;
  /** The header title type. */
  headerTitle: (t: ColorTokens) => TextStyle;
  /** The drilldown chevron as a styled text glyph (web/iOS); null when the skin
   *  renders it as an Icon instead (Android's 24dp M3 affordance). */
  chevronGlyph: ((t: ColorTokens) => TextStyle) | null;
  /** The drilldown chevron as a kit Icon at this px size (Android); null when the
   *  skin renders it as a text glyph instead (web/iOS). Exactly one is set. */
  chevronIcon: number | null;
  /** The overflow ("...") menu button base (size + shape). */
  menuButton: ViewStyle;
  /** Extra touch area around the overflow menu button so the effective target
   *  reaches the platform minimum (>=44pt iOS / >=48dp Android); 0 on web. */
  menuHitSlop: number;
  /** iOS/web dim on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the component's own pressable rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- shared layout fragments (identical across platforms) -------------------

// FILL: the list spans the parent it is given (the parent picks the measure) and
// shares a Row with hugging siblings.
export const outer: ViewStyle = { width: "100%", flexShrink: 1, minWidth: 0 };

// flex-1: the primary + secondary text column.
export const column: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// flex-row items-center gap-1.5: the leading-plus + label row inside addAction.
export const addActionRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 6 };

// text-xs font-medium text-foreground: the addAction button label.
export function addActionLabel(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens.foreground };
}

// h-1 w-1 rounded-full bg-foreground: one of the three overflow dots.
export function menuDot(tokens: ColorTokens): ViewStyle {
  return { height: 4, width: 4, borderRadius: 9999, backgroundColor: tokens.foreground };
}

// flex-row items-center: the per-item `trailing` slot wrapper, so an inline
// editor (a Chip, a small Select) centers against the row like the badge/meta.
export const trailingSlot: ViewStyle = { flexDirection: "row", alignItems: "center" };

// --- row / menu base fragments reused across skins --------------------------

const ROW: ViewStyle = { flexDirection: "row", alignItems: "center" };

const MENU: ViewStyle = {
  height: 28,
  width: 28,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  backgroundColor: "transparent",
};

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// rounded-lg (8) border bg-card shadow-sm; rows px-5 py-3 (20/12); a full-width
// 1px hairline; text-sm/font-medium name + text-xs muted detail; 14/600 header;
// overflow menu rounded-md (6). Press = the accent surface.
export const webSkin: StackedListSkin = {
  cardSurface: (t) => ({
    borderRadius: shape.web.card,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: "hidden",
    ...shadow("DEFAULT", t),
  }),
  rowBase: { ...ROW, gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  rowDivider: (t) => ({ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: t.border }),
  pressedSurface: (t) => ({ backgroundColor: t.accent }),
  nameLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  mutedLabel: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  metaLabel: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  header: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  }),
  headerTitle: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "500", color: t.foreground }),
  chevronGlyph: (t) => ({ fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  chevronIcon: null,
  menuButton: { ...MENU, borderRadius: 10 },
  menuHitSlop: 0,
  pressedOpacity: null,
  ripple: null,
};

// ---------- iOS 27 (SF / HIG inset-grouped list, kit Lists/Rows/Large) ----------
// A 26-radius card with the continuous (superellipse) corner curve, FLAT and
// BORDERLESS: the iOS 27 grouped Table View is fill-differentiated, not outlined,
// with hairline separators as the only rules. The two-line row is a FIXED 68pt
// centered horizontal stack (gap 16, 16 side padding, 0 vertical); separators are
// INSET past the leading avatar so the rule starts at the text column, per iOS.
// SF type: Title 17/22 regular (letter-spacing Auto -> -0.43), subtitle 15/18
// regular (-0.24), trailing detail 17/22 regular (-0.43). Press = the accent
// surface plus an opacity dim (~0.8), the iOS row highlight.
const IOS_RADIUS = 26;
const IOS_ROW_HEIGHT = 68;
// Separators inset past the leading avatar (avatar default 40 + the 16 row gap +
// the 16 leading padding = 72), so the rule starts at the text column.
const IOS_SEPARATOR_INSET = 72;
export const iosSkin: StackedListSkin = {
  cardSurface: (t) => ({
    borderRadius: IOS_RADIUS,
    borderCurve: "continuous",
    backgroundColor: t.card,
    overflow: "hidden",
  }),
  rowBase: { ...ROW, gap: 16, paddingHorizontal: 16, paddingVertical: 0, minHeight: IOS_ROW_HEIGHT },
  rowDivider: (t) => ({ position: "absolute", start: IOS_SEPARATOR_INSET, end: 0, bottom: 0, height: 1, backgroundColor: t.border }),
  pressedSurface: (t) => ({ backgroundColor: t.accent }),
  nameLabel: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: t.foreground }),
  mutedLabel: (t) => ({ fontSize: 15, lineHeight: 18, fontWeight: "400", letterSpacing: -0.24, color: t["muted-foreground"] }),
  metaLabel: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: t["muted-foreground"] }),
  header: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  }),
  headerTitle: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: t.foreground }),
  // The iOS 27 kit row chevron: SF semibold 17/22, tertiary (muted) color.
  chevronGlyph: (t) => ({ fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43, color: t["muted-foreground"] }),
  chevronIcon: null,
  menuButton: { ...MENU, borderRadius: 6 },
  // 28pt box + 8pt each side = a 44pt HIG-minimum touch target.
  menuHitSlop: 8,
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 list / outlined card) ----------
// A 12-radius bordered card, FLAT (M3 outlined card: a 1px outline, no shadow);
// the two-line list item is a FIXED 72dp row (M3 lists container-height token);
// a full-width 1px divider; M3 body type with M3 tracking (name body-large
// 16/24/+0.5, subtitle body-medium 14/20/+0.25, trailing supporting text
// label-small 11/16/500/+0.5); a 16/500/+0.15 title-medium header; the drilldown
// affordance is a 24dp Icon, and the overflow menu is rounded-full with a 48dp
// hitSlop target (the M3 icon-button target auto-fills the item height). Press =
// android_ripple (a neutral surface state layer); no opacity dim.
const ANDROID_RADIUS = 12;
const ANDROID_ROW_HEIGHT = 72;
export const androidSkin: StackedListSkin = {
  cardSurface: (t) => ({
    borderRadius: ANDROID_RADIUS,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: "hidden",
  }),
  rowBase: { ...ROW, gap: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: ANDROID_ROW_HEIGHT },
  rowDivider: (t) => ({ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: t.border }),
  pressedSurface: () => ({}),
  nameLabel: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0.5, color: t.foreground }),
  mutedLabel: (t) => ({ fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: t["muted-foreground"] }),
  metaLabel: (t) => ({ fontSize: 11, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5, color: t["muted-foreground"] }),
  header: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  }),
  headerTitle: (t) => ({ fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: t.foreground }),
  // The M3 trailing drilldown affordance is a 24dp icon, not a text glyph.
  chevronGlyph: null,
  chevronIcon: 24,
  // overflow:hidden clips the bounded Material ripple to the rounded (circular) outline.
  menuButton: { ...MENU, borderRadius: 9999, overflow: "hidden" },
  // 28dp box + 10dp each side = a 48dp M3-minimum touch target.
  menuHitSlop: 10,
  pressedOpacity: null,
  ripple: (t) => surfaceRipple(t),
};
