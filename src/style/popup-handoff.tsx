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
// A FIELD (Autocomplete, Select, PhoneInput) hands off the same way (`field`): the
// pane rests OVER the field's box (`handoff.cover`), so the field's material and text
// are hidden from the frame the drop forms until the close snaps home, exactly as a
// pill's are, with the one difference on the way home that a field never re-forms
// under the drop: the pane deflates onto the box and the field returns whole at the
// snap (`handoff.field`). A field the user types into (the Autocomplete) echoes its
// query at the top of the pane meanwhile.
//
// Two invariants keep every material honest:
// - The trigger's material is never at a partial opacity. On a close it is 1 from
//   the re-form mark down (`handoff.reform`: the pill is a body of its own under the
//   last of the drop, the way the reference's pill re-forms before its blob has
//   merged) and 0 above it; on an opening it is 0 the moment the pane exists and 1
//   only at the snap (the pane's motion steps a `closing` flag on the channel, so the
//   mark can sit above the seed the opening starts from); a field's is 1 only at the
//   snap, both ways. A native glass ancestor at a fractional alpha
//   may not paint, and a web backdrop under one loses its sampling root (see
//   entrance.tsx). The label is a separate value on its own short fades, never an
//   ancestor of the material, so its partial frames touch no glass: it cuts OUT the
//   frame the pane exists (the droplet covers it) and fades IN over the re-formed
//   material from the return mark down, while the last of the drop is still settling
//   onto the pill (`handoff.label.returnFrom`). A component that paints a pill of its own
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
import { HANDOFF_RETURN, POPUP_PRESENTATION } from "./popup-motion.js";
import { Text } from "./text.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

const HANDOFF = POPUP_PRESENTATION.handoff;
const { label: LABEL } = HANDOFF;

/** The material shape a trigger reports: its uniform corner, the box it covers, its layer, and whether it is CLEAR (the web's text-entry material: a lens with no under-fill). */
export interface HandoffShape { radius: number; width: number; height: number; layer: GlassLayer; clear?: boolean }

/**
 * The channel an owner shares with its popup: the travel value the pane's motion
 * drives (0 at the trigger, 1 at rest), the largest material shape the trigger has
 * reported (the pill's corner becomes the pane's progress-0 corner), and whether the
 * pane takes the trigger's frame as its origin at all (glass, motion allowed, hosted).
 */
export interface PopupHandoff {
  progress: Animated.Value;
  /**
   * Whether the pane is CLOSING (1) or opening or at rest (0), set by the pane's motion
   * as each travel starts: the trigger's material re-forms at a mark above the seed
   * on a close (`handoff.reform`), which an opening, seated at the seed, must never
   * read. Only ever stepped, never animated, so the material stays whole or absent.
   */
  closing: Animated.Value;
  /** The pill: its corner, its area (the largest reporter wins), its layer (none for a bare trigger, which keeps the pane's own fill) and whether its material is clear. */
  shape: { current: { radius: number; area: number; layer?: GlassLayer; clear?: boolean } | null };
  fromTrigger: boolean;
  /** Whether the owner is a field (its pane rests flush on its box and deflates onto it; a whole trigger's pane is nothing at the snap and re-forms the pill). */
  field: boolean;
}

/** What the trigger's subtree reads: the opacity its material and label follow, and where to report a shape. */
export interface PopupHandoffValue {
  /** 1 while the trigger paints its own material, 0 while the pane stands in for it. */
  material: Animated.AnimatedInterpolation<number>;
  /** The material's width scale about its centre: whole at rest, a short fat oval growing back under a closing drop on the travel (`reformGrowth.width`). */
  growth: Animated.AnimatedInterpolation<number>;
  /** The material's height scale, on the travel too (`reformGrowth.height`): most of the way back before the width has started. */
  growthTall: Animated.AnimatedInterpolation<number>;
  /** The trigger's foreground opacity: out as the pane covers it, back once the pane has left. */
  label: Animated.Value;
  /** A GlassPane in the trigger reports its shape here (the largest one is the pill). */
  report: (shape: HandoffShape) => void;
}

