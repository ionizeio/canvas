import { destructiveText } from "../../style/destructive-text.js";
import { primaryText } from "../../style/primary-text.js";
import { type TextStyle } from "react-native";
import { alpha, type ColorTokens } from "../../style/index.js";
import { type TypographySkin } from "./typography.shared.js";

// Co-located Typography styles. One axis (role), each role mapping to a single
// TextStyle built from the active brand tokens (so the type color follows
// light/dark and the glass surface). The component resolves the active role by
// first-match precedence and spreads the matching fragment.
//
// Typography is a "Shared" platform treatment: there is no native type-scale
// control to skin per OS, so iosSkin and androidSkin reference the exact same
// values as webSkin (the kit type scale already maps cleanly onto iOS text
// styles and Material 3 type roles via the shared tokens). The full file
// structure exists to match the kit's platform-skin recipe; the columns are
// identical and the atom is not registered for a docs preview.
//
// Every fragment is a TextStyle: Typography renders a single Text, so layout +
// type + color all live on the Text. The `code` role additionally carries the
// muted fill and pill padding (a Text can hold backgroundColor/padding in RN).
// The role color and the monospace role set are platform-neutral, so they live
// here and are consumed by the shared shell, not the per-OS skins.

export type Role =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "lead"
  | "body"
  | "small"
  | "tiny"
  | "muted"
  | "caption"
  | "code"
  | "mono";

// Type + layout per role, color-free (the parts that don't read a token).
// The Riskora type ladder (styles/tokens/typography.css carries the same values as
// `--role-*`): the Title styles H1 64 down to H6 20 at the REGULAR weight, so the
// hierarchy is carried by size alone and a heading never shouts; the Paragraph
// styles X Large / Medium / Small / X Small for lead / body / small / tiny; caption
// is Subheading X Small (12/16 medium, uppercase, +4% tracking); `code` carries the
// self-start pill box (radius + padding).
const roleType: Record<Role, TextStyle> = {
  // Title/H1 Title: 64, leading 1.09
  display: { fontSize: 64, lineHeight: 70, fontWeight: "400" },
  // Title/H2 Title: 55 (the page title on every Riskora screen)
  h1: { fontSize: 55, lineHeight: 64, fontWeight: "400" },
  // Title/H3 Title: 40/48
  h2: { fontSize: 40, lineHeight: 48, fontWeight: "400" },
  // Title/H4 Title: 36
  h3: { fontSize: 36, lineHeight: 44, fontWeight: "400" },
  // Title/H5 Title: 28
  h4: { fontSize: 28, lineHeight: 36, fontWeight: "400" },
  // Title/H6 Title: 20 (a card or section title)
  h5: { fontSize: 20, lineHeight: 30, fontWeight: "400" },
  // Paragraph/X Large: 20 (weight comes from the weight axis)
  lead: { fontSize: 20, lineHeight: 30 },
  // Paragraph/Medium: 16, leading 1.5
  body: { fontSize: 16, lineHeight: 24 },
  // Paragraph/Small: 14/20
  small: { fontSize: 14, lineHeight: 20 },
  // Paragraph/X Small: 12/16
  tiny: { fontSize: 12, lineHeight: 16 },
  // Paragraph/Small in the muted ink
  muted: { fontSize: 14, lineHeight: 20 },
  // Subheading/X Small: 12/16 medium, uppercase, 4% tracking (0.48px at 12)
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.48 },
  // rounded bg-muted px-1.5 py-0.5 text-sm (fill added in roleColor). The pill is
  // HUG: the shell appends `useHugStyle()` for this role instead of a static
  // alignSelf, so it keeps its content width in a Column without pinning a Row child.
  code: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 14,
    lineHeight: 20,
  },
  // text-sm
  mono: { fontSize: 14, lineHeight: 20 },
};

// Web base skin: the Riskora type scale.
export const webSkin: TypographySkin = { roleType };

// iOS (HIG) and Material 3 skins. Typography is a Shared treatment, so both
// reference the exact same scale as the web skin: there is no native type-scale
// control to diverge toward, and the kit's type tokens already serve iOS text
// styles and Material 3 type roles. Keeping them identical is intentional, not
// a placeholder.
export const iosSkin: TypographySkin = webSkin;
export const androidSkin: TypographySkin = webSkin;

