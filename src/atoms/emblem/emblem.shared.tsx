import { primaryText } from "../../style/primary-text.js";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { View, Text, useTheme, alpha, type ColorTokens, type StyleProp, type ViewStyle, type LayoutStyle } from "../../style/index.js";
import { type EmblemSkin } from "./emblem.styles.js";

// Shared Emblem shell. The tinted rounded square (or circle) that holds a single
// Icon or a short monogram, recurring across cards, media objects, empty states,
// and feeds, so no call site hand-composes `borderRadius + backgroundColor + padding`
// to build an icon background. Emblem owns the surface AND the icon color: it tints
// the square from a semantic tone and clones its Icon child to paint the matching
// color, so the caller only picks the glyph.
//
// Emblem is a "Light" platform treatment: one structure and semantic colors (here),
// with per-OS touches limited to the corner radius (Material rounds more), the iOS
// continuous corner curve (the app-icon tile idiom), and the monogram label type.

export type Tone = "primary" | "destructive" | "success" | "warning" | "muted";
export type EmblemSize = "small" | "default" | "large";

export interface EmblemProps {
  /** A single `<Icon />` element; Emblem tints it to match the tone. */
  children?: ReactNode;
  /** A monogram letter (or two) instead of an icon, painted in the tone color. */
  label?: string;
  // Tone (pick one; default `muted`). Sets the tinted surface and the icon color.
  primary?: boolean;
  destructive?: boolean;
  success?: boolean;
  warning?: boolean;
  muted?: boolean;
  // Size (pick one; default medium).
  small?: boolean;
  large?: boolean;
  /** Circle instead of the default rounded square. */
  circle?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For layout composition only (not styling): the tint, radius, and size come from props. */
  style?: LayoutStyle;
}

// Tone precedence when more than one is passed: first match wins.
function toneOf(p: EmblemProps): Tone {
  if (p.primary) return "primary";
  if (p.destructive) return "destructive";
  if (p.success) return "success";
  if (p.warning) return "warning";
  return "muted";
}

function sizeOf(p: EmblemProps): EmblemSize {
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// Tinted surface fill per tone (a soft wash of the tone color; `muted` uses the
// solid muted token).
function tintBg(tokens: ColorTokens, tone: Tone): string {
  switch (tone) {
    case "primary":
      return alpha(tokens.primary, 0.12);
    case "destructive":
      return alpha(tokens.destructive, 0.12);
    case "success":
      return alpha(tokens.success, 0.12);
    case "warning":
      return alpha(tokens.warning, 0.12);
    case "muted":
      return tokens.muted;
  }
}

// The Icon color boolean to inject per tone (so the glyph matches its tint).
const ICON_TINT: Record<Tone, Record<string, boolean>> = {
  primary: { primary: true },
  destructive: { destructive: true },
  success: { success: true },
  warning: { warning: true },
  muted: { muted: true },
};

// Solid tone color for a monogram label (the `label` path).
function labelColor(tokens: ColorTokens, tone: Tone): string {
  switch (tone) {
    case "primary":
      return primaryText(tokens);
    case "destructive":
      return tokens.destructive;
    case "success":
      return tokens.success;
    case "warning":
      return tokens.warning;
    case "muted":
      return tokens["muted-foreground"];
  }
}

/** Build an Emblem from a platform skin. */
export function createEmblem(skin: EmblemSkin) {
  return function Emblem(props: EmblemProps) {
    const { children, label, circle, testID, style } = props;
    const { tokens } = useTheme();
    const tone = toneOf(props);
    const size = sizeOf(props);
    const box = skin.box[size];
    const glyph = skin.iconSize[size];

    // A monogram label paints in the tone color; otherwise own the icon color +
    // size by cloning the Icon child, so the caller writes only the glyph.
    const inner =
      label != null ? (
        <Text style={[skin.monogram, { color: labelColor(tokens, tone), fontSize: Math.round(glyph * 0.85), lineHeight: glyph }]}>
          {label}
        </Text>
      ) : isValidElement(children) ? (
        cloneElement(children as ReactElement<Record<string, unknown>>, { ...ICON_TINT[tone], size: glyph })
      ) : (
        children
      );

    return (
      <View
        testID={testID}
        style={[
          {
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            width: box,
            height: box,
            borderRadius: circle ? 9999 : skin.radius[size],
            backgroundColor: tintBg(tokens, tone),
          },
          skin.shape,
          style,
        ]}
      >
        {inner}
      </View>
    );
  };
}
