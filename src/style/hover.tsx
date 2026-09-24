import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, type PointerEvent, type StyleProp, type ViewStyle } from "react-native";
import { HOVER_EASING } from "./motion.js";
import type { ColorTokens } from "./tokens.js";
import { View } from "./primitives.js";

// Hover feedback, the timed kind the design language keeps (its item 9): a surface that
// rises while a pointer hovers it, and a row whose wash fades in. The values live in
// src/style/motion.ts (HOVER), judged against the `df-hover-lift` reference card.
//
// Where the hover comes from. A lifted surface is never its own hover target: it moves,
// so a pointer resting on its bottom edge would find itself off the surface once it
// rose, drop it, and find itself on it again, over and over. The target is a node that
// does not move (the RippleClip wrapper every pressable control already has), and its
// enter and leave count its descendants, so a pointer on the risen surface's top edge
// still hovers it. Touch never hovers: a tap's pointer enter is not a hover. React Native
// on iOS and Android delivers pointer enter and leave only to a host app that opts into
// W3C pointer events (off by default in React Native 0.86), so there these handlers stay
// inert unless the app has made that choice.
//
// How it moves. The style switches when the hover does and, on the web, a CSS transition
// runs the change, so nothing commits through React per frame (the loop primitive's rule,
// src/style/loop.tsx). React Native has no transition style attributes, so a native host
// drops the transition keys and would switch instantly. Only the web declares hover
// feedback: the web Card, Button and Sidebar skins, and a skin shared by every platform
// (Pagination) through `webHover`, since native pointer hover waits on the owner.
//
// What it stacks above. A lifted card's deeper shade must fall over its neighbours, as
// the reference's does (Dark Factory raises the lifting card's list tile). A plain web
// page gets that for free, since a transform paints an element above later siblings, but
// react-native-web gives every view `z-index: 0`, so paint order is document order and
// the next card would cover the shade. So a lifted surface stacks at the raised layer
// (`RAISED`, the hand-off's `--z-raised`) while it lifts and settles, and because every
// view is also a stacking context, the kit's layout cells (a Grid cell, a Row span cell)
// are `RaiseCell`s that stack above their neighbours while a descendant is raised.

/** The pointer handlers to spread on the node that does not move. */
export interface HoverTarget {
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
}

/** A timed hover change: how far the surface rises (0 for a wash) and how long it takes. */
export interface HoverMotion {
  distance: number;
  duration: number;
}

const NO_TARGET: HoverTarget = {};

/**
 * The fill a resting control takes under the pointer: the theme's translucent `hover`
 * wash, or `accent` for a token map that omits the optional role (tokens.ts documents the
 * fallback; the Sidebar's wash reads it the same way).
 */
export function hoverFill(tokens: Pick<ColorTokens, "hover" | "accent">): string {
  return tokens.hover ?? tokens.accent;
}

/**
 * A skin's hover look, declared on the web only. A skin that one component shares across
 * every platform (its native skins alias the web one) declares its hover feedback through
 * this, so native builds carry none until the owner decides native pointer hover, as the
 * separate iOS and Android skins already do. Platform-parameterized for tests, like
 * `rippleClipWrapperStyle`.
 */
export function webHover<T>(look: T, os: string = Platform.OS): T | null {
  return os === "web" ? look : null;
}

/**
 * Whether a mouse, trackpad or pen hovers the node `target` is spread on, while
 * `enabled` (the control declares hover feedback at all). A disabled control keeps its
 * handlers and masks the state instead (`hovered && !disabled`), so one enabled under a
 * resting pointer shows its hover without waiting for the pointer to move. When
 * `enabled` turns false the handlers come off and the state clears: a leave the handlers
 * never saw must not leave the control hovered when they come back.
 */
