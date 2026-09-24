import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useHover } from "../../style/hover.js";
import { useRef, useState } from "react";
import { View, Pressable, Text, AnchoredOverlay, useOverlayHost, useMeasuredWidth, useHugStyle, RippleClip, StyleSheet, cornerRadii, type ViewStyle, type LayoutStyle, withInnerFill } from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { useSeededMinTargetSlop, styleBox } from "../../style/touch-target-seed.js";
import { anchorLifted, type RowMenuItem, type RowMenuSkin } from "./row-menu.styles.js";

// Shared RowMenu shell. The structure (the self-start anchor, the ⋯ icon-button
// trigger, and the floating card of an optional section label plus the item
// rows), the public boolean-prop API, the controlled/uncontrolled open state, the
// select/close handlers, the overlay open-close behavior, the per-row destructive
// tint, the link/action role, and accessibility all live here once. A platform
// file supplies only its skin (the trigger and card shape/fill/shadow, whether
// separators are drawn, the row text scale, and the press feedback mode) and
// calls createRowMenu.
//
// Overlay note: the open menu renders through AnchoredOverlay. When an
// OverlayProvider is mounted (an app root, or a docs example stage) the card is
// portaled over the page, anchored below the ⋯ trigger, and a tap anywhere off it
// dismisses it — identically on iOS, Android, and web, with no Platform.OS branch
// and no position:fixed, so it escapes the stage's clip. With no provider it falls
// back to an inline card positioned absolutely below the trigger (the kit's
// pre-portal behavior). The `open` boolean keeps it shown across platforms.

export type { RowMenuItem };

export interface RowMenuProps {
  /** The menu rows, top to bottom. */
  items: RowMenuItem[];
  /** Controlled open state. Omit for uncontrolled (the trigger toggles it). */
  open?: boolean;
  /** Fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Render rows as navigation links rather than action buttons. */
  links?: boolean;
  /** Show a muted section label heading the menu. */
  sectionLabel?: string;
  /** Fired with the selected item and its index when a row is pressed. */
  onSelect?: (item: RowMenuItem, index: number) => void;
  /** Accessible name for the icon-only ⋯ trigger. Defaults to "More options". */
  triggerLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The inline-fallback anchor: with no OverlayProvider mounted the menu renders in
// place, absolutely positioned below the ⋯ trigger (the kit's pre-portal
// behavior). With a provider, AnchoredOverlay positions the card over the page and
// adds the outside-tap dismiss backdrop instead. The skin owns the card's
// shape/fill/shadow and its standoff; this owns the inline anchoring.
const menuAnchor = (gap: number): ViewStyle => ({ position: "absolute", top: "100%", start: 0, zIndex: 50, marginTop: gap });

/** Build a RowMenu component from a platform skin. */
export function createRowMenu(skin: RowMenuSkin) {
  interface MenuRowProps {
    item: RowMenuItem;
    links: boolean;
    onPress: () => void;
    ripple: { color: string; borderless: boolean } | undefined;
  }

  // One menu row, its own component so the web's hover wash has a hook per row. A
  // disabled row is inert and takes the skin's disabled look: the web's muted ink, or
  // the platform's dim.
  function MenuRow({ item, links, onPress, ripple }: MenuRowProps) {
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens, dark } = theme;
    const disabled = !!item.disabled;
    const muted = disabled && skin.disabledRow.muted;
    const { hovered, target } = useHover(skin.itemHover != null && !disabled);
    return (
      <Pressable
        {...target}
        disabled={item.disabled}
        style={({ pressed }) => [
          skin.itemRow,
          hovered && skin.itemHover ? skin.itemHover(tokens) : null,
          // Web/iOS tint the row on press here; Android uses the ripple instead. A
          // disabled row never enters the pressed state, so no tint applies.
          skin.ripple == null && pressed ? withInnerFill(theme, skin.itemPressed(tokens), "firm") : null,
          disabled && skin.disabledRow.opacity !== 1 ? { opacity: skin.disabledRow.opacity } : null,
        ]}
        onPress={onPress}
        // Suppress the Android ripple on a disabled row (no press feedback for an
        // inert control).
        android_ripple={item.disabled ? undefined : ripple}
        accessibilityRole={links ? "link" : "menuitem"}
        // Announce the disabled state. RNW forwards neither `disabled` nor
        // accessibilityState to the DOM, so pair the RN state with an aria alias.
        accessibilityState={item.disabled ? { disabled: true } : undefined}
        aria-disabled={item.disabled || undefined}
      >
        {item.icon ? (
          <Icon {...{ [item.icon]: true }} destructive={item.destructive && !muted} muted={muted} size={skin.iconSize} decorative />
        ) : null}
        <Text style={[skin.rowTextSize, muted ? { color: tokens["muted-foreground"] } : skin.rowTextColor(item, links, tokens, dark)]}>{item.label}</Text>
      </Pressable>
    );
  }

