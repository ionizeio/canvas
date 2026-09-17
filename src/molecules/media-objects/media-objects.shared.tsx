import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ComponentType, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { View, Pressable, Text, surfaceRipple, pressDim, RippleClip, cornerRadii, splitElevation, alpha, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle, useFillStyle, GlassSurface, GlassPane, paneStyle } from "../../style/index.js";
import { Avatar as WebAvatar } from "../../atoms/avatar/avatar.js";
import { type AvatarProps } from "../../atoms/avatar/avatar.shared.js";
import { type Align, type Direction, DIRECTION_ROW, ALIGN_ITEMS } from "./media-objects.styles.js";

// The composed Avatar type, so each platform can pass its own resolved atom (web
// base by default) for the leading initials avatar without widening to `any`.
export type AvatarComponent = ComponentType<AvatarProps>;

// Shared MediaObject shell. The structure, the boolean-prop axes, the data shape,
// the accessibility, the leading-media precedence (photo > initials > icon), the
// truncation logic, and the semantic colors (which read the active tokens) live
// here once; a platform file supplies only its skin (radius, density/spacing, type
// tracking, shadow/elevation, press feedback) and calls createMediaObject.
//
// A media object is a horizontal row: a leading media element (avatar, image, or
// icon glyph) sits beside a content column (a bold title, a muted description,
// and an optional longer supporting body), sometimes with a trailing action
// pinned to the right. It is the building block for list rows, notifications,
// and comment layouts.
//
// MediaObject is a "Light" platform treatment: one structure and one set of
// (semantic) colors, with per-OS touches limited to corner radius, density,
// type tracking, shadow, and press feedback — so the skin carries only those.
//
// Boolean-prop API, grouped by axis with first-match precedence within an axis
// (mirrors Button's intentOf):
//
// - Alignment: `center` aligns the row's cross axis to the middle (the compact,
//   single-line list/action row); the default top-aligns with items-start so the
//   media anchors to the first line of a multi-line body (per the component's
//   "Avatar" do/don't: items-start for multi-line, center for single-line rows).
// - Direction: `reversed` flips the media to the trailing edge; default leads
//   with the media on the left.
// - Surface: `bordered` wraps the row in the card surface (border + padding) used
//   when a media object stands alone as a card; omit for a bare row.
//
// State/layout booleans stack orthogonally: `truncate` clamps the title and
// description to one line each (the action pattern, so a long email never wraps
// and pushes the trailing action out of alignment).

/**
 * Compact density overrides for a menu-header-sized identity row: a tighter row gap, a
 * smaller leading icon box, and the title/description type stepped down one size. The
 * leading avatar shrinks via Avatar's own `small` size (28px), so it carries no field
 * here. Applied on top of the base skin values only when the `compact` prop is set.
 */
export interface MediaObjectDensity {
  /** Tighter row gap between the leading media, content column, and trailing slot. */
  containerBase: ViewStyle;
  /** Smaller leading icon box: size + corner radius (the tinted fill comes from shared). */
  iconBox: ViewStyle;
  /** Compact title type: size / line-height / weight / tracking (the color comes from shared). */
  title: TextStyle;
  /** Compact description type: size / line-height / tracking (the color comes from shared). */
  description: TextStyle;
}

export interface MediaObjectSkin {
  /** Row gap between the leading media, content column, and trailing slot. */
  containerBase: ViewStyle;
  /** Bordered card shape, padding, and elevation. Shared rendering supplies static
   *  content frost in glass mode and the opaque token fill for solid fallback. */
  borderedSurface: ViewStyle;
  /** bordered-card border-color resolver. web/iOS paint the hairline tokens.border; on
   *  Android the M3 ELEVATED card separates by elevation, not an outline, so it returns
   *  "transparent" while keeping the border WIDTH so content metrics stay identical
   *  across platforms. Omit to default to the hairline tokens.border. */
  borderedBorderColor?: (tokens: ColorTokens) => string;
  /** Leading icon box shape: size + corner radius (the tinted fill comes from shared). */
  iconBox: ViewStyle;
  /** The glyph inside the icon box: type size/weight/tracking (the primary color comes from shared). */
  iconGlyph: TextStyle;
  /** Content column layout: min-width 0 + flex + the title/description gap. */
  content: ViewStyle;
  /** Title type: size / line-height / weight / tracking (the color comes from shared). */
  title: TextStyle;
  /** Description type: size / line-height / tracking (the color comes from shared). */
  description: TextStyle;
  /** Body paragraph type: size / line-height / tracking (the color comes from shared). */
  body: TextStyle;
  /** Trailing meta type: size / line-height / tracking (the color comes from shared). */
  meta: TextStyle;
  /** Trailing action wrapper: shrink-0. */
  actionBox: ViewStyle;
  /** Press opacity dim for iOS/web (null on Android, where the ripple carries it). */
  pressedOpacity: number;
  /**
   * Minimum effective touch height for a BARE (non-bordered) tappable row, applied as
   * a native minHeight so the tap target reaches the platform minimum (HIG 44pt on iOS,
   * Material 48dp on Android) without changing web layout (web = 0). A bordered row is
   * already tall enough from its padding, so this only backstops the bare row.
   */
  minTarget: number;
  /** Compact-density overrides (row gap, icon box, title/description type) for the
   *  `compact` menu-header row; applied on top of the base values when `compact` is set. */
  compact: MediaObjectDensity;
}

