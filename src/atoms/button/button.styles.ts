import { primaryText } from "../../style/primary-text.js";
import { actionFill, actionInk } from "../../style/action.js";
import { type ViewStyle, type TextStyle } from "react-native";
import { shape, type ColorTokens } from "../../style/index.js";
import { HOVER } from "../../style/motion.js";
import { hoverFill, type HoverMotion } from "../../style/hover.js";

// Co-located Button skins, one per platform.
//   Web: Dark Factory's pill buttons (its outline, ghost and link looks, a hairline on
//   every intent but link, bold labels, an instant hover wash, its disabled look).
//   iOS (HIG / iOS 26+ Liquid Glass): capsule (fully rounded), semibold SF-scale label, dim-on-press.
//   Android (Material 3): fully-rounded pill, medium label, flat, ripple.
// iOS and Android keep their platform buttons in the theme's (Dark Factory's) colours:
// the intent mapping they share is `fill` / `labelColor` below; the web skin owns its own.

export type Intent = "primary" | "secondary" | "destructive" | "outline" | "ghost" | "link";
export type Size = "small" | "base" | "large";

export interface ButtonSkinOpts {
  icon: boolean;
  block: boolean;
  /** disabled or loading: dim the control (the iOS and Android skins). */
  dim: boolean;
  /** disabled alone: the web skin swaps to Dark Factory's disabled look, and a loading button keeps its intent's look. */
  disabled?: boolean;
}

export interface ButtonSkin {
  container: (t: ColorTokens, intent: Intent, size: Size, opts: ButtonSkinOpts) => ViewStyle;
  label: (t: ColorTokens, intent: Intent, size: Size, opts?: ButtonSkinOpts) => TextStyle;
  /** The label's colour, which the loading spinner takes too. */
  foreground: (t: ColorTokens, intent: Intent, opts?: ButtonSkinOpts) => string;
  /**
   * Whether this intent paints a surface of its own. Under glass a button that does is a
   * CONTROL-layer puck (the material behind its label); one that does not stays bare.
   */
  surface: (intent: Intent, opts: ButtonSkinOpts) => boolean;
  /**
   * The style a hovered button of this intent switches to at once (Dark Factory's wash
   * behind an outline, a ghost and its secondary, the link's dim), or null. Never applied
   * while disabled or loading; omitted by the iOS and Android skins.
   */
  hover?: (t: ColorTokens, intent: Intent) => ViewStyle | null;
  /** The resting glow under a `raised` primary button (Dark Factory's call to action). */
  raised: (t: ColorTokens, size: Size) => ViewStyle;
  /** iOS/web dim the fill on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  ripple: ((t: ColorTokens, intent: Intent) => { color: string; borderless: boolean }) | null;
  /**
   * The rounded shape the shell's `<RippleClip>` parent clips the bounded ripple to (the
   * same corner radii `container` draws). Only the Android skin sets it — a bounded ripple
   * is Android-only; iOS/web omit it so no clip wrapper is applied. See src/style/ripple-clip.
   */
  rippleClipShape?: (size: Size, opts: ButtonSkinOpts) => ViewStyle;
  /**
   * Platform minimum touch target in pt/dp (iOS HIG 44pt, Android M3 48dp). When set,
   * the shell measures the rendered control and extends the TOUCH area with hitSlop on
   * whichever axis falls short (e.g. the 36pt iOS / 30dp Android `small` text button and
   * the sub-minimum icon squares). hitSlop never affects layout, so the visual size is
   * untouched. null (web) skips the measurement entirely: pointer targets stay visual.
   */
  minTarget: number | null;
  /**
   * Hover feedback: the rise a hovered button of this intent takes, or null for none.
   * Never applied while disabled or loading. Omitted by the iOS and Android skins, which
   * keep their platform buttons (and whose platforms deliver no pointer hover by default).
   */
  lift?: (intent: Intent) => HoverMotion | null;
}

