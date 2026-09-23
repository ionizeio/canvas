import { useEffect, useRef, useState } from "react";
import { Animated, type GestureResponderEvent } from "react-native";
import { View, Pressable, Text, ScrollView, useTheme, useReducedMotion, useHardwareBack, supportsNativeDriver } from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import type { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { type Density } from "./sidebar.styles.js";
import { SidebarItemBadge, SidebarRowFrame, type SidebarItem, type SidebarRowWash, type SidebarSection } from "./sidebar.item.js";
// Type-only, so it is erased whole and leaves no runtime edge back to the module
// that builds this one.
import type { SidebarSkin } from "./sidebar.shared.js";

// The narrow-viewport presentation of the Sidebar: a two-level DRILL-DOWN of the same
// `sections` data, rendered inside the kit Drawer (which owns the start-edge slide + scrim).
// Level 0 lists pinned/untitled sections' rows inline and each collapsible section as a drill
// row; tapping a drill row slides one level in to that section's rows (a labelled back row +
// hardware-back pop returns). It is the mobile counterpart of the wide accordion rail, so it
// reuses the same per-OS skin (rows, active highlight, icon tint) — only the back row is new.

/** One normalized nav group as computed by createSidebar: the section, its accordion/React key,
 *  and its rows already carrying their flat index (so selection reports the same index the rail
 *  would). */
export interface SidebarDrillGroup {
  section: SidebarSection;
  key: string;
  rows: { item: SidebarItem; index: number }[];
}

export interface SidebarDrillDownProps {
  groups: SidebarDrillGroup[];
  activeIndex: number;
  activeSectionKey: string | null;
  density: Density;
  /** Whether the hosting Drawer is open — drives the reset/pre-drill on each open. */
  open: boolean;
  onSelect: (item: SidebarItem, index: number, event: GestureResponderEvent) => void;
  /** Close the hosting Drawer (after a leaf selection or a root-level back). */
  onRequestClose: () => void;
  /** Extra bottom padding so the last rows clear persistent chrome painting over the drawer
   *  (e.g. a native bottom tab bar on Android). */
  contentInsetBottom?: number;
  /** Fill the panel (a full-height left/right drawer) vs shrink within it (a content-sized
   *  top/bottom sheet). */
  fill?: boolean;
}

/** Build the drill-down body from a Sidebar skin (mirrors createSidebar's skin closure). */
export function createSidebarDrillDown(skin: SidebarSkin, Badge: typeof WebBadge) {
  return function SidebarDrillDown({ groups, activeIndex, activeSectionKey, density, open, onSelect, onRequestClose, contentInsetBottom, fill = true }: SidebarDrillDownProps) {
    const { tokens } = useTheme();
    const reduced = useReducedMotion();
    // The skin's hover wash for the leaf and drill rows, as the rail's.
    const wash: SidebarRowWash | null = skin.wash ? { motion: skin.wash.motion, color: skin.wash.color(tokens), reduced } : null;
    // Two levels: null = the root list, a section key = drilled into that section.
    const [drilled, setDrilled] = useState<string | null>(null);
    const slide = useRef(new Animated.Value(0)).current;
    const wasOpen = useRef(false);

    // On open (a false->true transition), reset: pre-drill into the collapsible section that
    // owns the active row (so the drawer reopens where you are), otherwise show the root.
    useEffect(() => {
      if (open && !wasOpen.current) {
        const activeGroup = groups.find((g) => g.key === activeSectionKey);
        setDrilled(activeGroup?.section.collapsible ? activeSectionKey : null);
        slide.setValue(0);
      }
      wasOpen.current = open;
    }, [open, activeSectionKey, groups, slide]);

    // A short directional slide on each level change (in from the trailing side, back from the
    // leading side), transform-only so it is safe on Android's New Architecture.
    const animateIn = (dir: 1 | -1) => {
      slide.setValue(dir * 24);
      Animated.timing(slide, { toValue: 0, duration: reduced ? 0 : 200, useNativeDriver: supportsNativeDriver }).start();
    };
    const pop = () => {
      setDrilled(null);
      animateIn(-1);
    };

    // Android hardware back pops one level, or closes at the root; wired only while
    // open, and never on web (the BackHandler shim there console.errors per call).
    useHardwareBack(open, () => {
      setDrilled((d) => {
        if (d != null) {
          animateIn(-1);
          return null;
        }
        onRequestClose();
        return d;
      });
    });

    const select = (item: SidebarItem, index: number, event: GestureResponderEvent) => {
      onSelect(item, index, event);
      onRequestClose();
    };

    // A selectable leaf row: leading icon + label + trailing badge, carrying the active highlight.
    const renderLeaf = (item: SidebarItem, index: number) => {
      const active = index === activeIndex;
      return (
        // The frame rounds the leaf row's bounded Android ripple to the row's corners
        // (Android only; a passthrough on iOS/web) and paints the hover wash. The row fills
        // the drawer width, so the frame stretches to match.
        <SidebarRowFrame key={item.id ?? item.label} shape={skin.row(tokens, density, false)} wash={wash}>
          <Pressable
            android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
            style={({ pressed }) => [
              skin.row(tokens, density, false),
              skin.rowFill(tokens, active || (skin.pressedFill && pressed)),
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              skin.focusRing,
            ]}
            onPress={(event) => select(item, index, event)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            // See sidebar.shared: `aria-selected` is invalid on `button`, so a
            // navigation row states the current page with `aria-current` instead.
            aria-current={active ? "page" : undefined}
          >
            {item.icon != null ? <Icon {...{ [item.icon]: true }} {...skin.iconTint(active)} size={skin.iconSize} decorative /> : null}
            <Text style={skin.label(tokens, active, density)} numberOfLines={1}>
              {item.label}
            </Text>
            <SidebarItemBadge item={item} Badge={Badge} />
          </Pressable>
        </SidebarRowFrame>
      );
    };

    // A collapsible section as a drill row at the root: icon + label + trailing chevron -> push.
    const renderDrillRow = (g: SidebarDrillGroup) => {
      const holdsActive = g.key === activeSectionKey;
      return (
        // The frame rounds the drill row's bounded Android ripple to the row's corners
        // (Android only) and paints the hover wash. The row fills the drawer width, so the
        // frame stretches to match.
        <SidebarRowFrame key={g.key} shape={skin.row(tokens, density, false)} wash={wash}>
          <Pressable
            android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
            style={({ pressed }) => [
              skin.row(tokens, density, false),
              skin.rowFill(tokens, holdsActive || (skin.pressedFill && pressed)),
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              skin.focusRing,
            ]}
            onPress={() => {
              setDrilled(g.key);
              animateIn(1);
            }}
            accessibilityRole="button"
            accessibilityLabel={g.section.title}
          >
            {g.section.icon != null ? <Icon {...{ [g.section.icon]: true }} {...skin.iconTint(holdsActive)} size={skin.iconSize} decorative /> : null}
            <Text style={skin.label(tokens, holdsActive, density)} numberOfLines={1}>
              {g.section.title}
            </Text>
            <Icon chevronRight muted size={skin.sectionChevronSize} decorative />
          </Pressable>
        </SidebarRowFrame>
      );
    };

    const drilledGroup = drilled != null ? groups.find((g) => g.key === drilled) : undefined;

    return (
      <Animated.View style={{ ...(fill ? { flex: 1 } : { flexShrink: 1 }), transform: [{ translateX: slide }] }}>
        <ScrollView contentContainerStyle={[skin.scrollContent(tokens, false), contentInsetBottom ? { paddingBottom: contentInsetBottom } : null]}>
          {drilledGroup ? (
            <>
              <Pressable
                onPress={pop}
                style={({ pressed }) => [skin.drillBackRow(tokens), skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null, skin.focusRing]}
                accessibilityRole="button"
                accessibilityLabel={`Back to ${drilledGroup.section.title ?? ""}`}
              >
                <Icon chevronLeft muted size={skin.sectionChevronSize} decorative />
                <Text style={skin.drillBackTitle(tokens)} numberOfLines={1}>
                  {drilledGroup.section.title}
                </Text>
              </Pressable>
              {drilledGroup.rows.map((r) => renderLeaf(r.item, r.index))}
            </>
          ) : (
            groups.map((g) =>
              g.section.collapsible ? (
                renderDrillRow(g)
              ) : (
                <View key={g.key} style={skin.group}>
                  {g.section.title != null ? <Text style={skin.sectionTitle(tokens)}>{g.section.title}</Text> : null}
                  {g.rows.map((r) => renderLeaf(r.item, r.index))}
                </View>
              ),
            )
          )}
        </ScrollView>
      </Animated.View>
    );
  };
}
