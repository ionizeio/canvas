import { type ReactNode } from "react";
import { type GestureResponderEvent } from "react-native";
import {
  View,
  Pressable,
  Text,
  useTheme,
  isRTL,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
} from "../../style/index.js";
import { Icon } from "../icon/icon.js";

// Shared Breadcrumb shell. A breadcrumb is a horizontal trail of links separated
// by a divider glyph, with the last item current (non-link, emphasized).
// Ancestors are muted links; the page you are on is plain foreground text at the
// end of the trail.
//
// The structure (the wrapping nav row, the per-crumb cell, the separator glyph,
// the home affordance), the boolean-prop axis (the separator style), and the
// accessibility roles all live here once; a platform file supplies only its skin
// (the link / current / separator type, and the press feedback) and calls
// createBreadcrumb.
//
// Breadcrumb is a "Light" platform treatment: ONE structure on every platform,
// with per-OS touches limited to the label type (SF tracking on iOS, Material 3
// label tracking on Android) and the link press feedback (an opacity dim on
// iOS/web, an android_ripple on Android). Neither iOS nor Android ships a native
// breadcrumb control, so this matches Web's Catalyst/shadcn trail and applies the
// platform reading conventions on top — it does not invent a native widget.
//
// Boolean-prop API, one axis: the separator style. Pick one of `chevron`
// (default), `slash`, or `dot`; first match wins (mirrors Button's intentOf). The
// foundation has no SVG utility here, so the chevron is a reading-direction glyph
// (the single-guillemet "›" in LTR, "‹" under RTL) rather than an icon, keeping
// every separator a Text glyph pointing in the reading direction.

// The press feedback an Android ripple wants: the ink color + borderless flag for
// the Pressable's android_ripple prop. The link/home crumbs are text-sized targets,
// so a borderless control ripple radiates from the touch point rather than filling
// a rect.
export interface BreadcrumbRipple {
  color: string;
  borderless: boolean;
}

// The only thing a platform skin owns: the label/divider type and the press
// feedback. Everything else is the shell. Colors come from the active tokens
// (passed in from useTheme) so light/dark/glass keep working; the skin layers only
// the per-OS type (size/weight/tracking) on top.
export interface BreadcrumbSkin {
  /** A muted ancestor link (size / line-height / weight / tracking + color). */
  link: (tokens: ColorTokens) => TextStyle;
  /** The current page: emphasized foreground text, not a link. */
  current: (tokens: ColorTokens) => TextStyle;
  /** The divider glyph, quieter than the labels so it reads as a path divider. */
  separator: (tokens: ColorTokens) => TextStyle;
  /**
   * Android ripple for a pressed link/home crumb, or null on iOS/web (where the
   * opacity dim carries the press feedback instead).
   */
  ripple: ((tokens: ColorTokens) => BreadcrumbRipple) | null;
  /**
   * The opacity a pressed link/home crumb dims to on iOS/web, or null on Android
   * (where the ripple carries the press feedback instead).
   */
  pressedOpacity: number | null;
  /** The home-icon glyph size (kept small to sit on the text baseline). */
  homeIconSize: number;
  /**
   * Minimum effective touch target for the link/home crumbs (HIG 44pt on iOS,
   * Material 48dp on Android). The shell pads the text-sized Pressables out to
   * this with hitSlop, so the tap area meets the platform minimum without
   * changing the visual layout. Inert for pointer input on web.
   */
  minTarget: number;
}

export interface BreadcrumbProps {
  /**
   * The trail, ancestor-first. The last entry renders as the current page (plain
   * emphasized text); the rest render as muted links.
   */
  items?: string[];
  // Separator style (pick one; default is the chevron glyph).
  chevron?: boolean;
  slash?: boolean;
  dot?: boolean;
  /**
   * Leading affordance: prepend a muted home-icon crumb (aria-labelled "Home")
   * before the trail, followed by the separator. Off by default.
   */
  homeIcon?: boolean;
  /**
   * Collapse a long trail: when the trail has more than `maxItems` crumbs, keep
   * the first crumb and the last `maxItems - 2`, and replace the middle with a
   * single "…" crumb, so a deep path stays on one scannable line.
   */
  maxItems?: number;
  /** Fired with the crumb label and its index when a link (non-last) is pressed. */
  onItemPress?: (item: string, index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

type Separator = "chevron" | "slash" | "dot";

// Separator precedence when more than one flag is passed: first match wins.
function separatorOf(p: BreadcrumbProps): Separator {
  if (p.chevron) return "chevron";
  if (p.slash) return "slash";
  if (p.dot) return "dot";
  return "chevron";
}

// The divider glyph per style. A centered middot for `dot`, a forward slash for
// `slash`, and a reading-direction single guillemet for `chevron` (stands in for
// the SVG chevron not rendered here). Guillemets are quotation marks, EXCLUDED
// from Unicode bidi mirroring, so RTL needs the mirrored U+2039 picked explicitly
// or the divider would keep pointing against the reading direction.
const SEPARATOR_GLYPH: Record<Separator, string> = {
  chevron: isRTL() ? "‹" : "›",
  slash: "/",
  dot: "·",
};

export interface BreadcrumbItemProps {
  children?: ReactNode;
  /** Render as the current page: emphasized foreground text, non-interactive. */
  current?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<TextStyle>;
}

// The nav row: wrapping horizontal trail, centered, with a tight gap (gap-1.5).
const NAV: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
};

// A crumb cell (and the homeIcon cell): the icon/label sits next to its divider.
const CRUMB: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
};

