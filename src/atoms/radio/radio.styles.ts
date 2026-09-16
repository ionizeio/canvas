import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, alpha } from "../../style/index.js";
import { type RadioSkin, type Size } from "./radio.shared.js";
import {
  type CardSkin,
  cardBase,
  webSkin as webCardSkin,
  iosSkin as iosCardSkin,
  androidSkin as androidCardSkin,
} from "../../molecules/card/card.styles.js";

// Co-located Radio skins, one per platform, all driven by the brand tokens (passed
// in from useTheme so they follow light/dark and the glass surface). The BRAND
// survives on every platform (the selected ring + dot are always the indigo
// `primary`, never a platform default), and only the native SHAPE, sizing, border
// weight, and press feedback change per OS:
//   iOS (HIG): no native radio; the de-facto ring + filled center dot — a ~20pt
//     circle, a 1.5px border when empty, brand ring + ~45% inner dot when selected,
//     instant; press = opacity dim (~0.8).
//   Android (Material 3): a 20dp outer ring (2dp border), brand ring + ~10dp solid
//     inner dot when selected; press = android_ripple over a 40dp state layer;
//     disabled opacity 0.38.
//   Web: the established Canvas look (the current radio, lifted verbatim) —
//     14/16/20px ring per size, 2px border, brand ring + 6/8/10px primary dot.

// Ring diameter per size, per platform family. Default is the form control; small
// pairs with dense rows, large with touch-first layouts.
const WEB_RING: Record<Size, number> = { small: 16, default: 20, large: 24 };
const IOS_RING: Record<Size, number> = { small: 20, default: 22, large: 24 };
const ANDROID_RING: Record<Size, number> = { small: 18, default: 20, large: 22 };

// Inner dot diameter per size, per platform family. Web keeps ~half the ring; iOS
// runs ~45% of the ring; Android uses the M3 ~50% dot (~10dp at the default size).
// EVERY dot is even because every ring above is even: an odd dot cannot land on the
// pixel grid when centered in an even ring, so it renders a half-pixel down-right with
// soft edges (worse the higher the pixel density). Keep new dot sizes even to match.
const WEB_DOT: Record<Size, number> = { small: 6, default: 8, large: 10 };
const IOS_DOT: Record<Size, number> = { small: 8, default: 10, large: 10 };
const ANDROID_DOT: Record<Size, number> = { small: 10, default: 10, large: 12 };

// Label type per size (shared across platforms; the label is brand type, not a
// platform face). Matches the original Canvas label scale.
const LABEL_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 12, lineHeight: 16 }, // text-xs
  default: { fontSize: 14, lineHeight: 20 }, // text-sm
  large: { fontSize: 16, lineHeight: 24 }, // text-base
};

// The label beside the control. Medium weight; dimmed to muted when disabled. Shared
// across every platform. `flexShrink` lets a long label-only radio wrap within the
// row instead of forcing it wider (matches Checkbox).
function label(tokens: ColorTokens, size: Size, disabled: boolean): TextStyle {
  return {
    fontWeight: "500",
    flexShrink: 1,
    color: disabled ? tokens["muted-foreground"] : tokens.foreground,
    ...LABEL_TYPE[size],
  };
}

// Description type per size — one step below the label, matching the kit's other
// title+description controls (Switch). Muted secondary color on every platform.
const DESCRIPTION_TYPE: Record<Size, TextStyle> = {
  small: { fontSize: 11, lineHeight: 15 },
  default: { fontSize: 12, lineHeight: 16 },
  large: { fontSize: 14, lineHeight: 20 },
};

// The muted secondary line under the label. The whole row already dims when
// disabled, so the description keeps the muted token in either state. Shared across
// every platform (brand secondary type, not a platform face).
function description(tokens: ColorTokens, size: Size, _disabled: boolean): TextStyle {
  return { color: tokens["muted-foreground"], ...DESCRIPTION_TYPE[size] };
}

