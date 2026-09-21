import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { forwardRef, useId, useRef } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { Animated, type Role } from "react-native";
import { View, Pressable, Text, useControllableState, useFillStyle, useOverlayHost, useMeasuredWidth, FloatingLabel, LabelContent, RippleClip, cornerRadii, type LayoutStyle, type MeasureProps, type StyleProp, type ViewStyle, GlassPane, paneStyle, isGlass, withInnerFill } from "../../style/index.js";
// The kit-owned popup policy: the menu material grows from its anchor edge with a
// bounded contour overshoot, recoils and settles, and stays visible briefly on
// close while its rows are already inert. Solid mode and Reduce Motion keep the
// ordinary entrance. Internal, never a public prop.
import { LiquidAnchoredOverlay } from "../../style/liquid-anchored-overlay.js";
// The field hand-off (popup-handoff.tsx): under glass the list pours out of the
// trigger's edge (its width, corner and control tint) and, on close, absorbs back into
// the trigger's box, the value and chevron yielding only while the pane covers it. A
// Select is a field beside Inputs and Autocompletes, so it takes the field form: the
// box never vanishes whole the way a menu button does.
import { HandoffText, PopupHandoffContext, handoffInk, usePopupHandoff } from "../../style/popup-handoff.js";
import { useReducedMotion } from "../../style/motion.js";
import { OverlayScrollView } from "../../style/overlay-scroll.js";

// React Native's Role union omits the valid ARIA "listbox" role, so the option-list
// container casts it. The value is correct on both web (DOM role) and native.
const LISTBOX = "listbox" as Role;

import { Icon } from "../icon/icon.js";
import { root, rootLifted, PANEL_ANCHOR, type SelectSkin, type Size } from "./select.styles.js";

// The option list is a SCROLLPORT inside the card's `maxHeight` cap. The cap bounds
// the CARD, so without this the list would keep its full content height and the
// card's clip would simply cut the overflow rows off, unreachable. React Native
// Views default to `flexShrink: 0`, so the list has to be told it may shrink to the
// capped card; the rows past the cap then scroll into view instead of disappearing.
const optionScroll: ViewStyle = { flexShrink: 1 };
const floatingLabelLayer: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" };
// The standoff between the trigger's edge and the list (the hand-off's cover mark reads it too).
const LIST_GAP = 4;

// Shared Select shell. The structure (the stacked label + the trigger row with
// its optional leading icon, value/placeholder and trailing chevron, plus the
// open option list with its selectable rows), the public boolean-prop
// API, the size precedence, the controlled/uncontrolled value and open state,
// the select/close handlers, the disabled handling, and accessibility all live
// here once. A platform file supplies only its skin (trigger shape/fill/border,
// the chevron glyph, the menu surface, the row tint, where the selection
// indicator renders, and the press feedback) and calls createSelect.
//
// Overlay note: the open option list renders through AnchoredOverlay. When an
// OverlayProvider is mounted (an app root, or a docs example stage) the list is
// portaled over the page, anchored below the trigger, and a tap anywhere off it
// dismisses it, so it escapes any overflow-clipping ancestor (e.g. the docs'
// horizontal preview scroller), identically on iOS, Android, and web, with no
// Platform.OS branch. With no provider it falls back to an inline card positioned
// absolutely below the trigger (the kit's pre-portal behavior). AnchoredOverlay
// owns the card surface, so the listbox is passed to it directly; the panel asks
// for the DENSE layer (`dense`), an option list being a card of rows that must stay
// legible over the page rather than a sheer functional-layer overlay.

/**
 * An option whose stored value differs from the text shown for it, for lists
 * keyed by id (a project id, a region slug, a workspace name). Passing bare
 * strings stays supported and means the value and the label are the same.
 */
export interface SelectOption {
  value: string;
  label: string;
  /**
   * A short leading glyph shown before the label in the trigger and in the option
   * row: a flag emoji for a country list ("🇺🇸"), a currency sign, a unit. Content,
   * not styling; it inherits the row's type and colour.
   */
  leading?: string;
}

