import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useHover } from "../../style/hover.js";
import { View, Pressable, Text, RippleClip, cornerRadii, isRTL, pressDim, useControllableState, useMinTargetSlop, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import { Icon } from "../icon/icon.js";
import * as s from "./pagination.styles.js";
import { type Size, type PaginationSkin } from "./pagination.styles.js";

// Shared Pagination shell. The structure (numbered / compact / with-size
// variants, the windowing math, the clamp + go handler, the size-selector
// cycling), the accessibility, and the variant/size precedence live here once; a
// platform file supplies only its skin (the cells, the current page's fill, the
// inks, the hover and press feedback, the touch target) and calls createPagination.
// No platform has a pagination control, so all three pass the same skin today.
//
// Pagination is page-of-N navigation for tables and lists: a horizontal row of
// page-number buttons flanked by Previous/Next arrows, with the current page
// highlighted. When there are too many pages to show at once, the middle is
// truncated with an ellipsis, keeping the first page, the last page, and a small
// window around the current page.
//
// Boolean-prop API across two axes (mirrors Button's intentOf precedence; first
// match wins within an axis, axes are orthogonal):
//   - Variant: `withSize` prepends a "Rows per page" size selector to the
//     compact Prev/Next + "Page X of N" layout; `compact` collapses the number
//     row to just Prev/Next plus a "Page X of N" label; the default is the full
//     numbered row. Precedence when more than one is passed: withSize, then
//     compact, then the numbered default.
//   - Size: `small`, `large` (omit for the default, medium size).
//
// The arrows, the selector's caret and the truncation gap are kit Icons (chevrons
// and an ellipsis). The arrows point along the reading direction, so under a
// right-to-left layout Previous points right.

export interface PaginationProps {
  /** Current page, 1-based (CONTROLLED). Clamped into the 1..total range before rendering. Omit for uncontrolled use. */
  page?: number;
  /** Initial page for uncontrolled use (a bare pagination navigates on press). */
  defaultPage?: number;
  /** Total number of pages. */
  total?: number;
  /** Fired with the next 1-based page when a control or number is pressed. */
  onChange?: (page: number) => void;
  /**
   * Total number of items across all pages. When set, the compact and with-size
   * indicator reads "Showing X-Y of N" (the item range on the current page)
   * instead of "Page X of N", computed from the current page and the page size.
   */
  itemCount?: number;

  // Variant (pick one; default is the full numbered row).
  /** Collapse to Prev/Next plus a "Page X of N" label, no number buttons. */
  compact?: boolean;
  /**
   * Prepend a "Rows per page" size selector to the compact Prev/Next +
   * "Page X of N" layout. Takes precedence over `compact`.
   */
  withSize?: boolean;

  // Content for the `withSize` selector.
  /** Currently selected rows-per-page value shown in the selector (CONTROLLED). Omit for uncontrolled use. */
  pageSize?: number;
  /** Initial rows-per-page value for uncontrolled use (the selector cycles on press). */
  defaultPageSize?: number;
  /** Selectable rows-per-page values; pressing the selector advances through them. */
  pageSizes?: number[];
  /** Fired with the next rows-per-page value when the selector is pressed. */
  onPageSizeChange?: (size: number) => void;

  // Size (pick one; default is the medium size).
  small?: boolean;
  large?: boolean;

  disabled?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: PaginationProps): Size {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

type Variant = "withSize" | "compact" | "numbered";

// Variant precedence when more than one is passed: first match wins.
function variantOf(p: PaginationProps): Variant {
  if (p.withSize) return "withSize";
  if (p.compact) return "compact";
  return "numbered";
}

// Sentinel inserted into the page list for a truncation gap.
const GAP = -1;

// Compute the windowed page list: first page, last page, and a one-page window
// around the current page, with GAP sentinels marking truncated stretches. For
// small totals (<= 7) every page is shown.
function pageWindow(current: number, total: number): number[] {
  if (total <= 7) {
    const all: number[] = [];
    for (let p = 1; p <= total; p++) all.push(p);
    return all;
  }
  const list: number[] = [];
  const add = (p: number) => {
    if (!list.includes(p)) list.push(p);
  };
  add(1);
  if (current > 3) list.push(GAP);
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p);
  if (current < total - 2) list.push(GAP);
  add(total);
  return list;
}

// Under glass a cell that paints a fill of its own (the current page) is a CONTROL-layer
// puck: a GlassPane paints the brand-tinted material behind its number (the Pressable
// keeps its tap, ripple and dim) and the cell drops its fill and edge (the pane carries
// them), with the number in `primary-foreground`. A cell with no fill (a resting page, the
// hairline arrows and selector, which are Dark Factory's transparent outline pills like
// the web's outline Button) stays bare, its hairline kept, as it is in solid mode.
function filled(box: ViewStyle): boolean {
  const bg = box.backgroundColor;
  return bg != null && bg !== "transparent";
}

// Where the cells sit 4px apart (the pages, and the arrows beside them or each other) the
// touch area grows vertically only: growing sideways would overlap the neighbour's. The
// compact arrows sit beside text and grow both ways.
const ABUTTING = { axis: "vertical" } as const;

/** The chevron an arrow draws: it points along the reading direction, so Previous points right under right-to-left. */
export function arrowIcon(direction: "previous" | "next", rtl: boolean): "chevronLeft" | "chevronRight" {
  return (direction === "previous") !== rtl ? "chevronLeft" : "chevronRight";
}

/** Build a Pagination component from a platform skin. */
export function createPagination(skin: PaginationSkin) {
  const hoverLook = skin.hover;

  interface ArrowProps {
    direction: "previous" | "next";
    size: Size;
    disabled: boolean;
    /** Another cell sits 4px away, so the touch area grows vertically only. */
    abutting: boolean;
    onPress: () => void;
  }

  // A Previous/Next arrow: a chevron in a circle, no number.
  function Arrow({ direction, size, disabled, abutting, onPress }: ArrowProps) {
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    const box = skin.controlBox(tokens);
    const target = useMinTargetSlop(skin.minTarget, abutting ? ABUTTING : undefined);
    const { hovered, target: hoverTarget } = useHover(hoverLook != null);
    const ink = skin.controlLabel(tokens, disabled).color as string;
    return (
      // The rounded cell's bounded Android ripple is clipped to its corners by this RippleClip
      // parent (no-op on iOS/web), which is also the hover target: it never moves. A same-node
      // overflow:"hidden" cannot clip a node's own ripple. See src/style/ripple-clip.
      <RippleClip shape={cornerRadii(box)} {...hoverTarget}>
        <Pressable
          style={({ pressed }) => [
            box,
            s.arrowSize[size],
            hovered && !disabled && hoverLook ? hoverLook(tokens) : null,
            pressDim(pressed, skin.pressedOpacity),
          ]}
          onPress={onPress}
          disabled={disabled}
          {...target}
          android_ripple={skin.ripple ? skin.ripple(tokens, false) : undefined}
          accessibilityRole="button"
          accessibilityLabel={direction === "previous" ? "Previous page" : "Next page"}
          accessibilityState={{ disabled }}
          aria-disabled={disabled}
        >
          <Icon {...{ [arrowIcon(direction, isRTL())]: true }} decorative size={s.iconSize[size]} color={ink} />
        </Pressable>
      </RippleClip>
    );
  }

  interface PageProps {
    page: number;
    selected: boolean;
    size: Size;
    disabled: boolean;
    onPress: () => void;
  }

  // A numbered page. The current page is the brand pill (a brand puck under glass); a
  // resting page is bare and takes the hover wash.
  function Page({ page, selected, size, disabled, onPress }: PageProps) {
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    const box = skin.pageBox(tokens, selected, disabled);
    const puck = isGlass(theme) && filled(box);
    const target = useMinTargetSlop(skin.minTarget, ABUTTING);
    const { hovered, target: hoverTarget } = useHover(hoverLook != null && !selected);
    return (
      <RippleClip shape={cornerRadii(box)} {...hoverTarget}>
        <Pressable
          style={({ pressed }) => [
            filled(box) ? paneStyle(theme, box) : box,
            s.itemSize[size],
            hovered && !disabled && hoverLook ? hoverLook(tokens) : null,
            pressDim(pressed, skin.pressedOpacity),
          ]}
          onPress={onPress}
          disabled={disabled}
          {...target}
          android_ripple={skin.ripple ? skin.ripple(tokens, selected) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Page ${page}`}
          accessibilityState={{ selected, disabled }}
          aria-current={selected ? "page" : undefined}
          aria-disabled={disabled}
        >
          {puck ? <GlassPane static layer="control" shape={box} brand={tokens.primary} /> : null}
          <Text style={[skin.pageLabel(tokens, selected, disabled), s.labelSize[size], puck ? { color: tokens["primary-foreground"] } : null]}>{page}</Text>
        </Pressable>
      </RippleClip>
    );
  }

  interface SelectorProps {
    value: number;
    size: Size;
    disabled: boolean;
    onPress: () => void;
  }

  // The rows-per-page trigger: the value and a chevron in a hairline pill. There is no
  // menu: it advances through `pageSizes` on press.
  function Selector({ value, size, disabled, onPress }: SelectorProps) {
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    const box = skin.selectorBox(tokens);
    const target = useMinTargetSlop(skin.minTarget);
    const { hovered, target: hoverTarget } = useHover(hoverLook != null);
    return (
      <RippleClip shape={cornerRadii(box)} {...hoverTarget}>
        <Pressable
          style={({ pressed }) => [
            box,
            s.selectorSize[size],
            hovered && !disabled && hoverLook ? hoverLook(tokens) : null,
            pressDim(pressed, skin.pressedOpacity),
          ]}
          onPress={onPress}
          disabled={disabled}
          {...target}
          android_ripple={skin.ripple ? skin.ripple(tokens, false) : undefined}
          accessibilityRole="button"
          accessibilityLabel="Rows per page"
          accessibilityState={{ disabled }}
          aria-disabled={disabled}
        >
          <Text style={[skin.controlLabel(tokens, disabled), s.labelSize[size]]}>{value}</Text>
          <Icon chevronDown decorative size={s.iconSize[size]} color={skin.mutedLabel(tokens).color as string} />
        </Pressable>
      </RippleClip>
    );
  }

  return function Pagination(props: PaginationProps) {
    const { onChange, testID, style } = props;
    const disabled = !!props.disabled;
    const size = sizeOf(props);
    const variant = variantOf(props);
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
    const muted = [skin.mutedLabel(tokens), s.labelSize[size]];

    // Clamp inputs so the control never renders an out-of-range current page.
    const total = Math.max(1, Math.floor(props.total ?? 1));
    // Controlled when `page` is provided, self-managed otherwise, so Prev/Next and
    // the numbered buttons actually move the current page instead of no-op'ing.
    const [page, setPage] = useControllableState<number>(props.page, props.defaultPage ?? 1);
    const current = Math.min(Math.max(1, Math.floor(page)), total);
    // Rows-per-page selector: controlled via `pageSize`, self-managed otherwise so
    // pressing it cycles the value on screen.
    const sizes = props.pageSizes ?? [10, 25, 50];
    const [pageSize, setPageSize] = useControllableState<number>(props.pageSize, props.defaultPageSize ?? sizes[0] ?? 10);

    const atStart = current <= 1;
    const atEnd = current >= total;

    // The compact/with-size indicator: an item range ("Showing X-Y of N") when
    // itemCount is supplied, otherwise the page count ("Page X of N").
    const indicatorLabel =
      props.itemCount != null
        ? `Showing ${props.itemCount === 0 ? 0 : (current - 1) * pageSize + 1}-${Math.min(current * pageSize, props.itemCount)} of ${props.itemCount}`
        : `Page ${current} of ${total}`;

    const go = (next: number) => {
      if (disabled) return;
      const clamped = Math.min(Math.max(1, next), total);
      if (clamped !== current) {
        setPage(clamped);
        onChange?.(clamped);
      }
    };

    const abutting = variant !== "compact";
    const prev = <Arrow direction="previous" size={size} disabled={disabled || atStart} abutting={abutting} onPress={() => go(current - 1)} />;
    const next = <Arrow direction="next" size={size} disabled={disabled || atEnd} abutting={abutting} onPress={() => go(current + 1)} />;

    // Compact: Prev/Next bracketing a "Page X of N" indicator, no number buttons.
    if (variant === "compact") {
      return (
        <View testID={testID} style={[s.compactRow, style]}>
          {prev}
          <Text style={muted}>{indicatorLabel}</Text>
          {next}
        </View>
      );
    }

    // With-size: a "Rows per page" selector ahead of the compact indicator and the
    // Prev/Next controls. The selector is a closed trigger (value + caret) that
    // advances through `pageSizes` on press.
    if (variant === "withSize") {
      const cycleSize = () => {
        if (disabled) return;
        const i = sizes.indexOf(pageSize);
        const nextSize = sizes[(i + 1) % sizes.length];
        if (nextSize !== undefined && nextSize !== pageSize) {
          setPageSize(nextSize);
          props.onPageSizeChange?.(nextSize);
          // Changing the page size reflows the rows, so the current page can fall
          // out of range; reset to page 1 (matches the with-size Do guidance).
          go(1);
        }
      };
      return (
        <View testID={testID} style={[s.withSizeRow, style]}>
          <View style={s.selectorCluster}>
            <Text style={muted}>Rows per page</Text>
            <Selector value={pageSize} size={size} disabled={disabled} onPress={cycleSize} />
          </View>
          <Text style={muted}>{indicatorLabel}</Text>
          <View style={s.controlPair}>
            {prev}
            {next}
          </View>
        </View>
      );
    }

    // Numbered (default): a windowed row of page buttons with ellipsis gaps.
    const window = pageWindow(current, total);

    return (
      <View testID={testID} style={[s.numberedRow, style]}>
        {prev}
        {window.map((p, i) =>
          p === GAP ? (
            <View key={`gap-${i}`} style={s.gapBox}>
              <Icon moreHorizontal decorative size={s.iconSize[size]} color={skin.mutedLabel(tokens).color as string} />
            </View>
          ) : (
            <Page key={`page-${p}`} page={p} selected={p === current} size={size} disabled={disabled} onPress={() => go(p)} />
          ),
        )}
        {next}
      </View>
    );
  };
}
