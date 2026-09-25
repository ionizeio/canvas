import type { ComponentType } from "react";
import { createElement, isValidElement } from "react";
import { Image } from "react-native";

// Bundled sample avatar photos. The docs examples name them as root-absolute paths
// (`/rachel-chen.jpg`), which only resolve when something serves that exact URL:
//   - native: a device has no web origin at all, so the path never resolves and the
//     avatar falls back to initials;
//   - web at a subpath: the browser resolves `/rachel-chen.jpg` against the ORIGIN
//     ROOT, so a static export hosted under /canvas/ (GitHub Pages) 404s. Setting
//     `experiments.baseUrl` does NOT save it: baseUrl rewrites bundler-managed asset
//     and route links, never a string passed as a prop.
// Metro bundles these `require()`d images on every platform and emits URLs that DO
// carry the baseUrl prefix, so mapping the sample paths to the bundled modules makes
// the example photos load on iOS, Android, and the web (at the root and under a
// subpath). Applied in BOTH scopes: see build-scopes.{native,web}.ts.
// The value type is deliberately `unknown`: what Metro hands back from `require()` is
// platform-dependent (an opaque numeric id on native, an asset object on web).
const PHOTOS: Record<string, unknown> = {
  "/rachel-chen.jpg": require("../../public/rachel-chen.jpg"),
  "/liang-bao.jpg": require("../../public/liang-bao.jpg"),
  "/marcus-allen.jpg": require("../../public/marcus-allen.jpg"),
  "/kira-tanaka.jpg": require("../../public/kira-tanaka.jpg"),
  "/ada-lovelace.jpg": require("../../public/ada-lovelace.jpg"),
  "/grace-hopper.jpg": require("../../public/grace-hopper.jpg"),
  "/noor-park.jpg": require("../../public/noor-park.jpg"),
  // The Video sample (tools/videogen/generate.mjs): Metro bundles the clip like an image.
  "/video-sample.mp4": require("../../public/video-sample.mp4"),
  "/video-sample.jpg": require("../../public/video-sample.jpg"),
};

// The bundled asset's URL as a STRING, whatever shape Metro handed back (an asset
// object on web, an opaque numeric id on native, occasionally the URL itself).
//
// A string is the only shape every consumer accepts, so this must never return the raw
// module:
//   - Avatar takes `string | number` and does `source={typeof photo === "number" ? photo
//     : {uri: photo}}` — the web asset OBJECT would become `{uri: {…}}`, rendering no
//     image while the truthy `src` suppresses the initials, leaving a blank circle;
//   - GridList/Feed type their photo as `string` and GridList sniffs it
//     (`value.startsWith("http") || "/" || "data:"`) to tell a photo from initials — a
//     numeric module id there throws `undefined is not a function`.
// Both a Metro dev URL (`http://…`) and an exported asset path (`/canvas/assets/…`)
// satisfy that sniff, and the exported path carries the `experiments.baseUrl` prefix,
// which is what makes a subpath-hosted export work.
function assetUri(mod: unknown): string | undefined {
  if (typeof mod === "string") return mod;
  if (typeof mod === "object" && mod !== null) {
    const uri = (mod as { uri?: unknown }).uri;
    if (typeof uri === "string") return uri;
  }
  // Native hands back an opaque id that only the asset registry can resolve.
  // react-native-web has no `resolveAssetSource`, hence the guard rather than a
  // Platform check.
  if (typeof mod === "number" && typeof Image.resolveAssetSource === "function") {
    const uri = Image.resolveAssetSource(mod)?.uri;
    if (typeof uri === "string") return uri;
  }
  return undefined;
}

/**
 * Resolve a sample photo path to the bundled asset's URL; pass anything else through.
 *
 * On web that URL carries the `experiments.baseUrl` prefix, which is what makes the
 * photos load from a subpath-hosted export (GitHub Pages serves this project under
 * /canvas/) instead of 404ing against the origin root. On native it is the asset's real
 * URL, which the raw `/rachel-chen.jpg` never was.
 */
export function resolvePhoto(src: unknown): unknown {
  if (typeof src !== "string") return src;
  const mod = PHOTOS[src];
  if (mod == null) return src;
  return assetUri(mod) ?? src;
}

