import { useCallback, useState } from "react";
import { Platform, type LayoutChangeEvent } from "react-native";

/** Give a scrollport a keyboard stop only while its content overflows. */
export function useScrollFocus(axis: "horizontal" | "vertical") {
  const [viewportSize, setViewportSize] = useState(0);
  const [contentSize, setContentSize] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportSize(event.nativeEvent.layout[axis === "horizontal" ? "width" : "height"]);
  }, [axis]);
  const onContentSizeChange = useCallback((width: number, height: number) => {
    setContentSize(axis === "horizontal" ? width : height);
  }, [axis]);
  const focusable = viewportSize > 0 && contentSize > viewportSize;
  return { focusable, tabIndex: focusable ? 0 as const : -1 as const, onLayout, onContentSizeChange };
}

/**
 * A horizontal scrollport's keyboard stop, and whether it takes a drag at all.
 * Android's HorizontalScrollView claims any sideways drag past touch slop even when
 * its content fits (the vertical ScrollView declines a drag it cannot scroll, the
 * horizontal one has no such check, and React Native's wrapper skips the claim only
 * while scrolling is disabled), so a fitting scroller would cancel a press that
 * drifts sideways and keep the page from scrolling for the rest of that gesture.
 * On Android it therefore scrolls only while its content overflows. Every other
 * platform keeps a fitting scroller enabled, as before: react-native-web's
 * disabled scroller sets `touch-action: none`, and a finger on it could no longer
 * scroll the page.
 */
export function useHorizontalScrollFocus() {
  const focus = useScrollFocus("horizontal");
  return { ...focus, scrollEnabled: focus.focusable || Platform.OS !== "android" };
}
