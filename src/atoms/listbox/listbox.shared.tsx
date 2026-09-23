import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useState, type ComponentType } from "react";
import { CheckboxIndicator as WebCheckboxIndicator } from "../checkbox/indicator/index.js";
import { type Role } from "react-native";
import { View, Pressable, Text, useControllableState, useFillStyle, useRovingFocus, isRTL, type ColorTokens, type LayoutStyle, type MeasureProps, type StyleProp, type ViewStyle, type TextStyle, withInnerFill, GlassPane, paneStyle } from "../../style/index.js";

// Shared Listbox shell. An inline, selectable list of options rendered directly
// (not a popover). Each row is a Pressable. Two selection modes, mutually
// exclusive:
//
// 1. Single-select (default): at most one row is the value.
// 2. Multi-select (`multi`): a named group of checkbox rows, and any number of rows
//    may be selected at once.
//
// How a row marks its selection is the skin's `mark`. On the web and Android the
// row leads with it: single-select fills the chosen row with the accent and shows a
// leading checkmark ("✓"), multi-select shows the platform's selection Checkbox
// (the Material 3 box on Android). iOS marks a choice in a list the way its own
// lists do (the design language's "one job, different control"): a trailing check
// on every chosen row, in both modes, with no leading column and no row fill.
//
// The structure (rows, the mark, label/detail stack), the boolean-prop axes (mode +
// size precedence, mirroring Button's intentOf), accessibility, and the semantic
// color logic live here once; a platform file supplies its skin (shape, padding,
// label type, the mark, press feedback) and its selection Checkbox artwork, and
// calls createListbox. Neither iOS nor Material 3 has a listbox control, so the row
// look is the kit's own on every platform; only the mark follows the platform.

// RN's Role union omits "listbox" (it is a valid ARIA role), so cast it once.
const LISTBOX = "listbox" as Role;

export type Mode = "single" | "multi";
export type Size = "small" | "medium" | "large";

export interface ListboxItem {
  /** The option's primary text. */
  label: string;
  /** Optional secondary text shown under the label in a muted tone. */
  detail?: string;
  /** Whether this option is initially selected (uncontrolled seed; prefer the top-level `defaultSelected`). */
  selected?: boolean;
}

// Listbox is an input-like control, so it is FILL (src/style/sizing.ts) like Input,
// Select, Autocomplete and the rest: the parent layout container provides the
// bounds. That parent must be definite, and this is not cosmetic: each row is
// `checkmark(16) + a flexBasis:"0%" label stack`, and in a content-sized parent
// (a bare Column inside a Row) Yoga resolves the percentage basis against an
// indefinite width to 0 with no free space to grow into, so on iOS/Android every
// label collapses to zero and only the checkmark gutter shows. `useFillStyle`
// warns in development when the list lands in such a cell.
export interface ListboxProps extends MeasureProps {
  /** The options to render, top to bottom. */
  items: ListboxItem[];
  /** Accessible name of the option list or multi-select checkbox group. Defaults to "Options". */
  accessibilityLabel?: string;
  /** Multi-select: each row is a checkbox (a leading indicator on the web and Android, a trailing ✓ on iOS) instead of a single choice. */
  multi?: boolean;
  /** Wrap the list in a rounded, bordered content card with static glass in glass mode. */
  bordered?: boolean;
  // Size (pick one; default is medium).
  /** Tighter rows with smaller text. */
  small?: boolean;
  /** Taller rows. */
  large?: boolean;
  /** Dim the list and block selection. */
  disabled?: boolean;
  /**
   * Selected option index(es) (CONTROLLED): a single index in single-select, an
   * array of indices in multi-select. Omit for uncontrolled use.
   */
  selected?: number | number[];
  /**
   * Initial selection for uncontrolled use (a bare listbox selects on press).
   * Falls back to the `selected` flags on `items` when omitted.
   */
  defaultSelected?: number | number[];
  /** Fired with the full new selection (an index in single-select, an index array in multi). */
  onChange?: (selected: number | number[]) => void;
  /** Fired with the pressed option's index. */
  onSelect?: (index: number) => void;
  /** E2E hook forwarded to the root list view. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

/** A leading mark: single-select fills the chosen row and shows a ✓ in a gutter; multi-select shows the selection Checkbox. */
export interface GutterMark {
  kind: "gutter";
  /** Single-select checkmark column: a fixed-width gutter reserved on every row. */
  checkmark: (tokens: ColorTokens) => TextStyle;
}

/** A trailing check on every chosen row, in both modes (iOS lists); the row is never filled for being chosen. */
export interface TrailingMark {
  kind: "trailing";
  /** The check glyph, which keeps its width on an unchosen row so labels never reflow. */
  check: (tokens: ColorTokens, size: Size) => TextStyle;
}

// The per-OS style pieces a platform skin owns. The row look is the kit's own on
// every platform, and the mark is where the platforms differ (see above).
// Color-bearing pieces are functions of the active tokens (so the bordered surface,
// the selected/press fill, and the label/detail colors follow light/dark via
// tokens.card/accent); layout-only fragments are static objects. `ripple` /
// `pressedOpacity` express the press feedback (Android ripple vs. opacity dim) the
// platform applies.
export interface ListboxSkin {
  /** A bordered container reads as a content card: rounded, hairline border, solid `card` fill, inset. */
  containerBordered: (tokens: ColorTokens) => ViewStyle;
  /** Each row: a horizontal flex shell with the mark + label stack. */
  rowBase: ViewStyle;
  /** Per-row vertical padding by size. */
  rowSize: Record<Size, ViewStyle>;
  /** The accent fill used for a selected single-select row (gutter mark) and the press state. */
  rowSelected: (tokens: ColorTokens) => ViewStyle;
  /** How a row marks its selection. */
  mark: GutterMark | TrailingMark;
  /** Label/detail stack: grows to fill the remaining row width. */
  textStack: ViewStyle;
  /** Label type + color per size. */
  label: (tokens: ColorTokens, size: Size) => TextStyle;
  /** Muted detail line type + color. */
  detail: (tokens: ColorTokens) => TextStyle;
  /** Android press ripple (a no-op off Android; null disables it). */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean }) | null;
  /** Pressed-row opacity dim (null leaves the look unchanged; the accent press fill carries the feedback). */
  pressedOpacity: number | null;
}

