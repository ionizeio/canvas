import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform, type LayoutChangeEvent } from "react-native";

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

// Android touch exploration (TalkBack), one subscription shared by every horizontal
// scrollport and released with the last one (the reduced-motion store in motion.ts is
// the precedent). React Native reports it as the screen reader: isScreenReaderEnabled
// and screenReaderChanged read AccessibilityManager's touch exploration state on
// Android. Null is unread, and an unread state counts as exploring, so a scroller
// only stops taking drags once the platform has said nobody explores it by touch.
let touchExploration: boolean | null = null;
const touchExplorationListeners = new Set<() => void>();
let touchExplorationSubscription: { remove?: () => void } | undefined;

function onTouchExplorationChanged(value: boolean) {
  if (value === touchExploration) return;
  touchExploration = value;
  for (const listener of touchExplorationListeners) listener();
}

function subscribeTouchExploration(listener: () => void): () => void {
  touchExplorationListeners.add(listener);
  if (touchExplorationSubscription == null) {
    touchExplorationSubscription = AccessibilityInfo.addEventListener("screenReaderChanged", onTouchExplorationChanged) ?? {};
  }
  return () => {
    touchExplorationListeners.delete(listener);
    if (touchExplorationListeners.size > 0) return;
    touchExplorationSubscription?.remove?.();
    touchExplorationSubscription = undefined;
    touchExploration = null;
  };
}

const noSubscription = () => () => {};
const readTouchExploration = () => touchExploration;

/** Whether an Android user may be exploring the screen by touch (unread counts as yes). */
function useAndroidTouchExploration(): boolean {
  const android = Platform.OS === "android";
  const exploring = useSyncExternalStore(android ? subscribeTouchExploration : noSubscription, readTouchExploration, readTouchExploration);
  useEffect(() => {
    if (!android) return;
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) onTouchExplorationChanged(value);
    });
    return () => {
      mounted = false;
    };
  }, [android]);
  return android && exploring !== false;
}

/**
 * A horizontal scrollport's keyboard stop, and whether it takes a drag at all.
 * Android's HorizontalScrollView claims any sideways drag past touch slop even when
 * its content fits (the vertical ScrollView declines a drag it cannot scroll, the
 * horizontal one has no such check, and React Native's wrapper skips the claim only
 * while scrolling is disabled), so a fitting scroller would cancel a press that
 * drifts sideways and keep the page from scrolling for the rest of that gesture.
 * On Android it therefore scrolls only while its content overflows, unless TalkBack
 * explores the screen by touch: React Native's disabled horizontal scroller also
 * drops every hover event before its children see one, and touch exploration is
 * made of hover events, so a disabled scroller would hide its tabs, cells and cards
 * from a finger exploring them. An exploring finger drags without pressing anything,
 * so the scroller stays enabled then. Every other platform keeps a fitting scroller
 * enabled, as before: react-native-web's disabled scroller sets `touch-action: none`,
 * and a finger on it could no longer scroll the page.
 */
export function useHorizontalScrollFocus() {
  const focus = useScrollFocus("horizontal");
  const exploring = useAndroidTouchExploration();
  return { ...focus, scrollEnabled: focus.focusable || Platform.OS !== "android" || exploring };
}
