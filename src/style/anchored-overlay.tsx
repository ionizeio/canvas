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
import { Animated, View, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle, type ViewProps } from "react-native";
import { Portal, useOverlayHost, type OverlayHost } from "./portal.js";
import { GlassSurface } from "./glass-surface/glass-surface.js";
import { MaterialOriginContext, PlainSurface, hostStyleBesideMaterial, materialShapeStyle, type GlassLayer } from "./glass-surface/glass-surface.shared.js";
import { Entrance } from "./entrance.js";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { fitOverlayHeight, type OverlaySide } from "./overlay-layout.js";
import { OverlayScrollContext, OverlayScrollView } from "./overlay-scroll.js";
import { useMaterialTheme } from "./glass-surface/use-material-theme.js";
import { MaterialMotionContext, PopupInteractionContext, PopupMotionPolicy, StationaryEntranceContext, coverStandoff, restingRadius, usePopupMotion, usePopupPresence, type PopupEdge, type PopupOrigin, type PopupSize } from "./popup-motion.js";
import type { PopupHandoff } from "./popup-handoff.js";
import { PortalActivationContext } from "./portal-activation.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

const OverlaySideContext = createContext<{ side: OverlaySide; centerX?: number; cardWidth?: number }>({ side: "below" });
/** The actual collision-resolved edge for a card's directional decoration. */
export const useOverlaySide = () => useContext(OverlaySideContext).side;
/** Trigger center in card-local coordinates for collision-aware decorations. */
export const useOverlayAnchor = () => useContext(OverlaySideContext);

// A transparent layer filling the outlet: it catches a tap anywhere off the card
// and dismisses. Transparent (no fill) — anchored menus don't dim the page.
const BACKDROP: ViewStyle = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 };
// The rows' focus wrapper (see PopupCard): shrinkable like the rows' host above it,
// so a capped card's scrollport still shrinks to the cap through it.
const rowsFocus: ViewStyle = { flexShrink: 1, minHeight: 0 };

export interface AnchoredOverlayProps {
  /** Whether the card is shown. */
  open: boolean;
  /** Called when a tap off the card should dismiss it. */
  onDismiss: () => void;
  /** Native accessibility escape for the owning overlay scope. */
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  /** Ref to the trigger view the card anchors below. */
  triggerRef: RefObject<View | null>;
  /**
   * Gap between the trigger's bottom edge and the card's top (default 4). Under an
   * active hand-off (`handoff.fromTrigger`, a below or above placement) the card
   * rests OVER the trigger's box instead (`coverStandoff`), the way the iOS 26 menu
   * rests over its button; the gap still governs the solid, reduced-motion and
   * inline cases, where the trigger stays visible under the card.
   */
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
  /**
   * The button-to-menu hand-off channel of a Dropdown-class owner (popup-handoff.tsx):
   * the pane's travel value shared with the trigger, and, while `fromTrigger`, the
   * trigger's measured frame as the material's origin. Hosted only: the inline
   * fallback has no measured trigger frame and keeps the anchor-edge bloom. Internal.
   */
  handoff?: PopupHandoff;
}

