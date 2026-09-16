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
  useFillStyle,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";

// Shared Collapsible shell. A Collapsible is a SINGLE disclosure: one header
// carrying a label (the `title`, or a custom `trigger` node) and a rotating
// chevron over one collapsible content panel. An Accordion is a GROUP of these;
// Collapsible is the standalone primitive (essentially one accordion Row lifted
// out, with its own single open/close state).
//
// The structure (the header trigger over a collapsible panel), the
// controlled-or-uncontrolled open state, the accessibility, the chevron rotation
// animation, and the press handlers live here once; a platform file supplies only
// its skin (the container shape, header insets, title type, chevron tint/size,
// content insets, and press feedback) and calls createCollapsible.
//
// The collapsible is a CONTENT-layer surface, so it stays SOLID on every platform
// (it is never routed through GlassSurface; per Apple, glass is the material for
// the functional layer only).
//
// Open state is controlled OR uncontrolled:
//   - Uncontrolled: omit `open`; the component tracks open/closed in internal
//     state, seeded once from `defaultOpen` (default false).
//   - Controlled: pass `open` plus `onOpenChange`; the parent owns the state.
//
// The chevron glyph and its open-rotation come from the skin: iOS/web use the
// HIG/Radix right caret (chevronRight, 0 -> 90deg, points down when open); Android
// uses the M3 in-place-expansion chevron (chevronDown, 0 -> 180deg, points up when
// open). The panel reveal uses LayoutAnimation natively (a smooth height ease) and
// a plain show/hide on web, which is robust everywhere.

// The platform-varying surface. Everything shape/color/feedback-bearing the
// disclosure needs lives here, built from the active tokens (so each follows
// light/dark).
export interface CollapsibleSkin {
  /** iOS/web dim the header on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Disabled-header dim opacity: 0.5 on web/iOS (shadcn / HIG), 0.38 on Android
   *  (M3 disabled content = 38% on-surface). */
  disabledOpacity: number;
  /** Android header ripple; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Web-only focus-outline reset for the header Pressable, so the
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

  /** The outer container shape (iOS inset-grouped card; flat on web/Android). */
  container: (t: ColorTokens) => ViewStyle;
  /** The `card` variant's surface: an outlined card container wrapping the whole
   *  disclosure on web/Android. On iOS this ALIASES `container` (the default skin
   *  already IS the inset-grouped card), so `card` is a documented no-op there. */
  cardContainer: (t: ColorTokens) => ViewStyle;
  /** The extra header inset applied in `card` mode. Idempotent where the header
   *  already carries the same horizontal inset (iOS/Android): style-array merge
   *  overrides per key, it never sums. */
  cardHeaderInset: ViewStyle;
  /** The extra content inset applied in `card` mode (idempotent, as above). */
  cardContentInset: ViewStyle;
  /** The header trigger row layout/insets. */
  header: (t: ColorTokens) => ViewStyle;
  /** The header title type (used for the default `title` text). */
  title: (t: ColorTokens) => TextStyle;
  /** The muted secondary description line under the title (the skin's type ramp,
   *  one step below the title). */
  description: (t: ColorTokens) => TextStyle;
  /** The content panel insets. */
  content: (t: ColorTokens) => ViewStyle;
  /** The default content text type (when the children is a plain string). */
  contentText: (t: ColorTokens) => TextStyle;
}

