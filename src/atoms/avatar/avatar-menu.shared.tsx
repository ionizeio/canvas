import type { ReactElement } from "react";
import { View, Text, useControllableState, withInnerFill, type ColorTokens, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useHover } from "../../style/hover.js";
import type { DropdownItem, DropdownProps } from "../dropdown/dropdown.shared.js";
import { Icon } from "../icon/icon.js";
import { createAvatar, type AvatarSkin } from "./avatar.shared.js";

// Shared AvatarMenu shell. AvatarMenu is the account IDENTITY PILL: one capsule
// trigger holding the avatar, the person's name over their email, and a trailing
// chevron, wired to the kit's own Dropdown for the menu itself. It exists so no app
// (or docs topbar) hand-composes an account menu out of an Avatar, a hand-rolled name
// column, and a chevron: the anatomy, the pill's look, the viewer's glow and the
// accessible name live here once.
//
// The capsule is passed to Dropdown as its CUSTOM TRIGGER, so Dropdown's own
// Pressable owns the press, the open/close toggle, the outside-tap dismissal, and
// the button role. There is deliberately no second Pressable inside the capsule
// (that would nest one interactive element in another; see
// test/no-console-violations.test.tsx). AvatarMenu owns the open state so the pill
// can paint its open fill, and passes open/onOpenChange down to keep Dropdown in step.
//
// The pill is Dark Factory's identity pill on every platform (no platform ships one):
// bare at rest, so under glass it paints no surface of its own and takes no pane; the
// skin's fill under the pointer and while the menu is open (an ink tint under glass);
// the `small` (28px) disc in the viewer's glow ring; a static chevron. The menu surface
// is the platform's own Dropdown, so the popover matches the OS with no work here.

/**
 * The identity-pill entries an AvatarMenu skin adds to the Avatar skin family.
 * Everything platform-neutral (the capsule's flex row, the 9999 capsule radius,
 * the identity column, the chevron rotation, and the 11/14 secondary line's size)
 * lives in this file; a skin owns only the numbers that shift per OS.
 */
export interface AvatarMenuSkin extends AvatarSkin {
  /** Capsule metrics: height, gap, start/end padding. */
  menuPill: ViewStyle;
  /** Capsule fill, at rest and while hovered or open, from the theme tokens. */
  menuPillFill: (t: ColorTokens, active: boolean) => ViewStyle;
  /** The viewer's glow ring around the disc (a wrapper's shadow). */
  menuDiscGlow: (t: ColorTokens) => ViewStyle;
  /** The name line's type (size / line-height / weight / tracking). */
  menuPillName: TextStyle;
  /** The secondary (email) line's type. */
  menuPillSecondary: TextStyle;
  /** Trailing chevron glyph size, in px. */
  menuChevronSize: number;
  /** Disabled foreground opacity, matching the platform's trigger convention. */
  menuDisabledOpacity: number;
}

