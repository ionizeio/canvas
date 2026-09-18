import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useRef, useState } from "react";
import { View, Pressable, Text, useOverlayHost, useMeasuredWidth, RippleClip, cornerRadii, useMinTargetSlop, type StyleProp, type ViewStyle, type LayoutStyle, withInnerFill } from "../../style/index.js";
// The kit-owned popup policy for the dense menu: under glass the material grows out of
// the anchor edge, recoils and settles, and stays visible briefly on close while
// the rows are already inert. Solid mode and Reduce Motion keep the ordinary
// entrance. Internal, never a public prop.
import { LiquidAnchoredOverlay } from "../../style/liquid-anchored-overlay.js";
import { Icon } from "../../atoms/icon/icon.js";
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
// shape/fill/shadow; this owns the inline anchoring.
const MENU_ANCHOR: ViewStyle = { position: "absolute", top: "100%", start: 0, zIndex: 50, marginTop: 4 };

/** Build a RowMenu component from a platform skin. */
export function createRowMenu(skin: RowMenuSkin) {
  return function RowMenu(props: RowMenuProps) {
    // The trailing menu trigger is a 32pt (iOS) or 40dp (Android) glyph square: the
    // right visual weight beside a row of content, and under both platforms' minimum.
    const target = useMinTargetSlop(skin.minTarget);
    const { items, links = false, sectionLabel, onSelect, onOpenChange, triggerLabel = "More options", testID, style } = props;
    // What the menu is called when it opens. The section label names it when there is
    // one; otherwise the trigger's own label does, which is what the user pressed.
    const menuName = sectionLabel ?? triggerLabel;
    const theme = useMaterialTheme({ layer: "dense" });
    const { tokens, dark } = theme;
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

    // The wrapper tightly wraps the ⋯ trigger (the menu portals out when hosted),
    // so measuring it gives the trigger's box for anchoring the floating card. The
    // measured width is a floor for the menu; a wide trigger never yields a
    // narrower menu than the skin's own minimum.
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    return (
      // self-start keeps the trigger from stretching; relative anchors the inline
      // fallback menu.
      <View
        ref={triggerRef}
        testID={testID}
        style={[skin.anchor, open && !host ? anchorLifted : null, style]}
        onLayout={onTriggerLayout}
      >
        {/* RippleClip clips the Android bounded ripple to the ⋯ trigger's rounded
            outline (a no-op on iOS/web). */}
        <RippleClip shape={cornerRadii(skin.trigger)}>
        <Pressable
          {...target}
          style={({ pressed }) => [
            skin.trigger,
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
          <Icon moreHorizontal size={skin.triggerIconSize} decorative />
        </Pressable>
        </RippleClip>

        <LiquidAnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={4}
          cardStyle={[skin.menuCard(tokens), { minWidth: Math.max(triggerWidth, skin.menuMinWidth) }]}
          inlineStyle={MENU_ANCHOR}
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
          >
          {items.map((item, index) => (
            <View key={`${item.label}-${index}`}>
              {item.separatorBefore ? <View style={skin.separator(tokens)} /> : null}
              <Pressable
                disabled={item.disabled}
                style={({ pressed }) => [
                  skin.itemRow,
                  // Web/iOS tint the row on press here; Android uses the ripple instead. A
                  // disabled row never enters the pressed state, so no tint applies.
                  skin.ripple == null && pressed ? withInnerFill(theme, skin.itemPressed(tokens), "firm") : null,
                  // A disabled row dims to read as unavailable (the kit's disabled-opacity
                  // convention, matching Slider/Button); the icon and label dim with it.
                  item.disabled ? { opacity: 0.5 } : null,
                ]}
                onPress={() => {
                  onSelect?.(item, index);
                  setOpen(false);
                }}
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
                  <Icon {...{ [item.icon]: true }} destructive={item.destructive} size={skin.iconSize} decorative />
                ) : null}
                <Text style={[skin.rowTextSize, skin.rowTextColor(item, links, tokens, dark)]}>{item.label}</Text>
              </Pressable>
            </View>
          ))}
          </View>
          </RippleClip>
        </EscapeLayerProvider>
        </LiquidAnchoredOverlay>
      </View>
    );
  };
}
