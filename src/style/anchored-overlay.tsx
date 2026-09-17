// AnchoredOverlay: a floating card fitted beside a trigger, with
// cross-platform outside-tap dismissal, from RN primitives only.
//
// When an <OverlayProvider> is mounted (an app root, or a docs example stage),
// the card plus a full-bleed dismiss backdrop are portaled into its outlet and
// the card is positioned at the trigger's coordinates measured RELATIVE TO the
// outlet (measureInWindow on both, subtract). So the card escapes the trigger's
// bounds with NO position:"fixed" and NO Platform.OS branch, and a tap anywhere
// off the card dismisses it on every platform.
//
// With no provider it degrades to the kit's pre-portal inline anchor (the
// caller's own absolute top:100% style, passed as `inlineStyle`), so an unhosted
// consumer still renders — just without the over-the-page escape or the backdrop,
// exactly as the kit behaved before the portal layer.
//
// Width is the caller's concern: it already measures its trigger (onLayout) and
// passes the card's width/min-width via `cardStyle`. This helper owns only the
// placement, available height, the backdrop, and the card's surface material.
//
// Surface: an anchored card is a functional-layer overlay, so by default it
// renders through GlassSurface and takes the active material (real Liquid Glass
// on iOS 26+, the lens on Chromium web, a frost elsewhere) whenever the theme's
// surface mode is glass. The OPTION-LIST MENUS ask for the DENSE layer with
// `dense`: a dropdown / select / autocomplete / row menu / split-button overflow
// menu is a card of content rows the user reads and picks from, and the
// functional layer's sheer tint let the page's own rows and rules read straight
// between them. The dense layer is the same material under the model's densest
// tint (glass-tint-dense), so the rows stay legible and the card still refracts
// the page at its rim. Popovers, the command palette, and the calendar peek keep
// the functional layer. `opaque` remains for a consumer that wants the plain
// surface outright: the skin's own `popover` fill on a plain box, in glass mode
// exactly as in solid mode.

import { createContext, type ReactNode, type RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle, type ViewProps } from "react-native";
import { Portal, useOverlayHost, type OverlayHost } from "./portal.js";
import { GlassSurface } from "./glass-surface/glass-surface.js";
import { PlainSurface } from "./glass-surface/glass-surface.shared.js";
import { Entrance } from "./entrance.js";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { fitOverlayHeight, type OverlaySide } from "./overlay-layout.js";
import { OverlayScrollContext, OverlayScrollView } from "./overlay-scroll.js";

const OverlaySideContext = createContext<{ side: OverlaySide; centerX?: number; cardWidth?: number }>({ side: "below" });
/** The actual collision-resolved edge for a card's directional decoration. */
export const useOverlaySide = () => useContext(OverlaySideContext).side;
/** Trigger center in card-local coordinates for collision-aware decorations. */
export const useOverlayAnchor = () => useContext(OverlaySideContext);

// A transparent layer filling the outlet: it catches a tap anywhere off the card
// and dismisses. Transparent (no fill) — anchored menus don't dim the page.
const BACKDROP: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };

