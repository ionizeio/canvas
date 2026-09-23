import { type ReactNode } from "react";
import { type ViewStyle } from "react-native";
import { type IconName } from "../../atoms/icon/icon.js";
import type { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { RippleClip, cornerRadii } from "../../style/index.js";
import { useHover, washStyle, type HoverMotion } from "../../style/hover.js";

// One nav row: the shape a consumer passes in, and the trailing count the kit draws
// from it. Both presentations of the Sidebar render the same row (the wide rail in
// sidebar.shared, the narrow drill-down leaf in sidebar.drilldown), so the type and
// the badge live in neither of them: shared builds the drill-down from a skin, and
// a drill-down reaching back for the badge closed a require cycle between the two.
// Metro allows a cycle and warns, because whichever module loads second sees the
// first half-initialized; that is harmless only while every shared value is read
// inside a render, and stops being harmless the moment one is read at module scope.
// A third module both sides import removes the question rather than answering it.

/** One nav row: a label, an optional leading icon glyph, an optional count. */
export interface SidebarItem {
  /**
   * Stable identity for this row, used as its React key so inserting or
   * reordering rows reconciles by item rather than by position. Falls back to
   * the row label when omitted, so supply an `id` when two rows can share a
   * label. Also matched by a string `active` (id first, then label).
   */
  id?: string | number;
  /** Row label (e.g. "Dashboard"). */
  label: string;
  /** Leading Canvas glyph rendered before the label, named from the kit icon set
   *  (e.g. `"home"`, `"users"`, `"settings"`). Rendered through the `Icon` atom,
   *  tinted per active state. */
  icon?: IconName;
  /** Trailing count rendered as a <Badge> (e.g. "12"). */
  badge?: string;
  /** Render `badge` in the Badge atom's error status tone (a red status pill with a
   *  leading dot) instead of the default secondary metadata pill, for a count that
   *  reports a problem rather than a volume (e.g. account lockouts). Ignored when the
   *  row carries no `badge`. */
  badgeError?: boolean;
  /** Inert navigation target carried as data (e.g. "/settings"). The Sidebar never
   *  routes; a consumer reads it in `onSelect` (e.g. `router.push(item.href)`). */
  href?: string;
}

/** A titled group of nav rows. */
export interface SidebarSection {
  /**
   * Stable identity for this section, used as its React key so inserting or
   * reordering sections reconciles by section rather than by position. Falls
   * back to the section title when omitted. Also the section's accordion key.
   */
  id?: string | number;
  /** Optional muted heading shown above the group. */
  title?: string;
  /** Rows in this group. */
  items: SidebarItem[];
  /** Leading Canvas glyph for the section, shown as its single button in the
   *  collapsed mini-rail. */
  icon?: IconName;
  /** Render this section as a collapsible accordion group (a pressable header with a
   *  rotating chevron over its rows). Omit for a pinned, always-open section (the
   *  default, and the pre-collapse behavior). */
  collapsible?: boolean;
  /** Initial open state for an uncontrolled `collapsible` section (ignored when
   *  pinned or when `openSections` is controlled; the section owning the active row
   *  auto-opens regardless). */
  defaultOpen?: boolean;
}

/** A row's trailing count. Two Badge families: the default secondary metadata pill,
 *  and `badgeError`'s error status pill (`status` is Badge's family switch, `error`
 *  its tone within that family) for a count that reports a problem. Lives here once
 *  so the rail row and the narrow drill-down leaf cannot drift apart. `Badge` is the
 *  platform's build, a Sidebar part. */
export function SidebarItemBadge({ item, Badge }: { item: SidebarItem; Badge: typeof WebBadge }) {
  if (item.badge == null) return null;
  if (item.badgeError) return <Badge status error>{item.badge}</Badge>;
  return <Badge secondary>{item.badge}</Badge>;
}

/** A skin's hover wash, resolved for the current surface: its timing, the colour it paints, Reduce Motion. */
export interface SidebarRowWash {
  motion: HoverMotion;
  color: string;
  reduced: boolean;
}

const STRETCH: ViewStyle = { alignSelf: "stretch" };

/**
 * The wrapper every nav row sits in, in the rail and the drill-down alike. It is the
 * RippleClip that rounds a bounded Android ripple to the row's corners (a passthrough
 * elsewhere), and it stretches to the column like the row inside it. On a skin with a
 * hover wash it is also the row's hover target and paints the wash in the row's shape
 * beneath the row, so the row's own pressed and active fills still switch at once.
 */
export function SidebarRowFrame({ shape, wash, children }: { shape: ViewStyle; wash: SidebarRowWash | null; children: ReactNode }) {
  const { hovered, target } = useHover(wash != null);
  const radii = cornerRadii(shape);
  return (
    <RippleClip shape={radii} style={[STRETCH, wash != null ? [radii, washStyle(hovered, wash.color, wash.motion, wash.reduced)] : null]} {...target}>
      {children}
    </RippleClip>
  );
}
