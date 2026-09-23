import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha, shape } from "../../style/index.js";

// Co-located EmptyState skins, one per platform. EmptyState is a "Light"
// treatment: identical structure and semantic colors (those live below as the
// shared tone helpers); only the bordered card's RADIUS, the column DENSITY/
// SPACING, and the title/description TYPE TRACKING shift per OS. The BRAND survives
// on every platform (the `success` green wash and the `primary` action Button stay
// the same); React Native gives no native empty-state control on iOS (SwiftUI's
// ContentUnavailableView is code-only) or Android (Material 3 dropped the M1/M2
// empty-states pattern), so there is no native shape to match — each skin keeps the
// established structure and applies only the platform's own surface conventions:
//   iOS (HIG): a continuous-corner bordered card (radius 12 with
//     borderCurve:"continuous", the grouped-inset feel), SF Pro Text tracking on the
//     title (16pt: -0.31) and description (14pt: -0.15); press feedback is N/A (the
//     surface has no pressable of its own; the action is the iOS-skinned Button atom).
//   Android (Material 3): an M3 medium-shape card (radius 12), M3 type roles
//     (title-medium 16/24/500/+0.15, body-medium 14/20/+0.25); the action is the
//     M3-skinned Button atom, which carries its own ripple, so this surface adds none.
//   Web: the established Canvas look (the current empty-state, lifted verbatim) — a
//     rounded-md bordered card (radius 8), padding 16/24 (compact) or 24/32, a
//     16pt/600 title and a 14pt `muted-foreground` description, no extra tracking.

export type Tone = "success" | "default";

// The contract a platform skin fulfills. The shell renders the centered column,
// the optional bordered card, the icon disc, the title/description, and the action
// spacing; the skin maps the active platform's radius/density/type onto each piece.
export interface EmptyStateSkin {
  /** The centered column wrapper. */
  container: ViewStyle;
  /** The bordered card shape (radius + border width); fill/color is shared. */
  borderedBase: ViewStyle;
  /** Bordered card padding by density (compact tightens it for dense table cells). */
  borderedPad: Record<"compact" | "default", ViewStyle>;
  /** The round icon disc base (size + shape + bottom inset); fill is shared by tone. */
  discBase: ViewStyle;
  /** The glyph type inside the disc; color is shared by tone. */
  glyph: TextStyle;
  /** Title type (size / line-height / weight / tracking + alignment + color). */
  title: (t: ColorTokens) => TextStyle;
  /** Description type (size / line-height / tracking + inset + alignment + color). */
  description: (t: ColorTokens) => TextStyle;
  /** The action button's inset above it. */
  actionSpacing: ViewStyle;
}

// ---- Shared, platform-neutral color logic (the same on every OS) -------------
// The bordered card's border color follows the semantic `border` token. The
// `success` tone paints the disc and glyph green from the semantic `success`
// token (so it follows light/dark), while the default tone stays on the semantic
// muted / muted-foreground tokens so it follows light/dark/glass.

export function borderedSurface(tokens: ColorTokens): ViewStyle {
  return { borderColor: tokens.border };
}

// Disc fill per tone: a 10% green wash when success, the muted token otherwise.
export function discTone(tokens: ColorTokens, tone: Tone): ViewStyle {
  return tone === "success"
    ? { backgroundColor: alpha(tokens.success, 0.1) }
    : { backgroundColor: tokens.muted };
}

export function glyphTone(tokens: ColorTokens, tone: Tone): TextStyle {
  return tone === "success" ? { color: tokens.success } : { color: tokens["muted-foreground"] };
}

// ---- Shared layout fragments reused across the skins -------------------------
const CONTAINER: ViewStyle = { alignItems: "center" };

const DISC: ViewStyle = {
  marginBottom: 12,
  height: 48,
  width: 48,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9999,
};

const GLYPH: TextStyle = { fontSize: 20, lineHeight: 28 };

const ACTION_SPACING: ViewStyle = { marginTop: 16 };

// ---- Web (the established Canvas look, lifted verbatim) ----------------------
export const webSkin: EmptyStateSkin = {
  container: CONTAINER,
  // The Riskora drop zone: the card corner and a dashed hairline.
  borderedBase: { borderRadius: shape.web.card, borderWidth: 1, borderStyle: "dashed" },
  borderedPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 24 },
    default: { paddingHorizontal: 24, paddingVertical: 40 },
  },
  discBase: DISC,
  glyph: GLYPH,
  title: (tokens) => ({
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: tokens.foreground,
  }),
  description: (tokens) => ({
    marginTop: 4,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: tokens["muted-foreground"],
  }),
  actionSpacing: ACTION_SPACING,
};

// ---- iOS (HIG): continuous-corner grouped-inset feel, SF Pro Text tracking ---
export const iosSkin: EmptyStateSkin = {
  container: CONTAINER,
  // The superellipse corner curve of Apple's grouped-inset surfaces (iOS-only prop).
  borderedBase: { borderRadius: 12, borderWidth: 1, borderCurve: "continuous" },
  borderedPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 24 },
    default: { paddingHorizontal: 24, paddingVertical: 32 },
  },
  discBase: DISC,
  glyph: GLYPH,
  title: (tokens) => ({
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.31,
    color: tokens.foreground,
  }),
  description: (tokens) => ({
    marginTop: 4,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.15,
    color: tokens["muted-foreground"],
  }),
  actionSpacing: ACTION_SPACING,
};

// ---- Android (Material 3): M3 medium shape, M3 type roles --------------------
export const androidSkin: EmptyStateSkin = {
  container: CONTAINER,
  borderedBase: { borderRadius: 12, borderWidth: 1 },
  borderedPad: {
    compact: { paddingHorizontal: 16, paddingVertical: 24 },
    default: { paddingHorizontal: 24, paddingVertical: 32 },
  },
  discBase: DISC,
  glyph: GLYPH,
  title: (tokens) => ({
    // M3 title-medium: 16/24, weight 500, +0.15 tracking.
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    letterSpacing: 0.15,
    color: tokens.foreground,
  }),
  description: (tokens) => ({
    marginTop: 4,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    color: tokens["muted-foreground"],
  }),
  actionSpacing: ACTION_SPACING,
};
