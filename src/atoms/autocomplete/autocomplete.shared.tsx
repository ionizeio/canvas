import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useTextEntryMaterial } from "../../style/text-entry-material.js";
import { consumeEscapeKey, EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { Platform, type Role, type TextInput as RNTextInput } from "react-native";
import { View, Pressable, Text, TextInput, useControllableState, useFillStyle, useOverlayHost, useMeasuredWidth, FloatingLabel, LabelContent, FOCUS_RESET, RippleClip, cornerRadii, type LayoutStyle, type MeasureProps, type StyleProp, type ViewStyle, type TextStyle, GlassPane, paneStyle, isGlass, PANE_SIBLING_INPUT, withInnerFill } from "../../style/index.js";
// The kit-owned popup policy for the suggestion list: under glass the material grows out of
// the anchor edge, recoils and settles, and stays visible briefly on close while
// the rows are already inert. Solid mode and Reduce Motion keep the ordinary
// entrance. Internal, never a public prop.
import { LiquidAnchoredOverlay } from "../../style/liquid-anchored-overlay.js";
// The field hand-off (popup-handoff.tsx): under glass the field vanishes into a drop
// hanging under its box, the list blooms up over the box and rests there, the way the
// iOS 26 menu takes its button, and on close deflates back onto the box, the field
// returning at the snap. The editor keeps focus under the pane throughout; the query
// echo at the top of the list shows what it holds (autocomplete-echo.tsx).
import { HandoffText, PopupHandoffContext, PopupHandoffForeground, handoffInk, usePopupHandoff } from "../../style/popup-handoff.js";
import { QueryEcho } from "./autocomplete-echo.js";
import { useReducedMotion } from "../../style/motion.js";
import { OverlayScrollView } from "../../style/overlay-scroll.js";
import { useActiveOptionScroll } from "../../style/use-active-option-scroll.js";
import { AccessibilityReturnBoundary, accessibilitySelectionProps, useAccessibilityReturn } from "../../style/use-accessibility-return.js";

// React Native's Role union omits the valid ARIA "listbox" role, so the option-list
// container casts it for web semantics. Native options retain their labels and
// selected accessibility state; Android does not map listbox to a native role.
const LISTBOX = "listbox" as Role;
import { wrapper, wrapperLifted } from "./autocomplete.styles.js";
import { type AutocompleteSkin, type Size } from "./autocomplete.styles.js";

// Shared Autocomplete shell. An Autocomplete is a searchable single-select: it mirrors
// Select's structure (a field plus an open option list) and adds text
// filtering. The field is a REAL text input: typing edits the query
// (controlled via `query`, self-managed via `defaultQuery`, the standard
// library contract) and the list narrows to options matching that query as
// you type; the trailing chevron toggles the list.
//
// The structure (the editable field, the open/close state machine, the query
// filtering, the highlighted selected/active option, the helper text), the
// public boolean-prop API, the size precedence, accessibility, refs, and
// handlers all live here once. A platform file supplies only its skin (field
// shape, fill, border/underline, popover elevation, row layout, press
// feedback) and calls createAutocomplete.
//
// The open list renders through AnchoredOverlay: when an OverlayProvider is
// mounted (an app root, or a docs example stage) it portals over the page,
// anchored below the field, so it escapes any overflow-clipping ancestor (e.g.
// the docs' horizontal preview scroller); with no provider it falls back to an
// inline absolute anchor below the field. The list is closed by default in the
// uncontrolled case; focusing or typing opens it, the chevron toggles it, and a
// select closes it. The selected option carries a leading "✓" and an accent
// surface; an empty filtered list shows a muted "No results" row.

export interface AutocompleteProps extends MeasureProps {
  /**
   * The text typed into the field (controlled). Filters the option list. Omit
   * and use `defaultQuery` for uncontrolled use: a bare Autocomplete is typeable
   * out of the box.
   */
  query?: string;
  /** Initial query for uncontrolled use. */
  defaultQuery?: string;
  /**
   * Fired with the new query on each keystroke, and with "" when a select
   * resets the filter (both modes).
   */
  onQueryChange?: (query: string) => void;
  /** The full list of selectable option labels. */
  options?: string[];
  /** The selected option label (CONTROLLED), or "" for no selection. Omit for uncontrolled use. */
  value?: string;
  /** Initial selected option for uncontrolled use (selecting a row updates it). */
  defaultValue?: string;
  /** Fired on selection and with "" when the field is cleared, in both controlled and uncontrolled modes. */
  onValueChange?: (value: string) => void;
  /** Prompt shown in the field when there is no query or value. */
  placeholder?: string;
  /**
   * Whether the option list is open (CONTROLLED). Uncontrolled and closed by
   * default; focusing or typing in the field opens it, the chevron toggles it.
   * Pass `open` to pin it open, or `defaultOpen` to render it open initially
   * while staying interactive. A disabled control stays closed regardless.
   */
  open?: boolean;
  /** Render the list open initially for uncontrolled use (selecting or the chevron closes it). */
  defaultOpen?: boolean;
  /** Fired when the open state changes (focus, typing, chevron, select). */
  onOpenChange?: (open: boolean) => void;
  /**
   * The field's persistent label. Its placement is platform-adaptive: iOS and web
   * render it ABOVE the field; Android renders the Material 3 in-container FLOATING
   * label (centered like a placeholder at rest, floating to the top once the list
   * opens or a value fills the field). The label names the field for assistive tech.
   */
  label?: string;
  /**
   * Marks the field as required: appends a destructive "*" to the label (hidden
   * from the accessible name) and sets aria-required on the field. Takes effect
   * only alongside `label`.
   */
  required?: boolean;
  /** Optional muted helper line rendered below the option list. */
  helperText?: string;
  /** Dims the control and blocks interaction. */
  disabled?: boolean;
  /** Called when an option is chosen by touch, pointer, or keyboard. Clearing only fires onValueChange. */
  onSelect?: (option: string) => void;
  /** E2E hook forwarded to the text field. */
  testID?: string;
  // Size (pick one; default is the medium field, matching Input's h-9).
  small?: boolean;
  large?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// First match wins when more than one size flag is passed.
function sizeOf(p: AutocompleteProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// The editable slice of the field row: fill the space before the chevron and
// drop the platform's default inner padding, so the skin's field box (height,
// gutter) governs the footprint exactly as it did around the old static text.
const fieldInput: TextStyle = { flex: 1, minWidth: 0, paddingVertical: 0, paddingHorizontal: 0 };

// Read a numeric style value (the Android field height), falling back when absent.
const asNum = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

// The inline-fallback anchor: with no OverlayProvider mounted the option list
// renders in place, absolutely positioned below the field (the kit's pre-portal
// behavior). With a provider, AnchoredOverlay portals the card over the page and
// adds the outside-tap dismiss backdrop instead. `start:0,end:0` pins it to the
// field's width; the skin owns the card's shape/fill/shadow.
// The standoff between the field's edge and the list where the field stays visible
// (solid mode, Reduce Motion, the inline fallback); under the hand-off the list rests
// over the field instead (`coverStandoff`).
const LIST_GAP = 4;
const POPOVER_ANCHOR: ViewStyle = { position: "absolute", top: "100%", start: 0, end: 0, zIndex: 50, marginTop: LIST_GAP };
// The editor's slot under the hand-off: the fader takes the editor's place in the
// field's row (the same flex share and floor, stretched to the row so a floating-label
// editor can stretch inside it) and the editor fills it, so the row lays out exactly
// as it does without the fader. The editor itself is never an animated component: an
// animated host re-attaches its ref on every render, which the accessibility return
// reads as the editor detaching and cancels its request on.
const EDITOR_SLOT: ViewStyle = { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", alignSelf: "stretch" };
// The Android floating label's layer under the hand-off: the label fades with the
// editor, positioned against the field's box exactly as it is without the layer.
const FLOAT_LAYER: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" };

// The option list is a SCROLLPORT inside the card's `maxHeight` cap. The cap bounds
// the CARD, so without this the list would keep its full content height and the
// card's clip would simply cut the overflow rows off, unreachable. React Native
// Views default to `flexShrink: 0`, so the list has to be told it may shrink to the
// capped card; the rows past the cap then scroll into view instead of disappearing.
const optionScroll: ViewStyle = { flexShrink: 1 };

/** Build an Autocomplete component from a platform skin. */
export function createAutocomplete(skin: AutocompleteSkin) {
  const Autocomplete = forwardRef<RNTextInput, AutocompleteProps>(function Autocomplete(props, ref) {
    const {
      options = [],
      label,
      required,
      helperText,
      placeholder = "Search…",
      open: openProp,
      onOpenChange,
      disabled,
      onSelect,
      onQueryChange,
      style,
    } = props;
    const size = sizeOf(props);
    const entryMaterial = useTextEntryMaterial(!!skin.liquid);
    const { theme } = entryMaterial;
    const menuTheme = useMaterialTheme({ layer: "dense" });
    const { tokens } = theme;
    const widthCap = useFillStyle("Autocomplete", props);
    // One collision-free id for the label so the floated label carries a nativeID.
    const labelId = useId();
    const listboxId = useId();

    // Controlled when `query` is provided, self-managed otherwise, so a bare
    // <Autocomplete/> filters as you type (the standard library contract).
    const [query, setQuery] = useControllableState<string>(
      props.query,
      props.defaultQuery ?? "",
      onQueryChange,
    );

    // Controlled when `value` is provided, self-managed otherwise, so selecting
    // a row actually updates the shown selection instead of firing onSelect into
    // the void.
    const [value, setValue] = useControllableState<string>(
      props.value,
      props.defaultValue ?? "",
      props.onValueChange,
    );

    // Uncontrolled by default: focus/typing opens the list, the chevron
    // toggles it, a select closes it. `defaultOpen` seeds it open initially.
    const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
    const open = !disabled && (openProp ?? internalOpen);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const setOpen = (next: boolean) => {
      if (disabled) return;
      if (!next) setActiveKey(null);
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };
    const accessibilityReturn = useAccessibilityReturn(open, !!disabled, ref);

    // Anchor the floating option list to the FIELD (not the whole wrapper, which
    // also spans the label and helper text). Measured via onLayout so the list
    // takes at least the field's width when portaled over the page.
    const fieldRef = useRef<View>(null);
    const host = useOverlayHost();
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();

    // Escape closes the open option list via browser Escape or native accessibility escape. A disabled
    // control renders no list, so it never subscribes.
    const escapeScope = useEscapeLayer(open, () => {
      accessibilityReturn.cancel();
      setOpen(false);
    });

    // What the field shows: the typed query, then the selected value, else the
    // placeholder (rendered natively by the input, in the skin's muted color).
    const hasQuery = query !== "";
    const hasValue = value !== "";
    const fieldValue = hasQuery ? query : value;

    // Filter the list by the query (case-insensitive). With no query, show all.
    const q = query.toLowerCase();
    // IDs use the original index, so filtering does not rename surviving rows.
    // Label + occurrence preserves identity across reordering while allowing
    // repeated labels to remain distinct keyboard destinations and React keys.
    const occurrences = new Map<string, number>();
    const matches = options.map((option, index) => {
      const occurrence = occurrences.get(option) ?? 0;
      occurrences.set(option, occurrence + 1);
      return { option, key: JSON.stringify([option, occurrence]), id: `${listboxId}-option-${index}` };
    })
      .filter(({ option }) => !hasQuery || option.toLowerCase().includes(q));
    const activeIndex = open ? matches.findIndex(({ key }) => key === activeKey) : -1;
    const activeId = activeIndex >= 0 ? matches[activeIndex]!.id : undefined;
    useEffect(() => {
      if (!open || activeIndex < 0) setActiveKey(null);
    }, [open, activeIndex]);

    const layoutKey = JSON.stringify(matches.map(({ id, key }) => [id, key]));
    const { listRef, listContentRef, rowRefs, onLayout: onListLayout, onScroll: onListScroll, onRowLayout, scrollActiveIntoView } = useActiveOptionScroll(activeId, layoutKey, open);

    const selectOption = (option: string, fromAccessibility = false) => {
      if (disabled) return;
      if (!fromAccessibility) accessibilityReturn.cancel();
      setValue(option);
      onSelect?.(option);
      setQuery("");
      setOpen(false);
    };

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    // Label placement: iOS/web render it ABOVE the field; the Android skin FLOATS
    // it inside the container (M3). The float signal is the list being open (the
    // combobox's focus equivalent) OR the field holding a query/value; the native
    // placeholder is gated so the resting label is the sole placeholder there.
    const hasLabel = label != null && label !== "";
    const floating = hasLabel && skin.floatingLabel;
    const above = hasLabel && !floating;
    const populated = fieldValue !== "";
    const fieldShape = skin.field(tokens, size, open);
    const fieldHeight = asNum((fieldShape as { height?: unknown }).height, 56);
    // GlassPane paints behind the editor and toggle. Clear web fields paint the
    // open-state outline in the foreground, outside the lens's sampled backdrop.
    // Native fields keep their original border or bottom indicator.
    const glass = isGlass(theme);
    // The hand-off runs when the field's material is glass, motion is allowed and the
    // list is hosted (the hosted overlay measures the field's frame, which the inline
    // fallback never has); the field's subtree reads the channel through the context.
    const reducedMotion = useReducedMotion();
    const { handoff, context: handoffContext } = usePopupHandoff(glass && !reducedMotion && host != null, { field: true });
    const ink = handoffInk(handoffContext);
    // While the list is open under the hand-off the pane rests over the field, whose
    // material and text are hidden (popup-handoff.tsx): the open-state border, which
    // the box (or the web's foreground stroke) paints outside that material, is not
    // painted either, or it would show through the pane's glass as an outline.
    const covered = handoffContext != null && open;
    const glassField: ViewStyle | null = glass ? { backgroundColor: "transparent", borderColor: open && !covered && !entryMaterial.foregroundStateBorder ? fieldShape.borderColor : "transparent" } : null;

    return (
      <View style={[wrapper, open && !host ? wrapperLifted : null, widthCap, style]}>
        {above ? (
          <Text nativeID={labelId} style={skin.label(tokens, size)}>
            <LabelContent label={label!} required={required} starColor={tokens.destructive} />
          </Text>
        ) : null}
        <PopupHandoffContext.Provider value={handoffContext}>
        <View
          ref={fieldRef}
          onLayout={onTriggerLayout}
          style={[
            paneStyle(theme, fieldShape),
            glassField,
            disabled ? { opacity: skin.disabledOpacity } : null,
          ]}
        >
          <GlassPane {...entryMaterial.paneProps} shape={fieldShape} />
          <PopupHandoffForeground style={EDITOR_SLOT}>
          <TextInput
            ref={accessibilityReturn.inputRef}
            // The field paints its own focus state (the skin's open border), so
            // the RNW default outline is suppressed; no-op on native.
            textAlignVertical="center"
            style={[
              skin.fieldText(tokens, size, false),
              fieldInput,
              glass ? PANE_SIBLING_INPUT : null,
              // Android floating label: the reserve (top padding that lets the value
              // clear the floated label, mirroring the M3 Input) belongs to the VALUE
              // field only, not the whole row. Stretched to full height, the field
              // centers its text below the reserve, while the trailing chevron toggle
              // stays vertically centered in the full field (M3 centers a trailing
              // dropdown icon in the container, unaffected by the label).
              floating ? [{ alignSelf: "stretch" as const }, skin.labelReserve!(size)] : null,
              FOCUS_RESET,
            ]}
            value={fieldValue}
            onChangeText={(text) => {
              if (disabled) return;
              accessibilityReturn.cancel();
              setActiveKey(null);
              setQuery(text);
              // Erasing the field to empty clears the committed selection, so the
              // value cannot snap back into the field through the display fallback
              // above. An uncontrolled value clears; a controlled `value` stays the
              // parent's to own.
              if (text === "" && hasValue) setValue("");
              if (!open) setOpen(true); // typing re-opens a closed list
            }}
            onFocus={() => {
              accessibilityReturn.cancel();
              if (!open) setOpen(true);
            }}
            onBlur={accessibilityReturn.cancel}
            // A press on a field that already holds the caret fires no focus event, so
            // without this there is no way back into a list you dismissed with Escape
            // while your query is still sitting in the field.
            onPressIn={() => {
              accessibilityReturn.cancel();
              if (!open && !disabled) setOpen(true);
            }}
            // Keep the caret in the input; active-descendant identifies the row
            // navigated by arrows. RNW feeds DOM keydown through this RN channel
            // and stops propagation, so Escape must delegate to the layer here.
            onKeyPress={(event) => {
              if (disabled) return;
              accessibilityReturn.cancel();
              const { key, isComposing, keyCode, repeat, altKey, ctrlKey, metaKey } = event.nativeEvent as {
                key: string; isComposing?: boolean; keyCode?: number; repeat?: boolean;
                altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean;
              };
              // Confirming an IME candidate must not navigate/select suggestions
              // or dismiss this layer. Older web engines report only code 229.
              if (isComposing || keyCode === 229) {
                // Modal asks to close again on keyup. Record IME ownership while
                // leaving the original keydown default free to cancel a candidate.
                if (key === "Escape") consumeEscapeKey({ nativeEvent: event.nativeEvent });
                return;
              }
              if (key === "Escape") {
                escapeScope.onKeyPress(event);
              } else if (key === "Enter") {
                if (repeat) {
                  event.preventDefault?.();
                } else if (activeIndex >= 0) {
                  event.preventDefault?.();
                  selectOption(matches[activeIndex]!.option);
                }
              } else if (!altKey && !ctrlKey && !metaKey && (key === "ArrowDown" || key === "ArrowUp")) {
                event.preventDefault?.();
                if (!open) setOpen(true);
                const next = activeIndex < 0 ? (key === "ArrowDown" ? 0 : matches.length - 1)
                  : Math.max(0, Math.min(matches.length - 1, activeIndex + (key === "ArrowDown" ? 1 : -1)));
                setActiveKey(matches[next]?.key ?? null);
              } else if (!altKey && !ctrlKey && !metaKey && activeIndex >= 0 && (key === "Home" || key === "End")) {
                event.preventDefault?.();
                setActiveKey(matches[key === "Home" ? 0 : matches.length - 1]!.key);
              } else if (key === "Tab" && open) {
                setOpen(false);
              }
            }}
            // Floating label owns the resting placeholder: hide the native
            // placeholder until the list opens (matching the M3 Input).
            placeholder={floating && !open ? undefined : placeholder}
            placeholderTextColor={skin.fieldText(tokens, size, true).color}
            editable={!disabled}
            selectionColor={tokens.primary} // brand cursor / selection on every platform
            testID={props.testID}
            role="combobox"
            // accessibilityState is the NATIVE disclosure/disabled channel (iOS/Android);
            // RNW drops it on the web, so aria-expanded/aria-disabled alias it there.
            accessibilityState={{ expanded: open, disabled: !!disabled }}
            aria-expanded={open}
            aria-disabled={!!disabled}
            // These ARIA relationships have no native RN equivalent. nativeID
            // and each row's selected trait retain native accessibility semantics.
            {...{ "aria-controls": listboxId, "aria-activedescendant": activeId,
              "aria-autocomplete": "list" as const, "aria-haspopup": "listbox" as const }}
            // Required is surfaced programmatically (aria-required), omitted when optional.
            aria-required={required || undefined}
            // Tie the visible label to the field so a screen reader announces the
            // field's name (not just the inner value/placeholder) on both channels.
            accessibilityLabel={hasLabel ? label : undefined}
            aria-label={hasLabel ? label : undefined}
          />
          </PopupHandoffForeground>
          <Pressable
            style={({ pressed }) => [
              skin.chevronTarget(size),
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
            ]}
            onPress={() => {
              accessibilityReturn.cancel();
              setOpen(!open);
            }}
            disabled={disabled}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel="Toggle options"
            aria-label="Toggle options"
            accessibilityState={{ expanded: open, disabled: !!disabled }}
            aria-expanded={open}
            aria-disabled={!!disabled}
          >
            <HandoffText style={[skin.chevron(tokens, size), ink]}>▾</HandoffText>
          </Pressable>
          {floating ? (
            <PopupHandoffForeground style={FLOAT_LAYER}>
            <FloatingLabel
              styles={skin}
              size={size}
              tokens={tokens}
              label={label!}
              required={required}
              labelId={labelId}
              focused={open}
              populated={populated}
              isError={false}
              height={fieldHeight}
            />
            </PopupHandoffForeground>
          ) : null}
          {covered ? null : entryMaterial.stateBorder(fieldShape, open)}
        </View>
        </PopupHandoffContext.Provider>

        <LiquidAnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          ownsScroll
          open={open}
          onDismiss={() => {
            accessibilityReturn.cancel();
            setOpen(false);
          }}
          triggerRef={fieldRef}
          gap={LIST_GAP}
          cardStyle={[skin.popover(tokens), { minWidth: triggerWidth }]}
          inlineStyle={POPOVER_ANCHOR}
          // The filtered option list is a card of rows, so under glass it takes
          // the DENSE layer: the material under the model's densest tint, so matches
          // a user reads and picks from never have the page showing through between
          // them while the card still takes the material.
          dense
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={openProp === undefined || onOpenChange !== undefined}
          handoff={handoff}
        >
          <AccessibilityReturnBoundary onMount={accessibilityReturn.onContentMount} onUnmount={accessibilityReturn.onContentUnmount}>
            <EscapeLayerProvider scope={escapeScope}>
              {/* Under the hand-off the list rests over the field, so the field's line
                  is echoed inside the pane (the query, the value or the placeholder,
                  and the chevron); the fragment leaves the tree byte for byte otherwise. */}
              <QueryEcho
                active={handoffContext != null}
                skin={skin} tokens={tokens} size={size}
                text={fieldValue} placeholder={placeholder}
                field={fieldShape} card={skin.popover(tokens)}
                editor={accessibilityReturn.editor}
                onClose={() => { accessibilityReturn.cancel(); setOpen(false); }}
              >
              <OverlayScrollView
                ref={listRef}
                style={optionScroll}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                onLayout={onListLayout}
                onScroll={onListScroll}
                scrollEventThrottle={16}
                onContentSizeChange={scrollActiveIntoView}
              >
                {/* The card's padding separates its clip from the rows. RippleClip
                    rounds bounded Android ripples without rounding each row. */}
                <RippleClip shape={cornerRadii(skin.popover(tokens))}>
                  <View ref={listContentRef} collapsable={false} nativeID={listboxId} role={LISTBOX}
                    accessibilityLabel={hasLabel ? label : undefined} aria-label={hasLabel ? label : undefined}>
                    {matches.length === 0 ? (
                      <View style={skin.emptyRow}>
                        <Text style={skin.emptyText(tokens, size)}>No results</Text>
                      </View>
                    ) : matches.map(({ option, key, id }, index) => {
                      const selected = option === value;
                      const separator = index > 0 && skin.rowSeparator ? skin.rowSeparator(tokens) : null;
                      return (
                        <Pressable
                          key={key}
                          nativeID={id}
                          ref={(node) => {
                            if (node) rowRefs.current.set(id, node);
                            else rowRefs.current.delete(id);
                          }}
                          onLayout={() => onRowLayout(id)}
                          style={({ pressed }) => [
                            skin.row,
                            separator,
                            selected ? withInnerFill(menuTheme, skin.rowSelected(tokens) ?? {}, "firm") : null,
                            pressed || index === activeIndex ? withInnerFill(menuTheme, skin.rowPressed(tokens) ?? {}, "firm") : null,
                          ]}
                          onPress={() => selectOption(option)}
                          {...accessibilitySelectionProps(() => accessibilityReturn.activate(() => selectOption(option, true)))}
                          android_ripple={ripple}
                          role="option"
                          // Keep browser editing focus on the input. Native -1
                          // would remove Android Pressable's click/hover support.
                          tabIndex={Platform.select({ web: -1, default: undefined })}
                          accessibilityLabel={option}
                          aria-label={option}
                          // accessibilityState carries the native selected trait;
                          // aria-selected supplies RNW's corresponding DOM state.
                          accessibilityState={{ selected }}
                          aria-selected={selected}
                        >
                          <Text style={skin.check(tokens, size)}>{selected ? "✓" : " "}</Text>
                          <Text style={skin.optionText(tokens, size)}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </RippleClip>
              </OverlayScrollView>
              </QueryEcho>
            </EscapeLayerProvider>
          </AccessibilityReturnBoundary>
        </LiquidAnchoredOverlay>

        {helperText != null && helperText !== "" ? (
          <Text style={skin.helper(tokens)}>{helperText}</Text>
        ) : null}
      </View>
    );
  });
  Autocomplete.displayName = "Autocomplete";
  return Autocomplete;
}
