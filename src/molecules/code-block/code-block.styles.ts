import { type ViewStyle, type TextStyle } from "react-native";
import { palette, shadow, alpha, MONO_FONT, platformMinTarget, shape, type ColorTokens } from "../../style/index.js";
import { type CodeBlockSkin } from "./code-block.shared.js";

// Co-located CodeBlock skins. Layout-only fragments are static objects; anything
// that reads a color is a function of the active tokens, so the muted surface
// follows light/dark. Surfaced CodeBlock variants use static content frost with
// these opaque fills as their solid fallback. Code ink stays unwarped. The terminal
// variant is intentionally a fixed dark window built from the Tailwind palette
// (zinc/emerald/red/amber/green), so it stays dark in every scheme.
//
// CodeBlock is a "Shared" platform treatment: neither iOS nor Android ships a code
// display control, and the web reference is the standard `pre`/`code` HTML pattern,
// so there is ONE look on every platform. `iosSkin` and `androidSkin` therefore
// reference the SAME object as `webSkin` (no fabricated per-OS difference); the skin
// contract exists only so the file pattern matches the rest of the kit.

export type Variant = "terminal" | "numbered" | "inline" | "plain";

// Monospace face: requested inline since RN has no font-family utility (the same
// approach Badge's `mono` modifier uses).
export const MONO = { fontFamily: MONO_FONT } as const;

// --- type ramp ---------------------------------------------------------------

// Shared code type: text-sm leading-relaxed, and the compact ramp (13/20) used by
// dense contexts such as documentation side-by-side panes.
const codeType: TextStyle = { fontSize: 14, lineHeight: 28 };
const codeTypeCompact: TextStyle = { fontSize: 13, lineHeight: 20 };

// Code foreground color (text-foreground).
function codeText(tokens: ColorTokens): TextStyle {
  return { color: tokens.foreground };
}

// --- surface -----------------------------------------------------------------

// The shared code surface: a muted, bordered, rounded card. `overflow: "hidden"`
// clips full-bleed row tints (line highlight, diff) at the rounded corners.
// The code surface is OPAQUE: it is a content surface, and the hand-off paints it
// var(--muted) flat. It used to carry a half-transparent muted fill, translated
// literally from a Tailwind bg-muted/50 in the kit's shadcn-era origins, which meant
// a code block sitting over any backdrop (a photo, a glass page)
// showed it straight through the code.
function surface(tokens: ColorTokens): ViewStyle {
  return {
    width: "100%",
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: shape.web.control,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.muted,
  };
}

// `attached`: the block sits flush under an adjoining bar/stage, so its top edge
// squares off and the shared border is not doubled.
const attachedTop: ViewStyle = {
  borderTopStartRadius: 0,
  borderTopEndRadius: 0,
  borderTopWidth: 0,
};

// The padding unit per density: p-4 default, p-3 compact.
function padUnit(compact: boolean): number {
  return compact ? 12 : 16;
}

// Vertical padding of the rows column (horizontal padding lives on each row so
// line tints run full-bleed to the surface edges).
function bodyPad(compact: boolean): ViewStyle {
  return { paddingVertical: padUnit(compact) };
}

// Horizontal padding of one code row. With a pinned gutter to the left, the row
// keeps only its end padding (the gutter carries the start inset).
function rowPad(compact: boolean, gutter: boolean): ViewStyle {
  return {
    flexDirection: "row",
    paddingStart: gutter ? 0 : padUnit(compact),
    paddingEnd: padUnit(compact),
  };
}

// --- header bar (filename/language label, tab strip, hosted copy chip) -------

// The header bar above the code surface: a muted, bordered strip whose bottom
// edge meets the surface's top edge. flex-row items-center justify-between
// rounded-t-lg border border-b-0 border-border bg-muted px-4 py-2.
function headerBar(tokens: ColorTokens): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "flex-start",
    width: "100%",
    borderTopStartRadius: 8,
    borderTopEndRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.border,
    backgroundColor: tokens.muted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  };
}

// When the header hosts a tab strip, the tabs carry their own vertical rhythm
// (and their active underline must sit on the bar's bottom edge).
const headerBarWithTabs: ViewStyle = { paddingVertical: 0, paddingStart: 8 };

