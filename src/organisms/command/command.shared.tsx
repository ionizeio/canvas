import { consumeEscapeKey, EscapeLayerProvider, useEscapeLayer } from "../../style/escape-layer.js";
import { useId, useRef, useState } from "react";
import { type Role, type TextInput as RNTextInput, type TextStyle } from "react-native";
import { View, Text, TextInput, Pressable, useTheme, useControllableState, AnchoredOverlay, useOverlayHost, GlassSurface, FOCUS_RESET, type StyleProp, type ViewStyle } from "../../style/index.js";
import { OverlayScrollView } from "../../style/overlay-scroll.js";
import { FocusFrameContext, useFocusFrame } from "../../style/focus-frame.js";
import { useActiveOptionScroll } from "../../style/use-active-option-scroll.js";

// React Native's Role union omits the valid ARIA "listbox" role, so the command
// list container casts it. The value is correct on both web (DOM role) and native.
const LISTBOX = "listbox" as Role;
import { Icon, type IconName } from "../../atoms/icon/icon.js";
import { Kbd } from "../../atoms/kbd/kbd.js";
import { type CommandSkin } from "./command.styles.js";
import * as s from "./command.styles.js";

// Shared Command shell. The structure, the public boolean-prop API, the data
// shapes, the controlled/uncontrolled open state, the flat active-index walk, the
// select/close handlers, and the trigger/footer composition all live here once. A
// platform file supplies only its skin (the search-row + result-row shape,
// density, type, the active-row highlight, and the press-feedback mode) and calls
// createCommand.
//
// Command: a Cmd+K style command palette rendered as a floating card. A search
// row sits at the top (a leading magnifier glyph + a REAL text input: typing
// edits the query, controlled via `query`, self-managed via `defaultQuery`, the
// standard library contract, and the grouped rows narrow to the labels matching
// it), then one or more groups of result rows. Groups left with no matching row
// drop out, heading included; a query matching nothing shows a muted "No
// results" row. Each group can carry an optional uppercase heading; each row is
// a leading icon glyph + a label + an optional trailing shortcut rendered as a
// Kbd cap. The active row (a flat index across the visible rows) is highlighted
// with the accent surface and resets to the first row on each keystroke.
//
// In BARE mode (no `trigger`) this is the OPEN, inline palette card on its own:
// no Modal, no scrim. `open` (default true) gates whether the card renders, so
// the docs playground can show the palette in its open state. In TRIGGER mode the
// floating palette card is portaled below the collapsed trigger through
// AnchoredOverlay (like Dropdown/Popover/RowMenu), so it escapes the trigger's
// stacking context and is never overpainted by a later sibling or clipped by an
// ancestor; it falls back to the inline absolute anchor with no OverlayProvider.
//
// Command is a "Light" platform treatment: ONE structure with small per-OS
// touches (row density/height, type, and press feedback). The panel material
// (GlassSurface), the card shell, the trigger, the group heading, the footer, and
// the Kbd caps are shared and identical across platforms; only the search row and
// the result rows are re-skinned.
//
// Style is configured through semantic boolean props (Canvas's only styling
// API); there are no string-enum props.

export interface CommandItem {
  /** The row's primary text. */
  label: string;
  /** Optional leading Canvas glyph, named from the kit icon set (e.g. `"file"`,
   *  `"folder"`, `"save"`). Rendered through the `Icon` atom. */
  icon?: IconName;
  /** Optional trailing keyboard shortcut, rendered in a Kbd cap. */
  shortcut?: string;
}

export interface CommandGroup {
  /** Optional uppercase section heading above the group's rows. */
  heading?: string;
  /** The rows in this group. */
  items: CommandItem[];
}

