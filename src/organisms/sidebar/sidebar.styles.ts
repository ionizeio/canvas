import { primaryText } from "../../style/primary-text.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, shape } from "../../style/index.js";
import { INSET_FOCUS_RING } from "../../style/pressable.js";
import { type SidebarSkin } from "./sidebar.shared.js";

// Co-located Sidebar skins, one per platform. The shell resolves the density,
// frame, and collapse axes, the section grouping, the flat-index active matching,
// the accordion open-state, the badges, and the select handler; the skin supplies
// only the native SHAPE of the nav row (its radius and height), the selected-row
// highlight (fill + label/icon color), the section heading, the frame (outer
// column), the collapse + accordion + header/footer chrome, and the press feedback.
// The BRAND survives on every platform (the indigo `primary`/`accent` tokens, never
// a platform default), so each follows light/dark and the glass surface.
//
//   iOS 27 (Liquid Glass) sidebar: grouped rows; the SELECTED row is a CAPSULE
//     highlight (radius 9999) filled with the light-gray `accent`, label in
//     `accent-foreground`, while the leading icon stays TINTED in `primary`;
//     section headers ~13pt 600 muted; ~36pt rows; press = opacity dim (0.8);
//     collapsible-section chevron = the HIG right caret (0 -> 90deg).
//   Android (M3 navigation drawer): each nav item is a fully-rounded PILL (radius
//     9999); the ACTIVE item is a tonal `alpha(primary, 0.12)` pill with the icon
//     + label in brand `primary`; inactive transparent with `foreground`; ~56dp
//     item height; press = android_ripple; collapsed rail = the 72dp M3 navigation
//     rail; collapsible-section chevron = the M3 expand_more (0 -> 180deg).
//   Web: the established Canvas look (row radius 6, `accent` fill on the active OR
//     pressed row, foreground/muted label + icon), lifted verbatim from the
//     original file; collapsible-section chevron = the Radix right caret (0 -> 90deg).

export type Density = "default" | "compact";
export type Frame = "flush" | "bordered";

