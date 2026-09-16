import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, shadow, surfaceRipple, shape } from "../../style/index.js";

// Co-located Command skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark and the glass surface, since
// the shell renders the panel through GlassSurface, which strips the skin's fill
// and paints the active material over its own `glass-tint`; the `popover` token
// itself is opaque in both modes and glass never rewrites it). Command is a
// "Light" platform treatment: ONE structure (the GlassSurface panel, the search
// row, grouped result rows, the optional group heading, the optional footer, and
// the collapsed trigger) with small per-OS touches. The BRAND survives on every
// platform — the accent highlight, the popover/foreground/muted tokens, never a
// platform default color.
//
// The skin covers ONLY the search row + the grouped result rows + the active-row
// highlight, per the component guidance: the GlassSurface panel and its
// material, the card shell, the collapsed trigger, the group heading, the footer
// hint bar, and the Kbd caps stay shared in the shell and are NOT re-skinned.
//
// Reference catalog (PLATFORM-REFERENCES.md, command row): the web look matches
// shadcn/cmdk (the current Canvas look, lifted verbatim). iOS and Android have
// NO native command palette (both `(none)`), so those skins keep the same
// structure and apply only the platform's list-row conventions:
//   iOS (HIG grouped list rows): comfortable ~44pt rows, body type (17/22) with
//     tightened tracking, a slightly larger search row; the active/pressed row
//     tints with the brand `accent` and the row dims to ~0.8 opacity on press
//     (no ripple).
//   Android (Material 3 list items): ~48dp rows, body-large type (16/24 with
//     +0.5 tracking), an M3 search row; the active/pressed row tints with
//     `accent` and press shows an android_ripple (the surfaceRipple state layer:
//     on-surface ink at ~10%).
//   Web: the established Canvas look (the current command rows, lifted verbatim)
//     — a 12/12 search row, 14/20 muted type, 12/8 result rows, 14/20 foreground
//     type, the `accent` fill for both the active and the pressed row.

