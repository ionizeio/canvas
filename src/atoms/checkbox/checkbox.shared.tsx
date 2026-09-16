import { forwardRef, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { type GestureResponderEvent } from "react-native";
import { View, Pressable, useTheme, useControllableState, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { CheckboxContent, CHECKBOX_ROW } from "./indicator/shared.js";

// Shared Checkbox shell. Uses React Native's primitives DIRECTLY and reads the
// active brand tokens via useTheme, so colors follow light/dark and the glass
// surface. The shared structure (the box + glyph + label row, the size precedence,
// accessibility, onChange/onValueChange, indeterminate) lives here once; a platform
// file supplies only its skin (box shape/sizing/border, glyph color, press feedback)
// and calls createCheckbox. iOS has no native checkbox, so every skin is hand-drawn
// from the brand tokens — no platform default color ever leaks in.

export interface CheckboxProps {
  /** Label text (the option's title) shown beside the box. */
  children?: ReactNode;
  /**
   * Optional muted secondary line rendered under the label, for the common
   * title-plus-description option (a notification setting, a consent row).
   * Supplying it builds the stacked title/description layout inside the control,
   * so the caller never hand-composes a Row + Column + two Typography nodes and
   * the whole row stays tappable.
   */
  description?: ReactNode;
  /** Controlled checked state; omit for uncontrolled use. */
  checked?: boolean;
  /** Initial state for uncontrolled use (a bare <Checkbox /> is interactive). */
  defaultChecked?: boolean;
  /**
   * Mixed state: some-but-not-all selected. Shown as a dash, not a tick.
   * Takes visual precedence over `checked`.
   */
  indeterminate?: boolean;
  /** Fired with the next checked value when the row is pressed (both modes). Web keyboard activation supports Space on release and Enter. */
  onChange?: (next: boolean) => void;
  /** Alias of onChange, for parity with RN's value-style callbacks. */
  onValueChange?: (next: boolean) => void;
  /**
   * Accessible name for a LABEL-LESS checkbox (one with no `children`, e.g. a
   * row selector in a table). With a visible label the label itself is the name;
   * without one this is what a screen reader announces.
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the pressable row. */
  testID?: string;
  // Size (pick one; default is the base box).
  small?: boolean;
  large?: boolean;
  // State.
  disabled?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export type Size = "small" | "base" | "large";

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: CheckboxProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// The only thing a platform skin owns: the box, glyph, and label styles for a given
// state and size, plus the press/disabled feedback. Everything else is the shell.
export interface CheckboxSkin {
  /** The square box. `filled` = checked or indeterminate. `nudge` aligns the box to a label's first line. */
  box: (tokens: ColorTokens, filled: boolean, size: Size, nudge: boolean) => ViewStyle;
  /** The check / dash glyph inside a filled box. */
  glyph: (tokens: ColorTokens, size: Size) => TextStyle;
  /** The label text to the right of the box. */
  label: (tokens: ColorTokens, size: Size) => TextStyle;
  /** The muted secondary description line, rendered under the label when present. */
  description: (tokens: ColorTokens, size: Size) => TextStyle;
  /** Opacity applied to the row when disabled. */
  disabledOpacity: number;
  /** iOS/web dim the row on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the box; null on iOS/web. */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean; radius?: number }) | null;
}

/** Build a Checkbox component from a platform skin.
 * @ref Ref to the interactive checkbox row, including its label. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createCheckbox(skin: CheckboxSkin) {
  const Checkbox = forwardRef<View, CheckboxProps>(function Checkbox(props, ref) {
    const hostRef = useComposedRefs(ref);
    const { children, description, indeterminate, onChange, onValueChange, disabled, style } = props;
    const size = sizeOf(props);
    const { tokens } = useTheme();
    // Whether the control carries any text at all (title and/or description).
    const hasText = children != null || description != null;

    // Controlled when `checked` is provided, self-managed otherwise, so a bare
    // <Checkbox /> toggles out of the box (the standard library contract).
    const [checked, setChecked] = useControllableState<boolean>(
      props.checked,
      props.defaultChecked ?? false,
      (next) => {
        onChange?.(next);
        onValueChange?.(next);
      },
    );

    const handlePress = (_event: GestureResponderEvent) => {
      setChecked(!checked);
    };
    const keyboard = useSpaceActivation(!!disabled, handlePress);

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    return (
      <Pressable
        ref={hostRef}
        {...(keyboard as object)}
        onPress={handlePress}
        disabled={disabled}
        testID={props.testID}
        // Icon-only (no text): grow the small box's tap target toward ~44pt.
        // With a label the whole row is already a generous target, so leave it.
        hitSlop={!hasText ? 8 : undefined}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: indeterminate ? "mixed" : checked, disabled: !!disabled }}
        aria-checked={indeterminate ? "mixed" : checked}
        // Dual alias (RNW forwards aria-label, native reads accessibilityLabel).
        accessibilityLabel={props.accessibilityLabel}
        aria-label={props.accessibilityLabel}
        android_ripple={ripple}
        style={({ pressed }) => [
          CHECKBOX_ROW,
          disabled ? { opacity: skin.disabledOpacity } : null,
          skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          style,
        ]}
      >
        <CheckboxContent skin={skin} tokens={tokens} size={size} checked={checked}
          indeterminate={indeterminate} description={description}>
          {children}
        </CheckboxContent>
      </Pressable>
    );
  });
  Checkbox.displayName = "Checkbox";
  return Checkbox;
}
