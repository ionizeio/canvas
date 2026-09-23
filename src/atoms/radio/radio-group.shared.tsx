import { Children, Fragment, isValidElement, useCallback, useMemo, type ReactElement, type ReactNode } from "react";
import { I18nManager, type Role } from "react-native";
import { View, Text, GlassSurface, useTheme, useFillStyle, useControllableState, useRovingFocus, type ColorTokens, type StyleProp, type TextStyle, type ViewStyle } from "../../style/index.js";
import { RadioGroupContext, type RadioGroupContextValue } from "./radio-context.js";
import type { RadioSkin } from "./radio.shared.js";

// RadioGroup owns the group's single-select state and hands it to the child
// `<Radio value="…">` controls through RadioGroupContext, so a bare group is
// interactive out of the box: exactly one option is chosen and pressing another moves
// the selection. Controlled via `value`, uncontrolled via `defaultValue` (the standard
// controllable-state contract, matching Tabs/Switch).
//
// It draws no chrome of its own on the web and Android (the child Radios carry every
// visual), so there it is a stack. It takes the Radio skin because iOS has no radio
// button: there a single choice is the inline picker of a grouped Form, so the group's
// plain options form one inset-grouped list section (the skin's `list`) whose rows are
// the options, with a trailing check on the chosen one. The platform entries build
// both Radio and RadioGroup from the same skin, so the two always agree.

// RN's Role union omits "radiogroup" (it is a valid ARIA role), so cast it once.
const RADIOGROUP = "radiogroup" as Role;

// Default column stack and the optional row layout. Defined here (component
// internals) the way Radio defines its own row; this is not a call-site restyle.
const COLUMN: ViewStyle = { flexDirection: "column", gap: 12 };
const ROW: ViewStyle = { flexDirection: "row", flexWrap: "wrap", rowGap: 12, columnGap: 20 };

// A labeled group stacks its header over the options; the header keeps the label
// tight to its description. Field-label rhythm: 8 between header and options
// (options themselves sit 12 apart), 4 inside the header.
const HEADED: ViewStyle = { flexDirection: "column", gap: 8 };
const HEADER: ViewStyle = { gap: 4 };

// Group label + description type: the field-label scale (matches Input's label and
// the kit's other title+description controls). Brand type shared across platforms,
// the way Radio shares its own label type, not a platform face.
function labelType(t: ColorTokens): TextStyle {
  return { fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground };
}
function descriptionType(t: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: t["muted-foreground"] };
}

