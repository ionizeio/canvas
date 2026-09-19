import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Animated, StyleSheet, type LayoutRectangle, type StyleProp, type TextProps, type TextStyle, type View } from "react-native";
import { INK_FOLLOW, liquidBounds, useLiquidMotion, type LiquidBounds, type LiquidMotionProfile } from "./liquid-motion.js";
import { useReducedMotion } from "./motion.js";
import { fontStyle } from "./text.js";
import { useTheme } from "./theme.js";

/**
 * Internal decorative frame. The owner measures its selection in this frame's
 * parent coordinates and supplies the skin's material, radius and elevation.
 * Foreground and interactive hosts remain siblings outside this motion graph.
 */
export function MeasuredSelection({ layout, enabled, pressed = false, resetKey, profile, bounds, children, testID }: {
  layout: LayoutRectangle;
  enabled: boolean;
  pressed?: boolean;
  profile?: LiquidMotionProfile;
  /** Change for structural relayouts that must reconcile without selection travel. */
  resetKey?: string | number;
  /** The bounds `useMeasuredTargets` hands out for the role, so the targets' ink can follow this surface. */
  bounds?: LiquidBounds;
  children: ReactNode;
  testID?: string;
}) {
  const frame = useLiquidMotion(layout, { enabled, pressed, resetKey, profile, bounds });
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
 *
 * The ink on a brand puck follows the surface, not the press: `ink(key, ...)`
 * gives a target's label the colour the surface's coverage of that target says it
 * should have, so a newly selected label keeps its resting ink until the puck is
 * under it and the label it left returns to its resting ink as the puck departs.
 * Only the two targets a flight involves (the one the surface leaves and the one
 * it lands on) are driven by the motion; every other label is a plain colour, so a
 * grid of thirty targets costs two animated nodes per flight, not thirty.
 */
export function useMeasuredTargets<K extends string | number>(structure: string, space: RefObject<View | null>) {
  const nodes = useRef(new Map<K, View>());
  const latestStructure = useRef(structure);
  latestStructure.current = structure;
  const anchors = useRef(new Map<string, { key: K; layout: LayoutRectangle }>());
  // Per role: the bounds its surface animates (created when its first frame is
  // known and kept across withdrawals; the surface re-seats them on mount), the
  // flight's endpoints (the target it left, `from`, and the one it is on or heading
  // to, `to`), the revision they were seen at, whether the surface renders this
  // render, and whether it is only appearing or snapping (its bounds catch up in
  // the surface's effect, so the targets' ink stays plain for that render).
  const surfaces = useRef(new Map<string, { bounds: LiquidBounds; from?: K; to?: K; revision: number; live: boolean; settling: boolean }>());
  const reducedMotion = useReducedMotion();
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
  // The roles asked for this render: `ink` reads only those, so a role the owner
  // stopped rendering (solid mode, a mode switch) cannot keep driving a label.
  const asked: string[] = [];
  /**
   * The frame a role's surface should occupy for `key`, the reset key that snaps
   * it, and the bounds the surface animates (hand all three to MeasuredSelection).
   * Call it once per role per render, before the targets render, with the key
   * whose surface you render or undefined when you render none: it also records
   * the flight `ink` follows.
   */
  const target = (role: string, key: K | undefined) => {
    asked.push(role);
    const fresh = resolved && key != null ? state.rects.get(key) : undefined;
    if (resolved) {
      if (fresh && key != null) anchors.current.set(role, { key, layout: fresh });
      else anchors.current.delete(role);
    }
    const layout = fresh ?? (resolved ? undefined : anchors.current.get(role)?.layout);
    const seen = surfaces.current.get(role);
    const bounds = seen?.bounds ?? (layout ? liquidBounds(layout) : undefined);
    if (bounds) {
      // A new key starts a flight from the target the surface sat on, unless the
      // surface is snapping (a reset has no departure) or was not showing; a
      // surface that appears or snaps also forgets any flight it was on.
      const live = layout != null;
      const settling = !seen?.live || seen.revision !== state.revision;
      const moved = seen?.to !== key;
      const from = settling ? undefined : moved ? seen?.to : seen?.from;
      surfaces.current.set(role, { bounds, from, to: key, revision: state.revision, live, settling });
    }
    return { layout, resetKey: state.revision, bounds };
  };
  /**
   * The colour a target's label (or its dot) paints: `covered` when a surface
   * rests on it, `rest` otherwise, and during a flight the interpolation the
   * surface's coverage of the target drives (render it with SelectionText or an
   * Animated view). `selected` is the owner's own state for the case where no
   * surface moves (solid mode, an unmeasured target, Reduce Motion).
   */
  const ink = (key: K, selected: boolean, colours: { rest: string; covered: string }): string | Animated.AnimatedInterpolation<string> => {
    const covered = coveredBy(key);
    if (!covered) return selected ? colours.covered : colours.rest;
    return covered.interpolate({ inputRange: [0, 1], outputRange: [colours.rest, colours.covered], extrapolate: "clamp" });
  };
  /**
   * The opacity of a target's OWN resting surface (a bordered page tile, a neutral
   * link capsule) while a moving surface exists: it yields to the surface as the
   * surface covers it and re-forms as the surface leaves, instead of popping at
   * the press. 1 when no live surface involves the target, 0 once one rests on it.
   */
  const uncovered = (key: K, selected: boolean): number | Animated.AnimatedInterpolation<number> => {
    const covered = coveredBy(key);
    if (!covered) return selected && asked.some((role) => { const s = surfaces.current.get(role); return s?.live && s.to === key; }) ? 0 : 1;
    return covered.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: "clamp" });
  };
  // The coverage of `key` by the live surfaces whose flight involves it, or
  // undefined when no motion drives it this render (then the settled value applies).
  const coveredBy = (key: K): Coverage | undefined => {
    if (reducedMotion) return undefined;
    const rect = resolved ? state.rects.get(key) : undefined;
    if (!rect) return undefined;
    let covered: Coverage | undefined;
    for (const role of asked) {
      const surface = surfaces.current.get(role);
      if (!surface || !surface.live || surface.settling || (surface.to !== key && surface.from !== key)) continue;
      const next = coverage(surface.bounds, rect);
      // Two surfaces on one target (a one-day range) cover it if either does.
      covered = covered ? Animated.add(covered, next) : next;
    }
    return covered;
  };
  return { register, measure, record, target, ink, uncovered };
}

