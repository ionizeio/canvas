import { type ViewStyle, type TextStyle } from "react-native";
import { typeScale } from "../../style/type-scale.js";
import { type KbdSkin } from "./kbd.shared.js";

// Per-OS Kbd skins. Kbd is a "Shared" treatment: neither iOS nor Material 3 ships a
// native keyboard-key cap, so all three platforms render ONE look: Dark Factory's key
// cap (a hairline-bordered, muted-fill 20px cap with its 6px key corner and a small bold
// label, the density of its other small labels). The iOS and Android skins therefore
// reference the SAME values as the web skin; the token-driven surface (border + muted
// fill) and label color live in kbd.shared.tsx.
//
// Manrope has no modifier glyphs (⌘ ⇧ ⌥ ⌃ ↵), so a cap draws them in the platform's
// fallback face; the kit's Icon set has only ⌘ of them, and one icon among text glyphs
// would mix two drawing methods in one chord.

// The key-cap box: a centered row, fixed cap height, a minimum width so a single glyph
// still reads as a key, Dark Factory's 6px key corner (its `radius.key`), a hairline
// border, and snug horizontal padding.
const CAP_BOX: ViewStyle = {
  flexDirection: "row",
  height: 20,
  minWidth: 20,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  borderWidth: 1,
  paddingHorizontal: 5,
};

// The key label: Dark Factory's micro size (10.5/14) in bold, as its small counts and
// tags are set.
const LABEL_TYPE: TextStyle = { ...typeScale.micro, fontWeight: "700" };

// The chord wrapper: a centered row that lays out each cap and its "+" separator with
// a snug gap (spacing-1, matching the docs' old Row `tight`). A sequence widens this
// gap in the shell.
const CHORD_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// Web: Dark Factory's key cap (the search field's "⌘ K" hint, Command's shortcuts).
export const webSkin: KbdSkin = {
  capBox: CAP_BOX,
  labelType: LABEL_TYPE,
  chordRow: CHORD_ROW,
};

// Shared treatment: iOS and Android render the identical web look (no native keycap).
export const iosSkin: KbdSkin = webSkin;
export const androidSkin: KbdSkin = webSkin;
