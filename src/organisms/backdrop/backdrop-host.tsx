import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createCaptureTarget } from "../../style/glass-surface/capture-target.js";
import { nativeCaptureAvailable } from "../../style/glass-surface/capture-runtime.js";
import { GlassBlurTargetContext } from "../../style/glass-surface/glass-surface.shared.js";
import { GlassBackdropTarget } from "../../style/glass-surface/glass-backdrop-target.js";
import { useWindowDimensions } from "react-native";
import { View } from "../../style/index.js";
import { useHydrated } from "../../style/use-hydrated.js";
import { backdropClock, retainBackdropClock, releaseBackdropClock, type Energy } from "./backdrop-clock.js";
import { type Layer } from "./backdrop-layers.js";
import { SvgBackdrop, BackdropFloor } from "./renderers/svg-backdrop.js";

// One surface, many claimants.
//
// A backdrop is a singleton by nature: it is the whole screen. Without a host, an
// app that mounts one per screen stacks them, and on a stack navigator the hidden
// screens keep theirs alive. That is wasteful under any renderer and actively
// breaks under a GPU one, where each surface is a drawing context and browsers cap
// live WebGL contexts near sixteen before silently dropping the oldest.
//
// So <BackdropHost> at the app root owns the ONE renderer, and every <Backdrop>
// inside it registers its scene and renders nothing. The registry lives in refs
// and the only reader is the sibling surface, which subscribes via
// useSyncExternalStore, so publishing a scene re-renders the surface alone and
// never the claimant's subtree. This is the same shape as src/style/portal.tsx.
//
// Two contracts that callers depend on:
//   - With no host in the tree, <Backdrop> renders inline. An unhosted consumer is
//     never broken, exactly like <Portal>.
//   - The host renders NOTHING while the claim count is zero. Apps gate their
//     backdrop on their own conditions (a surface mode, a focused screen), and
//     those gates must keep working: unmounting the last <Backdrop> has to clear
//     the sky, not leave the root host painting forever.

export interface BackdropClaim {
  layers: Layer[];
  energy: Energy;
  focus: { x: number; y: number };
  /** Global alpha cap from the prominence axis. */
  prominence: number;
  /** A flat colour painted under every layer, or null to ride the theme background. */
  floor: string | null;
  /** Base particle tint when a layer or body does not name its own colour. */
  tint: string;
  still: boolean;
}

interface Registry {
  claim: (key: number, value: BackdropClaim) => void;
  release: (key: number) => void;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => BackdropClaim | null;
}

const HostContext = createContext<Registry | null>(null);

let nextKey = 1;

/** Publish a scene to the nearest host. Returns false when there is no host, in
 *  which case the caller renders the surface itself.
 *
 *  A claim is published from an effect, and effects never run in a server render,
 *  so a host has nothing to paint in the markup it ships: the page would arrive
 *  without its floor, dark-scheme text on a white document until the bundle ran.
 *  So the claimant also answers "not hosted" for the server render and for the
 *  hydration render (which must reproduce the server markup), painting its surface
 *  inline there; the host takes over in the commit right after, when the claim
 *  lands. The two surfaces are the same absolutely positioned box, so the hand-over
 *  moves nothing. Native and plain client renders are hydrated from the first
 *  render and never take the inline path. */
export function useBackdropClaim(value: BackdropClaim): boolean {
  const registry = useContext(HostContext);
  const hydrated = useHydrated();
  const key = useRef<number>(0);
  if (key.current === 0) key.current = nextKey++;

  useEffect(() => {
    if (!registry) return;
    registry.claim(key.current, value);
  });

  useEffect(() => {
    if (!registry) return;
    const k = key.current;
    return () => registry.release(k);
  }, [registry]);

  return registry !== null && hydrated;
}

export interface BackdropHostProps {
  children?: ReactNode;
}

/** Owns the single backdrop surface for an app. Place it once, at the root, with
 *  the app rendered inside it. */
