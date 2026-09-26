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
// `listitem` to no role, wherever the node is a native view.

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
