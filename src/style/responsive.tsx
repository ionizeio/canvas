// Desktop-first responsive selection. The `base` value is the desktop case, and a
// breakpoint entry applies at that width AND BELOW, with the smallest matching
// breakpoint winning:
//
//   const direction = useResponsive({ base: "row", sm: "column" });
//   // <View style={{ flexDirection: direction }} />
//
// Only the breakpoints present in the map are considered, mirroring how a
// className like `flex-row sm:flex-col` only flips at the `sm` threshold.
//
// CHOOSING A RESPONSIVENESS MECHANISM (in order of preference):
//
// 1. Intrinsic sizing: can layout alone solve it? A component is FILL or HUG
//    (src/style/sizing.ts) and the parent layout container provides its bounds:
//    a Container step, a Row span, a Grid cell; floating containers (dialogs,
//    palettes) carry `width:"100%"` plus a scale step as `maxWidth`, and Stats use
//    minWidth floors plus flexWrap. Zero JS, zero re-renders, correct in any
//    DEFINITE container, correct on frame one and on the server. The one parent
//    that still collapses `width:"100%"` is a content-sized cell (a bare Column
//    inside a Row); `useFillStyle` warns there in development.
//
// 2. Container measurement: does the component need a discrete layout switch?
//    Measure your OWN width (useContainerBreakpoint / useMeasuredWidth in
//    container.ts), never the window. A component cannot know whether it is on
//    a phone or in a 320px desktop panel; only its container width is truthful
//    (the DataTable precedent). Render the base (desktop) variant on the
//    unmeasured first frame; gate on `measured` only when rendering the wrong
//    variant is worse than rendering nothing (chart geometry).
//
// 3. Viewport breakpoints (this file): is this window-level chrome? Only
//    components whose job is to partition the window itself (the Sidebar's
//    drawer mode, navbars, app shells) and window-anchored overlays may read
//    the viewport. If the component could plausibly sit inside a column, it is
//    not window-level chrome.
//
// The hooks here share ONE Dimensions subscription and re-render their
// consumers only when the active breakpoint BUCKET changes, not on every
// resize pixel. A width of 0 (react-native-web before the DOM exists, i.e.
// SSR and the pre-hydration frame) resolves to `base`: the kit is
// desktop-first, so an unknown viewport renders the desktop variant, and the
// server, the hydration render, and the first client frame agree. SSR apps
// that know they are serving a narrow client can pass ThemeProvider's
// `ssrBreakpoint` to shift that assumption (the `ssrScheme` contract).
//
// Height and orientation are deliberately not modeled: no kit component keys
// layout off viewport height today. Reading raw pixels stays available via the
// `useWindowDimensions` re-export.

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { Dimensions, useWindowDimensions } from "react-native";
import { breakpoints, type BreakpointKey } from "./tokens.js";

export type { BreakpointKey } from "./tokens.js";

/** A value that varies by breakpoint. `base` is the desktop default (required). */
export type Responsive<T> = { base: T } & Partial<Record<BreakpointKey, T>>;

// Ascending by px, so the first match when scanning is the smallest breakpoint
// that still covers the width, which is the one that wins (desktop-first).
const ASCENDING: BreakpointKey[] = ["sm", "md", "lg", "xl", "2xl"];

/** Pure picker: resolve a Responsive map to its active value at the given width.
 *  A non-positive width (unknown viewport: SSR, the pre-layout first frame)
 *  resolves to `base`, the desktop variant. */
export function responsive<T>(width: number, map: Responsive<T>): T {
  if (width <= 0) return map.base;
  for (const bp of ASCENDING) {
    const value = map[bp];
    if (value !== undefined && width <= breakpoints[bp]) {
      return value;
    }
  }
  return map.base;
}

// The active viewport bucket: the smallest breakpoint covering the width, or
// "base" when the viewport is wider than every breakpoint (or still unknown).
function bucketOf(width: number): BreakpointKey | "base" {
  if (width <= 0) return "base";
  for (const bp of ASCENDING) {
    if (width <= breakpoints[bp]) return bp;
  }
  return "base";
}

// Resolve a Responsive map from a bucket instead of a raw width: the first key
// present in the map at or above the bucket wins. Provably equal to
// responsive(width, map) for every width in the bucket.
function resolveFromBucket<T>(bucket: BreakpointKey | "base", map: Responsive<T>): T {
  if (bucket !== "base") {
    let reached = false;
    for (const bp of ASCENDING) {
      if (bp === bucket) reached = true;
      if (reached) {
        const value = map[bp];
        if (value !== undefined) return value;
      }
    }
  }
  return map.base;
}

