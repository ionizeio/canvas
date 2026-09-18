import { breakpoints, useBreakpoint } from "@ionizeio/canvas";

// Fluid type for the docs app's marketing/reference typography: the RN spelling of
// CSS clamp(lo, width * factor, hi), rounded to a whole px. This is app typography
// (the home hero, the token-page h1), not a kit gap: kit components size type from
// the Typography roles, so the helper stays docs-local.
//
// The width is the viewport BUCKET's upper edge, not the raw window: the kit's bucket
// hooks resolve to desktop (`base`) on the server and for the hydration render, so a
// pre-rendered page ships its desktop size and hydrates against exactly that, and
// they re-render only when the bucket changes rather than on every resize pixel. A
// raw `useWindowDimensions` read is 0 on the server, which would render every title
// at `lo` and then jump on hydration. Desktop (`base`) is the wide end of the clamp.
export function useFluidType(lo: number, hi: number, factor: number): number {
  const bucket = useBreakpoint();
  const width = bucket === "base" ? Infinity : breakpoints[bucket];
  return Math.round(Math.min(hi, Math.max(lo, width * factor)));
}