// Selection mode precedence when more than one axis prop is passed: first match
// wins. Only `multi` competes here; the default is single-select.
function modeOf(p: ListboxProps): Mode {
  if (p.multi) return "multi";
  return "single";
}

// Size precedence when more than one is passed: first match wins (small over
// large). The default is medium.
function sizeOf(p: ListboxProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "medium";
}

/** The platform pieces a Listbox composes: the selection Checkbox artwork a gutter-marked multi-select row leads with. */
export interface ListboxParts {
  CheckboxIndicator?: ComponentType<{ checked?: boolean; disabled?: boolean }>;
}

// The trailing check keeps its width on an unchosen row, so choosing never reflows a label.
const CHECK_HIDDEN: TextStyle = { opacity: 0 };

/** Build a Listbox component from a platform skin. */
export function createListbox(skin: ListboxSkin, parts: ListboxParts = {}) {
  const CheckboxIndicator = parts.CheckboxIndicator ?? WebCheckboxIndicator;
  const { mark } = skin;
  return function Listbox(props: ListboxProps) {
    const { items, bordered, disabled, onSelect, style } = props;
    const mode = modeOf(props);
    const size = sizeOf(props);
    const accessibleName = props.accessibilityLabel?.trim() || "Options";
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    // FILL, applied to the root list View (see the note above the interface).
    const widthCap = useFillStyle("Listbox", props);

    // Normalize the single|multi selection to an index array so one code path
    // drives both modes. Controlled via `selected`; uncontrolled seeds from
    // `defaultSelected`, falling back to the items' own `selected` flags, so a
    // bare listbox is interactive out of the box instead of ignoring presses.
    const toArray = (v: number | number[] | undefined): number[] | undefined =>
      v === undefined ? undefined : Array.isArray(v) ? v : [v];
    const controlled = toArray(props.selected);
    const initial = toArray(props.defaultSelected)
      ?? items.reduce<number[]>((acc, it, i) => (it.selected ? [...acc, i] : acc), []);
    const [selectedArr, setSelectedArr] = useControllableState<number[]>(
      controlled,
      initial,
      (next) => props.onChange?.(mode === "single" ? (next[0] ?? -1) : next),
    );

    const press = (index: number) => {
      const next = mode === "single"
        ? [index]
        : selectedArr.includes(index)
          ? selectedArr.filter((i) => i !== index)
          : [...selectedArr, index];
      setSelectedArr(next);
      onSelect?.(index);
    };

    // Roving-focus keyboard navigation: one tab stop,
    // arrows move a focus cursor down/up. Single-select follows focus (arrowing
    // selects); multi-select moves focus only and toggles on Enter/Space. The cursor
    // starts on the first selected row (or the first row).
    const [focusedIndex, setFocusedIndex] = useState(() => selectedArr[0] ?? 0);
    const { getItemProps } = useRovingFocus({
      count: items.length,
      active: Math.min(focusedIndex, Math.max(0, items.length - 1)),
      onActivate: (i) => {
        if (disabled) return;
        setFocusedIndex(i);
        if (mode === "single") press(i);
      },
      orientation: "vertical",
      rtl: isRTL(),
    });

    const container: StyleProp<ViewStyle> = [
      // Base: fill the parent's width (explicit, so the list fills even a centered
      // parent rather than collapsing to content the way a width-less View would);
      // FILL below adds the row-sharing pair.
      { width: "100%" },
      bordered ? paneStyle(theme, skin.containerBordered(tokens)) : null,
      disabled ? { opacity: 0.5 } : null,
      widthCap,
      style,
    ];

    // A selectable list of options is a `listbox` of `option`s (single-select)
    // or a group of `checkbox` rows (multi-select); "option"/"checkbox" are in
    // RN's Role union, "listbox" is the hoisted cast above.
    return (
      <View style={container} role={mode === "multi" ? "group" : LISTBOX} testID={props.testID}
        accessibilityLabel={accessibleName} aria-label={accessibleName}>
        {/* A bordered list is a CONTENT-layer pane under glass (nothing in solid mode). */}
        {bordered ? <GlassPane layer="content" shape={skin.containerBordered(tokens)} /> : null}
        {items.map((item, index) => {
          const selected = selectedArr.includes(index);
          // Name the row from its data so the title and detail stay separated,
          // and a selected option's decorative checkmark is not announced.
          const rowName = [item.label, item.detail].filter(Boolean).join(", ");
          // A gutter-marked single-select fills the chosen row; multi-select, and every
          // trailing-marked row, leaves the row plain and shows the state in its mark.
          const rowBase: StyleProp<ViewStyle> = [
            skin.rowBase,
            skin.rowSize[size],
            mark.kind === "gutter" && mode === "single" && selected ? withInnerFill(theme, skin.rowSelected(tokens), "firm") : null,
          ];

          // Pressable owns Enter activation on keyup. Handling it here as well
          // toggles a multi row twice. Its checkbox/option roles need an explicit
          // Space handler; arrows still use the shared roving-focus behavior.
          const roving = disabled ? undefined : getItemProps(index);
          const onRowKeyDown = roving
            ? (e: { key: string; repeat?: boolean; preventDefault: () => void }) => {
                if (e.key === " " || e.key === "Spacebar") {
                  e.preventDefault();
                  if (!e.repeat) press(index);
                  return;
                }
                roving.onKeyDown(e);
              }
            : undefined;
          const rovingProps = roving
            ? { focusable: roving.focusable, tabIndex: roving.tabIndex, onKeyDown: onRowKeyDown }
            : {};

          return (
            // Keep option/checkbox rows directly inside their listbox/group.
            // The row's own radius is only 2px, so a rectangular ripple bleed at those corners
            // is imperceptible and needs no clip. See src/style/ripple-clip.
            <Pressable
              key={index}
              ref={roving?.ref}
              {...(rovingProps as object)}
              // Android shows the Material ripple (a no-op off Android). The
              // selected-style press fill (the old `active:bg-accent`) is the
              // accent, applied only when enabled; a skin may also add an opacity
              // dim via pressedOpacity.
              android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
              style={({ pressed }) => [
                rowBase,
                !disabled && pressed ? withInnerFill(theme, skin.rowSelected(tokens), "firm") : null,
                skin.pressedOpacity != null && !disabled && pressed ? { opacity: skin.pressedOpacity } : null,
              ]}
              onPress={disabled ? undefined : () => press(index)}
              disabled={disabled}
              aria-disabled={!!disabled}
              // A multi-select row IS the checkbox (the indicator has no interactive
              // host), so its state is `checked`; a single-select
              // row is an `option`, whose state is `selected`. RNW forwards neither
              // accessibilityState key to the DOM, so each carries its aria alias.
              role={mode === "multi" ? "checkbox" : "option"}
              accessibilityLabel={rowName}
              aria-label={rowName}
              accessibilityState={
                mode === "multi"
                  ? { checked: selected, disabled: !!disabled }
                  : { selected, disabled: !!disabled }
              }
              {...(mode === "multi" ? { "aria-checked": selected } : { "aria-selected": selected })}
            >
              {mark.kind === "gutter" ? (
                mode === "multi" ? (
                  // The row owns every action. This private indicator reuses the
                  // Checkbox skin but contains only Views/Text, so hiding it cannot
                  // leave a nested Pressable in the keyboard tab order.
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    aria-hidden
                    style={{ pointerEvents: "none" }}
                  >
                    <CheckboxIndicator checked={selected} disabled={disabled} />
                  </View>
                ) : (
                  // Reserve the checkmark column on every row so labels stay aligned
                  // whether or not the row is selected.
                  <Text style={mark.checkmark(tokens)}>{selected ? "✓" : ""}</Text>
                )
              ) : null}
              <View style={skin.textStack}>
                <Text style={skin.label(tokens, size)}>{item.label}</Text>
                {item.detail != null ? <Text style={skin.detail(tokens)}>{item.detail}</Text> : null}
              </View>
              {mark.kind === "trailing" ? (
                // Decorative: the row's own state names the choice.
                <Text aria-hidden style={[mark.check(tokens, size), selected ? null : CHECK_HIDDEN]}>✓</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };
}
