import { surfaceRipple, shape, type ColorTokens } from "../../style/index.js";
import { INSET_FOCUS_RING } from "../../style/pressable.js";
import { type ViewStyle } from "react-native";
import { type CollapsibleSkin } from "./collapsible.shared.js";

// Co-located Collapsible skins, one per platform. The shell resolves the open
// state (controlled/uncontrolled), the accessibility, the chevron rotation, and
// the panel reveal; the skin supplies only the native SHAPE, sizing, title type,
// chevron tint/size, content insets, and press feedback. The BRAND survives on
// every platform (the semantic tokens, never a platform default), so each follows
// light/dark and the glass surface. Filled variants use static content frost;
// the skin supplies their complete solid fallback. Unfilled variants inherit.
//
// A Collapsible is one accordion Row standing alone, so the skins mirror the
// Accordion's per-platform looks: a single disclosure reads exactly like one
// accordion row.
//
//   Web (Radix / shadcn collapsible, the established Canvas look): no outer
//     container; the header is a full-width row (`py-4`, text-sm / 14px,
//     font-medium) with a trailing chevron (16px, muted) that rotates from 0 to
//     90deg on open; the content panel pads `pb-4` and reads in 14px muted text.
//     Press dims the header. A standalone disclosure has no sibling, so there is no
//     row divider (matching the accordion's last-row, where the rule is dropped).
//   iOS (HIG inset-grouped disclosure / SwiftUI DisclosureGroup): a rounded (12px,
//     continuous-curve) inset-grouped card with a hairline `border`, ~17pt SF title
//     (with SF tracking), a 15px tertiary-gray chevron rotating 0->90deg, and a
//     roomier (16px) content inset. Native iOS grouped surfaces are flat (no
//     shadow). Press = opacity dim (~0.8).
//   Android (Material 3 expandable list row): M3 has no accordion/expansion-panel
//     component, so the disclosure follows M3 list-item conventions: no outer
//     container, a 16sp title-medium title (+0.15 tracking), a 24px muted M3
//     expansion chevron (down at rest, rotating 0->180deg to point up on open), M3
//     one-line list density (56dp row, 16dp insets), and a header `android_ripple`
//     state layer instead of an opacity dim.

// =============================================================================
// Web: the established Canvas / shadcn look.
// =============================================================================

export const webSkin: CollapsibleSkin = {
  // iOS/web dim the header on press; Android uses a ripple (null here).
  pressedOpacity: 0.85,
  // Disabled dim: shadcn `disabled:opacity-50`.
  disabledOpacity: 0.5,
  ripple: null,
  // Keyboard focus shows the kit's themed ring, drawn inside the full-bleed header so
  // the card's clip cannot cut it. No-op natively.
  focusRing: INSET_FOCUS_RING,

  // Chevron: a 16px muted glyph (shadcn ChevronDown, h-4 w-4, text-muted-foreground).
  chevronSize: 16,
  // Radix/shadcn tree-disclosure caret: right at rest, rotates 0->90deg (points down) on open.
  chevronGlyph: "chevronRight",
  chevronSpinTo: 90,

  // No outer container on web: the disclosure sits flush in its layout.
  container() {
    return {};
  },
  // The `card` variant: an outlined card surface (the web Card's 8px radius and
  // hairline border on the `card` fill) wrapping the whole disclosure; overflow
  // hidden clips the header ink to the rounded corner.
  cardContainer(t) {
    return { borderRadius: shape.web.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, overflow: "hidden" };
  },
  // Card mode insets the flush web header/content to the card's edge (the web
  // Card section inset, 20px).
  cardHeaderInset: { paddingHorizontal: 20 },
  cardContentInset: { paddingHorizontal: 20 },
  // The header trigger row: full width, space-between, `py-4` (16px) vertical inset.
  header() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      paddingVertical: 16,
    };
  },
  // shadcn trigger: text-sm (14px) / font-medium / foreground.
  title(t) {
    return { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: "500", color: t.foreground };
  },
  // The muted secondary line, one step below the 14px title (the kit's
  // title+description ramp, matching Checkbox/Radio at the base size).
  description(t) {
    return { fontSize: 12, lineHeight: 16, color: t["muted-foreground"] };
  },
  // The content panel: pads the bottom (`pb-4`), text-sm / muted-foreground.
  content() {
    return { paddingBottom: 16 };
  },
  contentText(t) {
    return { fontSize: 14, lineHeight: 22, color: t["muted-foreground"] };
  },
};

// =============================================================================
// iOS (HIG inset-grouped disclosure / SwiftUI DisclosureGroup).
// =============================================================================

