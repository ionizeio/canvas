import { EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useEffect, useRef, useState } from "react";
import { type GestureResponderEvent, type LayoutChangeEvent, type LayoutRectangle } from "react-native";
import { View, Pressable, Text, RippleClip, cornerRadii, useHugStyle, useSizing, useTheme, useControllableState, AnchoredOverlay, useOverlayHost, useMeasuredWidth, devWarn, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle, type MeasureProps, stepOf } from "../../style/index.js";
import { Icon, type IconName } from "../icon/icon.js";
import { primaryText } from "../../style/primary-text.js";
import * as s from "./button-group.styles.js";
import { GroupGlass, GlassSelection } from "./button-group-glass.js";

// Shared ButtonGroup shell. The structure (the four kinds, their layout, the
// uncontrolled stepper position, the split dropdown), the accessibility, the
// kind/size precedence, and the handlers live here once; a platform file supplies
// only its skin (the native container shape, selected-segment treatment, label
// color, dividers, press feedback) and calls createButtonGroup.
//
// A button group is a horizontal row of buttons that read as one control.
//
// Four kinds, picked by boolean prop (first match wins):
//   - `segmented` (default): attached segments sharing one control; one segment
//     reads selected via `active`. Use for mutually exclusive views (Day / Week /
//     Month). The native shape differs per OS: iOS draws a gray track with a
//     raised white pill on the selected segment; Android a stadium-outlined group
//     with a tonal selected fill; web the joined-buttons look with a solid fill.
//   - `split`: a primary action attached to a chevron trigger, divided by a
//     hairline; the chevron opens a dropdown of related actions (`menu`). Use
//     for one primary action with a few related variants.
//   - `stepper`: a prev / current / next control whose chevrons are built in;
//     `items` is the list it cycles through (wrapping at the ends) and the middle
//     label tracks the position. Use for stepping an ordered set (dates, pages).
//   - `spaced`: a plain row of detached buttons separated by a gap. Use for
//     a few peer actions that do not form a single control.
//
// Because there are no `first:` / `last:` style variants, the joined-corner and
// shared-border math is computed per segment in the skin rather than in markup.

export type Kind = "segmented" | "split" | "stepper" | "spaced";
export type Size = "small" | "default" | "large";

/** A segment: a bare label, or a label paired with a kit icon glyph rendered
 *  before it (or alone, under the group-level `iconsOnly`, where the label
 *  becomes the segment's accessible name). Strings stay fully supported. */
export type ButtonGroupItem = string | { label: string; icon?: IconName };

function itemLabelOf(item: ButtonGroupItem): string {
  return typeof item === "string" ? item : item.label;
}

function itemIconOf(item: ButtonGroupItem): IconName | undefined {
  return typeof item === "string" ? undefined : item.icon;
}

// Icon color axis (semantic boolean props), chosen by the skin per platform.
export type IconColor = "primary" | "primaryForeground" | "muted" | "foreground";

// Spread the chosen Icon color as its boolean prop (foreground is the default,
// so it needs none). Keeps the semantic prop API: no raw color strings.
function iconColorProps(c: IconColor) {
  switch (c) {
    case "primary": return { primary: true } as const;
    case "primaryForeground": return { primaryForeground: true } as const;
    case "muted": return { muted: true } as const;
    case "foreground": return {} as const;
  }
}

// The platform-varying surface. Everything color/shape-bearing the four kinds
// need lives here, built from the active tokens (so each follows light/dark/glass).
export interface ButtonGroupSkin {
  // --- segmented / spaced ---
  /** Optional gray track wrapping the segmented row (iOS); null = bare row. */
  segmentedWrap: (t: ColorTokens) => ViewStyle | null;
  /** Border width on each segment cell (0 on iOS/Android, 1 on web). */
  segmentBorderWidth: number;
  /** Corner radii for an attached segment given its position in the row. */
  joinCorners: (index: number, count: number) => ViewStyle;
  /** Corner radii for a detached (spaced) peer. */
  spacedCorners: ViewStyle;
  /** Shared-border overlap applied to every non-leading segment; null = none. */
  overlap: ViewStyle | null;
  /** Optional leading divider on every non-leading segment (Android stadium). */
  segmentDivider?: (t: ColorTokens) => ViewStyle;
  /** Selected vs. unselected segment fill/border. */
  segmentSurface: (t: ColorTokens, selected: boolean) => ViewStyle;
  /** Segment label color/weight for selected vs. unselected. */
  segmentLabel: (t: ColorTokens, selected: boolean) => TextStyle;
  /** Segment icon glyph color (the semantic Icon boolean axis) for selected vs.
   *  unselected, tracking each skin's segmentLabel treatment. */
  segmentIconColor: (selected: boolean) => IconColor;
  /** Show a leading check glyph on the selected segment (Android M3). */
  showSelectedCheck: boolean;

