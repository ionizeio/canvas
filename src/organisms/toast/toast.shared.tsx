import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Pressable,
  Portal,
  RippleClip,
  cornerRadii,
  StyleSheet,
  GlassSurface,
  inverseDenseTint,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { inverseFill } from "../../style/inverse.js";

// Shared Toast shell. Two layers live here once and a platform file supplies only
// its skin (capsule shape, type, action/dismiss feedback) and calls createToastSystem:
//
//   1. The presentational <Toast>, the skinned notification capsule: an optional
//      intent icon, a message + optional description, an optional trailing action,
//      and an optional dismiss (x). Under glass it takes the DENSE layer of the
//      glass model: the material under the model's densest tint. A toast is a
//      status message that lands over whatever the user was reading, and under the
//      functional layer's sheer tint that page read straight through its own text;
//      the dense tint keeps the text legible while the capsule still takes the
//      material. The Android M3 snackbar paints the INVERSE surface (the toast pill,
//      `inverse`, with its own ink), so its dense tint is that fill at the dense alpha
//      (`inverseDenseTint`) and the bar keeps its inverse read.
//      In solid mode GlassSurface is the plain box wearing the skin's own fill (the
//      web hand-off's `--p-toast-fill`).
//
//   2. The imperative runtime — <ToastProvider> + useToast(). The provider owns a
//      queue of live toasts, auto-dismisses each after its duration, and renders the
//      stack through the kit Portal (the non-modal overlay outlet, so toasts float
//      over the app without blocking it). The stack view doubles as the polite live
//      region and is mounted PERSISTENTLY (even while empty); capsules swap inside
//      it, which is what makes assistive tech announce them (see ToastProvider).
//      useToast() returns { toast, dismiss }: toast(options) enqueues and returns
//      an id; dismiss(id) removes one early.
//
// The intent axis is a set of mutually exclusive booleans (success / error /
// warning / info, with a neutral default); each maps to an icon glyph and a theme
// color, and the names match Alert's tone axis. The whole system is built once from
// React Native primitives, so it renders identically on iOS, Android, and the web.

/** The intent axis: pick one (or none for the neutral default). */
type Intent = "success" | "error" | "warning" | "info" | "neutral";

/** A trailing action button on a toast. */
export interface ToastAction {
  /** The action label. */
  label: string;
  /** Run when the action is pressed. */
  onPress: () => void;
}

