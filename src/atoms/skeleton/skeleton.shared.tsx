import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { View, useReducedMotion, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, innerFill } from "../../style/index.js";

// Shared Skeleton shell. The structure (a single muted shape — text line, avatar,
// button — or a composite card / list / table scaffold built from one muted fill,
// optionally pulsing), the boolean-prop axes, the size scaling, and the muted-fill
// color logic all live here once; a platform file supplies only its skin (the corner
// radii of the line / button / avatar / card shapes) and calls createSkeleton.
//
// Skeleton is a "Shared" platform treatment: neither iOS nor Material 3 ships a real
// skeleton control (iOS uses redacted placeholder content; M3 documents skeleton
// loaders only as a motion transition pattern), so there is no native shape to match
// and the look is identical on every platform — the iOS and Android skins reference
// the web skin verbatim. The skin still exists so the architecture is uniform across
// the kit.

export type Shape = "text" | "avatar" | "button" | "card" | "list" | "table";

export interface SkeletonSkin {
  /** Corner radius of a single muted line / text placeholder. */
  lineRadius: number;
  /** Corner radius of the button-shaped placeholder. */
  buttonRadius: number;
  /** Corner radius of the avatar placeholder (fully round). */
  avatarRadius: number;
  /** Corner radius of the card scaffold surface. */
  cardRadius: number;
}

