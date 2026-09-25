import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  type Insets,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from "react-native";
import {
  View,
  Text,
  Pressable,
  useReducedMotion,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  GlassSurface,
  GlassPane,
  paneStyle,
} from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { useHorizontalScrollFocus } from "../../style/use-scroll-focus.js";
import { useIsomorphicLayoutEffect } from "../../style/use-isomorphic-layout-effect.js";

// Shared Carousel shell. The structure (a horizontally paged ScrollView of slides
// with snap paging, optional prev/next arrows beside the slides, and a dot indicator
// strip), the controlled-or-uncontrolled current-index state, the viewport
// measurement, the paging/scroll math, the loop/clamp navigation, and the
// accessibility live here once; a platform file supplies only its skin (the
// slide corner radius, the dot shape/size/tint, the active-dot treatment, and
// the arrow button shape + press feedback) and calls createCarousel.
//
// Slides use stable frosted content material. Arrow actions resolve their own
// liquid control material, while pictures and slide content stay sharp.
//
// Each slide is itself the card surface (the skin's fill, hairline, corner radius and
// clip), so its content fills it inside that 1px edge: a picture is masked to the
// slide's shape, and a plain-string slide is inset by the skin's `slidePadding`. The arrows sit BESIDE the
// slides, never over them: the shadcn/Embla anatomy the web skin ports hangs them
// outside the track, and an arrow laid over a slide covers whatever the slide holds
// near its edge (a title, a picture's subject). The track is a row of [prev arrow]
// [slides][next arrow] inside the carousel's own bounds, so the slides narrow by the
// two arrow gutters rather than the arrows overflowing a parent. The DOM, and so the
// Tab and screen-reader order, follows what is on screen: prev, slides, next, dots.
//
// Current index is controlled OR uncontrolled:
//   - Uncontrolled: omit `index`; the component tracks the current slide in
//     internal state, seeded once from `defaultIndex` (default 0).
//   - Controlled: pass `index` plus `onIndexChange`; the parent owns the slide,
//     and an effect scrolls the list whenever the controlled index changes.
//
// Paging: the slides sit in a `horizontal pagingEnabled` ScrollView, each sized to
// the measured viewport width, so a swipe snaps exactly one slide. The current
// index is read off `onMomentumScrollEnd` (Math.round(contentOffset.x / width)).
// Arrows step +/-1 (clamped, or wrapped when `loop`); each dot jumps straight to
// its slide. All width math is guarded against a width of 0.
//
// Every slide is mounted from the first frame, and measuring changes styles only.
// Until the viewport has a width (the first frame, a server render, a hidden
// viewport) the current slide fills it and the others wait hidden; once it has one,
// every slide takes that width. Swapping a stand-in slide for the list, or the list
// for a stand-in, would remount the slide's content and drop its state (a field's
// text, a playing video) after the first layout and on every hide. The list is a
// ScrollView rather than a FlatList for the same reason: a carousel holds a handful
// of slides, and windowing would unmount the ones outside its window.

// The platform-varying surface. Everything shape/color/feedback-bearing the
// slides, arrows, and dots need lives here, built from the active tokens (so
// each follows light/dark).
export interface CarouselSkin {
  /** iOS/web dim the arrow/dot on press; Android uses a ripple instead (null). */
  pressedOpacity: number | null;
  /** Android arrow/dot ripple; null on iOS/web. */
  ripple: ((t: ColorTokens) => { color: string; borderless: boolean }) | null;

  /**
   * Whether the prev/next arrows show when the `showArrows` prop is
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
  /** The inset around a plain-string slide's text, in px. A ReactNode slide fills the
   *  slide inside its edge (a picture is masked to its shape), so it brings its own. */
  slidePadding: number;

