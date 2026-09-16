import { useInputEscapeBridge } from "../../style/escape-layer.js";
import { forwardRef, useId, useRef, useState } from "react";
import {
  type GestureResponderEvent,
  type TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import { View, Pressable, Text, TextInput, useTheme, useFillStyle, FloatingLabel, LabelContent, FOCUS_RESET, type ColorTokens, type LayoutStyle, type MeasureProps, type StyleProp, type ViewStyle, type TextStyle } from "../../style/index.js";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { Icon, type IconName } from "../icon/icon.js";
import { type InputSkin, type Size } from "./input.styles.js";

// Shared Input shell. The structure (bare field vs. grouped addon layout, the
// prefix/suffix boxes, overlaid icons, the optional action button), the
// public boolean-prop API, the size precedence, the border-color precedence
// (error > focus > default), accessibility, refs, and handlers all live here
// once. A platform file supplies only its skin (field shape, fill, border,
// height, the Android active-indicator underline, press feedback) and calls
// createInput.

// The overlaid leading/trailing glyph is named by the scalar `icon` string (any
// Canvas glyph, typed as IconName so a typo is a type error) and rendered through
// the Icon atom's flat boolean prop, so the playground stays serializable (a name
// string, not a React element).

// The trailing action glyphs: the password eye (eye-off while the value is masked,
// eye once revealed, the iOS reference's eye.slash) and the clear button (the
// reference's xmark.circle.fill). Hit slop widens each glyph to a 44pt target.
const ACTION_HIT_SLOP = 12;
// The gap between two trailing glyphs when both the clear button and the eye show.
const ACTION_GAP = 8;

// react-native-web paints a default focus outline on the field; in the grouped
// (addon) layout that ring is clipped by the rounded, overflow-hidden container
// and reads as half-baked, so the shared FOCUS_RESET suppresses it there and the
// group shows focus on its shared border instead. No-op on native (no CSS outline).

/**
 * The curated slice of React Native's TextInput behavior forwarded by Input and
 * Textarea. Styling stays semantic (the kit's boolean props); BEHAVIOR — what
 * keyboard appears, how text is captured, focus/submit events — belongs to the
 * consumer, and hiding it made real forms (login, search, OTP) impossible to
 * build. Typed via Pick so the props track react-native's own definitions.
 */
export type TextEntryProps = Pick<
  RNTextInputProps,
  | "defaultValue"
  | "secureTextEntry"
  | "keyboardType"
  | "inputMode"
  | "autoCapitalize"
  | "autoComplete"
  | "autoCorrect"
  | "autoFocus"
  | "maxLength"
  | "returnKeyType"
  | "textContentType"
  | "onSubmitEditing"
  | "onFocus"
  | "onBlur"
  | "onKeyPress"
  | "testID"
>;

export interface InputProps extends TextEntryProps, MeasureProps {
  /** Current text value (controlled). Omit and use `defaultValue` for uncontrolled use. */
  value?: string;
  /** Called with the new text on each keystroke. */
  onChangeText?: (text: string) => void;
  /** Placeholder shown while the field is empty. */
  placeholder?: string;
  /**
   * The field's persistent label. Its placement is platform-adaptive: iOS and
   * web render it ABOVE the field (the static title the Field/Form composers
   * produce today); Android renders the Material 3 in-container FLOATING label
   * (centered like a placeholder at rest, floating to the top once the field is
   * focused or filled). The label is the field's programmatic name (wired via
   * both accessibilityLabel and aria-labelledby), so a placeholder is no longer
   * needed for the accessible name.
   */
  label?: string;
  /**
   * Marks the field as required: appends a destructive "*" to the label (hidden
   * from the accessible name) and sets aria-required on the control. Takes effect
   * only alongside `label`.
   */
  required?: boolean;
  // State (orthogonal). `error` (alias `invalid`) flags a validation problem.
  error?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Read-only: shows the value but blocks editing without the dimmed look. */
  readOnly?: boolean;
  // Size (pick one; default is the medium field).
  small?: boolean;
  large?: boolean;
  // Width: a field is FILL (src/style/sizing.ts). It takes the bounds its parent
  // layout container provides, a Column, a Row span, a Container step, and never
  // carries a width of its own.
  // Multi-line entry is a separate concern: use the dedicated `Textarea` atom.

  // Addons. Passing any of these switches the field to the grouped layout: a
  // single control where a leading prefix and/or trailing suffix share one outer
  // border with the field (squared joined edges, 1px inner separators), so they
  // read as one piece rather than detached. Addons are plain strings, so no icon
  // library is required at this layer.
  /** Leading addon content (e.g. "https://", "$", an icon glyph). */
  prefix?: string;
  /** Trailing addon content (e.g. "@canvas.dev", "USD", "Copy"). */
  suffix?: string;
  // Overlaid glyph mode. Unlike prefix/suffix (a bordered addon box), these
  // float a real Lucide glyph INSIDE the field with no separator, and pad the
  // text away from it (pl-9 / pr-9). `icon` names which glyph (see ICON_BOOL).
  /** Render `icon` as a passive glyph inside the left of the field. */
  leadingIcon?: boolean;
  /** Render `icon` as a passive glyph inside the right of the field. */
  trailingIcon?: boolean;
  /** Glyph name for leadingIcon/trailingIcon: any Canvas glyph (e.g. "search", "mail", "lock", "phone", "calendar", "creditCard"). */
  icon?: IconName;
  /** Render the suffix as a pressable action button rather than a passive label. */
  action?: boolean;
  /** Called when the action suffix is pressed (action only). */
  onActionPress?: (event: GestureResponderEvent) => void;
  /**
   * A trailing eye button that reveals and re-masks a `secureTextEntry` value (the
   * password field's show/hide toggle). The field starts masked; the button is
   * announced as "Show password" / "Hide password". Takes effect only with
   * `secureTextEntry`.
   */
  passwordToggle?: boolean;
  /**
   * A trailing clear button (a circled x) that empties the field, shown while the
   * field holds text (the search field's clear affordance). Works in both the
   * controlled and the uncontrolled mode: it clears the native field and reports
   * "" through `onChangeText`.
   */
  clearable?: boolean;

  /**
   * Accessible name for the field when there is no programmatically-associated
   * visible label. Maps to accessibilityLabel + the aria-label web alias on the
   * underlying TextInput, so a Form/Field control is announced with its name.
   */
  accessibilityLabel?: string;
  /**
   * ID of the visible label element that names this field (its `nativeID`).
   * react-native-web forwards aria-labelledby to the DOM input; prefer this over
   * accessibilityLabel when a visible <Text> label is present so the label and
   * field are programmatically linked.
   */
  "aria-labelledby"?: string;
  /**
   * ID of the helper/error text that describes this field (its `nativeID`), so a
   * screen reader reads the hint after the field name.
   */
  "aria-describedby"?: string;

  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: InputProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// The grouped layout's field area: the flexible cell between the addon boxes that
// holds the TextInput and its overlaid icons. The icon overlays anchor to THIS
// wrapper (the container's content box) rather than to the bordered container:
// the Android active indicator swaps border for compensating padding on focus
// (1dp+1dp -> 2dp+0dp), and an overlay stretched across the container would span
// that shifting band and re-center its icon half the change lower/higher — a
// visible one-pixel hop on focus. The content box is constant by design (see
// activeIndicator), so overlays centered on it never move.
// A row + alignItems stretch (never height:"100%") sizes the input: a percentage
// height against this auto-sized wrapper resolves unpredictably on Fabric Android
// (the field ballooned to the available screen height).
const GROUP_FIELD_AREA: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "stretch",
};

// Read a numeric style value (the bare field height), falling back when absent.
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

/** Build an Input component from a platform skin. */
export function createInput(skin: InputSkin) {
  const Input = forwardRef<RNTextInput, InputProps>(function Input(props, ref) {
    const {
      value,
      onChangeText,
      placeholder,
      label,
      required,
      disabled,
      readOnly,
      prefix,
      suffix,
      leadingIcon,
      trailingIcon,
      icon,
      action,
      onActionPress,
      passwordToggle,
      clearable,
      style,
    } = props;
    const isError = !!(props.error || props.invalid);
    const size = sizeOf(props);
    const [focused, setFocused] = useState(false);
    // The password toggle's own state: masked until the eye is pressed.
    const [revealed, setRevealed] = useState(false);
    const { tokens } = useTheme();
    const onKeyPress = useInputEscapeBridge(props.onKeyPress);
    const widthCap = useFillStyle("Input", props);
    // The clear button empties the NATIVE field too (an uncontrolled field keeps its
    // own text), so the shell holds a ref of its own beside the forwarded one.
    const fieldRef = useRef<RNTextInput>(null);
    const hostRef = useComposedRefs(fieldRef, ref);
    // One collision-free id for the label so the field can name itself via
    // aria-labelledby (unconditional hook: the id is cheap and always available).
    const labelId = useId();

    // Whether the field currently holds text — the Android floating label floats
    // when the field is focused OR populated. Seeded from value/defaultValue so a
    // prefilled field starts floated; for a controlled field the value is the
    // source of truth, otherwise the wrapped onChangeText keeps it in sync.
    const [hasText, setHasText] = useState(() => (((value ?? props.defaultValue) ?? "") + "").length > 0);
    const populated = value != null ? value.length > 0 : hasText;
    const handleChangeText = (next: string) => {
      setHasText(next.length > 0);
      onChangeText?.(next);
    };

    // Accessible name + label link. The label (when present) is the field's
    // programmatic name on BOTH channels: accessibilityLabel/aria-label (RN + the
    // web alias) and aria-labelledby -> the label Text's nativeID. An explicit
    // accessibilityLabel / aria-labelledby from the caller still wins.
    const accessibleName = props.accessibilityLabel ?? label;
    const ariaLabelledby = props["aria-labelledby"] ?? (label != null ? labelId : undefined);

    // Border-color precedence: error > focus > default input border. Shared by
    // both layouts; in the grouped layout it lives on the outer border so prefix
    // + field + suffix light up together as one control. The skin decides how
    // that color is used (a full border on iOS/web, the bottom active indicator
    // on Android).
    const borderColor: keyof ColorTokens = isError ? "destructive" : focused ? "ring" : "input";
    const text = skin.text(tokens, size);
    const state = { focused, error: isError };
    const iconName = icon;
    // The trailing action glyphs: the eye needs a masked value to toggle; the clear
    // button shows only while there is text to clear (and the field is editable).
    const hasEye = !!passwordToggle && !!props.secureTextEntry;
    const hasClear = !!clearable && populated && !disabled && !readOnly;
    const hasAddons = prefix != null || suffix != null || !!leadingIcon || !!trailingIcon || !!action || hasEye || !!clearable;
    const labelGap: ViewStyle = { gap: skin.labelGap };

    const common = {
      value,
      onChangeText: handleChangeText,
      placeholder,
      placeholderTextColor: tokens["muted-foreground"],
      editable: !disabled && !readOnly,
      selectionColor: tokens.primary, // brand cursor / selection on every platform
      // Text-entry behavior passthrough (the curated TextEntryProps slice).
      defaultValue: props.defaultValue,
      // The eye reveals the masked value; without the toggle the prop passes through.
      secureTextEntry: hasEye ? !revealed : props.secureTextEntry,
      keyboardType: props.keyboardType,
      inputMode: props.inputMode,
      autoCapitalize: props.autoCapitalize,
      autoComplete: props.autoComplete,
      autoCorrect: props.autoCorrect,
      autoFocus: props.autoFocus,
      maxLength: props.maxLength,
      returnKeyType: props.returnKeyType,
      textContentType: props.textContentType,
      onSubmitEditing: props.onSubmitEditing,
      onKeyPress,
      testID: props.testID,
      // Internal focus styling chains with (never replaces) the consumer's handlers.
      onFocus: (e: Parameters<NonNullable<RNTextInputProps["onFocus"]>>[0]) => {
        setFocused(true);
        props.onFocus?.(e);
      },
      onBlur: (e: Parameters<NonNullable<RNTextInputProps["onBlur"]>>[0]) => {
        setFocused(false);
        props.onBlur?.(e);
      },
      // Surface the validation problem programmatically, not just as a red border
      // (WCAG 1.4.1 / 4.1.2). `aria-invalid` is the cross-platform alias RNW
      // forwards to the DOM input as aria-invalid="true" so web screen readers
      // announce the field as invalid. Undefined when valid so the attribute is
      // omitted entirely rather than emitting aria-invalid="false".
      "aria-invalid": isError || undefined,
      // Required is surfaced programmatically (aria-required), not just via the "*"
      // glyph, and omitted entirely when the field is optional.
      "aria-required": required || undefined,
      // Accessible name + descriptions, forwarded to the TextInput so a Form/Field
      // control is announced with its label and helper/error text. aria-label is
      // the web alias for accessibilityLabel; aria-labelledby/aria-describedby link
      // to a visible label / helper Text by nativeID (RNW forwards them to the DOM).
      // When `label` is set the field names itself (accessibleName / ariaLabelledby).
      accessibilityLabel: accessibleName,
      "aria-label": accessibleName,
      "aria-labelledby": ariaLabelledby,
      "aria-describedby": props["aria-describedby"],
    };

    // Label placement: iOS/web render it ABOVE the field; the Android skin floats
    // it inside the container (M3). Addons force the above layout everywhere (the
    // floating label can't share the container with a prefix/suffix box); the
    // Field/Form composers never pass addons, so this is only an edge case.
    const floating = label != null && skin.floatingLabel && !hasAddons;
    const above = label != null && !floating;
    // The above-field label type: the skin's `labelAbove` on iOS/web; on the
    // Android skin (which has none) fall back to its resting label type as a
    // foreground title so the grouped fallback still reads.
    const aboveLabelStyle: TextStyle = skin.labelAbove
      ? skin.labelAbove(tokens, size)
      : { ...(skin.labelRest ? skin.labelRest(tokens, size) : text), fontWeight: "500", color: tokens.foreground };
    const aboveLabel = above ? (
      <Text nativeID={labelId} style={aboveLabelStyle}>
        <LabelContent label={label!} required={required} starColor={tokens.destructive} />
      </Text>
    ) : null;

    // Bare field: no addons.
    if (!hasAddons) {
      // Suppress the browser's default focus outline on web (RN Web draws it on the
      // <input>/<textarea>). Every skin paints its own focus affordance (web: border
      // -> ring, iOS: hairline, Android: bottom indicator), so the outline is
      // redundant and, over the filled Android skin, reads as a blue rectangle on
      // top of the indicator. No-op on native; matches the grouped path and the
      // Autocomplete/Textarea/Stepper shells.
      const bareStyle = [skin.bareField(tokens, borderColor, focused, isError), skin.bareBox(size), text, FOCUS_RESET];
      const disabledDim = disabled ? { opacity: skin.disabledOpacity } : null;

      // Android M3 floating label: the field reserves top space for the floated
      // label, the animated label overlays it, and the placeholder is gated to the
      // focused state (at rest the label itself is the placeholder). The wrapper
      // (not the field) carries the width cap, the style escape hatch, and the
      // disabled dim so the label dims with the field.
      if (floating) {
        return (
          <View style={[{ position: "relative" }, disabledDim, widthCap, style]}>
            <TextInput
              ref={hostRef}
              style={[...bareStyle, skin.labelReserve!(size)]}
              textAlignVertical="center"
              {...common}
              placeholder={focused ? placeholder : undefined}
            />
            <FloatingLabel
              styles={skin}
              size={size}
              tokens={tokens}
              label={label!}
              required={required}
              labelId={labelId}
              focused={focused}
              populated={populated}
              isError={isError}
              height={asNum(skin.bareBox(size).height, 56)}
            />
          </View>
        );
      }

      // iOS / web: the label sits above the field. The wrapper carries the width
      // cap, style, and disabled dim; the field fills it (its skin sets width:100%).
      if (above) {
        return (
          <View style={[labelGap, disabledDim, widthCap, style]}>
            {aboveLabel}
            <TextInput ref={hostRef} style={bareStyle} textAlignVertical="center" {...common} />
          </View>
        );
      }

      // No label: the original bare field, unchanged (byte-identical root).
      return (
        <TextInput
          ref={hostRef}
          style={[...bareStyle, disabledDim, widthCap, style]}
          textAlignVertical="center"
          {...common}
        />
      );
    }

    // Grouped field: prefix/suffix addons, overlaid icons, optional action button.
    // The whole group shares one border, so it owns the focus state and the inner
    // field's default outline is suppressed (see FOCUS_RESET). When a label is
    // present the floating label can't share the container with the addon boxes, so
    // the label falls back to the above layout: the wrapper owns width/style/dim and
    // the group container drops them.
    // minHeight (not addon-box heights) owns the row height: the addon boxes and
    // the field area stretch to it, so an icon-only group is as tall as the bare
    // field, and the total stays groupedHeight — the indicator/border band lives
    // INSIDE it rather than inflating past it.
    const height = skin.groupedHeight(size);
    // How many glyphs share the trailing gutter (clear, eye, a passive trailing icon).
    const trailingGlyphs = (hasClear ? 1 : 0) + (hasEye ? 1 : 0) + (trailingIcon && iconName != null ? 1 : 0);
    // Clear: empty the native field (the uncontrolled case keeps its own text), then
    // report the empty value so a controlled parent and the populated flag follow.
    const clearField = () => {
      fieldRef.current?.clear();
      handleChangeText("");
      fieldRef.current?.focus();
    };
    const groupedField = (
      <View
        style={[
          skin.groupContainer(tokens, borderColor, focused, isError),
          { minHeight: height },
          above ? null : disabled ? { opacity: skin.disabledOpacity } : null,
          above ? null : widthCap,
          above ? null : style,
        ]}
      >
        {prefix != null ? (
          <View style={skin.addonBox(tokens, "left", state)}>
            <Text style={[skin.addonText(tokens), text]}>{prefix}</Text>
          </View>
        ) : null}

        <View style={GROUP_FIELD_AREA}>
          {leadingIcon && iconName != null ? (
            <View style={[skin.iconOverlay("left"), { pointerEvents: "none" }]}>
              <Icon {...{ [iconName]: true }} color={skin.iconColor(tokens, { ...state, action: false })} size={skin.iconSize} decorative />
            </View>
          ) : null}

          <TextInput
            ref={hostRef}
            style={[
              skin.groupField(tokens, { leadingIcon: !!leadingIcon, trailingIcon: trailingGlyphs > 0, hasPrefix: prefix != null, hasSuffix: suffix != null }),
              // A second (or third) trailing glyph widens the trailing gutter by a glyph + gap each.
              trailingGlyphs > 1 ? { paddingEnd: asNum(skin.groupField(tokens, { leadingIcon: false, trailingIcon: true, hasPrefix: false, hasSuffix: false }).paddingEnd, 0) + (trailingGlyphs - 1) * (skin.iconSize + ACTION_GAP) } : null,
              text,
              FOCUS_RESET,
            ]}
            textAlignVertical="center"
            {...common}
          />

          {trailingGlyphs > 0 ? (
            <View style={[skin.iconOverlay("right"), { flexDirection: "row", alignItems: "center", gap: ACTION_GAP }]} pointerEvents="box-none">
              {hasClear ? (
                <Pressable
                  onPress={clearField}
                  hitSlop={ACTION_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Clear text"
                  android_ripple={skin.ripple ? { ...skin.ripple(tokens), borderless: true } : undefined}
                  style={({ pressed }) => (skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null)}
                >
                  <Icon circleX color={skin.iconColor(tokens, { ...state, action: true })} size={skin.iconSize} decorative />
                </Pressable>
              ) : null}
              {hasEye ? (
                <Pressable
                  onPress={() => setRevealed((r) => !r)}
                  hitSlop={ACTION_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={revealed ? "Hide password" : "Show password"}
                  accessibilityState={{ selected: revealed }}
                  disabled={disabled}
                  android_ripple={skin.ripple ? { ...skin.ripple(tokens), borderless: true } : undefined}
                  style={({ pressed }) => (skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null)}
                >
                  <Icon {...(revealed ? { eye: true } : { eyeOff: true })} color={skin.iconColor(tokens, { ...state, action: true })} size={skin.iconSize} decorative />
                </Pressable>
              ) : null}
              {trailingIcon && iconName != null ? (
                <View pointerEvents="none">
                  <Icon {...{ [iconName]: true }} color={skin.iconColor(tokens, { ...state, action: false })} size={skin.iconSize} decorative />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {suffix != null ? (
          action ? (
            <Pressable
              style={({ pressed }) => [
                skin.addonBox(tokens, "right", state),
                skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              ]}
              onPress={onActionPress}
              disabled={disabled}
              android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
              accessibilityRole="button"
            >
              <Text style={[skin.actionText(tokens), text]}>{suffix}</Text>
            </Pressable>
          ) : (
            <View style={skin.addonBox(tokens, "right", state)}>
              <Text style={[skin.addonText(tokens), text]}>{suffix}</Text>
            </View>
          )
        ) : null}
      </View>
    );

    // Label + addons: render the label above the grouped control (documented
    // fallback). The wrapper carries width/style/dim; the group drops them above.
    if (above) {
      return (
        <View style={[labelGap, disabled ? { opacity: skin.disabledOpacity } : null, widthCap, style]}>
          {aboveLabel}
          {groupedField}
        </View>
      );
    }
    return groupedField;
  });
  Input.displayName = "Input";
  return Input;
}