export function AnchoredOverlay({
  open: requestedOpen,
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
  handoff,
}: AnchoredOverlayProps) {
  const parentInteractive = useContext(PopupInteractionContext);
  const open = requestedOpen && parentInteractive;
  const host = useOverlayHost();
  const liquid = useContext(PopupMotionPolicy) && !opaque;
  const presence = usePopupPresence(open, liquid);
  // A nested public helper must not inherit the owning component's activation.
  const body = <PopupMotionPolicy.Provider value={false}>{children}</PopupMotionPolicy.Provider>;

  // No provider: render the card inline in place, exactly as the kit did before
  // the portal layer (absolute anchor under the trigger, no backdrop). The card
  // pops open from the trigger corner (Entrance owns the absolute anchor position).
  if (!host) {
    if (!presence.present) return null;
    return liquid ? (
      <PopupCard open={open} opening={presence.opening} onExited={presence.finish} wrapperStyle={inlineStyle} cardStyle={cardStyle} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} decoration={decoration} onAccessibilityEscape={onAccessibilityEscape}>{body}</PopupCard>
    ) : (
      <Entrance anchor style={inlineStyle}>
        <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cardStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} decoration={decoration}>{body}</OverlayCard>
      </Entrance>
    );
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
      liquid={liquid}
      handoff={handoff}
    >
      {body}
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
  beside = false,
  onMount,
  children,
  decoration,
  ownsScroll,
  onLayout,
  onAccessibilityEscape,
  ready = true,
  opening = 0,
  open = true,
  foreground,
  unclipped = false,
}: {
  cardStyle?: StyleProp<ViewStyle>;
  opaque?: boolean;
  dense?: boolean;
  /**
   * The card's material is painted by a sibling (a liquid popup's, see PopupCard):
   * the host is the plain box with the fill, the border colours and the shadow the
   * material carries dropped, exactly the host GlassSurface would render.
   */
  beside?: boolean;
  onMount?: () => void;
  children: ReactNode;
  decoration?: ReactNode;
  ownsScroll?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
  ready?: boolean;
  opening?: number;
  open?: boolean;
  /**
   * The motion of the card's FOREGROUND (its decoration and its scrollport with the
   * rows) while a liquid popup opens: the rows scale and fade with the material
   * (`usePopupMotion`'s `content`). It wears a wrapper OUTSIDE the scrollport: the
   * port clips to its own box, so rows scaled inside it toward a trigger above the
   * card lost their top rows at the port's edge (the first row was missing from
   * every birth frame of the 2026-09-20 recordings). Absent, the foreground is the
   * plain tree, byte for byte.
   */
  foreground?: Animated.WithAnimatedValue<ViewStyle>;
  /**
   * Whether the host's own clip is lifted: a foreground travelling toward its
   * trigger leaves the card's box, and a skin that clips its rows to its corners
   * (the iOS menu) would cut it there. Lifted only while the foreground moves.
   */
  unclipped?: boolean;
}) {
  // Latch the callback so the usual fresh-closure-per-render caller cannot re-arm
  // the effect; it must fire once per opening, not once per render.
  const mount = useRef(onMount);
  mount.current = onMount;
  const notified = useRef<number | null>(null);
  const entranceReady = useContext(EntranceReadinessContext);
  useEffect(() => {
    // The owner's fitted placement and Entrance's own layout must both be
    // committed before focus enters the card. Ancestor readiness propagates
    // through nested entrances without replaying a notified opening.
    if (open && ready && entranceReady && notified.current !== opening) {
      notified.current = opening;
      mount.current?.();
    }
  }, [open, opening, ready, entranceReady]);
  // An opaque card takes the kit's plain surface: one View wearing the skin's
  // style untouched, which is byte for byte what GlassSurface itself renders in
  // solid mode, so an option list looks and lays out the same under either
  // theming surface, and no glass is hand-painted anywhere.
  const content = ownsScroll ? children : <OverlayScrollView>{children}</OverlayScrollView>;
  if (opaque) return <PlainSurface style={cardStyle} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>{decoration}{content}</PlainSurface>;
  // The foreground wrapper is always in a liquid card's tree, the identity while the
  // card has no motion (unmeasured, reduced motion, at rest): a wrapper that appeared
  // with the first measurement would remount the rows and their editor mid-opening.
  if (beside) return (
    <PlainSurface style={[hostStyleBesideMaterial(cardStyle), unclipped ? UNCLIPPED : null]} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>
      <Animated.View style={[FOREGROUND, foreground ?? null]}>{decoration}{content}</Animated.View>
    </PlainSurface>
  );
  return <GlassSurface layer={dense ? "dense" : "functional"} style={cardStyle} onLayout={onLayout} onAccessibilityEscape={onAccessibilityEscape}>{decoration}{content}</GlassSurface>;
}

// The moving foreground's wrapper passes the card's sizing through to the scrollport
// (a content-sized port that shrinks to the card's cap and never grows).
const FOREGROUND: ViewStyle = { flexShrink: 1, minHeight: 0 };
const UNCLIPPED: ViewStyle = { overflow: "visible" };

// Readiness inside the card is the Entrance's own layout readiness AND the
// material's: a solid card (no material motion) still waits for its layout
// before focus enters, exactly as the legacy path did, and a glass card waits
// for both. Reading the context here, inside the Entrance, keeps its gate.
function MaterialReadiness({ readable, children }: { readable: boolean; children: ReactNode }) {
  const entranceReady = useContext(EntranceReadinessContext);
  return <EntranceReadinessContext.Provider value={entranceReady && readable}>{children}</EntranceReadinessContext.Provider>;
}

/**
 * A stable foreground host with independently animated decorative material. Under
 * glass the material is a SIBLING of the semantic card, filling the card's box in the
 * same wrapper: the card keeps its own clip for its rows (an iOS menu clips its
 * pressed rows to its corners) while the material is free to travel outside the box,
 * which a hand-off needs when it re-forms the trigger's pill above the card.
 */
