import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, type GestureResponderEvent } from "react-native";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { selectionTint } from "../../style/selection-tint.js";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  RippleClip,
  cornerRadii,
  useTheme,
  useControllableState,
  useReducedMotion,
  supportsNativeDriver,
  GlassSurface,
  GlassPane,
  paneStyle,
  isGlass,
  breakpoints,
  useBreakpoint,
  devWarn,
  type BreakpointKey,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Drawer } from "../drawer/drawer.js";
import { type Density, type Frame } from "./sidebar.styles.js";
import { SidebarItemBadge, type SidebarItem, type SidebarSection } from "./sidebar.item.js";
import { createSidebarDrillDown } from "./sidebar.drilldown.js";

/** The Icon color booleans a nav row's glyph can carry, per active state (the
 *  skin picks foreground (default), `muted`, or brand `primary`). */
export type SidebarIconTint = { primary?: boolean; muted?: boolean };

// Shared Sidebar shell. The structure (the outer column, the titled sections, the
// nav rows with their leading icon / label / trailing badge, the single active
// highlight, the optional mini icon-rail collapse, the collapsible accordion
// sections, and the header/footer slots), the section normalization, the flat-index
// active matching, the density/frame precedence, the accessibility, and the select
// handler live here once; a platform file supplies only its skin (the row shape,
// the selected-row highlight + label/icon color, the section heading, the frame, the
// collapse + accordion + slot chrome, the press feedback) and calls createSidebar.
//
// A sidebar is the vertical app-navigation panel that runs down the left of a
// layout: an optional list of titled sections, each holding nav rows. A row is a
// leading icon glyph + label, with at most one row carrying the active highlight
// and the rest sitting inactive. Rows may carry a trailing count <Badge>, secondary
// by default and in the error status tone when the row sets `badgeError`.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf).
//
// - Density axis (pick one; default is the comfortable row): `compact` tightens
//   each row's padding and drops the type a step for dense navigation.
// - Frame axis (pick one; default is the flush, right-bordered column that docks
//   against the page): `bordered`/`floating` lift the panel into a fully bordered,
//   rounded card surface. `bordered` wins over `floating` when both are passed.
// - Collapse axis: `collapsed`/`defaultCollapsed` shrink the panel to a mini
//   icon-rail; `collapsible` shows the header toggle.
// - Sections may be `collapsible` (accordion groups); the accordion open-state
//   mirrors the kit Accordion (single-open by default, `independentSections` for
//   many-open, controllable via `openSections`).
// - `header`/`footer` slots turn the panel into a pinned header + scrolling body
//   (+ pinned footer) app-navigation shell.

// The platform-varying surface. Everything color/shape-bearing the rows, the
// frame, the section heading, and the collapse/accordion/slot chrome need lives
// here, built from the active tokens (so each follows light/dark and the glass
// surface).
export interface SidebarSkin {
  /** Web paints the accent fill on a pressed (non-active) row; iOS/Android don't. */
  pressedFill: boolean;
  /** iOS dims the row on press; web/Android don't (null). */
  pressedOpacity: number | null;
  /** Android ripple over a pressed row; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Web-only focus-outline reset for the row Pressables. iOS sets this so the
   * react-native-web keyboard-focus blue ring (which a real iOS device never
   * shows on a sidebar nav row) is suppressed, leaving the press dim as the only
   * feedback. Undefined on web/Android, which keep their own focus treatment.
   * No-op natively, where `outlineStyle`/`outlineWidth` are not real CSS.
   */
  focusOutlineReset?: ViewStyle;

