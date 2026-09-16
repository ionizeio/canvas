import { Children, useEffect, useId, useRef, type ComponentType, type ElementRef, type ReactNode } from "react";
import { type Role } from "react-native";
import { View, Text, useTheme, useContainerWidth, widths, type ColorTokens, type StyleProp, type TextStyle, type ViewStyle } from "../../style/index.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import * as s from "./form.styles.js";

// Shared Form shell. Form is a COMPOSITION surface: the caller stitches the field
// atoms (Input, Select, Checkbox, a FormSection, any node) as children and keeps
// ownership of their state through each atom's own controlled/uncontrolled props.
// Form contributes only what the group needs as a whole:
//   - the vertical rhythm between rows (and the optional two-column flow that
//     collapses to one column on phones, desktop-first),
//   - the actions row: a primary submit + an outline cancel composed from the kit
//     Button, rendered when a label is given,
//   - form semantics for assistive tech, and Enter-to-submit on the web.
// It deliberately owns NO field state and collects no values: `onSubmit` is a
// plain callback, and the caller reads its own state (this keeps every atom
// decoupled from Form and its API identical inside or outside one).
//
// Form is a "Light" platform treatment. Neither iOS nor Android ships a native
// form control (PLATFORM-REFERENCES.md): SwiftUI Form renders as a grouped inset
// list, and Material 3 composes forms from text fields, selection controls, and
// buttons. So the per-OS touches are conventions only (SF type/rhythm on iOS, M3
// type tracking on Android), and the WEB look is kept verbatim.

// The submit/cancel Button the Form composes, typed as the atom component so the
// public atom API is preserved across every build path. Each platform's thin
// wrapper passes its platform-correct Button (the iOS wrapper passes `.ios`,
// etc.) so the WEB docs 3-up preview shows the right control per row; on a real
// device Metro resolves the right extension regardless.
export type ButtonComponent = ComponentType<ButtonProps>;

// RN's Role union omits "form" (it is a valid ARIA role), so cast it once. RNW
// forwards it to the DOM; native ignores an unknown role.
const FORM = "form" as Role;

// The per-OS-varying style pieces the Form's own surface contributes. Everything
// else (the layouts, the responsive collapse, the composed Button) is shared.
export interface FormSkin {
  /** A section's heading type (size / line-height / weight / tracking). */
  sectionTitle: (t: ColorTokens) => TextStyle;
  /** The muted supporting line under a section heading. */
  sectionDescription: (t: ColorTokens) => TextStyle;
  /** The right-aligned actions row. */
  actions: ViewStyle;
  /** The form's stacked rhythm (gap between rows). */
  stack: ViewStyle;
  /** A section's internal rhythm (header block to rows, row to row). */
  sectionStack: ViewStyle;
}

