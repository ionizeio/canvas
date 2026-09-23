import { type ComponentType, useState } from "react";
import { consumeEscapeKey } from "../../style/escape-layer.js";
import { View, Text, TextInput, useTheme, useResponsive, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle, useFillStyle, GlassSurface } from "../../style/index.js";
import { Avatar as WebAvatar, AvatarGroup as WebAvatarGroup } from "../../atoms/avatar/avatar.js";
import { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { type AvatarProps, type AvatarGroupProps } from "../../atoms/avatar/avatar.shared.js";
import { type BadgeProps } from "../../atoms/badge/badge.shared.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import * as s from "./description-lists.styles.js";
import { type Layout } from "./description-lists.styles.js";

// Shared DescriptionList shell. The structure (term/value rows in stacked,
// two-column, or inline layouts, an optional card surface with a header band),
// the boolean-prop axes and their precedence, the data-shape types, and the
// semantic value affordances (badge / status / mono / update) all live here once;
// a platform file supplies only its skin (card shape, density, type tracking,
// elevation) and calls createDescriptionList.
//
// DescriptionList: term/value pairs for detail panels, settings, and profile
// views. Each item is a { term, value } pair. The term is the small muted
// label; the value is the full-weight data it describes, so the data always
// outranks its label.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf / Card's surfaceOf).
//
// - Layout (pick one; precedence inline > twoColumn > stacked):
//   `inline` lays the term on the left and the value on the right of a single
//   row; `twoColumn` puts the term in a fixed 160px label column with the value
//   beside it (the read-only detail look); the default `stacked` puts a small
//   uppercase muted label above a full-weight value.
// - Rows: `divided` draws a hairline (border-b border-border) under every row
//   but the last, for the two-column detail look.
// - Surface: `card` wraps the whole list in a card surface (border, radius,
//   padding) so it reads as a self-contained panel. `title`/`subtitle` add a
//   bordered header band to the card.
//
// Per-item value affordances (all optional, render the value richly):
// `badge` renders the value as a secondary metadata Badge; `status` renders it
// as a success status Badge with a leading dot (live state); `mono` sets a
// monospace face for tokens/IDs; `avatars` renders the value as an overlapping
// AvatarGroup (with `overflow` collapsing the remainder into its "+N" chip);
// `copyValue` appends a ghost "Copy" button that hands the string to the
// list-level `onCopy` (the kit ships no clipboard dependency; the consumer
// performs the write); `update` appends a trailing "Update" link
// button that opens a working in-place editor (the inline-edit affordance):
// the value swaps for a draft TextInput with trailing Save / Cancel links.
// Enter or Save commits the draft (the row shows the new value and `onUpdate`
// fires with the item index and next value); Escape or Cancel dismisses it.
// One row edits at a time. The edited values follow the kit's controlled +
// uncontrolled contract at list granularity: `items` IS the controlled prop.
// A consumer that ignores onUpdate gets the uncontrolled behavior (the list
// keeps the committed value itself); a consumer that answers onUpdate by
// passing new items wins over the internal copy (see the `edits` state).
//
// Layout, rows, and surface are orthogonal axes and combine freely.
//
// DescriptionList keeps one structure and one set of semantic colors on every
// platform, but the per-OS row TYPE ROLES differ. Web/Android keep the Catalyst
// idiom (a small muted term beside a full-weight foreground value); iOS follows
// the iOS 27 kit Lists value row, where the term is the PRIMARY 17/22 label and
// the value is the SECONDARY gray 17/22 detail (the label/value emphasis is
// inverted and the type is larger), inside a flat 26-radius inset-grouped card
// with the continuous corner curve. The skin carries the card shape/elevation,
// row density and metrics, and the full term/value/header type per OS.
//
// The list has no pressable rows of its own; the only interactive affordance is
// the composed Button link, which brings its own per-OS press feedback and touch
// target (skin.minTarget: iOS 44pt / M3 48dp) from its own skin. The composed
// Badge and Button are threaded per-OS (the field.ios.tsx pattern) so the docs
// web 3-up shows the native atom inside each platform row, not the web atom.

/** One avatar in an `avatars` value row: a photo (`src`) or initials (`name`). */
export interface DescriptionListAvatar {
  src?: string;
  name?: string;
}

export interface DescriptionListItem {
  term: string;
  value: string;
  // Render the value as a secondary metadata badge (e.g. a role).
  badge?: boolean;
  // Render the value as a success status badge with a leading dot (live state).
  status?: boolean;
  // Monospace value face, for tokens, scopes, identifiers.
  mono?: boolean;
  /**
   * Append a ghost "Copy" button after the value. Pressing it invokes the
   * list's `onCopy` callback with this string (the kit ships no clipboard
   * dependency; the consumer performs the write).
   */
  copyValue?: string;
  /** Render the value as an overlapping avatar stack (composed AvatarGroup). */
  avatars?: DescriptionListAvatar[];
  /** Extra members beyond `avatars`, collapsed into the stack's "+N" chip. */
  overflow?: number;
  // Append a trailing "Update" link affordance, marking the row editable.
  update?: boolean;
}

export interface DescriptionListProps {
  items: DescriptionListItem[];
  // Card header band (only shown when `card`): a title and optional subtitle.
  title?: string;
  subtitle?: string;
  // Layout (pick one; precedence inline > twoColumn > stacked).
  inline?: boolean;
  twoColumn?: boolean;
  stacked?: boolean;
  // Rows: hairline divider beneath every row but the last.
  divided?: boolean;
  // Surface: wrap the list in a card surface.
  card?: boolean;
  /** Fires when a row's inline editor commits (Enter or Save): the item index and the new value. */
  onUpdate?: (index: number, value: string) => void;
  /** Fires with a row's `copyValue` when its "Copy" button is pressed. */
  onCopy?: (value: string) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The composed-atom component types, so each platform can pass its own resolved
// atoms (web base by default) without widening to `any`.
export type AvatarComponent = ComponentType<AvatarProps>;
export type AvatarGroupComponent = ComponentType<AvatarGroupProps>;
export type BadgeComponent = ComponentType<BadgeProps>;
export type ButtonComponent = ComponentType<ButtonProps>;

// The per-OS-varying style pieces. Everything else (structure, semantic colors,
// hairline rules, layout axes) is shared. Web keeps the current Canvas look;
// iOS follows the iOS 27 kit Lists value rows; Android uses Material 3.
export interface DescriptionListSkin {
  /** Card surface corner radius (web 8, iOS 26 inset-grouped, M3 12). */
  cardRadius: number;
  /** Card corner curve: iOS continuous (superellipse); circular elsewhere (no-op off iOS). */
  cardCurve: "circular" | "continuous";
  /** Card surface elevation: a soft shadow on web, flat on the iOS grouped list + Material 3. */
  cardShadow: (tokens: ColorTokens) => ViewStyle;
  /** Vertical gap between rows (and the rows-under-header group). */
  rowGap: number;
  /** Card inner padding: all sides for a header-less card, horizontal inset for the header band + rows. */
  cardPadding: number;
  /** Horizontal-row (inline / two-column) cross-axis alignment. */
  rowAlign: "baseline" | "center";
  /** Horizontal-row minimum height (iOS 52pt Lists row); omit for content height. */
  rowMinHeight?: number;
  /** Divided-row bottom padding beneath the hairline rule. */
  dividedPadBottom: number;
  /** Horizontal-row term type (size / line-height / weight / color / tracking). */
  termType: (t: ColorTokens) => TextStyle;
  /** Horizontal-row value type (size / line-height / weight / color / tracking). */
  valueType: (t: ColorTokens) => TextStyle;
  /** Stacked-layout term tracking (the small uppercase muted label). */
  stackedTermTracking: TextStyle;
  /** Stacked-layout value type (full-weight foreground; per-OS tracking). */
  stackedValueType: (t: ColorTokens) => TextStyle;
  /** Card header title type (size / line-height / weight / color / tracking). */
  headerTitleType: (t: ColorTokens) => TextStyle;
}

// Layout precedence when more than one is passed: first match wins.
// `stacked` is the lowest-precedence opt-in and the default when no layout
// boolean is set, so reading it here makes the public prop a real, intentional
// choice rather than relying on it only as the unconditional fallback.
function layoutOf(p: DescriptionListProps): Layout {
  if (p.inline) return "inline";
  if (p.twoColumn) return "twoColumn";
  if (p.stacked) return "stacked";
  return "stacked";
}

/**
 * Build a DescriptionList component from a platform skin and the platform-correct
 * composed atoms.
 *
 * The composed atoms (Badge / Button) are passed in by each platform's thin
 * `.ios`/`.android` file, so a value row's status/metadata Badge and the trailing
 * Update link match the list's platform on every build path. This matters for the
 * WEB docs 3-up preview: a bare barrel import always resolves the WEB atoms in a
 * browser bundler, which would paint web-styled atoms inside the iOS/Android rows;
 * each platform file passes its own `.ios`/`.android` atoms so the row reads
 * native. On a real device Metro resolves the right atoms by extension regardless,
 * so the defaults (the web base) are correct there too. The iOS/Android Button
 * skins also carry the native minimum touch target (skin.minTarget: HIG 44pt /
 * M3 48dp), so threading them lifts the Update affordance to a compliant target.
 */
export function createDescriptionList(
  skin: DescriptionListSkin,
  Badge: BadgeComponent = WebBadge,
  Button: ButtonComponent = WebButton,
  Avatar: AvatarComponent = WebAvatar,
  AvatarGroup: AvatarGroupComponent = WebAvatarGroup,
) {
  // Render a value cell: an avatar stack, a copyable value, a badge family, a
  // monospace token, or plain text (precedence in that order). The value type
  // (foreground full-weight on web/Android, secondary gray 17pt on iOS; stacked
  // keeps a full-weight foreground value) is resolved by the caller, as is the
  // shown string (the item value, or the row's committed inline edit).
  function Value({ item, value, align, valueStyle, onCopy }: { item: DescriptionListItem; value: string; align?: boolean; valueStyle: TextStyle; onCopy?: (value: string) => void }) {
    if (item.avatars && item.avatars.length > 0) {
      // The overlap, separator ring, and "+N" overflow chip are AvatarGroup's own
      // anatomy; `total` folds the `overflow` remainder into that chip. The group
      // is named so a screen reader hears the members, not disconnected initials.
      const names = item.avatars.map((a) => a.name).filter(Boolean) as string[];
      const more = typeof item.overflow === "number" && item.overflow > 0 ? ` and ${item.overflow} more` : "";
      const groupName = names.length > 0 ? `${names.join(", ")}${more}` : `${item.avatars.length} members${more}`;
      return (
        <AvatarGroup small snug total={item.avatars.length + Math.max(0, item.overflow ?? 0)} accessibilityLabel={groupName}>
          {item.avatars.map((a, i) => (
            <Avatar key={i} small src={a.src} name={a.name}>
              {a.name}
            </Avatar>
          ))}
        </AvatarGroup>
      );
    }
    if (item.copyValue != null) {
      const copyValue = item.copyValue;
      return (
        <View style={s.copyRow}>
          <Text style={[valueStyle, item.mono ? s.valueMono : null, s.copyValueText]} numberOfLines={1}>
            {value || copyValue}
          </Text>
          <Button ghost small accessibilityLabel={`Copy ${item.term}`} onPress={() => onCopy?.(copyValue)}>
            Copy
          </Button>
        </View>
      );
    }
    if (item.status) return <Badge status success>{value}</Badge>;
    if (item.badge) return <Badge secondary>{value}</Badge>;
    if (item.mono) {
      return <Text style={[valueStyle, s.valueMono]}>{value}</Text>;
    }
    return <Text style={[valueStyle, align ? s.valueAlignRight : null]}>{value}</Text>;
  }

  return function DescriptionList(props: DescriptionListProps) {
    const { items, title, subtitle, divided, card, onUpdate, onCopy, testID, style } = props;
    const { tokens } = useTheme();
    // FILL: the list spans the parent it is given.
    const fill = useFillStyle("DescriptionList");
    const layout = layoutOf(props);
    // The two-column term label narrows at phone widths (160 -> 120) so the
    // value column keeps room to breathe.
    const narrowTermColumn = useResponsive({ base: false, sm: true });
    const hasHeader = card && !!title;

    // Inline-edit state. `editing` is the single row currently in edit mode and
    // `draft` its in-progress text. `edits` holds each row's committed value for
    // the uncontrolled path, remembering the item.value it replaced: while the
    // consumer keeps passing that same base the edit shows, and the moment they
    // pass a different value (the controlled response to onUpdate) the prop wins
    // and the stale edit goes inert. This is the kit's controlled + uncontrolled
    // contract at list granularity: `items` is the controlled prop, and
    // onUpdate (like useControllableState's callback) fires in both modes.
    const [editing, setEditing] = useState<number | null>(null);
    const [draft, setDraft] = useState("");
    const [edits, setEdits] = useState<Record<number, { base: string; value: string }>>({});

    const container: StyleProp<ViewStyle> = [
      card ? s.cardSurface(tokens, skin) : null,
      // No global padding when a header band supplies its own px-6 per section.
      card && !hasHeader ? { padding: skin.cardPadding } : null,
      !hasHeader ? { gap: skin.rowGap } : null,
      fill,
      style,
    ];

    const stacked = layout === "stacked";
    // Stacked keeps a full-weight foreground value; the horizontal rows carry the
    // per-OS value type (secondary gray on iOS, full-weight foreground otherwise).
    const valueStyle = stacked ? skin.stackedValueType(tokens) : skin.valueType(tokens);

    const rows = items.map((item, index) => {
      const last = index === items.length - 1;
      // A divided list draws a hairline under each row except the last, and pads
      // the row vertically so the rule sits clear of the text.
      const row: StyleProp<ViewStyle> = [
        s.rowLayout(layout, skin),
        divided ? s.rowDividedPad(skin) : null,
        divided && !last ? s.rowDivider(tokens) : null,
      ];
      // The shown value: the consumer's item.value, unless this row committed an
      // inline edit over that exact base (the uncontrolled path, see `edits`).
      const edit = edits[index];
      const shown = edit && edit.base === item.value ? edit.value : item.value;
      const isEditing = editing === index;
      const commit = () => {
        setEdits((prev) => ({ ...prev, [index]: { base: item.value, value: draft } }));
        setEditing(null);
        onUpdate?.(index, draft);
      };
      const cancel = () => setEditing(null);
      return (
        <View key={`${item.term}-${index}`} style={row}>
          <Text
            style={[
              stacked ? [s.termStacked(tokens), skin.stackedTermTracking] : skin.termType(tokens),
              layout === "twoColumn" ? [s.termColumn, narrowTermColumn ? s.termColumnNarrow : null] : null,
            ]}
          >
            {item.term}
          </Text>
          <View style={layout === "twoColumn" ? s.twoColumnValueCell : isEditing && layout === "inline" ? s.editCellGrow : null}>
            {isEditing ? (
              // The in-place editor: the draft in the row's own value type over a
              // ring-colored underline, with Save / Cancel links trailing. Enter
              // commits, Escape (web) cancels; native relies on the links.
              <View style={s.editRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  autoFocus
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={commit}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === "Escape") {
                      consumeEscapeKey(e);
                      cancel();
                    }
                  }}
                  accessibilityLabel={`${item.term} value`}
                  aria-label={`${item.term} value`}
                  style={[valueStyle, s.editInput(tokens)]}
                />
                <Button link small onPress={commit} accessibilityLabel={`Save ${item.term}`}>
                  Save
                </Button>
                <Button link small onPress={cancel} accessibilityLabel={`Cancel updating ${item.term}`}>
                  Cancel
                </Button>
              </View>
            ) : (
              <>
                <Value item={item} value={shown} align={layout === "inline"} valueStyle={valueStyle} onCopy={onCopy} />
                {item.update ? (
                  <Button
                    link
                    small
                    onPress={() => { setDraft(shown); setEditing(index); }}
                    accessibilityLabel={`Update ${item.term}`}
                  >
                    Update
                  </Button>
                ) : null}
              </>
            )}
          </View>
        </View>
      );
    });

    // A card list is a CONTENT-layer pane under glass (GlassSurface is the plain View
    // in solid mode); a bare list paints no surface of its own in either mode.
    const Root = card ? GlassSurface : View;
    return (
      <Root testID={testID} style={container} {...(card ? { layer: "content" as const } : null)}>
        {hasHeader ? (
          <View style={s.headerBand(tokens, skin)}>
            <Text style={skin.headerTitleType(tokens)}>{title}</Text>
            {subtitle ? <Text style={s.headerSubtitle(tokens)}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {hasHeader ? <View style={s.rowsWrap(skin)}>{rows}</View> : rows}
      </Root>
    );
  };
}
