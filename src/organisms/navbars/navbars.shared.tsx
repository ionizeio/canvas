import { type ComponentType, type ReactNode } from "react";
import { View, Pressable, Text, RippleClip, cornerRadii, useTheme, useControllableState, useContainerBreakpoint, GlassPane, GlassSurface, paneStyle, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle } from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { selectionTint } from "../../style/selection-tint.js";
import { Button } from "../../atoms/button/button.js";
import { Avatar } from "../../atoms/avatar/avatar.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Dropdown as WebDropdown, type DropdownProps, type DropdownItem } from "../../atoms/dropdown/dropdown.js";
import { type Surface } from "./navbars.styles.js";

// Shared Navbar shell. The structure (the left brand + links cluster, the right
// action + avatar cluster), the surface-axis precedence, the active-link
// selection, the accessibility, and the press handlers live here once; a
// platform file supplies only its skin (the native bar height/padding, the
// surface treatment, the brand type, the link tile/label, and the press
// feedback) and calls createNavbar.
//
// The navbar is the primary app-level topbar: a brand on the left, a row of
// navigation links in the middle with one active, and actions on the right (a
// primary action button and/or an account avatar). It is a fixed-height
// horizontal bar, laid out desktop-first.
//
// Both clusters take a caller-supplied element beside their built-in parts, so a
// console topbar composes out of the same bar: `brandContent` leads the left
// cluster (a logo mark ahead of, or instead of, the `brand` wordmark) and
// `actions` leads the right one (a search button, icon buttons, a notification
// dropdown, an account menu, ahead of `actionLabel` and `avatar`). Both sit as
// direct children of the existing group rows, so they take those rows' own gap
// and no skin field is involved. `links` is optional: a bar with no middle nav
// renders neither the links row nor its collapsed menu button.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf). The surface axis sets
// how the bar sits on the page: the default rests flush with a bottom hairline,
// `bordered` boxes it on all four sides with a rounded outline, and `floating`
// lifts it as a rounded, shadowed card detached from the page edge. Each
// platform skin renders that axis in its own native idiom (iOS keeps a slim
// hairline-separated bar; Android keeps a flat borderless top app bar).

// The platform-varying surface. Everything color/shape-bearing the bar needs
// lives here, built from the active tokens (so each follows light/dark/glass).
export interface NavbarSkin {
  /** iOS/web dim a pressed link; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over a pressed link; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Where the keyboard focus ring sits on the link Pressable: INSET_FOCUS_RING draws it
   * just inside a link that a clipping bar would otherwise cut; omitted, it sits around
   * the link. The ring itself is the kit Pressable's (the palette's `ring`). No-op
   * natively.
   */
  focusRing?: ViewStyle;

  /** The bar row: height, padding, and flex layout. */
  bar: (t: ColorTokens) => ViewStyle;
  /** The token-driven background fill (follows the scheme/glass surface). */
  surface: (t: ColorTokens) => ViewStyle;
  /** The surface-axis treatment (hairline / outline / floating card). */
  surfaceContainer: (t: ColorTokens, surface: Surface) => ViewStyle;

  /** The left cluster row (brand + links). */
  leftGroup: (t: ColorTokens) => ViewStyle;
  /** The brand wordmark type. */
  brand: (t: ColorTokens) => TextStyle;
  /** The links row. */
  linksRow: (t: ColorTokens) => ViewStyle;
  /** A nav link tile (padding + active fill). */
  linkTile: (t: ColorTokens, active: boolean) => ViewStyle;
  /** A nav link label (weight + active/inactive color). */
  linkLabel: (t: ColorTokens, active: boolean) => TextStyle;
  /**
   * How the active tile's fill renders as glass. `tint` keeps the skin's hue at a
   * translucent ceiling with the ordinary foreground ink (web's accent tile,
   * Android's 12% primary pill); `brand` paints the brand fill as glass whose
   * under-fill is densified until the primary-foreground ink reads at 4.5:1 (iOS's
   * primary capsule).
   */
  linkSelection: "tint" | "brand";