  // --- split ---
  splitPrimary: (t: ColorTokens) => ViewStyle;
  splitPrimaryLabel: (t: ColorTokens) => TextStyle;
  splitDivider: (t: ColorTokens, height: number) => ViewStyle;
  splitTrigger: (t: ColorTokens, height: number) => ViewStyle;
  splitChevronColor: IconColor;
  splitMenu: (t: ColorTokens) => ViewStyle;
  splitMenuItemPressed: (t: ColorTokens) => ViewStyle;
  splitMenuText: (t: ColorTokens) => TextStyle;

  // --- stepper ---
  stepperArrow: (t: ColorTokens, height: number) => ViewStyle;
  stepperArrowLeft: ViewStyle;
  stepperArrowRight: ViewStyle;
  stepperMiddle: (t: ColorTokens) => ViewStyle;
  stepperLabel: (t: ColorTokens) => TextStyle;
  stepperChevronColor: IconColor;

  // --- feedback ---
  /** iOS/web dim the cell on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over a pressed cell; null on iOS/web. */
  ripple?: (t: ColorTokens) => { color: string; borderless: boolean };
}

export interface ButtonGroupProps extends MeasureProps {
  /** Segments for segmented/spaced: a label string, or `{ label, icon }` for a
   *  leading kit glyph. The stepper cycles the labels (icons ignored there). */
  items?: ButtonGroupItem[];
  /** Selected segment index (segmented, CONTROLLED), or the stepper's initial index. Omit for uncontrolled use. */
  active?: number;
  /** Initial selected segment index for uncontrolled use (a bare segmented control selects on press). */
  defaultActive?: number;
  /** Called with the pressed/selected index and item (and, for the stepper, the new index). */
  onSelect?: (index: number, item: string, event: GestureResponderEvent) => void;

  // Kind (pick one; default is segmented).
  segmented?: boolean;
  split?: boolean;
  stepper?: boolean;
  spaced?: boolean;

  /** Related actions shown in the split kind's chevron dropdown. */
  menu?: string[];

  // Size (pick one; default is the medium size).
  small?: boolean;
  large?: boolean;

  /**
   * Segmented/spaced only: each segment renders its `icon` alone and the item's
   * `label` becomes the segment's ACCESSIBLE name (an icon-only view or
   * form-factor switcher). An item without an icon keeps its visible label,
   * with a dev-only warning. Split and stepper ignore it (dev-only warning).
   */
  iconsOnly?: boolean;

  /** Accessible name for the segmented row (the `tablist`), announcing what
   *  the group switches (e.g. "Preview form factor"). Segmented kind only:
   *  spaced peers are independent buttons with no group role. */
  accessibilityLabel?: string;

