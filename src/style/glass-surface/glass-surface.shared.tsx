// Shared internals for the GlassSurface primitive (the glass theming surface
// mode's renderer). The platform files (glass-surface.tsx for web+Android,
// glass-surface.ios.tsx for iOS) pick the material — Apple Liquid Glass on iOS
// 26+, an expo-blur frost on web/Android/older iOS, the skin's own flat surface
// otherwise — and hand it to GlassBox, which lays the material behind the content.
//
// The content host keeps its layout in every mode. A separate absolute material
// clip contains only decoration, preserving shadow, focus and child identity.

import { createContext, useContext, type ReactNode, type Ref, type RefObject } from "react";
import { Animated, View, StyleSheet, type StyleProp, type ViewStyle, type ViewProps } from "react-native";
import { MaterialMotionContext } from "../popup-motion.js";
import { type ColorTokens, type GlassTokens } from "../tokens.js";
import { alpha, composite, contrastRatio, inkOn } from "../color.js";

/**
 * The layer of the glass model a surface belongs to, which picks its tint (see
 * GlassTokens): `functional` (bars, sheets, popovers, dialogs; the default),
 * `content` (cards, tables, lists, tiles, stages), `control` (fields, buttons,
 * chips, badges, pucks) and `dense` (option lists, alert dialogs, toasts).
 */
export type GlassLayer = "functional" | "content" | "control" | "dense";

export interface GlassSurfaceProps {
  /**
   * Which layer of the glass model this surface is, so it takes that layer's tint
   * and blur: nested glass reads as distinct planes only because a control puck is
   * brighter than the content pane it sits on, and a pane denser than the bar
   * floating over it. Defaults to `functional`.
   */
  layer?: GlassLayer;
  /** Stable frost independent of density. Content defaults to static material. */
  static?: boolean;
  /**
   * The host node: the outer View that carries the layout, role and testID. A
   * moving selection measures its targets against this node when the surface
   * itself is the coordinate space (a Sidebar column). Internal; the material
   * never sits on this ref and the solid box exposes the same node.
   */
  hostRef?: Ref<View>;
  /** Clear refractive material with restrained tint and minimal frost. */
  clear?: boolean;
  /**
   * Tint the material with a colour: the brand-tinted glass of a primary control (a
   * sky-tinted puck). On iOS 26 it is passed to the native Liquid Glass as its
   * tintColor; on the lens and frost paths it becomes the under-fill (the colour at
   * a legible alpha), and it wins over the layer tint. `tint` still wins over both.
   */
  brand?: string;
  /** The skin's shape + fill style (radius, padding, border, shadow, and the skin's
   *  own opaque fill). The fill is stripped under glass; the material supplies its own
   *  (the `glass-tint` token, or `tint` below). */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  pointerEvents?: ViewProps["pointerEvents"];
  /** Layout callback forwarded to the ROOT element of every material branch, so
   *  a shell built on GlassSurface (a navbar measuring itself for its narrow
   *  collapse) can use the container-measurement hooks. */
  onLayout?: ViewProps["onLayout"];
  /** Native accessibility escape, handled by the existing outer content host. */
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * Landmark role for the root element, e.g. `"navigation"` for a sidebar shell or
   * `"banner"` for a top bar. Glass surfaces ARE the app's bar and sidebar shells, so
   * without this the chrome is an unlabelled stack of divs and every control inside it
   * fails axe's `region` rule for living outside a landmark. Spelled with RN's universal
   * `role` prop, which React Native Web turns into the matching HTML element and native
   * maps onto its own traits, so it needs no per-platform branch. Omit for decorative
   * surfaces such as popovers and menus, which already carry their own role.
   */
  role?: ViewProps["role"];
  /**
   * Render the material as an INTERACTIVE control surface: on iOS 26 the native
   * Liquid Glass responds to touch with its fluid press animation (Apple's
   * `isInteractive`). Use for glass that is itself a tappable control (e.g. an
   * account-trigger avatar), not for passive shells like navbars. Ignored on the
   * frost/solid fallbacks, which have no interactive material. Defaults to false.
   */
  interactive?: boolean;
  /**
   * Render a SHEER (more see-through) frost: a lighter blur and a thinner tint so
   * whatever animates behind the surface reads clearly through it. For CONTENT-layer
   * surfaces that float over a live backdrop and do NOT need to occlude what is behind
   * them (the docs' example stages, tables, and cards over the Canvas Universe). Do NOT
   * use it on functional overlays (menus, dropdowns, dialogs), which must stay opaque
   * enough to occlude the content they open over. Defaults to false (the full frost).
   */
  sheer?: boolean;
  /**
   * Override the translucent UNDER-FILL painted behind the material (the fill that gives
   * a bare glass panel a body). Defaults to the active scheme's `glass-tint` token, the
   * material's own fill, which suits every panel and bar. Pass a brighter value for a
   * small glass CONTROL that must read as a bright puck rather than a tinted blob: the
   * Slider's Liquid Glass handle passes an opaque white here so the knob looks like glass
   * on both schemes.
   * Ignored on the solid + module-absent fallbacks (PlainSurface keeps the skin's own
   * opaque fill).
   */
  tint?: string;
}

