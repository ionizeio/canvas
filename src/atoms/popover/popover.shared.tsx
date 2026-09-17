import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { type Role } from "react-native";
import { View, Text, GlassSurface, AnchoredOverlay, useOverlayHost, useMeasuredWidth, usePopoverFocus, type StyleProp, type ViewStyle } from "../../style/index.js";
import { Button } from "../button/button.js";
import { type PopoverSkin, type Placement } from "./popover.styles.js";
import * as s from "./popover.styles.js";
import { useOverlayAnchor } from "../../style/anchored-overlay.js";
import type { ColorTokens } from "../../style/tokens.js";
import { EntranceReadinessContext } from "../../style/entrance-readiness.js";

function PopoverFocusPanel({ focusRef, children }: { focusRef: RefObject<View | null>; children: ReactNode }) {
  const ready = useContext(EntranceReadinessContext);
  const node = useRef<View | null>(null);
  const [attachment, setAttachment] = useState(0);
  const attach = useCallback((next: View | null) => {
    node.current = next;
    if (next === null) focusRef.current = null;
    else setAttachment(version => version + 1);
  }, [focusRef]);

  useEffect(() => {
    // The controller captures the opener on open, then focuses this same host
    // once its entrance and enclosing overlays have committed their layout.
    // Keep an attached session across a rehold: clearing it would restore focus
    // to the trigger during a refit. Actual host detachment still clears above.
    if (ready && node.current) focusRef.current = node.current;
  }, [ready, attachment, focusRef]);

  return <View ref={attach} tabIndex={-1} role={"dialog" as Role}>{children}</View>;
}

function PopoverArrow({ skin, tokens, placement }: { skin: PopoverSkin; tokens: ColorTokens; placement: Placement }) {
  const { side, centerX, cardWidth } = useOverlayAnchor();
  return skin.arrow?.(tokens, side === "above" ? "top" : placement, centerX != null && cardWidth != null ? { centerX, cardWidth } : undefined) ?? null;
}

// Shared Popover shell. The structure (a trigger paired with a floating card of
// rich content — a heading, supporting text, and an optional action), the public
// boolean-prop API, the placement precedence, the controlled/uncontrolled open
// state, the open/close handlers, the inline (always-visible) mode, and the
// floating-vs-inline overlay behavior all live here once. A platform file
// supplies only its skin (card shape/fill/border, heading/description type, and
// whether an anchor arrow is drawn) and calls createPopover.
//
// The floating card is an overlay surface: the open (triggered) card routes
// through AnchoredOverlay, so with an OverlayProvider mounted (an app root, or a
// docs example stage) it portals over the page anchored below the trigger with
// outside-tap dismissal, and with no provider it falls back to an inline card
// positioned absolutely below the trigger (the kit's pre-portal behavior). The
// static `inline` mode is a plain in-flow panel and never portals.
//
// Axes:
//
// - Placement (pick one; default is `bottom`): `top` > `bottom`. The card always
//   anchors BELOW the trigger (AnchoredOverlay's below-anchoring); placement drives
//   which edge the iOS arrow rides (up toward the trigger for `bottom`). Genuine
//   above-the-trigger `top` anchoring is not yet supported (see the note by the
//   AnchoredOverlay call).
//
// Content props:
//
// - `trigger`: label for the trigger Button (rendered as <Button outline small>).
// - `title`: the popover heading.
// - `description`: the supporting line beneath the title.
// - `children`: custom panel content (an input, a form row, any node), rendered
//   in the card body between the description and the action row. Composes with
//   the data-driven props — pass any subset of the four.
// - `actionLabel`: when set, renders a <Button primary small> action row.
//
// State:
//
// - `open` (default false, uncontrolled via the trigger): when true, the floating
//   card is shown below the trigger; when false, only the trigger renders.

