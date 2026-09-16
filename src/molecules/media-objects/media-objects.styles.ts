import { type ViewStyle } from "react-native";
import { shadow, shape } from "../../style/index.js";
import { type MediaObjectSkin } from "./media-objects.shared.js";

// Per-OS MediaObject skins. MediaObject is a "Light" treatment: identical structure
// and semantic colors (those live in media-objects.shared.tsx); only corner radius,
// density/spacing, type tracking, shadow/elevation, and press feedback shift per OS.
//
// Reference (PLATFORM-REFERENCES.md, media-objects row):
// - iOS: no native media-object control; the layout is composed ad hoc as a list row
//   with a leading image (Apple's named "Lockups" is tvOS only). So the iOS skin keeps
//   the structure and applies SF/HIG conventions only: a small inset-group corner radius
//   (~10), no shadow (HIG groups are flat with a hairline), slightly tighter SF type
//   tracking, and an opacity dim on press (~0.8).
// - Android: no native media-object control; the closest M3 idiom is a list item with a
//   leading avatar, icon, or video thumbnail. So the Android skin keeps the structure and
//   applies Material 3 conventions only: more rounding (M3 medium container radius 12 on
//   the bordered card and the icon box), M3 type roles (title-small 14/20/500/+0.1,
//   body-medium 14/20/400/+0.25, body-small 12/16/400/+0.4), an M3 ELEVATED card
//   (level-1 elevation, no outline), denser list-row spacing (gap 16), and a native
//   ripple on press (so the opacity dim is suppressed).
// - Web: keeps the CURRENT Canvas look EXACTLY (rounded-lg / lg-8 radius, gap-3, no
//   shadow, the existing type scale, an opacity dim on press).

export type Align = "center" | "start";
export type Direction = "reversed" | "leading";

// flexDirection per direction (flex-row vs flex-row-reverse). Platform-neutral layout
// map consumed by the shared shell.
export const DIRECTION_ROW: Record<Direction, ViewStyle["flexDirection"]> = {
  leading: "row",
  reversed: "row-reverse",
};

// alignItems per alignment (items-center vs items-start). Platform-neutral.
export const ALIGN_ITEMS: Record<Align, ViewStyle["alignItems"]> = {
  center: "center",
  start: "flex-start",
};

// ── Web (the current Canvas look, preserved verbatim) ───────────────────────────────

export const webSkin: MediaObjectSkin = {
  // flex-row(-reverse) + gap-3 + items-* (the flexDirection/alignItems are composed on top).
  containerBase: { gap: 12 },
  // bordered: rounded-lg border bg-card p-4.
  borderedSurface: { borderRadius: shape.web.card, borderWidth: 1, padding: 20 },
  // Leading icon box: shrink-0 items-center justify-center w-9 h-9 rounded-md bg-primary/15.
  iconBox: { flexShrink: 0, alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: shape.web.control },
  // Glyph: text-base font-semibold text-primary.
  iconGlyph: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  // Content column: min-w-0 flex-1 gap-0.5.
  content: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 2 },
  // Title: text-sm font-semibold.
  title: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  // Description: text-xs muted.
  description: { fontSize: 12, lineHeight: 16 },
  // Body: text-sm leading-relaxed.
  body: { fontSize: 14, lineHeight: 28 },
  // Meta: shrink-0 text-xs muted.
  meta: { flexShrink: 0, fontSize: 12, lineHeight: 16 },
  // Trailing action wrapper: shrink-0.
  actionBox: { flexShrink: 0 },
  pressedOpacity: 0.9,
  // Web keeps its content-height rows; the tappable target is a mouse pointer, so no
  // minimum tap height is applied (0 = no change to the established web layout).
  minTarget: 0,
  // Compact (menu-header) density: tighter gap-2 row, a 28px `small` leading avatar,
  // and the type stepped down one step (title text-[13]/semibold, description text-[11]).
  compact: {
    containerBase: { gap: 8 },
    iconBox: { width: 28, height: 28, borderRadius: 6 },
    title: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    description: { fontSize: 11, lineHeight: 14 },
  },
};