export interface FormSectionProps {
  /** Section heading naming this group of controls. */
  title?: string;
  /** Muted supporting line under the heading. */
  description?: ReactNode;
  /** The section's stitched controls. */
  children?: ReactNode;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

export interface FormProps {
  /**
   * The form rows, stitched by the caller: Input, Select, Checkbox, a
   * FormSection, any node. Each control keeps its own state (controlled or
   * uncontrolled); Form never intercepts it.
   */
  children?: ReactNode;
  /**
   * Two-column: rows flow into a two-up grid that collapses to a single column
   * on small screens (desktop-first). Omit for the stacked default.
   */
  twoColumn?: boolean;
  /** Label for the primary submit button. Passing it (or `cancelLabel`) renders the actions row. */
  submitLabel?: string;
  /** Renders an outline cancel button before the submit button. */
  cancelLabel?: string;
  /**
   * Fired when the submit button is pressed, and on the web when Enter is
   * pressed inside one of the form's single-line text fields. Form owns no field
   * state, so the caller reads its own values (no payload).
   */
  onSubmit?: () => void;
  /** Fired when the cancel button is pressed. */
  onCancel?: () => void;
  /** Disables the actions row and Enter-to-submit. */
  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Build a FormSection component from a platform skin: a titled, described group
 * of stitched controls inside a Form (the composition successor to a fieldset
 * legend).
 */
export function createFormSection(skin: FormSkin) {
  return function FormSection({ title, description, children, testID, style }: FormSectionProps) {
    const { tokens } = useTheme();
    // Programmatic grouping: a screen reader hears the title as the group's name
    // and the controls as members of it. Both the RN accessibilityLabel and the
    // aria-label alias are set because RNW forwards neither on its own.
    const nameProps =
      title != null
        ? ({ role: "group" as const, accessibilityLabel: title, "aria-label": title } as const)
        : {};
    return (
      <View testID={testID} {...nameProps} style={[skin.sectionStack, style]}>
        {title != null || description != null ? (
          <View>
            {title != null ? <Text style={skin.sectionTitle(tokens)}>{title}</Text> : null}
            {description != null ? <Text style={skin.sectionDescription(tokens)}>{description}</Text> : null}
          </View>
        ) : null}
        {children}
      </View>
    );
  };
}

/** Build a Form component from a platform skin (plus the platform-correct Button its actions row composes; defaults to the web base when omitted). */
export function createForm(skin: FormSkin, Button: ButtonComponent = WebButton) {
  return function Form(props: FormProps) {
    const { children, twoColumn, submitLabel, cancelLabel, onSubmit, onCancel, disabled, testID, style } = props;

    // The two-column flow: rows wrap into a two-up grid in wide CONTAINERS and
    // collapse to a single full-width column in narrow ones (desktop-first). The
    // form measures its own row wrapper rather than the window (the DataTable
    // precedent): a form inside a narrow desktop column stacks too, instead of
    // crushing two-up. The threshold is the `lg` step of the width scale (512),
    // not a viewport breakpoint: a two-up split narrower than that cannot give
    // each column a usable field, while a form in an `xl` (576) Container stays
    // two-up.
    const { width: rowsWidth, onLayout: onRowsLayout } = useContainerWidth();
    const twoUp = rowsWidth <= 0 || rowsWidth > widths.lg;

    const rows = twoColumn ? (
      <View
        onLayout={onRowsLayout}
        style={{ flexDirection: twoUp ? "row" : "column", flexWrap: "wrap", gap: s.twoColumnGap }}
      >
        {Children.toArray(children).map((child, i) => (
          <View key={i} style={[twoUp ? s.flex1 : s.flexAuto, s.twoColumnItem]}>
            {child}
          </View>
        ))}
      </View>
    ) : (
      children
    );

    const actions =
      submitLabel != null || cancelLabel != null ? (
        <View style={skin.actions}>
          {cancelLabel != null ? (
            <Button outline disabled={disabled} onPress={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          {submitLabel != null ? (
            <Button primary disabled={disabled} onPress={onSubmit}>
              {submitLabel}
            </Button>
          ) : null}
        </View>
      ) : null;

    // Enter-to-submit on the web. RNW's TextInput STOPS the propagation of its
    // keydown events (verified empirically: neither a container onKeyDown nor a
    // document bubble listener ever hears them), so the only place the key can be
    // caught is the document CAPTURE phase, which runs document -> target before
    // that stop. The listener is scoped to THIS form by matching the target's
    // nearest <form> ancestor against the form's own id VALUE (a role="form" View
    // renders as a real <form> on the web; node-identity checks like contains()
    // fail under happy-dom's proxied HTMLFormElement, while attribute comparison
    // holds everywhere), and to single-line text fields by the DOM `input` tag: a
    // multiline field keeps Enter for newlines (`textarea`) and a button keeps
    // Enter for its own activation. Natively there is no `document`, so both
    // effects are no-ops there and each field's return key drives its own
    // onSubmitEditing. Like useEscapeKey, this is additive web-only EVENT
    // handling, not a web-only rendering branch, so it stays inside the kit's
    // cross-platform rules.
    const formId = useId();
    const rootRef = useRef<ElementRef<typeof View> | null>(null);
    const submitRef = useRef(onSubmit);
    submitRef.current = onSubmit;
    const disabledRef = useRef(!!disabled);
    disabledRef.current = !!disabled;
    const enterActive = onSubmit != null;

    // Defuse the browser's IMPLICIT form submission: a real <form> with a lone
    // text field navigates on Enter unless the submit default is prevented (the
    // kit's submit button is a role="button" View, not a native submit control).
    useEffect(() => {
      if (typeof document === "undefined") return;
      const root = rootRef.current as unknown as HTMLElement | null;
      if (!root || typeof root.addEventListener !== "function") return;
      const prevent = (event: Event) => event.preventDefault();
      root.addEventListener("submit", prevent);
      return () => root.removeEventListener("submit", prevent);
    }, []);

    useEffect(() => {
      if (!enterActive || typeof document === "undefined") return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" || disabledRef.current || event.defaultPrevented
          || event.isComposing || event.keyCode === 229) return;
        const target = event.target as HTMLElement | null;
        if (!target || target.tagName !== "INPUT") return;
        const scope = (target as { closest?: (selector: string) => HTMLElement | null }).closest?.("form");
        if (!scope || scope.getAttribute("id") !== formId) return;
        // Capture runs before TextInput's onKeyPress. An expanded combobox with
        // an active suggestion owns Enter for selection; its handler prevents
        // the input's submit/blur default once it has selected that option.
        if (target.getAttribute("role") === "combobox"
          && target.getAttribute("aria-expanded") === "true"
          && target.getAttribute("aria-activedescendant")) return;
        event.preventDefault();
        // A held selection key can repeat after the combobox closes. It must
        // not become a form submission until the user presses Enter again.
        if (event.repeat) return;
        submitRef.current?.();
      };
      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [enterActive, formId]);

    return (
      <View ref={rootRef} nativeID={formId} testID={testID} role={FORM} style={[skin.stack, style]}>
        {rows}
        {actions}
      </View>
    );
  };
}
