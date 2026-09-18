/**
 * The static server the end-to-end suite runs against.
 *
 * The docs app ships as a static web export (docs/app.json sets `web.output:
 * "static"`): one HTML document per route, served the way Cloudflare Pages serves
 * it. A route path resolves like Pages' clean URLs do, `/x` to `x.html` or
 * `x/index.html`, and a miss is answered by the root `404.html` (expo-router's
 * not-found page, renamed by docs/scripts/prepare-pages.mjs) with a real 404
 * status. Text responses are gzip-compressed when the client accepts it, because
 * Lighthouse sizes its simulated network from transfer bytes and an uncompressed
 * bundle would overstate every timing five-fold.
 *
 * A single-page export (no per-route documents, no 404.html) still works: the
 * `spa` fallback answers extension-less misses with index.html, which is what the
 * old `_redirects` catch-all did on Cloudflare.
 *
 * Two deliberate strictnesses:
 *
 *   1. A miss that names a file extension is always a plain 404. Cloudflare's old
 *      catch-all answered a missing font or script with a 200 and an HTML body,
 *      which is exactly the blank-site failure docs/public/_headers documents; here
 *      the smoke suite's failed-request gate sees it.
 *   2. `--headers` replays the `/*` block of docs/public/_headers onto every
 *      response, so the strict Content-Security-Policy (hashed inline scripts only,
 *      no unsafe-eval, require-trusted-types-for 'script') is enforced in the
 *      browser during the run. That turns the route sweep _headers asks for
 *      "whenever a dependency that touches the DOM is added or upgraded" into a
 *      thing CI does on every push.
 *
 * It is plain node:http with no dependencies, so both bun (the webServer
 * command) and node (anything Playwright's own loader runs) execute it.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

// Content types for everything the docs export ships. Anything unlisted is served
// as a byte stream, which is correct for a download and wrong for nothing we have.
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

export interface ServerOptions {
  /** Directory served at the base path. */
  root: string;
  /** 0 (the default) lets the OS pick a free port. */
  port?: number;
  /** URL prefix the root is mounted under, e.g. "/canvas" for an EXPO_BASE_URL build. */
  base?: string;
  /** Replay the `/*` block of `<root>/_headers` onto every response. */
  headers?: boolean;
  /** Answer extension-less misses with index.html (a single-page export's rewrite) when there is no 404.html. */
  spa?: boolean;
  /** Serve HTTPS with a disposable loopback certificate, without changing system trust. */
  https?: boolean;
  /** Gzip text responses for clients that accept it, as the deployment does. Defaults to true. */
  compress?: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  certificate?: string;
  close: () => Promise<void>;
}

/**
 * Parse the `/*` block of a Cloudflare `_headers` file.
 *
 * Comment lines and `!`-prefixed removals are skipped. So is HSTS: it names an
 * https policy, browsers ignore it over http, and sending it from a loopback
 * origin only risks confusing a future reader.
 */
export function parseBaselineHeaders(headersFile: string): Record<string, string> {
  const out: Record<string, string> = {};
  let inBlock = false;
  for (const raw of headersFile.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    // A path pattern is unindented; anything indented belongs to the open block.
    if (!/^\s/.test(raw)) {
      inBlock = line === "/*";
      continue;
    }
    if (!inBlock || line.startsWith("#") || line.startsWith("!")) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim();
    if (name.toLowerCase() === "strict-transport-security") continue;
    out[name] = line.slice(colon + 1).trim();
  }
  return out;
}

/** Strip the query and hash, decode, and refuse anything that climbs out of root. */
function resolveWithin(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const full = resolve(root, "." + normalize(decoded));
  if (full !== root && !full.startsWith(root + sep)) return null;
  return full;
}

