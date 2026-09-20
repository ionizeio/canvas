// Serve the dev server's documents the way the export serves them.
//
// `expo start` pre-renders every page per request (app.json `web.output: "static"`),
// so a document arrives with its content, exactly as an exported page does. Two things
// still differ from the export, and both put the dev server's measurements (a
// Lighthouse run against http://localhost:8081, the browser's own paint timing) a long
// way from the site's: the document is sent uncompressed, 270 KB for the home page
// where the export's copy travels as 36 KB, and the bundle is a deferred script that
// runs the moment parsing ends, so on a local connection the page's first paint waits
// behind the bundle's evaluation and hydration, the very order the export's paint-first
// loader (scripts/paint-first.mjs) exists to reverse. This middleware closes both gaps:
// a document is rewritten by the same paint-first pass as the export, its one bundle
// script preloaded at low priority and run from the loader after the first contentful
// paint, and gzipped for a client that accepts it.
//
// It hangs off Metro's `server.enhanceMiddleware` (docs/metro.config.js), the one hook
// Expo's dev server offers a project, and that slot sits ahead of Expo's own document
// handler in the connect chain, so the response can be shaped before it is written: the
// body of a text/html response is buffered and replaced on end. Only a navigation
// request for a document is touched (a GET that accepts text/html for a path with no
// extension); bundles, assets, source maps, the HMR and inspector endpoints pass
// straight through, and Metro already gzips its bundles itself. Nothing here runs in an
// export: `expo export` renders in-process and serves no request.
//
// The dev document also hydrates only when `EXPO_WEB_DEV_HYDRATE` is set, which
// scripts/dev.mjs does; without it expo-router throws the server's markup away and
// renders from scratch, the one behaviour of the export a dev page would otherwise
// never show.
//
// The third gap is time to first byte. Expo renders a document from scratch on every
// request: it re-reads the app config (which fingerprints the whole source tree and
// asks git for the revision), rebuilds and re-evaluates the server bundle, enumerates
// the client bundle's assets, and only then renders, about a second for the home page
// on a warm server and the first thing every paint metric waits on. A rendered document
// is a pure function of the source tree, so the middleware keeps the finished documents
// (rewritten, and gzipped once) and drops all of them whenever Metro's file watcher
// reports a change anywhere in the watched folders, the same signal Fast Refresh
// runs on. A reload after an edit renders fresh; a reload without one is served in
// milliseconds. Only a 200 is kept, a bounded number of them, and a server that offers
// no watcher (a future Metro) gets no cache rather than a stale one. After a flush the
// documents most recently asked for are rendered again in the background, once the
// change has settled, so the page a developer is looking at is fresh by the time they
// reload (or run Lighthouse) rather than costing that first reload the render.
//
// The fonts get the same treatment. Metro serves the seven preloaded faces as bare
// TrueType with no encoding and `no-store`, 259 KB against the 150 KB the export's
// gzipped copies weigh, and every one of them sits on the largest paint's critical path
// (Lighthouse's model charges each request that finished before the paint to it): the
// dev home page's largest paint read 2.6 s where the export's read 2.1 s. So a font is
// gzipped too, once, and kept in the same cache.

const { gzipSync } = require("node:zlib");
const http = require("node:http");
const { paintFirstHtml } = require("./paint-first-html.cjs");

// Enough for a browsing session across the docs (plus the seven faces) without holding
// hundreds of pages.
const CACHE_LIMIT = 64;
// How many recently requested documents a flush re-renders, and how long after the
// last change event it waits: a save is often a burst of writes, and Metro is busy
// re-bundling for Fast Refresh in that window anyway.
const REWARM_DOCUMENTS = 2;
const REWARM_DELAY_MS = 800;

const isDocumentRequest = (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!/\btext\/html\b/.test(req.headers.accept ?? "")) return false;
  const pathname = (req.url ?? "/").split("?")[0];
  // A file (a bundle, an asset, a map) names its extension; a document does not.
  return !/\.[a-z0-9]+$/i.test(pathname);
};

// A TrueType or OpenType face from Metro's asset route (`/assets/?unstable_path=...` in
// development). WOFF is already compressed and is left alone.
const isFontRequest = (req) => req.method === "GET" && /^\/assets\b/.test(req.url ?? "") && /\.(ttf|otf)(\?|$)/i.test(decodeURIComponent(req.url ?? ""));

const acceptsGzip = (req) => /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");

const toBuffer = (chunk, encoding) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8"));

/**
 * Buffer a response body whose content type `matches` and, on end, send it through
 * `rewrite` (the identity for a font), gzipped when the request allows it. A response
 * that turns out to be something else (a redirect, an error as JSON) is replayed as it
 * was written. `store`, when given, receives the finished response (its status, headers
 * and rewritten body) to keep.
 */
