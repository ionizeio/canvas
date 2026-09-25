import { type ViewStyle, type TextStyle } from "react-native";

// Suppress the keyboard focus ring. On the web react-native-web writes these keys as an
// inline style, which beats the browser's own `:focus-visible` ring and the CSS hand-off's
// layered `:focus-visible` rule (styles/tokens/base.css), and a solid outline of width 0
// paints nothing. The style must be named: the browser's own ring is `auto`, which
// ignores the width, so a zero width alone still draws it. It is `solid`, not `none`,
// because React Native parses the outline keys too, on View and TextInput alike: its
// prop parser accepts only `solid`, `dotted` and `dashed`, and logs "Could not parse
// OutlineStyle" for anything else. Natively the zero width draws no outline either. React
// Native's own style types declare these keys, so they type-check without a cast and
// reject `none`.
//
// Spread it ONLY onto a control that paints a visible focus state of its own (a field
// border turning `ring`, a focused cell's halo), so the two indicators never stack. Every
// other control keeps the ring the kit's Pressable themes with the palette's `ring`
// (src/style/pressable.tsx): suppressing it there leaves a keyboard user no focus
// indicator at all (WCAG 2.4.7). A full-bleed row that a clipping container would cut
// moves the ring inside with INSET_FOCUS_RING instead of hiding it. A scrollport flush
// inside a clipping card can do neither (its content covers an inset ring), so its frame
// draws the ring and the scrollport spreads this (src/style/focus-frame.tsx).
export const FOCUS_RESET: ViewStyle & TextStyle = { outlineStyle: "solid", outlineWidth: 0 };
