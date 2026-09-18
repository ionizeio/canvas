import { primaryText } from "../../style/primary-text.js";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, type LayoutRectangle } from "react-native";
import { View, Text, Pressable, GlassSurface, useTheme, useControllableState, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle } from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { MeasuredSelection } from "../../style/measured-selection.js";

// Shared TabBar shell. TabBar is the bottom app-navigation bar: a row of equal-width
// destinations, each an icon over a short label, with exactly one active. It is a
// functional-layer surface, so it renders through GlassSurface — real Liquid Glass on
// iOS 26, a frost on web/Android in glass mode, solid otherwise — matching the other bars.
// The structure, accessibility, and active state live here once; a platform file supplies
// the skin (bar height, label type, press feedback) and calls createTabBar.
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
  /** Bar shape: top hairline + min height + top padding (the fill/border color is applied by shared). */
  bar: ViewStyle;
  /** One destination cell: flex 1, centered, icon/label gap + vertical padding. */
  item: ViewStyle;
  /** Label type per active state (size/line-height/weight/tracking; the color is applied by shared). */
  label: (active: boolean) => TextStyle;
  /** Android press ripple (null on iOS/web, which dim instead). */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean; radius?: number }) | null;
  /** iOS/web press dim (null on Android, where the ripple carries it). */
  pressedOpacity: number | null;
  /**
   * Active-indicator pill drawn behind the icon. Web uses its smaller pill and
   * Android uses the M3 dimensions. iOS remains tint-only and returns null.
   * Returns the absolute-positioned, self-centering resting style.
   */
  pill: ((tokens: ColorTokens) => ViewStyle) | null;
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
    const pill = skin.pill?.(tokens);
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
    const selectionLayout = pill && geometry?.item && geometry.icon && typeof pill.width === "number" && typeof pill.height === "number" ? {
      x: geometry.item.x + geometry.icon.x + (geometry.icon.width - pill.width) / 2,
      y: geometry.item.y + geometry.icon.y + (geometry.icon.height - pill.height) / 2,
      width: pill.width,
      height: pill.height,
    } : null;
    const movingSelection = glass && selectionLayout !== null;
    // The skin's paddingTop is the bar's symmetric vertical base. Mirror it on the bottom and
    // add the safe-area inset there, so the item row stays vertically centered (top margin ==
    // bottom margin) while the bar still extends down to cover the home indicator.
    const basePad = typeof skin.bar.paddingTop === "number" ? skin.bar.paddingTop : 0;
    // A bottom tab bar is a full-bleed nav shell: it must fill its container's width, not
    // shrink-wrap to the icon column. `alignSelf: "stretch"` fills the cross axis in a normal
    // column screen; `width: "100%"` also fills a centering/shrink-wrapping parent (e.g. the
    // docs FitStage). Both route to GlassSurface's outer box, so glass and solid match. The
    // Outer layout composition remains last in the style list.
    return (
      <GlassSurface
        style={[skin.bar, { borderColor: tokens.border, backgroundColor: tokens.card, alignSelf: "stretch", width: "100%", paddingBottom: basePad + bottomInset }, style]}
      >
        <View ref={rowRef} accessibilityRole="tablist" testID={testID} style={{ flex: 1, flexDirection: "row" }}>
          {movingSelection && pill ? (
            <MeasuredSelection layout={selectionLayout} enabled profile="navigation" resetKey={`${structure}:${measurements.revision}`} testID={testID ? `${testID}-selection-motion` : undefined}>
              <GlassSurface layer="control" interactive tint={typeof pill.backgroundColor === "string" ? pill.backgroundColor : undefined} style={[StyleSheet.absoluteFill, { borderRadius: pill.borderRadius, backgroundColor: pill.backgroundColor }]} testID={testID ? `${testID}-selection` : undefined} />
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
                {skin.pill ? (
                  // Web and Android measure the glyph's real wrapper separately
                  // from the cell. Labels and safe-area spacing stay untouched.
                  <View ref={(node) => { iconNodes.current[it.key] = node; }} onLayout={(event) => record(it.key, "icon", event.nativeEvent.layout)} style={{ alignItems: "center", justifyContent: "center" }}>
                    {isActive && !movingSelection ? <View style={[skin.pill(tokens), { pointerEvents: "none" }]} /> : null}
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
  };
}
