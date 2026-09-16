import { type ReactNode } from "react";
import {
  View,
  Text,
  useTheme,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
} from "../../style/index.js";

// Shared Divider shell. The structure (a plain hairline rule, a vertical rule, or a
// labeled/action row of two flanking hairlines around a centered node), the boolean-prop
// axes (orientation + emphasis), and the token-backed fill logic live here once; a platform
// file supplies only its skin (rule thickness, label-row gap, label type) and calls
// createDivider.
//
// Divider is a "Shared" platform treatment: a thin rule is the same idiom on every platform
// (SwiftUI Divider, the Material 3 1dp divider, and Catalyst's <hr>), so there is no native
// shape to diverge on. The skin therefore carries the same values on iOS, Android, and web;
// the per-OS files exist only so the architecture is uniform across the kit.

export type Orientation = "horizontal" | "vertical";
export type Emphasis = "soft" | "strong";

export interface DividerSkin {
  /** Rule thickness in px (height of a horizontal/flank rule, width of a vertical rule). */
  ruleThickness: number;
  /** Gap between a flanking hairline and the centered label/action node. */
  labelGap: number;
  /** The centered label type (size / line-height / weight / tracking). */
  labelType: TextStyle;
}

export interface DividerProps {
  /**
   * Optional middle content. With children, a horizontal divider renders a
   * flanking-line + centered-label row (the "with label" / "with action"
   * patterns). A string renders as muted label text; arbitrary nodes (e.g. a
   * button) render as-is for the action pattern. Ignored when `vertical`.
   */
  children?: ReactNode;
  // Orientation (pick one; default is horizontal).
  horizontal?: boolean;
  vertical?: boolean;
  // Emphasis (pick one; default tracks the border token).
  soft?: boolean;
  strong?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// First match wins when more than one orientation flag is passed.
function orientationOf(p: DividerProps): Orientation {
  if (p.vertical) return "vertical";
  return "horizontal";
}

// First match wins when more than one emphasis flag is passed.
function emphasisOf(p: DividerProps): Emphasis {
  if (p.soft) return "soft";
  return "strong";
}

// The hairline fill color, token-backed (platform-neutral): `strong` tracks the standard
// border token, `soft` steps down to the muted token for a quieter rule. Reads the active
// tokens so it follows light/dark and the glass surface.
function ruleFill(tokens: ColorTokens, emphasis: Emphasis): ViewStyle {
  return { backgroundColor: emphasis === "strong" ? tokens.border : tokens.muted };
}

// The centered label text color: muted foreground.
function labelColor(tokens: ColorTokens): TextStyle {
  return { color: tokens["muted-foreground"] };
}

export function createDivider(skin: DividerSkin) {
  return function Divider(props: DividerProps) {
    const { children, testID, style } = props;
    const orientation = orientationOf(props);
    const emphasis = emphasisOf(props);
    const { tokens } = useTheme();
    const fill = ruleFill(tokens, emphasis);

    if (orientation === "vertical") {
      // A thin vertical rule that adapts to the row height it sits in.
      return (
        <View
          // `separator` announces the structural break to screen readers. We use
          // the ARIA-aligned `role` prop (not `accessibilityRole`) because RN's
          // AccessibilityRole union has no "separator" member; `role` carries it
          // cross-platform (VoiceOver/TalkBack natively, the DOM role on web).
          role="separator"
          testID={testID}
          style={[{ width: skin.ruleThickness, alignSelf: "stretch" }, fill, style]}
        />
      );
    }

    // Horizontal with a label/action in the middle: a centered node flanked by two hairlines.
    if (children != null) {
      const isText = typeof children === "string" || typeof children === "number";
      const flankRule: ViewStyle = {
        height: skin.ruleThickness,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: "0%",
      };
      return (
        <View
          // For a text label the whole flank-line + label row reads as one structural
          // separator. For the action pattern the child is an interactive control (e.g. a
          // Button), and a `separator` is a structural ARIA role that does not expect
          // focusable/interactive descendants, so we drop the container role there: the
          // wrapper is a plain group and the child's own role (button/link/...) is what
          // assistive tech exposes. The two flanking hairlines still carry the visual break.
          role={isText ? "separator" : undefined}
          testID={testID}
          style={[{ flexDirection: "row", alignItems: "center", gap: skin.labelGap }, style]}
        >
          <View style={[flankRule, fill]} />
          {isText ? (
            <Text style={[skin.labelType, labelColor(tokens)]}>{children}</Text>
          ) : (
            children
          )}
          <View style={[flankRule, fill]} />
        </View>
      );
    }

    // Plain horizontal hairline spanning the full width.
    return (
      <View role="separator" testID={testID} style={[{ height: skin.ruleThickness, width: "100%" }, fill, style]} />
    );
  };
}