// Text color (and the `code` role's muted fill) per role. The docs relied on
// inherited page color; RN text does not cascade, so every role names its color
// token explicitly: headings/body/code/mono on `foreground`, the helper styles
// on `muted-foreground`.
export function roleColor(tokens: ColorTokens, role: Role): TextStyle {
  switch (role) {
    case "display":
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "lead":
    case "body":
    case "mono":
      return { color: tokens.foreground };
    case "code":
      return { color: tokens.foreground, backgroundColor: tokens.muted };
    case "small":
    case "tiny":
    case "muted":
    case "caption":
      return { color: tokens["muted-foreground"] };
  }
}

// Roles whose face is monospace; RN has no font-family utility, so the component
// supplies the cross-platform monospace alias inline (matches Badge's mono).
export const MONO_ROLES = new Set<Role>(["code", "mono"]);

// Tone axis: an orthogonal color layer over the role's own color. Its names are
// deliberately collision-free with the roles (so `muted`/`small`/`tiny`/`caption`
// keep their existing muted color as roles, and tone adds the colored intents).
// When no tone prop is set the role's own color stands. success/warning read the
// semantic success/warning tokens (scheme-aware); subtle is a translucent foreground.
export type Tone = "muted" | "subtle" | "primary" | "destructive" | "success" | "warning";

export function toneColor(tokens: ColorTokens, dark: boolean, tone: Tone): TextStyle {
  switch (tone) {
    case "muted":
      return { color: tokens["muted-foreground"] };
    case "subtle":
      return { color: alpha(tokens.foreground, 0.6) };
    case "primary":
      return { color: primaryText(tokens) };
    case "destructive":
      return { color: destructiveText(tokens) };
    case "success":
      return { color: tokens.success };
    case "warning":
      return { color: tokens.warning };
  }
}

// Weight axis: an orthogonal fontWeight layer over the role's own weight. When no
// weight prop is set the role's own weight stands.
export type Weight = "regular" | "medium" | "semibold" | "bold";

const WEIGHT: Record<Weight, TextStyle["fontWeight"]> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export function weightStyle(weight: Weight): TextStyle {
  return { fontWeight: WEIGHT[weight] };
}

// Leading axis: an orthogonal line-height layer over the role's own line box. When
// no leading prop is set the role's line height stands.
//
// Why the axis exists: the roles bake a reading line height (`lead` 16/24, `tiny`
// 12/16), which is right for prose and too airy for a STACKED LOCKUP, where two lines
// read as one unit (a wordmark over its tagline, a title over its subtitle). There the
// half-leading of both lines lands between them: 4px under a `lead` line plus 2px over
// a `tiny` one is 6px of dead air that no gap prop can remove, because a Column's gap
// only adds. Since `lineHeight` at a call site is a banned restyle, the tightening has
// to be a semantic prop, so it is one.
export type Leading = "tight";

// Cap ratio for `tight`: a line box 1.25x the font size. Chosen as the tightest value
// that still clears Latin descenders + diacritics at every role's size (a 16px line at
// 20px leaves 4px, which "design system"'s g/y need), so it never clips.
const TIGHT_RATIO = 1.25;

// `tight` only ever TIGHTENS: the result is the role's own line height or the capped
// one, whichever is smaller. Without the min, the ratio would LOOSEN the display scale,
// whose line boxes are already at or below 1.25 (display 48/48 = 1.0, h1 36/40 = 1.11,
// h2 30/36 = 1.2), so `<Typography display tightLeading>` would silently grow its line
// box to 60. The clamp makes the prop safe on every role, which is what lets it be a
// free-standing axis rather than one that is only valid on some roles.
export function leadingStyle(roleType: TextStyle, leading: Leading): TextStyle | null {
  const fontSize = roleType.fontSize;
  const current = roleType.lineHeight;
  if (typeof fontSize !== "number" || typeof current !== "number") return null;
  const lineHeight = Math.min(current, Math.round(fontSize * (leading === "tight" ? TIGHT_RATIO : 1)));
  return lineHeight === current ? null : { lineHeight };
}

// Decoration axis: an orthogonal text-decoration layer over the role. A single value
// today (underline), so there is no precedence to resolve. It marks an inline text
// link so a link reads as a link without the banned raw `textDecorationLine` style
// shim; when the prop is absent the text carries no decoration. Underline is a Shared
// treatment like the type scale: iOS, Material 3, and the web all underline an inline
// link the same way, so there is nothing to diverge per OS.
export type Decoration = "underline";

export function decorationStyle(decoration: Decoration): TextStyle {
  return { textDecorationLine: decoration };
}