type Coverage = Animated.AnimatedMultiplication<number> | Animated.AnimatedAddition<number>;

// How much of `rect` a surface with `bounds` covers, 0 to 1, from its centre's
// distance along each axis in the rect's own size (INK_FOLLOW): a ridge that is
// 1 inside `covered`, 0 beyond `clear`, and the product of both axes so a
// diagonal approach reads as one fade.
function coverage(bounds: LiquidBounds, rect: LayoutRectangle): Coverage {
  const axis = (value: Animated.Value, centre: number, size: number) => value.interpolate({
    inputRange: [centre - size * INK_FOLLOW.clear, centre - size * INK_FOLLOW.covered, centre + size * INK_FOLLOW.covered, centre + size * INK_FOLLOW.clear],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp",
  });
  return Animated.multiply(axis(bounds.centerX, rect.x + rect.width / 2, rect.width), axis(bounds.centerY, rect.y + rect.height / 2, rect.height));
}

/**
 * A label whose colour may be an `ink` interpolation: Animated's Text with the
 * theme's faces applied the way the kit's Text applies them, so the colour follows
 * the surface without a render. Use it for every label of a target `ink` styles.
 */
export function SelectionText({ style, ...rest }: Animated.AnimatedProps<TextProps>) {
  const { fonts } = useTheme();
  return <Animated.Text {...rest} style={fontStyle(style as StyleProp<TextStyle>, fonts) as Animated.AnimatedProps<TextProps>["style"]} />;
}

// Frames from onLayout and measureLayout describe the same target in the same
// space; half a pixel absorbs their rounding.
function sameRect(a: LayoutRectangle, b: LayoutRectangle): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}