  /** The outer navigation column, per frame. `collapsed` swaps to the rail width;
   *  `shell` (a header/footer is present) drops the inner padding/gap onto the
   *  scroll body and fills the parent height. */
  column: (t: ColorTokens, frame: Frame, collapsed: boolean, shell: boolean) => ViewStyle;
  /** A titled group of nav rows. */
  group: ViewStyle;
  /** The section heading above a pinned group. */
  sectionTitle: (t: ColorTokens) => TextStyle;
  /** The nav-row container (shape + density padding); `collapsed` centers the icon. */
  row: (t: ColorTokens, density: Density, collapsed: boolean) => ViewStyle;
  /** The selected-row highlight fill (null when not active). */
  rowFill: (t: ColorTokens, active: boolean) => ViewStyle | null;
  /** The row label (flex, type, color), per active state + density. */
  label: (t: ColorTokens, active: boolean, density: Density) => TextStyle;
  /** The leading Canvas icon's color booleans, per active state. */
  iconTint: (active: boolean) => SidebarIconTint;
  /** The leading Canvas icon size (px), per platform. */
  iconSize: number;

  // --- collapse (mini icon-rail) ---
  /** The panel width when collapsed. */
  collapsedWidth: number;
  /** The header collapse/expand toggle button hit area. */
  collapseToggle: (t: ColorTokens) => ViewStyle;
  /** The collapse toggle glyph size (glyph is `chevronLeft`, muted). */
  collapseIconSize: number;

  // --- shell slots ---
  /** The pinned header block (holds the brand slot + collapse toggle) + its divider. */
  header: (t: ColorTokens, collapsed: boolean) => ViewStyle;
  /** The pinned footer block + its divider. */
  footer: (t: ColorTokens, collapsed: boolean) => ViewStyle;
  /** The scrolling body wrapper ({ flex: 1 }). */
  scroll: ViewStyle;
  /** The scroll body contentContainer inset + inter-section gap. */
  scrollContent: (t: ColorTokens, collapsed: boolean) => ViewStyle;

  // --- collapsible section header (accordion) ---
  /** The collapsible-section header row layout. */
  sectionHeaderRow: (t: ColorTokens) => ViewStyle;
  /** The collapsible-section header title type (flex, no standalone padding). */
  sectionHeaderTitle: (t: ColorTokens) => TextStyle;
  /** The disclosure chevron glyph at rest (chevronRight iOS/web; chevronDown M3). */
  sectionChevronGlyph: "chevronRight" | "chevronDown";
  /** Degrees the chevron rotates to when open (90 iOS/web; 180 M3). */
  sectionChevronSpinTo: number;
  /** The disclosure chevron glyph size. */
  sectionChevronSize: number;
  /** The brand dot marking a section that holds the active row. */
  activeDot: (t: ColorTokens) => ViewStyle;

  // --- narrow drill-down drawer (responsive) ---
  /** The back-row layout for a drilled-in level of the responsive drawer. */
  drillBackRow: (t: ColorTokens) => ViewStyle;
  /** The back-row title type (the parent section's name). */
  drillBackTitle: (t: ColorTokens) => TextStyle;
}

// A row and a section are data, and they live in sidebar.item beside the badge
// drawn from them, so the narrow drill-down can read both without importing this
// module back. Re-exported here because this is where every per-OS file takes the
// Sidebar's public types from.
export type { SidebarItem, SidebarSection } from "./sidebar.item.js";

export interface SidebarProps {
  /** Titled sections of nav rows. Use this or the flat `items` array. */
  sections?: SidebarSection[];
  /** Flat list of nav rows, wrapped into a single untitled section. */
  items?: SidebarItem[];
  /** The active row (CONTROLLED), by id, by label, or by flat index across all rows. Omit for uncontrolled use. */
  active?: string | number;
  /** Initial active row for uncontrolled use (a bare sidebar moves the highlight on press). */
  defaultActive?: string | number;
  /** Fired with the selected row and its flat index across all sections. */
  onSelect?: (item: SidebarItem, index: number, event: GestureResponderEvent) => void;
  // Density (pick one; default is the comfortable row).
  compact?: boolean;
  // Frame (pick one; default is the flush right-bordered column).
  bordered?: boolean;
  floating?: boolean;

  // Collapse axis (the mini icon-rail).
  /** Collapsed to the mini icon-rail (CONTROLLED). Omit for uncontrolled use. */
  collapsed?: boolean;
  /** Initial collapsed state for uncontrolled use (default expanded). */
  defaultCollapsed?: boolean;
  /** Show the collapse/expand toggle in the header slot. */
  collapsible?: boolean;
  /** Fired when the user taps the collapse/expand toggle. */
  onToggleCollapse?: () => void;

