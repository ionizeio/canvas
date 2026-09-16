import { type ViewStyle, type TextStyle, type DimensionValue } from "react-native";
import { type ColorTokens, palette, alpha, surfaceRipple, shape } from "../../style/index.js";
import { type GridListSkin } from "./grid-lists.shared.js";
import { primaryText } from "../../style/primary-text.js";
import { destructiveText } from "../../style/destructive-text.js";

// Co-located GridList skins, one per platform. GridList is a "Light" treatment:
// ONE structure and ONE set of (semantic) colors live in grid-lists.shared.tsx;
// only the per-OS touches travel through the skin — the gallery thumbnail's
// corner radius, the inter-tile gap / per-tile padding density, the title/subtitle
// type tracking, and the press feedback (Android ripple vs iOS/web opacity dim) on
// THIS molecule's own pressable (the gallery tile). The bordered people tile
// delegates its surface and press feedback to the already-skinned-per-build Card
// atom, so the GridList skin never restyles it.
//
// The BRAND survives on every platform: tile tints come from the same item color
// resolved against the brand tokens, and the type colors are the same semantic
// tokens. Only the native SHAPE/density/tracking/feedback shift:
//   Web: the established Canvas look (lifted verbatim) — gallery block radius 6,
//     gap 14 (compact 8), tile padding 20 (compact 16), title 14/600, subtitle 12,
//     press = opacity dim (~0.9), no tracking adjustment.
//   iOS (HIG Collections): SF conventions — a slightly softer 10pt thumbnail
//     radius with Apple's continuous (superellipse) corner curve, the same
//     comfortable spacing, and SF Pro Text tracking (galleryTitle 12pt = 0,
//     cardTitle 14pt = -0.15, subtitles 12pt = 0); press = opacity dim (~0.9).
//   Android (Material 3): M3 corner + type conventions — a more-rounded 12dp
//     thumbnail (M3 medium shape), a touch more breathing room in the grid gap,
//     and M3 type roles: galleryTitle = label-medium (12/16/500/+0.5), cardTitle =
//     title-small (14/20/500/+0.1), subtitles = body-small (12/16/400/+0.4); press
//     = surfaceRipple (a neutral surface state layer), no opacity dim.

export type Columns = "cols2" | "cols3";

// Per-tile width share per column count (the desktop, `base` value). The
// fraction leaves room for the gap; `grow` (applied alongside) lets a trailing
// tile expand to fill, and the responsive `sm` value (`sm:w-full`) collapses
// each tile to a single column on phones and below (desktop-first). Shared by
// every platform — the column math is one source of truth.
export const TILE_WIDTH: Record<Columns, DimensionValue> = {
  cols2: "48%",
  cols3: "31%",
};

// --- shared layout fragments (identical across platforms) -------------------

// Container: a wrapping flex row. The per-tile gap is supplied by the skin so the
// density touch can vary per OS.
export const container: ViewStyle = { flexDirection: "row", flexWrap: "wrap" };

// Each tile grows to share the row; the width share is layered in by the tile.
export const tileGrow: ViewStyle = { flexGrow: 1 };

// Gallery thumbnail block geometry that does not vary (full width, fixed height);
// the corner radius is the per-OS touch and travels through the skin.
export const galleryBlock: ViewStyle = { width: "100%", height: 128 };

// The gallery tint is the item color at 20% (bg-{color}/20), falling back to the
// muted surface. Shared: the brand/palette tint is identical on every platform.
export function galleryBlockFill(tokens: ColorTokens, color?: string): ViewStyle {
  return { backgroundColor: color != null ? alpha(resolveColor(tokens, color), 0.2) : tokens.muted };
}

export const galleryMeta: ViewStyle = { marginTop: 8 };

// People card tile inner column (the avatar/title/subtitle stack inside Card).
export const cardInner: ViewStyle = { alignItems: "center", gap: 8 };

