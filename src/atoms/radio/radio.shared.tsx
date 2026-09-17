import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { forwardRef, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { type GestureResponderEvent } from "react-native";
import { View, Pressable, Text, surfaceRipple, RippleClip, cornerRadii, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle, GlassPane, paneStyle, isGlass, alpha } from "../../style/index.js";
import { useRadioGroup } from "./radio-context.js";

// Shared Radio shell. Uses React Native's primitives DIRECTLY and reads the active
// brand tokens via so colors follow light/dark and the glass surface. The
// shared structure (the ring + dot + label row, the size precedence, accessibility,
// the controlled checked/selected alias, the onChange handler) lives here once; a
// platform file supplies only its skin (ring shape/sizing/border, dot fill, press
// feedback) and calls createRadio. iOS has no native radio, so every skin is
// hand-drawn from the brand tokens — no platform default color ever leaks in.
//
// A radio is a single circular control that fills with a centered dot when it is the
// chosen option in its group. The group (one selected option at a time) is the
// caller's job; this component renders one control in the state it is told to
// (controlled). Selecting swaps the ring from the neutral input border to primary
// and reveals the primary dot.

export interface RadioProps {
  /**
   * This option's value within a RadioGroup. When the radio sits inside a
   * `<RadioGroup>`, its checked state and selection are driven by the group
   * matching this value; ignored for a standalone radio.
   */
  value?: string | number;
  /** Whether this control is the selected option (controlled; standalone use). */
  checked?: boolean;
  /** Alias for `checked`, for callers that think in terms of "selected". */
  selected?: boolean;
  /** Fired on press with the next checked value (always true for a radio). Web keyboard activation supports Space on release and Enter; RadioGroup also handles arrows. */
  onChange?: (checked: boolean, event: GestureResponderEvent) => void;
  /** E2E hook forwarded to the pressable row. */
  testID?: string;
  /** Label text (the option's title) shown beside the control. */
  children?: ReactNode;
  /**
   * Optional muted secondary line rendered under the label, for the common
   * title-plus-description option (a plan picker, a settings choice). Supplying it
   * builds the stacked title/description layout inside the control, so the caller
   * never hand-composes a Row + Column + two Typography nodes per option.
   */
  description?: ReactNode;
  /**
   * Render the whole control as a selectable option CARD: the ring plus the title and
   * description sit inside Card chrome (bordered, padded), and the ENTIRE card is the
   * tap target. When this radio is the chosen option, the card takes Card's own
   * `selected` treatment (a primary border and a soft primary tint), so the whole tile
   * reads as chosen, not just the dot. Pairs with `description` for a plan/tier picker,
   * and is still group-wired through `value` inside a `<RadioGroup>`.
   */
  card?: boolean;
  // Size (pick one; default is the 16px control).
  small?: boolean;
  large?: boolean;
  /** Dim the control and block presses. */
  disabled?: boolean;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export type Size = "small" | "default" | "large";

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: RadioProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// The only thing a platform skin owns: the ring, dot, and label styles for a given
// state and size, plus the press/disabled feedback. Everything else is the shell.
export interface RadioSkin {
  /** The circular control. `checked` swaps the neutral border for primary. `nudge` aligns the ring to a label's first line. */
  ring: (tokens: ColorTokens, size: Size, checked: boolean, nudge: boolean) => ViewStyle;
  /** The centered fill dot, rendered only when checked. */
  dot: (tokens: ColorTokens, size: Size) => ViewStyle;
  /** The label text to the right of the ring. */
  label: (tokens: ColorTokens, size: Size, disabled: boolean) => TextStyle;
  /** The muted secondary description line, rendered under the label when present. */
  description: (tokens: ColorTokens, size: Size, disabled: boolean) => TextStyle;
  /**
   * The `card` mode chrome: the whole control wrapped as a selectable Card surface
   * (bordered + padded, per-OS radius/curve), derived from the kit Card skin. When
   * `checked`, it applies Card's own `selected` treatment (primary border + soft tint).
   */
  card: (tokens: ColorTokens, checked: boolean) => ViewStyle;
  /** Opacity applied to the row when disabled. */
  disabledOpacity: number;
  /** iOS/web dim the row on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over the ring; null on iOS/web. */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean; radius?: number }) | null;
}

// The pressable row: control beside an optional label, control top-aligned so a
// multi-line label hangs from the ring's first line.
const ROW: ViewStyle = { flexDirection: "row", alignItems: "flex-start", gap: 8 };

// Stacks the title over its description beside the ring. The 8px gap matches the
// kit's default column spacing (the arrangement callers used to hand-compose), so
// the built-in layout reproduces the established look. `flexShrink` lets a long
// description wrap within the row instead of forcing the row wider.
const TEXT_COLUMN: ViewStyle = { flexShrink: 1, gap: 8 };

