// Let every pre-rendered page paint before its bundle runs.
//
// Each exported document already holds its content (web.output "static"), and the
// exporter attaches the bundle as deferred scripts: the Metro runtime, the layouts and
// route chunks the page needs, the shared chunk and the entry. Deferred is not late
// enough: a deferred script runs the moment parsing ends, and on any connection where
// the bundle has arrived by then (a fast link, the cache, the machine running
// Lighthouse) Chrome executes it, and the 1-2 s of module evaluation plus hydration
// behind it, BEFORE the first paint. The page the server rendered sits complete in the
// DOM and nobody sees it. Measured on the same export: first paint at 501 ms with the
// deferred script against 79 ms without any script, and Lighthouse's model, which puts
// a script on the Largest Contentful Paint path exactly when its evaluation begins
// before that paint, scored the pre-rendered page no better than the empty shell (LCP
// 7.9 s on mobile).
//
// So the scripts are fetched as early as before (preload links at the end of the head,
// same URLs) but executed after the first contentful paint has been recorded: a tiny
// inline loader observes the browser's own paint timing entries and
// appends the scripts, in their original order, from a task scheduled when
// `first-contentful-paint` arrives. The content is on screen, then it becomes
// interactive. Frame callbacks were tried first and rejected with measurements: one
// requestAnimationFrame plus a timeout ran the bundle 6-20 ms BEFORE the paint was
// recorded, and a second nested frame never fired at all in headless Chrome, which is
// what Lighthouse runs. A 1.5 s timer is the fallback for a document that never reports
// a paint (a hidden tab, an engine without the entry), so hydration is never left
// waiting.
//
// The preloads carry `fetchpriority="low"`, and only scripts of some size get one. A
// preloaded script is fetched at high priority by default, beside the faces the first
// paint needs, and a split export lists nine scripts per page; the pre-rendered page
// needs none of them to paint, so they yield to the fonts and the document. That is
// also what keeps them off the paint's critical path in Lighthouse's model, which puts
// every high-priority resource that finished before the observed paint on that path:
// with the default priority the split build measured a Largest Contentful Paint of
// 3.2 s against 2.7 s for one unsplit bundle, on the same page. Only the two large
// chunks (the shared modules and the entry, each hundreds of kilobytes) are preloaded;
// the route, layout and docs chunks are left to the loader's own request after the
// paint. The model tells a script apart from a render-blocking resource by finding the
// task that evaluated it, and it keeps no task shorter than ten milliseconds: a chunk
// that only registers a few module factories evaluates in less, so a preload of it
// looks render-blocking and was measured to cost 0.3 s of Largest Contentful Paint.
//
// Three constraints shape the loader. It must be constant, because the site's CSP
// allows exactly one hash for it and the script names change every build, so the
// script tags live in the markup (an inert template the loader clones) and not in the
// loader. It must not assign a string to `script.src`: the CSP enforces Trusted Types,
// which makes that assignment throw; importing parser-made script elements out of a
// template is not a string sink. And it installs the Trusted Types default policy the
// bundle's own chunk loader needs: Expo loads a split chunk on demand (a route or a
// component's docs the page did not ship) by assigning `script.src`, which the policy
// admits only for this site's own chunk directory, so the protection the CSP buys is
// narrowed by exactly one path and nothing else. Cloned scripts are made non-async so
// they execute in document order, runtime first and entry last, as they would have.
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
  '(function(){' +
  'if(typeof trustedTypes!=="undefined"&&trustedTypes.createPolicy)try{trustedTypes.createPolicy("default",{createScriptURL:function(u){' +
  'var p=new URL(String(u),location.href);if(p.origin===location.origin&&/^\\/_expo\\/static\\/js\\/web\\/[\\w.+\\[\\]-]+\\.js$/.test(p.pathname))return p.href;' +
  'throw new TypeError("blocked script url "+u)}})}catch(e){}' +
  'var t=document.getElementById("canvas-entry");if(!t)return;var done=false;' +
  'function go(){if(done)return;done=true;var f=document.importNode(t.content,true);' +
  'var s=f.querySelectorAll("script");for(var i=0;i<s.length;i++)s[i].async=false;document.body.appendChild(f)}' +
  'if(document.hidden||typeof PerformanceObserver!=="function")return setTimeout(go,0);' +
  'try{new PerformanceObserver(function(l){if(l.getEntries().some(function(e){return e.name==="first-contentful-paint"}))setTimeout(go,0)})' +
  '.observe({type:"paint",buffered:true})}catch(e){return setTimeout(go,0)}setTimeout(go,1500)})();';

/** The CSP source expression for an inline script's contents. */
export const cspHash = (script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

const DEFERRED = /<script src="([^"]+\.js)" defer><\/script>\n?/g;
const PRELOAD_MIN_BYTES = 128 * 1024;

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
    const scripts = [...html.matchAll(DEFERRED)].map(([, src]) => src);
    if (scripts.length === 0 || !/\/entry-[^/]+\.js$/.test(scripts[scripts.length - 1])) {
      throw new Error(`paint-first: expected deferred scripts ending with the entry in ${path.relative(root, page)}, found ${scripts.length}`);
    }
    const preloads = scripts
      .filter((src) => fs.statSync(path.join(root, src)).size >= PRELOAD_MIN_BYTES)
      .map((src) => `<link rel="preload" href="${src}" as="script" fetchpriority="low">`)
      .join("\n");
    const template = `<template id="canvas-entry">${scripts.map((src) => `<script src="${src}"></script>`).join("")}</template>`;
    html = html
      .replace("</head>", `${preloads}\n</head>`)
      .replace(DEFERRED, "")
      .replace("</body>", `${template}<script>${LOADER}</script>\n</body>`);
    fs.writeFileSync(page, html);
    rewritten += 1;
  }
  console.log(`paint-first: ${rewritten} of ${pages.length} page(s) rewritten to preload their scripts and run them after the first paint`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) paintFirst(path.resolve(dist));
