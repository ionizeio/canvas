import { type ViewStyle } from "react-native";
import { type ColorScheme, type ColorTokens, alpha, customShadow, shadow, shape } from "../../style/index.js";

// Co-located Drawer skins, one per platform, all driven by the brand tokens
// (passed in from useTheme so they follow light/dark). Drawer is a "Light"
// platform treatment: ONE structure (a full-screen Modal whose scrim lays an
// opaque panel against an edge), with only small per-OS touches: the edge/corner
// radius, the inner-edge border vs. lineless, the elevation, and the scrim
// dimming. The BRAND survives on every platform (the SOLID `card` fill and the
// content type are unchanged); only the native SHAPE/elevation/scrim shift:
//   iOS (iOS 27 kit Sheets): a lineless panel (no border) with the iOS sheet's
//     large CONTINUOUS 38pt corner radius on the inner edge — a side drawer rounds
//     its leading (inner) edge 38, a bottom sheet rounds its top corners 38 (the
//     iOS 27 concentric sheet radius, superseding the pre-iOS-26 16pt) — over a
//     soft 0/15/50 rgba(0,0,0,0.18) elevation, plus an optional centered grabber
//     on the sheet edges. The scrim resolves PER SCHEME (light 0.2, dark 0.48).
//   Android (Material 3 side/bottom sheet): a lineless panel with the M3 rounding
//     — a side sheet rounds its INNER (content-facing) vertical edge 16, a bottom
//     sheet rounds its top corners 28 — over the M3 modal-sheet elevation level 1
//     (1dp). The bottom sheet caps at 640dp (56dp margins beyond) and the side
//     sheet at 400dp (M3 docked width tokens); a 32x4 M3 drag handle tops the
//     bottom sheet. The scrim is the M3 standard scrim (~0.32).
//   Web: the established Canvas look (the current drawer, lifted verbatim) — an
//     opaque `card` panel with a 1px `border` hairline on its inner edge (a 16
//     rounded-top bottom sheet), no shadow, over a 0.5 black scrim.
//
// The skins paint the SOLID `card` fill; under glass the shell renders the panel
// through GlassSurface as a FUNCTIONAL-layer surface (the sheet material over the
// dimming scrim, the same as ActionSheet and Dialog), and the fill here is what the
// solid mode, Reduce Transparency and Increase Contrast fall back to.

// Edge the panel is anchored to. `left`/`right` are full-height side drawers;
// `bottom`/`top` are sheets that span the width and rise from the bottom / drop from the top.
export type Edge = "left" | "right" | "bottom" | "top";

// The contract a platform skin fulfills. The shell owns the full-screen Modal,
// the scrim, the panel positioner, the edge precedence, the open/close state, and
// the hardware-back wiring; the skin maps the active platform's scrim dimming, the
// panel shape (radius, border, elevation) per edge, the sheet max-width, the
// optional grabber/drag handle, and the trigger touch-target floor onto each
// piece, reading the tokens so light/dark keep working.
export interface DrawerSkin {
  /**
   * The scrim dimming alpha behind the panel, resolved per color SCHEME so a
   * platform can dim differently in light vs dark (iOS light 0.2 / dark 0.48;
   * Android 0.32; web 0.5 — the latter two are scheme-invariant).
   */
  scrimOpacity: (scheme: ColorScheme) => number;
  /** The panel surface shape per edge: fill, edge geometry, border, radius, elevation. */
  panelShape: (edge: Edge, width: number, t: ColorTokens) => ViewStyle;
  /**
   * Max width for a bottom/top SHEET, capping + centering it (and its tap-catcher)
   * on wide windows; null = full width. Android caps at the M3 640dp bottom-sheet
   * token; iOS/web sheets span the full width.
   */
  sheetMaxWidth: number | null;
  /**
   * An optional grabber/drag handle drawn at the near edge of a SHEET (the iOS
   * grabber and the M3 drag handle); returns null for edges/platforms that carry
   * none (side drawers, web).
   */
  handle: ((edge: Edge, t: ColorTokens) => ViewStyle | null) | null;
  /**
   * The minimum touch-target height for the built-in trigger Button, enforced via
   * minHeight so the effective tap area clears the platform floor (iOS HIG 44pt,
   * M3 48dp); null on web (pointer-first, layout untouched).
   */
  triggerMinHeight: number | null;
}

