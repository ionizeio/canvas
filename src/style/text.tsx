// The kit's Text and TextInput primitives: React Native's own, with the theme's
// registered typefaces applied. Every kit label renders through these (components
// import Text/TextInput from src/style/primitives, which re-exports them), which is
// what lets ONE `fonts` prop on the ThemeProvider put the brand face on every
// component without a fontFamily at any call site.
//
// The rule per node: a style that names no fontFamily gets the theme's `sans` face
// for its weight; a style that asks for the kit's monospace alias (`MONO_FONT`)
// gets the theme's `mono` face; any other explicit fontFamily is the caller's and
// is left alone. When the theme registered no faces the style passes through
// untouched (no flatten, no allocation), so an app that never opts in pays nothing.

import { forwardRef, useMemo } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { resolveFontFace, type ThemeFonts } from "./fonts.js";
import { MONO_FONT } from "./mono.js";
import { useTheme } from "./theme.js";

/**
 * Apply the theme's faces to a text style. Exported for the few components that
 * paint text through something other than Text (an SVG label, a native module).
 */
export function fontStyle(style: StyleProp<TextStyle>, fonts: ThemeFonts): StyleProp<TextStyle> {
  if (!fonts.sans && !fonts.mono) return style;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = flat?.fontFamily;
  const faces = family == null ? fonts.sans : family === MONO_FONT ? fonts.mono : undefined;
  const face = resolveFontFace(faces, flat?.fontWeight);
  if (!face) return style;
  if (!face.dropWeight) return [style, { fontFamily: face.fontFamily }];
  // The face carries its weight: rebuild the flat style without fontWeight, since a
  // later `{ fontWeight: undefined }` entry would not unset it on every platform.
  const { fontWeight: _weight, ...rest } = flat ?? {};
  return { ...rest, fontFamily: face.fontFamily };
}

function useFontStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const { fonts } = useTheme();
  return useMemo(() => fontStyle(style, fonts), [style, fonts]);
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={useFontStyle(style)} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={useFontStyle(style)} />;
});