export interface AvatarMenuProps {
  /** The account holder's full name: the pill's first line, the avatar's initials
   *  fallback and colour identity, and the menu header's title. */
  name?: string;
  /** The secondary line under the name in the pill, and the menu header's
   *  description (typically the account's email address). */
  email?: string;
  /** The account photo. Falls back to the initials exactly like `Avatar`. */
  src?: string;
  /** Ready-made initials for the avatar, used verbatim when there is no photo. */
  initials?: string;
  /** The menu rows, top to bottom. Same rows as `Dropdown` (icon, shortcut,
   *  destructive, disabled, separatorBefore). */
  items: DropdownItem[];
  /** Avatar and chevron only, no name block: the topbar form of the pill. */
  compact?: boolean;
  // Menu alignment (pick at most one). The pill's menu hangs from the TRAILING
  // edge by default, which is where an account pill lives in a topbar and the
  // only edge a right-parked trigger can open from without running off the
  // surface. (Plain `Dropdown` defaults the other way, to its leading edge.)
  // Precedence when both are passed: `alignEnd` > `alignStart`, so the explicit
  // spelling of the default wins.
  /** Hang the menu from the pill's LEADING edge instead of its trailing one. */
  alignStart?: boolean;
  /** The default, spelled out: the menu's trailing edge meets the pill's. */
  alignEnd?: boolean;
  /** Dimmed, non-opening pill: the menu never opens and the press is inert. */
  disabled?: boolean;
  /** Controlled open state. Omit for uncontrolled (the pill opens/closes it). */
  open?: boolean;
  /** Fired when the open state changes (pill press, row select, dismissal). */
  onOpenChange?: (open: boolean) => void;
  /** Fired with the selected row and its index when a menu row is pressed. */
  onSelect?: (item: DropdownItem, index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (placement within a parent), never a restyle hook. */
  style?: LayoutStyle;
}

// The capsule is always a pill: a 9999 radius reads as a capsule at every skin
// height (32 / 36 / 40), so the shape is platform-neutral and owned here.
const PILL_RADIUS = 9999;

// The name-over-email column between the avatar and the chevron. Start-aligned and
// allowed to shrink so a long email never pushes the chevron out of the capsule.
const IDENTITY_COLUMN: ViewStyle = { alignItems: "flex-start", flexShrink: 1 };

// The TRIGGER BUTTON's accessible name, handed to Dropdown as `triggerLabel` so a
// screen reader hears WHOSE account the button opens instead of just "button". The
// name and email are the data a sighted user reads off the pill, so they are folded
// into the name, comma-separated; with neither (a photo only, or a compact pill with
// no identity at all) it falls back to a plain description of what the control does.
function accountLabel(name?: string, email?: string): string {
  if (name && email) return `${name}, ${email}`;
  return name ?? email ?? "Account menu";
}

/** Build an AvatarMenu from the same platform skin family as Avatar and AvatarGroup. */
export function createAvatarMenu(skin: AvatarMenuSkin, Dropdown: (props: DropdownProps) => ReactElement) {
  // The pill's avatar comes from the same skin, built once per platform module. It
  // is never pressable (Dropdown's trigger owns the press). Its identity stays
  // static while the outer account capsule owns the liquid material.
  const Avatar = createAvatar(skin);

  return function AvatarMenu(props: AvatarMenuProps) {
    const { name, email, src, initials, items, compact, alignStart, alignEnd, disabled, onSelect, testID, style } = props;
    const theme = useMaterialTheme({ layer: "control" });
    const { tokens } = theme;
    // Uncontrolled by default (a bare <AvatarMenu /> opens and closes on its own);
    // a controlled `open` prop takes over when supplied. The raw prop goes into the
    // hook so an absent `open` stays uncontrolled.
    const [open, setOpen] = useControllableState<boolean>(props.open, false, props.onOpenChange);
    // A disabled pill can never read as open, whatever the open state says, so the
    // fill, the chevron, and the announced state all stay collapsed.
    const expanded = open && !disabled;
    const label = accountLabel(name, email);
    // Trailing-edge by default; `alignStart` is the only way to the leading edge,
    // and an explicit `alignEnd` outranks it.
    const menuAlignEnd = alignEnd || !alignStart;
    // The pill fills under the pointer and while its menu is open; under glass the fill
    // is an ink tint over whatever the pill sits on, never an opaque patch.
    const { hovered, target } = useHover(!disabled);
    const active = expanded || (hovered && !disabled);
    const pillFill = active ? withInnerFill(theme, skin.menuPillFill(tokens, true), "firm") : skin.menuPillFill(tokens, false);
    const disabledInk = theme.surface === "glass" && disabled ? { opacity: skin.menuDisabledOpacity } : null;

    return (
      <Dropdown
        items={items}
        open={expanded}
        onOpenChange={setOpen}
        onSelect={onSelect}
        // The account's name goes on the trigger BUTTON, not on the capsule inside
        // it: a button named from its contents reads the pill's two text lines back
        // to back with no punctuation and picks up the Avatar's own label too.
        triggerLabel={label}
        // The identity header above the rows: the same name and email the pill shows.
        title={name}
        description={email}
        alignEnd={menuAlignEnd}
        disabled={disabled}
        testID={testID}
        style={style}
      >
        {/* The capsule is pure presentation: it is labelled by nothing and focusable
            by nothing. Dropdown wraps it in the button-roled Pressable that owns the
            press, aria-haspopup="menu", the dual expanded/disabled state, and the
            solid-mode disabled dim, and that same Pressable carries the account's
            ACCESSIBLE NAME, set from the `triggerLabel` passed above (Dropdown puts
            it on the button as accessibilityLabel plus its aria-label alias).
            Naming the button EXPLICITLY is the point: a button left to be named
            from its CONTENTS runs the capsule's text nodes together unpunctuated
            ("Rachel Chenrachel.chen@example.com"), re-reads the label the Avatar
            already carries for the photo, and under `compact` shrinks to whatever
            that Avatar label happens to be, since the capsule then holds no text at
            all. One explicit label on the one focusable node is one punctuated name
            in every configuration. It also keeps the capsule free of a role of its
            own: it is NOT a Pressable, since nesting one inside Dropdown's would
            make a doubly-focusable, invalid control
            (test/no-console-violations.test.tsx locks that). */}
        <View style={[skin.menuPill, { borderRadius: PILL_RADIUS }, pillFill]} {...target}>
          {/* The viewer's disc in its glow ring: the `small` (28px) step, 2px inside the
              32px pill. */}
          <View style={skin.menuDiscGlow(tokens)}>
            <Avatar small src={src} name={name} initials={initials} />
          </View>
          {compact ? null : (
            <View style={[IDENTITY_COLUMN, disabledInk]}>
              {name ? (
                <Text numberOfLines={1} style={[skin.menuPillName, { color: tokens.foreground }]}>
                  {name}
                </Text>
              ) : null}
              {email ? (
                <Text numberOfLines={1} style={[skin.menuPillSecondary, { color: tokens["muted-foreground"] }]}>
                  {email}
                </Text>
              ) : null}
            </View>
          )}
          {/* A static chevron, as Dark Factory's pill has: the button's own state names
              whether the menu is open, so it stays decorative. */}
          <View style={disabledInk}>
            <Icon chevronDown size={skin.menuChevronSize} muted decorative />
          </View>
        </View>
      </Dropdown>
    );
  };
}
