import { Fragment, type ComponentType } from "react";
import { FlatList, StyleSheet, type DimensionValue } from "react-native";
import { View, Pressable, Text, useTheme, useContainerBreakpoint, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { Card as WebCard } from "../card/card.js";
import { Avatar as WebAvatar } from "../../atoms/avatar/avatar.js";
import { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { type CardProps } from "../card/card.shared.js";
import { type AvatarProps } from "../../atoms/avatar/avatar.shared.js";
import { type BadgeProps } from "../../atoms/badge/badge.shared.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import * as s from "./grid-lists.styles.js";
import { type Columns } from "./grid-lists.styles.js";

// Shared GridList shell. The structure (a responsive grid of card tiles, the
// people-card and gallery-thumbnail tiles, the avatar/title/subtitle/badge/action
// composition), the boolean-prop axes, the data-shape types, and the responsive
// column math live here once; a platform file supplies only its skin (the gallery
// thumbnail radius, the grid density, the title/subtitle type tracking, and the
// press feedback on the molecule's own pressable) and calls createGridList.
//
// GridList: a responsive grid of card tiles for a people directory, a project
// or file collection, or any tiled gallery. Each item renders as a bordered
// card tile with a leading avatar, a title, and supporting text or a badge.
//
// RN has no CSS grid, so the grid is built from a flex-row flex-wrap container
// whose tiles carry a fractional flex-basis (48% / 31% width) plus grow, so they
// share the row evenly and reflow as the row fills. Tiles are authored
// desktop-first: they take their column share on wide viewports and collapse to
// full width on phones and below (the `sm` responsive width).
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf).
//
// - Columns (pick one; default is two-up): `cols3` packs three tiles per row,
//   `cols2` is the explicit two-up. With neither set the grid is two-up.
// - Density: `compact` tightens the gap and per-tile padding for denser grids.
//
// GridList is a "Light" platform treatment: one structure and one set of
// (semantic) colors, with per-OS touches limited to the gallery thumbnail radius,
// grid density, type tracking, and press feedback — so the skin carries only
// those, not the colors or layout structure. The bordered people tile composes
// the Card atom, which brings its own surface; the gallery thumbnail is the
// molecule's own pressable, so its ripple/opacity feedback comes from the skin.

// The contract a platform skin fulfills. The shell renders the grid, the people
// tile, and the gallery tile; the skin maps the active platform's thumbnail
// radius, density, type tracking, and press feedback onto each piece.
export interface GridListSkin {
  /** Gallery thumbnail block corner radius (6 web, 10 iOS, 12 M3). */
  galleryRadius: number;
  /** iOS continuous (superellipse) corner curve for the gallery thumbnail; omitted (no-op) elsewhere. */
  galleryCurve?: ViewStyle["borderCurve"];
  /** Inter-tile grid gap per density (default vs compact). */
  gap: { default: number; compact: number };
  /** Per-tile padding for the people card per density (default vs compact). */
  tilePad: { default: number; compact: number };
  /** Gallery filename type (size/line-height/weight + per-OS tracking). */
  galleryTitle: (t: ColorTokens) => TextStyle;
  /** People-tile title type (size/line-height/weight + per-OS tracking). */
  cardTitle: (t: ColorTokens) => TextStyle;
  /** Gallery filename subtitle type (size/line-height + per-OS tracking). */
  gallerySubtitle: (t: ColorTokens) => TextStyle;
  /** People-tile subtitle type (size/line-height + per-OS tracking). */
  cardSubtitle: (t: ColorTokens) => TextStyle;
  /** iOS/web dim-on-press for the gallery pressable; null on Android. */
  pressedOpacity: number | null;
  /** Android ripple over the gallery pressable; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
}

// The composed atoms (Card / Avatar / Badge / Button) are passed in by each
// platform entry file (grid-lists.ios.tsx / .android.tsx) so the people tile's
// surface, avatar, status badge, and action buttons all match the active OS. In
// the WEB docs 3-up preview this threading is load-bearing: a bare barrel import
// always resolves the WEB atoms in a browser bundle, so createGridList takes the
// per-OS atoms as parameters (defaulting to the web atoms for the web build).
export type CardComponent = ComponentType<CardProps>;
export type AvatarComponent = ComponentType<AvatarProps>;
export type BadgeComponent = ComponentType<BadgeProps>;
export type ButtonComponent = ComponentType<ButtonProps>;

/** A trailing tile action, rendered as a Button in people mode. */
export interface GridListAction {
  /** Button label (e.g. "Message"). */
  label: string;
  /** Called when the action button is pressed. */
  onPress?: () => void;
  /** Render as an outline button (the default look is solid). */
  outline?: boolean;
  /** Render as a ghost button. */
  ghost?: boolean;
}

export interface GridListItem {
  /** Primary label for the tile (a name, project, or file). */
  title: string;
  /** Optional supporting line beneath the title (a role, path, or size). */
  subtitle?: string;
  /** Optional avatar photo URL or initials source for the leading avatar. */
  avatar?: string;
  /** Optional status word rendered as a trailing badge (e.g. "Active"). */
  badge?: string;
  /**
   * Gallery-tile block tint: a palette or token color name (e.g. "primary",
   * "blue-500"). Painted at 20% behind the filename in gallery mode.
   */
  color?: string;
  /**
   * Trailing actions rendered as a button row beneath the title (people mode),
   * e.g. an outline "Message" and a ghost "View".
   */
  actions?: GridListAction[];
}

export interface GridListProps {
  /** The tiles to render, one card per entry. */
  items: GridListItem[];
  // Columns (pick one; default is two-up).
  cols3?: boolean;
  cols2?: boolean;
  /**
   * Gallery mode: render each tile as a borderless thumbnail (a square color
   * block from `item.color`, with a left-aligned filename and size below).
   * Avatars, badges, and actions are not shown in this mode. Omit for the
   * default people/card tile.
   */
  gallery?: boolean;
  // Density modifier: tighter gap and tile padding.
  compact?: boolean;
  /** Make each tile a tappable target (open a detail, select a tile). When set,
   *  every tile renders as a Pressable with a button role and a pressed
   *  affordance, so a tappable grid needs no hand-rolled Pressable. */
  onPressItem?: (index: number) => void;
  /**
   * Render the tiles through a windowed `FlatList` instead of mounting every tile up
   * front, for large grids. Give the grid a bounded height (via `style`, e.g.
   * `{ maxHeight: 480 }`) so it can scroll; without one it warns and renders eagerly
   * anyway. Default (omitted) mounts all tiles, unchanged.
   */
  virtualized?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Column precedence when more than one is passed: first match wins.
function columnsOf(p: GridListProps): Columns {
  if (p.cols3) return "cols3";
  if (p.cols2) return "cols2";
  return "cols2";
}

export function createGridList(
  skin: GridListSkin,
  Card: CardComponent = WebCard,
  Avatar: AvatarComponent = WebAvatar,
  Badge: BadgeComponent = WebBadge,
  Button: ButtonComponent = WebButton,
) {
  // A borderless gallery thumbnail: a square color block with a filename and size
  // below. The parent GridList resolves the responsive width ONCE and passes it
  // down, so an N-tile grid carries one viewport subscription, not N.
  function GalleryTile({ item, width, onPress }: { item: GridListItem; width: DimensionValue; onPress?: () => void }) {
    const { tokens } = useTheme();
    const inner = (
      <>
        {/* Square color block. A single translucent tint stands in for the legacy
            gradient swatch. */}
        <View
          style={[
            s.galleryBlock,
            { borderRadius: skin.galleryRadius, ...(skin.galleryCurve ? { borderCurve: skin.galleryCurve } : null) },
            s.galleryBlockFill(tokens, item.color),
          ]}
        />
        <View style={s.galleryMeta}>
          <Text style={skin.galleryTitle(tokens)}>{item.title}</Text>
          {item.subtitle != null ? <Text style={skin.gallerySubtitle(tokens)}>{item.subtitle}</Text> : null}
        </View>
      </>
    );
    if (onPress) {
      // The gallery tile is the molecule's OWN pressable: the skin supplies the
      // press feedback (Android ripple vs iOS/web opacity dim).
      const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
      return (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          android_ripple={ripple}
          style={({ pressed }) => [
            s.tileGrow,
            { width },
            skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {inner}
        </Pressable>
      );
    }
    return <View style={[s.tileGrow, { width }]}>{inner}</View>;
  }

  // A bordered people card tile: a leading avatar, a title, supporting text, an
  // optional badge, and an optional action row. The parent GridList resolves the
  // responsive width once and passes it down. Its surface and press feedback come
  // from the Card atom (already platform-correct per build), so the skin only sets
  // the tile padding density and the title type.
  function PeopleTile({ item, width, compact, onPress }: { item: GridListItem; width: DimensionValue; compact: boolean; onPress?: () => void }) {
    const { tokens } = useTheme();
    const pad = compact ? skin.tilePad.compact : skin.tilePad.default;
    // The tile cell owns the measured width (a layout cell); the Card fills it.
    return (
      <View style={{ width, flexGrow: 1 }}>
        <Card onPress={onPress} style={{ alignItems: "center", padding: pad }}>
        <View style={s.cardInner}>
          <Avatar large src={isPhoto(item.avatar) ? item.avatar : undefined} name={item.title}>
            {item.avatar && !isPhoto(item.avatar) ? item.avatar : undefined}
          </Avatar>
          <Text style={skin.cardTitle(tokens)}>{item.title}</Text>
          {item.subtitle != null ? <Text style={skin.cardSubtitle(tokens)}>{item.subtitle}</Text> : null}
          {item.badge != null ? (
            <View style={s.badgeSpacing}>
              <Badge secondary>{item.badge}</Badge>
            </View>
          ) : null}
          {item.actions != null && item.actions.length > 0 ? (
            <View style={s.actions}>
              {item.actions.map((action, i) => (
                <Button key={`${action.label}-${i}`} small outline={action.outline} ghost={action.ghost} onPress={action.onPress}>
                  {action.label}
                </Button>
              ))}
            </View>
          ) : null}
        </View>
        </Card>
      </View>
    );
  }

  return function GridList(props: GridListProps) {
    const { items, gallery, compact, virtualized, testID, style, onPressItem } = props;
    const columns = columnsOf(props);
    const gap = compact ? skin.gap.compact : skin.gap.default;
    // ONE responsive resolution for the whole grid, measured against the grid's
    // OWN container (the DataTable precedent: a grid in a narrow desktop column
    // collapses too, and a viewport seed keeps the first frame plausible): at
    // narrow widths the tiles fill the row, and the windowed path's column
    // count follows suit (it used to stay at 2-3 columns of 100%-wide tiles).
    const { value: phone, onLayout: onGridLayout } = useContainerBreakpoint(
      { base: false, sm: true },
      { seedViewport: true },
    );
    const tileWidth: DimensionValue = phone ? "100%" : s.TILE_WIDTH[columns];
    // FlatList lays out `numColumns` tiles per row itself (mirrors the flex-wrap
    // grid's column count): one at phone widths, else cols3 -> 3, cols2 (the
    // default) -> 2.
    const numColumns = phone ? 1 : columns === "cols3" ? 3 : 2;

    // One tile, keyless so it can be used both by the eager `.map` (which supplies
    // the key via a Fragment) and by FlatList's renderItem (which keys via keyExtractor).
    const renderTile = (item: GridListItem, index: number) => {
      const onPress = onPressItem ? () => onPressItem(index) : undefined;
      return gallery ? (
        <GalleryTile item={item} width={tileWidth} onPress={onPress} />
      ) : (
        <PeopleTile item={item} width={tileWidth} compact={!!compact} onPress={onPress} />
      );
    };

    // Stable identity per tile; matches the eager path's key so switching to the
    // windowed path keeps a tile mapped to the same item.
    const keyOf = (item: GridListItem, index: number) => `${item.title}-${index}`;

    // A windowed grid needs a bounded height to scroll (and to actually window). Warn
    // once if `virtualized` is set without one; a FlatList with no height falls back
    // to rendering every tile anyway, so the flag would be a silent no-op.
    const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
    const bounded = flat.height != null || flat.maxHeight != null || flat.flex != null || flat.flexBasis != null;
    devWarn(
      !!virtualized && !bounded,
      "[canvas] <GridList virtualized>: give the grid a bounded height (e.g. style={{ maxHeight: 480 }}) so it can window and scroll; rendering eagerly for now.",
    );

    // The windowed path: FlatList tiles the items into `numColumns` per row. The
    // eager grid's single flex `gap` is split back into its two axes: the
    // inter-column gap onto each row wrapper, the inter-row gap onto the content
    // container, so the spacing matches the eager grid. The eager path below keeps
    // the flex-wrap container's DOM byte-for-byte identical.
    if (virtualized && bounded) {
      return (
        <FlatList
          // FlatList cannot change numColumns on a live list; remount when the
          // responsive column count crosses the breakpoint.
          key={numColumns}
          testID={testID}
          onLayout={onGridLayout}
          style={style}
          data={items}
          renderItem={({ item, index }) => renderTile(item, index)}
          keyExtractor={keyOf}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
          contentContainerStyle={{ gap }}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return (
      <View testID={testID} onLayout={onGridLayout} style={[s.container, { gap }, style]}>
        {items.map((item, index) => (
          <Fragment key={keyOf(item, index)}>{renderTile(item, index)}</Fragment>
        ))}
      </View>
    );
  };
}

// Treat anything that looks like a URL or path as a photo source; otherwise the
// value is initials, handed to the Avatar fallback.
function isPhoto(value?: string): value is string {
  if (!value) return false;
  return value.startsWith("http") || value.startsWith("/") || value.startsWith("data:");
}
