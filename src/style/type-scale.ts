import type { TextStyle } from "react-native";

// Dark Factory's named text styles (its theme `typeScale`, vendored at
// tools/darkfactory/theme.json) as React Native text styles: the one table the kit's
// Dark Factory surfaces read their type from. Internal, not re-exported.
//
// Two conversions from the source. Tracking goes from em to px at the style's size.
// Every line height is the size times Dark Factory's ratio rounded UP to a whole
// pixel, because Android ceils a line height to whole pixels
// (react-native CustomLineHeightSpan), so a fractional value would lay text out
// differently there than on iOS and the web. The 9.5px eyebrow and stage label take
// the kit's 10px source floor (test/design-rules-source.test.ts), the smallest label
// either platform draws.
//
// `featuredTitle` is the one style that is not in Dark Factory's scale: Argus sets its
// featured card title (20, bold, -0.01em) inline, and it is the step between the
// dialog title and the display size that the Typography h1 role needs.
//
// test/df-type-scale.test.ts derives this table from the vendored source and fails on
// any hand edit.
export const typeScale = {
  display: { fontSize: 24, lineHeight: 27, fontWeight: "700", letterSpacing: -0.48 },
  statValue: { fontSize: 18, lineHeight: 20, fontWeight: "800", letterSpacing: -0.36 },
  metricValue: { fontSize: 18, lineHeight: 22, fontWeight: "700", letterSpacing: -0.18 },
  dialogTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.17 },
  drawerTitle: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  heading: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  subheading: { fontSize: 13.5, lineHeight: 18, fontWeight: "700" },
  body: { fontSize: 12.5, lineHeight: 19, fontWeight: "500" },
  bodyStrong: { fontSize: 12.5, lineHeight: 19, fontWeight: "700" },
  label: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  small: { fontSize: 11.5, lineHeight: 17, fontWeight: "600" },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
  micro: { fontSize: 10.5, lineHeight: 14, fontWeight: "600" },
  tag: { fontSize: 10, lineHeight: 13, fontWeight: "700" },
  eyebrow: { fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  eyebrowLg: { fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase" },
  stageLabel: { fontSize: 10, lineHeight: 13, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" },
  featuredTitle: { fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.2 },
} as const satisfies Record<string, TextStyle>;

export type TypeStyle = keyof typeof typeScale;
