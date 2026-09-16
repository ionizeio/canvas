import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, surfaceRipple, shape } from "../../style/index.js";
import { type FeedSkin } from "./feeds.shared.js";

// Co-located Feed skins, one per platform. Feed is a "Light" platform treatment:
// ONE structure (a card surface framing connector-node rows or avatar rows, with
// a muted actor/action line plus a relative timestamp) shared across every OS,
// driven by the brand tokens (passed in from useTheme so the surface, node fill,
// and divider follow light/dark). Feed is a CONTENT-layer surface that paints
// tokens.card, which stays SOLID under glass (only the functional/popover layer
// frosts). Only the small native touches shift per OS:
//   Web: the established Canvas look (the current feed, lifted verbatim) — an
//     8-radius card with a 1px `border`, no shadow; rows pressed dim to 0.7
//     opacity (the kit's content default).
//   iOS (HIG / SF conventions): a softer 12-radius card (the iOS grouped-list
//     corner), an extra hair of row breathing room, SF-style tightened tracking
//     on the labels, and an opacity dim (~0.8) on press, matching the iOS
//     list-row highlight. No connector/avatar structure changes (iOS composes
//     feeds from plain lists, so the kit keeps its structure and applies only
//     iOS conventions).
//   Android (Material 3): the M3 medium-shape corner (12-radius, matching M3
//     cards and the kit's own Android Card atom), a flat surface (no shadow — M3
//     cards are flat unless elevation is specified; the kit keeps the 1px
//     hairline so the card stays legible on either theme), M3 type tracking
//     (body-medium +0.25 action, body-small +0.4 timestamp), and a brand
//     state-layer android_ripple on pressable rows instead of an opacity dim.

// --- shared layout fragments (identical across platforms) -------------------

// The content column wrapper (flex-1).
export const contentColumn: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// The connector content column (flex-1 pt-0.5): nudged down to align with the node.
export const connectorContentColumn: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  paddingTop: 2,
};

// Avatar row base (flex-row items-start gap-3); per-density padding comes from the skin.
export const avatarRow: ViewStyle = { flexDirection: "row", alignItems: "flex-start", gap: 12 };

// Connector row base (relative flex-row gap-3).
export const connectorRow: ViewStyle = { position: "relative", flexDirection: "row", gap: 12 };

// The node's actor-less dot (h-1.5 w-1.5 rounded-full bg-muted-foreground).
export function nodeDot(tokens: ColorTokens): ViewStyle {
  return { height: 6, width: 6, borderRadius: 9999, backgroundColor: tokens["muted-foreground"] };
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// The current feed: an 8-radius card with a 1px `border` and no shadow; a
// 14pt/20 line with a 500-weight actor and muted action; a 12pt/16 muted
// timestamp; a 28px bordered connector node carrying 12pt/500 initials; a 1px
// connector line under the node center; hairline-ruled avatar rows. Pressable
// rows dim to 0.7 on press (the kit content default).
export const webSkin: FeedSkin = {
  cardSurface: (t) => ({
    width: "100%",
    borderRadius: shape.web.card,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: "hidden",
  }),
  // Connector surface padding by density: compact (p-5) vs default (p-6).
  connectorPad: (compact) => ({ padding: compact ? 20 : 24 }),
  // Inter-row vertical rhythm by density: compact (pb-4) vs default (pb-6).
  connectorRowGap: (compact) => ({ paddingBottom: compact ? 16 : 24 }),
  // Row padding by density: compact (px-5 py-3) vs default (px-5 py-4).
  avatarRowPad: (compact) => ({ paddingHorizontal: 20, paddingVertical: compact ? 12 : 16 }),
  avatarDivider: (t) => ({ borderBottomWidth: 1, borderColor: t.border }),
  // The leading connector node: a 28px bordered circle on the connector line.
  node: (t) => ({
    height: 28,
    width: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  }),
  // The connector line under the node center (node 28 wide -> 14 center, -0.5 -> 13).
  connectorLine: (t) => ({ position: "absolute", bottom: 0, start: 13, top: 28, width: 1, backgroundColor: t.border }),
  nodeInitials: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: t["muted-foreground"] }),
  lineText: { fontSize: 14, lineHeight: 20 },
  actorLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground }),
  actionLabel: (t) => ({ fontSize: 14, lineHeight: 20, color: t["muted-foreground"] }),
  timeLabel: (t) => ({ marginTop: 2, fontSize: 12, lineHeight: 16, color: t["muted-foreground"] }),
  pressedOpacity: 0.7,
  ripple: null,
  // Web pointer input has no finger-target minimum; keep the row layout as-is.
  minTarget: 0,
};