// The header label type: text-xs muted-foreground (the file name).
function headerLabel(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

// The trailing language badge shown when both `filename` and `language` are set:
// same ramp as the label, dimmed a step.
function headerBadge(tokens: ColorTokens): TextStyle {
  return {
    fontSize: 11,
    lineHeight: 16,
    color: alpha(tokens["muted-foreground"], 0.8),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };
}

// When a header bar sits above the surface, the surface's own top corners must be
// squared off so the two strips read as one card.
const surfaceUnderHeader: ViewStyle = { borderTopStartRadius: 0, borderTopEndRadius: 0 };

// --- tab strip ---------------------------------------------------------------

// The tab row hosted by the header bar (or the terminal chrome).
const tabStrip: ViewStyle = {
  flexDirection: "row",
  alignItems: "stretch",
  flexShrink: 1,
};

// One tab: comfortable hit area, a 2px underline that lights up when active.
// The `dark` flag styles the terminal-chrome incarnation (fixed dark window).
function tabItem(tokens: ColorTokens, active: boolean, dark: boolean): ViewStyle {
  const underline = dark ? palette["emerald-400"] : tokens.primary;
  return {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: active ? underline : "transparent",
    justifyContent: "center",
  };
}

function tabLabel(tokens: ColorTokens, active: boolean, dark: boolean): TextStyle {
  const on = dark ? palette["zinc-100"] : tokens.foreground;
  const off = dark ? palette["zinc-400"] : tokens["muted-foreground"];
  return {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: active ? "600" : "400",
    color: active ? on : off,
  };
}

// --- line emphasis (highlightLines) ------------------------------------------

// A highlighted row: a soft primary wash that reads in both schemes.
function highlightRow(tokens: ColorTokens, dark: boolean): ViewStyle {
  return { backgroundColor: alpha(tokens.primary, dark ? 0.18 : 0.08) };
}

// --- diff mode ---------------------------------------------------------------

// Added/removed rows: soft green/red washes, GitHub-style.
function diffRow(kind: "add" | "del", dark: boolean): ViewStyle {
  const hue = kind === "add" ? palette["green-500"] : palette["red-500"];
  return { backgroundColor: alpha(hue, dark ? 0.16 : 0.1) };
}

// The +/- marker glyph: colored, monospace-aligned, and excluded from selection
// so a copied block never drags diff markers along.
function diffMarker(kind: "add" | "del" | "ctx", tokens: ColorTokens, dark: boolean): TextStyle {
  const color =
    kind === "add"
      ? dark
        ? palette["green-400"]
        : palette["green-700"]
      : kind === "del"
        ? dark
          ? palette["red-400"]
          : palette["red-700"]
        : tokens["muted-foreground"];
  return { color, userSelect: "none" };
}

// --- numbered gutter ---------------------------------------------------------

// The pinned line-number column: right-aligned digits, start inset matching the
// surface padding. Sits OUTSIDE the horizontal scroller so numbers never scroll.
function gutterCol(compact: boolean): ViewStyle {
  return { alignItems: "stretch", paddingStart: padUnit(compact) };
}

// One gutter row: right-aligned number with the same end inset as a code row's
// start gap, so tinted rows read as one continuous band.
function gutterRow(compact: boolean): ViewStyle {
  return { alignItems: "flex-end", paddingEnd: padUnit(compact) };
}

// Dimmed line numbers (text-muted-foreground), sharing the code type.
// `userSelect: "none"` keeps the line numbers out of a copied selection, so the
// pasted block is clean, runnable code (cross-platform RN TextStyle prop).
function gutterText(tokens: ColorTokens): TextStyle {
  return { color: tokens["muted-foreground"], userSelect: "none" };
}

// --- collapsible expander ----------------------------------------------------

// The expander bar under a collapsed block: a bordered, centered control row.
function expanderBar(tokens: ColorTokens): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    borderColor: tokens.border,
    paddingVertical: 8,
  };
}

function expanderLabel(tokens: ColorTokens): TextStyle {
  return {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: tokens["muted-foreground"],
  };
}

// --- terminal variant --------------------------------------------------------

// relative w-full self-start overflow-hidden rounded-lg border border-border shadow-sm
function terminalOuter(tokens: ColorTokens): ViewStyle {
  return {
    position: "relative",
    width: "100%",
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tokens.border,
    ...shadow("sm"),
  };
}

// Chrome bar: flex-row items-center gap-1.5 border-b border-zinc-700 bg-zinc-800 px-4 py-2.5
const terminalChrome: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  borderBottomWidth: 1,
  borderColor: palette["zinc-700"],
  backgroundColor: palette["zinc-800"],
  paddingHorizontal: 16,
  paddingVertical: 10,
  minHeight: 40,
};

