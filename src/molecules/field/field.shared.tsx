import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { View, Text, useTheme, LabelContent, type LayoutStyle, type MeasureProps, useFillStyle } from "../../style/index.js";
import { type FieldSkin } from "./field.styles.js";

// Shared Field shell. A form row: a label, the control, and one message line under it.
//
// Field exists for the part no control owns on its own — the message. Every field family already
// owns its label (that is the "components own their label anatomy" rule, and it is what lets
// Android float the label inside the box), but nothing in the kit renders the helper or the error
// text, so callers were hand-stacking a Text under an Input and drifting on type and color.
//
// The load-bearing behavior is LABEL DELEGATION. When the single child is a control that owns its
// own label anatomy, Field hands the label DOWN rather than drawing one beside it, so each platform
// still places it per its own contract: a static title above on web and iOS, the Material 3
// in-container floating label on Android. A label rendered next to such a control could never
// float, which is exactly the Android divergence this avoids. Any other child (a Switch, a group)
// keeps the static label above, because those do not own a label slot of that kind.

export interface FieldProps extends MeasureProps {
  /**
   * Row label. When the lone child is a field-family control (Input, Textarea, Select,
   * Autocomplete) that carries no `label` of its own, the label and `required` are DELEGATED into
   * that control so each platform places them per its own contract. Any other control keeps the
   * static label above.
   */
  label?: string;
  /** Muted hint under the control. Replaced by `error` when that is set. */
  helper?: string;
  /**
   * Error text. Setting it puts the row in the error state: the message turns destructive and
   * replaces `helper` in place, so the row never changes height and nothing below it jumps.
   */
  error?: string;
  /** Marks the label with a destructive asterisk, and sets `aria-required` on a delegated control. */
  required?: boolean;
  /** The control. */
  children?: ReactNode;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

/** The props Field delegates into a label-owning control. */
interface Delegable {
  label?: string;
  required?: boolean;
  error?: boolean;
  "aria-describedby"?: string;
}

export function createField(skin: FieldSkin, labelOwners: ComponentType<never>[]) {
  function Field(props: FieldProps) {
    const { label, helper, error, required, children, testID, style } = props;
    const { tokens } = useTheme();
    // FILL: the labeled field spans the parent it is given.
    const fill = useFillStyle("Field", props);

    // One id for the message, so a delegated control can point at it. The hand-off's Field skips
    // this wiring; a screen reader should hear the hint with the field, so the kit does it.
    const messageId = `${useId()}-message`;

    const isError = !!error;
    const message = isError ? error : helper;

    // Delegate only when there is exactly ONE element child, it is a label-owning control, and it
    // carries no label of its own. All three conditions matter: two children have no single owner,
    // a non-field control has nowhere to put a floating label, and a control that already names
    // itself must not be overridden.
    const kids = Children.toArray(children);
    const only = kids.length === 1 && isValidElement(kids[0]) ? (kids[0] as ReactElement<Delegable>) : null;
    const delegate =
      label != null &&
      only != null &&
      labelOwners.includes(only.type as ComponentType<never>) &&
      only.props.label == null;

    // Delegating the error STATE as well as the text is what makes the row read as one thing: the
    // control paints its destructive border while Field paints the message under it. Without this
    // an errored Field shows red text under a neutral-bordered box, which reads as unfinished.
    const control = delegate
      ? cloneElement(only, {
          label,
          required,
          ...(isError ? { error: true } : {}),
          ...(message != null && message !== "" ? { "aria-describedby": messageId } : {}),
        })
      : children;

    return (
      <View testID={testID} style={[skin.stack, fill, style]}>
        {label != null && !delegate ? (
          <Text style={skin.label(tokens)}>
            <LabelContent label={label} required={required} starColor={tokens.destructive} />
          </Text>
        ) : null}
        {control}
        {message != null && message !== "" ? (
          <Text
            nativeID={messageId}
            accessibilityRole={isError ? "alert" : undefined}
            role={isError ? "alert" : undefined}
            style={skin.message(tokens, isError)}
          >
            {message}
          </Text>
        ) : null}
      </View>
    );
  }

  Field.displayName = "Field";
  return Field;
}