// Android materials sample an explicitly safe native plane. An ancestor target
// would create a render-node cycle, so OverlayProvider publishes its own content
// target only to its sibling outlet. GlassModalBlurTarget bridges a window-level
// target into a genuinely separate RN Modal window. BackdropHost may also expose
// its separate decorative plane to inline content. Targetless surfaces resolve
// to their complete solid skin. The optional capture integration owns demand,
// readiness and resource release without changing the content host.
export const GlassBlurTargetContext = createContext<RefObject<View | null> | null>(null);

// The window-level Android blur target: the OUTERMOST <OverlayProvider>'s content
// wrapper, published to its whole subtree (unlike GlassBlurTargetContext, which
// only ever wraps an outlet or a Modal). Consumers that render in a SEPARATE native
// window (RN Modal — Drawer, ActionSheet) bridge it into GlassBlurTargetContext via
// <GlassModalBlurTarget>; nothing in the main window may consume it directly, since
// everything under the provider is a descendant of that target. Outermost wins so a
// Modal blurs the largest safe region (the page, not just the docs stage its
// trigger happens to sit in).
export const GlassWindowBlurTargetContext = createContext<RefObject<View | null> | null>(null);

/**
 * Re-publish the window-level Android blur target inside an RN Modal, so the
 * Modal's frost surfaces (a sheet, a drawer panel) blur the main window's content.
 * A Modal renders in its own native window, which is never a descendant of the
 * main-window target — the one arrangement expo-blur 57's Android API can blur
 * without the ancestor-target render-node cycle. A no-op (provides null) on every
 * other platform and when no <OverlayProvider> published a target.
 */
export function GlassModalBlurTarget({ children }: { children?: ReactNode }) {
  const target = useContext(GlassWindowBlurTargetContext);
  return <GlassBlurTargetContext.Provider value={target}>{children}</GlassBlurTargetContext.Provider>;
}

// The contract between OverlayProvider and the per-platform GlassBlurTargetHost
// (glass-blur-target.tsx / .android.tsx): the provider hands over its wrapper
// style, the ref the Android fork attaches to its BlurTargetView, and the outlet
// subtree, which every fork must keep OUTSIDE the target so outlet overlays can
// blur the content as a sibling.
export interface GlassBlurTargetHostProps {
  /** The provider wrapper's style (OverlayProvider's [FILL, style]). */
  style?: StyleProp<ViewStyle>;
  /** Attached to the optional native capture host on supported Android;
   *  left unattached (current stays null) everywhere else. */
  targetRef: RefObject<View | null>;
  /** The overlay outlet subtree; rendered after (and never inside) the target. */
  outlet: ReactNode;
  children?: ReactNode;
}

// The Android blur-method props for the frost BlurView, chosen by which expo-blur API
// generation is installed. expo-blur 57+ (detected by its BlurTargetView export) wants
// `blurMethod` + `blurTarget`; passing the legacy prop there logs a deprecation
// warning, and naming the dimezis method without a target logs a fallback warning, so
// without a target it defensively asks for "none". The renderer resolves that
// missing-target case to the complete solid skin before mounting a BlurView.
// Older expo-blur keeps the legacy prop
// unchanged, which still blurs the content behind the surface there. Web ignores all
// three props (its backdrop-filter path never reads them).
// Keep the return contract structural: an Expo type here leaks into Canvas's
// public declarations and forces consumers to install an otherwise optional peer.
export function frostMethodProps(
  supportsBlurTarget: boolean,
  target: RefObject<View | null> | null,
): {
  experimentalBlurMethod?: "dimezisBlurView";
  blurMethod?: "dimezisBlurView" | "none";
  blurTarget?: RefObject<View | null>;
} {
  if (!supportsBlurTarget) return { experimentalBlurMethod: "dimezisBlurView" };
  return target ? { blurMethod: "dimezisBlurView", blurTarget: target } : { blurMethod: "none" };
}

// Blur strength for the frost. expo-blur maps intensity to a blur radius (~0.2px
// per point on web), so ~80 lands near the docs' established blur(16px) frost.
// expo-blur supplies its own light/dark tint at this intensity, so no extra tint
// overlay is layered on top (that would double-darken the material).
export const GLASS_INTENSITY = 80;

