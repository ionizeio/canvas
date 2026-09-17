import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ReactNode } from "react";
import { View, Pressable, Text, StyleSheet, useFillStyle, useTheme, useLayoutAxis, surfaceRipple, pressDim, RippleClip, cornerRadii, splitElevation, alpha, devWarn, GlassSurface, GlassPane, paneStyle, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";
import { Image } from "../../atoms/image/image.shared.js";
import * as s from "./card.styles.js";
import { type CardSkin, type Elevation, type Density } from "./card.styles.js";

// Shared Card shell. The structure (a surface giving you border, radius, and
// shadow, composed from the subcomponents below), the boolean-prop axes, the
// children-vs-string content logic, and the semantic colors all live here once; a
// platform file supplies only its skin (radius, elevation, the card's own density
// padding) and calls createCard.
//
// Card is a "Light" platform treatment: one structure and one set of (semantic)
// colors, with per-OS touches limited to the corner radius (+ the iOS continuous
// corner curve), the surface's border-vs-elevation treatment (Android's M3
// elevated default hides the outline), the card's own content density, the
// resting elevation, and the press feedback (Android android_ripple, iOS/web
// pressed opacity). The composition subcomponents are static and shared.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match
// precedence within an axis (mirrors Button's intentOf). Axes:
//
// - Elevation (pick one): `raised` > `flat` > default. `flat` drops the shadow;
//   `raised` lifts it. (The exact resting/raised shadow is per-OS via the skin.)
// - Interaction: pass `onPress` to make the whole card pressable; it gains the
//   pressed affordance (Android ripple, iOS/web pressed dim) and the button role.
// - Padding: a card with raw children pads its surface by DEFAULT (the common
//   case, so a bare `<Card>content</Card>` reads right without ceremony), and the
//   padded surface also SPACES its flat children (padding implies gap: the card
//   owns the rhythm, so a stack of Typography lines needs no layout wrapper).
//   `flush` removes both the inset and the gap for edge-to-edge content (a table,
//   a nav bar) or when you compose CardHeader/CardContent, which carry their own
//   padding. `padded` is the explicit form of the default. The data-driven string-prop path renders
//   self-padding sections, so the surface itself NEVER pads there: `padded` and
//   the density booleans are inert for the inset in that path (adding it would
//   double-pad the sections).
// - Density (pick one): `compact` > `comfortable`. Sets the card's own content
//   padding and the gap between flat children, tight (compact) or roomy
//   (comfortable). A density prop pads the surface on its own, so it needs no
//   `padded`, and it wins over `padded` and `flush` when both are set.
//
// For the docs playground, which maps plain state to props (no JSX children),
// Card also accepts simple string props (title, description, body, footer):
// when no children are passed it renders the header/body/footer structure from
// those strings, so a representative card can be produced from flat state.

export type { CardSkin } from "./card.styles.js";

// The header's internal layout: icon and title on one side, actions opposite.
// Pure composition, identical on every platform, so it stays out of the skins.
const headerStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  main: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  text: { flex: 1 },
});