export interface ToastProps {
  /** The headline line (required). */
  message: string;
  /** A secondary line under the message. */
  description?: string;
  /** A trailing action button (e.g. Undo). */
  action?: ToastAction;
  /** Green success intent (icon + tint). */
  success?: boolean;
  /** Red danger intent (icon + tint). This is the name the intent axis uses across the
   *  kit (Button, AlertDialog, and every chart) and the one the design hand-off uses. */
  destructive?: boolean;
  /** @deprecated Use `destructive`. Kept working so existing call sites are untouched;
   *  it resolves to exactly the same intent. */
  error?: boolean;
  /** Amber warning intent (icon + tint). */
  warning?: boolean;
  /** Brand-tinted informational intent (icon + tint). */
  info?: boolean;
  /** Override the auto intent icon; pass any node, or omit to use the intent glyph. */
  icon?: ReactNode;
  /** When provided, render a trailing dismiss (x) that calls this. */
  onDismiss?: () => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// The platform-varying surface. Everything shape/type/feedback-bearing the capsule
// needs lives here, built from the active tokens (so each follows light/dark).
export interface ToastSkin {
  /** The capsule shape + density (radius, padding, gap, minHeight, shadow, maxWidth).
   *  `hasTrailing` is true when a trailing action/dismiss control renders, so a skin
   *  can tighten the trailing padding (M3: 8dp beside a trailing control). */
  container: (t: ColorTokens, hasTrailing: boolean) => ViewStyle;
  /** Render the auto intent glyph (success / error / warning / info) in the leading
   *  slot. The M3 snackbar anatomy has no leading icon, so the Android skin turns
   *  this off; an explicit `icon` prop always renders. */
  intentIcon: boolean;
  /** The intent icon glyph size, in px. */
  iconSize: number;
  /** The message line type. */
  message: (t: ColorTokens) => TextStyle;
  /** The description line type. */
  description: (t: ColorTokens) => TextStyle;
  /** The trailing action button shape. */
  actionButton: (t: ColorTokens) => ViewStyle;
  /** The trailing action label type (brand-tinted). */
  actionLabel: (t: ColorTokens) => TextStyle;
  /** Extra touch area (px, all edges) around the action button so its target
   *  reaches the platform minimum (44pt iOS / 48dp Android); null on web. */
  actionHitSlop: number | null;
  /** The dismiss (x) control shape. */
  dismissButton: (t: ColorTokens) => ViewStyle;
  /** The dismiss glyph size, in px. */
  dismissIconSize: number;
  /** The dismiss glyph color; null keeps the default muted glyph. The Android skin
   *  paints the inverse surface's ink (`inverse-foreground`) so the x reads on the
   *  inverse bar. */
  dismissColor: ((t: ColorTokens) => string) | null;
  /** Extra touch area (px, all edges) around the dismiss control (same platform
   *  minimums as `actionHitSlop`); null on web. */
  dismissHitSlop: number | null;
  /** iOS/web dim the action/dismiss on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android action/dismiss ripple; null on iOS/web. On the inverse Android bar the
   *  ink is the bar's own ink (a foreground-ink ripple would paint bar-on-bar). */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// Intent precedence when more than one boolean is passed: first match wins.
// Mirrors Alert's tone precedence (error, warning, success, info).
function intentOf(p: {
  success?: boolean;
  destructive?: boolean;
  error?: boolean;
  warning?: boolean;
  info?: boolean;
}): Intent {
  if (p.destructive || p.error) return "error";
  if (p.warning) return "warning";
  if (p.success) return "success";
  if (p.info) return "info";
  return "neutral";
}

// The auto intent icon: a glyph + the Icon color boolean that tints it. Neutral
// carries no icon (the message stands alone).
function IntentIcon({ intent, size }: { intent: Intent; size: number }): ReactNode {
  if (intent === "success") return <Icon circleCheck success size={size} />;
  if (intent === "error") return <Icon circleX destructive size={size} />;
  if (intent === "warning") return <Icon alertTriangle warning size={size} />;
  if (intent === "info") return <Icon info primary size={size} />;
  return null;
}

/** Options for the imperative toast() call: the toast content plus a lifetime. */
export interface ToastOptions {
  message: string;
  description?: string;
  action?: ToastAction;
  success?: boolean;
  /** The danger intent; `error` is the deprecated alias. */
  destructive?: boolean;
  /** @deprecated Use `destructive`. */
  error?: boolean;
  warning?: boolean;
  info?: boolean;
  icon?: ReactNode;
  /** Auto-dismiss after this many ms (default 4000). Pass 0 or Infinity to keep it
   *  until dismissed explicitly. */
  duration?: number;
}

/** The imperative handle returned by useToast(). */
export interface ToastHandle {
  /** Enqueue a toast; returns its id (for dismiss). */
  toast: (options: ToastOptions) => string;
  /** Dismiss a live toast early by its id. */
  dismiss: (id: string) => void;
}

interface ToastInstance extends ToastOptions {
  id: string;
}

const DEFAULT_DURATION = 4000;
// The stack sits this far off the bottom edge (a fixed inset; an app that needs the
// safe-area can wrap ToastProvider's host or pass its own offset via the provider).
const STACK_BOTTOM_INSET = 24;

/**
 * Build a Toast system (the presentational `Toast`, the `ToastProvider`, and the
 * `useToast` hook) from a platform skin. The wrappers call this with their skin and
 * re-export all three; an app mounts one ToastProvider near its root.
 */
export function createToastSystem(skin: ToastSkin) {
  // The skinned capsule alone: the skin's own opaque bar with the icon, text
  // column, action, and dismiss. It carries NO live-region semantics of its own:
  // the standalone <Toast> wraps it in a status region, while <ToastProvider>
  // swaps capsules inside its single persistent region (a per-capsule region
  // would both nest regions, double-firing, and mount together with its content,
  // which assistive tech misses).
  function ToastCapsule(props: Omit<ToastProps, "testID" | "style">) {
    const { message, description, action, icon, onDismiss } = props;
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens } = theme;
    const intent = intentOf(props);

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const pressFeedback = (pressed: boolean): ViewStyle | null =>
      skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null;

    // The auto intent glyph only where the skin's anatomy carries one (the M3
    // snackbar has no leading icon); an explicit `icon` prop always wins.
    const auto = skin.intentIcon ? <IntentIcon intent={intent} size={skin.iconSize} /> : null;
    const glyph = icon !== undefined ? icon : auto;
    const hasTrailing = action != null || onDismiss != null;
    const containerStyle = skin.container(tokens, hasTrailing);

    const content = (
      <>
        {glyph != null && glyph !== false ? <View style={ICON_SLOT}>{glyph}</View> : null}
        <View style={TEXT_COL}>
          <Text style={skin.message(tokens)} numberOfLines={2}>
            {message}
          </Text>
          {description != null && description !== "" ? (
            <Text style={skin.description(tokens)} numberOfLines={3}>
              {description}
            </Text>
          ) : null}
        </View>
        {action ? (
          // The bounded ripple is clipped to the button's corners by this RippleClip
          // parent (a node can never clip its own ripple on Android); nothing to move.
          <RippleClip shape={cornerRadii(skin.actionButton(tokens))}>
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              android_ripple={ripple}
              hitSlop={skin.actionHitSlop ?? undefined}
              style={({ pressed }) => [skin.actionButton(tokens), pressFeedback(pressed)]}
            >
              <Text style={skin.actionLabel(tokens)}>{action.label}</Text>
            </Pressable>
          </RippleClip>
        ) : null}
        {onDismiss ? (
          <RippleClip shape={cornerRadii(skin.dismissButton(tokens))}>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              android_ripple={ripple}
              hitSlop={skin.dismissHitSlop ?? undefined}
              style={({ pressed }) => [skin.dismissButton(tokens), pressFeedback(pressed)]}
            >
              <Icon
                x
                muted={skin.dismissColor == null}
                color={skin.dismissColor ? skin.dismissColor(tokens) : undefined}
                size={skin.dismissIconSize}
              />
            </Pressable>
          </RippleClip>
        ) : null}
      </>
    );

    // The dense layer under glass, the plain box wearing the skin's own fill in solid
    // mode (see the header note above). A skin whose fill is the inverse surface (the M3
    // snackbar on the toast pill) takes the inverse dense tint of that fill so its
    // inverse text stays legible.
    const fill = inverseFill(tokens);
    const inverse = (StyleSheet.flatten(containerStyle) as ViewStyle).backgroundColor === fill;
    return (
      <GlassSurface layer="dense" tint={inverse ? inverseDenseTint(theme, fill) : undefined} style={containerStyle}>
        {content}
      </GlassSurface>
    );
  }