// A content pane blurs a touch less than the functional layer: its tint is denser,
// so the same blur would flatten the backdrop to a wash; the lighter blur lets the
// aurora keep some shape through the pane.
export const CONTENT_INTENSITY = 64;
export const CLEAR_INTENSITY = 4;

/** A clear surface retains a light neutral veil while letting the backdrop read. */
export function clearSurfaceTint(tokens: ColorTokens, dark: boolean): string {
  return alpha(tokens.card, dark ? 0.28 : 0.22);
}

// The alpha at which a `brand` colour becomes the under-fill of a brand-tinted puck on
// the lens and frost paths: as sheer as legibility allows. The puck carries the brand's
// own ink (white on the sky primary and the red destructive; `inkOn` picks the same ink
// the tokens pair with each fill), and that ink must keep WCAG 4.5:1 over the puck as
// it composites on the PAGE, so `brandTint` starts at this floor and densifies the
// colour in small steps until the ink clears the bar: sky-400 stays at the floor in
// both schemes, the light-scheme destructive red (3.2:1 at the floor) climbs to 0.9.
// (test/glass-tint.test.tsx pins both.)
export const BRAND_TINT_ALPHA = 0.66;
export const BRAND_TINT_STEP = 0.02;
export const BRAND_INK_CONTRAST = 4.5;

/** The brand colour as a translucent under-fill whose ink stays legible over `page`. */
export function brandTint(brand: string, page: string): string {
  const ink = inkOn(brand);
  for (let a = BRAND_TINT_ALPHA; a < 1; a += BRAND_TINT_STEP) {
    const fill = alpha(brand, Math.round(a * 100) / 100);
    if (contrastRatio(composite(fill, page), ink) >= BRAND_INK_CONTRAST) return fill;
  }
  return alpha(brand, 1);
}

/** The under-fill a surface paints beneath its material: `tint`, else the `brand`
 *  colour tinted for legibility over the page, else the layer's own token. */
export function surfaceUnderFill(glass: GlassTokens, layer: GlassLayer, brand?: string, tint?: string, page?: string): string {
  if (tint != null) return tint;
  if (brand != null) return page != null ? brandTint(brand, page) : alpha(brand, BRAND_TINT_ALPHA);
  switch (layer) {
    case "content": return glass["glass-tint-content"];
    case "control": return glass["glass-tint-control"];
    case "dense": return glass["glass-tint-dense"];
    default: return glass["glass-tint"];
  }
}

/** The frost blur strength for a layer (a sheer surface stays lighter still). */
export function surfaceIntensity(layer: GlassLayer, sheer: boolean | undefined): number {
  if (sheer) return SHEER_INTENSITY;
  return layer === "content" ? CONTENT_INTENSITY : GLASS_INTENSITY;
}

// The SHEER frost (GlassSurfaceProps.sheer): a lighter blur plus a thinner tint (the
// fill layer is drawn at SHEER_FILL_OPACITY, so the glass tint's effective alpha drops
// from 0.20 light / 0.30 dark to 0.15 / 0.225), so a live backdrop reads clearly through
// a content surface. The full frost keeps GLASS_INTENSITY + the whole tint for functional
// surfaces, whose material has to stay readable over whatever moves behind it.
export const SHEER_INTENSITY = 50;
export const SHEER_FILL_OPACITY = 0.75;

// Under the OS "Increase Contrast" setting, Apple makes Liquid Glass "predominantly
// black or white and highlights them with a contrasting border". The kit renders the
// opaque surface (via PlainSurface) plus this border, in `foreground` (near-black on
// light, near-white on dark) — a true contrasting edge, unlike the subtle `border`
// hairline token. Applied as a style-array override so it wins over (or adds to) a
// skin's own border. Border-box in RN, so it adds no external layout shift.
export const CONTRAST_BORDER_WIDTH = 1;

export function contrastBorder(tokens: ColorTokens): ViewStyle {
  return { borderWidth: CONTRAST_BORDER_WIDTH, borderColor: tokens.foreground };
}

