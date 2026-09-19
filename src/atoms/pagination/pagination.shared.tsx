import { useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { MeasuredSelection, SelectionText, useMeasuredTargets } from "../../style/measured-selection.js";
import { View, Pressable, Text, RippleClip, cornerRadii, useControllableState, type StyleProp, type ViewStyle, type ColorTokens, type LayoutStyle, GlassPane, GlassSurface, paneStyle, isGlass } from "../../style/index.js";
import * as s from "./pagination.styles.js";
import { type Size, type PaginationSkin } from "./pagination.styles.js";

// Shared Pagination shell. The structure (numbered / compact / with-size
// variants, the windowing math, the clamp + go handler, the size-selector
// cycling), the accessibility, and the variant/size precedence live here once; a
// platform file supplies only its skin (the cell shape, the active-page fill,
// the label color, and the press feedback) and calls createPagination.
//
// Pagination is page-of-N navigation for tables and lists: a horizontal row of
// page-number buttons flanked by Prev/Next controls, with the current page
// highlighted. When there are too many pages to show at once, the middle is
// truncated with an ellipsis glyph, keeping the first page, the last page, and a
// small window around the current page.
//
// The brand survives on every platform (the indigo `primary` token fills the
// active page); only the native SHAPE (cell radius) and press feedback change:
//   - iOS (HIG page controls): pill-rounded cells (radius ~8), the active page
//     filled `primary`; press = opacity dim 0.8.
//   - Android (M3): flat cells (radius ~8), active page a tonal alpha(primary)
//     fill with a brand label; press = android_ripple.
//   - Web: the established Canvas look (bordered boxes, radius 6, solid primary
//     fill on the active page), lifted verbatim.
//
// Boolean-prop API across two axes (mirrors Button's intentOf precedence; first
// match wins within an axis, axes are orthogonal):
//   - Variant: `withSize` prepends a "Rows per page" size selector to the
//     compact Prev/Next + "Page X of N" layout; `compact` collapses the number
//     row to just Prev/Next plus a "Page X of N" label; the default is the full
//     numbered row. Precedence when more than one is passed: withSize, then
//     compact, then the numbered default.
//   - Size: `small`, `large` (omit for the default, medium size).
//
// There is no icon utility at this layer, so Prev/Next use reading-direction
// single guillemet glyphs ("‹" / "›") rendered as Text rather than SVG chevrons,
// the size selector uses a "▾" caret glyph, and the truncation gap is an ellipsis
// glyph ("…").

export interface PaginationProps {
  /** Current page, 1-based (CONTROLLED). Clamped into the 1..total range before rendering. Omit for uncontrolled use. */
  page?: number;
  /** Initial page for uncontrolled use (a bare pagination navigates on press). */
  defaultPage?: number;
  /** Total number of pages. */
  total?: number;
  /** Fired with the next 1-based page when a control or number is pressed. */
  onChange?: (page: number) => void;
  /**
   * Total number of items across all pages. When set, the compact and with-size
   * indicator reads "Showing X-Y of N" (the item range on the current page)
   * instead of "Page X of N", computed from the current page and the page size.
   */
  itemCount?: number;

  // Variant (pick one; default is the full numbered row).
  /** Collapse to Prev/Next plus a "Page X of N" label, no number buttons. */
  compact?: boolean;
  /**
   * Prepend a "Rows per page" size selector to the compact Prev/Next +
   * "Page X of N" layout. Takes precedence over `compact`.
   */
  withSize?: boolean;

  // Content for the `withSize` selector.
  /** Currently selected rows-per-page value shown in the selector (CONTROLLED). Omit for uncontrolled use. */
  pageSize?: number;
  /** Initial rows-per-page value for uncontrolled use (the selector cycles on press). */
  defaultPageSize?: number;
  /** Selectable rows-per-page values; pressing the selector advances through them. */
  pageSizes?: number[];
  /** Fired with the next rows-per-page value when the selector is pressed. */
  onPageSizeChange?: (size: number) => void;

  // Size (pick one; default is the medium size).
  small?: boolean;
  large?: boolean;

  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: PaginationProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

type Variant = "withSize" | "compact" | "numbered";

// Variant precedence when more than one is passed: first match wins.
function variantOf(p: PaginationProps): Variant {
  if (p.withSize) return "withSize";
  if (p.compact) return "compact";
  return "numbered";
}

// Sentinel inserted into the page list for a truncation gap.
const GAP = -1;

// Compute the windowed page list: first page, last page, and a one-page window
// around the current page, with GAP sentinels marking truncated stretches. For
// small totals (<= 7) every page is shown.
function pageWindow(current: number, total: number): number[] {
  if (total <= 7) {
    const all: number[] = [];
    for (let p = 1; p <= total; p++) all.push(p);
    return all;
  }
  const list: number[] = [];
  const add = (p: number) => {
    if (!list.includes(p)) list.push(p);
  };
  add(1);
  if (current > 3) list.push(GAP);
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) list.push(GAP);
  add(total);
  return list;
}

// Under glass a cell that paints a surface of its own (the web's bordered tile, the
// iOS/M3 selector pill, every skin's selected page) is a CONTROL-layer puck: a
// GlassPane paints the material behind its label (the Pressable keeps its tap,
// ripple and dim) and the cell drops its fill and hairline (the pane's material and
// rim carry them). The selected page is BRAND-tinted glass with its label in
// `primary-foreground`, and that ink follows the travelling puck rather than the
// press (useMeasuredTargets.ink): the number keeps the resting ink until the puck
// is under it. A hollow cell (the iOS/M3 chevrons and resting pages) stays bare, as
// it is in solid mode.
function surfaced(box: ViewStyle): boolean {
  const bg = box.backgroundColor;
  return (bg != null && bg !== "transparent") || (box.borderWidth ?? 0) > 0;
}

// The resting tile's veil sits where the pane sits (behind the label), so the pane
// keeps its own absolute fill inside it.
const styles = StyleSheet.create({ veil: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: -1 } });