export interface CollapsibleProps {
  /** The default trigger label text. */
  title?: string;
  /**
   * The muted secondary line under the title in the default trigger anatomy
   * (ignored when a custom `trigger` is given, which owns its own anatomy).
   */
  description?: string;
  /**
   * A custom trigger node; if provided, it renders as the pressable's content
   * instead of the `title` text (the chevron still renders alongside).
   */
  trigger?: ReactNode;
  /**
   * Card surface: wraps the disclosure in an outlined card container with inset
   * header and content (web/Android). On iOS the default Collapsible already
   * renders as the inset-grouped card, so `card` is a no-op there.
   */
  card?: boolean;
  /** The collapsible content. A string renders in the skin's content type; a
   *  ReactNode renders as-is. */
  children: ReactNode;
  /** Controlled open state. Pair with `onOpenChange`. Omit for uncontrolled. */
  open?: boolean;
  /** Called with the next open state whenever the header toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Initial open state for the uncontrolled case (read once, default false). */
  defaultOpen?: boolean;
  /** A disabled header does not toggle and reads dimmed. */
  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Enable LayoutAnimation on old-arch Android (off by default there); a no-op on iOS, web, and the
// New Architecture, where it is on by default and the setter only logs a warning. Once per bundle.
enableAndroidLayoutAnimations();

/** Build a Collapsible component from a platform skin. */
export function createCollapsible(skin: CollapsibleSkin) {
  return function Collapsible(props: CollapsibleProps) {
    const { title, description, trigger, children, open: openProp, onOpenChange, defaultOpen = false, disabled, card, testID, style } = props;
    const { tokens } = useTheme();
    // FILL: the disclosure spans the parent it is given.
    const fill = useFillStyle("Collapsible");
    const reduced = useReducedMotion();

    // Uncontrolled store, seeded once from defaultOpen; ignored when controlled.
    const [internal, setInternal] = useState<boolean>(() => defaultOpen);
    const controlled = openProp !== undefined;
    const open = controlled ? !!openProp : internal;

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

    const toggle = useCallback(() => {
      // Animate the reveal natively (a smooth height ease); web falls back to a
      // plain show/hide. Reduce Motion skips the height ease entirely.
      if (supportsNativeDriver && !reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const next = !open;
      if (!controlled) setInternal(next);
      onOpenChange?.(next);
    }, [open, controlled, onOpenChange, reduced]);

    const headerStyle: StyleProp<ViewStyle> = [
      skin.header(tokens),
      // Card mode insets the header to the card's own edge inset (a per-key
      // override on top of the base header, never a sum).
      card ? skin.cardHeaderInset : null,
      skin.focusOutlineReset,
      disabled ? { opacity: skin.disabledOpacity } : null,
    ];

    // A sensible accessibility label when only a custom trigger is given.
    const a11yLabel = title ?? "Toggle section";

    return (
      <View testID={testID} style={[skin.container(tokens), card ? skin.cardContainer(tokens) : null, fill, style]}>
        <Pressable
          onPress={disabled ? undefined : toggle}
          disabled={disabled}
          android_ripple={skin.ripple && !disabled ? skin.ripple(tokens) : undefined}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
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
          {trigger !== undefined ? (
            <View style={TRIGGER_SLOT}>{trigger}</View>
          ) : description ? (
            // Title over its muted secondary line. The column shrinks (not the
            // texts individually) so the chevron stays trailing and the title's
            // numberOfLines truncation keeps working inside it.
            <View style={LABEL_COLUMN}>
              <Text style={skin.title(tokens)} numberOfLines={2}>
                {title}
              </Text>
              <Text style={skin.description(tokens)}>{description}</Text>
            </View>
          ) : (
            <Text style={skin.title(tokens)} numberOfLines={2}>
              {title}
            </Text>
          )}
          <Animated.View style={{ transform: [{ rotate }] }}>
            {/* Skin picks the disclosure glyph: chevronRight (iOS/web) or chevronDown (M3). */}
            <Icon {...{ [skin.chevronGlyph]: true }} muted size={skin.chevronSize} />
          </Animated.View>
        </Pressable>
        {open ? (
          <View style={[skin.content(tokens), card ? skin.cardContentInset : null]}>
            {typeof children === "string" ? (
              <Text style={skin.contentText(tokens)}>{children}</Text>
            ) : (
              children
            )}
          </View>
        ) : null}
      </View>
    );
  };
}

// The custom-trigger slot fills the leading space so the chevron stays trailing,
// mirroring the title's flexShrink behavior.
const TRIGGER_SLOT: ViewStyle = { flexShrink: 1, flexGrow: 1 };

// The title/description stack in the default trigger anatomy: a tight list-row
// column (the line heights carry the rhythm, per the iOS subtitle cell and the
// M3 two-line list item) that shrinks as one unit so the chevron never clips.
const LABEL_COLUMN: ViewStyle = { flexShrink: 1, gap: 2 };
