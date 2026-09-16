import { type ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { Animated, LayoutAnimation } from "react-native";
import {
  View,
  Text,
  Pressable,
  useTheme,
  supportsNativeDriver,
  useReducedMotion,
  enableAndroidLayoutAnimations,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  FILL,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";

// Shared Accordion shell. The structure (a vertically stacked group of disclosure
// rows: a header carrying the title and a rotating chevron over a collapsible
// content panel), the controlled-or-uncontrolled open state, the single-vs-multiple
// open axis, the accessibility, the chevron rotation animation, and the press
// handlers live here once; a platform file supplies only its skin (the container
// shape, the row divider, header insets, title type, chevron tint/size, content
// insets, and press feedback) and calls createAccordion.
//
// The accordion is a CONTENT-layer surface, so it stays SOLID on every platform
// (it is never routed through GlassSurface; per Apple, glass is the material for
// the functional layer only).
//
// Open state is controlled OR uncontrolled:
//   - Uncontrolled: omit `value`; the component tracks which panels are open in
//     internal state, seeded once from `defaultValue`.
//   - Controlled: pass `value` (a single key, or an array of keys when
//     `multiple`) plus `onValueChange`; the parent owns the open set.
//
// Open-mode axis (boolean):
//   - default (single-open): opening a panel closes the others; tapping the open
//     panel's header collapses it.
//   - `multiple`: any number of panels may be open at once; each header toggles
//     its own panel independently.
//
// The chevron glyph and its open-rotation come from the skin: iOS uses the HIG
// right caret (chevronRight, 0 -> 90deg, points down when open); web and Android
// use the ChevronDown (0 -> 180deg, points up when open, the shadcn / M3
// in-place-expansion idiom). The panel reveal uses LayoutAnimation natively (a
// smooth height ease) and a plain show/hide on web, which is robust everywhere.

// The platform-varying surface. Everything shape/color/feedback-bearing the rows
// need lives here, built from the active tokens (so each follows light/dark).
export interface AccordionSkin {
  /** iOS/web dim the header on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android header ripple; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Web-only focus-outline reset for the header Pressables, so the
   * react-native-web keyboard-focus blue ring (which a real device never shows)
   * is suppressed. No-op natively, where `outline*` are not real styles.
   */
  focusOutlineReset?: ViewStyle;

  /** Chevron glyph size, in px. The glyph paints in the `muted-foreground` token
   *  (the HIG tertiary-gray / M3 on-surface-variant disclosure tint) on every
   *  platform, via the kit Icon's `muted` color prop. */
  chevronSize: number;
  /** The disclosure chevron glyph at rest: `chevronRight` on iOS/web (the HIG/Radix
   *  tree-disclosure caret, points right and rotates to point down), or `chevronDown`
   *  on Android (the M3 in-place-expansion affordance, points down and rotates to
   *  point up). */
  chevronGlyph: "chevronRight" | "chevronDown";
  /** Degrees the chevron rotates to when OPEN: 90 for the iOS/web right->down idiom,
   *  180 for the M3 down->up (expand_more -> expand_less) idiom. */
  chevronSpinTo: number;

  /** The optional outer container shape (iOS inset-grouped card; flat on web/Android). */
  container: (t: ColorTokens) => ViewStyle;
  /** The `card` variant's surface: an outlined card container wrapping the whole
   *  group on web/Android. On iOS this ALIASES `container` (the default skin
   *  already IS the inset-grouped card), so `card` is a documented no-op there. */
  cardContainer: (t: ColorTokens) => ViewStyle;
  /** The extra header inset applied in `card` mode. Idempotent where the header
   *  already carries the same horizontal inset (iOS/Android): style-array merge
   *  overrides per key, it never sums. */
  cardHeaderInset: ViewStyle;
  /** The extra content inset applied in `card` mode (idempotent, as above). */
  cardContentInset: ViewStyle;
  /** The inter-row divider line, rendered by the shell only between rows (never after
   *  the last one): a full-bleed hairline on web/Android, inset to the text leading
   *  edge on iOS (the grouped-list separator). */
  separator: (t: ColorTokens) => ViewStyle;
  /** The header trigger row layout/insets. */
  header: (t: ColorTokens) => ViewStyle;
  /** The header title type. */
  title: (t: ColorTokens) => TextStyle;
  /** The muted secondary description line under a row's title (the skin's type
   *  ramp, one step below the title). */
  description: (t: ColorTokens) => TextStyle;
  /** The content panel insets. */
  content: (t: ColorTokens) => ViewStyle;
  /** The default content text type (when an item's content is a plain string). */
  contentText: (t: ColorTokens) => TextStyle;
}

export interface AccordionItem {
  /** Stable identity for the panel; also its controlled-value token. */
  key: string;
  /** The header label. */
  title: string;
  /** The muted secondary line under this row's title. */
  description?: string;
  /** The collapsible panel body. A string renders in the skin's content type; a
   *  ReactNode renders as-is. */
  content: ReactNode;
  /** A disabled row does not toggle and reads dimmed. */
  disabled?: boolean;
}

export interface AccordionProps {
  /** The disclosure rows, top to bottom. */
  items?: AccordionItem[];
  /**
   * Controlled open state. A single key in single-open mode, an array of keys in
   * `multiple` mode. Pair with `onValueChange`. Omit for uncontrolled.
   */
  value?: string | string[];
  /** Initial open state for the uncontrolled case (read once). */
  defaultValue?: string | string[];
  /** Called with the next open value whenever a header toggles. */
  onValueChange?: (value: string | string[]) => void;
  /** Allow more than one panel open at once (default: single-open). */
  multiple?: boolean;
  /**
   * Card surface: wraps the group in an outlined card container with inset
   * headers and content (web/Android). On iOS the default Accordion already
   * renders as the inset-grouped card, so `card` is a no-op there.
   */
  card?: boolean;
  /** Disable the whole group (every row stops toggling and dims). */
  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Enable LayoutAnimation on old-arch Android (off by default there); a no-op on iOS, web, and the
// New Architecture, where it is on by default and the setter only logs a warning. Once per bundle.
enableAndroidLayoutAnimations();

const DEFAULT_ITEMS: AccordionItem[] = [
  { key: "what", title: "What is Canvas?", content: "Canvas is a universal React Native UI kit that renders natively on iOS and Android and on the web through React Native Web." },
  { key: "platform", title: "Is it accessible?", content: "Yes. Every header is a button exposing its expanded and disabled state to assistive technology." },
  { key: "themed", title: "Is it themed?", content: "Yes. All colors come from the active theme tokens, so light, dark, and glass surfaces keep working." },
];

// Normalize the open value (controlled or the internal store) into a Set of keys,
// regardless of single (string) or multiple (string[]) shape.
function toSet(value: string | string[] | undefined): Set<string> {
  // `null`/`undefined` and the single-mode "nothing open" sentinel ("" emitted by
  // fromSet) both normalize to an empty Set, so collapsing the last open panel in
  // controlled single-open mode round-trips cleanly instead of seeding Set { "" }.
  if (value == null || value === "") return new Set();
  return new Set(Array.isArray(value) ? value : [value]);
}

// Project a Set of open keys back into the public value shape for onValueChange /
// internal state: an array in multiple mode, the first (or "") in single mode.
function fromSet(open: Set<string>, multiple: boolean): string | string[] {
  if (multiple) return [...open];
  return open.size ? [...open][0] : "";
}

/** Build an Accordion component from a platform skin. */
export function createAccordion(skin: AccordionSkin) {
  // One disclosure row: the header (title + rotating chevron) over its panel.
  function Row({
    item,
    open,
    groupDisabled,
    last,
    card,
    onToggle,
  }: {
    item: AccordionItem;
    open: boolean;
    groupDisabled?: boolean;
    last: boolean;
    card?: boolean;
    onToggle: () => void;
  }) {
    const { tokens } = useTheme();
    const reduced = useReducedMotion();
    const disabled = !!item.disabled || !!groupDisabled;

    // Chevron rotation: 0deg collapsed -> skin.chevronSpinTo open. The skin picks
    // the idiom: iOS/web rotate the right caret 0->90deg (points down when open);
    // Android rotates the M3 down chevron 0->180deg (points up when open).
    // Reduce Motion snaps it (duration 0) rather than easing.
    const spin = useRef(new Animated.Value(open ? 1 : 0)).current;
    useEffect(() => {
      Animated.timing(spin, {
        toValue: open ? 1 : 0,
        duration: reduced ? 0 : 180,
        useNativeDriver: supportsNativeDriver,
      }).start();
    }, [open, spin, reduced]);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${skin.chevronSpinTo}deg`] });

    const headerStyle: StyleProp<ViewStyle> = [
      skin.header(tokens),
      // Card mode insets the header to the card's own edge inset (a per-key
      // override on top of the base header, never a sum).
      card ? skin.cardHeaderInset : null,
      skin.focusOutlineReset,
      disabled ? DISABLED_DIM : null,
    ];

    return (
      <View>
        <Pressable
          onPress={disabled ? undefined : onToggle}
          disabled={disabled}
          android_ripple={skin.ripple && !disabled ? skin.ripple(tokens) : undefined}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityState={{ expanded: open, disabled }}
          // react-native-web drops accessibilityState.expanded, so the disclosure
          // state never reaches the DOM from accessibilityState alone. The ARIA
          // alias (RN 0.71+) is the cross-platform fix: RNW forwards aria-expanded
          // straight to the <button>, and natively it maps back to the expanded state.
          aria-expanded={open}
          style={({ pressed }) => [
            headerStyle,
            skin.pressedOpacity != null && pressed && !disabled ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {item.description ? (
            // Title over its muted secondary line. The column shrinks (not the
            // texts individually) so the chevron stays trailing and the title's
            // numberOfLines truncation keeps working inside it.
            <View style={LABEL_COLUMN}>
              <Text style={skin.title(tokens)} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={skin.description(tokens)}>{item.description}</Text>
            </View>
          ) : (
            <Text style={skin.title(tokens)} numberOfLines={2}>
              {item.title}
            </Text>
          )}
          <Animated.View style={{ transform: [{ rotate }] }}>
            {/* Skin picks the disclosure glyph: chevronRight (iOS) or chevronDown (web/M3). */}
            <Icon {...{ [skin.chevronGlyph]: true }} muted size={skin.chevronSize} />
          </Animated.View>
        </Pressable>
        {open ? (
          <View style={[skin.content(tokens), card ? skin.cardContentInset : null]}>
            {typeof item.content === "string" ? (
              <Text style={skin.contentText(tokens)}>{item.content}</Text>
            ) : (
              item.content
            )}
          </View>
        ) : null}
        {/* Inter-row divider: the skin styles it (full-bleed on web/Android, inset
            on iOS); dropped after the last row. */}
        {!last ? <View style={skin.separator(tokens)} /> : null}
      </View>
    );
  }

  return function Accordion(props: AccordionProps) {
    const { items = DEFAULT_ITEMS, value, defaultValue, onValueChange, multiple = false, disabled, card, testID, style } = props;
    const { tokens } = useTheme();
    const reduced = useReducedMotion();

    // Uncontrolled store, seeded once from defaultValue; ignored when controlled.
    const [internal, setInternal] = useState<Set<string>>(() => toSet(defaultValue));
    const controlled = value !== undefined;
    const open = controlled ? toSet(value) : internal;

    const toggle = useCallback(
      (key: string) => {
        // Animate the reveal natively (a smooth height ease); web falls back to a
        // plain show/hide. Reduce Motion skips the height ease entirely.
        if (supportsNativeDriver && !reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const next = new Set(open);
        if (next.has(key)) {
          next.delete(key);
        } else {
          if (!multiple) next.clear();
          next.add(key);
        }
        if (!controlled) setInternal(next);
        onValueChange?.(fromSet(next, multiple));
      },
      [open, multiple, controlled, onValueChange, reduced],
    );

    return (
      <View testID={testID} style={[FILL, skin.container(tokens), card ? skin.cardContainer(tokens) : null, style]}>
        {items.map((item, i) => (
          <Row
            key={item.key}
            item={item}
            open={open.has(item.key)}
            groupDisabled={disabled}
            last={i === items.length - 1}
            card={card}
            onToggle={() => toggle(item.key)}
          />
        ))}
      </View>
    );
  };
}

// opacity-50: the dimmed disabled look applied per header.
const DISABLED_DIM: ViewStyle = { opacity: 0.5 };

// The title/description stack in a row's header: a tight list-row column (the
// line heights carry the rhythm, per the iOS subtitle cell and the M3 two-line
// list item) that shrinks as one unit so the chevron never clips.
const LABEL_COLUMN: ViewStyle = { flexShrink: 1, gap: 2 };

// The accordion is a block disclosure group: it fills its parent's content box by
// default (so it spans the full width minus the parent's padding), rather than
// shrinking to the width of its widest row. Placed first so a skin's container
// shape and the consumer's `style` (the width/flex layout hook) still override it.
