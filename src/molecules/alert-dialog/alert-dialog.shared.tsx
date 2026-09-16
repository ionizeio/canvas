import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { type ReactNode, useId, useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Entrance, Portal, Pressable, RippleClip, Text, View, cornerRadii, type StyleProp, type ViewStyle, useDialogFocus, useTheme } from "../../style/index.js";
import { Button } from "../../atoms/button/button.js";
import { Input as WebInput } from "../../atoms/input/input.js";
import * as s from "./alert-dialog.styles.js";
import { type Width, type AlertDialogSkin, type InputComponent } from "./alert-dialog.styles.js";

// Shared AlertDialog shell. The structure (optional trigger + dim backdrop +
// centered card + title/description + optional confirmation field + action row),
// the uncontrolled/controlled open state, the width/destructive precedence, and
// the confirm/cancel handlers live here once; a platform file supplies only its
// skin (card shape, type, action layout, press feedback) and calls
// createAlertDialog.
//
// AlertDialog: a terse yes/no confirmation modal, the compact sibling of Dialog.
// It poses a question (title), an optional short description, and an action row of
// a Cancel plus a single confirm. Reserve it for decisions that must block the
// rest of the app, especially irreversible ones (pass `destructive` to render the
// confirm as a red, destructive action).
//
// In the docs preview the overlay is rendered INLINE: a contained dim backdrop
// View wraps the centered card, so it reads as a modal within the preview area
// rather than a full-screen portal that would cover it.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf). Axes:
//
// - Width: `narrow` < `small` < (default medium) < `large`, the panel max-width.
//   Pass at most one; first match wins in that order (narrow, small, large).
// - Confirm intent: `destructive` renders the confirm action as a destructive
//   action (for an irreversible action); omit for the default primary confirm.

