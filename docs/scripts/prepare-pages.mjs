// Prepare the shared web artifact BEFORE browser tests. Wrangler skips every
// node_modules path, including Metro's bundled fonts, so use an uploadable name.
//
// The export is static (app.json `web.output: "static"`): one HTML document per route,
// so what this script shapes is a site of real files. Pages serves `/x` from `x.html`
// or `x/index.html` on its own, so no rewrite rule is involved, and a miss is answered
// by the root 404.html, which is expo-router's +not-found page under the name Pages
// looks for. That is the whole reason there is no _redirects file any more: the old
// catch-all rewrote every miss to the home page with a 200, which a crawler and both
// app stores would have read as a real page.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { appPages, htmlPages } from "./html-pages.mjs";

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  if (entry.name === "node_modules") throw new Error(`Pages would skip ${file}`);
  return entry.isDirectory() ? walk(file) : [file];
});

// The exporter writes every route twice: at its address and again under its
// route-group spelling, `(components)/components/button-group/index.html` beside
// `components/button-group/index.html`. Nothing links the parenthesised copies and
// they double the upload, so they go. So do the literal dynamic-segment documents
// (`components/[slug].html`), which no URL can name.
function pruneUnreachable(dist) {
  let pruned = 0;
  for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\(.*\)$/.test(entry.name)) {
      fs.rmSync(path.join(dist, entry.name), { recursive: true });
      pruned += 1;
    }
  }
  for (const page of htmlPages(dist)) {
    if (/\[[^\]/]+\]\.html$/.test(page)) {
      fs.rmSync(page);
      pruned += 1;
    }
  }
  return pruned;
}

export function preparePages(dist) {
  const hidden = path.join(dist, "assets/node_modules");
  if (fs.existsSync(hidden)) fs.renameSync(hidden, path.join(dist, "assets/vendor"));
  for (const file of walk(dist)) {
    if (!/\.(js|html|css|json)$/.test(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = before.replaceAll("assets/node_modules", "assets/vendor");
    if (after !== before) fs.writeFileSync(file, after);
  }
  const pruned = pruneUnreachable(dist);
  // Idempotent, like the vendor rename above: a second pass finds the page already named.
  const notFound = path.join(dist, "+not-found.html");
  if (fs.existsSync(notFound)) fs.renameSync(notFound, path.join(dist, "404.html"));
  if (!fs.existsSync(path.join(dist, "404.html"))) throw new Error("Missing +not-found.html (the 404 page)");
  for (const required of ["_headers", "privacy/index.html", "components/button-group/index.html"]) {
    if (!fs.statSync(path.join(dist, required)).isFile()) throw new Error(`Missing ${required}`);
  }
  if (fs.existsSync(path.join(dist, "_redirects"))) throw new Error("A _redirects file would rewrite misses to the home page; remove it");
  // /privacy is the baked page in public/privacy/index.html (privacygen's, the one both
  // app stores fetch), and the exporter also renders the in-app privacy route to
  // privacy.html beside it. Pages would have to pick one for the URL; the baked page is
  // the published policy, so the rendered route's document goes.
  const bakedPrivacy = path.join(dist, "privacy/index.html");
  const routePrivacy = path.join(dist, "privacy.html");
  if (fs.existsSync(bakedPrivacy) && fs.existsSync(routePrivacy)) fs.rmSync(routePrivacy);
  // Every app page preloads the faces it registered (the baked privacy page is plain
  // HTML with no app root and no faces). A preload aimed at a missing path is worse than
  // none, since it spends a high-priority connection on a 404 and then fetches the real
  // font anyway.
  const pages = appPages(dist);
  if (!pages.length) throw new Error("No app pages (documents with an app root) in the artifact");
  let preloads = 0;
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    // Attribute order is the writer's choice (the exporter puts href before as), so the
    // tag is matched as a whole and its parts read separately.
    const fonts = [...html.matchAll(/<link\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => /\brel="preload"/.test(tag) && /\bas="font"/.test(tag))
      .map((tag) => /\bhref="([^"]+)"/.exec(tag)?.[1])
      .filter((href) => href !== undefined);
    if (!fonts.length) throw new Error(`No font preloads in ${path.relative(dist, page)}`);
    for (const href of fonts) {
      const file = path.resolve(dist, href.replace(/^\//, ""));
      if (!file.startsWith(path.resolve(dist) + path.sep) || !fs.statSync(file).isFile()) throw new Error(`Missing preloaded font: ${href}`);
    }
    preloads = fonts.length;
  }
  console.log(`Pages artifact ready: ${pages.length} app pages, ${preloads} font preloads each resolve, 404/privacy/headers present, ${pruned} unreachable copies pruned`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) preparePages(path.resolve(process.argv[2] ?? "dist"));
