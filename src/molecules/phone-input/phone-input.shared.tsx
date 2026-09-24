import { useTextEntryMaterial } from "../../style/text-entry-material.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { type Role, type TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from "react-native";
import {
  View,
  Pressable,
  Text,
  TextInput,
  useControllableState,
  useFillStyle,
  AnchoredOverlay,
  useMeasuredWidth,
  LabelContent,
  RippleClip,
  cornerRadii,
  FOCUS_RESET,
  type ColorTokens,
  type LayoutStyle,
  type MeasureProps,
  type ViewStyle,
  GlassPane,
  paneStyle,
  isGlass,
  withInnerFill,
  alpha,
  type TextStyle,
} from "../../style/index.js";
import { OverlayScrollView } from "../../style/overlay-scroll.js";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { root, rootLifted, panelAnchor } from "../../atoms/select/select.styles.js";
import { OptionRow } from "../../atoms/select/select.shared.js";
import { Icon } from "../../atoms/icon/icon.js";
import { type TextEntryProps } from "../../atoms/input/input.shared.js";
import { PHONE_COUNTRIES, flagOf, type PhoneCountry } from "./countries.js";
import { type PhoneInputSkin, type Size } from "./phone-input.styles.js";

// React Native's Role union omits the valid ARIA "listbox" role, so the country-list
// container casts it. The value is correct on both web (DOM role) and native.
const LISTBOX = "listbox" as Role;

// Shared PhoneInput shell. A phone number field: the Input's grouped box with a
// COUNTRY segment at its start (the chosen country's flag and a caret, which open a
// list of countries) and that country's dial code inline before the number. The
// structure, the controlled/uncontrolled country and number, the open state, focus,
// the label, accessibility, refs and handlers live here once; a platform file
// supplies its skin (which references the platform's Input and Select skins for the
// box and the menu) and calls createPhoneInput.
//
// The country list renders through AnchoredOverlay, like Select's option list: with
// an OverlayProvider it portals over the page below the box; without one it falls
// back to an inline absolute card. It asks for the DENSE layer, an option list being a
// card of rows the page must not show through, and its rows are Select's own
// (OptionRow), so their fills are inner fills on that material under glass.

/** The subset of the Input's text-entry passthrough that makes sense for a phone number. */
export type PhoneEntryProps = Pick<
  TextEntryProps,
  "defaultValue" | "autoFocus" | "maxLength" | "returnKeyType" | "onSubmitEditing" | "onFocus" | "onBlur" | "onKeyPress" | "testID"
>;

export interface PhoneInputProps extends PhoneEntryProps, MeasureProps {
  /** The national number typed so far (controlled). Omit and use `defaultValue` for uncontrolled use. */
  value?: string;
  /** Called with the new number on each keystroke. */
  onChangeText?: (text: string) => void;
  /**
   * The countries the segment offers, in the order shown. Defaults to the kit's
   * curated `PHONE_COUNTRIES` list; pass a full, localized, or reordered list.
   */
  countries?: readonly PhoneCountry[];
  /** The selected country's ISO alpha-2 code (controlled). Omit and use `defaultCountry`. */
  country?: string;
  /** Initial country code for uncontrolled use. Defaults to "US" when the list has it, else the first row. */
  defaultCountry?: string;
  /** Called with the chosen country's code when a row is picked (both modes). */
  onCountryChange?: (code: string) => void;
  /** Placeholder shown while the number is empty. */
  placeholder?: string;
  /**
   * The field's persistent label, rendered above the box on every platform (a
   * grouped field never floats its label). It is the number field's programmatic
   * name, and Field delegates its label into it.
   */
  label?: string;
  /** Marks the field as required: a destructive "*" after the label and aria-required. */
  required?: boolean;
  // State (orthogonal). `error` (alias `invalid`) flags a validation problem.
  error?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Read-only: shows the number but blocks editing and the country list. */
  readOnly?: boolean;
  // Size (pick one; default is the medium field).
  small?: boolean;
  large?: boolean;
  /** Accessible name for the number field when there is no `label`. */
  accessibilityLabel?: string;
  /** ID of the helper/error text that describes the field (its `nativeID`). */
  "aria-describedby"?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: PhoneInputProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

// The flexible cell between the country segment and the box's end: the dial code
// and the number, stretched to the row (see input.shared.tsx GROUP_FIELD_AREA).
const NUMBER_AREA: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "stretch",
};

// The list is a scrollport inside the panel's maxHeight cap (see select.shared.tsx).
const optionScroll: ViewStyle = { flexShrink: 1 };

