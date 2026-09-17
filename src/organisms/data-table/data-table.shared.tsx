import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { Fragment, type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { consumeEscapeKey } from "../../style/escape-layer.js";
import { useHorizontalScrollFocus } from "../../style/use-scroll-focus.js";
import { FlatList, StyleSheet, ScrollView, type ViewProps, type ViewStyle as RNViewStyle } from "react-native";
import { View, Pressable, Text, TextInput, useControllableState, controlRipple, devWarn, breakpoints, useMeasuredWidth, tabularNums, type StyleProp, type TextStyle, type ViewStyle, type LayoutStyle, useFillStyle, GlassSurface, withInnerFill } from "../../style/index.js";
import { type CheckboxProps } from "../../atoms/checkbox/checkbox.shared.js";
import { type PaginationProps } from "../../atoms/pagination/pagination.shared.js";
import { type SkeletonProps } from "../../atoms/skeleton/skeleton.shared.js";
import { Icon } from "../../atoms/icon/icon.js";
import {
  type Density,
  type DataTableSkin,
} from "./data-table.styles.js";

// Compact-width pan sizing: each column keeps a readable minimum and the
// selection column its checkbox share, so the scroller's content width is
// columns * minimum (+ selector) rather than a crushed fit.
const MIN_COLUMN_WIDTH = 110;
const SELECT_COLUMN_WIDTH = 48;
const s = StyleSheet.create({
  panContent: { flexGrow: 1 },
  panInner: { flexGrow: 1 },
});

// Shared DataTable shell. The data table lays a grid out as flex rows of
// equal-width flex-1 cells (RN has no CSS table primitive; tables are flex
// rows/columns). A header row carries the column labels on a tinted surface, and
// the data rows sit beneath it separated by hairlines.
//
// The structure, the boolean-prop API, the data-shape types, the cell-coercion
// logic, the column model (alignment / fixed widths), sorting, row selection,
// pagination, the loading and empty states, the striped tint placement, the
// pressable-row behavior, and accessibility all live here once. A platform file
// supplies only its skin (row rhythm/density padding, header label
// type/tracking, hairline, stripe fill, outer radius, and the press-feedback
// mode) plus the platform variants of the kit parts the table composes (the
// selection Checkbox, the footer Pagination, the loading Skeleton), and calls
// createDataTable.
//
// DataTable is a "Light" platform treatment: one structure with small per-OS
// touches (row height/density, header type/tracking, divider/hairline, striped
// fill, M3 vs iOS row rhythm). The table is a content surface with stable frost
// in glass mode and the complete skin recipe in solid mode.

export type { Density };

/**
 * A column descriptor. Plain strings stay supported (a string is shorthand for
 * `{ label }`); the object form unlocks per-column alignment, fixed widths, and
 * sorting.
 */
export interface DataTableColumn {
  /** Column header label. */
  label: string;
  /** Stable identity used by `sort.column`; defaults to the label. */
  key?: string;
  /** Right-align the header and cells (amounts, counts, measurements). */
  numeric?: boolean;
  /** Center the header and cells (short status/flag columns). */
  centered?: boolean;
  /** Fixed width in px instead of the equal flex share. */
  width?: number;
  /**
   * Opt this column into header-press sorting. Unnecessary when the table-level
   * `sortable` is set (there it opts back OUT via `sortable: false`).
   */
  sortable?: boolean;
  /**
   * Derive the comparable value for sorting when this column's cells are custom
   * ReactNodes (a Badge, a link). String/number cells sort out of the box;
   * without this, custom-node cells sort last. Keep this function pure: its
   * results are cached until rows or columns change. If it closes over changing
   * external data, replace the function, its descriptor, and the columns array.
   */
  sortValue?: (cell: ReactNode, row: ReactNode[], rowIndex: number) => string | number | null | undefined;
}

/** The active sort: which column (by `key`, or label) and which direction. */
export interface DataTableSort {
  /** The sorted column's `key` (the label when no key was given). */
  column: string;
  /** Descending when true; ascending otherwise. */
  descending?: boolean;
}

export interface DataTableProps {
  /**
   * Columns: a header label per column, or a `DataTableColumn` descriptor for
   * per-column alignment (`numeric`/`centered`), a fixed `width`, and sorting
   * (`sortable`, `sortValue`). Strings and descriptors mix freely. Treat the
   * array and descriptors as immutable: replace both when a column changes.
   */
  columns: Array<string | DataTableColumn>;
  /**
   * Row data: an array of rows, each an array of cells (one per column). A cell is
   * a string (rendered in the default cell type) or any ReactNode for a custom
   * cell, such as a link, a `Badge`, or a monospace name (rendered directly).
   * Treat this data as immutable: replace the outer array and each changed row
   * when data changes, so cached sorting and pagination update correctly.
   */
  rows: ReactNode[][];
  /** Tint every other data row for easier horizontal scanning. */
  striped?: boolean;
  /** Wrap the table in a rounded outer border. */
  bordered?: boolean;
  // Density (pick one; default is the regular row height).
  /** Tighter vertical padding on header and data cells. */
  compact?: boolean;
  /** Looser vertical padding on header and data cells. */
  comfortable?: boolean;
  /**
   * Make every column sortable: pressing a header cycles ascending, descending,
   * off. A column descriptor opts back out with `sortable: false`. Sorting is
   * self-managed out of the box; control it via `sort`/`onSortChange`.
   */
  sortable?: boolean;
  /** Controlled sort state (`null` = unsorted). Omit for uncontrolled use. */
  sort?: DataTableSort | null;
  /** Initial sort for uncontrolled use. */
  defaultSort?: DataTableSort | null;
  /** Fired with the next sort (or `null` when cleared) on header press. */
  onSortChange?: (sort: DataTableSort | null) => void;
  /**
   * Row selection: a leading checkbox column with a select-all header checkbox
   * (indeterminate on a partial selection). Selection is keyed by `rowKey` (the
   * row's original index when omitted) and self-managed out of the box; control
   * it via `selectedKeys`/`onSelectionChange`. When no `onRowPress` is set,
   * pressing anywhere on a row toggles it.
   */
  selectable?: boolean;
  /** Controlled selected row keys. Omit for uncontrolled use. */
  selectedKeys?: Array<string | number>;
  /** Initial selected row keys for uncontrolled use. */
  defaultSelectedKeys?: Array<string | number>;
  /** Fired with the next selected keys when a row or the select-all is toggled. */
  onSelectionChange?: (keys: Array<string | number>) => void;
  /**
   * Page the rows through a built-in footer (the kit Pagination): a
   * "Showing X-Y of N" range with Prev/Next, plus the selection count when
   * `selectable`. Sorting applies before paging. Self-managed out of the box;
   * control the page via `page`/`onPageChange`.
   */
  paginated?: boolean;
  /** Rows per page (CONTROLLED; default 10, or the first of `pageSizes`). */
  pageSize?: number;
  /** Initial rows per page for uncontrolled use. */
  defaultPageSize?: number;
  /**
   * Selectable rows-per-page values. Supplying them upgrades the footer to the
   * Pagination `withSize` variant (a "Rows per page" selector).
   */
  pageSizes?: number[];
  /** Fired with the next rows-per-page value when the footer selector changes it. */
  onPageSizeChange?: (size: number) => void;
  /** Current page, 1-based (CONTROLLED). Omit for uncontrolled use. */
  page?: number;
  /** Initial page for uncontrolled use. */
  defaultPage?: number;
  /** Fired with the next 1-based page when the footer pagination navigates. */
  onPageChange?: (page: number) => void;
  /**
   * Loading state: the body renders pulsing skeleton placeholder rows (one per
   * would-be row on the page) instead of data.
   */
  loading?: boolean;
  /**
   * What to render, centered under the header, when `rows` is empty (and not
   * `loading`). A string gets the muted caption type; any ReactNode renders as
   * given (an `EmptyState`, a retry Button). Omitted = just the header row, as
   * before.
   */
  emptyMessage?: ReactNode;
  /**
   * When set, each data row is pressable, reporting the row data and its index
   * in `rows`. A press anywhere on the row acts; the keyboard and screen-reader
   * path is a button inside the row's FIRST column, named from the row's plain
   * text cells (or, when it has none, by that cell's own content). The row
   * itself stays a `row`, so keep your own controls out of the first column
   * here: a control there would nest inside the activator.
   */
  onRowPress?: (row: ReactNode[], index: number) => void;
  /**
   * Row editing: passing this adds a trailing actions column with a pencil
   * button per row. Pressing the pencil opens the row's edit mode (its string
   * cells become fields with a trailing Save/Cancel pair) and fires this with
   * the row's original index in `rows`. Save reports the edited cells through
   * `onRowCommit`; Cancel (or Escape in a field) closes without committing.
   */
  onRowEdit?: (rowIndex: number) => void;
  /**
   * Row deletion: passing this adds a delete (bin) button to the trailing
   * actions column. Delete is second-press confirm: the first press ARMS it
   * (the bin turns destructive and its accessible name says confirm), a second
   * press within the confirm window fires this with the row's original index,
   * and pressing anywhere else in the table (or the window lapsing) disarms.
   */
  onRowDelete?: (rowIndex: number) => void;
  /**
   * Let string cells be edited in place: pressing one swaps it to a field.
   * Enter or blur commits through `onCellCommit`; Escape restores the cell.
   * Custom ReactNode cells (badges, links) are not editable.
   */
  inlineEdit?: boolean;
  /**
   * Fired when an `inlineEdit` cell commits (Enter or blur) with a changed
   * value: the row's original index in `rows`, the column index, and the next
   * text. Data stays yours: re-render with updated `rows` to keep the edit.
   */
  onCellCommit?: (rowIndex: number, colIndex: number, next: string) => void;
  /**
   * Fired when a pencil-opened row edit is saved: the row's original index in
   * `rows` and the full cells array with the edited strings in place (custom
   * ReactNode cells pass through unchanged).
   */
  onRowCommit?: (rowIndex: number, cells: ReactNode[]) => void;
  /**
   * Render the data rows through a windowed `FlatList` instead of mounting every
   * row up front, for large tables. The header row stays fixed above it. Give the
   * table a bounded height (via `style`, e.g. `{ maxHeight: 400 }`) so the body can
   * scroll; without one it warns and renders eagerly. Default mounts all rows.
   */
  virtualized?: boolean;
  /**
   * Stable key for a row, derived from the row data and its index in `rows`.
   * Selection is keyed by it, and it keeps React row identity stable when rows
   * reorder (sorting, live data) and a cell is a stateful custom ReactNode. When
   * omitted, rows key off their original array index (safe for string/number
   * cells and stateless custom cells; selection then tracks row POSITIONS, so
   * supply a real key when the data itself can be reordered, inserted, or
   * deleted). Keep this function pure; replace its identity when external data
   * changes how keys are derived, so the cached selection summary updates.
   */
  rowKey?: (row: ReactNode[], index: number) => string | number;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Density precedence when more than one is passed: first match wins.
function densityOf(p: DataTableProps): Density {
  if (p.compact) return "compact";
  if (p.comfortable) return "comfortable";
  return "regular";
}

// A normalized column: the object form with the key resolved.
type NormalColumn = DataTableColumn & { key: string };

function normalizeColumns(columns: Array<string | DataTableColumn>): NormalColumn[] {
  return columns.map((c) => (typeof c === "string" ? { label: c, key: c } : { ...c, key: c.key ?? c.label }));
}

// The header cell box: the equal flex share, the label+sort-icon row, and the
// px-16 horizontal padding (the skins' headerCell is type-only). Alignment and
// fixed widths are layered on per column.
const HEADER_CELL_BOX: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 16,
};

// The centered spanning area for the built-in empty message.
const EMPTY_WRAP: ViewStyle = { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 };

// The pagination footer bar: selection count leading, pagination trailing. No
// top hairline: every skin already draws a hairline under the last data row.
const FOOTER_BAR: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
  paddingHorizontal: 16,
  paddingVertical: 8,
};

