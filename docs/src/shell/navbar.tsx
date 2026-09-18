import { Slot, usePathname, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, Row, Icon, Button, ButtonGroup, TabBar, OverlayProvider, useTheme, useFormFactor, liquidGlassAvailable, alpha, type IconProps } from "@ionizeio/canvas";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Sidebar } from "./sidebar";
import { Topbar, titleFor } from "./topbar";
import { MobileNavBar } from "./mobile-nav-bar";
import { SearchModal } from "./search-modal";
import { CanvasUniverse } from "../brand/canvas-universe";
import { WebScrollbarTheme, SCROLLBAR_W } from "../ui/web-scrollbar";
import { useDocsTheme } from "../theme/docs-theme";
import { sans } from "../ui/fonts";
import { MOBILE_TABS, sectionFor } from "../data/nav";

// The one adaptive navigation component. On the web it is the sidebar + topbar shell at
// desktop widths, and a mobile iOS-style shell (bottom tab bar + nav bar + category
// drill-down) at narrow widths; on iOS and Android it is a native tab bar (real Liquid
// Glass on iOS 26, Material 3 on Android, native sidebar on tablets via sidebarAdaptable)
// over the route groups. Screen bodies are platform-agnostic; this is the single,
// user-authorized platform branch, scoped to navigation chrome.
export function Navbar() {
  return Platform.OS === "web" ? <WebNav /> : <NativeNav />;
}

// iOS + Android: the native tab bar, built from nav.config.json's mobile.tabs. Each tab
// maps to a root route group ((home)/(components)/(utilities)) or the search screen. The
// icon names are validated app data, cast through to the SF Symbol / Material props.
function NativeNav() {
  const { tokens } = useTheme();
  // The iOS 26 Liquid Glass tab bar is system-painted and ignores every appearance prop
  // (backgroundColor / blurEffect — verified a red background had no effect in
  // react-native-screens 4.25), so theme ONLY Android's Material navigation bar to the app's
  // scheme. Without this it renders on a light surface even in dark mode. (Its M3 height +
  // gesture inset is system-controlled and stays the native bar's.)
  const androidTheme =
    Platform.OS === "android"
      ? {
          backgroundColor: tokens.card,
          iconColor: { default: tokens["muted-foreground"], selected: tokens.primary },
          labelStyle: { default: { color: tokens["muted-foreground"] }, selected: { color: tokens.primary } },
          indicatorColor: alpha(tokens.primary, 0.16),
          rippleColor: alpha(tokens.primary, 0.12),
        }
      : {};
  return (
    <NativeTabs sidebarAdaptable={Platform.OS === "ios"} minimizeBehavior="onScrollDown" {...androidTheme}>
      {MOBILE_TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.id} name={`(${tab.id})`} role={tab.role}>
          <NativeTabs.Trigger.Icon sf={tab.icon.ios as never} md={tab.icon.android as never} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

// The mobile-web bottom tab sections (the web counterpart of mobile.tabs): a kit Icon glyph
// + the section root href. The active section is derived from the path via sectionFor, so
// the bar highlights the right tab on any page within a section.
const MOBILE_SECTIONS = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "components", label: "Components", icon: "layoutGrid", href: "/components" },
  { id: "utilities", label: "Utilities", icon: "palette", href: "/tokens/colors" },
];

// The bottom tab bar's rightmost tab key: an action (opens search), not a section.
const SEARCH_TAB = "search";

// The kit Icon is styled by boolean glyph props; the section glyph is data, so it is built
// dynamically and cast to IconProps (the one place a name string drives the Icon).
function sectionIcon(name: string, active: boolean) {
  return { [name]: true, [active ? "primary" : "muted"]: true } as unknown as Omit<IconProps, "key">;
}

// The scheme + surface toggles live in ./theme-toggles now, shared with the native Android
// overflow sheet (iOS hosts the same controls as native UIMenu rows instead).

