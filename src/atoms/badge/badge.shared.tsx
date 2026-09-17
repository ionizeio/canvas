import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ReactNode } from "react";
import { View, Text, useHugStyle, palette, statusHues, HUE_WASH, MONO_FONT, type ColorTokens, type LayoutStyle, type StyleProp, type ViewStyle, type TextStyle, GlassPane, paneStyle, isGlass, alpha } from "../../style/index.js";

// Shared Badge shell. The structure (a metadata pill, or a status pill with a leading
// dot), the boolean-prop axes, and the semantic color logic live here once; a platform
// file supplies only its skin (shape, padding, label type, dot size) and calls createBadge.
//
// Two families of badge.
//
// 1. The metadata badge: a rounded pill for static labels like schema, role, or tag.
//    Configured by a tone axis (default / secondary / outline / destructive) plus a `mono`
//    modifier for token / event names.
// 2. The status badge (`status`): a fully rounded pill carrying a leading dot, for live
//    state like active / pending / failed. Configured by a status-tone axis (success /
//    warning / error / info / neutral).
//
// Badge is a "Light" platform treatment: one structure and one set of (semantic) colors,
// with per-OS touches limited to shape radius, label type, and dot size — so the skin
// carries only those, not the colors.

export type Tone = "default" | "secondary" | "outline" | "destructive";
export type Status = "success" | "warning" | "error" | "info" | "neutral";

export interface BadgeSkin {
  /** Metadata pill shape + padding (the tone fill/label color is supplied by shared). */
  metaBase: ViewStyle;
  /** Status pill shape + padding + gap. */
  statusBase: ViewStyle;
  /** Label type (size / line-height / weight / tracking) for both families. */
  labelType: TextStyle;
  /** Status dot diameter. */
  dotSize: number;
}

