import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  type MouseEvent,
  type NativeSyntheticEvent,
  type TargetedEvent,
  type View,
} from "react-native";
import { useComposedRefs } from "../../style/use-composed-refs.js";
import { primaryText } from "../../style/primary-text.js";
import { Pressable, RippleClip, Text, useMinTargetSlop, useSizing, useTheme, type LayoutStyle } from "../../style/index.js";
import { type ButtonSkin, type Intent, type Size, FG_TOKEN } from "./button.styles.js";

// Shared Button shell. The structure (Pressable + optional loading spinner +
// leading icon + label + trailing icon), the accessibility, and the intent/size
// precedence live here once; a platform file supplies only its skin (shape,
// sizing, label weight, press feedback) and calls createButton.

export interface ButtonProps {
  children?: ReactNode;
  /**
   * An icon element rendered before the label (e.g. a lucide or Canvas `Icon`).
   * It renders directly (not wrapped in the label `Text`, which cannot host an
   * SVG), spaced from the label by the skin's gap. Pass `iconLeft` alone with
   * the `icon` size prop for an icon-only square button. The caller sizes and
   * colors the icon (use the intent's foreground for non-ghost intents).
   */
  iconLeft?: ReactNode;
  /** An icon element rendered after the label (e.g. a trailing chevron/arrow). */
  iconRight?: ReactNode;
  /** Accessibility label, required for an icon-only button (no text to read). */
  accessibilityLabel?: string;
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * Renders the button as a REAL link on the web: react-native-web gives the
   * root Pressable an `<a href>`, so middle-click, cmd-click, open-in-new-tab,
   * and crawlers all see the destination, and assistive tech hears a link.
   * Native platforms have no anchors and ignore it, so pair `href` with an
   * `onPress` that runs the same navigation through the host's router. While
   * `disabled` or `loading` the anchor is suppressed, exactly like `onPress`.
   */
  href?: string;
  /**
   * Anchor attributes forwarded with `href` on the web (react-native-web's
   * `hrefAttrs`): `target`, `rel`, `download`. Ignored without `href`, and
   * everywhere natively.
   */
  hrefAttrs?: { target?: "_blank" | "_self"; rel?: string; download?: boolean | string };
  /**
   * Called when a pointer starts hovering the button. Fires on pointer devices
   * only (web via react-native-web, pointer-equipped iPads/desktops natively);
   * touch never triggers it. For hover-driven disclosure such as Tooltip.
   */
  onHoverIn?: (event: MouseEvent) => void;
  /** Called when the pointer stops hovering the button (see `onHoverIn`). */
  onHoverOut?: (event: MouseEvent) => void;
  /** Called when the button gains focus (keyboard tab, or click on web). */
  onFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  /** Called when the button loses focus. */
  onBlur?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  // Intent (pick one; default is the primary action).
  primary?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  outline?: boolean;
  ghost?: boolean;
  link?: boolean;
  // Size (pick one).
  small?: boolean;
  large?: boolean;
  icon?: boolean;
  // Layout and state. A Button is HUG (src/style/sizing.ts): it keeps its content
  // width inside a stretching Column and sits content-sized in a Row; `block` makes
  // it FILL (full width in a Column, an equal share in a Row).
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /**
   * Marks the Button as a disclosure/menu trigger and announces its open state to
   * assistive tech (aria-expanded, which react-native-web forwards and RN maps back
   * to the native expanded state). Pass the live open boolean; omit for a plain
   * button. So a Button that toggles a Dropdown/Popover stays accessible.
   */
  expanded?: boolean;
  /**
   * Announces that the button opens a popup of this kind (aria-haspopup), for a
   * menu / dialog / listbox trigger. Pair it with `expanded` so assistive tech
   * reads both the popup relationship and its open state. Web-only; a no-op natively.
   */
  haspopup?: "menu" | "dialog" | "listbox" | "grid" | "tree" | true;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: `block` and the parent layout container own the width. */
  style?: LayoutStyle;
}

// Intent precedence when more than one is passed: first match wins.
function intentOf(p: ButtonProps): Intent {
  if (p.primary) return "primary";
  if (p.destructive) return "destructive";
  if (p.secondary) return "secondary";
  if (p.outline) return "outline";
  if (p.ghost) return "ghost";
  if (p.link) return "link";
  return "primary";
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: ButtonProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "base";
}