// Fixed-width column override (replaces the equal flex share).
function widthStyle(col: NormalColumn): ViewStyle | null {
  return col.width != null ? { width: col.width, flexGrow: 0, flexShrink: 0, flexBasis: "auto" } : null;
}

// The trailing row-actions cell (and its header spacer): a fixed trailing
// column holding the icon buttons, right-aligned. The width comes from the
// skin (two platform touch targets plus this padding).
const ACTIONS_CELL: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 4,
  paddingHorizontal: 12,
  flexGrow: 0,
  flexShrink: 0,
  flexBasis: "auto",
};

// When the actions column is present the pressable row area wraps only the
// data cells, and the actions cell sits BESIDE it as a sibling, so a press on
// the pencil/bin can never double as a row press.
const ROW_PRESS_AREA: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: "0%",
  flexDirection: "row",
  alignItems: "center",
};

// The row activator that carries `onRowPress` for the keyboard and for screen
// readers, inside the first data cell. It takes the cell's box so the focus
// ring outlines the whole leading column rather than hugging a word; it draws
// nothing of its own, because the row already draws every state the press has.
// The cell's own cross-axis alignment rides along with it (a numeric or
// centered leading column keeps its alignment through the wrapper).
const ROW_ACTIVATOR: ViewStyle = { alignSelf: "stretch", flexShrink: 1, minWidth: 0 };

