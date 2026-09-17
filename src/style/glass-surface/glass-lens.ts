// The web Liquid Glass LENS: the top tier of the glass material ladder on
// Chromium web, above the expo-blur frost and the material's own `glass-tint` fill.
//
// Liquid Glass bends and concentrates light through a 2D displacement map
// rather than scattering it the way a blur does, and the bend is concentrated
// at the RIM: the centre of a pane is optically flat, the edges curve steeply.
// No combination of blur/saturate/brightness can fake that, so the lens is an
// SVG filter applied as the material layer's `backdrop-filter`.
//
// The filter is generated PER SURFACE SIZE, not shared. A displacement map has
// to know where the element's edges are, and measurement showed that the
// obvious shared alternative (percentage-sized feImage ramps stretched over
// the filter region) silently falls apart in Chromium's reference-filter
// path: the ramps do not cover the element, most of the surface samples a
// transparent-black map, and the two displacement passes compound that into a
// large position-dependent smear (tens of pixels, direction varying with the
// element's aspect). Pixel-unit geometry (`filterUnits="userSpaceOnUse"`,
// px-positioned feImage, a map image whose intrinsic size IS the region) is
// the arrangement that renders exactly as authored, so each distinct surface
// size gets its own `<filter>` under `cds-glass-lens-<w>x<h>`, acquired on
// layout and refcounted so live surfaces share defs and resize storms do not
// accumulate garbage.
//
// Map anatomy: one image carries both axes. The red channel is the X
// displacement (low band on the left rim, high band on the right), the green
// channel is Y (low on top, high on bottom), and everything else stays the
// neutral 128 so the centre is optically flat. Corner cells set both channels
// so corners bend diagonally. The bands are RIM_PX wide, constant in pixels
// like Apple's material (a proportional rim turns a wide navbar's edge zone
// into a hundreds-of-pixels smear). The region is inflated past the border
// box so rim samples have real backdrop to draw from, and a single
// feDisplacementMap (R selects X, G selects Y) replaces the reference's
// two-pass chain, followed by the blur + saturation the material carries.
//
// Every def here is BUILT as DOM nodes (`createElementNS` + `setAttribute`),
// never parsed from a markup string. Assigning a string to `innerHTML` is a
// Trusted Types sink: under a `require-trusted-types-for 'script'` CSP, which
// the docs site sends and any consumer may send, Chromium throws a TypeError on
// that assignment. A sink in material setup can blank the entire app (it did exactly
// that: the throw escaped the module factory and canvas.nannier.com served a
// white page). Node building touches no sink and needs no policy, so the lens
// renders identically under every CSP. The filter geometry therefore lives in
// pure `*Spec` builders that describe the tree, with one small builder turning a
// spec into elements; the displacement map stays a `data:` URI, which is an
// attribute value rather than a sink.
//
// The document also gets ONE shared `#cds-glass-lens` def, because the
// shipped CSS token layer (`--glass-lens: url(#cds-glass-lens)` in
// styles/tokens/colors.css) points at that id for raw-CSS web surfaces. Since
// no shared filter can displace correctly for every size, that def carries
// the blur + saturate stage only: a raw-CSS consumer gets a correct frost
// under the lens token rather than a broken lens.
//
// On Android and native iOS `document` does not exist, so every entry point
// here answers false/null and those platforms keep their own real materials.

import { useEffect, useState } from "react";

export const GLASS_LENS_ID = "cds-glass-lens";

// Geometry and grade of the lens, shared by every sized def. RIM_PX is the
// constant-width edge band the displacement lives in; DISPLACE_PX is the
// maximum bend at the rim (scale * (200-128)/255); the blur and saturation
// match the design system's lens grade.
const RIM_PX = 12;
const SCALE = 34;
const LO = 56;
const HI = 200;
const MID = 128;
const BLUR = 6;
const SATURATE = 1.9;
// The region inflation past the border box, so outward rim samples resolve to
// real backdrop instead of transparent black.
const INFLATE = 0.12;

/** The material's backdrop-filter while a surface's sized def is not ready
 *  yet (first frame before layout): the lens's own blur + saturation grade,
 *  so the swap to the sized def only adds the rim bend. */
export const GLASS_LENS_PENDING_FILTER = `blur(${BLUR}px) saturate(${SATURATE * 100}%)`;

/** The displacement-map image for a w x h surface, as a data URI. Exported for
 *  tests, which assert the band geometry instead of eyeballing pixels. */
