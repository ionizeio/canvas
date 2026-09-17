import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { Animated, type GestureResponderEvent } from "react-native";
import { Pressable, View, Text, useControllableState, useMinTargetSlop, isRTL, type ColorTokens, type StyleProp, type ViewStyle, type TouchTargetSkin, type LayoutStyle, GlassPane, GlassSurface, paneStyle } from "../../style/index.js";
import { useLiquidMotion } from "../../style/liquid-motion.js";

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
    // outline (the pane's material and rim carry them). The moving thumb owns its
    // liquid material, independently of the stable track.

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
    const [pressed, setPressed] = useState(false);
    useEffect(() => { if (disabled) setPressed(false); }, [disabled]);
    const [measuredTrack, setMeasuredTrack] = useState<{ size: Size; width: number } | null>(null);
    const trackShape = skin.track(tokens, dark, checked, size);
    const thumbShape = skin.thumb(tokens, checked, size);
    const { position, start, end, top, bottom, left, right, width, height, ...thumbSurface } = thumbShape;
    const trackWidth = measuredTrack?.size === size ? measuredTrack.width : Number(trackShape.width);
    const innerWidth = trackWidth - 2 * Number(trackShape.borderWidth ?? 0);
    const thumbWidth = Number(width);
    const thumbHeight = Number(height);
    const logicalX = start != null ? Number(start) : innerWidth - Number(end ?? 0) - thumbWidth;
    const thumbFrame = useLiquidMotion({
      x: isRTL() ? innerWidth - logicalX - thumbWidth : logicalX,
      y: Number(top ?? 0), width: thumbWidth, height: thumbHeight,
    }, { enabled: glassThumb && !disabled, pressed, profile: "toggle" });

    const handlePress = (_event: GestureResponderEvent) => {
      setChecked(!checked);
    };
    const keyboard = useSpaceActivation(!!disabled, handlePress);

    // The whole row is the control, and a base iOS track is 28pt tall, so the row is
    // short of the platform minimum even though it is wide. The touch area grows to
    // meet it; nothing moves (see src/style/touch-target.ts).
    const target = useMinTargetSlop(skin.minTarget);

    return (
      <Pressable
        ref={hostRef}
        {...(keyboard as object)}
        {...target}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
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
        <View
          // This measured coordinate owner must survive transparent material mode.
          // Fabric can flatten a borderless track after its opaque fill is cleared.
          collapsable={false}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setMeasuredTrack((old) => old?.size === size && old.width === width ? old : { size, width });
          }}
          style={paneStyle(theme, disabled && glassThumb ? [trackShape, { backgroundColor: tokens.muted }] : trackShape)}
        >
          <GlassPane static layer="control" shape={trackShape} brand={checked && !disabled ? tokens.primary : undefined} />
          <Animated.View style={[{ position: "absolute", pointerEvents: "none" }, thumbFrame]} testID={props.testID ? `${props.testID}-thumb-motion` : undefined}>
            <GlassSurface
              layer="control"
              interactive
              pointerEvents="none"
              tint={disabled ? tokens["muted-foreground"] : String(thumbSurface.backgroundColor)}
              style={[thumbSurface, { width: "100%", height: "100%" }, disabled && glassThumb ? { backgroundColor: tokens["muted-foreground"] } : null]}
            />
          </Animated.View>
        </View>
      </Pressable>
    );
  });
  Switch.displayName = "Switch";
  return Switch;
}
