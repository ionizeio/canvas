import { Children, isValidElement, type ReactNode } from "react";
import { GRID_CELL_AXIS, LayoutAxisProvider, View, useContainerWidth, useFillStyle, type StyleProp, type ViewStyle } from "../../style/index.js";
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
//
// The grid itself is a FILL component: its root spans the parent's bounds
// (`width:"100%"`, sharing a Row with hugging siblings). The column math needs
// a definite width to fit tiles into, and a content-sized grid is circular: in
// a centering parent it measured whatever width its own cells happened to
// produce from the pre-measurement window guess, so it never reached the
// parent's edges. The cells are equal-HEIGHT as well as equal-width: the root
// stretches every cell to the height of the row it wrapped onto, and a cell
// publishes GRID_CELL_AXIS so a Card in it grows to that height, the way CSS
// Grid's default `align-items: stretch` fills every track. A hug component or
// a field keeps its own height.

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

// The root wraps its cells and STRETCHES each to the height of the row it
// wrapped onto (React Native's default `alignItems`, spelled out because the
// equal-height contract depends on it), so every cell is a definite box for
// its tile to grow into.
const GRID: ViewStyle = { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch" };

// The item fills its cell's height (`flexGrow:1` in the stretched cell column),
// so a Card inside a wide tile grows to the row's height exactly as a bare Card
// child does; without it the item would hug its content and the Card would have
// no box to grow into.
const ITEM: ViewStyle = { flexGrow: 1 };

/** A grid child with cell options (`wide` spans two cells). Plain children need
 *  no wrapper: Grid assigns every child a cell. */
export function GridItem({ children, testID }: GridItemProps) {
  return <View style={ITEM} testID={testID}>{children}</View>;
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
    // The root spans its parent (FILL), so the measured width is the parent's
    // and not the cells' own; `style` stays last so a `maxWidth` still bounds it.
    const fill = useFillStyle("Grid");
    return (
      <View onLayout={onLayout} style={[GRID, { gap: gapPx }, fill, style]} testID={testID}>
        {Children.toArray(children).map((child, i) => {
          const wide =
            cols > 1 && isValidElement(child) && child.type === GridItem && !!(child.props as GridItemProps).wide;
          const cell =
            cellWidth == null ? null : { width: wide ? cellWidth * 2 + gapPx : cellWidth };
          // A cell is a definite-width column stretched to its row's height: hug
          // components hug inside it, fill components fill it, and a Card grows
          // to the row's height (the layout-axis context from sizing.ts).
          return (
            <View key={i} style={cell}>
              <LayoutAxisProvider value={GRID_CELL_AXIS}>{child}</LayoutAxisProvider>
            </View>
          );
        })}
      </View>
    );
  };
}
