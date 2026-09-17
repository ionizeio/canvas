// The overlay portal layer: a cross-platform teleport so a component can render
// floating content (a dropdown menu, a popover card) OVER the page and outside
// its own bounds, with NO web-only escape hatches. Built from RN View/Pressable
// only: no Modal, no DOM, no position:"fixed".
//
// An <OverlayProvider> owns an outlet (a full-bleed absolute layer) plus a
// registry of portaled nodes. A <Portal> teleports its children into the nearest
// provider via context; with NO provider in the tree it renders its children
// inline in place, which is exactly the kit's pre-portal behavior, so an unhosted
// consumer is never broken. This mirrors the @gorhom/portal / react-native-paper
// Portal.Host pattern.
//
// Mount one <OverlayProvider> at an app's root for screen-level overlays; the
// docs mount one per example stage so a portaled overlay stays contained to its
// stage card instead of covering the gallery.
//
// Re-render isolation: the registry lives in refs (not provider state) and the
// only component that reads it is the sibling <Outlet>, which subscribes via
// useSyncExternalStore. So publishing a node re-renders the Outlet alone, never
// the provider's `children` (where the <Portal> lives) — without that split, a
// Portal that re-publishes on each render would loop forever.

import {
  Fragment,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";
import { Keyboard, Platform, View, StyleSheet, type KeyboardEvent, type StyleProp, type ViewStyle } from "react-native";
import {
  GlassBlurTargetContext,
  GlassWindowBlurTargetContext,
} from "./glass-surface/glass-surface.shared.js";
import { createCaptureTarget } from "./glass-surface/capture-target.js";
import { GlassBlurTargetHost, blurTargetMountable } from "./glass-surface/glass-blur-target.js";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { useTheme } from "./theme.js";
import { ResolvedThemeProvider } from "./theme-context.js";

// What a <Portal> (and an anchored overlay) needs from its host. `measureOutlet`
// is exposed so an anchored overlay can measure a trigger RELATIVE TO the outlet
// (measureInWindow on both, subtract) — correct for a screen-level host and a
// stage-scoped one alike.
export interface OverlayHost {
  /** Register or update a portaled node. Called on every render of <Portal>. */
  mount(id: string, node: ReactNode): void;
  /** Remove a portaled node. Called only when a <Portal> unmounts. */
  unmount(id: string): void;
  /** Measure the outlet's window rect, for relative anchoring. */
  measureOutlet(cb: (x: number, y: number, width: number, height: number) => void): void;
  /** Observe host layout changes, including native keyboard resizing. */
  subscribeLayout?(listener: () => void): () => void;
  /** Measure the visible band inherited from this native window's viewport. */
  measureVisibleBounds?(cb: (bounds: OverlayBounds) => void): void;
}

export interface OverlayBounds { x: number; y: number; width: number; height: number }

export interface OverlayViewportInsets { top?: number; bottom?: number }

/** Reserve app-declared vertical occlusions within a measured viewport. */
export function insetOverlayBounds(bounds: OverlayBounds, insets: OverlayViewportInsets): OverlayBounds {
  const positive = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, value!) : 0;
  const top = Math.min(bounds.height, positive(insets.top));
  const bottom = Math.min(bounds.height - top, positive(insets.bottom));
  return { ...bounds, y: bounds.y + top, height: bounds.height - top - bottom };
}

export function intersectOverlayBounds(a: OverlayBounds, b: OverlayBounds): OverlayBounds {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
}

const OverlayContext = createContext<OverlayHost | null>(null);

/** The nearest overlay host, or null when no <OverlayProvider> is mounted. */
export function useOverlayHost(): OverlayHost | null {
  return useContext(OverlayContext);
}

const FILL: ViewStyle = { flex: 1 };

// The outlet sits above page content and fills the provider's box. box-none lets
// taps fall through to the page when nothing is portaled (an opaque-to-touch
// full-bleed layer would otherwise eat every press); each open overlay supplies
// its own backdrop to catch outside taps while it is shown.
//
// box-none MUST live in a StyleSheet.create style, never an inline `{
// pointerEvents }` object. react-native-web only compiles its box-none polyfill
// (the box itself `pointer-events:none`, its portaled children `auto`) for
// registered styles; an inline literal is silently dropped, leaving this
// full-bleed z-1000 outlet at `pointer-events:auto` where it swallows every
// click on the page. Native honors box-none either way; this keeps web correct.
const outletStyles = StyleSheet.create({
  outlet: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, pointerEvents: "box-none" },
});