// Keys that must live on the OUTER box: shadow (overflow:hidden would clip it),
// absolute positioning, outer-margin/self-alignment, and SIZING (flex/width/
// height) so the surface fills or sizes within its parent exactly as the single-
// View version did. The inner clip box then fills the outer (flex: 1). Radius keys
// are duplicated onto the outer box so its shadow is rounded. Both the physical
// (left/right, marginLeft/Right) and the logical (start/end, marginStart/End) edge
// keys are listed so a surface anchored either way routes to the outer box the same.
const OUTER_KEYS = new Set<string>([
  "shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation", "boxShadow",
  "position", "top", "right", "bottom", "left", "start", "end", "zIndex",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginStart", "marginEnd", "marginHorizontal", "marginVertical",
  "alignSelf", "flex", "flexGrow", "flexShrink", "flexBasis",
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
]);
const RADIUS_KEYS = new Set<string>([
  "borderRadius",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "borderTopStartRadius", "borderTopEndRadius", "borderBottomStartRadius", "borderBottomEndRadius",
]);
// Border width/color/style keys stripped under glass: the material supplies the edge
// (Apple's Liquid Glass carries its own on iOS 26; the SPECULAR_RIM does on the frost),
// so a skin's hairline would double it and fight the material (Apple: remove custom
// backgrounds/borders from navigation surfaces). Radius keys are NOT here — they shape
// the clip and must survive. Logical (start/end) variants are listed alongside physical.
const BORDER_KEYS = new Set<string>([
  "borderWidth", "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth",
  "borderStartWidth", "borderEndWidth",
  "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor",
  "borderStartColor", "borderEndColor", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
  "borderStyle",
]);

interface Split {
  outer: ViewStyle;
  clip: ViewStyle;
}

export function splitSurfaceStyle(style: StyleProp<ViewStyle>): Split {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  // grow+shrink with an AUTO basis makes the clip box fill the outer box whenever
  // the outer is sized (explicit height, flex, minHeight bar, absolute-pinned
  // drawer), and fall back to wrapping its children when it is not. flexBasis must
  // NOT be 0 (the `flex: 1` shorthand): Yoga has no min-content floor, so a basis-0
  // clip contributes nothing to an auto-sized outer and a content-sized surface
  // (a dialog card, a menu, an action sheet) collapses to its padding on native.
  const clip: Record<string, unknown> = { overflow: "hidden", flexGrow: 1, flexShrink: 1, flexBasis: "auto" };
  for (const [key, value] of Object.entries(flat)) {
    if (value == null) continue;
    if (key === "backgroundColor" || BORDER_KEYS.has(key)) continue; // the material supplies the fill + edge
    if (OUTER_KEYS.has(key)) outer[key] = value;
    else clip[key] = value;
    if (RADIUS_KEYS.has(key)) outer[key] = value; // round the shadow too
  }
  return { outer: outer as ViewStyle, clip: clip as ViewStyle };
}

// A stable content host for every appearance. Only the decorative material is
// clipped; content, focus rings, hit targets and the exterior shadow keep the
// skin's own layout and overflow policy. Switching modes never reparents children.
export function GlassBox({
  style, children, pointerEvents, testID, role, onLayout, onAccessibilityEscape, hostRef,
  material, solid = false,
}: GlassSurfaceProps & { material: ReactNode; solid?: boolean }) {
  const motion = useContext(MaterialMotionContext);
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const clear: Record<string, unknown> = { backgroundColor: "transparent", borderColor: "transparent" };
  const movingShadow: Record<string, unknown> = {};
  const clearedShadow: Record<string, unknown> = {};
  if (motion && !solid) {
    for (const key of ["shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius", "elevation", "boxShadow"]) {
      if (flat[key] == null) continue;
      movingShadow[key] = flat[key];
      clearedShadow[key] = key === "boxShadow" ? "none" : key === "shadowColor" ? "transparent" : key === "shadowOffset" ? { width: 0, height: 0 } : 0;
    }
  }
  for (const key of Object.keys(flat)) {
    if (key.startsWith("border") && key.endsWith("Color")) clear[key] = "transparent";
  }
  return (
    <View ref={hostRef} style={[style, solid ? null : clear as ViewStyle, clearedShadow as ViewStyle, pointerEvents ? { pointerEvents } : null]} testID={testID} role={role} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape} collapsable={onAccessibilityEscape ? false : undefined}>
      {material ? <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[materialFill(style), { zIndex: -1 }, movingShadow as ViewStyle, motion]}><View style={[materialFill(style), { overflow: "hidden" }]}>{material}</View></Animated.View> : null}
      <MaterialMotionContext.Provider value={null}>{children}</MaterialMotionContext.Provider>
    </View>
  );
}

// The no-glass / no-module fallback: one plain View identical to the pre-portal
// surface (keeps the skin's own opaque fill from `style`).
export function PlainSurface({ style, children, pointerEvents, testID, role, onLayout, onAccessibilityEscape, hostRef }: GlassSurfaceProps) {
  return (
    <View ref={hostRef} style={[style, pointerEvents ? { pointerEvents } : null]} testID={testID} role={role} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape} collapsable={onAccessibilityEscape ? false : undefined}>
      {children}
    </View>
  );
}

