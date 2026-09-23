import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { forwardRef, type ReactNode } from "react";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { type GestureResponderEvent } from "react-native";
import { View, Pressable, Text, surfaceRipple, RippleClip, cornerRadii, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle, GlassPane, paneStyle, isGlass, alpha, withInnerFill } from "../../style/index.js";
import { useRadioGroup } from "./radio-context.js";

// Shared Radio shell. Uses React Native's primitives DIRECTLY and reads the active
// brand tokens via so colors follow light/dark and the glass surface. The
// shared structure (the mark + label row, the size precedence, accessibility, the
// controlled checked/selected alias, the onChange handler) lives here once; a
// platform file supplies only its skin (how the choice is marked, its sizing, the list
// a group forms, press feedback) and calls createRadio. Every skin is hand-drawn from
// the brand tokens, so no platform default color ever leaks in.
//
// On the web and Android a radio is a circular control that fills with a centered dot
// when it is the chosen option; selecting swaps the ring from the neutral border to
// primary and reveals the primary dot. iOS has no radio button, so its skin marks the
// choice the way an iOS picker does: the label leads and the chosen row carries a
// trailing check, and a RadioGroup's options form one inset-grouped list (the
// design language's "one job, different control"). The group (one selected option at
// a time) is RadioGroup's job; standalone, this component renders one control in the
// state it is told to (controlled).

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
   * Render the whole control as a selectable option CARD: the mark (the ring, or the
   * trailing check on iOS) plus the title and description sit inside Card chrome
   * (bordered, padded), and the ENTIRE card is the tap target. When this radio is the
   * chosen option, the card takes Card's own `selected` treatment (a primary border and
   * a soft primary tint), so the whole tile reads as chosen, not just the mark. Pairs
   * with `description` for a plan/tier picker, and is still group-wired through `value`
   * inside a `<RadioGroup>`.
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

/** A radio button: a circular control that fills with a centered dot when chosen. */
export interface RingMark {
  kind: "ring";
  /** The circular control. `checked` swaps the neutral border for primary. `nudge` aligns the ring to a label's first line. */
  ring: (tokens: ColorTokens, size: Size, checked: boolean, nudge: boolean) => ViewStyle;
  /** The centered fill dot, rendered only when checked. */
  dot: (tokens: ColorTokens, size: Size) => ViewStyle;
}

/** A checkmark row (iOS, which has no radio button): the label leads and the chosen option carries a trailing check. */
export interface CheckMark {
  kind: "check";
  /** The trailing check glyph shown on the chosen option. */
  glyph: (tokens: ColorTokens, size: Size) => TextStyle;
}

/** The inset-grouped list a RadioGroup's options form on a platform whose single choice is a checkmark list. */
export interface RadioListSkin {
  /** The section around the options (the list's fill, corner and clip). */
  section: (tokens: ColorTokens) => ViewStyle;
  /** The hairline drawn between two rows. */
  separator: (tokens: ColorTokens) => ViewStyle;
  /** A row's insets inside the section. */
  cell: ViewStyle;
  /** The row highlight while pressed. */
  cellPressed: (tokens: ColorTokens) => ViewStyle;
}

// The only thing a platform skin owns: how the chosen option is marked, the label
// styles for a given state and size, the list a group forms (if any), plus the
// press/disabled feedback. Everything else is the shell.
export interface RadioSkin {
  /** How the control marks the chosen option: a ring and dot, or a trailing check. */
  mark: RingMark | CheckMark;
  /** The label text beside the mark. */
  label: (tokens: ColorTokens, size: Size, disabled: boolean) => TextStyle;
  /** The muted secondary description line, rendered under the label when present. */
  description: (tokens: ColorTokens, size: Size, disabled: boolean) => TextStyle;
  /**
   * The `card` mode chrome: the whole control wrapped as a selectable Card surface
   * (bordered + padded, per-OS radius/curve), derived from the kit Card skin. When
   * `checked`, it applies Card's own `selected` treatment (primary border + soft tint).
   */
  card: (tokens: ColorTokens, checked: boolean) => ViewStyle;
  /**
   * The inset-grouped list a RadioGroup's plain options form (iOS's inline picker), or
   * null where a group stays a stack of controls (the web and Android).
   */
  list: RadioListSkin | null;
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

// A checkmark row: the text takes the row and the check trails at its end, centered on
// the row the way iOS centers a cell's accessory beside a two-line title.
const CHECK_ROW: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 };
const CHECK_TEXT: ViewStyle & TextStyle = { flexGrow: 1 };
// The check keeps its width on an unchosen row, so choosing an option never reflows its label.
const CHECK_HIDDEN: TextStyle = { opacity: 0 };

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
    // A plain option inside a group that forms a list (iOS) is one of the section's rows:
    // it takes the cell insets and the row highlight. A card stays its own tile.
    const cell = group?.list && !card ? skin.list : null;
    const { mark } = skin;

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
          mark.kind === "check" ? CHECK_ROW : ROW,
          cell ? cell.cell : null,
          // Card mode: the pressable IS the card surface (border, radius, fill, padding).
          cardChrome ? paneStyle(theme, cardChrome) : null,
          disabled ? { opacity: skin.disabledOpacity } : null,
          // A list row highlights while pressed (the iOS cell highlight, an ink tint over
          // glass); anywhere else the skin's own dim.
          cell && pressed ? withInnerFill(theme, cell.cellPressed(tokens), "firm") : null,
          !cell && skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          // In card mode the outer layout `style` rides the RippleClip wrapper (the
          // outermost node), so the clip and the caller's layout stay in lockstep.
          card ? null : style,
        ]}
      >
        {cardChrome ? <GlassPane layer="content" shape={cardChrome} tint={isChecked ? alpha(tokens.primary, 0.22) : undefined} /> : null}
        {mark.kind === "ring" ? (
          <View style={paneStyle(theme, mark.ring(tokens, size, isChecked, hasText))}>
            <GlassPane static layer="control" shape={mark.ring(tokens, size, isChecked, hasText)} brand={isChecked ? tokens.primary : undefined} />
            {isChecked ? <View style={[mark.dot(tokens, size), glass ? { backgroundColor: tokens["primary-foreground"] } : null]} /> : null}
          </View>
        ) : null}
        {hasText ? (
          description != null ? (
            <View style={[TEXT_COLUMN, mark.kind === "check" ? CHECK_TEXT : null]}>
              {children != null ? <Text style={skin.label(tokens, size, !!disabled)}>{children}</Text> : null}
              <Text style={skin.description(tokens, size, !!disabled)}>{description}</Text>
            </View>
          ) : (
            <Text style={[skin.label(tokens, size, !!disabled), mark.kind === "check" ? CHECK_TEXT : null]}>{children}</Text>
          )
        ) : null}
        {mark.kind === "check" ? (
          // The row's checked state already names the choice, so the glyph is hidden
          // from assistive technology (it would otherwise join the row's name).
          <Text aria-hidden style={[mark.glyph(tokens, size), isChecked ? null : CHECK_HIDDEN]}>✓</Text>
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
