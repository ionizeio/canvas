import { forwardRef, useId, useState, type ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  type AccessibilityActionEvent,
  type NativeSyntheticEvent,
  type TextInputEndEditingEventData,
  type TextInputKeyPressEvent,
} from "react-native";
import {
  View,
  Text,
  Pressable,
  RippleClip,
  cornerRadii,
  useHugStyle,
  useControllableState,
  FOCUS_RESET,
  LabelContent,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  GlassPane,
  paneStyle,
  isGlass,
  PANE_SIBLING_INPUT,
} from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useTextEntryMaterial } from "../../style/text-entry-material.js";
import { clamp } from "../../style/math.js";
import { Icon } from "../icon/icon.js";
import { addDecimal } from "./stepper.math.js";
import { stepperAccessibility } from "./stepper.accessibility.js";

// Shared Stepper shell. A numeric value with a − button, an editable numeric
// center field, and a + button (the iOS UIStepper idiom, ± with direct entry). ALL
// of the structure (the three slots), the clamping math, the direct-entry parsing,
// the disabled-at-bound logic, and the full accessibility (button roles + the
// runtime accessibility metadata) live here ONCE. A platform
// file supplies only its skin (the per-OS shape, sizing, fill, divider, glyph color,
// and press feedback) and calls createStepper.
//
// Why the ARIA props are spelled out: react-native-web DROPS accessibilityValue, so
// the spinbutton field carries aria-valuenow/min/max directly for web screen
// readers. Native keeps those numbers and its adjustment actions on the outer
// View. The − / + buttons carry aria-disabled alongside
// accessibilityState so RNW marks them disabled too.

// Style axes (semantic boolean props, the prop name is the value):
//   - Size: small / large (omit for the default medium). Precedence: large > small.
//   - State: disabled (dims the whole control and blocks every slot).
// There is no string-enum styling; every visual variation is a boolean above.

export type Size = "small" | "base" | "large";

