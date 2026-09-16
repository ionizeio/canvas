// Sizing: how a Canvas component takes its width. A component never dictates its
// own width. It declares a sizing NATURE and the parent layout container provides
// the bounds (the Bootstrap contract: `.container` > `.row` > `.col-*` size the
// box, `.form-control` is `width: 100%`). Two natures exist:
//
//   FILL: take the bounds the parent provides. `width:"100%"` fills a Column;
//         with `flexShrink:1` + `minWidth:0` the same style shares a Row with
//         hugging siblings (a field beside a button takes the remainder), splits
//         a Row equally with other FILL siblings, and takes its own line in a
//         wrap Row. Fields, cards, alerts, lists, tables, charts, feeds, forms.
//   HUG:  the content's own width. Button, Badge, Chip, Kbd, Switch, Checkbox,
//         Radio, Avatar, Spinner, Emblem, Swatch, Pagination, Breadcrumb.
//
// Why HUG is a hook and not a style: React Native's flexbox has no inline-block.
// Yoga IGNORES `width:"fit-content"` / `"max-content"` against a stretching
// parent (verified on iOS with RN 0.86: the child still stretched to the column),
// and a bare `alignSelf:"flex-start"` hugs in a Column but pins a Row child to
// the top of a centered Row (verified on iOS and the web). So HUG resolves
// against the nearest kit layout container: `alignSelf:"flex-start"` only inside
// a STRETCHING Column, nothing in a Row (its children are content-sized already)
// and nothing in a non-stretch Column (same). Row, Column, Grid cells, and
// Container publish that context; in a raw stretch View a hug component still
// stretches like any React Native child, so put it in a kit container.
//
// The context also names the one layout that still collapses a FILL child: a
// bare Column inside a Row (Bootstrap `.col-auto`) is content-sized, so
// `width:"100%"` resolves to the child's own content and a text field would
// resize on every keystroke (the `field-width.ts` post-mortem). Such a Column
// publishes `hugging: true` and `useFillStyle` warns in development.

