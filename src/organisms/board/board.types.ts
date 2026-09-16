// The Board organism's public data shapes, split into a React-free module so the pure move
// logic (board.logic.ts) can import them without pulling in the component shell. The shell
// (board.shared.tsx) re-exports them, and the platform entries re-export from there, so the
// public import surface is unchanged: `import { type BoardItem } from "@ionizeio/canvas"`.

import { type ReactNode } from "react";
import { type RowMenuItem } from "../row-menu/row-menu.styles.js";

/** One column (lane) of the board. */
export interface BoardColumn {
  /** Stable id; BoardItem.columnId and BoardMove.from/to refer to it. */
  id: string;
  /** Column header label, also the drop zone's accessible name. */
  label: string;
  /** Explicit header badge text; when omitted the badge shows the item count. */
  badge?: string;
}

/** One card on the board. */
export interface BoardItem {
  /** Stable id, unique across the whole board. */
  id: string;
  /** The id of the column this item currently sits in. */
  columnId: string;
  /** Card title. */
  title: string;
  /** Muted second line, clamped to 2 lines. */
  description?: string;
  /** Trailing badge text on the card (e.g. story points). */
  badge?: string;
  /** Optional meta row slot rendered under the title (chips, avatars). */
  chips?: ReactNode;
  /** Optional per-card kebab menu rows (RowMenu items). */
  menu?: RowMenuItem[];
}

/** A completed drop, reported through `onMove`. */
export interface BoardMove {
  /** The moved item's id. */
  id: string;
  /** Source column id. */
  from: string;
  /** Target column id. */
  to: string;
  /** Insertion index within the target column (dragged item excluded). */
  index: number;
  /** Item now directly above, null = top of the column. */
  afterId: string | null;
  /** Item now directly below, null = bottom of the column. */
  beforeId: string | null;
}
