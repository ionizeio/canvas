import { useCallback, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { PopupInteractionContext } from "../../style/popup-motion.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { OverlayProvider } from "../../style/portal.js";
import { Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet } from "react-native";
import { GlassModalBlurTarget, GlassSurface, Pressable, View, isRTL, useTheme, useReducedMotion, useHardwareBack, supportsNativeDriver, type StyleProp, type ViewStyle } from "../../style/index.js";
import { SafeAreaProvider, SafeAreaView } from "../../style/safe-area.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import * as s from "./drawer.styles.js";
import { type Edge, type DrawerSkin } from "./drawer.styles.js";

// The trigger Button type, so each platform can pass its own resolved Button
// (web base by default) without widening to `any`.
export type ButtonComponent = ComponentType<ButtonProps>;

// The safe-area content box inside the panel surface: grows and shrinks with an AUTO
// basis so it fills a sized side drawer and wraps a sheet's content (a basis of 0 would
// collapse a content-sized sheet on native, see splitSurfaceStyle).
const PANEL_CONTENT: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "auto" };

// Shared Drawer shell. The structure (a full-screen Modal whose scrim lays an
// opaque panel against an edge), the public boolean-prop API, the edge
// precedence, the controlled/uncontrolled open state, the trigger/scrim/back
// handlers, and the hardware-back wiring all live here once. A platform file
// supplies only its skin (the scrim dimming and the per-edge panel shape) and
// calls createDrawer.
//
// Drawer: a full-screen overlay that slides a panel in from an edge over the
// whole app. This is the kit's full-screen portal case (a nav drawer, a mobile
// menu, an action sheet), distinct from the inline Overlay/Dialog used for docs
// previews. It is built on React Native's Modal, which react-native-web
// implements on the web, so the same drawer renders on iOS, Android, and the
// web. The panel is a FUNCTIONAL-layer surface: it renders through GlassSurface
// and takes the material under glass (the same sheet material as ActionSheet and
// Dialog, over the dimming scrim), and is the plain `card` panel in solid mode.
//
// Open state mirrors the kit's other overlays: pass `trigger` for an uncontrolled
// drawer that renders its own button and manages itself, or drive `open` /
// `onOpenChange` yourself. The scrim, the system back/escape, AND the Android
// hardware back button all request a close.
//
// Boolean-prop API: one boolean per option, first-match precedence. Edge axis
// (pick one):
//
// - `left`:  a full-height panel on the left edge (the default).
// - `right`: a full-height panel on the right edge.
// - `bottom`: a sheet that spans the width and rises from the bottom.

export interface DrawerProps {
  /** Panel content. */
  children?: ReactNode;
  /** Controlled open state. Omit for uncontrolled (a `trigger` opens it). */
  open?: boolean;
  /** Fired when the open state changes (trigger press, scrim tap, back/escape). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Label for an optional outline trigger button. When set, the drawer renders the button
   * and opens itself on press (uncontrolled). Omit when you drive `open` yourself.
   */
  trigger?: string;
  // Edge axis (pick one; first match wins, default is the left side drawer).
  /** A full-height panel on the left edge (default). */
  left?: boolean;
  /** A full-height panel on the right edge. */
  right?: boolean;
  /** A sheet spanning the width, rising from the bottom. */
  bottom?: boolean;
  /** A sheet spanning the width, dropping from the top. */
  top?: boolean;
  /** Width of a side drawer in px (default 288). Ignored for the bottom/top sheet. */
  width?: number;
  /** Accessible name for the modal surface. Required when the drawer has no trigger whose label can name it. */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition for the panel surface, never a restyle hook. (Device safe-area insets are applied automatically.) */
  style?: StyleProp<ViewStyle>;
}

// First-match edge precedence; defaults to the left side drawer.
function edgeOf(p: DrawerProps): Edge {
  if (p.right) return "right";
  if (p.bottom) return "bottom";
  if (p.top) return "top";
  return "left";
}

/**
 * Build a Drawer component from a platform skin and the platform-correct trigger
 * Button.
 *
 * The trigger Button is passed in by each platform's thin `.tsx`/`.ios`/`.android`
 * file so the built-in `trigger` reads native on every build path. This matters
 * for the WEB docs 3-up preview: a bare barrel import always resolves the WEB
 * Button in a browser bundler, which would paint a web-styled trigger inside the
 * iOS/Android rows; each platform file passes its own `.ios`/`.android` Button so
 * the row's trigger reads native. On a real device Metro resolves the right Button
 * by extension regardless, so the default (the web base) is correct there too.
 */
