import { describe, expect, it } from "bun:test";
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";

// The paint-first document rewrite the export and the dev server share, and the dev
// server's middleware that applies it to a served document (docs/scripts/dev-documents.cjs).
// The middleware is exercised through a real node:http server with the connect-shaped
// chain Expo's dev server runs: the project's enhanceMiddleware wraps Metro's
// middleware, and the document handler sits behind it.

const require = createRequire(import.meta.url);
const ROOT = join(import.meta.dir, "..");
const { LOADER, cspHash, paintFirstHtml } = require(join(ROOT, "docs/scripts/paint-first-html.cjs"));
const { createDevDocumentMiddleware, createDocumentCache, isDocumentRequest, isFontRequest } = require(join(ROOT, "docs/scripts/dev-documents.cjs"));

/** Metro's Server in miniature: the chain the middleware walks to the file watcher. */
const metroServer = (watcher: EventEmitter | null) => ({ getBundler: () => ({ getBundler: () => ({ getWatcher: () => watcher }) }) });

const DEV_BUNDLE = "/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=src%2Fapp";
const page = (scripts: string[]) =>
  `<!DOCTYPE html>\n<html><head><title>x</title></head><body><div id="root"><h1>Hi</h1></div>\n${scripts.map((s) => `<script src="${s}" defer></script>`).join("\n")}\n</body></html>`;

describe("paintFirstHtml", () => {
  it("moves every deferred script into the template, in order, and appends the loader", () => {
    const { html, scripts, rewritten } = paintFirstHtml(page(["/a.js", "/b.js", DEV_BUNDLE]));
    expect(rewritten).toBe(true);
    expect(scripts).toEqual(["/a.js", "/b.js", DEV_BUNDLE]);
    expect(html).not.toMatch(/ defer>/);
    expect(html).toContain(`<template id="canvas-entry"><script src="/a.js"></script><script src="/b.js"></script><script src="${DEV_BUNDLE}"></script></template><script>${LOADER}</script>\n</body>`);
    // The content is untouched and still precedes the scripts.
    expect(html.indexOf('<div id="root"><h1>Hi</h1></div>')).toBeLessThan(html.indexOf('<template id="canvas-entry">'));
  });

  it("preloads at low priority only the scripts the caller names", () => {
    const { html } = paintFirstHtml(page(["/small.js", "/entry-abc.js"]), { preload: (src: string) => src.includes("entry") });
    expect(html).toContain('<link rel="preload" href="/entry-abc.js" as="script" fetchpriority="low">\n</head>');
    expect(html).not.toContain('href="/small.js" as="script"');
  });

  it("leaves a document without deferred scripts alone, and is idempotent", () => {
    const plain = "<html><head></head><body><p>error</p></body></html>";
    expect(paintFirstHtml(plain)).toEqual({ html: plain, scripts: [], rewritten: false });
    const once = paintFirstHtml(page(["/a.js"])).html;
    expect(paintFirstHtml(once)).toEqual({ html: once, scripts: [], rewritten: false });
  });

  it("is the loader the deployment's CSP allows", () => {
    const headers = readFileSync(join(ROOT, "docs/public/_headers"), "utf8");
    expect(headers).toContain(cspHash(LOADER));
  });
});

describe("isDocumentRequest", () => {
  const req = (method: string, url: string, accept?: string) => ({ method, url, headers: accept === undefined ? {} : { accept } }) as IncomingMessage;
  it("is a GET for an extension-less path that accepts text/html", () => {
    expect(isDocumentRequest(req("GET", "/", "text/html,application/xhtml+xml"))).toBe(true);
    expect(isDocumentRequest(req("GET", "/components/button?scheme=dark", "text/html"))).toBe(true);
    expect(isDocumentRequest(req("GET", DEV_BUNDLE, "*/*"))).toBe(false);
    expect(isDocumentRequest(req("GET", "/assets/x.png", "text/html"))).toBe(false);
    expect(isDocumentRequest(req("GET", "/api/health", "application/json"))).toBe(false);
    expect(isDocumentRequest(req("POST", "/", "text/html"))).toBe(false);
  });
});

