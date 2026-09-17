import { type ViewStyle, type TextStyle } from "react-native";
import { palette, shadow, alpha, surfaceRipple, tabularNums, shape, type ColorTokens } from "../../style/index.js";
import { SPARK_STRIP_HEIGHT } from "../../charts/sparkline/sparkline.styles.js";
import { type StatsSkin } from "./stats.shared.js";

// Co-located Stats skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so the surfaces follow light/dark). Stats is a
// content surface: card items use static frost in glass mode and tokens.card
// for the solid fallback; plain items inherit their host. The delta tone
// uses the Tailwind palette (a 600 hue in light, a 400 hue in dark), branched on
// the active scheme; that semantic color logic lives once in stats.shared.tsx, so
// the skin carries only the per-OS-varying pieces.
//
// Stats is a "Light" platform treatment: ONE structure (a wrapping row of
// label/value/delta metric stacks, optionally each in its own surface), with only
// small per-OS touches: corner radius, density/spacing, type tracking, shadow vs
// M3 outline, and the press feedback on a tappable item. Neither iOS nor Android
// ships a stat-tile control, so the native skins keep the structure and apply only
// platform conventions; they do NOT invent a new shape.
//   Web: the established Canvas look (the current stats, lifted verbatim) — a
//     bordered card surface (8 radius, 1px `border`, `card` fill, shadow-sm, p20),
//     the plain parent at p24, gaps 14/24, value 24/600 with -0.4 tracking, label
//     14 muted, delta 12/500. Press = opacity dim (0.9).
//   iOS (HIG / SF): iOS has no stat-tile control, so this stays a card-like inset
//     surface following SF conventions — a softer 12-radius continuous
//     (superellipse) corner, the same hairline border with NO shadow (iOS
//     inset-grouped surfaces read flat), slightly tighter density, SF tracking
//     tightened on the value (-0.5), and SF Pro Text table tracking on the rest
//     (16pt -0.31, 14pt -0.15, 12pt 0). Press = opacity dim (~0.8).
//   Android (Material 3 card): M3 has no stat component, so this stays an M3
//     outlined card — a 12-radius corner, a 1px outline and NO shadow (M3 outlined
//     cards are flat), M3 type roles (value headline-small 24/32/400/0, title
//     title-medium 16/24/500/+0.15 or title-small 14/20/500/+0.1, label body-medium
//     14/20/400/+0.25, delta label-medium 12/16/500/+0.5). Press = android_ripple
//     via surfaceRipple (neutral surface state layer); no opacity dim.

export type Surface = "card" | "plain";

// A wrapping row: items flow left to right and wrap to the next line when they
// run out of room (flex-row flex-wrap). Identical on every platform.
export const row: ViewStyle = { flexDirection: "row", flexWrap: "wrap" };

// --- semantic / platform-neutral pieces (shared by every skin) --------------

// Per-item minimum width and growth, by surface. Card items hold a wider floor
// and grow (flex-1 min-w-48); plain stacks pack tighter (min-w-28). Identical
// on every platform (a layout contract, not a per-OS touch).
export const item: Record<Surface, ViewStyle> = {
  card: { flexGrow: 1, flexShrink: 1, flexBasis: "0%", minWidth: 192 },
  plain: { minWidth: 112 },
};

// The trend strip an item renders when it carries `spark` data: it sits below the
// value/delta and spans the full metric width (so the bars fill the stack rather
// than a fixed 120px). A layout contract shared by every skin, like `row`/`item`.
export const sparkStrip: ViewStyle = { marginTop: 12 };

// The composition strip an item renders when it carries `share`: the same slot,
// the same full width, and the SAME RESERVED HEIGHT as the trend strip, with the
// bar sitting on the strip's floor.
//
// On the floor rather than centred in the band, because that is where a
// Sparkline's bars sit (`alignItems: "flex-end"`), and a row that mixes the two
// then shares one baseline. Centred, the composition bar floated seven pixels
// above its neighbours' baseline, which is a smaller version of the same
// "these tiles do not match" reading the strip exists to fix.
//
// The height is what makes a mixed row work. Cards in a Stats row stretch to the
// tallest sibling, so a row where one metric plots a trend and another draws a
// composition would otherwise leave the shorter cards with a band of blank space
// under their text, and a row of cards that are only half filled reads as an
// unfinished component rather than as a deliberate one. Reserving the trend
// strip's height for the composition strip keeps every card in the row filled to
// the same line.
export const shareStrip: ViewStyle = { marginTop: 12, width: "100%", height: SPARK_STRIP_HEIGHT, justifyContent: "flex-end" };

// The metric's header row, rendered only when the item carries an icon or a
// control: the label on the left, the glyph and control opposite it. A metric with
// neither keeps its bare label Text, so its tree is unchanged. A layout contract,
// identical on every platform.
export const headerRow: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 };

