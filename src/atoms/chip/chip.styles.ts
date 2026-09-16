import { type ViewStyle } from "react-native";
import { type ChipSkin } from "./chip.shared.js";

// Co-located Chip skins. The semantic tint colors live in the shell; each skin
// carries its platform's shape, sizing, and label type.
//
//   Web: the Riskora pill (26px tall, a 10/4 inset), fully rounded.
//   iOS: the established compact tag pill (~20px tall, GitHub/Linear tag scale),
//     fully rounded, with the label weight bumped to SF 600; tracking stays 0 (the
//     SF Pro Text value at 12pt).
//   Android (Material 3 chips, m3.material.io/components/chips/specs): a 32dp
//     container with an 8dp corner radius (NOT a pill), 16dp side padding that
//     drops to 8dp beside an icon (`sidePadding`, resolved per side in the shell),
//     8dp between elements, a label-large label (14/20, 500, tracking 0), an 18dp
//     remove glyph with a 48dp close target, and the selected filter-chip anatomy
//     (leading 18dp checkmark, outline drops) via `selectedCheckSize`.
//
// A chip is a compact tag, so it has ONE size per platform; there is no size axis.

// The structure every skin shares. Horizontal padding is per-skin: the web/iOS
// pill pads a fixed 8px; Android resolves 16dp/8dp per side in the shell.
// The chip is HUG: the shell appends `useHugStyle()` (src/style/sizing.ts) at the
// root, so it keeps its content width in a stretching Column without pinning a Row
// child to the top the way a static alignSelf would.
const shell: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
};

// The iOS compact pill.
const pill: ViewStyle = {
  ...shell,
  gap: 4,
  borderRadius: 9999,
  paddingHorizontal: 8,
  paddingVertical: 1,
};

// The Riskora pill: the same anatomy at the dashboard's roomier inset.
const webPill: ViewStyle = { ...pill, gap: 6, paddingHorizontal: 10, paddingVertical: 4 };

export const webSkin: ChipSkin = {
  base: webPill,
  labelType: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  removeSize: 12,
  // The established web target; the 44pt/48dp minimums are a native-platform rule.
  removeHitSlop: { top: 15, bottom: 15, left: 8, right: 15 },
};

export const iosSkin: ChipSkin = {
  base: pill,
  // SF Pro Text tracking at 12pt is 0 (-0.08 is the 13pt value).
  labelType: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0 },
  removeSize: 12,
  // 12px glyph + 16/16 vertical, 8/24 horizontal slop = a 44x44pt HIG target,
  // biased away from the label (left).
  removeHitSlop: { top: 16, bottom: 16, left: 8, right: 24 },
};

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
};
