import { useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { Stack, usePathname, useRouter, useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Pressable, Icon, useTheme } from "@ionizeio/canvas";
import { titleFor } from "./topbar";
import { nativeMenuFor, sectionFor, getActiveGroup, getActiveSlug, type MenuNode } from "../data/nav";
import { GLYPH_RASTERS } from "../core/glyph-rasters";
import { Sidebar } from "./sidebar";
import { ThemeToggles } from "./theme-toggles";

// Wraps a screen's scroller so the native header (which drives the per-screen Stack title +
// menu, and hosts the Android overflow sheet) can sit as a sibling of the content. On web
// this is a no-op passthrough: it renders the scroller exactly as before, with NO wrapping
// View, so the web build stays byte-identical (an extra flex wrapper there collapses
// onLayout-measured tile grids).
export function ScreenFrame({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") return <>{children}</>;
  return (
    <View style={{ flex: 1 }}>
      {children}
      <NativeHeader />
    </View>
  );
}

// Per-screen config for the NATIVE iOS/Android navigation bar (a real UINavigationBar,
// Liquid Glass on iOS 26; a Material top app bar on Android). It sets the title and the
// section menu. Search is NOT here: it lives in the bottom tab bar (the rightmost Search
// tab opens the full-screen search screen). Returns null on web, where the build keeps
// its own custom Topbar + cmd-K modal.
//
// MUST render as a sibling of (not inside) each screen's scroller (a no-op passthrough on
// web), so it can drive the per-screen Stack header options without wrapping the scroller.
//
// The menu is the section's secondary nav (the dropped inline pills + overflow, merged,
// so e.g. the Utilities token pages stay reachable). Components has no menu (its body
// CatSubBar is the nav). usePathname() is global, so gating on focus keeps a backgrounded
// push screen from overwriting its own title (the native back button reads the right
// label) and stops its overlay from showing under the active screen.
export function NativeHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  if (Platform.OS === "web" || !isFocused) return null;

  const title = titleFor(pathname).title;
  // Where we are now: the current page's category + slug, so the menu marks the current page
  // and (in Components) surfaces its category inline.
  const activeGroup = getActiveGroup(pathname);
  const activeSlug = getActiveSlug(pathname);
  const nodes = nativeMenuFor(sectionFor(pathname), activeGroup);

  // iOS: a native pull-down UIMenu in the trailing slot. Flat sections (Home/Utilities) are
  // action rows; Components is a list of category SUBMENUS, each holding its component pages,
  // so iOS slides over to the category's items natively. The current page is check-marked
  // (state "on"), and on a component page its category is surfaced FIRST as an inline section
  // (the native menu can't reopen pre-drilled into a submenu, so this reflects where you are);
  // the remaining categories stay as drill-in submenus. The trailing items are ALWAYS declared
  // (returning [] when this section has no menu): the native bar merges options across the
  // sibling tab stacks, so a bare omission would leave a previous section's menu showing here,
  // and an explicit [] clears it.
  if (Platform.OS === "ios") {
    // Recursively map the menu tree to native UIMenu items: a leaf becomes an action
    // (check-marked when it is the current page), a submenu becomes a native submenu that
    // slides over natively (nested arbitrarily deep, e.g. Home -> Components -> Atoms -> page).
    // The lucide glyph as a native menu-item image: a bundled template PNG (its Metro
    // module id) that iOS tints to the menu label color, so the row shows the SAME icon
    // the web sidebar / Android drawer render. Every menu glyph is baked by
    // `bun run raster:gen`, so a lookup miss means a stale map (regenerate); undefined
    // then just omits the icon rather than crashing.
    //
    // WORKAROUND (2026-08-25): the image icons are temporarily disabled. On the
    // Expo SDK 57 stack (react-native 0.86.2, new architecture, iOS 26) any
    // `type:"image"` icon on a header menu item throws RNSScreenStackHeaderConfig's
    // shadow-state update into an infinite ShadowTree commit-retry loop, and debug
    // builds abort at launch on the `attempts < 1024` assert in ShadowTree.cpp.
    // Bisected: the menu without image icons is fine, the sfSymbol icon on the Menu
    // button is fine, tinted and untinted images both crash; react-native-screens
    // 4.26.2 and 4.27.0 both reproduce it. Filed upstream with a standalone repro:
    // https://github.com/software-mansion/react-native-screens/issues/4549 (repro:
    // https://github.com/bnannier/rns-header-item-image-repro). The full recipe is
    // image icons + the type:"custom" ThemeToggles item + a large early commit;
    // dropping the icons is the least
    // invasive workaround. Flip this flag back on once a fixed release lands and
    // a dev build boots with it.
    const NATIVE_MENU_IMAGE_ICONS = false;
    type MenuIcon = { type: "image"; source: number; tinted: true };
    const glyphIcon = (name: string): MenuIcon | undefined => {
      if (!NATIVE_MENU_IMAGE_ICONS) return undefined;
      const source = GLYPH_RASTERS[name];
      return source != null ? { type: "image", source, tinted: true } : undefined;
    };
    type NativeMenuItem =
      | { type: "action"; label: string; icon?: MenuIcon; onPress: () => void; state?: "on" }
      | { type: "submenu"; label: string; icon?: MenuIcon; inline?: boolean; items: NativeMenuItem[] };
    const toItems = (ns: MenuNode[]): NativeMenuItem[] =>
      ns.map((n): NativeMenuItem =>
        n.kind === "leaf"
          ? { type: "action", label: n.label, icon: glyphIcon(n.icon), onPress: () => router.push(n.href as never), ...(n.slug === activeSlug ? { state: "on" as const } : {}) }
          : { type: "submenu", label: n.label, icon: glyphIcon(n.icon), ...(n.inline ? { inline: true as const } : {}), items: toItems(n.items) },
      );
    const items = toItems(nodes);
    return (
      <Stack.Screen
        options={{
          headerTitle: title,
          // Two trailing items: the section / site-map menu (a native UIMenu), and the kit
          // appearance toggles (surface + light/dark) beside it — the SAME ThemeToggles the
          // Android bar shows. They ride the native bar as a `type:"custom"` item: a React
          // `headerRight` view is dropped when native items are present, so `custom` is how a
          // React element composes alongside the native menu (and it is exempt from iOS 26's
          // auto-collapse-into-a-menu behaviour, so it stays visible).
          unstable_headerRightItems: () => [
            { type: "custom" as const, element: <ThemeToggles compact /> },
            {
              type: "menu" as const,
              label: "Menu",
              icon: { type: "sfSymbol", name: "line.3.horizontal" } as const,
              menu: { items },
            },
          ],
        }}
      />
    );
  }

  // Android: a Material top app bar carrying the appearance controls (Solid/Glass + light/dark)
  // always-visible in the trailing slot, matching the web's top-right controls, followed by the
  // section-menu hamburger. The hamburger opens the responsive Sidebar as an M3 start-edge
  // navigation drawer (the same kit Sidebar the desktop web shows as a rail, drilled down for the
  // phone). Appearance lives in the bar, not the drawer. (iOS hosts the menu + appearance in the
  // native header UIMenu; see the branch above.)
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: title,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ThemeToggles compact />
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={{ paddingHorizontal: 8 }} accessibilityRole="button" accessibilityLabel="Menu">
                <Icon menu size={22} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Sidebar
        responsive
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onNavigate={() => setMenuOpen(false)}
        // Lift the drawer's last rows above the native Material tab bar (M3 80dp, which paints on
        // top of the drawer's Modal). Guarded by the gesture inset for taller nav bars.
        drawerContentInsetBottom={Math.max(96, insets.bottom + 72)}
      />
    </>
  );
}
