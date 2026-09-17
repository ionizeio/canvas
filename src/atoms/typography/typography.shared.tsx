import { type ReactNode } from "react";
import { type GestureResponderEvent } from "react-native";
import { Text, useHugStyle, useTheme, MONO_FONT, type StyleProp, type TextStyle, innerFill } from "../../style/index.js";
import {
  type Role,
  type Tone,
  type Weight,
  type Leading,
  type Decoration,
  roleColor,
  toneColor,
  weightStyle,
  leadingStyle,
  decorationStyle,
  MONO_ROLES,
} from "./typography.styles.js";

// Shared Typography shell. The structure (a single styled Text), the role axis
// and its first-match precedence, the token-backed color resolution, and the
// monospace handling all live here once; a platform file supplies only its skin
// (the per-role type scale, a TypographySkin) and calls createTypography.
//
// Typography is a "Shared" platform treatment: there is no native type-scale
// control to match per OS (iOS text styles, Material 3 type roles, and the web
// scale all map onto the same Canvas tokens), so iosSkin / androidSkin reference
// the exact same values as webSkin. The full per-OS file structure still exists
// so the atom matches the kit's platform-skin recipe, but the columns are
// identical and it is not registered for a docs preview.
//
// Typography is the Canvas type scale as a single styled Text. One boolean role
// prop per style (display / h1..h5 / lead / body / small / tiny / muted /
// caption / code / mono) selects a token-backed style set; omit all for the
// plain body look. The foundation's `Text` primitive is the host element, so the
// public component is named `Typography` (the bare `Text` name belongs to the
// foundation).
//
// Boolean-prop API: one boolean per role on a single axis, first-match
// precedence (mirrors Button's intentOf / Badge's toneOf). Roles are mutually
// exclusive; pass at most one. Orthogonal axes layer on top: an optional tone
// (subtle / primary / destructive / success / warning) sets the color, a weight
// (regular / medium / semibold / bold) sets the fontWeight, and a decoration
// (underline) sets textDecorationLine; each is mutually exclusive within itself
// and null by default, so the role's own color, weight, and undecorated look
// stand when the axis is untouched. The text content comes from children.
//
// Two roles want a monospace face (code, mono). There is no font-family
// utility, so each requests RN's cross-platform monospace alias via inline
// style, the same pattern Badge's `mono` modifier uses. The docs set `code` at
// text-[13px]; the type scale resolves only token sizes, so it falls back to the
// nearest one (text-sm), as Kbd does for its 11px label.

export interface TypographyProps {
  children?: ReactNode;
  // Role (pick one; default is the plain body style). First-match precedence.
  display?: boolean;
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  h4?: boolean;
  h5?: boolean;
  lead?: boolean;
  body?: boolean;
  small?: boolean;
  tiny?: boolean;
  muted?: boolean;
  caption?: boolean;
  code?: boolean;
  mono?: boolean;
  // Tone (pick one; orthogonal to role). When omitted, the role's own color is used.
  subtle?: boolean;
  primary?: boolean;
  destructive?: boolean;
  success?: boolean;
  warning?: boolean;
  // Weight (pick one; orthogonal to role). When omitted, the role's own weight is used.
  regular?: boolean;
  medium?: boolean;
  semibold?: boolean;
  bold?: boolean;
  /**
   * Leading (orthogonal to role). Pulls the line box in to 1.25x the font size for a
   * STACKED LOCKUP, where two lines read as one unit (a wordmark over its tagline, a
   * title over its subtitle) and the roles reading leading would leave dead air between
   * them. Only ever tightens, so it is safe on every role. Omit for prose: the role's
   * own line height is the reading value.
   */
  tightLeading?: boolean;
  /**
   * Decoration (orthogonal to role / tone / weight). Underlines the text so an inline
   * text link reads as a link, replacing the banned raw `textDecorationLine` style
   * shim. Combines freely with every role, tone, and weight; omit for undecorated text.
   */
  underline?: boolean;
  /**
   * Renders this text as a REAL inline link on the web: react-native-web
   * gives the root element a browser link with this destination, so
   * middle-click, cmd-click, and open-in-new-tab work and assistive tech
   * hears a link. Native platforms have no browser links and ignore it, so
   * pair `href` with an `onPress` running the same navigation through the
   * host's router. Combine with `underline` for the conventional link look.
   * When a heading role and `href` are both set, the link role wins.
   */
  href?: string;
  /** Attributes forwarded with `href` on the web: `target`, `rel`, `download`. */
  hrefAttrs?: { target?: "_blank" | "_self"; rel?: string; download?: boolean | string };
  /** Press handler; the native navigation path for `href` (fires on web too). */
  onPress?: (event: GestureResponderEvent) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * For layout/positioning composition only (margins handled by Row/Column). Not a
   * styling escape hatch: size, color, and weight come from the props above.
   */
  style?: StyleProp<TextStyle>;
}

// The only thing a platform skin owns: the per-role type scale (size /
// line-height / weight / tracking and the `code` pill box), color-free. The
// shell layers the token-backed color on top. For the Shared treatment all
// three platform skins carry the same record.
export interface TypographySkin {
  roleType: Record<Role, TextStyle>;
}

