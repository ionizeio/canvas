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

const { gzipSync } = require("node:zlib");
const { paintFirstHtml } = require("./paint-first-html.cjs");

const isDocumentRequest = (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!/\btext\/html\b/.test(req.headers.accept ?? "")) return false;
  const pathname = (req.url ?? "/").split("?")[0];
  // A file (a bundle, an asset, a map) names its extension; a document does not.
  return !/\.[a-z0-9]+$/i.test(pathname);
};

const acceptsGzip = (req) => /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");

const toBuffer = (chunk, encoding) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8"));

/**
 * Buffer a text/html response body and hand the whole document to `rewrite` on end,
 * gzipped when the request allows it. A response that turns out not to be a document
 * (a redirect, an error as JSON) is replayed as it was written.
 */
function interceptDocument(req, res, rewrite) {
  const chunks = [];
  const write = res.write.bind(res);
  const end = res.end.bind(res);
  const writeHead = res.writeHead.bind(res);
  const isHtml = () => /^text\/html\b/.test(String(res.getHeader("content-type") ?? ""));
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
    let body = Buffer.from(rewrite(Buffer.concat(chunks).toString("utf8")), "utf8");
    // The document is the one thing the dev server sends uncompressed; Metro gzips its
    // bundles itself. The same encoding the export's static server and the deployment
    // use, so a transfer-sized measurement reads the same here.
    if (acceptsGzip(req)) {
      body = gzipSync(body);
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
    }
    res.setHeader("Content-Length", String(body.length));
    return end(body, callback);
  };
}

/** The `enhanceMiddleware` for docs/metro.config.js. */
function createDevDocumentMiddleware() {
  return (metroMiddleware) => (req, res, next) => {
    if (isDocumentRequest(req)) interceptDocument(req, res, (html) => paintFirstHtml(html).html);
    return metroMiddleware(req, res, next);
  };
}

module.exports = { createDevDocumentMiddleware, interceptDocument, isDocumentRequest };