  function Toast(props: ToastProps) {
    const { testID, style, ...content } = props;

    return (
      // A directly rendered capsule announces itself as a polite status region (so
      // assistive tech reads it without stealing focus). The a11y wrapper holds the
      // role because the capsule below paints a surface and does not forward
      // accessibility props. Caveat of the direct form: the region mounts together
      // with its content, so screen readers can miss a toast that pops into
      // existence; for reliable announcements render through <ToastProvider>,
      // whose live region is persistent.
      <View
        role="status"
        accessibilityLiveRegion="polite"
        aria-live="polite"
        testID={testID}
        style={style}
      >
        <ToastCapsule {...content} />
      </View>
    );
  }

  const ToastContext = createContext<ToastHandle | null>(null);

  function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastInstance[]>([]);
    // Auto-dismiss timers, keyed by toast id, and a monotonic id counter. Both live
    // in refs so scheduling a timer never re-renders the provider.
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const seq = useRef(0);

    const clearTimer = useCallback((id: string) => {
      const handle = timers.current.get(id);
      if (handle) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }, []);

    const dismiss = useCallback(
      (id: string) => {
        clearTimer(id);
        setToasts((list) => list.filter((t) => t.id !== id));
      },
      [clearTimer],
    );

    const toast = useCallback(
      (options: ToastOptions) => {
        const id = `toast-${(seq.current += 1)}`;
        setToasts((list) => [...list, { ...options, id }]);
        const duration = options.duration ?? DEFAULT_DURATION;
        if (duration > 0 && duration !== Infinity) {
          timers.current.set(
            id,
            setTimeout(() => dismiss(id), duration),
          );
        }
        return id;
      },
      [dismiss],
    );