export function BackdropHost({ children }: BackdropHostProps) {
  // An immutable Map snapshot held in a ref; each change swaps in a new Map (new
  // identity) so useSyncExternalStore detects it. Insertion order is preserved,
  // so the most recently mounted claimant wins.
  const claims = useRef<Map<number, BackdropClaim>>(new Map());
  const listeners = useRef<Set<() => void>>(new Set());
  const active = useRef<BackdropClaim | null>(null);

  const emit = useCallback(() => {
    const list = Array.from(claims.current.values());
    const next = list.length === 0 ? null : list[list.length - 1];
    active.current = next;
    listeners.current.forEach((l) => l());
  }, []);

  const registry = useMemo<Registry>(
    () => ({
      claim: (key, value) => {
        const prev = claims.current.get(key);
        if (prev && sameClaim(prev, value)) return;
        claims.current = new Map(claims.current);
        claims.current.set(key, value);
        emit();
      },
      release: (key) => {
        if (!claims.current.has(key)) return;
        claims.current = new Map(claims.current);
        claims.current.delete(key);
        emit();
      },
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
      snapshot: () => active.current,
    }),
    [emit],
  );

  const target = useMemo(createCaptureTarget, []);
  const inheritedTarget = useContext(GlassBlurTargetContext);
  const hasClaim = useSyncExternalStore(registry.subscribe, () => registry.snapshot() !== null, () => false);
  const materialTarget = nativeCaptureAvailable && hasClaim ? target.ref : inheritedTarget;

  return (
    <HostContext.Provider value={registry}>
      <HostSurface registry={registry} targetRef={target.ref} />
      <GlassBlurTargetContext.Provider value={materialTarget}>{children}</GlassBlurTargetContext.Provider>
    </HostContext.Provider>
  );
}

function HostSurface({ registry, targetRef }: { registry: Registry; targetRef: ReturnType<typeof createCaptureTarget>["ref"] }) {
  const claim = useSyncExternalStore(registry.subscribe, registry.snapshot, registry.snapshot);
  // Zero claimants renders nothing, so an app's own gating still clears the sky.
  if (!claim) return null;
  return <GlassBackdropTarget targetRef={targetRef}><BackdropSurface claim={claim} /></GlassBackdropTarget>;
}

/** The actual renderer. Rendered by the host, or inline by an unhosted Backdrop. */
export function BackdropSurface({ claim }: { claim: BackdropClaim }) {
  // The scene is laid out against the surface's OWN box, not the window. A backdrop
  // is usually full-screen and the two agree, but it may equally fill a card or a
  // documentation stage, and sizing to the window there would push most of the field
  // off the visible area. The window is only the pre-measurement fallback, so the
  // first frame is already close instead of collapsed.
  const win = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const width = box?.width || win.width;
  const height = box?.height || win.height;

  const { energy, still } = claim;

  useEffect(() => {
    retainBackdropClock(energy, still ? "poster" : "running");
    return () => releaseBackdropClock(energy);
  }, [energy, still]);

  const clock = backdropClock(energy);

  return (
    <View
      // Decorative throughout: never focusable, never in the accessibility tree.
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => {
        const l = e.nativeEvent.layout;
        if (!l) return;
        const w = Math.round(l.width);
        const h = Math.round(l.height);
        setBox((b) => (b && b.width === w && b.height === h ? b : { width: w, height: h }));
      }}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {claim.floor ? <BackdropFloor color={claim.floor} /> : null}
      <SvgBackdrop
        layers={claim.layers}
        width={width}
        height={height}
        focus={claim.focus}
        clock={clock}
        tint={claim.tint}
        prominence={claim.prominence}
      />
    </View>
  );
}

// Claims republish on every render of a claimant, so a cheap identity check keeps
// the surface from re-rendering when nothing that matters changed.
function sameClaim(a: BackdropClaim, b: BackdropClaim): boolean {
  return (
    a.layers === b.layers &&
    a.energy === b.energy &&
    a.prominence === b.prominence &&
    a.floor === b.floor &&
    a.tint === b.tint &&
    a.still === b.still &&
    a.focus.x === b.focus.x &&
    a.focus.y === b.focus.y
  );
}
