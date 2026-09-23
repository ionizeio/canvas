import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { type ReactNode } from "react";
import { View, Text, useHugStyle, statusColors, MONO_FONT, type ColorTokens, type LayoutStyle, type StyleProp, type ViewStyle, type TextStyle, GlassPane, paneStyle } from "../../style/index.js";
import { actionFill, actionInk } from "../../style/action.js";

// Shared Badge shell. The structure (a metadata pill, or a status pill with a leading
// dot), the boolean-prop axes, and the semantic color logic live here once; a platform
// file supplies only its skin (shape, padding, label type, dot size) and calls createBadge.
//
// Two families of badge, both Dark Factory's Pill.
//
// 1. The metadata badge: a pill for static labels like schema, role, or tag. Configured
//    by a tone axis (default / secondary / outline / destructive) plus a `mono` modifier
//    for token / event names. `secondary` (the default) is Dark Factory's surface pill,
//    `default` its solid pill in the call-to-action color, `destructive` its soft red
//    pill, and `outline` a hairline pill.
// 2. The status badge (`status`): Dark Factory's live-state pill, a quiet surface pill
//    whose leading dot carries the tone, for state like active / pending / failed.
//    Configured by a status-tone axis (success / warning / error / info / neutral).
//
// The colors come from the theme's roles through statusColors (src/style/status.ts), the
// same place Alert and the other toned surfaces read theirs, so a "warning" badge and a
// "warning" alert in one view are the same state.

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
  // Metadata tone (pick one; default is the `secondary` surface pill).
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

// Semantic colors (platform-neutral), all from the theme's roles.
function metaContainer(tokens: ColorTokens, tone: Tone): ViewStyle {
  switch (tone) {
    case "default": return { borderColor: "transparent", backgroundColor: actionFill(tokens) };
    case "secondary": return { borderColor: "transparent", backgroundColor: tokens.muted };
    case "outline": return { borderColor: tokens.border, backgroundColor: "transparent" };
    case "destructive": return { borderColor: "transparent", backgroundColor: statusColors(tokens, "error").wash };
  }
}

function metaLabel(tokens: ColorTokens, tone: Tone): TextStyle {
  switch (tone) {
    case "default": return { color: actionInk(tokens) };
    case "secondary": return { color: tokens["muted-foreground"] };
    case "outline": return { color: tokens.foreground };
    case "destructive": return { color: statusColors(tokens, "error").ink };
  }
}

// The status pill is the quiet surface pill in every tone: the dot says the state, and the
// label keeps the foreground so it reads the same whatever the tone.
const statusContainer = (tokens: ColorTokens): ViewStyle => ({ borderColor: "transparent", backgroundColor: tokens.muted });
const statusLabel = (tokens: ColorTokens): TextStyle => ({ color: tokens.foreground });

// Under glass a badge is a static pane at control density: a GlassPane paints the material
// behind the label and the box drops its fill and hairline (the pane's material and rim
// carry them). The solid pill is call-to-action-tinted glass with its ink on top, the soft
// destructive pill washes the material with its own wash under the same ink, and the rest
// take the plain control material.

function metaBrand(tokens: ColorTokens, tone: Tone): string | undefined {
  return tone === "default" ? actionFill(tokens) : undefined;
}

function metaTint(tokens: ColorTokens, tone: Tone): string | undefined {
  return tone === "destructive" ? statusColors(tokens, "error").wash : undefined;
}

export function createBadge(skin: BadgeSkin) {
  return function Badge(props: BadgeProps) {
    const { children, mono, style, accessibilityLabel, testID } = props;
    const theme = useMaterialTheme({ static: true, layer: "control" });
    const { tokens } = theme;
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
          style={[paneStyle(theme, [skin.statusBase, statusContainer(tokens)]), hug, style]}
          testID={testID}
          {...(role === "img"
            ? { accessibilityRole: "image" as const, role: "img" as const }
            : role === "group"
              ? { role: "group" as const }
              : null)}
          accessibilityLabel={statusName}
          aria-label={statusName}
        >
          <GlassPane static layer="control" shape={skin.statusBase} />
          <View style={{ height: skin.dotSize, width: skin.dotSize, borderRadius: 9999, backgroundColor: statusColors(tokens, tone).dot }} />
          {children != null ? (
            <Text style={[skin.labelType, statusLabel(tokens)]}>{children}</Text>
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
        {surfaced ? <GlassPane static layer="control" shape={skin.metaBase} brand={metaBrand(tokens, tone)} tint={metaTint(tokens, tone)} /> : null}
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