export function createDrawer(skin: DrawerSkin, Button: ButtonComponent = WebButton) {
  return function Drawer(props: DrawerProps) {
    const { children, open: openProp, onOpenChange, trigger, width = 288, accessibilityLabel, testID, style } = props;
    const { tokens, scheme } = useTheme();
    const edge = edgeOf(props);

    // Uncontrolled by default: the trigger opens the drawer and the scrim closes it; a
    // controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const parentInteractive = useContext(PopupInteractionContext);
    const open = parentInteractive && (openProp ?? internalOpen);
    const setOpen = useCallback(
      (next: boolean) => {
        if (openProp === undefined) setInternalOpen(next);
        onOpenChange?.(next);
      },
      [openProp, onOpenChange],
    );

    // Hardware back closes the open drawer (the Modal's own onRequestClose also
    // covers the system back/escape). The hook subscribes only while open, so the
    // event is consumed while the drawer is up and default back behavior runs
    // once it is closed; it also skips web, where the BackHandler shim would
    // console.error on every call.
    const escapeScope = useEscapeLayer(open, () => setOpen(false));
    useHardwareBack(open, escapeScope.onRequestClose);

    // EVERY edge SLIDES by hand (translateX/translateY) behind a SEPARATE, stationary
    // dim layer that fades in. RN Modal's animationType can only slide vertically upward
    // AND it transforms the whole modal (the scrim dim included), so relying on it would
    // (a) leave left/right/top edges to merely fade, and (b) drag the backdrop up with a
    // bottom sheet. Driving the slide ourselves keeps the dim a fixed full-screen scrim
    // that takes over the surface while only the panel travels, identical on every edge.
    // The Modal stays mounted through the exit so the slide-out is visible, then unmounts.
    const isVertical = edge === "top" || edge === "bottom";
    const reduced = useReducedMotion();
    const [mounted, setMounted] = useState(open);
    // Both sheets slide on Y, so they need the panel's measured height for the off-screen
    // origin: the top starts above (-height), the bottom below (+height).
    const [panelH, setPanelH] = useState(0);
    const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
    useEffect(() => {
      if (!parentInteractive) {
        progress.stopAnimation();
        progress.setValue(0);
        setMounted(false);
      } else if (open) {
        setMounted(true);
        Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 220, useNativeDriver: supportsNativeDriver }).start();
      } else if (mounted) {
        Animated.timing(progress, { toValue: 0, duration: reduced ? 0 : 180, useNativeDriver: supportsNativeDriver }).start(({ finished }) => {
          if (finished) setMounted(false);
        });
      }
    }, [open, mounted, progress, reduced, parentInteractive]);

    // Side panels land on the logical start (left) / end (right) edge via flexbox, which mirrors
    // under RTL, so the horizontal slide origin follows the PHYSICAL side the panel ends up on.
    // The top sheet drops down from above (translateY = -panelHeight -> 0); the bottom sheet
    // rises from below (translateY = +panelHeight -> 0).
    const physicalRight = (edge === "right") !== isRTL();
    const fromOffset = isVertical
      ? edge === "bottom"
        ? panelH || 600
        : -(panelH || 600)
      : physicalRight
        ? width
        : -width;
    const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [fromOffset, 0] });
    // The scrim dim resolves per color scheme (iOS dims lighter in light, darker in dark).
    const scrimAlpha = skin.scrimOpacity(scheme);
    const dimOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, scrimAlpha] });
    const slideTransform = isVertical ? [{ translateY: slide }] : [{ translateX: slide }];

    // A sheet caps its width (Android M3 640dp) and centers on wide windows; the cap
    // rides on the panel positioner so the no-op tap-catcher shrinks with the sheet
    // (a tap on the exposed scrim beside a capped sheet still dismisses). Side drawers
    // and iOS/web sheets pass no cap and span as before.
    const isSheet = edge === "bottom" || edge === "top";
    const sheetCap: ViewStyle | null =
      skin.sheetMaxWidth != null && isSheet ? { maxWidth: skin.sheetMaxWidth, alignSelf: "center" } : null;

    // The optional grabber/drag handle for a sheet edge (the iOS grabber, the M3
    // drag handle); a decorative bar, hidden from assistive tech. It sits at the
    // panel's near edge: above the content on a bottom sheet, below it on a top
    // sheet. Side drawers and web return none.
    const handleStyle = skin.handle ? skin.handle(edge, tokens) : null;
    const handleNode = handleStyle ? (
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={handleStyle} />
    ) : null;

    // A no-op press inside the panel keeps taps from falling through to the scrim; it is a pure
    // event-capture wrapper, hidden from assistive tech. onLayout measures a sheet's height
    // for its slide. The panel surface renders through GlassSurface (the functional layer's
    // material under glass, the skin's own `card` panel in solid mode); inside it SafeAreaView
    // pads the content clear of the device insets on iOS (a bottom sheet clears the home
    // indicator, a side drawer the notch/status bar) while the surface itself still reaches
    // the screen edge, and insets resolve to 0 elsewhere. The SafeAreaView fills a sized
    // panel (a side drawer's full height) and wraps its content in a sheet, the same
    // auto-basis recipe the surface's own clip box uses.
    const panel = (
      <Pressable accessible={false} focusable={false} tabIndex={-1} importantForAccessibility="no" style={[s.panelPos[edge], sheetCap]} onPress={() => {}} onLayout={isVertical ? (e) => setPanelH(e.nativeEvent.layout.height) : undefined}>
        <GlassSurface style={[skin.panelShape(edge, width, tokens), style]}>
          <SafeAreaView
            edges={isVertical ? [edge as "top" | "bottom", "left", "right"] : ["top", "bottom", physicalRight ? "right" : "left"]}
            style={PANEL_CONTENT}
          >
            {edge === "bottom" ? handleNode : null}
            {children}
            {edge === "top" ? handleNode : null}
          </SafeAreaView>
        </GlassSurface>
      </Pressable>
    );

    return (
      <>
        {trigger != null ? (
          // The built-in trigger floors its height to the platform touch minimum
          // (iOS HIG 44pt, M3 48dp) via the skin; web is pointer-first (no floor,
          // layout untouched). The Button is the platform-resolved one so the docs
          // 3-up shows each row's native trigger.
          <Button
            outline
            small
            onPress={() => setOpen(true)}
            style={skin.triggerMinHeight != null ? { minHeight: skin.triggerMinHeight } : undefined}
          >
            {trigger}
          </Button>
        ) : null}
        <Modal
          visible={mounted && parentInteractive}
          transparent
          animationType="none"
          onRequestClose={escapeScope.onRequestClose}
          accessibilityLabel={accessibilityLabel ?? trigger}
          testID={testID}
          // Tell assistive tech the content behind this full-screen overlay is
          // inert while the drawer is open (iOS VoiceOver honors this; a no-op
          // elsewhere). No focus trap is attempted (hard cross-platform).
          accessibilityViewIsModal={true}
        >
          {/* Native Modal content has a separate view ancestry. Measure its own
              safe area before keyboard avoidance or panel transforms apply. */}
          <SafeAreaProvider style={{ flex: 1 }}>
            <EscapeLayerProvider scope={escapeScope}>
              {/* This separate native window can safely blur the app's window target.
                  Keep the bridge outside the local host: its outlet publishes only
                  its OWN sibling target, never the target containing its content. */}
              <GlassModalBlurTarget>
                {/* Anchored children must publish into this Modal's window. The host
                    fills the window, outside the translated and clipped panel, so
                    outlet-relative measurements and outside-tap dismissal span the
                    whole Modal. Nested Drawers establish their own window host. */}
                <OverlayProvider separateWindow>
                  {/* Lift the panel above the iOS software keyboard so a field inside the drawer stays
                      visible while typing. "padding" shrinks the layout by the keyboard height on iOS;
                      off iOS no behavior is passed (Android's window resizes, web has no soft keyboard). */}
                  <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                    {/* The dim is an Animated layer that fades in behind a TRANSPARENT tap-to-close
                        layout; the panel rides in on translateX/translateY. The dim is a dismiss
                        affordance, not a control, so it is unannounced; hardware back and accessibility escape dismiss. */}
                    <View style={{ flex: 1 }} collapsable={false} onAccessibilityEscape={escapeScope.onAccessibilityEscape}>
                      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgb(0, 0, 0)", opacity: dimOpacity }]} />
                      <Pressable accessible={false} focusable={false} tabIndex={-1} importantForAccessibility="no" style={s.scrim(edge, 0)} onPress={() => setOpen(false)}>
                        <Animated.View style={{ transform: slideTransform }}>{panel}</Animated.View>
                      </Pressable>
                    </View>
                  </KeyboardAvoidingView>
                </OverlayProvider>
              </GlassModalBlurTarget>
            </EscapeLayerProvider>
          </SafeAreaProvider>
        </Modal>
      </>
    );
  };
}
