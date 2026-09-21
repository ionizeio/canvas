import { type ReactNode, type RefObject } from "react";
import { type TextInput as RNTextInput } from "react-native";
import { View, Pressable, Text, StyleSheet, type ColorTokens, type StyleProp, type ViewStyle } from "../../style/index.js";
import { useOverlaySide } from "../../style/anchored-overlay.js";
import type { AutocompleteSkin, Size } from "./autocomplete.styles.js";

// The QUERY ECHO: while the suggestion list rests over the field (the glass hand-off,
// popup-handoff.tsx), the field's material and text are hidden under the pane, so the
// text the user is typing would be too. The pane therefore carries the field's own
// line at the top of the list (at the bottom, for a list that opens above the field):
// the query, or the value, or the muted placeholder, in the field's typography and
// on the field's text line, with the disclosure chevron in the field's own trailing
// gutter. It is born inside the drop with the rows, scales and sharpens with them,
// and ghosts with them on a dismiss; the field's own text is back at the snap. The
// editor underneath keeps its focus and takes every keystroke; the echo is a picture
// of it, hidden from assistive technology (the combobox and its toggle stay the
// accessible controls), and a press on it hands editing focus back to the editor
// (a pointer press on the pane blurs the editor on the web), while a press on its
// chevron closes the list as the field's chevron does. Solid mode, Reduce Motion and
// the inline fallback render no echo: the field stays visible beside its list there.
//
// The echo's row is laid out from the two skins' own metrics so the text lands
// where the field's is: the pane's top is the field's top (`coverStandoff`), so the
// row is the field's height less the card's top padding and border on both sides
// (centred text at the field's text line), and its side paddings are the field's
// gutter and border less the card's.

const SIDES = ["Left", "Right"] as const;

function edge(style: Record<string, unknown>, property: "padding" | "borderWidth" | "border", side: "Top" | "Left" | "Right"): number {
  const specific = style[property === "borderWidth" ? `border${side}Width` : `${property}${side}`];
  if (typeof specific === "number") return specific;
  const axis = side === "Top" ? "Vertical" : "Horizontal";
  const along = style[`${property}${axis}`];
  if (typeof along === "number") return along;
  const all = style[property];
  return typeof all === "number" ? all : 0;
}

/** The echo row's box: the field's line inside the card, from the field's and the card's own metrics. */
export function echoRow(field: StyleProp<ViewStyle>, card: StyleProp<ViewStyle>): ViewStyle {
  const f = (StyleSheet.flatten(field) ?? {}) as Record<string, unknown>;
  const c = (StyleSheet.flatten(card) ?? {}) as Record<string, unknown>;
  const height = typeof f.height === "number" ? f.height : 0;
  const cardTop = edge(c, "padding", "Top") + edge(c, "borderWidth", "Top");
  const row: ViewStyle = {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
    height: Math.max(0, height - 2 * cardTop),
  };
  for (const side of SIDES) {
    const inset = edge(f, "padding", side) + edge(f, "borderWidth", side) - edge(c, "padding", side) - edge(c, "borderWidth", side);
    row[`padding${side}`] = Math.max(0, inset);
  }
  return row;
}

interface QueryEchoProps {
  /** Whether the hand-off runs (the list rests over the field); otherwise the children render alone. */
  active: boolean;
  skin: AutocompleteSkin;
  tokens: ColorTokens;
  size: Size;
  /** The field's text: the query, else the value, else empty (the placeholder shows). */
  text: string;
  placeholder: string;
  /** The field's box style (its height, gutter and border) and the list card's (its padding and border). */
  field: StyleProp<ViewStyle>;
  card: StyleProp<ViewStyle>;
  /** The editor under the pane: a press on the echo hands editing focus back to it. */
  editor: RefObject<RNTextInput | null>;
  onClose: () => void;
  /** The option list; the echo sits on the field's side of it. */
  children: ReactNode;
}

const ECHO_TEXT: ViewStyle = { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", alignSelf: "stretch" };

export function QueryEcho({ active, skin, tokens, size, text, placeholder, field, card, editor, onClose, children }: QueryEchoProps) {
  // The list opens below its field by default and above it when the room below is
  // short; the echo stays on the field's side either way.
  const side = useOverlaySide();
  if (!active) return <>{children}</>;
  const echo = (
    <View
      style={echoRow(field, card)}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="autocomplete-echo"
    >
      <Pressable style={ECHO_TEXT} onPress={() => editor.current?.focus()} accessible={false} focusable={false} tabIndex={-1}>
        <Text numberOfLines={1} style={skin.fieldText(tokens, size, text === "")}>{text === "" ? placeholder : text}</Text>
      </Pressable>
      <Pressable style={skin.echoChevron(size)} onPress={onClose} accessible={false} focusable={false} tabIndex={-1}>
        <Text style={skin.chevron(tokens, size)}>▾</Text>
      </Pressable>
    </View>
  );
  return side === "above" ? <>{children}{echo}</> : <>{echo}{children}</>;
}
