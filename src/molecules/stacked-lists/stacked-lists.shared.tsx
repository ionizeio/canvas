import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { Fragment, useId, type ComponentType, type ReactNode } from "react";
import { FlatList, StyleSheet, type GestureResponderEvent, type ViewProps } from "react-native";
import { View, Pressable, Text, RippleClip, cornerRadii, devWarn, FOCUS_RESET, type StyleProp, type ViewStyle, type LayoutStyle, GlassSurface, withInnerFill } from "../../style/index.js";
import { useScrollFocus } from "../../style/use-scroll-focus.js";
import { useFocusFrame } from "../../style/focus-frame.js";
import { LIST_ITEM, LIST_WRAPPER, WindowedListCell, listProps, windowedListItem } from "../../style/list-semantics.js";
import { Avatar as WebAvatar } from "../../atoms/avatar/avatar.js";
import { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { Icon } from "../../atoms/icon/icon.js";
import { type AvatarProps } from "../../atoms/avatar/avatar.shared.js";
import { type BadgeProps } from "../../atoms/badge/badge.shared.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import {
  DragDropProvider as WebDragDropProvider,
  DropZone as WebDropZone,
  Draggable as WebDraggable,
  DragHandle as WebDragHandle,
} from "../../organisms/drag-drop/drag-drop.js";
import {
  type DropEvent,
  type DragDropProviderProps,
  type DropZoneProps,
  type DraggableProps,
  type DragHandleProps,
} from "../../organisms/drag-drop/drag-drop.shared.js";
import { listMoveFor, type StackedListMove } from "./stacked-lists.reorder.js";
import * as s from "./stacked-lists.styles.js";
import { type StackedListSkin } from "./stacked-lists.styles.js";

// Shared StackedList shell. The structure (an outer frame, an optional titled
// header, and a column of rows: leading avatar + primary/secondary text column +
// trailing meta/badge/action + optional overflow menu + clickable chevron), the
// boolean-prop axes, the item/data shapes, and the platform-neutral logic
// (variant precedence, initials derivation, divider/frame resolution) live here
// once; a platform file supplies only its skin (frame shape/shadow, row density,
// type tracking, divider inset, press feedback) and calls createStackedList.
//
// A stacked list is a vertical list of rows separated by hairlines, each row a
// leading avatar, a primary + secondary text column, and trailing meta/badge/
// action. It is the building block for contact lists, activity feeds, and data
// previews.
//
// StackedList is a "Light" platform treatment: ONE structure and one set of
// (semantic) colors, with per-OS touches limited to corner radius, density /
// spacing, type tracking, shadow/elevation, divider inset, and press feedback
// (Android android_ripple on this component's own pressable rows; iOS/web
// pressedOpacity). Web keeps the current Canvas look exactly; iOS uses SF/HIG
// inset-list conventions; Android uses Material 3 list / card conventions.
//
// The framed list uses static content frost in glass mode. Its rows inherit
// that shared pane, and the skin retains the complete opaque solid treatment.
// Plain list anatomy does not gain an independent material.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf).
//
// - Variant axis (pick one; default is the plain two-line list): `clickable`
//   makes each row a pressable drilldown with a hover/press surface and a
//   trailing chevron; `card` wraps the list in a titled card surface with an
//   optional header. `clickable` wins over `card` when both are passed.
// - Divider (orthogonal boolean, on by default): draws a hairline between rows.
//   Pass `flush` to drop the dividers. The card variant always keeps its rows
//   ruled regardless of `flush`, matching the documented card surface group.

// The row divider is inert to touch. `pointerEvents` must come from
// StyleSheet.create, not the deprecated `pointerEvents` PROP and not an inline
// style object: react-native-web silently drops the declaration from an inline
// literal.
const dividerStyles = StyleSheet.create({ passthrough: { pointerEvents: "none" } });

