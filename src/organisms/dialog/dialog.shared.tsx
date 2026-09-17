import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useHardwareBack } from "../../style/use-hardware-back.js";
import { useContext, useId, useState, type ReactNode } from "react";
import { PopupInteractionContext } from "../../style/popup-motion.js";
import { KeyboardAvoidingView, Platform } from "react-native";
import { View, Text, Pressable, RippleClip, cornerRadii, GlassSurface, Entrance, Portal, useDialogFocus, type StyleProp, type ViewStyle } from "../../style/index.js";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import * as s from "./dialog.styles.js";
import { type Size, type DialogSkin } from "./dialog.styles.js";
import { glassMessageStyle } from "../../style/glass-message.js";

// Shared Dialog shell. The structure (an optional trigger plus a modal panel
// centered over a dimmed backdrop, a title, an optional description, an optional
// data-driven Amount/Reason form, and a confirm/cancel footer), the public
// boolean-prop API, the size precedence, the controlled/uncontrolled open state,
// and the action handlers all live here once. A platform file supplies only its
// skin (the backdrop dimming, the card shape/fill/border/shadow, the title/body
// type, and the footer layout) and calls createDialog.
//
// In the docs preview the overlay is rendered INLINE: a contained dim backdrop
// View wraps the centered card, so it reads as a modal within the preview area
// rather than a full-screen portal that would cover it.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf). Axes:
//
// - Confirm intent: `destructive` renders the confirm action for an irreversible
//   action (a destructive Button on web, the `destructive` red on iOS/Android);
//   omit for the default primary confirm.
// - Width (pick one): from narrowest to widest, `xs`, `small`, `medium`,
//   `large`, `wide`; omit for the default panel width (one step wider than
//   `medium`). First-match precedence in that order, so a narrower prop wins if
//   more than one is set.

export interface DialogProps {
  children?: ReactNode;
  // Content (strings, for the children-less / data-driven case).
  title?: string;
  description?: string;
  // Body: render a short form (Amount + Reason fields) inside the panel for
  // the data-driven case.
  withBody?: boolean;
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
  // Confirm intent (default is a primary confirm).
  destructive?: boolean;
  // Width (pick one; default is the standard panel width). First-match
  // precedence: xs, small, medium, large, wide.
  xs?: boolean;
  small?: boolean;
  medium?: boolean;
  large?: boolean;
  wide?: boolean;
  // Action handlers.
  onConfirm?: () => void;
  onCancel?: () => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * Presents the dialog OVER the page instead of inline where it is mounted.
   *
   * The default is a contained overlay: a scrim with its own height, sitting in
   * normal flow, which is what the docs catalogue needs to show a dialog inside
   * an example stage. An application confirming a destructive action needs the
   * opposite, and the inline form is actively wrong there: it appends a scrim
   * wherever the component happens to sit, leaves the page behind scrollable and
   * clickable, and still claims `aria-modal`.
   *
   * With `overlay`, the dialog teleports into the nearest `OverlayProvider` and
   * fills it, so `aria-modal` becomes true rather than aspirational. Mount an
   * `OverlayProvider` at the app root for this to cover the screen.
   */
  overlay?: boolean;
  /**
   * The dialog's accessible name, for the case where `children` supply the panel
   * body. Children REPLACE the built-in title/description, so there is no
   * element left for `aria-labelledby` to point at, and the dialog would
   * otherwise be announced with no name at all. That is merely poor for a
   * `dialog` and invalid for the `alertdialog` a destructive confirm renders.
   */
  accessibilityLabel?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: DialogProps): Size {
  if (p.xs) return "xs";
  if (p.small) return "small";
  if (p.medium) return "medium";
  if (p.large) return "large";
  if (p.wide) return "wide";
  return "default";
}

// Teleports its children into the nearest OverlayProvider when presenting as an
// overlay, and renders them in place otherwise. Keeps the contained default
// byte-for-byte unchanged rather than routing it through the portal layer.
function Present({ overlay, children }: { overlay: boolean; children: ReactNode }) {
  return overlay ? <Portal>{children}</Portal> : <>{children}</>;
}

