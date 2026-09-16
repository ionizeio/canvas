import * as Canvas from "@ionizeio/canvas";
import type { ColorTokens } from "@ionizeio/canvas";
import { PLATFORM_SKINS } from "./platform-skins";
import { Stateful, Ticker, applyDrop, IconGallery, WithToast, AppScreen, AppShell } from "./live-state";
import { applyResolvedPhotos } from "./photos";
import type { ExampleScope, PreviewScope } from "./scope";

// One column's scope: the web skin (`...Canvas`) with the per-OS skins layered over it,
// then the image-bearing components wrapped so the examples' sample photo paths resolve
// to their bundled modules.
//
// The wrapping matters for more than native. The examples name the sample photos as
// root-absolute paths (`/rachel-chen.jpg`), which the browser resolves against the
// ORIGIN ROOT — correct only when the docs are served from `/`. A static export hosted
// under a subpath (GitHub Pages serves this project at /canvas/) would request
// `/rachel-chen.jpg` and 404, because `experiments.baseUrl` only rewrites
// bundler-managed asset and route links, never a string passed as a prop. Routing the
// paths through the bundled `require()`d modules gives them Metro-emitted URLs, which
// DO carry the baseUrl prefix, so the photos load at the root and under a subpath.
//
// Wrap AFTER the skin spread so each column wraps its own effective component
// (PLATFORM_SKINS overrides Avatar, MediaObject, GridList and Feed per OS).
function columnScope(skins: Record<string, unknown>, tokens: ColorTokens): ExampleScope {
  const scope: Record<string, unknown> = { ...Canvas, ...skins };
  applyResolvedPhotos(scope);
  scope.tokens = tokens;
  scope.Stateful = Stateful;
  scope.Ticker = Ticker;
  scope.applyDrop = applyDrop;
  scope.IconGallery = IconGallery;
  scope.WithToast = WithToast;
  scope.AppScreen = AppScreen;
  scope.AppShell = AppShell;
  return scope as unknown as ExampleScope;
}

// Web build: render the example under all three platform skins side by side — the
// docs' signature cross-platform comparison. The base (`...Canvas`) is the web skin;
// the iOS/Android columns swap in the per-OS implementations from the literal-path
// registry. `tokens` is the live, theme-aware value, injected by the caller.
export function buildScopes(tokens: ColorTokens): PreviewScope[] {
  return [
    { label: "iOS", platform: "ios", scope: columnScope(PLATFORM_SKINS.ios, tokens) },
    { label: "Android", platform: "android", scope: columnScope(PLATFORM_SKINS.android, tokens) },
    { label: "Web", platform: "web", scope: columnScope({}, tokens) },
  ];
}
