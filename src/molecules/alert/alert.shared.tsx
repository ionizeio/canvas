import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import {
  View,
  Pressable,
  Text,
  useControllableState,
  useFillStyle,
  controlRipple,
  pressDim,
  statusColors,
  type ColorTokens,
  type LayoutStyle,
  type ViewStyle,
  type TextStyle,
  GlassPane,
  paneStyle,
  isGlass,
} from "../../style/index.js";

// Shared Alert shell. The structure (a leading icon glyph, a bold title, a
// description, an optional trailing dismiss control), the boolean-prop tone axis,
// and the semantic color logic live here once; a platform file supplies only its
// skin (shape radius, density/spacing, type tracking, dismiss press feedback) and
// calls createAlert.
//
// A banner that surfaces an inline notification. Configured by a tone axis (info /
// success / warning / error, plus a neutral default), and an optional `icon` glyph. A
// toned alert is Dark Factory's soft panel: the tone's wash as the fill with no visible
// border, the title in the tone's ink, the body in the foreground, and the icon in the
// tone's solid color, all from statusColors (src/style/status.ts), the same place Badge
// and the other toned surfaces read theirs. The neutral default is the card with a
// border hairline, a foreground title and a muted body.
//
// Neither iOS nor Material 3 ships an inline alert banner (iOS alerts are modal, see
// alert-dialog; M3 dropped the M2 banner), so there is no native shape to match and the
// native skins are the web skin; the dismiss control still meets each platform's
// minimum touch target and keeps the Android ripple.

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

// The colors per tone, from statusColors. A toned alert's edge is transparent (the wash is
// the panel); the neutral card keeps its border hairline.
function containerColor(tokens: ColorTokens, tone: Tone): ViewStyle {
  if (tone === "neutral") return { borderColor: tokens.border, backgroundColor: tokens.card };
  return { borderColor: "transparent", backgroundColor: statusColors(tokens, tone).wash };
}

// The under-fill of a toned alert's glass pane: its own wash over the content material
// (neutral takes the content layer's own tint).
function paneTint(tokens: ColorTokens, tone: Tone): string | undefined {
  return tone === "neutral" ? undefined : statusColors(tokens, tone).wash;
}

// The icon (and the dismiss glyph): the tone's solid color; muted on the neutral card.
function iconColor(tokens: ColorTokens, tone: Tone): TextStyle {
  return { color: tone === "neutral" ? tokens["muted-foreground"] : statusColors(tokens, tone).dot };
}

// The title names the tone in its ink; the neutral title is the foreground.
function titleColor(tokens: ColorTokens, tone: Tone): TextStyle {
  return { color: tone === "neutral" ? tokens.foreground : statusColors(tokens, tone).ink };
}

// The body reads in the foreground over a wash (the tone's ink stays on the title), and
// muted on the neutral card.
function bodyColor(tokens: ColorTokens, tone: Tone): TextStyle {
  return { color: tone === "neutral" ? tokens["muted-foreground"] : tokens.foreground };
}

export function createAlert(skin: AlertSkin) {
  // Element icons (an `<Icon />`) sit in a View slot centered on the text glyph's
  // line height, so both icon forms align with the title's first line.
  const iconSlot: ViewStyle = { height: skin.iconType.lineHeight, justifyContent: "center" };

  return function Alert(props: AlertProps) {
    const { title, description, icon, children, actions, dismissible, onDismiss, testID, style } = props;
    const theme = useMaterialTheme({ static: true });
    const { tokens } = theme;
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
          color: (icon.props as Record<string, unknown>).color ?? iconColor(tokens, tone).color,
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
        style={[paneStyle(theme, [skin.container, containerColor(tokens, tone)]), glass ? { borderColor: containerColor(tokens, tone).borderColor } : null, fill, style]}
      >
        {/* Under glass the alert is a CONTENT-layer pane (a toned alert tints it with its
            wash) painted behind the live-region root, which keeps its semantics and its
            edge. Renders nothing in solid mode. */}
        <GlassPane layer="content" shape={[skin.container, containerColor(tokens, tone)]} tint={paneTint(tokens, tone)} />
        {icon != null ? (
          tintedIcon != null ? (
            <View style={iconSlot}>{tintedIcon}</View>
          ) : (
            <Text style={[skin.iconType, iconColor(tokens, tone)]}>{icon}</Text>
          )
        ) : null}
        <View style={CONTENT}>
          {title != null && title !== "" ? (
            <Text style={[skin.titleType, titleColor(tokens, tone)]}>{title}</Text>
          ) : null}
          {description != null && description !== "" ? (
            <Text style={[skin.bodyType, bodyColor(tokens, tone)]}>{description}</Text>
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
            <Text style={[skin.dismissType, iconColor(tokens, tone)]}>×</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };
}

// flex-1 gap-1 — the content column beside the icon (platform-neutral layout).
const CONTENT: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 4 };