// Shared subtitle base (size/line-height/color are identical on every platform);
// the per-OS tracking is layered on in each skin's gallerySubtitle/cardSubtitle
// (iOS SF 12pt = 0, Android M3 body-small +0.4, web none).
function subtitleBase(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

export const badgeSpacing: ViewStyle = { marginTop: 4 };

export const actions: ViewStyle = { flexDirection: "row", gap: 8, marginTop: 8 };

// Resolve a color name (a semantic token key like "primary" or a Tailwind
// palette key like "blue-500") to its hex. Falls back to the muted-foreground
// token for an unknown name, so any tint composes safely.
function resolveColor(tokens: ColorTokens, color: string): string {
  if (color === "primary-text") return primaryText(tokens);
  if (color === "destructive-text") return destructiveText(tokens);
  if (color in tokens) return tokens[color as keyof ColorTokens] ?? tokens["muted-foreground"];
  if (color in palette) return palette[color];
  return tokens["muted-foreground"];
}

// ---------- Web: the established Canvas look (lifted verbatim) ----------
// gallery block radius 6; gap 14 (compact 8); tile padding 20 (compact 16);
// title 14/600 card-foreground, subtitle 12 muted; press = opacity dim (0.9).
export const webSkin: GridListSkin = {
  galleryRadius: shape.web.control,
  gap: { default: 14, compact: 8 },
  tilePad: { default: 20, compact: 16 },
  galleryTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: t["card-foreground"] }),
  cardTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "600", color: t["card-foreground"] }),
  gallerySubtitle: (t) => subtitleBase(t),
  cardSubtitle: (t) => subtitleBase(t),
  pressedOpacity: 0.9,
  ripple: null,
};

// ---------- iOS (HIG Collections): SF type tightening, softer thumbnail ----------
// HIG Collections describe a flexible grid of content tiles; iOS keeps the same
// comfortable spacing as web, softens the thumbnail corner to a 10pt Apple
// continuous (superellipse) curve, and applies SF Pro Text tracking: 12pt = 0
// (galleryTitle / subtitles carry no adjustment) and 14pt = -0.15 (cardTitle).
// Press = opacity dim (~0.9), the iOS norm.
export const iosSkin: GridListSkin = {
  galleryRadius: 10,
  galleryCurve: "continuous",
  gap: { default: 14, compact: 8 },
  tilePad: { default: 20, compact: 16 },
  galleryTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", color: t["card-foreground"] }),
  cardTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "600", letterSpacing: -0.15, color: t["card-foreground"] }),
  gallerySubtitle: (t) => subtitleBase(t),
  cardSubtitle: (t) => subtitleBase(t),
  pressedOpacity: 0.9,
  ripple: null,
};

// ---------- Android (Material 3): more rounding, M3 type roles, ripple ----------
// M3 has no grid list, so this applies M3 CONVENTIONS to the shared structure:
// the thumbnail takes the M3 medium-shape 12dp corner, the grid breathes a touch
// more (gap 16, compact 8), and the labels map to real M3 type-scale roles:
// galleryTitle = label-medium (12/16/500/+0.5), cardTitle = title-small
// (14/20/500/+0.1), subtitles = body-small (12/16/400/+0.4). Press = the shared
// surfaceRipple state layer (src/style/ripple.ts), no opacity dim.
export const androidSkin: GridListSkin = {
  galleryRadius: 12,
  gap: { default: 16, compact: 8 },
  tilePad: { default: 20, compact: 16 },
  galleryTitle: (t) => ({ fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5, color: t["card-foreground"] }),
  cardTitle: (t) => ({ fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1, color: t["card-foreground"] }),
  gallerySubtitle: (t) => ({ ...subtitleBase(t), letterSpacing: 0.4 }),
  cardSubtitle: (t) => ({ ...subtitleBase(t), letterSpacing: 0.4 }),
  pressedOpacity: null,
  ripple: surfaceRipple,
};
