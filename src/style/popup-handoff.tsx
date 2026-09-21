// The button-to-menu hand-off: how a Dropdown-class trigger (the outline button, the
// account capsule, the collapsed navbar's hamburger, a row menu's glyph, a popover's
// button, a split button group, the command palette's search bar) gives its glass pill
// to the pane as the pane blooms, and takes it back as the pane shrinks home, the way the
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
// - The trigger's material is never at a partial opacity. It is 1 from the re-form
//   mark down (`handoff.reform`: the pill is a body of its own under the last of a
//   closing drop, the way the reference's pill re-forms before its blob has merged)
//   and 0 above it, which is the moment an opening pane exists (a field's is 1 at the
//   snap and from the cover mark up); a native glass ancestor at a fractional alpha
//   may not paint, and a web backdrop under one loses its sampling root (see
//   entrance.tsx). The label is a separate value on its own short fades, never an
//   ancestor of the material, so its partial frames touch no glass: it cuts OUT the
//   frame the pane exists (the droplet covers it) and fades IN over the re-formed
//   material once the pane has left. A component that paints a pill of its own
//   (Button, Avatar, the AvatarMenu capsule) therefore fades its FOREGROUND itself
//   (`usePopupHandoffPill` + `handoffInk`) and turns the owner's whole-subtree fader
//   (`PopupHandoffForeground`) into a pass-through, so the fader never sits over its
//   material; the fader stays for bare custom content, which has no material to show.
// - The trigger's material is never unmounted to hide it: on iOS the native glass
//   fades on removal and a remount pops (see measured-selection.tsx). It is hidden in
//   place, behind the pane that stands in for it.

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { GlassLayer } from "./glass-surface/glass-surface.shared.js";
import { supportsNativeDriver } from "./motion.js";
import { HANDOFF_RETURN, POPUP_PRESENTATION, fieldCoverMark } from "./popup-motion.js";
import { Text } from "./text.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

const HANDOFF = POPUP_PRESENTATION.handoff;
const { label: LABEL } = HANDOFF;

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
  /** The pill: its corner, its area (the largest reporter wins), its extent along the anchor axis, and its layer (none for a bare trigger, which keeps the pane's own fill). */
  shape: { current: { radius: number; area: number; height: number; layer?: GlassLayer } | null };
  fromTrigger: boolean;
  /** Whether the owner is a field (its drop is born over its box; a whole trigger's hangs under it). */
  field: boolean;
}

/** What the trigger's subtree reads: the opacity its material and label follow, and where to report a shape. */
export interface PopupHandoffValue {
  /** 1 while the trigger paints its own material, 0 while the pane stands in for it. */
  material: Animated.AnimatedInterpolation<number>;
  /** The material's scale about its centre: whole at rest, growing from `reformGrowth.from` as it re-forms under a closing drop. */
  growth: Animated.Value;
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
  /**
   * The trigger paints no material of its own (a bare glyph, an outlined search bar):
   * the pane wears this corner at progress 0 and keeps its own fill throughout, and a
   * pane INSIDE the trigger (a keycap) hides with it but never reports as the pill.
   */
  bare?: { radius: number };
}

/** Provided by a Dropdown-class owner around its trigger; null everywhere else. */
export const PopupHandoffContext = createContext<PopupHandoffValue | null>(null);