// The outer column, shared across skins: the rail/expanded width, the shell-vs-legacy
// inner spacing, and the per-frame border. In SHELL mode (a header/footer is present)
// the column fills the parent height and drops its inner padding/gap onto the scroll
// body; in LEGACY mode it keeps the content-sized padding/gap exactly as before.
function makeColumn(radius: number, collapsedWidth: number, pad: ViewStyle) {
  return (tokens: ColorTokens, frame: Frame, collapsed: boolean, shell: boolean): ViewStyle => {
    const width = collapsed ? collapsedWidth : 240;
    // maxWidth caps the rail inside narrower parents (a phone screen without the
    // responsive drawer mode) so a bare sidebar can shrink instead of overflowing.
    const base: ViewStyle = shell
      ? { width, maxWidth: "100%", backgroundColor: tokens.background, flex: 1 }
      : { width, maxWidth: "100%", backgroundColor: tokens.background, ...pad };
    if (frame === "bordered") {
      return { ...base, borderRadius: radius, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" };
    }
    return { ...base, borderEndWidth: 1, borderColor: tokens.border };
  };
}

// =============================================================================
// Web: the established Canvas look (lifted verbatim from the original file).
// =============================================================================

// The Riskora settings rail: a column at the card corner, rows at the control corner that are
// 48px tall (the active one on the soft `accent` panel), a 16px section eyebrow at
// the medium weight, 20px glyphs.
export const webSkin: SidebarSkin = {
  pressedFill: true,
  pressedOpacity: null,
  ripple: null,
  // Keyboard focus shows the kit's themed ring inside the full-width row, where the
  // column's scroll clip cannot cut it. No-op natively.
  focusRing: INSET_FOCUS_RING,

  column: makeColumn(shape.web.card, 64, { gap: 16, padding: 12 }),

  group: { gap: 4 },

  sectionTitle(tokens) {
    return {
      paddingHorizontal: 12,
      paddingVertical: 4,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.48,
      color: tokens["muted-foreground"],
    };
  },

  row(_tokens, density, collapsed) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : 12,
      borderRadius: shape.web.control,
      paddingHorizontal: collapsed ? 0 : 12,
      paddingVertical: density === "compact" ? 8 : 14,
    };
  },

  rowFill(tokens, active) {
    return active ? { backgroundColor: tokens.accent } : null;
  },

  label(tokens, active, density) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      ...(density === "compact" ? { fontSize: 12, lineHeight: 16 } : { fontSize: 14, lineHeight: 20 }),
      ...(active ? { fontWeight: "500", color: tokens.foreground } : { color: tokens["muted-foreground"] }),
    };
  },

  iconTint(active) {
    return active ? {} : { muted: true };
  },
  iconSize: 20,

  // --- collapse ---
  collapsedWidth: 64,
  collapseToggle: () => ({ padding: 6, borderRadius: 8 }),
  collapseIconSize: 14,

  // --- shell slots ---
  header(tokens, collapsed) {
    return {
      height: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: collapsed ? 0 : 10,
      justifyContent: collapsed ? "center" : "flex-start",
      paddingHorizontal: collapsed ? 0 : 16,
      borderBottomWidth: 1,
      borderColor: tokens.border,
    };
  },
  footer(tokens) {
    return { padding: 12, borderTopWidth: 1, borderColor: tokens.border };
  },
  scroll: { flex: 1 },
  scrollContent(_tokens, collapsed) {
    return { padding: 12, paddingBottom: 16, gap: collapsed ? 8 : 16 };
  },

  // --- collapsible section header ---
  sectionHeaderRow() {
    return { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 };
  },
  sectionHeaderTitle(tokens) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.48,
      color: tokens["muted-foreground"],
    };
  },
  sectionChevronGlyph: "chevronRight",
  sectionChevronSpinTo: 90,
  sectionChevronSize: 11,
  activeDot(tokens) {
    return { width: 4, height: 4, borderRadius: 2, backgroundColor: tokens.primary };
  },
  drillBackRow(tokens) {
    return { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: tokens.border, marginBottom: 4 };
  },
  drillBackTitle(tokens) {
    return { fontSize: 16, lineHeight: 24, fontWeight: "500", color: tokens.foreground };
  },
};

// =============================================================================
// iOS 27 (Liquid Glass) sidebar.
// =============================================================================

export const iosSkin: SidebarSkin = {
  pressedFill: false,
  pressedOpacity: 0.8,
  ripple: null,

  focusRing: INSET_FOCUS_RING,

  column: makeColumn(10, 56, { gap: 16, padding: 8 }),

  group: { gap: 2 },

  sectionTitle(tokens) {
    return {
      paddingHorizontal: 12,
      paddingVertical: 4,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      color: tokens["muted-foreground"],
    };
  },

  row(_tokens, density, collapsed) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : 10,
      borderRadius: 9999,
      paddingHorizontal: collapsed ? 0 : 12,
      paddingVertical: density === "compact" ? 6 : 8,
    };
  },

  rowFill(tokens, active) {
    return active ? { backgroundColor: tokens.accent } : null;
  },

  label(tokens, active, density) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      ...(density === "compact" ? { fontSize: 14, lineHeight: 18 } : { fontSize: 15, lineHeight: 20 }),
      fontWeight: active ? "600" : "400",
      color: active ? tokens["accent-foreground"] : tokens.foreground,
    };
  },

  iconTint(_active) {
    return { primary: true };
  },
  iconSize: 17,

  // --- collapse ---
  collapsedWidth: 56,
  collapseToggle: () => ({ padding: 4 }),
  collapseIconSize: 15,

  // --- shell slots ---
  header(tokens, collapsed) {
    return {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: collapsed ? 0 : 10,
      justifyContent: collapsed ? "center" : "flex-start",
      paddingHorizontal: collapsed ? 0 : 14,
      borderBottomWidth: 1,
      borderColor: tokens.border,
    };
  },
  footer(tokens) {
    return { padding: 8, borderTopWidth: 1, borderColor: tokens.border };
  },
  scroll: { flex: 1 },
  scrollContent(_tokens, collapsed) {
    return { padding: 8, paddingBottom: 16, gap: collapsed ? 8 : 16 };
  },

  // --- collapsible section header ---
  sectionHeaderRow() {
    return { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 };
  },
  sectionHeaderTitle(tokens) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
      color: tokens["muted-foreground"],
    };
  },
  sectionChevronGlyph: "chevronRight",
  sectionChevronSpinTo: 90,
  sectionChevronSize: 13,
  activeDot(tokens) {
    return { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.primary };
  },
  drillBackRow(tokens) {
    return { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: tokens.border, marginBottom: 4 };
  },
  drillBackTitle(tokens) {
    return { fontSize: 16, lineHeight: 21, fontWeight: "600", color: tokens.foreground };
  },
};