// When the chrome hosts a tab strip, the tabs carry the vertical rhythm.
const terminalChromeWithTabs: ViewStyle = { paddingVertical: 0 };

// Traffic-light dot: h-3 w-3 rounded-full bg-<hue>-500.
function trafficDot(hue: "red" | "amber" | "green"): ViewStyle {
  return { height: 12, width: 12, borderRadius: 9999, backgroundColor: palette[`${hue}-500`] };
}

// Chrome label: ml-2 text-xs text-zinc-400.
const terminalLabel: TextStyle = {
  marginStart: 8,
  fontSize: 12,
  lineHeight: 16,
  color: palette["zinc-400"],
};

// Terminal body: bg-zinc-900; vertical padding per density (rows carry horizontal).
function terminalBody(compact: boolean): ViewStyle {
  return { backgroundColor: palette["zinc-900"], paddingVertical: padUnit(compact) };
}

// The non-selectable prompt: text-emerald-400. `userSelect: "none"` keeps the
// shell glyph out of a copied selection (it is a cross-platform RN TextStyle prop).
const terminalPrompt: TextStyle = { color: palette["emerald-400"], userSelect: "none" };

// The command line itself: text-zinc-100.
const terminalLine: TextStyle = { color: palette["zinc-100"] };

// A transcript output line: dimmed, no prompt.
const terminalOutput: TextStyle = { color: palette["zinc-400"] };

// --- inline variant ----------------------------------------------------------

// self-start rounded border border-border bg-muted px-1.5 py-0.5
function inlineBox(tokens: ColorTokens): ViewStyle {
  return {
    alignSelf: "flex-start",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
  };
}

// The inline pill's own smaller size (text-[13px]).
const inlineType: TextStyle = { fontSize: 13 };

// --- copy affordance ---------------------------------------------------------

// The copy chip: flex-row items-center gap-1 rounded-md border px-2.5 py-1.
// Positioning is NOT part of the chip: a floating chip is placed by an
// absolutely-positioned wrapper in the shell (which also measures its width so
// code rows can reserve a matching end inset). `floating` only picks the soft
// shadow a chip needs when it hovers over code; hosted chips sit flat inside
// the header/chrome bar. The fill/border follows the dark branch: dark window
// vs light surface.
function copyButton(tokens: ColorTokens, dark: boolean, floating: boolean): ViewStyle {
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  };
  // The `dark` flag here is the CopyButton's own (terminal forces it); it picks
  // the dark zinc chip vs the light background chip.
  return dark
    ? { ...base, borderColor: palette["zinc-600"], backgroundColor: palette["zinc-700"] }
    : { ...base, borderColor: tokens.border, backgroundColor: tokens.background, ...(floating ? shadow("sm") : null) };
}

// Copy label: text-xs font-medium, color per dark branch.
function copyText(tokens: ColorTokens, dark: boolean): TextStyle {
  return {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: dark ? palette["zinc-300"] : tokens["muted-foreground"],
  };
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// The current code-block surface: a muted, bordered, rounded card with the
// terminal / numbered / inline variants and the copy chip described above. This is
// the single source of truth for the one shared look.
export const webSkin: CodeBlockSkin = {
  // One shared skin across the three platforms (a code surface is
  // platform-neutral), so the minimum comes from the platform at runtime.
  minTarget: platformMinTarget(),
  codeType,
  codeTypeCompact,
  codeText,
  surface,
  attachedTop,
  bodyPad,
  rowPad,
  headerBar,
  headerBarWithTabs,
  headerLabel,
  headerBadge,
  surfaceUnderHeader,
  tabStrip,
  tabItem,
  tabLabel,
  highlightRow,
  diffRow,
  diffMarker,
  gutterCol,
  gutterRow,
  gutterText,
  expanderBar,
  expanderLabel,
  terminalOuter,
  terminalChrome,
  terminalChromeWithTabs,
  trafficDot,
  terminalLabel,
  terminalBody,
  terminalPrompt,
  terminalLine,
  terminalOutput,
  inlineBox,
  inlineType,
  copyButton,
  copyText,
  copyPressedOpacity: 0.8,
};

// ---------- iOS / Android: identical to web (Shared treatment) ----------
// CodeBlock has no native iOS/Android control to match (the reference catalog marks
// both `(none)`), so there is one look everywhere. These intentionally reference the
// same object as `webSkin`; do NOT fabricate per-OS differences here.
export const iosSkin: CodeBlockSkin = webSkin;
export const androidSkin: CodeBlockSkin = webSkin;
