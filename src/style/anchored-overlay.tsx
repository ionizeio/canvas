// AnchoredOverlay: a floating card fitted beside a trigger, with
// cross-platform outside-tap dismissal, from RN primitives only.
//
// Android's hardware back dismisses an open card too, on both paths below: it is
// the platform's own "back out of this", so it closes the menu and never reaches
// the navigator underneath (a page that went back with its menu still open was the
// bug). The press routes through the owner's escape scope, the same request an
// iOS accessibility escape makes, so a card nested in another overlay closes first.
//
// When an <OverlayProvider> is mounted (an app root, or a docs example stage),
// the card plus a full-bleed dismiss backdrop are portaled into an outlet and
// the card is positioned at the trigger's coordinates measured RELATIVE TO the
// outlet (measureInWindow on both, subtract). So the card escapes the trigger's
// bounds with NO position:"fixed" and NO Platform.OS branch, and a tap anywhere
// off the card dismisses it on every platform.
//
// Which outlet: the nearest provider is the FRAME the card is placed in (its
// edges clamp the card, its visible band caps it), and a card that can close
// paints in its window's LAYER, the outermost provider (src/style/overlay-layer.tsx),
// so its backdrop covers the whole window and not only a nested provider's box (a
// docs stage caught taps inside itself and let a tap beside it through). The card's
// frame placement is carried over by the frame's offset inside the layer, so it
// lands exactly where the frame would have put it, as wide as the frame lets it grow.
// While the backdrop is up the page under it takes no touches or wheel, but a
// keyboard or an app can still scroll it, and no layout event reports that, so an
// open card re-reads where its trigger and outlets sit each frame and re-places when
// one of them moved (what an Android PopupWindow does for its anchor). A card opened
// inside such a card keeps the same frame (OverlayFrameContext), not the layer it now
// renders in. A card that cannot close stays in its frame's own outlet and scrolls
// with the content.
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
import { useOverlayHost, type OverlayHost } from "./portal.js";
import { overlayLayerOf, OverlayFrameContext, PortalInto } from "./overlay-layer.js";
import { GlassSurface } from "./glass-surface/glass-surface.js";
import { PlainSurface } from "./glass-surface/glass-surface.shared.js";
import { Entrance } from "./entrance.js";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { fitOverlayHeight, type OverlaySide } from "./overlay-layout.js";
import { OverlayScrollContext, OverlayScrollView } from "./overlay-scroll.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";
import { useHardwareBack } from "./use-hardware-back.js";

const OverlaySideContext = createContext<{ side: OverlaySide; centerX?: number; cardWidth?: number }>({ side: "below" });
/** The actual collision-resolved edge for a card's directional decoration. */
export const useOverlaySide = () => useContext(OverlaySideContext).side;
/** Trigger center in card-local coordinates for collision-aware decorations. */
export const useOverlayAnchor = () => useContext(OverlaySideContext);

// A transparent layer filling the outlet (the window's layer, for a card that can
// close): it catches a tap anywhere off the card and dismisses. Transparent (no
// fill): anchored menus do not dim the page.
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
   * Whether an outside tap or Android's hardware back can actually dismiss the
   * card (default true). Pass false when dismissal is a no-op (a controlled
   * `open` with no change handler, e.g. a docs example pinned open), so the
   * full-bleed dismiss backdrop is skipped instead of silently swallowing every
   * tap under an overlay that can never close, and back is left to the page.
   */
  dismissable?: boolean;
  /**
   * The card's known width, when the caller fixes it. Enables horizontal
   * placement logic: the card is clamped inside the outlet's bounds (8px
   * inset), so a card anchored to a trigger near the outlet's right edge slides
   * left instead of overflowing. Omit it to anchor the card by its leading edge;
   * a card that then renders too wide for the room is pinned by its far edge, 8px
   * inside the outlet, instead (see placeOverlay).
   */
  cardWidth?: number;
  /** With `cardWidth`: center the card on the trigger (tooltip-style) instead
   *  of aligning to its left edge. Still clamped inside the outlet. */
  centered?: boolean;
  /**
   * Align the card's TRAILING edge with the trigger's trailing edge instead of
   * its leading edge (the default). Needs no `cardWidth`: the card is pinned by
   * an inset from the outlet's own edge. A card that renders too wide to fit that
   * way is pinned by its other edge, 8px inside the outlet, instead.
   */
  alignEnd?: boolean;
  /**
   * The active layout direction, for callers that want logical (leading/trailing)
   * horizontal alignment. Leading is physical-left in a left-to-right locale and
   * physical-right in a right-to-left one. Omit to anchor by the physical left.
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
  // The frame the card is placed in: the nearest provider, or, inside a card that paints
  // in its window's layer, that card's own frame.
  const frame = useContext(OverlayFrameContext) ?? host;

  // Hardware back closes a card that can close, hosted or inline. The owner's escape
  // scope takes the request when it passes one (every kit consumer does), so a card
  // open inside another overlay closes before its parent; without one, back does what
  // an outside tap does.
  useHardwareBack(open && dismissable, onAccessibilityEscape ?? onDismiss);

  // No provider: render the card inline in place, exactly as the kit did before
  // the portal layer (absolute anchor under the trigger, no backdrop). Entrance
  // owns the absolute anchor position and holds the card until it is laid out.
  if (!host) {
    return open ? (
      <Entrance style={inlineStyle}>
        <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cardStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} decoration={decoration}>{children}</OverlayCard>
      </Entrance>
    ) : null;
  }

  return (
    <HostedAnchoredOverlay
      host={host}
      frame={frame ?? host}
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
  /** The nearest provider: where a card that cannot close paints. */
  host: OverlayHost;
  /** The provider whose outlet the card is placed in (see AnchoredOverlay's header). */
  frame: OverlayHost;
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

