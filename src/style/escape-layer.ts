import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, type TextInputProps } from "react-native";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

// One owner per Escape. The identity is captured in the originating shell and
// provided again INSIDE its teleported content: Canvas's Portal renders registry
// entries in a sibling outlet, so source-site context does not cross it itself.
interface EscapeLayer {
  id: symbol;
  parent: EscapeLayer | null;
  active: boolean;
  dismiss: () => void;
  native: {
    mounted: boolean;
    active: boolean;
    parent: EscapeLayer | null;
    children: Set<EscapeLayer>;
    order: number;
    dismiss: () => void;
  };
}

const EscapeParent = createContext<EscapeLayer | null>(null);

/** The common subset of DOM keydown and React Native TextInput key events. */
interface EscapeEvent {
  key?: string;
  repeat?: boolean;
  defaultPrevented?: boolean;
  nativeEvent?: { key?: string; repeat?: boolean; defaultPrevented?: boolean };
  preventDefault?: () => void;
}

interface Registration { layer: EscapeLayer; order: number }
interface EscapeStore {
  layers: Map<symbol, Registration>;
  sequence: number;
  seen: WeakSet<object>;
  keyDownConsumed: Set<symbol> | null;
  keyUpConsumed: Set<symbol> | null;
  listening: boolean;
  listen: () => void;
  release: () => void;
}

const stores = new WeakMap<Document, EscapeStore>();
// Only an ordering counter is shared. Native dispatch never searches a global
// layer map, so an event in one logical root cannot dismiss another root.
let nativeSequence = 0;
const logicalParent = (layer: EscapeLayer) => layer.parent;
const nativeParent = (layer: EscapeLayer) => layer.native.parent;

function isDescendant(layer: EscapeLayer, ancestor: EscapeLayer, parentOf: (layer: EscapeLayer) => EscapeLayer | null): boolean {
  for (let parent = parentOf(layer); parent; parent = parentOf(parent)) {
    if (parent.id === ancestor.id) return true;
  }
  return false;
}

function topLayer(
  registrations: Iterable<Registration>,
  parentOf = logicalParent,
  isActive = (layer: EscapeLayer) => layer.active,
): EscapeLayer | undefined {
  const active = [...registrations].filter(({ layer }) => isActive(layer));
  const latest = (entries: Registration[]) => entries.reduce<Registration | undefined>(
    (top, entry) => !top || entry.order > top.order ? entry : top, undefined,
  );
  let top = latest(active);
  // Initially open children commit their effects before their parent. Explicit
  // ancestry makes them win even then; effect order only orders sibling layers.
  while (top) {
    const ancestor = top.layer;
    const descendant = latest(active.filter(({ layer }) => isDescendant(layer, ancestor, parentOf)));
    if (!descendant) return top.layer;
    top = descendant;
  }
}

function requestNativeClose(origin: EscapeLayer): boolean {
  // An exiting Modal may retain its host callback after its owner has closed.
  // That late request must not be reassigned to an active ancestor.
  if (!origin.native.mounted || !origin.native.active) return false;
  const registrations: Registration[] = [];
  function collect(layer: EscapeLayer) {
    if (!layer.native.mounted) return;
    registrations.push({ layer, order: layer.native.order });
    for (const child of layer.native.children) collect(child);
  }
  // UIKit delivers the action to a particular containing host. Search that
  // owner's committed subtree, never an unrelated sibling above or beside it.
  collect(origin);
  const top = topLayer(registrations, nativeParent, layer => layer.native.active);
  if (!top) return false;
  // UIKit consumes this native action when its host handler exists. Request
  // one owner only, even if a controlled owner keeps itself open.
  top.native.dismiss();
  return true;
}

function eventKey(event: EscapeEvent): string | undefined {
  return event.nativeEvent?.key ?? event.key;
}

function rememberConsumption(store: EscapeStore, event: EscapeEvent): void {
  store.seen.add(event.nativeEvent ?? event);
  // Protect the existing stack, not an unrelated Modal mounted after that
  // stack has disappeared. The IDs also keep keyup-only requests independent
  // across application roots, reopen cycles and test files sharing a document.
  store.keyDownConsumed ??= new Set();
  for (const id of store.layers.keys()) store.keyDownConsumed.add(id);
  event.preventDefault?.();
}