// ---------- iOS (HIG / SF conventions): softer card, tighter SF tracking ----------
// iOS has no activity-feed control, so the kit keeps its structure and applies
// only iOS conventions: the iOS grouped-list corner (12 radius), a hair more row
// breathing room (default avatar py 17 / connector p 26), SF-style negative
// tracking on the labels, and the iOS list-row highlight (opacity dim ~0.8) on
// press. The brand survives; nothing here substitutes an iOS system color.
export const iosSkin: FeedSkin = {
  cardSurface: (t) => ({
    width: "100%",
    borderRadius: 12,
    // Apple's smooth/continuous (superellipse) corners; RN iOS-only, no-op elsewhere.
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: "hidden",
  }),
  connectorPad: (compact) => ({ padding: compact ? 22 : 26 }),
  connectorRowGap: (compact) => ({ paddingBottom: compact ? 18 : 26 }),
  avatarRowPad: (compact) => ({ paddingHorizontal: 20, paddingVertical: compact ? 13 : 17 }),
  avatarDivider: (t) => ({ borderBottomWidth: 1, borderColor: t.border }),
  node: (t) => ({
    height: 28,
    width: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  }),
  connectorLine: (t) => ({ position: "absolute", bottom: 0, start: 13, top: 28, width: 1, backgroundColor: t.border }),
  // SF Pro Text tracking: 12pt = 0 (initials), 15pt = -0.24 (line), 13pt = -0.08 (time).
  nodeInitials: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0, color: t["muted-foreground"] }),
  lineText: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  actorLabel: (t) => ({ fontSize: 15, lineHeight: 20, fontWeight: "600", letterSpacing: -0.24, color: t.foreground }),
  actionLabel: (t) => ({ fontSize: 15, lineHeight: 20, letterSpacing: -0.24, color: t["muted-foreground"] }),
  timeLabel: (t) => ({ marginTop: 2, fontSize: 13, lineHeight: 16, letterSpacing: -0.08, color: t["muted-foreground"] }),
  pressedOpacity: 0.8,
  ripple: null,
  // HIG minimum interactive target (floors the short final connector row up to 44pt).
  minTarget: 44,
};

// ---------- Android (Material 3): larger corner, flat surface, ripple ----------
// M3 has no activity-feed component (feeds compose from lists/cards), so the kit
// keeps its structure and applies M3 surface conventions: the M3 medium-shape
// corner (12 radius, matching M3 cards and the kit's own Android Card atom), a
// flat surface (no shadow; M3 cards are flat unless elevation is specified — the
// kit keeps the 1px hairline so the card is legible on either theme), M3 body
// type tracking (body-medium +0.25 action, body-small +0.4 timestamp), and a
// brand state-layer android_ripple on pressable rows in place of the opacity
// dim. The brand survives; the ripple ink is the foreground at low alpha.
export const androidSkin: FeedSkin = {
  cardSurface: (t) => ({
    width: "100%",
    // M3 medium shape (12dp), matching M3 cards and the kit's own Android Card atom.
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: "hidden",
  }),
  connectorPad: (compact) => ({ padding: compact ? 20 : 24 }),
  connectorRowGap: (compact) => ({ paddingBottom: compact ? 16 : 24 }),
  avatarRowPad: (compact) => ({ paddingHorizontal: 20, paddingVertical: compact ? 12 : 16 }),
  avatarDivider: (t) => ({ borderBottomWidth: 1, borderColor: t.border }),
  node: (t) => ({
    height: 28,
    width: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  }),
  connectorLine: (t) => ({ position: "absolute", bottom: 0, start: 13, top: 28, width: 1, backgroundColor: t.border }),
  nodeInitials: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.1, color: t["muted-foreground"] }),
  // actorLabel = M3 title-small (14/20/500/+0.1); actionLabel = body-medium
  // (14/20/400/+0.25); timeLabel = body-small (12/16/400/+0.4).
  lineText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  actorLabel: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t.foreground }),
  actionLabel: (t) => ({ fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: t["muted-foreground"] }),
  timeLabel: (t) => ({ marginTop: 2, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: t["muted-foreground"] }),
  pressedOpacity: null,
  ripple: (t) => surfaceRipple(t),
  // M3 minimum touch target (floors the short final connector row up to 48dp).
  minTarget: 48,
};
