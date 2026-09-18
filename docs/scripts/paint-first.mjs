// Let every pre-rendered page paint before its bundle runs.
//
// Each exported document already holds its content (web.output "static"), and the
// exporter attaches the bundle as a deferred script. Deferred is not late enough: a
// deferred script runs the moment parsing ends, and on any connection where the bundle
// has arrived by then (a fast link, the cache, the machine running Lighthouse) Chrome
// executes it, and the 1-2 s of module evaluation plus hydration behind it, BEFORE the
// first paint. The page the server rendered sits complete in the DOM and nobody sees
// it. Measured on the same export: first paint at 501 ms with the deferred script
// against 79 ms without any script, and Lighthouse's model, which puts a script on the
// Largest Contentful Paint path exactly when its evaluation begins before that paint,
// scored the pre-rendered page no better than the empty shell (LCP 7.9 s on mobile).
//
// So the bundle is fetched as early as before (a preload link at the end of the head,
// same URL, same priority) but executed after the first contentful paint has been
// recorded: a tiny inline loader observes the browser's own paint timing entries and
// appends the script from a task scheduled when `first-contentful-paint` arrives. The
// content is on screen, then it becomes interactive. Frame callbacks were tried first
// and rejected with measurements: one requestAnimationFrame plus a timeout ran the
// bundle 6-20 ms BEFORE the paint was recorded, and a second nested frame never fired
// at all in headless Chrome, which is what Lighthouse runs. A 1.5 s timer is the
// fallback for a document that never reports a paint (a hidden tab, an engine without
// the entry), so hydration is never left waiting.
//
// Two constraints shape the loader. It must be constant, because the site's CSP
// allows exactly one hash for it and the bundle name changes every build, so the
// bundle URL lives in the markup (an inert template the loader clones) and not in
// the script. And it must not assign a string to `script.src`: the CSP enforces
// Trusted Types, which makes that assignment throw; importing a parser-made script
// element out of a template is not a string sink, so the same policy that protects
// the site never sees the loader.
//
// Usage: node scripts/paint-first.mjs [distDir]   (defaults to ./dist)

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appPages } from "./html-pages.mjs";

const dist = process.argv[2] ?? "dist";

// The loader, byte for byte what the CSP hashes. Change it here and the hash check
// below fails until public/_headers carries the new digest.
export const LOADER =
  '(function(){var t=document.getElementById("canvas-entry");if(!t)return;var done=false;' +
  'function go(){if(done)return;done=true;document.body.appendChild(document.importNode(t.content,true))}' +
  'if(document.hidden||typeof PerformanceObserver!=="function")return setTimeout(go,0);' +
  'try{new PerformanceObserver(function(l){if(l.getEntries().some(function(e){return e.name==="first-contentful-paint"}))setTimeout(go,0)})' +
  '.observe({type:"paint",buffered:true})}catch(e){return setTimeout(go,0)}setTimeout(go,1500)})();';

/** The CSP source expression for an inline script's contents. */
export const cspHash = (script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

const ENTRY = /<script src="([^"]+\.js)" defer><\/script>/g;

export function paintFirst(root) {
  const headers = fs.readFileSync(path.join(root, "_headers"), "utf8");
  const hash = cspHash(LOADER);
  if (!headers.includes(hash)) {
    throw new Error(`paint-first: public/_headers does not allow the loader; add ${hash} to script-src`);
  }
  const pages = appPages(root);
  if (!pages.length) throw new Error("paint-first: no app pages (documents with an app root) in the artifact");
  let rewritten = 0;
  for (const page of pages) {
    let html = fs.readFileSync(page, "utf8");
    // Idempotent: a page this script already rewrote carries the template.
    if (html.includes('id="canvas-entry"')) continue;
    const entries = [...html.matchAll(ENTRY)];
    if (entries.length !== 1) {
      throw new Error(`paint-first: expected one deferred entry script in ${path.relative(root, page)}, found ${entries.length}`);
    }
    const [tag, src] = entries[0];
    html = html
      .replace("</head>", `<link rel="preload" href="${src}" as="script">\n</head>`)
      .replace(tag, `<template id="canvas-entry"><script src="${src}"></script></template><script>${LOADER}</script>`);
    fs.writeFileSync(page, html);
    rewritten += 1;
  }
  console.log(`paint-first: ${rewritten} of ${pages.length} page(s) rewritten to preload the bundle and run it after the first paint`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) paintFirst(path.resolve(dist));
