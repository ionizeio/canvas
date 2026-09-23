import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { Animated, PanResponder, StyleSheet, AccessibilityInfo, type GestureResponderEvent } from "react-native";
import { View, Text, useTheme, isRTL, type StyleProp, type ViewStyle, type ViewProps } from "../../style/index.js";
import { useFocusRingStyle } from "../../style/pressable.js";
import { Icon } from "../../atoms/icon/icon.js";
import { type DragDropSkin } from "./drag-drop.styles.js";
import {
  hitTestZone,
  insertionIndexFor,
  insertionOffset,
  sortByMainAxis,
  zonesInReadingOrder,
  keyboardMove,
  type Rect,
  type CardRect,
  type KeyboardMove,
  type ZoneCount,
} from "./drag-drop.geometry.js";

// Shared DragDrop shell. One `createDragDrop(skin)` factory returns the whole family
// (DragDropProvider, DropZone, Draggable, DragHandle) so they close over ONE React context; a
// platform file calls it with its skin and re-exports the four. Built entirely from React
// Native's own primitives (PanResponder for the pointer drag, Animated for the ghost, and
// `measureInWindow` for layout), so the same code path runs on iOS, Android, and the web
// (react-native-web) with NO Platform.OS branch and no web-only DOM/CSS.
//
// What it does:
//   - A `DropZone` is a droppable region (a kanban column, a list). It registers its box and
//     an `onDrop` with the provider and paints an over-highlight + insertion line while a drag
//     hovers it.
//   - A `Draggable` wraps an item; a `DragHandle` inside it is the grip you press to drag (a
//     handle, not the whole card, so card taps and page scroll are untouched). The item lifts
//     into a floating ghost that follows the finger; releasing over a zone fires that zone's
//     `onDrop` with the target zone and the insertion index.
//   - POINTER-FREE alternative for keyboard + screen-reader users: the grip is focusable and
//     operable with Space/Enter to grab, the arrow keys to move between zones and positions,
//     Space/Enter to drop, Escape to cancel, announced through AccessibilityInfo. A consumer
//     may ALSO offer a menu ("Move to …") as a further fallback; the two coexist.
//
// Coordinate model: see drag-drop.geometry.ts. Everything is measured via `measureInWindow` and
// expressed RELATIVE TO THE PROVIDER (a subtraction, so the web's viewport-vs-page scroll term
// cancels), and the live pointer is tracked by the PanResponder gesture DELTA (identical in
// page and viewport space). No scroll math, no platform check.

export interface DropEvent<T = unknown> {
  /** The dragged item's id. */
  id: string;
  /** The dragged item's `data`. */
  data: T;
  /** The source zone id. */
  from: string;
  /** The target zone id (equals `from` for a within-zone reorder). */
  to: string;
  /** The insertion index within the target zone, 0..count. */
  index: number;
}

export interface DragDropProviderProps {
  children: ReactNode;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. The
   *  provider wraps the whole draggable surface and hosts the floating drag ghost. */
  style?: StyleProp<ViewStyle>;
  /** E2E hook forwarded to the root element. */
  testID?: string;
}

export interface DropZoneProps {
  /** Stable id for this drop target, used in the drop event and for keyboard navigation. */
  id: string;
  /** Accessible name announced when a drag hovers or drops here (e.g. the column title). */
  label: string;
  /** Fired on THIS zone when an item is dropped into it (from any zone, including itself). */
  onDrop?: (e: DropEvent) => void;
  /** Lay the items out in a row so the insertion axis is horizontal (default is a vertical column). */
  horizontal?: boolean;
  /** Refuse drops: the zone is skipped by hit-testing and the keyboard cursor, and never highlights. */
  disabled?: boolean;
  children?: ReactNode;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
  /** E2E hook forwarded to the root element. */
  testID?: string;
}

export interface DraggableProps<T = unknown> {
  /** Stable id for this item (unique within the provider). */
  id: string;
  /** Arbitrary payload handed back in the drop event. */
  data: T;
  /** Accessible name of the item, used in drag announcements (falls back to `id`). */
  label?: string;
  /** Disable dragging: the grip inside becomes inert. */
  disabled?: boolean;
  /** Custom floating drag preview; defaults to the item's own `children`. */
  preview?: ReactNode;
  children?: ReactNode;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
  /** E2E hook forwarded to the root element. */
  testID?: string;
}