function interceptResponse(req, res, { matches, rewrite = (body) => body, store }) {
  const chunks = [];
  const write = res.write.bind(res);
  const end = res.end.bind(res);
  const writeHead = res.writeHead.bind(res);
  const isHtml = () => matches(String(res.getHeader("content-type") ?? ""));
  let released = false;
  const release = () => {
    released = true;
    res.write = write;
    res.end = end;
    res.writeHead = writeHead;
    for (const chunk of chunks) write(chunk);
    chunks.length = 0;
  };
  // A handler that writes its head up front would commit the headers (and the length
  // of the body it meant to send) before the body is known here, so the head is held
  // as plain status and headers until the end sends it.
  res.writeHead = (status, reason, headers) => {
    if (released) return writeHead(status, reason, headers);
    res.statusCode = status;
    const list = typeof reason === "object" && reason !== null ? reason : headers;
    if (Array.isArray(list)) for (const [name, value] of list) res.setHeader(name, value);
    else if (list) for (const name of Object.keys(list)) res.setHeader(name, list[name]);
    if (res.getHeader("content-type") != null && !isHtml()) release();
    return res;
  };
  res.write = (chunk, encoding, callback) => {
    if (released) return write(chunk, encoding, callback);
    if (chunk != null && chunk.length) chunks.push(toBuffer(chunk, encoding));
    if (res.headersSent || (res.getHeader("content-type") != null && !isHtml())) release();
    if (typeof encoding === "function") encoding();
    else if (typeof callback === "function") callback();
    return true;
  };
  res.end = (chunk, encoding, callback) => {
    if (released) return end(chunk, encoding, callback);
    if (typeof chunk === "function") return res.end(undefined, undefined, chunk);
    if (typeof encoding === "function") return res.end(chunk, undefined, encoding);
    if (chunk != null && chunk.length) chunks.push(toBuffer(chunk, encoding));
    if (!isHtml() || res.headersSent) {
      release();
      return end(callback);
    }
    res.write = write;
    res.end = end;
    res.writeHead = writeHead;
    const document = { status: res.statusCode, headers: res.getHeaders(), body: rewrite(Buffer.concat(chunks)) };
    if (store && document.status === 200) store(document);
    return sendDocument(req, res, document, end, callback);
  };
}

/** The document rewrite over a buffered body. */
const rewriteDocument = (body) => Buffer.from(paintFirstHtml(body.toString("utf8")).html, "utf8");

const isHtmlType = (contentType) => /^text\/html\b/.test(contentType);
const isFontType = (contentType) => /^(font\/|application\/(x-)?font)/.test(contentType);

/** Send a finished document, gzipped when the request allows it. */
function sendDocument(req, res, document, end = res.end.bind(res), callback) {
  res.statusCode = document.status;
  for (const name of Object.keys(document.headers)) res.setHeader(name, document.headers[name]);
  let body = document.body;
  // The document is the one thing the dev server sends uncompressed; Metro gzips its
  // bundles itself. The same encoding the export's static server and the deployment
  // use, so a transfer-sized measurement reads the same here.
  if (acceptsGzip(req)) {
    body = document.gzip ?? (document.gzip = gzipSync(document.body));
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
  } else {
    res.removeHeader("Content-Encoding");
  }
  res.setHeader("Content-Length", String(body.length));
  return end(body, callback);
}

/**
 * The finished documents by request URL, emptied on every file change Metro's watcher
 * reports. `server` is Metro's Server (the second argument of `enhanceMiddleware`);
 * without a reachable watcher there is no cache. `rewarm(host, url)` is called for the
 * recently requested documents once a flush has settled (the tests pass their own;
 * the default asks this server for the document again over loopback).
 */
function createDocumentCache(server, { rewarm = requestAgain, rewarmDelay = REWARM_DELAY_MS } = {}) {
  let watcher = null;
  try {
    watcher = server?.getBundler?.()?.getBundler?.()?.getWatcher?.() ?? null;
  } catch {
    watcher = null;
  }
  if (!watcher || typeof watcher.on !== "function") return null;
  const documents = new Map();
  // The documents most recently asked for, newest last, with the host they were asked
  // through (the loopback re-request needs a port).
  const recent = [];
  let pending = null;
  watcher.on("change", () => {
    documents.clear();
    if (recent.length === 0) return;
    clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      for (const { host, url } of recent) rewarm(host, url);
    }, rewarmDelay);
    pending.unref?.();
  });
  return {
    get: (key) => documents.get(key) ?? null,
    set: (key, document) => {
      documents.delete(key);
      documents.set(key, document);
      while (documents.size > CACHE_LIMIT) documents.delete(documents.keys().next().value);
    },
    /** Note a document request, so a flush re-renders it. */
    touch: (host, url) => {
      const at = recent.findIndex((entry) => entry.url === url);
      if (at !== -1) recent.splice(at, 1);
      if (host) recent.push({ host, url });
      while (recent.length > REWARM_DOCUMENTS) recent.shift();
    },
    clear: () => documents.clear(),
    get size() {
      return documents.size;
    },
  };
}

/** Ask this server for a document again, as a browser would, and discard the body. */
function requestAgain(host, url) {
  const req = http.request({ host: host.split(":")[0], port: Number(host.split(":")[1] || 80), path: url, method: "GET", headers: { accept: "text/html", "accept-encoding": "gzip" } }, (res) => res.resume());
  req.on("error", () => {});
  req.end();
}

/** The `enhanceMiddleware` for docs/metro.config.js. `options` reach the cache (the
 *  tests observe the re-render instead of performing it). */
function createDevDocumentMiddleware(options) {
  return (metroMiddleware, server) => {
    const cache = createDocumentCache(server, options);
    return (req, res, next) => {
      const document = isDocumentRequest(req);
      if (!document && !isFontRequest(req)) return metroMiddleware(req, res, next);
      const key = req.url ?? "/";
      if (document) cache?.touch(req.headers.host, key);
      const cached = cache?.get(key);
      if (cached) return sendDocument(req, res, cached);
      interceptResponse(req, res, {
        matches: document ? isHtmlType : isFontType,
        rewrite: document ? rewriteDocument : undefined,
        store: cache ? (finished) => cache.set(key, finished) : undefined,
      });
      return metroMiddleware(req, res, next);
    };
  };
}

module.exports = { createDevDocumentMiddleware, createDocumentCache, interceptResponse, isDocumentRequest, isFontRequest };
