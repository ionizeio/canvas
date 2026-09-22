import { SafeAreaProvider } from "react-native-safe-area-context";
import { OverlayProvider, ToastProvider } from "@ionizeio/canvas";
import { DocsThemeProvider } from "../theme/docs-theme";
import { useDocsFonts } from "../ui/fonts";
import { DocsHead } from "../ui/docs-head";
import { Navbar } from "../shell/navbar";

// On native the bottom tab triggers are declared (in nav.config.json's mobile.tabs order)
// as Home, Components, Utilities, Search — Search rightmost, mirroring the web shell. The
// app should still launch on Home: initialRouteName controls the initial focused route (not
// the visual order) and must match the route name literally, including the group parentheses.
export const unstable_settings = { initialRouteName: "(home)" };

// The whole app renders inside Canvas's ThemeProvider (via DocsThemeProvider) and a
// single adaptive Navbar: the sidebar/topbar shell on web, a native tab bar on iOS and
// Android. Everything below the providers is platform-agnostic screen content. The
// root OverlayProvider is the app-level overlay host: it is flex-sized (outside any
// scroller), so on Android it carries the window blur target for Modal frosts, and
// the ToastProvider's stack portals into its outlet, above every page. Page-level
// hosts still exist inside each scroller so anchored menus scroll with their triggers.
// The tree waits for the fonts on purpose, and it is worth knowing why before removing it.
// Rendering immediately and letting `display: swap` paint fallback text first looks like the
// obvious win, and it was measured: three Lighthouse runs per arm, same build, same server.
// First Contentful Paint did not reliably improve, but Cumulative Layout Shift went from
// 0.006 to 0.16 every time, because Geist's metrics differ enough from the fallback that
// reflowing the whole page on arrival blows straight past the 0.1 "good" threshold. The
// score went DOWN, 75 to 70. Removing this gate is only safe alongside a metric-matched
// fallback face (size-adjust / ascent-override), which React Native Web cannot express
// today because it emits a bare `font-family` with no fallback chain.
//
// On the web that gate is now open by construction: the export pre-renders every route
// (app.json `web.output: "static"`), the exporter writes the @font-face rules and preload
// links into each page's head, and useDocsFonts reports the web loaded outright, so the
// server render, the hydration render and every later render agree (docs/src/ui/fonts.ts).
// The measured Cumulative Layout Shift of that pre-rendered page is 0: the preloads start
// with the document and the faces arrive before the first frame on any ordinary connection.
// The gate still does its work on iOS and Android, where the faces are read from the bundle
// before the first frame.
export default function RootLayout() {
  const [fontsLoaded] = useDocsFonts();
  return (
    <SafeAreaProvider>
      <DocsHead />
      <DocsThemeProvider>
        {fontsLoaded ? (
          <OverlayProvider>
            <ToastProvider>
              <Navbar />
            </ToastProvider>
          </OverlayProvider>
        ) : null}
      </DocsThemeProvider>
    </SafeAreaProvider>
  );
}