/** Build a Dialog component from a platform skin. */
export function createDialog(skin: DialogSkin) {
  return function Dialog(props: DialogProps) {
    const {
      children,
      title,
      description,
      withBody,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      trigger,
      open: openProp,
      onOpenChange,
      destructive,
      onConfirm,
      onCancel,
      testID,
      style,
    } = props;
    const theme = useMaterialTheme({ layer: "functional" });
    const { tokens } = theme;

    // Stable, per-instance ids so the panel's title/description can be wired as
    // the dialog's accessible name/description (aria-labelledby/aria-describedby).
    // useId yields one collision-free base per instance.
    const baseId = useId();
    const titleId = `${baseId}-title`;
    const descriptionId = `${baseId}-description`;
    // The demo body's two fields link their visible labels to the inputs below, so
    // each control is announced by name rather than as an unlabeled edit field.
    const amountId = `${baseId}-amount`;
    const reasonId = `${baseId}-reason`;

    // Uncontrolled by default: the trigger opens the dialog and an action closes
    // it; a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const parentInteractive = useContext(PopupInteractionContext);
    const open = parentInteractive && (openProp ?? internalOpen);
    const setOpen = (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };

    const size = sizeOf(props);
    const overlay = props.overlay === true;
    const accessibilityLabel = props.accessibilityLabel;

    const confirm = () => {
      onConfirm?.();
      setOpen(false);
    };
    const cancel = () => {
      onCancel?.();
      setOpen(false);
    };

    // Web focus management for the modal: move focus into the panel on open, trap
    // Tab within it, and return focus to the trigger on close. This focus helper
    // does nothing natively or under SSR. The shared escape scope routes browser
    // Escape and native accessibility escape through the same Cancel policy.
    const panelRef = useDialogFocus(open);
    const escapeScope = useEscapeLayer(open, cancel);
    // Inline catalogue panels do not own page navigation. A presented overlay
    // consumes native Back and lets a nested escape layer dismiss first.
    useHardwareBack(open && overlay, escapeScope.onRequestClose);

    // The confirm/cancel footer. Three platform shapes:
    //   - web (footerKind "buttons", no skin.textButton): the outline Cancel +
    //     primary/destructive Confirm Button row (verbatim Canvas look).
    //   - Android (footerKind "buttons", skin.textButton set): flat text buttons,
    //     Cancel then Confirm, brand-indigo, with a ripple.
    //   - iOS (footerKind "capsules"): a side-by-side row of capsule buttons, a
    //     gray Cancel capsule then a primary (or destructive-red-labeled) Confirm
    //     capsule, no dividers; a pressed capsule dims.
    const footer =
      skin.footerKind === "capsules" ? (
        <View style={skin.footer(tokens)}>
          {/* Cancel capsule (gray) on the left, Confirm capsule (indigo, or gray
              with red label when destructive) on the right. */}
          {(
            [
              { label: cancelLabel, onPress: cancel, confirm: false, dangerous: false },
              { label: confirmLabel, onPress: confirm, confirm: true, dangerous: !!destructive },
            ] as const
          ).map((cap, i) => (
            <Pressable
              key={`${cap.label}-${i}`}
              accessibilityRole="button"
              onPress={cap.onPress}
              style={({ pressed }) => [
                skin.capsule != null ? skin.capsule(tokens, cap.confirm, cap.dangerous) : null,
                skin.capsulePressedOpacity != null && pressed ? { opacity: skin.capsulePressedOpacity } : null,
              ]}
            >
              {skin.capsuleLabel != null ? (
                <Text style={skin.capsuleLabel(tokens, cap.confirm, cap.dangerous)}>{cap.label}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : skin.textButton != null ? (
        <View style={skin.footer(tokens)}>
          {/* Android: flat text buttons, Cancel then Confirm. Each bounded ripple is
              clipped to the br20 outline by its RippleClip parent (a node can't clip
              its own ripple). Bare wrappers — the text buttons are shrink-wrap. */}
          <RippleClip shape={cornerRadii(skin.textButton)}>
            <Pressable
              accessibilityRole="button"
              onPress={cancel}
              android_ripple={skin.textButtonRipple ? skin.textButtonRipple(tokens) : undefined}
              style={skin.textButton}
            >
              {skin.textButtonLabel != null ? (
                <Text style={skin.textButtonLabel(tokens, false)}>{cancelLabel}</Text>
              ) : null}
            </Pressable>
          </RippleClip>
          <RippleClip shape={cornerRadii(skin.textButton)}>
            <Pressable
              accessibilityRole="button"
              onPress={confirm}
              android_ripple={skin.textButtonRipple ? skin.textButtonRipple(tokens) : undefined}
              style={skin.textButton}
            >
              {skin.textButtonLabel != null ? (
                <Text style={skin.textButtonLabel(tokens, !!destructive)}>{confirmLabel}</Text>
              ) : null}
            </Pressable>
          </RippleClip>
        </View>
      ) : (
        <View style={skin.footer(tokens)}>
          {/* Web: outline Cancel + primary/destructive Confirm Button row. */}
          <Button outline small onPress={cancel}>
            {cancelLabel}
          </Button>
          {destructive ? (
            <Button destructive small onPress={confirm}>
              {confirmLabel}
            </Button>
          ) : (
            <Button primary small onPress={confirm}>
              {confirmLabel}
            </Button>
          )}
        </View>
      );

    // Optional trigger button plus the modal. The modal is a contained dim
    // backdrop: a centered scrim with presence in the preview (explicit
    // minHeight) so the panel reads as a modal within the area.
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
            // it. `role` ("dialog", or "alertdialog" for a destructive confirm) +
            // `aria-modal` make web screen readers treat it as a modal dialog and
            // the page behind it as inert; the title/description (when rendered for
            // the data-driven case) are wired as the accessible name/description via
            // aria-labelledby/aria-describedby. `accessibilityViewIsModal` keeps iOS
            // VoiceOver honoring the inert backdrop (RNW drops it, hence the
            // aria-modal alias). On the web the panel below also traps Tab focus and
            // returns focus to the trigger on close (see useDialogFocus).
            role={destructive ? "alertdialog" : "dialog"}
            accessibilityViewIsModal={true}
            onAccessibilityEscape={escapeScope.onAccessibilityEscape}
            aria-modal={true}
            aria-label={accessibilityLabel}
            aria-labelledby={children == null && title != null ? titleId : undefined}
            aria-describedby={children == null && description != null ? descriptionId : undefined}
            style={[
              trigger != null && !overlay ? s.backdropTriggerGap : null,
              overlay ? s.backdropOverlay : s.backdropLayout,
              skin.backdrop(tokens),
            ]}
          >
            <Entrance style={[s.cardSizing, s.cardWidth(size), style]}>
            <GlassSurface style={[s.cardLayout, skin.card(tokens)]}>
              {/* The panel content region: a focusable (tabIndex -1) container the
                  web focus manager pulls focus into and traps Tab within, wrapping
                  the content in a KeyboardAvoidingView so the iOS keyboard never
                  covers a form field (padding behavior on iOS; a plain passthrough
                  View on web/Android). Neither wrapper adds layout of its own. */}
              <View ref={panelRef} tabIndex={-1}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                  {children != null ? (
                    children
                  ) : (
                    <>
                      {title != null ? (
                        <Text nativeID={titleId} role="heading" style={skin.title(tokens)}>
                          {title}
                        </Text>
                      ) : null}
                      {description != null ? (
                        <Text nativeID={descriptionId} style={glassMessageStyle(skin.body(tokens), theme)}>
                          {description}
                        </Text>
                      ) : null}
                      {withBody ? (
                        <View style={skin.formBody}>
                          <Text nativeID={amountId} style={skin.fieldLabel(tokens)}>Amount</Text>
                          <View style={skin.amountRow}>
                            <Text style={glassMessageStyle(skin.currency(tokens), theme)}>$</Text>
                            <Input value="90.00" accessibilityLabel="Amount" aria-labelledby={amountId}/>
                          </View>
                          <Text nativeID={reasonId} style={[skin.fieldLabel(tokens), skin.fieldLabelGap]}>Reason</Text>
                          <Input placeholder="Duplicate charge" accessibilityLabel="Reason" aria-labelledby={reasonId}/>
                        </View>
                      ) : null}
                      {footer}
                    </>
                  )}
                </KeyboardAvoidingView>
              </View>
            </GlassSurface>
            </Entrance>
          </View>
          </EscapeLayerProvider>
          </Present>
        ) : null}
      </View>
    );
  };
}
