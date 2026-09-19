// The button-to-menu hand-off: how a Dropdown-class trigger (the outline button, the
// account capsule, the collapsed navbar's hamburger) gives its glass pill to the menu
// pane as the pane blooms, and takes it back as the pane shrinks home, the way the
// iOS 26 menu behind the docs header's hamburger does (tools/native/liquid-motion.md,
// 2026-09-19). It is one mechanism on every material: the pane's material travels
// between the trigger's frame and the resting card (`usePopupMotion` with an
// `origin`), so at progress 0 it IS the pill, and the trigger's own material and label
// yield to it on the same travel value, which the owner creates here and shares with
// both sides (`usePopupHandoff`). The Autocomplete and Select fields never hand off:
// their field stays visible for typing, so this is a trigger-side capability of the
// Dropdown, not part of the shared popup policy.
//
// Two invariants keep every material honest:
// - The trigger's material is never at a partial opacity. It is 1 only at progress 0
//   exactly (the close spring snaps there as it finishes) and 0 above `HANDOFF_RETURN`;
//   a native glass ancestor at a fractional alpha may not paint, and a web backdrop
//   under one loses its sampling root (see entrance.tsx). The label is a separate
//   value on its own short fades, never an ancestor of the material, so its partial
//   frames touch no glass: it fades OUT over the pane's first frames (the droplet
//   covers it) and fades IN only once the pane has left and the material is back.
// - The trigger's material is never unmounted to hide it: on iOS the native glass
//   fades on removal and a remount pops (see measured-selection.tsx). It is hidden in
//   place, behind the pane that stands in for it.

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { GlassLayer } from "./glass-surface/glass-surface.shared.js";
import { supportsNativeDriver } from "./motion.js";
import { HANDOFF_RETURN, POPUP_PRESENTATION } from "./popup-motion.js";

const { label: LABEL } = POPUP_PRESENTATION.handoff;

/** The material shape a trigger reports: its uniform corner, the box it covers and its layer. */
export interface HandoffShape { radius: number; width: number; height: number; layer: GlassLayer }

/**
 * The channel an owner shares with its popup: the travel value the pane's motion
 * drives (0 at the trigger, 1 at rest), the largest material shape the trigger has
 * reported (the pill's corner becomes the pane's progress-0 corner), and whether the
 * pane takes the trigger's frame as its origin at all (glass, motion allowed, hosted).
 */
export interface PopupHandoff {
  progress: Animated.Value;
  shape: { current: { radius: number; area: number; layer: GlassLayer } | null };
  fromTrigger: boolean;
}

/** What the trigger's subtree reads: the opacity its material and label follow, and where to report a shape. */
export interface PopupHandoffValue {
  /** 1 while the trigger paints its own material, 0 while the pane stands in for it. */
  material: Animated.AnimatedInterpolation<number>;
  /** The trigger's foreground opacity: out as the pane appears, back once the pane has left. */
  label: Animated.Value;
  /** A GlassPane in the trigger reports its shape here (the largest one is the pill). */
  report: (shape: HandoffShape) => void;
}

/** Provided by a Dropdown-class owner around its trigger; null everywhere else. */
export const PopupHandoffContext = createContext<PopupHandoffValue | null>(null);

/**
 * The owner's end of the hand-off: one travel value for the whole life of the owner
 * (the pane seats and springs it, the trigger reads it), the interpolations the
 * trigger's subtree paints from, and the shape report. `active` is whether the
 * hand-off runs this render (the trigger's material resolves to glass, motion is
 * allowed, and the popup is hosted so the trigger's frame is measured); when it is
 * not, the context is null and the pane grows from its anchor edge as every other
 * popup does, while the shared value still carries the pane's travel.
 */
export function usePopupHandoff(active: boolean): { handoff: PopupHandoff; context: PopupHandoffValue | null } {
  const channel = useRef<{ progress: Animated.Value; label: Animated.Value; shape: PopupHandoff["shape"]; context: PopupHandoffValue } | null>(null);
  if (!channel.current) {
    const progress = new Animated.Value(0);
    // The label's opacity, on its own short fades (native-driven where the platform
    // has the driver, so the JS thread's work at the pane's mount and unmount cannot
    // stutter them): out as the pane appears, back once it has left.
    const label = new Animated.Value(1);
    const shape: PopupHandoff["shape"] = { current: null };
    channel.current = {
      progress,
      label,
      shape,
      context: {
        material: progress.interpolate({ inputRange: [0, HANDOFF_RETURN], outputRange: [1, 0], extrapolate: "clamp" }),
        label,
        report: ({ radius, width, height, layer }) => {
          const area = width * height;
          if (!shape.current || area >= shape.current.area) shape.current = { radius, area, layer };
        },
      },
    };
  }
  const { progress, label, shape, context } = channel.current;
  useEffect(() => {
    // The pane's travel drives the label: the frame the pane first exists (the
    // droplet, over the pill) the label fades out, and the frame the pane has snapped
    // home and left, the label fades back over the trigger's own material.
    let out = false;
    let fade: Animated.CompositeAnimation | null = null;
    const run = (toValue: number, duration: number) => {
      fade?.stop();
      fade = Animated.timing(label, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: supportsNativeDriver, isInteraction: false });
      fade.start();
    };
    const listener = progress.addListener(({ value }) => {
      if (value > 0) {
        if (out) return;
        out = true;
        run(0, LABEL.hideMs);
      } else if (out) {
        out = false;
        run(1, LABEL.returnMs);
      }
    });
    return () => { progress.removeListener(listener); fade?.stop(); };
  }, [progress, label]);
  const handoff = useMemo<PopupHandoff>(() => ({ progress, shape, fromTrigger: active }), [progress, shape, active]);
  return { handoff, context: active ? context : null };
}

/**
 * The trigger's foreground under a hand-off: an animated wrapper whose opacity follows
 * the pane's travel. Without a hand-off it renders its children as they are, so a
 * solid or reduced-motion trigger keeps its tree byte for byte. Any GlassPane inside
 * hides itself on the material curve, which is at 0 whenever this fader is partial, so
 * the fader never sits over a live material at a fractional opacity.
 */
export function PopupHandoffForeground({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const handoff = useContext(PopupHandoffContext);
  if (!handoff) return <>{children}</>;
  return <Animated.View style={[style, { opacity: handoff.label }]}>{children}</Animated.View>;
}

/** The uniform corner a trigger's shape style declares (the largest corner of a per-corner shape). */
export function shapeRadius(shape: StyleProp<ViewStyle>): number {
  const flat = (StyleSheet.flatten(shape) ?? {}) as Record<string, unknown>;
  let radius = typeof flat.borderRadius === "number" ? flat.borderRadius : 0;
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith("border") && key.endsWith("Radius") && typeof value === "number") radius = Math.max(radius, value);
  }
  return radius;
}