  // Accordion open-state (for `collapsible` sections; mirrors Accordion's value API).
  /** Open collapsible sections (CONTROLLED), by section id/title. A single key by
   *  default, an array when `independentSections`. Pair with `onOpenSectionsChange`. */
  openSections?: string | string[];
  /** Initial open sections for uncontrolled use. */
  defaultOpenSections?: string | string[];
  /** Fired with the next open sections whenever a section header toggles. */
  onOpenSectionsChange?: (value: string | string[]) => void;
  /** Allow more than one collapsible section open at once (default: one-open-at-a-time). */
  independentSections?: boolean;

  // Responsive drawer axis: at and below `drawerBreakpoint` the sidebar renders as a
  // start-edge (left, RTL-aware) DRILL-DOWN Drawer instead of the inline rail, opened by a
  // consumer-owned hamburger. The rail is unchanged above the breakpoint.
  /** Opt in to the responsive rail->drawer behavior. Off by default: a bare sidebar is the
   *  inline rail at every width, byte-identical to before. */
  responsive?: boolean;
  /** The narrow drawer's open state (CONTROLLED). The consumer wires its hamburger to this. */
  open?: boolean;
  /** Initial open state for the uncontrolled narrow drawer (default closed). */
  defaultOpen?: boolean;
  /** Fired when the narrow drawer opens or closes (scrim tap, back, or a leaf selection). */
  onOpenChange?: (open: boolean) => void;
  /** The width at and below which `responsive` switches to the drawer (default `lg` = 1024). */
  drawerBreakpoint?: BreakpointKey;
  /** The narrow drawer panel width in px (default 288). */
  drawerWidth?: number;
  /** Extra bottom padding for the drawer's scrolling content, so its last rows clear persistent
   *  chrome painting over the drawer (e.g. a native bottom tab bar on Android). */
  drawerContentInsetBottom?: number;

  // Responsive drawer EDGE axis: which side the drawer slides from (default = the start/left
  // edge). First match wins; pass none for the default left. Only applies in drawer mode.
  /** Slide the drawer in from the end (right) edge instead of the start (left). */
  drawerRight?: boolean;
  /** Drop the drawer down from the top edge (a top sheet). */
  drawerTop?: boolean;
  /** Raise the drawer up from the bottom edge (a bottom sheet). */
  drawerBottom?: boolean;

  /** Optional top slot (a brand lockup / logo). A render function receives the
   *  collapsed state so it can show a compact mark in the rail. When `header` or
   *  `footer` is set, the panel becomes a pinned header + scrolling body (+ footer). */
  header?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Optional bottom slot (pinned below the scrolling sections). A render function
   *  receives the collapsed state so it can show a compact (icon-only) footer in the rail. */
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);

  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Density precedence when more than one is passed: first match wins.
function densityOf(p: SidebarProps): Density {
  if (p.compact) return "compact";
  return "default";
}

// Frame precedence when more than one is passed: first match wins.
function frameOf(p: SidebarProps): Frame {
  if (p.bordered) return "bordered";
  if (p.floating) return "bordered";
  return "flush";
}

// A section's accordion key / React key: its id, else its title, else its position.
function sectionKeyOf(s: SidebarSection, gi: number): string {
  return String(s.id ?? s.title ?? gi);
}

// Normalize the open value (controlled or the internal store) into a Set of keys,
// regardless of the single (string) or independent (string[]) shape. Mirrors the
// kit Accordion so single-open collapse round-trips through the "" sentinel.
function toSet(value: string | string[] | undefined): Set<string> {
  if (value == null || value === "") return new Set();
  return new Set(Array.isArray(value) ? value : [value]);
}

// Project a Set of open keys back into the public value shape: an array when
// independent, the first (or "") in single-open mode.
function fromSet(open: Set<string>, independent: boolean): string | string[] {
  if (independent) return [...open];
  return open.size ? [...open][0] : "";
}