describe("createDevDocumentMiddleware", () => {
  type Handler = (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void;
  // Expo's chain in miniature: the enhanced Metro middleware first (Metro answers its
  // bundles and calls next for anything else), the document handler behind it.
  const FONT = Buffer.from("not really a font, but a body the size of one ".repeat(40));
  const metro: Handler = (req, res, next) => {
    if (req.url?.startsWith("/node_modules/")) {
      res.setHeader("Content-Type", "application/javascript");
      res.end("console.log(1)");
      return;
    }
    if (req.url?.startsWith("/assets/")) {
      // Metro's asset route: a bare TrueType body, no encoding, no caching.
      res.setHeader("Content-Type", "font/ttf");
      res.setHeader("Cache-Control", "no-store");
      res.end(FONT);
      return;
    }
    next();
  };
  const documents: Handler = (req, res) => {
    if (req.url?.startsWith("/json")) {
      res.setHeader("Content-Type", "application/json");
      res.write('{"a":');
      res.end("1}");
      return;
    }
    if (req.url?.startsWith("/chunked")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const html = page([DEV_BUNDLE]);
      res.write(html.slice(0, 40));
      res.end(html.slice(40));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html", "Content-Length": String(Buffer.byteLength(page([DEV_BUNDLE]))) });
    res.end(page([DEV_BUNDLE]));
  };
  const enhanced = createDevDocumentMiddleware()(metro);

  // node:http rather than fetch: the test preload installs happy-dom, whose fetch
  // applies a document origin and refuses these loopback requests.
  const get = (url: string, headers: Record<string, string>) =>
    new Promise<{ status: number; headers: IncomingMessage["headers"]; body: Buffer }>((ok, fail) => {
      const req = httpRequest(url, { method: "GET", headers }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => ok({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on("error", fail);
      });
      req.on("error", fail);
      req.end();
    });

  async function serve<T>(run: (base: string) => Promise<T>, handler: Handler = enhanced): Promise<T> {
    const server = createServer((req, res) => handler(req, res, () => documents(req, res, () => res.end())));
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    const address = server.address();
    const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      return await run(base);
    } finally {
      await new Promise<void>((ok) => server.close(() => ok()));
    }
  }

  it("rewrites a served document and gzips it for a client that accepts gzip", async () => {
    await serve(async (base) => {
      const res = await get(`${base}/`, { accept: "text/html", "accept-encoding": "gzip" });
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBe("gzip");
      expect(res.headers.vary).toBe("Accept-Encoding");
      expect(res.headers["content-length"]).toBe(String(res.body.length));
      const html = gunzipSync(res.body).toString("utf8");
      expect(html).toContain(`<link rel="preload" href="${DEV_BUNDLE}" as="script" fetchpriority="low">`);
      expect(html).toContain('<template id="canvas-entry">');
      expect(html).toContain(`<script>${LOADER}</script>`);
      expect(html).not.toMatch(/ defer>/);
    });
  });

  it("rewrites a document written in several chunks, uncompressed for a client without gzip", async () => {
    await serve(async (base) => {
      const res = await get(`${base}/chunked`, { accept: "text/html", "accept-encoding": "identity" });
      expect(res.headers["content-encoding"]).toBeUndefined();
      const html = res.body.toString("utf8");
      expect(res.headers["content-length"]).toBe(String(Buffer.byteLength(html)));
      expect(html).toContain('<template id="canvas-entry">');
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    });
  });

  it("passes bundles and non-document responses through untouched", async () => {
    await serve(async (base) => {
      const bundle = await get(`${base}${DEV_BUNDLE}`, { accept: "*/*", "accept-encoding": "gzip" });
      expect(bundle.headers["content-encoding"]).toBeUndefined();
      expect(bundle.body.toString("utf8")).toBe("console.log(1)");
      // A document request that turns out to be JSON is replayed as written.
      const json = await get(`${base}/json`, { accept: "text/html", "accept-encoding": "gzip" });
      expect(json.headers["content-encoding"]).toBeUndefined();
      expect(JSON.parse(json.body.toString("utf8"))).toEqual({ a: 1 });
    });
  });

  it("serves a document again from the cache until Metro's watcher reports a change", async () => {
    const watcher = new EventEmitter();
    let rendered = 0;
    const counting: Handler = (req, res, next) => {
      rendered += 1;
      metro(req, res, next);
    };
    const handler = createDevDocumentMiddleware()(counting, metroServer(watcher));
    await serve(async (base) => {
      const first = await get(`${base}/`, { accept: "text/html", "accept-encoding": "gzip" });
      const second = await get(`${base}/`, { accept: "text/html", "accept-encoding": "identity" });
      expect(rendered).toBe(1);
      expect(gunzipSync(first.body).toString("utf8")).toBe(second.body.toString("utf8"));
      expect(second.headers["content-encoding"]).toBeUndefined();
      expect(second.headers["content-type"]).toBe("text/html");
      // Another URL renders on its own.
      await get(`${base}/chunked`, { accept: "text/html", "accept-encoding": "gzip" });
      expect(rendered).toBe(2);
      // A file change drops every document.
      watcher.emit("change", { eventsQueue: [] });
      await get(`${base}/`, { accept: "text/html", "accept-encoding": "gzip" });
      expect(rendered).toBe(3);
      // A bundle is never cached or intercepted.
      expect((await get(`${base}${DEV_BUNDLE}`, { accept: "*/*" })).body.toString("utf8")).toBe("console.log(1)");
    }, handler);
  });

  it("gzips and caches a font from Metro's asset route", async () => {
    const font = "/assets/?unstable_path=.%2Fassets%2Ffonts/Urbanist_600SemiBold.ttf";
    expect(isFontRequest({ method: "GET", url: font, headers: {} } as IncomingMessage)).toBe(true);
    expect(isFontRequest({ method: "GET", url: "/assets/?unstable_path=.%2Fassets%2Fimages%2Flooks/a.webp", headers: {} } as IncomingMessage)).toBe(false);
    const watcher = new EventEmitter();
    let served = 0;
    const counting: Handler = (req, res, next) => {
      served += 1;
      metro(req, res, next);
    };
    const handler = createDevDocumentMiddleware()(counting, metroServer(watcher));
    await serve(async (base) => {
      const gz = await get(`${base}${font}`, { accept: "*/*", "accept-encoding": "gzip, br" });
      expect(gz.headers["content-encoding"]).toBe("gzip");
      expect(gz.headers["content-type"]).toBe("font/ttf");
      expect(gunzipSync(gz.body).equals(FONT)).toBe(true);
      expect(gz.body.length).toBeLessThan(FONT.length);
      const plain = await get(`${base}${font}`, { accept: "*/*", "accept-encoding": "identity" });
      expect(plain.headers["content-encoding"]).toBeUndefined();
      expect(plain.body.equals(FONT)).toBe(true);
      expect(served).toBe(1);
      watcher.emit("change", { eventsQueue: [] });
      await get(`${base}${font}`, { accept: "*/*", "accept-encoding": "gzip" });
      expect(served).toBe(2);
    }, handler);
  });

  it("keeps only a 200, only a bounded number, and no cache at all without a watcher", async () => {
    const cache = createDocumentCache(metroServer(new EventEmitter()));
    expect(cache).not.toBeNull();
    for (let i = 0; i < 70; i++) cache!.set(`/page-${i}`, { status: 200, headers: {}, body: Buffer.from("x") });
    expect(cache!.size).toBe(64);
    expect(cache!.get("/page-0")).toBeNull();
    expect(cache!.get("/page-69")).not.toBeNull();
    expect(createDocumentCache(metroServer(null))).toBeNull();
    expect(createDocumentCache(undefined)).toBeNull();
    // A missing document (Expo's 404 page) is rendered every time.
    const watcher = new EventEmitter();
    let rendered = 0;
    const missing: Handler = (req, res) => {
      rendered += 1;
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html");
      res.end(page([DEV_BUNDLE]));
    };
    const handler = createDevDocumentMiddleware()(missing, metroServer(watcher));
    await serve(async (base) => {
      expect((await get(`${base}/nowhere`, { accept: "text/html" })).status).toBe(404);
      expect((await get(`${base}/nowhere`, { accept: "text/html" })).status).toBe(404);
      expect(rendered).toBe(2);
    }, handler);
  });
});