import { createContext, createElement, useContext, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { devWarn } from "./dev-warn.js";

/** The FILL nature: fill the parent's bounds in a Column, share a Row. */
export const FILL: ViewStyle = { width: "100%", flexShrink: 1, minWidth: 0 };

/** What a HUG component appends inside a stretching Column (and nowhere else). */
export const HUG_IN_STRETCH_COLUMN: ViewStyle = { alignSelf: "flex-start" };

/** The layout facts a kit layout container publishes to its children. */
export interface LayoutAxis {
  /** The container's main axis: children of a Row are content-sized on it. */
  axis: "row" | "column";
  /** Column only: children stretch across it (React Native's default `alignItems`). */
  stretch: boolean;
  /** A content-sized cell (a bare Column inside a Row): a FILL child collapses here. */
  hugging: boolean;
  /**
   * Column only, and only a tile-grid cell sets it: the cell is definite on its
   * main axis too, because the grid stretches every cell to the height of the
   * row it wrapped onto. A surface child (a Card) grows to fill that height, so
   * the tiles of one row share a flush bottom edge (CSS Grid's `align-items:
   * stretch`, the default every tile grid is expected to have); a field or a
   * hug component keeps its own height, the cell's slack stays below it.
   */
  bounded?: boolean;
}

const LayoutAxisContext = createContext<LayoutAxis | null>(null);

/** Publish the layout facts of a kit layout container to its subtree. */
export function LayoutAxisProvider({ value, children }: { value: LayoutAxis; children?: ReactNode }) {
  return createElement(LayoutAxisContext.Provider, { value }, children);
}

/** The nearest kit layout container's facts, or null outside every kit container. */
export function useLayoutAxis(): LayoutAxis | null {
  return useContext(LayoutAxisContext);
}

/**
 * The value a Row or Column publishes. `sized` is whether the container itself
 * has bounds inside a Row parent (a `span`, `fill`, or `grow`): an unsized Row
 * or Column inside a Row is content-sized, so it is a hugging cell.
 */
export function layoutAxis(axis: "row" | "column", stretch: boolean, parent: LayoutAxis | null, sized: boolean): LayoutAxis {
  return { axis, stretch, hugging: parent?.axis === "row" && !sized };
}

/** The value a Column publishes (see `layoutAxis`). */
export function columnAxis(stretch: boolean, parent: LayoutAxis | null, sized: boolean): LayoutAxis {
  return layoutAxis("column", stretch, parent, sized);
}

/** The value a definite Row publishes: children are content-sized on the row axis. */
export const ROW_AXIS: LayoutAxis = { axis: "row", stretch: false, hugging: false };

/** The value a definite-width column cell publishes (Container). */
export const CELL_AXIS: LayoutAxis = { axis: "column", stretch: true, hugging: false };

/**
 * The value a tile-grid cell publishes (Grid, DashboardGrid): a definite-width
 * column that is also `bounded`, since the grid stretches it to its row's
 * height. A Card in it grows to that height without being asked.
 */
export const GRID_CELL_AXIS: LayoutAxis = { axis: "column", stretch: true, hugging: false, bounded: true };

/** The twelve-column grid that Row spans and the DashboardGrid share. */
export const GRID_COLUMNS = 12;

/**
 * The px width of a cell spanning `span` of `columns` equal units in a row
 * `width` wide whose cells sit `gap` apart: a multi-column span also swallows
 * the gaps it straddles, so two 6-column cells plus the gap between them fill
 * the row exactly, as do twelve 1-column cells and their eleven gaps. Floored,
 * so rounding can only leave a sub-pixel sliver rather than overflow the row
 * into an extra wrap.
 */
export function spanWidth(width: number, span: number, gap: number, columns: number = GRID_COLUMNS): number {
  const unit = (width - gap * (columns - 1)) / columns;
  return Math.max(0, Math.floor(unit * span + gap * (span - 1)));
}

/** A span clamped to a whole number of the twelve columns (1..12). */
export function clampSpan(span: number): number {
  if (!Number.isFinite(span)) return GRID_COLUMNS;
  return Math.min(GRID_COLUMNS, Math.max(1, Math.round(span)));
}

/**
 * The HUG nature, resolved against the nearest kit layout container: the
 * `alignSelf:"flex-start"` that stops a stretching Column from widening the
 * component, and nothing anywhere else. Append it after the component's skin
 * styles on the outermost node.
 */
export function useHugStyle(): ViewStyle | null {
  const ctx = useContext(LayoutAxisContext);
  return ctx !== null && ctx.axis === "column" && ctx.stretch ? HUG_IN_STRETCH_COLUMN : null;
}

/**
 * The sizing style for a HUG component that also offers `block`: `block` turns
 * it into FILL (a full-width button in a Column, an equal share in a Row), and
 * without it the component hugs.
 */
export function useSizing(p: { block?: boolean }): ViewStyle | null {
  const hug = useHugStyle();
  return p.block ? FILL : hug;
}

export interface FillOptions {
  /**
   * The component's content is a stable label (a Select shows its value), so
   * collapsing to it inside a bare Column in a Row is the toolbar idiom
   * (Bootstrap `.col-auto`), not a defect: no warning there.
   */
  hugsInCell?: boolean;
}

/**
 * The FILL nature for a component root, plus the development warning for the
 * one layout that collapses it: a bare Column inside a Row. Give that Column a
 * `span` or `fill` so the field has bounds.
 */
export function useFillStyle(component: string, options?: FillOptions): ViewStyle {
  const ctx = useContext(LayoutAxisContext);
  devWarn(
    ctx !== null && ctx.hugging && !options?.hugsInCell,
    `[canvas] <${component} />: rendered inside a bare <Column> that sits in a <Row>. That Column hugs its content, so the ${component} collapses to its own text (and a text field resizes on every keystroke). Give the Column a span={n} or fill so it has bounds.`,
  );
  return FILL;
}

/** The style keys a layout container owns; a non-layout component never takes them. */
export type SizingKey = "width" | "minWidth" | "maxWidth" | "flex" | "flexBasis" | "flexGrow" | "flexShrink" | "alignSelf";

/**
 * The `style` a non-layout component accepts: `ViewStyle` without the sizing
 * keys. Width, min/max width, flex, and `alignSelf` belong to the parent layout
 * container (a Column `span`, `fill`, a Container step); passing them here is a
 * type error, not a runtime warning.
 */
export type LayoutStyle = StyleProp<Omit<ViewStyle, SizingKey>>;
