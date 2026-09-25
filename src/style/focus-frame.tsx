// A frame's focus ring: the ring a focusable node hands to the frame around it when
// its own ring cannot show. A scrollport flush inside a clipping card is the case that
// needs it. A ring drawn outside the scroller is clipped by the card, and one drawn
// inside it is painted under the scrolled content: Chromium paints a scroll container's
// own outline beneath its scrolling contents, so a terminal's dark rows or a carousel's
// slide hide it entirely. The frame draws the ring instead, outside itself at the kit's
// offset and width (the CSS hand-off's solid `--ring`), while its node has keyboard
// focus, and the node drops its own ring (FOCUS_RESET) so the two never stack. A frame
// that itself sits flush inside a clipping parent (an `attached` table in a flush card)
// draws the ring just inside its edge instead, on a layer above its content, since the
// scroller would cover an inset outline of the frame's own.
//
// Keyboard focus is the focus the browser's :focus-visible marks, read without the DOM.
// A key that lands on the node marks it: Tab and Shift+Tab move focus on keydown and
// release on the node they moved to, so their keyup arrives there, and so does any key
// pressed while the node has focus (an arrow that scrolls it). A keyup with Meta,
// Control or Alt held, or of one of those keys alone, belongs to a shortcut (copying a
// selection) and is ignored, except Tab itself: Safari moves focus with Option+Tab. A
// pointer press on the node or inside it ends the mark, so a click draws no ring, as
// :focus-visible draws none. Blur hides the ring and keeps the mark, so a node that
// keyboard focus left for another window shows it again when focus comes back; a
// pointer press or the node unmounting clears it. Views take no key events natively
// unless an Android app turns on React Native's `enableKeyEvents` flag (its events
// carry the key in `nativeEvent`, read here too), so by default iOS and Android draw
// no frame ring and keep owning focus on their side, as they do for every other kit
// ring. One difference from the browser remains: a node focused from script after the
// user moved to the pointer elsewhere still shows its ring if a key last marked it.

import { useCallback, useMemo, useRef, useState, type ReactElement } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "./theme.js";
import { FOCUS_RING_OFFSET, FOCUS_RING_WIDTH } from "./pressable.js";
import { cornerRadii } from "./ripple-clip.js";

const SHORTCUT_KEYS = new Set(["Meta", "Control", "Alt", "AltGraph", "OS"]);

interface KeyFields {
  key?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

interface FramedEvent extends KeyFields {
  target?: unknown;
  currentTarget?: unknown;
  nativeEvent?: KeyFields;
}

/**
 * The handlers a framed node spreads, beside FOCUS_RESET in its style. The key, focus,
 * pointer and blur handlers are web props absent from React Native's types (the kit's
 * usual cast). A node that takes a ref of its own composes `ref` with it.
 */
export type FocusFrameTarget = ViewProps & { ref: (node: unknown) => void };

export interface FocusFrame {
  /** Whether the framed node has keyboard focus. */
  focused: boolean;
  target: FocusFrameTarget;
  /**
   * The frame's ring, outside it, while the framed node has keyboard focus, null
   * otherwise. Pass `shape` when the frame node does not carry the visible corners
   * itself, so the ring follows them.
   */
  ring(shape?: StyleProp<ViewStyle>): ViewStyle | null;
  /**
   * The ring just inside the frame, as the frame's last child, for a frame flush inside
   * a clipping parent that would cut the outside one. Null while the framed node has no
   * keyboard focus. `shape` gives it the frame's corners.
   */
  innerRing(shape?: StyleProp<ViewStyle>): ReactElement | null;
}

// A layer over the whole frame that takes no touches.
const INNER_LAYER: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" };

/** The frame side of a node whose ring its frame draws. */
export function useFocusFrame(): FocusFrame {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  // Whether a key last marked the node, kept across a blur (see above).
  const keyboard = useRef(false);
  const target = useMemo(() => {
    const clear = () => {
      keyboard.current = false;
      setFocused(false);
    };
    return {
      ref(node: unknown) {
        if (node == null) clear();
      },
      onKeyUp(event: FramedEvent) {
        if (event.target !== event.currentTarget) return;
        const key = event.nativeEvent ?? event;
        if (key.key !== "Tab" && (key.metaKey || key.ctrlKey || key.altKey || SHORTCUT_KEYS.has(key.key ?? ""))) return;
        keyboard.current = true;
        setFocused(true);
      },
      onPointerDown: clear,
      onFocus(event: FramedEvent) {
        if (event.target === event.currentTarget && keyboard.current) setFocused(true);
      },
      onBlur(event: FramedEvent) {
        if (event.target === event.currentTarget) setFocused(false);
      },
    } as unknown as FocusFrameTarget;
  }, []);
  // `outline*` are react-native-web keys, absent from React Native's style types.
  const ringStyle = useMemo(() => ({
    outlineColor: tokens.ring,
    outlineStyle: "solid",
    outlineWidth: FOCUS_RING_WIDTH,
    outlineOffset: FOCUS_RING_OFFSET,
  }) as unknown as ViewStyle, [tokens.ring]);
  const innerRingStyle = useMemo(() => ({ ...ringStyle, outlineOffset: -FOCUS_RING_WIDTH }) as unknown as ViewStyle, [ringStyle]);
  const ring = useCallback(
    (shape?: StyleProp<ViewStyle>) => (focused ? (shape ? { ...cornerRadii(shape), ...ringStyle } : ringStyle) : null),
    [focused, ringStyle],
  );
  const innerRing = useCallback(
    (shape?: StyleProp<ViewStyle>) => (focused ? <View aria-hidden style={[INNER_LAYER, shape ? cornerRadii(shape) : null, innerRingStyle]} /> : null),
    [focused, innerRingStyle],
  );
  return { focused, target, ring, innerRing };
}
