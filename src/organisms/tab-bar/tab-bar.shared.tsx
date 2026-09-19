import { primaryText } from "../../style/primary-text.js";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, type LayoutRectangle } from "react-native";
import { View, Text, Pressable, GlassSurface, useTheme, useControllableState, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle } from "../../style/index.js";
import { selectionTint } from "../../style/selection-tint.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { MeasuredSelection } from "../../style/measured-selection.js";

// Shared TabBar shell. TabBar is the bottom app-navigation bar: a row of equal-width
// destinations, each an icon over a short label, with exactly one active. It is a
// functional-layer surface, so it renders through GlassSurface (real Liquid Glass on
// iOS 26, the lens or a frost on web/Android in glass mode, solid otherwise), matching
// the other bars. The structure, accessibility, and active state live here once; a
// platform file supplies the skin (bar shape, label type, press feedback, the active
// indicator) and calls createTabBar.
//
// Two bar anatomies, chosen by the skin:
//   - DOCKED (Android, Material 3): a full-bleed bar along the bottom edge whose
//     bottom padding grows by the safe-area inset so it covers the home indicator; the
//     active indicator is a fixed-size pill centred behind the glyph.
//   - FLOATING (iOS 26 and web): a capsule inset from the edges that hovers above the
//     content, which scrolls beneath it; the safe-area inset becomes the space under
//     the capsule. The active indicator is a capsule covering the whole destination
//     cell, and under glass it is the measured liquid surface that travels between
//     destinations.
//
// TabBar is the bottom navigation idiom (iOS HIG tab bar / Material 3 navigation bar); it is
// app-level navigation, distinct from the top `Navbar` and the in-page `Tabs`.

export interface TabBarItem {
  /** Stable identity for the destination; passed to onSelect and compared to `active`. */
  key: string;
  label: string;
  /** Renders the tab's glyph; `active` lets the caller tint it (e.g. primary vs muted). */
  icon: (active: boolean) => ReactNode;
}

export interface TabBarProps {
  items: TabBarItem[];
  /** The active item's key; omit for uncontrolled use. */
  active?: string;
  /** Initial active key for uncontrolled use (defaults to the first item's key). */
  defaultActive?: string;
  /** Called with the pressed destination's key (both modes). */
  onSelect?: (key: string) => void;
  /** E2E hook forwarded to the tablist row. */
  testID?: string;
  /**
   * Safe-area bottom inset, e.g. `insets.bottom`. It is added BELOW the bar's own symmetric
   * vertical padding (not in place of it), so the bar clears the home indicator without making
   * the bottom margin heavier than the top. Defaults to 0 (web desktop / no inset).
   */
  bottomInset?: number;
  /** Outer layout composition only. Use bottomInset for the safe area. */
  style?: StyleProp<ViewStyle>;
}

export interface TabBarSkin {
  /** Bar shape: hairline, radius, min height and padding (the fill/border colors come from `fill`). */
  bar: ViewStyle;
  /**
   * Bar fill and border colors from the active tokens. Solid mode paints them; under
   * glass the material replaces the fill and the border is the rim. Defaults to the
   * card fill with the border hairline.
   */
  fill?: (tokens: ColorTokens) => { backgroundColor: string; borderColor?: string };
  /**
   * A floating capsule instead of a docked, full-bleed bar: `horizontal` is the inset
   * from the container's sides, `bottom` the least space kept under the capsule, and
   * `clearance` how far into the safe-area inset the capsule may reach (the bar sits
   * `max(bottom, bottomInset - clearance)` above the container's bottom edge, so it
   * floats over the home-indicator zone without touching the indicator itself, the
   * way the iOS 26 tab bar does). Undefined for a docked bar.
   */
  floating?: { horizontal: number; bottom: number; clearance: number };
  /** One destination cell: flex 1, centered, icon/label gap + vertical padding. */
  item: ViewStyle;
  /** Label type per active state (size/line-height/weight/tracking; the color is applied by shared). */
  label: (active: boolean) => TextStyle;
  /** Android press ripple (null on iOS/web, which dim instead). */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean; radius?: number }) | null;
  /** iOS/web press dim (null on Android, where the ripple carries it). */
  pressedOpacity: number | null;
  /**
   * The active indicator. With `pillCovers: "icon"` (the default) it is a fixed-size
   * pill centred behind the glyph, so the style carries a `width` and `height`
   * (Android's M3 dimensions). With `pillCovers: "cell"` it is a capsule filling the
   * whole destination cell, so the style carries only the fill and radius. `dark`
   * lets the fill follow the scheme. Returns the resting style; null for a bar whose
   * selection is the tint alone.
   */
  pill: ((tokens: ColorTokens, dark: boolean) => ViewStyle) | null;
  pillCovers?: "icon" | "cell";
}

