import { breakpoints, useBreakpoint, type BreakpointKey } from "@ionizeio/canvas";

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
//
// Every fluid role is declared here, once, because two readers need the same numbers:
// the components, through `useFluidText`, and the pre-hydration sheet in
// docs/src/app/+html.tsx, which sizes the same text for a phone or tablet BEFORE the
// bundle runs. A pre-rendered page carries the desktop size, so without that sheet a
// phone painted the hero title at 58px and re-set it at 36px on hydration, a layout
// shift Lighthouse scored at 0.58 by itself. The sheet targets the `data-fluid` marker
// `fluidMarker` puts on the text, and because a bucket is one width, a media query per
// bucket reproduces the hook's value exactly.

export type FluidRole = "heroTitle" | "sectionTitle" | "ctaTitle" | "pageTitle";

interface FluidSpec {
  lo: number;
  hi: number;
  factor: number;
  /** Line height as a multiple of the size; omitted where the platform default is kept. */
  lineHeight?: number;
  /** Letter spacing as a multiple of the size (negative tightens). */
  letterSpacing: number;
}

export const FLUID_TEXT: Record<FluidRole, FluidSpec> = {
  // The home hero's level-one heading.
  heroTitle: { lo: 36, hi: 58, factor: 0.05, lineHeight: 1.04, letterSpacing: -0.032 },
  // The home page's section headings.
  sectionTitle: { lo: 26, hi: 36, factor: 0.034, lineHeight: 1.1, letterSpacing: -0.025 },
  // The closing call to action.
  ctaTitle: { lo: 28, hi: 42, factor: 0.04, letterSpacing: -0.028 },
  // The token pages' h1: clamp(32px, 5vw, 40px).
  pageTitle: { lo: 32, hi: 40, factor: 0.05, letterSpacing: -0.025 },
};

export interface FluidTextStyle {
  fontSize: number;
  lineHeight?: number;
  letterSpacing: number;
}

/** The size a role takes in a bucket (`base` is the desktop, the wide end of the clamp). */
export function fluidSizeAt(role: FluidRole, bucket: BreakpointKey | "base"): number {
  const { lo, hi, factor } = FLUID_TEXT[role];
  const width = bucket === "base" ? Infinity : breakpoints[bucket];
  return Math.round(Math.min(hi, Math.max(lo, width * factor)));
}

/** The text style numbers a role resolves to in a bucket. */
export function fluidTextAt(role: FluidRole, bucket: BreakpointKey | "base"): FluidTextStyle {
  const spec = FLUID_TEXT[role];
  const fontSize = fluidSizeAt(role, bucket);
  return {
    fontSize,
    ...(spec.lineHeight === undefined ? {} : { lineHeight: fontSize * spec.lineHeight }),
    letterSpacing: fontSize * spec.letterSpacing,
  };
}

/** Hook form: the role's text style for the current viewport bucket. */
export function useFluidText(role: FluidRole): FluidTextStyle {
  return fluidTextAt(role, useBreakpoint());
}

/** The size alone, for a caller that derives its own metrics from it. */
export function useFluidType(role: FluidRole): number {
  return fluidSizeAt(role, useBreakpoint());
}

/** The `data-fluid` marker the pre-hydration sheet targets; a no-op off the web. */
export function fluidMarker(role: FluidRole): object {
  return { dataSet: { fluid: role } };
}