function dispatch(store: EscapeStore, event: EscapeEvent): boolean {
  if (eventKey(event) !== "Escape") return false;
  if (store.seen.has(event.nativeEvent ?? event)) return true;
  const repeated = event.nativeEvent?.repeat ?? event.repeat;
  if (!repeated) {
    store.keyDownConsumed = null;
    store.keyUpConsumed = null;
  }
  // A target handler has already made its local decision by the time bubbling
  // gets here. Preserve editor/drag cancellation and consume its matching keyup.
  if (event.defaultPrevented || event.nativeEvent?.defaultPrevented) {
    rememberConsumption(store, event);
    return true;
  }
  const top = topLayer(store.layers.values());
  if (!top) return false;
  rememberConsumption(store, event);
  // Holding the key must not peel away parent layers after the child unmounts.
  if (!repeated) top.dismiss();
  return true;
}

function storeFor(doc: Document): EscapeStore {
  const existing = stores.get(doc);
  if (existing) return existing;
  const store: EscapeStore = {
    layers: new Map(), sequence: 0, seen: new WeakSet(),
    keyDownConsumed: null, keyUpConsumed: null, listening: false,
    listen, release,
  };
  function keyDown(event: KeyboardEvent) {
    if (event.key === "Escape") dispatch(store, event);
    // Other keys can overlap a held Escape. Keep its consumption until its own
    // keyup (or window blur), so a modifier cannot dismiss the parent Modal too.
  }
  // RNW Modal asks to close on a BUBBLING keyup, without passing that event to
  // onRequestClose. Snapshot the matching keydown consumption in capture first.
  // This record belongs to the document, so dismissing/unmounting a child does
  // not erase it before the parent's Modal sees the same physical keystroke.
  function keyUp(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    store.keyUpConsumed = store.keyDownConsumed;
    store.keyDownConsumed = null;
    release();
  }
  function blur() {
    store.keyDownConsumed = null;
    store.keyUpConsumed = null;
    release();
  }
  function listen() {
    if (store.listening) return;
    store.listening = true;
    doc.addEventListener("keydown", keyDown);
    doc.addEventListener("keyup", keyUp, true);
    doc.defaultView?.addEventListener("blur", blur);
  }
  function release() {
    if (!store.listening || store.layers.size || store.keyDownConsumed) return;
    store.listening = false;
    doc.removeEventListener("keydown", keyDown);
    doc.removeEventListener("keyup", keyUp, true);
    doc.defaultView?.removeEventListener("blur", blur);
  }
  stores.set(doc, store);
  return store;
}

/** Preserve a TextInput editor's local Escape cancellation through Modal keyup. */
export function consumeEscapeKey(event: EscapeEvent): void {
  if (eventKey(event) !== "Escape") return;
  event.preventDefault?.();
  if (Platform.select({ web: false, default: true }) || typeof document === "undefined") return;
  const store = storeFor(document);
  store.listen();
  rememberConsumption(store, event);
}

/** Preserve local editing decisions before bridging RNW's stopped input keys. */
export function useInputEscapeBridge(onKeyPress: TextInputProps["onKeyPress"]): NonNullable<TextInputProps["onKeyPress"]> {
  const owner = useContext(EscapeParent);
  const nativeRuntime = Platform.select({ web: false, default: true });
  return useCallback((event) => {
    onKeyPress?.(event);
    if (eventKey(event) !== "Escape") return;
    const native = event.nativeEvent as typeof event.nativeEvent & { isComposing?: boolean; keyCode?: number; defaultPrevented?: boolean };
    const keyboard = event as typeof event & { isComposing?: boolean; keyCode?: number };
    if (native.isComposing || keyboard.isComposing || native.keyCode === 229 || keyboard.keyCode === 229) {
      // Let the IME cancel its candidate. Record ownership for Modal keyup
      // without preventing the original keydown's default action.
      consumeEscapeKey({ nativeEvent: event.nativeEvent });
      return;
    }
    if (nativeRuntime) {
      if (owner && !event.defaultPrevented && !native.defaultPrevented && requestNativeClose(owner)) event.preventDefault?.();
    } else if (typeof document !== "undefined") {
      // Match a normal bubbling field: document ownership still applies when
      // the field itself is outside the currently open overlay.
      dispatch(storeFor(document), event);
    }
  }, [onKeyPress, owner, nativeRuntime]);
}