export interface OverlayProviderProps {
  children: ReactNode;
  /** Start a new measurement boundary inside a separate native Modal window. */
  separateWindow?: boolean;
  /** Constrain nested cards to this provider's measured viewport. Nested
   * content-sized hosts otherwise inherit their window's visible bounds. */
  viewport?: boolean;
  /** Measured header/footer occlusions, relative to this provider's own box.
   * Applies to root hosts and nested hosts with `viewport`; content hosts
   * inherit their parent band instead. Vertical geometry only. */
  viewportInsets?: OverlayViewportInsets;
  /**
   * Style for the positioning wrapper. Defaults to `flex: 1` so an app-root host
   * fills the screen; pass a style to override for a content-sized host (e.g. a
   * docs example stage).
   */
  style?: StyleProp<ViewStyle>;
}

export function OverlayProvider({ children, style, separateWindow = false, viewport = false, viewportInsets }: OverlayProviderProps) {
  const inheritedHost = useOverlayHost();
  const parent = separateWindow ? null : inheritedHost;
  // The registry is an immutable Map snapshot held in a ref; each change swaps in
  // a new Map (new identity) so useSyncExternalStore detects it. Insertion order
  // is preserved, so a later-opened overlay paints over an earlier one.
  const snapshot = useRef<ReadonlyMap<string, ReactNode>>(new Map());
  const listeners = useRef<Set<() => void>>(new Set());
  const layoutListeners = useRef<Set<() => void>>(new Set());
  const topInset = viewportInsets?.top ?? 0;
  const bottomInset = viewportInsets?.bottom ?? 0;
  const insets = useRef({ top: topInset, bottom: bottomInset });
  useIsomorphicLayoutEffect(() => {
    if (insets.current.top === topInset && insets.current.bottom === bottomInset) return;
    insets.current = { top: topInset, bottom: bottomInset };
    // A changed header height invalidates measurements without replacing the
    // portal host, which would unmount open content and discard its focus.
    layoutListeners.current.forEach((listener) => listener());
  }, [topInset, bottomInset]);
  const outletRef = useRef<View>(null);
  const keyboard = useRef(Platform.OS !== "web" ? Keyboard.metrics?.() : undefined);
  useEffect(() => {
    if (parent || Platform.OS === "web") return;
    const update = (event: KeyboardEvent) => {
      keyboard.current = event.endCoordinates;
      layoutListeners.current.forEach((listener) => listener());
    };
    const hide = () => {
      keyboard.current = undefined;
      layoutListeners.current.forEach((listener) => listener());
    };
    keyboard.current = Keyboard.metrics?.();
    const subscriptions = Platform.OS === "ios"
      ? [Keyboard.addListener("keyboardWillShow", update), Keyboard.addListener("keyboardWillChangeFrame", update), Keyboard.addListener("keyboardWillHide", hide)]
      : [Keyboard.addListener("keyboardDidShow", update), Keyboard.addListener("keyboardDidHide", hide)];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [parent]);

  // Each Android provider can own a stable content capture plane. Its outlet
  // is a native sibling, so it can sample that plane without a render-node cycle.
  // Content-sized providers inherit only an explicitly safe decorative or modal
  // plane, never the window context that contains their own foreground subtree.
  const captureTarget = useMemo(createCaptureTarget, []);
  const blurTargetRef = captureTarget.ref;
  const hostStyle: StyleProp<ViewStyle> = [FILL, style];
  const ownBlurTarget = blurTargetMountable(hostStyle) ? blurTargetRef : null;
  // A decorative backdrop already proven safe for the whole subtree is also
  // safe for this outlet. Never substitute the inherited window-level target.
  const inheritedSafeTarget = useContext(GlassBlurTargetContext);
  const outletBlurTarget = ownBlurTarget ?? inheritedSafeTarget;
  // Separate-native-window surfaces (RN Modal — Drawer, ActionSheet) instead take
  // the window-level target, where OUTERMOST wins so a Modal opened from a nested
  // host (a docs stage) blurs the page, not just its stage. Safe at any depth: a
  // Modal's window is never a descendant of the main window's target.
  const inheritedWindowTarget = useContext(GlassWindowBlurTargetContext);
  const windowBlurTarget = inheritedWindowTarget ?? ownBlurTarget;

  const host = useMemo<OverlayHost>(() => {
    const emit = () => listeners.current.forEach((l) => l());
    return {
      mount(id, node) {
        const next = new Map(snapshot.current);
        next.set(id, node);
        snapshot.current = next;
        emit();
      },
      unmount(id) {
        if (!snapshot.current.has(id)) return;
        const next = new Map(snapshot.current);
        next.delete(id);
        snapshot.current = next;
        emit();
      },
      measureOutlet(cb) {
        outletRef.current?.measureInWindow(cb);
      },
      subscribeLayout(listener) {
        layoutListeners.current.add(listener);
        const unsubscribe = parent?.subscribeLayout?.(listener);
        return () => { layoutListeners.current.delete(listener); unsubscribe?.(); };
      },
      measureVisibleBounds(cb) {
        const measureOwn = (done: (bounds: OverlayBounds) => void) => {
          outletRef.current?.measureInWindow((x, y, width, height) => {
            // UIKit keyboard coordinates are window-relative on current RN.
            // RN 0.74 exposes screen coordinates: its supported keyboard host
            // configuration is a full-screen window with the same origin.
            // Android edge-to-edge windows do not resize for the IME, but their
            // full-screen window coordinates match the event. Legacy Android
            // adjustResize already reduces the outlet: min keeps that smaller
            // bound without subtracting the keyboard or status bar twice.
            const own = insetOverlayBounds({ x, y, width, height }, insets.current);
            const bottom = !parent && keyboard.current ? Math.min(own.y + own.height, keyboard.current.screenY) : own.y + own.height;
            done({ ...own, height: Math.max(0, bottom - own.y) });
          });
        };
        if (!parent) { measureOwn(cb); return; }
        const measureParent = parent.measureVisibleBounds ?? ((done: (bounds: OverlayBounds) => void) => parent.measureOutlet((x, y, width, height) => done({ x, y, width, height })));
        measureParent((bounds) => {
          if (viewport) measureOwn((own) => cb(intersectOverlayBounds(own, bounds)));
          else cb(bounds);
        });
      },
    };
  }, [parent, viewport]);

  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const getSnapshot = useCallback(() => snapshot.current, []);
  const onOutletLayout = useCallback(() => layoutListeners.current.forEach((listener) => listener()), []);

  return (
    <OverlayContext.Provider value={host}>
      <GlassWindowBlurTargetContext.Provider value={windowBlurTarget}>
        <GlassBlurTargetHost
          style={hostStyle}
          targetRef={blurTargetRef}
          outlet={
            <GlassBlurTargetContext.Provider value={outletBlurTarget}>
              <Outlet outletRef={outletRef} subscribe={subscribe} getSnapshot={getSnapshot} onLayout={onOutletLayout} />
            </GlassBlurTargetContext.Provider>
          }
        >
          {children}
        </GlassBlurTargetHost>
      </GlassWindowBlurTargetContext.Provider>
    </OverlayContext.Provider>
  );
}

interface OutletProps {
  outletRef: React.RefObject<View | null>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ReadonlyMap<string, ReactNode>;
  onLayout: () => void;
}

// The sole reader of the registry. Re-renders on registry changes only; being a
// sibling of the provider's `children`, its updates never re-render them.
function Outlet({ outletRef, subscribe, getSnapshot, onLayout }: OutletProps) {
  const nodes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <View ref={outletRef} style={outletStyles.outlet} onLayout={onLayout}>
      {[...nodes].map(([id, node]) => (
        <Fragment key={id}>{node}</Fragment>
      ))}
    </View>
  );
}

