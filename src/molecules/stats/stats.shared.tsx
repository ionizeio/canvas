import { type ReactNode } from "react";
import { View, Pressable, Text, RippleClip, cornerRadii, useTheme, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { Sparkline } from "../../charts/sparkline/sparkline.js";
import { StackedBar } from "../../charts/stacked-bar/stacked-bar.js";
import { type StackedSegment } from "../../charts/shared/types.js";
import { deltaTone, headerRow, headerTrailing, item as itemLayout, row, shareStrip, sparkStrip, type Surface } from "./stats.styles.js";

// Shared Stats shell. The structure (a wrapping row/grid of metric stacks, each a
// small label, a large headline value, and an optional delta), the boolean-prop
// axes, the data-shape types, the a11y, and the semantic delta-tone logic live
// here once; a platform file supplies only its skin (surface shape/padding/shadow,
// row density, title/label/value/delta type, and press feedback) and calls
// createStats.
//
// Two surfaces, one axis (`plain` vs the default card):
//
// 1. Card (default): each metric sits in its own bordered card. Good for a
//    standalone metric or a free-standing group on a bare page.
// 2. Plain (`plain`): the metric stacks sit borderless on a shared parent surface,
//    so you don't draw boxes inside a box. Pair with a parent card.
//
// Layout is responsive by default: items lay out in a wrapping row, each holding a
// sensible minimum width, so a group reflows from a single row on desktop down to a
// stack on a phone without any per-breakpoint props.
//
// Boolean-prop API: one boolean per option, first-match precedence within an axis
// (mirrors Button's intentOf). `items` carries the plain data; each item's `down`
// flag colors its delta red instead of the default green.
//
// One strip slot, two ways to fill it. Under the value/delta an item draws either
// its trend (`spark`, a Sparkline) or its composition (`share`, a StackedBar over
// a muted rail), and both reserve the same height. That is what lets a row mix
// them: cards stretch to the tallest sibling, so a metric row where only one tile
// carries a strip leaves every other tile with a band of blank space under its
// text and reads as an unfinished component. A metric with no trend to plot
// usually still decomposes, and drawing the decomposition fills the card with
// something true instead of padding it.
//
// Stats is a "Light" platform treatment: one structure and one set of (semantic)
// colors, with per-OS touches limited to corner radius, density, type tracking,
// shadow-vs-outline, and press feedback — so the skin carries only those, not the
// colors or the layout contract.

export interface StatItem {
  /** Small caption above the value (e.g. "Total users"). */
  label: string;
  /** The headline figure, pre-formatted (e.g. "12,847", "$48.2k", "3.6%"). */
  value: string;
  /** Optional change indicator (e.g. "+12.5%"). Omit to hide. */
  delta?: string;
  /** Color the delta red (a decline) instead of the default green (a rise). */
  down?: boolean;
  /** Render the delta MUTED rather than as a rise or a decline, for a line that
   *  qualifies the value instead of reporting a change ("last 30 days",
   *  "3 M2M / 1 user"). Green would read as good news that is not being claimed.
   *  Takes precedence over `down`. */
  steady?: boolean;
  /** Optional trend series; when set (and non-empty), the metric renders a
   *  Sparkline strip below the value that plots these points. Omit for no trend. */
  spark?: number[];
  /** What the trend strip plots, as its accessible name. Defaults to the
   *  metric's own label ("Revenue trend"), which is right whenever the strip is
   *  the VALUE's history. Set it when the strip plots the supporting line
   *  instead ("Sign-ins per hour, last 24 hours" under a live-sessions count),
   *  so a screen reader is not told the strip is something it is not. */
  sparkLabel?: string;
  /** Optional composition of the value, drawn in the SAME slot as `spark` as a
   *  proportional strip over a muted rail: the metric that decomposes but has no
   *  trend to plot (a verified share, a queue by status) still fills its card,
   *  so a row mixing the two reads as one finished set rather than as tiles that
   *  came out half empty. Segments summing to zero draw the bare rail, which is
   *  the honest picture of a metric at zero. Ignored when `spark` is set. */
  share?: StackedSegment[];
  /** A glyph shown opposite the label, naming what the metric counts. */
  icon?: ReactNode;
  /** A control in the metric's header, opposite the label (a period selector, a
   *  filter). Sits beside `icon` when both are given. */
  actions?: ReactNode;
  /** Accent for the headline value, drawn from the categorical chart ramp so a
   *  dashboard's tiles are tellable apart at a glance.
   *
   *  Mutually exclusive; first match wins in the order listed. Omit for the
   *  default foreground, which is what every existing call site gets. The slots
   *  are the same eight the charts use, so a metric and the series it summarises
   *  can carry one identity. */
  chart1?: boolean;
  chart2?: boolean;
  chart3?: boolean;
  chart4?: boolean;
  chart5?: boolean;
  chart6?: boolean;
  chart7?: boolean;
  chart8?: boolean;
}

export interface StatsProps {
  /** The metrics to render, in order. */
  items: StatItem[];
  // Surface (pick one; default is bordered cards).
  /** Borderless metric stacks on a shared surface, for nesting inside a card. */
  plain?: boolean;
  /** Optional heading shown above the metrics (mainly for the plain surface). */
  title?: string;
  /** Draw every metric's strip on a muted track, in one bounded band.
   *
   *  For a ROW of metrics, where the strips are read against each other. Without
   *  it each strip draws only its marks, so a metric with a quiet series shows a
   *  near-empty band beside one with a full bar and the row's densities range
   *  from blank to solid with nothing tying them together; the eye lands on the
   *  fullest tile rather than scanning the row. The track gives every strip the
   *  same frame whatever its data, so a flat series reads as a chart sitting at
   *  zero and the fill is the only thing that varies. */
  framed?: boolean;
  /** Make each metric a tappable target (drill into the underlying detail). When
   *  set, every metric renders as a Pressable with a button role and a pressed
   *  affordance, so a tappable stat needs no hand-rolled Pressable. */
  onPressItem?: (index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The per-OS-varying style pieces a platform skin fulfills. Everything else (the
// structure, the metric layout, the semantic delta color) is shared.
export interface StatsSkin {
  /** The bordered card surface each metric sits in (shape, border, padding, shadow). */
  cardSurface: (tokens: ColorTokens) => ViewStyle;
  /** The parent surface the plain variant nests on. */
  plainContainer: (tokens: ColorTokens) => ViewStyle;
  /** Row gap by surface (cards pack tighter, plain stacks sit roomier). */
  rowGap: Record<Surface, ViewStyle>;
  /** Title type + spacing, by surface. */
  title: (tokens: ColorTokens, surface: Surface) => TextStyle;
  /** The small caption above the value. */
  labelText: (tokens: ColorTokens) => TextStyle;
  /** The headline figure type. */
  valueText: (tokens: ColorTokens) => TextStyle;
  /** The delta type base (the tone color is layered on top by the shell). */
  deltaBase: TextStyle;
  /** iOS/web dim on a pressed tappable item; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over a tappable item; null on iOS/web. */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// Surface precedence when more than one is passed: first match wins.
function surfaceOf(p: StatsProps): Surface {
  if (p.plain) return "plain";
  return "card";
}

// Accent precedence, first match wins. Returns the chart token name, or null for
// the default foreground so an untoned metric's style is unchanged.
function accentOf(item: StatItem): string | null {
  if (item.chart1) return "chart-1";
  if (item.chart2) return "chart-2";
  if (item.chart3) return "chart-3";
  if (item.chart4) return "chart-4";
  if (item.chart5) return "chart-5";
  if (item.chart6) return "chart-6";
  if (item.chart7) return "chart-7";
  if (item.chart8) return "chart-8";
  return null;
}

export function createStats(skin: StatsSkin) {
  // One metric: label, value, optional delta. Tappable when an onPress is given.
  function StatItemView({ item, surface, framed, onPress }: { item: StatItem; surface: Surface; framed?: boolean; onPress?: () => void }): ReactNode {
    const { tokens, dark } = useTheme();
    // Split the surface shape (radius/border/fill/padding) from the outer flex sizing:
    // the shape stays on the tappable node, the sizing rides the RippleClip wrapper.
    const cardShape = surface === "card" ? skin.cardSurface(tokens) : null;
    const container = [cardShape, itemLayout[surface]];
    // The accent recolors ONLY the headline value, never the label or the delta:
    // the delta keeps its own rise/decline semantics, which an accent must not
    // overwrite.
    const accent = accentOf(item);
    const accentStyle = accent ? { color: tokens[accent as keyof typeof tokens] } : null;
    // The header row exists only when the metric has an icon or a control, so a
    // plain metric's tree is unchanged.
    const hasHeader = item.icon != null || item.actions != null;
    const inner = (
      <>
        {hasHeader ? (
          <View style={headerRow}>
            <Text style={skin.labelText(tokens)}>{item.label}</Text>
            <View style={headerTrailing}>
              {item.icon}
              {item.actions}
            </View>
          </View>
        ) : (
          <Text style={skin.labelText(tokens)}>{item.label}</Text>
        )}
        <Text style={[skin.valueText(tokens), accentStyle]}>{item.value}</Text>
        {item.delta != null && item.delta !== "" ? (
          <Text style={[skin.deltaBase, item.steady ? { color: tokens["muted-foreground"] } : deltaTone(dark, !!item.down)]}>{item.delta}</Text>
        ) : null}
        {item.spark != null && item.spark.length > 0 ? (
          <Sparkline values={item.spark} track={framed} accessibilityLabel={item.sparkLabel ?? `${item.label} trend`} style={sparkStrip} />
        ) : item.share != null && item.share.length > 0 ? (
          <View style={shareStrip}>
            {/* Subtle whether or not the row is framed: inside a tile the strip
                supports the value rather than being it, which is the same reason
                a Sparkline washes its own marks. */}
            <StackedBar segments={item.share} label={item.label} hideLegend track subtle tall={framed} />
          </View>
        ) : null}
      </>
    );
    if (onPress) {
      const android_ripple = skin.ripple ? skin.ripple(tokens) : undefined;
      return (
        // Android: the bounded card ripple is clipped to the br12 outline by this
        // RippleClip parent (a node can't clip its own ripple). The outer flex sizing
        // rides the wrapper so the card keeps its grid/full-width footprint; the shape,
        // padding, fill, and pressed-dim stay on the Pressable.
        <RippleClip shape={cornerRadii(cardShape)} style={itemLayout[surface]}>
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            android_ripple={android_ripple}
            style={({ pressed }) => [cardShape, pressed && skin.pressedOpacity != null ? { opacity: skin.pressedOpacity } : null]}
          >
            {inner}
          </Pressable>
        </RippleClip>
      );
    }
    return <View style={container}>{inner}</View>;
  }

  return function Stats(props: StatsProps) {
    const { items, title, testID, style, onPressItem } = props;
    const { tokens } = useTheme();
    const surface = surfaceOf(props);

    // The card surface lays cards directly in a wrapping, gapped row. The plain
    // surface wraps the stacks in a shared parent card so the borderless metrics
    // have something to sit on.
    const isPlain = surface === "plain";

    return (
      <View testID={testID} style={[isPlain ? skin.plainContainer(tokens) : null, style]}>
        {title != null && title !== "" ? <Text style={skin.title(tokens, surface)}>{title}</Text> : null}
        <View style={[row, skin.rowGap[surface]]}>
          {items.map((item, i) => (
            <StatItemView key={i} item={item} surface={surface} framed={props.framed} onPress={onPressItem ? () => onPressItem(i) : undefined} />
          ))}
        </View>
      </View>
    );
  };
}
