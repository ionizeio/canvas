import { scrimFill } from "../../style/scrim.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { glassMessageStyle } from "../../style/glass-message.js";
import { Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "../../style/safe-area.js";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  GlassSurface,
  RippleClip,
  cornerRadii,
  useHardwareBack,
  useReducedMotion,
  supportsNativeDriver,
  GlassModalBlurTarget,
  type StyleProp,
  type ViewStyle,
} from "../../style/index.js";
import { Button } from "../../atoms/button/button.js";
import * as s from "./action-sheet.styles.js";
import { type ActionSheetSkin } from "./action-sheet.styles.js";

// Shared ActionSheet shell. The structure (a full-screen Modal whose dimmed scrim
// lays a bottom-anchored stack of action rows against the bottom edge), the
// controlled open state, the select-then-close + scrim/Cancel-dismiss handlers,
// the accessibility wiring, and the hardware-back wiring all live here once. A
// platform file supplies only its skin (the card shape, the row sizing/type, the
// Cancel layout, the press feedback) and calls createActionSheet.
//
// ActionSheet: the iOS HIG modal action menu (a bottom sheet of choices). It poses
// an optional title/message, lists a set of action rows (any of which may be
// destructive or disabled), and offers a Cancel. Selecting an action runs its
// onPress then closes; tapping the scrim or Cancel closes without acting. This is
// the kit's modal-action-list case, distinct from the anchored Dropdown/RowMenu
// (a small contextual menu) and the full-screen Drawer (a takeover panel).
//
// It is built on React Native's Modal, which react-native-web implements on the
// web, so the same sheet renders on iOS, Android, and the web. The card surfaces
// are FUNCTIONAL-LAYER overlays, so they render through GlassSurface (glass when
// the theme's surface mode is glass, a solid `popover` fill otherwise).
//
// Open state mirrors the kit's other overlays (Dialog, Drawer): pass `trigger`
// for an uncontrolled sheet that renders its own button and opens itself on
// press, or drive `open` / `onOpenChange` yourself for the controlled case. The
// scrim, the system back/escape, AND the Android hardware back button all request
// a close.

/** A single action in the sheet. */
export interface ActionSheetAction {
  /**
   * Optional stable identity for this action, used as the React key for its row.
   * Supply it when the `actions` array can reorder or have items inserted/removed
   * so React keeps each row associated with its logical action; falls back to the
   * label when omitted.
   */
  id?: string | number;
  /** The row label. */
  label: string;
  /** Run when the row is selected (the sheet then closes). */
  onPress: () => void;
  /** Render the label in the destructive red (for an irreversible action). */
  destructive?: boolean;
  /** Dim the row and ignore presses. */
  disabled?: boolean;
}

export interface ActionSheetProps {
  /** Controlled open state. Omit for uncontrolled (a `trigger` opens it). */
  open?: boolean;
  /** Fired when the open state changes (trigger press, scrim tap, Cancel, an action, back/escape). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Label for an optional trigger button. When set, the sheet renders the button
   * and opens itself on press (uncontrolled). Omit when you drive `open` yourself.
   */
  trigger?: string;
  /** Optional header title (a left-aligned primary-label heading on iOS, a short
   *  centered heading on web, left-aligned on Android). */
  title?: string;
  /** Optional header message under the title. */
  message?: string;
  /** The action rows. Each runs its `onPress` then closes the sheet. */
  actions: ActionSheetAction[];
  /** The Cancel row label (default "Cancel"). */
  cancelLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * Outer layout composition for the bottom-anchored stack, composed onto the stack
   * container; not a restyle hook. (The device's bottom safe-area inset is applied
   * automatically, so it clears the home indicator without a manual `paddingBottom`.)
   */
  style?: StyleProp<ViewStyle>;
}