// The iOS inset-grouped card: rounded 12px with the iOS superellipse (continuous)
// corner curve, a hairline border, a flat (no-shadow) grouped surface filled with
// the content `card` token (solid). `borderCurve` is an RN iOS-only prop (no-op
// elsewhere). Shared by `container` (the default look) AND `cardContainer`: the
// default iOS Collapsible already IS the card surface, so `card` is a documented
// no-op on iOS.
const insetGroupedCard = (t: ColorTokens): ViewStyle => ({
  borderRadius: 12,
  borderCurve: "continuous",
  borderWidth: 1,
  borderColor: t.border,
  backgroundColor: t.card,
  overflow: "hidden",
});

export const iosSkin: CollapsibleSkin = {
  pressedOpacity: 0.8, // HIG: dim on press
  disabledOpacity: 0.5, // HIG dimmed disclosure
  ripple: null,
  focusRing: INSET_FOCUS_RING,

  // SF chevron: ~15pt, tertiary-gray tint.
  chevronSize: 15,
  // HIG tree-disclosure caret: right at rest, rotates 0->90deg (points down) on open.
  chevronGlyph: "chevronRight",
  chevronSpinTo: 90,

  // The default iOS look IS the inset-grouped card (see insetGroupedCard above).
  container: insetGroupedCard,
  // `card` is a documented no-op on iOS: it aliases the same container styles,
  // and the idempotent insets below match the header/content's own 16px.
  cardContainer: insetGroupedCard,
  cardHeaderInset: { paddingHorizontal: 16 },
  cardContentInset: { paddingHorizontal: 16 },
  // Inset-grouped row: 16px horizontal inset, 11px vertical for a ~44pt target.
  header() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 16,
    };
  },
  // ~17pt SF body title with SF Pro Text tracking (17pt = -0.43).
  title(t) {
    return { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: t.foreground };
  },
  // SF footnote (13pt, tracking -0.08) in the secondary gray: the iOS subtitle
  // cell's muted second line.
  description(t) {
    return { fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: t["muted-foreground"] };
  },
  // Roomier grouped content inset; leading aligns with the title (16px).
  content() {
    return { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2 };
  },
  // 15pt content with SF Pro Text tracking (15pt = -0.24).
  contentText(t) {
    return { fontSize: 15, lineHeight: 21, letterSpacing: -0.24, color: t["muted-foreground"] };
  },
};

// =============================================================================
// Android (Material 3 expandable list row).
// =============================================================================

export const androidSkin: CollapsibleSkin = {
  pressedOpacity: null, // Android uses a ripple instead
  disabledOpacity: 0.38, // M3 disabled content = 38% on-surface
  // M3 state-layer ripple, routed through the shared surfaceRipple helper (neutral
  // foreground ink at 10% alpha); the unrounded row needs no clip.
  ripple: (t) => surfaceRipple(t),
  focusRing: INSET_FOCUS_RING,

  // M3 list trailing icon: 24px, on-surface-variant (muted).
  chevronSize: 24,
  // M3 in-place expansion: a down chevron (expand_more) at rest that rotates
  // 0->180deg to point up (expand_less) on open, NOT the iOS drill-in caret.
  chevronGlyph: "chevronDown",
  chevronSpinTo: 180,

  // No outer container: an M3 expandable list row sits flush on the surface.
  container() {
    return {};
  },
  // The `card` variant: the M3 OUTLINED card equivalent (medium shape 12dp,
  // 1dp outline on the `card` fill, elevation 0); overflow hidden clips the
  // header ripple to the rounded corner.
  cardContainer(t) {
    return { borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, overflow: "hidden" };
  },
  // M3 card content inset is 16dp, which the header/content below already carry;
  // the card-mode insets are idempotent per-key overrides, kept explicit so the
  // contract reads the same on every skin.
  cardHeaderInset: { paddingHorizontal: 16 },
  cardContentInset: { paddingHorizontal: 16 },
  // M3 one-line list item: 16dp horizontal inset; paddingVertical 16 + the 24sp
  // title line gives a true 56dp M3 list-item container height.
  header() {
    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
    };
  },
  // M3 title-medium: 16sp / 24 line / 500 weight / +0.15 tracking, on-surface.
  title(t) {
    return { flexShrink: 1, fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15, color: t.foreground };
  },
  // M3 two-line list item supporting text: body-medium (14sp / 20 / +0.25) in
  // on-surface-variant (muted).
  description(t) {
    return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: t["muted-foreground"] };
  },
  // M3 supporting-text content inset, aligned to the title.
  content() {
    return { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 };
  },
  // M3 body-medium: 14sp / 20 line / +0.25 tracking.
  contentText(t) {
    return { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: t["muted-foreground"] };
  },
};