// Ring base: a perfect circle, centered, nudged down (`marginTop: 3`) to align with
// the label's first line. Per-platform border weight is layered on by each skin.
function ringBase(box: number, nudge: boolean): ViewStyle {
  return {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    width: box,
    height: box,
    backgroundColor: "transparent",
    ...(nudge ? { marginTop: 3 } : null),
  };
}

// Dot base: a centered circle. Color is the brand primary on every platform.
function dotBase(box: number): ViewStyle {
  return { borderRadius: 9999, width: box, height: box };
}

// ---------- `card` mode chrome (derived from the kit Card skin) ----------
// A card-style radio wraps the WHOLE control in a selectable Card surface, so the
// option reads as a tappable tile rather than a bare ring + label. Instead of
// hand-rolling a border/tint (which would drift from Card), it reuses the matching
// platform Card skin: the OUTLINED (bordered) surface plus Card's per-OS radius/curve
// and padded inset, and — when the radio is checked — Card's OWN `selected` treatment
// (primary border + soft primary tint, the exact same recolor `<Card selected>`
// applies). So a card-style radio and a selected Card stay in lockstep on every OS.
function cardChrome(card: CardSkin, tokens: ColorTokens, checked: boolean): ViewStyle {
  return {
    ...cardBase, // borderWidth: 1 (the shared Card hairline)
    borderRadius: card.radius, // 8 web / 12 iOS / 12 Android
    ...(card.curve ? { borderCurve: card.curve } : null), // iOS continuous corner curve
    ...card.surface(tokens, "flat"), // the M3 OUTLINED / Light bordered surface: tokens.border on tokens.card
    ...card.padded, // per-OS padded inset (24 web/iOS, 16 Android)
    ...(checked
      ? // Card's own `selected` recolor: primary border + soft primary tint. The border
        // WIDTH is unchanged, so selecting never shifts content. Identical to Card.
        { borderColor: tokens.primary, backgroundColor: alpha(tokens.primary, 0.05) }
      : null),
  };
}

// ---------- Web: the established Canvas look ----------
export const webSkin: RadioSkin = {
  ring: (t, size, checked, nudge) => ({
    ...ringBase(WEB_RING[size], nudge),
    borderWidth: 2,
    borderColor: checked ? t.primary : t.input,
  }),
  dot: (t, size) => ({ ...dotBase(WEB_DOT[size]), backgroundColor: t.primary }),
  label,
  description,
  card: (t, checked) => cardChrome(webCardSkin, t, checked),
  disabledOpacity: 0.5,
  pressedOpacity: 0.9,
  ripple: null,
};

// ---------- iOS (HIG): ~20pt ring, 1.5px border, dim on press ----------
export const iosSkin: RadioSkin = {
  ring: (t, size, checked, nudge) => ({
    ...ringBase(IOS_RING[size], nudge),
    borderWidth: 1.5, // hairline-plus when empty; the ring stays visible when selected
    borderColor: checked ? t.primary : t.input,
  }),
  dot: (t, size) => ({ ...dotBase(IOS_DOT[size]), backgroundColor: t.primary }),
  label,
  description,
  card: (t, checked) => cardChrome(iosCardSkin, t, checked),
  disabledOpacity: 0.5,
  pressedOpacity: 0.8,
  ripple: null,
};

// ---------- Android (Material 3): 20dp ring, 2dp border, ~10dp dot, ripple ----------
export const androidSkin: RadioSkin = {
  ring: (t, size, checked, nudge) => ({
    ...ringBase(ANDROID_RING[size], nudge),
    borderWidth: 2,
    borderColor: checked ? t.primary : t["muted-foreground"],
  }),
  dot: (t, size) => ({ ...dotBase(ANDROID_DOT[size]), backgroundColor: t.primary }),
  label,
  description,
  card: (t, checked) => cardChrome(androidCardSkin, t, checked),
  disabledOpacity: 0.38, // M3 disabled opacity
  pressedOpacity: null, // Android uses a ripple instead
  ripple: (t) => ({ color: t.primary, borderless: true, radius: 20 }), // 40dp state layer
};