// ── iOS (SF / HIG conventions; flat inset-group surface, tightened SF tracking) ──────

export const iosSkin: MediaObjectSkin = {
  containerBase: { gap: 12 },
  // Inset-grouped corner radius (~10) with Apple's continuous (superellipse) corner
  // curve, flat (no shadow; HIG groups carry a hairline). borderCurve is an iOS-only
  // RN style prop (device-only visual; a no-op elsewhere and in the web docs preview).
  borderedSurface: { borderRadius: 10, borderCurve: "continuous", borderWidth: 1, padding: 16 },
  iconBox: { flexShrink: 0, alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, borderCurve: "continuous" },
  // SF Pro Text tracking at 16pt = -0.31 (Apple tracking table).
  iconGlyph: { fontSize: 16, lineHeight: 24, fontWeight: "600", letterSpacing: -0.31 },
  content: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 2 },
  // SF Pro Text tracking: 14pt = -0.15 (title/body), 12pt = 0 (description/meta).
  title: { fontSize: 14, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15 },
  description: { fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 28, letterSpacing: -0.15 },
  meta: { flexShrink: 0, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  actionBox: { flexShrink: 0 },
  // HIG press: opacity dim ~0.8.
  pressedOpacity: 0.8,
  // HIG minimum tappable area 44x44pt (bare row backstop).
  minTarget: 44,
  // Compact (menu-header) density: tighter gap 8, a 28px `small` leading avatar, and SF
  // type stepped down one step. SF Pro Text tracking: 13pt = -0.08, 11pt = +0.06.
  compact: {
    containerBase: { gap: 8 },
    iconBox: { width: 28, height: 28, borderRadius: 7, borderCurve: "continuous" },
    title: { fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: -0.08 },
    description: { fontSize: 11, lineHeight: 14, letterSpacing: 0.06 },
  },
};

// ── Android (Material 3 list-item conventions; more rounding, M3 tracking, elevation) ─

export const androidSkin: MediaObjectSkin = {
  // Denser M3 list-row spacing.
  containerBase: { gap: 16 },
  // M3 medium container radius (12) as an M3 ELEVATED card: level-1 elevation (the `sm`
  // preset = elevation 1) and NO visible outline (M3 never combines an outline with
  // nonzero elevation, mirroring the kit Card fix). The 1dp border WIDTH is kept but
  // painted transparent (see borderedBorderColor) so content metrics stay identical.
  borderedSurface: { borderRadius: 12, borderWidth: 1, padding: 16, ...shadow("sm") },
  // Elevation separates the M3 elevated card, so the outline is transparent.
  borderedBorderColor: () => "transparent",
  // M3 medium container radius on the leading icon box.
  iconBox: { flexShrink: 0, alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12 },
  iconGlyph: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  content: { minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 2 },
  // M3 title-small: 14/20/500/+0.1 (500 is the role weight; 600 is not an M3 weight).
  title: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  // M3 body-small: 12/16/400/+0.4 (description/meta); M3 body-medium: 14/20/400/+0.25 (body).
  description: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  body: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  meta: { flexShrink: 0, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  actionBox: { flexShrink: 0 },
  // The native ripple carries press feedback; pressDim suppresses the opacity dim on Android.
  pressedOpacity: 0.9,
  // M3 minimum touch target 48x48dp (bare row backstop).
  minTarget: 48,
  // Compact (menu-header) density: tighter gap 12, a 28px `small` leading avatar, and M3
  // type stepped down (title 13/500/+0.1, description M3 label-small 11/16/+0.5).
  compact: {
    containerBase: { gap: 12 },
    iconBox: { width: 28, height: 28, borderRadius: 8 },
    title: { fontSize: 13, lineHeight: 18, fontWeight: "500", letterSpacing: 0.1 },
    description: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  },
};
