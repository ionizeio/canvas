import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useHover } from "../../style/hover.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View, Pressable, Text, useHugStyle, AnchoredOverlay, useOverlayHost, useMeasuredWidth, useRovingFocus, isRTL, RippleClip, cornerRadii, type StyleProp, type ViewStyle, withInnerFill } from "../../style/index.js";
import { Button as WebButton } from "../button/button.js";
import { Icon, type IconName } from "../icon/icon.js";
import { wrapper, wrapperLifted, customTrigger, type DropdownSkin } from "./dropdown.styles.js";

// Shared Dropdown shell. The structure (the trigger plus a floating menu of
// action rows, each with an optional leading icon glyph, a label, and an
// optional trailing keyboard shortcut, with hairline separators between groups
// and red-tinted destructive rows), the public boolean-prop API, the
// controlled/uncontrolled open state, the trigger/select close handlers, the
// outside-tap dismissal, the disabled handling, and accessibility all live
// here once. A platform file supplies only its skin (the menu card shape/fill/
// border, the separators, the row sizing, and the press feedback) and calls
// createDropdown.
//
// The trigger defaults to an outline button labelled by `trigger`. Pass
// `children` to supply a CUSTOM trigger instead (e.g. an avatar account chip in
// a topbar): the children render in place of the button, inside a Pressable that
// toggles the menu. Either way the menu rows still come from `items`.
//
// Overlay note: the open menu renders through AnchoredOverlay. When an
// OverlayProvider is mounted (an app root, or a docs example stage) the menu is
// portaled over the page, anchored below the trigger, and a tap anywhere off it
// dismisses it — identically on iOS, Android, and web, with no Platform.OS branch
// and no position:fixed. With no provider it falls back to an inline card
// positioned absolutely below the trigger (the kit's pre-portal behavior).
//
// There are no visual style axes on the menu itself, so there is no boolean-prop
// precedence to resolve; the per-item `destructive` flag is the only variant and
// it is scoped to its own row.

export interface DropdownItem {
  label: string;
  /** Optional leading Canvas glyph rendered before the label, named from the kit
   *  icon set (e.g. `"user"`, `"settings"`, `"logOut"`). Rendered through the
   *  `Icon` atom, tinted to match the row (destructive rows go red). */
  icon?: IconName;
  /** Optional trailing keyboard shortcut, right-aligned and muted. */
  shortcut?: string;
  /** Red-tinted row for destructive actions (e.g. Delete). */
  destructive?: boolean;
  /** Inert row: skips onSelect and shows the platform's disabled look (the web's muted ink, a dim on iOS and Android). */
  disabled?: boolean;
  /** Draw a hairline separator above this row to start a new group. */
  separatorBefore?: boolean;
}

