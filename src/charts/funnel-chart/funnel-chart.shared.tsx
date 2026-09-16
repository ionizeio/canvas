import { useState } from "react";
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { View, Text, Pressable, useTheme, useControllableState, devWarn, tabularNums, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import * as s from "../shared/charts.styles.js";
import { type ChartSkin } from "../shared/types.js";
import { type StackedSegment } from "../shared/types.js";
import { CHART_ROOT } from "../shared/chart-frame.js";
import { announceSelection, pressPoint, DIM_OPACITY } from "../shared/chart-inspect.js";
import { estimateTextWidth, formatCompact, funnelLayout, polygonPath } from "../shared/chart-math.js";

// Shared FunnelChart shell. Stage-by-stage conversion: a column of centered
// trapezoids, each stage's top width proportional to its value, tapering to
// the next stage's width (the last stage is rectangular), ramp-colored, with
// the stage's label, value, and conversion percent as real text centered on
// the stage. Pressing a stage selects it (the others dim).
//
// FunnelChart is a "Shared" platform treatment (data visualization is
// platform-neutral): the skin carries the same values on every OS.
//
// Boolean-prop axes:
// - Basis: `share` shows each stage as a share of the FIRST stage instead of
//   the conversion from the previous stage.
// - Density: `compact` shortens the funnel.

export interface FunnelChartProps {
  /** Ordered stages, widest first. */
  stages: StackedSegment[];
  /** Optional heading shown above the funnel. */
  title?: string;
  /** Show each stage as a share of the FIRST stage instead of the conversion
   *  from the previous stage. */
  share?: boolean;
  // Density (omit for the default funnel height).
  compact?: boolean;
  /** Formats stage values (data formatting, not styling). */
  formatValue?: (v: number) => string;
  /** Press-to-inspect: the selected stage index (controlled). Pass null for none. */
  selected?: number | null;
  /** Press-to-inspect: the initially selected stage (uncontrolled). */
  defaultSelected?: number;
  /** Fired when a press selects a stage (or clears it with null). */
  onSelect?: (index: number | null) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

const FUNNEL_HEIGHT = { default: 220, compact: 150 } as const;
const STAGE_GAP = 3;

// pointerEvents must come from StyleSheet.create: react-native-web silently
// drops it from inline style objects (the ChartValueFlag rule).
const styles = StyleSheet.create({ passthrough: { pointerEvents: "none" } });

export function createFunnelChart(skin: ChartSkin) {
  return function FunnelChart(props: FunnelChartProps) {
    const { stages, title, testID, style } = props;
    const { tokens } = useTheme();
    const compact = !!props.compact;
    const formatValue = props.formatValue ?? formatCompact;

    devWarn(stages.length === 0, "[canvas] <FunnelChart />: `stages` is empty; the chart renders with no funnel.");
    devWarn(
      stages.some((st, i) => i > 0 && (Number.isFinite(st.value) ? st.value : 0) > (Number.isFinite(stages[i - 1].value) ? stages[i - 1].value : 0)),
      "[canvas] <FunnelChart />: a stage exceeds its predecessor; a funnel narrows, so reorder or aggregate the stages.",
    );

    const clean = stages.map((st) => (Number.isFinite(st.value) && st.value > 0 ? st.value : 0));
    const height = compact ? FUNNEL_HEIGHT.compact : FUNNEL_HEIGHT.default;
    const stageH = stages.length > 0 ? Math.max(0, (height - STAGE_GAP * (stages.length - 1)) / stages.length) : 0;

    // Conversion readout per stage: of the previous stage (default), or of
    // the first stage (`share`). The first stage reads 100%.
    const pctOf = (i: number): number => {
      if (i === 0) return 100;
      const base = props.share ? clean[0] : clean[i - 1];
      return base > 0 ? Math.round((clean[i] / base) * 100) : 0;
    };
    const phrase = (i: number): string => {
      const st = stages[i];
      if (i === 0) return `${st.label} ${formatValue(clean[i])}`;
      return `${st.label} ${formatValue(clean[i])} (${pctOf(i)}% of ${props.share ? stages[0].label : stages[i - 1].label})`;
    };
    const name = `${title ?? "Funnel"}: ${stages.map((_, i) => phrase(i)).join(", ")}`;

    const [selected, setSelectedRaw] = useControllableState<number | null>(props.selected, props.defaultSelected ?? null, props.onSelect);
    const setSelected = (i: number | null) => {
      setSelectedRaw(i);
      if (i != null && stages[i]) announceSelection(phrase(i));
    };
    const toggle = (i: number) => setSelected(selected === i ? null : i);

    // The funnel needs a measured pixel width (the trapezoids are real
    // coordinates, not stretch), the sparkline pattern.
    const [width, setWidth] = useState(0);
    const polys = width > 0 ? funnelLayout(clean, width, height, STAGE_GAP) : [];

    return (
      <View
        {...(title != null && title !== "" ? { role: "group" as const, accessibilityLabel: `${title} chart`, "aria-label": `${title} chart` } : {})}
        testID={testID}
        style={[
          s.surface(tokens, skin.surfaceRadius),
          compact ? s.surfacePadCompact : s.surfacePadDefault,
          CHART_ROOT,
          style,
        ]}
      >
        {title != null && title !== "" ? (
          <Text style={[s.title(tokens), compact ? s.titleCompact : s.titleDefault]}>{title}</Text>
        ) : null}
        <View
          accessible
          accessibilityRole="image"
          role="img"
          accessibilityLabel={name}
          aria-label={name}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height }}
        >
          {width > 0 ? (
            <Svg width={width} height={height} style={{ position: "absolute" }}>
              {polys.map((poly, i) => (
                <Path
                  key={i}
                  d={polygonPath(poly)}
                  fill={s.seriesFill(tokens, i)}
                  opacity={selected != null && selected !== i ? DIM_OPACITY : 1}
                />
              ))}
            </Svg>
          ) : null}
          {/* Stage annotations: real text centered on the stage when it
              fits (the card token contrasts with every chart fill; the
              palette gates 3:1 against both card surfaces), or beside the
              stage in the foreground color when the trapezoid is too
              narrow. The accessible name carries the data regardless. */}
          {width > 0
            ? stages.map((st, i) => {
                const peak = Math.max(...clean, 1);
                // The stage's width at its vertical middle: the mean of its
                // top width and the next stage's top (its bottom).
                const topW = (clean[i] / peak) * width;
                const bottomW = ((i < clean.length - 1 ? clean[i + 1] : clean[i]) / peak) * width;
                const midW = (topW + bottomW) / 2;
                const detail = `${formatValue(clean[i])} · ${pctOf(i)}%`;
                const needed = Math.max(estimateTextWidth(st.label, 12), estimateTextWidth(detail, 11)) + 12;
                const inside = needed <= midW;
                return (
                  <View
                    key={i}
                    style={[styles.passthrough, {
                      position: "absolute",
                      left: inside ? 0 : width / 2 + midW / 2 + 8,
                      right: inside ? 0 : 0,
                      top: i * (stageH + STAGE_GAP),
                      height: stageH,
                      alignItems: inside ? "center" : "flex-start",
                      justifyContent: "center",
                      opacity: selected != null && selected !== i ? DIM_OPACITY : 1,
                    }]}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: inside ? tokens.card : tokens["card-foreground"] }}>
                      {st.label}
                    </Text>
                    {stageH >= 34 ? (
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 11, lineHeight: 14, color: inside ? tokens.card : tokens["muted-foreground"], opacity: inside ? 0.85 : 1, ...tabularNums() }}
                      >
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            : null}
          {/* Empty hit layer: stage index by press y (uniform stage bands). */}
          <Pressable
            accessible={false}
            onPress={(e) => {
              const point = pressPoint(e);
              if (!point || stageH <= 0) return;
              const i = Math.floor(point.y / (stageH + STAGE_GAP));
              if (i >= 0 && i < stages.length) toggle(i);
            }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    );
  };
}