/** Build an ActionSheet component from a platform skin. */
export function createActionSheet(skin: ActionSheetSkin) {
  return function ActionSheet(props: ActionSheetProps) {
    const { open: openProp, onOpenChange, trigger, title, message, actions, cancelLabel = "Cancel", testID, style } = props;
    const theme = useMaterialTheme({ layer: "functional" });
    const { tokens } = theme;

    // Uncontrolled by default: the trigger opens the sheet and the scrim/Cancel
    // closes it; a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const setOpen = useCallback(
      (next: boolean) => {
        if (openProp === undefined) setInternalOpen(next);
        onOpenChange?.(next);
      },
      [openProp, onOpenChange],
    );

    const close = () => setOpen(false);

    // Selecting an action runs its handler, then closes the sheet.
    const selectAction = (action: ActionSheetAction) => {
      if (action.disabled) return;
      action.onPress();
      close();
    };

    // Hardware back closes the open sheet (the Modal's own onRequestClose also
    // covers the system back/escape). The hook subscribes only while open, so the
    // event is consumed while the sheet is up and default back behavior runs once
    // it is closed; it also skips web, where the BackHandler shim would
    // console.error on every call.
    const escapeScope = useEscapeLayer(open, close);
    useHardwareBack(open, escapeScope.onRequestClose);

    // The sheet SLIDES up by hand (translateY) behind a SEPARATE, stationary dim
    // layer that FADES in. RN Modal's animationType="slide" transforms the whole
    // modal, the scrim dim included, so the backdrop used to travel up with the
    // sheet instead of settling over the page. Driving the slide ourselves keeps
    // the dim a fixed full-screen scrim that takes over the surface while only the
    // sheet moves. This mirrors Drawer, which slides its panel the same way. The
    // Modal stays mounted through the exit so the slide-out is visible, then
    // unmounts.
    const reduced = useReducedMotion();
    const [mounted, setMounted] = useState(open);
    // The sheet slides on Y, so it needs its own measured height for the off-screen
    // origin. The 600 fallback only covers the first frame, before onLayout reports a
    // real height; it clears the tallest sheet the skins can produce (a 360-capped row
    // scroller plus header, Cancel, and insets), so the sheet never peeks at rest.
    const [sheetH, setSheetH] = useState(0);
    const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
    useEffect(() => {
      if (open) {
        setMounted(true);
        Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 220, useNativeDriver: supportsNativeDriver }).start();
      } else if (mounted) {
        Animated.timing(progress, { toValue: 0, duration: reduced ? 0 : 180, useNativeDriver: supportsNativeDriver }).start(({ finished }) => {
          if (finished) setMounted(false);
        });
      }
    }, [open, mounted, progress, reduced]);

    const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH || 600, 0] });
    const dimOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const dimFill = scrimFill(tokens, skin.scrimOpacity);

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const hasHeader = title != null || message != null;

    // A press feedback wrapper shared by the action and Cancel rows: iOS/web dim on
    // press, Android shows a ripple (the skin nulls the unused one per platform).
    const pressFeedback = (pressed: boolean): ViewStyle | null =>
      skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null;

    // The header (optional title/message) plus the action rows, drawn into the
    // actions card. On web a hairline divider separates the header from the rows and
    // one row from the next; on iOS the rows are detached capsules with a gap (no
    // dividers) and on Android the rows sit flush.
    const headerNode = hasHeader ? (
      <Fragment>
        <View style={skin.header}>
          {title != null ? <Text style={glassMessageStyle(skin.headerTitle(tokens), theme)}>{title}</Text> : null}
          {message != null ? <Text style={glassMessageStyle(skin.headerMessage(tokens), theme)}>{message}</Text> : null}
        </View>
        {skin.divider ? <View style={skin.divider(tokens)} /> : null}
      </Fragment>
    ) : null;

    const actionRows = actions.map((action, i) => (
      <Fragment key={action.id ?? action.label}>
        {skin.divider && i > 0 ? <View style={skin.divider(tokens)} /> : null}
        <Pressable
          onPress={() => selectAction(action)}
          disabled={action.disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: !!action.disabled }}
          // A destructive row carries a hint so VoiceOver/TalkBack convey the
          // weight that the red color signals visually.
          accessibilityHint={action.destructive ? "Destructive action" : undefined}
          android_ripple={ripple}
          // iOS paints each row as a detached capsule (its own translucent fill);
          // web/Android leave rowFill null so the rows take the card's fill.
          style={({ pressed }) => [skin.row, skin.rowFill?.(tokens), pressFeedback(pressed)]}
        >
          <Text style={skin.rowLabel(tokens, !!action.destructive, !!action.disabled)}>{action.label}</Text>
        </Pressable>
      </Fragment>
    ));

    // The Cancel affordance. On iOS it is a SEPARATE detached capsule below the
    // container; on web a separate rounded card; on Android it folds into the same
    // sheet as the last list row.
    const cancelRow = (
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        android_ripple={ripple}
        style={({ pressed }) => [skin.cancelRow, pressFeedback(pressed)]}
      >
        <Text style={skin.cancelLabel(tokens)}>{cancelLabel}</Text>
      </Pressable>
    );

    return (
      <Fragment>
        {trigger != null ? (
          <Button outline small onPress={() => setOpen(true)}>
            {trigger}
          </Button>
        ) : null}
        <Modal
          visible={mounted}
          transparent
          animationType="none"
          onRequestClose={escapeScope.onRequestClose}
          testID={testID}
          // Tell assistive tech the content behind this overlay is inert while the
          // sheet is open (iOS VoiceOver honors this; a no-op elsewhere).
          accessibilityViewIsModal={true}
        >
          {/* The Modal renders in its own native window, so the app's Android blur
              target is a sibling render tree here — re-publish it and the sheet's
              frost blurs the page behind it (a no-op off Android). */}
          {/* Measure the Modal window outside the moving sheet and keyboard
              avoidance, so its inset provider stays attached to the window. */}
          <SafeAreaProvider style={{ flex: 1 }}>
            <EscapeLayerProvider scope={escapeScope}>
            <GlassModalBlurTarget>
            {/* Lift the sheet above the iOS software keyboard so a field summoned over
                the sheet stays visible while typing. behavior "padding" shrinks the
                overlay by the keyboard height on iOS; off iOS no behavior is passed
                (Android's window handles the resize, web has no soft keyboard), so the
                wrapper is inert there. */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              {/* The scrim container is a plain TRANSPARENT layout box; the dim is the
                  Animated layer beneath, and the tap-to-dismiss target is a separate
                  full-bleed Pressable BEHIND the sheet, not a wrapper around it.
                  A Pressable that wrapped the sheet would nest one interactive element
                  inside another (an invalid <button>-in-<button> on the web, since RNW
                  renders a button-roled Pressable as a real <button>, plus an ambiguous
                  a11y target). Kept as a sibling, the dismiss control still exposes the
                  same button role + label a screen reader can reach, while the action
                  rows live in their own subtree. The content layer is lifted above the
                  absolute backdrop with zIndex, so a tap on the sheet hits the sheet and
                  a tap on the exposed scrim dismisses (no fall-through wrapper needed). */}
              <View style={s.scrim} collapsable={false} onAccessibilityEscape={escapeScope.onAccessibilityEscape}>
                {/* The stationary dim: it fades from transparent to the skin's alpha and
                    never moves, so the backdrop settles over the page while the sheet
                    rises. Purely decorative (the Pressable above it carries the dismiss
                    role), so it is unannounced. */}
                <Animated.View style={[StyleSheet.absoluteFill, s.scrimDim, { backgroundColor: dimFill, opacity: dimOpacity }]} />
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                />
                {/* The travelling layer: it carries the zIndex that lifts the sheet above
                    the absolute dim/dismiss siblings, the slide transform, and the layout
                    measurement (its height INCLUDES the safe-area inset below, so the sheet
                    starts fully off-screen rather than peeking by the inset).
                    SafeAreaView lifts the bottom-anchored stack clear of the home
                    indicator on iOS (the dim scrim still fills the gap behind it, matching
                    the native sheet); the inset resolves to 0 elsewhere, so the layout is
                    unchanged off iOS. */}
                <Animated.View
                  style={[s.scrimContent, { transform: [{ translateY: slide }] }]}
                  onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
                >
                  <SafeAreaView edges={["bottom", "left", "right"]}>
                    <View style={[skin.stack, style]}>
                      <GlassSurface style={skin.actionsCard(tokens)}>
                        {/* The handle (Android) sits above the header inside the sheet. */}
                        {skin.handle ? <View style={skin.handle(tokens)} /> : null}
                        {headerNode}
                        {/* The rows scroll if they overflow the viewport (a long action list).
                            rowsContent spaces the rows on iOS (the detached-capsule gap);
                            web/Android leave it undefined so the rows stay flush. */}
                        <ScrollView bounces={false} style={{ maxHeight: 360 }}>
                          {/* RippleClip clips the Android bounded-ripple action rows to the
                              card's rounded top corners (a no-op on iOS/web). It also carries
                              the iOS detached-capsule gap (skin.rowsContent), moved off the
                              ScrollView's contentContainer so it now spaces the rows inside
                              the clip and iOS layout is unchanged. */}
                          <RippleClip
                            shape={cornerRadii(skin.actionsCard(tokens))}
                            style={[skin.rowsContent, { alignSelf: "stretch" }]}
                          >
                            {actionRows}
                          </RippleClip>
                          {/* Android: Cancel is the last row in the same sheet. */}
                          {skin.cancelLayout === "lastRow" ? (
                            <Fragment>
                              {skin.divider ? <View style={skin.divider(tokens)} /> : null}
                              {cancelRow}
                            </Fragment>
                          ) : null}
                        </ScrollView>
                      </GlassSurface>
                      {/* iOS/web: Cancel is a separate rounded card below the actions card. */}
                      {skin.cancelLayout === "separateCard" && skin.cancelCard ? (
                        <GlassSurface style={skin.cancelCard(tokens)}>{cancelRow}</GlassSurface>
                      ) : null}
                    </View>
                  </SafeAreaView>
                </Animated.View>
              </View>
            </KeyboardAvoidingView>
            </GlassModalBlurTarget>
            </EscapeLayerProvider>
          </SafeAreaProvider>
        </Modal>
      </Fragment>
    );
  };
}