// How long an armed delete waits for its confirming second press.
const DELETE_CONFIRM_MS = 4000;

// An open inline cell editor: the row/column (original `rows` indices) and the
// in-progress text.
interface CellEdit {
  row: number;
  col: number;
  value: string;
}

// Skeleton line widths cycle so placeholder rows read organic, not gridded.
// The placeholder lines cycle through the Skeleton line lengths so the rows read as text.
const SKELETON_LENGTHS = [{ long: true }, { short: true }, { long: true }, { short: true }] as const;

// Numeric-aware, locale-aware cell comparison ("9" sorts before "10").
function compareCells(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

// The parts a platform file supplies alongside its skin: the platform variants
// of the kit components the table composes, so each OS renders its native-feeling
// checkbox, pagination, and skeleton.
export interface DataTableParts {
  Checkbox: ComponentType<CheckboxProps>;
  Pagination: ComponentType<PaginationProps>;
  Skeleton: ComponentType<SkeletonProps>;
}

/** Build a DataTable component from a platform skin plus its platform parts. */
export function createDataTable(skin: DataTableSkin, parts: DataTableParts) {
  const { Checkbox, Pagination, Skeleton } = parts;
  return function DataTable(props: DataTableProps) {
    const { columns, rows, striped, bordered, selectable, onRowPress, onRowEdit, onRowDelete, inlineEdit, rowKey, virtualized, loading, emptyMessage, paginated, testID, style } = props;
    const density = densityOf(props);
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    // Under glass the table is a CONTENT-layer pane and its header band, stripes and
    // pressed/selected rows are ink tints over the material (src/style/glass-fill.ts).
    const fill = useFillStyle("DataTable");

    const cols = useMemo(() => normalizeColumns(columns), [columns]);

    // Measure the table's OWN width so the compact-width collapse tracks the
    // container, not the window: the docs 3-up and a real iPhone both render the
    // table narrower than a desktop window would report, so useWindowDimensions
    // cannot see the narrow column.
    const { width: measuredWidth, onLayout: onMeasureLayout } = useMeasuredWidth();
    const scrollFocus = useHorizontalScrollFocus();
    // SwiftUI Table collapses to its PRIMARY (first) column in compact width on
    // iPhone; the iOS skin opts in. Every other platform renders all columns.
    const collapsed =
      !!skin.collapsesToPrimaryColumn && measuredWidth > 0 && measuredWidth < breakpoints.sm;
    const visibleColumns = collapsed ? cols.slice(0, 1) : cols;
    // Where the table does NOT collapse (web, Android), a compact container must
    // not crush the flex-1 cells into letter-wrapped slivers: below the sm width
    // the header+body pan together inside a horizontal scroller, each column
    // keeping a readable minimum (the Material phone data-table treatment).
    const pans = !collapsed && !skin.collapsesToPrimaryColumn && cols.length > 1 && measuredWidth > 0 && measuredWidth < breakpoints.sm;
    const hasActions = !!(onRowEdit || onRowDelete);
    const panMinWidth =
      cols.reduce((w, col) => w + (col.width ?? MIN_COLUMN_WIDTH), 0) +
      (selectable ? SELECT_COLUMN_WIDTH : 0) +
      (hasActions ? skin.actionsColWidth : 0);

    // ---- sorting -----------------------------------------------------------
    // Self-managed by default (header press cycles asc -> desc -> off);
    // controlled via `sort`/`onSortChange`.
    const [sortState, setSortState] = useControllableState<DataTableSort | null>(
      props.sort,
      props.defaultSort ?? null,
      props.onSortChange,
    );
    const sortableAt = (col: NormalColumn) => (props.sortable ? col.sortable !== false : !!col.sortable);
    const activeCol = sortState ? cols.find((c) => c.key === sortState.column) : undefined;
    devWarn(
      !!sortState && !activeCol,
      `[canvas] <DataTable> sort.column "${sortState?.column}" matches no column key; rendering unsorted.`,
    );

    const cycleSort = (col: NormalColumn) => {
      // Any table press that is not the armed bin disarms a pending delete
      // (see the row-interactions section below; this closure is call-time safe).
      disarmDelete();
      const active = activeCol?.key === col.key;
      if (!active) setSortState({ column: col.key });
      else if (!sortState?.descending) setSortState({ column: col.key, descending: true });
      else setSortState(null);
    };

    // The view pipeline: original row indices, sorted, then paged. Everything
    // downstream (keys, selection, onRowPress) reports ORIGINAL `rows` indices,
    // so a consumer's handlers are stable under sorting and paging.
    // Drafts, selection, delete arming, and layout do not alter committed data.
    // Cache the full view pipeline on immutable inputs and primitive sort
    // semantics, so a fresh but equivalent controlled sort object is harmless.
    const descending = !!sortState?.descending;
    const viewIndices = useMemo(() => {
      const indices = rows.map((_, i) => i);
      if (!activeCol) return indices;
      const ci = cols.indexOf(activeCol);
      const dir = descending ? -1 : 1;
      let sawOpaque = false;
      const values = rows.map((row, i) => {
        const cell = row[ci];
        if (activeCol.sortValue) return activeCol.sortValue(cell, row, i) ?? null;
        if (typeof cell === "string" || typeof cell === "number") return cell;
        if (cell != null) sawOpaque = true;
        return null;
      });
      // Nulls (opaque custom cells without a sortValue) always sort last.
      indices.sort((a, b) => {
        const va = values[a];
        const vb = values[b];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return dir * compareCells(va, vb);
      });
      devWarn(
        sawOpaque,
        `[canvas] <DataTable> column "${activeCol.key}" has custom ReactNode cells and no sortValue; those rows sort last.`,
      );
      return indices;
    }, [rows, cols, activeCol, descending]);

    // ---- selection ---------------------------------------------------------
    // Keyed by `rowKey` (original index fallback); compared as strings so a
    // numeric key and its string form never split.
    const rawKey = (row: ReactNode[], i: number): string | number => (rowKey ? rowKey(row, i) : i);
    const keyOf = (row: ReactNode[], i: number) => String(rawKey(row, i));
    const [selected, setSelected] = useControllableState<Array<string | number>>(
      props.selectedKeys,
      props.defaultSelectedKeys ?? [],
      props.onSelectionChange,
    );
    const selectedSet = useMemo(() => new Set(selected.map(String)), [selected]);
    const { allSelected, someSelected } = useMemo(() => {
      if (!selectable || rows.length === 0 || selectedSet.size === 0) {
        return { allSelected: false, someSelected: false };
      }
      let count = 0;
      rows.forEach((row, i) => {
        if (selectedSet.has(String(rowKey ? rowKey(row, i) : i))) count += 1;
      });
      return { allSelected: count === rows.length, someSelected: count > 0 };
    }, [rows, rowKey, selectedSet, selectable]);

    const toggleAll = () => {
      disarmDelete();
      setSelected(allSelected ? [] : rows.map((row, i) => rawKey(row, i)));
    };
    const toggleRow = (row: ReactNode[], i: number) => {
      disarmDelete();
      const key = rawKey(row, i);
      const has = selectedSet.has(String(key));
      setSelected(has ? selected.filter((k) => String(k) !== String(key)) : [...selected, key]);
    };

    // ---- pagination --------------------------------------------------------
    const sizes = props.pageSizes;
    const [pageSize, setPageSize] = useControllableState<number>(
      props.pageSize,
      props.defaultPageSize ?? sizes?.[0] ?? 10,
      props.onPageSizeChange,
    );
    const pageCount = Math.max(1, Math.ceil(rows.length / Math.max(1, pageSize)));
    const [page, setPage] = useControllableState<number>(props.page, props.defaultPage ?? 1, props.onPageChange);
    const current = Math.min(Math.max(1, page), pageCount);
    const pageIndices = useMemo(
      () => paginated ? viewIndices.slice((current - 1) * pageSize, current * pageSize) : viewIndices,
      [viewIndices, paginated, current, pageSize],
    );
    // Original row index -> rendered position, for stable striping under sort/paging.
    const viewPos = useMemo(() => new Map(pageIndices.map((idx, pos) => [idx, pos])), [pageIndices]);

    // ---- row interactions (edit / delete / inline cell editing) ------------
    // All three are keyed by ORIGINAL `rows` indices, like everything else in
    // the view pipeline, so they stay stable under sorting and paging.
    // `editingRow` is the pencil-opened row; `draft` its in-progress string
    // cells by column index. `cellEdit` is the single open inline cell editor;
    // its ref twin is nulled synchronously on commit/cancel so the blur that
    // follows an Enter or Escape cannot double-commit. `armedRow` is the
    // delete awaiting its confirming second press.
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [draft, setDraft] = useState<Record<number, string>>({});
    const [cellEdit, setCellEditState] = useState<CellEdit | null>(null);
    const cellEditRef = useRef<CellEdit | null>(null);
    const setCellEdit = (next: CellEdit | null) => {
      cellEditRef.current = next;
      setCellEditState(next);
    };
    const [armedRow, setArmedRow] = useState<number | null>(null);

    // An armed delete disarms on its own when the confirm window lapses.
    useEffect(() => {
      if (armedRow == null) return;
      const id = setTimeout(() => setArmedRow(null), DELETE_CONFIRM_MS);
      return () => clearTimeout(id);
    }, [armedRow]);
    const disarmDelete = () => setArmedRow(null);

    devWarn(
      !!inlineEdit && !props.onCellCommit,
      "[canvas] <DataTable inlineEdit> without onCellCommit: cell edits close without being reported; pass onCellCommit(rowIndex, colIndex, next).",
    );
    devWarn(
      !!onRowEdit && !props.onRowCommit,
      "[canvas] <DataTable onRowEdit> without onRowCommit: Save closes the row editor without reporting the edited cells; pass onRowCommit(rowIndex, cells).",
    );

    const startRowEdit = (row: ReactNode[], r: number) => {
      disarmDelete();
      setCellEdit(null);
      const seed: Record<number, string> = {};
      row.forEach((cell, c) => {
        if (typeof cell === "string") seed[c] = cell;
      });
      setDraft(seed);
      setEditingRow(r);
      onRowEdit?.(r);
    };
    const cancelRowEdit = () => {
      setEditingRow(null);
      setDraft({});
    };
    const commitRow = (row: ReactNode[], r: number) => {
      const cells = row.map((cell, c) => (typeof cell === "string" ? (draft[c] ?? cell) : cell));
      cancelRowEdit();
      props.onRowCommit?.(r, cells);
    };
    const openCellEdit = (r: number, c: number, value: string) => {
      disarmDelete();
      setCellEdit({ row: r, col: c, value });
    };
    const cancelCellEdit = () => setCellEdit(null);
    // Commit-on-blur reads the ref, not the render's state: after Enter or
    // Escape already closed the editor the unmount blur finds it null and
    // stays a no-op.
    const commitCell = (row: ReactNode[], r: number, c: number) => {
      const live = cellEditRef.current;
      setCellEdit(null);
      if (!live || live.row !== r || live.col !== c) return;
      if (live.value !== row[c]) props.onCellCommit?.(r, c, live.value);
    };

    // The row's first cell text, folded into the action buttons' and editors'
    // accessible names so "Edit"/"Delete" announce WHICH row they act on.
    const rowNameOf = (row: ReactNode[], r: number): string => {
      const first = row[0];
      return typeof first === "string" || typeof first === "number" ? String(first) : `row ${r + 1}`;
    };

    const wrap: StyleProp<ViewStyle> = [
      // FILL: the table spans the parent it is given (the 320 floor below is the skin's).
      fill,
      skin.wrap,
      // The skin's 320 floor keeps columns readable in content-sized contexts,
      // but once the table has MEASURED a narrower container (a real phone, a
      // narrow docs column) the collapse/pan machinery above guarantees
      // readability, and keeping the floor would clip: drop it. Converges: the
      // floored table measures its (narrow) container, the floor drops, and the
      // remeasure at true container width stays below sm.
      measuredWidth > 0 && measuredWidth < breakpoints.sm ? { minWidth: 0 } : null,
      // RN has no ring; a rounded 1px border is the bordered outline.
      bordered ? skin.borderedOutline(tokens) : null,
      style,
    ];

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    // A windowed body needs a bounded height to scroll (and to window). Warn once if
    // `virtualized` is set without one; the FlatList would otherwise render every row.
    const flat = (StyleSheet.flatten(style) ?? {}) as RNViewStyle;
    const bounded = flat.height != null || flat.maxHeight != null || flat.flex != null || flat.flexBasis != null;
    devWarn(
      !!virtualized && !bounded,
      "[canvas] <DataTable virtualized>: give the table a bounded height (e.g. style={{ maxHeight: 400 }}) so the body can window and scroll; rendering eagerly for now.",
    );

    // The data rows: skeleton placeholders while loading; a windowed FlatList
    // when asked (and bounded); else every row of the page mounted (the
    // default). The header row above stays fixed either way.
    const body = loading ? (
      Array.from({ length: paginated ? Math.min(pageSize, 10) : 5 }, (_, r) => (
        <View key={`sk-${r}`} style={skin.dataRow(tokens)} role="row">
          {selectable ? <View style={[skin.selectCell, skin.cellPad[density]]} role="cell" /> : null}
          {visibleColumns.map((col, c) => (
            <View key={`skc-${c}`} style={[skin.dataCell, skin.cellPad[density], widthStyle(col)]} role="cell">
              <Skeleton text small animate {...SKELETON_LENGTHS[(r + c) % SKELETON_LENGTHS.length]} />
            </View>
          ))}
          {hasActions ? <View style={[ACTIONS_CELL, { width: skin.actionsColWidth }]} role="cell" /> : null}
          {skin.separator ? <View style={[skin.separator(tokens), { pointerEvents: "none" }]} /> : null}
        </View>
      ))
    ) : virtualized && bounded ? (
      <FlatList
        data={pageIndices}
        renderItem={({ item }) => renderDataRow(rows[item]!, item)}
        keyExtractor={(item) => keyOf(rows[item]!, item)}
        extraData={[selected, sortState, density, striped, editingRow, draft, cellEdit, armedRow]}
        showsVerticalScrollIndicator={false}
      />
    ) : (
      pageIndices.map((i) => <Fragment key={keyOf(rows[i]!, i)}>{renderDataRow(rows[i]!, i)}</Fragment>)
    );

    const table = (
      <>
        <View style={[withInnerFill(theme, skin.headerRow(tokens), "soft"), skin.headerPad[density]]} role="row">
          {selectable ? (
            <View style={skin.selectCol} role="columnheader">
              <Checkbox
                small
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleAll}
                disabled={rows.length === 0 || loading}
                accessibilityLabel="Select all rows"
              />
            </View>
          ) : null}
          {visibleColumns.map((col) => renderHeaderCell(col))}
          {hasActions ? (
            // The unlabeled spacer over the trailing actions column keeps the
            // header labels aligned with their data columns.
            <View style={[ACTIONS_CELL, { width: skin.actionsColWidth }]} role="columnheader" />
          ) : null}
        </View>
        {body}
        {!loading && rows.length === 0 && emptyMessage != null ? (
          <View style={EMPTY_WRAP}>
            {typeof emptyMessage === "string" ? (
              <Text style={skin.captionText(tokens)}>{emptyMessage}</Text>
            ) : (
              emptyMessage
            )}
          </View>
        ) : null}
      </>
    );

    return (
      <GlassSurface
        layer="content"
        testID={testID}
        style={wrap}
        role={pans ? undefined : "table"}
        onLayout={onMeasureLayout}
      >
        {pans ? (
          <ScrollView {...scrollFocus} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.panContent}>
            {/* A focusable scrollport surrounds the table. Putting it inside the
                table would expose a generic interactive child where rows belong. */}
            <View role="table" style={[s.panInner, { minWidth: panMinWidth }]}>{table}</View>
          </ScrollView>
        ) : (
          table
        )}
        {paginated ? (
          <View style={FOOTER_BAR}>
            {selectable ? (
              <Text style={skin.captionText(tokens)}>{`${selected.length} of ${rows.length} selected`}</Text>
            ) : (
              <View />
            )}
            <Pagination
              small
              compact={sizes == null ? true : undefined}
              withSize={sizes != null ? true : undefined}
              page={current}
              total={pageCount}
              onChange={(p) => {
                disarmDelete();
                setPage(p);
              }}
              itemCount={rows.length}
              pageSize={pageSize}
              pageSizes={sizes}
              onPageSizeChange={setPageSize}
              disabled={loading}
            />
          </View>
        ) : null}
      </GlassSurface>
    );

    // A header cell: a plain labeled box, or (sortable) a pressable label +
    // direction indicator cycling ascending -> descending -> off.
    function renderHeaderCell(col: NormalColumn) {
      const align: ViewStyle | null = col.numeric
        ? { justifyContent: "flex-end" }
        : col.centered
          ? { justifyContent: "center" }
          : null;
      const label = (
        <Text
          style={[
            skin.headerCell(tokens),
            { flexShrink: 1 },
            col.numeric ? { textAlign: "right" } : col.centered ? { textAlign: "center" } : null,
          ]}
        >
          {col.label}
        </Text>
      );
      if (!sortableAt(col)) {
        return (
          <View key={`h-${col.key}`} style={[HEADER_CELL_BOX, align, widthStyle(col)]} role="columnheader">
            {label}
          </View>
        );
      }
      const active = activeCol?.key === col.key;
      const descending = active && !!sortState?.descending;
      // aria-sort reaches the web DOM (RNW forwards aria-*); native screen
      // readers get the state folded into the accessible name instead.
      const sortA11y = {
        "aria-sort": active ? (descending ? "descending" : "ascending") : "none",
      } as unknown as ViewProps;
      return (
        <Pressable
          key={`h-${col.key}`}
          onPress={() => cycleSort(col)}
          android_ripple={ripple}
          role="columnheader"
          accessibilityLabel={
            active ? `${col.label}, sorted ${descending ? "descending" : "ascending"}` : `${col.label}, sortable`
          }
          {...sortA11y}
          style={({ pressed }) => [
            HEADER_CELL_BOX,
            align,
            widthStyle(col),
            // Android ripples; iOS/web dim the pressed header label.
            skin.ripple == null && pressed ? { opacity: 0.6 } : null,
          ]}
        >
          {label}
          {active ? (
            descending ? (
              <Icon chevronDown muted size={skin.sortIconSize} decorative />
            ) : (
              <Icon chevronUp muted size={skin.sortIconSize} decorative />
            )
          ) : (
            <Icon chevronsUpDown muted size={skin.sortIconSize} decorative />
          )}
        </Pressable>
      );
    }

    // A keyless data row (the key is supplied by the eager map / FlatList keyExtractor).
    //
    // A data row is always `role="row"`, whatever it does on press. It is
    // tempting to role the pressable row a button, and it is wrong twice over:
    // web renders that role as a real <button>, so every `role="cell"` in the
    // row loses the row that has to own it (the table stops reading as a
    // table), and every control the row carries (the select checkbox, a menu
    // or a link a caller put in a cell) becomes a focusable descendant of a
    // button, which is invalid DOM and logs a React nesting error.
    //
    // So the press splits in two. The row keeps the POINTER convenience, out of
    // the accessibility tree, so a press anywhere on it still acts. The action
    // itself is a real button inside the first data cell (see renderBodyCell),
    // sibling to everything else in the row: that is the tab stop, and that is
    // what a screen reader announces. The one thing a caller owes this is to
    // keep its own controls out of the leading column when it passes
    // `onRowPress`, since that column is where the activator goes.
    function renderDataRow(row: ReactNode[], r: number) {
      const rowId = keyOf(row, r);
      const isSelected = selectable && selectedSet.has(rowId);
      const rowEditing = editingRow === r;
      // While ANY editor is open in this row it must not render as a pressable
      // row: a text input may not nest inside a button-roled node on web, and
      // a stray row press under the field would fight the editor.
      const editingHere = rowEditing || (cellEdit != null && cellEdit.row === r);
      const selectCell = selectable ? (
        <View style={[skin.selectCell, skin.cellPad[density]]} role="cell">
          {/* The row selector: its own Pressable, so a tap on the box toggles
              selection while a tap elsewhere on the row still reaches the
              row's press behavior (the responder system grants the innermost
              pressable the touch). */}
          <Checkbox
            small
            checked={!!isSelected}
            onChange={() => toggleRow(row, r)}
            accessibilityLabel={rowLabel(row) || `Select row ${r + 1}`}
          />
        </View>
      ) : null;
      // The row action's KEYBOARD and screen-reader path: a real button, in the
      // first data cell, beside every other control in the row rather than
      // around them (see the structure note above renderDataRow).
      const activate =
        onRowPress && !editingHere
          ? () => {
              disarmDelete();
              onRowPress(row, r);
            }
          : undefined;
      const dataCells = visibleColumns.map((col, i) =>
        renderBodyCell(row, r, rowId, col, i === 0 ? activate : undefined),
      );
      // An inset row separator (iOS), absolutely positioned so it does not
      // affect the flex layout; web/Android use the dataRow's full-bleed
      // borderBottom instead (skin.separator is null there).
      const separator = skin.separator ? <View style={[skin.separator(tokens), { pointerEvents: "none" }]} /> : null;
      // The striped tint sits on odd VIEW positions (the rendered order) so the
      // banding survives sorting and paging; a selected row's stronger tint (the
      // skin's press fill: M3's primary state layer on Android, the system fill
      // on iOS, accent on web) wins over it, and the edit wash marks the row
      // whose pencil editor is open.
      const stripe = striped && (viewPos.get(r) ?? 0) % 2 === 1 ? withInnerFill(theme, skin.stripeTint(tokens), "faint") : null;
      const selectedTint = isSelected ? withInnerFill(theme, skin.pressTint(tokens), "firm") : null;
      const editWash = rowEditing ? skin.editTint(tokens) : null;
      // Row press: an explicit action when given; otherwise a selectable row
      // toggles itself (the checkbox alone carries the a11y semantics there, so
      // the convenience Pressable stays out of the accessibility tree).
      const press = editingHere ? undefined : (onRowPress ?? (selectable ? toggleRow : undefined));
      const pressRow = press
        ? () => {
            disarmDelete();
            press(row, r);
          }
        : undefined;

      if (hasActions) {
        // With a trailing actions column the data cells sit in a flex-1 press
        // area and the actions cell rides BESIDE it as a sibling, so a press on
        // the pencil/bin (or on the padding around them) can never double as a
        // row press. The press area carries no role and stays out of the
        // accessibility tree: the row's semantics belong to the row.
        const area = pressRow ? (
          <Pressable
            onPress={pressRow}
            android_ripple={ripple}
            accessible={false}
            focusable={false}
            style={({ pressed }) => [
              ROW_PRESS_AREA,
              // Android ripples; iOS/web tint the pressed area fill.
              skin.ripple == null && pressed ? withInnerFill(theme, skin.pressTint(tokens), "firm") : null,
            ]}
          >
            {selectCell}
            {dataCells}
          </Pressable>
        ) : (
          <View style={ROW_PRESS_AREA}>
            {selectCell}
            {dataCells}
          </View>
        );
        return (
          <View
            role="row"
            style={[
              skin.dataRow(tokens),
              // Hold the platform minimum tap target (iOS 44pt / M3 48dp).
              skin.pressableMinHeight != null && pressRow ? { minHeight: skin.pressableMinHeight } : null,
              stripe,
              selectedTint,
              editWash,
            ]}
          >
            {area}
            {renderActionsCell(row, r)}
            {separator}
          </View>
        );
      }

      const cells = (
        <>
          {selectCell}
          {dataCells}
          {separator}
        </>
      );
      return pressRow ? (
        <Pressable
          onPress={pressRow}
          android_ripple={ripple}
          // A row is a `row`, never a button: its cells have to stay owned by a
          // row for the table to read as a table, and a button-roled row would
          // swallow every control the cells carry. The press here is the
          // pointer convenience only, so it stays out of the accessibility
          // tree; the activator in the first cell is the reachable action.
          role="row"
          accessible={false}
          focusable={false}
          style={({ pressed }) => [
            skin.dataRow(tokens),
            // Hold the platform minimum tap target (iOS 44pt / M3 48dp) so a
            // compact pressable row is not sub-minimum; web omits it.
            skin.pressableMinHeight != null ? { minHeight: skin.pressableMinHeight } : null,
            stripe,
            selectedTint,
            // Android ripples; iOS/web tint the row fill on press.
            skin.ripple == null && pressed ? withInnerFill(theme, skin.pressTint(tokens), "firm") : null,
          ]}
        >
          {cells}
        </Pressable>
      ) : (
        <View style={[skin.dataRow(tokens), stripe, selectedTint, editWash]} role="row">
          {cells}
        </View>
      );
    }

    // One data cell: the plain text/node; a press-to-edit target when
    // `inlineEdit` can open it; or the open editor field (a press-opened cell,
    // or every string cell while the row is in pencil-opened edit mode).
    function renderBodyCell(
      row: ReactNode[],
      r: number,
      rowId: string,
      col: NormalColumn,
      activate?: () => void,
    ) {
      const c = cols.indexOf(col);
      const cell = cellOf(row, c);
      const rowEditing = editingRow === r;
      const cellOpen =
        typeof cell === "string" &&
        (rowEditing || (cellEdit != null && cellEdit.row === r && cellEdit.col === c));
      const alignCell: ViewStyle | null = col.numeric
        ? { alignItems: "flex-end" }
        : col.centered
          ? { alignItems: "center" }
          : null;
      // A numeric column reads DOWN, not across, and proportional digits are
      // different widths: 1 is narrow, 0 and 4 are wide. So the same column of
      // figures fails to line up on the decimal, and a value that updates in
      // place visibly jitters as its digits change. Tabular figures give every
      // digit the same advance. The editor gets them too, so opening a cell for
      // editing does not reflow the number under the caret.
      const alignText: TextStyle | null = col.numeric
        ? { textAlign: "right", ...tabularNums() }
        : col.centered
          ? { textAlign: "center" }
          : null;

      let content: ReactNode;
      if (cellOpen) {
        const name = rowNameOf(row, r);
        // In row mode the FIRST visible string cell takes focus on open; a
        // press-opened cell editor always does (the a11y contract's
        // focus-moves-into-the-editor rule).
        const focusCol = rowEditing
          ? visibleColumns.map((vc) => cols.indexOf(vc)).find((i) => typeof row[i] === "string")
          : c;
        content = (
          <TextInput
            value={rowEditing ? (draft[c] ?? "") : cellEdit!.value}
            onChangeText={(next) =>
              rowEditing ? setDraft((d) => ({ ...d, [c]: next })) : setCellEdit({ row: r, col: c, value: next })
            }
            autoFocus={focusCol === c}
            onSubmitEditing={() => (rowEditing ? commitRow(row, r) : commitCell(row, r, c))}
            onKeyPress={(e) => {
              // Escape restores the cell (web; native cancels via the Cancel
              // button in row mode, or by committing the unchanged value).
              if (e.nativeEvent.key === "Escape") {
                consumeEscapeKey(e);
                (rowEditing ? cancelRowEdit : cancelCellEdit)();
              }
            }}
            onBlur={() => {
              // Inline cell editing commits on blur; row mode waits for
              // Save/Cancel so tabbing between its fields does not commit.
              if (!rowEditing) commitCell(row, r, c);
            }}
            accessibilityLabel={`Edit ${col.label} for ${name}`}
            aria-label={`Edit ${col.label} for ${name}`}
            style={[skin.editInput(tokens), alignText]}
          />
        );
      } else {
        const text =
          typeof cell === "string" || typeof cell === "number" ? (
            <Text style={[skin.cellText(tokens), alignText]}>{cell}</Text>
          ) : (
            cell
          );
        // An inline-editable (string) cell is a press target opening its
        // editor. It stays out of the accessibility tree when the row carries
        // an action (`onRowPress`), because this cell then holds the row's
        // activator and nested buttons are invalid on web; there the row press
        // is the primary semantic (pencil row editing carries the accessible
        // editing path).
        content =
          inlineEdit && typeof cell === "string" && !rowEditing ? (
            <Pressable
              onPress={() => openCellEdit(r, c, cell)}
              {...(onRowPress
                ? { accessible: false, focusable: false }
                : {
                    role: "button" as const,
                    accessibilityLabel: `Edit ${col.label} for ${rowNameOf(row, r)}`,
                    "aria-label": `Edit ${col.label} for ${rowNameOf(row, r)}`,
                  })}
            >
              {text}
            </Pressable>
          ) : (
            text
          );
      }

      // The row's activator, when this is the first data cell of a row that has
      // an action. It is the ONE thing in the row that carries the row press as
      // a control: a real button, sibling to the select checkbox and to
      // whatever the caller put in the other cells, so nothing nests and the
      // cells stay owned by the row. Its name comes from the plain cells when
      // there are any, and otherwise from this cell's own content, which is the
      // column tables lead with and the one a reader identifies the row by.
      if (activate && !cellOpen) {
        const label = rowLabel(row);
        content = (
          <Pressable
            onPress={activate}
            role="button"
            accessibilityLabel={label || undefined}
            aria-label={label || undefined}
            style={[ROW_ACTIVATOR, alignCell]}
          >
            {content}
          </Pressable>
        );
      }

      return (
        <View
          key={`c-${rowId}-${c}`}
          style={[skin.dataCell, skin.cellPad[density], widthStyle(col), alignCell]}
          role="cell"
        >
          {content}
        </View>
      );
    }

    // The trailing actions cell: pencil/bin normally, Save/Cancel while the
    // row is in pencil-opened edit mode. Delete is second-press confirm: the
    // first press ARMS it (destructive bin, a "Confirm delete" name), the
    // second within the window fires onRowDelete, and any other table press
    // (or the window lapsing) disarms.
    function renderActionsCell(row: ReactNode[], r: number) {
      const name = rowNameOf(row, r);
      const armed = armedRow === r;
      const iconSize = skin.actionIconSize;
      return (
        <View style={[ACTIONS_CELL, { width: skin.actionsColWidth }]} role="cell">
          {editingRow === r ? (
            <>
              {actionButton(`Save ${name}`, () => commitRow(row, r), <Icon check success size={iconSize} decorative />)}
              {actionButton(`Cancel editing ${name}`, cancelRowEdit, <Icon x muted size={iconSize} decorative />)}
            </>
          ) : (
            <>
              {onRowEdit
                ? actionButton(`Edit ${name}`, () => startRowEdit(row, r), <Icon pencil muted size={iconSize} decorative />)
                : null}
              {onRowDelete
                ? actionButton(
                    armed ? `Confirm delete ${name}` : `Delete ${name}`,
                    () => {
                      if (armed) {
                        setArmedRow(null);
                        onRowDelete(r);
                      } else {
                        setCellEdit(null);
                        setArmedRow(r);
                      }
                    },
                    armed ? (
                      <Icon trash2 destructive size={iconSize} decorative />
                    ) : (
                      <Icon trash2 muted size={iconSize} decorative />
                    ),
                  )
                : null}
            </>
          )}
        </View>
      );
    }

    // One icon action button at the skin's touch-target size. Android ripples
    // (controlRipple radiates from the touch point, the icon-button idiom);
    // iOS/web dim the glyph on press. The glyph is decorative: the button's
    // accessible name carries the action AND the row it acts on.
    function actionButton(label: string, onPress: () => void, glyph: ReactNode) {
      return (
        <Pressable
          onPress={onPress}
          android_ripple={skin.ripple ? controlRipple(tokens) : undefined}
          role="button"
          accessibilityLabel={label}
          aria-label={label}
          style={({ pressed }) => [skin.actionButton, skin.ripple == null && pressed ? { opacity: 0.6 } : null]}
        >
          {glyph}
        </Pressable>
      );
    }
  };
}

// Read a cell, tolerating short rows (missing trailing cells render empty).
function cellOf(row: ReactNode[], index: number): ReactNode {
  const value = row[index];
  return value == null ? "" : value;
}

// Derive a screen-reader label for a pressable row from its plain text cells.
// Custom ReactNode cells (links, badges, inputs) carry their own labels, so only
// the string/number cells are joined here.
function rowLabel(row: ReactNode[]): string {
  return row
    .filter((cell): cell is string | number => typeof cell === "string" || typeof cell === "number")
    .join(", ");
}
