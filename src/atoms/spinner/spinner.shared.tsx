import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { View, Text, useTheme, supportsNativeDriver, type ColorTokens, type ViewStyle, type TextStyle } from "../../style/index.js";
import { type Tone, TONE_TOKEN } from "./spinner.styles.js";

// Shared Spinner shell. Uses React Native's primitives DIRECTLY (no engine
// className layer) and reads the active brand tokens via useTheme, so the arc/
// spoke color follows light/dark and the glass surface. The shared structure
// (size/tone precedence, the continuous-rotation animation, accessibility, and
// the component-owned label pairing) lives here once; a platform file supplies
// only its rendered shape + label/description type (a SpinnerSkin) and calls
// createSpinner. The web skin keeps the current ActivityIndicator look; the iOS
// skin draws the ring of fading spokes (UIActivityIndicatorView); the Android
// skin draws the single sweeping arc (M3 CircularProgressIndicator).

export interface SpinnerProps {
  /**
   * Optional label rendered beside (or below) the indicator in the spinner's
   * canonical muted small type. Supplying it turns the bare indicator into a
   * component-owned loading pairing, so the caller never hand-composes a
   * Row/Column + Typography beside a <Spinner />. A bare <Spinner /> (no
   * children) is unchanged.
   */
  children?: ReactNode;
  /**
   * Optional muted secondary line rendered under the label (a progress hint,
   * an ETA). Stacks under the label inside the control.
   */
  description?: ReactNode;
  /**
   * Layout axis for the label. Omitted/false: the label sits BESIDE the
   * indicator in a snug row (the inline pairing). `stacked`: the indicator sits
   * over a centered label column (the panel / section-loader form).
   */
  stacked?: boolean;
  // Size (pick one; default sits between small and large).
  small?: boolean;
  large?: boolean;
  // Tone (pick one; default is the foreground arc color).
  primary?: boolean;
  muted?: boolean;
  foreground?: boolean;
  /**
   * Accessible description of what is loading. When absent, a string label
   * (children) becomes the accessible name; when neither is present it defaults
   * to "Loading".
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
}

// Tone precedence when more than one is passed: first match wins.
function toneOf(p: SpinnerProps): Tone {
  if (p.primary) return "primary";
  if (p.muted) return "muted";
  if (p.foreground) return "foreground";
  return "foreground";
}

// Three distinct diameters (px) so each size axis value renders a different
// spinner. Precedence within the size axis: large > small > default (first
// match wins). Kept identical to the original component.
function sizeOf(p: SpinnerProps): number {
  if (p.large) return 32;
  if (p.small) return 16;
  return 20;
}

// What a platform skin owns: how it draws the spinner for a given diameter and
// color, plus the label/description type. `rotate` is the shared Animated spin
// value (0..1, mapped to 0..360deg by the skin if it spins the whole shape). The
// skin returns a ready-to-mount node.
export interface SpinnerSkin {
  render: (args: {
    size: number;
    color: string;
    rotate: Animated.Value;
    tokens: ColorTokens;
  }) => ReactElement;
  /** The label text beside/below the indicator, in the canonical muted small type. */
  label: (tokens: ColorTokens) => TextStyle;
  /** The muted secondary description line rendered under the label when present. */
  description: (tokens: ColorTokens) => TextStyle;
  /**
   * Whether this skin consumes the shared rotation value. When `false`, the
   * shell skips starting the perpetual rotation loop (e.g. the web
   * ActivityIndicator animates itself and never reads `rotate`, so driving an
   * Animated.Value for it would be a wasted, never-stopping per-instance timer).
   * Defaults to `true`.
   */
  spins?: boolean;
}