export interface AnchoredOverlayProps {
  /** Whether the card is shown. */
  open: boolean;
  /** Called when a tap off the card should dismiss it. */
  onDismiss: () => void;
  /** Native accessibility escape for the owning overlay scope. */
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  /** Ref to the trigger view the card anchors below. */
  triggerRef: RefObject<View | null>;
  /** Gap between the trigger's bottom edge and the card's top (default 4). */
  gap?: number;
  /** The floating card's contents. */
  children: ReactNode;
  /** Non-scrolling card decoration, such as an anchor arrow. */
  decoration?: ReactNode;
  /** Style for the card wrapper (the skin's card fill/border/shadow + width). */
  cardStyle?: StyleProp<ViewStyle>;
  /** The caller's inline absolute anchor (e.g. position:absolute, top:"100%"),
   *  used only in the no-host fallback. */
  inlineStyle?: StyleProp<ViewStyle>;
  /**
   * Whether an outside tap can actually dismiss the card (default true). Pass
   * false when dismissal is a no-op — a controlled `open` with no change handler
   * (e.g. a docs example pinned open) — so the full-bleed dismiss backdrop is
   * skipped instead of silently swallowing every tap under an overlay that can
   * never close.
   */
  dismissable?: boolean;
  /**
   * The card's known width, when the caller fixes it. Enables horizontal
   * placement logic: the card is clamped inside the outlet's bounds (8px
   * inset), so a card anchored to a trigger near the outlet's right edge slides
   * left instead of overflowing. Omit for the legacy left-edge anchoring.
   */
  cardWidth?: number;
  /** With `cardWidth`: center the card on the trigger (tooltip-style) instead
   *  of aligning to its left edge. Still clamped inside the outlet. */
  centered?: boolean;
  /**
   * Align the card's TRAILING edge with the trigger's trailing edge instead of
   * its leading edge (the default). Needs no `cardWidth`: the card is pinned by
   * an inset from the outlet's own edge, so there is no measure-then-shift pass.
   */
  alignEnd?: boolean;
  /**
   * The active layout direction, for callers that want logical (leading/trailing)
   * horizontal alignment. Leading is physical-left in a left-to-right locale and
   * physical-right in a right-to-left one. Omit to keep the legacy physical-left
   * anchoring untouched.
   */
  rtl?: boolean;
  /**
   * With `cardWidth`: prefer placing the card BESIDE the trigger, top-aligned —
   * to its right when the outlet has room there, else to its left, and only
   * when neither side fits, below it (the `centered` treatment). For popovers
   * anchored to small cells (a calendar day peek) where below-the-trigger would
   * cover the grid.
   */
  preferSide?: boolean;
  /**
   * Paint the card as an OPAQUE surface: the skin's own `popover` fill on a
   * plain box, with NO glass material, in glass mode exactly as in solid mode.
   * The kit's own option lists take the dense layer instead (`dense`); this stays
   * for a consumer that wants the plain surface outright. Not a per-component
   * glass prop and no hand-painted glass: it selects the kit's plain surface.
   */
  opaque?: boolean;
  /**
   * Paint the card on the DENSE layer of the glass model: the same material as
   * every anchored card, under the densest tint (`glass-tint-dense`), for the
   * anchored surfaces that are option lists (Dropdown, Select, Autocomplete,
   * RowMenu, SplitButton's overflow menu, the PhoneInput country list, and so the
   * AvatarMenu built on Dropdown). Those cards carry rows the user reads and picks
   * from, and under the functional layer's sheer tint the page behind them read
   * through between the rows; the dense tint keeps them legible while the card
   * still takes the material. Not a per-component glass prop and no hand-painted
   * glass: it selects the layer, and in solid mode it changes nothing. `opaque`
   * wins when both are passed.
   */
  dense?: boolean;
  /**
   * Fired once per opening after the card's children mount and its measured
   * placement is committed. `open` flipping true is not that moment on the hosted
   * path: there the card is held back until the trigger measurement lands, so a
   * caller that moves focus into its content (the WAI-ARIA menu pattern: focus
   * the first row on open) would otherwise focus a card that does not exist yet.
   * This fires on both paths, from an effect inside the card's own subtree.
   * Hosted cards also wait for fitting, so focusing a child cannot scroll the
   * page toward an uncapped, still-invisible card.
   */
  onCardMount?: () => void;
  /** Internal scroll ownership: children always mount one OverlayScrollView. */
  ownsScroll?: boolean;
}

export function AnchoredOverlay({
  open,
  onDismiss,
  onAccessibilityEscape,
  triggerRef,
  gap = 4,
  children,
  decoration,
  cardStyle,
  inlineStyle,
  dismissable = true,
  cardWidth,
  centered = false,
  preferSide = false,
  alignEnd = false,
  rtl = false,
  opaque = false,
  dense = false,
  onCardMount,
  ownsScroll = false,
}: AnchoredOverlayProps) {
  const host = useOverlayHost();

  // No provider: render the card inline in place, exactly as the kit did before
  // the portal layer (absolute anchor under the trigger, no backdrop). The card
  // pops open from the trigger corner (Entrance owns the absolute anchor position).
  if (!host) {
    return open ? (
      <Entrance anchor style={inlineStyle}>
        <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cardStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} decoration={decoration}>{children}</OverlayCard>
      </Entrance>
    ) : null;
  }

  return (
    <HostedAnchoredOverlay
      host={host}
      open={open}
      onDismiss={onDismiss}
      onAccessibilityEscape={onAccessibilityEscape}
      triggerRef={triggerRef}
      gap={gap}
      cardStyle={cardStyle}
      dismissable={dismissable}
      cardWidth={cardWidth}
      centered={centered}
      preferSide={preferSide}
      alignEnd={alignEnd}
      rtl={rtl}
      opaque={opaque}
      dense={dense}
      onCardMount={onCardMount}
      ownsScroll={ownsScroll}
      decoration={decoration}
    >
      {children}
    </HostedAnchoredOverlay>
  );
}