export interface SelectProps extends MeasureProps {
  /**
   * Controlled selection; omit for uncontrolled use. Empty shows the placeholder.
   * With plain string options this is the option itself; with `SelectOption`
   * objects it is the option's `value`, and the trigger shows its `label`.
   */
  value?: string;
  /** Initial selection for uncontrolled use (a bare <Select options/> picks on its own). */
  defaultValue?: string;
  /**
   * The selectable options: bare strings, or `{ value, label }` objects when the
   * stored value differs from the text shown for it.
   */
  options?: Array<string | SelectOption>;
  /**
   * The field's persistent label. Its placement is platform-adaptive: iOS and web
   * render it ABOVE the trigger; Android renders the Material 3 in-container
   * FLOATING label (centered like a placeholder at rest, floating to the top once
   * the menu opens or a value is selected). The label names the field for a11y.
   */
  label?: string;
  /** Accessible purpose for the trigger and option list. Overrides the visible
   * label for assistive technology; otherwise the label or placeholder names them. */
  accessibilityLabel?: string;
  /**
   * Places the `label` as a LEADING cluster INSIDE the trigger row (a toolbar-style
   * labeled select) instead of the persistent above/floating placement. Takes effect
   * only alongside `label`. The inline label still names the trigger (accessibilityLabel
   * / aria-labelledby) and shares its tap target, since it lives inside the trigger
   * Pressable. Pairs with `fit` for a content-hugging toolbar cluster.
   */
  inline?: boolean;
  /**
   * Marks the field as required and announces "required" with the trigger name.
   * A visible label also gets a decorative destructive "*".
   */
  required?: boolean;
  /** Renders a leading globe glyph inside the trigger, indented so the value clears it. */
  icon?: boolean;
  /** Prompt shown in the trigger when no value is selected. */
  placeholder?: string;
  /** Controlled open state of the option list; omit for uncontrolled use. */
  open?: boolean;
  /** Initial open state for uncontrolled use. */
  defaultOpen?: boolean;
  /** Fired when the open state changes (trigger press, select), in both modes. */
  onOpenChange?: (open: boolean) => void;
  /** Dims the control and blocks interaction. */
  disabled?: boolean;
  /** Called with the chosen option's value when a row is pressed (both modes). */
  onSelect?: (option: string) => void;
  /** E2E hook forwarded to the trigger pressable. */
  testID?: string;
  // Size (pick one; default is the medium field, matching Input's h-9).
  small?: boolean;
  large?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: SelectProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// Read a numeric style value (the Android trigger height), falling back when absent.
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

/** Build a Select component from a platform skin.
 * @ref Ref to the interactive trigger, preserving overlay measurement. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createSelect(skin: SelectSkin) {
  const Select = forwardRef<View, SelectProps>(function Select(props, ref) {
    const {
      options = [],
      label,
      required,
      icon,
      placeholder = "Select an option",
      onOpenChange,
      disabled,
      onSelect,
      style,
    } = props;
    const size = sizeOf(props);
    // One shape internally: a bare string is an option whose value is its label.
    const items: SelectOption[] = options.map((o) =>
      typeof o === "string" ? { value: o, label: o } : o,
    );
    const theme = useMaterialTheme({ layer: "control" });
    const { tokens } = theme;
    // A Select's content is its value, so a bare Column in a Row (the `.col-auto`
    // toolbar cell) hugs it legitimately: no hugging-cell warning.
    const widthCap = useFillStyle("Select", props, { hugsInCell: true });
    // One collision-free id for the label so the floated label carries a nativeID.
    const labelId = useId();
    const listId = `${labelId}-options`;
    // Controlled when `open`/`value` are provided, self-managed otherwise, so a
    // bare <Select options/> opens and picks out of the box (the standard
    // library contract): the trigger opens/closes the list, a select stores the
    // choice and closes it, and the callbacks fire in both modes.
    const [storedOpen, setStoredOpen] = useControllableState<boolean>(
      props.open,
      props.defaultOpen ?? false,
      onOpenChange,
    );
    const [value, setValue] = useControllableState<string>(
      props.value,
      props.defaultValue ?? "",
      onSelect,
    );

    // Disabled suppresses the menu without changing either owned state axis.
    // Re-enabling restores the stored open state, matching Dropdown, and prop
    // changes never synthesize interaction callbacks.
    const open = !disabled && storedOpen;
    const setOpen = (next: boolean) => {
      if (disabled) return;
      setStoredOpen(next);
    };
    const selectOption = (next: string) => {
      if (disabled) return;
      setValue(next);
      setOpen(false);
    };

    // Escape closes the open option list via browser Escape or native accessibility escape.
    const escapeScope = useEscapeLayer(open, () => setOpen(false));

    // Anchor the floating option list to the trigger: its measured width is the
    // list's minimum width when portaled over the page (a wider row can grow past
    // it), and AnchoredOverlay reads the trigger's box to place the list below it.
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();
    const hostRef = useComposedRefs(triggerRef, ref);
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();

    const hasValue = value !== "";
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    // Label placement: iOS/web render it ABOVE the trigger; the Android skin FLOATS
    // it inside the container (M3). The float signal is the menu being open (the
    // select's focus equivalent) OR a value being selected; the trigger's resting
    // placeholder text is hidden while the floating label is the placeholder.
    const hasLabel = label != null && label !== "";
    const fieldName = props.accessibilityLabel?.trim() || label?.trim() || placeholder.trim() || "Select an option";
    const triggerName = required ? `${fieldName}, required` : fieldName;
    // `inline` routes the label into the trigger row as a leading cluster; it
    // overrides both the above (iOS/web) and floating (Android) placements, so a
    // toolbar-style labeled select owns its label instead of a hand-composed row.
    const inline = hasLabel && !!props.inline;
    const floating = hasLabel && !inline && skin.floatingLabel;
    const above = hasLabel && !inline && !floating;
    const triggerShape = skin.trigger(tokens, size, open);
    const triggerHeight = asNum((triggerShape as { height?: unknown }).height, 56);
    // Under glass the trigger is a CONTROL-layer puck: a GlassPane paints the material
    // behind the row (the Pressable keeps its tap, ripple and dim), the box drops its
    // fill and resting hairline, and keeps only its OPEN border (the iOS/web `ring`)
    // as state; the Android skin's bottom indicator is a side colour, which the
    // shorthand reset leaves alone. Solid mode is untouched.
    const glass = isGlass(theme);
    // The hand-off runs when the trigger's material is glass, motion is allowed and the
    // list is hosted (the hosted overlay measures the trigger's frame, which the inline
    // fallback never has); the trigger's subtree reads the channel through the context.
    const reducedMotion = useReducedMotion();
    const { handoff, context: handoffContext } = usePopupHandoff(glass && !reducedMotion && host != null, { field: true });
    // While the list is open under the hand-off the pane rests over the trigger, whose
    // material and text are hidden: the open-state border the box paints outside that
    // material is not painted either, or it would show through the pane's glass.
    const covered = handoffContext != null && open;
    const glassTrigger: ViewStyle | null = glass ? { backgroundColor: "transparent", borderColor: open && !covered ? triggerShape.borderColor : "transparent" } : null;
    // Floating label owns the resting placeholder: show nothing until the menu opens
    // (matching the M3 Input); a selected value always shows.
    const selected = items.find((o) => o.value === value);
    const selectedLabel = selected?.label ?? value;
    const displayText = hasValue ? selectedLabel : floating && !open ? "" : placeholder;
    // The selected option's leading glyph rides in the trigger before the value.
    const selectedLeading = hasValue ? selected?.leading : undefined;

    return (
      <View style={[root, open && !host ? rootLifted : null, widthCap, style]}>
        {above ? (
          <Text nativeID={labelId} style={skin.label(tokens, size)}>
            <LabelContent label={label!} required={required} starColor={tokens.destructive} />
          </Text>
        ) : null}
        {/* The trigger's bounded Android ripple is clipped to its rounded (top-corner)
            outline by this RippleClip parent; the ripple is the Pressable's OWN background,
            which its same-node overflow:"hidden" cannot clip. See src/style/ripple-clip.
            `alignSelf:"stretch"` keeps the wrapper (and the trigger inside it) filling the
            field's standard width, which lives on the root View. */}
        <PopupHandoffContext.Provider value={handoffContext}>
        <RippleClip shape={cornerRadii(triggerShape)} style={{ alignSelf: "stretch" }}>
        <Pressable
          ref={hostRef}
          onLayout={onTriggerLayout}
          style={({ pressed }) => [
            paneStyle(theme, triggerShape),
            glassTrigger,
            !glass && disabled ? { opacity: skin.disabledOpacity } : null,
            !glass && skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
          disabled={disabled}
          onPress={() => setOpen(!open)}
          android_ripple={ripple}
          testID={props.testID}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: !!disabled }}
          aria-expanded={open}
          aria-disabled={!!disabled}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          // Name the trigger by its label on both channels so a screen reader
          // announces the field's name, not just the selected value/placeholder.
          accessibilityLabel={triggerName}
          aria-label={triggerName}
          // The inline label lives inside this Pressable, so link it by nativeID
          // (RNW forwards aria-labelledby to the DOM) as the trigger's name too.
          aria-labelledby={inline && !props.accessibilityLabel && !required ? labelId : undefined}
        >
          {({ pressed }) => {
            // The ink the value, the chevron and the floating label wear under glass (a
            // press or a disabled state dims them); under the hand-off it rides the
            // label's fade as well.
            const inkOpacity = disabled ? skin.disabledOpacity : pressed && skin.pressedOpacity != null ? skin.pressedOpacity : 1;
            const ink = handoffContext ? handoffInk(handoffContext, inkOpacity) : glass ? { opacity: inkOpacity } : null;
            return <>
              <GlassPane layer="control" shape={triggerShape} interactive={!disabled} />
              <Animated.View
                style={[
                  skin.triggerValue,
                  // Android floating label: the reserve (top padding that lets the value
                  // clear the floated label, mirroring the M3 Input) belongs to the VALUE
                  // cluster only, not the whole trigger row. Stretched to full height, the
                  // cluster centers its value within the space below the reserve, while the
                  // trailing chevron stays vertically centered in the full field (M3 centers
                  // a trailing dropdown icon in the container, unaffected by the label).
                  floating ? [{ alignSelf: "stretch" as const }, skin.labelReserve!(size)] : null,
                  ink,
                ]}
              >
                {inline ? (
                  <Text nativeID={labelId} style={skin.inlineLabel(tokens, size)}>
                    <LabelContent label={label!} required={required} starColor={tokens.destructive} />
                  </Text>
                ) : null}
                {icon ? <Icon globe muted size={14} /> : null}
                {selectedLeading != null ? <Text style={skin.valueText(tokens, size, true)}>{selectedLeading}</Text> : null}
                <Text style={skin.valueText(tokens, size, hasValue)}>{displayText}</Text>
              </Animated.View>
              <HandoffText style={[skin.chevron(tokens, size, open), ink]}>{skin.chevronGlyph}</HandoffText>
              {floating ? (
                <Animated.View style={[floatingLabelLayer, ink]}>
                  <FloatingLabel
                    styles={skin}
                    size={size}
                    tokens={tokens}
                    label={label!}
                    required={required}
                    labelId={labelId}
                    focused={open}
                    populated={hasValue}
                    isError={false}
                    height={triggerHeight}
                  />
                </Animated.View>
              ) : null}
            </>;
          }}
        </Pressable>
        </RippleClip>
        </PopupHandoffContext.Provider>

        <LiquidAnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          ownsScroll
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={LIST_GAP}
          cardStyle={[skin.panel(tokens), { minWidth: triggerWidth }]}
          inlineStyle={PANEL_ANCHOR}
          // An option list is a card of rows, so under glass the panel takes the
          // DENSE layer: the material under the model's densest tint, so options a
          // user reads and picks from never have the page showing through between
          // them while the card still takes the material.
          dense
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={props.open === undefined || onOpenChange !== undefined}
          handoff={handoff}
        >
          <EscapeLayerProvider scope={escapeScope}>
            {/* The option rows have no radius of their own and sit inside the rounded
                (4dp) `panel` card. RippleClip is still what rounds their bounded Android
                ripples: a view cannot clip its own ripple, and the card's own clip does not
                reach them through the card's padding. See src/style/ripple-clip. */}
            <OverlayScrollView style={optionScroll} bounces={false}>
            <RippleClip shape={cornerRadii(skin.panel(tokens))}>
            <View nativeID={listId} role={LISTBOX} accessibilityLabel={fieldName} aria-label={fieldName} aria-required={required || undefined}>
            {items.map((option, i) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    withInnerFill(theme, skin.optionRow(tokens, selected), "firm"),
                    // iOS draws a hairline group separator between rows (not above the
                    // first); a skin that omits rowSeparator keeps every row borderless.
                    i > 0 && skin.rowSeparator ? skin.rowSeparator(tokens) : null,
                    // Web/iOS tint the row on press here; Android uses the ripple instead.
                    skin.ripple == null && pressed ? withInnerFill(theme, skin.optionPressed(tokens), "firm") : null,
                  ]}
                  onPress={() => selectOption(option.value)}
                  disabled={disabled}
                  android_ripple={ripple}
                  role="option"
                  accessibilityState={{ selected, disabled: !!disabled }}
                  aria-selected={selected}
                  aria-disabled={!!disabled}
                >
                  {skin.selectedSide === "leading" ? (
                    <Text style={[skin.indicator(tokens, size), { width: 14 }]}>
                      {selected ? "✓" : " "}
                    </Text>
                  ) : null}
                  {option.leading != null ? (
                    <Text style={skin.optionText(tokens, size)}>{option.leading}</Text>
                  ) : null}
                  <Text style={[skin.optionText(tokens, size), { flexShrink: 1 }]}>
                    {option.label}
                  </Text>
                  {skin.selectedSide === "trailing" ? (
                    <Text style={skin.indicator(tokens, size)}>
                      {selected ? "✓" : ""}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
            </View>
            </RippleClip>
            </OverlayScrollView>
        </EscapeLayerProvider>
        </LiquidAnchoredOverlay>
      </View>
    );
  });
  Select.displayName = "Select";
  return Select;
}
