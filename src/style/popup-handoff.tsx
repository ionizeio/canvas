// The button-to-menu hand-off: how a Dropdown-class trigger (the outline button, the
// account capsule, the collapsed navbar's hamburger, a row menu's glyph, a popover's
// button, a split button, the command palette's search bar) gives its glass pill to
// the pane as the pane blooms, and takes it back as the pane shrinks home, the way the
// iOS 26 menu behind the docs header's hamburger does (tools/native/liquid-motion.md,
// 2026-09-19). It is one mechanism on every material: the pane's material travels
// between the trigger's frame and the resting card (`usePopupMotion` with an
// `origin`), so at progress 0 it IS the pill, and the trigger's own material and label
// yield to it on the same travel value, which the owner creates here and shares with
// both sides (`usePopupHandoff`).
//
// A FIELD (Autocomplete, Select, PhoneInput) hands off the same way (`field`), with
// the one difference its anatomy forces: the user reads or types into it while its
// list is open, so its material and text are hidden only while the pane COVERS the
// field's box, from the snap up to the cover mark (`fieldCoverMark`), and are back the
// moment the pane has left it, on the way out (the field vanishes into the droplet and
// re-forms under the settling list) as on the way home (the pane absorbs onto the box
// and hands back at the snap).
//
// Two invariants keep every material honest:
// - The trigger's material is never at a partial opacity. It is 1 only at progress 0
//   exactly (the close spring snaps there as it finishes) and 0 above `HANDOFF_RETURN`
//   (a field's is also 1 from the cover mark up); a native glass ancestor at a
//   fractional alpha may not paint, and a web backdrop under one loses its sampling
//   root (see entrance.tsx). The label is a separate value on its own short fades,
//   never an ancestor of the material, so its partial frames touch no glass: it fades
//   OUT over the pane's first covering frames (the droplet covers it) and fades IN
//   only once the pane has left and the material is back.
// - The trigger's material is never unmounted to hide it: on iOS the native glass
//   fades on removal and a remount pops (see measured-selection.tsx). It is hidden in
//   place, behind the pane that stands in for it.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { GlassLayer } from "./glass-surface/glass-surface.shared.js";
import { supportsNativeDriver } from "./motion.js";
import { HANDOFF_RETURN, POPUP_PRESENTATION, fieldCoverMark } from "./popup-motion.js";
import { Text } from "./text.js";

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
  shape: { current: { radius: number; area: number; height: number; layer: GlassLayer } | null };
  fromTrigger: boolean;
}

/** What the trigger's subtree reads: the opacity its material and label follow, and where to report a shape. */
export interface PopupHandoffValue {
  /** 1 while the trigger paints its own material, 0 while the pane stands in for it. */
  material: Animated.AnimatedInterpolation<number>;
  /** The trigger's foreground opacity: out as the pane covers it, back once the pane has left. */
  label: Animated.Value;
  /** A GlassPane in the trigger reports its shape here (the largest one is the pill). */
  report: (shape: HandoffShape) => void;
}

export interface PopupHandoffOptions {
  /**
   * The owner is a FIELD: a control the user reads or types into while its list is
   * open, so its material and text yield only while the pane covers the field's box
   * and are back as soon as the pane has left it. `gap` is the standoff the owner
   * gives its overlay, which with the pane's reported extent fixes where that cover
   * ends (`fieldCoverMark`). The field popups anchor below or above their field, so
   * the extent is the reported height.
   */
  field?: { gap: number };
}

/** Provided by a Dropdown-class owner around its trigger; null everywhere else. */
export const PopupHandoffContext = createContext<PopupHandoffValue | null>(null);

interface Channel {
  progress: Animated.Value;
  label: Animated.Value;
  /** Whether the owner is a field (its material returns from the cover mark up). */
  field: boolean;
  shape: PopupHandoff["shape"];
  /** Where a field's cover ends on the travel (1 until its pane has reported). */
  mark: { current: number };
  report: PopupHandoffValue["report"];
}

/**
 * The owner's end of the hand-off: one travel value for the whole life of the owner
 * (the pane seats and springs it, the trigger reads it), the interpolations the
 * trigger's subtree paints from, and the shape report. `active` is whether the
 * hand-off runs this render (the trigger's material resolves to glass, motion is
 * allowed, and the popup is hosted so the trigger's frame is measured); when it is
 * not, the context is null and the pane grows from its anchor edge as every other
 * popup does, while the shared value still carries the pane's travel.
 */