// --- scrim + positioner (identical across platforms) ------------------------

// The full-screen scrim that fills the Modal and lays the panel against its edge.
// A tap on it (wired in the shell) dismisses the drawer. The dimming alpha is the
// only per-OS value, supplied by the skin.
export function scrim(edge: Edge, opacity: number): ViewStyle {
  const base: ViewStyle = { flex: 1, backgroundColor: `rgba(0,0,0,${opacity})` };
  if (edge === "bottom") return { ...base, flexDirection: "column", justifyContent: "flex-end" };
  if (edge === "top") return { ...base, flexDirection: "column", justifyContent: "flex-start" };
  return { ...base, flexDirection: "row", justifyContent: edge === "right" ? "flex-end" : "flex-start" };
}

// The panel positioner: a Pressable that catches taps so a press inside the panel
// does not fall through to the scrim. Side drawers fill the height; the sheet
// fills the width. Identical across platforms.
export const panelPos: Record<Edge, ViewStyle> = {
  left: { height: "100%" },
  right: { height: "100%" },
  bottom: { width: "100%" },
  top: { width: "100%" },
};

// Shared panel base: the solid `card` fill (dropped under glass, where the
// functional material carries the panel) and clipped corners. The skin adds the
// per-edge geometry (width/height), the border (or none), the radius, and the
// elevation on top of this.
function panelBase(t: ColorTokens): ViewStyle {
  return { backgroundColor: t.card, overflow: "hidden" };
}

// ---------- Web: the Riskora sheet ----------
// An opaque `card` surface with the 30px shell corner on the edge that faces the
// content (the bottom sheet rounds its top corners, the side drawer its inner
// corners), a 1px `border` hairline on that edge, the ambient xl shade, under a
// 0.5 black scrim.
export const webSkin: DrawerSkin = {
  scrimOpacity: () => 0.5,
  sheetMaxWidth: null,
  handle: null,
  triggerMinHeight: null,
  panelShape: (edge, width, t) => {
    const base = panelBase(t);
    const r = shape.web.sheet;
    if (edge === "bottom") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderTopWidth: 1,
        borderColor: t.border,
        borderTopStartRadius: r,
        borderTopEndRadius: r,
        ...shadow("xl"),
      };
    }
    if (edge === "top") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderBottomWidth: 1,
        borderColor: t.border,
        borderBottomStartRadius: r,
        borderBottomEndRadius: r,
        ...shadow("xl"),
      };
    }
    return {
      ...base,
      width,
      height: "100%",
      borderColor: t.border,
      ...(edge === "right"
        ? { borderStartWidth: 1, borderTopStartRadius: r, borderBottomStartRadius: r }
        : { borderEndWidth: 1, borderTopEndRadius: r, borderBottomEndRadius: r }),
      ...shadow("xl"),
    };
  },
};

// ---------- iOS (iOS 27 kit Sheets): lineless, 38pt continuous corners, soft elevation ----------
// The iOS panel reads as an iOS 27 sheet: lineless (no hairline border) with the
// sheet's large CONTINUOUS 38pt corner radius on the inner edge — a side drawer
// rounds its leading (content-facing) vertical edge 38, a bottom/top sheet rounds
// its exposed corners 38 — over the sheet's soft 0/15/50 rgba(0,0,0,0.18)
// elevation, with an optional centered grabber (60x4, r2, 5pt below the exposed
// edge) on the sheet edges. The scrim dims PER SCHEME (light 0.2, dark 0.48). The
// SOLID `card` fill is unchanged (the iOS 27 kit sheet container is opaque too).
const IOS_SHEET_RADIUS = 38;
const IOS_SIDE_RADIUS = 38;
// The iOS 27 kit Sheets Large-Detent container shadow: 0 15px 50px rgba(0,0,0,0.18)
// (wider + softer than the shadow("xl") preset it replaces).
const iosSheetShadow = customShadow({ offsetY: 15, radius: 50, opacity: 0.18 });
export const iosSkin: DrawerSkin = {
  scrimOpacity: (scheme) => (scheme === "dark" ? 0.48 : 0.2),
  sheetMaxWidth: null,
  triggerMinHeight: 44,
  // The iOS grabber: a centered 60x4 bar (radius 2) sitting 5pt inside the
  // exposed edge (below the top on a bottom sheet, above the bottom on a top
  // sheet); side drawers carry none. Fill is a translucent neutral gray that
  // adapts to light/dark via the muted-foreground token.
  handle: (edge, t) => {
    if (edge !== "bottom" && edge !== "top") return null;
    return {
      width: 60,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      backgroundColor: alpha(t["muted-foreground"], 0.4),
      ...(edge === "bottom" ? { marginTop: 5, marginBottom: 8 } : { marginTop: 8, marginBottom: 5 }),
    };
  },
  panelShape: (edge, width, t) => {
    const base = panelBase(t);
    if (edge === "bottom") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderTopStartRadius: IOS_SHEET_RADIUS,
        borderTopEndRadius: IOS_SHEET_RADIUS,
        borderCurve: "continuous",
        ...iosSheetShadow,
      };
    }
    if (edge === "top") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderBottomStartRadius: IOS_SHEET_RADIUS,
        borderBottomEndRadius: IOS_SHEET_RADIUS,
        borderCurve: "continuous",
        ...iosSheetShadow,
      };
    }
    // The leading (inner) vertical edge rounds; the outer edge sits flush to the
    // screen edge. A left drawer rounds its right corners; a right drawer its left.
    const inner =
      edge === "right"
        ? { borderTopStartRadius: IOS_SIDE_RADIUS, borderBottomStartRadius: IOS_SIDE_RADIUS }
        : { borderTopEndRadius: IOS_SIDE_RADIUS, borderBottomEndRadius: IOS_SIDE_RADIUS };
    return { ...base, width, height: "100%", ...inner, borderCurve: "continuous", ...iosSheetShadow };
  },
};

