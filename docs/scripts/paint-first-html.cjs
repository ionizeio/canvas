// The paint-first rewrite of one document, shared by the export (scripts/paint-first.mjs
// rewrites every page in dist/) and the dev server (scripts/dev-documents.cjs rewrites
// each page as Metro serves it), so a page reads the same in both: its content painted
// first, its scripts fetched early and run after the first contentful paint. Why the
// scripts run late, and the three constraints that shape the loader, are explained in
// scripts/paint-first.mjs.
//
// CommonJS on purpose: metro.config.js is CommonJS and Metro requires it synchronously,
// and an ES module imports this file without ceremony.

const { createHash } = require("node:crypto");

// The loader, byte for byte what the deployment's CSP hashes (docs/public/_headers).
// Change it here and paint-first.mjs's hash check fails until _headers carries the new
// digest.
const LOADER =
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
const cspHash = (script) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

// A deferred script as Expo writes it: the exporter's chunk tags and the dev server's
// one bundle tag (whose URL carries a query string) alike.
const DEFERRED = /<script src="([^"]+)" defer><\/script>\n?/g;

/**
 * Rewrite one document so its deferred scripts are preloaded at low priority and run
 * from the loader after the first contentful paint. Returns the document and the
 * script URLs it found, in their original order; an empty list means the document
 * carried no deferred script and was left alone. Idempotent: a document this rewrite
 * already shaped (it carries the template) is returned as is.
 *
 * `preload(src)` says which scripts get a preload link (the export preloads only the
 * large chunks; a chunk that evaluates in under ten milliseconds reads as
 * render-blocking to Lighthouse's model when preloaded, see paint-first.mjs).
 */
function paintFirstHtml(html, { preload = () => true } = {}) {
  if (html.includes('id="canvas-entry"')) return { html, scripts: [], rewritten: false };
  const scripts = [...html.matchAll(DEFERRED)].map(([, src]) => src);
  if (scripts.length === 0) return { html, scripts, rewritten: false };
  const preloads = scripts
    .filter((src) => preload(src))
    .map((src) => `<link rel="preload" href="${src}" as="script" fetchpriority="low">`)
    .join("\n");
  const template = `<template id="canvas-entry">${scripts.map((src) => `<script src="${src}"></script>`).join("")}</template>`;
  const out = html
    .replace("</head>", `${preloads}\n</head>`)
    .replace(DEFERRED, "")
    .replace("</body>", `${template}<script>${LOADER}</script>\n</body>`);
  return { html: out, scripts, rewritten: true };
}

module.exports = { LOADER, cspHash, paintFirstHtml };
