import { useRef } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { View, Text, useTheme, shadow, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { estimateTextWidth } from "./chart-math.js";

// Press-to-inspect support shared by the Chart family: the in-plot value flag
// (a small card pinned to the top of the plot near the pressed datum, clamped
// inside the plot bounds) and the assistive announcement that mirrors it.
// The flag is presentational (pointer-events none, and the plot's accessible
// name already carries the full data), so it never traps a press or adds a
// duplicate accessibility node.

export interface FlagRow {
  /** Series/datum name; omitted for single-value flags. */
  label?: string;
  /** Series dot color. */
  color?: string;
  /** The formatted value. */
  value: string;
}

// pointerEvents must come from StyleSheet.create on react-native-web (an
// inline object silently fails to compile the pointer-events declaration).
const styles = StyleSheet.create({
  passthrough: { pointerEvents: "none" },
});

const TEXT = 12;
const LINE = 16;
const PAD = 10;

/** Estimated flag width so positioning never needs a second layout pass. */
function flagWidth(title: string | undefined, rows: FlagRow[]): number {
  const widest = Math.max(
    title ? estimateTextWidth(title, TEXT) : 0,
    ...rows.map((r) => (r.color ? 14 : 0) + (r.label ? estimateTextWidth(r.label, TEXT) + 6 : 0) + estimateTextWidth(r.value, TEXT)),
    24,
  );
  // A small margin on top of the estimate: an ellipsized value in the flag is
  // worse than a few px of slack.
  return Math.ceil(widest) + PAD * 2 + 6;
}

export interface ChartValueFlagProps {
  /** Heading (usually the category or point label). */
  title?: string;
  rows: FlagRow[];
  /** The datum's x position in plot coordinates. */
  x: number;
  /** Plot width, for clamping the flag inside the plot. */
  plotW: number;
}

export function ChartValueFlag({ title, rows, x, plotW }: ChartValueFlagProps) {
  const { tokens } = useTheme();
  const w = flagWidth(title, rows);
  // Prefer sitting to the right of the datum; flip left when it would clip,
  // then clamp to the plot as a last resort (narrow plots).
  let left = x + 8;
  if (left + w > plotW) left = x - 8 - w;
  if (left < 0) left = Math.max(0, Math.min(plotW - w, x - w / 2));

  return (
    <View
      style={[
        styles.passthrough,
        {
          position: "absolute",
          top: 4,
          left,
          width: w,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: tokens.border,
          backgroundColor: tokens.card,
          paddingVertical: PAD - 4,
          paddingHorizontal: PAD,
          gap: 2,
          ...shadow("md"),
        },
      ]}
    >
      {title ? (
        <Text numberOfLines={1} style={{ fontSize: TEXT, lineHeight: LINE, fontWeight: "600", color: tokens["card-foreground"] }}>
          {title}
        </Text>
      ) : null}
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {r.color ? <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: r.color }} /> : null}
          {r.label ? (
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: TEXT, lineHeight: LINE, color: tokens["muted-foreground"] }}>
              {r.label}
            </Text>
          ) : null}
          <Text numberOfLines={1} style={{ fontSize: TEXT, lineHeight: LINE, fontWeight: "500", color: tokens["card-foreground"] }}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Mirror a selection into assistive tech (RN and react-native-web both
 * implement announceForAccessibility; RNW backs it with a live region).
 */
export function announceSelection(text: string): void {
  AccessibilityInfo.announceForAccessibility?.(text);
}

/**
 * The press position relative to the pressed element, or null when the event
 * carries none (never let a NaN reach the selection math). Native provides
 * `locationX`; react-native-web's responder events compute it lazily, but a
 * Pressable press driven by a mouse click can surface a raw MouseEvent, where
 * only `offsetX` exists. offsetX is TARGET-relative, so hit-layer Pressables
 * must be empty (nothing inside to become the target).
 */
export function pressPoint(e: { nativeEvent: unknown }): { x: number; y: number } | null {
  const ne = e.nativeEvent as Partial<{ locationX: number; locationY: number; offsetX: number; offsetY: number }>;
  const x = Number.isFinite(ne.locationX) ? (ne.locationX as number) : Number.isFinite(ne.offsetX) ? (ne.offsetX as number) : NaN;
  const y = Number.isFinite(ne.locationY) ? (ne.locationY as number) : Number.isFinite(ne.offsetY) ? (ne.offsetY as number) : NaN;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/** Opacity applied to marks OUTSIDE the current selection. */
export const DIM_OPACITY = 0.45;

// ---------------------------------------------------------------------------
// ScrubSurface: the shared drag-to-inspect hit layer. Built on the core RN
// responder system (no gesture-handler): react-native-web implements these
// responder events with real locationX getters, so coordinates work on every
// platform, unlike Pressable's mouse-click path. A press selects, dragging
// scrubs continuously, and releasing without leaving the initially-selected
// band clears it (preserving tap-to-toggle). A parent ScrollView can still
// steal the responder for vertical scrolls (onResponderTerminate keeps the
// last selection).

export interface ScrubSurfaceProps {
  /** Map a plot-local point to a selection index (null = nothing there). */
  indexAt: (x: number, y: number) => number | null;
  /** The currently selected index (for tap-on-selected-clears). */
  selected: number | null;
  /** SET the selection (null clears). */
  onScrub: (index: number | null) => void;
  style?: LayoutStyle;
}

export interface ScrubGesture {
  index: number | null;
  wasSelected: boolean;
  moved: boolean;
}

/**
 * The pure scrub state machine (exported for tests; the DOM test harness
 * cannot drive real responder events at zero layout width). Returns the next
 * gesture bookkeeping plus the selection to apply (`undefined` = no change,
 * `null` = clear).
 */
export function scrubEvent(
  phase: "grant" | "move" | "release",
  index: number | null,
  gesture: ScrubGesture,
  selected: number | null,
): { gesture: ScrubGesture; select: number | null | undefined } {
  if (phase === "grant") {
    return {
      gesture: { index, wasSelected: index != null && index === selected, moved: false },
      select: index ?? undefined,
    };
  }
  if (phase === "move") {
    if (index == null) return { gesture, select: undefined };
    return { gesture: { ...gesture, moved: gesture.moved || index !== gesture.index }, select: index };
  }
  // release: a stationary press on the already-selected index toggles it off.
  if (!gesture.moved && gesture.wasSelected && index === gesture.index) return { gesture, select: null };
  return { gesture, select: undefined };
}

export function ScrubSurface({ indexAt, selected, onScrub, style }: ScrubSurfaceProps) {
  // Gesture bookkeeping in a ref: the surface never re-renders for it.
  const gesture = useRef<ScrubGesture>({ index: null, wasSelected: false, moved: false });

  const handle = (phase: "grant" | "move" | "release") => (e: { nativeEvent: unknown }) => {
    const p = pressPoint(e);
    const i = p ? indexAt(p.x, p.y) : null;
    const next = scrubEvent(phase, i, gesture.current, selected);
    gesture.current = next.gesture;
    if (next.select !== undefined) onScrub(next.select);
  };

  return (
    <View
      accessible={false}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handle("grant")}
      onResponderMove={handle("move")}
      onResponderRelease={handle("release")}
      style={style}
    />
  );
}
