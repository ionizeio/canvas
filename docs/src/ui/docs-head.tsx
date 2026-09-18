import Head from "expo-router/head";
import { usePathname } from "expo-router";
import { useHydrated } from "../lib/hydrated";

export const SITE_ORIGIN = "https://canvas.nannier.com";
export const SITE_NAME = "Canvas";

// The per-page document head. Every route is pre-rendered to its own HTML document
// (app.json `web.output: "static"`), so each one can say what it is: the page's own
// title, and its canonical address, which the shell template used to pin to the home
// page for every route (a crawler read that as "every page is a copy of /"). The root
// layout mounts one with no title, so a page that names none still has a document
// title and a canonical link; a page header or component reference mounts another
// with its title, and the nearer one wins. On iOS the same tags feed Handoff and
// Spotlight through expo-router's head module (the plugin's `origin` names the site);
// on Android Head renders nothing.
//
// The document also says when it is live: every page paints its pre-rendered markup
// before the bundle runs, so "painted" no longer means "interactive". Once hydrated,
// the root element carries `data-hydrated` (never in the server markup, applied by the
// head runtime after the first commit), which is what the browser suite waits for
// before it clicks anything.
export function DocsHead({ title }: { title?: string }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const canonical = `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}`;
  return (
    <Head>
      <title>{title ? `${title} · ${SITE_NAME}` : SITE_NAME}</title>
      <link rel="canonical" href={canonical} />
      {hydrated ? <html data-hydrated="" /> : null}
    </Head>
  );
}