export interface MediaObjectProps {
  /** Primary line: the bold heading (e.g. a person's name). */
  title?: string;
  /** Secondary line: muted supporting text under the title (e.g. a role or email). */
  description?: string;
  /** Optional longer body paragraph rendered below the description. */
  body?: ReactNode;
  /** Trailing metadata text pinned to the right (e.g. "2h ago", "admin"). */
  meta?: string;
  /** Initials for the leading avatar (e.g. "RC"); rendered as <Avatar>{avatar}</Avatar>. */
  avatar?: string;
  /** Photo for the leading avatar (a URI string or a bundled `require(...)` image); takes precedence over initials. */
  src?: string | number;
  /** A leading icon glyph rendered in a tinted square box (stands in for an SVG icon). */
  icon?: ReactNode;
  /** A trailing action node (e.g. a <Button>), pinned to the right edge. */
  action?: ReactNode;
  /** Make the whole row a tappable target (navigate to a detail, select a row).
   *  When set, the row renders as a Pressable with a button role and a pressed
   *  affordance, so you never hand-roll a Pressable for a tappable media row. */
  onPress?: () => void;
  // Alignment (pick one; default top-aligns with items-start).
  center?: boolean;
  start?: boolean;
  // Direction (pick one; default leads with the media on the left).
  reversed?: boolean;
  leading?: boolean;
  // Surface.
  bordered?: boolean;
  // Density.
  /** Menu-header density: a smaller leading avatar (28px) and title/description type
   *  stepped down one size, for a compact identity row (e.g. a menu or dropdown header).
   *  Backward-compatible; without it the row keeps its default 40px avatar and type. */
  compact?: boolean;
  // Layout.
  truncate?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Alignment precedence when more than one is passed: first match wins. Default is
// start (items-start) so the media anchors to the first line of a multi-line body.
function alignOf(p: MediaObjectProps): Align {
  if (p.center) return "center";
  if (p.start) return "start";
  return "start";
}

// Direction precedence when more than one is passed: first match wins.
function directionOf(p: MediaObjectProps): Direction {
  if (p.reversed) return "reversed";
  if (p.leading) return "leading";
  return "leading";
}

// The bordered card surface color: the card fill reads the active tokens, so the
// surface follows light/dark. Bordered MediaObject uses static content frost,
// with tokens.card as the opaque solid fallback. The border color comes from
// the skin (web/iOS hairline tokens.border;
// Android's M3 ELEVATED card paints it transparent so elevation, not an outline,
// separates it). The skin carries the shape/density/shadow.
function borderedColors(tokens: ColorTokens, skin: MediaObjectSkin): ViewStyle {
  return {
    borderColor: skin.borderedBorderColor ? skin.borderedBorderColor(tokens) : tokens.border,
    backgroundColor: tokens.card,
  };
}

/**
 * Build a MediaObject from a platform skin and the platform-correct leading Avatar
 * atom. The Avatar is passed in by each platform's thin `.tsx`/`.ios`/`.android`
 * file, so the leading initials avatar matches the row's platform on every build
 * path. This matters for the WEB docs 3-up preview: a bare barrel import always
 * resolves the WEB Avatar in a browser bundler, which would paint a web-styled
 * avatar inside the iOS/Android rows; each platform file passes its own `.ios`/
 * `.android` atom so the row reads native. On a real device Metro resolves the
 * right atom by extension regardless, so the default (the web base) is correct too.
 */
export function createMediaObject(skin: MediaObjectSkin, Avatar: AvatarComponent = WebAvatar) {
  return function MediaObject(props: MediaObjectProps) {
    const { title, description, body, meta, avatar, src, icon, action, truncate, testID, style } = props;
    const theme = useMaterialTheme({ static: true });
    const { tokens } = theme;
    // FILL: the identity row spans the parent it is given, so a long body wraps.
    const fill = useFillStyle("MediaObject");
    const align = alignOf(props);
    const direction = directionOf(props);
    // Compact (menu-header) density: a tighter row gap, a smaller leading avatar/icon,
    // and title/description type stepped down one size. Null when off, so the base skin
    // stands unchanged.
    const isCompact = !!props.compact;
    const density = isCompact ? skin.compact : null;

    // The row's visual box WITHOUT outer layout. On a bordered row the rounded surface
    // (and its elevation) live in `skin.borderedSurface`.
    const surface: StyleProp<ViewStyle> = [
      skin.containerBase,
      density?.containerBase,
      { flexDirection: DIRECTION_ROW[direction], alignItems: ALIGN_ITEMS[align] },
      props.bordered ? [skin.borderedSurface, borderedColors(tokens, skin)] : null,
    ];

    // Leading media: photo > initials avatar > icon box. Only one renders. A photo
    // routes through the platform Avatar (not a raw Image), so a broken/missing image
    // falls back to initials (from `avatar`, else the title) exactly like an initials
    // row; the Avatar owns the 40px circle (28px `small` under compact). The icon tint
    // reads the tokens; the box shape comes from the skin.
    let media: ReactNode = null;
    if (src) {
      media = <Avatar small={isCompact} src={src} name={avatar ?? title} accessibilityLabel={title} />;
    } else if (avatar) {
      media = <Avatar small={isCompact} name={avatar}>{avatar}</Avatar>;
    } else if (icon != null) {
      media = (
        <View style={[skin.iconBox, density?.iconBox, { backgroundColor: alpha(tokens.primary, 0.15) }]}>
          {typeof icon === "string" ? <Text style={[skin.iconGlyph, { color: tokens.primary }]}>{icon}</Text> : icon}
        </View>
      );
    }

    // The engine has no truncate utility; RN clamps text via numberOfLines, which
    // is the supported equivalent (single line with an ellipsis on overflow).
    const inner = (
      <>
        {media}
        <View style={skin.content}>
          {title != null ? (
            <Text style={[skin.title, density?.title, { color: tokens.foreground }]} numberOfLines={truncate ? 1 : undefined}>
              {title}
            </Text>
          ) : null}
          {description != null ? (
            <Text style={[skin.description, density?.description, { color: tokens["muted-foreground"] }]} numberOfLines={truncate ? 1 : undefined}>
              {description}
            </Text>
          ) : null}
          {body != null ? <Text style={[skin.body, { color: tokens.foreground }]}>{body}</Text> : null}
        </View>
        {meta != null ? <Text style={[skin.meta, { color: tokens["muted-foreground"] }]}>{meta}</Text> : null}
        {action != null ? <View style={skin.actionBox}>{action}</View> : null}
      </>
    );

    // A tappable row swaps the View for a Pressable with a button role and a pressed
    // affordance, so a tappable media row needs no hand-rolled Pressable. Android
    // shows the native surface ripple; iOS/web dim opacity on press.
    if (props.onPress) {
      // A tappable row's accessible name is otherwise derived only from its
      // descendant Text. An icon-only or photo-only row (no title/description/meta)
      // would expose an unlabeled button, so fall back to the first available text
      // prop to give the control a name for screen readers.
      const a11yLabel = title ?? description ?? meta ?? undefined;
      // A bare (non-bordered) row is only as tall as its content, so back it out to the
      // platform minimum tap height (native minHeight; web = 0, unchanged). A bordered
      // row is already tall enough from its padding.
      const minTarget = !props.bordered && skin.minTarget ? { minHeight: skin.minTarget } : null;
      // The bounded ripple is clipped to the rounded bordered surface by the RippleClip parent
      // (Android only; a same-node overflow:"hidden" cannot clip it — see src/style/ripple-clip).
      // That parent-clip would cut the child's own Android elevation shadow, so the bordered
      // surface's `elevation` moves to the wrapper while the inner keeps the iOS `shadow*`.
      const borderedElevation = props.bordered
        ? { elevation: (StyleSheet.flatten(skin.borderedSurface) as ViewStyle).elevation }
        : null;
      const { parent: elevParent, child: elevZero } = splitElevation(borderedElevation);
      return (
        <RippleClip shape={props.bordered ? cornerRadii(skin.borderedSurface) : undefined} style={[elevParent, fill, style]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
            onPress={props.onPress}
            testID={testID}
            android_ripple={surfaceRipple(tokens)}
            style={({ pressed }) => [props.bordered ? paneStyle(theme, surface) : surface, minTarget, elevZero, pressDim(pressed, skin.pressedOpacity)]}
          >
            {props.bordered ? <GlassPane layer="content" shape={surface} /> : null}
            {inner}
          </Pressable>
        </RippleClip>
      );
    }

    // A bordered row is a CONTENT-layer pane under glass (GlassSurface is the plain View in solid mode).
    return props.bordered ? (
      <GlassSurface layer="content" testID={testID} style={[surface, fill, style]}>{inner}</GlassSurface>
    ) : (
      <View testID={testID} style={[surface, fill, style]}>{inner}</View>
    );
  };
}
