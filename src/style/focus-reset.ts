import { type ViewStyle, type TextStyle } from "react-native";

// Suppress the keyboard focus ring on React Native Web. RNW maps the web-only `outline*`
// keys (which aren't in React Native's style types, hence the cast) to CSS; on native they
// don't exist, so this is a no-op there.
//
// Spread it ONLY onto a control that paints a visible focus state of its own (a field
// border turning `ring`, a focused cell's halo), so the two indicators never stack. Every
// other control keeps the ring the kit's Pressable themes with the palette's `ring`
// (src/style/pressable.tsx): suppressing it there leaves a keyboard user no focus
// indicator at all (WCAG 2.4.7). A full-bleed row that a clipping container would cut
// moves the ring inside with INSET_FOCUS_RING instead of hiding it. A scrollport flush
// inside a clipping card can do neither (its content covers an inset ring), so its frame
// draws the ring and the scrollport spreads this (src/style/focus-frame.tsx).
export const FOCUS_RESET = { outlineStyle: "none", outlineWidth: 0 } as unknown as ViewStyle & TextStyle;