// The component-owned label layouts. Inline (default): the indicator beside the
// label in a snug row, vertically centered. Stacked: the indicator over a
// centered label column (the panel / section-loader form). The 8px gap is the
// kit's snug spacing, matching the Row/Column callers used to hand-compose.
const INLINE_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };
const STACKED_COLUMN: ViewStyle = { flexDirection: "column", alignItems: "center", gap: 8 };
// The text sub-group (label over an optional description). `flexShrink` lets a
// long label wrap within the inline row instead of forcing it wider; the stacked
// form centers its lines under the indicator.
const INLINE_TEXT: ViewStyle = { flexShrink: 1, gap: 2 };
const STACKED_TEXT: ViewStyle = { alignItems: "center", gap: 2 };
const CENTER_TEXT: TextStyle = { textAlign: "center" };

/** Build a Spinner component from a platform skin. */
export function createSpinner(skin: SpinnerSkin) {
  return function Spinner(props: SpinnerProps) {
    const { children, description, stacked, accessibilityLabel, testID } = props;
    const { tokens } = useTheme();
    const tone = toneOf(props);
    const size = sizeOf(props);
    const color = tokens[TONE_TOKEN[tone]];
    // Whether the control carries any label text at all (label and/or description).
    const hasText = children != null || description != null;

    // One continuous rotation per ~900ms, looping forever. The skins that spin a
    // drawn shape (iOS spokes, Android arc) interpolate this 0..1 value to
    // 0..360deg; the web ActivityIndicator animates itself and ignores it.
    // The loop runs on the native driver where there is one and on the JS driver on
    // web (supportsNativeDriver, src/style/motion.ts): under the New Architecture a
    // JS-driven frame is a shadow-tree commit per animated view, so a JS loop is never
    // cheap, and a native loop on the skins' Animated.View wrappers advances (the
    // frozen native loop of 2026-06 drove a createAnimatedComponent(Svg) root).
    const rotate = useRef(new Animated.Value(0)).current;
    const spins = skin.spins !== false;
    useEffect(() => {
      // Skins that animate themselves (the web ActivityIndicator) never read
      // `rotate`; starting a loop for them would spin an Animated.Value forever
      // with no subscriber in the render tree. Only loop when the skin spins.
      if (!spins) return;
      const loop = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: supportsNativeDriver,
        }),
      );
      loop.start();
      return () => loop.stop();
    }, [rotate, spins]);

    // Resolve the accessible name: an explicit accessibilityLabel wins; else a
    // string label (children) becomes the name; else the "Loading" default.
    const a11yLabel =
      accessibilityLabel ?? (typeof children === "string" ? children : undefined) ?? "Loading";

    // The bare indicator. Without a label it IS the progressbar and owns the
    // role/name; with a label the wrapping group owns the role/name and the
    // indicator is decorative, so a screen reader announces the name once.
    const indicator = (
      <Animated.View
        testID={hasText ? undefined : testID}
        accessibilityRole={hasText ? undefined : "progressbar"}
        accessibilityLabel={hasText ? undefined : a11yLabel}
        style={{ flexShrink: 0, width: size, height: size, alignItems: "center", justifyContent: "center" }}
      >
        {/* The shell owns the loading announcement. Some visual renderers, such
            as RNW's ActivityIndicator, add a progressbar role of their own. */}
        <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {skin.render({ size, color, rotate, tokens })}
        </View>
      </Animated.View>
    );

    // No label: a bare <Spinner /> is unchanged.
    if (!hasText) return indicator;

    // Labeled: a Pressable-free group owning the row/column, gap, alignment, and
    // the canonical muted type. The group carries the progressbar role + name.
    return (
      <View
        testID={testID}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={a11yLabel}
        style={stacked ? STACKED_COLUMN : INLINE_ROW}
      >
        {indicator}
        <View style={stacked ? STACKED_TEXT : INLINE_TEXT}>
          {children != null ? (
            <Text style={stacked ? [skin.label(tokens), CENTER_TEXT] : skin.label(tokens)}>{children}</Text>
          ) : null}
          {description != null ? (
            <Text style={stacked ? [skin.description(tokens), CENTER_TEXT] : skin.description(tokens)}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };
}
