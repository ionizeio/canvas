import { Platform } from "react-native";
import { Sidebar as KitSidebar, Pressable, Row, Column, Typography, useFormFactor, type IconName, type SidebarSection } from "@ionizeio/canvas";
import { usePathname, useRouter } from "expo-router";
import { CanvasMark } from "../brand/canvas-mark";
import { ThemeToggles } from "./theme-toggles";
import { NAV_GROUPS, getActiveSlug, type NavItem } from "../data/nav";

// The docs sidebar is a THIN ADAPTER over the kit `Sidebar` organism: it maps the docs nav
// tree (NAV_GROUPS) + the active route onto the kit component and wires navigation. All the
// chrome (the mini icon-rail collapse, the accordion category groups, the header/footer
// slots, the single active highlight, the internal scroll) lives in the kit now — the docs
// hand-roll nothing. This is the dogfood: the sidebar on the left of the docs IS the kit
// `Sidebar`, so `sidebar.md`'s "same component" line is finally true.

// A docs NavItem -> a kit SidebarItem: the slug is its id (so the active route drives the
// highlight) and the href rides along as data the onSelect handler routes with. The nav
// config's glyph names are Canvas glyph keys already, so they cast straight to IconName.
const toItem = (i: NavItem) => ({ id: i.slug, label: i.label, icon: i.icon as IconName, href: i.href });

export function Sidebar({
  onNavigate,
  collapsed = false,
  collapsible = false,
  onToggleCollapse,
  responsive = false,
  open,
  onOpenChange,
  drawerContentInsetBottom,
  drawerRight,
  drawerTop,
  drawerBottom,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: () => void;
  /** Below the lg breakpoint, render as a start-edge drill-down drawer (opened by `open`). */
  responsive?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Bottom clearance for the drawer content (e.g. the native tab bar on Android). */
  drawerContentInsetBottom?: number;
  /** Which edge the drawer slides from (default left). */
  drawerRight?: boolean;
  drawerTop?: boolean;
  drawerBottom?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeSlug = getActiveSlug(pathname);
  // At and below lg the sidebar is the drill-down drawer; the drawer footer hosts the appearance
  // toggles on mobile-web (the old bottom-sheet footer's home), matching the Android header bar.
  // Phone and tablet form factors are exactly the old `width > 0 && width <= 1024` band
  // (an unknown 0 viewport resolves desktop-first, i.e. not narrow, as before).
  const narrow = useFormFactor() !== "desktop";

  // Overview is pinned (no header); Tokens is pinned with its heading; the category groups
  // are collapsible accordion sections (the kit auto-opens the one holding the active page).
  const sections: SidebarSection[] = [
    { id: "overview", items: NAV_GROUPS[0].items.map(toItem) },
    { id: NAV_GROUPS[1].label, title: NAV_GROUPS[1].label, items: NAV_GROUPS[1].items.map(toItem) },
    ...NAV_GROUPS.slice(2).map(
      (g): SidebarSection => ({ id: g.label, title: g.label, icon: g.icon as IconName, collapsible: true, items: g.items.map(toItem) }),
    ),
  ];

  return (
    <KitSidebar
      compact
      active={activeSlug}
      collapsed={collapsed}
      collapsible={collapsible}
      onToggleCollapse={onToggleCollapse}
      responsive={responsive}
      open={open}
      onOpenChange={onOpenChange}
      drawerContentInsetBottom={drawerContentInsetBottom}
      drawerRight={drawerRight}
      drawerTop={drawerTop}
      drawerBottom={drawerBottom}
      onSelect={(item) => {
        if (item.href) router.push(item.href as never);
        onNavigate?.();
      }}
      header={(isCollapsed) => {
        // The brand lockup is a link home, the convention for a site logo. Wraps both the
        // collapsed mark and the expanded lockup so the whole logo area is the target, and
        // closes the drawer after (onNavigate) exactly as picking a nav item does.
        const goHome = () => {
          router.push("/");
          onNavigate?.();
        };
        return isCollapsed ? (
          <Pressable onPress={goHome} accessibilityRole="link" accessibilityLabel="Canvas, go to home">
            <CanvasMark size={26} />
          </Pressable>
        ) : (
          // The mark is sized to the text lockup beside it: the two-line text block is 33px
          // (`body` 14 + `tiny` 12, both `tightLeading` to 1.25x -> 18 + 15), and the 32 mark
          // box sits just under it, `alignCenter` co-centering the two so the logo reads about
          // the same height as the text. (A mark larger than 26 is why the wordmark no longer starts on the item
          // LABEL column: with the 14px header inset + `snug` 8px gap, only a 26 mark lands the
          // text at x=48, and any larger mark pushes it right. The bigger logo wins that trade.)
          // `body` keeps the wordmark on `foreground` at 14 (the next step down from `lead`; the
          // 14px `small`/`muted` roles would grey it). `tiny` alone is already muted-foreground,
          // and adding `muted` would win the role axis and size the tagline at the wordmark's own
          // size. `flush` adds nothing between the lines (a gap prop can only add), leaving the
          // roles' own optical gap.
          // No accessibilityLabel here on purpose, so the accessible name is computed from
          // the content and is therefore exactly the visible text: "Canvas design system".
          // That satisfies WCAG 2.5.3 (Label in Name) by construction. An explicit label
          // cannot: this lockup is two stacked lines, and axe joins their text with no
          // separator, so it compares the name against "Canvasdesign system" (verified by
          // running the rule against the deployed page) which no readable label contains.
          // The role already announces it as a link, and a logo returning home is the
          // convention, so the dropped "go to home" wording costs nothing. The collapsed
          // variant above still needs its label, having no visible text to name it.
          <Pressable onPress={goHome} accessibilityRole="link">
            <Row snug alignCenter>
              <CanvasMark size={32} />
              <Column flush>
                <Typography body semibold tightLeading>
                  Canvas
                </Typography>
                <Typography tiny tightLeading>
                  design system
                </Typography>
              </Column>
            </Row>
          </Pressable>
        );
      }}
      footer={
        // Only the mobile-web drawer carries a footer: the appearance toggles (their old
        // bottom-sheet-footer home). Native puts appearance in the header bar; the desktop
        // rail has no footer.
        Platform.OS === "web" && narrow ? <ThemeToggles /> : undefined
      }
      sections={sections}
    />
  );
}