export interface CommandProps {
  /** Prompt shown in the empty search input. */
  placeholder?: string;
  /** Accessible purpose for the search input and result list. Defaults to the
   * search placeholder. Supply this when the placeholder does not explain the task. */
  accessibilityLabel?: string;
  /**
   * The text typed into the search input (CONTROLLED). Filters the rows to the
   * labels matching it (case-insensitive). Omit and use `defaultQuery` for
   * uncontrolled use: a bare Command is searchable out of the box.
   */
  query?: string;
  /** Initial query for uncontrolled use. */
  defaultQuery?: string;
  /** Fired with the new query on each keystroke (both modes). */
  onQueryChange?: (query: string) => void;
  /** Grouped result rows. */
  groups?: CommandGroup[];
  /** Flat index of the highlighted row (CONTROLLED), counted across the visible (query-matching) rows. Omit for uncontrolled use. */
  active?: number;
  /** Initial highlighted row for uncontrolled use (hovering a row moves it, typing resets it to the first match). */
  defaultActive?: number;
  /** Controlled open state. Omit for uncontrolled (the search trigger toggles it). */
  open?: boolean;
  /** Render the palette open initially for uncontrolled use (selecting a row closes it). */
  defaultOpen?: boolean;
  /** Fired when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Render a collapsed full-width search trigger above the palette (a search
   * glyph + "Search..." + a trailing kbd cap). The palette card still renders
   * inline below the trigger (gated by `open`), mirroring how Dropdown shows
   * its trigger plus the open menu in the docs.
   */
  trigger?: boolean;
  /**
   * Append a footer hint bar below the list (↑ ↓ to navigate, ↵ to select,
   * esc to close).
   */
  footer?: boolean;
  /** Called with the chosen item and its flat index (within the visible, query-matching rows) when a row is pressed. */
  onSelect?: (item: CommandItem, index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// The editable slice of the search row: fill the space after the magnifier and
// drop the platform's default inner padding, so the skin's search row (height,
// gutter) governs the footprint exactly as it did around the old static text.
const searchInput: TextStyle = { flex: 1, paddingVertical: 0, paddingHorizontal: 0 };

/** Build a Command component from a platform skin. */
export function createCommand(skin: CommandSkin) {
  return function Command(props: CommandProps) {
    const {
      placeholder = "Search commands...",
      groups = [],
      open: openProp,
      trigger,
      footer,
      onOpenChange,
      onQueryChange,
      onSelect,
      testID,
      style,
    } = props;
    const { tokens } = useTheme();

    // Controlled when `active` is provided, self-managed otherwise, so the
    // highlight follows hover instead of sitting frozen on the initial row.
    const [active, setActive] = useControllableState<number>(props.active, props.defaultActive ?? 0);

    // Controlled when `query` is provided, self-managed otherwise, so a bare
    // <Command /> filters as you type (the standard library contract).
    const [query, setQuery] = useControllableState<string>(props.query, props.defaultQuery ?? "", onQueryChange);

    // Uncontrolled by default: in trigger mode the palette starts closed and the
    // collapsed search trigger toggles it; the bare card (no trigger) starts
    // open. `defaultOpen` forces it open initially even in trigger mode.
    const [internalOpen, setInternalOpen] = useState(() => props.defaultOpen ?? !trigger);
    const open = openProp ?? internalOpen;
    // The search field's focus, painted on the search row's rule (its focus indicator).
    const [searchFocused, setSearchFocused] = useState(false);
    const setOpen = (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };

    // The trigger view AnchoredOverlay measures to anchor (and portal) the card.
    const triggerRef = useRef<View>(null);
    const host = useOverlayHost();
    // The bare card frames its result list's keyboard focus, as an anchored card does in
    // trigger mode: the list sits flush inside the card's clip (src/style/focus-frame.tsx).
    const focusFrame = useFocusFrame();

    // Escape dismisses the open TRIGGER-mode palette via browser Escape or native accessibility escape. The
    // bare inline card is left alone: it has no trigger to reopen it, so escape
    // would only strand it closed.
    const escapeScope = useEscapeLayer(!!trigger && open, () => setOpen(false));

    // Filter the grouped rows by the query (case-insensitive substring on the
    // label). With no query every row shows; groups left with no matching row
    // drop out, heading included, so the visible list stays scannable.
    const q = query.trim().toLowerCase();
    const visibleGroups =
      q === ""
        ? groups
        : groups
            .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(q)) }))
            .filter((g) => g.items.length > 0);

    // Keyboard operability (the flat command-palette pattern the footer advertises):
    // the search input is the focusable driver, ArrowUp/Down move the highlighted
    // `active` row (clamped), and Enter selects it, all through the input's own
    // RN `onKeyPress` channel (react-native-web feeds every keydown through it).
    // Focus stays on the input and aria-activedescendant points at the active
    // option, so a web screen reader announces the moving highlight. Arrow/Enter
    // handling is web-only in effect (soft keyboards send no arrow keys).
    const flatItems = visibleGroups.flatMap((g) => g.items);
    const total = flatItems.length;
    // Filtering can shrink the list under a controlled `active` the parent never
    // updates; clamp so the highlight (and aria) always lands on a visible row.
    const activeIndex = Number.isInteger(active) && active >= 0 ? Math.min(active, total - 1) : -1;
    const baseId = useId();
    const listId = `${baseId}-results`;
    const optionId = (i: number) => `${baseId}-opt-${i}`;
    const activeId = activeIndex >= 0 ? optionId(activeIndex) : undefined;
    const fieldName = props.accessibilityLabel?.trim() || placeholder.trim() || "Search commands";
    const searchRef = useRef<RNTextInput>(null);
    const results = useActiveOptionScroll(open ? activeId : undefined, JSON.stringify(visibleGroups), open);
    const onSearchKeyPress = (event: { nativeEvent: {
      key: string; isComposing?: boolean; keyCode?: number; repeat?: boolean;
      altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean;
    }; preventDefault: () => void }) => {
      const { key, isComposing, keyCode, repeat, altKey, ctrlKey, metaKey } = event.nativeEvent;
      // IME confirmation and modified editing keys belong to the text input.
      if (isComposing || keyCode === 229) {
        if (key === "Escape") consumeEscapeKey({ nativeEvent: event.nativeEvent });
        return;
      }
      if (key === "Escape") {
        escapeScope.onKeyPress(event);
        return;
      }
      if (total === 0) return;
      if ((altKey || ctrlKey || metaKey) && (key === "ArrowDown" || key === "ArrowUp")) return;
      switch (key) {
        case "ArrowDown":
          event.preventDefault();
          setActive(Math.min(activeIndex + 1, total - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActive(Math.max(activeIndex - 1, 0));
          break;
        case "Enter": {
          event.preventDefault();
          if (repeat) return;
          const item = flatItems[activeIndex];
          if (item) {
            onSelect?.(item, activeIndex);
            setOpen(false);
          }
          break;
        }
        default:
          return;
      }
    };
    // In trigger mode the collapsed search button is always shown; the palette
    // card below it is still gated by `open`. Otherwise the bare card is gated by
    // `open` and renders nothing when closed.
    if (!trigger && !open) return null;

    const ripple = skin.ripple ? skin.ripple(tokens) : undefined;

    // Walk a flat counter across every visible group so `active` indexes the
    // whole filtered list.
    let flat = -1;

    // The card's inner content (search row + grouped result rows + optional
    // footer), WITHOUT the surface wrapper: the bare card wraps it in its own
    // GlassSurface, and in trigger mode AnchoredOverlay supplies the GlassSurface
    // (portaling the card over the page). The search magnifier is the kit `Icon`
    // (a template-tintable monochrome glyph) tinted muted-foreground — never a
    // color emoji (which ignores tint and renders full-color on device).
    const cardContent = (
      <>
        <View accessibilityRole="search" style={skin.searchRow(tokens, searchFocused)}>
          <Icon search muted decorative size={skin.searchGlyphSize} />
          <TextInput
            ref={searchRef}
            onKeyPress={onSearchKeyPress}
            // The skin's searchPlaceholder carries the row's type metrics with the
            // muted placeholder color; typed text repaints with `foreground`.
            style={[skin.searchPlaceholder(tokens), searchInput, { color: tokens.foreground }, FOCUS_RESET]}
            value={query}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onChangeText={(text) => {
              setQuery(text);
              // Each keystroke changes what is visible; snap the highlight back
              // to the first match so it never points at a filtered-out row.
              setActive(0);
            }}
            placeholder={placeholder}
            placeholderTextColor={skin.searchPlaceholder(tokens).color}
            selectionColor={tokens.primary} // brand cursor / selection on every platform
            accessibilityLabel={fieldName}
            aria-label={fieldName}
            aria-controls={listId}
            // The search input drives the listbox highlight; point AT to the active row.
            {...({ "aria-activedescendant": activeId } as object)}
          />
        </View>

        <OverlayScrollView ref={results.listRef} onLayout={results.onLayout} onScroll={results.onScroll} onContentSizeChange={results.scrollActiveIntoView} scrollEventThrottle={16}>
        {q !== "" && total === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyText(tokens)}>No results</Text>
          </View>
        ) : null}

        <View ref={results.listContentRef} collapsable={false} nativeID={listId} role={LISTBOX} accessibilityLabel={fieldName} aria-label={fieldName}>
        {visibleGroups.map((group, gi) => (
          <View key={`group-${gi}`} role="group" aria-label={group.heading ?? undefined}>
            {group.heading != null ? <Text style={s.groupHeading(tokens)}>{group.heading}</Text> : null}
            {group.items.map((item, ii) => {
              flat += 1;
              const index = flat;
              const isActive = index === activeIndex;
              return (
                <Pressable
                  key={`item-${gi}-${ii}`}
                  nativeID={optionId(index)}
                  ref={(node) => {
                    if (node) results.rowRefs.current.set(optionId(index), node);
                    else results.rowRefs.current.delete(optionId(index));
                  }}
                  onLayout={() => results.onRowLayout(optionId(index))}
                  style={({ pressed }) => [
                    skin.rowBase,
                    // The active row always takes the brand accent highlight. The
                    // press feedback then varies per OS: web (no ripple, no dim)
                    // tints the row with the same accent fill; iOS dims to ~0.8
                    // opacity; Android shows the android_ripple state layer.
                    isActive || (pressed && skin.ripple == null && skin.rowPressedOpacity == null)
                      ? skin.rowAccent(tokens)
                      : null,
                    skin.rowPressedOpacity != null && pressed ? { opacity: skin.rowPressedOpacity } : null,
                  ]}
                  onHoverIn={() => setActive(index)}
                  onPress={() => {
                    setActive(index);
                    onSelect?.(item, index);
                    setOpen(false);
                  }}
                  android_ripple={ripple}
                  role="option"
                  aria-selected={isActive}
                >
                  {item.icon != null ? <Icon {...{ [item.icon]: true }} size={skin.iconSize} decorative /> : null}
                  <Text style={skin.rowLabel(tokens)}>{item.label}</Text>
                  {item.shortcut != null ? <Kbd>{item.shortcut}</Kbd> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
        </View>
        </OverlayScrollView>

        {footer ? (
          <View style={s.footerBar(tokens)}>
            <View style={s.footerHint}>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <Text style={s.footerText(tokens)}>to navigate</Text>
            </View>
            <View style={s.footerHint}>
              <Kbd>↵</Kbd>
              <Text style={s.footerText(tokens)}>to select</Text>
            </View>
            <View style={s.footerHint}>
              <Kbd>esc</Kbd>
              <Text style={s.footerText(tokens)}>to close</Text>
            </View>
          </View>
        ) : null}
      </>
    );

    // Bare (trigger-less) mode: the card IS the root and carries the testID. The
    // early return above already gated it on `open`, so it renders open here; the
    // per-OS `cardShape` layers the iOS continuous corner over the shared card.
    if (!trigger) {
      return (
        <GlassSurface testID={testID} style={[s.card(tokens), skin.cardShape, focusFrame.ring()]}>
          <FocusFrameContext.Provider value={focusFrame.target}>{cardContent}</FocusFrameContext.Provider>
        </GlassSurface>
      );
    }

    // Every skin keeps the Search trigger transparent and outlined. It inherits
    // its host; the palette owns the functional material and Kbd owns its keycap.
    // Trigger mode: the collapsed full-width search trigger, with the palette card
    // portaled below it through AnchoredOverlay (gap 12 = the old mt-3). When an
    // OverlayProvider hosts it the card floats OVER the page with an outside-tap
    // dismiss backdrop; with no provider it falls back to the inline absolute
    // anchor (s.cardFloating). The wrapper still lifts its own stacking context
    // while open for that inline-fallback case.
    return (
      <View ref={triggerRef} testID={testID} style={[s.triggerWrapper, open && !host ? s.triggerWrapperLifted : null, style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          aria-expanded={open}
          style={[s.triggerRow(tokens), { minHeight: skin.triggerMinHeight, borderColor: skin.triggerBorder(tokens) }]}
          onPress={() => setOpen(!open)}
        >
          <Icon search muted size={14} />
          <Text style={s.triggerLabel(tokens)}>Search...</Text>
          <Kbd keys="⌘ K" style={s.triggerKbd} />
        </Pressable>
        <AnchoredOverlay
          onAccessibilityEscape={escapeScope.onAccessibilityEscape}
          ownsScroll
          onCardMount={() => searchRef.current?.focus?.()}
          open={open}
          onDismiss={() => setOpen(false)}
          triggerRef={triggerRef}
          gap={12}
          cardStyle={[s.card(tokens), skin.cardShape]}
          cardWidth={s.CARD_WIDTH}
          inlineStyle={s.cardFloating}
          // A controlled `open` with no onOpenChange can never actually close, so
          // the hosted dismiss backdrop is skipped (it would only block the page).
          dismissable={openProp === undefined || onOpenChange !== undefined}
        >
          <EscapeLayerProvider scope={escapeScope}>
          {cardContent}
        </EscapeLayerProvider>
        </AnchoredOverlay>
      </View>
    );
  };
}
