// The kit's Pressable primitive: React Native's own, with the focus ring themed. Every
// kit control presses through it (components import Pressable from src/style/primitives,
// which re-exports this), so one palette colours every focus ring.
//
// The browser draws the ring itself, on keyboard focus only (its :focus-visible rule);
// this gives it the palette's `ring` colour and sets it 2 px off the control. Chromium
// paints its automatic ring in that colour. Firefox and Safari keep their own colour for
// the automatic ring, so the CSS hand-off's `:focus-visible` rule (styles/tokens/base.css)
// makes the ring a solid 2 px `--ring` in every browser wherever it is loaded. A control
// that paints its own focus state (a field border, a segment) spreads FOCUS_RESET, which
// still wins. Natively the outline keys draw nothing without a width, so there is no
// native ring: iOS and Android own focus on their side.

import { forwardRef, useMemo } from "react";
import {
  Pressable as RNPressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import { useTheme } from "./theme.js";

/** The ring's distance from the control, the CSS hand-off's `--ring-offset`. */
export const FOCUS_RING_OFFSET = 2;

/**
 * The ring drawn just inside the control instead of around it, for a full-bleed row
 * (an accordion header, a sidebar row) whose clipping container would cut an outside
 * ring. A skin spreads it after the control's own style.
 */
export const INSET_FOCUS_RING = { outlineOffset: -FOCUS_RING_OFFSET } as unknown as ViewStyle;

/**
 * The themed ring for a focusable node that is not a Pressable (a drag handle, a
 * focusable View): the same colour and offset the kit's Pressable carries. `outline*`
 * are react-native-web keys, absent from React Native's style types (the FOCUS_RESET
 * cast), and draw nothing natively without a width.
 */
export function useFocusRingStyle(): ViewStyle {
  const { tokens } = useTheme();
  return useMemo(() => ({ outlineColor: tokens.ring, outlineOffset: FOCUS_RING_OFFSET }) as unknown as ViewStyle, [tokens.ring]);
}

type PressableStyle = PressableProps["style"];

function useRingStyle(style: PressableStyle): PressableStyle {
  const ring = useFocusRingStyle();
  // The ring goes first in the list so a control's own outline style wins.
  return useMemo(() => typeof style === "function"
    ? (state: PressableStateCallbackType): StyleProp<ViewStyle> => [ring, style(state)]
    : [ring, style], [style, ring]);
}

export const Pressable = forwardRef<View, PressableProps>(function Pressable({ style, ...rest }, ref) {
  return <RNPressable ref={ref} {...rest} style={useRingStyle(style)} />;
});