// The floating card itself, shared by the hosted and inline paths so both report
// the same lifecycle. Its mount effect is the ONE instant at which the card's
// contents exist and placement is ready on either path. React attaches every
// descendant's ref before the effect, so callers can safely move focus here.
function OverlayCard({
  cardStyle,
  opaque,
  dense,
  onMount,
  children,
  decoration,
  ownsScroll,
  onLayout,
  onAccessibilityEscape,
  ready = true,
}: {
  cardStyle?: StyleProp<ViewStyle>;
  opaque?: boolean;
  dense?: boolean;
  onMount?: () => void;
  children: ReactNode;
  decoration?: ReactNode;
  ownsScroll?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  ready?: boolean;
}) {
  // Latch the callback so the usual fresh-closure-per-render caller cannot re-arm
  // the effect; it must fire once per opening, not once per render.
  const mount = useRef(onMount);
  mount.current = onMount;
  const notified = useRef(false);
  const entranceReady = useContext(EntranceReadinessContext);
  useEffect(() => {
    // The owner's fitted placement and Entrance's own layout must both be
    // committed before focus enters the card. Ancestor readiness propagates
    // through nested entrances without replaying a notified opening.
    if (ready && entranceReady && !notified.current) {
      notified.current = true;
      mount.current?.();
    }
  }, [ready, entranceReady]);
  // An opaque card takes the kit's plain surface: one View wearing the skin's
  // style untouched, which is byte for byte what GlassSurface itself renders in
  // solid mode, so an option list looks and lays out the same under either
  // theming surface, and no glass is hand-painted anywhere.
  const content = ownsScroll ? children : <OverlayScrollView>{children}</OverlayScrollView>;
  if (opaque) return <PlainSurface style={cardStyle} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>{decoration}{content}</PlainSurface>;
  return <GlassSurface layer={dense ? "dense" : "functional"} style={cardStyle} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>{decoration}{content}</GlassSurface>;
}

