import { type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  useTheme,
  devWarn,
  MONO_FONT,
  type StyleProp,
  type ViewStyle,
  type LayoutStyle,
} from "../../style/index.js";
import { type SwatchSkin } from "./swatch.styles.js";

// Shared Swatch shell. A color sample: one filled block with the token's name and
// value beneath it, the anatomy a design-system color sheet repeats down a page. The
// component owns the whole lockup (the block, the name, the mono value, the mono
// detail), so a sheet never hand-composes a bare View plus a Typography column beside
// it and re-invents the spacing, the type scale, and the tap-free label alignment.
//
// Swatch is display-only in v1: it never takes an onPress and has no press feedback,
// so no skin carries a ripple or a pressed opacity. A sheet that needs a copy-the-hex
// action wraps the row in a real interactive kit component rather than making the
// sample itself pressable.
//
// Swatch is a "Light" platform treatment: one structure and one set of token colors
// (here), with the per-OS touches limited to the corner radius, the iOS continuous
// corner curve, and the label type (see swatch.styles.ts).

export type SwatchSize = "small" | "default" | "large";

export interface SwatchProps {
  /** The fill: any React Native color string. Pass a theme token, not a literal. */
  color: string;
  /** The sample's name (the token name). Swatch owns this label column. */
  children?: ReactNode;
  /** Primary mono line under the name: what the name resolves to (a hex, a custom-property name, a ramp step). */
  value?: string;
  /** Secondary mono line under the value, for a second notation of the same color (an oklch value, a legacy alias). */
  detail?: string;
  // Size (pick one; default 56). Sets the block's edge, or its height when `block`.
  small?: boolean;
  large?: boolean;
  /** Circle instead of the default rounded square. Keeps the 1:1 footprint, so it wins over `block`'s stretch. */
  circle?: boolean;
  /** Put the label column beside the block instead of under it. */
  inline?: boolean;
  /** Stretch the block to the parent's width; the size then reads as its height (the full-width ramp bar). */
  block?: boolean;
  /**
   * Accessible name override. By default the sample names itself from its own name,
   * value, and detail (falling back to the color string), so pass this only when the
   * name is a node rather than text and there is nothing to read.
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For layout composition only (not styling): the fill, radius, and size come from props. */
  style?: LayoutStyle;
}

// Size precedence when more than one is passed: first match wins.
function sizeOf(p: SwatchProps): SwatchSize {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// The label column's type scale, from the kit's type scale (small 14/20 for the name,
// tiny 12/16 for the two mono lines). It does NOT scale with the size axis: a color
// sheet mixes sample sizes down one page and the captions have to keep one rhythm.
const NAME_TYPE = { fontSize: 14, lineHeight: 20 };
const MONO_TYPE = { fontFamily: MONO_FONT, fontSize: 12, lineHeight: 16 };

/** The text of a name node, when it is text at all (so it can be read into the accessible name). */
function textOf(node: ReactNode): string | null {
  if (typeof node === "string") return node.trim() === "" ? null : node;
  if (typeof node === "number") return String(node);
  return null;
}

/**
 * The data-carrying accessible name. `role="img"` makes the whole subtree
 * presentational, so a screen reader never reaches the rendered name/value/detail
 * lines: whatever a sighted user reads off the sample has to be folded into the NAME
 * (the kit's charts rule). Falls back to the raw color string, so a bare
 * `<Swatch color="#4f39f6" />` still announces something instead of shipping an
 * unnamed image (WCAG 1.1.1).
 */
function dataName(name: string | null, value?: string, detail?: string, color?: string): string {
  const parts = [name, value, detail].filter((p): p is string => p != null && p !== "");
  return parts.length > 0 ? parts.join(", ") : (color ?? "");
}

/** Build a Swatch from a platform skin. */
export function createSwatch(skin: SwatchSkin) {
  return function Swatch(props: SwatchProps) {
    const { color, children, value, detail, circle, inline, block, accessibilityLabel, testID, style } = props;
    const { tokens } = useTheme();
    const size = sizeOf(props);
    const edge = skin.box[size];

    // A name node (an Icon row, a formatted element) cannot be read into the
    // accessible name, and role="img" hides it, so the sample would announce only its
    // value. Warn in dev; the caller fixes it with accessibilityLabel.
    const name = textOf(children);
    devWarn(
      children != null && name == null && accessibilityLabel == null,
      "[canvas] <Swatch />: `children` is a node, not text, so the name cannot be read into the accessible name; pass `accessibilityLabel`.",
    );
    const label = accessibilityLabel ?? dataName(name, value, detail, color);

    // `circle` owns the shape, so it keeps the 1:1 footprint even under `block`: a
    // stretched circle is a pill, not a circle. `inline` puts the label BESIDE the
    // block, which makes the root a row, and a stretched child of a row has no width
    // of its own: `block` there collapsed the sample to a sliver. In both cases the
    // block keeps its square edge and only the ROOT widens, so the label column still
    // gets the full width.
    const stretch = block === true && !circle && !inline;
    const hasLabel = children != null || value != null || detail != null;

    return (
      <View
        role="img"
        accessibilityLabel={label}
        aria-label={label}
        testID={testID}
        style={[
          {
            alignSelf: block ? "stretch" : "flex-start",
            flexDirection: inline ? "row" : "column",
            alignItems: inline ? "center" : "flex-start",
            gap: skin.gap,
          },
          style,
        ]}
      >
        <View
          style={[
            {
              flexShrink: 0,
              height: edge,
              width: stretch ? undefined : edge,
              alignSelf: stretch ? "stretch" : "auto",
              borderRadius: circle ? 9999 : skin.radius[size],
              backgroundColor: color,
              // LOAD-BEARING, not decoration: do not remove. A swatch of the
              // `background` token is #ffffff on a white card in light and #09090b on
              // #18181b in dark, so without this hairline those samples have no edge
              // at all and read as blank space. The border token is the same rule the
              // rest of the kit draws its edges with, so it stays legible in both
              // schemes and never competes with the fill.
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.border,
            },
            skin.shape,
          ]}
        />
        {hasLabel ? (
          <View style={{ flexShrink: 1, gap: skin.lineGap }}>
            {children != null ? (
              <Text style={[skin.name, NAME_TYPE, { color: tokens.foreground }]}>{children}</Text>
            ) : null}
            {value != null ? (
              <Text style={[skin.value, MONO_TYPE, { color: tokens["muted-foreground"] }]}>{value}</Text>
            ) : null}
            {detail != null ? (
              <Text style={[skin.detail, MONO_TYPE, { color: tokens["muted-foreground"] }]}>{detail}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };
}