// --- the iOS and Android intent mapping ---------------------------------------

/** The iOS and Android foreground per intent: the label color and the loading-spinner color. */
export function foregroundOf(t: ColorTokens, intent: Intent): string {
  switch (intent) {
    case "primary": return actionInk(t);
    case "secondary": return t["secondary-foreground"];
    case "destructive": return t["destructive-foreground"];
    case "outline": return t.foreground;
    case "ghost": return t.foreground;
    case "link": return primaryText(t);
  }
}

const DARK_FILL = new Set<Intent>(["primary", "destructive"]);

// Container fill/border per intent (the iOS and Android buttons).
function fill(t: ColorTokens, intent: Intent): ViewStyle {
  switch (intent) {
    case "primary": return { backgroundColor: actionFill(t) };
    case "secondary": return { backgroundColor: t.secondary };
    case "destructive": return { backgroundColor: t.destructive };
    case "outline": return { backgroundColor: "transparent", borderWidth: 1, borderColor: t.input };
    case "ghost": return { backgroundColor: "transparent" };
    case "link": return { backgroundColor: "transparent" };
  }
}

// Label color per intent (the iOS and Android buttons): their text buttons are
// tint-colored with no underline.
function labelColor(t: ColorTokens, intent: Intent): TextStyle {
  switch (intent) {
    case "primary": return { color: actionInk(t) };
    case "secondary": return { color: t["secondary-foreground"] };
    case "destructive": return { color: t["destructive-foreground"] };
    case "outline": return { color: t.foreground };
    case "ghost": return { color: t.foreground };
    case "link": return { color: primaryText(t) };
  }
}

// Android ripple over a fill: a light ripple on dark fills, a dark one on light/
// transparent fills, so the Material press feedback reads on every variant.
function androidRipple(_t: ColorTokens, intent: Intent) {
  return { color: DARK_FILL.has(intent) ? "rgba(255, 255, 255, 0.24)" : "rgba(0, 0, 0, 0.10)", borderless: false };
}

const ROW: ViewStyle = { flexDirection: "row", alignItems: "center", justifyContent: "center" };

// The surfaces a button paints on iOS and Android: every intent but the bare ghost and link.
const nativeSurface = (intent: Intent) => intent !== "ghost" && intent !== "link";

// ---------- Web: Dark Factory's pill buttons ----------
// Every intent is a pill with a 1px border (a hairline where the look has none, so every
// intent is the same height), bold labels, and a 6px icon gap. The call to action is the
// green `action` pill in 800 weight with DF's 0.01em tracking; `destructive` is its red
// sibling. `secondary` is DF's outline button: a violet border (`ring`, DF's accent2) and a
// violet label in `primary-text` (DF's accent2 reads 4.00:1 on white, under the 4.5:1 floor).
// `outline` is DF's ghost button: the `border` hairline and a foreground label (a text
// button's label identifies it, so WCAG 1.4.11 does not bind its boundary). `ghost` has no
// border and `link` no border or padding. Disabled is DF's look rather than a dim: the pill
// goes transparent with a hairline and a muted label; a loading button keeps its intent's
// look while its spinner runs. Small and base are DF's `sm` and `md` (29 and 36 tall); DF
// has no large, so large steps up the same way (40).
interface WebLook { fill: string; border: string; label: string }

function webLook(t: ColorTokens, intent: Intent, o?: ButtonSkinOpts): WebLook {
  if (o?.disabled) {
    const edged = intent !== "ghost" && intent !== "link";
    return { fill: "transparent", border: edged ? t.border : "transparent", label: t["muted-foreground"] };
  }
  switch (intent) {
    case "primary": { const action = actionFill(t); return { fill: action, border: action, label: actionInk(t) }; }
    case "destructive": return { fill: t.destructive, border: t.destructive, label: t["destructive-foreground"] };
    case "secondary": return { fill: "transparent", border: t.ring, label: primaryText(t) };
    case "outline": return { fill: "transparent", border: t.border, label: t.foreground };
    case "ghost": return { fill: "transparent", border: "transparent", label: t.foreground };
    case "link": return { fill: "transparent", border: "transparent", label: primaryText(t) };
  }
}

