import type { ReactElement, ReactNode } from "react";
import { Animated } from "react-native";
import { View, Text, useControllableState, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { GlassPane, paneStyle } from "../../style/glass-surface/glass-pane.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { handoffInk, usePopupHandoffPill } from "../../style/popup-handoff.js";
import type { DropdownItem, DropdownProps } from "../dropdown/dropdown.shared.js";
import { Icon } from "../icon/icon.js";
import { createAvatar, type AvatarSkin } from "./avatar.shared.js";

// Shared AvatarMenu shell. AvatarMenu is the account IDENTITY PILL: one capsule
// trigger holding the avatar, the person's name over their email, and a trailing
// chevron that rotates while the menu is open, wired to the kit's own Dropdown for
// the menu itself. It exists so no app (or docs topbar) hand-composes an account
// menu out of an Avatar, a hand-rolled name column, and a chevron: the anatomy,
// the per-OS pill metrics, the open fill, and the accessible name live here once.
//
// The capsule is passed to Dropdown as its CUSTOM TRIGGER, so Dropdown's own
// Pressable owns the press, the open/close toggle, the outside-tap dismissal, and
// the button role. There is deliberately no second Pressable inside the capsule
// (that would nest one interactive element in another; see
// test/no-console-violations.test.tsx). AvatarMenu owns the open state so the pill
// can paint its open fill and rotate the chevron, and passes open/onOpenChange
// down to keep Dropdown in step.
//
// The pill's disc is the Avatar `tiny` step (24px), the size the hand-off draws
// inside the capsule on every platform, so the inset around it stays 4 on web, 6
// on iOS, and 8 on Android instead of collapsing to a ring around the photo.
//
// AvatarMenu is a "Light" platform treatment on the same AvatarSkin family as
// Avatar and AvatarGroup: one structure and one behavior, with the capsule's
// height, padding, fill, border, and label type supplied per OS by the skin
// (a 32px `secondary` capsule on web, a 36pt hairline-outlined capsule on iOS, a
// 40dp tonal Material 3 pill on Android). The menu surface is the platform's own
// Dropdown skin, so the popover matches the OS with no work here.

/**
 * The identity-pill entries an AvatarMenu skin adds to the Avatar skin family.
 * Everything platform-neutral (the capsule's flex row, the 9999 capsule radius,
 * the identity column, the chevron rotation, and the 11/14 secondary line's size)
 * lives in this file; a skin owns only the numbers that shift per OS.
 */
export interface AvatarMenuSkin extends AvatarSkin {
  /** Capsule metrics: height, gap, start/end padding, radius, hairline width. */
  menuPill: ViewStyle;
  /** Capsule fill and border color, closed and open, from the theme tokens. */
  menuPillFill: (t: ColorTokens, open: boolean) => ViewStyle;
  /** The name line's type (size / line-height / weight / tracking). */
  menuPillName: TextStyle;
  /** The secondary (email) line's type: 11/14 everywhere, tracking per OS. */
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

// The capsule is the PILL of the Dropdown's hand-off: it paints its own GlassPane
// (which hides and re-forms on the material curve) and its foreground nodes take the
// label's fade as ink of their own (`Ink`), so Dropdown's whole-subtree fader becomes
// a pass-through and never sits over the capsule's material (popup-handoff.tsx). The
// Avatar inside fades itself the same way. Rendered as a component of its own because
// the hand-off channel is provided by Dropdown around its trigger, inside this tree.
function Capsule({ shape, pane, children }: { shape: StyleProp<ViewStyle>; pane: ReactNode; children: ReactNode }) {
  usePopupHandoffPill();
  return <View style={shape}>{pane}{children}</View>;
}

// A foreground node of the capsule: the label's fade folded with its own ink (the
// disabled dim) under a hand-off, the plain node otherwise.
function Ink({ style, opacity, children }: { style: StyleProp<ViewStyle>; opacity: number; children: ReactNode }) {
  const pill = usePopupHandoffPill();
  if (!pill) return <View style={style}>{children}</View>;
  return <Animated.View style={[style, handoffInk(pill, opacity)]}>{children}</Animated.View>;
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
    const pillShape = [skin.menuPill, { borderRadius: PILL_RADIUS }, skin.menuPillFill(tokens, expanded)];
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
        <Capsule shape={paneStyle(theme, pillShape)} pane={<GlassPane layer="control" shape={pillShape} interactive={!disabled} />}>
          {/* `tiny` (24px) is the disc the capsule is drawn around: it leaves the
              hand-off's 4/6/8 inset inside the 32/36/40 pill on web/iOS/Android. */}
          <Avatar tiny src={src} name={name} initials={initials} />
          {compact ? null : (
            <Ink style={[IDENTITY_COLUMN, disabledInk]} opacity={disabledInk ? skin.menuDisabledOpacity : 1}>
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
            </Ink>
          )}
          {/* The chevron points down when closed and flips up while the menu is open;
              it repeats the button's own state, so it stays decorative. */}
          <Ink style={[{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }, disabledInk]} opacity={disabledInk ? skin.menuDisabledOpacity : 1}>
            <Icon chevronDown size={skin.menuChevronSize} muted decorative />
          </Ink>
        </Capsule>
      </Dropdown>
    );
  };
}
