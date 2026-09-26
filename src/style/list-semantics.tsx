import type { ReactNode } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

// The list semantics StackedList, Feed and GridList share: a `list` whose rows are
// each a `listitem`, the shape Tailwind UI gives them (`<ul role="list">` of `<li>`).
// react-native-web renders the two roles as those very elements, so a screen reader
// announces the list and its item count and can move by item. A row that is a button
// stays one: the item wraps it, since a `listitem` is not a control.
//
// Natively React Native's role parser accepts both roles. iOS gives each an empty
// trait set, and Android reads a `list` as android.widget.AbsListView and maps a
// `listitem` to no role.

/**
 * A list's container: its role, its name, and, once it has a name to speak, a native view
 * that holds its rows. `label` is the name everywhere; `labelledBy` names the list on the
 * web from a rendered node that has no text of its own to copy (a StackedList title that
 * is not a string), and `label` then names it natively.
 *
 * - The name as a string in both spellings: React Native's View turns `aria-label` into
 *   its native label but its ScrollView does not, so a windowed list reached Android
 *   unnamed. react-native-web prefers the aria spelling and warns about neither. Natively
 *   the name is never a labelled-by relation: React Native's Android delegate gives a View
 *   with a role and no label of its own the text of every row inside it as its
 *   description, and TalkBack read that ("RC, Rachel Chen, Engineering Lead. List for
 *   Team members", then "In list RC, Rachel Chen, Engineering Lead" on each row).
 * - `collapsable={false}` once the list has a native name: Fabric removes a View whose
 *   props neither paint nor mark it (a role or a label does not count) and hoists the
 *   children out of one that is no stacking context, so an eager list's container reached
 *   no native screen reader. The Listbox's fix (3bc31490); react-native-web drops the prop,
 *   so the DOM is unchanged. A list with no native name stays collapsable, for the same
 *   delegate: TalkBack would read its whole content as one stop before its rows. A
 *   windowed list's scroller is a native view either way.
 */
export function listProps(name: { label?: string; labelledBy?: string }): ViewProps {
  const label = name.label || undefined;
  return {
    role: "list",
    ...(name.labelledBy != null ? { "aria-labelledby": name.labelledBy } : null),
    ...(label != null ? { "aria-label": label, accessibilityLabel: label, collapsable: false } : null),
  };
}

/** An eager row: every row is mounted, so the browser counts them itself. */
export const LIST_ITEM = { role: "listitem" } as const satisfies ViewProps;

/**
 * A windowed row: a windowed list mounts only the rows near its viewport, so the row
 * says where it sits in the whole list. Chromium takes the list's size from its rows'
 * `aria-setsize`, so a screen reader announces every item rather than the rendered
 * ones. The two attributes are web-only; React Native's native views have no such prop.
 */
export function windowedListItem(index: number, count: number): ViewProps {
  return { role: "listitem", "aria-setsize": count, "aria-posinset": index + 1 } as unknown as ViewProps;
}

/**
 * A windowed list's FlatList wraps its rows in Views of its own: the scroller's content
 * container, a cell per row and, in a multi-column list, a row of cells. On the web
 * every View is `position: relative`, and Chromium does not count a list's items
 * through a positioned wrapper: measured, the windowed list's own size read 0 while
 * each row still said "1 of 40". A static wrapper it looks through, so the list's size
 * reads its rows' `aria-setsize`. Nothing is placed against these wrappers (each row
 * is positioned itself), so static changes no layout, natively either.
 */
export const LIST_WRAPPER: ViewStyle = { position: "static" };

interface WindowedListCellProps {
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onFocusCapture?: (event: never) => void;
  children?: ReactNode;
}

/** A windowed list's FlatList cell (`CellRendererComponent`): FlatList's own, left static. */
export function WindowedListCell({ style, onLayout, onFocusCapture, children }: WindowedListCellProps) {
  // onFocusCapture is FlatList's own cell handler; React Native's View types omit it.
  return (
    <View style={[style, LIST_WRAPPER]} onLayout={onLayout} {...({ onFocusCapture } as ViewProps)}>
      {children}
    </View>
  );
}