// Heading roles and the level they expose to assistive tech. Setting
// accessibilityRole="header" gives the native heading trait and (via RNW) emits
// a real <h*> element; passing both aria-level and accessibilityLevel pins the
// correct level (display + h1 at 1, h2..h5 at 2..5) on web and native rather
// than RNW defaulting every heading to h1. Non-heading roles are absent here so
// they stay plain text.
const HEADING_LEVEL: Partial<Record<Role, number>> = {
  display: 1,
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
};

// Role precedence when more than one is passed: first match wins. Order runs
// largest-to-smallest, headings before helper styles, so a conflicting pair
// resolves to the more prominent role.
function roleOf(p: TypographyProps): Role {
  if (p.display) return "display";
  if (p.h1) return "h1";
  if (p.h2) return "h2";
  if (p.h3) return "h3";
  if (p.h4) return "h4";
  if (p.h5) return "h5";
  if (p.lead) return "lead";
  if (p.code) return "code";
  if (p.mono) return "mono";
  if (p.caption) return "caption";
  if (p.muted) return "muted";
  if (p.small) return "small";
  if (p.tiny) return "tiny";
  if (p.body) return "body";
  return "body";
}

// Tone precedence when more than one is passed: first match wins. Returns null
// when no tone prop is set, so the role's own color stands.
function toneOf(p: TypographyProps): Tone | null {
  if (p.destructive) return "destructive";
  if (p.warning) return "warning";
  if (p.success) return "success";
  if (p.primary) return "primary";
  if (p.subtle) return "subtle";
  // `muted` is also a role; as a tone it layers muted color onto a larger role
  // (e.g. `lead muted`). Bare `<Typography muted>` still resolves the muted role,
  // which paints the same color, so this stays backward-compatible.
  if (p.muted) return "muted";
  return null;
}

// Weight precedence when more than one is passed: first match wins. Returns null
// when no weight prop is set, so the role's own weight stands.
function weightOf(p: TypographyProps): Weight | null {
  if (p.bold) return "bold";
  if (p.semibold) return "semibold";
  if (p.medium) return "medium";
  if (p.regular) return "regular";
  return null;
}

// Leading: a single-value axis today, so there is no precedence to resolve. Returns
// null when the prop is absent, so the role's own line height stands.
function leadingOf(p: TypographyProps): Leading | null {
  if (p.tightLeading) return "tight";
  return null;
}

// Decoration: a single-value axis today, so there is no precedence to resolve. Returns
// null when the prop is absent, so the text keeps the role's own undecorated look.
function decorationOf(p: TypographyProps): Decoration | null {
  if (p.underline) return "underline";
  return null;
}

/** Build a Typography component from a platform skin. */
export function createTypography(skin: TypographySkin) {
  return function Typography(props: TypographyProps) {
    const { children, testID, style } = props;
    const theme = useTheme();
    const { tokens, dark } = theme;
    const role = roleOf(props);
    const tone = toneOf(props);
    const weight = weightOf(props);
    const leading = leadingOf(props);
    const decoration = decorationOf(props);

    // The mono/code roles ask for a monospace face; there is no font-family
    // utility, so request the cross-platform monospace alias via inline style.
    const monoStyle = MONO_ROLES.has(role) ? { fontFamily: MONO_FONT } : null;
    // The code pill is HUG (a boxed inline token); every other role is a text run that
    // spans its parent and wraps.
    const hug = useHugStyle();
    const codeHug = role === "code" ? hug : null;

    // Heading roles expose the native heading trait + level so screen readers
    // can navigate heading-by-heading (the H key / rotor); body/helper roles
    // stay plain text. aria-level + accessibilityLevel pin the level on web and
    // native (otherwise RNW emits every header as h1).
    const level = HEADING_LEVEL[role];

    // A real browser link on the web (react-native-web renders Text carrying
    // `href` as one); native ignores these and navigates through onPress. RN's
    // prop types don't know the web-forwarded props, hence the narrow spread.
    const anchor = props.href != null ? { href: props.href, hrefAttrs: props.hrefAttrs } : null;

    return (
      <Text
        {...(anchor ?? undefined)}
        testID={testID}
        onPress={props.onPress}
        accessibilityRole={anchor ? "link" : level ? "header" : undefined}
        aria-level={anchor ? undefined : level}
        style={[
          skin.roleType[role],
          roleColor(tokens, role),
          // The code pill is a Text node, which cannot host a material sibling, so under
          // glass its `muted` fill becomes an ink tint that lets the pane it sits on show
          // through (the same translucent emphasis a glass table's header band takes).
          role === "code" ? { backgroundColor: innerFill(theme, "muted", "soft") } : null,
          tone ? toneColor(tokens, dark, tone) : null,
          weight ? weightStyle(weight) : null,
          // After the role, whose line height it overrides; the skin's own scale is the
          // input it clamps against, so this reads the active platform's value.
          leading ? leadingStyle(skin.roleType[role], leading) : null,
          // Decoration is orthogonal to color/weight/leading (it sets textDecorationLine),
          // so its placement in the cascade is free; it layers on before the escape hatch.
          decoration ? decorationStyle(decoration) : null,
          monoStyle,
          codeHug,
          style,
        ]}
      >
        {children}
      </Text>
    );
  };
}