// ---------- Android (Material 3 side/bottom sheet): lineless, M3 rounding, level-1 elevation ----------
// The M3 modal sheets: a lineless panel (no border) with the M3 rounding — a side
// sheet rounds its INNER (content-facing) vertical edge 16 (the M3 large shape), a
// bottom sheet rounds its top corners 28 (the M3 extra-large shape) — over the M3
// modal-sheet container elevation level 1 (1dp, shadow("sm"), NOT the 8dp
// shadow("lg") it replaces). The bottom sheet caps at the M3 640dp max-width
// (centered, 56dp margins beyond) and the side sheet at the 400dp docked max,
// with a 32x4 M3 drag handle atop the bottom sheet. The scrim is the M3 standard
// scrim (~0.32). The SOLID `card` fill is unchanged.
const ANDROID_SIDE_RADIUS = 16;
const ANDROID_SHEET_RADIUS = 28;
// M3 side-sheet docked container max-width token.
const ANDROID_SIDE_MAX = 400;
export const androidSkin: DrawerSkin = {
  scrimOpacity: () => 0.32,
  // M3 bottom sheet: full width up to a 640dp max, centered on wider windows.
  sheetMaxWidth: 640,
  triggerMinHeight: 48,
  // The M3 drag handle atop the bottom sheet: a 32x4 rounded bar (radius 2),
  // centered, on-surface-variant at low alpha (mirrors the ActionSheet android
  // skin). Side/top edges carry none.
  handle: (edge, t) => {
    if (edge !== "bottom") return null;
    return {
      width: 32,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: alpha(t["muted-foreground"], 0.4),
    };
  },
  panelShape: (edge, width, t) => {
    const base = panelBase(t);
    if (edge === "bottom") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderTopStartRadius: ANDROID_SHEET_RADIUS,
        borderTopEndRadius: ANDROID_SHEET_RADIUS,
        ...shadow("sm"),
      };
    }
    if (edge === "top") {
      return {
        ...base,
        width: "100%",
        maxHeight: "85%",
        borderBottomStartRadius: ANDROID_SHEET_RADIUS,
        borderBottomEndRadius: ANDROID_SHEET_RADIUS,
        ...shadow("sm"),
      };
    }
    // The inner (content-facing) vertical edge rounds; the outer edge sits flush.
    // The docked container caps at the M3 400dp max-width.
    const inner =
      edge === "right"
        ? { borderTopStartRadius: ANDROID_SIDE_RADIUS, borderBottomStartRadius: ANDROID_SIDE_RADIUS }
        : { borderTopEndRadius: ANDROID_SIDE_RADIUS, borderBottomEndRadius: ANDROID_SIDE_RADIUS };
    return { ...base, width: Math.min(width, ANDROID_SIDE_MAX), height: "100%", ...inner, ...shadow("sm") };
  },
};