  /** The circular arrow button shape (size, radius, fill, border, shadow). */
  arrow: (t: ColorTokens) => ViewStyle;
  /** The chevron glyph size inside an arrow button, in px. */
  arrowIconSize: number;
  /**
   * Space between the carousel's outer edge and each arrow, in px. At least the
   * arrow's horizontal hitSlop, so the touch area stays inside the carousel's own
   * bounds: a clipping ancestor it fills (a full-width ScrollView) would cut it.
   */
  arrowInset: number;
  /**
   * Space between each arrow and the slides, in px. At least the arrow's horizontal
   * hitSlop, so the arrow's touch area never reaches over a slide.
   */
  arrowGap: number;

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
  /** Show the prev/next chevron buttons beside the slides. Default is platform-adaptive:
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
  // The skin's arrow gutters: the outer inset, then the arrow, then the gap to the slides.
  const trackWithArrows: ViewStyle = { ...TRACK, paddingHorizontal: skin.arrowInset, gap: skin.arrowGap };
  const slideTextInset: TextStyle = { padding: skin.slidePadding };

  // One edge arrow (prev or next) in its own cell of the track row, vertically
  // centered on the slides beside it.
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
    return (
      <View style={ARROW_CELL}>
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
    const { tokens } = useMaterialTheme({ layer: "content" });
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

    // The measured viewport width. Width math is guarded against 0: the first
    // frame, a server render, and a hidden viewport, where only the current slide
    // shows, filling the viewport.
    const [width, setWidth] = useState(0);
    const measured = width > 0;
    const listRef = useRef<ScrollView>(null);
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
        listRef.current?.scrollTo({ x: i * width, y: 0, animated: animated && !reduced });
      },
      [width, contentWidth, count, reduced],
    );

    // A new slide width (the first measurement, a resize, a hidden viewport shown
    // again) moves every slide, so put the current one back in view before the frame
    // paints. The list has just been laid out at this width, so the offset is valid
    // without waiting for the content size to report.
    //
    // Leaving the unmeasured layout takes a real move. Unmeasured, every slide's snap
    // cell sits at offset 0, so each counts as snapped there, and a browser that
    // re-snaps to the previously snapped box after a layout change (the CSS Scroll
    // Snap rule; WebKit picks among equals in hash order) can then jump to any slide.
    // A scroll that lands where the list already is does not move, and so snaps
    // nothing: when the current slide sits at 0, a 1px step first makes landing on
    // it a move. The step stays inside the current slide's page because iOS reports
    // every non-animated scroll as a momentum end, which reads the page back.
    const measuredBefore = useRef(false);
    useIsomorphicLayoutEffect(() => {
      if (width <= 0 || count === 0) {
        measuredBefore.current = false;
        return;
      }
      const x = currentRef.current * width;
      commanded.current = { index: currentRef.current, width, count };
      if (!measuredBefore.current && x === 0 && count > 1) {
        listRef.current?.scrollTo({ x: 1, y: 0, animated: false });
      }
      listRef.current?.scrollTo({ x, y: 0, animated: false });
      measuredBefore.current = true;
    }, [width, count]);

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

    // One slide's body (a string renders in the skin type, inset from the slide's
    // edge; a ReactNode renders as-is).
    const slideBody = (item: CarouselItem) =>
      typeof item.content === "string" ? (
        <Text style={[skin.slideText(tokens), slideTextInset]}>{item.content}</Text>
      ) : (
        item.content
      );

    const arrowsShown = arrowsVisible && count > 1;

    return (
      <View testID={testID} style={[ROOT, style]}>
        <View style={arrowsShown ? trackWithArrows : TRACK}>
          {arrowsShown ? <Arrow side="prev" disabled={prevDisabled} onPress={() => goTo(currentRef.current - 1)} /> : null}
          <View style={VIEWPORT} onLayout={onLayout}>
            <ScrollView
              {...scrollFocus}
              {...keyboardProps}
              onContentSizeChange={onContentSizeChange}
              ref={listRef}
              // Pin the scroll container to the measured viewport width. Without a
              // DEFINITE width the horizontal list reports its intrinsic size (the
              // sum of the slides, each itself sized to the measured width) up to the
              // viewport, so in a shrink-to-content parent the viewport width feeds
              // back into the slide width and diverges (the browser clamps the runaway
              // at its ~2^24 layout cap, pushing every slide off-screen). A definite
              // width caps that contribution and keeps slide N at N * width. Before
              // the viewport measures, its column stretches the list to its width.
              style={measured ? { width } : null}
              contentContainerStyle={measured ? null : UNMEASURED_CONTENT}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
            >
              {items.map((item, i) => (
                <GlassSurface
                  key={item.key}
                  layer="content"
                  style={[measured ? { width } : i === current ? null : HIDDEN_SLIDE, skin.slide(tokens)]}
                >
                  {slideBody(item)}
                </GlassSurface>
              ))}
            </ScrollView>
          </View>
          {arrowsShown ? <Arrow side="next" disabled={nextDisabled} onPress={() => goTo(currentRef.current + 1)} /> : null}
        </View>

        {dotsVisible && count > 1 ? (
          <View role="group" accessibilityLabel="Choose a slide" style={skin.dotsRow(tokens)}>
            {items.map((item, i) => (
              <Pressable
                key={item.key}
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
                <View style={skin.dot(tokens, i === current)} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };
}

// w-full container; the track (the slides between their arrows) above the dots. alignSelf
// stretch makes it fill a flex-column parent; minWidth keeps the carousel usable
// when it lands in a shrink-to-content parent (where `width:100%` would otherwise
// collapse it to the slide's min-content width). It still fills any wider parent.
const ROOT: ViewStyle = { width: "100%", alignSelf: "stretch", minWidth: 240 };

// The track: [prev arrow][viewport][next arrow] in one row, each arrow cell as tall
// as the slides. Without arrows the viewport is the whole row. Layout only (no paint,
// no handlers), so native flattens it away and it never stops an arrow's touch slop.
const TRACK: ViewStyle = { flexDirection: "row", alignItems: "stretch" };

// The paged viewport takes the row's remainder; overflow is hidden so a half-snapped
// slide never leaks. minWidth 0 lets it shrink below the slides' intrinsic width. The
// basis is AUTO, not 0: Yoga has no min-content floor, so a basis-0 viewport would
// contribute nothing to a content-sized parent and collapse the carousel to its
// minWidth on native (the same trap splitSurfaceStyle's clip box documents), while
// the list pinned to the measured width keeps an auto basis from feeding back.
const VIEWPORT: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "auto", minWidth: 0, overflow: "hidden" };

// Before the viewport measures, the slides stack in a column exactly the scrollport's
// width, so the current one stretches to fill it without a px width. A percentage
// width would not do: on the web a paged ScrollView wraps each slide in its own
// snap cell, and the slide would resolve the percentage against that content-sized
// cell instead of the scrollport.
const UNMEASURED_CONTENT: ViewStyle = { flexDirection: "column", width: "100%" };

// A slide waiting, unmeasured, behind the current one: mounted but not laid out.
const HIDDEN_SLIDE: ViewStyle = { display: "none" };

// An arrow's cell: hugs the arrow and centers it on the slides beside it.
const ARROW_CELL: ViewStyle = { justifyContent: "center" };

// opacity-40: the dimmed disabled look applied per end arrow.
const DISABLED_DIM: ViewStyle = { opacity: 0.4 };

const DEFAULT_DOT_TARGET: ViewStyle = {
  minWidth: Platform.OS === "ios" ? 44 : Platform.OS === "android" ? 48 : 24,
  height: Platform.OS === "ios" ? 44 : Platform.OS === "android" ? 48 : 24,
  alignItems: "center",
  justifyContent: "center",
};