// Where a frame's edges sit inside the layer's outlet, each measured inward from the
// layer's own edge. All zero when the card paints in its frame's own outlet.
interface FrameOffset { left: number; top: number; right: number; bottom: number }
const IN_PLACE: FrameOffset = { left: 0, top: 0, right: 0, bottom: 0 };
// A frame-relative edge distance moved to the layer's edge; an unset edge stays unset.
const toLayer = (edge: number | undefined, offset: number) => (edge == null ? undefined : edge + offset);

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
 * the trailing edge is expressed as a `right` inset from the outlet. Callers
 * that pass neither keep the physical-left anchoring.
 *
 * A card without a caller-fixed width is kept inside the outlet by the width it
 * rendered at (`measuredWidth`, which the hosted overlay reads from the card's own
 * layout before it reveals it). When anchoring it by the trigger would cross the far
 * edge, it is pinned by that far edge instead, 8px inside the outlet, and stays
 * exactly where it was anchored whenever it fits. It is PINNED, not shifted by its
 * width: a content-sized card is as wide as the room its anchor leaves, so moving it
 * over by its measured width would give it more room, let it grow and move it again,
 * a frame at a time. Pinned by the far edge, it takes the width it wants in one layout,
 * and a wider card only confirms the pin. Without a measurement yet, it is placed as
 * anchored.
 */