/** Build a PhoneInput component from a platform skin. */
export function createPhoneInput(skin: PhoneInputSkin) {
  const PhoneInput = forwardRef<RNTextInput, PhoneInputProps>(function PhoneInput(props, ref) {
    const {
      value,
      onChangeText,
      countries = PHONE_COUNTRIES,
      onCountryChange,
      placeholder,
      label,
      required,
      disabled,
      readOnly,
      style,
    } = props;
    const isError = !!(props.error || props.invalid);
    const size = sizeOf(props);
    const entryMaterial = useTextEntryMaterial(!!skin.field.liquid);
    const { theme } = entryMaterial;
    const { tokens } = theme;
    // GlassPane paints behind the country segment and editor. Clear web fields
    // paint their active/error outline in the foreground, outside the lens's
    // sampled backdrop. Native fields retain the original border owner. The box
    // keeps only its STATE border (focus, error) over it, an errored box tints the
    // pane, and the country segment's `muted` fill becomes an ink tint.
    const glass = isGlass(theme);
    const widthCap = useFillStyle("PhoneInput", props);
    const labelId = useId();
    const listId = `${labelId}-countries`;
    const field = skin.field;

    // The number: controlled when `value` is given, self-managed otherwise.
    const [number, setNumber] = useControllableState<string>(value, props.defaultValue ?? "", onChangeText);
    // The country: controlled when `country` is given; otherwise the reference's
    // default (US) when the list carries it, else the first row.
    const initialCode = props.defaultCountry ?? (countries.some((c) => c.code === "US") ? "US" : countries[0]?.code ?? "");
    const [code, setCode] = useControllableState<string>(props.country, initialCode, onCountryChange);
    const selected = countries.find((c) => c.code === code) ?? countries[0];
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const editable = !disabled && !readOnly;
    const active = focused || open;

    // Border-colour precedence (error > active > rest), shared with Input: the skin
    // reads the token key for the box, and the state for the segment's divider.
    const borderColor: keyof ColorTokens = isError ? "destructive" : active ? "ring" : "input";
    const state = { focused: active, error: isError };
    const text = field.text(tokens, size);
    // The Select skin names its middle size "default" where the Input names it "base".
    const menuSize = size === "base" ? "default" : size;

    // The number field's own ref beside the forwarded one, so picking a country can
    // hand focus back to the number.
    const numberRef = useRef<RNTextInput>(null);
    const hostRef = useComposedRefs(numberRef, ref);
    // The whole box anchors the list (the trigger's measured width is its minimum).
    const boxRef = useRef<View>(null);
    const { width: boxWidth, onLayout: onBoxLayout } = useMeasuredWidth();

    const close = () => setOpen(false);
    // A field that becomes disabled or read-only while its country list is open
    // closes the list: the rows go inert with the field, never after a pick.
    useEffect(() => {
      if (!editable) setOpen(false);
    }, [editable]);
    const escapeScope = useEscapeLayer(open, close);
    const pick = (next: PhoneCountry) => {
      setCode(next.code);
      close();
      numberRef.current?.focus();
    };

    const accessibleName = props.accessibilityLabel ?? label;
    const segmentName = selected ? `Country, ${selected.name} ${selected.dialCode}` : "Country";
    const ripple = field.ripple ? field.ripple(tokens) : undefined;

    const boxShape = field.groupContainer(tokens, borderColor, active, isError);
    // A disabled box takes its Input skin's disabled look where the skin draws one (the web's
    // Dark Factory look: the box on its frame, the country segment on its addon so the focus
    // ring stays on the frame, the number in its ink, no material); otherwise the whole field
    // dims (below).
    const disabledLook = disabled && field.disabledLook ? field.disabledLook(tokens, active) : null;
    const glassBox: ViewStyle | null = glass && !disabledLook ? { backgroundColor: "transparent", borderColor: (active || isError) && !entryMaterial.foregroundStateBorder ? tokens[borderColor] : "transparent" } : null;
    const box = (
      <View
        ref={boxRef}
        onLayout={onBoxLayout}
        style={[disabledLook ? [boxShape, disabledLook.frame] : paneStyle(theme, boxShape, active || isError), { minHeight: field.groupedHeight(size) }, glassBox]}
      >
        {disabledLook ? null : <GlassPane {...entryMaterial.paneProps} shape={boxShape} tint={isError ? alpha(tokens.destructive, 0.18) : undefined} />}
        <Pressable
          onPress={() => setOpen(!open)}
          disabled={!editable}
          style={({ pressed }) => [disabledLook ? { ...skin.country(tokens, state), ...disabledLook.addon } : withInnerFill(theme, skin.country(tokens, state), "soft"), field.pressedOpacity != null && pressed ? { opacity: field.pressedOpacity } : null]}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={segmentName}
          aria-label={segmentName}
          accessibilityState={{ expanded: open, disabled: !editable }}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          testID={props.testID != null ? `${props.testID}-country` : undefined}
        >
          <Text style={skin.flag(size)}>{selected ? (selected.flag ?? flagOf(selected.code)) : ""}</Text>
          {skin.caretIcon != null ? (
            <Icon chevronDown size={skin.caretIcon} color={(skin.caret(tokens, open) as TextStyle).color as string} decorative />
          ) : (
            <Text style={skin.caret(tokens, open)}>{skin.caretGlyph}</Text>
          )}
        </Pressable>

        <View style={NUMBER_AREA}>
          {selected ? (
            <Text style={[text, skin.dial(tokens), { alignSelf: "center" }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {selected.dialCode}
            </Text>
          ) : null}
          <TextInput
            ref={hostRef}
            style={[
              field.groupField(tokens, { leadingIcon: false, trailingIcon: false, hasPrefix: false, hasSuffix: false }),
              { paddingStart: skin.numberGap },
              text,
              disabledLook ? { color: disabledLook.ink } : null,
              FOCUS_RESET,
            ]}
            textAlignVertical="center"
            value={number}
            onChangeText={setNumber}
            placeholder={placeholder}
            placeholderTextColor={tokens["muted-foreground"]}
            editable={editable}
            selectionColor={tokens.primary}
            keyboardType="phone-pad"
            inputMode="tel"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            autoFocus={props.autoFocus}
            maxLength={props.maxLength}
            returnKeyType={props.returnKeyType}
            onSubmitEditing={props.onSubmitEditing}
            onKeyPress={props.onKeyPress}
            testID={props.testID}
            onFocus={(e: Parameters<NonNullable<RNTextInputProps["onFocus"]>>[0]) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e: Parameters<NonNullable<RNTextInputProps["onBlur"]>>[0]) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={isError || undefined}
            aria-required={required || undefined}
            accessibilityLabel={accessibleName}
            aria-label={accessibleName}
            aria-labelledby={label != null && props.accessibilityLabel == null ? labelId : undefined}
            aria-describedby={props["aria-describedby"]}
          />
        </View>
        {disabledLook ? null : entryMaterial.stateBorder(boxShape, active || isError)}
      </View>
    );

    const list = (
      <AnchoredOverlay
        onAccessibilityEscape={escapeScope.onAccessibilityEscape}
        ownsScroll
        open={open}
        onDismiss={close}
        triggerRef={boxRef}
        gap={skin.menu.menuGap}
        cardStyle={[skin.menu.panel(tokens), { minWidth: boxWidth }]}
        inlineStyle={panelAnchor(skin.menu.menuGap)}
        // The country list is an option list: the DENSE layer under glass, like Select's.
        dense
      >
        <EscapeLayerProvider scope={escapeScope}>
          <OverlayScrollView style={optionScroll} bounces={false}>
            <RippleClip shape={cornerRadii(skin.menu.panel(tokens))}>
              <View nativeID={listId} role={LISTBOX} accessibilityLabel="Country" aria-label="Country" style={{ gap: skin.menu.rowGap }}>
                {countries.map((c, i) => (
                  <OptionRow
                    key={c.code}
                    skin={skin.menu}
                    size={menuSize}
                    selected={c.code === selected?.code}
                    separated={i > 0}
                    onPress={() => pick(c)}
                    accessibilityLabel={`${c.name} ${c.dialCode}`}
                    leading={c.flag ?? flagOf(c.code)}
                    label={c.name}
                    trailing={{ text: c.dialCode, style: skin.rowDial(tokens) }}
                  />
                ))}
              </View>
            </RippleClip>
          </OverlayScrollView>
        </EscapeLayerProvider>
      </AnchoredOverlay>
    );

    const dim = disabled && !disabledLook ? { opacity: field.disabledOpacity } : null;
    return (
      <View style={[root, open ? rootLifted : null, label != null ? { gap: field.labelGap } : null, dim, widthCap, style]}>
        {label != null ? (
          <Text nativeID={labelId} style={field.labelAbove ? field.labelAbove(tokens, size) : text}>
            <LabelContent label={label} required={required} starColor={tokens.destructive} />
          </Text>
        ) : null}
        {box}
        {list}
      </View>
    );
  });
  PhoneInput.displayName = "PhoneInput";
  return PhoneInput;
}