  /**
   * Stretch the group to the container width, the segments sharing the space
   * equally. An orthogonal layout modifier for the segmented and spaced kinds;
   * split and stepper ignore it (their cells are fixed-width chrome) with a
   * dev-only warning. A measure step (`sm`, `lg`, …) does the same up to that
   * width of the scale.
   */
  block?: boolean;

  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Kind precedence when more than one is passed: first match wins.
function kindOf(p: ButtonGroupProps): Kind {
  if (p.segmented) return "segmented";
  if (p.split) return "split";
  if (p.stepper) return "stepper";
  if (p.spaced) return "spaced";
  return "segmented";
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: ButtonGroupProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

const DEFAULT_ITEMS = ["Day", "Week", "Month"];
const DEFAULT_MENU = ["Save as draft", "Save and close", "Save a copy"];

/** Build a ButtonGroup component from a platform skin. */
export function createButtonGroup(skin: ButtonGroupSkin) {
  const ripple = skin.ripple;

  interface SegmentProps {
    label: string;
    /** Leading kit glyph, colored by the skin's segmentIconColor. */
    icon?: IconName;
    /** Render the glyph alone; `label` becomes the accessible name. */
    iconOnly?: boolean;
    selected: boolean;
    /**
     * Whether this segment can read selected. Segmented options are a single
     * mutually-exclusive control (role `tab`, with `aria-selected`); spaced peers
     * are detached buttons that never carry a selected state (role `button`, no
     * `aria-selected`, which ARIA does not support on `button`).
     */
    selectable: boolean;
    /** Corner radii for this segment given its position in the row. */
    corners: ViewStyle;
    /** This segment overlaps the previous border / draws a leading divider. */
    leading: boolean;
    /**
     * A detached (spaced) peer that is its OWN rounded surface, so its bounded Android
     * ripple needs a rounded `overflow:"hidden"` RippleClip parent to clip it. Attached
     * segments are left unwrapped: they are clipped by the segmentedWrap ancestor.
     */
    standalone?: boolean;
    /** Flex to an equal share of a `block` group's row. */
    block?: boolean;
    size: Size;
    disabled?: boolean;
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    onLayout?: (event: LayoutChangeEvent) => void;
  }

  function Segment({ label, icon, iconOnly, selected, selectable, corners, leading, standalone, block, size, disabled, onPress, onPressIn, onPressOut, onLayout }: SegmentProps) {
    const { tokens, surface } = useTheme();
    const glass = surface === "glass";
    const iconColor = glass ? (selected && selectable ? "primary" : "foreground") : skin.segmentIconColor(selected && selectable);
    const iconTint = iconColor === "primary" ? { color: primaryText(tokens) } : iconColorProps(iconColor);
    // The equal-share flex must ride the segment's OUTERMOST node: the Pressable
    // itself when solid and attached, but the RippleClip wrapper under glass or
    // when standalone (see the
    // return below), because a `flex: 1` on the Pressable INSIDE that column
    // wrapper would flex it vertically, not share the row.
    const container: StyleProp<ViewStyle> = [
      s.segmentBase,
      { borderWidth: glass ? 0 : skin.segmentBorderWidth },
      s.sizeContainer[size],
      glass ? s.glassCorners : corners,
      !glass && leading && skin.overlap ? skin.overlap : null,
      !glass && leading && skin.segmentDivider ? skin.segmentDivider(tokens) : null,
      glass ? s.glassCell : skin.segmentSurface(tokens, selected),
      disabled ? s.dim : null,
      block && !standalone && !glass ? s.blockSegment : null,
    ];
    // `aria-selected` is only valid on roles that support a selected state. A
    // segmented option reads as a `tab` (matching Tabs) so its selection is
    // conveyed; a detached spaced peer stays a plain `button` and emits no
    // selected state at all.
    const selectionA11y = selectable
      ? { accessibilityRole: "tab" as const, accessibilityState: { selected, disabled: !!disabled }, "aria-selected": selected }
      : { accessibilityRole: "button" as const, accessibilityState: { disabled: !!disabled } };
    const showIconAlone = iconOnly && icon != null;
    const button = (
      <Pressable
        style={({ pressed }) => [container, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLayout={standalone || glass ? undefined : onLayout}
        disabled={disabled}
        aria-disabled={!!disabled}
        android_ripple={ripple ? ripple(tokens) : undefined}
        // An icon-only segment has no text to read; the item label is its name
        // (both aliases, per the kit a11y contract: RNW drops one or the other
        // depending on the prop it receives).
        accessibilityLabel={showIconAlone ? label : undefined}
        aria-label={showIconAlone ? label : undefined}
        {...selectionA11y}
      >
        {glass && standalone ? <GroupGlass /> : null}
        {/* The M3 selected check yields to a segment glyph: an icon segmented
            control marks selection by the fill, not check + icon side by side. */}
        {skin.showSelectedCheck && selected && icon == null ? (
          <Icon check color={primaryText(tokens)} size={s.chevronSize[size]} style={{ marginEnd: 6 }} />
        ) : null}
        {icon != null ? (
          // decorative: the segment's name is the label (visible Text, or the
          // accessibilityLabel above when icon-only), so the glyph itself must
          // stay silent to assistive tech.
          <Icon {...{ [icon]: true }} decorative size={s.chevronSize[size]} {...iconTint} style={showIconAlone ? undefined : { marginEnd: 6 }} />
        ) : null}
        {showIconAlone ? null : <Text style={[s.sizeLabel[size], glass ? s.glassSegmentLabel(tokens, selected) : skin.segmentLabel(tokens, selected)]}>{label}</Text>}
      </Pressable>
    );
    // Glass segments and detached peers own rounded ripple clips. Solid attached
    // segments use the skin's existing group clip. Equal-share flex and layout
    // measurement belong on the outer wrapper, keeping the pill's measured frame
    // relative to the group rather than to its own clipping parent.
    return standalone || glass ? (
      <RippleClip shape={cornerRadii(container)} style={block ? s.blockSegment : null} onLayout={onLayout}>
        {button}
      </RippleClip>
    ) : button;
  }

  // The split kind's secondary control: a chevron that toggles a floating dropdown
  // of related actions, anchored below the primary button. The menu renders
  // through AnchoredOverlay, so when an OverlayProvider is mounted (an app root
  // or a docs example stage) it portals over the page and escapes the group's
  // clipping instead of being cut off; with no provider it falls back to the
  // inline absolute anchor (the kit's pre-portal behavior).
  function SplitButton({
    primary,
    menu,
    size,
    disabled,
    onSelect,
    testID,
    style,
  }: {
    primary: string;
    menu: string[];
    size: Size;
    disabled?: boolean;
    onSelect?: (index: number, item: string, event: GestureResponderEvent) => void;
    testID?: string;
    style?: LayoutStyle;
  }) {
    const { tokens, surface } = useTheme();
    const glass = surface === "glass";
    const hug = useHugStyle();
    const [open, setOpen] = useState(false);
    const escapeScope = useEscapeLayer(open, () => setOpen(false));
    const triggerHeight = s.sizeHeight[size];
    // Measure the split control so the dropdown can match its width and never
    // render narrower than the button it drops from.
    const { width: triggerWidth, onLayout: onTriggerLayout } = useMeasuredWidth();
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();
    // The skin's splitMenu merges the card visuals (fill/border/shadow/radius)
    // with the inline anchor (position/top/end/marginTop/zIndex). Split them so
    // AnchoredOverlay can style the portaled card via cardStyle and fall back to
    // the inline anchor only when no OverlayProvider is mounted.
    const { position, top, end, zIndex, marginTop, minWidth, ...menuCard } = skin.splitMenu(tokens);
    const menuAnchor: ViewStyle = { position, top, end, zIndex, marginTop };
    const menuMinWidth = typeof minWidth === "number" ? minWidth : 0;
    return (
      <View
        ref={triggerRef}
        style={[s.splitContainer, open && !host ? s.splitContainerLifted : null, disabled ? s.dim : null, hug, style]}
        testID={testID}
        onLayout={onTriggerLayout}
      >
        {glass ? <GroupGlass testID={testID ? `${testID}-glass` : undefined} /> : null}
        {/* Each half is its own rounded surface, so its bounded Android ripple is clipped
            to those corners by a RippleClip parent (no-op on iOS/web). See src/style/ripple-clip. */}
        <RippleClip shape={glass ? s.glassStartCorners : cornerRadii(skin.splitPrimary(tokens))}>
          <Pressable
            style={({ pressed }) => [skin.splitPrimary(tokens), s.sizeContainer[size], glass ? s.glassCell : null, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
            onPress={(e) => onSelect?.(0, primary, e)}
            disabled={disabled}
            android_ripple={ripple ? ripple(tokens) : undefined}
            accessibilityRole="button"
          >
            <Text style={[skin.splitPrimaryLabel(tokens), s.sizeLabel[size], glass ? s.glassSegmentLabel(tokens, true) : null]}>{primary}</Text>
          </Pressable>
        </RippleClip>
        {/* Hairline divider so the chevron reads as a distinct trigger. */}
        <View style={glass ? s.glassDivider(tokens, triggerHeight) : skin.splitDivider(tokens, triggerHeight)} />
        <RippleClip shape={glass ? s.glassEndCorners : cornerRadii(skin.splitTrigger(tokens, triggerHeight))}>
          <Pressable
            style={({ pressed }) => [skin.splitTrigger(tokens, triggerHeight), glass ? s.glassCell : null, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
            onPress={() => setOpen((o) => !o)}
            disabled={disabled}
            android_ripple={ripple ? ripple(tokens) : undefined}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            aria-expanded={open}
            accessibilityLabel="More actions"
          >
            <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
              <Icon chevronDown size={s.chevronSize[size]} {...(glass ? { color: primaryText(tokens) } : iconColorProps(skin.splitChevronColor))} />
            </View>
          </Pressable>
        </RippleClip>
        <AnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={4}
          cardStyle={[menuCard, { minWidth: Math.max(triggerWidth, menuMinWidth) }]}
          inlineStyle={menuAnchor}
          // The overflow menu is an option list (role="menu" over menuitem rows,
          // and all three skins paint it with the `popover` fill), so it stays an
          // OPAQUE card in glass mode too, exactly like Dropdown, Select,
          // Autocomplete and RowMenu: under a material the page's own rows and
          // rules read straight between the items.
          opaque
        >
          <EscapeLayerProvider scope={escapeScope}>
          {/* role="menu" gives the menuitem rows a valid ARIA parent; without it
              each menuitem is orphaned and web SRs/validators flag it. */}
          <View accessibilityRole="menu" role="menu" aria-label="More actions">
            {menu.map((item, i) => (
              <Pressable
                key={`${item}-${i}`}
                style={({ pressed }) => [s.splitMenuItem, pressed ? skin.splitMenuItemPressed(tokens) : null]}
                onPress={(e) => {
                  onSelect?.(i + 1, item, e);
                  setOpen(false);
                }}
                accessibilityRole="menuitem"
              >
                <Text style={skin.splitMenuText(tokens)}>{item}</Text>
              </Pressable>
            ))}
          </View>
          </EscapeLayerProvider>
        </AnchoredOverlay>
      </View>
    );
  }

  // Stepper: a prev / current / next control. The chevrons are built in here; the
  // `items` array is what it cycles through. Uncontrolled, it tracks its own
  // position from the initial index, wraps at the ends, and reports each change
  // through onSelect. The middle cell is a passive label showing the current item.
  function Stepper({
    items,
    initial,
    size,
    disabled,
    onSelect,
    testID,
    style,
  }: {
    items: string[];
    initial: number;
    size: Size;
    disabled?: boolean;
    onSelect?: (index: number, item: string, event: GestureResponderEvent) => void;
    testID?: string;
    style?: LayoutStyle;
  }) {
    const { tokens, surface } = useTheme();
    const glass = surface === "glass";
    const hug = useHugStyle();
    const count = items.length;
    const clamp = (n: number) => (count > 0 ? Math.min(Math.max(0, n), count - 1) : 0);
    const [index, setIndex] = useState(() => clamp(initial));
    const i = clamp(index);
    const chevron = s.chevronSize[size];
    const height = s.sizeHeight[size];
    // The right arrow's shared-border overlap (marginStart) is OUTER positioning that must
    // ride the RippleClip wrapper, not the Pressable: a negative margin inside the wrapper's
    // overflow:"hidden" would clip 1px off the arrow and lose the overlap. Split it from the
    // corner radii, which stay on the Pressable (and drive the clip shape).
    const { marginStart: rightOverlap, ...stepperArrowRightCorners } = skin.stepperArrowRight;
    const step = (dir: number, e: GestureResponderEvent) => {
      if (count === 0) return;
      const next = (i + dir + count) % count;
      setIndex(next);
      onSelect?.(next, items[next], e);
    };
    return (
      <View style={[s.stepperContainer, disabled ? s.dim : null, hug, style]} testID={testID}>
        {glass ? <GroupGlass testID={testID ? `${testID}-glass` : undefined} /> : null}
        {/* Each pill-cornered arrow is its own rounded surface, so its bounded Android ripple
            is clipped to those corners by a RippleClip parent (no-op on iOS/web). See src/style/ripple-clip. */}
        <RippleClip shape={glass ? s.glassStartCorners : cornerRadii([skin.stepperArrow(tokens, height), skin.stepperArrowLeft])}>
          <Pressable
            style={({ pressed }) => [skin.stepperArrow(tokens, height), skin.stepperArrowLeft, glass ? s.glassCell : null, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
            onPress={(e) => step(-1, e)}
            disabled={disabled}
            android_ripple={ripple ? ripple(tokens) : undefined}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <Icon chevronLeft size={chevron} {...iconColorProps(skin.stepperChevronColor)} />
          </Pressable>
        </RippleClip>
        <View style={[skin.stepperMiddle(tokens), s.sizeContainer[size], glass ? s.glassCell : null]}>
          <Text style={[skin.stepperLabel(tokens), s.sizeLabel[size]]}>{items[i] ?? ""}</Text>
        </View>
        <RippleClip
          shape={glass ? s.glassEndCorners : cornerRadii([skin.stepperArrow(tokens, height), stepperArrowRightCorners])}
          style={{ marginStart: glass ? 0 : rightOverlap }}
        >
          <Pressable
            style={({ pressed }) => [skin.stepperArrow(tokens, height), stepperArrowRightCorners, glass ? s.glassCell : null, skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null]}
            onPress={(e) => step(1, e)}
            disabled={disabled}
            android_ripple={ripple ? ripple(tokens) : undefined}
            accessibilityRole="button"
            accessibilityLabel="Next"
          >
            <Icon chevronRight size={chevron} {...iconColorProps(skin.stepperChevronColor)} />
          </Pressable>
        </RippleClip>
      </View>
    );
  }

  return function ButtonGroup(props: ButtonGroupProps) {
    const { items = DEFAULT_ITEMS, onSelect, disabled, testID, style } = props;
    const { tokens, surface } = useTheme();
    const glass = surface === "glass";
    const [segmentLayouts, setSegmentLayouts] = useState<Record<number, LayoutRectangle>>({});
    const [pressedSegment, setPressedSegment] = useState<number | null>(null);
    const kind = kindOf(props);
    useEffect(() => {
      if (!glass || disabled || kind !== "segmented") setPressedSegment(null);
    }, [glass, disabled, kind]);
    const size = sizeOf(props);
    // HUG, or FILL under `block` or a measure step (the segmented/spaced kinds
    // only; see below). Under either the segments flex to equal shares of the row.
    const sizing = useSizing(props);
    const fills = !!props.block || stepOf(props) !== null;
    // `block` and the measure steps are segmented/spaced layout modifiers. The
    // split and stepper kinds are fixed-width chrome (a chevron trigger, prev/next
    // arrow cells) whose cells cannot meaningfully share a stretched row, so they
    // ignore both, with a dev-only warning surfacing the call-site mistake.
    devWarn(
      fills && (kind === "split" || kind === "stepper"),
      `[canvas] <ButtonGroup />: \`block\` and the measure steps apply to the segmented and spaced kinds; the ${kind} kind is fixed-width chrome and ignores them.`,
    );
    devWarn(
      !!props.iconsOnly && (kind === "split" || kind === "stepper"),
      `[canvas] <ButtonGroup />: \`iconsOnly\` applies to the segmented and spaced kinds; the ${kind} kind renders labels and ignores it.`,
    );
    devWarn(
      !!props.iconsOnly && (kind === "segmented" || kind === "spaced") && items.some((it) => itemIconOf(it) == null),
      "[canvas] <ButtonGroup iconsOnly />: an item without an `icon` keeps its visible label; give every item an icon (the label stays as its accessible name).",
    );
    // Controlled when `active` is provided, self-managed otherwise, so a bare
    // segmented control (or one seeded with `defaultActive`) selects on press
    // instead of sitting inert. Matches the Tabs / Switch controllable contract.
    const [active, setActive] = useControllableState<number>(props.active, props.defaultActive ?? 0);

    // Spaced: detached peers separated by a gap, each with full rounding.
    if (kind === "spaced") {
      return (
        <View style={[s.spacedContainer, sizing, style]} testID={testID}>
          {items.map((item, i) => (
            <Segment
              key={`${itemLabelOf(item)}-${i}`}
              label={itemLabelOf(item)}
              icon={itemIconOf(item)}
              iconOnly={props.iconsOnly}
              selected={false}
              selectable={false}
              corners={skin.spacedCorners}
              leading={false}
              standalone
              block={fills}
              size={size}
              disabled={disabled}
              onPress={(e) => onSelect?.(i, itemLabelOf(item), e)}
            />
          ))}
        </View>
      );
    }

    // Split: a primary action attached to a chevron that opens a dropdown of
    // related actions.
    if (kind === "split") {
      const labels = (items.length > 0 ? items : DEFAULT_ITEMS).map(itemLabelOf);
      const primary = labels[0] ?? "Save";
      return (
        <SplitButton
          primary={primary}
          menu={props.menu && props.menu.length > 0 ? props.menu : DEFAULT_MENU}
          size={size}
          disabled={disabled}
          onSelect={onSelect}
          testID={testID}
          style={style}
        />
      );
    }

    // Stepper: a prev / current / next control that cycles through items; the
    // component owns the chevrons and the position.
    if (kind === "stepper") {
      const list = (items.length > 0 ? items : DEFAULT_ITEMS).map(itemLabelOf);
      return (
        <Stepper
          items={list}
          initial={active}
          size={size}
          disabled={disabled}
          onSelect={onSelect}
          testID={testID}
          style={style}
        />
      );
    }

    // Segmented (default): attached segments, one selected. iOS wraps the row in
    // a gray track; Android/web render the row bare (the stadium/joined borders
    // are drawn by the segments themselves).
    const count = items.length;
    const wrap = skin.segmentedWrap(tokens);
    const row = items.map((item, i) => (
      <Segment
        key={`${itemLabelOf(item)}-${i}`}
        label={itemLabelOf(item)}
        icon={itemIconOf(item)}
        iconOnly={props.iconsOnly}
        selected={i === active}
        selectable
        corners={skin.joinCorners(i, count)}
        leading={i > 0}
        block={fills}
        size={size}
        disabled={disabled}
        onPress={(e) => {
          setActive(i);
          onSelect?.(i, itemLabelOf(item), e);
        }}
        onPressIn={glass ? () => setPressedSegment(i) : undefined}
        onPressOut={glass ? () => setPressedSegment((current) => current === i ? null : current) : undefined}
        onLayout={glass ? (e) => {
          const layout = e.nativeEvent.layout;
          setSegmentLayouts((previous) => {
            const old = previous[i];
            if (old && old.x === layout.x && old.y === layout.y && old.width === layout.width && old.height === layout.height) return previous;
            return { ...previous, [i]: layout };
          });
        } : undefined}
      />
    ));
    // The segments are a single mutually-exclusive control, so the row is a
    // `tablist` grouping its `tab` segments (matching the Tabs precedent). The
    // sizing nature (HUG, or FILL under `block`) lands AFTER the skin wrap.
    if (glass) {
      const selectionLayout = segmentLayouts[disabled ? active : pressedSegment ?? active];
      return (
        <View accessibilityRole="tablist" accessibilityLabel={props.accessibilityLabel} aria-label={props.accessibilityLabel} style={[s.glassSegmentedContainer, sizing, style]} testID={testID}>
          <GroupGlass testID={testID ? `${testID}-glass` : undefined} />
          {active >= 0 && active < count && selectionLayout ? (
            <GlassSelection layout={selectionLayout} pressed={pressedSegment !== null} disabled={disabled} testID={testID ? `${testID}-selection` : undefined} />
          ) : null}
          {row}
        </View>
      );
    }
    if (wrap) {
      return <View accessibilityRole="tablist" accessibilityLabel={props.accessibilityLabel} aria-label={props.accessibilityLabel} style={[wrap, sizing, style]} testID={testID}>{row}</View>;
    }
    return <View accessibilityRole="tablist" accessibilityLabel={props.accessibilityLabel} aria-label={props.accessibilityLabel} style={[s.segmentedContainer, sizing, style]} testID={testID}>{row}</View>;
  };
}
