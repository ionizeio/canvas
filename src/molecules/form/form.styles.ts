import { type ViewStyle, type TextStyle } from "react-native";
import { widths, type ColorTokens } from "../../style/index.js";
import { typeScale } from "../../style/type-scale.js";
import { type FormSkin } from "./form.shared.js";

// Per-OS Form skins. Form is a "Light" platform treatment: ONE structure (the
// stitched rows, the optional two-column flow, the actions row) lives in
// form.shared.tsx; only the section-heading TYPE, the vertical RHYTHM (the stack
// and grid gaps, where the grid turns two-up) and the look of the composed submit
// Button shift per OS.
//
// Neither iOS nor Android ships a native "form" control (PLATFORM-REFERENCES.md):
//   - Web: Dark Factory's form (its MintDialog and SectionHeading): rows 18 apart,
//     the two-up grid 14 apart, a `heading` section title over a 12 / 500 muted
//     line, and its hairline Cancel beside the raised primary submit, 10 apart.
//   - iOS: SwiftUI Form renders as a grouped inset list; the HIG "Entering data"
//     page is the convention reference (a touch more breathing room, SF type).
//   - Android: Material 3 has no form component; forms are composed from text
//     fields, selection controls, and buttons, so it takes the web's form. Its entry
//     still injects the Material 3 Button, so the actions keep their platform shape.
//
// The interactive parts (the composed fields, the Submit/Cancel buttons) are the
// already-skinned atoms; they bring their own per-OS fidelity (shape, press
// feedback, focus), so the Form's own skin carries only the look it asks of the submit.

// ---------- shared structural fragments (identical across platforms) ----------
// The two-column cell: a basis between a third and a half of the row (less the gap)
// puts exactly two cells on a line without measuring them (three never fit), and the
// pair then grows to share the row. A lone last cell takes the whole line, which is
// how a two-column form gives one field a full-width row (the email under the names);
// Dark Factory's AutoGrid keeps it one column wide and opts a tile into the full row
// instead, an opt-in the Form has no prop for. The stacked cell keeps its content
// basis. The floor keeps a cell from collapsing under a squeezed row. These are
// layout, not platform-varying, so they stay shared and the shell imports them directly.
export const twoUpCell: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "40%" };
export const flexAuto: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "auto" };
const CELL_FLOOR = 200;
export const twoColumnItem: ViewStyle = { minWidth: CELL_FLOOR };

// ---------- Web: Dark Factory's form ----------
// The section title is Dark Factory's `heading` (14 / 19 / 700) and its description
// the SectionHeading's meta, 12 / 500 in the muted ink at its 1.4 line height (17,
// ceiled like every line in type-scale.ts). The rows are its Dialog body's 18 apart,
// and the actions row is one more row at that rhythm (no margin of its own), its
// Cancel and submit 10 apart as in its dialog footer. Its Cancel is its `ghost` Button,
// the neutral hairline pill the kit's web Button draws for `outline` (the kit's `ghost`
// has no border), so the shell's outline Cancel is already Dark Factory's. The two-up
// grid is its AutoGrid (a 200 cell floor, 14 apart, at most two columns), so two
// columns fit from 414.
const WEB_GRID_GAP = 14;
export const webSkin: FormSkin = {
  sectionTitle: (t: ColorTokens): TextStyle => ({ ...typeScale.heading, color: t.foreground }),
  sectionDescription: (t: ColorTokens): TextStyle => ({ ...typeScale.label, fontWeight: "500", marginTop: 4, color: t["muted-foreground"] }),
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  stack: { gap: 18 },
  sectionStack: { gap: 12 },
  twoColumnGap: WEB_GRID_GAP,
  twoColumnFrom: 2 * CELL_FLOOR + WEB_GRID_GAP,
  submitButton: { raised: true },
};

// ---------- iOS (HIG "Entering data" / SwiftUI Form) ----------
// SwiftUI Form is a grouped inset list with a touch more breathing room. The brand
// survives (the `primary` submit, the foreground/muted text); only the SF type
// touches and the grouped-list rhythm change: section headings read as SF
// footnote-emphasized (13/600, tightened tracking) with a 13 secondary footnote
// description, the stack carries the grouped-list rhythm (20), and the actions row
// is an outline Cancel beside the plain primary submit, 12 apart. The two-up grid
// keeps 16 between its cells and turns two-up only past the `lg` step (512).
export const iosSkin: FormSkin = {
  sectionTitle: (t: ColorTokens): TextStyle => ({ fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: -0.08, color: t.foreground }),
  sectionDescription: (t: ColorTokens): TextStyle => ({ marginTop: 4, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] }),
  actions: { marginTop: 8, flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  stack: { gap: 20 },
  sectionStack: { gap: 12 },
  twoColumnGap: 16,
  twoColumnFrom: widths.lg + 1,
  submitButton: {},
};

// ---------- Android (Material 3: text fields + selection controls + buttons) ----------
// M3 has no form component, so Android takes the web's form (the design language's
// item 3). The entry still passes the Material 3 Button, so the outlined Cancel and the
// raised primary submit keep their M3 shape.
export const androidSkin: FormSkin = webSkin;
