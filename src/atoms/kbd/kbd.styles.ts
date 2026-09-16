import { type ViewStyle, type TextStyle } from "react-native";
import { type KbdSkin } from "./kbd.shared.js";

// Per-OS Kbd skins. Kbd is a "Shared" treatment: neither iOS nor Material 3 ships a
// native keyboard-key cap, so all three platforms render ONE look — the Riskora key cap
// (a hairline-bordered, muted-fill 24px cap with the 6px corner and small medium text).
// The iOS and Android skins therefore reference the SAME values as the web skin; the
// token-driven surface (border + muted fill) and label color live in kbd.shared.tsx.

// The key-cap box: a centered row, fixed cap height, a minimum width so a single glyph
// still reads as a key, the 6px corner, a hairline border, and snug horizontal padding.
const CAP_BOX: ViewStyle = {
  flexDirection: "row",
  height: 24,
  minWidth: 24,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  borderWidth: 1,
  paddingHorizontal: 6,
};

// The key label: small, medium-weight text.
const LABEL_TYPE: TextStyle = { fontSize: 12, lineHeight: 16, fontWeight: "500" };

// The chord wrapper: a centered row that lays out each cap and its "+" separator with
// a snug gap (spacing-1, matching the docs' old Row `tight`). A sequence widens this
// gap in the shell.
const CHORD_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 4 };

// Web: the Riskora key cap (the search field's "⌘ K" hint).
export const webSkin: KbdSkin = {
  capBox: CAP_BOX,
  labelType: LABEL_TYPE,
  chordRow: CHORD_ROW,
};

// Shared treatment: iOS and Android render the identical web look (no native keycap).
export const iosSkin: KbdSkin = webSkin;
export const androidSkin: KbdSkin = webSkin;
