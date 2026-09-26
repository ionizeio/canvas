import { Fragment, type ComponentType, type ReactNode } from "react";
import { FlatList, StyleSheet, type ViewProps } from "react-native";
import {
  View,
  Pressable,
  Text,
  useTheme,
  useFillStyle,
  devWarn,
  FOCUS_RESET,
  type ColorTokens,
  type LayoutStyle,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  GlassSurface,
} from "../../style/index.js";
import { useScrollFocus } from "../../style/use-scroll-focus.js";
import { useFocusFrame } from "../../style/focus-frame.js";
import { LIST_ITEM, LIST_WRAPPER, WindowedListCell, listProps, windowedListItem } from "../../style/list-semantics.js";
import { Avatar as WebAvatar } from "../../atoms/avatar/avatar.js";
import { type AvatarProps } from "../../atoms/avatar/avatar.shared.js";
import { Icon, type IconName } from "../../atoms/icon/icon.js";
import * as s from "./feeds.styles.js";

// The composed Avatar type so each platform can pass its own resolved atom (the
// web base by default) without widening to `any`.
export type AvatarComponent = ComponentType<AvatarProps>;

// Shared Feed shell. The structure (a card surface framing connector-node rows or
// avatar rows, with an actor/action line plus a relative timestamp), the
// boolean-prop axes, the lead/density precedence, and the initials fallback live
// here once; a platform file supplies only its skin (card shape, row density,
// label tracking, press feedback) and calls createFeed.
//
// An activity feed is a vertical timeline of events. Each item is a row with a
// leading mark (a small dot/initials node or a person's avatar), a content
// column carrying the actor + action + target line, and a muted timestamp.
//
// Two lead variants:
//
// 1. The connector feed (default): each row leads with a small bordered node
//    and a vertical connector line links one event to the next. The connector
//    is dropped on the final item so the line terminates cleanly at the last
//    event rather than dangling past it. The node's content follows its own
//    first-match precedence: the item's kit glyph, then the actor's initials,
//    then a muted dot for an actor-less event.
// 2. The avatar feed (`avatar`): each row leads with the actor's avatar and the
//    rows are separated by hairline rules instead of a connector line.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf). The lead axis picks
// between the connector node and the avatar; `compact` is an orthogonal density
// modifier that tightens the vertical rhythm.
//
// Feed is a "Light" platform treatment: one structure and one set of (semantic)
// colors, with per-OS touches limited to card radius, row density, label
// tracking, and press feedback — so the skin carries only those, not the colors
// or the markup.

/** One event in the feed. */
export interface FeedItem {
  /**
   * Stable identity for this event, used as the row's React key. Supply it for
   * mutable or reordered feeds (the common timeline case is prepending the
   * newest event): without it the rows fall back to their array index, which
   * desyncs per-row state and press feedback when items are inserted at the
   * front or reordered.
   */
  id?: string | number;
  /** Actor who performed the action, rendered bold (e.g. "Rachel Chen"). */
  actor?: string;
  /** The action text, muted (e.g. "approved the request"). */
  action: string;
  /** Optional target of the action, muted and trailing the action. */
  target?: string;
  /** Relative timestamp, muted and small (e.g. "2 hours ago"). */
  time: string;
  /** Photo URL for the avatar lead; falls back to initials from the actor. */
  avatar?: string;
  /**
   * Leading Canvas glyph for the CONNECTOR node, named from the kit icon set
   * (e.g. `"shieldCheck"`, `"gitMerge"`, `"keyRound"`). Rendered through the
   * `Icon` atom, muted and decorative (the row's own text carries the meaning),
   * and it takes precedence over the actor's initials and the actor-less dot.
   * Reach for it on system or automation events, where a glyph names the kind of
   * event better than a pair of letters. The avatar lead ignores it: that row
   * leads with the person's photo or initials.
   */
  icon?: IconName;
}