export function lensMapDataUri(w: number, h: number, rimX: number, rimY: number, rx: number, ry: number): string {
  const RW = w + 2 * rx;
  const RH = h + 2 * ry;
  const rect = (x: number, y: number, ww: number, hh: number, r: number, g: number) =>
    `<rect x='${x}' y='${y}' width='${ww}' height='${hh}' fill='rgb(${r},${g},${MID})'/>`;
  let m = `<svg xmlns='http://www.w3.org/2000/svg' width='${RW}' height='${RH}'>`;
  m += rect(0, 0, RW, RH, MID, MID); // neutral base, inflation zone included
  // Left / right rims displace on X (red channel), full element height.
  m += rect(rx, ry, rimX, h, LO, MID);
  m += rect(rx + w - rimX, ry, rimX, h, HI, MID);
  // Top / bottom rims displace on Y (green channel); the corner cells carry
  // both channels so corners bend diagonally.
  m += rect(rx + rimX, ry, w - 2 * rimX, rimY, MID, LO);
  m += rect(rx, ry, rimX, rimY, LO, LO);
  m += rect(rx + w - rimX, ry, rimX, rimY, HI, LO);
  m += rect(rx + rimX, ry + h - rimY, w - 2 * rimX, rimY, MID, HI);
  m += rect(rx, ry + h - rimY, rimX, rimY, LO, HI);
  m += rect(rx + w - rimX, ry + h - rimY, rimX, rimY, HI, HI);
  m += `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(m);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** One filter primitive: its tag and its attributes. */
export interface LensNode {
  tag: string;
  attrs: Record<string, string | number>;
}

/** A whole `<filter>` def: the filter's own attributes plus its primitives. */
export interface LensFilterSpec {
  attrs: Record<string, string | number>;
  children: LensNode[];
}

/** The shared CSS-token def's spec: the blur + saturation grade with NO
 *  displacement (see the header for why it cannot carry one). Pure. */
export function sharedLensFilterSpec(id: string): LensFilterSpec {
  return {
    attrs: { id, "color-interpolation-filters": "sRGB" },
    children: [
      { tag: "feGaussianBlur", attrs: { in: "SourceGraphic", stdDeviation: BLUR, result: "soft" } },
      { tag: "feColorMatrix", attrs: { in: "soft", type: "saturate", values: SATURATE } },
    ],
  };
}

/** The full sized-filter spec. Pure and exported for tests. */
export function sizedLensFilterSpec(id: string, w: number, h: number): LensFilterSpec {
  // Tiny surfaces (chips, knobs) shrink the rim so the flat centre survives.
  const rimX = Math.max(1, Math.min(RIM_PX, Math.floor(w / 3)));
  const rimY = Math.max(1, Math.min(RIM_PX, Math.floor(h / 3)));
  const rx = Math.round(w * INFLATE);
  const ry = Math.round(h * INFLATE);
  // The inflated region, shared by the filter and its feImage so the map's
  // intrinsic size IS the region (see the header on pixel-unit geometry).
  const region = { x: -rx, y: -ry, width: w + 2 * rx, height: h + 2 * ry };
  return {
    attrs: { id, ...region, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" },
    children: [
      { tag: "feImage", attrs: { href: lensMapDataUri(w, h, rimX, rimY, rx, ry), ...region, result: "map" } },
      {
        tag: "feDisplacementMap",
        attrs: { in: "SourceGraphic", in2: "map", scale: SCALE, xChannelSelector: "R", yChannelSelector: "G", result: "bent" },
      },
      { tag: "feGaussianBlur", attrs: { in: "bent", stdDeviation: BLUR, result: "soft" } },
      { tag: "feColorMatrix", attrs: { in: "soft", type: "saturate", values: SATURATE } },
    ],
  };
}

/** Build a spec into a real `<filter>` element. Node construction only, so no
 *  Trusted Types sink is touched and no CSP policy is required. */
function buildLensFilter(spec: LensFilterSpec): SVGElement {
  const attach = (el: Element, attrs: Record<string, string | number>) => {
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  };
  const filter = document.createElementNS(SVG_NS, "filter");
  attach(filter, spec.attrs);
  for (const node of spec.children) {
    const child = document.createElementNS(SVG_NS, node.tag);
    attach(child, node.attrs);
    filter.appendChild(child);
  }
  return filter;
}

// One hidden host <svg> holds every def this module injects.
function defsHost(): SVGSVGElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  const hostId = GLASS_LENS_ID + "-defs";
  let host = document.getElementById(hostId) as SVGSVGElement | null;
  if (!host) {
    host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.id = hostId;
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.style.position = "absolute";
    host.style.width = "0";
    host.style.height = "0";
    host.style.pointerEvents = "none";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
  }
  return host;
}

/** True when the shared (CSS-token) lens def is present in this document. */
export function hasGlassLens(): boolean {
  return typeof document !== "undefined" && !!document.getElementById(GLASS_LENS_ID);
}

/** Inject the shared `#cds-glass-lens` def the CSS token layer points at:
 *  blur + saturation only (see the header for why it carries no displacement).
 *  Idempotent; returns whether the def is now available. */
export function ensureGlassLens(): boolean {
  if (typeof document === "undefined") return false;
  if (document.getElementById(GLASS_LENS_ID)) return true;
  const host = defsHost();
  if (!host) return false;
  host.appendChild(buildLensFilter(sharedLensFilterSpec(GLASS_LENS_ID)));
  return true;
}

function removeEmptyDefsHost(): void {
  if (typeof document === "undefined") return;
  const host = document.getElementById(GLASS_LENS_ID + "-defs");
  if (host && host.childElementCount === 0) host.remove();
}

/** Release the document's CSS material without touching active React surfaces. */
export function releaseGlassLens(): void {
  if (typeof document === "undefined") return;
  document.getElementById(GLASS_LENS_ID)?.remove();
  removeEmptyDefsHost();
}

// The sized-def registry: one def per live surface size, refcounted so equal
// sizes share and a def disappears when its last surface releases it.
interface SizedDef {
  el: SVGElement;
  refs: number;
}
const sizedDefs = new Map<string, SizedDef>();

/** Acquire (create if absent) the sized lens def for a w x h surface. Returns
 *  its key and url, or null when no document is available. Pair every acquire
 *  with a release. */
export function acquireSizedGlassLens(w: number, h: number): { key: string; url: string } | null {
  if (typeof document === "undefined" || w < 1 || h < 1) return null;
  const key = `${GLASS_LENS_ID}-${w}x${h}`;
  const existing = sizedDefs.get(key);
  if (existing) {
    existing.refs += 1;
    return { key, url: `url(#${key})` };
  }
  const host = defsHost();
  if (!host) return null;
  const el = buildLensFilter(sizedLensFilterSpec(key, w, h));
  host.appendChild(el);
  sizedDefs.set(key, { el, refs: 1 });
  return { key, url: `url(#${key})` };
}

/** Release a def acquired with acquireSizedGlassLens; the def is removed from
 *  the document when its last holder releases it. */
export function releaseSizedGlassLens(key: string): void {
  const def = sizedDefs.get(key);
  if (!def) return;
  def.refs -= 1;
  if (def.refs <= 0) {
    sizedDefs.delete(key);
    def.el.remove();
    removeEmptyDefsHost();
  }
}

/** Test hook: the number of live sized defs. */
export function sizedGlassLensCount(): number {
  return sizedDefs.size;
}

/**
 * Whether this engine can RENDER an SVG-reference backdrop-filter, decided from
 * the user agent string and a `CSS.supports` probe. Only Chromium renders SVG
 * filters in `backdrop-filter`; WebKit and Gecko parse-accept the value but
 * paint no filter at all, which would strip the frost instead of upgrading it,
 * and with a single inline style value there is no CSS-cascade fallback to
 * catch that. Render support is therefore not feature-detectable, and the gate
 * allows the known-good family: every Chromium UA carries "Chrome/" (Edge,
 * Brave, Arc, Opera, HeadlessChrome included), while iOS Chrome, which is
 * WebKit underneath, identifies as "CriOS/" and correctly stays on the frost.
 * The `CSS.supports` probe is the future-proof floor for engines that reject
 * the value outright. Pure so tests can exercise the truth table directly.
 */
export function lensBackdropSupported(
  userAgent: string,
  supports: (property: string, value: string) => boolean,
): boolean {
  return /Chrome\/\d/.test(userAgent) && supports("backdrop-filter", `url(#${GLASS_LENS_ID})`);
}

// The environment-reading wrapper around the pure gate above. Recomputed per
// call (a regex and one CSS.supports probe) rather than memoized, so tests
// that override the user agent stay isolated across files.
export function glassLensRenderable(): boolean {
  if (typeof navigator === "undefined" || typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
  return lensBackdropSupported(navigator.userAgent, (property, value) => CSS.supports(property, value));
}

/**
 * The lens gate for a glass surface: true only where a document exists and the
 * engine can render SVG-reference backdrop-filters (Chromium web). The lens
 * layer itself acquires its sized def on layout; until then it renders the
 * pending blur + saturate grade, never a reference to a missing filter, which
 * would resolve to NO filter at all.
 */
export function useGlassLens(glass: boolean): boolean {
  return glass && typeof document !== "undefined" && glassLensRenderable();
}

/**
 * The sized-def lifecycle for one lens layer: feed it the layer's layout size,
 * get the backdrop-filter value to render. Acquires the def for the current
 * size, swaps on resize, releases on unmount, and returns the pending grade
 * until the def exists.
 */
export function useSizedGlassLens(width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const def = acquireSizedGlassLens(w, h);
    setUrl(def ? def.url : null);
    return () => {
      if (def) releaseSizedGlassLens(def.key);
    };
  }, [w, h]);
  return url ?? GLASS_LENS_PENDING_FILTER;
}