// The call to action and its red sibling carry the heaviest label and DF's tracking.
const WEB_CTA = new Set<Intent>(["primary", "destructive"]);

// Padding (vertical, horizontal) per size: the call to action is 2 wider at base, as DF's is.
const WEB_PAD: Record<Size, { v: number; h: number; ctaH: number }> = {
  small: { v: 6, h: 14, ctaH: 14 },
  base: { v: 9, h: 16, ctaH: 18 },
  large: { v: 10, h: 20, ctaH: 22 },
};
// Label type per size (whole-pixel line heights; DF sets 1.3).
const WEB_TYPE: Record<Size, TextStyle> = {
  small: FS(11.5, 15),
  base: FS(12, 16),
  large: FS(13, 18),
};
// Icon-only squares: the pill heights, drawn as circles.
const WEB_SQUARE: Record<Size, number> = { small: 29, base: 36, large: 40 };
// DF's raised glow under the call to action, one step per size.
const WEB_GLOW: Record<Size, [number, number]> = { small: [10, 20], base: [12, 22], large: [14, 24] };

/** Dark Factory's resting glow under a raised call to action (a spread shadow in the action colour). */
function raisedGlow(t: ColorTokens, size: Size): ViewStyle {
  const [y, blur] = WEB_GLOW[size];
  return { boxShadow: `0px ${y}px ${blur}px -10px ${actionFill(t)}` };
}

export const webSkin: ButtonSkin = {
  container: (t, intent, size, o) => {
    const look = webLook(t, intent, o);
    const pad = WEB_PAD[size];
    return {
      ...ROW,
      gap: 6,
      borderRadius: 9999,
      ...(o.icon
        ? sq(WEB_SQUARE[size])
        : intent === "link" ? { paddingHorizontal: 0, paddingVertical: 0 }
        : { paddingVertical: pad.v, paddingHorizontal: WEB_CTA.has(intent) ? pad.ctaH : pad.h }),
      backgroundColor: look.fill,
      borderWidth: intent === "link" ? 0 : 1,
      borderColor: look.border,
      // `block` (full width) lives on the shell's <RippleClip> wrapper, the outer node.
    };
  },
  label: (t, intent, size, o) => {
    const type = WEB_TYPE[size];
    const cta = WEB_CTA.has(intent) && !o?.disabled;
    // DF's outline (our secondary) is 800 from its md size up; everything else but the CTA is 700.
    const heavy = cta || (intent === "secondary" && size !== "small" && !o?.disabled);
    return {
      ...type,
      fontWeight: heavy ? "800" : "700",
      ...(cta ? { letterSpacing: (type.fontSize as number) * 0.01 } : null),
      color: webLook(t, intent, o).label,
    };
  },
  foreground: (t, intent, o) => webLook(t, intent, o).label,
  // Only the filled pills paint a surface: DF's outline, ghost and link buttons are
  // transparent, and a disabled button is transparent too.
  surface: (intent, o) => WEB_CTA.has(intent) && !o.disabled,
  // A link dims under the pointer. Dark Factory dims to 0.85, which leaves the `primary-text`
  // label at 4.33:1 on the blush page and 4.42:1 on mint; 0.9 holds 4.80 and 4.90 (WCAG 1.4.3).
  hover: (t, intent) =>
    intent === "secondary" || intent === "outline" || intent === "ghost" ? { backgroundColor: hoverFill(t) }
    : intent === "link" ? { opacity: 0.9 }
    : null,
  raised: raisedGlow,
  pressedOpacity: 0.9,
  ripple: null,
  minTarget: null, // web is pointer-first: no touch-target extension, layout untouched
  // Dark Factory's primary lift: the call to action rises 1 px under the pointer; every
  // other intent's hover switches instantly, as DF's do.
  lift: (intent) => (intent === "primary" ? HOVER.button : null),
};

