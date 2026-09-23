import { alpha, tabularNums, type ColorTokens, type TextStyle } from "../../style/index.js";
import { type ProgressSkin, type Size } from "./progress.shared.js";

// Co-located Progress skins, one per platform, all driven by the brand tokens (passed in
// from useTheme so they follow light/dark). The BRAND survives on every platform: the
// active fill is always the brand `primary`, never a platform default. Only the native
// SHAPE of the bar (track thickness, end radius, and the inactive-track tone) changes per
// OS, matched to each platform's real progress reference:
//
//   iOS (UIProgressView / SwiftUI ProgressView, iOS 27 kit Progress Indicators, Table
//     View Row symbol): a THIN ~4pt track with FULLY ROUNDED ends (radius = height/2 → a
//     capsule). The inactive track is a NEUTRAL GRAY system fill — rgba(120,120,120,0.2)
//     in Light, rgba(120,120,128,0.36) (Fills/Dark/1 Primary) in Dark — never a tint of
//     the progress color; only the fill carries the accent.
//   Android (Material 3 linear progress indicator): a 4dp track, fully rounded ends, the
//     inactive track on the `secondary`/container tone (the secondary-container mapping),
//     plus the M3 segmented anatomy: a 4dp GAP between the active indicator and the
//     track, and the 4x4dp stop indicator dot in the active color at the trailing edge
//     (rendered by the shell via trackGap/stopIndicator; determinate only, per M3).
//   Web: the Riskora meter: a chunkier FULLY ROUNDED track (12px at the base size) on
//     the soft `muted` panel fill, with the brand `primary` fill.

// iOS: a thin 4pt bar across all sizes, nudged up/down a hair by the size axis so `small`
// and `large` still read as distinct without ever losing the hairline iOS feel.
const IOS_HEIGHT: Record<Size, number> = { small: 3, base: 4, large: 6 };
// Fully rounded ends (capsule): radius = height / 2.
const IOS_RADIUS: Record<Size, number> = { small: 1.5, base: 2, large: 3 };

// Android (M3): the M3 linear indicator is 4dp; the size axis steps it 3/4/8 so the axis
// is meaningful while the default stays on the M3 4dp spec.
const ANDROID_HEIGHT: Record<Size, number> = { small: 3, base: 4, large: 8 };
// M3 rounds the ends fully (radius = height / 2).
const ANDROID_RADIUS: Record<Size, number> = { small: 1.5, base: 2, large: 4 };

// Web (shadcn/Radix): h-2 (8px) default, fully rounded; the size axis steps the thickness
// while keeping the rounded-full ends.
const WEB_HEIGHT: Record<Size, number> = { small: 8, base: 12, large: 20 };
const WEB_RADIUS: Record<Size, number> = { small: 4, base: 6, large: 10 };

// Header type shared across every platform (the label is brand type, not a platform face,
// matching Checkbox/Radio/Switch). The canonical scale: the title line is 14/20 medium
// foreground; the description sits one step below at 12/16 muted; the trailing percent
// readout tracks the title line (14/20) in the muted tone with tabular figures so the
// digits do not jitter as the value ticks. Every skin points at these, so all three
// platforms share the header type while keeping their own bar shape.
function label(t: ColorTokens): TextStyle {
  return { fontWeight: "500", flexShrink: 1, color: t.foreground, fontSize: 14, lineHeight: 20 };
}
function description(t: ColorTokens): TextStyle {
  return { color: t["muted-foreground"], fontSize: 12, lineHeight: 16 };
}
function valueReadout(t: ColorTokens): TextStyle {
  return { color: t["muted-foreground"], fontSize: 14, lineHeight: 20, ...tabularNums() };
}

export const iosSkin: ProgressSkin = {
  height: IOS_HEIGHT,
  radius: IOS_RADIUS,
  // iOS trackTint: a NEUTRAL translucent system fill, never a wash of the progressTint.
  // The iOS 27 kit track is rgba(120,120,120,0.2) in Light and rgba(120,120,128,0.36) in
  // Dark; a 25% wash of the neutral `muted-foreground` token (#71717b light / #9f9fa9
  // dark) lands on both effective grays while staying on the theme's neutral ramp.
  trackColor: (t: ColorTokens) => alpha(t["muted-foreground"], 0.25),
  fillColor: (t: ColorTokens) => t.primary,
  label,
  description,
  valueReadout,
  indeterminateWidth: 0.3,
};

export const androidSkin: ProgressSkin = {
  height: ANDROID_HEIGHT,
  radius: ANDROID_RADIUS,
  // M3 inactive track = secondary container; the `secondary` token is the closest
  // semantic surface in light and dark. Active indicator + stop indicator = primary.
  trackColor: (t: ColorTokens) => t.secondary,
  fillColor: (t: ColorTokens) => t.primary,
  label,
  description,
  valueReadout,
  indeterminateWidth: 0.35,
  // M3 measurements (m3.material.io/components/progress-indicators/specs): a 4dp gap
  // between the active indicator's trailing edge and the inactive track, and the 4x4dp
  // stop indicator dot at the track's trailing edge. The shell renders both.
  trackGap: 4,
  stopIndicator: true,
};

export const webSkin: ProgressSkin = {
  height: WEB_HEIGHT,
  radius: WEB_RADIUS,
  // Riskora: the soft panel fill as the inactive track, the brand primary as the fill.
  trackColor: (t: ColorTokens) => t.muted,
  fillColor: (t: ColorTokens) => t.primary,
  label,
  description,
  valueReadout,
  indeterminateWidth: 0.3,
};
