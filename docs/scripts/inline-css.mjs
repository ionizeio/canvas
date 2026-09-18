// Inline the exported stylesheet into every page instead of linking it.
//
// The export ships one small stylesheet, expo-router's native-tabs module (~2.5 KB). It
// is render-blocking: the browser will not paint until it has been fetched, which cost a
// measured 74ms. Inlining removes that round trip entirely.
//
// It is worth noting what this file is. NativeTabs is the iOS/Android tab bar, and on the
// web the shell renders the sidebar/topbar layout instead, so none of these rules ever
// match anything here. The honest fix would be not to ship it at all, but the import is
// static in shell/navbar.tsx and splitting that into a .native fork to dodge one stylesheet
// trades a real cross-platform file for a build-time saving. Inlining gets the same paint
// timing without forking the component.
//
// Safe under the site's CSP: style-src includes 'unsafe-inline', which it must anyway,
// because React Native Web writes dynamic styles as inline style attributes.
//
// Usage: node scripts/inline-css.mjs [distDir]   (defaults to ./dist)

import fs from "node:fs";
import path from "node:path";
import { htmlPages } from "./html-pages.mjs";

const dist = process.argv[2] ?? "dist";

// The export also emits a preload for the stylesheet it links; once the rules are
// inline that preload would fetch a file nothing references.
const LINK = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
const PRELOAD = /<link[^>]*rel="preload"[^>]*href="([^"]+)"[^>]*as="style"[^>]*>\s*/g;

const inlined = new Map();
function inlineInto(page) {
  let html = fs.readFileSync(page, "utf8");
  const found = [...html.matchAll(LINK)];
  if (!found.length) return 0;
  let count = 0;
  for (const [tag, href] of found) {
    if (!inlined.has(href)) {
      const file = path.join(dist, href.replace(/^\//, ""));
      if (!fs.existsSync(file)) throw new Error(`inline-css: stylesheet not found in artifact: ${href}`);
      const css = fs.readFileSync(file, "utf8");
      // </style> inside the CSS would close the block early; there is none today, but a
      // future rule containing that sequence would silently break the page.
      if (css.includes("</style")) throw new Error(`inline-css: ${href} contains a closing style tag`);
      // Only inline what is genuinely small. A large stylesheet is better left cacheable as
      // a separate file than duplicated into every HTML response.
      inlined.set(href, css.length > 16_000 ? null : css);
      if (inlined.get(href) === null) console.log(`inline-css: skipping ${href} (${css.length} bytes, over the inline budget)`);
    }
    const css = inlined.get(href);
    if (css === null) continue;
    html = html.replace(tag, `<style>${css}</style>`).replace(PRELOAD, (preload, preloaded) => (preloaded === href ? "" : preload));
    count += 1;
  }
  fs.writeFileSync(page, html);
  return count;
}

const pages = htmlPages(dist);
const total = pages.reduce((sum, page) => sum + inlineInto(page), 0);
console.log(`inline-css: inlined ${inlined.size} stylesheet(s) into ${total} of ${pages.length} page(s)`);