/** Internal ownership hook for Canvas overlays; the public hook remains below. */
export function useEscapeLayer(active: boolean, onEscape: () => void) {
  const parent = useContext(EscapeParent);
  const nativeRuntime = Platform.select({ web: false, default: true });
  const callback = useRef(onEscape);
  callback.current = onEscape;
  const [layer] = useState<EscapeLayer>(() => ({
    id: Symbol("escape-layer"), parent, active, dismiss: () => callback.current(),
    native: { mounted: false, active: false, parent: null, children: new Set(), order: 0, dismiss: onEscape },
  }));
  layer.parent = parent;
  layer.active = active;

  useIsomorphicLayoutEffect(() => {
    // A suspended update can render a new policy without committing it. Native
    // events still belong to the visible committed owner in that interval.
    if (nativeRuntime) layer.native.dismiss = onEscape;
  });

  useIsomorphicLayoutEffect(() => {
    if (!nativeRuntime) return;
    const registration = layer.native;
    registration.mounted = true;
    registration.parent = parent;
    parent?.native.children.add(layer);
    // Inactive ancestors remain structurally connected. A controlled child may
    // still be active, and moving only an ancestor must move its whole subtree.
    return () => {
      parent?.native.children.delete(layer);
      registration.mounted = false;
      registration.parent = null;
    };
  }, [layer, parent, nativeRuntime]);

  useIsomorphicLayoutEffect(() => {
    if (!nativeRuntime) return;
    layer.native.active = active;
    if (active) layer.native.order = ++nativeSequence;
    return () => { layer.native.active = false; };
  }, [active, layer, nativeRuntime]);

  useEffect(() => {
    if (nativeRuntime || !active || typeof document === "undefined") return;
    const store = storeFor(document);
    store.layers.set(layer.id, { layer, order: ++store.sequence });
    store.listen();
    return () => {
      store.layers.delete(layer.id);
      store.release();
    };
  }, [active, layer, parent, nativeRuntime]);

  const onAccessibilityEscape = useCallback(() => {
    requestNativeClose(layer);
  }, [layer]);

  return {
    layer,
    onAccessibilityEscape,
    // RNW TextInput stops keydown propagation. Its existing local handlers call
    // this AFTER local editing decisions, using the same owner as document keys.
    onKeyPress(event: EscapeEvent) {
      if (eventKey(event) !== "Escape") return;
      if (nativeRuntime) {
        if (!event.defaultPrevented && !event.nativeEvent?.defaultPrevented && requestNativeClose(layer)) event.preventDefault?.();
      } else if (typeof document !== "undefined") {
        dispatch(storeFor(document), event);
      }
    },
    onRequestClose() {
      if (nativeRuntime) {
        requestNativeClose(layer);
        return;
      }
      if (!layer.active) return;
      if (typeof document === "undefined") return;
      const store = storeFor(document);
      if (store.keyUpConsumed?.has(layer.id)) return;
      const top = topLayer(store.layers.values());
      if (!top) return;
      // A Modal can remain mounted for its exit animation after its layer has
      // become inactive. Its late request must not redispatch to a parent that
      // already handled this keydown (including a controlled parent staying open).
      if (store.keyUpConsumed?.has(top.id)) return;
      // Also support keyup-only requests while still assigning one owner, such
      // as a key pressed before the Modal mounted or an assistive-tech request.
      store.keyUpConsumed = new Set(store.layers.keys());
      top.dismiss();
    },
  };
}

/** Place this provider inside the node passed to Portal/AnchoredOverlay/Modal. */
export function EscapeLayerProvider({ scope, children }: {
  scope: ReturnType<typeof useEscapeLayer>;
  children: ReactNode;
}) {
  return createElement(EscapeParent.Provider, { value: scope.layer }, children);
}
