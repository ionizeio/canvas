import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Animated, StyleSheet, type LayoutRectangle, type View } from "react-native";
import { useLiquidMotion, type LiquidMotionProfile } from "./liquid-motion.js";

/**
 * Internal decorative frame. The owner measures its selection in this frame's
 * parent coordinates and supplies the skin's material, radius and elevation.
 * Foreground and interactive hosts remain siblings outside this motion graph.
 */
export function MeasuredSelection({ layout, enabled, pressed = false, resetKey, profile, children, testID }: {
  layout: LayoutRectangle;
  enabled: boolean;
  pressed?: boolean;
  profile?: LiquidMotionProfile;
  /** Change for structural relayouts that must reconcile without selection travel. */
  resetKey?: string | number;
  children: ReactNode;
  testID?: string;
}) {
  const frame = useLiquidMotion(layout, { enabled, pressed, resetKey, profile });
  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      testID={testID}
      style={[styles.frame, frame]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ frame: { position: "absolute", overflow: "visible", pointerEvents: "none" } });

/**
 * The measured targets a moving selection travels between: every target reports
 * its frame in one measurement SPACE (an ancestor of the targets, so native
 * measureLayout can resolve it), keyed by the target's own identity (a page
 * number, a day, a row index), never by its rendered slot.
 *
 * `structure` names the layout the frames belong to. When it changes (a page
 * window shifts, a section opens, the month swaps) every target is re-measured
 * before any surface moves: while the fresh frames are pending each surface HOLDS
 * where it sits, then it TRAVELS when the target it sits on kept its frame and
 * RESETS in place when that target moved or left, so a relayout never invents
 * travel from a stale slot and never unmounts a surface that has somewhere to be
 * (an unmount lingers on iOS, where the native material fades out). A surface
 * whose target has no frame withdraws until one arrives. A target that moves
 * under an unchanged structure (the container resized) resets every surface.
 */
export function useMeasuredTargets<K extends string | number>(structure: string, space: RefObject<View | null>) {
  const nodes = useRef(new Map<K, View>());
  const latestStructure = useRef(structure);
  latestStructure.current = structure;
  const anchors = useRef(new Map<string, { key: K; layout: LayoutRectangle }>());
  const [state, setState] = useState<{ structure: string; rects: Map<K, LayoutRectangle>; settled: boolean; revision: number }>({
    structure, rects: new Map(), settled: true, revision: 0,
  });
  const record = (key: K, layout: LayoutRectangle) => {
    if (latestStructure.current !== structure || layout.width <= 0 || layout.height <= 0) return;
    setState((previous) => {
      const same = previous.structure === structure;
      const rects = same ? previous.rects : new Map<K, LayoutRectangle>();
      const old = rects.get(key);
      if (old && sameRect(old, layout)) return previous;
      const next = new Map(rects);
      next.set(key, layout);
      return { structure, rects: next, settled: same ? previous.settled : false, revision: previous.revision + (old ? 1 : 0) };
    });
  };
  const measure = (key: K) => {
    const host = space.current;
    const node = nodes.current.get(key);
    if (!host || !node) return;
    node.measureLayout(host, (x, y, width, height) => record(key, { x, y, width, height }), () => {});
  };
  const register = (key: K) => (node: View | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  };
  useLayoutEffect(() => {
    // Measured on mount as well as on every structure change: a target's own
    // layout event also records it (later on the web, where it waits for a resize
    // observer), and a frame that is not laid out yet (a zero) is ignored.
    const host = space.current;
    const targets = [...nodes.current.entries()];
    let cancelled = false;
    const fresh = new Map<K, LayoutRectangle>();
    let pending = targets.length;
    const settle = () => {
      if (cancelled || --pending > 0) return;
      setState((previous) => {
        // Every surface keeps its motion when the target it sits on kept its
        // frame; one that moved or left resets them all in place.
        let holds = true;
        for (const anchor of anchors.current.values()) {
          const after = fresh.get(anchor.key);
          if (!after || !sameRect(anchor.layout, after)) holds = false;
        }
        const rects = previous.structure === structure ? new Map([...previous.rects, ...fresh]) : fresh;
        return { structure, rects, settled: true, revision: previous.revision + (holds ? 0 : 1) };
      });
    };
    if (!host || targets.length === 0) { pending = 1; settle(); return; }
    for (const [key, node] of targets) {
      node.measureLayout(host, (x, y, width, height) => {
        if (width > 0 && height > 0) fresh.set(key, { x, y, width, height });
        settle();
      }, settle);
    }
    return () => { cancelled = true; };
    // Only a structure change re-measures; a selection change travels on the frames held.
  }, [structure, space]);
  const resolved = state.structure === structure && state.settled;
  /** The frame a role's surface should occupy for `key`, and the reset key that snaps it. */
  const target = (role: string, key: K | undefined) => {
    const fresh = resolved && key != null ? state.rects.get(key) : undefined;
    if (resolved) {
      if (fresh && key != null) anchors.current.set(role, { key, layout: fresh });
      else anchors.current.delete(role);
    }
    const layout = fresh ?? (resolved ? undefined : anchors.current.get(role)?.layout);
    return { layout, resetKey: state.revision };
  };
  return { register, measure, record, target };
}

// Frames from onLayout and measureLayout describe the same target in the same
// space; half a pixel absorbs their rounding.
function sameRect(a: LayoutRectangle, b: LayoutRectangle): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}
