import { type ViewStyle, type TextStyle } from "react-native";
import { surfaceRipple, shape, type ColorTokens } from "../../style/index.js";
import { webHover } from "../../style/hover.js";
import { primaryText } from "../../style/primary-text.js";
import { typeScale } from "../../style/type-scale.js";
import { type ListboxSkin, type Size } from "./listbox.shared.js";

// Co-located Listbox skins, one per platform. Layout-only fragments are static
// objects; anything that reads a color is a function of the active tokens (so the
// bordered surface, the press fill, and the label/detail colors follow the palette and
// the scheme).
//
// Neither iOS nor Material 3 has a listbox control (selecting one option from a
// list is a pop-up button / picker menu on iOS, the exposed dropdown menu on
// Android), so the row look is Dark Factory's menu row on every platform and the
// androidSkin is the SAME object as webSkin: bold 12.5 px labels at an 8 px corner, 2 px
// apart, the instant hover wash on the web (native pointer hover waits on the owner, so
// it goes through webHover), the chosen single-select row in the selection violet
// (`primary-text`, with the ✓ in `primary`) and no fill, where Dark Factory paints its
// selected menu row green (the design language reserves green for calls to action). The
// iosSkin differs only in how a row marks its selection: iOS lists mark every chosen row
// with a trailing check in the accent, in single and multi select alike, with a plain
// label, where the web and Android lead with a checkmark gutter or the selection Checkbox
// (the design language's "one job, different control"). The Android ripple is wired here
// (`android_ripple` is a harmless no-op on iOS/web), and no opacity dim is applied (the
// `accent` press fill carries the press feedback). Multi-select on the web and Android
// composes each platform's selection Checkbox indicator, preserving its native shape and
// size.

// A bordered container reads as Dark Factory's panel: the menu corner, hairline border,
// solid `card` fill, and an 8px inset so rows don't touch the edge. Listbox is an inline,
// in-page list (the CONTENT layer, not a floating overlay), so it uses the solid `card`
// token, NOT `popover`: `card` is the content layer's own fill. Under glass the shell
// paints the bordered card through a CONTENT-layer GlassPane (the denser, legible-first
// content tint, never the floating functional material), and this fill is what solid
// mode, Reduce Transparency and Increase Contrast fall back to.
function containerBordered(tokens: ColorTokens): ViewStyle {
  return { borderRadius: shape.web.menu, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 8 };
}

// Each row: a horizontal Pressable with a leading control, the label/detail stack, and
// (added by the shell) the press fill. Size adds the padding. overflow:hidden clips the
// Material ripple to the rounded outline so the bounded ripple does not bleed past the
// corners on Android.
const rowBase: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, overflow: "hidden" };

// Per-row padding by size: medium is Dark Factory's menu row (33 tall), small and large
// step two either way.
const rowSize: Record<Size, ViewStyle> = {
  small: { paddingHorizontal: 10, paddingVertical: 6 },
  medium: { paddingHorizontal: 10, paddingVertical: 8 },
  large: { paddingHorizontal: 10, paddingVertical: 10 },
};

// The `accent` fill of a pressed row.
function rowPressed(tokens: ColorTokens): ViewStyle {
  return { backgroundColor: tokens.accent };
}

// A resting row under the pointer: Dark Factory's wash, on the web only.
const rowHover = webHover((tokens: ColorTokens): ViewStyle => ({ backgroundColor: tokens.hover }));

// Label type per size: Dark Factory's strong body at its menu row's 1.3 line height,
// a step down and up for small and large.
const LABEL_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
  medium: { fontSize: 12.5, lineHeight: 17, fontWeight: "700" },
  large: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
};

// Single-select checkmark column: a fixed-width gutter reserved on every row so labels
// stay aligned whether or not the row is chosen; the ✓ in the selection violet.
function checkmark(tokens: ColorTokens): TextStyle {
  return { width: 14, ...LABEL_TYPE.medium, color: tokens.primary };
}

// The label/detail stack grows to fill the remaining row width.
const textStack: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

function label(tokens: ColorTokens, size: Size): TextStyle {
  return { color: tokens.foreground, ...LABEL_TYPE[size] };
}

// The second line: Dark Factory's micro caption in the muted ink.
function detail(tokens: ColorTokens): TextStyle {
  return { ...typeScale.micro, color: tokens["muted-foreground"] };
}

// The web skin, which Android shares: a leading checkmark gutter and the chosen row's
// label in the selection violet in single-select. Multi-select's platform-specific
// Checkbox indicator is supplied by the entry file, outside this row skin.
export const webSkin: ListboxSkin = {
  containerBordered,
  rowBase,
  rowSize,
  rowGap: 2,
  rowPressed,
  rowHover,
  chosenLabel: (tokens) => ({ color: primaryText(tokens) }),
  mark: { kind: "gutter", checkmark },
  textStack,
  label,
  detail,
  ripple: (tokens) => surfaceRipple(tokens),
  pressedOpacity: null,
};

// iOS: the same rows, marked the iOS way: a semibold check in the accent at the row's
// trailing edge, at the label's own size, on every chosen row, with the label plain. The
// press still fills the row (the iOS cell highlight); being chosen does not.
export const iosSkin: ListboxSkin = {
  ...webSkin,
  chosenLabel: null,
  mark: { kind: "trailing", check: (tokens, size) => ({ ...LABEL_TYPE[size], fontWeight: "600", color: tokens.primary }) },
};
export const androidSkin: ListboxSkin = webSkin;
