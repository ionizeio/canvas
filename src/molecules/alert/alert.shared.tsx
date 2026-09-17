import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import {
  View,
  Pressable,
  Text,
  useTheme,
  useControllableState,
  useFillStyle,
  controlRipple,
  pressDim,
  palette,
  statusHues,
  type ColorTokens,
  type LayoutStyle,
  type ViewStyle,
  type TextStyle,
  GlassPane,
  isGlass,
  alpha,
} from "../../style/index.js";

// Shared Alert shell. The structure (a leading icon glyph, a bold title, a
// description, an optional trailing dismiss control), the boolean-prop tone axis,
// and the semantic color logic live here once; a platform file supplies only its
// skin (shape radius, density/spacing, type tracking, dismiss press feedback) and
// calls createAlert.
//
// A bordered banner that surfaces an inline notification. Configured by a tone axis
// (info / success / warning / error, plus a neutral default), and an optional `icon`
// glyph. Each tone is theme-aware: a soft 50/200 surface with a 600/700/800 type ramp
// in light mode, and a 950/800 surface with a 200/300/400 ramp in dark mode (branching
// on the active scheme). The neutral default uses the semantic card / border / foreground
// tokens.
//
// Alert is a "Light" platform treatment. Neither iOS nor Material 3 ships an inline
// alert banner (iOS alerts are modal — see alert-dialog; M3 dropped the M2 banner), so
// there is no native shape to match; the per-OS skins keep the one structure and apply
// only platform conventions: iOS uses SF/HIG corner + type tracking, Android uses the
// M3 medium shape + M3 type tracking + ripple, and web keeps the current shadcn look.
// The semantic colors are identical on every platform, so the skin carries shape, density,
// type, and dismiss press feedback only — not the colors.

export type Tone = "info" | "success" | "warning" | "error" | "neutral";

export interface AlertSkin {
  /** Banner shape + density (border-radius, padding, gap). */
  container: ViewStyle;
  /** Leading glyph type (size / line-height). */
  iconType: TextStyle;
  /** Title type (size / line-height / weight / tracking). */
  titleType: TextStyle;
  /** Description / body type (size / line-height / tracking). */
  bodyType: TextStyle;
  /** Dismiss control shape (size, radius). */
  dismissButton: ViewStyle;
  /** Dismiss glyph type (size / line-height). */
  dismissType: TextStyle;
  /** Pressed opacity for the dismiss control (iOS/web dim; Android stays opaque under ripple). */
  dismissPressedOpacity: number;
  /**
   * Hit-area inset per side (pt/dp) padding the 24px dismiss box out to the platform
   * minimum touch target (HIG 44x44pt on iOS, M3 48x48dp on Android) without changing
   * the rendered size. null (web) keeps pointer targets visual.
   */
  dismissHitSlop: number | null;
  /** Footer action region: the row layout + gap between action buttons, plus the
   *  top separation dividing them from the body above. */
  actions: ViewStyle;
}