export interface StepperProps {
  /** Controlled numeric value (clamped to [min, max] for display); omit for uncontrolled use. */
  value?: number;
  /** Initial value for uncontrolled use (a bare <Stepper /> steps out of the box). Default `min`. */
  defaultValue?: number;
  /** Fired with the next clamped value when buttons, adjustment keys, or direct entry change it (both modes). */
  onChange?: (next: number) => void;
  /** E2E hook forwarded to the group container. */
  testID?: string;
  /** Lower bound. Default 0. The − button disables when value <= min. */
  min?: number;
  /** Upper bound. Default Number.MAX_SAFE_INTEGER. The + button disables when value >= max. */
  max?: number;
  /** Increment/decrement amount for the ± buttons and adjustment keys. Default 1. */
  step?: number;
  /**
   * The control's persistent, component-owned label. When set it renders as a
   * VISIBLE title ABOVE the ± control (mirroring Input's above-field placement,
   * per-OS type from the skin) and becomes the group's programmatic name (wired via
   * accessibilityLabel + aria-labelledby). When omitted, the control keeps the
   * invisible "Number" accessible-name fallback and renders no visible label, so a
   * bare `<Stepper />` looks exactly as before.
   */
  label?: string;
  /** Optional muted secondary line rendered under the label (parity with Input). Takes effect only alongside `label`. */
  description?: ReactNode;
  /**
   * Marks the control required: appends a destructive "*" to the label (hidden from
   * the accessible name) and sets aria-required on the numeric control. Takes effect only
   * alongside `label`.
   */
  required?: boolean;
  // Size (pick one; default is the medium control). Precedence: large > small.
  small?: boolean;
  large?: boolean;
  // State.
  disabled?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The only thing a platform skin owns: the group shape, the ± button geometry and
// press feedback, the center field surface, the divider, and the glyph color/size.
// The fill/structure stay the brand on every OS; the skin never injects a platform
// default color (no iOS system blue, no M3 default).
export interface StepperSkin {
  /** Clear Liquid Glass text entry on the web appearance. */
  liquid?: boolean;
  /** The outer group container (the [ − | value | + ] shell shape). */
  group: (t: ColorTokens, size: Size, disabled: boolean) => ViewStyle;
  /** One ± button cell; `side` lets the skin round the matching outer corner. */
  button: (t: ColorTokens, size: Size, side: "left" | "right", disabled: boolean, pressed: boolean) => ViewStyle;
  /** The editable center field surface (and its type scale). */
  field: (t: ColorTokens, size: Size, disabled: boolean) => TextStyle;
  /** Divider line between a button and the value (null = no separator on this skin). */
  divider: ((t: ColorTokens, disabled: boolean) => ViewStyle) | null;
  /** The ± glyph color token and px size for a given size/state. */
  glyph: (t: ColorTokens, size: Size, disabled: boolean) => { color: keyof ColorTokens; size: number };
  /**
   * Web dims a ± button on press. null on Android (ripple carries the feedback)
   * and on iOS (the skin's `button` paints a highlight fill on the pressed half
   * instead — the iOS 27 stepper never dims its glyph).
   */
  pressedOpacity: number | null;
  /** Android ripple over a ± button; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Uniform hitSlop (px per edge) padding a ± button's touch target out to the
   * platform minimum (Android M3 48dp); null = no padding (web, and iOS where
   * Apple's own 32pt UIStepper sets the precedent).
   */
  hitSlop: ((size: Size) => number) | null;
  /** Layout order: the iOS HIG puts the value field to the LEFT of the [ − | + ] pill. */
  fieldOnLeft: boolean;
  /**
   * The persistent label rendered ABOVE the control (the canonical field-label
   * type, matching Input's label scale): iOS the SF field-label (semibold 600,
   * -0.15 tracking), web the 500-weight title, Android the M3 label (medium, M3
   * tracking). The floating M3 in-container label Input uses does not apply — a ±
   * button row has no filled field box to float a label into — so Android keeps the
   * component-owned title above, at the M3 label type.
   */
  labelAbove: (t: ColorTokens, size: Size) => TextStyle;
  /** The muted secondary description line under the label (per-OS supporting-text type). */
  description: (t: ColorTokens, size: Size) => TextStyle;
}

// Map a glyph color token to the Icon atom's boolean color prop. A disabled (at-bound)
// button dims its glyph to `muted` regardless of the skin's active color, so the
// disabled state reads on every platform.
function glyphColorProps(token: keyof ColorTokens, disabled: boolean): Record<string, boolean> {
  if (disabled) return { muted: true };
  if (token === "primary") return { primary: true };
  if (token === "muted-foreground") return { muted: true };
  if (token === "destructive") return { destructive: true };
  // `foreground` is the Icon default (no color boolean needed).
  return {};
}

// Size precedence when more than one is passed: first match wins (large > small).
function sizeOf(p: StepperProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

/** Build a Stepper component from a platform skin. */
export function createStepper(skin: StepperSkin) {
  const Stepper = forwardRef<TextInput, StepperProps>(function Stepper(props, ref) {
    const {
      onChange,
      min = 0,
      max = Number.MAX_SAFE_INTEGER,
      step = 1,
      label,
      description,
      required,
      disabled,
      style,
    } = props;
    const entryMaterial = useTextEntryMaterial(!!skin.liquid);
    const { theme } = entryMaterial;
    const actionTheme = useMaterialTheme({ layer: "control" });
    const { tokens } = theme;
    // HUG: the control keeps its content width inside a stretching Column (whichever
    // node is the root: the bare control, or the labeled wrapper).
    const hug = useHugStyle();
    const size = sizeOf(props);
    // Under glass the stepper's surface is a CONTROL-layer puck. Whichever node
    // paints the surface takes the material: the web box / iOS capsule group holds a
    // GlassPane (the buttons ride inside it), while the Android skin's bare row keeps
    // no material and each outlined M3 circle becomes its own puck. The node drops
    // its fill and outline under glass (the pane's material and rim carry them).
    const glass = isGlass(theme);
    const groupShape = skin.group(tokens, size, !!disabled);
    const groupFill = (StyleSheet.flatten(groupShape) as ViewStyle).backgroundColor;
    const groupSurfaced = groupFill != null && groupFill !== "transparent";
    const liquidActions = !groupSurfaced && isGlass(actionTheme);
    const disabledInk = liquidActions && disabled ? { opacity: 0.5 } : null;
    const groupStyle = groupSurfaced ? paneStyle(theme, groupShape) : groupShape;
    const groupPane = groupSurfaced ? <GlassPane {...entryMaterial.paneProps} shape={groupShape} /> : null;
    const buttonPane = (shape: ViewStyle, inactive: boolean) => (groupSurfaced ? null : <GlassPane layer="control" shape={shape} interactive={!inactive} />);

    // Collision-free ids so the group can name itself from the visible label and be
    // described by the description (unconditional hooks: the ids are cheap and always
    // available). The label (when present) is the group's programmatic name on BOTH
    // channels: accessibilityLabel (native) and aria-labelledby -> the label Text's
    // nativeID (web, which RNW forwards). Without a visible label, the group and
    // editable field both use the invisible "Number" name.
    const labelId = useId();
    const descId = useId();
    const accessibleName = label ?? "Number";
    const ariaLabelledby = label != null ? labelId : undefined;
    const ariaDescribedby = label != null && description != null ? descId : undefined;

    // Controlled when `value` is provided, self-managed otherwise, so a bare
    // <Stepper /> steps out of the box (the standard library contract).
    const [value, setValue] = useControllableState<number>(
      props.value,
      props.defaultValue ?? min,
      onChange,
    );

    const current = clamp(value, min, max);
    const atMin = disabled || current <= min;
    const atMax = disabled || current >= max;

    // Direct-entry draft. While the field is focused the user may type a transient
    // value (empty, "-", a partial number); we keep that raw text locally and only
    // coerce/clamp on each numeric change and on commit (blur), so the cursor never
    // jumps and a half-typed number is not clobbered. When not editing, the field
    // shows the controlled value.
    const [draft, setDraft] = useState<string | null>(null);
    const shown = draft != null ? draft : String(current);

    const emit = (next: number) => {
      const clamped = clamp(next, min, max);
      if (clamped !== current) setValue(clamped);
    };

    const decrement = () => {
      if (atMin) return;
      emit(addDecimal(current, -step));
    };
    const increment = () => {
      if (atMax) return;
      emit(addDecimal(current, step));
    };

    // Keyboard / Switch Control / VoiceOver / TalkBack "adjust value" gesture for the
    // container's `adjustable` role: route the assistive-tech increment/decrement to the
    // same step helpers (which already guard atMin/atMax). Without this the role
    // would over-promise an adjust affordance that does nothing.
    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      if (disabled) return;
      const name = event.nativeEvent.actionName;
      if (name === "increment") increment();
      else if (name === "decrement") decrement();
    };

    const accessibility = stepperAccessibility({
      min, max, current, disabled: !!disabled, required, onAccessibilityAction,
    });

    // RNW TextInput owns onKeyDown and forwards it through onKeyPress. Use that
    // public event on every runtime so the editable field keeps focus while
    // adjusting. Leave modified keys and composition to ordinary text editing.
    const onKeyPress = (event: TextInputKeyPressEvent) => {
      const keyEvent = event.nativeEvent as typeof event.nativeEvent & {
        isComposing?: boolean;
        keyCode?: number;
        ctrlKey?: boolean;
        metaKey?: boolean;
        altKey?: boolean;
        shiftKey?: boolean;
      };
      if (disabled || keyEvent.isComposing || keyEvent.keyCode === 229 ||
          keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey || keyEvent.shiftKey) return;
      const key = keyEvent.key;
      if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "Home" && key !== "End") return;
      event.preventDefault();
      // A previously typed draft must not hide this adjustment or recommit its
      // old value on blur. The same exact decimal helpers own button/key changes.
      setDraft(null);
      if (key === "ArrowUp") increment();
      else if (key === "ArrowDown") decrement();
      else emit(key === "Home" ? min : max);
    };

    // Parse on every keystroke: ignore non-numeric input, allow an empty/partial
    // transient draft, and emit the clamped number whenever the draft parses.
    const onChangeText = (raw: string) => {
      // Keep only characters that can form a (possibly negative/decimal) number.
      const cleaned = raw.replace(/[^0-9.-]/g, "");
      setDraft(cleaned);
      if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return; // transient
      const parsed = Number(cleaned);
      if (!Number.isNaN(parsed)) emit(parsed);
    };

    // Commit on blur: coerce an empty/partial draft to a real number (clamped),
    // then drop the draft so the field re-syncs to the controlled value.
    const commit = (_e?: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
      if (draft != null) {
        const parsed = Number(draft);
        const next = Number.isNaN(parsed) ? min : clamp(parsed, min, max);
        if (next !== current) setValue(next);
      }
      setDraft(null);
    };

    const glyph = skin.glyph(tokens, size, !!disabled);
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const hitSlop = skin.hitSlop ? skin.hitSlop(size) : undefined;

    // Each ± button is its own rounded surface (a circle on Android), so its bounded
    // android_ripple is clipped to those corners by a RippleClip parent (a transparent
    // passthrough on iOS/web; the corner radii are constant across pressed/disabled). See
    // src/style/ripple-clip.
    const MinusButton = (
      <RippleClip shape={cornerRadii(skin.button(tokens, size, "left", atMin, false))}>
        <Pressable
          onPress={decrement}
          disabled={atMin}
          accessibilityRole="button"
          accessibilityLabel="Decrease"
          accessibilityState={{ disabled: atMin }}
          aria-disabled={atMin}
          android_ripple={ripple}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            groupSurfaced ? skin.button(tokens, size, "left", atMin, pressed) : paneStyle(actionTheme, skin.button(tokens, size, "left", atMin, pressed)),
            !liquidActions && skin.pressedOpacity != null && pressed && !atMin ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {({ pressed }) => <>
            {buttonPane(skin.button(tokens, size, "left", atMin, false), atMin)}
            <View style={[disabledInk, liquidActions && skin.pressedOpacity != null && pressed && !atMin ? { opacity: skin.pressedOpacity } : null]}>
              <Icon minus decorative {...glyphColorProps(glyph.color, atMin)} size={glyph.size} />
            </View>
          </>}
        </Pressable>
      </RippleClip>
    );

    const PlusButton = (
      <RippleClip shape={cornerRadii(skin.button(tokens, size, "right", atMax, false))}>
        <Pressable
          onPress={increment}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel="Increase"
          accessibilityState={{ disabled: atMax }}
          aria-disabled={atMax}
          android_ripple={ripple}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            groupSurfaced ? skin.button(tokens, size, "right", atMax, pressed) : paneStyle(actionTheme, skin.button(tokens, size, "right", atMax, pressed)),
            !liquidActions && skin.pressedOpacity != null && pressed && !atMax ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {({ pressed }) => <>
            {buttonPane(skin.button(tokens, size, "right", atMax, false), atMax)}
            <View style={[disabledInk, liquidActions && skin.pressedOpacity != null && pressed && !atMax ? { opacity: skin.pressedOpacity } : null]}>
              <Icon plus decorative {...glyphColorProps(glyph.color, atMax)} size={glyph.size} />
            </View>
          </>}
        </Pressable>
      </RippleClip>
    );

    const Field = (
      <TextInput
        {...accessibility.field}
        ref={ref}
        value={shown}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onBlur={() => commit()}
        onEndEditing={commit}
        editable={!disabled}
        inputMode="numeric"
        keyboardType="number-pad"
        selectionColor={tokens.primary}
        accessibilityLabel={accessibleName}
        aria-label={accessibleName}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        // Required is surfaced programmatically (aria-required), matching Input;
        // omitted entirely when optional so no aria-required="false" is emitted.
        aria-required={required || undefined}
        style={[skin.field(tokens, size, !!disabled), FOCUS_RESET, glass ? PANE_SIBLING_INPUT : null, disabledInk]}
      />
    );

    const makeDivider = (key: string) =>
      skin.divider ? <View key={key} style={[skin.divider(tokens, !!disabled), { pointerEvents: "none" }]} /> : null;

    // The [ − | + ] pill is one piece; the field sits beside it (LEFT on iOS per HIG,
    // RIGHT-of-minus / inline on the others). The dividers sit between adjacent slots.
    const control = (
      <View
        testID={props.testID}
        {...accessibility.group}
        // The group names the three related controls without hiding interactive
        // descendants behind a web slider role. Native retains its adjustable
        // View, value and actions through the runtime metadata above.
        accessibilityLabel={accessibleName}
        aria-label={accessibleName}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            // With a label the outer wrapper carries the disabled dim (so the label
            // dims with the control, matching Input); bare, the group dims itself.
            opacity: label == null && disabled && !liquidActions ? 0.5 : 1,
          },
          label != null ? null : hug,
          // The style escape hatch rides the outer wrapper when a label is present
          // (as in Input); on the bare control it stays here to preserve its layout.
          label != null ? null : style,
        ]}
      >
        {skin.fieldOnLeft ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {Field}
            <View style={groupStyle}>
              {groupPane}
              {MinusButton}
              {makeDivider("d")}
              {PlusButton}
            </View>
          </View>
        ) : (
          <View style={groupStyle}>
            {groupPane}
            {MinusButton}
            {makeDivider("d1")}
            {Field}
            {makeDivider("d2")}
            {PlusButton}
          </View>
        )}
      </View>
    );

    // No label: return the bare control without an extra layout wrapper.
    if (label == null) return control;

    // With a label: a component-owned title (and optional muted description) ABOVE
    // the control, mirroring Input's above-field placement. The wrapper owns the
    // style escape hatch and the disabled dim so the label dims with the control.
    return (
      <View style={[{ gap: 6 }, hug, disabled && !liquidActions ? { opacity: 0.5 } : null, style]}>
        <Text nativeID={labelId} style={[skin.labelAbove(tokens, size), disabledInk]}>
          <LabelContent label={label} required={required} starColor={tokens.destructive} />
        </Text>
        {description != null ? (
          <Text nativeID={descId} style={[skin.description(tokens, size), disabledInk]}>
            {description}
          </Text>
        ) : null}
        {control}
      </View>
    );
  });
  Stepper.displayName = "Stepper";
  return Stepper;
}