// Web (every width): desktop = sidebar + glass topbar; narrow = the mobile iOS shell (a
// bottom kit TabBar for the sections + the glass topbar whose hamburger drills into the
// current section's sub-nav, mirroring the native iOS app). cmd-K search modal, web
// scrollbar gutter, aurora wash in glass mode are shared.
function WebNav() {
  const { tokens, surface } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  // The kit's form-factor tier draws the same desktop line the old `width >= 1024`
  // check did (desktop is width > lg = 1024; only a viewport of exactly 1024 moves
  // from the desktop shell to the mobile shell, matching the sidebar's drawer cut).
  const wide = useFormFactor() === "desktop";
  const glass = surface === "glass";
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Global cmd-K / ctrl-K to toggle search (web only; document/window are web globals).
  useEffect(() => {
    if (Platform.OS !== "web") return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const section = sectionFor(pathname);
  const sectionRoot = MOBILE_SECTIONS.find((s) => s.id === section)?.href ?? "/";
  const atRoot = MOBILE_SECTIONS.some((s) => s.href === pathname);
  const goBack = () => (router.canGoBack() ? router.back() : router.push(sectionRoot as never));

  // Keep the route's ancestor chain stable across widths. Switching the whole shell
  // between a View and a Row remounts Slot, discarding open overlays and form drafts.
  // Only the navigation siblings change: desktop gets the sidebar rail and Topbar;
  // narrow web gets MobileNavBar, bottom tabs and the responsive sidebar drawer.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: glass ? "transparent" : tokens.background }} edges={["top"]}>
      <WebScrollbarTheme />
      {glass ? <CanvasUniverse /> : null}
      <Row flush fill>
        {wide ? (
          // The rail column is marked for the document root's one pre-hydration rule
          // (docs/src/app/+html.tsx): a pre-rendered page always carries the desktop
          // shell, because a server cannot measure a window, and on a phone that rail
          // would squeeze the content into the remaining 170px until the bundle ran.
          // The rule hides it below the desktop cut; after hydration the rail is
          // simply not rendered there, so the rule matches nothing. (A web-only
          // attribute, spread through a cast the way page.tsx marks its scroller.)
          <View {...({ dataSet: { shellRail: "" } } as object)}>
            <Sidebar collapsed={collapsed} collapsible onToggleCollapse={() => setCollapsed((c) => !c)} />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* The page content is the main landmark at every width. */}
          <View role="main" style={{ flex: 1 }}>
            <OverlayProvider viewport viewportInsets={{ top: headerHeight }}>
              <Slot />
            </OverlayProvider>
          </View>
          <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} style={{ position: "absolute", top: 0, left: 0, right: SCROLLBAR_W, zIndex: 10 }}>
            {wide ? (
              <Topbar showMenu onMenu={() => setCollapsed((c) => !c)} onSearch={() => setSearchOpen(true)} />
            ) : (
              <MobileNavBar
                title={titleFor(pathname).title}
                showBack={!atRoot}
                onBack={goBack}
                onMenu={() => setMenuOpen(true)}
              />
            )}
          </View>
        </View>
      </Row>
      {!wide ? (
        <View role="navigation" accessibilityLabel="Primary" aria-label="Primary">
          <TabBar
            items={[
              ...MOBILE_SECTIONS.map((s) => ({
                key: s.id,
                label: s.label,
                icon: (active: boolean) => <Icon {...sectionIcon(s.icon, active)} size={22} />,
              })),
              // Search opens the shared modal rather than navigating to a section.
              { key: SEARCH_TAB, label: "Search", icon: () => <Icon search muted size={22} /> },
            ]}
            active={section}
            onSelect={(key) => {
              if (key === SEARCH_TAB) {
                setSearchOpen(true);
                return;
              }
              const s = MOBILE_SECTIONS.find((m) => m.id === key);
              if (s) router.push(s.href as never);
            }}
            bottomInset={insets.bottom}
          />
        </View>
      ) : null}
      {!wide ? (
        <Sidebar responsive open={menuOpen} onOpenChange={setMenuOpen} onNavigate={() => setMenuOpen(false)} />
      ) : null}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </SafeAreaView>
  );
}