// The contract a platform skin fulfills. The shell owns the structure (the
// GlassSurface panel, the card shell, the trigger, the group heading, the footer)
// and the open/close + active-index state; the skin maps tokens and the active
// row state to RN style objects for the search row and the result rows, and
// declares its press-feedback mode (iOS/web dim or tint inline, Android ripples).
export interface CommandSkin {
  /** The search row at the top of the panel: gap, padding, hairline under it. */
  searchRow: (t: ColorTokens) => ViewStyle;
  /** The leading magnifier glyph size (px), rendered through the kit `Icon`
   *  atom (`search`, tinted muted-foreground) — never a color emoji. */
  searchGlyphSize: number;
  /** The search input's type metrics, in the muted placeholder color (the
   *  shell repaints typed text with `foreground`). */
  searchPlaceholder: (t: ColorTokens) => TextStyle;
  /** The card's per-OS shape override (radius, and `borderCurve` on iOS): merged
   *  over the shared `card()` base so iOS gets a rounder, continuous corner. */
  cardShape: ViewStyle;
  /** The collapsed trigger row's minimum tap height (px): the HIG/M3 minimum on
   *  the native rows (44pt iOS, 48dp Android), the web look on web. */
  triggerMinHeight: number;
  /** A single result row layout (gap, padding, min height). */
  rowBase: ViewStyle;
  /** The active/pressed row fill (the brand accent surface on every platform). */
  rowAccent: (t: ColorTokens) => ViewStyle;
  /** A row's leading Canvas icon size (px), per platform. */
  iconSize: number;
  /** A row's label type (takes the remaining width). */
  rowLabel: (t: ColorTokens) => TextStyle;
  /** iOS/web dim a row on press; Android ripples instead (null). */
  rowPressedOpacity: number | null;
  /** Android ripple over the rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// ---------- card shell (shared across platforms) ----------
// The floating palette card: the standard 420px width, rounded, bordered,
// raised, clipping its rounded corners. (w-[420px] rounded-lg border
// border-border bg-popover shadow-xl overflow-hidden.) `maxWidth:"100%"` beside the
// width is the floating-container pattern (a palette is a bounds provider for its
// own content): it keeps the 420px desktop palette but shrinks the card inside a
// narrower parent, so it
// never overflows a 390/393pt iPhone or a 360dp Android phone. GlassSurface
// strips the fill and supplies the material when the surface is glass; the shape
// (radius/border/clip) is the skin's, with the per-OS radius/curve layered on via
// `skin.cardShape`. This base is identical on every platform: only the rows and
// the corner shape are re-skinned.
export const CARD_WIDTH = 420;

export function card(tokens: ColorTokens): ViewStyle {
  return {
    width: CARD_WIDTH,
    maxWidth: "100%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.popover,
    overflow: "hidden",
    ...shadow("xl"),
  };
}

// In trigger mode the card floats below the collapsed trigger button.
// (absolute top-full left-0 z-50 mt-3.)
export const cardFloating: ViewStyle = {
  position: "absolute",
  top: "100%",
  start: 0,
  zIndex: 50,
  marginTop: 12,
};

// ---------- group heading (shared across platforms) ----------
// The optional uppercase section heading above a group's rows.
// (uppercase text-xs text-muted-foreground px-3 pt-3 pb-1.)
export function groupHeading(tokens: ColorTokens): TextStyle {
  return {
    textTransform: "uppercase",
    fontSize: 12,
    lineHeight: 16,
    color: tokens["muted-foreground"],
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  };
}

// ---------- collapsed trigger (shared across platforms) ----------
// The wrapper around the collapsed trigger + the floating card. (relative w-full.)
export const triggerWrapper: ViewStyle = { position: "relative", width: "100%" };

// When the palette is open in trigger mode, the wrapper is lifted into its own
// stacking context above sibling content. react-native-web gives every
// positioned View an implicit stacking context, so the floating card's own
// `zIndex` is scoped INSIDE the `relative` wrapper and cannot rise above a later
// sibling. Raising the wrapper's zIndex while open lifts the whole control —
// trigger and palette together — above everything painted after it.
export const triggerWrapperLifted: ViewStyle = { zIndex: 50 };

// The collapsed full-width search trigger button.
// (flex-row items-center gap-2 w-full justify-start rounded-md border
//  border-input bg-transparent px-3 py-1.5.)
export function triggerRow(tokens: ColorTokens): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    justifyContent: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tokens.input,
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
  };
}

// The trigger button's "Search..." label. (text-sm text-foreground.)
export function triggerLabel(tokens: ColorTokens): TextStyle {
  return { fontSize: 14, lineHeight: 20, color: tokens.foreground };
}

// Pushes the trailing kbd cap to the right edge of the trigger. (ml-auto.)
export const triggerKbd: ViewStyle = { marginStart: "auto" };

// ---------- empty state (shared across platforms) ----------
// The muted "No results" row shown when the query matches nothing.
export const emptyRow: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 24,
};

// The empty row's supporting text. (text-sm text-muted-foreground.)
export function emptyText(tokens: ColorTokens): TextStyle {
  return { fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] };
}

// ---------- footer hint bar (shared across platforms) ----------
// The footer hint bar below the list. (flex-row items-center gap-3 border-t
// border-border px-4 py-2.5.)
export function footerBar(tokens: ColorTokens): ViewStyle {
  return {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  };
}

// A single hint cluster in the footer (kbd cap(s) + its text).
// (flex-row items-center gap-1.)
export const footerHint: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// A hint's supporting text. (text-xs text-muted-foreground.)
export function footerText(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// A 12/12 search row with a hairline under it (px-3 py-3, 14/20 muted glyph +
// placeholder), result rows at px-3 py-2 (gap-3, 14/20 foreground), and the
// `accent` fill for both the active and the pressed row (active:bg-accent). The
// press feedback IS the accent fill (no opacity dim, no ripple).
export const webSkin: CommandSkin = {
  searchRow: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  }),
  // A 16px search icon; the kit uses a real monochrome Icon tinted muted-foreground
  // (never a color emoji).
  searchGlyphSize: 16,
  searchPlaceholder: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  // The Riskora palette card: the 16px menu corner.
  cardShape: { borderRadius: shape.web.menu },
  // 40px rows, the Riskora menu row.
  triggerMinHeight: 40,
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowAccent: (t) => ({ backgroundColor: t.accent }),
  iconSize: 16,
  rowLabel: (t) => ({
    fontSize: 14,
    lineHeight: 20,
    color: t.foreground,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
  }),
  rowPressedOpacity: null,
  ripple: null,
};

// ---------- iOS (HIG grouped list rows): comfortable rows, body type, dim on press ----------
// iOS has no native command palette, so the structure is unchanged; the rows
// follow iOS grouped-list conventions: a comfortable ~44pt row height, iOS body
// type (17/22) with tightened tracking (-0.4), a slightly larger search row
// (px-4 py-3.5, 17/22 muted). The active/pressed row tints with the brand
// `accent` (not the iOS system fill) and the row dims to ~0.8 opacity on press;
// no ripple.
export const iosSkin: CommandSkin = {
  searchRow: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 44,
  }),
  // A 20px monochrome search Icon (muted-foreground) pairs with the 17/22
  // placeholder — never the color emoji the shell used to draw.
  searchGlyphSize: 20,
  searchPlaceholder: (t) => ({
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    color: t["muted-foreground"],
  }),
  // iOS floating functional surfaces read rounder and smooth-cornered: a larger
  // 16pt radius with the continuous (superellipse) corner curve (borderCurve is a
  // no-op on web/Android). GlassSurface strips the border under glass.
  cardShape: { borderRadius: 16, borderCurve: "continuous" },
  // HIG minimum interactive target 44x44pt.
  triggerMinHeight: 44,
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
  },
  rowAccent: (t) => ({ backgroundColor: t.accent }),
  iconSize: 20,
  rowLabel: (t) => ({
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.4,
    color: t.foreground,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
  }),
  rowPressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3 list items): 48dp rows, body-large, ripple ----------
// Android has no native command palette, so the structure is unchanged; the rows
// follow M3 list-item conventions: a ~48dp row height, M3 body-large type
// (16/24 with +0.5 body-large tracking), an M3 search row (px-4 py-3.5, 16/24
// muted). The active/pressed row tints with the brand `accent`, and press shows
// an android_ripple (the surfaceRipple M3 state layer: on-surface ink at ~10%,
// bounded).
export const androidSkin: CommandSkin = {
  searchRow: (t) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  }),
  // A 20dp monochrome search Icon (muted-foreground ≈ M3 on-surface-variant) —
  // the M3 search idiom, never the Noto color-emoji magnifier.
  searchGlyphSize: 20,
  searchPlaceholder: (t) => ({
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: t["muted-foreground"],
  }),
  // Android keeps the 8px card corner (the shared web look; borderCurve is iOS-only).
  cardShape: { borderRadius: 8 },
  // M3 minimum touch target 48x48dp.
  triggerMinHeight: 48,
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowAccent: (t) => ({ backgroundColor: t.accent }),
  iconSize: 20,
  rowLabel: (t) => ({
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: t.foreground,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
  }),
  rowPressedOpacity: null,
  // The M3 pressed state layer for a neutral list row is on-surface ink at ~10%,
  // bounded (the card's overflow:"hidden" clips it) — the kit's surfaceRipple,
  // not a primary-tinted ink.
  ripple: (t) => surfaceRipple(t),
};