function PopupCard({
  open, opening, onExited, ready = true, edge = "top", anchorX, anchorY, origin, originLayer, originClear, progress, closing,
  wrapperStyle, cardStyle, dense, onMount, ownsScroll, decoration,
  children, onLayout, onAccessibilityEscape,
}: {
  open: boolean; opening: number; onExited: () => void; ready?: boolean;
  edge?: PopupEdge; anchorX?: number; anchorY?: number;
  /** The trigger's frame, the layer of the material it hands off (none for a bare trigger, which keeps the pane's own fill throughout) and whether that material is clear. */
  origin?: PopupOrigin; originLayer?: GlassLayer; originClear?: boolean; progress?: Animated.Value; closing?: Animated.Value;
  wrapperStyle?: StyleProp<ViewStyle>; cardStyle?: StyleProp<ViewStyle>;
  dense?: boolean; onMount?: () => void; ownsScroll?: boolean; decoration?: ReactNode;
  children: ReactNode; onLayout?: (event: LayoutChangeEvent) => void;
  onAccessibilityEscape?: ViewProps["onAccessibilityEscape"];
}) {
  // This runs in the outlet's safe backdrop context, never the trigger's context.
  const theme = useMaterialTheme({ layer: dense ? "dense" : "functional" });
  const report = useContext(OverlayScrollContext);
  const [size, setSize] = useState<PopupSize>({ width: 0, height: 0 });
  const inheritedReady = useContext(EntranceReadinessContext);
  const liquid = theme.surface === "glass";
  // The droplet the pane opens from eases into the card's own corner; a card with
  // per-corner radii keeps them throughout.
  const radius = restingRadius(cardStyle);
  const motion = usePopupMotion({ open, enabled: liquid, ready: ready && inheritedReady, size, edge, anchorX, anchorY, radius, origin, progress, closing, onExited });
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (open && width > 0 && height > 0) setSize(old => old.width === width && old.height === height ? old : { width, height });
    onLayout?.(event);
  };
  // A closing pane keeps its measured size while its retained foreground is gone:
  // the rows retire at once, the way the native menu's rows vanish in a frame, and
  // a re-render underneath (a select clearing the filter) cannot resize the exit.
  // An OPENING pane keeps its rows in the tree: they scale and fade in with the
  // material (`motion.content`), inert and hidden from assistive tech until it settles.
  const freeze = size.width > 0 && size.height > 0 && !open && !motion.readable && !motion.retiring;
  const frozen = useRef(freeze);
  frozen.current = freeze;
  const visibleReport = useMemo(() => report ? {
    contentHeight: (height: number) => { if (!frozen.current) report.contentHeight(height); },
    viewportHeight: (height: number) => { if (!frozen.current) report.viewportHeight(height); },
  } : null, [report]);
  // The trigger's layer cross-fades with the pane's own while the pane stands in for
  // the trigger's pill; a trigger with no material of its own (a bare icon) has no
  // layer to blend from, so the pane keeps its own fill throughout.
  const blend = useMemo(() => motion.blend && originLayer ? { layer: originLayer, clear: originClear, closing, blend: motion.blend } : null, [motion.blend, originLayer, originClear, closing]);
  // The material's motion: the frame it wears, and the measured card it settles at
  // (the web lens sizes its one filter definition for the latter, see GlassLensLayer).
  const moving = useMemo(() => motion.frame && motion.presence ? { frame: motion.frame, rest: size, presence: motion.presence } : null, [motion.frame, motion.presence, size]);
  const material = liquid ? (
    <MaterialMotionContext.Provider value={moving}>
      <MaterialOriginContext.Provider value={blend}>
        <GlassSurface layer={dense ? "dense" : "functional"} pointerEvents="none" style={[StyleSheet.absoluteFill, materialShapeStyle(cardStyle)]} />
      </MaterialOriginContext.Provider>
    </MaterialMotionContext.Provider>
  ) : null;
  return (
    <StationaryEntranceContext.Provider value={liquid}>
      <PopupInteractionContext.Provider value={open}>
      <Entrance anchor anchorBottom={edge === "bottom"} ready={ready} style={wrapperStyle}>
        <MaterialReadiness readable={motion.readable}>
          {material}
          <OverlayScrollContext.Provider value={visibleReport}>
          <OverlayCard
            cardStyle={[cardStyle, freeze ? { width: size.width, height: size.height } : null]}
            dense={dense} beside={liquid} onMount={onMount} opening={opening} open={open}
            ownsScroll={ownsScroll} decoration={decoration} onLayout={measure}
            onAccessibilityEscape={open && motion.readable ? onAccessibilityEscape : undefined}
            foreground={motion.content ?? undefined} unclipped={motion.content != null && !motion.readable}
          >
            <View
              style={[{ flexShrink: 1, display: freeze ? "none" : "flex", pointerEvents: motion.readable ? "auto" : "none" }, motion.content ? null : { opacity: motion.readable ? 1 : 0 }]}
              accessibilityElementsHidden={!motion.readable}
              importantForAccessibility={motion.readable ? "auto" : "no-hide-descendants"}
              aria-hidden={!motion.readable}
            >
              {/* The rows are blurred at the droplet's birth and sharpen on their own
                  clock, and blur and fade into ghosts on a dismiss (they stay in the tree
                  while `retiring`). The blur is a `filter`, which no native driver
                  animates and which may not share a node with the native-driven opacity
                  and transform of the foreground, so it wears a wrapper of its own on
                  the JS driver (a handful of frames per opening and per dismiss). The
                  wrapper is always in the tree (a wrapper that appeared with the first
                  measurement would remount the rows mid-opening) and is the identity,
                  no filter, at rest and in a card that is not moving. */}
              <Animated.View style={[rowsFocus, motion.focus ? { filter: motion.focus.filter, opacity: motion.focus.opacity } as unknown as ViewStyle : null]}>{children}</Animated.View>
            </View>
          </OverlayCard>
          </OverlayScrollContext.Provider>
        </MaterialReadiness>
      </Entrance>
      </PopupInteractionContext.Provider>
    </StationaryEntranceContext.Provider>
  );
}