export function createTabBar(skin: TabBarSkin) {
  return function TabBar({ items, active, defaultActive, onSelect, bottomInset = 0, style, testID }: TabBarProps) {
    const { tokens } = useTheme();
    const material = useMaterialTheme({ layer: "control" });
    const glass = material.surface === "glass";
    // Controlled when `active` is provided, self-managed otherwise, so a bare
    // <TabBar /> switches destinations out of the box (the standard library
    // contract). Uncontrolled use starts on the first item unless defaultActive
    // picks another.
    const [activeKey, setActiveKey] = useControllableState<string>(active, defaultActive ?? items[0]?.key ?? "", onSelect);
    const pill = skin.pill?.(tokens, material.dark);
    const cellPill = skin.pillCovers === "cell";
    const structure = JSON.stringify(items.map((item) => item.key));
    const rowRef = useRef<View>(null);
    const itemNodes = useRef<Record<string, View | null>>({});
    const iconNodes = useRef<Record<string, View | null>>({});
    const latestStructure = useRef(structure);
    latestStructure.current = structure;
    type DestinationGeometry = { item?: LayoutRectangle; icon?: LayoutRectangle };
    const [measurements, setMeasurements] = useState<{ structure: string; items: Record<string, DestinationGeometry>; revision: number }>({ structure, items: {}, revision: 0 });
    const record = (key: string, part: keyof DestinationGeometry, layout: LayoutRectangle) => {
      if (latestStructure.current !== structure || layout.width <= 0 || layout.height <= 0) return;
      setMeasurements((previous) => {
        const destinations = previous.structure === structure ? previous.items : {};
        const old = destinations[key]?.[part];
        if (old && old.x === layout.x && old.y === layout.y && old.width === layout.width && old.height === layout.height) return previous;
        return { structure, items: { ...destinations, [key]: { ...destinations[key], [part]: layout } }, revision: previous.revision + (old ? 1 : 0) };
      });
    };
    useLayoutEffect(() => {
      const row = rowRef.current;
      if (!row || !skin.pill) return;
      for (const { key } of items) {
        const item = itemNodes.current[key];
        item?.measureLayout(row, (x, y, width, height) => record(key, "item", { x, y, width, height }), () => {});
        if (item) iconNodes.current[key]?.measureLayout(item, (x, y, width, height) => record(key, "icon", { x, y, width, height }), () => {});
      }
      // Reordering invalidates coordinate scopes without changing keyed hosts.
      // Generation checks discard callbacks from a removed or older ordering.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structure]);
    const geometry = measurements.structure === structure ? measurements.items[activeKey] : undefined;
    // The cell pill is the destination's own rectangle; the icon pill is the skin's
    // fixed size centred on the glyph.
    const selectionLayout = pill && geometry?.item && (cellPill
      ? { x: geometry.item.x, y: geometry.item.y, width: geometry.item.width, height: geometry.item.height }
      : geometry.icon && typeof pill.width === "number" && typeof pill.height === "number" ? {
        x: geometry.item.x + geometry.icon.x + (geometry.icon.width - pill.width) / 2,
        y: geometry.item.y + geometry.icon.y + (geometry.icon.height - pill.height) / 2,
        width: pill.width,
        height: pill.height,
      } : null) || null;
    const movingSelection = glass && selectionLayout !== null;
    // The moving surface keeps the skin's hue at the moving selection's opacity ceiling,
    // so the ink stays readable over the track and over labels in flight; the icon pill
    // is already a translucent tint and passes through unchanged.
    const pillTint = pill ? (cellPill ? selectionTint(pill, material.dark) : typeof pill.backgroundColor === "string" ? pill.backgroundColor : undefined) : undefined;
    const fill = skin.fill ? skin.fill(tokens) : { backgroundColor: tokens.card, borderColor: tokens.border };
    // The skin's paddingTop is the bar's symmetric vertical base. A docked bar mirrors it on
    // the bottom and adds the safe-area inset there, so the item row stays vertically centered
    // (top margin == bottom margin) while the bar still extends down to cover the home
    // indicator. A floating capsule keeps its symmetric padding and puts the inset UNDER it.
    const basePad = typeof skin.bar.paddingTop === "number" ? skin.bar.paddingTop : 0;
    const floating = skin.floating;
    const barStyle: StyleProp<ViewStyle> = [
      skin.bar,
      { borderColor: fill.borderColor ?? tokens.border, backgroundColor: fill.backgroundColor },
      floating ? { paddingBottom: basePad } : { alignSelf: "stretch", width: "100%", paddingBottom: basePad + bottomInset },
    ];
    const bar = (
      <GlassSurface style={floating ? barStyle : [barStyle, style]}>
        <View ref={rowRef} accessibilityRole="tablist" testID={testID} style={{ flex: 1, flexDirection: "row" }}>
          {movingSelection && pill ? (
            <MeasuredSelection layout={selectionLayout} enabled profile="navigation" resetKey={`${structure}:${measurements.revision}`} testID={testID ? `${testID}-selection-motion` : undefined}>
              <GlassSurface layer="control" interactive tint={pillTint} style={[StyleSheet.absoluteFill, { borderRadius: pill.borderRadius, backgroundColor: pill.backgroundColor }]} testID={testID ? `${testID}-selection` : undefined} />
            </MeasuredSelection>
          ) : null}
          {items.map((it) => {
            const isActive = it.key === activeKey;
            return (
              <Pressable
                key={it.key}
                ref={(node) => { itemNodes.current[it.key] = node; }}
                onLayout={skin.pill ? (event) => record(it.key, "item", event.nativeEvent.layout) : undefined}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                aria-selected={isActive}
                accessibilityLabel={it.label}
                onPress={() => setActiveKey(it.key)}
                android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
                style={({ pressed }) => [skin.item, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
              >
                {/* The resting cell capsule, behind the glyph and label alike, until the
                    measured selection takes over under glass. */}
                {pill && cellPill && isActive && !movingSelection ? <View style={[StyleSheet.absoluteFill, pill, { pointerEvents: "none" }]} /> : null}
                {pill ? (
                  // The glyph's real wrapper is measured separately from the cell, which
                  // is where the icon pill centres itself. Labels and safe-area spacing
                  // stay untouched.
                  <View ref={(node) => { iconNodes.current[it.key] = node; }} onLayout={(event) => record(it.key, "icon", event.nativeEvent.layout)} style={{ alignItems: "center", justifyContent: "center" }}>
                    {!cellPill && isActive && !movingSelection ? <View style={[pill, { pointerEvents: "none" }]} /> : null}
                    {it.icon(isActive)}
                  </View>
                ) : (
                  it.icon(isActive)
                )}
                <Text numberOfLines={1} style={[skin.label(isActive), { color: isActive ? primaryText(tokens) : tokens["muted-foreground"] }]}>{it.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    );
    if (!floating) return bar;
    // The floating capsule's frame: full width like the docked bar (so it reads the
    // container's bounds the same way, `alignSelf: "stretch"` plus `width: "100%"`),
    // insetting the capsule from the sides and keeping the safe-area space under it.
    // Touches pass through the frame's margins to whatever scrolls beneath.
    return (
      <View
        style={[
          { alignSelf: "stretch", width: "100%", pointerEvents: "box-none", paddingHorizontal: floating.horizontal, paddingBottom: Math.max(floating.bottom, bottomInset - floating.clearance) },
          style,
        ]}
      >
        {bar}
      </View>
    );
  };
}