export interface BadgeProps {
  children?: ReactNode;
  // Family: metadata badge (default) vs. status badge (with a dot).
  status?: boolean;
  // Metadata tone (pick one; default is the solid primary fill).
  default?: boolean;
  secondary?: boolean;
  outline?: boolean;
  destructive?: boolean;
  // Metadata modifier: monospace face for tokens, scopes, event names.
  mono?: boolean;
  // Status tone (pick one; only applies when `status`).
  success?: boolean;
  warning?: boolean;
  error?: boolean;
  info?: boolean;
  neutral?: boolean;
  /**
   * Accessible name for the badge. Most useful for the status family: the bare-dot status
   * form (`<Badge status error />` with no children) is otherwise color-only and silent to
   * screen readers. When omitted on a childless status badge, the status tone word (e.g.
   * "error") is announced as a fallback. Mirrors the Spinner/Progress `accessibilityLabel`
   * contract.
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Tone precedence when more than one is passed: first match wins.
function toneOf(p: BadgeProps): Tone {
  if (p.default) return "default";
  if (p.destructive) return "destructive";
  if (p.secondary) return "secondary";
  if (p.outline) return "outline";
  return "secondary";
}

function statusOf(p: BadgeProps): Status {
  if (p.success) return "success";
  if (p.error) return "error";
  if (p.warning) return "warning";
  if (p.info) return "info";
  if (p.neutral) return "neutral";
  return "neutral";
}

// Semantic colors (platform-neutral): the metadata badge uses semantic tokens; the status
// badge uses the Tailwind palette (a soft 50/200/700 surface in light, a 950/800/400 surface
// in dark) with a saturated 500 dot, and neutral stays on the semantic muted token.
function metaContainer(tokens: ColorTokens, tone: Tone): ViewStyle {
  switch (tone) {
    case "default": return { borderColor: "transparent", backgroundColor: tokens.primary };
    case "secondary": return { borderColor: "transparent", backgroundColor: tokens.secondary };
    case "outline": return { borderColor: tokens.border, backgroundColor: "transparent" };
    case "destructive": return { borderColor: "transparent", backgroundColor: tokens.destructive };
  }
}

function metaLabel(tokens: ColorTokens, tone: Tone): TextStyle {
  switch (tone) {
    case "default": return { color: tokens["primary-foreground"] };
    case "secondary": return { color: tokens["secondary-foreground"] };
    case "outline": return { color: tokens.foreground };
    case "destructive": return { color: tokens["destructive-foreground"] };
  }
}

// The palette hue per status comes from the style layer's shared statusHues map
// (src/style/status-hue), the same one Alert's banner reads, so the two never
// drift. Neutral rides the semantic tokens instead of a palette hue.

function statusContainer(tokens: ColorTokens, dark: boolean, status: Status): ViewStyle {
  if (status === "neutral") return { borderColor: tokens.border, backgroundColor: tokens.muted };
  const hue = statusHues[status];
  return dark
    ? { borderColor: palette[`${hue}-800`], backgroundColor: palette[`${hue}-950`] }
    : { borderColor: palette[`${hue}-200`], backgroundColor: palette[`${hue}-50`] };
}

// Under glass the label steps one deeper (800 light / 300 dark): the hue wash the
// pane takes is darker than the 50/950 fill, and the deeper ink holds 4.5:1 there.
function statusLabel(tokens: ColorTokens, dark: boolean, status: Status, glass: boolean): TextStyle {
  if (status === "neutral") return { color: tokens["muted-foreground"] };
  const hue = statusHues[status];
  if (glass) return { color: dark ? palette[`${hue}-300`] : palette[`${hue}-800`] };
  return { color: dark ? palette[`${hue}-400`] : palette[`${hue}-700`] };
}

function statusDotColor(tokens: ColorTokens, status: Status): string {
  if (status === "neutral") return tokens["muted-foreground"];
  return palette[`${statusHues[status]}-500`];
}

// Under glass a badge is a static pane at control density: a GlassPane paints the material behind
// the label and the box drops its fill and hairline (the pane's material and rim carry
// them). The brand fills (`default`, `destructive`) are BRAND-tinted glass with their
// foreground on top; a status badge washes the material with its hue's mid step (the
// Alert's recipe) under the same 700/400 label; the rest take the plain control material.

function metaBrand(tokens: ColorTokens, tone: Tone): string | undefined {
  return tone === "default" ? tokens.primary : tone === "destructive" ? tokens.destructive : undefined;
}

function statusTint(dark: boolean, status: Status): string | undefined {
  if (status === "neutral") return undefined;
  return alpha(palette[`${statusHues[status]}-500`], dark ? HUE_WASH.dark : HUE_WASH.light);
}

export function createBadge(skin: BadgeSkin) {
  return function Badge(props: BadgeProps) {
    const { children, mono, style, accessibilityLabel, testID } = props;
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens, dark } = theme;
    const glass = isGlass(theme);
    // HUG: content width inside a stretching Column, content-sized in a Row.
    const hug = useHugStyle();

    if (props.status) {
      const tone = statusOf(props);
      // The bare-dot status form (no children) is color-only; give it an accessible name so a
      // screen reader does not announce a silent, meaningless dot. Prefer the caller's label,
      // else fall back to the status tone word ("error", "success", ...).
      const statusName = accessibilityLabel ?? (children == null ? tone : undefined);
      // A name has to sit on a node that can carry one. A bare View is a generic
      // element, and ARIA prohibits naming those, so the label was being discarded by
      // validators and by some screen readers rather than announced.
      //
      // Which role depends on what the badge contains, and getting that wrong trades
      // one defect for a worse one. A dot ALONE standing in for a word is image-like,
      // and img is what Swatch uses for the same reason. A badge that also renders
      // text must NOT take img, because img is a leaf role: it would replace the
      // visible text in the accessibility tree with the label. There it is a group,
      // which accepts a name and keeps its children readable. With no name at all,
      // no role: a decorative dot beside its own text label stays silent, correctly.
      const role = statusName == null ? null : children == null ? "img" : "group";
      return (
        <View
          style={[paneStyle(theme, [skin.statusBase, statusContainer(tokens, dark, tone)]), hug, style]}
          testID={testID}
          {...(role === "img"
            ? { accessibilityRole: "image" as const, role: "img" as const }
            : role === "group"
              ? { role: "group" as const }
              : null)}
          accessibilityLabel={statusName}
          aria-label={statusName}
        >
          <GlassPane static layer="control" shape={skin.statusBase} tint={statusTint(dark, tone)} />
          <View style={{ height: skin.dotSize, width: skin.dotSize, borderRadius: 9999, backgroundColor: statusDotColor(tokens, tone) }} />
          {children != null ? (
            <Text style={[skin.labelType, statusLabel(tokens, dark, tone, glass)]}>{children}</Text>
          ) : null}
        </View>
      );
    }

    const tone = toneOf(props);
    // An outline badge is deliberately unfilled metadata, so it inherits its host.
    const surfaced = tone !== "outline";
    // The mono modifier asks for a monospace face; RN has no font-family utility, so request
    // the cross-platform monospace alias via inline style.
    const monoStyle = mono ? { fontFamily: MONO_FONT } : null;

    return (
      <View style={[surfaced || theme.increasedContrast ? paneStyle(theme, [skin.metaBase, metaContainer(tokens, tone)]) : [skin.metaBase, metaContainer(tokens, tone)], hug, style]} testID={testID}>
        {surfaced ? <GlassPane static layer="control" shape={skin.metaBase} brand={metaBrand(tokens, tone)} /> : null}
        {children != null ? (
          <Text style={[skin.labelType, metaLabel(tokens, tone), monoStyle]}>{children}</Text>
        ) : null}
      </View>
    );
  };
}

// BadgeGroup: the wrapping row that lays out a series of badges, so no call site
// hand-writes `<Row wrap alignCenter snug>` (or a raw flex View) to sit badges
// beside a name or each other. It owns the flex direction, the wrap, the
// cross-axis centering, and the inter-badge gap; the caller passes only Badges.
// The sibling of AvatarGroup (avatar.shared), scoped to badges.
//
// Layout-only, so it carries no per-OS skin and no colors: the badges it holds
// own their own platform treatment. Gap draws from the kit's spacing scale
// (a subset of Row's), defaulting to `snug`.

export type BadgeGap = "tight" | "snug" | "cozy";

// Inter-badge gap per axis value, from the shared spacing scale (matches Row's
// tight/snug/cozy). Owned here once instead of a magic `gap` at every call site.
const BADGE_GAP: Record<BadgeGap, number> = { tight: 4, snug: 8, cozy: 12 };

export interface BadgeGroupProps {
  /** The Badge elements to lay out in a wrapping row. */
  children?: ReactNode;
  // Inter-badge gap (pick one; default `snug`). Precedence: cozy > snug > tight.
  tight?: boolean;
  snug?: boolean;
  cozy?: boolean;
  /** Accessible name for the whole group (e.g. "Rachel Chen's roles"). */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Gap precedence when more than one is passed: first match wins, largest-first
// (mirrors Row's gapOf ordering). Default `snug` when none is set.
function badgeGapOf(p: BadgeGroupProps): BadgeGap {
  if (p.cozy) return "cozy";
  if (p.snug) return "snug";
  if (p.tight) return "tight";
  return "snug";
}

export function BadgeGroup(props: BadgeGroupProps) {
  const { children, accessibilityLabel, testID, style } = props;
  return (
    <View
      style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: BADGE_GAP[badgeGapOf(props)] }, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      aria-label={accessibilityLabel}
    >
      {children}
    </View>
  );
}