// The trailing cluster inside that row, so an icon and a control sit together
// rather than pushing each other apart.
export const headerTrailing: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// Delta tone: a rise reads green (text-green-600 dark:text-green-400), a decline
// reads red (text-red-600 dark:text-red-400). Semantic color, shared.
export function deltaTone(dark: boolean, down: boolean): TextStyle {
  const hue = down ? "red" : "green";
  return { color: dark ? palette[`${hue}-400`] : palette[`${hue}-600`] };
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
export const webSkin: StatsSkin = {
  // The Riskora stat card: the 20px card corner, a soft hairline, the ambient shade,
  // a 24px inset (the "Total Coverage Value" tile).
  cardSurface: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: shape.web.card,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 24,
    ...shadow("DEFAULT"),
  }),
  plainContainer: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: shape.web.card,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 24,
    ...shadow("DEFAULT"),
  }),
  // gap-4 (cards) / gap-6 (plain)
  rowGap: { card: { gap: 16 }, plain: { gap: 24 } },
  // Section titles are Title/H6: 20 regular (card) / Label/Medium 16 medium (plain)
  title: (tokens: ColorTokens, surface: Surface): TextStyle =>
    surface === "card"
      ? { fontSize: 20, lineHeight: 30, fontWeight: "400", color: tokens.foreground, marginBottom: 12 }
      : { fontSize: 16, lineHeight: 24, fontWeight: "500", color: tokens.foreground, marginBottom: 16 },
  // The stat label is Paragraph/Medium in the muted ink
  labelText: (tokens: ColorTokens): TextStyle => ({ fontSize: 16, lineHeight: 24, color: tokens["muted-foreground"] }),
  // The headline number is Title/H4: 36 at the regular weight, no tracking
  valueText: (tokens: ColorTokens): TextStyle => ({
    marginTop: 8,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "400",
    // Tabular figures: a headline number that updates in place must not
    // change width as its digits change, and a column of Stats cards should
    // line its values up.
    ...tabularNums(),
    color: tokens.foreground,
  }),
  // mt-2 text-xs font-medium (tone color layered on top by the shell)
  deltaBase: { marginTop: 8, fontSize: 12, lineHeight: 16, fontWeight: "500", ...tabularNums() },
  pressedOpacity: 0.9,
  ripple: (tokens) => ({ color: alpha(tokens.foreground, 0.1), borderless: false }),
};

// ---------- iOS (HIG / SF): inset card-like surface, flat, SF tracking ----------
export const iosSkin: StatsSkin = {
  cardSurface: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: 12,
    // The superellipse corner curve of Apple's inset-grouped surfaces (iOS-only prop).
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 18,
    // iOS inset-grouped surfaces read flat (no drop shadow).
  }),
  plainContainer: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 22,
  }),
  rowGap: { card: { gap: 12 }, plain: { gap: 22 } },
  // SF Pro Text tracking table: 16pt -0.31, 14pt -0.15, 12pt 0.
  title: (tokens: ColorTokens, surface: Surface): TextStyle =>
    surface === "card"
      ? { fontSize: 14, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15, color: tokens.foreground, marginBottom: 12 }
      : { fontSize: 16, lineHeight: 24, fontWeight: "600", letterSpacing: -0.31, color: tokens.foreground, marginBottom: 16 },
  labelText: (tokens: ColorTokens): TextStyle => ({ fontSize: 14, lineHeight: 20, letterSpacing: -0.15, color: tokens["muted-foreground"] }),
  valueText: (tokens: ColorTokens): TextStyle => ({
    marginTop: 4,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -0.5,
    // Tabular figures: a headline number that updates in place must not
    // change width as its digits change, and a column of Stats cards should
    // line its values up.
    ...tabularNums(),
    color: tokens.foreground,
  }),
  deltaBase: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "500", ...tabularNums(), letterSpacing: 0 },
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3): outlined card, flat, M3 tracking, ripple ----------
export const androidSkin: StatsSkin = {
  cardSurface: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: 12,
    // Clip the Material ripple to the rounded outline (a tappable card carries a bounded android_ripple).
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 16,
    // M3 outlined cards are flat (no elevation).
  }),
  plainContainer: (tokens: ColorTokens): ViewStyle => ({
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    padding: 24,
  }),
  rowGap: { card: { gap: 12 }, plain: { gap: 24 } },
  // M3 type roles: title-small (card) 14/20/500/+0.1, title-medium (plain) 16/24/500/+0.15.
  title: (tokens: ColorTokens, surface: Surface): TextStyle =>
    surface === "card"
      ? { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: tokens.foreground, marginBottom: 12 }
      : { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: tokens.foreground, marginBottom: 16 },
  // M3 body-medium: 14/20/400/+0.25.
  labelText: (tokens: ColorTokens): TextStyle => ({ fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: tokens["muted-foreground"] }),
  // M3 headline-small: 24/32/400/0.
  valueText: (tokens: ColorTokens): TextStyle => ({
    marginTop: 4,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "400",
    letterSpacing: 0,
    // Tabular figures: a headline number that updates in place must not
    // change width as its digits change, and a column of Stats cards should
    // line its values up.
    ...tabularNums(),
    color: tokens.foreground,
  }),
  // M3 label-medium: 12/16/500/+0.5.
  deltaBase: { marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "500", ...tabularNums(), letterSpacing: 0.5 },
  pressedOpacity: null,
  // Bounded neutral state layer from the shared ripple helper (the cardSurface's
  // overflow:"hidden" clips it to the rounded outline).
  ripple: surfaceRipple,
};