/** One row in the list. */
export interface StackedListItem {
  /** Stable identity for the row's React key, so reorder/insert/delete keeps a
   *  row mapped to the same item (preserving in-progress press/hover/focus state
   *  and avoiding needless avatar remounts). The array index is the fallback,
   *  which is only safe for static, never-reordered lists. */
  id?: string | number;
  /** Primary line, bold (e.g. a person's name). */
  name: string;
  /** Secondary line, smaller and muted (e.g. an email or role). */
  detail: string;
  /** Trailing metadata text (e.g. "2h ago"). Ignored when `badge` is set. */
  meta?: string;
  /** Trailing badge label; rendered as a <Badge> instead of plain meta text. */
  badge?: string;
  /** Status tone for the trailing `badge`, drawn as the kit's status pill.
   *
   *  These are the item's only tonal surface, so they are named for the meaning
   *  rather than prefixed: a row reads `{ name: "Kratos", badge: "Healthy",
   *  success: true }`. Mutually exclusive; first match wins in the order listed
   *  here. Without one the badge keeps its neutral `secondary` look, which is
   *  what every existing call site gets. Ignored when `badge` is unset. */
  success?: boolean;
  error?: boolean;
  warning?: boolean;
  info?: boolean;
  neutral?: boolean;
  /** Photo URL for the avatar; falls back to initials when absent. */
  avatar?: string;
  /** Initials shown when there is no photo; derived from `name` when omitted. */
  initials?: string;
  /**
   * Right-aligned slot rendered before the badge/meta cluster, for an inline
   * per-row editor or affordance (a Chip, a small Select, an action button).
   * Interactive content is fine in every variant: a `clickable` row carrying
   * this slot moves its press target to the content region (avatar + text), so
   * a control here never nests inside the row pressable.
   */
  trailing?: ReactNode;
}