// The touch-target maths moved to src/style/touch-target.ts when every other
// pressable started needing it. Re-exported here so this file's surface, and the
// test that reads it, do not change.
export { minTargetSlop } from "../../style/touch-target.js";

/** Build a Button component from a platform skin.
 * @ref Ref to the interactive Pressable, including link buttons. Typed as a React Native View. On web, React Native Web exposes its DOM host; focus() and blur() move browser focus. Native host behavior depends on the platform and React Native version. Calling focus() does not activate the control or call accessibility focus APIs.
 */
export function createButton(skin: ButtonSkin) {
  const Button = forwardRef<View, ButtonProps>(function Button(props, ref) {
    const hostRef = useComposedRefs(ref);
    const { children, iconLeft, iconRight, accessibilityLabel, onPress, href, hrefAttrs, onHoverIn, onHoverOut, onFocus, onBlur, loading, disabled, block, icon, testID, style } = props;
    const { tokens } = useTheme();
    const intent = intentOf(props);
    const size = sizeOf(props);

    const opts = { icon: !!icon, block: !!block, dim: !!(disabled || loading) };
    const sizing = useSizing({ block });
    const container = skin.container(tokens, intent, size, opts);
    const ripple = skin.ripple ? skin.ripple(tokens, intent) : undefined;
    // The rounded shape the ripple is clipped to (Android only; undefined on iOS/web). A bounded
    // android_ripple bleeds past rounded corners unless a rounded overflow:"hidden" PARENT clips
    // it — <RippleClip> is that parent. See src/style/ripple-clip.
    const clipShape = skin.rippleClipShape?.(size, opts);

    // Native minimum touch target (skin-declared: iOS HIG 44pt, Android M3 48dp; web
    // declares none). Sub-minimum buttons (small text, icon squares) keep their visual
    // size; the rendered box is measured and hitSlop extends only the TOUCH area, so
    // there is no layout shift on any platform.
    const target = useMinTargetSlop(skin.minTarget);

    // A real anchor on the web: react-native-web renders a Pressable carrying
    // `href` as an `<a>` (and forwards hrefAttrs' target/rel/download), while
    // native ignores both. Suppressed when disabled/loading, since a disabled
    // control must not keep navigating through the browser's own anchor
    // behavior after onPress is already blocked. RN's prop types don't know
    // these web-forwarded props, hence the narrow spread object below rather
    // than direct attributes.
    const anchor = href != null && !(disabled || loading) ? { href, hrefAttrs } : null;

    // Outer layout (the sizing nature + the consumer `style`) lives on the <RippleClip> wrapper,
    // the outermost node on every platform, so positioning is identical with or without the clip
    // and the Pressable stretches to fill a block button.
    return (
      <RippleClip shape={clipShape} style={[sizing, style]}>
        <Pressable
          ref={hostRef}
          {...(anchor ?? undefined)}
          onPress={onPress}
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled || loading}
          testID={testID}
          {...target}
          accessibilityRole={href != null ? "link" : "button"}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ busy: !!loading, disabled: !!(disabled || loading) }}
          aria-busy={loading ? true : undefined}
          // RNW drops accessibilityState, so the disabled state needs its aria
          // alias too (the kit's dual-a11y contract). Only emitted when true, so
          // an ordinary button's markup is unchanged.
          aria-disabled={disabled || loading ? true : undefined}
          aria-expanded={props.expanded}
          aria-haspopup={props.haspopup}
          android_ripple={ripple}
          style={({ pressed }) => [
            container,
            skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {loading ? <ActivityIndicator size="small" color={intent === "link" ? primaryText(tokens) : tokens[FG_TOKEN[intent]]} /> : null}
          {!loading && iconLeft != null ? iconLeft : null}
          {children != null ? <Text style={skin.label(tokens, intent, size)}>{children}</Text> : null}
          {!loading && iconRight != null ? iconRight : null}
        </Pressable>
      </RippleClip>
    );
  });
  Button.displayName = "Button";
  return Button;
}
