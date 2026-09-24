import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ComponentType, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RippleClip,
  cornerRadii,
  useControllableState,
  useMeasuredWidth,
  type StyleProp,
  type ViewStyle,
  GlassSurface,
  withInnerFill,
} from "../../style/index.js";
import { Card as WebCard } from "../../molecules/card/card.js";
import { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { RowMenu as WebRowMenu } from "../row-menu/row-menu.js";
import {
  DragDropProvider as WebDragDropProvider,
  DropZone as WebDropZone,
  Draggable as WebDraggable,
  DragHandle as WebDragHandle,
} from "../drag-drop/drag-drop.js";
import { useDragActive, type DropEvent, type DragDropProviderProps, type DropZoneProps, type DraggableProps, type DragHandleProps } from "../drag-drop/drag-drop.shared.js";
import { type CardProps } from "../../molecules/card/card.shared.js";
import { type BadgeProps } from "../../atoms/badge/badge.shared.js";
import { type RowMenuProps } from "../row-menu/row-menu.shared.js";
import { type RowMenuItem } from "../row-menu/row-menu.styles.js";
import { type BoardColumn, type BoardItem, type BoardMove } from "./board.types.js";
import { boardMoveFor, applyBoardMove } from "./board.logic.js";
import { type BoardSkin } from "./board.styles.js";
import { SeamLimitProvider, splitSeam, type SeamLimit } from "../../style/touch-seam.js";

// Shared Board shell. A data-driven kanban board: a horizontal ScrollView of column lanes,
// each lane a DropZone listing its cards in array order, each card a Draggable kit Card with
// a DragHandle grip, an optional trailing badge, an optional kebab RowMenu, a muted 2-line
// description, and a free-form `chips` slot. The whole drag interaction (pointer ghost,
// insertion indicator, keyboard grab/move/drop, screen-reader announcements) comes from the
// kit's own DragDrop family; Board adds only the kanban structure and the move bookkeeping.
//
// Board is a "Light" treatment: this shell owns the structure and logic once; a platform file
// supplies its skin (lane/column shape and density, type scale, press feedback) plus the
// platform-styled composed parts (Card, Badge, RowMenu, and the DnD family) and calls
// createBoard. The literal per-OS part imports exist for the WEB docs 3-up, where a barrel
// import would resolve the web builds (the StackedList precedent).
//
// State contract (the kit's controlled + uncontrolled duality, via useControllableState):
//   - CONTROLLED: pass `items`; order within a column is array order filtered by `columnId`.
//     The kit NEVER mutates the list itself: a drop computes a BoardMove and reports it
//     through `onMove` (and `onItemsChange` with the would-be next array); the consumer owns
//     applying it (`applyBoardMove` is the standard reducer).
//   - UNCONTROLLED: pass `defaultItems` (or nothing); Board applies each move internally with
//     applyBoardMove and reports through `onItemsChange`/`onMove`, so a bare Board is
//     interactive out of the box.
//
// The drop's insertion index EXCLUDES the dragged card (the DnD layer's convention), so
// BoardMove.index and its afterId/beforeId neighbors read against the target column's order
// without the dragged card; boardMoveFor (board.logic.ts, pure and unit-tested) derives them.
//
// Anatomy note: the card body (title + description + chips) is the press target for
// `onPressItem`, rendered as a SIBLING of the grip/kebab/badge cluster, never a wrapper
// around them. A whole-card pressable would nest the DragHandle and RowMenu buttons inside a
// button: invalid DOM on web (react-native-web renders real <button> elements) and an
// ambiguous, doubly-focusable control for assistive tech.
//
// Lanes and composed Cards own static content surfaces in glass mode. Their
// reading content stays stable; row menus resolve their own functional material.

export type { BoardColumn, BoardItem, BoardMove };

export interface BoardProps {
  /** The columns (lanes), left to right. */
  columns: BoardColumn[];
  /**
   * CONTROLLED list; order within a column is array order filtered by `columnId`. The kit
   * never mutates it: apply each `onMove` yourself (`applyBoardMove` is the standard
   * reducer). Omit it (optionally passing `defaultItems`) for uncontrolled use.
   */
  items?: BoardItem[];
  /** Initial list for UNCONTROLLED use; Board then applies each move internally. */
  defaultItems?: BoardItem[];
  /** Fired with the would-be next list after a drop, in both modes. */
  onItemsChange?: (items: BoardItem[]) => void;
  /** Fired on every completed drop with the computed move (source, target, index, neighbors). */
  onMove?: (move: BoardMove) => void;
  /** Makes each card body pressable and reports the pressed item. */
  onPressItem?: (item: BoardItem) => void;
  /** Fired when a row of a card's kebab menu (`item.menu`) is selected. */
  onSelectItemMenu?: (item: BoardItem, menuItem: RowMenuItem, menuIndex: number) => void;
  /** Column width in px (default 300). */
  columnWidth?: number;
  // Density axis (pass none for the default density).
  compact?: boolean;
  /** Message shown in an empty column (default "No items"). */
  emptyLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// The composed-part component types, so each platform can pass its own resolved builds
// (web base by default) without widening to `any`.
export interface BoardParts {
  DragDropProvider: ComponentType<DragDropProviderProps>;
  DropZone: ComponentType<DropZoneProps>;
  Draggable: ComponentType<DraggableProps<BoardItem>>;
  DragHandle: ComponentType<DragHandleProps>;
  Card: ComponentType<CardProps>;
  Badge: ComponentType<BadgeProps>;
  RowMenu: ComponentType<RowMenuProps>;
}

const WEB_PARTS: BoardParts = {
  DragDropProvider: WebDragDropProvider,
  DropZone: WebDropZone,
  Draggable: WebDraggable,
  DragHandle: WebDragHandle,
  Card: WebCard,
  Badge: WebBadge,
  RowMenu: WebRowMenu,
};

// Shared layout fragments (identical across platforms).
const ROOT: ViewStyle = { width: "100%", maxWidth: "100%" };
// flex-1: the card's text column fills the row beside the trailing cluster.
const BODY: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

/** Build a Board component from a platform skin and its platform-styled parts. */
export function createBoard(skin: BoardSkin, parts: BoardParts = WEB_PARTS) {
  const { DragDropProvider, DropZone, Draggable, DragHandle, Card, Badge, RowMenu } = parts;
  // The grip and the menu trigger split the cluster's gap between their facing touch areas.
  // Both reach further than half of it on every platform (the grip 8 on each side, the trigger
  // to the platform minimum), so each keeps half (splitSeam).
  const clusterGap = (StyleSheet.flatten(skin.trailingCluster) as ViewStyle).gap;
  const [handleEnd, menuStart] = splitSeam(Infinity, Infinity, typeof clusterGap === "number" ? clusterGap : 0);
  const handleSeam: SeamLimit = { end: handleEnd };
  const menuSeam: SeamLimit = { start: menuStart };

  interface LanesProps {
    columns: BoardColumn[];
    list: BoardItem[];
    onDrop: (e: DropEvent) => void;
    onPressItem?: (item: BoardItem) => void;
    onSelectItemMenu?: (item: BoardItem, menuItem: RowMenuItem, menuIndex: number) => void;
    columnWidth: number;
    compact: boolean;
    emptyLabel: string;
  }

  // The lanes live in their own component INSIDE the provider so useDragActive can subscribe:
  // while a pointer drag is in flight the horizontal scroll freezes (the zone rects were
  // measured at grab time, so scrolling mid-drag would divorce hit-testing from the screen).
  function BoardLanes({ columns, list, onDrop, onPressItem, onSelectItemMenu, columnWidth, compact, emptyLabel }: LanesProps) {
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const dragging = useDragActive();
    // Lanes fit the measured board: in a container narrower than the configured
    // lane (a phone), a lane fills most of the width with a 32pt peek of the
    // next lane (240 floor); containers that fit keep `columnWidth` untouched.
    const { width: boardWidth, measured, onLayout: onBoardLayout } = useMeasuredWidth();
    const laneWidth = measured ? Math.min(columnWidth, Math.max(boardWidth - 32, 240)) : columnWidth;
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const pressFeedback = (pressed: boolean) =>
      skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null;

    const renderBody = (item: BoardItem): ReactNode => {
      const content = (
        <>
          <Text style={skin.cardTitle(tokens)}>{item.title}</Text>
          {item.description != null ? (
            <Text style={skin.cardDescription(tokens)} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {item.chips != null ? <View style={skin.chipsRow}>{item.chips}</View> : null}
        </>
      );
      if (!onPressItem) return <View style={[BODY, skin.bodyColumn(compact)]}>{content}</View>;
      return (
        // The bounded Android ripple is clipped to the body's rounded corners by this
        // RippleClip parent (a node can never clip its own ripple); the wrapper owns the
        // flex so layout is identical with or without the press affordance.
        <RippleClip shape={cornerRadii(skin.pressableBody)} style={BODY}>
          <Pressable
            style={({ pressed }) => [
              skin.bodyColumn(compact),
              skin.pressableBody,
              pressed ? withInnerFill(theme, skin.pressedSurface(tokens), "firm") : null,
              pressFeedback(pressed),
            ]}
            android_ripple={ripple}
            onPress={() => onPressItem(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            {content}
          </Pressable>
        </RippleClip>
      );
    };

    const renderCard = (item: BoardItem): ReactNode => {
      const menu = item.menu != null && item.menu.length > 0 ? item.menu : null;
      return (
        <Draggable key={item.id} id={item.id} data={item} label={item.title}>
          <Card compact={compact}>
            <View style={skin.cardRow}>
              {renderBody(item)}
              <View style={skin.trailingColumn}>
                <View style={skin.trailingCluster}>
                  {/* The grip and the menu trigger sit the cluster's gap apart, and React
                      Native gives a point both touch areas cover to the later one, the menu:
                      each keeps its share of the gap (src/style/touch-seam.ts), so a tap on
                      the grip's edge never opens the menu. */}
                  <SeamLimitProvider value={menu ? handleSeam : undefined}>
                    <DragHandle label={`Move ${item.title}`} />
                  </SeamLimitProvider>
                  {menu ? (
                    <SeamLimitProvider value={menuSeam}>
                      <RowMenu
                        items={menu}
                        triggerLabel={`Actions for ${item.title}`}
                        onSelect={(menuItem, menuIndex) => onSelectItemMenu?.(item, menuItem, menuIndex)}
                      />
                    </SeamLimitProvider>
                  ) : null}
                </View>
                {item.badge != null ? <Badge secondary>{item.badge}</Badge> : null}
              </View>
            </View>
          </Card>
        </Draggable>
      );
    };

    return (
      <ScrollView horizontal onLayout={onBoardLayout} scrollEnabled={!dragging} showsHorizontalScrollIndicator={false} contentContainerStyle={skin.lanes(compact)}>
        {columns.map((col) => {
          const colItems = list.filter((it) => it.columnId === col.id);
          return (
            <DropZone key={col.id} id={col.id} label={col.label} onDrop={onDrop} style={{ width: laneWidth }}>
              {/* The lane is a CONTENT-layer pane under glass (the plain column View in
                  solid mode); the drop zone keeps the lane's width and drop target. */}
              <GlassSurface layer="content" style={skin.column(tokens, compact)}>
                <View style={skin.columnHeader}>
                  <Text style={skin.columnLabel(tokens)}>{col.label}</Text>
                  <Badge secondary>{col.badge ?? String(colItems.length)}</Badge>
                </View>
                <View style={skin.cardList(compact)}>
                  {colItems.map(renderCard)}
                  {colItems.length === 0 ? <Text style={skin.emptyLabel(tokens)}>{emptyLabel}</Text> : null}
                </View>
              </GlassSurface>
            </DropZone>
          );
        })}
      </ScrollView>
    );
  }

  return function Board(props: BoardProps) {
    const {
      columns,
      items,
      defaultItems,
      onItemsChange,
      onMove,
      onPressItem,
      onSelectItemMenu,
      columnWidth = 300,
      compact = false,
      emptyLabel = "No items",
      testID,
      style,
    } = props;
    const [list, setList] = useControllableState<BoardItem[]>(items, defaultItems ?? [], onItemsChange);

    const handleDrop = (e: DropEvent) => {
      const move = boardMoveFor(list, { id: e.id, from: e.from, to: e.to, index: e.index });
      if (!move) return;
      // Uncontrolled mode applies the move internally; controlled mode leaves the list to the
      // consumer (setList only fires onItemsChange there). onMove reports either way.
      setList(applyBoardMove(list, move));
      onMove?.(move);
    };

    return (
      <DragDropProvider testID={testID} style={[ROOT, style]}>
        <BoardLanes
          columns={columns}
          list={list}
          onDrop={handleDrop}
          onPressItem={onPressItem}
          onSelectItemMenu={onSelectItemMenu}
          columnWidth={columnWidth}
          compact={compact}
          emptyLabel={emptyLabel}
        />
      </DragDropProvider>
    );
  };
}