export interface DragHandleProps {
  /** Accessible name for the grip (e.g. "Reorder Rotate webhook secrets"). */
  label?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// ---- internal registry + snapshot types ------------------------------------

interface ZoneEntry {
  ref: RefObject<View | null>;
  label: string;
  disabled: boolean;
  horizontal: boolean;
  onDrop?: (e: DropEvent) => void;
}
interface DraggableEntry {
  ref: RefObject<View | null>;
  zoneId: string;
  info: RefObject<{ data: unknown; label: string; getPreview: () => ReactNode }>;
}

// Measured, provider-relative layout captured once at drag start (stable for the drag: the
// responder owns the gesture, so nothing scrolls or relayouts under it).
interface DragMeasure {
  zoneRects: Map<string, Rect>; // non-disabled zones only
  zoneOrder: string[]; // registration (paint) order, non-disabled: which zone wins an overlap
  zoneReadingOrder: string[]; // the same zones as they READ on screen: row by row, left to right
  cardsByZone: Map<string, CardRect[]>; // every draggable, provider-relative
}

interface ActiveDrag extends DragMeasure {
  dragId: string;
  data: unknown;
  label: string;
  sourceZoneId: string;
  cardLocal: Rect; // the dragged card's provider-relative rect (ghost origin + size)
  pointerLocalGrant: { x: number; y: number };
  overZoneId: string | null;
  index: number;
  keyboard: boolean;
}

// The renderable slice published to subscribers (the ghost outlet, the zones, the handles).
// Held in a ref + emitted via listeners (the portal.tsx pattern), so a drag re-renders only the
// few subscribed leaves, never the whole board under the provider.
interface Snapshot {
  active: boolean;
  keyboard: boolean;
  dragId: string | null;
  ghost: ReactNode;
  ghostSize: { width: number; height: number } | null;
  overZoneId: string | null;
  index: number;
  insertionOffset: number;
}
const EMPTY_SNAPSHOT: Snapshot = { active: false, keyboard: false, dragId: null, ghost: null, ghostSize: null, overZoneId: null, index: 0, insertionOffset: 0 };

interface DragDropApi {
  registerZone: (id: string, entry: ZoneEntry) => () => void;
  registerDraggable: (id: string, entry: DraggableEntry) => () => void;
  startPointerDrag: (args: {
    dragId: string;
    cardRef: RefObject<View | null>;
    handleRef: RefObject<View | null>;
    grantLocation: { x: number; y: number };
  }) => void;
  movePointerDrag: (dx: number, dy: number) => void;
  endPointerDrag: () => void;
  startKeyboardDrag: (dragId: string) => void;
  moveKeyboardDrag: (move: KeyboardMove) => void;
  commitKeyboardDrag: () => void;
  cancelKeyboardDrag: () => void;
  isKeyboardDragging: (dragId: string) => boolean;
  zoneCount: () => number;
  pan: Animated.ValueXY;
  subscribe: (l: () => void) => () => void;
  getSnapshot: () => Snapshot;
}

const DragDropContext = createContext<DragDropApi | null>(null);
const DropZoneContext = createContext<{ zoneId: string; horizontal: boolean } | null>(null);
const DraggableContext = createContext<{
  id: string;
  cardRef: RefObject<View | null>;
  disabled: boolean;
} | null>(null);

// Layout constants (px). The insertion line sits inset from the zone edges and a small gap off
// the nearest card; the source card dims to a hole while its ghost floats.
const INDICATOR_INSET = 4;
const INDICATOR_THICKNESS = 2;
const INDICATOR_GAP = 4;
const SOURCE_OPACITY = 0.4;

const S = StyleSheet.create({
  // box-none / none MUST come from StyleSheet.create for react-native-web to compile the
  // pointer-events polyfill (an inline literal is silently dropped). See rnw-box-none memory.
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 900, pointerEvents: "box-none" },
  ghost: { position: "absolute", top: 0, left: 0, pointerEvents: "none" },
  passthrough: { pointerEvents: "none" },
});

function announce(text: string): void {
  AccessibilityInfo.announceForAccessibility?.(text);
}

// Measure a node's window rect as a Promise (null when the node is absent/unlaid-out or the
// callback yields a non-finite value). react-native-web resolves this on a microtask; native
// via UIManager. Both are fast enough that the rects are ready before the finger travels.
function measureRect(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current as unknown as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;
    if (!node || typeof node.measureInWindow !== "function") return resolve(null);
    node.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every((v) => typeof v === "number" && Number.isFinite(v))) return resolve(null);
      resolve({ x, y, width, height });
    });
  });
}