export function usePopupHandoff(active: boolean, options?: PopupHandoffOptions): { handoff: PopupHandoff; context: PopupHandoffValue | null } {
  const field = options?.field;
  const gap = useRef(field?.gap ?? 0);
  gap.current = field?.gap ?? 0;
  // A field's cover mark, once its pane has reported its extent: the one part of the
  // material curve that depends on a measurement, so it is state, and the curve is
  // rebuilt (once, at mount) when it lands.
  const [mark, setMark] = useState(1);
  const channel = useRef<Channel | null>(null);
  if (!channel.current) {
    // Every value is native from birth where the platform has the driver, the
    // contract `usePopupMotion` sets for a shared travel value: the pane's whole
    // presentation, its seed frame included, then runs in the native animated module.
    const driver = { useNativeDriver: supportsNativeDriver };
    const progress = new Animated.Value(0, driver);
    // The label's opacity, on its own short fades (native-driven where the platform
    // has the driver, so the JS thread's work at the pane's mount and unmount cannot
    // stutter them): out as the pane covers it, back once it has left.
    const label = new Animated.Value(1, driver);
    const shape: PopupHandoff["shape"] = { current: null };
    const cover = { current: 1 };
    const isField = field != null;
    channel.current = {
      progress,
      label,
      field: isField,
      shape,
      mark: cover,
      report: ({ radius, width, height, layer }) => {
        const area = width * height;
        if (!shape.current || area >= shape.current.area) shape.current = { radius, area, height, layer };
        if (!isField) return;
        const next = fieldCoverMark(shape.current.height, gap.current);
        if (next === cover.current) return;
        cover.current = next;
        setMark(next);
      },
    };
  }
  const { progress, label, field: isField, shape, mark: cover, report } = channel.current;
  const material = useMemo(() => {
    // A whole trigger: 1 only at the snap, 0 the moment the pane exists.
    if (!isField) return progress.interpolate({ inputRange: [0, HANDOFF_RETURN], outputRange: [1, 0], extrapolate: "clamp" });
    // A field: the same at the snap, and back from the cover mark up (the pane has
    // left the box), both steps as sharp as the interpolation allows.
    return progress.interpolate({ inputRange: [0, HANDOFF_RETURN, mark - HANDOFF_RETURN, mark], outputRange: [1, 0, 0, 1], extrapolate: "clamp" });
  }, [progress, isField, mark]);
  const context = useMemo<PopupHandoffValue>(() => ({ material, label, report }), [material, label, report]);
  useEffect(() => {
    // The pane's travel drives the label: the frame the pane first covers the trigger
    // (the droplet over the pill) the label fades out, and the frame the pane has left
    // (snapped home; for a field, past the cover mark too) the label fades back over
    // the trigger's own material.
    let out = false;
    let fade: Animated.CompositeAnimation | null = null;
    const run = (toValue: number, duration: number) => {
      fade?.stop();
      fade = Animated.timing(label, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: supportsNativeDriver, isInteraction: false });
      fade.start();
    };
    const listener = progress.addListener(({ value }) => {
      const covered = isField ? value > 0 && value < cover.current : value > 0;
      if (covered === out) return;
      out = covered;
      run(covered ? 0 : 1, covered ? LABEL.hideMs : LABEL.returnMs);
    });
    return () => {
      progress.removeListener(listener);
      fade?.stop();
    };
  }, [progress, label, isField, cover]);
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

/**
 * A field's text-bearing nodes under the hand-off (a value cluster, a chevron, a
 * floating label's layer, a number area) take the label's fade as an animated opacity
 * of their own, on the node itself or on a layout-neutral fader around it, never on an
 * ancestor of the field's GlassPane. `opacity` is the node's own ink (a pressed or
 * disabled dim), folded into the fade. Null without a hand-off, so a solid or
 * reduced-motion field keeps its style array byte for byte. A TextInput never becomes
 * an animated component for this (`PopupHandoffForeground` wraps it instead): an
 * animated host re-attaches its ref on every render, and the accessibility return
 * reads that as the editor detaching.
 */
export function handoffInk(context: PopupHandoffValue | null, opacity = 1): Animated.WithAnimatedValue<ViewStyle> | null {
  if (!context) return null;
  return { opacity: opacity === 1 ? context.label : (Animated.multiply(context.label, opacity) as unknown as Animated.AnimatedInterpolation<number>) };
}

/** The kit's Text as an animated component, for a field's fading text nodes (`handoffInk`). */
export const HandoffText = Animated.createAnimatedComponent(Text);

/** The uniform corner a trigger's shape style declares (the largest corner of a per-corner shape). */
export function shapeRadius(shape: StyleProp<ViewStyle>): number {
  const flat = (StyleSheet.flatten(shape) ?? {}) as Record<string, unknown>;
  let radius = typeof flat.borderRadius === "number" ? flat.borderRadius : 0;
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith("border") && key.endsWith("Radius") && typeof value === "number") radius = Math.max(radius, value);
  }
  return radius;
}