// =============================================================================
// Android (Material 3 navigation drawer / rail).
// =============================================================================

export const androidSkin: SidebarSkin = {
  pressedFill: false,
  pressedOpacity: null,
  ripple: (tokens) => ({ color: alpha(tokens.primary, 0.12), borderless: false }),
  focusRing: INSET_FOCUS_RING,

  column: makeColumn(16, 72, { gap: 16, paddingHorizontal: 12, paddingVertical: 8 }),

  group: { gap: 2 },

  sectionTitle(tokens) {
    return {
      paddingHorizontal: 16,
      paddingVertical: 6,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: tokens["muted-foreground"],
    };
  },

  row(_tokens, density, collapsed) {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : 12,
      borderRadius: 9999,
      // Clip the Material ripple to the rounded pill outline.
      overflow: "hidden",
      paddingHorizontal: collapsed ? 0 : 16,
      paddingVertical: density === "compact" ? 12 : 16,
    };
  },

  rowFill(tokens, active) {
    return active ? { backgroundColor: alpha(tokens.primary, 0.12) } : null;
  },

  label(tokens, active, density) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      ...(density === "compact" ? { fontSize: 13, lineHeight: 18 } : { fontSize: 14, lineHeight: 20 }),
      fontWeight: "500",
      color: active ? primaryText(tokens) : tokens.foreground,
    };
  },

  iconTint(active) {
    return active ? { primary: true } : {};
  },
  iconSize: 18,

  // --- collapse ---
  collapsedWidth: 72,
  collapseToggle: () => ({ padding: 8, borderRadius: 9999, overflow: "hidden" }),
  collapseIconSize: 18,

  // --- shell slots ---
  header(tokens, collapsed) {
    return {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: collapsed ? 0 : 12,
      justifyContent: collapsed ? "center" : "flex-start",
      paddingHorizontal: collapsed ? 0 : 16,
      borderBottomWidth: 1,
      borderColor: tokens.border,
    };
  },
  footer(tokens) {
    return { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: tokens.border };
  },
  scroll: { flex: 1 },
  scrollContent(_tokens, collapsed) {
    return { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 16, gap: collapsed ? 8 : 16 };
  },

  // --- collapsible section header ---
  sectionHeaderRow() {
    return { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 };
  },
  sectionHeaderTitle(tokens) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: tokens["muted-foreground"],
    };
  },
  sectionChevronGlyph: "chevronDown",
  sectionChevronSpinTo: 180,
  sectionChevronSize: 18,
  activeDot(tokens) {
    return { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.primary };
  },
  drillBackRow(tokens) {
    return { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: tokens.border, marginBottom: 4 };
  },
  drillBackTitle(tokens) {
    return { fontSize: 16, lineHeight: 24, fontWeight: "500", color: tokens.foreground };
  },
};
