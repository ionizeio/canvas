import { type ComponentType } from "react";
import { type ViewStyle, type TextStyle } from "react-native";
import { surfaceRipple, type ColorTokens, shape } from "../../style/index.js";
import { type CheckboxIndicatorProps } from "../../atoms/checkbox/indicator/shared.js";
import { type BadgeProps } from "../../atoms/badge/badge.shared.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";

// Per-OS FilterPanel skins. FilterPanel is a "Light" treatment: identical
// structure and semantic colors (those live in filter-panel.shared.tsx); only the
// panel radius, spacing density, group-heading tracking, and the press feedback on
// the OWN option rows shift per OS. The atom looks (the Checkbox box and the count
// Badge) are NOT re-skinned here: the platform Checkbox/Badge are passed into
// createFilterPanel by each wrapper.
//
//   Web: the established Canvas look (the current panel, lifted verbatim) — 8px
//     card radius, p-3/p-4 inset, gap-3/gap-5 stacks, 12px / +0.4 tracking
//     uppercase group headings, no row press feedback (the row was a plain View).
//   iOS (HIG): filters live in a sheet/popover built from standard controls, so
//     the panel reads as an iOS grouped surface — a softer 12px card radius, the
//     group heading uses SF-style footnote tracking (slightly tighter), and the
//     option row dims to ~0.8 opacity on press (the iOS press idiom).
//   Android (Material 3): the side-sheet surface — a larger 16dp card radius, the
//     group heading uses M3 title-small tracking (+0.1) and is NOT uppercased
//     (M3 section headers are sentence/Title case), and the option row shows a
//     native ripple state layer instead of an opacity dim.

export type Density = "compact" | "base";

// The atoms FilterPanel composes are passed in per platform (see createFilterPanel).
export type CheckboxComponent = ComponentType<CheckboxIndicatorProps>;
export type BadgeComponent = ComponentType<BadgeProps>;
export type ButtonComponent = ComponentType<ButtonProps>;

