import { type ViewStyle, type TextStyle } from "react-native";
import { surfaceRipple, shape, type ColorTokens } from "../../style/index.js";
import { type ListboxSkin, type Size } from "./listbox.shared.js";

// Co-located Listbox skins, one per platform. Layout-only fragments are static
// objects; anything that reads a color is a function of the active tokens (so the
// bordered surface, the selected/press fill, and the label/detail colors follow
// light/dark via tokens.card/accent).
//
// Neither iOS nor Material 3 has a listbox control (selecting one option from a
// list is a pop-up button / picker menu on iOS, the exposed dropdown menu on
// Android), so the row look (Catalyst's listbox) is the same everywhere and the
// androidSkin is the SAME object as webSkin. The iosSkin differs only in how a row
// marks its selection: iOS lists mark every chosen row with a trailing check in the
// accent, in single and multi select alike, where the web and Android lead with a
// checkmark gutter or the selection Checkbox (the design language's "one job,
// different control"). The Android ripple is wired here (`android_ripple` is a
// harmless no-op on iOS/web), and no opacity dim is applied (the accent press fill
// carries the press feedback). Multi-select on the web and Android composes each
// platform's selection Checkbox indicator, preserving its native shape and size.

// A bordered container reads as a content card: the control corner, hairline border, solid
// `card` fill, and an 8px inset so rows don't touch the edge. Listbox is an inline,
// in-page list (the CONTENT layer, not a floating overlay), so it uses the solid `card`
// token, NOT `popover`: `card` is the content layer's own fill. Under glass the shell
// paints the bordered card through a CONTENT-layer GlassPane (the denser, legible-first
// content tint, never the floating functional material), and this fill is what solid
// mode, Reduce Transparency and Increase Contrast fall back to.
function containerBordered(tokens: ColorTokens): ViewStyle {
  return { borderRadius: shape.web.control, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 8 };
}

// Each row: a horizontal Pressable with a leading control, the label/detail
// stack, and (added by the shell) a subtle press-state fill. Size adds the
// vertical padding.
// overflow:hidden clips the Material ripple to the rounded outline (borderRadius)
// so the bounded ripple does not bleed past the rounded corners on Android.
const rowBase: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, overflow: "hidden" };

// Per-row padding by size: small reads like the legacy h-8 trigger, medium like
// h-9, large like h-10.
const rowSize: Record<Size, ViewStyle> = {
  small: { paddingHorizontal: 12, paddingVertical: 8 },
  medium: { paddingHorizontal: 12, paddingVertical: 10 },
  large: { paddingHorizontal: 12, paddingVertical: 12 },
};

// The accent fill used for a selected single-select row and the press state.
function rowSelected(tokens: ColorTokens): ViewStyle {
  return { backgroundColor: tokens.accent };
}

// Single-select checkmark column: a fixed-width gutter reserved on every row so
// labels stay aligned whether or not the row is selected.
function checkmark(tokens: ColorTokens): TextStyle {
  return { width: 16, fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground };
}

// The label/detail stack grows to fill the remaining row width.
const textStack: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// Label type per size (small is smaller; medium and large share the body size).
const LABEL_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 },
  medium: { fontSize: 14, lineHeight: 20 },
  large: { fontSize: 14, lineHeight: 20 },
};

function label(tokens: ColorTokens, size: Size): TextStyle {
  return { color: tokens.foreground, ...LABEL_TYPE[size] };
}

function detail(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

// The web skin, which Android shares: a leading checkmark gutter and a filled chosen
// row in single-select. Multi-select's platform-specific Checkbox indicator is
// supplied by the entry file, outside this row skin. The ripple stays set (a no-op
// off Android) and pressedOpacity is null (the accent press fill is the feedback).
export const webSkin: ListboxSkin = {
  containerBordered,
  rowBase,
  rowSize,
  rowSelected,
  mark: { kind: "gutter", checkmark },
  textStack,
  label,
  detail,
  ripple: (tokens) => surfaceRipple(tokens),
  pressedOpacity: null,
};

// iOS: the same rows, marked the iOS way: a semibold check in the accent at the row's
// trailing edge, at the label's own size, on every chosen row. The press still fills
// the row (the iOS cell highlight); being chosen does not.
export const iosSkin: ListboxSkin = {
  ...webSkin,
  mark: { kind: "trailing", check: (tokens, size) => ({ fontWeight: "600", color: tokens.primary, ...LABEL_TYPE[size] }) },
};
export const androidSkin: ListboxSkin = webSkin;