export interface AlertProps {
  // Content.
  title?: string;
  description?: string;
  // A leading glyph: a single Text character, or an element (e.g. an `<Icon />`,
  // auto-tinted to the tone's icon color unless it sets its own color).
  icon?: ReactNode;
  // Tone (pick one; omit for the neutral default).
  info?: boolean;
  success?: boolean;
  warning?: boolean;
  /** The danger tone. This is the name the intent axis uses across the kit (Button,
   *  AlertDialog, and every chart) and the one the design hand-off uses here too. */
  destructive?: boolean;
  /** @deprecated Use `destructive`. Kept working so existing call sites are untouched;
   *  it resolves to exactly the same tone. */
  error?: boolean;
  /** Shows a trailing dismiss control. Pressing it hides the banner out of the box
   *  (uncontrolled); pass `dismissed` to own that state instead. */
  dismissible?: boolean;
  /** Controlled dismissal: `true` hides the banner. Omit to let the Alert manage it. */
  dismissed?: boolean;
  /** Uncontrolled seed: start hidden. Rarely useful; defaults to false. */
  defaultDismissed?: boolean;
  /** Fired when the dismiss control is pressed (both modes). */
  onDismiss?: () => void;
  children?: ReactNode;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * A footer action region rendered under the body. The Alert owns the layout: it
   * separates the actions from the description above and lays the buttons out in a
   * row, so a call site passes the buttons directly
   * (`actions={<Button primary small>Upgrade plan</Button>}`) with no wrapper.
   * Pass a fragment for more than one action.
   */
  actions?: ReactNode;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Width: an Alert is FILL (src/style/sizing.ts). It spans the parent it is given,
// a page column, a dialog body, a Container step over a form, so a column of
// alerts is the same measure top to bottom and a banner over a form lines up with
// the fields; the parent layout container decides the measure.

// Tone precedence when more than one is passed: first match wins. `destructive` and
// `error` are the same tone under two names, so they share one branch.
function toneOf(p: AlertProps): Tone {
  if (p.destructive || p.error) return "error";
  if (p.warning) return "warning";
  if (p.success) return "success";
  if (p.info) return "info";
  return "neutral";
}

// The palette hue per toned alert comes from the style layer's shared statusHues
// map (src/style/status-hue), the same one Badge's status pill reads, so the two
// never drift. Neutral rides the semantic tokens instead of a palette hue.

// Container border + fill. Light: 200 border / 50 surface; dark: 800 / 950.
// Neutral: semantic card surface with the border token.
// The under-fill of a toned alert's glass pane: the hue at a tint that keeps the tone
// readable over the material (neutral takes the content layer's own tint).
function paneTint(tokens: ColorTokens, dark: boolean, tone: Tone): string | undefined {
  if (tone === "neutral") return undefined;
  const hue = statusHues[tone];
  return alpha(palette[`${hue}-${dark ? 500 : 400}`], dark ? 0.28 : 0.30);
}

function containerColor(tokens: ColorTokens, dark: boolean, tone: Tone): ViewStyle {
  if (tone === "neutral") return { borderColor: tokens.border, backgroundColor: tokens.card };
  const hue = statusHues[tone];
  return dark
    ? { borderColor: palette[`${hue}-800`], backgroundColor: palette[`${hue}-950`] }
    : { borderColor: palette[`${hue}-200`], backgroundColor: palette[`${hue}-50`] };
}

// Icon color. Light: 600; dark: 400. Neutral: muted-foreground.
function iconColor(tokens: ColorTokens, dark: boolean, tone: Tone): TextStyle {
  if (tone === "neutral") return { color: tokens["muted-foreground"] };
  const hue = statusHues[tone];
  return { color: dark ? palette[`${hue}-400`] : palette[`${hue}-600`] };
}

// Title color. Light: 800; dark: 200. Neutral: foreground.
function titleColor(tokens: ColorTokens, dark: boolean, tone: Tone): TextStyle {
  if (tone === "neutral") return { color: tokens.foreground };
  const hue = statusHues[tone];
  return { color: dark ? palette[`${hue}-200`] : palette[`${hue}-800`] };
}

// Body color. Light: 700; dark: 300. Neutral: muted-foreground. Under glass the body
// steps to the title's 800/200: the hue wash over the page (and over a content pane) is
// darker than the 50/950 fill, and 700/300 slips under 4.5:1 on green and amber there.
function bodyColor(tokens: ColorTokens, dark: boolean, tone: Tone, glass: boolean): TextStyle {
  if (tone === "neutral") return { color: tokens["muted-foreground"] };
  if (glass) return titleColor(tokens, dark, tone);
  const hue = statusHues[tone];
  return { color: dark ? palette[`${hue}-300`] : palette[`${hue}-700`] };
}

export function createAlert(skin: AlertSkin) {
  // Element icons (an `<Icon />`) sit in a View slot centered on the text glyph's
  // line height, so both icon forms align with the title's first line.
  const iconSlot: ViewStyle = { height: skin.iconType.lineHeight, justifyContent: "center" };

  return function Alert(props: AlertProps) {
    const { title, description, icon, children, actions, dismissible, onDismiss, testID, style } = props;
    const theme = useTheme();
    const { tokens, dark } = theme;
    const glass = isGlass(theme);
    const tone = toneOf(props);
    const fill = useFillStyle("Alert");

    // Dismissal obeys the kit's controlled + uncontrolled contract: pressing the
    // trailing "×" hides the banner out of the box, a controlled `dismissed` prop
    // hands that state to the parent, and `onDismiss` fires in both modes.
    const [dismissed, setDismissed] = useControllableState<boolean>(
      props.dismissed,
      props.defaultDismissed ?? false,
      () => onDismiss?.(),
    );

    // Auto-tint a leading `<Icon />` element to the tone's icon color, so a bare
    // `<Icon info />` matches the banner hue without the caller threading a color
    // (the same idiom Chip uses for its leading icon). An Icon that sets its own
    // `color` (or a semantic color boolean, which wins inside Icon) keeps it; a
    // non-Icon element ignores the injected prop.
    const tintedIcon = isValidElement(icon)
      ? cloneElement(icon as ReactElement<Record<string, unknown>>, {
          color: (icon.props as Record<string, unknown>).color ?? iconColor(tokens, dark, tone).color,
        })
      : null;

    // An Alert is an inline notification surface, so it announces itself as an
    // alert and rides a live region (assistive tech reads the message without
    // stealing focus). RNW drops accessibilityLiveRegion, so the aria-live alias
    // carries the web announcement. An error tone is urgent enough to interrupt
    // ("assertive"); the rest stay "polite".
    const live = tone === "error" ? "assertive" : "polite";

    if (dismissed) return null;

    return (
      <View
        testID={testID}
        accessibilityRole="alert"
        accessibilityLiveRegion={live}
        aria-live={live}
        style={[skin.container, glass ? { ...containerColor(tokens, dark, tone), backgroundColor: "transparent" } : containerColor(tokens, dark, tone), fill, style]}
      >
        {/* Under glass the alert is a CONTENT-layer pane (a toned alert tints it with its
            hue) painted behind the live-region root, which keeps its semantics and its
            tone-coloured edge. Renders nothing in solid mode. */}
        <GlassPane layer="content" shape={skin.container} tint={paneTint(tokens, dark, tone)} />
        {icon != null ? (
          tintedIcon != null ? (
            <View style={iconSlot}>{tintedIcon}</View>
          ) : (
            <Text style={[skin.iconType, iconColor(tokens, dark, tone)]}>{icon}</Text>
          )
        ) : null}
        <View style={CONTENT}>
          {title != null && title !== "" ? (
            <Text style={[skin.titleType, titleColor(tokens, dark, tone)]}>{title}</Text>
          ) : null}
          {description != null && description !== "" ? (
            <Text style={[skin.bodyType, bodyColor(tokens, dark, tone, glass)]}>{description}</Text>
          ) : null}
          {children}
          {actions != null ? <View style={skin.actions}>{actions}</View> : null}
        </View>
        {dismissible ? (
          <Pressable
            onPress={() => setDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={skin.dismissHitSlop ?? undefined}
            android_ripple={controlRipple(tokens)}
            style={({ pressed }) => [skin.dismissButton, pressDim(pressed, skin.dismissPressedOpacity)]}
          >
            <Text style={[skin.dismissType, iconColor(tokens, dark, tone)]}>×</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };
}

// flex-1 gap-1 — the content column beside the icon (platform-neutral layout).
const CONTENT: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 4 };