async function readIfFile(path: string): Promise<Buffer | null> {
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

export async function startStaticServer(options: ServerOptions): Promise<RunningServer> {
  const root = resolve(options.root);
  const base = (options.base ?? "").replace(/\/+$/, "");
  const spa = options.spa !== false;

  const baseline = options.headers
    ? parseBaselineHeaders((await readIfFile(join(root, "_headers")))?.toString("utf8") ?? "")
    : {};

  const compress = options.compress !== false;

  // Compress the text types (markup, scripts, styles, maps, fonts as TTF, JSON);
  // images and woff2 are already packed. Cloudflare negotiates the same way.
  const compressible = (type: string) =>
    /^(text\/|application\/(javascript|json|xml)|image\/svg|font\/ttf|font\/otf)/.test(type);

  const send = (req: IncomingMessage, res: ServerResponse, status: number, body: Buffer | string, type: string) => {
    const accepts = /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
    const payload = compress && accepts && compressible(type) ? gzipSync(body) : body;
    res.writeHead(status, {
      ...baseline,
      "Content-Type": type,
      "Content-Length": Buffer.byteLength(payload),
      ...(payload !== body ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" } : {}),
    });
    res.end(payload);
  };

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let pathname = url.pathname;

    if (base) {
      if (pathname === base || pathname === "/") {
        res.writeHead(302, { Location: `${base}/` });
        res.end();
        return;
      }
      if (!pathname.startsWith(base + "/")) {
        send(req, res, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }
      pathname = pathname.slice(base.length);
    }

    const target = resolveWithin(root, pathname);
    if (target === null) {
      send(req, res, 400, "Bad path", "text/plain; charset=utf-8");
      return;
    }

    // A real file wins, then Pages' clean-URL forms of a route path: `x.html`,
    // then a directory's index.html (that is how the baked /privacy page shadows
    // the expo-router route in production too).
    const direct = await readIfFile(target);
    if (direct) {
      send(req, res, 200, direct, MIME[extname(target)] ?? "application/octet-stream");
      return;
    }
    if (extname(pathname) === "") {
      const asPage = await readIfFile(target + ".html");
      if (asPage) {
        send(req, res, 200, asPage, MIME[".html"]);
        return;
      }
    }
    const asIndex = await readIfFile(join(target, "index.html"));
    if (asIndex) {
      send(req, res, 200, asIndex, MIME[".html"]);
      return;
    }

    // Route-path misses only from here on: a miss that names a file extension is a
    // genuine 404 and must read as one.
    if (extname(pathname) === "") {
      // Pages serves a root 404.html (a static export's not-found page) with a real
      // 404 status, so the not-found route renders without pretending to be a hit.
      const notFound = await readIfFile(join(root, "404.html"));
      if (notFound) {
        send(req, res, 404, notFound, MIME[".html"]);
        return;
      }
      // The SPA rewrite of a single-page export.
      const shell = spa ? await readIfFile(join(root, "index.html")) : null;
      if (shell) {
        send(req, res, 200, shell, MIME[".html"]);
        return;
      }
    }

    send(req, res, 404, "Not found", "text/plain; charset=utf-8");
  };

  // WebKit enforces upgrade-insecure-requests even on loopback HTTP. Use the
  // deployment's HTTPS transport and unchanged CSP, not a browser policy bypass.
  // The key lives only for this server process and is never installed in a keychain.
  let certificate: string | undefined;
  let certificateDirectory: string | undefined;
  let credentials: { key: string; cert: string } | undefined;
  if (options.https) {
    certificateDirectory = await mkdtemp(join(tmpdir(), "canvas-e2e-tls-"));
    try {
      const configuration = join(certificateDirectory, "openssl.cnf");
      await writeFile(configuration, "[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=localhost\n[ext]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\n");
      execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-config", configuration,
        "-keyout", join(certificateDirectory, "key.pem"), "-out", join(certificateDirectory, "cert.pem")], { stdio: "pipe" });
      certificate = await readFile(join(certificateDirectory, "cert.pem"), "utf8");
      credentials = { key: await readFile(join(certificateDirectory, "key.pem"), "utf8"), cert: certificate };
    } finally {
      await rm(certificateDirectory, { recursive: true, force: true });
    }
  }
  const server = credentials ? createSecureServer(credentials, handle) : createServer(handle);

  await new Promise<void>((ok, fail) => {
    server.once("error", fail);
    server.listen(options.port ?? 0, "127.0.0.1", ok);
  });

  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("static server did not bind a port");

  return {
    port: address.port,
    url: `${options.https ? "https" : "http"}://127.0.0.1:${address.port}${base}`,
    certificate,
    close: () =>
      new Promise<void>((ok, fail) => {
        server.close((err) => (err ? fail(err) : ok()));
      }),
  };
}