interface HostedProps {
  liquid?: boolean;
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
  handoff?: PopupHandoff;
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

/**
 * The trigger's frame in the card's coordinates for a hand-off (pure, so the geometry
 * is testable): the measured trigger rect less the card's outlet position, with the
 * corner the trigger reported, capped at the capsule the box allows, and whether the
 * trigger is a whole one (a pill) or a field (see `PopupOrigin.whole`). Undefined
 * until the card's position is known, or when the popup does not take the trigger as
 * origin.
 */
export function popupOrigin(rect: Rect | null, cardLeft: number | undefined, cardTop: number | undefined, radius: number | undefined, whole = true, clear = false): PopupOrigin | undefined {
  if (!rect || cardLeft == null || cardTop == null) return undefined;
  const capsule = Math.min(rect.width, rect.height) / 2;
  return { x: rect.x - cardLeft, y: rect.y - cardTop, width: rect.width, height: rect.height, radius: Math.min(radius ?? capsule, capsule), whole, clear };
}

function HostedAnchoredOverlay({ host, open, onDismiss, onAccessibilityEscape, triggerRef, gap, cardStyle, dismissable, cardWidth, centered, preferSide, alignEnd, rtl, opaque, dense, onCardMount, ownsScroll, children, decoration, liquid = false, handoff }: HostedProps) {
  const presence = usePopupPresence(open, liquid);
  const isOpen = useRef(open);
  isOpen.current = open;
  const [rect, setRect] = useState<Rect | null>(null);
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

  useEffect(() => host.subscribeLayout?.(() => setLayoutRevision((revision) => revision + 1)), [host]);

  useIsomorphicLayoutEffect(() => {
    if (!presence.present) {
      setRect(null);
      setOutlet(null);
      setSizes({ content: null, viewport: null, card: null, width: null, cap: null });
      lastSide.current = "below";
      revealed.current = false;
      return;
    }
    if (!open) return;
    let cancelled = false;
    let landed = false;
    let raf = 0;
    // The trigger's box, the outlet's box and the visible band are three
    // independent reads, so they are issued together and joined, not chained:
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
        let band: { y: number; height: number } | null = null;
        const settle = () => {
          if (cancelled || landed || !triggerBox || !outletBox) return;
          // A host without a visible band is bounded by its outlet.
          const visible = host.measureVisibleBounds ? band : { y: outletBox.y, height: outletBox.height };
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
        };
        trigger.measureInWindow((x, y, w, h) => {
          triggerBox = { x, y, width: w, height: h };
          settle();
        });
        host.measureOutlet((x, y, w, h) => {
          outletBox = { x, y, width: w, height: h };
          settle();
        });
        host.measureVisibleBounds?.((bounds) => {
          band = bounds;
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
    attempt();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [open, presence.present, width, height, host, triggerRef, gap, layoutRevision]);

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
  // The card's standoff from its trigger: under a hand-off the card rests OVER the
  // trigger's box (a negative standoff, see `handoff.cover`), so the pane's near
  // edge rises over the trigger's spot as the drop grows and the rows sit where the
  // trigger was; otherwise the owner's gap. A card placed beside its trigger
  // (`preferSide`) keeps its gap: the cover is along the anchor axis only.
  const covering = !!handoff?.fromTrigger && !preferSide;
  const standoff = covering && rect ? coverStandoff(rect.height, gap) : gap;
  const horizontal = rect ? placeOverlay(rect, { cardWidth: fittedCardWidth, centered, preferSide, alignEnd, rtl, gap: standoff, outletWidth }) : null;
  const renderedCardWidth = sizes.width ?? fittedCardWidth;
  const cardLeft = horizontal?.left ?? (horizontal?.right != null && outletWidth != null && renderedCardWidth != null ? outletWidth - horizontal.right - renderedCardWidth : undefined);
  const anchorCenter = rect && cardLeft != null ? rect.x + rect.width / 2 - cardLeft : undefined;
  // Host bounds are measured in one native window and inherited through
  // content-sized providers; the card does not guess keyboard/screen offsets.
  const fit = rect && outlet ? fitOverlayHeight({ triggerTop: rect.y, triggerHeight: rect.height, outletHeight: outlet.height, visibleTop: outlet.visibleTop, visibleBottom: outlet.visibleBottom, desiredHeight, currentSide: lastSide.current, gap: standoff, beside: preferSide && horizontal?.top === rect.y }) : null;
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
  const positioned = !!(rect && horizontal && fit);
  const finishPresence = presence.finish;
  useEffect(() => {
    if (!open && !positioned) finishPresence();
  }, [open, positioned, finishPresence]);
  const beside = !!(preferSide && rect && horizontal?.top === rect.y && cardLeft != null);
  const edge: PopupEdge = beside ? cardLeft! >= rect!.x + rect!.width ? "left" : "right" : fit?.side === "above" ? "bottom" : "top";
  const cardTop = fit?.top ?? (outlet && fit?.bottom != null && sizes.card != null ? outlet.height - fit.bottom - sizes.card : undefined);
  const anchorY = rect && cardTop != null ? rect.y + rect.height / 2 - cardTop : undefined;
  const wrapperStyle: ViewStyle = { position: "absolute", left: horizontal?.left, right: horizontal?.right, top: fit?.top, bottom: fit?.bottom };
  // The hand-off's origin: the trigger's box in the card's coordinates, wearing the
  // pill's corner (never past a capsule's), a whole trigger unless the owner is a
  // field. Memoised on its numbers so the motion graph is not rebuilt by a render
  // that moved nothing.
  const origin = useMemo<PopupOrigin | undefined>(
    () => popupOrigin(handoff?.fromTrigger ? rect : null, cardLeft, cardTop, handoff?.shape.current?.radius, !handoff?.field, !!handoff?.shape.current?.clear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handoff?.fromTrigger, handoff?.field, rect?.x, rect?.y, rect?.width, rect?.height, cardLeft, cardTop],
  );

  if (!presence.present) return null;

  return (
    <PortalActivationContext.Provider value={liquid ? presence.opening : null}>
    <Portal>
      {/* The dismiss backdrop only earns its keep when a tap on it can close the
          card; a non-dismissable overlay renders without it so the page under an
          always-open card stays interactive. */}
      {open && dismissable ? <Pressable accessible={false} focusable={false} tabIndex={-1} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden style={BACKDROP} onPress={onDismiss} /> : null}
      {/* Hold the card until the first measurement lands, so it never flashes at
          (0,0). The backdrop above is transparent, so a frame before the card
          shows nothing. */}
      {rect && horizontal && fit ? (
        <OverlaySideContext.Provider value={anchorGeometry}>
          <OverlayScrollContext.Provider value={report}>
            {liquid ? <PopupCard open={open} opening={presence.opening} onExited={presence.finish} ready={measured} edge={edge} anchorX={anchorCenter} anchorY={anchorY} origin={origin} originLayer={origin ? handoff?.shape.current?.layer : undefined} originClear={origin?.clear} progress={handoff?.progress} closing={handoff?.closing} wrapperStyle={wrapperStyle} cardStyle={cappedStyle} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} decoration={decoration} onLayout={onCardLayout} onAccessibilityEscape={onAccessibilityEscape}>{children}</PopupCard> : <Entrance anchor anchorBottom={fit.side === "above"} ready={measured} style={wrapperStyle}>
              <OverlayCard onAccessibilityEscape={onAccessibilityEscape} cardStyle={cappedStyle} opaque={opaque} dense={dense} onMount={onCardMount} ownsScroll={ownsScroll} onLayout={onCardLayout} ready={measured} decoration={decoration}>{children}</OverlayCard>
            </Entrance>}
          </OverlayScrollContext.Provider>
        </OverlaySideContext.Provider>
      ) : null}
    </Portal>
    </PortalActivationContext.Provider>
  );
}
