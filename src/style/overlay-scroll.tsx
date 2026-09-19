import { createContext, forwardRef, useContext } from "react";
import { ScrollView, type ScrollViewProps, type ViewStyle } from "react-native";
import { useScrollFocus } from "./use-scroll-focus.js";

export const OverlayScrollContext = createContext<{
  contentHeight(height: number): void;
  viewportHeight(height: number): void;
} | null>(null);

// The scrollport is CONTENT-SIZED. The card it sits in has no height of its own,
// only a cap (the skin's maxHeight and the fitted band), so the port takes its
// rows' height and shrinks to the cap; it must never grow. React Native's
// ScrollView carries `flexGrow: 1` by default, and on iOS and Android that growth
// inflated the hosted overlay's absolute wrapper: Yoga measures a wrapper with no
// height of its own at max-content, turns the card's maxHeight into an at-most
// constraint for that measure, and under the legacy stretch errata React Native
// keeps on (YGErrataAll) a growing child fills an at-most constraint. The wrapper
// then measured as tall as the cap while the card laid out content-sized at the
// wrapper's top: invisible under a `top` anchor, but a card opened ABOVE its
// trigger is pinned by `bottom`, so it floated up to the top of the visible band
// and left the trigger behind (iOS 26 docs dev app, 2026-09-19). Growing the port
// never had a purpose here (no anchored card has a definite height), so the port
// declares that it does not.
const SCROLLPORT: ViewStyle = { flexGrow: 0, flexShrink: 1 };

/** One measured scrollport, shared by anchored cards and option-list owners. */
export const OverlayScrollView = forwardRef<ScrollView, ScrollViewProps>(function OverlayScrollView({
  style, onLayout, onContentSizeChange, tabIndex, ...props
}, ref) {
  const report = useContext(OverlayScrollContext);
  const focus = useScrollFocus("vertical");
  return (
    <ScrollView
      {...props}
      ref={ref}
      style={[SCROLLPORT, style]}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
      tabIndex={tabIndex ?? focus.tabIndex}
      onLayout={(event) => {
        focus.onLayout(event);
        report?.viewportHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
      }}
      onContentSizeChange={(width, height) => {
        focus.onContentSizeChange(width, height);
        report?.contentHeight(height);
        onContentSizeChange?.(width, height);
      }}
    />
  );
});
