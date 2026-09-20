import { Platform } from "react-native";
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
// with its title, and the nearer one wins.
//
// Web only: a document head is a web thing. On iOS expo-router's Head is the Handoff
// and Spotlight bridge instead, and it reads the site origin out of the NATIVE build's
// embedded config, so any installed app built before the router plugin named that
// origin throws a render error on every screen that mounts one. Nothing here needs
// Handoff, so the head is not rendered off the web at all rather than tied to a rebuild.
//
// The document also says when it is live: every page paints its pre-rendered markup
// before the bundle runs, so "painted" no longer means "interactive". Once hydrated,
// the root element carries `data-hydrated` (never in the server markup, applied by the
// head runtime after the first commit), which is what the browser suite waits for
// before it clicks anything.
export function DocsHead({ title, path }: { title?: string; path?: string }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  if (Platform.OS !== "web") return null;
  // `path` overrides the router's own pathname for a caller that tracks its
  // canonical address itself (a component page whose in-page variant switch
  // updates the address bar without going through the router; see
  // ComponentBody in component-reference.tsx), so the canonical tag stays
  // accurate through that switch instead of lagging until the next real
  // navigation.
  const resolvedPath = path ?? pathname;
  const canonical = `${SITE_ORIGIN}${resolvedPath === "/" ? "/" : resolvedPath.replace(/\/+$/, "")}`;
  return (
    <Head>
      <title>{title ? `${title} · ${SITE_NAME}` : SITE_NAME}</title>
      <link rel="canonical" href={canonical} />
      {hydrated ? <html data-hydrated="" /> : null}
    </Head>
  );
}
