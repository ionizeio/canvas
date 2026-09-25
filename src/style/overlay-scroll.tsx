import { createContext, forwardRef, useContext } from "react";
import { ScrollView, type ScrollViewProps, type ViewStyle } from "react-native";
import { useScrollFocus } from "./use-scroll-focus.js";
import { FocusFrameContext } from "./focus-frame.js";
import { FOCUS_RESET } from "./focus-reset.js";
import { useFocusRingStyle } from "./pressable.js";
import { useComposedRefs } from "./use-composed-refs.js";

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

// The port is a keyboard stop while its rows overflow, and it sits flush inside its
// card's clip, which would cut a ring drawn around it while the rows would cover one
// drawn inside it. So the card that frames it draws the ring (src/style/focus-frame.tsx)
// and the port wears none; a port with nothing framing it wears the kit's own ring.
// The frame's handlers run beside any the owner passes, and its ref beside the port's.
type FrameHandler = "onKeyUp" | "onPointerDown" | "onFocus" | "onBlur";
const FRAME_HANDLERS: readonly FrameHandler[] = ["onKeyUp", "onPointerDown", "onFocus", "onBlur"];
type Handlers = Partial<Record<FrameHandler, (event: unknown) => void>>;

/** One measured scrollport, shared by anchored cards and option-list owners. */
export const OverlayScrollView = forwardRef<ScrollView, ScrollViewProps>(function OverlayScrollView({
  style, onLayout, onContentSizeChange, tabIndex, ...props
}, ref) {
  const report = useContext(OverlayScrollContext);
  const frame = useContext(FocusFrameContext);
  const ownRing = useFocusRingStyle();
  const focus = useScrollFocus("vertical");
  const portRef = useComposedRefs<ScrollView>(ref, frame?.ref);
  let framed: Handlers | null = null;
  if (frame) {
    const fromFrame = frame as unknown as Handlers;
    const fromOwner = props as unknown as Handlers;
    framed = {};
    for (const name of FRAME_HANDLERS) {
      framed[name] = (event) => {
        fromFrame[name]?.(event);
        fromOwner[name]?.(event);
      };
    }
  }
  return (
    <ScrollView
      {...props}
      {...(framed as object | null)}
      ref={portRef}
      style={[SCROLLPORT, frame ? FOCUS_RESET : ownRing, style]}
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