/** Build a Pagination component from a platform skin. */
export function createPagination(skin: PaginationSkin) {
  const ripple = skin.ripple;

  interface ControlProps {
    glyph: string;
    size: Size;
    tokens: ColorTokens;
    disabled: boolean;
    accessibilityLabel: string;
    onPress: () => void;
  }

  // A Prev/Next chevron control. Reads as a square page button without a number.
  function Control({ glyph, size, tokens, disabled, accessibilityLabel, onPress }: ControlProps) {
    const box = skin.controlBox(tokens);
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const puck = isGlass(theme) && surfaced(box);
    return (
      // The rounded cell's bounded Android ripple is clipped to its corners by this RippleClip
      // parent (no-op on iOS/web). A same-node overflow:"hidden" cannot clip a node's own
      // ripple. See src/style/ripple-clip.
      <RippleClip shape={cornerRadii(box)}>
        <Pressable
          style={({ pressed }) => [
            surfaced(box) ? paneStyle(theme, box) : box,
            s.itemSize[size],
            skin.focusOutlineReset,
            disabled ? { opacity: 0.5 } : null,
            skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
          onPress={onPress}
          disabled={disabled}
          hitSlop={8}
          android_ripple={ripple ? ripple(tokens, false) : undefined}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled }}
          aria-disabled={disabled}
        >
          {puck ? <GlassPane static layer="control" shape={box} /> : null}
          <Text style={[skin.controlLabel(tokens), s.labelSize[size]]}>{glyph}</Text>
        </Pressable>
      </RippleClip>
    );
  }

  return function Pagination(props: PaginationProps) {
    const { onChange, disabled, testID, style } = props;
    const size = sizeOf(props);
    const variant = variantOf(props);
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    const glass = isGlass(theme);
    const selectorBox = skin.selectorBox(tokens);
    const selectorPuck = glass && surfaced(selectorBox);

    // Clamp inputs so the control never renders an out-of-range current page.
    const total = Math.max(1, Math.floor(props.total ?? 1));
    // Controlled when `page` is provided, self-managed otherwise, so Prev/Next and
    // the numbered buttons actually move the current page instead of no-op'ing.
    const [page, setPage] = useControllableState<number>(props.page, props.defaultPage ?? 1);
    const current = Math.min(Math.max(1, Math.floor(page)), total);
    // Rows-per-page selector: controlled via `pageSize`, self-managed otherwise so
    // pressing it cycles the value on screen.
    const sizes = props.pageSizes ?? [10, 25, 50];
    const [pageSize, setPageSize] = useControllableState<number>(props.pageSize, props.defaultPageSize ?? sizes[0] ?? 10);

    const atStart = current <= 1;
    const atEnd = current >= total;

    // Numbered pagination in glass mode: the selected page's brand puck travels
    // as ONE measured control-layer surface between the page cells while the
    // numbers, the chevrons and the hit targets stay fixed. Cells are keyed and
    // measured by PAGE NUMBER, never by slot, and beyond seven pages nearly every
    // page change also shifts the window (an ellipsis moves, a number appears or
    // drops out): useMeasuredTargets re-measures the cells before the surface
    // moves, travels when the page it sits on kept its frame (2 to 3 in
    // "1 2 3 4 … 12" glides like any selection) and resets in place when that
    // page moved or left the window (3 to 12 in "1 … 11 12" appears on 12). An
    // ellipsis is never a target. Compact and with-size variants keep their
    // anatomy; solid mode keeps the selected cell.
    const window = variant === "numbered" ? pageWindow(current, total) : [];
    const structure = JSON.stringify([variant, size, window]);
    const rowRef = useRef<View>(null);
    const cells = useMeasuredTargets<number>(structure, rowRef);
    // The surface exists in glass mode only, so the target is asked for in glass
    // mode only: in solid mode the cells paint the selection themselves.
    const { layout: selectionLayout, resetKey, bounds } = cells.target("selected", glass && variant === "numbered" ? current : undefined);
    const movingSelection = glass && variant === "numbered" && selectionLayout != null;
    const selectedBox = skin.pageBox(tokens, true);
    const selection = movingSelection ? (
      <MeasuredSelection layout={selectionLayout} enabled={!disabled} resetKey={resetKey} bounds={bounds} testID={testID ? `${testID}-selection-motion` : undefined}>
        <GlassSurface static layer="control" interactive brand={tokens.primary} style={[StyleSheet.absoluteFill, { borderRadius: selectedBox.borderRadius }]} testID={testID ? `${testID}-selection` : undefined} />
      </MeasuredSelection>
    ) : null;

    // The compact/with-size indicator: an item range ("Showing X-Y of N") when
    // itemCount is supplied, otherwise the page count ("Page X of N").
    const indicatorLabel =
      props.itemCount != null
        ? `Showing ${props.itemCount === 0 ? 0 : (current - 1) * pageSize + 1}-${Math.min(current * pageSize, props.itemCount)} of ${props.itemCount}`
        : `Page ${current} of ${total}`;

    const go = (next: number) => {
      if (disabled) return;
      const clamped = Math.min(Math.max(1, next), total);
      if (clamped !== current) {
        setPage(clamped);
        onChange?.(clamped);
      }
    };

    const prev = (
      <Control
        glyph="‹"
        size={size}
        tokens={tokens}
        disabled={disabled || atStart}
        accessibilityLabel="Previous page"
        onPress={() => go(current - 1)}
      />
    );
    const next = (
      <Control
        glyph="›"
        size={size}
        tokens={tokens}
        disabled={disabled || atEnd}
        accessibilityLabel="Next page"
        onPress={() => go(current + 1)}
      />
    );

    // Compact: Prev/Next bracketing a "Page X of N" indicator, no number buttons.
    if (variant === "compact") {
      return (
        <View testID={testID} style={[s.compactRow, style]}>
          {prev}
          <Text style={[skin.mutedLabel(tokens), s.labelSize[size]]}>
            {indicatorLabel}
          </Text>
          {next}
        </View>
      );
    }

    // With-size: a "Rows per page" selector ahead of the compact indicator and the
    // Prev/Next controls. There is no native select, so the selector is a closed
    // trigger (value + caret) that advances through `pageSizes` on press.
    if (variant === "withSize") {
      const cycleSize = () => {
        if (disabled) return;
        const i = sizes.indexOf(pageSize);
        const nextSize = sizes[(i + 1) % sizes.length];
        if (nextSize !== undefined && nextSize !== pageSize) {
          setPageSize(nextSize);
          props.onPageSizeChange?.(nextSize);
          // Changing the page size reflows the rows, so the current page can fall
          // out of range; reset to page 1 (matches the with-size Do guidance).
          go(1);
        }
      };
      return (
        <View testID={testID} style={[s.withSizeRow, style]}>
          <View style={s.selectorCluster}>
            <Text style={[skin.mutedLabel(tokens), s.labelSize[size]]}>Rows per page</Text>
            {/* The selector cell's bounded Android ripple is clipped to its corners by this
                RippleClip parent (no-op on iOS/web). See src/style/ripple-clip. */}
            <RippleClip shape={cornerRadii(selectorBox)}>
              <Pressable
                style={({ pressed }) => [
                  surfaced(selectorBox) ? paneStyle(theme, selectorBox) : selectorBox,
                  s.itemSize[size],
                  skin.focusOutlineReset,
                  disabled ? { opacity: 0.5 } : null,
                  skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                ]}
                onPress={cycleSize}
                disabled={disabled}
                hitSlop={8}
                android_ripple={ripple ? ripple(tokens, false) : undefined}
                accessibilityRole="button"
                accessibilityLabel="Rows per page"
                accessibilityState={{ disabled: !!disabled }}
                aria-disabled={!!disabled}
              >
                {selectorPuck ? <GlassPane static layer="control" shape={selectorBox} /> : null}
                <Text style={[skin.controlLabel(tokens), s.labelSize[size]]}>{pageSize}</Text>
                <Text style={[skin.mutedLabel(tokens), s.labelSize[size]]}>▾</Text>
              </Pressable>
            </RippleClip>
          </View>
          <Text style={[skin.mutedLabel(tokens), s.labelSize[size]]}>
            {`Page ${current} of ${total}`}
          </Text>
          <View style={s.controlPair}>
            {prev}
            {next}
          </View>
        </View>
      );
    }

    // Numbered (default): a windowed row of page buttons with ellipsis gaps.
    return (
      <View ref={rowRef} testID={testID} style={[s.numberedRow, style]}>
        {selection}
        {prev}
        {window.map((p, i) => {
          if (p === GAP) {
            return (
              <Text
                key={`gap-${i}`}
                style={[skin.gapLabel(tokens), s.labelSize[size]]}
                accessibilityElementsHidden
              >
                …
              </Text>
            );
          }
          const selected = p === current;
          const pageBox = skin.pageBox(tokens, selected);
          // The travelling surface carries the selected puck, so under it a cell
          // paints only its RESTING tile (the web's bordered box; the iOS and M3
          // resting cells are bare), and that tile yields to the surface as the
          // surface covers it (`uncovered`), instead of vanishing at the press.
          // Without a surface the selected cell paints the brand puck itself.
          const ownBrand = glass && selected && !movingSelection;
          const paneShape = ownBrand ? pageBox : skin.pageBox(tokens, false);
          const pagePuck = glass && surfaced(paneShape);
          // The label's ink: the skin's own per state, except that under glass the
          // selected surface is a brand puck carrying `primary-foreground` (M3's tonal
          // fill included), and it follows the surface (see the header).
          const ink = cells.ink(p, selected, {
            rest: skin.pageLabel(tokens, false).color as string,
            covered: glass && surfaced(selectedBox) ? tokens["primary-foreground"] : skin.pageLabel(tokens, true).color as string,
          });
          const pane = pagePuck ? <GlassPane static layer="control" shape={paneShape} brand={ownBrand ? tokens.primary : undefined} /> : null;
          return (
            // The measurement wrapper reports the cell's frame in the row; the page
            // cell's bounded Android ripple is clipped to its corners by the RippleClip
            // inside it (no-op on iOS/web). See src/style/ripple-clip.
            <View key={`page-${p}`} ref={cells.register(p)} onLayout={(event) => cells.record(p, event.nativeEvent.layout)}>
            <RippleClip shape={cornerRadii(pageBox)}>
              <Pressable
                style={({ pressed }) => [
                  surfaced(pageBox) ? paneStyle(theme, pageBox) : pageBox,
                  s.itemSize[size],
                  skin.focusOutlineReset,
                  disabled ? { opacity: 0.5 } : null,
                  skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                ]}
                onPress={() => go(p)}
                disabled={disabled}
                hitSlop={4}
                android_ripple={ripple ? ripple(tokens, selected) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`Page ${p}`}
                accessibilityState={{ selected, disabled: !!disabled }}
                aria-current={selected ? "page" : undefined}
                aria-disabled={!!disabled}
              >
                {pane && movingSelection ? <Animated.View pointerEvents="none" style={[styles.veil, { opacity: cells.uncovered(p, selected) }]}>{pane}</Animated.View> : pane}
                <SelectionText style={[skin.pageLabel(tokens, selected), s.labelSize[size], { color: ink }]}>{p}</SelectionText>
              </Pressable>
            </RippleClip>
            </View>
          );
        })}
        {next}
      </View>
    );
  };
}