// The label line-height every skin renders (text-sm, 14/20); the vertical hitSlop
// pads this out to the skin's minimum touch target.
const LABEL_LINE_HEIGHT = 20;
// Horizontal hitSlop for the text links: modest, so adjacent crumbs (6px gap)
// keep distinct targets while the tap area still extends past the label edges.
const LINK_HORIZONTAL_SLOP = 8;

// Vertical padding that takes a `visible`-tall crumb to the skin's minimum
// effective touch target (44pt HIG / 48dp M3) without changing the layout.
function targetSlop(minTarget: number, visible: number): number {
  return Math.max(0, Math.ceil((minTarget - visible) / 2));
}

/** Build a Breadcrumb (and its matching BreadcrumbItem) from a platform skin. */
export function createBreadcrumb(skin: BreadcrumbSkin) {
  // A single crumb. Current crumbs are plain emphasized text; ancestors are muted,
  // pressable links with the skin's press feedback (ripple on Android, dim on
  // iOS/web).
  function BreadcrumbItem(props: BreadcrumbItemProps) {
    const { children, current, onPress, style } = props;
    const { tokens } = useTheme();
    if (children == null) return null;
    if (current) {
      return (
        <Text
          style={[skin.current(tokens), style]}
          accessibilityRole="text"
          accessibilityState={{ selected: true }}
          aria-current="page"
        >
          {children}
        </Text>
      );
    }
    // Pad the ~20px-tall text link out to the platform minimum touch target
    // vertically; horizontally a modest fixed slop keeps neighbors distinct.
    const linkType = skin.link(tokens);
    const vertical = targetSlop(skin.minTarget, linkType.lineHeight ?? LABEL_LINE_HEIGHT);
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
        hitSlop={{ top: vertical, bottom: vertical, left: LINK_HORIZONTAL_SLOP, right: LINK_HORIZONTAL_SLOP }}
      >
        {({ pressed }) => (
          <Text
            style={[
              linkType,
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              style,
            ]}
          >
            {children}
          </Text>
        )}
      </Pressable>
    );
  }

  function Breadcrumb(props: BreadcrumbProps) {
    const { items, homeIcon, maxItems, onItemPress, testID, style } = props;
    const { tokens } = useTheme();
    const trail = items ?? [];
    const separator = separatorOf(props);
    const glyph = SEPARATOR_GLYPH[separator];

    // Collapse a long trail: keep the first crumb + an ellipsis + the last
    // `maxItems - 2` crumbs. `origIndex` preserves each visible crumb's index in
    // the full trail (so onItemPress reports the real position); the ellipsis is a
    // non-interactive muted crumb.
    type Crumb = { label: string; origIndex: number; ellipsis?: boolean };
    let display: Crumb[];
    if (maxItems != null && maxItems >= 2 && trail.length > maxItems) {
      const tailCount = maxItems - 1;
      const tailStart = trail.length - tailCount;
      display = [
        { label: trail[0], origIndex: 0 },
        { label: "…", origIndex: -1, ellipsis: true },
        ...trail.slice(tailStart).map((label, i) => ({ label, origIndex: tailStart + i })),
      ];
    } else {
      display = trail.map((label, i) => ({ label, origIndex: i }));
    }

    return (
      <View
        style={[NAV, style]}
        testID={testID}
        role="navigation"
        aria-label="Breadcrumb"
        accessibilityLabel="Breadcrumb"
      >
        {homeIcon ? (
          <View style={CRUMB}>
            <Pressable
              onPress={() => onItemPress?.("Home", 0)}
              accessibilityRole="link"
              accessibilityLabel="Home"
              android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
              // The glyph is only homeIconSize (14px) square; pad all four sides
              // out to the platform minimum touch target.
              hitSlop={targetSlop(skin.minTarget, skin.homeIconSize)}
              style={({ pressed }) =>
                skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null
              }
            >
              <Icon home muted size={skin.homeIconSize} />
            </Pressable>
            {trail.length === 0 ? null : (
              <Text
                style={skin.separator(tokens)}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                aria-hidden
              >
                {glyph}
              </Text>
            )}
          </View>
        ) : null}
        {display.map((entry, index) => {
          const last = index === display.length - 1;
          return (
            <View key={`${index}-${entry.label}`} style={CRUMB}>
              {entry.ellipsis ? (
                <Text style={skin.link(tokens)} accessibilityLabel="More levels" aria-label="More levels">
                  {entry.label}
                </Text>
              ) : (
                <BreadcrumbItem
                  current={last}
                  onPress={last ? undefined : () => onItemPress?.(entry.label, entry.origIndex)}
                >
                  {entry.label}
                </BreadcrumbItem>
              )}
              {last ? null : (
                <Text
                  style={skin.separator(tokens)}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  aria-hidden
                >
                  {glyph}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  return { Breadcrumb, BreadcrumbItem };
}
