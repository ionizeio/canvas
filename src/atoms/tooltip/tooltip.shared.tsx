import { useState, type ReactNode } from "react";
import { View, Pressable, Text, useHugStyle, useTheme, controlRipple, pressDim, type StyleProp, type ViewProps, type ViewStyle } from "../../style/index.js";
import { Button } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import {
  wrapper,
  bubbleGap,
  iconTrigger,
  textTrigger,
  textTriggerLabel,
  type Placement,
  type TooltipSkin,
} from "./tooltip.styles.js";

// Shared Tooltip shell. The structure (the trigger plus the open bubble placed
// next to it via flex order), the public boolean-prop API, the placement
// precedence, the controlled/uncontrolled open state, the hover/focus/tap
// disclosure handlers, and accessibility all live here once. A platform file supplies only its skin (the
// bubble surface shape/fill and the label type) and calls createTooltip.
//
// Tooltip: a small dark bubble of helper text shown beside a trigger on hover
// or focus. This RN port renders the open state inline (no portal/Modal): a
// trigger button with the bubble positioned next to it via flex order, so the
// docs playground can show it without an overlay layer.
//
// Placement is a boolean axis (top default, bottom, left, right); first match
// wins. top/bottom stack the bubble above/below the trigger in a column;
// left/right place it beside the trigger in a row.
//
// Trigger precedence, first match wins: `children` (an arbitrary element the tip
// hangs off), then `iconTrigger`, then `textTrigger`, then the default text Button.
export interface TooltipProps {
  /**
   * An arbitrary element for the tip to hang off: an existing Button, Chip, or
   * any other control that already owns its own press and accessible name. The
   * highest-precedence trigger: children win over `iconTrigger`, `textTrigger`,
   * and the default Button. The child renders as-is and stays the single
   * interactive, labelled element; the root view Tooltip wraps it in takes no
   * accessibility role and no tab stop, listens only for hover and focus, and
   * never claims the press, so a Button child keeps its `onPress` and the tip
   * does not toggle on tap.
   */
  children?: ReactNode;
  // The tip text shown in the bubble.
  label?: string;
  /**
   * The element the tip describes. By default rendered as a text
   * `<Button outline small>`; set `iconTrigger` for a ghost icon button,
   * `textTrigger` to hang the tip off an inline pressable word, or pass
   * `children` to wrap an element you already have. Ignored when `children` is
   * passed.
   */
  trigger?: string;
  /**
   * Render the trigger as a ghost icon button (a settings glyph) instead of the
   * text Button. When set, `trigger` (the label string) is ignored. Ignored
   * when `children` is passed, which takes precedence.
   */
  iconTrigger?: boolean;
  /**
   * Render the `trigger` string as a pressable inline word (an underlined
   * hover-text affordance) rather than the default text Button, so the tip can
   * hang off a run of body copy. Orthogonal to placement (top/left/right/bottom).
   * Ignored when `children` or `iconTrigger` is set, both of which take
   * precedence.
   */
  textTrigger?: boolean;
  /**
   * Controlled visibility. Omit for uncontrolled: the tip shows while the
   * trigger is hovered or focused, and a tap toggles it (the touch analogue
   * of hover) on the built-in triggers. An element trigger (`children`) has no
   * tap toggle (the child keeps its own press), and native platforms never fire
   * hover, so `open` is the native and touch path for that trigger.
   */
  open?: boolean;
  // Fired when the bubble is shown/hidden.
  onOpenChange?: (open: boolean) => void;
  // Placement (pick one; default is top).
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Placement precedence when more than one is passed: first match wins.
function placementOf(p: TooltipProps): Placement {
  if (p.top) return "top";
  if (p.bottom) return "bottom";
  if (p.left) return "left";
  if (p.right) return "right";
  return "top";
}

// Whether the bubble renders before the trigger in source order. top and left
// place the bubble first; bottom and right place it after.
const BUBBLE_FIRST: Record<Placement, boolean> = {
  top: true,
  bottom: false,
  left: true,
  right: false,
};

/** Build a Tooltip component from a platform skin. */
export function createTooltip(skin: TooltipSkin) {
  return function Tooltip(props: TooltipProps) {
    const { children, label, trigger, iconTrigger: isIconTrigger, textTrigger: isTextTrigger, onOpenChange, testID, style } = props;
    const placement = placementOf(props);
    const { tokens } = useTheme();
    // HUG: the trigger + bubble wrapper shrinks to its content inside a stretching Column.
    const hug = useHugStyle();
    // Uncontrolled by default: hovering or focusing the trigger shows the
    // bubble, leaving/blurring hides it, and tapping toggles it (the touch
    // analogue of hover); a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const open = props.open ?? internalOpen;
    const setOpen = (next: boolean) => {
      if (props.open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };
    // Hover/focus disclosure shared by every trigger flavor. react-native-web
    // (and RN's pointer events natively) never fire hover for touch pointers,
    // so on touch devices only the press toggle runs and these are inert.
    const disclosure = {
      onHoverIn: () => setOpen(true),
      onHoverOut: () => setOpen(false),
      onFocus: () => setOpen(true),
      onBlur: () => setOpen(false),
    };

    // The same disclosure for an element trigger, wired to RN's own pointer
    // events instead of Pressable's onHoverIn/onHoverOut. Pressable CONTAINS
    // hover (entering a nested pressable dispatches a lock that ends the outer
    // one's hover), so a Pressable wrapper would close the tip the instant the
    // pointer reached the child control; a plain View reads the enter/leave pair
    // over its whole subtree instead. Touch pointers are skipped so tapping the
    // child never flashes the bubble, and native fires no hover at all, so the
    // controlled `open` prop is the native and touch path here.
    const elementHover =
      (next: boolean): NonNullable<ViewProps["onPointerEnter"]> =>
      (e) => {
        if (e.nativeEvent.pointerType !== "touch") setOpen(next);
      };
    const elementDisclosure = {
      onPointerEnter: elementHover(true),
      onPointerLeave: elementHover(false),
      // Focus/blur bubble out of the child on the web (React routes them through
      // focusin/focusout), so the tip follows a keyboard tab onto the child
      // without the wrapper itself being a tab stop.
      onFocus: disclosure.onFocus,
      onBlur: disclosure.onBlur,
    };
    // The element trigger keeps `children` intact and hangs the disclosure off
    // the ROOT view (which spans the bubble AND the trigger) rather than a
    // wrapper hugging the child. The bubble renders in flow, so opening it
    // pushes the trigger over by the bubble's height (measured: 30px for a
    // one-line tip): a child-hugging wrapper would be shoved out from under a
    // stationary pointer, the browser's post-layout hover recompute would fire
    // pointerleave, and the tip would close again the moment it appeared. The
    // root grows to cover the bubble instead, so the pointer stays inside it and
    // hovering the bubble itself keeps the tip up, as a tooltip should.
    const isElementTrigger = children != null;

    // The open bubble is a polite live region so the tip text is announced when
    // it appears (rather than appearing silently beside the trigger). Mirrors the
    // toast pattern: accessibilityRole/LiveRegion for native plus the aria-live
    // alias, since react-native-web does not forward accessibilityLiveRegion's
    // role on its own.
    const tip = open ? (
      <View
        style={[skin.bubble(tokens), bubbleGap[placement]]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        aria-live="polite"
      >
        <Text style={skin.label(tokens)}>{label}</Text>
      </View>
    ) : null;

    // Trigger precedence, first match wins: children, iconTrigger, textTrigger,
    // then the default text Button.
    //
    // Element trigger: whatever the caller passed, rendered as-is. The only node
    // Tooltip adds around it is the root View below, which takes NO accessibility
    // role and no `focusable` (so it is neither announced nor a tab stop) and
    // installs no press responder, leaving the child as the single interactive,
    // labelled element with its own onPress. A Button child therefore never ends
    // up nested inside a second button, which would be both invalid markup and an
    // ambiguous control (test/no-console-violations.test.tsx locks that).
    //
    // Icon trigger: a ghost icon button (40px square) holding the settings glyph,
    // matching a ghost icon Button. The glyph renders directly inside the
    // Pressable (not via Button's <Text> children, which can't host an SVG).
    const triggerEl = isElementTrigger ? (
      children
    ) : isIconTrigger ? (
      <Pressable
        android_ripple={controlRipple(tokens)}
        style={({ pressed }) => [iconTrigger, pressDim(pressed)]}
        onPress={() => setOpen(!open)}
        {...disclosure}
        hitSlop={8}
        accessibilityRole="button"
        // Fall back to a sensible name so the icon button is never announced as a
        // bare "button" when used without a label (e.g. `<Tooltip iconTrigger />`).
        accessibilityLabel={label ?? "More info"}
        // Announce the disclosure state. accessibilityState covers native; the
        // aria-expanded alias is required because react-native-web does not
        // forward accessibilityState to the DOM.
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
      >
        <Icon settings size={16} />
      </Pressable>
    ) : isTextTrigger ? (
      // Text trigger: the `trigger` string as a pressable inline word (a
      // hover-text affordance) rather than a Button. Mirrors the icon trigger's
      // wiring: a Pressable toggles the bubble, dims on press (iOS/web) or
      // ripples (Android), carries the same hitSlop, and exposes its disclosure
      // state (accessibilityState covers native; the aria-expanded alias is
      // required because react-native-web does not forward accessibilityState).
      // The word itself is the accessible name, so no explicit accessibilityLabel.
      <Pressable
        android_ripple={controlRipple(tokens)}
        style={({ pressed }) => [textTrigger, pressDim(pressed)]}
        onPress={() => setOpen(!open)}
        {...disclosure}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
      >
        <Text style={textTriggerLabel(tokens)}>{trigger}</Text>
      </Pressable>
    ) : (
      // `expanded` maps to aria-expanded inside Button so the text trigger also
      // exposes its open/closed disclosure state.
      <Button outline small expanded={open} onPress={() => setOpen(!open)} {...disclosure}>
        {trigger}
      </Button>
    );

    return (
      <View style={[wrapper[placement], hug, style]} testID={testID} {...(isElementTrigger ? elementDisclosure : undefined)}>
        {BUBBLE_FIRST[placement] ? tip : null}
        {triggerEl}
        {BUBBLE_FIRST[placement] ? null : tip}
      </View>
    );
  };
}
