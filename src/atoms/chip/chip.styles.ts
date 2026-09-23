import { type ViewStyle } from "react-native";
import { platformMinTarget } from "../../style/index.js";
import { typeScale } from "../../style/type-scale.js";
import { type ChipSkin } from "./chip.shared.js";

// Co-located Chip skins. The tint colors live in the shell; each skin carries its
// platform's shape, sizing, label type, and the two color choices that differ by
// platform (whether an idle chip draws its outline, and what a selected chip fills with).
//
//   Web and iOS: Dark Factory's Chip, a borderless pill (its 5px by 11px inset: 4 by 10
//     inside a 1px border that stays transparent unless the chip is `outline`), an 11px
//     bold label, 7px between elements; a selected chip is the solid violet `primary`.
//     iOS ships no chip control, so its skin is the web skin; the remove control still
//     pads out to the 44pt HIG minimum through platformMinTarget.
//   Android (Material 3 chips, m3.material.io/components/chips/specs): a 32dp
//     container with an 8dp corner radius (NOT a pill), 16dp side padding that
//     drops to 8dp beside an icon (`sidePadding`, resolved per side in the shell),
//     8dp between elements, a label-large label (14/20, 500, tracking 0), an 18dp
//     remove glyph with a 48dp close target, the idle chip's 1dp outline, and the
//     selected filter-chip anatomy (the tonal fill, a leading 18dp checkmark, the outline
//     dropped) via `outlined`, `tonalSelected` and `selectedCheckSize`.
//
// A chip is a compact tag, so it has ONE size per platform; there is no size axis.

// The structure every skin shares. Horizontal padding is per-skin; Android resolves
// 16dp/8dp per side in the shell. The chip is HUG: the shell appends `useHugStyle()`
// (src/style/sizing.ts) at the root, so it keeps its content width in a stretching
// Column without pinning a Row child to the top the way a static alignSelf would.
const shell: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
};

// Dark Factory's chip pill.
const pill: ViewStyle = {
  ...shell,
  gap: 7,
  borderRadius: 9999,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

// The remove glyph, and the touch area it pads out to: the platform minimum on a native
// build (biased away from the label, on the left), the established pointer target on
// the web, where a mouse needs no minimum.
const REMOVE = 12;
const MIN_TARGET = platformMinTarget();
const removeHitSlop = MIN_TARGET == null
  ? { top: 15, bottom: 15, left: 8, right: 15 }
  : { top: (MIN_TARGET - REMOVE) / 2, bottom: (MIN_TARGET - REMOVE) / 2, left: 8, right: MIN_TARGET - REMOVE - 8 };

export const webSkin: ChipSkin = {
  base: pill,
  labelType: { ...typeScale.caption, fontWeight: "700" },
  removeSize: REMOVE,
  removeHitSlop,
};

// iOS ships no chip control: the native skin is the web skin.
export const iosSkin: ChipSkin = webSkin;

// Material 3 chips (assist/filter/input/suggestion) share a 32dp container with an
// 8dp corner radius (NOT a full pill), a 1dp outline, 16dp side padding (8dp beside
// an icon), and 8dp between elements. Horizontal padding is deliberately absent
// here: the shell drives paddingStart/End from `sidePadding` below.
const androidBase: ViewStyle = {
  ...shell,
  gap: 8, // M3 8dp padding between elements
  borderRadius: 8, // M3 8dp corner (not a pill)
  paddingVertical: 6, // 20 label lineHeight + 2*6 = 32dp container height
  // Bound the press ripple (state layer) to the rounded container; this skin is
  // shadow-free, so the clip is set directly here per src/style/ripple.ts.
  overflow: "hidden",
};

export const androidSkin: ChipSkin = {
  base: androidBase,
  // M3 chip label = label-large: 14/20, medium (500), tracking 0.
  labelType: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0 },
  removeSize: 18, // M3 trailing (close) icon 18dp
  // 18dp glyph + 15/15 vertical, 8/22 horizontal slop = the M3 48dp minimum close
  // target, biased away from the label (left).
  removeHitSlop: { top: 15, bottom: 15, left: 8, right: 22 },
  sidePadding: { text: 16, icon: 8 }, // M3 16dp side padding, 8dp beside an icon
  selectedCheckSize: 18, // M3 selected filter chip: leading 18dp checkmark
  outlined: true, // M3 idle chips carry a 1dp outline
  tonalSelected: true, // M3 selected filter chip: the tonal fill, not a solid one
};