export interface DropdownProps {
  /** Label for the default outline trigger button. Omit when supplying a custom
   *  trigger via `children`. */
  trigger?: string;
  /** A custom trigger rendered in place of the default outline button, e.g. an
   *  avatar account chip. It is wrapped in a Pressable that toggles the menu;
   *  the menu itself still comes from `items`. */
  children?: ReactNode;
  /** The accessible name for a CUSTOM trigger (`children`). Without it the button
   *  is named from its own contents, which runs the trigger's text together into
   *  one unpunctuated string ("Rachel Chenrachel@example.com") and repeats any
   *  label a nested control already carries. Ignored by the default `trigger`
   *  button, which is named by its own text. */
  triggerLabel?: string;
  /** Optional muted section heading rendered above the rows (e.g. "Actions"). */
  label?: string;
  /** Identity header title, rendered in the popover foreground ABOVE everything
   *  else in the menu (an account name over its email, say). Pair it with
   *  `description`; passing neither omits the header block entirely. */
  title?: string;
  /** Identity header second line, muted, under `title`. */
  description?: string;
  /** The menu rows, top to bottom. */
  items: DropdownItem[];
  /** Align the menu's TRAILING edge with the trigger's trailing edge instead of
   *  the leading edge (the default). For a trigger parked at the end of a bar,
   *  where a leading-aligned menu would run off the surface. Logical, so a
   *  right-to-left locale mirrors it. */
  alignEnd?: boolean;
  /** Dimmed, inert trigger: the menu never opens and the press is a no-op. */
  disabled?: boolean;
  /** Controlled open state. Omit for uncontrolled (the trigger opens/closes it). */
  open?: boolean;
  /** Fired when the open state changes (trigger press, select, etc.). */
  onOpenChange?: (open: boolean) => void;
  /** Fired with the selected item and its index when a row is pressed. */
  onSelect?: (item: DropdownItem, index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// The menu's width floor. A menu under a small trigger (e.g. an outline button)
// stays at least this wide; a wider trigger (an account chip) sets the width.
const MENU_MIN_WIDTH = 200;

// The trigger's own focusable node, inside the wrapper, for the return-focus half
// of the WAI-ARIA menu pattern. Both trigger shapes (the default Button and a
// custom `children` Pressable) carry `aria-haspopup="menu"` and nothing else in
// the wrapper does, so this names the trigger exactly, with no reliance on child
// order. Web-only by construction: it is used behind a `document` guard, and
// natively VoiceOver/TalkBack return focus to the trigger themselves.
const TRIGGER_NODE = '[aria-haspopup="menu"]';
// An open menu card, wherever it is rendered (inline under the trigger, or
// portaled into an overlay outlet). Used to tell focus that a close ORPHANED
// from focus the user has deliberately moved elsewhere.
const MENU_NODE = '[role="menu"]';

// A menu row's host node, as the open-focus needs it. `preventScroll` is a DOM
// focus option: react-native-web renders the row as a real element that takes it,
// while a native View has no focus() at all, so the call is a no-op there exactly
// like the rest of the roving-focus layer.
type FocusableRow = { focus?: (options?: { preventScroll?: boolean }) => void } | null;

// The inline-fallback anchor: with no OverlayProvider mounted the menu renders in
// place, absolutely positioned below the trigger (the kit's pre-portal behavior).
// With a provider, AnchoredOverlay positions the card over the page and adds the
// outside-tap dismiss backdrop instead. The skin owns the card's shape/fill/
// shadow; this owns the inline anchoring.
//
// `start`/`end` (never left/right) so the alignment is LOGICAL: the wrapper
// shrink-wraps the trigger, so pinning the card's start edge lines it up with the
// trigger's leading edge and pinning its end edge lines up the trailing edges,
// mirrored automatically in a right-to-left locale.
// The inline anchors take their standoff from the skin, so a menu built for a
// taller trigger (the account pill, which its design spec stands off by 6) can differ
// without any caller-facing spacing prop. start/end stay logical for RTL.
const menuAnchor = (gap: number): ViewStyle => ({ position: "absolute", top: "100%", start: 0, zIndex: 50, marginTop: gap });
const menuAnchorEnd = (gap: number): ViewStyle => ({ position: "absolute", top: "100%", end: 0, zIndex: 50, marginTop: gap });

/** Build a Dropdown component from a platform skin. */
/**
 * The components a Dropdown draws with that look different per platform. The web
 * builds are the defaults; the iOS and Android entries pass their own, so the docs'
 * platform columns render them truthfully (a device resolves them by platform either way).
 */
export interface DropdownParts {
  Button?: typeof WebButton;
}

export function createDropdown(skin: DropdownSkin, parts: DropdownParts = {}) {
  const Button = parts.Button ?? WebButton;

  interface MenuRowProps {
    item: DropdownItem;
    rowRef: (node: FocusableRow) => void;
    rovingProps: object;
    onSelect: () => void;
    ripple: { color: string; borderless: boolean } | undefined;
  }

  // One menu row, its own component so the web's hover wash has a hook per row. A
  // disabled row is inert and takes the skin's disabled look: the web's muted ink, or
  // the platform's dim.
  function MenuRow({ item, rowRef, rovingProps, onSelect, ripple }: MenuRowProps) {
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens, dark } = theme;
    const disabled = !!item.disabled;
    const muted = disabled && skin.disabledRow.muted;
    const { hovered, target } = useHover(skin.itemHover != null && !disabled);
    return (
      <Pressable
        ref={rowRef}
        {...rovingProps}
        {...target}
        style={({ pressed }) => [
          skin.itemRow,
          hovered && skin.itemHover ? skin.itemHover(tokens) : null,
          // iOS/web tint the row on press here; Android uses the ripple instead.
          skin.itemPressed != null && pressed ? withInnerFill(theme, skin.itemPressed(tokens), "firm") : null,
          skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
          disabled && skin.disabledRow.opacity !== 1 ? { opacity: skin.disabledRow.opacity } : null,
        ]}
        onPress={disabled ? undefined : onSelect}
        disabled={item.disabled}
        android_ripple={ripple}
        accessibilityRole="menuitem"
        accessibilityState={{ disabled: item.disabled }}
        aria-disabled={item.disabled}
      >
        {item.icon ? (
          <Icon {...{ [item.icon]: true }} destructive={item.destructive && !muted} muted={muted} size={skin.iconSize} decorative />
        ) : null}
        <Text style={[skin.itemTextType, muted ? { color: tokens["muted-foreground"] } : skin.itemTextColor(tokens, dark, !!item.destructive)]}>
          {item.label}
        </Text>
        {item.shortcut ? (
          <Text style={skin.shortcut(tokens)}>
            {item.shortcut}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return function Dropdown(props: DropdownProps) {
    const { trigger, children, triggerLabel, label, title, description, items, open: openProp, onOpenChange, onSelect, alignEnd, disabled, testID, style } = props;
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens, dark } = theme;
    // HUG: the trigger keeps its content width inside a stretching Column.
    const hug = useHugStyle();
    // Uncontrolled by default (Headless-UI style): the trigger opens/closes the
    // menu and a select closes it; a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    // A disabled Dropdown is closed, full stop: the trigger is inert AND a
    // controlled `open` cannot force the menu out of a disabled control.
    const open = !disabled && (openProp ?? internalOpen);
    const setOpen = (next: boolean) => {
      if (disabled) return;
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };
    // The identity header (title over description) sits above the section label
    // and the rows. It is a GROUP, never a menu item: `group` is a valid child of
    // `menu`, so assistive tech reads the two lines as one named node instead of
    // the loose anonymous text they would otherwise be, while staying
    // unfocusable, so the roving-focus item count is still items.length.
    const hasHeader = title != null || description != null;
    const headerName = [title, description].filter((line) => line != null).join(", ");
    // The menu's own accessible name. A card with an identity header is named by
    // that header's title (the account name is what a user calls that menu), and
    // otherwise by the muted section label. With neither, the name is left to the
    // platform's own computation rather than invented here.
    const menuName = title ?? description ?? label;

    // Escape dismisses the open menu via browser Escape or native accessibility escape.
    const escapeScope = useEscapeLayer(open, () => setOpen(false));

    // Roving-focus keyboard navigation for the open menu (the WAI-ARIA menu pattern):
    // on open, focus moves to the first enabled row; the arrows move focus among the
    // rows and Enter/Space activates the focused one. Web-only in effect (natively
    // there is no onKeyDown and a View has no focus()).
    const [focusedIndex, setFocusedIndex] = useState(0);
    // The rows' host nodes, captured alongside the roving hook's own refs. The
    // open-focus needs the node itself so it can pass `preventScroll`, the way
    // every programmatic focus move in the kit is qualified (see use-dialog-focus):
    // a menu the user just opened is already in view, and a menu that renders open
    // from its first commit (a docs demo pinned open) must not yank the page to
    // itself. The arrow keys keep the hook's own move, which scrolls the row it
    // lands on into view.
    const rowNodes = useRef<FocusableRow[]>([]);
    const { getItemProps } = useRovingFocus({
      count: items.length,
      active: focusedIndex,
      onActivate: setFocusedIndex,
      orientation: "vertical",
      rtl: isRTL(),
    });
    // Focus moves in when the CARD MOUNTS, not when `open` flips. On the hosted
    // (portaled) path (every real app and every docs stage) AnchoredOverlay holds
    // the card back until it has measured the trigger, so at the instant `open`
    // becomes true there is no row to focus and the arrows would be dead. The
    // overlay's mount callback fires on BOTH paths at the one moment the rows exist
    // (their refs are attached before it runs), so nothing polls and nothing guesses
    // a timeout.
    const focusFirstItem = () => {
      const first = items.findIndex((it) => !it.disabled);
      const start = first >= 0 ? first : 0;
      setFocusedIndex(start);
      rowNodes.current[start]?.focus?.({ preventScroll: true });
    };

    // ...and back out to the trigger on close (WAI-ARIA: closing a menu returns
    // focus to the button that opened it). Without this, Escape or a row press
    // drops focus on document.body and the keyboard user restarts at the top of
    // the page. Web-only: `document` is undefined natively and during SSR, where
    // VoiceOver/TalkBack restore the cursor themselves.
    const restoreFocusToTrigger = () => {
      if (typeof document === "undefined") return;
      const wrapper = triggerRef.current as unknown as HTMLElement | null;
      // The whole Dropdown went with its page: there is no trigger to focus.
      if (wrapper == null || !document.body.contains(wrapper)) return;
      const active = document.activeElement as HTMLElement | null;
      // Reclaim only the focus THIS close orphaned: still on a menu row, or already
      // dropped on <body> because the card unmounted under it. A close that was not
      // user-driven (an app flipping `open` after the user has tabbed on) finds
      // focus on a live element elsewhere and leaves it exactly where it is.
      const orphaned =
        active == null ||
        active === document.body ||
        !document.body.contains(active) ||
        active.closest(MENU_NODE) != null;
      if (!orphaned) return;
      // preventScroll: returning focus must never yank the page, the way every
      // programmatic focus move in the kit is qualified (see use-dialog-focus).
      wrapper.querySelector<HTMLElement>(TRIGGER_NODE)?.focus({ preventScroll: true });
    };
    useEffect(() => {
      if (!open) return;
      // One cleanup covers every close path: Escape, a row select, an outside tap,
      // a controlled `open` going false, and the Dropdown unmounting mid-open.
      return restoreFocusToTrigger;
    }, [open]);

    // Match the menu width to the trigger (and let longer rows grow past it), so a
    // wide trigger like a topbar account chip gets a menu of the same width.
    // Measured via the wrapper's layout; the menu is absolute, so it never feeds
    // back into this width.
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();
    // The wrapper tightly wraps the trigger (the menu portals out when hosted), so
    // measuring it gives the trigger's box for anchoring the floating card.
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    return (
      // self-start keeps the trigger from stretching; relative anchors the inline
      // fallback menu.
      <View
        ref={triggerRef}
        testID={testID}
        style={[wrapper, open && !host ? wrapperLifted : null, hug, style]}
        onLayout={onTriggerLayout}
      >
        {children != null ? (
          <Pressable
            // Custom content can contain its own native material. Its owner
            // handles disabled ink in glass mode; never fade that whole subtree.
            style={[customTrigger, disabled && theme.surface !== "glass" ? { opacity: skin.disabledOpacity } : null]}
            onPress={disabled ? undefined : () => setOpen(!open)}
            disabled={disabled}
            accessibilityRole="button"
            // The name belongs on the button itself: a name computed from contents
            // reads the trigger's own text nodes back to back and picks up the
            // labels of anything nested inside it.
            accessibilityLabel={triggerLabel}
            aria-label={triggerLabel}
            accessibilityState={{ expanded: open, disabled: !!disabled }}
            // RNW forwards neither accessibilityState nor aria-haspopup; alias both.
            aria-expanded={open}
            aria-disabled={disabled ? true : undefined}
            {...{ "aria-haspopup": "menu" }}
          >
            {children}
          </Pressable>
        ) : (
          <Button outline small expanded={open} haspopup="menu" disabled={disabled} onPress={() => setOpen(!open)}>
            {trigger}
          </Button>
        )}

        <AnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={skin.menuGap}
          cardStyle={[skin.menuCard(tokens), { minWidth: Math.max(triggerWidth, MENU_MIN_WIDTH) }]}
          inlineStyle={alignEnd ? menuAnchorEnd(skin.menuGap) : menuAnchor(skin.menuGap)}
          // A menu is a card of action rows, so under glass it takes the DENSE
          // layer: the material under the model's densest tint, so the rows a user
          // reads and picks from stay legible (the functional layer's sheer tint let
          // the page's own rules and rows read straight between the items) while the
          // card still refracts the page at its rim.
          dense
          // Same logical alignment on the hosted path: the portal places the card
          // by the trigger's trailing edge instead of its leading one, mirrored
          // in a right-to-left locale.
          alignEnd={alignEnd}
          rtl={isRTL()}
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={openProp === undefined || onOpenChange !== undefined}
          // The card is where the rows live, so its mount is when focus can move
          // into them: on the portaled path that is a measurement later than the
          // open itself.
          onCardMount={focusFirstItem}
        >
          <EscapeLayerProvider scope={escapeScope}>
            {/* role="menu" gives the menuitem rows a valid ARIA parent; without it
                each menuitem is orphaned and web SRs/validators flag it. The RippleClip
                parent clips the Android bounded-ripple rows to the menu card's rounded
                corners (a no-op on iOS/web; the card itself keeps no overflow). */}
            <RippleClip shape={cornerRadii(skin.menuCard(tokens))} style={{ alignSelf: "stretch" }}>
            {/* An unnamed menu is announced as a bare "menu"; naming it from the
                header (or the section label) is what tells a screen-reader user
                WHICH menu opened. RNW forwards neither accessibilityLabel nor the
                role's own name, so both aliases are set, per the kit's dual-a11y
                contract. */}
            <View accessibilityRole="menu" role="menu" accessibilityLabel={menuName} aria-label={menuName} style={skin.rowGap ? { gap: skin.rowGap } : undefined}>
            {hasHeader ? (
              <View style={skin.menuHeader} role="group" accessibilityLabel={headerName} aria-label={headerName}>
                {title != null ? <Text style={skin.menuHeaderTitle(tokens)}>{title}</Text> : null}
                {description != null ? <Text style={skin.menuHeaderDescription(tokens)}>{description}</Text> : null}
              </View>
            ) : null}
            {/* The card's own hairline closes the header block off from what
                follows (Android's M3 skin declares no separator, so there the
                header's padding does the separating). */}
            {hasHeader && skin.separator ? <View style={skin.separator(tokens)} /> : null}
            {label ? (
              <Text style={skin.menuLabel(tokens)}>
                {label}
              </Text>
            ) : null}
            {items.map((item, index) => {
              // Roving props for this row; Enter/Space activates the focused row
              // before delegating the arrows to the roving handler. `onKeyDown` is
              // web-only, so it rides through a cast (RN's Pressable types omit it).
              const roving = getItemProps(index);
              const selectItem = () => { onSelect?.(item, index); setOpen(false); };
              const onItemKeyDown = (e: { key: string; preventDefault: () => void }) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!item.disabled) selectItem();
                  return;
                }
                roving.onKeyDown(e);
              };
              const rovingProps = { focusable: roving.focusable, tabIndex: roving.tabIndex, onKeyDown: onItemKeyDown };
              // One ref feeding two readers: the roving hook (arrow moves) and the
              // row-node table the open-focus reads.
              const rowRef = (node: FocusableRow) => {
                roving.ref(node);
                rowNodes.current[index] = node;
              };
              return (
              <View key={`${item.label}-${index}`}>
                {item.separatorBefore && skin.separator ? (
                  <View style={skin.separator(tokens)} />
                ) : null}
                <MenuRow item={item} rowRef={rowRef} rovingProps={rovingProps} onSelect={selectItem} ripple={ripple} />
              </View>
              );
            })}
            </View>
            </RippleClip>
        </EscapeLayerProvider>
        </AnchoredOverlay>
      </View>
    );
  };
}