export interface PopoverProps {
  /** Label for the trigger button. */
  trigger?: string;
  /** Heading shown at the top of the floating card. */
  title?: string;
  /** Supporting line beneath the title. */
  description?: string;
  /** Custom panel content (an input, a form row, any node), rendered in the card body between the description and the action row. Composes with the data-driven props. */
  children?: ReactNode;
  /** When set, renders a primary action button at the bottom of the card. */
  actionLabel?: string;
  // Placement (pick one; default is `bottom`). The card anchors below the trigger
  // either way; this picks which edge the iOS arrow rides.
  top?: boolean;
  bottom?: boolean;
  /**
   * Static mode: render the card on its own with no trigger button (an
   * always-visible inline panel). When set, the card is always shown and
   * `open` is ignored.
   */
  inline?: boolean;
  /** Controlled open state. Omit for uncontrolled (the trigger toggles it). */
  open?: boolean;
  /** Fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Placement precedence when more than one is passed: first match wins.
function placementOf(p: PopoverProps): Placement {
  if (p.top) return "top";
  return "bottom";
}

/** Build a Popover component from a platform skin. */
export function createPopover(skin: PopoverSkin) {
  return function Popover(props: PopoverProps) {
    const { trigger, title, description, children, actionLabel, inline, onOpenChange, testID, style } = props;
    const { tokens, surface } = useMaterialTheme({ layer: "functional" });
    const [internalOpen, setInternalOpen] = useState(false);
    // In static (inline) mode the card is always shown; otherwise it is
    // uncontrolled (the trigger toggles it) unless a controlled `open` is passed.
    const open = inline ? true : (props.open ?? internalOpen);
    const setOpen = (next: boolean) => {
      if (props.open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };
    // Escape dismisses the floating card via browser Escape or native accessibility escape. An inline
    // panel is an always-visible surface, not a dismissable overlay, so it
    // never subscribes.
    const escapeScope = useEscapeLayer(open && !inline, () => setOpen(false));
    // Move focus into the panel when the floating card opens and restore it to the
    // trigger on close (non-modal: no focus trap, unlike Dialog). Inline panels are
    // always-visible content, so they never take focus.
    const panelRef = usePopoverFocus(open && !inline);
    // Resolve the placement axis (drives which edge the iOS beak rides; the card
    // itself always anchors below the trigger).
    const placement = placementOf(props);

    // Match the floating card's min width to the trigger, measured off the wrapper
    // (the card portals out, so it never feeds back into this width). The wrapper
    // hugs the trigger, so its laid-out width is the trigger's box.
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();

    // The card body (heading, supporting line, custom content, optional action),
    // shared by the static inline panel and the floating overlay card.
    const panelBody = (
      <>
        {title != null ? <Text style={skin.title(tokens)}>{title}</Text> : null}
        {description != null ? <Text style={skin.description(tokens)}>{description}</Text> : null}
        {children != null ? (
          // The custom-content slot, spaced from the title/description block above
          // it; when children are the panel's first content the margin is omitted.
          <View style={title != null || description != null ? s.bodySlot : null}>{children}</View>
        ) : null}
        {actionLabel != null ? (
          <View style={s.actionRow}>
            <Button primary small onPress={() => setOpen(false)}>
              {actionLabel}
            </Button>
          </View>
        ) : null}
      </>
    );

    // Static (inline) mode: an always-visible in-flow panel with no trigger,
    // arrow, or dismissal. It renders its own GlassSurface card directly rather
    // than through the anchored overlay. The `style` escape hatch composes its
    // outer layout.
    if (inline) {
      return (
        <View testID={testID}>
          <View style={style}>
            <GlassSurface style={skin.card(tokens)}>{panelBody}</GlassSurface>
          </View>
        </View>
      );
    }

    // Triggered mode: a trigger button plus a floating card. The open card routes
    // through AnchoredOverlay (mirroring Dropdown): with an OverlayProvider it
    // portals over the page anchored below the trigger, with outside-tap dismissal;
    // with no provider it falls back to the kit's pre-portal inline anchor
    // (`s.cardFloating`, absolute top:"100%" under the `relative` wrapper).
    // `self-start` keeps the trigger from stretching; `wrapperLifted` lifts the
    // whole overlay above later siblings in that no-provider fallback. The `style`
    // escape hatch composes the wrapper's outer layout.
    return (
      <View
        ref={triggerRef}
        testID={testID}
        style={[s.wrapper, open && !host ? s.wrapperLifted : null, style]}
        onLayout={onTriggerLayout}
      >
        <View style={s.triggerWrap}>
          <Button outline small expanded={open} haspopup="dialog" onPress={() => setOpen(!open)}>
            {trigger ?? "Open popover"}
          </Button>
        </View>

        {/* Hosted cards may flip above when space below is insufficient. The
            beak then follows the actual upper placement. Otherwise `top`
            retains its documented decoration-only behavior. */}
        <AnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          cardWidth={skin.cardWidth}
          gap={skin.arrow != null && surface !== "glass" ? skin.arrowGap ?? 4 : 4}
          cardStyle={[skin.card(tokens), { minWidth: triggerWidth }]}
          inlineStyle={s.cardFloating}
          decoration={skin.arrow != null && surface !== "glass" ? <PopoverArrow skin={skin} tokens={tokens} placement={placement} /> : null}
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={props.open === undefined || onOpenChange !== undefined}
        >
          <EscapeLayerProvider scope={escapeScope}>
          {/* The anchor beak, drawn only when the skin supplies one (iOS) and only in
              SOLID mode. Under glass the beak is intentionally omitted: a flat
              token-filled beak cannot match the Liquid Glass material (GlassView has no
              path mask to extend the material into a beak), and a beak-less floating
              rounded card is exactly how iOS 26 menus read. (It was previously clipped
              away by the GlassSurface clip box anyway; this makes the intent explicit.) */}
          {/* A focusable (tabIndex -1) container so opening the popover moves focus
              here and closing restores it to the trigger (usePopoverFocus). role
              "dialog" pairs with the trigger's aria-haspopup="dialog". */}
          <PopoverFocusPanel focusRef={panelRef}>
            {panelBody}
          </PopoverFocusPanel>
        </EscapeLayerProvider>
        </AnchoredOverlay>
      </View>
    );
  };
}