export interface StackedListProps {
  /** Rows to render. */
  items?: StackedListItem[];
  /** Optional header title; shown above the rows, separated by a rule. It also names
   *  the list for assistive tech ("Team, list, 12 items"). */
  title?: ReactNode;
  /**
   * The list's accessible name when it has no `title` (a `title` names the list, and
   * wins when both are set). A screen reader announces it with the list. A `title` that
   * is not a string names the list on the web only, and `label` then names it on iOS
   * and Android. A `virtualized` list needs a name: on the web its scroller is a
   * keyboard stop while the rows overflow, and Chromium names an unnamed stop from the
   * text of every row it has rendered.
   */
  label?: string;
  /** Trailing header content (e.g. an action button); only shown with a title.
   *  Takes precedence over `addAction` when both are supplied. */
  action?: ReactNode;
  /** Convenience header action: renders a small outlined button with a leading
   *  plus icon and this label (e.g. "Add"). Only shown with a title and when
   *  `action` is not set. Serializable, so the playground can drive it. */
  addAction?: string;
  /** Appends a trailing ghost overflow ("...") action-menu button to every row.
   *  Press is reported through `onPressItemMenu`. */
  rowMenu?: boolean;
  /** Press handler for a row, by index. Only used in the `clickable` variant. */
  onPressItem?: (index: number, event: GestureResponderEvent) => void;
  /** Press handler for a row's overflow menu, by index. Used with `rowMenu`. */
  onPressItemMenu?: (index: number, event: GestureResponderEvent) => void;
  // Variant (pick one; default is the plain two-line list).
  clickable?: boolean;
  card?: boolean;
  // Divider modifier: rows are ruled by default; `flush` removes the hairlines.
  flush?: boolean;
  /**
   * Render the rows through a windowed `FlatList` instead of mounting every row up
   * front, for large lists. Give the list a bounded height (via `style`, e.g.
   * `{ maxHeight: 400 }`) so it can scroll; without one it warns and renders eagerly
   * anyway. Default (omitted) mounts all rows, unchanged. Ignored (with a dev
   * warning) when `reorderable` is set: windowing unmounts off-screen rows, which
   * would leave them undraggable and unmeasurable mid-drag. On the web, while the
   * rows overflow, the windowed list is a keyboard tab stop the keyboard can scroll,
   * and the list's frame draws the focus ring while it has keyboard focus.
   */
  virtualized?: boolean;
  /**
   * Make the rows reorderable: each row gains a leading drag grip (keyboard- and
   * screen-reader-operable: Space grabs, the arrow keys move, Space drops, Escape
   * cancels) and the list becomes one drop zone. The order stays CONTROLLED by the
   * consumer's `items` array: a drop only reports the move through `onReorder`,
   * never reorders internally.
   */
  reorderable?: boolean;
  /** Fired on drop with the computed move (row id, from/to index, new neighbors). */
  onReorder?: (move: StackedListMove) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

type Variant = "two-line" | "clickable" | "card";

// Variant precedence when more than one is passed: first match wins.
function variantOf(p: StackedListProps): Variant {
  if (p.clickable) return "clickable";
  if (p.card) return "card";
  return "two-line";
}

// The composed-atom component types, so each platform can pass its own resolved
// atoms (web base by default) without widening to `any`.
export type AvatarComponent = ComponentType<AvatarProps>;
export type BadgeComponent = ComponentType<BadgeProps>;
export type ButtonComponent = ComponentType<ButtonProps>;

// The DnD family the `reorderable` rows compose, so each platform passes its own
// skinned builds (web base by default), mirroring the atom params above.
export interface StackedListDnd {
  DragDropProvider: ComponentType<DragDropProviderProps>;
  DropZone: ComponentType<DropZoneProps>;
  Draggable: ComponentType<DraggableProps<{ index: number }>>;
  DragHandle: ComponentType<DragHandleProps>;
}

const WEB_DND: StackedListDnd = {
  DragDropProvider: WebDragDropProvider,
  DropZone: WebDropZone,
  Draggable: WebDraggable,
  DragHandle: WebDragHandle,
};

export type { StackedListMove };

// createStackedList threads the platform skin AND the platform-styled composed
// atoms. The atom params default to the web base atoms so the web entry (and any
// barrel import) composes web-styled rows; the .ios/.android entry files pass the
// literal per-OS atoms so the WEB docs 3-up renders each row's avatar/badge/Add
// button in its own platform skin (a barrel import would resolve the web atoms in
// the browser bundle). The signature change is internal; the public component
// export is unchanged, so it stays backward-compatible.
export function createStackedList(
  skin: StackedListSkin,
  Avatar: AvatarComponent = WebAvatar,
  Badge: BadgeComponent = WebBadge,
  Button: ButtonComponent = WebButton,
  dnd: StackedListDnd = WEB_DND,
) {
  const { DragDropProvider, DropZone, Draggable, DragHandle } = dnd;
  return function StackedList(props: StackedListProps) {
    const { items = [], title, label, action, addAction, rowMenu, onPressItem, onPressItemMenu, flush, virtualized, reorderable, onReorder, testID, style } = props;
    const variant = variantOf(props);
    const theme = useMaterialTheme({ static: true });
    const { tokens } = theme;
    // A windowed list scrolls its rows on its own, so it is a keyboard stop while they
    // overflow, whatever the rows hold (DataTable's windowed body is the precedent).
    // Left alone, Chromium and Firefox made a read-only list's scroller a stop anyway
    // (a scroller with nothing focusable inside) and drew their own ring on it, while
    // WebKit left it out of the tab order. The list's root draws the ring for it
    // (src/style/focus-frame.tsx): the card clips one drawn around the scroller, and
    // the rows would paint over one drawn inside it.
    const bodyFocus = useScrollFocus("vertical");
    const bodyFrame = useFocusFrame();
    // A header title that is not a string names the list by reference (aria-labelledby);
    // useId gives one base per instance.
    const titleId = `${useId()}-title`;

    // The Android ripple over the component's own pressable rows / overflow menu;
    // null on iOS/web where pressed opacity carries the feedback instead.
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;
    const pressFeedback = (pressed: boolean) =>
      skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null;

    // The header action: an explicit ReactNode wins; otherwise a small outlined
    // button with a leading plus icon when `addAction` supplies a label.
    const headerAction =
      action != null ? (
        action
      ) : addAction != null ? (
        <Button outline small>
          <View style={s.addActionRow}>
            <Icon plus size={13} />
            <Text style={s.addActionLabel(tokens)}>{addAction}</Text>
          </View>
        </Button>
      ) : null;

    // The card variant always rules its rows; the others rule unless `flush`.
    const ruled = variant === "card" ? true : !flush;
    const framed = variant === "card" || title != null;

    const lastIndex = items.length - 1;

    const renderColumn = (item: StackedListItem) => (
      <View style={s.column}>
        <Text style={skin.nameLabel(tokens)} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={skin.mutedLabel(tokens)} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
    );

    // A toned row renders the status pill, so a health list can say healthy /
    // degraded / down in colour rather than three identical grey badges. Untoned
    // rows keep the original `secondary` badge, so every existing call site is
    // unchanged.
    const badgeToneOf = (item: StackedListItem): Partial<BadgeProps> => {
      if (item.success) return { status: true, success: true };
      if (item.error) return { status: true, error: true };
      if (item.warning) return { status: true, warning: true };
      if (item.info) return { status: true, info: true };
      if (item.neutral) return { status: true, neutral: true };
      return { secondary: true };
    };

    const renderTrailing = (item: StackedListItem) => {
      if (item.badge != null) return <Badge {...badgeToneOf(item)}>{item.badge}</Badge>;
      if (item.meta != null) return <Text style={skin.metaLabel(tokens)}>{item.meta}</Text>;
      return null;
    };

    // A ghost overflow ("...") action-menu button drawn as three horizontal dots;
    // the Icon set has no more-horizontal glyph, so the dots are primitives. The
    // hitSlop (native skins only) grows the effective target to the platform
    // minimum (44pt iOS / 48dp Android) while the visual box stays 28.
    const renderMenu = (index: number) => (
      // The bounded ripple is clipped to the round menu button by this RippleClip
      // parent (a node can never clip its own ripple on Android); fixed-size icon
      // button, so no outer layout moves to the wrapper.
      <RippleClip shape={cornerRadii(skin.menuButton)} hitSlop={skin.menuHitSlop}>
        <Pressable
          style={({ pressed }) => [skin.menuButton, pressed ? withInnerFill(theme, skin.pressedSurface(tokens), "firm") : null, pressFeedback(pressed)]}
          hitSlop={skin.menuHitSlop}
          android_ripple={ripple}
          onPress={(event) => onPressItemMenu?.(index, event)}
          accessibilityRole="button"
          accessibilityLabel="Actions"
        >
          <View style={s.menuDot(tokens)} />
          <View style={s.menuDot(tokens)} />
          <View style={s.menuDot(tokens)} />
        </Pressable>
      </RippleClip>
    );

    // The decorative drilldown chevron: an SF-semibold text glyph on iOS/web, a
    // 24dp Icon on Android (the M3 trailing affordance). Either way it is hidden
    // from assistive tech (the row's `button` role already conveys actionability;
    // the Icon glyph is `decorative`, the text glyph carries the aria-hidden
    // aliases; importantForAccessibility is not forwarded on web).
    const renderChevron = () =>
      skin.chevronIcon != null ? (
        <Icon chevronRight muted decorative size={skin.chevronIcon} />
      ) : (
        <Text
          style={skin.chevronGlyph!(tokens)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          {"›"}
        </Text>
      );

    const renderAvatar = (item: StackedListItem) => (
      // `name` flows the human name to Avatar for the accessible label/alt text;
      // an explicit `item.initials` wins verbatim through Avatar's dedicated
      // `initials` prop, otherwise Avatar reduces the name to its initials.
      <Avatar src={item.avatar} name={item.name} initials={item.initials} />
    );

    // The content-region press target used when a clickable row must host OTHER
    // interactive controls beside it (a drag grip, a `trailing` editor): it fills
    // the row between the grip and the trailing cluster with the row's own gap.
    const rowFill: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      gap: skin.rowBase.gap,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "0%",
    };

    // One row, keyless so it can be used both by the eager `.map` (which supplies
    // the key) and by FlatList's renderItem (which keys via keyExtractor). `listItem`
    // is the row's place in the list (src/style/list-semantics.tsx), or null when the
    // caller wraps the row in its item itself (a reorderable row's Draggable).
    const renderRow = (item: StackedListItem, index: number, listItem: ViewProps | null) => {
      // The divider is an absolute bottom hairline CHILD, never a border+margin
      // merged into the row's own style: the iOS skin insets the rule past the
      // avatar (marginStart-style), and on the row itself that margin would
      // shift the entire row's content, not just the separator.
      const divider = ruled && index < lastIndex ? <View style={[skin.rowDivider(tokens), dividerStyles.passthrough]} /> : null;
      const grip = reorderable ? <DragHandle label={`Reorder ${item.name}`} /> : null;
      const trailingSlot = item.trailing != null ? <View style={s.trailingSlot}>{item.trailing}</View> : null;
      if (variant === "clickable") {
        // A clickable row that also hosts a grip or a `trailing` control cannot stay
        // one whole-row pressable: react-native-web renders button-roled Pressables
        // as real <button> elements, and a button inside a button is invalid DOM and
        // an ambiguous, doubly-focusable control. Those rows move the press target
        // to the content region (avatar + text) and render the grip, trailing slot,
        // badge/meta, menu, and chevron as SIBLINGS. A plain clickable row (no new
        // props) keeps the original whole-row pressable, byte-identical.
        if (reorderable || trailingSlot != null) {
          return (
            <View {...listItem} style={skin.rowBase}>
              {grip}
              <Pressable
                style={({ pressed }) => [rowFill, pressed ? withInnerFill(theme, skin.pressedSurface(tokens), "firm") : null, pressFeedback(pressed)]}
                android_ripple={ripple}
                onPress={(event) => onPressItem?.(index, event)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                {renderAvatar(item)}
                {renderColumn(item)}
              </Pressable>
              {trailingSlot}
              {renderTrailing(item)}
              {rowMenu ? renderMenu(index) : null}
              {renderChevron()}
              {divider}
            </View>
          );
        }
        // The whole-row button sits in its list item: a `listitem` is not a control,
        // so the item wraps the button rather than replacing its role.
        const button = (
          <Pressable
            style={({ pressed }) => [skin.rowBase, pressed ? withInnerFill(theme, skin.pressedSurface(tokens), "firm") : null, pressFeedback(pressed)]}
            android_ripple={ripple}
            onPress={(event) => onPressItem?.(index, event)}
            accessibilityRole="button"
          >
            {renderAvatar(item)}
            {renderColumn(item)}
            {renderTrailing(item)}
            {rowMenu ? renderMenu(index) : null}
            {renderChevron()}
            {divider}
          </Pressable>
        );
        return listItem != null ? <View {...listItem}>{button}</View> : button;
      }
      return (
        <View {...listItem} style={skin.rowBase}>
          {grip}
          {renderAvatar(item)}
          {renderColumn(item)}
          {trailingSlot}
          {renderTrailing(item)}
          {rowMenu ? renderMenu(index) : null}
          {divider}
        </View>
      );
    };

    // Stable identity when the caller supplies one; the array index is the fallback
    // for static lists only (see StackedListItem.id).
    const keyOf = (item: StackedListItem, index: number) => String(item.id ?? index);

    const header =
      title != null ? (
        <View style={skin.header(tokens)}>
          <Text nativeID={titleId} style={skin.headerTitle(tokens)}>{title}</Text>
          {headerAction != null ? <View>{headerAction}</View> : null}
        </View>
      ) : null;

    // A windowed list needs a bounded height to scroll (and to actually window). Warn
    // once if `virtualized` is set without one; a FlatList with no height falls back
    // to rendering every row anyway, so the flag would be a silent no-op. Reorderable
    // lists always render eagerly: windowing unmounts off-screen rows, which would
    // leave them unregistered with the drag layer (undraggable, unmeasurable mid-drag).
    const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
    const bounded = flat.height != null || flat.maxHeight != null || flat.flex != null || flat.flexBasis != null;
    devWarn(
      !!virtualized && !!reorderable,
      "[canvas] <StackedList reorderable virtualized>: windowing unmounts off-screen rows, which would leave them undraggable; rendering eagerly.",
    );
    devWarn(
      !!virtualized && !reorderable && !bounded,
      "[canvas] <StackedList virtualized>: give the list a bounded height (e.g. style={{ maxHeight: 400 }}) so it can window and scroll; rendering eagerly for now.",
    );
    // The title names the list when it holds something to read: `title={cond && "Team"}`
    // passes `false` when the condition fails, and an empty title or label names nothing.
    const titled = title != null && title !== false && title !== "";
    const windowed = !!virtualized && !reorderable && bounded;
    devWarn(
      windowed && !titled && !label,
      "[canvas] <StackedList virtualized>: give the list a `title` or a `label`. While its rows overflow it is a keyboard stop, and Chromium names an unnamed stop from the text of every row it has rendered.",
    );

    // A drop reports the move; the order stays controlled by the consumer's `items`
    // array (listMoveFor is pure and unit-tested; the drop index excludes the dragged
    // row, the DnD layer's convention, so it IS the row's final index).
    const handleReorder = (e: DropEvent) => {
      const fromIndex = (e.data as { index?: number } | null)?.index ?? -1;
      const move = listMoveFor(items.map((item, i) => item.id ?? i), fromIndex, e.index);
      if (move) onReorder?.(move);
    };

    // The rows are a list (src/style/list-semantics.tsx), named by the title when there
    // is one, else by `label`. A string title is the name itself; a title that is some
    // other node names the list on the web by reference, and `label` names it natively.
    const list = listProps(
      typeof title === "string" && titled ? { label: title } : { label, labelledBy: titled ? titleId : undefined },
    );

    // Construct eager rows only in the branches that use them. Building this
    // array before choosing FlatList would still allocate every offscreen row. A
    // reorderable row's item wraps its Draggable, so the preview a pointer drag lifts
    // out of the list carries no list item of its own.
    const renderEagerRows = () => items.map((item, index) => (
      <Fragment key={keyOf(item, index)}>
        {reorderable ? (
          <View {...LIST_ITEM}>
            <Draggable id={keyOf(item, index)} data={{ index }} label={item.name}>
              {renderRow(item, index, null)}
            </Draggable>
          </View>
        ) : (
          renderRow(item, index, LIST_ITEM)
        )}
      </Fragment>
    ));

    const body = reorderable ? (
      <DragDropProvider>
        <DropZone id="rows" label={typeof title === "string" && title !== "" ? title : label || "List"} onDrop={handleReorder}>
          {/* The list sits inside the zone, so the zone's drop indicator is no row of it. */}
          <View {...list}>{renderEagerRows()}</View>
        </DropZone>
      </DragDropProvider>
    ) : windowed ? (
      <FlatList
        {...bodyFocus}
        {...bodyFrame.target}
        // The list itself is the stop. Focused, an unnamed scroller took its name from
        // every row it rendered in Chromium, a list included, so the title or `label`
        // names it (the dev warning above asks for one).
        {...list}
        style={FOCUS_RESET}
        // FlatList's own wrappers stay static, so Chromium counts the rows for the list.
        contentContainerStyle={LIST_WRAPPER}
        CellRendererComponent={WindowedListCell}
        data={items}
        renderItem={({ item, index }) => renderRow(item, index, windowedListItem(index, items.length))}
        keyExtractor={keyOf}
        showsVerticalScrollIndicator={false}
      />
    ) : (
      <View {...list}>{renderEagerRows()}</View>
    );

    return (
      // A framed list is a CONTENT-layer pane under glass (GlassSurface is the plain
      // View in solid mode); a bare list paints no surface of its own in either mode.
      framed ? (
        <GlassSurface layer="content" testID={testID} style={[s.outer, skin.cardSurface(tokens), style, bodyFrame.ring()]}>
          {header}
          {body}
        </GlassSurface>
      ) : (
        <View testID={testID} style={[s.outer, style, bodyFrame.ring()]}>
          {header}
          {body}
        </View>
      )
    );
  };
}