export function useHover(enabled = true): { hovered: boolean; target: HoverTarget } {
  const [hovered, setHovered] = useState(false);
  if (!enabled && hovered) setHovered(false);
  const onPointerEnter = useCallback((event: PointerEvent) => {
    if (event.nativeEvent?.pointerType !== "touch") setHovered(true);
  }, []);
  const onPointerLeave = useCallback(() => setHovered(false), []);
  const target = useMemo(() => ({ onPointerEnter, onPointerLeave }), [onPointerEnter, onPointerLeave]);
  return { hovered: enabled && hovered, target: enabled ? target : NO_TARGET };
}

export type HoverProperty = "transform" | "box-shadow" | "background-color";

/**
 * The web transition for a hover change: `properties` (their CSS names, which
 * react-native-web copies into `transition-property`) change over `duration` on the
 * reference's `ease`, and at once under Reduce Motion.
 */
export function hoverTransition(properties: readonly HoverProperty[], duration: number, reduced: boolean): ViewStyle {
  return {
    transitionProperty: properties.join(", "),
    transitionDuration: `${reduced ? 0 : duration}ms`,
    transitionTimingFunction: HOVER_EASING,
  } as unknown as ViewStyle;
}

/**
 * The moving half of a hover lift, for the surface inside the hover target: it rises
 * `motion.distance` while hovered, and the rise runs the transition, with the shadow when
 * `shadow` says the hovered elevation differs (the style's own `boxShadow` switches, the
 * browser interpolates the geometry).
 */
export function liftStyle(hovered: boolean, motion: HoverMotion, reduced: boolean, shadow = false): ViewStyle {
  return {
    ...(hovered ? { transform: [{ translateY: -motion.distance }] } : null),
    ...hoverTransition(shadow ? ["transform", "box-shadow"] : ["transform"], motion.duration, reduced),
  };
}

/**
 * A hover wash painted on the hover target itself, beneath the control: `color` while
 * hovered, the same colour transparent at rest, so the fade never passes through grey.
 * The control's own fills (pressed, selected) stay on the control and switch at once.
 */
export function washStyle(hovered: boolean, color: string, motion: HoverMotion, reduced: boolean): ViewStyle {
  return {
    backgroundColor: hovered ? color : transparentOf(color),
    ...hoverTransition(["background-color"], motion.duration, reduced),
  };
}

// The colour's own channels at alpha 0: a fade from `transparent` (black at alpha 0)
// interpolates premultiplied in current browsers, but spelling the rest state as the
// colour itself keeps the midpoint right on every engine.
function transparentOf(color: string): string {
  const functional = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(color);
  if (functional) return `rgba(${functional[1]}, ${functional[2]}, ${functional[3]}, 0)`;
  const hex = /^#([0-9a-f]{6})/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
  }
  return "transparent";
}

/** The layer a lifted surface stacks at while it lifts and settles: the hand-off's `--z-raised`. */
export const RAISED: ViewStyle = { zIndex: 10 };

/**
 * True while `active`, and for `duration` ms after it turns false: the time the leave
 * transition takes, so a surface stays raised until it has settled back.
 */
export function useSettling(active: boolean, duration: number): boolean {
  const [settling, setSettling] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    setSettling(!active && duration > 0);
  }
  useEffect(() => {
    if (!settling) return;
    const timer = setTimeout(() => setSettling(false), duration);
    return () => clearTimeout(timer);
  }, [settling, duration]);
  return active || settling;
}

const RaiseContext = createContext<((delta: 1 | -1) => void) | null>(null);

/** Stack the nearest kit layout cell above its neighbours while `raised` (outside one, nothing). */
export function useRaiseCell(raised: boolean): void {
  const raise = useContext(RaiseContext);
  useEffect(() => {
    if (!raised || raise == null) return;
    raise(1);
    return () => raise(-1);
  }, [raised, raise]);
}

/** A layout cell (a Grid cell, a Row span cell) that stacks above its neighbours while a descendant is raised. */
export function RaiseCell({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }): ReactNode {
  const [raised, setRaised] = useState(0);
  const raise = useCallback((delta: 1 | -1) => setRaised((count) => count + delta), []);
  return (
    <RaiseContext.Provider value={raise}>
      <View style={[style, raised > 0 ? RAISED : null]}>{children}</View>
    </RaiseContext.Provider>
  );
}