/** Build the DragDrop family from a platform skin. */
export function createDragDrop(skin: DragDropSkin) {
  // ---- Provider -----------------------------------------------------------
  function DragDropProvider({ children, style, testID }: DragDropProviderProps) {
    const provRef = useRef<View>(null);
    const zones = useRef(new Map<string, ZoneEntry>());
    const zoneOrder = useRef<string[]>([]);
    const draggables = useRef(new Map<string, DraggableEntry>());
    const active = useRef<ActiveDrag | null>(null);
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // Renderable snapshot: a ref + listener set, emitted on meaningful change only.
    const snap = useRef<Snapshot>(EMPTY_SNAPSHOT);
    const listeners = useRef(new Set<() => void>());
    const setSnap = useCallback((next: Snapshot) => {
      snap.current = next;
      listeners.current.forEach((l) => l());
    }, []);
    const subscribe = useCallback((l: () => void) => {
      listeners.current.add(l);
      return () => {
        listeners.current.delete(l);
      };
    }, []);
    const getSnapshot = useCallback(() => snap.current, []);

    const api = useMemo<DragDropApi>(() => {
      // Pointer-drag session bookkeeping. Arming a pointer drag is ASYNC (measureAll spans
      // a few macrotasks), so a grip tapped and released before the measure lands would
      // otherwise arm a drag no pointer owns and leave the board stuck mid-"drag". `seq`
      // invalidates a measure superseded by a newer grab; `held` goes false on release.
      const pointerSession = { seq: 0, held: false };
      const registerZone: DragDropApi["registerZone"] = (id, entry) => {
        zones.current.set(id, entry);
        if (!zoneOrder.current.includes(id)) zoneOrder.current.push(id);
        return () => {
          zones.current.delete(id);
          zoneOrder.current = zoneOrder.current.filter((z) => z !== id);
        };
      };
      const registerDraggable: DragDropApi["registerDraggable"] = (id, entry) => {
        draggables.current.set(id, entry);
        return () => {
          draggables.current.delete(id);
        };
      };

      // Measure the provider, every non-disabled zone, and every draggable, all provider-relative.
      const measureAll = async (): Promise<{ provider: Rect; m: DragMeasure } | null> => {
        const provider = await measureRect(provRef);
        if (!provider) return null;
        const zoneRects = new Map<string, Rect>();
        const order: string[] = [];
        await Promise.all(
          zoneOrder.current.map(async (id) => {
            const z = zones.current.get(id);
            if (!z || z.disabled) return;
            const r = await measureRect(z.ref);
            if (r) {
              zoneRects.set(id, { x: r.x - provider.x, y: r.y - provider.y, width: r.width, height: r.height });
              order.push(id);
            }
          }),
        );
        const cardsByZone = new Map<string, CardRect[]>();
        await Promise.all(
          [...draggables.current.entries()].map(async ([id, d]) => {
            const r = await measureRect(d.ref);
            if (!r) return;
            const rect = { x: r.x - provider.x, y: r.y - provider.y, width: r.width, height: r.height };
            const list = cardsByZone.get(d.zoneId) ?? [];
            list.push({ id, rect });
            cardsByZone.set(d.zoneId, list);
          }),
        );
        // Restore registration order for hit-testing (Promise.all resolves out of order).
        order.sort((a, b) => zoneOrder.current.indexOf(a) - zoneOrder.current.indexOf(b));
        // The keyboard cursor walks the same zones as they READ on screen instead. Registration
        // order is mount order and goes stale the moment a zone moves (a reordered dashboard
        // cell, a lane the app moved): React reuses the keyed element, so nothing re-registers.
        // The rects measured just above are the live truth, so the cursor sorts by them.
        return { provider, m: { zoneRects, zoneOrder: order, zoneReadingOrder: zonesInReadingOrder(order, zoneRects, isRTL()), cardsByZone } };
      };

      // The zone's cards (provider-relative, in data order, dragged card removed) plus the axis
      // and direction they read along and the zone's own rect: the inputs both the insertion
      // index and the indicator offset need. `isRTL()` is read here, once per query, so the pure
      // geometry never has to touch the platform (see drag-drop.geometry.ts).
      const zoneCards = (a: ActiveDrag, zoneId: string) => {
        const horizontal = zones.current.get(zoneId)?.horizontal ?? false;
        const rtl = isRTL();
        const all = a.cardsByZone.get(zoneId) ?? [];
        const cards = sortByMainAxis(all.filter((c) => c.id !== a.dragId), horizontal, rtl);
        const zone = a.zoneRects.get(zoneId) ?? { x: 0, y: 0, width: 0, height: 0 };
        return { cards: cards.map((c) => c.rect), horizontal, rtl, zone };
      };

      const publishActive = (a: ActiveDrag) => {
        let offset = 0;
        if (a.overZoneId) {
          const { cards, horizontal, rtl, zone } = zoneCards(a, a.overZoneId);
          offset = insertionOffset(cards, a.index, zone, horizontal, rtl, INDICATOR_GAP);
        }
        setSnap({
          active: true,
          keyboard: a.keyboard,
          dragId: a.dragId,
          ghost: a.keyboard ? null : (snap.current.ghost ?? null),
          ghostSize: a.keyboard ? null : (snap.current.ghostSize ?? null),
          overZoneId: a.overZoneId,
          index: a.index,
          insertionOffset: offset,
        });
      };

      const finish = (a: ActiveDrag, dropped: boolean) => {
        if (dropped && a.overZoneId) {
          const z = zones.current.get(a.overZoneId);
          if (z && !z.disabled) {
            z.onDrop?.({ id: a.dragId, data: a.data, from: a.sourceZoneId, to: a.overZoneId, index: a.index });
            const same = a.overZoneId === a.sourceZoneId;
            announce(same ? `Moved ${a.label} to position ${a.index + 1} in ${z.label}.` : `Moved ${a.label} to ${z.label}, position ${a.index + 1}.`);
          } else {
            announce(`${a.label} returned. Drop cancelled.`);
          }
        } else {
          announce(`${a.label} returned. Drop cancelled.`);
        }
        active.current = null;
        setSnap(EMPTY_SNAPSHOT);
      };

      const startPointerDrag: DragDropApi["startPointerDrag"] = ({ dragId, cardRef, handleRef, grantLocation }) => {
        const d = draggables.current.get(dragId);
        if (!d) return;
        const session = ++pointerSession.seq;
        pointerSession.held = true;
        void (async () => {
          const measured = await measureAll();
          const handle = await measureRect(handleRef);
          // The grip may have been released (a tap, an instant flick) or re-grabbed while the
          // measure was in flight; arming now would strand an active drag no pointer owns
          // (endPointerDrag already ran against a null active and no-opped). Only the latest,
          // still-held session may arm.
          if (session !== pointerSession.seq || !pointerSession.held) return;
          if (!measured || !handle) return;
          const { provider, m } = measured;
          const sourceZoneId = d.zoneId;
          const cardEntry = (m.cardsByZone.get(sourceZoneId) ?? []).find((c) => c.id === dragId);
          if (!cardEntry) return;
          const handleLocal = { x: handle.x - provider.x, y: handle.y - provider.y };
          const pointerLocalGrant = { x: handleLocal.x + grantLocation.x, y: handleLocal.y + grantLocation.y };
          const info = d.info.current;
          const a: ActiveDrag = {
            ...m,
            dragId,
            data: info?.data,
            label: info?.label ?? dragId,
            sourceZoneId,
            cardLocal: cardEntry.rect,
            pointerLocalGrant,
            overZoneId: sourceZoneId,
            index: 0,
            keyboard: false,
          };
          // Seed the index from the pointer's start so the source hole reads correctly.
          const { cards, horizontal, rtl } = zoneCards(a, sourceZoneId);
          a.index = insertionIndexFor(pointerLocalGrant.x, pointerLocalGrant.y, cards, horizontal, rtl);
          active.current = a;
          pan.setValue({ x: a.cardLocal.x, y: a.cardLocal.y });
          // Ghost node + size are published now; publishActive keeps them across index changes.
          setSnap({ active: true, keyboard: false, dragId, ghost: info?.getPreview() ?? null, ghostSize: { width: a.cardLocal.width, height: a.cardLocal.height }, overZoneId: sourceZoneId, index: a.index, insertionOffset: 0 });
          publishActive(a);
          announce(`Picked up ${a.label}.`);
        })();
      };

      const movePointerDrag: DragDropApi["movePointerDrag"] = (dx, dy) => {
        const a = active.current;
        if (!a || a.keyboard) return;
        pan.setValue({ x: a.cardLocal.x + dx, y: a.cardLocal.y + dy });
        const px = a.pointerLocalGrant.x + dx;
        const py = a.pointerLocalGrant.y + dy;
        const over = hitTestZone(px, py, a.zoneRects, a.zoneOrder);
        let index = a.index;
        if (over) {
          const { cards, horizontal, rtl } = zoneCards(a, over);
          index = insertionIndexFor(px, py, cards, horizontal, rtl);
        }
        if (over !== a.overZoneId || index !== a.index) {
          const zoneChanged = over !== a.overZoneId;
          a.overZoneId = over;
          a.index = index;
          publishActive(a);
          if (zoneChanged && over) announce(`Over ${zones.current.get(over)?.label ?? "drop zone"}.`);
        }
      };

      const endPointerDrag: DragDropApi["endPointerDrag"] = () => {
        // Mark the pointer released FIRST so a measure still in flight never arms afterwards.
        pointerSession.held = false;
        const a = active.current;
        if (!a || a.keyboard) return;
        finish(a, true);
      };

      // Zone counts for the keyboard cursor: cards per non-disabled zone, minus the dragged card
      // from its own source zone (it is being lifted out). In READING order, so prevZone /
      // nextZone step to the zone the user sees beside this one; the pointer path hit-tests real
      // rects, and this is how the keyboard path stays true to the same arrangement.
      const keyboardZones = (a: ActiveDrag): ZoneCount[] =>
        a.zoneReadingOrder.map((id) => {
          const n = (a.cardsByZone.get(id) ?? []).length;
          return { id, count: id === a.sourceZoneId ? Math.max(0, n - 1) : n };
        });

      const announceCursor = (a: ActiveDrag) => {
        const z = a.overZoneId ? zones.current.get(a.overZoneId) : null;
        const total = (keyboardZones(a).find((k) => k.id === a.overZoneId)?.count ?? 0) + 1;
        announce(`${z?.label ?? "drop zone"}, position ${a.index + 1} of ${total}.`);
      };

      const startKeyboardDrag: DragDropApi["startKeyboardDrag"] = (dragId) => {
        const d = draggables.current.get(dragId);
        if (!d) return;
        void (async () => {
          const measured = await measureAll();
          if (!measured) return;
          const { m } = measured;
          const info = d.info.current;
          const sourceZoneId = d.zoneId;
          // Sort along the SOURCE ZONE's own main axis and direction, the same both zoneCards
          // uses, so the cursor opens on the card's real position. Ranking a horizontal zone
          // down Y says nothing about the order it reads in: cards of unequal height rank by
          // their tops rather than along the row, and a row whose tops all agree is a pile of
          // ties that resolves to whatever order the measure pass happened to build. Under RTL
          // that row reads right to left, which is why the direction rides along too.
          const horizontal = zones.current.get(sourceZoneId)?.horizontal ?? false;
          const cards = sortByMainAxis(m.cardsByZone.get(sourceZoneId) ?? [], horizontal, isRTL());
          const sourceIndex = Math.max(0, cards.findIndex((c) => c.id === dragId));
          const a: ActiveDrag = {
            ...m,
            dragId,
            data: info?.data,
            label: info?.label ?? dragId,
            sourceZoneId,
            cardLocal: (m.cardsByZone.get(sourceZoneId) ?? []).find((c) => c.id === dragId)?.rect ?? { x: 0, y: 0, width: 0, height: 0 },
            pointerLocalGrant: { x: 0, y: 0 },
            overZoneId: sourceZoneId,
            index: sourceIndex,
            keyboard: true,
          };
          active.current = a;
          publishActive(a);
          announce(`Picked up ${a.label}. Use the arrow keys to move, Space to drop, Escape to cancel.`);
          announceCursor(a);
        })();
      };

      const moveKeyboardDrag: DragDropApi["moveKeyboardDrag"] = (move) => {
        const a = active.current;
        if (!a || !a.keyboard) return;
        const next = keyboardMove({ zoneId: a.overZoneId ?? a.sourceZoneId, index: a.index }, move, keyboardZones(a));
        if (next.zoneId === a.overZoneId && next.index === a.index) return;
        a.overZoneId = next.zoneId;
        a.index = next.index;
        publishActive(a);
        announceCursor(a);
      };

      const commitKeyboardDrag: DragDropApi["commitKeyboardDrag"] = () => {
        const a = active.current;
        if (!a || !a.keyboard) return;
        finish(a, true);
      };
      const cancelKeyboardDrag: DragDropApi["cancelKeyboardDrag"] = () => {
        const a = active.current;
        if (!a || !a.keyboard) return;
        finish(a, false);
      };
      const isKeyboardDragging: DragDropApi["isKeyboardDragging"] = (dragId) => !!active.current?.keyboard && active.current?.dragId === dragId;
      const zoneCount: DragDropApi["zoneCount"] = () => zoneOrder.current.length;

      return {
        registerZone,
        registerDraggable,
        startPointerDrag,
        movePointerDrag,
        endPointerDrag,
        startKeyboardDrag,
        moveKeyboardDrag,
        commitKeyboardDrag,
        cancelKeyboardDrag,
        isKeyboardDragging,
        zoneCount,
        pan,
        subscribe,
        getSnapshot,
      };
    }, [pan, subscribe, getSnapshot, setSnap]);

    return (
      <DragDropContext.Provider value={api}>
        <View ref={provRef} testID={testID} collapsable={false} style={style}>
          {children}
          <GhostOutlet />
        </View>
      </DragDropContext.Provider>
    );
  }

  // ---- Ghost outlet: the floating drag preview ----------------------------
  function GhostOutlet() {
    const api = useContext(DragDropContext)!;
    const { tokens } = useTheme();
    const s = useSyncExternalStore(api.subscribe, api.getSnapshot, api.getSnapshot);
    if (!s.active || s.keyboard || !s.ghost || !s.ghostSize) return <View style={S.overlay} />;
    return (
      <View style={S.overlay}>
        <Animated.View
          accessible={false}
          style={[
            S.ghost,
            skin.ghost(tokens),
            { width: s.ghostSize.width, height: s.ghostSize.height, transform: [...api.pan.getTranslateTransform(), { scale: 1.02 }] },
          ]}
        >
          {s.ghost}
        </Animated.View>
      </View>
    );
  }

  // ---- DropZone -----------------------------------------------------------
  function DropZone({ id, label, onDrop, horizontal = false, disabled = false, children, style, testID }: DropZoneProps) {
    const api = useContext(DragDropContext);
    const { tokens } = useTheme();
    const ref = useRef<View>(null);
    // Keep the registered entry's callbacks fresh without re-registering every render.
    const entryRef = useRef<ZoneEntry>({ ref, label, disabled, horizontal, onDrop });
    entryRef.current = { ref, label, disabled, horizontal, onDrop };
    useEffect(() => {
      if (!api) return;
      return api.registerZone(id, {
        ref,
        get label() { return entryRef.current.label; },
        get disabled() { return entryRef.current.disabled; },
        get horizontal() { return entryRef.current.horizontal; },
        onDrop: (e) => entryRef.current.onDrop?.(e),
      } as ZoneEntry);
    }, [api, id]);

    const s = useSyncExternalStore(
      api?.subscribe ?? noopSubscribe,
      api?.getSnapshot ?? getEmpty,
      api?.getSnapshot ?? getEmpty,
    );
    const isOver = s.active && !disabled && s.overZoneId === id;
    // `insertionOffset` measures from the zone's LEADING edge along the reading axis, so the
    // horizontal line anchors with the LOGICAL `insetInlineStart` rather than a physical `left`:
    // that resolves to the right edge in a right-to-left locale on every platform, with no
    // branch (in LTR the two are the same property, so nothing about this changes). The vertical
    // line uses `top`, which never mirrors.
    const indicatorStyle: ViewStyle = horizontal
      ? { top: INDICATOR_INSET, bottom: INDICATOR_INSET, insetInlineStart: s.insertionOffset - INDICATOR_THICKNESS / 2, width: INDICATOR_THICKNESS }
      : { left: INDICATOR_INSET, right: INDICATOR_INSET, top: s.insertionOffset - INDICATOR_THICKNESS / 2, height: INDICATOR_THICKNESS };
    // Stable context value so subscribed Draggables don't re-render on every provider render.
    const zoneCtx = useMemo(() => ({ zoneId: id, horizontal }), [id, horizontal]);

    return (
      <DropZoneContext.Provider value={zoneCtx}>
        <View ref={ref} testID={testID} collapsable={false} style={style}>
          {children}
          {isOver ? (
            <>
              <View style={[S.overlay, skin.zoneActive(tokens)]} />
              <View style={[S.passthrough, { position: "absolute" }, skin.indicator(tokens), indicatorStyle]} />
            </>
          ) : null}
        </View>
      </DropZoneContext.Provider>
    );
  }

  // ---- Draggable ----------------------------------------------------------
  function Draggable<T = unknown>({ id, data, label, disabled = false, preview, children, style, testID }: DraggableProps<T>) {
    const api = useContext(DragDropContext);
    const zone = useContext(DropZoneContext);
    const cardRef = useRef<View>(null);
    const zoneId = zone?.zoneId ?? "";
    // The provider reads current data/label/preview through this ref (kept fresh each render).
    const info = useRef<{ data: unknown; label: string; getPreview: () => ReactNode }>({ data, label: label ?? id, getPreview: () => preview ?? children });
    info.current = { data, label: label ?? id, getPreview: () => preview ?? children };

    useEffect(() => {
      if (!api || !zoneId) return;
      return api.registerDraggable(id, { ref: cardRef, zoneId, info });
    }, [api, id, zoneId]);

    const s = useSyncExternalStore(
      api?.subscribe ?? noopSubscribe,
      api?.getSnapshot ?? getEmpty,
      api?.getSnapshot ?? getEmpty,
    );
    const dragging = s.active && s.dragId === id && !s.keyboard;
    // Stable context value so DragHandle consumers don't re-render on every provider render.
    const draggableCtx = useMemo(() => ({ id, cardRef, disabled }), [id, disabled]);

    return (
      <DraggableContext.Provider value={draggableCtx}>
        <View ref={cardRef} testID={testID} collapsable={false} style={[dragging ? { opacity: SOURCE_OPACITY } : null, style]}>
          {children}
        </View>
      </DraggableContext.Provider>
    );
  }

  // ---- DragHandle ---------------------------------------------------------
  function DragHandle({ label, testID, style }: DragHandleProps) {
    const api = useContext(DragDropContext);
    const drag = useContext(DraggableContext);
    const { tokens } = useTheme();
    const focusRing = useFocusRingStyle();
    const [pressed, setPressed] = useState(false);
    const disabled = drag?.disabled ?? !api;

    // Live refs so the once-created PanResponder always calls the freshest api/drag closures.
    const apiRef = useRef(api);
    apiRef.current = api;
    const dragRef = useRef(drag);
    dragRef.current = drag;
    const handleRef = useRef<View>(null);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          if (disabledRef.current) return;
          setPressed(true);
          const d = dragRef.current;
          const a = apiRef.current;
          if (!d || !a) return;
          const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number };
          const grantLocation = {
            x: Number.isFinite(ne.locationX) ? (ne.locationX as number) : (skin.handle.width as number) / 2 || 0,
            y: Number.isFinite(ne.locationY) ? (ne.locationY as number) : (skin.handle.height as number) / 2 || 0,
          };
          a.startPointerDrag({ dragId: d.id, cardRef: d.cardRef, handleRef, grantLocation });
        },
        onPanResponderMove: (_e, g) => {
          if (disabledRef.current) return;
          apiRef.current?.movePointerDrag(g.dx, g.dy);
        },
        onPanResponderRelease: () => {
          setPressed(false);
          apiRef.current?.endPointerDrag();
        },
        onPanResponderTerminate: () => {
          setPressed(false);
          apiRef.current?.endPointerDrag();
        },
        // Refuse to hand the gesture off once a drag is underway: without this a
        // surrounding ScrollView (a horizontal board of columns, a scrollable page)
        // steals the responder on native as soon as the finger travels, cancelling
        // the drag mid-flight. Composers additionally freeze their own scroll via
        // useDragActive; this is the gesture-level guarantee.
        onPanResponderTerminationRequest: () => false,
      }),
    ).current;

    // Keyboard drag (web): the grip is a focusable button; Space/Enter grabs, arrows move,
    // Space/Enter drops, Escape cancels. `View` has no native onKeyDown, so it rides in through
    // a cast (a no-op on native, the slider pattern). Between-zone moves use Left/Right; within
    // a single-zone list they fall back to index moves so a lone list still reorders by arrows.
    // The two horizontal arrows SWAP roles in a right-to-left locale (Right Arrow moves to the
    // previous item, per the WAI-ARIA practices), the same flip useRovingFocus applies to a
    // tablist and the Slider applies to its step; Up/Down keep their logical direction because
    // the block axis never mirrors.
    const s = useSyncExternalStore(
      api?.subscribe ?? noopSubscribe,
      api?.getSnapshot ?? getEmpty,
      api?.getSnapshot ?? getEmpty,
    );
    const grabbed = !!drag && s.active && s.keyboard && s.dragId === drag.id;
    const onKeyDown = (event: { key: string; preventDefault: () => void }) => {
      const a = api;
      const d = drag;
      if (!a || !d || disabled) return;
      const multiZone = a.zoneCount() > 1;
      const back: KeyboardMove = multiZone ? "prevZone" : "prevIndex";
      const forward: KeyboardMove = multiZone ? "nextZone" : "nextIndex";
      const rtl = isRTL();
      if (!grabbed) {
        if (event.key === " " || event.key === "Enter" || event.key === "Spacebar") {
          event.preventDefault();
          a.startKeyboardDrag(d.id);
        }
        return;
      }
      switch (event.key) {
        case " ":
        case "Spacebar":
        case "Enter":
          event.preventDefault();
          a.commitKeyboardDrag();
          break;
        case "Escape":
          event.preventDefault();
          a.cancelKeyboardDrag();
          break;
        case "ArrowUp":
          event.preventDefault();
          a.moveKeyboardDrag("prevIndex");
          break;
        case "ArrowDown":
          event.preventDefault();
          a.moveKeyboardDrag("nextIndex");
          break;
        case "ArrowLeft":
          event.preventDefault();
          a.moveKeyboardDrag(rtl ? forward : back);
          break;
        case "ArrowRight":
          event.preventDefault();
          a.moveKeyboardDrag(rtl ? back : forward);
          break;
        default:
          break;
      }
    };
    const webKeyboardProps = { onKeyDown } as unknown as ViewProps;

    return (
      <View
        ref={handleRef}
        testID={testID}
        collapsable={false}
        {...(disabled ? {} : pan.panHandlers)}
        {...webKeyboardProps}
        focusable={!disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? "Drag to reorder"}
        accessibilityHint="Double tap and hold to drag, or press Space then use the arrow keys to move"
        accessibilityState={{ disabled }}
        aria-disabled={disabled || undefined}
        // aria-pressed reflects the keyboard "grabbed" state for web screen readers.
        aria-pressed={grabbed || undefined}
        hitSlop={8}
        style={[
          skin.handle,
          // The grip is a focusable View, not a Pressable: it takes the kit's themed
          // keyboard focus ring the same way (it paints no focus state until grabbed).
          focusRing,
          grabbed ? skin.handleGrabbed(tokens) : null,
          pressed && !grabbed ? { opacity: skin.handlePressedOpacity } : null,
          disabled ? { opacity: 0.4 } : null,
          style,
        ]}
      >
        <Icon gripVertical size={skin.handleIconSize} decorative />
      </View>
    );
  }

  return { DragDropProvider, DropZone, Draggable, DragHandle };
}

// Fallbacks so a Draggable/DropZone/DragHandle rendered with no provider still mounts inertly
// (useSyncExternalStore needs stable subscribe/getSnapshot references).
const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY_SNAPSHOT;

/**
 * KIT-INTERNAL: true while a pointer drag is in flight under the nearest DragDropProvider
 * (keyboard drags do not count: nothing follows the finger, so nothing needs freezing).
 * Composers that put DropZones inside a ScrollView (Board's horizontal lanes) read this to
 * freeze scrolling for the duration of the drag: the measured zone rects are captured at grab
 * time, so a scroll mid-drag would divorce the hit-testing from what is on screen. The context
 * is module-scoped, so this works with every platform's createDragDrop family. Deliberately NOT
 * re-exported from the platform entry files: it is not part of the public API.
 */
export function useDragActive(): boolean {
  const api = useContext(DragDropContext);
  const s = useSyncExternalStore(
    api?.subscribe ?? noopSubscribe,
    api?.getSnapshot ?? getEmpty,
    api?.getSnapshot ?? getEmpty,
  );
  return s.active && !s.keyboard;
}