// How deep to walk a prop's plain data looking for sample photo paths. They are not
// always a top-level prop: Avatar/MediaObject take `src` directly, but GridList and Feed
// carry `items[].avatar`, and DescriptionList nests them furthest at `items[].avatars[].src`. A
// name-and-depth-blind walk means a new example cannot silently miss the resolution
// (which is exactly how the subpath bug went unnoticed).
const MAX_DEPTH = 6;

// Resolve every sample photo path inside a prop value. Strings resolve at any depth;
// only plain arrays/objects are traversed. React elements are returned untouched: an
// element renders through its own (already wrapped) component, which resolves its props
// then, and rebuilding one here would be both wasteful and wrong.
function resolveDeep(value: unknown, depth: number): unknown {
  if (typeof value === "string") return resolvePhoto(value);
  if (value == null || typeof value !== "object" || depth <= 0) return value;
  if (isValidElement(value)) return value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const resolved = resolveDeep(item, depth - 1);
      if (resolved !== item) changed = true;
      return resolved;
    });
    return changed ? next : value;
  }

  const rec = value as Record<string, unknown>;
  if (Object.getPrototypeOf(rec) !== Object.prototype) return value; // class instances etc.
  let next: Record<string, unknown> | null = null;
  for (const key of Object.keys(rec)) {
    const resolved = resolveDeep(rec[key], depth - 1);
    if (resolved !== rec[key]) (next ??= { ...rec })[key] = resolved;
  }
  return next ?? value;
}

// One wrapper per component, made the first time it is asked for. The Playground and the
// Don't previews rebuild their scopes on every render, and a wrapper made per call is a
// new component type each time, so React remounted every photo-bearing example whenever
// the stage re-rendered: a playing Video started over, and a full-screen <video> left the
// document, so the browser left full screen (entering it resizes the viewport, which
// re-measures the stage).
const wrappers = new WeakMap<object, unknown>();

// Wrap an image-bearing component (Image, Avatar, MediaObject, GridList, Feed, DescriptionList) so
// any sample photo path in its props resolves to the bundled asset before the real
// component renders. Keeps the example code clean and copy-pasteable (`src="/rachel-chen.jpg"`)
// while making the photos load on iOS, Android, and a subpath-hosted web export.
export function withResolvedPhotos<P>(Component: ComponentType<P>): ComponentType<P> {
  const Loose = Component as ComponentType<Record<string, unknown>>;
  const made = wrappers.get(Component) as ComponentType<P> | undefined;
  if (made) return made;
  const Wrapped = (p: P) => {
    const rec = p as Record<string, unknown>;
    let next: Record<string, unknown> | null = null;
    for (const key of Object.keys(rec)) {
      if (key === "children") continue; // elements resolve themselves when they render
      const resolved = resolveDeep(rec[key], MAX_DEPTH);
      if (resolved !== rec[key]) (next ??= { ...rec })[key] = resolved;
    }
    return createElement(Loose, next ?? rec);
  };
  Wrapped.displayName = `WithPhotos(${Component.displayName ?? Component.name ?? "Component"})`;
  wrappers.set(Component, Wrapped);
  return Wrapped as ComponentType<P>;
}

/** The scope keys whose components can carry a sample photo (see withResolvedPhotos). */
export const PHOTO_COMPONENTS = ["Image", "Avatar", "MediaObject", "CardMedia", "GridList", "Feed", "DescriptionList", "Video"] as const;

/** Wrap every photo-bearing component in a built example scope, in place. */
export function applyResolvedPhotos(scope: Record<string, unknown>): void {
  for (const key of PHOTO_COMPONENTS) {
    const component = scope[key];
    // Kit components are plain functions, but the RN primitives (Image) are
    // forwardRef/memo exotics, i.e. objects; createElement renders both, so a
    // function-only guard would silently skip the primitives.
    if (typeof component === "function" || (typeof component === "object" && component !== null)) {
      scope[key] = withResolvedPhotos(component as ComponentType<Record<string, unknown>>);
    }
  }
}
