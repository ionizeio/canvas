import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { forwardRef, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { type GestureResponderEvent } from "react-native";
import { useSeededMinTargetSlop, styleBox } from "../../style/touch-target-seed.js";
import { Pressable, View, Text, useControllableState, type ColorTokens, type StyleProp, type ViewStyle, type TouchTargetSkin, type LayoutStyle, GlassPane, GlassSurface, paneStyle } from "../../style/index.js";

// Shared Switch shell. Uses React Native's primitives DIRECTLY (no engine className
// layer) and reads the active brand tokens via so colors follow light/dark.
// The shared structure (label/description row, accessibility, toggle, sizing) lives
// here once; a platform file supplies only its track + thumb styles (a SwitchSkin)
// and calls createSwitch. Styles are plain RN objects, which work on iOS, Android,
// and web alike (a real .css file would only work on the web).

export interface SwitchProps {
  /** Controlled on/off state; omit for uncontrolled use. */
  checked?: boolean;
  /** Initial state for uncontrolled use (a bare <Switch /> is interactive). */
  defaultChecked?: boolean;
  /** Fired with the next checked value when the switch is toggled (both modes). Web keyboard activation supports Space on release and Enter. */
  onChange?: (next: boolean) => void;
  /** Alias of onChange, for parity with RN's value-style callbacks. */
  onValueChange?: (next: boolean) => void;
  /** E2E hook forwarded to the pressable row. */
  testID?: string;
  // Size (pick one; default is the standard track).
  small?: boolean;
  large?: boolean;
  // State.
  disabled?: boolean;
  /** Optional label, rendered to the left of the track. */
  children?: ReactNode;
  /** Optional muted description line, rendered under the label. */
  description?: ReactNode;
  /**
   * Accessible name for the switch when no visible `children` label is rendered
   * (e.g. a switch embedded in an Action Panel whose label sits in sibling Text).
   * Without it, a label-less switch announces only "switch, on/off".
   */
  accessibilityLabel?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export type Size = "small" | "base" | "large";

function sizeOf(p: SwitchProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// The only thing a platform skin owns: the track and thumb styles for a given
// on/off state and size, built from the active tokens. Everything else is the
// shell. `dark` is threaded in (like dropdown/badge) so a skin can pick a
// scheme-specific off-track gray that the generic `input` token does not provide
// (the iOS off track is a solid mid-gray in light mode, systemGray3).
export interface SwitchSkin extends TouchTargetSkin {
  track: (tokens: ColorTokens, dark: boolean, checked: boolean, size: Size) => ViewStyle;
  thumb: (tokens: ColorTokens, checked: boolean, size: Size) => ViewStyle;
}

const LABEL_FONT: Record<Size, number> = { small: 12, base: 14, large: 16 };
const DESC_FONT: Record<Size, number> = { small: 11, base: 12, large: 14 };

/** Build a Switch component from a platform skin.
 * @ref Ref to the interactive switch row, including its label. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createSwitch(skin: SwitchSkin) {
  const Switch = forwardRef<View, SwitchProps>(function Switch(props, ref) {
    const hostRef = useComposedRefs(ref);
    const { onChange, onValueChange, disabled, children, description, accessibilityLabel, style } = props;
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const thumbTheme = useMaterialTheme({ layer: "control" });
    const { tokens, dark } = theme;
    const glassThumb = thumbTheme.surface === "glass";
    const size = sizeOf(props);
    // Under glass the track is a static pane at control density: a GlassPane paints the material
    // behind the thumb (BRAND-tinted while checked) and the track drops its fill and
    // outline (the pane's material and rim carry them). The thumb is a CONTROL-layer
    // surface of its own, tinted with the skin's thumb fill and positioned by the skin
    // inside the track; in solid mode it is the skin's plain knob.

    // Controlled when `checked` is provided, self-managed otherwise, so a bare
    // <Switch /> toggles out of the box (the standard library contract).
    const [checked, setChecked] = useControllableState<boolean>(
      props.checked,
      props.defaultChecked ?? false,
      (next) => {
        onChange?.(next);
        onValueChange?.(next);
      },
    );
    const trackShape = skin.track(tokens, dark, checked, size);
    const thumbShape = skin.thumb(tokens, checked, size);

    const handlePress = (_event: GestureResponderEvent) => {
      setChecked(!checked);
    };
    const keyboard = useSpaceActivation(!!disabled, handlePress);

    // The whole row is the control, and a base iOS track is 28pt tall, so the row is
    // short of the platform minimum even though it is wide. The touch area grows to
    // meet it; nothing moves (see src/style/touch-target.ts). The slop is seeded from the
    // track, the least the row renders at, so it is in place before the first layout
    // (src/style/touch-target-seed.ts).
    const target = useSeededMinTargetSlop(skin.minTarget, styleBox(trackShape));

    return (
      <Pressable
        ref={hostRef}
        {...(keyboard as object)}
        {...target}
        onPress={handlePress}
        disabled={disabled}
        testID={props.testID}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        aria-label={accessibilityLabel}
        accessibilityState={{ checked, disabled: !!disabled }}
        aria-checked={checked}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 16,
            alignItems: description != null ? "flex-start" : "center",
          },
          disabled && !glassThumb ? { opacity: 0.5 } : null,
          pressed && !glassThumb ? { opacity: 0.9 } : null,
          style,
        ]}
      >
        {children != null || description != null ? (
          <View>
            {children != null ? (
              <Text style={{ fontWeight: "500", color: disabled ? tokens["muted-foreground"] : tokens.foreground, fontSize: LABEL_FONT[size] }}>{children}</Text>
            ) : null}
            {description != null ? (
              <Text style={{ color: tokens["muted-foreground"], fontSize: DESC_FONT[size] }}>{description}</Text>
            ) : null}
          </View>
        ) : null}
        <View style={paneStyle(theme, disabled && glassThumb ? [trackShape, { backgroundColor: tokens.muted }] : trackShape)}>
          <GlassPane static layer="control" shape={trackShape} brand={checked && !disabled ? tokens.primary : undefined} />
          <GlassSurface
            layer="control"
            interactive
            pointerEvents="none"
            tint={disabled ? tokens["muted-foreground"] : String(thumbShape.backgroundColor)}
            style={[thumbShape, disabled && glassThumb ? { backgroundColor: tokens["muted-foreground"] } : null]}
          />
        </View>
      </Pressable>
    );
  });
  Switch.displayName = "Switch";
  return Switch;
}