// The only thing a platform skin owns: the panel shape, the density paddings/gaps,
// the header/group/row layout fragments, the group-heading type, and the press
// feedback mode for the OWN option rows. Everything else is the shell.
export interface FilterPanelSkin {
  /** Fixed panel width + column layout, shared by both surfaces. */
  panelBase: ViewStyle;
  /** `bordered` card chrome: radius + border + card fill (radius is per-OS). */
  borderedSurface: (tokens: ColorTokens) => ViewStyle;
  /** Panel inset per density. */
  panelPad: Record<Density, ViewStyle>;
  /** Vertical rhythm between header and groups, and between groups, per density. */
  panelStack: Record<Density, ViewStyle>;
  /** Row spacing inside a group + between a group's title and options, per density. */
  groupGap: Record<Density, ViewStyle>;
  /** Header row: title cluster left, Clear right. */
  headerRow: ViewStyle;
  /** Title + active-count cluster. */
  titleCluster: ViewStyle;
  /** "Filters" heading type. */
  titleText: (tokens: ColorTokens) => TextStyle;
  /** A group column (title above its option list). */
  groupColumn: ViewStyle;
  /** Group heading type (the per-OS tracking/case touch lives here). */
  groupTitle: (tokens: ColorTokens) => TextStyle;
  /** One option row: checkbox left, optional count badge right. */
  optionRow: ViewStyle;
  /** iOS/web dim the row on press; Android uses a ripple instead (null). */
  rowPressedOpacity: number | null;
  /** Android ripple over the option row; null on iOS/web. */
  rowRipple: ((tokens: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// --- shared layout fragments (identical across platforms) -------------------

// Fixed panel width (w-[280px]) and column layout; capped so the panel shrinks
// inside narrower parents (which is all a phone screen is) instead of overflowing.
const PANEL_BASE: ViewStyle = { width: 280, maxWidth: "100%", flexDirection: "column" };

// Android side-sheet container token: 256dp width (M3 side sheets docked-modal
// container width; max 400dp). The web/iOS panel keeps the established 280 rail.
const ANDROID_PANEL_BASE: ViewStyle = { width: 256, maxWidth: "100%", flexDirection: "column" };

// Header row: title cluster on the left, the Clear action on the right.
const HEADER_ROW: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
};

// Title + active-count cluster (a row with a small gap).
const TITLE_CLUSTER: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// A group column (the title above its option list).
const GROUP_COLUMN: ViewStyle = { flexDirection: "column" };

// One option row: checkbox on the left, optional count badge on the right.
const OPTION_ROW: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

// The native option rows raise the tap target to the platform minimum while
// keeping the same centered checkbox/label/count layout (alignItems center holds
// the visual rhythm). iOS HIG minimum interactive target = 44pt; M3 = 48dp.
const IOS_OPTION_ROW: ViewStyle = { ...OPTION_ROW, minHeight: 44 };
const ANDROID_OPTION_ROW: ViewStyle = { ...OPTION_ROW, minHeight: 48 };

// Panel inset per density (p-3 compact / p-4 base). Shared by web/iOS.
const PANEL_PAD: Record<Density, ViewStyle> = {
  compact: { padding: 12 },
  base: { padding: 16 },
};

// Android inset: M3 side sheets use 24dp start/end padding. Only the base density
// takes the wider inset (the compact density keeps the tighter 12dp all-around).
const ANDROID_PANEL_PAD: Record<Density, ViewStyle> = {
  compact: { padding: 12 },
  base: { paddingHorizontal: 24, paddingVertical: 16 },
};

// Vertical rhythm between the header and groups, and between groups
// (gap-3 compact / gap-5 base).
const PANEL_STACK: Record<Density, ViewStyle> = {
  compact: { gap: 12 },
  base: { gap: 20 },
};

// Row spacing inside a group, and between a group's title and its options
// (gap-1.5 compact / gap-2 base).
const GROUP_GAP: Record<Density, ViewStyle> = {
  compact: { gap: 6 },
  base: { gap: 8 },
};

// "Filters" heading: small, semibold, on the foreground token (web/established look).
function titleText(tokens: ColorTokens): TextStyle {
  return { fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground };
}

// iOS: same 14/20 semibold header, plus SF Pro Text tracking at 14pt = -0.15.
function iosTitleText(tokens: ColorTokens): TextStyle {
  return {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: -0.15,
    color: tokens.foreground,
  };
}

// Android: M3 title-small = 14/20, weight 500 (600 is not an M3 role weight),
// tracking +0.1.
function androidTitleText(tokens: ColorTokens): TextStyle {
  return {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.1,
    color: tokens.foreground,
  };
}

// ---------- Web: the established Canvas look ----------
export const webSkin: FilterPanelSkin = {
  panelBase: PANEL_BASE,
  // `bordered` wraps the panel as a rounded card: the card corner on the card
  // fill. The card token follows light/dark (and stays solid under glass), so read it
  // from tokens rather than hardcoding its hex.
  borderedSurface: (tokens) => ({
    borderRadius: shape.web.card,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
  }),
  panelPad: PANEL_PAD,
  panelStack: PANEL_STACK,
  groupGap: GROUP_GAP,
  headerRow: HEADER_ROW,
  titleCluster: TITLE_CLUSTER,
  titleText,
  groupColumn: GROUP_COLUMN,
  // Extra-small, medium, uppercase, wide tracking, muted (the original look).
  groupTitle: (tokens) => ({
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: tokens["muted-foreground"],
  }),
  optionRow: OPTION_ROW,
  // The web row was a plain View with no press feedback; keep it inert.
  rowPressedOpacity: null,
  rowRipple: null,
};

// ---------- iOS (HIG): grouped sheet/popover surface, dim on press ----------
export const iosSkin: FilterPanelSkin = {
  panelBase: PANEL_BASE,
  // iOS grouped surfaces are softly rounded; bump the card radius to 12, with the
  // continuous (superellipse) corner curve HIG surfaces use (RN iOS-only, no-op on
  // web/Android).
  borderedSurface: (tokens) => ({
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
  }),
  panelPad: PANEL_PAD,
  panelStack: PANEL_STACK,
  groupGap: GROUP_GAP,
  headerRow: HEADER_ROW,
  titleCluster: TITLE_CLUSTER,
  titleText: iosTitleText,
  groupColumn: GROUP_COLUMN,
  // SF-style footnote header: uppercase, slightly tighter tracking than web.
  groupTitle: (tokens) => ({
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    color: tokens["muted-foreground"],
  }),
  // 44pt minimum tap target (HIG); the checkbox stays centered.
  optionRow: IOS_OPTION_ROW,
  // iOS press idiom: dim the row to ~0.8.
  rowPressedOpacity: 0.8,
  rowRipple: null,
};

// ---------- Android (Material 3): side-sheet surface, ripple on press ----------
export const androidSkin: FilterPanelSkin = {
  // M3 side sheets docked-modal container width token = 256dp.
  panelBase: ANDROID_PANEL_BASE,
  // M3 side sheets / large containers use a 16dp corner radius.
  borderedSurface: (tokens) => ({
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
  }),
  // M3 side sheets: 24dp start/end padding on the standard (base) density.
  panelPad: ANDROID_PANEL_PAD,
  panelStack: PANEL_STACK,
  groupGap: GROUP_GAP,
  headerRow: HEADER_ROW,
  titleCluster: TITLE_CLUSTER,
  // M3 title-small (14/20/500/+0.1) for the "Filters" header.
  titleText: androidTitleText,
  groupColumn: GROUP_COLUMN,
  // M3 label-medium (12/16/500/+0.5) group heading, Title case (NOT uppercased,
  // which is the M3 convention for list/section subheaders).
  groupTitle: (tokens) => ({
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: tokens["muted-foreground"],
  }),
  // 48dp minimum tap target (M3); the checkbox stays centered.
  optionRow: ANDROID_OPTION_ROW,
  // M3 row press is a ripple state layer, not an opacity dim.
  rowPressedOpacity: null,
  rowRipple: (tokens) => surfaceRipple(tokens),
};
