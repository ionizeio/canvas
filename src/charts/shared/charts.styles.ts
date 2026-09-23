import { type ViewStyle, type TextStyle } from "react-native";
import { type ColorTokens, palette, shadow, shape } from "../../style/index.js";
import { type ChartSeries, type ChartSkin } from "./types.js";

// Co-located Chart styles. Layout-only fragments are static objects; anything
// that reads a color is a function of the active tokens (so the surface follows
// light/dark). Intentional chart frames use stable content frost where supported,
// while all data ink stays crisp. Frame owners resolve capability before clearing
// their solid fill with paneStyle. Inspection flags own a separate dense material.
// The bar fill per tone is the palette-vs-token choice resolved by `barFill`.

export type Tone = "primary" | "success" | "destructive";

// --- surface ----------------------------------------------------------------

// The bordered, shadowed card surface (rounded-lg border border-border bg-card
// shadow-sm), mirroring the docs `cardCls`. In solid mode the fill is the opaque
// `card`. Keep this complete opaque recipe for capability and accessibility
// fallbacks; paneStyle clears it only when static material can actually render.
// The corner radius is supplied by the skin.
export function surface(tokens: ColorTokens, radius: number): ViewStyle {
  return {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    ...shadow("sm", tokens),
  };
}

// Surface padding by density: p-4 (compact) vs p-5 (default).
export const surfacePadCompact: ViewStyle = { padding: 16 };
export const surfacePadDefault: ViewStyle = { padding: 20 };

// --- title ------------------------------------------------------------------

// Heading: font-semibold text-card-foreground; size/inset switch by density.
export function title(tokens: ColorTokens): TextStyle {
  return { fontWeight: "600", color: tokens["card-foreground"] };
}

// mb-3 text-sm (compact) vs mb-4 text-base (default).
export const titleCompact: TextStyle = { marginBottom: 12, fontSize: 14, lineHeight: 20 };
export const titleDefault: TextStyle = { marginBottom: 16, fontSize: 16, lineHeight: 24 };

// --- bar fill ---------------------------------------------------------------

// The fill for each bar, by tone. Token primary by default; saturated palette
// hues for the success / destructive tones so the chart reads in either scheme.
export function barFill(tokens: ColorTokens, tone: Tone): string {
  if (tone === "success") return palette["green-500"];
  if (tone === "destructive") return palette["red-500"];
  return tokens.primary;
}

// --- series fill ------------------------------------------------------------

// The categorical series tokens in their fixed assignment order. Series i is
// always chart-(i+1): identity follows the series, never its rank, so removing
// a series from a chart must not repaint the survivors. Past 8 the cycle wraps
// (callers should prefer aggregating into fewer series before that point).
const SERIES_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
] as const;

/** The fill for series `i` (0-based), from the theme's chart tokens. */
export function seriesFill(tokens: ColorTokens, i: number): string {
  return tokens[SERIES_TOKENS[i % SERIES_TOKENS.length]];
}

/**
 * A series' own semantic tone, first match wins (the chart-level precedence:
 * success > destructive). Null when the series carries none, which is the
 * signal to fall through to the ramp.
 */
export function seriesTone(sr: ChartSeries): Tone | null {
  if (sr.success) return "success";
  if (sr.destructive) return "destructive";
  return null;
}

/**
 * The color for series `i`: the series' OWN semantic tone first (a series that
 * means success or failure is colored by that meaning), then the chart-level
 * tone when there is one (single-series charts), then the categorical ramp
 * position. Mirrors `rowFill`'s slot > tone > ramp resolution, and is the one
 * place the Chart family resolves a series color, so the plot, the value flag,
 * and the legend cannot drift apart.
 */
export function seriesColor(tokens: ColorTokens, sr: ChartSeries | undefined, i: number, tone?: Tone | null): string {
  const own = sr ? seriesTone(sr) : null;
  if (own) return barFill(tokens, own);
  if (tone) return barFill(tokens, tone);
  return seriesFill(tokens, i);
}

// --- horizontal layout ------------------------------------------------------

// The horizontal stack of rows (flex-col); the gap is applied by the component.
export const horizontalStack: ViewStyle = { flexDirection: "column" };

// One horizontal row: a label, a track-aligned bar, and the value
// (flex-row items-center gap-2).
export const horizontalRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 };

