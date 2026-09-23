import { forwardRef, type ComponentType, type ReactNode, type RefAttributes } from "react";
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
// from the brand tokens; no platform default color ever leaks in.
//
// One job, different control (the design language's item 5): a Checkbox that is ONE
// on/off setting is the platform's switch on iOS and Android (Material 3 uses a switch
// for a single setting on phones too), so those entries pass their Switch as the
// `Standalone` part and the shell renders it; a Checkbox that selects items in a list
// (`selection`, or `indeterminate`, a list's select-all) stays a checkbox, which iOS
// draws as the edit-mode selection circle.

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
   * Takes visual precedence over `checked`. Implies `selection`: a mixed state
   * belongs to a list's select-all, and a switch has none.
   */
  indeterminate?: boolean;
  /**
   * A checkbox that selects an item in a list or a bulk selection (a table's rows, a
   * list in edit mode, a select-all), rather than one on/off setting. The web draws
   * the checkbox, iOS the edit-mode selection circle, Android the Material 3 checkbox.
   * Without it a Checkbox is one setting, which iOS and Android render as their
   * switch (role `switch`), so a settings row reads the way each platform writes it.
   */
  selection?: boolean;
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

/**
 * The components a Checkbox draws with that differ per platform. `Standalone` is the
 * control a one-setting Checkbox renders instead of a checkbox (the iOS and Android
 * switch), taking the Checkbox's props less the list-selection ones; the web passes
 * none and keeps the checkbox.
 */
export interface CheckboxParts {
  Standalone?: ComponentType<Omit<CheckboxProps, "indeterminate" | "selection"> & RefAttributes<View>>;
}

/** Build a Checkbox component from a platform skin and its platform parts.
 * @ref Ref to the interactive checkbox row, including its label. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createCheckbox(skin: CheckboxSkin, parts: CheckboxParts = {}) {
  const Standalone = parts.Standalone;
  const Box = createCheckboxBox(skin);
  // Two components rather than an early return, so a Checkbox that gains or loses
  // `selection` swaps controls instead of changing its hooks.
  const Checkbox = forwardRef<View, CheckboxProps>(function Checkbox(props, ref) {
    if (Standalone != null && !props.selection && !props.indeterminate) {
      const { selection: _selection, indeterminate: _indeterminate, ...setting } = props;
      return <Standalone ref={ref} {...setting} />;
    }
    return <Box ref={ref} {...props} />;
  });
  Checkbox.displayName = "Checkbox";
  return Checkbox;
}

function createCheckboxBox(skin: CheckboxSkin) {
  const CheckboxBox = forwardRef<View, CheckboxProps>(function CheckboxBox(props, ref) {
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
  CheckboxBox.displayName = "Checkbox";
  return CheckboxBox;
}