export interface CardProps {
  children?: ReactNode;
  // Simple content props for the children-less / data-driven case.
  title?: string;
  /**
   * A glyph rendered before the title, for a section panel that names itself
   * with an icon. Takes effect on the data-driven path (a card given `title`
   * rather than raw children).
   */
  icon?: ReactNode;
  /**
   * Trailing header content, typically a button. Sits opposite the title so the
   * header reads as one row: name on the left, action on the right.
   */
  actions?: ReactNode;
  description?: string;
  body?: string;
  footer?: string;
  // Elevation (pick one; default is a soft resting shadow).
  raised?: boolean;
  flat?: boolean;
  // Padding (orthogonal booleans). A card with raw children is padded by default,
  // and the data-driven string path (no children) pads through its self-padding
  // sections instead, so neither prop moves the surface inset there.
  // `flush` strips the raw-children inset (edge-to-edge content, or composing the self-padding CardHeader/CardContent); `padded` is the explicit form of the padded-by-default.
  padded?: boolean;
  flush?: boolean;
  /** When set, the whole card becomes pressable (a card that behaves as a control). */
  onPress?: () => void;
  /**
   * Active/selected surface: a primary border and a soft primary tint. For
   * selectable cards (a card-style radio or checkbox option that is chosen).
   */
  selected?: boolean;
  /**
   * Grow to fill the main axis of a parent Row/Column (flexGrow: 1). On a card
   * that renders sections, the BODY takes up whatever slack the growth won, so
   * the content region fills the taller surface and a footer stays on its floor
   * rather than floating up under the content. Implied inside a Grid cell: the
   * grid stretches its cells to the row's height and the card fills that box,
   * so the tiles of one row are equal-height without being asked.
   */
  grow?: boolean;
  // Density (pick one; default is the standard inset). Scales the card's own
  // content padding and the gap between flat children.
  compact?: boolean;
  comfortable?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Elevation precedence when more than one is passed: first match wins.
function elevationOf(p: CardProps): Elevation {
  if (p.raised) return "raised";
  if (p.flat) return "flat";
  return "default";
}

// Density precedence when more than one is passed: first match wins.
function densityOf(p: CardProps): Density {
  if (p.compact) return "compact";
  if (p.comfortable) return "comfortable";
  return "default";
}

export function createCard(skin: CardSkin) {
  return function Card(props: CardProps) {
    const { children, title, icon, actions, description, body, footer, flush, onPress, selected, testID, style } = props;
    const theme = useMaterialTheme({ static: true });
    const { tokens } = theme;
    // Under glass the card is a CONTENT-layer pane: GlassSurface strips the skin's fill
    // and hairline and lays the content tint + material behind the sections (see the
    // layered glass model in src/style/tokens.ts). Solid mode keeps the plain View.
    const elev = elevationOf(props);
    const dens = densityOf(props);
    // A tile-grid cell is a definite box on both axes (the grid stretches it to
    // its row's height), so a card in one grows to fill it without `grow`: the
    // tiles of a row share a flush bottom edge, CSS Grid's default. Anywhere
    // else the card is as tall as its sections unless asked to grow.
    const cell = useLayoutAxis();
    const grow = !!props.grow || cell?.bounded === true;
    // A Card is FILL (src/style/sizing.ts): it spans the parent it is given, shares a
    // Row with hugging siblings, and takes its measure from a Container step or a
    // Row span rather than a width of its own.
    const widthFill = useFillStyle("Card");

    // Empty strings count as "no content", so a cleared field never renders an empty
    // header, footer, or a stray separator: guard on truthiness rather than null for
    // these display strings.
    const hasHeader = Boolean(title) || Boolean(description) || Boolean(icon) || Boolean(actions);
    // A card is SECTIONED when it renders one of the self-padding sections, whether its
    // body is raw children or the data-driven `body` string. That is what moves the
    // inset off the surface and onto the sections.
    const hasSections = hasHeader || Boolean(footer);
    // `{cond && <X/>}` collapses to `false`, not null, so a card whose body renders
    // nothing must not hang a divider over an empty content section: the body wrapper
    // and the divider above it key off a RENDERABLE child, mirroring the string path's
    // `hasHeader && body` guard.
    const hasBody = children != null && children !== false;
    // The surface inset belongs to the PLAIN children card alone. Deliberately the
    // looser `!= null` test, so `<Card>{false}</Card>` keeps the standard inset. A
    // plain SINGLE-child card's rendered box is pixel-identical to what it always
    // was (the density gap is inert with one child); a card with several flat
    // children now also gains that gap, the surface's own rhythm.
    const padsSurface = children != null && !hasSections;
    // `padded` and the density booleans move the SURFACE inset, which a sectioned card
    // never takes (its sections pad themselves). Silently ignoring a passed prop is the
    // same class of bug as the dropped header this path fixes, so name it in DEV.
    devWarn(
      hasSections && children != null && (Boolean(props.padded) || dens !== "default"),
      "[canvas] <Card title>: `padded` / `compact` / `comfortable` set the card's own surface inset, which a card with a header or footer never takes (its sections pad themselves); drop the density prop, or drop the section props for a plain padded card.",
    );

    // Shape: per-OS radius; iOS adds Apple's continuous (superellipse) corner curve
    // (an iOS-only RN style prop, omitted entirely on the other skins).
    const shape: ViewStyle = { borderRadius: skin.radius, ...(skin.curve ? { borderCurve: skin.curve } : null) };
    // The card's visual box WITHOUT the elevation shadow and WITHOUT outer layout: shape, the
    // per-variant surface colors, density padding, and the selected tint.
    const surface: StyleProp<ViewStyle> = [
      s.cardBase,
      shape,
      // Surface colors per elevation variant: web/iOS always show the Light-
      // treatment hairline; Android paints it transparent on the non-outlined
      // (M3 elevated) variants and shows it only on `flat` (M3 outlined).
      skin.surface(tokens, elev),
      // The surface inset belongs to the PLAIN card alone: a sectioned card (one
      // carrying a header or footer, whatever its body) renders self-padding
      // sections, so a surface inset there would stack on the sections' own
      // (double-padding). On a plain card the density table is the single source:
      // its default row is the standard padding + flat-child gap (`padded` is the
      // explicit form of that default), a density boolean retunes both and wins
      // over everything, and `flush` opts the default out entirely (neither
      // padding nor gap: edge-to-edge content, or composing the self-padding
      // CardHeader/CardContent).
      padsSurface ? (dens === "default" && flush ? null : skin.density[dens]) : null,
      // Selected: recolor the border to primary and wash the surface with a soft
      // primary tint (the border width is unchanged, so content never shifts; on
      // Android's elevated default the resting hairline is transparent, so this
      // paints it in).
      selected ? { borderColor: tokens.primary, backgroundColor: alpha(tokens.primary, 0.05) } : null,
    ];
    // A card told to GROW fills the box its parent hands it, at every level of its own
    // anatomy: the outermost node grows into the parent's box, a pressable card's Pressable
    // (the node that draws the surface) fills the RippleClip wrapper around it, and the
    // BODY takes up the slack inside the surface. Without the last the sections stack from
    // the top and every extra pixel piles up under the last one, so a card stretched to
    // match a taller neighbour shows its content in a box it does not fill and floats its
    // footer in the middle of the surface; without the middle one the wrapper grows while
    // the visible card stays content-height. Each is inert on a card that is already exactly
    // as tall as its sections, which is every card that was not asked to grow.
    const fill: ViewStyle | null = grow ? { flexGrow: 1 } : null;
    // Outer layout composition, carried on the outermost node (the plain View, or the
    // RippleClip wrapper on a pressable card): the FILL width, the height growth, then
    // the caller's composition.
    const outer: StyleProp<ViewStyle> = [widthFill, fill, style];
    const bodyFill: StyleProp<ViewStyle> = fill;

    // The header and footer are the same nodes on both paths, so they are built once
    // here rather than inside the string-body branch. That is the whole fix: a card
    // given children used to short-circuit to `inner = children`, silently dropping
    // title / icon / actions / description / footer. A section panel needs a titled
    // header AND arbitrary children (a table, a form), which the string `body` cannot
    // express.
    const headerNode = hasHeader ? (
      <CardHeader>
        <View style={headerStyles.row}>
          <View style={headerStyles.main}>
            {icon}
            <View style={headerStyles.text}>
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </View>
          </View>
          {actions}
        </View>
      </CardHeader>
    ) : null;

    const footerNode = footer ? (
      <>
        <CardSeparator />
        <CardFooter>
          <Text style={s.footerText(tokens)}>{footer}</Text>
        </CardFooter>
      </>
    ) : null;

    let inner: ReactNode;
    if (children != null) {
      // A plain card still renders exactly what the caller passed, byte for byte.
      // A sectioned card wraps those children in the same anatomy the string path
      // uses, so `flush` keeps meaning "run the body edge to edge" rather than
      // silently doing nothing.
      inner = hasSections ? (
        <>
          {headerNode}
          {hasHeader && hasBody ? <CardSeparator /> : null}
          {hasBody ? flush ? children : <CardContent style={bodyFill}>{children}</CardContent> : null}
          {footerNode}
        </>
      ) : (
        children
      );
    } else {
      inner = (
        <>
          {headerNode}
          {hasHeader && body ? <CardSeparator /> : null}
          {body ? (
            <CardContent style={bodyFill}>
              <Text style={s.bodyText(tokens)}>{body}</Text>
            </CardContent>
          ) : null}
          {footerNode}
        </>
      );
    }

    // A pressable card swaps View for Pressable, adding the pressed affordance:
    // Android gets the surface ripple, iOS/web get the pressed opacity dim.
    if (onPress) {
      // The bounded ripple is clipped to the rounded card by the RippleClip parent (Android only).
      // A same-node overflow:"hidden" cannot clip it (see src/style/ripple-clip). Because that
      // parent-clip WOULD cut the child's own Android elevation shadow, the Android `elevation`
      // moves onto the wrapper (whose own shadow is drawn around its outline, unclipped) while the
      // iOS `shadow*` stays on the inner node — so iOS is unchanged.
      const { parent: elevParent, child: elevChild } = splitElevation(skin.elevation(elev));
      return (
        <RippleClip shape={cornerRadii(shape)} style={[elevParent, outer]}>
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            testID={testID}
            android_ripple={surfaceRipple(tokens)}
            style={({ pressed }) => [paneStyle(theme, surface), elevChild, fill, pressDim(pressed)]}
          >
            <GlassPane layer="content" shape={surface} tint={selected ? alpha(tokens.primary, 0.22) : undefined} />
            {inner}
          </Pressable>
        </RippleClip>
      );
    }
    return (
      <GlassSurface layer="content" testID={testID} tint={selected ? alpha(tokens.primary, 0.22) : undefined} style={[surface, skin.elevation(elev), outer]}>
        {inner}
      </GlassSurface>
    );
  };
}

export interface CardSectionProps {
  children?: ReactNode;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

export interface CardTextProps {
  children?: ReactNode;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<TextStyle>;
}

// Header: the labeled top of the card, holding the title and description.
export function CardHeader({ children, style }: CardSectionProps) {
  return <View style={[s.header, style]}>{children}</View>;
}

// Title: the card's heading. Semibold, tight tracking, card foreground.
export function CardTitle({ children, style }: CardTextProps) {
  const { tokens } = useTheme();
  return <Text style={[s.title(tokens), style]}>{children}</Text>;
}

// Description: the muted supporting line beneath the title.
export function CardDescription({ children, style }: CardTextProps) {
  const { tokens } = useTheme();
  return <Text style={[s.description(tokens), style]}>{children}</Text>;
}

// Content: the card body region. Carries the standard surface padding and the
// card's flat-child rhythm (its children space themselves, no wrapper needed).
export function CardContent({ children, style }: CardSectionProps) {
  return <View style={[s.content, style]}>{children}</View>;
}

// Footer: the bottom region for actions or a summary line.
export function CardFooter({ children, style }: CardSectionProps) {
  return <View style={[s.footer, style]}>{children}</View>;
}

// Separator: the hairline that anchors a header above a body. A card composing
// a header and body keeps this divider between them.
export function CardSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  const { tokens } = useTheme();
  return <View style={[s.separator(tokens), style]} />;
}

export interface CardMediaProps {
  /** The cover image: a URI string (or a docs sample path), or a bundled `require(...)` asset. */
  src?: string | number;
  /** Height of the media band in px (the image covers it edge to edge). */
  height?: number;
  /** Accessible name / alt text announced for the image. */
  alt?: string;
  /** Alias for `alt` (native naming). */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the image. */
  testID?: string;
}

// Media: the full-bleed cover slot at the TOP of a card. Unlike the other anatomy
// subcomponents this one is skin-parameterized, because its top corners must nest
// inside the card's per-OS rounded corner (outer radius minus the 1px border) while
// the bottom edge stays square where the content continues. Compose it with `flush`
// (the card's padding off), then let CardHeader/CardContent pad the text below:
//
//   <Card flush>
//     <CardMedia src="/kira-tanaka.jpg" height={180} alt="…" />
//     <CardContent>…</CardContent>
//   </Card>
export function createCardMedia(skin: CardSkin) {
  // The nested top radius: the card's corner minus the border it sits inside.
  const radius = Math.max(0, skin.radius - 1);
  const shape = {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    ...(skin.curve ? { borderCurve: skin.curve } : null),
  };
  return function CardMedia({ src, height = 180, alt, accessibilityLabel, testID }: CardMediaProps) {
    return (
      <Image
        source={typeof src === "number" ? src : src ? { uri: src } : undefined}
        width="100%"
        height={height}
        style={shape}
        alt={alt ?? accessibilityLabel}
        testID={testID}
      />
    );
  };
}