export interface SkeletonProps {
  // Shape (pick one; default is a single text line).
  text?: boolean;
  avatar?: boolean;
  button?: boolean;
  card?: boolean;
  list?: boolean;
  table?: boolean;
  // Size (pick one). Scales the line height and the avatar/button footprint.
  small?: boolean;
  large?: boolean;
  // Line length (text shape only; pick one; default spans the parent). A paragraph
  // of placeholder lines varies them so the block reads like wrapped prose.
  /** A line that runs most of the way across (80%), a mid-paragraph line. */
  long?: boolean;
  /** A short trailing line (60%), the last line of a paragraph. */
  short?: boolean;
  /** Subtle opacity pulse while content loads. */
  animate?: boolean;
  /**
   * Screen-reader label announced for the loading placeholder. Defaults to
   * "Loading". The placeholder carries a `progressbar` role + busy state so
   * assistive tech announces the pending content (matching Spinner / Progress).
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The accessibility props every Skeleton shape carries on its outermost element so
// the loading state is perceivable. `progressbar` + a busy state match the kit's
// other two loading indicators (Spinner, Progress). The `aria-busy` alias is
// mandatory: react-native-web does not forward accessibilityState to the DOM, so
// without it web screen readers would never hear the busy state. The whole shape
// announces once as a single node, so the inner muted blocks stay hidden from AT.
function loadingA11y(label: string | undefined) {
  return {
    accessibilityRole: "progressbar" as const,
    accessibilityLabel: label ?? "Loading",
    accessibilityState: { busy: true },
    "aria-busy": true,
  };
}

// Hide a composite shape's inner muted blocks from assistive tech: the wrapping
// element already announces the loading state once, so the nested fills must not
// surface as anonymous generic nodes. Mirrors the kit's established decorative-hide
// pattern (breadcrumb, input-otp): the native flags plus the `aria-hidden` web alias.
const innerHidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
  "aria-hidden": true,
};

// --- platform-neutral fill + layout fragments -------------------------------

// The muted fill every placeholder shares (was `bg-muted`); a color, so it reads
// the active token and follows light/dark. Under glass it is an ink tint, so a
// placeholder on a glass pane reads as a translucent block over the material rather
// than an opaque patch (the fill the loaded content's own inner fills take).
function fill(theme: Parameters<typeof innerFill>[0]): ViewStyle {
  return { backgroundColor: innerFill(theme, "muted", "soft") };
}

// Line height per size; the default line reads like a single row of text.
// `h-4` -> 16, `h-3` -> 12, `h-3.5` -> 14.
function lineHeight(p: { small?: boolean; large?: boolean }): ViewStyle {
  if (p.large) return { height: 16 };
  if (p.small) return { height: 12 };
  return { height: 14 };
}

// Avatar diameter per size. `w-12 h-12` -> 48, `w-8 h-8` -> 32, `w-10 h-10` -> 40.
function avatarDiameter(p: { small?: boolean; large?: boolean }): number {
  return p.large ? 48 : p.small ? 32 : 40;
}

// Button placeholder footprint per size; mirrors the real control's height.
// `h-12 w-32` -> {48,128}, `h-8 w-20` -> {32,80}, `h-9 w-28` -> {36,112}.
function buttonSize(p: { small?: boolean; large?: boolean }): { height: number; width: number } {
  if (p.large) return { height: 48, width: 128 };
  if (p.small) return { height: 32, width: 80 };
  return { height: 36, width: 112 };
}

// A single muted line base: full width, the default line height (`h-3.5`).
const lineBase: ViewStyle = { height: 14, width: "100%" };

// The card surface (sans radius, which the skin supplies): bordered card fill,
// padded, and full-width. Like the real Card it carries no width cap, so the
// placeholder fills its parent (default column stretch) and the swap to a loaded
// Card is seamless. `border border-border bg-card p-4`. Size it via the `style`
// prop (a fixed width, a flex, or a percentage) when a narrower card is wanted.
function cardSurface(tokens: ColorTokens): ViewStyle {
  return { borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 16 };
}
// Under glass the card placeholder renders the same CONTENT-layer material the loaded
// Card takes (a GlassPane behind the node, which keeps its loading role and label), so
// the swap stays seamless there too.

// The card's identity row (avatar + two lines). `flex-row items-center gap-3 mb-4`.
const cardRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 };

// The card avatar pulse (sans radius). `shrink-0 w-10 h-10`.
const cardAvatar: ViewStyle = { flexShrink: 0, width: 40, height: 40 };

// The flex column holding the avatar's two lines. `flex-1`.
const flexFill: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };

// Line widths inside the card (`w-[70%]` / `w-[40%]` / `w-[80%]`).
const cardLine70: ViewStyle = { width: "70%" };
const cardLine40: ViewStyle = { width: "40%", marginTop: 6 };
const cardLine80: ViewStyle = { width: "80%", marginTop: 6 };

// The list container: FILL (the parent picks the measure). `flex-col gap-4`.
const listContainer: ViewStyle = { flexDirection: "column", gap: 16, width: "100%", flexShrink: 1, minWidth: 0 };

// A list row. `flex-row items-center gap-3`.
const listRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 };

// The list row's avatar pulse (sans radius). `w-8 h-8`.
const listAvatar: ViewStyle = { width: 32, height: 32 };

// The list row's primary line spacing. `mb-1.5`.
const listLineGap: ViewStyle = { marginBottom: 6 };

// The list row's trailing meta line. `w-10`.
const w10: ViewStyle = { width: 40 };

// The table container: FILL (the parent picks the measure).
const tableContainer: ViewStyle = { width: "100%", flexShrink: 1, minWidth: 0 };

// A table row. `flex-row items-center gap-3 py-3`.
const tableRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 };

// The hairline divider between table rows (omitted on the last row).
function tableDivider(tokens: ColorTokens): ViewStyle {
  return { borderBottomWidth: 1, borderColor: tokens.border };
}

// The table row's trailing cell line. `w-20`.
const w20: ViewStyle = { width: 80 };

// Shape precedence when more than one is passed: first match wins.
function shapeOf(p: SkeletonProps): Shape {
  if (p.text) return "text";
  if (p.avatar) return "avatar";
  if (p.button) return "button";
  if (p.card) return "card";
  if (p.list) return "list";
  if (p.table) return "table";
  return "text";
}

/** A pulsing or static muted block. The resolved width/height/fill go on the
 *  Animated.View itself so percentage widths resolve against the real parent
 *  (a nested View would collapse `w-[60%]` against an auto-width wrapper).
 *  Extra props (accessibility flags) are spread onto the Animated.View so a
 *  single-shape Skeleton can carry its loading semantics on this outermost node. */
function Pulse({ animate, style, ...rest }: { animate?: boolean; style: StyleProp<ViewStyle> } & Record<string, unknown>) {
  const opacity = useRef(new Animated.Value(1)).current;
  // The shimmer is decorative, so honor Reduce Motion: hold the placeholder still
  // (the muted shape alone already reads as "loading").
  const reduced = useReducedMotion();
  const active = !!animate && !reduced;

  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  return <Animated.View {...rest} style={[style, { opacity: active ? opacity : 1 }]} />;
}

export function createSkeleton(skin: SkeletonSkin) {
  // A single muted line; the building block for text and the composite shapes.
  // The muted fill + the line base (`h-3.5 w-full`) + the skin's line radius, then
  // any width/margin overrides the caller layers on.
  function Line({ animate, style }: { animate?: boolean; style?: StyleProp<ViewStyle> }) {
    const theme = useMaterialTheme({ layer: "content" });
    return <Pulse animate={animate} style={[fill(theme), lineBase, { borderRadius: skin.lineRadius }, style]} />;
  }

  return function Skeleton(props: SkeletonProps) {
    const { animate, accessibilityLabel, testID, style } = props;
    const theme = useMaterialTheme({ layer: "content" });
    const { tokens } = theme;
    const shape = shapeOf(props);
    const a11y = loadingA11y(accessibilityLabel);

    if (shape === "avatar") {
      const d = avatarDiameter(props);
      return <Pulse animate={animate} {...a11y} testID={testID} style={[fill(theme), { width: d, height: d, borderRadius: skin.avatarRadius }, style]} />;
    }

    if (shape === "button") {
      const { height, width } = buttonSize(props);
      return <Pulse animate={animate} {...a11y} testID={testID} style={[fill(theme), { height, width, borderRadius: skin.buttonRadius }, style]} />;
    }

    if (shape === "card") {
      return (
        <View {...a11y} {...innerHidden} testID={testID} style={[paneStyle(theme, cardSurface(tokens)), { borderRadius: skin.cardRadius }, style]}>
          <GlassPane layer="content" shape={{ borderRadius: skin.cardRadius }} />
          <View style={cardRow}>
            <Pulse animate={animate} style={[fill(theme), cardAvatar, { borderRadius: skin.avatarRadius }]} />
            <View style={flexFill}>
              <Line animate={animate} style={cardLine70} />
              <Line animate={animate} style={cardLine40} />
            </View>
          </View>
          <Line animate={animate} />
          <Line animate={animate} style={cardLine80} />
        </View>
      );
    }

    if (shape === "list") {
      const Row = ({ a, b }: { a: StyleProp<ViewStyle>; b: StyleProp<ViewStyle> }) => (
        <View style={listRow}>
          <Pulse animate={animate} style={[fill(theme), listAvatar, { borderRadius: skin.avatarRadius }]} />
          <View style={flexFill}>
            <Line animate={animate} style={[listLineGap, a]} />
            <Line animate={animate} style={b} />
          </View>
          <Line animate={animate} style={w10} />
        </View>
      );
      return (
        <View {...a11y} {...innerHidden} testID={testID} style={[listContainer, style]}>
          <Row a={{ width: "70%" }} b={{ width: "50%" }} />
          <Row a={{ width: "55%" }} b={{ width: "35%" }} />
        </View>
      );
    }

    if (shape === "table") {
      const Row = ({ a, b, last }: { a: StyleProp<ViewStyle>; b: StyleProp<ViewStyle>; last?: boolean }) => (
        <View style={[tableRow, !last ? tableDivider(tokens) : null]}>
          <Line animate={animate} style={w10} />
          <Line animate={animate} style={[flexFill, a]} />
          <Line animate={animate} style={[flexFill, b]} />
          <Line animate={animate} style={w20} />
        </View>
      );
      return (
        <View {...a11y} {...innerHidden} testID={testID} style={[tableContainer, style]}>
          <Row a={{ width: "70%" }} b={{ width: "50%" }} />
          <Row a={{ width: "80%" }} b={{ width: "60%" }} />
          <Row a={{ width: "65%" }} b={{ width: "45%" }} last />
        </View>
      );
    }

    // Default: a single text line spanning the parent; `long` / `short` shorten it
    // so a stack of lines reads like a wrapped paragraph.
    const length = props.short ? "60%" : props.long ? "80%" : "100%";
    return <Pulse animate={animate} {...a11y} testID={testID} style={[fill(theme), lineHeight(props), { width: length, borderRadius: skin.lineRadius }, style]} />;
  };
}