export interface PopupHandoffOptions {
  /**
   * The owner is a FIELD (Autocomplete, Select, PhoneInput): its pane rests flush on
   * the field's box and deflates onto it on a close, and the field's material and
   * text are back only at the snap, never re-formed under the drop (see
   * `handoff.field` in popup-motion.tsx).
   */
  field?: boolean;
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
  closing: Animated.Value;
  label: Animated.Value;
  /** Whether the owner is a field (its material returns only at the snap, both ways). */
  field: boolean;
  shape: PopupHandoff["shape"];
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
  const channel = useRef<Channel | null>(null);
  if (!channel.current) {
    // Every value is native from birth where the platform has the driver, the
    // contract `usePopupMotion` sets for a shared travel value: the pane's whole
    // presentation, its seed frame included, then runs in the native animated module.
    const driver = { useNativeDriver: supportsNativeDriver };
    const progress = new Animated.Value(0, driver);
    const closing = new Animated.Value(0, driver);
    // The label's opacity, on its own short fades (native-driven where the platform
    // has the driver, so the JS thread's work at the pane's mount and unmount cannot
    // stutter them): out as the pane covers it, back once it has left.
    const label = new Animated.Value(1, driver);
    const bare = options?.bare;
    // A bare trigger's shape is declared, not reported: the trigger's own corner, no
    // layer to blend from, and an area no pane inside it can beat.
    const shape: PopupHandoff["shape"] = { current: bare ? { radius: bare.radius, area: Infinity } : null };
    channel.current = {
      progress,
      closing,
      label,
      field: !!options?.field,
      shape,
      report: ({ radius, width, height, layer, clear }) => {
        if (bare) return;
        const area = width * height;
        if (!shape.current || area >= shape.current.area) shape.current = { radius, area, layer, clear };
      },
    };
  }
  const { progress, closing, label, field: isField, shape, report } = channel.current;
  const material = useMemo(() => {
    // 0 the moment the pane exists (any travel above the snap) and 1 only at exactly
    // 0, as sharp a step as the interpolation allows. A whole trigger is also back
    // on a CLOSE from the re-form mark down (the pill is a body of its own under the
    // last of the drop, see `handoff.reform`, a mark above the seed); the two steps
    // are blended by the closing flag, itself 0 or 1, so the product is never a
    // partial opacity. A field's pane deflates onto its box instead, so the field
    // reads the snap step both ways.
    const returned = progress.interpolate({ inputRange: [0, HANDOFF_RETURN], outputRange: [1, 0], extrapolate: "clamp" });
    if (isField) return returned;
    const reformed = progress.interpolate({ inputRange: [HANDOFF.reform - HANDOFF_RETURN, HANDOFF.reform], outputRange: [1, 0], extrapolate: "clamp" });
    return Animated.add(Animated.multiply(Animated.subtract(1, closing), returned), Animated.multiply(closing, reformed)) as unknown as Animated.AnimatedInterpolation<number>;
  }, [progress, closing, isField]);
  // A whole trigger's material RE-FORMS as it comes back under a closing drop: from
  // the re-form mark down it is a short fat oval growing to whole on the travel
  // (`reformGrowth`, the reference's pill per frame), so its step and its scales flip
  // on the same native frame. A field's material never scales (its curves are the
  // identity), and above the mark the scale is moot: the material is hidden there.
  const { growth, growthTall } = useMemo(() => {
    const curve = (points: readonly (readonly [number, number])[]) => progress.interpolate({
      inputRange: isField ? [0, 1] : points.map(([at]) => at),
      outputRange: isField ? [1, 1] : points.map(([, scale]) => scale),
      extrapolate: "clamp",
    });
    return { growth: curve(HANDOFF.reformGrowth.width), growthTall: curve(HANDOFF.reformGrowth.height) };
  }, [progress, isField]);
  const context = useMemo<PopupHandoffValue>(() => ({ material, growth, growthTall, label, report }), [material, growth, growthTall, label, report]);
  useEffect(() => {
    // The pane's travel drives the label: the frame the pane first covers the trigger
    // (the droplet over the pill) the label fades out, and it fades back the frame a
    // closing travel crosses the return mark downward (`label.returnFrom`, a mark
    // above the seed that only a close reads: the pill's own material is back under
    // the last of the drop, and the label rises through that glass, the way the
    // reference's icons come up over its merged glass while its bump is still
    // absorbed); for a field, at the snap, over its re-formed box. A reopen cuts it
    // out again on its first frame of travel.
    let out = false;
    let fade: Animated.CompositeAnimation | null = null;
    // The direction, mirrored from the flag the pane's motion steps (a setValue calls
    // its listeners synchronously, on every driver).
    let closingNow = 0;
    const direction = closing.addListener(({ value }) => { closingNow = value; });
    const run = (toValue: number, duration: number) => {
      fade?.stop();
      fade = null;
      // A cut lands on this frame's flush; a timing of no duration would wait a frame.
      if (duration <= 0) { label.setValue(toValue); return; }
      fade = Animated.timing(label, { toValue, duration, easing: Easing.out(Easing.quad), useNativeDriver: supportsNativeDriver, isInteraction: false });
      fade.start();
    };
    const listener = progress.addListener(({ value }) => {
      const covered = isField || !closingNow ? value > 0 : value >= LABEL.returnFrom;
      if (covered === out) return;
      out = covered;
      run(covered ? 0 : 1, covered ? LABEL.hideMs : LABEL.returnMs);
    });
    return () => {
      progress.removeListener(listener);
      closing.removeListener(direction);
      fade?.stop();
    };
  }, [progress, closing, label, isField]);
  const handoff = useMemo<PopupHandoff>(() => ({ progress, closing, shape, fromTrigger: active, field: isField }), [progress, closing, shape, active, isField]);
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