  /** The right cluster row (action + avatar). */
  rightGroup: (t: ColorTokens) => ViewStyle;
}

export interface NavbarProps {
  /** Brand or product name shown at the left, in a semibold face. */
  brand?: string;
  /**
   * A brand ELEMENT for the left cluster (a logo mark, a workspace switcher).
   * It LEADS the cluster, so passing it beside `brand` renders the mark first and
   * keeps the wordmark beside it; passing it alone makes the mark the whole brand.
   * It takes the left cluster's own gap, so it needs no wrapper.
   */
  brandContent?: ReactNode;
  /**
   * Ordered navigation link labels rendered in the middle row. Omit it (or pass an
   * empty array) for a bar with no middle nav: neither the links row nor the
   * narrow menu button that stands in for it renders.
   */
  links?: string[];
  /** Index of the active link (CONTROLLED; its label reads in the foreground color). Omit for uncontrolled use. */
  active?: number;
  /** Initial active link for uncontrolled use (a bare navbar moves the active link on press). */
  defaultActive?: number;
  /**
   * Free-form trailing controls for the right cluster: a ghost search button, icon
   * buttons, a notification dropdown, an account menu. They LEAD the cluster, ahead
   * of the built-in `actionLabel` button and `avatar`, and take the cluster's own
   * gap, so they need no wrapper. Keep them few and compact: the bar is a fixed
   * height and the slot is rendered as given at every width.
   */
  actions?: ReactNode;
  /** Optional primary action; renders a <Button primary small> on the right. */
  actionLabel?: string;
  /** Called when the action button is pressed. */
  onAction?: () => void;
  /** Optional account initials/name; renders an <Avatar small> on the right. */
  avatar?: string;
  /** Called when a nav link is pressed, with its index. */
  onSelect?: (index: number) => void;
  // Surface (pick one; default is the flush bottom-hairline bar).
  bordered?: boolean;
  floating?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Surface precedence when more than one is passed: first match wins.
function surfaceOf(p: NavbarProps): Surface {
  if (p.bordered) return "bordered";
  if (p.floating) return "floating";
  return "default";
}

// The platform-styled parts the bar composes: the Dropdown behind the narrow
// menu button. Passed by each platform's thin wrapper (the literal `.ios`/
// `.android` imports there are required for the WEB docs 3-up, where a barrel
// import would resolve the web atom in every column); defaults to the web atom.
export interface NavbarParts {
  Dropdown?: ComponentType<DropdownProps>;
}

/** Build a Navbar component from a platform skin (plus the platform-correct Dropdown its narrow menu composes; defaults to the web base when omitted). */
export function createNavbar(skin: NavbarSkin, parts: NavbarParts = {}) {
  const Dropdown = parts.Dropdown ?? WebDropdown;
  return function Navbar(props: NavbarProps) {
    const { brand, brandContent, links = [], actions, actionLabel, onAction, avatar, onSelect, testID, style } = props;
    const { tokens, dark } = useTheme();
    const surface = surfaceOf(props);
    const material = useMaterialTheme({ layer: "control" });
    const glass = material.surface === "glass";
    // Controlled when `active` is provided, self-managed otherwise, so a bare
    // navbar moves the active link to the pressed one instead of ignoring taps.
    const [active, setActive] = useControllableState<number>(props.active, props.defaultActive ?? 0);
    // Narrow collapse (automatic, no prop): the bar measures its OWN width and
    // at/below sm swaps the links row for a menu button opening the platform
    // Dropdown. The previous narrow rendering was a plain row clipping links
    // off-screen, so there is no working behavior to preserve; the kit owns the
    // whole trigger + menu, and `onSelect`/`active` keep their contract.
    const { value: collapsed, onLayout: onBarLayout } = useContainerBreakpoint(
      { base: false, sm: true },
      { seedViewport: true },
    );
    // The collapse stands in for the LINKS row, so a bar with no links has nothing
    // to collapse: it renders neither the row nor the menu button, rather than a
    // hamburger opening an empty popover. A trailing `actions` slot is unaffected
    // either way; it is not nav, so it never folds into the menu.
    const hasLinks = links.length > 0;
    // Under glass the ACTIVE tile is a CONTROL-layer pane: the GlassPane paints the
    // material behind its label in the tile's own shape (the Pressable keeps its tap,
    // ripple and dim), the tile drops its own fill (the pane's material carries it),
    // and the skin's `linkSelection` picks the fill: a brand-tinted puck (iOS's primary
    // capsule, whose label keeps the skin's primary-foreground ink) or the skin's hue
    // at selectionTint's translucent ceiling with the label in the ordinary
    // foreground. Inactive tiles keep the skin's own fill (iOS's neutral capsules;
    // web's and M3's are bare). Solid mode keeps the skin's active fill and renders
    // no pane at all.
    const menuItems: DropdownItem[] = links.map((link, index) => ({
      label: link,
      // The active link carries the conventional menu checkmark.
      icon: index === active ? "check" : undefined,
    }));

    // The bar joins the functional glass layer: GlassSurface paints the native
    // Liquid Glass (iOS) or frost (web/Android) in glass mode, and the solid skin
    // background in default mode. The glass fill is stripped by GlassSurface, so
    // the skin keeps supplying the solid background only.
    const container: StyleProp<ViewStyle> = [
      skin.bar(tokens),
      skin.surface(tokens),
      skin.surfaceContainer(tokens, surface),
      style,
    ];

    return (
      <GlassSurface testID={testID} style={container} onLayout={onBarLayout}>
        <View style={skin.leftGroup(tokens)}>
          {brandContent}
          {brand ? <Text style={skin.brand(tokens)}>{brand}</Text> : null}
          {!hasLinks ? null : collapsed ? (
            <Dropdown
              triggerLabel="Navigation menu"
              items={menuItems}
              onSelect={(_item, index) => {
                setActive(index);
                onSelect?.(index);
              }}
            >
              <Icon menu size={20} />
            </Dropdown>
          ) : (
          <View style={skin.linksRow(tokens)}>
            {links.map((link, index) => {
              const isActive = index === active;
              const tile = skin.linkTile(tokens, isActive);
              const puck = glass && isActive;
              return (
                // The bounded Android ripple on a link tile is masked to a rectangle and
                // cannot clip itself; this RippleClip parent rounds it to the tile's own
                // corners (Android only; a transparent layout passthrough on iOS/web).
                // Link tiles hug their labels, so there is no outer layout to move.
                <RippleClip key={`${link}-${index}`} shape={cornerRadii(tile)}>
                  <Pressable
                    onPress={() => {
                      setActive(index);
                      onSelect?.(index);
                    }}
                    android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
                    accessibilityRole="link"
                    accessibilityState={{ selected: isActive }}
                    aria-current={isActive ? "page" : undefined}
                    style={({ pressed }) => [
                      puck ? paneStyle(material, tile) : tile,
                      skin.focusRing,
                      skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                    ]}
                  >
                    {puck ? (
                      <GlassPane
                        layer="control"
                        shape={tile}
                        interactive
                        brand={skin.linkSelection === "brand" ? tokens.primary : undefined}
                        tint={skin.linkSelection === "tint" ? selectionTint(tile, dark) : undefined}
                      />
                    ) : null}
                    <Text style={[skin.linkLabel(tokens, isActive), puck && skin.linkSelection === "tint" ? { color: tokens.foreground } : null]}>{link}</Text>
                  </Pressable>
                </RippleClip>
              );
            })}
          </View>
          )}
        </View>
        <View style={skin.rightGroup(tokens)}>
          {actions}
          {actionLabel ? (
            <Button primary small onPress={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {avatar ? <Avatar small name={avatar} /> : null}
        </View>
      </GlassSurface>
    );
  };
}