interface Channel {
  progress: Animated.Value;
  label: Animated.Value;
  growth: Animated.Value;
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
    // The material's re-forming scale (see `handoff.reformGrowth`), native like the label.
    const growth = new Animated.Value(1, driver);
    const bare = options?.bare;
    // A bare trigger's shape is declared, not reported: the trigger's own corner, no
    // layer to blend from, and an area no pane inside it can beat.
    const shape: PopupHandoff["shape"] = { current: bare ? { radius: bare.radius, area: Infinity, height: 0 } : null };
    const cover = { current: 1 };
    const isField = field != null;
    channel.current = {
      progress,
      label,
      growth,
      field: isField,
      shape,
      mark: cover,
      report: ({ radius, width, height, layer }) => {
        if (bare) return;
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
  const { progress, label, growth, field: isField, shape, mark: cover, report } = channel.current;
  const material = useMemo(() => {
    // A whole trigger: 1 from the re-form mark down (the pill is a body of its own
    // under the last of a closing drop, see `handoff.reform`), 0 above it, which is
    // the moment an opening pane exists (the seed is above the mark).
    if (!isField) return progress.interpolate({ inputRange: [HANDOFF.reform - HANDOFF_RETURN, HANDOFF.reform], outputRange: [1, 0], extrapolate: "clamp" });
    // A field: the same at the snap, and back from the cover mark up (the pane has
    // left the box), both steps as sharp as the interpolation allows.
    return progress.interpolate({ inputRange: [0, HANDOFF_RETURN, mark - HANDOFF_RETURN, mark], outputRange: [1, 0, 0, 1], extrapolate: "clamp" });
  }, [progress, isField, mark]);
  const context = useMemo<PopupHandoffValue>(() => ({ material, growth, label, report }), [material, growth, label, report]);
  useEffect(() => {
    // A whole trigger's material RE-FORMS as it comes back under a closing drop: the
    // frame the travel crosses the re-form mark downward the material is a small body
    // scaled about its centre and springs to whole (`reformGrowth`). Crossing upward
    // (a reopen) the material is hidden anyway and its scale rests at whole.
    if (isField) return;
    let previous = 0;
    let spring: Animated.CompositeAnimation | null = null;
    const listener = progress.addListener(({ value }) => {
      const was = previous;
      previous = value;
      if (was >= HANDOFF.reform && value < HANDOFF.reform) {
        spring?.stop();
        growth.setValue(HANDOFF.reformGrowth.from);
        spring = Animated.spring(growth, {
          toValue: 1, stiffness: HANDOFF.reformGrowth.stiffness, damping: HANDOFF.reformGrowth.damping, mass: 1,
          overshootClamping: true, restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01,
          useNativeDriver: supportsNativeDriver, isInteraction: false,
        });
        spring.start();
      } else if (was < HANDOFF.reform && value >= HANDOFF.reform) {
        spring?.stop();
        spring = null;
        growth.setValue(1);
      }
    });
    return () => { progress.removeListener(listener); spring?.stop(); };
  }, [progress, growth, isField]);
  useEffect(() => {
    // The pane's travel drives the label: the frame the pane first covers the trigger
    // (the droplet over the pill) the label fades out, and the frame the pane has left
    // (snapped home; for a field, past the cover mark too) the label fades back over
    // the trigger's own material.
    let out = false;
    let fade: Animated.CompositeAnimation | null = null;
    let waiting = 0;
    const run = (toValue: number, duration: number) => {
      fade?.stop();
      fade = null;
      // A cut lands on this frame's flush; a timing of no duration would wait a frame.
      if (duration <= 0) { label.setValue(toValue); return; }
      fade = Animated.timing(label, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: supportsNativeDriver, isInteraction: false });
      fade.start();
    };
    const listener = progress.addListener(({ value }) => {
      const covered = isField ? value > 0 && value < cover.current : value > 0;
      if (covered === out) return;
      out = covered;
      cancelAnimationFrame(waiting);
      if (covered) { run(0, LABEL.hideMs); return; }
      // The return waits out the merge (see `label.returnDelayMs`), counted on frames
      // rather than a timer so the fade starts on a paint; a field's return (the pane
      // has left its box, no merge) is immediate.
      const delay = isField ? 0 : LABEL.returnDelayMs;
      if (delay <= 0) { run(1, LABEL.returnMs); return; }
      const since = Date.now();
      const wait = () => {
        if (Date.now() - since >= delay) run(1, LABEL.returnMs);
        else waiting = requestAnimationFrame(wait);
      };
      waiting = requestAnimationFrame(wait);
    });
    return () => {
      progress.removeListener(listener);
      cancelAnimationFrame(waiting);
      fade?.stop();
    };
  }, [progress, label, isField, cover]);
  const handoff = useMemo<PopupHandoff>(() => ({ progress, shape, fromTrigger: active, field: isField }), [progress, shape, active, isField]);
  return { handoff, context: active ? context : null };
}

/** What a whole-subtree fader hands the pill inside it: a way to take the fade over. */
interface PopupHandoffFader { own: () => void }
const PopupHandoffFaderContext = createContext<PopupHandoffFader | null>(null);

/**
 * The trigger's foreground under a hand-off: an animated wrapper whose opacity follows
 * the pane's travel. Without a hand-off it renders its children as they are, so a
 * solid or reduced-motion trigger keeps its tree byte for byte. A pill inside it (a
 * Button, an Avatar, the AvatarMenu capsule: `usePopupHandoffPill`) takes the fade
 * over for its own foreground and this wrapper becomes a pass-through, so its
 * material re-forms under a closing drop and the label fades back OVER it rather
 * than with it; bare custom content keeps the whole-subtree fade.
 */
export function PopupHandoffForeground({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const handoff = useContext(PopupHandoffContext);
  const [owned, setOwned] = useState(false);
  const fader = useMemo<PopupHandoffFader>(() => ({ own: () => setOwned(true) }), []);
  if (!handoff) return <>{children}</>;
  return (
    <PopupHandoffFaderContext.Provider value={fader}>
      <Animated.View style={[style, { opacity: owned ? 1 : handoff.label }]}>{children}</Animated.View>
    </PopupHandoffFaderContext.Provider>
  );
}

/**
 * The hand-off channel for a component that IS the pill (it paints its own GlassPane
 * and fades its own foreground with `handoffInk`): null without a hand-off, so the
 * plain tree stays byte for byte. Registering takes over any whole-subtree fader
 * around it (see `PopupHandoffForeground`), once, on the first layout.
 */
export function usePopupHandoffPill(): PopupHandoffValue | null {
  const handoff = useContext(PopupHandoffContext);
  const fader = useContext(PopupHandoffFaderContext);
  useIsomorphicLayoutEffect(() => {
    if (handoff && fader) fader.own();
  }, [handoff, fader]);
  return handoff;
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