interface HostedProps {
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  host: OverlayHost;
  open: boolean;
  onDismiss: () => void;
  triggerRef: RefObject<View | null>;
  gap: number;
  cardStyle?: StyleProp<ViewStyle>;
  dismissable: boolean;
  cardWidth?: number;
  centered?: boolean;
  preferSide?: boolean;
  alignEnd?: boolean;
  rtl?: boolean;
  opaque?: boolean;
  dense?: boolean;
  onCardMount?: () => void;
  ownsScroll?: boolean;
  children: ReactNode;
  decoration?: ReactNode;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Horizontal inset kept between a width-aware card and the outlet's edges.
const CLAMP_INSET = 8;

/**
 * The card's outlet-relative position (pure, so the branch logic is testable).
 *
 * Without a known `cardWidth`: the legacy anchoring, left-aligned below the
 * trigger. With one: the below placement can center on the trigger and is
 * clamped inside the outlet; `preferSide` instead tries beside the trigger,
 * top-aligned — right first, left when the right lacks room, and below (the
 * centered treatment) when neither side fits.
 *
 * `alignEnd`/`rtl` opt into LOGICAL horizontal alignment for the below
 * placement: the card is pinned by its leading edge (default) or its trailing
 * edge (`alignEnd`), and which physical side that is flips with `rtl`. Pinning
 * the trailing edge is expressed as a `right` inset from the outlet, so it needs
 * no card measurement and never runs a measure-then-shift second pass. Callers
 * that pass neither keep the legacy physical-left anchoring byte for byte.
 */
export function placeOverlay(
  rect: Rect,
  opts: { cardWidth?: number; centered?: boolean; preferSide?: boolean; alignEnd?: boolean; rtl?: boolean; gap: number; outletWidth: number | null },
): { left?: number; right?: number; top: number } {
  const { cardWidth, centered, preferSide, alignEnd, rtl = false, gap, outletWidth } = opts;
  const below = { left: rect.x, top: rect.y + rect.height + gap };

  if (alignEnd || rtl) {
    // XOR: the trailing edge is on the right in a left-to-right locale and on
    // the left in a right-to-left one, so leading alignment under RTL pins the
    // right edge for exactly the same reason `alignEnd` does under LTR.
    const pinRight = !!alignEnd !== rtl;
    if (!pinRight) return { left: Math.max(0, rect.x), top: below.top };
    if (outletWidth != null && outletWidth > 0) {
      return { right: Math.max(0, outletWidth - (rect.x + rect.width)), top: below.top };
    }
    // Outlet width not measured yet: fall through to the leading-edge anchor
    // rather than guess an inset the card would then jump out of.
  }

  if (cardWidth == null) return below;

  if (preferSide && outletWidth != null && outletWidth > 0) {
    const right = rect.x + rect.width + gap;
    if (right + cardWidth + CLAMP_INSET <= outletWidth) return { left: right, top: rect.y };
    const left = rect.x - gap - cardWidth;
    if (left >= CLAMP_INSET) return { left, top: rect.y };
  }

  let x = centered || preferSide ? rect.x + rect.width / 2 - cardWidth / 2 : rect.x;
  if (outletWidth != null && outletWidth > 0) x = Math.min(x, outletWidth - cardWidth - CLAMP_INSET);
  return { left: Math.max(CLAMP_INSET, x), top: below.top };
}

function HostedAnchoredOverlay({ host, open, onDismiss, onAccessibilityEscape, triggerRef, gap, cardStyle, dismissable, cardWidth, centered, preferSide, alignEnd, rtl, opaque, dense, onCardMount, ownsScroll, children, decoration }: HostedProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  // The outlet's width, captured alongside the trigger measure; only needed for
  // width-aware (clamped) placement.
  const [outletWidth, setOutletWidth] = useState<number | null>(null);
  const [outlet, setOutlet] = useState<{ height: number; visibleTop: number; visibleBottom: number } | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [sizes, setSizes] = useState<{ content: number | null; viewport: number | null; card: number | null; width: number | null }>({ content: null, viewport: null, card: null, width: null });
  const lastSide = useRef<OverlaySide>("below");
  const report = useMemo(() => ({
    contentHeight: (content: number) => setSizes((previous) => previous.content === content ? previous : { ...previous, content }),
    viewportHeight: (viewport: number) => setSizes((previous) => previous.viewport === viewport ? previous : { ...previous, viewport }),
  }), []);
  const onCardLayout = useCallback((event: LayoutChangeEvent) => {
    const { height: card, width: cardWidth } = event.nativeEvent.layout;
    setSizes((previous) => previous.card === card && previous.width === cardWidth ? previous : { ...previous, card, width: cardWidth });
  }, []);
  // Re-measure on viewport changes (rotation / resize). Width/height feed the
  // effect deps; the values themselves aren't read.
  const { width, height } = useWindowDimensions();

  useEffect(() => host.subscribeLayout?.(() => setLayoutRevision((revision) => revision + 1)), [host]);

  useEffect(() => {
    if (!open) {
      setRect(null);
      setOutlet(null);
      setSizes({ content: null, viewport: null, card: null, width: null });
      lastSide.current = "below";
      return;
    }
    let cancelled = false;
    let raf = 0;
    // Bounded retry: during initial page mount (an overlay that is open on its
    // very first render, e.g. a docs example pinned open) the measure callbacks
    // can silently not complete, or report a zero-size box for a not-yet-laid-out
    // trigger — and a one-shot leaves the card unmounted forever. Re-attempt on
    // the next frame until a real measurement lands, capped so a pathological
    // case (trigger gone while open) cannot spin indefinitely.
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    const attempt = () => {
      if (cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      let landed = false;
      const trigger = triggerRef.current;
      if (trigger) {
        // measureInWindow on BOTH the trigger and the outlet, then subtract, gives
        // the trigger's box relative to the outlet — correct for a screen-level
        // host and a stage-scoped one alike, with scroll offsets cancelling out.
        trigger.measureInWindow((tx, ty, tw, th) => {
          host.measureOutlet((ox, oy, ow, oh) => {
            if (cancelled || (tw === 0 && th === 0)) return;
            const finish = (visible: { y: number; height: number }) => {
              if (cancelled) return;
              landed = true;
              setRect({ x: tx - ox, y: ty - oy, width: tw, height: th });
              setOutletWidth(ow);
              setOutlet({ height: oh, visibleTop: visible.y - oy, visibleBottom: visible.y + visible.height - oy });
            };
            if (host.measureVisibleBounds) host.measureVisibleBounds(finish);
            else finish({ y: oy, height: oh });
          });
        });
      }
      raf = requestAnimationFrame(() => {
        if (!cancelled && !landed) attempt();
      });
    };
    // First attempt on the next frame, so the trigger is laid out before we
    // measure (measuring in the same tick as open returns zeros).
    raf = requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, width, height, host, triggerRef, gap, layoutRevision]);

  // A width-aware card never renders wider than its outlet: when the outlet is
  // narrower than the card plus its edge insets (a phone-width screen or docs
  // stage), the card is clamped to the outlet minus the insets and placeOverlay
  // pins it at the inset. The minWidth in the override also retires any
  // trigger-derived minWidth in cardStyle, which would be unsatisfiable there.
  const flatCardStyle = StyleSheet.flatten(cardStyle);
  const requestedWidth = cardWidth == null ? undefined : Math.max(cardWidth, typeof flatCardStyle?.minWidth === "number" ? flatCardStyle.minWidth : 0);
  const fittedCardWidth =
    requestedWidth != null && outletWidth != null && outletWidth > 0
      ? Math.min(requestedWidth, Math.max(0, outletWidth - 2 * CLAMP_INSET))
      : requestedWidth;
  const fittedCardStyle =
    fittedCardWidth != null && fittedCardWidth !== cardWidth
      ? [cardStyle, { width: fittedCardWidth, minWidth: fittedCardWidth }]
      : cardStyle;

  const chrome = sizes.card !== null && sizes.viewport !== null ? Math.max(0, sizes.card - sizes.viewport) : null;
  const measured = sizes.content !== null && chrome !== null;
  const skinMaxHeight = flatCardStyle?.maxHeight;
  const desiredHeight = measured ? Math.min(sizes.content! + chrome!, typeof skinMaxHeight === "number" ? skinMaxHeight : Infinity) : null;
  const horizontal = rect ? placeOverlay(rect, { cardWidth: fittedCardWidth, centered, preferSide, alignEnd, rtl, gap, outletWidth }) : null;
  const renderedCardWidth = sizes.width ?? fittedCardWidth;
  const cardLeft = horizontal?.left ?? (horizontal?.right != null && outletWidth != null && renderedCardWidth != null ? outletWidth - horizontal.right - renderedCardWidth : undefined);
  const anchorCenter = rect && cardLeft != null ? rect.x + rect.width / 2 - cardLeft : undefined;
  // Host bounds are measured in one native window and inherited through
  // content-sized providers; the card does not guess keyboard/screen offsets.
  const fit = rect && outlet ? fitOverlayHeight({ triggerTop: rect.y, triggerHeight: rect.height, outletHeight: outlet.height, visibleTop: outlet.visibleTop, visibleBottom: outlet.visibleBottom, desiredHeight, currentSide: lastSide.current, gap, beside: horizontal?.top === rect.y }) : null;
  const fittedSide = fit?.side;
  const anchorGeometry = useMemo(() => ({ side: fittedSide ?? "below", centerX: anchorCenter, cardWidth: renderedCardWidth }), [fittedSide, anchorCenter, renderedCardWidth]);
  useEffect(() => {
    if (open && measured && fittedSide) lastSide.current = fittedSide;
  }, [open, measured, fittedSide]);
  const cappedStyle = fit ? [fittedCardStyle, { maxHeight: Math.min(fit.maxHeight, typeof skinMaxHeight === "number" ? skinMaxHeight : Infinity) }] : fittedCardStyle;

  if (!open) return null;

  return (
    <Portal>
      {/* The dismiss backdrop only earns its keep when a tap on it can close the
          card; a non-dismissable overlay renders without it so the page under an
          always-open card stays interactive. */}
      {dismissable ? <Pressable accessible={false} focusable={false} tabIndex={-1} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden style={BACKDROP} onPress={onDismiss} /> : null}
      {/* Hold the card until the first measurement lands, so it never flashes at
          (0,0). The backdrop above is transparent, so a frame before the card
          shows nothing. */}
      {rect && horizontal && fit ? (
        <OverlaySideContext.Provider value={anchorGeometry}>
          <OverlayScrollContext.Provider value={report}>
            <Entrance anchor anchorBottom={fit.side === "above"} ready={measured} style={{ position: "absolute", left: horizontal.left, right: horizontal.right, top: fit.top, bottom: fit.bottom }}>
              <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cappedStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} onLayout={onCardLayout} ready={measured} decoration={decoration}>{children}</OverlayCard>
            </Entrance>
          </OverlayScrollContext.Provider>
        </OverlaySideContext.Provider>
      ) : null}
    </Portal>
  );
}