export interface RadioGroupProps {
  /** The selected option's value (CONTROLLED). Omit for uncontrolled use. */
  value?: string | number;
  /** Initial selected value for uncontrolled use (a bare group selects on press). */
  defaultValue?: string | number;
  /** Fired with the newly selected option's value. */
  onChange?: (value: string | number) => void;
  /** Disable every radio in the group. */
  disabled?: boolean;
  /**
   * Lay the options out in a wrapping row instead of the default column. iOS keeps its
   * checkmark list vertical (a list has no row form); `card` options still sit in a row
   * there.
   */
  row?: boolean;
  /**
   * The group's name, rendered as a heading above the options. It also becomes the
   * radiogroup's accessible name, so a screen reader announces what the set of
   * options is about before reading them. The group owns this label anatomy; never
   * hand-compose a heading Text beside a bare group.
   */
  label?: string;
  /** Optional muted supporting line rendered under the label. */
  description?: ReactNode;
  /** The `<Radio value="…">` options that make up the group. */
  children?: ReactNode;
  /** E2E hook forwarded to the group container. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

type OptionProps = { value?: string | number; card?: boolean };

// A list section is a FILL component (it takes its parent's bounds, the way the kit's
// lists do); the stack of controls on the web and Android keeps its own sizing. The hook
// is chosen once per build, so every render of a build calls the same one.
function useListFill(): ViewStyle {
  return useFillStyle("RadioGroup");
}
function useNoFill(): null {
  return null;
}

/** Build a RadioGroup from the platform's Radio skin (its `list` decides whether the options form a list section). */
export function createRadioGroup(skin: RadioSkin) {
  const useSectionFill = skin.list ? useListFill : useNoFill;
  /**
   * A group of Radio options with single-select state. Wrap `<Radio value="…">`
   * children in it; the group tracks which value is chosen and moves the selection
   * on press. Pass `value` + `onChange` to control it, or `defaultValue` (or
   * nothing) to let it manage its own selection.
   */
  function RadioGroup(props: RadioGroupProps) {
    const { disabled, label, description } = props;
    const { tokens } = useTheme();
    const sectionFill = useSectionFill();
    const [value, setValue] = useControllableState<string | number | undefined>(
      props.value,
      props.defaultValue,
      (next) => {
        if (next !== undefined) props.onChange?.(next);
      },
    );

    // The ordered option values, read from the `<Radio value="…">` children, so the
    // group can drive roving-focus keyboard navigation (arrows move + select the next
    // option, the WAI-ARIA radiogroup pattern). When nothing is selected yet, the
    // FIRST radio is the group's single tab stop (APG), so activeIndex floors at 0.
    const options = Children.toArray(props.children).filter(isValidElement) as ReactElement<OptionProps>[];
    const values = options
      .map((child) => child.props.value)
      .filter((v): v is string | number => v !== undefined);
    const activeIndex = value === undefined ? 0 : Math.max(0, values.indexOf(value));

    // The list section holds plain options only: selectable cards are tiles of their own.
    const list = skin.list != null && options.length > 0 && !options.some((child) => child.props.card) ? skin.list : null;

    const { getItemProps } = useRovingFocus({
      count: values.length,
      active: activeIndex,
      onActivate: (i) => {
        if (!disabled) setValue(values[i]);
      },
      orientation: "both",
      rtl: I18nManager.isRTL,
    });

    // Key the item-props callback on the value order so it only changes when the
    // options or the active index change (not on every parent render).
    const valuesKey = values.join(" ");
    const itemProps = useCallback(
      (v: string | number) => {
        const i = values.indexOf(v);
        return i >= 0 ? getItemProps(i) : undefined;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getItemProps, valuesKey],
    );

    // Memoize the context value so a parent re-render doesn't re-render every Radio
    // (it changes only when the selection, disabled flag, option set or list changes).
    const inList = list != null;
    const ctx = useMemo<RadioGroupContextValue>(
      () => ({
        value,
        select: (next) => setValue(next),
        disabled,
        itemProps: disabled ? undefined : itemProps,
        list: inList,
      }),
      [value, disabled, setValue, itemProps, inList],
    );

    // The group's accessible name. Both the RN accessibilityLabel and the aria-label
    // alias are set because RNW forwards neither on its own (the kit's dual-a11y
    // contract; same pattern the grouped surfaces use).
    const nameProps = label != null ? { accessibilityLabel: label, "aria-label": label } : {};
    const hasHeader = label != null || description != null;

    // A list section is a content-layer pane under glass (GlassSurface is the plain
    // section in solid mode), with an inset hairline between two rows; the radiogroup
    // role and name ride the view inside it.
    const group = list ? (
      <GlassSurface
        layer="content"
        testID={hasHeader ? undefined : props.testID}
        style={hasHeader ? list.section(tokens) : [list.section(tokens), sectionFill, props.style]}
      >
        <View role={RADIOGROUP} {...nameProps}>
          {options.map((child, i) => (
            <Fragment key={child.key ?? i}>
              {i > 0 ? <View style={list.separator(tokens)} /> : null}
              {child}
            </Fragment>
          ))}
        </View>
      </GlassSurface>
    ) : (
      <View
        testID={hasHeader ? undefined : props.testID}
        role={RADIOGROUP}
        {...nameProps}
        style={hasHeader ? (props.row ? ROW : COLUMN) : [props.row ? ROW : COLUMN, props.style]}
      >
        {props.children}
      </View>
    );

    return (
      <RadioGroupContext.Provider value={ctx}>
        {hasHeader ? (
          <View testID={props.testID} style={[HEADED, list ? sectionFill : null, props.style]}>
            <View style={HEADER}>
              {label != null ? <Text style={labelType(tokens)}>{label}</Text> : null}
              {description != null ? <Text style={descriptionType(tokens)}>{description}</Text> : null}
            </View>
            {group}
          </View>
        ) : (
          group
        )}
      </RadioGroupContext.Provider>
    );
  }
  return RadioGroup;
}