// The collapsed rail hides the label, so fold the badge count into the accessible
// name rather than losing it.
function rowA11yLabel(item: SidebarItem): string {
  return item.badge != null ? `${item.label}, ${item.badge}` : item.label;
}

/** Build a Sidebar component from a platform skin. */
export function createSidebar(skin: SidebarSkin) {
  // The rotating disclosure chevron for a collapsible section header (mirrors the
  // kit Accordion: 0deg collapsed -> skin.sectionChevronSpinTo open; Reduce Motion
  // snaps it).
  function SectionChevron({ open }: { open: boolean }) {
    const reduced = useReducedMotion();
    const spin = useRef(new Animated.Value(open ? 1 : 0)).current;
    useEffect(() => {
      Animated.timing(spin, { toValue: open ? 1 : 0, duration: reduced ? 0 : 180, useNativeDriver: supportsNativeDriver }).start();
    }, [open, spin, reduced]);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${skin.sectionChevronSpinTo}deg`] });
    return (
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Icon {...{ [skin.sectionChevronGlyph]: true }} muted size={skin.sectionChevronSize} />
      </Animated.View>
    );
  }

  // The narrow-viewport drill-down body, built once from this skin (mirrors SectionChevron).
  const SidebarDrillDown = createSidebarDrillDown(skin);

  return function Sidebar(props: SidebarProps) {
    const { sections, items, onSelect, header, footer, collapsible, onToggleCollapse, testID, style } = props;
    const density = densityOf(props);
    const frame = frameOf(props);
    const { tokens, dark } = useTheme();
    const material = useMaterialTheme({ layer: "control" });
    const glass = isGlass(material);

    // Controlled when the matching prop is provided, self-managed otherwise, so a
    // bare sidebar moves the highlight / collapses on interaction.
    const [active, setActive] = useControllableState<string | number | undefined>(props.active, props.defaultActive);
    const [collapsed, setCollapsed] = useControllableState<boolean>(props.collapsed, props.defaultCollapsed ?? false);

    // Responsive drawer (opt-in): the narrow drawer's open flag + the current mode. The
    // bucket resolves to "base" while the width is unknown (0 at first paint), so the
    // layout defaults to the rail and never flashes.
    const [drawerOpen, setDrawerOpen] = useControllableState<boolean>(props.open, props.defaultOpen ?? false, props.onOpenChange);
    const bucket = useBreakpoint();
    const asDrawer =
      !!props.responsive && bucket !== "base" && breakpoints[bucket] <= breakpoints[props.drawerBreakpoint ?? "lg"];
    // The inline rail is unusable chrome on a phone; `responsive` is opt-in only
    // because the drawer needs a consumer-owned hamburger (open/onOpenChange), so
    // surface the gap in DEV instead of silently rendering a 240px column.
    devWarn(
      !props.responsive && bucket === "sm",
      "[canvas] <Sidebar>: rendering the inline rail at a phone-width viewport. Pass `responsive` (with `open`/`onOpenChange` wired to your hamburger) to switch to the drill-down drawer below the `drawerBreakpoint`.",
    );

    // Normalize to a sections list; a flat `items` array becomes one untitled
    // section. Sections always win when both are supplied.
    const groups: SidebarSection[] = sections ?? (items ? [{ items }] : []);

    // Resolve the active row to a SINGLE flat index up front: scan the flattened
    // rows in order and pick the FIRST whose flat index (numeric `active`), id, or
    // label (string `active`) matches. Guarantees exactly one active row.
    const activeIndex = ((): number => {
      if (active == null) return -1;
      let scan = -1;
      for (const section of groups) {
        for (const item of section.items) {
          scan += 1;
          if (typeof active === "number" ? active === scan : active === item.id || active === item.label) {
            return scan;
          }
        }
      }
      return -1;
    })();

    // Precompute each item's flat index so a CLOSED collapsible section still
    // advances the counter — indices stay stable for `active`/`onSelect` whether or
    // not a section is open.
    let flat = -1;
    const indexed = groups.map((section, gi) => ({
      section,
      key: sectionKeyOf(section, gi),
      rows: section.items.map((item) => ({ item, index: (flat += 1) })),
    }));

    // The key of the section that OWNS the active row — drives auto-open + the
    // header active-dot.
    const activeSectionKey = activeIndex < 0 ? null : (indexed.find((g) => g.rows.some((r) => r.index === activeIndex))?.key ?? null);

    // Accordion open-set (controllable), one-open-at-a-time unless independent.
    const independent = !!props.independentSections;
    const [openInternal, setOpenInternal] = useState<Set<string>>(() => {
      const seed = toSet(props.defaultOpenSections);
      groups.forEach((s, gi) => {
        if (s.collapsible && s.defaultOpen) seed.add(sectionKeyOf(s, gi));
      });
      // In single-open mode keep at most the first seeded section open.
      return independent || seed.size <= 1 ? seed : new Set([[...seed][0]]);
    });
    const openControlled = props.openSections !== undefined;
    const openSet = openControlled ? toSet(props.openSections) : openInternal;

    const emitOpen = (next: Set<string>) => {
      if (!openControlled) setOpenInternal(next);
      props.onOpenSectionsChange?.(fromSet(next, independent));
    };
    const toggleSection = (key: string) => {
      const next = new Set(openSet);
      if (next.has(key)) next.delete(key);
      else {
        if (!independent) next.clear();
        next.add(key);
      }
      emitOpen(next);
    };
    const openSection = (key: string) => {
      if (openSet.has(key)) return;
      const next = independent ? new Set(openSet) : new Set<string>();
      next.add(key);
      emitOpen(next);
    };

    // Auto-open the section that owns the active row (uncontrolled only, so it never
    // fights a controlling parent).
    useEffect(() => {
      if (openControlled || activeSectionKey == null) return;
      setOpenInternal((prev) => {
        if (prev.has(activeSectionKey)) return prev;
        const next = independent ? new Set(prev) : new Set<string>();
        next.add(activeSectionKey);
        return next;
      });
    }, [activeSectionKey, openControlled, independent]);

    // Under glass the ACTIVE row is a CONTROL-layer pane: a GlassPane paints the
    // material behind its icon, label and badge in the row's own shape, under the
    // skin's selected hue at the translucent selection alpha (`selectionTint`), while
    // the Pressable keeps its tap, ripple and dim and drops the fill it carries (the
    // pane's material and rim carry it; `paneStyle`). Solid mode keeps each skin's
    // own row fill.
    const activeShape: StyleProp<ViewStyle> = [skin.row(tokens, density, collapsed), skin.rowFill(tokens, true)];
    const activePane = glass ? <GlassPane layer="control" shape={activeShape} tint={selectionTint(activeShape, dark)} interactive /> : null;

    const shell = header != null || footer != null;

    const select = (item: SidebarItem, index: number, event: GestureResponderEvent) => {
      setActive(index);
      onSelect?.(item, index, event);
    };

    // Narrow + responsive: render the start-edge drill-down Drawer instead of the inline rail.
    // The Drawer owns the slide + scrim + hardware-back-to-close; SidebarDrillDown owns the
    // two-level navigation. The header/footer slots pin above/below it (a brand lockup, a
    // settings footer) as in a Material navigation drawer.
    if (asDrawer) {
      const drawerHeader = typeof header === "function" ? header(false) : header;
      const drawerFooter = typeof footer === "function" ? footer(false) : footer;
      // Edge axis, default the start/left edge. left/right are full-height (the drill-down fills
      // the panel); top/bottom are content-sized sheets (the drill-down shrinks within maxHeight).
      const drawerEdge = props.drawerRight ? "right" : props.drawerTop ? "top" : props.drawerBottom ? "bottom" : "left";
      const fullHeight = drawerEdge === "left" || drawerEdge === "right";
      return (
        <Drawer
          right={drawerEdge === "right"}
          top={drawerEdge === "top"}
          bottom={drawerEdge === "bottom"}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          width={props.drawerWidth}
          testID={testID}
        >
          {drawerHeader != null ? <View style={skin.header(tokens, false)}>{drawerHeader}</View> : null}
          <SidebarDrillDown
            groups={indexed}
            activeIndex={activeIndex}
            activeSectionKey={activeSectionKey}
            density={density}
            open={drawerOpen}
            onSelect={select}
            onRequestClose={() => setDrawerOpen(false)}
            contentInsetBottom={props.drawerContentInsetBottom}
            fill={fullHeight}
          />
          {drawerFooter != null ? <View style={skin.footer(tokens, false)}>{drawerFooter}</View> : null}
        </Drawer>
      );
    }

    // One nav row: leading icon + label + badge; icon-only and centered in the rail.
    const renderRow = (item: SidebarItem, index: number) => {
      const activeRow = index === activeIndex;
      return (
        // The bounded Android ripple on a nav row is masked to a rectangle and cannot
        // clip itself; this RippleClip parent rounds it to the row's own corners (Android
        // only; a transparent passthrough on iOS/web). The row fills the sidebar width, so
        // the wrapper stretches to match (the row inside it fills the wrapper in turn).
        <RippleClip key={item.id ?? item.label} shape={cornerRadii(skin.row(tokens, density, collapsed))} style={{ alignSelf: "stretch" }}>
          <Pressable
            android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
            style={({ pressed }) => [
              skin.row(tokens, density, collapsed),
              // The active row carries its highlight persistently; on web a press paints it
              // too. Under glass the pane behind the active row paints that highlight, so
              // the row itself drops the fill it carries.
              glass && activeRow ? paneStyle(material, skin.rowFill(tokens, true)) : skin.rowFill(tokens, activeRow || (skin.pressedFill && pressed)),
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              skin.focusOutlineReset,
            ]}
            onPress={(event) => select(item, index, event)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeRow }}
            // NOT `aria-selected`: ARIA allows that only on roles carrying a selected
            // state (option, tab, row and friends), never on `button`, so it is dropped
            // as invalid and the row reads as unselected. A sidebar row is navigation,
            // so the web spelling is `aria-current="page"`, matching Navbars, Breadcrumb
            // and Pagination. The native `selected` state above is valid and stays.
            aria-current={activeRow ? "page" : undefined}
            // Collapsed rail hides the label; keep the accessible name (+ badge count).
            accessibilityLabel={collapsed ? rowA11yLabel(item) : undefined}
          >
            {activeRow ? activePane : null}
            {item.icon != null ? (
              <Icon {...{ [item.icon]: true }} {...skin.iconTint(activeRow)} size={skin.iconSize} decorative />
            ) : null}
            {collapsed ? null : (
              <>
                <Text style={skin.label(tokens, activeRow, density)} numberOfLines={1}>
                  {item.label}
                </Text>
                <SidebarItemBadge item={item} />
              </>
            )}
          </Pressable>
        </RippleClip>
      );
    };

    const renderSection = ({ section, key, rows }: (typeof indexed)[number]) => {
      const isCollapsible = !!section.collapsible;
      const open = !isCollapsible || openSet.has(key);
      const holdsActive = key === activeSectionKey;

      // Collapsed rail: pinned sections show icon-only rows; a collapsible section
      // becomes a single icon button that expands the rail AND opens that section.
      if (collapsed) {
        if (isCollapsible) {
          return (
            // Collapsed-rail collapsible header button: round its bounded Android ripple to
            // the row's corners via this RippleClip parent (Android only). The rail row fills
            // the rail width, so the wrapper stretches to match.
            <RippleClip key={key} shape={cornerRadii(skin.row(tokens, density, true))} style={{ alignSelf: "stretch" }}>
              <Pressable
                android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
                style={({ pressed }) => [
                  skin.row(tokens, density, true),
                  skin.rowFill(tokens, holdsActive || (skin.pressedFill && pressed)),
                  skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                  skin.focusOutlineReset,
                ]}
                onPress={() => {
                  setCollapsed(false);
                  onToggleCollapse?.();
                  openSection(key);
                }}
                accessibilityRole="button"
                accessibilityLabel={section.title}
              >
                {section.icon != null ? (
                  <Icon {...{ [section.icon]: true }} {...skin.iconTint(holdsActive)} size={skin.iconSize} decorative />
                ) : null}
              </Pressable>
            </RippleClip>
          );
        }
        return (
          <View key={key} style={skin.group}>
            {rows.map((r) => renderRow(r.item, r.index))}
          </View>
        );
      }

      // Expanded: pinned = static title + rows; collapsible = pressable header
      // (title + active-dot + rotating chevron) over the rows when open.
      return (
        <View key={key} style={skin.group}>
          {isCollapsible ? (
            <Pressable
              onPress={() => toggleSection(key)}
              style={({ pressed }) => [
                skin.sectionHeaderRow(tokens),
                skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                skin.focusOutlineReset,
              ]}
              accessibilityRole="button"
              accessibilityLabel={section.title}
              accessibilityState={{ expanded: open }}
              aria-expanded={open}
            >
              <Text style={skin.sectionHeaderTitle(tokens)} numberOfLines={1}>
                {section.title}
              </Text>
              {holdsActive ? <View style={skin.activeDot(tokens)} /> : null}
              <SectionChevron open={open} />
            </Pressable>
          ) : section.title != null ? (
            <Text style={skin.sectionTitle(tokens)}>{section.title}</Text>
          ) : null}
          {open ? rows.map((r) => renderRow(r.item, r.index)) : null}
        </View>
      );
    };

    const sectionsEl = indexed.map(renderSection);

    // Sidebar joins the functional glass layer: GlassSurface paints native Liquid
    // Glass (iOS) or frost (web/Android) in glass mode and the solid skin
    // background in default mode.
    const column: StyleProp<ViewStyle> = [skin.column(tokens, frame, collapsed, shell), style];

    // Legacy (no slots): sections directly in the column, content-sized, exactly as
    // before — every existing consumer/example is byte-identical.
    if (!shell) {
      // A sidebar of nav rows IS the page's navigation, so the shell declares the
      // landmark. Without it every row lives outside any landmark and screen-reader
      // users get no way to jump to (or skip) the nav. Additive and backward
      // compatible: consumers using Sidebar for non-nav content can ignore it.
      return (
        <GlassSurface testID={testID} role="navigation" style={column}>
          {sectionsEl}
        </GlassSurface>
      );
    }

    // Shell: pinned header (brand slot + collapse toggle) over a scrolling body over
    // a pinned footer.
    const headerNode = typeof header === "function" ? header(collapsed) : header;
    const footerNode = typeof footer === "function" ? footer(collapsed) : footer;
    const toggleCollapse = () => {
      setCollapsed(!collapsed);
      onToggleCollapse?.();
    };
    return (
      <GlassSurface testID={testID} role="navigation" style={column}>
        {header != null ? (
          collapsed ? (
            <Pressable
              onPress={collapsible ? toggleCollapse : undefined}
              disabled={!collapsible}
              style={skin.header(tokens, true)}
              accessibilityRole={collapsible ? "button" : undefined}
              accessibilityLabel={collapsible ? "Expand sidebar" : undefined}
            >
              {headerNode}
            </Pressable>
          ) : (
            <View style={skin.header(tokens, false)}>
              {headerNode}
              {collapsible ? (
                <>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={toggleCollapse}
                    hitSlop={8}
                    style={skin.collapseToggle(tokens)}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse sidebar"
                    aria-expanded
                  >
                    <Icon chevronLeft muted size={skin.collapseIconSize} />
                  </Pressable>
                </>
              ) : null}
            </View>
          )
        ) : null}
        <ScrollView style={skin.scroll} contentContainerStyle={skin.scrollContent(tokens, collapsed)}>
          {sectionsEl}
        </ScrollView>
        {footer != null ? <View style={skin.footer(tokens, collapsed)}>{footerNode}</View> : null}
      </GlassSurface>
    );
  };
}
