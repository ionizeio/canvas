import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type View as RNView,
  type ViewProps,
} from "react-native";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useReducedMotion,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  GlassSurface,
  GlassPane,
  paneStyle,
  isGlass,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { MeasuredSelection, useMeasuredTargets } from "../../style/measured-selection.js";
import { useHorizontalScrollFocus } from "../../style/use-scroll-focus.js";

// Shared Carousel shell. The structure (a horizontally paged FlatList of slides
// with snap paging, optional overlaid prev/next arrows, and a dot indicator
// strip), the controlled-or-uncontrolled current-index state, the viewport
// measurement, the paging/scroll math, the loop/clamp navigation, and the
// accessibility live here once; a platform file supplies only its skin (the
// slide corner radius, the dot shape/size/tint, the active-dot treatment, and
// the arrow button shape + press feedback) and calls createCarousel.
//
// Slides use stable frosted content material. Arrow actions resolve their own
// liquid control material, while pictures and slide content stay sharp.
//
// Current index is controlled OR uncontrolled:
//   - Uncontrolled: omit `index`; the component tracks the current slide in
//     internal state, seeded once from `defaultIndex` (default 0).
//   - Controlled: pass `index` plus `onIndexChange`; the parent owns the slide,
//     and an effect scrolls the FlatList whenever the controlled index changes.
//
// Paging: the FlatList is `horizontal pagingEnabled`; each slide sits in a
// wrapper View sized to the measured viewport width, so a swipe snaps exactly
// one slide. The current index is read off `onMomentumScrollEnd`
// (Math.round(contentOffset.x / width)). Arrows step +/-1 (clamped, or wrapped
// when `loop`); each dot jumps straight to its slide. All width math is guarded
// against the initial width === 0 frame (the FlatList renders only once the
// viewport has measured a positive width).

// The platform-varying surface. Everything shape/color/feedback-bearing the
// slides, arrows, and dots need lives here, built from the active tokens (so
// each follows light/dark).
export interface CarouselSkin {
  /** iOS/web dim the arrow/dot on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android arrow/dot ripple; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;
  /**
   * @deprecated Retained for skin compatibility. Keyboard focus stays visible.
   */
  focusOutlineReset?: ViewStyle;

  /**
   * Whether the overlaid prev/next arrows show when the `showArrows` prop is
   * unset. Platform-adaptive: on for web (Embla), OFF for iOS (App Store cards
   * swipe with page-control dots, no overlay chrome) and Android (M3 carousel
   * anatomy is container + items only, snap-scroll navigation, no arrows). The
   * `showArrows` prop still opts them back in for pointer/iPad contexts.
   */
  defaultShowArrows: boolean;
  /**
   * Whether the dot indicator strip shows when the `showDots` prop is unset.
   * Platform-adaptive: on for web + iOS (UIPageControl idiom), OFF for Android
   * (M3 defines no position/dot indicator). The `showDots` prop opts them in.
   */
  defaultShowDots: boolean;
  /**
   * hitSlop padding each arrow's touch target out to the platform minimum
   * (>= 44pt iOS / >= 48dp Android). hitSlop never affects layout, so the visual
   * arrow size stays. Undefined on web (no touch-target minimum for a pointer).
   */
  arrowHitSlop?: number | Insets;
  /**
   * @deprecated Retained for skin compatibility. Real dotTarget bounds replace slop.
   */
  dotHitSlop?: number | Insets;

  /** The slide wrapper shape (corner radius; the content clips to it). */
  slide: (t: ColorTokens) => ViewStyle;

  /** The circular arrow button shape (size, radius, fill, border, shadow). */
  arrow: (t: ColorTokens) => ViewStyle;
  /** The chevron glyph size inside an arrow button, in px. */
  arrowIconSize: number;
  /** Extra inset of each arrow from the carousel edge, in px (left/right). */
  arrowInset: number;

  /** The dot strip layout (the centered Row below the slides). */
  dotsRow: (t: ColorTokens) => ViewStyle;
  /** Real picker bounds. Omit to use the platform minimum. */
  dotTarget?: ViewStyle;
  /** One indicator dot; `active` widens/tints it to the brand `primary`. */
  dot: (t: ColorTokens, active: boolean) => ViewStyle;

  /** The default slide-content text type (when a slide is a plain string). */
  slideText: (t: ColorTokens) => TextStyle;
}

export interface CarouselItem {
  /** Stable identity for the slide. */
  key: string;
  /** The slide body. A string renders in the skin's slide-text type; a
   *  ReactNode renders as-is. */
  content: ReactNode;
}

