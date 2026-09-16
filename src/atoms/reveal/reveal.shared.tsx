import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing } from "react-native";
import { useReducedMotion, supportsNativeDriver, type View, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { useInView } from "../../style/in-view.js";
import { useRevealOrdinal } from "./reveal-context.js";

// Shared Reveal shell. The structure (one Animated.View wrapping the content), the
// boolean-prop axes, the ordinal-to-delay conversion, and the Reduce Motion policy all
// live here once; a platform file supplies only its skin (the travel distances,
// durations, trigger insets, and stagger step) and calls createReveal.
//
// WHAT IT IS. A content entrance triggered by scroll position: the wrapped content
// starts slightly offset on ONE axis and transparent, and when the element reaches the
// viewport it moves to its resting place and fades in, once. Only transform and
// opacity animate, never layout, so the entrance is safe under Android's New
// Architecture and cannot reflow the page it is arriving into. The content itself is
// always mounted and always present to assistive technology: Reveal animates it, it
// never withholds it, so a screen reader user is never waiting on a scroll position
// for content to exist.
//
// WHY THIS IS NOT src/style/entrance.tsx, and why merging them would be a regression.
// A future maintainer will notice that both fade something in and want one component.
// They are different animations with different dependencies:
//   - Entrance is a corner-pinned spring MORPH for overlays. It scales about a pinned
//     corner so a menu appears to grow out of the control that opened it, which
//     requires it to MEASURE ITS OWN SIZE before it can start (the pin is a function
//     of width and height), and it is spring-driven for the elastic Liquid Glass feel.
//     Its trigger is mount: an overlay that exists is an overlay that is opening.
//   - Reveal is a timed ONE-AXIS translation for page content. It needs no size at
//     all, it is timing-driven with an explicit duration and delay because a staggered
//     set must have a predictable rhythm (springs do not stagger cleanly), and its
//     trigger is a SCROLL POSITION, which means an ongoing measurement against the
//     window for as long as it stays pending.
// Merging them would force one component to carry both a measure-before-start
// dependency and a scroll dependency, and to be both spring and timing. The overlays
// (menu, popover, dialog, alert dialog) would then be paying for scroll observation to
// perform an animation that has nothing to do with scrolling, and their corner pin,
// which is exact only because the spring's overshoot stays linear in progress, would
// have to survive a refactor it cannot express. Leave them separate.
//
// RTL: the horizontal props are PHYSICAL (fromLeft / fromRight), not logical
// (fromStart / fromEnd), and they do not mirror under a right-to-left layout. This is
// a deliberate exception to how the kit treats direction, and the kit has a scar that
// makes the exception worth stating: src/style/rtl.ts exists only because
// react-native-web's I18nManager exposes no `isRTL` property, so a direct read of it
// is `undefined` on web, and the Drawer consequently slid in from the wrong side. The
// difference is what the direction MEANS. A Drawer's side is functional: it says which
// edge of the screen the panel belongs to, so in a right-to-left layout it must move
// with the layout or the panel covers the wrong content. A Reveal's direction is
// decorative: a short travel of a few dp that has already finished by the time the
// reader engages with the content, carrying no information about reading order or
// screen anatomy. Mirroring it would silently invert a designer's choice for no
// functional gain, and the physical name is then also honest about what happens. If a
// call site ever needs a travel that genuinely tracks reading direction, that is a new
// logical axis (fromStart / fromEnd) routed through isRTL(), added alongside these,
// not a change of meaning underneath them.

export interface RevealSkin {
  /** Default travel distance in dp before the content settles. */
  travel: number;
  /** Travel distance for the `pronounced` axis. */
  travelPronounced: number;
  /** Default entrance duration in ms. */
  duration: number;
  /** Duration for the `brisk` axis, in ms. */
  durationBrisk: number;
  /** How far inside the bottom of the window the top edge must come, in dp. */
  inset: number;
  /** The `deepInView` trigger inset, in dp. */
  insetDeep: number;
  /** Delay added per RevealGroup ordinal, in ms. */
  staggerStep: number;
  /** Maximum number of stagger steps, so a long group's tail stays in rhythm. */
  staggerMaxSteps: number;
}

export interface RevealProps {
  // Direction (pick one; the content travels FROM there to its resting place).
  // Precedence when more than one is passed: fromBelow, fromAbove, fromLeft,
  // fromRight. Pass none for the default, which is fromBelow.
  /** Rise into place from below. The default. */
  fromBelow?: boolean;
  /** Descend into place from above. */
  fromAbove?: boolean;
  /** Slide in from the left. Physical, and does not mirror under RTL (see above). */
  fromLeft?: boolean;
  /** Slide in from the right. Physical, and does not mirror under RTL (see above). */
  fromRight?: boolean;
  /** Travel further before settling, for a hero or a section header. Omit for the
   *  default, shorter travel. */
  pronounced?: boolean;
  /** Arrive faster, for dense sets where the eye should not wait. Omit for the
   *  default duration. */
  brisk?: boolean;
  /** Wait until the element is properly inside the viewport before starting, instead
   *  of firing as it enters. */
  deepInView?: boolean;
  /** The content to reveal. */
  children?: ReactNode;
  /**
   * Outer layout composition ONLY: how this wrapper sits in its parent (a `minWidth`
   * of 0 so a grid child may shrink below its content, a `height` of 100% so cards in
   * a row stay even, a flex share). It is NOT a restyle hook: the entrance itself is
   * chosen entirely with the boolean props above, and the revealed content styles
   * itself. Documented exactly as Entrance documents its own, and for the same reason:
   * a wrapper that cannot be told how to sit in its parent forces callers to add a
   * second wrapper around it, which is worse.
   */
  style?: LayoutStyle;
  /** E2E hook forwarded to the wrapper. */
  testID?: string;
}

// The axis a reveal travels on, and the offset it starts at (signed, in dp).
export interface RevealTravel {
  axis: "x" | "y";
  from: number;
}

/**
 * Which axis a reveal travels on and where it starts, resolved from the direction
 * booleans at the documented precedence (fromBelow, fromAbove, fromLeft, fromRight;
 * first match wins) and the resolved distance.
 *
 * The signs are "where the content comes FROM": a positive y starts below its resting
 * place and rises, a negative x starts to the left and slides right. Exactly one axis
 * moves, which is what keeps the entrance readable as a single gesture rather than a
 * diagonal drift. Exported for unit tests, following the `entranceTranslation`
 * precedent in src/style/entrance.tsx.
 */
export function revealTravel(
  p: Pick<RevealProps, "fromBelow" | "fromAbove" | "fromLeft" | "fromRight">,
  distance: number,
): RevealTravel {
  if (p.fromBelow) return { axis: "y", from: distance };
  if (p.fromAbove) return { axis: "y", from: -distance };
  if (p.fromLeft) return { axis: "x", from: -distance };
  if (p.fromRight) return { axis: "x", from: distance };
  return { axis: "y", from: distance }; // default: fromBelow
}

/**
 * The start delay in ms for a Reveal at this ordinal within its RevealGroup.
 *
 * Linear in the ordinal so a set arrives as an even cascade, capped at `maxSteps` so a
 * long group's tail reads as rhythm rather than lateness (item 40 of a list must not
 * wait two and a half seconds to appear). Ordinal 0, the lone-Reveal case, is always
 * zero delay. Non-finite or negative ordinals collapse to 0 rather than producing a
 * NaN delay that would freeze an animation. Exported for unit tests.
 */
export function revealDelay(ordinal: number, stepMs: number, maxSteps: number): number {
  if (!Number.isFinite(ordinal) || ordinal <= 0) return 0;
  if (!Number.isFinite(stepMs) || stepMs <= 0) return 0;
  const cap = Number.isFinite(maxSteps) ? Math.max(maxSteps, 0) : 0;
  return Math.min(Math.floor(ordinal), cap) * stepMs;
}

export function createReveal(skin: RevealSkin) {
  return function Reveal(props: RevealProps) {
    const { children, style, testID } = props;
    const reduced = useReducedMotion();
    // Position within an enclosing RevealGroup (0 when there is none).
    const ordinal = useRevealOrdinal();
    const wrapper = useRef<View | null>(null);
    const progress = useRef(new Animated.Value(0)).current;

    // Reduce Motion, stricter than Drawer and Sidebar (which merely zero their
    // duration) and correct for an entrance: with `enabled` false the detector
    // registers nothing, measures nothing, and starts no timer, so the whole feature
    // costs literally nothing for a user who opted out, and the effect below jumps
    // straight to the final frame. The stagger goes with it: ordinals are IGNORED
    // under Reduce Motion, because a cascade is nothing but timed motion, and delaying
    // a static frame would leave content invisible for no reason at all.
    const inset = props.deepInView ? skin.insetDeep : skin.inset;
    const inView = useInView(wrapper, inset, !reduced);

    const distance = props.pronounced ? skin.travelPronounced : skin.travel;
    const duration = props.brisk ? skin.durationBrisk : skin.duration;
    const { axis, from } = revealTravel(props, distance);
    const delay = reduced ? 0 : revealDelay(ordinal, skin.staggerStep, skin.staggerMaxSteps);

    useEffect(() => {
      if (reduced) {
        // Static final frame: fully visible, no travel.
        progress.setValue(1);
        return;
      }
      if (!inView) return;
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration,
        delay,
        // Decelerate: fast at the start, settling at the end, which is how an object
        // arriving under its own momentum reads.
        easing: Easing.out(Easing.cubic),
        // One-shot, not a loop, so the native driver is safe and correct here: it runs
        // off-thread on iOS/Android and falls back to the JS driver on web. See the
        // loop warning at the top of src/style/motion.ts.
        useNativeDriver: supportsNativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }, [reduced, inView, duration, delay, progress]);

    // Progress drives opacity directly (0 to 1) and the single travelling axis through
    // an interpolation clamped at both ends, so no overshoot can push the content past
    // its resting place.
    const translate = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0], extrapolate: "clamp" });

    return (
      <Animated.View
        ref={wrapper}
        testID={testID}
        style={[style, { opacity: progress, transform: [axis === "y" ? { translateY: translate } : { translateX: translate }] }]}
      >
        {children}
      </Animated.View>
    );
  };
}