    // Clear every pending timer on unmount so a dismissed provider leaves nothing
    // running.
    useEffect(() => {
      const map = timers.current;
      return () => {
        for (const handle of map.values()) clearTimeout(handle);
        map.clear();
      };
    }, []);

    const handle = useMemo<ToastHandle>(() => ({ toast, dismiss }), [toast, dismiss]);

    return (
      <ToastContext.Provider value={handle}>
        {children}
        {/* The live stack floats over the app via the Portal outlet; box-none lets
            taps fall through everywhere except the toast capsules themselves. The
            stack IS the single polite live region and is mounted persistently
            (even while empty), so capsules that swap in ARE announced — a
            per-capsule region would mount together with its content, which
            assistive tech routinely misses. Capsules render as the bare
            ToastCapsule (no region of their own) to avoid nesting live regions. */}
        <Portal>
          <View
            style={stackStyles.stack}
            role="status"
            accessibilityLiveRegion="polite"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <View key={t.id} style={stackStyles.item}>
                <ToastCapsule
                  message={t.message}
                  description={t.description}
                  action={t.action}
                  success={t.success}
                  error={t.error}
                  warning={t.warning}
                  info={t.info}
                  icon={t.icon}
                  onDismiss={() => dismiss(t.id)}
                />
              </View>
            ))}
          </View>
        </Portal>
      </ToastContext.Provider>
    );
  }

  function useToast(): ToastHandle {
    const ctx = useContext(ToastContext);
    if (!ctx) {
      throw new Error("useToast must be used within a <ToastProvider>.");
    }
    return ctx;
  }

  return { Toast, ToastProvider, useToast };
}

// The icon sits in a fixed leading slot so the text column aligns whether or not an
// intent glyph is present.
const ICON_SLOT: ViewStyle = { alignItems: "center", justifyContent: "center" };
const TEXT_COL: ViewStyle = { flexShrink: 1, flexGrow: 1, gap: 2 };
// The portal stack: bottom-anchored, centered, newest at the bottom of the column.
// box-none goes through StyleSheet.create (not an inline `{ pointerEvents }`
// object) so react-native-web compiles its pointer-events polyfill: the stack and
// each item stay transparent to taps, only the toast capsules capture. An inline
// literal is dropped by RNW, leaving this persistently-mounted full-width stack
// eating clicks along the bottom of every screen. Native honors box-none either way.
const stackStyles = StyleSheet.create({
  stack: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: STACK_BOTTOM_INSET,
    alignItems: "center",
    gap: 8,
    pointerEvents: "box-none",
  },
  item: { maxWidth: "100%", pointerEvents: "box-none" },
});
