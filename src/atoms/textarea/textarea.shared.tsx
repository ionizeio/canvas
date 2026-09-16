import { useInputEscapeBridge } from "../../style/escape-layer.js";
import { forwardRef, useId, useState } from "react";
import { type TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from "react-native";
import { View, Text, TextInput, useTheme, useFillStyle, FloatingLabel, LabelContent, FOCUS_RESET, type MeasureProps, type SizingKey, type StyleProp, type TextStyle, type ViewStyle } from "../../style/index.js";
import { type TextEntryProps } from "../input/input.shared.js";
import { type TextareaSkin, type Size, sizeText, minHeight } from "./textarea.styles.js";

// A style bump keeping the above-field label spaced from its field (the 6px the
// Field/Form control stacks use), mirroring the single-line Input.
const LABEL_GAP: ViewStyle = { gap: 6 };

// The character-count line's own layout: end-aligned under the field, with a
// 4px gap from the control. The count line is part of the component's own
// anatomy (the component owns its layout + type), never a call-site shim.
const COUNT_ROW: ViewStyle = { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 };

// Read a numeric style value (the resolved min height), falling back when absent.
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

// The Android floating label aligns with the field's leading text edge (the M3
// multiline field's 12dp horizontal content padding).
const ANDROID_TEXTAREA_INSET = 12;

// react-native-web paints the browser's blue focus outline on a focused multiline
// <textarea>; real iOS/Android have no such outline. The shared FOCUS_RESET suppresses
// it so the skin's own focus cue (the bottom hairline thickening to the brand ring) is
// the only treatment, matching the sibling Input. It is web-only and a no-op natively.

// Shared Textarea shell. The structure (a multiline TextInput), the public
// boolean-prop API, the size precedence, the error/focus state resolution, the
// accessibility, the handlers, and the disabled dim live here once; a platform
// file supplies only its skin (fill, shape, border/underline, focus feedback)
// and calls createTextarea.

export interface TextareaProps extends TextEntryProps, MeasureProps {
  /** Controlled text value. Omit and use `defaultValue` for uncontrolled use. */
  value?: string;
  /** Fired with the next text value on each edit. */
  onChangeText?: (next: string) => void;
  /** Placeholder shown while the field is empty. */
  placeholder?: string;
  /**
   * The field's persistent label. Its placement is platform-adaptive: iOS and web
   * render it ABOVE the field; Android renders the Material 3 in-container FLOATING
   * label — a MULTILINE float pinned to the first text line at rest, floating to the
   * top once the field is focused or filled. The label names the field for a11y.
   */
  label?: string;
  /**
   * Marks the field as required: appends a destructive "*" to the label (hidden
   * from the accessible name) and sets aria-required on the field. Takes effect
   * only alongside `label`.
   */
  required?: boolean;
  /**
   * Visible rows the field sizes to. Sets the min height (rows * ~22px + 16px
   * padding); the field still grows with content past this floor.
   */
  rows?: number;
  /**
   * Show a live character-count line inside the field's own anatomy: an
   * end-aligned muted caption under the control reading "N / max" (just "N"
   * when no `maxLength` is set), where N is the current text length.
   *
   * When on, `maxLength` becomes a SOFT cap rather than a hard one: it is NOT
   * forwarded to the native TextInput (a hard cap silently drops the extra
   * keystroke, so the overage could never be seen), the user can type past it,
   * and once N exceeds `maxLength` the count turns destructive AND the field
   * enters its error state automatically (red border/underline). Leave
   * `showCount` off to keep `maxLength` as a hard input cap.
   */
  showCount?: boolean;
  // State (pick one; orthogonal to size).
  /** Error/validation state: a destructive cue. `invalid` is an alias. */
  error?: boolean;
  invalid?: boolean;
  // Size (pick one; default is the base text-sm field).
  small?: boolean;
  large?: boolean;
  /** Blocks editing and focus, and dims the field. */
  disabled?: boolean;
  /**
   * Borderless: drop the field's own border and radius so it sits flush inside a
   * framed container (e.g. a Card with a formatting toolbar above it).
   */
  flush?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: StyleProp<Omit<TextStyle, SizingKey>>;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: TextareaProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

/** Build a Textarea component from a platform skin. */
export function createTextarea(skin: TextareaSkin) {
  const Textarea = forwardRef<RNTextInput, TextareaProps>(function Textarea(props, ref) {
    const { value, onChangeText, placeholder, label, required, rows, disabled, flush, showCount, style } = props;
    const size = sizeOf(props);
    const [focused, setFocused] = useState(false);
    const { tokens } = useTheme();
    const onKeyPress = useInputEscapeBridge(props.onKeyPress);
    // FILL: the field takes the bounds its parent provides; a flush textarea sits
    // inside a framed container (a toolbar Card) whose frame IS the field edge.
    const widthCap = useFillStyle("Textarea", props);
    // One collision-free id linking the field to its label (aria-labelledby).
    const labelId = useId();

    // The current text, mirrored so the shell can float the Android label AND
    // measure the character count in BOTH modes. Seeded from value/defaultValue
    // so a prefilled field starts floated/counted; a controlled field trusts its
    // `value` prop, otherwise the wrapped onChangeText keeps the mirror in sync
    // (mirrors the single-line Input, which only needs the boolean).
    const [innerText, setInnerText] = useState(() => ((value ?? props.defaultValue) ?? "") + "");
    const currentText = value != null ? value : innerText;
    const populated = currentText.length > 0;
    const handleChangeText = (next: string) => {
      setInnerText(next);
      onChangeText?.(next);
    };

    // Character count. When `showCount` is on, `maxLength` is the SOFT cap: the
    // target shown in "N / max" and the threshold the count/field go destructive
    // past (see the maxLength note in `common`). Without a maxLength the line is
    // an informational "N" that never goes over.
    const count = currentText.length;
    const softLimit = showCount ? props.maxLength : undefined;
    const over = softLimit != null && count > softLimit;
    // The overage is a validation problem, so it drives the error cue too: the
    // caller's explicit error/invalid still wins, and passing the soft cap adds
    // the destructive border/underline on top.
    const isError = !!props.error || !!props.invalid || over;

    // Label placement: iOS/web render it ABOVE the field; the Android skin FLOATS
    // it inside the container (M3 multiline float, pinned to the top text line).
    // A flush textarea drops its own frame to sit inside a toolbar Card, so a
    // floating in-container label makes no sense there — it always renders above.
    const hasLabel = label != null && label !== "";
    const floating = hasLabel && skin.floatingLabel && !flush;
    const above = hasLabel && !floating;

    // Accessible name + label link, mirroring the single-line Input: the label
    // names the field on BOTH channels (accessibilityLabel/aria-label and
    // aria-labelledby -> the label Text's nativeID). A caller override still wins.
    const accessibleName = hasLabel ? label : undefined;
    const ariaLabelledby = hasLabel ? labelId : undefined;

    // Surface the validation problem programmatically, not just as a red border
    // (the border alone fails WCAG 1.4.1 / 4.1.2). `aria-invalid` is the
    // cross-platform alias react-native-web forwards to the DOM textarea as
    // aria-invalid="true" so web screen readers announce the field as invalid;
    // it mirrors the sibling Input exactly. Undefined when valid so the attribute
    // is omitted rather than emitting aria-invalid="false". Spread (not direct JSX
    // attributes) because these aliases are outside RN's typed prop set.
    const a11y = {
      "aria-invalid": isError || undefined,
      "aria-required": required || undefined,
      accessibilityLabel: accessibleName,
      "aria-label": accessibleName,
      "aria-labelledby": ariaLabelledby,
    };

    // Everything the multiline field forwards, shared by all three label paths.
    const common = {
      value,
      onChangeText: handleChangeText,
      placeholderTextColor: tokens["muted-foreground"],
      selectionColor: tokens.primary, // brand cursor / selection on every platform
      editable: !disabled,
      // Text-entry behavior passthrough (the curated TextEntryProps slice).
      defaultValue: props.defaultValue,
      secureTextEntry: props.secureTextEntry,
      keyboardType: props.keyboardType,
      inputMode: props.inputMode,
      autoCapitalize: props.autoCapitalize,
      autoComplete: props.autoComplete,
      autoCorrect: props.autoCorrect,
      autoFocus: props.autoFocus,
      // Soft cap under `showCount`: withhold maxLength from the native TextInput
      // so the user can type PAST the limit and the overage becomes visible (the
      // count + field turn destructive). Off, maxLength is the usual hard cap.
      maxLength: showCount ? undefined : props.maxLength,
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
      ...a11y,
    };

    // The base field surface, shared by every path (width/style/disabled dim move
    // to the wrapper in the labeled paths so the label dims with the field). Typed
    // as an array (not StyleProp) so the floating path can spread it with the reserve.
    const fieldStyle: StyleProp<TextStyle>[] = [
      skin.field(tokens, { error: isError, focused }),
      skin.text ? skin.text(size) : sizeText(size),
      minHeight(rows),
      // Flush: strip the field's own border + radius so it sits flush inside a
      // framed container (a toolbar Card). Zero every edge so it works whether
      // the skin draws a full border or a bottom underline.
      flush
        ? { borderWidth: 0, borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderRadius: 0 }
        : null,
      FOCUS_RESET,
    ];
    const disabledDim = disabled ? { opacity: 0.5 } : null;

    // The live count line, owned by the component. End-aligned, muted, turning
    // destructive once the count passes the soft cap; "N / max" when a maxLength
    // gives a cap, a bare "N" otherwise. aria-live announces edits to a screen
    // reader as the value changes.
    const countNode = showCount ? (
      <View style={COUNT_ROW}>
        <Text style={skin.count(tokens, over)} accessibilityLiveRegion="polite" aria-live="polite">
          {softLimit != null ? `${count} / ${softLimit}` : `${count}`}
        </Text>
      </View>
    ) : null;

    // Android M3 floating label: the field reserves top space for the floated
    // label, the animated label overlays the top text line, and the placeholder is
    // gated to focus (at rest the label itself is the placeholder). The wrapper
    // carries width/style and the disabled dim so the label dims with the field.
    if (floating) {
      return (
        <View style={[{ position: "relative" }, disabledDim, widthCap, style]}>
          <TextInput
            ref={ref}
            multiline
            textAlignVertical="top"
            style={[...fieldStyle, skin.labelReserve!(size)]}
            placeholder={focused ? placeholder : undefined}
            {...common}
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
            height={asNum(minHeight(rows).minHeight, 80)}
            inset={ANDROID_TEXTAREA_INSET}
            multiline
          />
          {countNode}
        </View>
      );
    }

    // iOS / web: the label sits above the field. The wrapper carries width/style
    // and the disabled dim; the field fills it (its skin sets width:100%). The
    // above-label type is the skin's `labelAbove` on iOS/web; the Android skin
    // (no `labelAbove`, since it normally floats) falls back to its resting label
    // type as a foreground title, so the flush+label edge case still reads.
    if (above) {
      const aboveLabelStyle: TextStyle = skin.labelAbove
        ? skin.labelAbove(tokens, size)
        : { ...(skin.labelRest ? skin.labelRest(tokens, size) : sizeText(size)), fontWeight: "500", color: tokens.foreground };
      return (
        <View style={[LABEL_GAP, disabledDim, widthCap, style]}>
          <Text nativeID={labelId} style={aboveLabelStyle}>
            <LabelContent label={label!} required={required} starColor={tokens.destructive} />
          </Text>
          <TextInput ref={ref} multiline textAlignVertical="top" placeholder={placeholder} style={fieldStyle} {...common} />
          {countNode}
        </View>
      );
    }

    // No label but a count line: wrap the field so the count sits under it. The
    // wrapper carries width/style and the disabled dim (so the count dims with
    // the field); the field fills it via its skin's width:100%.
    if (countNode) {
      return (
        <View style={[disabledDim, widthCap, style]}>
          <TextInput ref={ref} multiline textAlignVertical="top" placeholder={placeholder} style={fieldStyle} {...common} />
          {countNode}
        </View>
      );
    }

    // No label: the original bare field, unchanged (byte-identical root).
    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        placeholder={placeholder}
        style={[...fieldStyle, disabledDim, widthCap, style]}
        {...common}
      />
    );
  });
  Textarea.displayName = "Textarea";
  return Textarea;
}