// The shared viewport store: ONE Dimensions listener no matter how many
// components subscribe. useSyncExternalStore re-renders a subscriber only when
// its snapshot (the bucket string) actually changes, so resize events inside a
// bucket are free.
const storeListeners = new Set<() => void>();
let detachDimensions: (() => void) | null = null;

function notifyAll() {
  storeListeners.forEach((listener) => listener());
}

function subscribeViewport(onStoreChange: () => void): () => void {
  if (storeListeners.size === 0) {
    const subscription = Dimensions.addEventListener("change", notifyAll);
    detachDimensions = () => subscription.remove();
  }
  storeListeners.add(onStoreChange);
  return () => {
    storeListeners.delete(onStoreChange);
    if (storeListeners.size === 0 && detachDimensions) {
      detachDimensions();
      detachDimensions = null;
    }
  };
}

function getBucketSnapshot(): BreakpointKey | "base" {
  return bucketOf(Dimensions.get("window").width);
}

/** The server-render breakpoint assumption. ThemeProvider's `ssrBreakpoint`
 *  prop feeds this; components never read it directly (useBreakpoint does). */
export const SsrBreakpointContext = createContext<BreakpointKey | "base">("base");

// The simulation seam: a non-null value pins the bucket every viewport hook
// resolves for the subtree, overriding the real window. See BreakpointOverride.
const BreakpointOverrideContext = createContext<BreakpointKey | "base" | null>(null);

/**
 * Pin the viewport bucket for a subtree: every `useBreakpoint` /
 * `useResponsive` / `useFormFactor` consumer under the provider resolves
 * `value` instead of the real window, so a preview stage or a test can
 * exercise a phone or tablet branch inside a desktop window (the docs
 * playground's form-factor switcher). `null` clears the override (the real
 * viewport applies), which lets a switcher's "desktop" state simply stop
 * simulating.
 *
 * Two boundaries to know:
 * - Context reaches REACT descendants. The kit Portal renders overlay
 *   children at the OverlayProvider's outlet, so an override mounted BELOW
 *   the provider never reaches portaled overlay content (menus, dialogs,
 *   toasts): mount the override above the OverlayProvider when overlays
 *   should simulate too, as the docs playground does.
 * - This simulates the VIEWPORT tier only. Container-measured components
 *   (DataTable, Grid, Row `stacks`) follow their real measured width:
 *   constrain the subtree's width to the matching size alongside the
 *   override, and both mechanisms tell the same story.
 */
export function BreakpointOverride({ value, children }: { value: BreakpointKey | "base" | null; children?: ReactNode }) {
  return <BreakpointOverrideContext.Provider value={value}>{children}</BreakpointOverrideContext.Provider>;
}

/** The active viewport bucket: the smallest breakpoint covering the current
 *  window width ("sm" on phones), or "base" on a desktop wider than 2xl.
 *  Re-renders only when the bucket changes, never per resize pixel. A
 *  `BreakpointOverride` ancestor wins over the real window. */
export function useBreakpoint(): BreakpointKey | "base" {
  const ssrBucket = useContext(SsrBreakpointContext);
  const override = useContext(BreakpointOverrideContext);
  const live = useSyncExternalStore(subscribeViewport, getBucketSnapshot, () => ssrBucket);
  return override ?? live;
}

/** Hook form: resolve a Responsive map against the current viewport width. */
export function useResponsive<T>(map: Responsive<T>): T {
  return resolveFromBucket(useBreakpoint(), map);
}

/** The semantic form-factor tier over the breakpoints: phone at/below sm (640),
 *  tablet at/below lg (1024), desktop above (macOS and desktop web included).
 *  Derived from `breakpoints`, so the two can never drift. */
export type FormFactor = "phone" | "tablet" | "desktop";

const FORM_FACTOR_BY_BUCKET: Record<BreakpointKey | "base", FormFactor> = {
  sm: "phone",
  md: "tablet",
  lg: "tablet",
  xl: "desktop",
  "2xl": "desktop",
  base: "desktop",
};

/** Pure form of the tier: the form factor at the given width (non-positive
 *  widths are the unknown viewport and resolve to "desktop", like `base`). */
export function formFactor(width: number): FormFactor {
  return FORM_FACTOR_BY_BUCKET[bucketOf(width)];
}

/** The current viewport's form factor. App-shell vocabulary: prefer this over
 *  raw buckets for "rail or drawer" / "one column or three" decisions. */
export function useFormFactor(): FormFactor {
  return FORM_FACTOR_BY_BUCKET[useBreakpoint()];
}

export { useWindowDimensions };
