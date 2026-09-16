import { Children, isValidElement, type ReactNode } from "react";
import { CELL_AXIS, LayoutAxisProvider, View, useContainerWidth, type StyleProp, type ViewStyle } from "../../style/index.js";
import { type FlexSkin } from "../layout/layout.styles.js";
import { gapOf, type Gap } from "../layout/layout.shared.js";

// Grid: the container-measured auto-fit tile layout. Row `wrap` can flow
// children, but it cannot renumber COLUMNS from the available width; a tile
// grid needs "as many tiles of at least this width as fit", which requires
// measuring the container and assigning cell widths. Grid owns that math once
// (the docs catalog and GridList tiles hand-rolled it before), through the same
// semantic grammar as Row/Column:
//
//   - `minTileWidth` sets the FLOOR (default 240): columns = how many tiles of
//     at least this width fit the measured container.
//   - `columns` sets the CEILING (the desktop count); the count still drops
//     below it as the container narrows. Both together:
//     min(columns, fit) and never below 1, so a capped grid still collapses to
//     one column on phones.
//   - The gap scale is Row/Column's own booleans and precedence.
//
// Grid uses NO breakpoints: tiles respond to available space (pure container
// math), while page-level stacking responds to form factor (Row `stacks`).
// This split is deliberate.

export interface GridProps {
  children?: ReactNode;
  /** Minimum tile width in px (default 240): the grid fits as many columns of
   *  at least this width as its measured container allows (auto-fit). */
  minTileWidth?: number;
  /** Column cap: never more than this many columns (the desktop count). The
   *  count still drops below the cap as the container narrows, so a capped
   *  grid still collapses to one column on phones. */
  columns?: number;

  // Gap scale (pick one; default `snug`): Row/Column's axis and precedence.
  flush?: boolean; // 0
  tight?: boolean; // 4
  snug?: boolean; // 8 (default)
  cozy?: boolean; // 12
  relaxed?: boolean; // 16
  loose?: boolean; // 24

  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For sizing/composition only (e.g. `maxWidth` to bound the grid), never a
   *  restyle hook; layout comes from the props above. */
  style?: StyleProp<ViewStyle>;
}

export interface GridItemProps {
  children?: ReactNode;
  /** Span two cells when the grid has more than one column (a hero tile). One
   *  cell in a one-column grid. */
  wide?: boolean;
  /** E2E hook forwarded to the item element. */
  testID?: string;
}

/** A grid child with cell options (`wide` spans two cells). Plain children need
 *  no wrapper: Grid assigns every child a cell. */
export function GridItem({ children, testID }: GridItemProps) {
  return <View testID={testID}>{children}</View>;
}

/** How many tiles of at least `minTileWidth` fit `width` with `gap` between
 *  them: at least 1, capped at `columns` when given. An unmeasured width
 *  (<= 0) resolves to the cap (desktop-first), or one column without a cap. */
export function gridColumns(width: number, minTileWidth: number, gap: number, columns?: number): number {
  if (width <= 0) return Math.max(1, columns ?? 1);
  const fit = Math.floor((width + gap) / (minTileWidth + gap));
  return Math.max(1, columns != null ? Math.min(columns, fit) : fit);
}

/** The px width of one cell when `cols` cells and their gaps split `width`. */
export function gridCellWidth(width: number, cols: number, gap: number): number {
  return Math.max(0, Math.floor((width - gap * (cols - 1)) / cols));
}

/** Build a Grid component from a platform skin (the shared layout scale). */
export function createGrid(skin: FlexSkin) {
  return function Grid(props: GridProps) {
    const { children, minTileWidth = 240, columns, testID, style } = props;
    const gapPx = skin.gap[gapOf(props as Pick<GridProps, Gap>)];
    // Container-measured auto-fit, with the window as the pre-measurement
    // guess (the docs-catalog precedent: onLayout alone hides everything on
    // the first web paint).
    const { width, onLayout } = useContainerWidth();
    const cols = gridColumns(width, minTileWidth, gapPx, columns);
    const cellWidth = width > 0 ? gridCellWidth(width, cols, gapPx) : undefined;
    return (
      <View onLayout={onLayout} style={[{ flexDirection: "row", flexWrap: "wrap", gap: gapPx }, style]} testID={testID}>
        {Children.toArray(children).map((child, i) => {
          const wide =
            cols > 1 && isValidElement(child) && child.type === GridItem && !!(child.props as GridItemProps).wide;
          const cell =
            cellWidth == null ? null : { width: wide ? cellWidth * 2 + gapPx : cellWidth };
          // A cell is a definite-width column: hug components hug inside it and
          // fill components fill it (the layout-axis context from sizing.ts).
          return (
            <View key={i} style={cell}>
              <LayoutAxisProvider value={CELL_AXIS}>{child}</LayoutAxisProvider>
            </View>
          );
        })}
      </View>
    );
  };
}