/** Build a Radio component from a platform skin.
 * @ref Ref to the interactive radio row, preserving group navigation. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createRadio(skin: RadioSkin) {
  const Radio = forwardRef<View, RadioProps>(function Radio(props, ref) {
    const { checked, selected, onChange, children, description, card, style } = props;
    const size = sizeOf(props);
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    // Under glass the ring is a static pane at control density: a GlassPane paints the material
    // behind the dot (BRAND-tinted while checked, with the dot in `primary-foreground`
    // over it) and the ring drops its outline (the pane's rim carries it). A card-mode
    // radio is a CONTENT-layer pane like a selectable Card, tinted while checked.
    const glass = isGlass(theme);
    // Whether the control carries any text at all (title and/or description).
    const hasText = children != null || description != null;

    // Inside a RadioGroup the group owns selection: this radio reads checked from
    // the group matching its `value`, and pressing it tells the group to select
    // that value. Standalone, it stays a controlled radio driven by checked/
    // selected. The group can also disable the whole set.
    const group = useRadioGroup();
    const inGroup = group != null && props.value !== undefined;
    const isChecked = inGroup ? group.value === props.value : !!(checked ?? selected);
    const disabled = !!props.disabled || !!group?.disabled;

    const handlePress = (event: GestureResponderEvent) => {
      if (inGroup) group.select(props.value as string | number, event);
      onChange?.(true, event);
    };
    const keyboard = useSpaceActivation(disabled, handlePress);

    // Card mode: the whole control renders inside selectable Card chrome and the entire
    // card is the tap target. The chrome (border + tint) tracks isChecked, so choosing
    // an option lights its whole tile the way `<Card selected>` does. The chrome rides
    // the Pressable itself; only the outer layout `style` moves to the RippleClip wrapper.
    const cardChrome = card ? skin.card(tokens, isChecked) : null;

    // Ripple (Android): a card uses a bounded surface ripple over the whole tile (clipped
    // to the rounded corners by the RippleClip parent); a plain radio uses the skin's
    // borderless ring ripple. iOS/web ignore android_ripple and keep the pressedOpacity dim.
    const ripple = card ? surfaceRipple(tokens) : skin.ripple ? skin.ripple(tokens) : undefined;

    // Roving-focus wiring from the group (web arrow-key nav): the group makes only
    // the selected radio a tab stop and the arrows move + select. `ref` passes
    // explicitly; `focusable`/`tabIndex`/`onKeyDown` ride through a cast (RN's
    // Pressable types omit onKeyDown). Undefined for a standalone radio.
    const roving = inGroup ? group.itemProps?.(props.value as string | number) : undefined;
    const hostRef = useComposedRefs<View>(roving?.ref, ref);
    const rovingProps = roving
      ? { focusable: roving.focusable, tabIndex: roving.tabIndex }
      : {};

    const control = (
      <Pressable
        ref={hostRef}
        {...(rovingProps as object)}
        {...({ ...keyboard, onKeyDown: (event: Parameters<typeof keyboard.onKeyDown>[0]) => {
          keyboard.onKeyDown(event);
          if (!event.defaultPrevented) roving?.onKeyDown(event);
        } } as object)}
        onPress={handlePress}
        disabled={disabled}
        testID={props.testID}
        // Icon-only (no text): grow the small ring's tap target toward ~44pt. With a
        // label — or a card, whose whole padded tile is the target — the row is already
        // a generous target, so leave it.
        hitSlop={!hasText && !card ? 8 : undefined}
        accessibilityRole="radio"
        accessibilityState={{ checked: isChecked, disabled: !!disabled }}
        aria-checked={isChecked}
        android_ripple={ripple}
        style={({ pressed }) => [
          ROW,
          // Card mode: the pressable IS the card surface (border, radius, fill, padding).
          cardChrome ? paneStyle(theme, cardChrome) : null,
          disabled ? { opacity: skin.disabledOpacity } : null,
          skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          // In card mode the outer layout `style` rides the RippleClip wrapper (the
          // outermost node), so the clip and the caller's layout stay in lockstep.
          card ? null : style,
        ]}
      >
        {cardChrome ? <GlassPane layer="content" shape={cardChrome} tint={isChecked ? alpha(tokens.primary, 0.22) : undefined} /> : null}
        <View style={paneStyle(theme, skin.ring(tokens, size, isChecked, hasText))}>
          <GlassPane static layer="control" shape={skin.ring(tokens, size, isChecked, hasText)} brand={isChecked ? tokens.primary : undefined} />
          {isChecked ? <View style={[skin.dot(tokens, size), glass ? { backgroundColor: tokens["primary-foreground"] } : null]} /> : null}
        </View>
        {hasText ? (
          description != null ? (
            <View style={TEXT_COLUMN}>
              {children != null ? <Text style={skin.label(tokens, size, !!disabled)}>{children}</Text> : null}
              <Text style={skin.description(tokens, size, !!disabled)}>{description}</Text>
            </View>
          ) : (
            <Text style={skin.label(tokens, size, !!disabled)}>{children}</Text>
          )
        ) : null}
      </Pressable>
    );

    // A card wraps the pressable in RippleClip so its bounded Android ripple is clipped to
    // the card's rounded corners (on iOS/web RippleClip is a transparent layout passthrough
    // that still owns the outer `style`). A plain radio returns the pressable unchanged.
    return card ? (
      <RippleClip shape={cornerRadii(cardChrome)} style={style}>
        {control}
      </RippleClip>
    ) : (
      control
    );
  });
  Radio.displayName = "Radio";
  return Radio;
}
