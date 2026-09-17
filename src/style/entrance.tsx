// Entrance opens an overlay with a transform-only spring outside GlassSurface.
// Alpha stays at one: fading a native glass ancestor can prevent its material
// from painting. A stable animated scale gate conceals the measured host without
// replacing transform nodes or remounting its children. Overlays unmount on close,
// so there is no exit animation.

import { type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";
import { Animated, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { useReducedMotion, supportsNativeDriver } from "./motion.js";
import { PopupInteractionContext, StationaryEntranceContext } from "./popup-motion.js";

// Anchored menus pop from 85%; dialog panels ease in from 96% (barely a scale, just a
// settle). The menu spring carries a slight overshoot (the liquid feel); the panel
// spring does not.
const MENU_START_SCALE = 0.85;
const PANEL_START_SCALE = 0.96;
const MENU_SPRING = { stiffness: 550, damping: 38, mass: 1 } as const;
const PANEL_SPRING = { stiffness: 500, damping: 44, mass: 1 } as const;

interface Size {
  width: number;
  height: number;
}

/**
 * The progress=0 translation that pins a corner-anchored surface's top-left corner in
 * place while it scales up from `startScale` about its own center. React Native scales
 * about the center, so the top-left corner would otherwise drift by (w/2, h/2)*(1-scale);
 * translating by the negative pins it, making the surface grow out of the trigger corner.
 * The relationship is linear in progress, so the pin holds exactly through spring overshoot
 * (scale > 1). Exported for unit tests.
 */
export function entranceTranslation(size: Size, startScale: number, anchorBottom = false): { x: number; y: number } {
  const k = 1 - startScale;
  return { x: -(size.width / 2) * k, y: (anchorBottom ? 1 : -1) * (size.height / 2) * k };
}

export interface EntranceProps {
  /**
   * Anchored mode: the surface scales up from the trigger's corner (its top-left is
   * pinned). Omit for a dialog-style symmetric scale about the center.
   */
  anchor?: boolean;
  /** Pin the lower corner when an anchored card opens above its trigger. */
  anchorBottom?: boolean;
  /** Hold visibility until the owner has measured its final placement. */
  ready?: boolean;
  /** Layout/position for the wrapper (a menu's absolute left/top; a dialog's width caps). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

interface Coefficients {
  delta: number;
  x: number;
  y: number;
}

function positiveSize(size: Size | null): size is Size {
  return !!size && Number.isFinite(size.width) && size.width > 0
    && Number.isFinite(size.height) && size.height > 0;
}

function createEntranceGraph(startScale: number) {
  // Public Value configuration makes every operand native from attachment on
  // iOS/Android, including the initial hold. Web uses the same graph in JS.
  const config = { useNativeDriver: supportsNativeDriver };
  const progress = new Animated.Value(0, config);
  const gate = new Animated.Value(0, config);
  const scaleDelta = new Animated.Value(startScale - 1, config);
  const pinX = new Animated.Value(0, config);
  const pinY = new Animated.Value(0, config);
  const inverseProgress = progress.interpolate<number>({
    inputRange: [0, 1], outputRange: [1, 0], extrapolate: "extend",
  });
  const scale = Animated.multiply<number>(gate, Animated.add<number>(1, Animated.multiply<number>(scaleDelta, inverseProgress)));
  const translateX = Animated.multiply<number>(pinX, inverseProgress);
  const translateY = Animated.multiply<number>(pinY, inverseProgress);
  // These operands, derived nodes and transform slots live for the whole mount.
  // Scale applies about the center before translation pins the chosen corner.
  const visualStyle: Animated.WithAnimatedValue<ViewStyle> = {
    opacity: 1,
    transform: [{ translateX }, { translateY }, { scale }],
  };
  return {
    progress, gate, scaleDelta, pinX, pinY, visualStyle,
    animation: null as Animated.CompositeAnimation | null,
    coefficients: null as Coefficients | null,
    lastReduced: null as boolean | null,
    visible: false,
    initialized: false,
    runToken: 0,
  };
}

export function Entrance({ anchor, anchorBottom = false, ready = true, style, children }: EntranceProps) {
  const reducedMotion = useReducedMotion();
  const stationary = useContext(StationaryEntranceContext);
  const interactive = useContext(PopupInteractionContext);
  const reduced = reducedMotion || stationary;
  const inheritedReadiness = useContext(EntranceReadinessContext);
  const graphRef = useRef<ReturnType<typeof createEntranceGraph> | null>(null);
  if (graphRef.current === null) graphRef.current = createEntranceGraph(anchor ? MENU_START_SCALE : PANEL_START_SCALE);
  const graph = graphRef.current;
  const [size, setSize] = useState<Size | null>(null);
  // Centered panels do not need their own dimensions to animate. A parent's
  // readiness delays descendant focus callbacks, never this animation.
  const held = !ready || (!!anchor && !positiveSize(size));

  const stop = useCallback(() => {
    graph.runToken++;
    const animation = graph.animation;
    graph.animation = null;
    animation?.stop();
    graph.progress.stopAnimation();
  }, [graph]);

  useIsomorphicLayoutEffect(() => {
    const startScale = anchor ? MENU_START_SCALE : PANEL_START_SCALE;
    const from = anchor && positiveSize(size) ? entranceTranslation(size, startScale, anchorBottom) : { x: 0, y: 0 };
    const next = { delta: startScale - 1, x: from.x, y: from.y };
    if (held && (!graph.initialized || graph.visible)) {
      // Request concealment before resetting progress or changing coefficients,
      // including a rehold and anchor change delivered in the same commit.
      graph.gate.setValue(0);
      stop();
      graph.progress.setValue(0);
      graph.visible = false;
    }
    const previous = graph.coefficients;
    if (!previous || previous.delta !== next.delta) graph.scaleDelta.setValue(next.delta);
    if (!previous || previous.x !== next.x) graph.pinX.setValue(next.x);
    if (!previous || previous.y !== next.y) graph.pinY.setValue(next.y);
    graph.coefficients = next;

    if (!held && !graph.visible) {
      stop();
      graph.progress.setValue(reduced ? 1 : 0);
      graph.visible = true;
      graph.gate.setValue(1);
      if (!reduced) {
        const token = ++graph.runToken;
        const animation = Animated.spring(graph.progress, {
          toValue: 1,
          ...(anchor ? MENU_SPRING : PANEL_SPRING),
          useNativeDriver: supportsNativeDriver,
        });
        graph.animation = animation;
        animation.start(() => {
          if (graph.runToken === token) graph.animation = null;
        });
      }
    } else if (!held && reduced && graph.lastReduced !== true) {
      stop();
      graph.progress.setValue(1);
    }
    // A visible resize or turning motion back on updates the existing graph
    // without replaying the opening spring.
    graph.lastReduced = reduced;
    graph.initialized = true;
  }, [anchor, anchorBottom, graph, held, reduced, size, stop]);

  useIsomorphicLayoutEffect(() => () => {
    graph.gate.setValue(0);
    stop();
    // StrictMode can replay effect setup on the same host. Close this lifecycle
    // so the next setup cannot skip its reveal with progress still at the start.
    graph.visible = false;
    graph.initialized = false;
  }, [graph, stop]);

  // Native layout and RNW's offset-based onLayout measure the untransformed
  // host even while its scale is zero. A transformed bounding-box measurement
  // here would keep the hold closed because it would report a zero size.
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!positiveSize({ width, height })) {
      setSize(null);
      return;
    }
    setSize(previous => previous?.width === width && previous.height === height ? previous : { width, height });
  }, []);

  return (
    <EntranceReadinessContext.Provider value={inheritedReadiness && !held}>
      <Animated.View
        pointerEvents={held || !interactive ? "none" : "auto"}
        accessibilityElementsHidden={held || !interactive}
        importantForAccessibility={held || !interactive ? "no-hide-descendants" : "auto"}
        aria-hidden={held || !interactive}
        style={[style, graph.visualStyle]}
        onLayout={onLayout}
      >
        <StationaryEntranceContext.Provider value={false}>{children}</StationaryEntranceContext.Provider>
      </Animated.View>
    </EntranceReadinessContext.Provider>
  );
}
