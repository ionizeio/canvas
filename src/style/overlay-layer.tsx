// The window layer of an overlay host, and the portal that publishes into a given
// host. Internal: the package index does not export this module, so neither the
// layer nor the host-targeted portal is public API.
//
// Every OverlayProvider sits in one native window, and inside that window the
// OUTERMOST provider is its layer: the provider itself at an app root or at a
// separate window's root (a Modal, `separateWindow`), otherwise the layer of the
// provider above it. A nested provider (a docs example stage, a panel scoping where
// its cards go) is a frame inside that layer, not a window of its own.
//
// The layer matters to a card that closes on an outside tap. An outlet paints above
// its own provider's content and over nothing outside it, so a dismiss backdrop in a
// nested outlet caught taps inside the stage and let every tap beside the stage
// through: an Android popup, a UIKit menu and a web menu all close on a tap anywhere
// in the window, and the kit's did not. AnchoredOverlay therefore publishes such a
// card, with its backdrop, into the layer, and keeps placing it by its nearest host.

import { createContext, type ReactNode, useContext, useId } from "react";
import type { OverlayHost } from "./portal.js";
import { EntranceReadinessContext } from "./entrance-readiness.js";
import { BreakpointOverrideContext } from "./breakpoint-override.js";
import { useTheme } from "./theme.js";
import { ResolvedThemeProvider } from "./theme-context.js";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

/**
 * Inside a card that paints in its window's layer, the provider that card is placed
 * in (its frame). The card's subtree renders in the layer's outlet, so the nearest
 * provider there is the layer; a card opened from inside it reads its frame here
 * instead, and is placed, clamped and capped by the same frame. Null elsewhere.
 */
export const OverlayFrameContext = createContext<OverlayHost | null>(null);

// A host's layer when it is not its own. Keyed weakly, so a provider that unmounts
// takes its entry with it.
const layers = new WeakMap<OverlayHost, OverlayHost>();

/** Record `host`'s place in a window: inside `parent`'s layer, or a layer of its own. */
export function registerOverlayLayer(host: OverlayHost, parent: OverlayHost | null): void {
  if (parent) layers.set(host, overlayLayerOf(parent));
}

/** The outermost host in `host`'s native window (the host itself at a window's root). */
export function overlayLayerOf(host: OverlayHost): OverlayHost {
  return layers.get(host) ?? host;
}

/**
 * Publish `children` into `host`'s outlet for as long as the caller is mounted. The
 * public Portal passes its nearest host; AnchoredOverlay passes the layer it paints in.
 * A null host publishes nothing.
 */
export function usePortalMount(host: OverlayHost | null, children: ReactNode): void {
  const id = useId();
  const entranceReady = useContext(EntranceReadinessContext);
  const breakpoint = useContext(BreakpointOverrideContext);
  const theme = useTheme();

  // Publish the CURRENT children on every render (children is a fresh node each
  // render, so the teleported tree is never stale). Cheap: it sets the provider's
  // registry, not this component's state. A LAYOUT effect, so the outlet's
  // re-render is flushed in the same commit sequence as the publisher's: the
  // teleported tree never lags its owner by a scheduler hop, which on a
  // measure-then-mount opening (an anchored card) was a hop per step, and a
  // frame could paint the owner's state (its backdrop) before the outlet's.
  useIsomorphicLayoutEffect(() => {
    // Registry nodes render in a sibling outlet, so preserve the publisher's
    // resolved theme, simulated breakpoint and entrance readiness: the outlet may
    // be a farther provider than the nearest (a card in its window's layer), above
    // an override the publisher sits under. Keep the providers stable across
    // updates to retain foreground state. Capture targets intentionally come
    // from the outlet: copying the publisher's target can create a native cycle.
    if (!host) return;
    host.mount(id,
      <ResolvedThemeProvider value={theme}>
        <BreakpointOverrideContext.Provider value={breakpoint}>
          <EntranceReadinessContext.Provider value={entranceReady}>{children}</EntranceReadinessContext.Provider>
        </BreakpointOverrideContext.Provider>
      </ResolvedThemeProvider>,
    );
  });

  // Cleanup runs ONLY on true unmount, or when the host changes. Kept separate
  // from the publish effect: a combined effect would tear down and re-add the
  // node every render (flicker, lost focus). A layout effect like the publish,
  // so that when a provider swaps its host the retire from the old host (this
  // cleanup, run in the mutation phase) still precedes the publish to the new
  // one (the layout phase): the two hosts share the provider's registry, and a
  // retire landing after the publish would empty the outlet.
  useIsomorphicLayoutEffect(() => {
    if (!host) return;
    return () => host.unmount(id);
  }, [host, id]);
}

/** Publish `children` into a given host's outlet; renders nothing in place. */
export function PortalInto({ host, children }: { host: OverlayHost; children: ReactNode }) {
  usePortalMount(host, children);
  return null;
}