export interface AlertDialogProps {
  // Content (strings).
  title?: string;
  description?: string;
  // Trigger button label. When set, the dialog renders the button and opens
  // itself on press (uncontrolled). Omit when you drive `open` yourself.
  trigger?: string;
  // Action labels.
  confirmLabel?: string;
  cancelLabel?: string;
  // Controlled open state. Omit for uncontrolled (the trigger opens it).
  open?: boolean;
  // Fired when the open state changes (trigger press, confirm, cancel).
  onOpenChange?: (open: boolean) => void;
  // Width (pick one; default is the medium panel).
  narrow?: boolean;
  small?: boolean;
  large?: boolean;
  // Body: render a confirmation field that gates confirm. The user must type the
  // `confirmText` token (default "DELETE") for the confirm action to enable; until
  // it matches exactly, confirm is disabled and `handleConfirm` is a no-op. This is
  // a real safety gate, not a decorative field.
  withInput?: boolean;
  /** The token the confirmation field must match to enable confirm (default
   *  "DELETE"). Only used when `withInput` is set; drives the label, placeholder,
   *  and the gate. */
  confirmText?: string;
  // Confirm intent (default is a primary confirm).
  destructive?: boolean;
  // Action handlers.
  onConfirm?: () => void;
  onCancel?: () => void;
  /**
   * Presents the confirm OVER the page instead of inline where it is mounted.
   *
   * The default is a contained overlay, which the docs catalogue needs to show
   * one inside an example stage. An application asking to confirm a destructive
   * action needs the opposite: inline, the scrim appears wherever the component
   * happens to sit, the page behind stays scrollable and clickable, and the
   * dialog still claims `aria-modal`. Teleports into the nearest
   * `OverlayProvider`; with none in the tree it renders in place.
   */
  overlay?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Width precedence when more than one is passed: first match wins.
function widthOf(p: AlertDialogProps): Width {
  if (p.narrow) return "narrow";
  if (p.small) return "small";
  if (p.large) return "large";
  return "medium";
}

/**
 * Build an AlertDialog component from a platform skin.
 *
 * `Input` is the platform-correct Input atom for the confirmation field
 * (`withInput`). Each platform's thin `.tsx`/`.ios`/`.android` file passes the
 * Input it already resolves for that platform, so the field matches the alert's
 * platform on every build path. This matters for the WEB docs 3-up preview: a
 * bare barrel import always resolves the WEB Input in a browser bundler, which
 * would paint a boxed, blue-focus-ring field inside the iOS/Android rows; the
 * iOS row must show the iOS-styled field (borderless, no focus box). On a real
 * device Metro resolves the right Input by extension regardless, so the default
 * (the web base) is correct there too. Defaults to the web base when omitted.
 */
// Teleports its children into the nearest OverlayProvider when presenting as an
// overlay, and renders them in place otherwise, so the contained default is
// unchanged.
function Present({ overlay, children }: { overlay: boolean; children: ReactNode }) {
  return overlay ? <Portal>{children}</Portal> : <>{children}</>;
}

export function createAlertDialog(skin: AlertDialogSkin, Input: InputComponent = WebInput) {
  return function AlertDialog(props: AlertDialogProps) {
    const {
      title,
      description,
      confirmLabel = "Continue",
      cancelLabel = "Cancel",
      trigger,
      open: openProp,
      onOpenChange,
      withInput,
      confirmText = "DELETE",
      destructive,
      onConfirm,
      onCancel,
      testID,
      style,
    } = props;
    const overlay = props.overlay === true;

    const { tokens } = useTheme();

    // Uncontrolled by default: the trigger opens the dialog and an action closes
    // it; a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const setOpen = (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };

    // Confirmation-field text (only meaningful when `withInput` is set). The
    // confirm action is gated on an exact match with `confirmText`, so the field
    // is a real safety check rather than decorative.
    const [confirmInput, setConfirmInput] = useState("");
    const confirmGated = !!withInput && confirmInput !== confirmText;

    // Stable ids so web screen readers can wire the dialog's accessible name and
    // description (aria-labelledby/aria-describedby) and tie the confirmation
    // label to its field. useId yields one collision-free base per instance.
    const baseId = useId();
    const titleId = `${baseId}-title`;
    const descriptionId = `${baseId}-description`;
    const inputLabelId = `${baseId}-input-label`;

    const width = widthOf(props);

    const handleConfirm = () => {
      // The confirmation field, when present, must match before confirm fires.
      if (confirmGated) return;
      onConfirm?.();
      setConfirmInput("");
      setOpen(false);
    };
    const handleCancel = () => {
      onCancel?.();
      setConfirmInput("");
      setOpen(false);
    };

    // Web focus management for the modal: move focus into the panel on open, trap
    // Tab within it, and return focus to the trigger on close. This focus helper
    // does nothing natively or under SSR. The shared escape scope routes browser
    // Escape and native accessibility escape through the same Cancel policy.
    const panelRef = useDialogFocus(open);
    const escapeScope = useEscapeLayer(open, handleCancel);

    // The action row. iOS renders two capsule buttons side by side (no divider)
    // drawn by the skin; Android renders a right-aligned row of flat M3 TEXT
    // buttons (no fill); web renders a right-aligned row of the shell's Buttons
    // (an outline Cancel + a primary/destructive filled Confirm).
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const actionRow =
      skin.actionLayout === "capsule" ? (
        <View style={skin.capsuleRow!}>
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            android_ripple={ripple}
            style={({ pressed }) => [
              skin.capsuleCell!,
              skin.cancelFill!(tokens),
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
            ]}
          >
            <Text style={skin.cancelLabelStyle!(tokens)}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={confirmGated}
            accessibilityRole="button"
            accessibilityState={{ disabled: confirmGated }}
            aria-disabled={confirmGated || undefined}
            android_ripple={ripple}
            style={({ pressed }) => [
              skin.capsuleCell!,
              skin.confirmFill!(tokens, !!destructive),
              confirmGated ? { opacity: 0.4 } : null,
              !confirmGated && skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
            ]}
          >
            <Text style={skin.confirmLabelStyle!(tokens, !!destructive)}>{confirmLabel}</Text>
          </Pressable>
        </View>
      ) : skin.textButton != null ? (
        // Android (M3): flat TEXT buttons, Cancel then Confirm — no fill, brand
        // `primary` indigo labels, a destructive confirm in the `destructive`
        // red, each with an android_ripple. This keeps the destructive confirm a
        // red LABEL on a transparent button (never a filled red button) and
        // mirrors the plain Dialog's Android footer.
        <View style={skin.actions}>
          {/* Android: the bounded text-button ripple is clipped to the br20 outline by
              this RippleClip parent (a node can't clip its own ripple). Bare wrapper —
              the text button is shrink-wrap with no outer layout to move. */}
          <RippleClip shape={cornerRadii(skin.textButton)}>
            <Pressable
              onPress={handleCancel}
              accessibilityRole="button"
              android_ripple={skin.textButtonRipple ? skin.textButtonRipple(tokens) : undefined}
              style={skin.textButton}
            >
              <Text style={skin.textButtonLabel!(tokens, false)}>{cancelLabel}</Text>
            </Pressable>
          </RippleClip>
          <RippleClip shape={cornerRadii(skin.textButton)}>
            <Pressable
              onPress={handleConfirm}
              disabled={confirmGated}
              accessibilityRole="button"
              accessibilityState={{ disabled: confirmGated }}
              aria-disabled={confirmGated || undefined}
              android_ripple={skin.textButtonRipple ? skin.textButtonRipple(tokens) : undefined}
              style={[skin.textButton, confirmGated ? { opacity: 0.38 } : null]}
            >
              <Text style={skin.textButtonLabel!(tokens, !!destructive)}>{confirmLabel}</Text>
            </Pressable>
          </RippleClip>
        </View>
      ) : (
        <View style={skin.actions}>
          <Button {...skin.cancelButton} small={skin.buttonSmall} onPress={handleCancel}>
            {cancelLabel}
          </Button>
          {destructive ? (
            <Button destructive small={skin.buttonSmall} disabled={confirmGated} onPress={handleConfirm}>
              {confirmLabel}
            </Button>
          ) : (
            <Button primary small={skin.buttonSmall} disabled={confirmGated} onPress={handleConfirm}>
              {confirmLabel}
            </Button>
          )}
        </View>
      );

    // Optional trigger button plus the modal. The modal is a contained dim
    // backdrop: a centered, rounded scrim with presence in the preview (explicit
    // minHeight) so the card reads as a modal within the area.
    return (
      <View testID={testID} style={s.root}>
        {trigger != null ? (
          <View style={s.triggerWrap}>
            <Button outline small onPress={() => setOpen(true)}>
              {trigger}
            </Button>
          </View>
        ) : null}
        {open ? (
          <Present overlay={overlay}>
          <EscapeLayerProvider scope={escapeScope}>
          <View
            // The overlay carries the dialog semantics so assistive tech announces
            // it. `role="alertdialog"` + `aria-modal` make web screen readers treat
            // it as a modal alert dialog and the page behind it as inert; the title
            // (and description, when present) are wired as the accessible name and
            // description via aria-labelledby/aria-describedby. `accessibilityViewIsModal`
            // keeps iOS VoiceOver honoring the inert backdrop. On the web the panel
            // below also traps Tab focus and returns focus to the trigger on close
            // (see useDialogFocus).
            role="alertdialog"
            accessibilityViewIsModal={true}
            onAccessibilityEscape={escapeScope.onAccessibilityEscape}
            aria-modal={true}
            aria-labelledby={title != null ? titleId : undefined}
            aria-describedby={description != null ? descriptionId : undefined}
            style={[
              skin.backdrop,
              trigger != null && !overlay ? s.triggerGap : null,
              overlay ? s.backdropOverlay : { minHeight: 200, minWidth: 0 },
            ]}
          >
            <Entrance style={[s.cardBase, s.panelWidth[width], style]}>
            {/* An alert dialog is an OPAQUE card, on every theming surface. It is
                the prompt that stops the user to confirm a destructive action, so
                it paints the skin's own `popover` fill on a plain box in glass mode
                exactly as in solid mode: under a material the page it interrupts
                reads straight through the very text asking the question. The
                dimming scrim behind it is unaffected. Dialog, ActionSheet and the
                command palette are the glass overlays. */}
            <View style={[s.cardBase, skin.card(tokens)]}>
              {/* The panel content region: a focusable (tabIndex -1) container the
                  web focus manager pulls focus into and traps Tab within, wrapping
                  the content in a KeyboardAvoidingView so the iOS keyboard never
                  covers the confirmation field (padding behavior on iOS; a plain
                  passthrough View on web/Android). Neither wrapper adds layout. */}
              <View ref={panelRef} tabIndex={-1}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                  {title != null ? (
                    <Text nativeID={titleId} role="heading" style={skin.title(tokens)}>
                      {title}
                    </Text>
                  ) : null}
                  {description != null ? (
                    <Text nativeID={descriptionId} style={skin.description(tokens)}>
                      {description}
                    </Text>
                  ) : null}
                  {withInput ? (
                    // The confirmation field is wired to its visible label: the label
                    // Text carries a stable id and the group is associated to it via
                    // aria-labelledby (role="group" so web screen readers name the
                    // field by the visible label, independent of the placeholder).
                    <View
                      style={skin.inputBlock}
                      role="group"
                      aria-labelledby={inputLabelId}
                    >
                      <Text nativeID={inputLabelId} style={skin.inputLabel(tokens)}>
                        Type {confirmText} to confirm
                      </Text>
                      <Input
 value={confirmInput}
 onChangeText={setConfirmInput}
 placeholder={confirmText}
 accessibilityLabel={`Type ${confirmText} to confirm`}
 aria-labelledby={inputLabelId}
/>
                    </View>
                  ) : null}
                  {actionRow}
                </KeyboardAvoidingView>
              </View>
            </View>
            </Entrance>
          </View>
          </EscapeLayerProvider>
          </Present>
        ) : null}
      </View>
    );
  };
}