export interface CarouselProps {
  /** The slides, left to right. */
  items: CarouselItem[];
  /** Controlled current slide. Pair with `onIndexChange`. Omit for uncontrolled. */
  index?: number;
  /** Initial current slide for the uncontrolled case (read once; default 0). */
  defaultIndex?: number;
  /** Called with the next current index whenever the slide changes. */
  onIndexChange?: (index: number) => void;
  /** Wrap from the last slide to the first (and first to last) on arrow nav. */
  loop?: boolean;
  /** Show the overlaid prev/next chevron buttons. Default is platform-adaptive:
   *  on for web, off for iOS + Android (swipe idioms); pass `true` to opt in. */
  showArrows?: boolean;
  /** Show the centered dot indicators below the slides. Default is
   *  platform-adaptive: on for web + iOS (UIPageControl), off for Android M3. */
  showDots?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  { key: "one", content: "Slide 1" },
  { key: "two", content: "Slide 2" },
  { key: "three", content: "Slide 3" },
];

// Clamp `i` into [0, count-1], or wrap around when `loop` is set.
function nextIndex(i: number, count: number, loop: boolean): number {
  if (count <= 0) return 0;
  if (loop) return ((i % count) + count) % count;
  return Math.max(0, Math.min(count - 1, i));
}

/** Build a Carousel component from a platform skin. */
export function createCarousel(skin: CarouselSkin) {
  // One overlaid edge arrow (prev or next), vertically centered over the slides.
  function Arrow({
    side,
    disabled,
    onPress,
  }: {
    side: "prev" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const theme = useMaterialTheme({ layer: "control" });
    const { tokens } = theme;
    const liquid = theme.surface === "glass";
    const edge = side === "prev" ? { start: skin.arrowInset } : { end: skin.arrowInset };
    return (
      <View style={[arrowLayerStyles.layer, edge]}>
        <Pressable
          onPress={disabled ? undefined : onPress}
          disabled={disabled}
          hitSlop={skin.arrowHitSlop}
          android_ripple={skin.ripple && !disabled ? skin.ripple(tokens) : undefined}
          accessibilityRole="button"
          accessibilityLabel={side === "prev" ? "Previous slide" : "Next slide"}
          accessibilityState={{ disabled }}
          aria-disabled={disabled}
          style={({ pressed }) => [
            paneStyle(theme, skin.arrow(tokens)),
            !liquid && disabled ? DISABLED_DIM : null,
            !liquid && skin.pressedOpacity != null && pressed && !disabled ? { opacity: skin.pressedOpacity } : null,
          ]}
        >
          {({ pressed }) => <>
            <GlassPane layer="control" shape={skin.arrow(tokens)} interactive />
            <View style={liquid ? disabled ? DISABLED_DIM : pressed && skin.pressedOpacity != null ? { opacity: skin.pressedOpacity } : null : null}>
              {side === "prev" ? (
                <Icon chevronLeft muted decorative size={skin.arrowIconSize} />
              ) : (
                <Icon chevronRight muted decorative size={skin.arrowIconSize} />
              )}
            </View>
          </>}
        </Pressable>
      </View>
    );
  }

  return function Carousel(props: CarouselProps) {
    const {
      items = DEFAULT_ITEMS,
      index,
      defaultIndex = 0,
      onIndexChange,
      loop = false,
      showArrows,
      showDots,
      testID,
      style,
    } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const reduced = useReducedMotion();
    const count = items.length;

    // Arrow/dot visibility is platform-adaptive: the prop wins when set, else the
    // skin's default (web shows both; iOS shows dots only; Android shows neither).
    const arrowsVisible = showArrows ?? skin.defaultShowArrows;
    const dotsVisible = showDots ?? skin.defaultShowDots;

    // Uncontrolled store, seeded once from defaultIndex; ignored when controlled.
    const [internal, setInternal] = useState(() => nextIndex(defaultIndex, count, false));
    const controlled = index !== undefined;
    const current = nextIndex(controlled ? index! : internal, count, false);
    const currentRef = useRef(current);
    currentRef.current = current;
    useEffect(() => {
      if (!controlled && internal !== current) setInternal(current);
    }, [controlled, internal, current]);

    // Under glass the active dot's brand mark travels between the dots as one
    // measured marker (ink, like the dots themselves: there is no material to
    // refract at dot size) while the dots and their press targets stay still.
    // The marker follows the COMMITTED slide, the same `current` the arrows, the
    // keyboard, a controlled index and a finished swipe settle on; it does not
    // track drag progress. Each dot's press target is measured against the dots
    // row (the targets keep their size whichever dot is active, so their frames
    // hold while the active dot itself widens), and the marker takes the skin's
    // active dot size centred on that target. The dot beneath the marker renders
    // as an inactive dot, so the strip never shows two brand marks in flight. A
    // change of the slide set (count or keys) or of the strip's visibility
    // re-measures the targets (useMeasuredTargets) and resets the marker in
    // place; a loop from the last slide to the first travels back along the
    // strip, over nothing but the dots.
    const dotsShown = dotsVisible && count > 1;
    const dotsStructure = JSON.stringify([dotsShown, items.map((item) => item.key)]);
    const dotsRowRef = useRef<RNView>(null);
    const dotTargets = useMeasuredTargets<number>(dotsStructure, dotsRowRef);
    const dotGlass = isGlass(theme);
    const activeDot = skin.dot(tokens, true);
    const { layout: currentTarget, resetKey: markerResetKey } = dotTargets.target("marker", current);
    const markerLayout =
      currentTarget && typeof activeDot.width === "number" && typeof activeDot.height === "number"
        ? {
            x: currentTarget.x + (currentTarget.width - activeDot.width) / 2,
            y: currentTarget.y + (currentTarget.height - activeDot.height) / 2,
            width: activeDot.width,
            height: activeDot.height,
          }
        : undefined;
    const markerCarries = dotGlass && dotsShown && markerLayout != null;
    const marker = markerCarries ? (
      <MeasuredSelection layout={markerLayout} enabled resetKey={markerResetKey} testID={testID ? `${testID}-dot-motion` : undefined}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: activeDot.borderRadius, backgroundColor: activeDot.backgroundColor }]} testID={testID ? `${testID}-dot-marker` : undefined} />
      </MeasuredSelection>
    ) : null;


    // The measured viewport width. Width math is guarded against this 0 frame:
    // the FlatList renders only once a positive width has been measured.
    const [width, setWidth] = useState(0);
    const listRef = useRef<FlatList<CarouselItem>>(null);
    const { onContentSizeChange: reportContentSize, ...scrollFocus } = useHorizontalScrollFocus();
    const [contentWidth, setContentWidth] = useState(0);
    const commanded = useRef<{ index: number; width: number; count: number } | null>(null);
    const onContentSizeChange = useCallback((content: number, height: number) => {
      reportContentSize(content, height);
      setContentWidth(content);
    }, [reportContentSize]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
      const layout = e.nativeEvent.layout;
      if (!layout) return;
      const w = layout.width;
      setWidth((prev) => (prev !== w ? w : prev));
    }, []);

    // Scroll the list to a slide index (no-op until the viewport has measured).
    // Reduce Motion jumps to the slide instead of animating the scroll.
    const scrollTo = useCallback(
      (i: number, animated: boolean) => {
        if (width <= 0 || count === 0 || Math.abs(contentWidth - count * width) > 1) return;
        commanded.current = { index: i, width, count };
        listRef.current?.scrollToOffset({ offset: i * width, animated: animated && !reduced });
      },
      [width, contentWidth, count, reduced],
    );

    // Commit a new current index: update the uncontrolled store, notify the
    // parent, and (when uncontrolled) scroll the list to the slide.
    const goTo = useCallback(
      (i: number, animated = true) => {
        const target = nextIndex(i, count, loop);
        if (count === 0 || target === currentRef.current) return;
        if (!controlled) {
          currentRef.current = target;
          setInternal(target);
          scrollTo(target, animated);
        }
        onIndexChange?.(target);
      },
      [count, loop, controlled, onIndexChange, scrollTo],
    );

    // Keep the scroll position in sync with a controlled `index` and after the
    // viewport first measures (so the initial slide is correct when width lands).
    useEffect(() => {
      // A key or picker already issued the command before changing state.
      // Avoid replacing its animation with an immediate duplicate command.
      if (commanded.current?.index === current && commanded.current.width === width && commanded.current.count === count) return;
      scrollTo(current, false);
    }, [current, width, count, scrollTo]);

    // Read the settled page off the momentum end and report it upward.
    const onMomentumScrollEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (width <= 0) return;
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        const target = nextIndex(i, count, false);
        if (target === currentRef.current) return;
        if (!controlled) {
          currentRef.current = target;
          commanded.current = { index: target, width, count };
          setInternal(target);
        }
        onIndexChange?.(target);
      },
      [width, controlled, onIndexChange, count],
    );

    const keyboardProps = {
      onKeyDown(event: {
        key: string; defaultPrevented: boolean; isComposing?: boolean; keyCode?: number;
        nativeEvent?: { isComposing?: boolean; keyCode?: number };
        target: unknown; currentTarget: unknown; preventDefault: () => void;
      }) {
        if (count <= 1 || event.defaultPrevented || event.target !== event.currentTarget
          || event.isComposing || event.nativeEvent?.isComposing
          || event.keyCode === 229 || event.nativeEvent?.keyCode === 229) return;
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") goTo(0);
        else if (event.key === "End") goTo(count - 1);
        else goTo(currentRef.current + (event.key === "ArrowRight" ? 1 : -1));
      },
    } as unknown as ViewProps;

    const atStart = current <= 0;
    const atEnd = current >= count - 1;
    const prevDisabled = !loop && atStart;
    const nextDisabled = !loop && atEnd;

    // One slide's body (a string renders in the skin type; a ReactNode renders as-is).
    const slideBody = (item: CarouselItem) =>
      typeof item.content === "string" ? (
        <Text style={skin.slideText(tokens)}>{item.content}</Text>
      ) : (
        item.content
      );

    return (
      <View testID={testID} style={[ROOT, style]}>
        <View style={VIEWPORT} onLayout={onLayout}>
          {width > 0 ? (
            <FlatList
              {...scrollFocus}
              {...keyboardProps}
              onContentSizeChange={onContentSizeChange}
              ref={listRef}
              data={items}
              // Pin the scroll container to the measured viewport width. Without a
              // DEFINITE width the horizontal list reports its intrinsic size (the
              // sum of the slides, each itself sized to the measured width) up to the
              // viewport, so in a shrink-to-content parent the viewport width feeds
              // back into the slide width and diverges (the browser clamps the runaway
              // at its ~2^24 layout cap, pushing every slide off-screen). A definite
              // width caps that contribution and keeps slide N at N * width.
              style={{ width }}
              keyExtractor={(item) => item.key}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              initialScrollIndex={current}
              onMomentumScrollEnd={onMomentumScrollEnd}
              renderItem={({ item }) => (
                <GlassSurface layer="content" style={[{ width }, skin.slide(tokens)]}>{slideBody(item)}</GlassSurface>
              )}
            />
          ) : items[current] ? (
            // Pre-measurement fallback: the current slide, full-bleed, so the carousel
            // is NEVER blank even if onLayout is delayed or does not fire (some web
            // layout contexts). The paged, swipeable FlatList replaces this the moment
            // a positive width lands; the arrows/dots already page by swapping `current`.
            // Guarded on a present item so an empty `items=[]` renders an empty
            // viewport instead of dereferencing `undefined.content`.
            <GlassSurface layer="content" style={skin.slide(tokens)}>{slideBody(items[current])}</GlassSurface>
          ) : null}

          {arrowsVisible && count > 1 ? (
            <>
              <Arrow side="prev" disabled={prevDisabled} onPress={() => goTo(currentRef.current - 1)} />
              <Arrow side="next" disabled={nextDisabled} onPress={() => goTo(currentRef.current + 1)} />
            </>
          ) : null}
        </View>

        {dotsShown ? (
          <View ref={dotsRowRef} role="group" accessibilityLabel="Choose a slide" style={skin.dotsRow(tokens)}>
            {marker}
            {items.map((item, i) => (
              <Pressable
                key={item.key}
                ref={dotTargets.register(i)}
                onLayout={() => dotTargets.measure(i)}
                onPress={() => goTo(i)}
                android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`Slide ${i + 1} of ${count}${i === current ? ", current slide" : ""}`}
                accessibilityState={{ selected: i === current }}
                aria-current={i === current ? "true" : "false"}
                style={({ pressed }) => [
                  skin.dotTarget ?? DEFAULT_DOT_TARGET,
                  skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
                ]}
              >
                <View style={skin.dot(tokens, i === current && !markerCarries)} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };
}

// w-full container; the slides sit over the viewport, the dots below. alignSelf
// stretch makes it fill a flex-column parent; minWidth keeps the carousel usable
// when it lands in a shrink-to-content parent (where `width:100%` would otherwise
// collapse it to the slide's min-content width). It still fills any wider parent.
const ROOT: ViewStyle = { width: "100%", alignSelf: "stretch", minWidth: 240 };

// The paged viewport; overflow is hidden so a half-snapped slide never leaks.
const VIEWPORT: ViewStyle = { width: "100%", alignSelf: "stretch", overflow: "hidden", position: "relative" };

// The absolute layer an arrow centers within (full height, pinned to one edge).
// box-none via StyleSheet.create (not an inline `{ pointerEvents }` object) so
// react-native-web compiles its pointer-events polyfill: the full-height edge
// column is transparent to taps, only the arrow Pressable inside it captures. An
// inline literal is dropped by RNW, leaving the edge column swallowing clicks over
// the slides. Native honors box-none either way.
const arrowLayerStyles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    pointerEvents: "box-none",
  },
});

// opacity-40: the dimmed disabled look applied per end arrow.
const DISABLED_DIM: ViewStyle = { opacity: 0.4 };

const DEFAULT_DOT_TARGET: ViewStyle = {
  minWidth: Platform.OS === "ios" ? 44 : Platform.OS === "android" ? 48 : 24,
  height: Platform.OS === "ios" ? 44 : Platform.OS === "android" ? 48 : 24,
  alignItems: "center",
  justifyContent: "center",
};