// ---------- iOS (HIG / iOS 26+ Liquid Glass): capsule, semibold, dim on press ----------
export const iosSkin: ButtonSkin = {
  container: (t, intent, size, o) => ({
    ...ROW,
    gap: 6,
    borderRadius: 9999, // iOS 27 prominent buttons are capsules (full pill at every size); icon = circle
    ...(o.icon
      ? sq(size === "small" ? 36 : size === "large" ? 52 : 44)
      // Heights: base ~50pt (lineHeight 22 + 2*14) = the iOS 27 prominent button; large ~58pt
      // for a clearly tiered ladder; small ~36pt. Capsule preserved at every size.
      : size === "small" ? { paddingHorizontal: 14, paddingVertical: 8 }
      : size === "large" ? { paddingHorizontal: 26, paddingVertical: 18 }
      : { paddingHorizontal: 20, paddingVertical: 14 }),
    ...fill(t, intent),
    // `block` (full width) lives on the shell's <RippleClip> wrapper, the outer node.
    ...(o.dim ? { opacity: 0.4 } : null), // iOS disabled control alpha (more muted than 0.5)
  }),
  label: (t, intent, size) => ({
    fontWeight: "600",
    ...(size === "small" ? FS(15, 20) : FS(17, 22)),
    ...labelColor(t, intent),
  }),
  foreground: (t, intent) => foregroundOf(t, intent),
  surface: nativeSurface,
  raised: raisedGlow,
  pressedOpacity: 0.8,
  ripple: null,
  minTarget: 44, // HIG minimum tappable area 44x44pt (small = 36pt tall, extended via hitSlop)
};

// ---------- Android (Material 3 filled): pill, medium label, flat, ripple ----------
export const androidSkin: ButtonSkin = {
  container: (t, intent, size, o) => ({
    ...ROW,
    gap: 8,
    borderRadius: 9999, // M3 filled button = fully rounded (stadium); icon = circle
    // The Material ripple is clipped to this pill by the shell's <RippleClip> parent, NOT here:
    // a bounded android_ripple is the pressable's own rectangular-masked background, which a
    // same-node overflow:"hidden" cannot clip (RN only path-clips CHILDREN). See ripple-clip.tsx.
    ...(o.icon
      ? sq(size === "small" ? 32 : size === "large" ? 48 : 40)
      : size === "small" ? { paddingHorizontal: 16, paddingVertical: 6 }
      : size === "large" ? { paddingHorizontal: 24, paddingVertical: 13 }
      : { paddingHorizontal: 24, paddingVertical: 10 }),
    ...fill(t, intent),
    // `block` (full width) lives on the shell's <RippleClip> wrapper, the outer node.
    ...(o.dim ? { opacity: 0.38 } : null), // M3 disabled opacity
  }),
  label: (t, intent, size) => ({
    fontWeight: "500",
    ...(size === "small" ? FS(13, 18) : FS(14, 20)),
    ...labelColor(t, intent),
  }),
  foreground: (t, intent) => foregroundOf(t, intent),
  surface: nativeSurface,
  raised: raisedGlow,
  pressedOpacity: null,
  ripple: androidRipple,
  // Clip the bounded ripple to the pill (icon = circle). Same 9999 radius as `container`, so
  // the <RippleClip> parent's rounded outline matches the button's own corners at every size.
  rippleClipShape: () => ({ borderRadius: 9999 }),
  minTarget: 48, // M3 minimum touch target 48x48dp (small = 30dp, base = 40dp; extended via hitSlop)
};

function sq(d: number): ViewStyle {
  return { width: d, height: d };
}
function FS(fontSize: number, lineHeight: number): TextStyle {
  return { fontSize, lineHeight };
}