// The accessibility degradation rungs, shared by both platform files so the ladder
// is defined ONCE (Apple: these modifiers must apply to every glass element). When
// either setting is on the surface renders opaque via PlainSurface: the skin paints a
// SEMANTIC surface token, which glass mode never rewrites, so its fill is already opaque
// here with no extra work. Increase Contrast additionally
// adds a contrasting `foreground` border. Returns null when neither setting is on, so
// the caller proceeds to its normal material path. Precedence: Increase Contrast wins
// over Reduce Transparency (its rung is a superset — opaque plus the border).
export function degradedGlassSurface(
  flags: { increasedContrast: boolean; reducedTransparency: boolean; tokens: ColorTokens },
  props: GlassSurfaceProps,
): ReactNode | null {
  if (!flags.increasedContrast && !flags.reducedTransparency) return null;
  const style = flags.increasedContrast ? [props.style, contrastBorder(flags.tokens)] : props.style;
  return (
    <PlainSurface style={style} pointerEvents={props.pointerEvents} testID={props.testID} role={props.role} onLayout={props.onLayout} onAccessibilityEscape={props.onAccessibilityEscape}>
      {props.children}
    </PlainSurface>
  );
}

// The absolute-fill style for material layers, with taps passing through (the
// content sits on top; the dismiss backdrop, when present, is a portal sibling).
// A full-bleed cover layer (all four edges pinned), so it is direction-agnostic
// and stays physical left/right — the RTL sweep converts reading-direction edges,
// not symmetric full covers.
export const MATERIAL_FILL: ViewStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: "none",
};

// The specular edge that lifts the flat frost toward a liquid-glass look: light
// catches the TOP edge, a faint hairline defines the whole rim, and the bottom edge
// takes a soft shade. Painted with the cross-platform `boxShadow` style prop (RN 0.85:
// web + Android + iOS), so it is one code path, not a web-only effect. Scheme-adaptive
// so it reads on light and dark. Applied on the FROST paths only (web, Android, iOS < 26)
// — iOS 26's native GlassView material is never decorated. Once skin borders are stripped
// under glass, this rim is the surface's edge.
export const SPECULAR_RIM = {
  light:
    "inset 0 1px 1px rgba(255,255,255,0.55), inset 0 0 0 0.5px rgba(255,255,255,0.40), inset 0 -1px 1.5px rgba(0,0,0,0.06)",
  dark:
    "inset 0 1px 1px rgba(255,255,255,0.16), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 -1px 1.5px rgba(0,0,0,0.22)",
} as const;

// The corner radii from the skin's style, so the rim hugs the surface's rounded shape.
function radiusOf(style: StyleProp<ViewStyle>): ViewStyle {
  const f = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  return {
    borderRadius: f.borderRadius,
    borderTopLeftRadius: f.borderTopLeftRadius,
    borderTopRightRadius: f.borderTopRightRadius,
    borderBottomLeftRadius: f.borderBottomLeftRadius,
    borderBottomRightRadius: f.borderBottomRightRadius,
    borderTopStartRadius: f.borderTopStartRadius,
    borderTopEndRadius: f.borderTopEndRadius,
    borderBottomStartRadius: f.borderBottomStartRadius,
    borderBottomEndRadius: f.borderBottomEndRadius,
  };
}

// The absolute-fill specular-rim overlay style for a frost surface: the skin's radii
// (so the rim follows the rounded corners) plus the scheme's inset boxShadow. Render as
// `<View style={specularRim(style, dark)} pointerEvents="none" />` on top of the blur,
// below the content.
export function specularRim(style: StyleProp<ViewStyle>, dark: boolean): ViewStyle {
  return { ...MATERIAL_FILL, ...radiusOf(style), boxShadow: dark ? SPECULAR_RIM.dark : SPECULAR_RIM.light };
}

// The absolute-fill style for the fill / blur / glass material layers, carrying the
// skin's corner radii like specularRim does. The radii are load-bearing on web: a
// browser clips a backdrop-filter's result to the FILTERED ELEMENT's own border-box,
// not the ancestor's rounded overflow clip, so a radius-0 blur layer paints a square
// halo outside a rounded surface (glaring on a circle, e.g. the Avatar glass
// fallback). On native the parent clip already shapes these layers; the radii just
// keep the material's own shape (and iOS 26's Liquid Glass corner) in agreement.
export function materialFill(style: StyleProp<ViewStyle>): ViewStyle {
  return { ...MATERIAL_FILL, ...radiusOf(style) };
}
