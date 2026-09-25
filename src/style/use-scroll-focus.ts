import { useCallback, useRef, useState } from "react";
import { Platform, type LayoutChangeEvent } from "react-native";

/**
 * Give a scrollport a keyboard stop only while its content overflows. The sizes
 * live in a ref and only the overflow is state, so a scrollport re-renders when
 * its content starts or stops overflowing, never on every resize.
 */
export function useScrollFocus(axis: "horizontal" | "vertical") {
  const sizes = useRef({ viewport: 0, content: 0 });
  const [focusable, setFocusable] = useState(false);
  const measure = useCallback(() => {
    const { viewport, content } = sizes.current;
    setFocusable(viewport > 0 && content > viewport);
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    sizes.current.viewport = event.nativeEvent.layout[axis === "horizontal" ? "width" : "height"];
    measure();
  }, [axis, measure]);
  const onContentSizeChange = useCallback((width: number, height: number) => {
    sizes.current.content = axis === "horizontal" ? width : height;
    measure();
  }, [axis, measure]);
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