export function placeOverlay(
  rect: Rect,
  opts: { cardWidth?: number; measuredWidth?: number | null; centered?: boolean; preferSide?: boolean; alignEnd?: boolean; rtl?: boolean; gap: number; outletWidth: number | null },
): { left?: number; right?: number; top: number } {
  const { cardWidth, measuredWidth, centered, preferSide, alignEnd, rtl = false, gap, outletWidth } = opts;
  const below = { left: rect.x, top: rect.y + rect.height + gap };
  // Whether a measured card, placed `offset` in from one outlet edge, would cross the
  // other edge's 8px inset.
  const crosses = (offset: number) =>
    measuredWidth != null && measuredWidth > 0 && outletWidth != null && outletWidth > 0 && offset + measuredWidth + CLAMP_INSET > outletWidth;

  if (alignEnd || rtl) {
    // XOR: the trailing edge is on the right in a left-to-right locale and on
    // the left in a right-to-left one, so leading alignment under RTL pins the
    // right edge for exactly the same reason `alignEnd` does under LTR.
    const pinRight = !!alignEnd !== rtl;
    if (!pinRight) {
      const left = Math.max(0, rect.x);
      return crosses(left) ? { right: CLAMP_INSET, top: below.top } : { left, top: below.top };
    }
    if (outletWidth != null && outletWidth > 0) {
      const right = Math.max(0, outletWidth - (rect.x + rect.width));
      return crosses(right) ? { left: CLAMP_INSET, top: below.top } : { right, top: below.top };
    }
    // Outlet width not measured yet: fall through to the leading-edge anchor
    // rather than guess an inset the card would then jump out of.
  }

  if (cardWidth == null) return crosses(below.left) ? { right: CLAMP_INSET, top: below.top } : below;

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

function HostedAnchoredOverlay({ host, frame, open, onDismiss, onAccessibilityEscape, triggerRef, gap, cardStyle, dismissable, cardWidth, centered, preferSide, alignEnd, rtl, opaque, dense, onCardMount, ownsScroll, children, decoration }: HostedProps) {
  const isOpen = useRef(open);
  isOpen.current = open;
  // The outlet the card paints in: its window's layer when an outside tap can close
  // it, so the backdrop spans the window; otherwise its nearest provider's (see the
  // header). `inPlace` when that is the frame's own outlet.
  const layer = dismissable ? overlayLayerOf(frame) : host;
  const inPlace = layer === frame;
  const [rect, setRect] = useState<Rect | null>(null);
  // Where the frame sits in the layer, measured with the trigger.
  const [frameOffset, setFrameOffset] = useState<FrameOffset>(IN_PLACE);
  // The outlet's width, captured alongside the trigger measure; only needed for
  // width-aware (clamped) placement.
  const [outletWidth, setOutletWidth] = useState<number | null>(null);
  const [outlet, setOutlet] = useState<{ height: number; visibleTop: number; visibleBottom: number } | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  // `cap` is the height cap the card was wearing when it reported `card`; the
  // readiness gate below compares it with the cap the fit now applies.
  const [sizes, setSizes] = useState<{ content: number | null; viewport: number | null; card: number | null; width: number | null; cap: number | null }>({ content: null, viewport: null, card: null, width: null, cap: null });
  const lastSide = useRef<OverlaySide>("below");
  const appliedCap = useRef<number | null>(null);
  const revealed = useRef(false);
  const report = useMemo(() => ({
    contentHeight: (content: number) => { if (isOpen.current) setSizes((previous) => previous.content === content ? previous : { ...previous, content }); },
    viewportHeight: (viewport: number) => { if (isOpen.current) setSizes((previous) => previous.viewport === viewport ? previous : { ...previous, viewport }); },
  }), []);
  const onCardLayout = useCallback((event: LayoutChangeEvent) => {
    if (!isOpen.current) return;
    const { height: card, width: cardWidth } = event.nativeEvent.layout;
    const cap = appliedCap.current;
    setSizes((previous) => previous.card === card && previous.width === cardWidth && previous.cap === cap ? previous : { ...previous, card, width: cardWidth, cap });
  }, []);
  // Re-measure on viewport changes (rotation / resize). Width/height feed the
  // effect deps; the values themselves aren't read.
  const { width, height } = useWindowDimensions();

  useEffect(() => frame.subscribeLayout?.(() => setLayoutRevision((revision) => revision + 1)), [frame]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setRect(null);
      setOutlet(null);
      setFrameOffset(IN_PLACE);
      setSizes({ content: null, viewport: null, card: null, width: null, cap: null });
      lastSide.current = "below";
      revealed.current = false;
      return;
    }
    let cancelled = false;
    let landed = false;
    let raf = 0;
    // The trigger's box, the outlet's box and the visible band (and the layer's
    // outlet, when the card paints there) are independent reads, so they are issued
    // together and joined, not chained:
    // react-native-web answers every measureInWindow on a macrotask of its own,
    // so a chain cost three task hops before the card could mount, and Fabric
    // answers synchronously, so from a layout effect the rect lands inside the
    // same commit as the opening render and the card mounts in that frame.
    // Measuring in the layout phase is sound on both: the DOM read forces layout
    // and Fabric's shadow tree is laid out before layout effects run.
    //
    // Bounded retry: during initial page mount (an overlay that is open on its
    // very first render, e.g. a docs example pinned open) the measure callbacks
    // can silently not complete, or report a zero-size box for a not-yet-laid-out
    // trigger, and a one-shot leaves the card unmounted forever. Re-attempt on a
    // later frame until a real measurement lands, capped so a pathological case
    // (trigger gone while open) cannot spin indefinitely. An attempt whose
    // answers are still in flight is given a few frames before another is
    // issued: on the web the answers are macrotasks that a busy main thread can
    // hold past a frame, and re-issuing every frame meanwhile only piles up
    // duplicate reads. The first landing wins, so a late answer from an earlier
    // attempt never re-places the card.
    let frames = 0;
    let issuedAt = 0;
    let unusable = false;
    const MAX_FRAMES = 60;
    const PATIENCE = 3;
    const attempt = () => {
      if (cancelled || landed) return;
      issuedAt = frames;
      unusable = false;
      const trigger = triggerRef.current;
      if (trigger) {
        let triggerBox: Rect | null = null;
        let outletBox: Rect | null = null;
        let layerBox: Rect | null = null;
        let band: { y: number; height: number } | null = null;
        const settle = () => {
          if (cancelled || landed || !triggerBox || !outletBox || (!inPlace && !layerBox)) return;
          // A host without a visible band is bounded by its outlet.
          const visible = frame.measureVisibleBounds ? band : { y: outletBox.y, height: outletBox.height };
          if (!visible) return;
          // A zero box is a trigger that has not been laid out yet: try again next frame.
          if (triggerBox.width === 0 && triggerBox.height === 0) { unusable = true; return; }
          landed = true;
          // measureInWindow on BOTH the trigger and the outlet, then subtract, gives
          // the trigger's box relative to the outlet, correct for a screen-level
          // host and a stage-scoped one alike, with scroll offsets cancelling out.
          setRect({ x: triggerBox.x - outletBox.x, y: triggerBox.y - outletBox.y, width: triggerBox.width, height: triggerBox.height });
          setOutletWidth(outletBox.width);
          setOutlet({ height: outletBox.height, visibleTop: visible.y - outletBox.y, visibleBottom: visible.y + visible.height - outletBox.y });
          // Everything above is in the frame's coordinates, as if the card painted in
          // the frame; the offset moves the result to the layer the card paints in
          // (only measured when that is another outlet).
          setFrameOffset(!layerBox ? IN_PLACE : {
            left: outletBox.x - layerBox.x,
            top: outletBox.y - layerBox.y,
            right: layerBox.x + layerBox.width - (outletBox.x + outletBox.width),
            bottom: layerBox.y + layerBox.height - (outletBox.y + outletBox.height),
          });
          follow(trigger, placed(triggerBox, outletBox, layerBox));
        };
        trigger.measureInWindow((x, y, w, h) => {
          triggerBox = { x, y, width: w, height: h };
          settle();
        });
        frame.measureOutlet((x, y, w, h) => {
          outletBox = { x, y, width: w, height: h };
          settle();
        });
        frame.measureVisibleBounds?.((bounds) => {
          band = bounds;
          settle();
        });
        if (!inPlace) layer.measureOutlet((x, y, w, h) => {
          layerBox = { x, y, width: w, height: h };
          settle();
        });
      } else unusable = true;
      if (!landed) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      if (cancelled || landed) return;
      frames += 1;
      if (frames >= MAX_FRAMES) return;
      if (unusable || frames - issuedAt >= PATIENCE) attempt();
      else raf = requestAnimationFrame(tick);
    };
    // Where the trigger and the frame sit relative to the outlet the card paints in, and
    // the trigger's size: what the placement above was computed from.
    const placed = (triggerBox: Rect, outletBox: Rect, layerBox: Rect | null) => {
      const paint = layerBox ?? outletBox;
      return [triggerBox.x - paint.x, triggerBox.y - paint.y, triggerBox.width, triggerBox.height, outletBox.x - paint.x, outletBox.y - paint.y];
    };
    // After the card lands, keep reading those each frame and re-place (a new layout
    // revision re-runs this effect) as soon as one moved: nothing else reports a keyboard
    // or programmatic scroll of the content between the trigger and the card's outlet.
    // Reading costs a window measure or three a frame while a card is open; React only
    // commits when something moved.
    const follow = (trigger: View, at: number[]) => {
      const watch = () => {
        if (cancelled) return;
        let triggerBox: Rect | null = null;
        let outletBox: Rect | null = null;
        let layerBox: Rect | null = null;
        const compare = () => {
          if (cancelled || !triggerBox || !outletBox || (!inPlace && !layerBox)) return;
          const now = placed(triggerBox, outletBox, layerBox);
          if (now.some((value, index) => Math.abs(value - at[index]!) > 0.5)) setLayoutRevision((revision) => revision + 1);
          else raf = requestAnimationFrame(watch);
        };
        trigger.measureInWindow((x, y, w, h) => { triggerBox = { x, y, width: w, height: h }; compare(); });
        frame.measureOutlet((x, y, w, h) => { outletBox = { x, y, width: w, height: h }; compare(); });
        if (!inPlace) layer.measureOutlet((x, y, w, h) => { layerBox = { x, y, width: w, height: h }; compare(); });
      };
      raf = requestAnimationFrame(watch);
    };
    attempt();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, width, height, frame, layer, inPlace, triggerRef, gap, layoutRevision]);

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
  const reported = sizes.content !== null && chrome !== null;
  const skinMaxHeight = typeof flatCardStyle?.maxHeight === "number" ? flatCardStyle.maxHeight : Infinity;
  const desiredHeight = reported ? Math.min(sizes.content! + chrome!, skinMaxHeight) : null;
  // A card with no caller-fixed width is kept inside the outlet by the width it
  // rendered at. The reveal below already waits for the card's own layout, which
  // reports that width together with its height, so the card is never shown at a
  // placement it is about to leave.
  const measuredWidth = fittedCardWidth == null ? sizes.width : null;
  const horizontal = rect ? placeOverlay(rect, { cardWidth: fittedCardWidth, measuredWidth, centered, preferSide, alignEnd, rtl, gap, outletWidth }) : null;
  const renderedCardWidth = sizes.width ?? fittedCardWidth;
  const cardLeft = horizontal?.left ?? (horizontal?.right != null && outletWidth != null && renderedCardWidth != null ? outletWidth - horizontal.right - renderedCardWidth : undefined);
  const anchorCenter = rect && cardLeft != null ? rect.x + rect.width / 2 - cardLeft : undefined;
  // Host bounds are measured in one native window and inherited through
  // content-sized providers; the card does not guess keyboard/screen offsets.
  const fit = rect && outlet ? fitOverlayHeight({ triggerTop: rect.y, triggerHeight: rect.height, outletHeight: outlet.height, visibleTop: outlet.visibleTop, visibleBottom: outlet.visibleBottom, desiredHeight, currentSide: lastSide.current, gap, beside: preferSide && horizontal?.top === rect.y }) : null;
  const fittedSide = fit?.side;
  const anchorGeometry = useMemo(() => ({ side: fittedSide ?? "below", centerX: anchorCenter, cardWidth: renderedCardWidth }), [fittedSide, anchorCenter, renderedCardWidth]);
  const cap = fit ? Math.min(fit.maxHeight, skinMaxHeight) : null;
  // The card mounts under the cap of the side it is first fitted to, and its
  // reports can move the fit to the other side with a different cap (a list
  // opened near the bottom of the screen flips above), after which the card
  // lays out again at another height. Readiness waits for that second layout
  // when the new cap is bound to change the card's height (the card stands
  // taller than the new cap, or it was standing at the old cap with content
  // that wants the room the new one gives), so the material never starts
  // growing toward a size and edge the card is about to leave. A cap change
  // that cannot move the card reveals at once, so nothing waits for a layout
  // that will never come. Once revealed, an opening stays ready: a filter that
  // flips the side mid-interaction must never hide the card again.
  const cappedBefore = sizes.cap !== null && sizes.card !== null && Math.abs(sizes.card - sizes.cap) <= 0.5;
  const willShrink = cap !== null && sizes.card !== null && sizes.card > cap + 0.5;
  const willGrow = cappedBefore && cap !== null && cap > sizes.cap! + 0.5 && desiredHeight !== null && desiredHeight > sizes.cap! + 0.5;
  const settled = sizes.cap === cap || !(willShrink || willGrow);
  const measured = reported && (revealed.current || settled);
  useIsomorphicLayoutEffect(() => {
    appliedCap.current = cap;
    if (open && measured) revealed.current = true;
  });
  useEffect(() => {
    if (open && measured && fittedSide) lastSide.current = fittedSide;
  }, [open, measured, fittedSide]);
  const cappedStyle = fit ? [fittedCardStyle, { maxHeight: cap! }] : fittedCardStyle;
  // In the frame's own outlet a card anchored by one edge may grow to the frame's far
  // edge; in the layer's outlet that room is the layer's, so it is handed the frame's.
  const anchorEdge = horizontal?.left ?? horizontal?.right;
  const frameRoom = !inPlace && anchorEdge != null && outletWidth != null && outletWidth > 0 ? outletWidth - anchorEdge : undefined;

  if (!open) return null;

  return (
    <PortalInto host={layer}>
      {/* A card opened from inside this one is placed by the same frame, not by the
          layer this one renders in (which would clamp it to the window and drop the
          frame's insets). Only needed when those differ. */}
      <OverlayFrameContext.Provider value={inPlace ? null : frame}>
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
              <Entrance ready={measured} style={{ position: "absolute", left: toLayer(horizontal.left, frameOffset.left), right: toLayer(horizontal.right, frameOffset.right), top: toLayer(fit.top, frameOffset.top), bottom: toLayer(fit.bottom, frameOffset.bottom), maxWidth: frameRoom }}>
                <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cappedStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} onLayout={onCardLayout} ready={measured} decoration={decoration}>{children}</OverlayCard>
              </Entrance>
            </OverlayScrollContext.Provider>
          </OverlaySideContext.Provider>
        ) : null}
      </OverlayFrameContext.Provider>
    </PortalInto>
  );
}
