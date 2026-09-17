import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { cloneElement, isValidElement, type ComponentType, type ReactElement } from "react";
import { View, Text, type StyleProp, type ViewStyle, type LayoutStyle, useFillStyle, GlassSurface, withInnerFill } from "../../style/index.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { type ButtonProps } from "../../atoms/button/button.shared.js";
import * as s from "./empty-state.styles.js";
import { type Tone, type EmptyStateSkin } from "./empty-state.styles.js";

// Shared EmptyState shell. The structure (a centered, calm column: a round icon
// disc, a semibold title, a muted description, and an optional primary action),
// the boolean-prop axes, the tone precedence, and the semantic color logic live
// here once; a platform file supplies only its skin (card radius, density/spacing,
// type tracking) and calls createEmptyState.
//
// Empty state: a centered, calm column that explains why a region is empty and,
// when the user can act, offers the one action that fills it. Anatomy mirrors the
// docs entry: a round 48x48 icon disc, a gap, a semibold title, a muted
// description, and an optional primary action button.
//
// EmptyState is a "Light" platform treatment: one structure and one set of
// (semantic) colors, with per-OS touches limited to the bordered card's radius,
// the column density/spacing, and the title/description type tracking. The
// optional action is the already-skinned Button atom, which brings its own per-OS
// fidelity (shape + press feedback), so this molecule's skin does NOT cover it and
// the surface has no pressable of its own.
//
// Boolean-prop API: flat booleans grouped into axes, first-match precedence within
// an axis (mirrors Button's intentOf).
//
// - Tone axis: `success` paints the disc and glyph green for states where
//   emptiness is good news (no errors, all caught up). The default tone keeps the
//   disc muted and the glyph muted-foreground for routinely-empty states.
// - Container axis: `bordered` wraps the column in a rounded, bordered card (used
//   inside a SectionCard or a table cell). Omit for a bare column.
// - Density axis: `compact` tightens the card padding for dense table cells.

export interface EmptyStateProps {
  /**
   * The glyph shown in the disc: a monochrome `<Icon />` element (cloned with the
   * tone's tint and the disc's glyph size, so it follows `success`/default like the
   * disc wash does; a semantic color boolean on the element still wins) or an
   * emoji/character string.
   */
  icon?: string | ReactElement;
  /** Short, neutral headline naming the empty result. */
  title?: string;
  /** One reassuring line, ideally pointing at the next step. */
  description?: string;
  /** When set, renders a primary action button below the description. */
  actionLabel?: string;
  /** Called when the action button is pressed. */
  onAction?: () => void;
  // Tone axis (pick one; default keeps the disc muted).
  success?: boolean;
  // Container axis: wrap the column in a bordered card.
  bordered?: boolean;
  // Density axis (only affects the bordered card's padding).
  compact?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence: first match wins.
function toneOf(p: EmptyStateProps): Tone {
  return p.success ? "success" : "default";
}

// The action's Button atom, typed as its component so the public Button API is
// preserved across every build path.
export type ButtonComponent = ComponentType<ButtonProps>;

/**
 * Build an EmptyState from a platform skin.
 *
 * `Button` is the platform-correct action atom the EmptyState composes. Each
 * platform's thin `.tsx`/`.ios`/`.android` file passes the Button it already
 * resolves for that platform, so the action matches the molecule's platform on
 * every build path (notably the WEB docs 3-up preview, where a barrel import would
 * otherwise resolve the web atom). Defaults to the web-base Button when omitted,
 * which is also correct on a real device (Metro resolves the right extension there
 * regardless).
 */
export function createEmptyState(skin: EmptyStateSkin, Button: ButtonComponent = WebButton) {
  return function EmptyState(props: EmptyStateProps) {
    const { icon, title, description, actionLabel, onAction, bordered, compact, testID, style } = props;
    const theme = useMaterialTheme({ static: true });
    const { tokens } = theme;
    // FILL: the state spans the parent it is given.
    const fill = useFillStyle("EmptyState");
    const tone: Tone = toneOf(props);

    // A bordered state is a CONTENT-layer pane under glass (GlassSurface is the plain
    // View in solid mode); a bare state paints no surface of its own.
    const Root = bordered ? GlassSurface : View;
    const container: StyleProp<ViewStyle> = [
      skin.container,
      bordered ? skin.borderedBase : null,
      bordered ? s.borderedSurface(tokens) : null,
      bordered ? skin.borderedPad[compact ? "compact" : "default"] : null,
      fill,
      style,
    ];

    return (
      <Root testID={testID} style={container} {...(bordered ? { layer: "content" as const } : null)}>
        {icon != null ? (
          // The disc glyph is purely decorative; the title carries the meaning.
          // Emoji announce their own accessible name, so hide the disc from
          // assistive tech. react-native-web does not forward
          // accessibilityElementsHidden to the DOM, so add the aria-hidden alias.
          <View
            // The muted disc becomes an ink tint under glass (a wash over the pane); the
            // success wash is translucent already and stays.
            style={[skin.discBase, tone === "success" ? s.discTone(tokens, tone) : withInnerFill(theme, s.discTone(tokens, tone), "soft")]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
          >
            {isValidElement(icon) ? (
              // An element glyph (the kit Icon atom): own its tint + size by cloning,
              // the same way Emblem paints its child. The injected `color` is the
              // tone tint; a semantic color boolean set on the element takes
              // precedence inside Icon, so a deliberate override still reads.
              cloneElement(icon as ReactElement<Record<string, unknown>>, {
                color: s.glyphTone(tokens, tone).color,
                size: skin.glyph.fontSize ?? 20,
              })
            ) : (
              <Text style={[skin.glyph, s.glyphTone(tokens, tone)]}>{icon}</Text>
            )}
          </View>
        ) : null}
        {title != null ? <Text style={skin.title(tokens)}>{title}</Text> : null}
        {description != null ? <Text style={skin.description(tokens)}>{description}</Text> : null}
        {actionLabel != null ? (
          <View style={skin.actionSpacing}>
            <Button primary small onPress={onAction}>
              {actionLabel}
            </Button>
          </View>
        ) : null}
      </Root>
    );
  };
}
