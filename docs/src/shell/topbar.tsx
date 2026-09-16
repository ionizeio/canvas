import { Linking, Platform } from "react-native";
import { View, Text, Pressable, Button, ButtonGroup, Kbd, Icon, useTheme, useBreakpoint, GlassSurface, liquidGlassAvailable, alpha } from "@nannier-com/canvas";
import { usePathname } from "expo-router";
import { getComponent } from "../core/data/components";
import { getTemplate } from "../core/data/templates";
import { getPattern } from "../core/data/patterns";
import { useDocsTheme } from "../theme/docs-theme";
import { Github } from "../brand/brand-logos";
import { sans } from "../ui/fonts";

// The public repository the GitHub button in the bar links back to (mirrors the home page's link).
const REPO_URL = "https://github.com/ionizeio/canvas";

// The topbar overlays the scrolling content (so its glass frost refracts what
// scrolls behind it). Content scrollers add this as a top inset so their first row
// starts below the bar.
export const TOPBAR_HEIGHT = 56;

// Top inset content scrollers add for the overlaying top bar. On web the custom Topbar is
// an absolute overlay, so content must clear it (TOPBAR_HEIGHT). On native the real
// UINavigationBar owns the inset via contentInsetAdjustmentBehavior="automatic", so the
// content adds nothing (0) and lets iOS place it under the collapsing large title.
export const CONTENT_TOP_INSET = Platform.OS === "web" ? TOPBAR_HEIGHT : 0;

function titleize(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const STATIC_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Canvas", subtitle: "Design System" },
  "/components": { title: "All components", subtitle: "Overview" },
  "/tokens/colors": { title: "Colors & Theme", subtitle: "Tokens" },
  "/tokens/spacing": { title: "Spacing & Shape", subtitle: "Tokens" },
  "/tokens/typography": { title: "Typography", subtitle: "Tokens" },
  "/tokens/layout": { title: "Layout & Flexbox", subtitle: "Tokens" },
  "/theming": { title: "Theming", subtitle: "Foundations" },
  "/integration": { title: "Integration", subtitle: "Guides" },
  "/browser-support": { title: "Browser Support", subtitle: "Guides" },
  "/rn-primitives": { title: "React Native", subtitle: "Guides" },
  "/privacy": { title: "Privacy Policy", subtitle: "Guides" },
  "/licenses": { title: "Open Source Licenses", subtitle: "Guides" },
  "/boilerplate": { title: "Boilerplate", subtitle: "Overview" },
};

export function titleFor(pathname: string): { title: string; subtitle?: string } {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "components" && seg[1]) {
    const c = getComponent(seg[1]);
    if (c) return { title: c.name, subtitle: c.category };
  }
  if (seg[0] === "templates" && seg[1]) return { title: getTemplate(seg[1])?.name ?? titleize(seg[1]), subtitle: "Templates" };
  if (seg[0] === "patterns" && seg[1]) return { title: getPattern(seg[1])?.name ?? titleize(seg[1]), subtitle: "Patterns" };
  return { title: "Canvas" };
}

export function Topbar({ showMenu, onMenu, onSearch }: { showMenu: boolean; onMenu: () => void; onSearch?: () => void }) {
  const { tokens } = useTheme();
  const { scheme, surface, toggleScheme, setSurface } = useDocsTheme();
  const pathname = usePathname();
  const { title, subtitle } = titleFor(pathname);
  // Anything above the sm bucket (width > 640) keeps the full search pill and subtitle;
  // the sm bucket gets the compact bar (exactly 640 was wide before and is compact now).
  const wideEnough = useBreakpoint() !== "sm";
  // On iOS 26 glass is the platform default (and not toggleable here), so the Glass
  // toggle only shows where glass is opt-in: web, Android, and iOS < 26. Shown at
  // every width there (including phone), beside the theme toggle.
  const showGlassToggle = !liquidGlassAvailable();

  // GlassSurface paints the glass material in glass mode (native Liquid Glass on
  // iOS, an SVG displacement lens on Chromium web, an expo-blur frost on the rest
  // of web and on Android) and the solid background otherwise. The toggle is
  // labeled for the MODE, not for one platform's material, which is why it reads
  // Glass rather than Frost.
  return (
    // The topbar is the site header, so it is the banner landmark: it holds the brand
    // row, search and the theme controls, which otherwise sit outside any landmark.
    <GlassSurface
      role="banner"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        height: TOPBAR_HEIGHT,
        paddingHorizontal: wideEnough ? 24 : 16,
        borderBottomWidth: 1,
        borderColor: tokens.border,
        backgroundColor: tokens.background,
      }}
    >
      {showMenu ? (
        <Button
          ghost
          icon
          small
          accessibilityLabel="Toggle menu"
          iconLeft={<Icon menu size={18} />}
          onPress={onMenu}
          style={{ marginLeft: -2 }}
        />
      ) : null}

      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <Text style={{ fontFamily: sans("600"), fontSize: 14.5, color: tokens.foreground }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && wideEnough ? (
          <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Two flex spacers around the search center it and pin the toggle + theme
          button to the right edge, so the bar fills the full width.
          The search is a fixed-width element, not the flexing one. */}
      <View style={{ flex: 1 }} />

      {wideEnough ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSearch}
          style={{
            minWidth: 240,
            maxWidth: 360,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 7,
            paddingHorizontal: 14,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: alpha(tokens.muted, 0.3),
          }}
        >
          <Icon search size={13} muted />
          <Text style={{ flex: 1, fontFamily: sans("400"), fontSize: 12.5, color: tokens["muted-foreground"] }}>
            Search components...
          </Text>
          <Kbd>⌘K</Kbd>
        </Pressable>
      ) : onSearch ? (
        // Phone: the full search pill doesn't fit, so a compact search icon button keeps
        // search reachable in the bar (the iOS nav-bar search affordance).
        <Button ghost icon small accessibilityLabel="Search" iconLeft={<Icon search size={16} />} onPress={onSearch} />
      ) : null}

      <View style={{ flex: 1 }} />

      <Button
        ghost
        icon
        small
        accessibilityLabel="View Canvas on GitHub"
        iconLeft={<Github size={16} color={tokens.foreground} />}
        onPress={() => Linking.openURL(REPO_URL)}
      />

      {showGlassToggle ? (
        <ButtonGroup
          segmented
          small
          accessibilityLabel="Surface"
          items={["Solid", "Glass"]}
          active={surface === "solid" ? 0 : 1}
          onSelect={(i) => setSurface(i === 0 ? "solid" : "glass")}
        />
      ) : null}

      <Button
        ghost
        icon
        small
        accessibilityLabel="Toggle color scheme"
        iconLeft={scheme === "dark" ? <Icon sun size={16} /> : <Icon moon size={16} />}
        onPress={toggleScheme}
      />
    </GlassSurface>
  );
}