// The row's leading label (w-16 text-xs text-muted-foreground).
export function horizontalLabel(tokens: ColorTokens): TextStyle {
  return { width: 64, fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] };
}

// The track that holds a horizontal bar (flex-1 flex-row items-center).
export const horizontalTrack: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "center",
};

// A horizontal bar: h-3 rounded-r plus its fill and width (set by the
// component). The right corners are rounded (radius from the skin); the left edge
// sits on the track.
export function horizontalBar(fill: string, width: number, radius: number): ViewStyle {
  return {
    height: 12,
    borderTopEndRadius: radius,
    borderBottomEndRadius: radius,
    backgroundColor: fill,
    width,
  };
}

// The trailing value (text-xs font-medium text-card-foreground).
export function horizontalValue(tokens: ColorTokens): TextStyle {
  return { fontSize: 12, lineHeight: 16, fontWeight: "500", color: tokens["card-foreground"] };
}

// --- vertical layout --------------------------------------------------------

// The baseline-aligned row of columns (flex-row items-end); the gap and the
// plot height are applied by the component.
export const verticalBars: ViewStyle = { flexDirection: "row", alignItems: "flex-end" };

// One column wrapping a vertical bar (flex-1 items-stretch). It also sizes the
// bar to its share of the plot via flex (justify-end so the bar foots on the
// baseline and the value sits above it).
export const verticalColumn: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  alignItems: "stretch",
  justifyContent: "flex-end",
};

// The value shown above each vertical bar (mb-1 text-center text-xs font-medium
// text-card-foreground). Mirrors `horizontalValue` so the magnitude is visible
// (and reachable as text by assistive tech) in the vertical orientation too.
export function verticalValue(tokens: ColorTokens): TextStyle {
  return {
    marginBottom: 4,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: tokens["card-foreground"],
  };
}

// A vertical bar: rounded-t plus its fill and height (set by the component). The top
// corners are rounded (radius from the skin); the foot sits on the baseline.
export function verticalBar(fill: string, height: number, radius: number): ViewStyle {
  return {
    borderTopStartRadius: radius,
    borderTopEndRadius: radius,
    backgroundColor: fill,
    height,
  };
}

// The hairline baseline under the bars (h-px w-full bg-border).
export function baseline(tokens: ColorTokens): ViewStyle {
  return { height: 1, width: "100%", backgroundColor: tokens.border };
}

// The labels row under the baseline (mt-2 flex-row); the gap is applied by the
// component.
export const verticalLabelsRow: ViewStyle = { marginTop: 8, flexDirection: "row" };

// One column's label (flex-1 text-center text-xs text-muted-foreground).
export function verticalLabel(tokens: ColorTokens): TextStyle {
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    color: tokens["muted-foreground"],
  };
}

// --- per-OS skins -----------------------------------------------------------

// Chart is a "Shared" treatment: data visualization is platform-neutral. The iOS HIG
// Charts page (Swift Charts) and the shadcn web chart are the same plotted-bar idiom,
// and Material 3 ships no charts component at all, so there is no native shape to match
// and the look is identical on every platform. `webSkin` carries the Riskora chart
// (the card surface, 8px bar corners, dashed gridlines drawn by the frame); the
// iOS and Android skins reference it directly so the three columns stay byte-identical.

/**
 * The zoom control bar, laid OVER a zoomable chart's plot at its bottom-right, the
 * corner every map puts its controls in.
 *
 * Absolutely positioned rather than stacked under the plot, for two reasons: it
 * takes no layout space, so the map keeps its full height, and it stays a SIBLING
 * of the plot rather than a child. A control inside the plot would end the
 * hit layer's run as the plot's last child and, worse, make a mouse press's
 * target-relative offsetX measure from the control instead of the plot (see the
 * note in chart-inspect.tsx). Yoga positions an absolute child inside the parent's
 * padding box, so zero insets land it on the plot's own corner.
 *
 * A kit-internal constant: the placement is the chart's decision, never a
 * call-site style.
 */
export const zoomBar: ViewStyle = { position: "absolute", right: 0, bottom: 0, flexDirection: "row" };

export const webSkin: ChartSkin = {
  surfaceRadius: shape.web.card,
  barRadius: 8,
};

// Shared treatment: no per-OS divergence, so the native skins are the web skin.
export const iosSkin: ChartSkin = webSkin;
export const androidSkin: ChartSkin = webSkin;