export interface FeedProps {
  /** Events to render, top to bottom. */
  items?: FeedItem[];
  // Lead axis (pick one; default is the connector node + vertical line).
  connector?: boolean;
  avatar?: boolean;
  // Density modifier: tightens the row padding and connector spacing.
  compact?: boolean;
  /** When set, each event row is pressable, reporting the row index. */
  onItemPress?: (index: number) => void;
  /**
   * The feed's accessible name (e.g. "Recent activity"): a screen reader announces it
   * with the list of events. A `virtualized` feed needs one: on the web its scroller
   * is a keyboard stop while the events overflow, and Chromium names an unnamed stop
   * from the text of every event it has rendered.
   */
  label?: string;
  /**
   * Render the rows through a windowed `FlatList` instead of mounting every row up
   * front, for large lists. Give the list a bounded height (via `style`, e.g.
   * `{ maxHeight: 400 }`) so it can scroll; without one it warns and renders eagerly
   * anyway. Default (omitted) mounts all rows, unchanged. On the web, while the rows
   * overflow, the windowed list is a keyboard tab stop the keyboard can scroll, and
   * the feed's card draws the focus ring while it has keyboard focus.
   */
  virtualized?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export type Lead = "connector" | "avatar";

// The contract a platform skin fulfills. The shell renders the card surface, the
// connector/avatar rows, the node, the connector line, and the labels; the skin
// maps the active platform's shape/density/type/feedback onto each piece. Color
// logic stays in the shell (driven by tokens) since Feed is a Light treatment.
export interface FeedSkin {
  /** The card surface framing the feed (shape, border, fill, max-width). */
  cardSurface: (t: ColorTokens) => ViewStyle;
  /** Connector surface padding by density (compact vs default). */
  connectorPad: (compact: boolean) => ViewStyle;
  /** Inter-row vertical rhythm by density for the connector lead (dropped on last). */
  connectorRowGap: (compact: boolean) => ViewStyle;
  /** Avatar row padding by density (compact vs default). */
  avatarRowPad: (compact: boolean) => ViewStyle;
  /** The hairline rule between avatar rows; omitted on the last row. */
  avatarDivider: (t: ColorTokens) => ViewStyle;
  /** The leading connector node (a small bordered circle). */
  node: (t: ColorTokens) => ViewStyle;
  /** The vertical connector line under the node center. */
  connectorLine: (t: ColorTokens) => ViewStyle;
  /** The node's initials type. */
  nodeInitials: (t: ColorTokens) => TextStyle;
  /** The outer wrapping line (sizing only). */
  lineText: TextStyle;
  /** The actor name (bold, foreground). */
  actorLabel: (t: ColorTokens) => TextStyle;
  /** The action / target text (muted). */
  actionLabel: (t: ColorTokens) => TextStyle;
  /** The relative timestamp (muted, small). */
  timeLabel: (t: ColorTokens) => TextStyle;
  /** iOS/web dim on press of a row; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android ripple over pressable rows; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * Minimum effective touch-target height for a pressable row (HIG 44pt on iOS,
   * Material 48dp on Android). Rows already taller than this are unaffected; it
   * only floors the short final connector row (~40pt) up to the platform
   * minimum. 0 on web (pointer input, no finger-target rule; layout unchanged).
   */
  minTarget: number;
}

// Glyph size inside the connector node. The node is a 28pt circle on every
// platform (its 1px border leaves 26pt of room), so a 16pt glyph sits centered
// with a hair of breathing room and matches the optical weight of the 12pt
// initials it replaces. It lives here rather than in the skin because the node
// geometry it is derived from is identical across the three skins.
const NODE_ICON_SIZE = 16;

// Lead precedence when more than one is passed: first match wins.
function leadOf(p: FeedProps): Lead {
  if (p.connector) return "connector";
  if (p.avatar) return "avatar";
  return "connector";
}

// Two initials from an actor name, used for the avatar/node fallback when no
// photo is supplied (e.g. "Rachel Chen" -> "RC").
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function createFeed(skin: FeedSkin, Avatar: AvatarComponent = WebAvatar) {
  return function Feed(props: FeedProps) {
    const { items = [], onItemPress, label, virtualized, testID, style } = props;
    const { tokens } = useTheme();
    // FILL: the feed spans the parent it is given; the parent picks the measure.
    const fill = useFillStyle("Feed");
    const lead = leadOf(props);
    const compact = !!props.compact;
    const lastIndex = items.length - 1;
    // A windowed feed scrolls its rows on its own, so it is a keyboard stop while they
    // overflow, whatever the rows hold (DataTable's windowed body is the precedent).
    // Left alone, Chromium and Firefox made a read-only feed's scroller a stop anyway
    // (a scroller with nothing focusable inside) and drew their own ring on it, while
    // WebKit left it out of the tab order. The card draws the ring for it
    // (src/style/focus-frame.tsx): it clips one drawn around the flush scroller of the
    // avatar lead, and the rows would paint over one drawn inside either scroller.
    const bodyFocus = useScrollFocus("vertical");
    const bodyFrame = useFocusFrame();
    // The events are a list (src/style/list-semantics.tsx) named by `label`. Windowed,
    // the list itself is the stop: focused, an unnamed scroller took its name from
    // every row it rendered in Chromium, a list included, so the dev warning below
    // asks for a `label`.
    const list = listProps({ label });
    const bodyProps = {
      ...bodyFocus,
      ...bodyFrame.target,
      ...list,
      style: FOCUS_RESET,
      // FlatList's own wrappers stay static, so Chromium counts the rows for the list.
      contentContainerStyle: LIST_WRAPPER,
      CellRendererComponent: WindowedListCell,
    };

    // Stable identity when the caller supplies one; the array index is the fallback
    // for static lists only (see FeedItem.id).
    const keyOf = (item: FeedItem, index: number) => String(item.id ?? index);

    // A windowed list needs a bounded height to scroll (and to actually window). Warn
    // once if `virtualized` is set without one; a FlatList with no height falls back
    // to rendering every row anyway, so the flag would be a silent no-op.
    const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
    const bounded = flat.height != null || flat.maxHeight != null || flat.flex != null || flat.flexBasis != null;
    devWarn(
      !!virtualized && !bounded,
      "[canvas] <Feed virtualized>: give the list a bounded height (e.g. style={{ maxHeight: 400 }}) so it can window and scroll; rendering eagerly for now.",
    );
    const windowed = !!virtualized && bounded;
    devWarn(
      windowed && !label,
      "[canvas] <Feed virtualized>: give the feed a `label`. While its events overflow it is a keyboard stop, and Chromium names an unnamed stop from the text of every event it has rendered.",
    );

    // Press feedback differs per OS: Android shows a native ripple (state layer)
    // on the row, iOS/web dim the row's opacity. The skin decides which.
    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    // Floor a pressable row to the platform's minimum touch target (44pt iOS /
    // 48dp Android); web is 0 so its layout is unchanged. Only the short final
    // connector row is actually grown; avatar and non-last rows already exceed it.
    const targetFloor: ViewStyle | null = skin.minTarget > 0 ? { minHeight: skin.minTarget } : null;

    const renderContent = (item: FeedItem) => (
      <View style={s.contentColumn}>
        <Text style={skin.lineText}>
          {item.actor ? <Text style={skin.actorLabel(tokens)}>{item.actor} </Text> : null}
          <Text style={skin.actionLabel(tokens)}>{item.action}</Text>
          {item.target ? <Text style={skin.actionLabel(tokens)}> {item.target}</Text> : null}
        </Text>
        <Text style={skin.timeLabel(tokens)}>{item.time}</Text>
      </View>
    );

    if (lead === "avatar") {
      // Avatar lead: each row leads with the actor's avatar; rows are ruled by a
      // hairline between items (the last row keeps no rule). Keyless so it can be
      // used both by the eager `.map` (which supplies the key via Fragment) and by
      // FlatList's renderItem (which keys via keyExtractor).
      const renderRow = (item: FeedItem, index: number, listItem: ViewProps) => {
        const divider = index < lastIndex ? skin.avatarDivider(tokens) : null;
        const rowStyle: StyleProp<ViewStyle> = [s.avatarRow, skin.avatarRowPad(compact), divider];
        const inner: ReactNode = (
          <>
            <Avatar src={item.avatar} name={item.actor}>
              {item.actor ? initialsFrom(item.actor) : ""}
            </Avatar>
            {renderContent(item)}
          </>
        );
        if (onItemPress) {
          // A pressable event is a button in its list item: a `listitem` is not a
          // control, so the item wraps the button rather than replacing its role.
          return (
            <View {...listItem}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onItemPress(index)}
                android_ripple={ripple}
                style={({ pressed }) => [
                  rowStyle,
                  skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                ]}
              >
                {inner}
              </Pressable>
            </View>
          );
        }
        return <View {...listItem} style={rowStyle}>{inner}</View>;
      };

      const body = windowed ? (
        <FlatList
          {...bodyProps}
          data={items}
          renderItem={({ item, index }) => renderRow(item, index, windowedListItem(index, items.length))}
          keyExtractor={keyOf}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View {...list}>
          {items.map((item, index) => <Fragment key={keyOf(item, index)}>{renderRow(item, index, LIST_ITEM)}</Fragment>)}
        </View>
      );
      return <GlassSurface layer="content" testID={testID} style={[skin.cardSurface(tokens), fill, style, bodyFrame.ring()]}>{body}</GlassSurface>;
    }

    // Connector lead: a bordered node per row with a vertical line linking each
    // event to the next. The line is dropped on the final item. Keyless so it can be
    // used both by the eager `.map` (which supplies the key via Fragment) and by
    // FlatList's renderItem (which keys via keyExtractor). The connector line is
    // drawn per-row off the index, so it keeps terminating on the last item under a
    // windowed FlatList (each row still knows whether it is last).
    const renderRow = (item: FeedItem, index: number, listItem: ViewProps) => {
      const isLast = index === lastIndex;
      const rowStyle: StyleProp<ViewStyle> = [s.connectorRow, isLast ? null : skin.connectorRowGap(compact)];
      const inner: ReactNode = (
        <>
          {!isLast ? (
            // Vertical connector: a 1px border-colored line running from just below
            // the node down to the next row, absolutely placed under the node's
            // horizontal center; dropped on the final item.
            <View style={skin.connectorLine(tokens)} />
          ) : null}
          <View style={skin.node(tokens)}>
            {/* Node content, first match wins: the item's kit glyph, then the
                actor's initials, then a muted dot for an actor-less event. The
                glyph is decorative because the actor/action line beside it
                already says what happened. */}
            {item.icon ? (
              <Icon {...{ [item.icon]: true }} muted size={NODE_ICON_SIZE} decorative />
            ) : item.actor ? (
              <Text style={skin.nodeInitials(tokens)}>{initialsFrom(item.actor)}</Text>
            ) : (
              <View style={s.nodeDot(tokens)} />
            )}
          </View>
          <View style={s.connectorContentColumn}>{renderContent(item)}</View>
        </>
      );
      if (onItemPress) {
        return (
          <View {...listItem}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onItemPress(index)}
              android_ripple={ripple}
              style={({ pressed }) => [
                rowStyle,
                targetFloor,
                skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
              ]}
            >
              {inner}
            </Pressable>
          </View>
        );
      }
      return <View {...listItem} style={rowStyle}>{inner}</View>;
    };

    const body = windowed ? (
      <FlatList
        {...bodyProps}
        data={items}
        renderItem={({ item, index }) => renderRow(item, index, windowedListItem(index, items.length))}
        keyExtractor={keyOf}
        showsVerticalScrollIndicator={false}
      />
    ) : (
      <View {...list}>
        {items.map((item, index) => <Fragment key={keyOf(item, index)}>{renderRow(item, index, LIST_ITEM)}</Fragment>)}
      </View>
    );

    // The feed card is a CONTENT-layer pane under glass (GlassSurface is the plain View in solid mode).
    return <GlassSurface layer="content" testID={testID} style={[skin.cardSurface(tokens), skin.connectorPad(compact), fill, style, bodyFrame.ring()]}>{body}</GlassSurface>;
  };
}