  return function RowMenu(props: RowMenuProps) {
    // The trailing menu trigger is a 32pt (iOS) or 40dp (Android) glyph square: the
    // right visual weight beside a row of content, and under both platforms' minimum. The
    // slop is seeded from that fixed size, so it is in place before the first layout
    // (src/style/touch-target-seed.ts).
    const target = useSeededMinTargetSlop(skin.minTarget, styleBox(StyleSheet.flatten(skin.trigger)));
    const { items, links = false, sectionLabel, onSelect, onOpenChange, triggerLabel = "More options", testID, style } = props;
    // What the menu is called when it opens. The section label names it when there is
    // one; otherwise the trigger's own label does, which is what the user pressed.
    const menuName = sectionLabel ?? triggerLabel;
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens } = theme;
    // A trigger-sized control: the content's own width (src/style/sizing.ts).
    const hug = useHugStyle();
    const { hovered: triggerHovered, target: triggerHoverTarget } = useHover(skin.triggerHover != null);
    // Uncontrolled by default: the ⋯ trigger toggles the menu (closed), a select
    // closes it; a controlled `open` prop overrides this.
    const [internalOpen, setInternalOpen] = useState(false);
    const open = props.open ?? internalOpen;
    const setOpen = (next: boolean) => {
      if (props.open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };

    // Escape dismisses the open menu via browser Escape or native accessibility escape.
    const escapeScope = useEscapeLayer(open, () => setOpen(false));

    // The anchor places the floating card at the trigger (it starts its children, so the
    // trigger sits at its leading edge even when a non-kit parent stretches it). The menu's
    // width floor is the TRIGGER's own measured width, not the anchor's, so a RowMenu in a
    // stretched table cell still opens at the skin's minimum rather than the cell's width.
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    return (
      // Hugs its trigger inside a kit container; relative anchors the inline fallback menu.
      <View
        ref={triggerRef}
        testID={testID}
        style={[skin.anchor, hug, open && !host ? anchorLifted : null, style]}
      >
        {/* RippleClip clips the Android bounded ripple to the ⋯ trigger's rounded
            outline (a no-op on iOS/web). It is the trigger's own box, so it is what is
            measured for the menu's width floor and what the pointer hovers. */}
        <RippleClip shape={cornerRadii(skin.trigger)} hitSlop={target.hitSlop} onLayout={onTriggerLayout} {...triggerHoverTarget}>
        <Pressable
          {...target}
          style={({ pressed }) => [
            skin.trigger,
            triggerHovered && skin.triggerHover ? skin.triggerHover(tokens) : null,
            // Android ripples; iOS dims via opacity; web tints the fill.
            skin.triggerPressedOpacity != null && pressed ? { opacity: skin.triggerPressedOpacity } : null,
            skin.ripple == null && skin.triggerPressedOpacity == null && pressed
              ? skin.triggerPressed(tokens)
              : null,
          ]}
          onPress={() => setOpen(!open)}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={triggerLabel}
          accessibilityState={{ expanded: open }}
          // RNW forwards neither accessibilityState nor aria-haspopup; alias both.
          aria-expanded={open}
          {...{ "aria-haspopup": "menu" }}
        >
          <Icon moreHorizontal size={skin.triggerIconSize} color={skin.triggerIconColor(tokens)} decorative />
        </Pressable>
        </RippleClip>

        <AnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={skin.menuGap}
          cardStyle={[skin.menuCard(tokens), { minWidth: Math.max(triggerWidth, skin.menuMinWidth) }]}
          inlineStyle={menuAnchor(skin.menuGap)}
          // A row menu is a card of action rows, so under glass it takes the DENSE
          // layer: the material under the model's densest tint. It opens over the
          // very table row it acts on, which read straight through the functional
          // layer's sheer tint.
          dense
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={props.open === undefined || onOpenChange !== undefined}
        >
          <EscapeLayerProvider scope={escapeScope}>
          {/* RippleClip clips the Android bounded-ripple rows to the menu card's
              rounded corners (a no-op on iOS/web; the card keeps no overflow). */}
          <RippleClip shape={cornerRadii(skin.menuCard(tokens))} style={{ alignSelf: "stretch" }}>
          {sectionLabel ? <Text style={skin.menuLabel(tokens)}>{sectionLabel}</Text> : null}
          {/* role="menu" gives the menuitem rows a valid ARIA parent. Without it each
              row is an orphaned menuitem, which axe files as aria-required-parent and a
              screen reader reads as a loose control rather than "menu, N items". The
              rows are links rather than menu items when `links` is set, and a list of
              links wants no menu role at all. Dropdown has carried this container since
              it shipped; this one did not, and nothing noticed until the accessibility
              sweep ran in a real browser. Named from the section label or the trigger,
              so a screen-reader user hears WHICH menu opened; RNW forwards neither
              alias on its own, hence both, per the kit's dual-a11y contract. */}
          <View
            {...(links
              ? null
              : { accessibilityRole: "menu" as const, role: "menu" as const, accessibilityLabel: menuName, "aria-label": menuName })}
            style={skin.rowGap ? { gap: skin.rowGap } : undefined}
          >
          {items.map((item, index) => (
            <View key={`${item.label}-${index}`}>
              {item.separatorBefore ? <View style={skin.separator(tokens)} /> : null}
              <MenuRow
                item={item}
                links={links}
                onPress={() => {
                  onSelect?.(item, index);
                  setOpen(false);
                }}
                ripple={ripple}
              />
            </View>
          ))}
          </View>
          </RippleClip>
        </EscapeLayerProvider>
        </AnchoredOverlay>
      </View>
    );
  };
}