export interface PortalProps {
  children: ReactNode;
}

/**
 * Teleport `children` into the nearest <OverlayProvider> outlet. With no provider
 * mounted, render them inline in place (the kit's pre-portal behavior).
 */
export function Portal({ children }: PortalProps) {
  const host = useOverlayHost();
  const id = useId();
  const entranceReady = useContext(EntranceReadinessContext);
  const theme = useTheme();

  // Publish the CURRENT children on every render (children is a fresh node each
  // render, so the teleported tree is never stale). Cheap: it sets the provider's
  // registry, not this component's state.
  useEffect(() => {
    // Registry nodes render in a sibling outlet, so preserve the publisher's
    // resolved theme and entrance readiness. Keep the providers stable across
    // updates to retain foreground state. Capture targets intentionally come
    // from the outlet: copying the publisher's target can create a native cycle.
    if (host) host.mount(id,
      <ResolvedThemeProvider value={theme}>
        <EntranceReadinessContext.Provider value={entranceReady}>{children}</EntranceReadinessContext.Provider>
      </ResolvedThemeProvider>,
    );
  });

  // Cleanup runs ONLY on true unmount. Kept separate from the publish effect: a
  // combined effect would tear down and re-add the node every render (flicker,
  // lost focus).
  useEffect(() => {
    if (!host) return;
    return () => host.unmount(id);
  }, [host, id]);

  return host ? null : <>{children}</>;
}
