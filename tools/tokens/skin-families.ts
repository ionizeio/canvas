/**
 * The families where the web CSS hand-off and the React Native skins must agree.
 *
 * styles/tokens/platforms.css is a TRANSCRIPTION of the per-OS skins in
 * src/**\/*.styles.ts: the skins are the implementation, and the CSS exists so a web
 * surface and the design-system mirror can paint the same three looks. Nothing keeps a
 * transcription honest on its own, and it showed: an iOS Stats and EmptyState fragment
 * was pasted into the WEB block, where it silently overrode the web values declared a
 * few lines above (and set --p-min-target to 44px on a platform whose minimum is 0).
 * Both blocks resolved to plausible numbers, so nothing failed.
 *
 * This table is what test/design-rules-skins.test.ts compares, and it is meant to grow.
 * A skin whose value is a function of (tokens, intent, size) is invoked with the default
 * arguments (the base size, the resting state), and every such check was first swept
 * across the other arguments to confirm the value it reads does not depend on them, so a
 * check never fails for a guess. Every corner radius in the hand-off that a skin sets is
 * held here, except the few with no single-module reading: a slider and a stepper whose
 * iOS capsule is half their height at each size, and the Dialog and AlertDialog footer
 * buttons, which are kit Buttons. Adding a family here is the cheapest way to widen the
 * guard.
 */

/** A skin value, already reduced to something comparable with a CSS declaration. */
export type SkinValue = number | string | null;

export interface FamilyCheck {
  /** The custom property, without the leading dashes. */
  token: string;
  /**
   * What to pull out of the skin object. Several skin fields are functions of the
   * active colour tokens (a surface needs `tokens.card` to fill with), so the reader
   * is handed a token set to call them with; the shapes and lengths it reads back do
   * not depend on which set. Return null when the skin declares nothing.
   */
  read: (skin: Record<string, unknown>, tokens: Record<string, string>) => SkinValue;
}

export interface SkinFamily {
  /** Display name for the test title. */
  name: string;
  /** Module path under src/, without the `.styles.ts` suffix. */
  module: string;
  checks: FamilyCheck[];
}

/** Read `key` off a nested object path, returning null rather than throwing. */
function at(skin: Record<string, unknown>, ...path: string[]): unknown {
  let node: unknown = skin;
  for (const key of path) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[key];
  }
  return node ?? null;
}

const num = (value: unknown): SkinValue => (typeof value === "number" ? value : null);

/** Call a skin field that is a function of the colour tokens, or return null. */
function styleOf(value: unknown, tokens: Record<string, string>, ...args: unknown[]): Record<string, unknown> | null {
  if (typeof value !== "function") return null;
  const result = (value as (...a: unknown[]) => unknown)(tokens, ...args);
  return typeof result === "object" && result !== null ? (result as Record<string, unknown>) : null;
}

/** Call a skin field with exactly these arguments (no colour tokens put first), or return null. */
function invoke(value: unknown, ...args: unknown[]): Record<string, unknown> | null {
  if (typeof value !== "function") return null;
  const result = (value as (...a: unknown[]) => unknown)(...args);
  return typeof result === "object" && result !== null ? (result as Record<string, unknown>) : null;
}

/**
 * A skin's shadow, as the boxShadow string the web hand-off spells.
 *
 * The test harness aliases react-native to react-native-web, so `shadow()` resolves its
 * WEB branch for every skin, which is the branch the CSS transcribes. A skin that
 * declares no shadow at all reads as "none", the same as the CSS.
 */
function boxShadow(value: unknown): SkinValue {
  if (typeof value !== "object" || value === null) return "none";
  const shadow = (value as Record<string, unknown>).boxShadow;
  return typeof shadow === "string" ? shadow : "none";
}

/** Card's elevation is keyed by name, then tinted by the tokens. */
function callElevation(value: unknown, level: string, tokens: Record<string, string>): unknown {
  return typeof value === "function" ? (value as (e: string, t: Record<string, string>) => unknown)(level, tokens) : null;
}

export const SKIN_FAMILIES: SkinFamily[] = [
  {
    // The family the misplaced fragment broke. Every one of these six resolved to the
    // iOS value on web until platforms.css was repaired.
    name: "Stats",
    module: "molecules/stats/stats",
    checks: [
      { token: "p-stat-radius", read: (s, t) => num(styleOf(s.cardSurface, t)?.borderRadius) },
      { token: "p-stat-pad", read: (s, t) => num(styleOf(s.cardSurface, t)?.padding) },
      { token: "p-stat-gap", read: (s) => num(at(s, "rowGap", "card", "gap")) },
      { token: "p-stat-shadow", read: (s, t) => boxShadow(styleOf(s.cardSurface, t)) },
      { token: "p-stat-value-lh", read: (s, t) => num(styleOf(s.valueText, t)?.lineHeight) },
      { token: "p-stat-value-tracking", read: (s, t) => num(styleOf(s.valueText, t)?.letterSpacing) ?? 0 },
      { token: "p-stat-label-tracking", read: (s, t) => num(styleOf(s.labelText, t)?.letterSpacing) ?? 0 },
    ],
  },
  {
    name: "EmptyState",
    module: "molecules/empty-state/empty-state",
    checks: [{ token: "p-empty-radius", read: (s) => num(at(s, "borderedBase", "borderRadius")) }],
  },
  {
    name: "Card",
    module: "molecules/card/card",
    checks: [
      { token: "p-card-radius", read: (s) => num(at(s, "radius")) },
      {
        token: "p-card-shadow",
        read: (s, t) => boxShadow(callElevation(s.elevation, "default", t)),
      },
      {
        token: "p-card-shadow-raised",
        read: (s, t) => boxShadow(callElevation(s.elevation, "raised", t)),
      },
    ],
  },
  {
    name: "Autocomplete",
    module: "atoms/autocomplete/autocomplete",
    checks: [
      { token: "p-ac-radius", read: (s, t) => { const f = styleOf(s.field, t, "default", false); return num(f?.borderTopStartRadius ?? f?.borderRadius); } },
      { token: "p-ac-radius-bottom", read: (s, t) => { const f = styleOf(s.field, t, "default", false); return num(f?.borderBottomStartRadius ?? f?.borderRadius); } },
      { token: "p-ac-menu-radius", read: (s, t) => num(styleOf(s.popover, t)?.borderRadius) },
      { token: "p-ac-row-radius", read: (s) => num(at(s, "row", "borderRadius")) ?? 0 },
    ],
  },
  {
    name: "Avatar",
    module: "atoms/avatar/avatar",
    checks: [
      { token: "p-avatar-square-radius", read: (s) => num(at(s, "roundedRadius")) },
    ],
  },
  {
    name: "ButtonGroup",
    module: "atoms/button-group/button-group",
    checks: [
      { token: "p-seg-radius", read: (s) => { const c = invoke(s.joinCorners, 0, 3); return num(c?.borderTopStartRadius ?? c?.borderRadius) ?? 0; } },
      { token: "p-seg-track-radius", read: (s, t) => num(styleOf(s.segmentedWrap, t)?.borderRadius) ?? 0 },
      { token: "p-seg-inner-radius", read: (s) => { const c = invoke(s.joinCorners, 1, 3); return num(c?.borderTopStartRadius ?? c?.borderRadius) ?? 0; } },
    ],
  },
  {
    name: "Button",
    module: "atoms/button/button",
    checks: [
      { token: "p-btn-radius", read: (s, t) => num(styleOf(s.container, t, "primary", "base", { icon: false, block: false, dim: false })?.borderRadius) },
    ],
  },
  {
    name: "Checkbox",
    module: "atoms/checkbox/checkbox",
    checks: [
      { token: "p-check-radius", read: (s, t) => num(styleOf(s.box, t, false, "base", false)?.borderRadius) },
    ],
  },
  {
    name: "Chip",
    module: "atoms/chip/chip",
    checks: [
      { token: "p-chip-radius", read: (s) => num(at(s, "base", "borderRadius")) },
    ],
  },
  {
    name: "Dropdown",
    module: "atoms/dropdown/dropdown",
    checks: [
      { token: "p-menu-shadow", read: (s, t) => boxShadow(styleOf(s.menuCard, t)) },
      { token: "p-menu-radius", read: (s, t) => num(styleOf(s.menuCard, t)?.borderRadius) },
      { token: "p-menu-row-radius", read: (s) => num(at(s, "itemRow", "borderRadius")) ?? 0 },
    ],
  },
  {
    name: "Emblem",
    module: "atoms/emblem/emblem",
    checks: [
      { token: "p-emblem-radius-small", read: (s) => num(at(s, "radius", "small")) },
      { token: "p-emblem-radius-default", read: (s) => num(at(s, "radius", "default")) },
      { token: "p-emblem-radius-large", read: (s) => num(at(s, "radius", "large")) },
    ],
  },
  {
    name: "Input",
    module: "atoms/input/input",
    checks: [
      { token: "p-field-radius", read: (s, t) => { const f = styleOf(s.bareField, t, "input", false, false); return num(f?.borderTopStartRadius ?? f?.borderRadius); } },
      { token: "p-field-radius-bottom", read: (s, t) => { const f = styleOf(s.bareField, t, "input", false, false); return num(f?.borderBottomStartRadius ?? f?.borderRadius); } },
    ],
  },
  {
    name: "Pagination",
    module: "atoms/pagination/pagination",
    checks: [
      { token: "p-page-radius", read: (s, t) => num(styleOf(s.pageBox, t, false)?.borderRadius) },
    ],
  },
  {
    name: "Select",
    module: "atoms/select/select",
    checks: [
      { token: "p-select-panel-shadow", read: (s, t) => boxShadow(styleOf(s.panel, t)) },
      { token: "p-select-radius", read: (s, t) => { const f = styleOf(s.trigger, t, "default", false); return num(f?.borderTopStartRadius ?? f?.borderRadius); } },
      { token: "p-select-radius-bottom", read: (s, t) => { const f = styleOf(s.trigger, t, "default", false); return num(f?.borderBottomStartRadius ?? f?.borderRadius); } },
      { token: "p-select-panel-radius", read: (s, t) => num(styleOf(s.panel, t)?.borderRadius) },
      { token: "p-select-row-radius", read: (s, t) => num(styleOf(s.optionRow, t, false)?.borderRadius) ?? 0 },
    ],
  },
  {
    name: "Stepper",
    module: "atoms/stepper/stepper",
    checks: [
      { token: "p-stepper-btn-radius", read: (s, t) => num(styleOf(s.button, t, "base", "left", false, false)?.borderRadius) ?? 0 },
    ],
  },
  {
    name: "Textarea",
    module: "atoms/textarea/textarea",
    checks: [
      { token: "p-field-radius", read: (s, t) => { const f = styleOf(s.field, t, { error: false, focused: false }); return num(f?.borderTopStartRadius ?? f?.borderRadius); } },
      { token: "p-field-radius-bottom", read: (s, t) => { const f = styleOf(s.field, t, { error: false, focused: false }); return num(f?.borderBottomStartRadius ?? f?.borderRadius); } },
    ],
  },
  {
    name: "Accordion",
    module: "molecules/accordion/accordion",
    checks: [
      { token: "p-acc-card-radius", read: (s, t) => num(styleOf(s.cardContainer, t)?.borderRadius) },
      { token: "p-acc-container-radius", read: (s, t) => num(styleOf(s.container, t)?.borderRadius) ?? 0 },
    ],
  },
  {
    name: "AlertDialog",
    module: "molecules/alert-dialog/alert-dialog",
    checks: [
      { token: "p-ad-radius", read: (s, t) => num(styleOf(s.card, t)?.borderRadius) },
    ],
  },
  {
    name: "Alert",
    module: "molecules/alert/alert",
    checks: [
      { token: "p-alert-radius", read: (s) => num(at(s, "container", "borderRadius")) },
    ],
  },
  {
    name: "DescriptionList",
    module: "molecules/description-lists/description-lists",
    checks: [
      { token: "p-dl-shadow", read: (s, t) => boxShadow(styleOf(s.cardShadow, t)) },
      { token: "p-dl-radius", read: (s) => num(at(s, "cardRadius")) },
    ],
  },
  {
    name: "Feed",
    module: "molecules/feeds/feeds",
    checks: [
      { token: "p-feed-radius", read: (s, t) => num(styleOf(s.cardSurface, t)?.borderRadius) },
    ],
  },
  {
    name: "GridList",
    module: "molecules/grid-lists/grid-lists",
    checks: [
      { token: "p-grid-gallery-radius", read: (s) => num(at(s, "galleryRadius")) },
    ],
  },
  {
    name: "MediaObject",
    module: "molecules/media-objects/media-objects",
    checks: [
      { token: "p-media-radius", read: (s, t) => num(styleOf(s.borderedSurface, t)?.borderRadius) },
      { token: "p-media-shadow", read: (s, t) => boxShadow(styleOf(s.borderedSurface, t)) },
      { token: "p-media-icon-radius", read: (s) => num(at(s, "iconBox", "borderRadius")) },
    ],
  },
  {
    name: "StackedList",
    module: "molecules/stacked-lists/stacked-lists",
    checks: [
      { token: "p-list-shadow", read: (s, t) => boxShadow(styleOf(s.cardSurface, t)) },
      { token: "p-list-radius", read: (s, t) => num(styleOf(s.cardSurface, t)?.borderRadius) },
    ],
  },
  {
    name: "ActionSheet",
    module: "organisms/action-sheet/action-sheet",
    checks: [
      { token: "p-sheet-card-radius-top", read: (s, t) => { const c = styleOf(s.actionsCard, t); return num(c?.borderTopStartRadius ?? c?.borderRadius) ?? 0; } },
      { token: "p-sheet-card-radius", read: (s, t) => { const c = styleOf(s.actionsCard, t); return num(c?.borderBottomStartRadius ?? c?.borderRadius) ?? 0; } },
      { token: "p-sheet-row-radius", read: (s) => num(at(s, "row", "borderRadius")) ?? 0 },
    ],
  },
  {
    name: "Board",
    module: "organisms/board/board",
    checks: [
      { token: "p-board-col-radius", read: (s, t) => num(styleOf(s.column, t, false)?.borderRadius) },
      { token: "p-board-card-radius", read: (s) => num(at(s, "pressableBody", "borderRadius")) },
    ],
  },
  {
    name: "Calendar",
    module: "organisms/calendar/calendar",
    checks: [
      { token: "p-cal-radius", read: (s) => num(at(s, "containerBase", "borderRadius")) },
      { token: "p-cal-chevron-radius", read: (s) => num(at(s, "chevron", "borderRadius")) },
    ],
  },
  {
    name: "Carousel",
    module: "organisms/carousel/carousel",
    checks: [
      { token: "p-carousel-slide-radius", read: (s, t) => num(styleOf(s.slide, t)?.borderRadius) },
    ],
  },
  {
    name: "Dialog",
    module: "organisms/dialog/dialog",
    checks: [
      { token: "p-dialog-shadow", read: (s, t) => boxShadow(styleOf(s.card, t)) },
      { token: "p-dialog-radius", read: (s, t) => num(styleOf(s.card, t)?.borderRadius) },
    ],
  },
  {
    name: "Drawer",
    module: "organisms/drawer/drawer",
    checks: [
      { token: "p-drawer-side-radius", read: (s, t) => num(invoke(s.panelShape, "left", 320, t)?.borderTopEndRadius) },
      { token: "p-drawer-sheet-radius", read: (s, t) => num(invoke(s.panelShape, "bottom", 320, t)?.borderTopStartRadius) },
    ],
  },
  {
    name: "Navbar",
    module: "organisms/navbars/navbars",
    checks: [
      { token: "p-nav-link-radius", read: (s, t) => num(styleOf(s.linkTile, t, false)?.borderRadius) },
    ],
  },
  {
    name: "Sidebar",
    module: "organisms/sidebar/sidebar",
    checks: [
      { token: "p-side-toggle-radius", read: (s, t) => num(styleOf(s.collapseToggle, t)?.borderRadius) ?? 0 },
      { token: "p-side-row-radius", read: (s, t) => num(styleOf(s.row, t, "default", false)?.borderRadius) },
    ],
  },
  {
    name: "Steps",
    module: "organisms/steps/steps",
    checks: [
      { token: "p-steps-connector-radius", read: (s, t) => num(styleOf(s.connector, t, false)?.borderRadius) ?? 0 },
    ],
  },
  {
    name: "Toast",
    module: "organisms/toast/toast",
    checks: [
      { token: "p-toast-radius", read: (s, t) => num(styleOf(s.container, t)?.borderRadius) },
    ],
  },
  {
    name: "Badge",
    module: "atoms/badge/badge",
    checks: [{ token: "p-badge-radius", read: (s) => num(at(s, "metaBase", "borderRadius")) }],
  },
  {
    name: "InputOTP",
    module: "atoms/input-otp/input-otp",
    checks: [
      // The cells are separate fields, so the outer and inner corners are the cell's own.
      { token: "p-otp-radius", read: (s, t) => num(styleOf(s.cell, t, "base", { active: false, filled: false })?.borderRadius) },
      { token: "p-otp-inner-radius", read: (s, t) => num(styleOf(s.cell, t, "base", { active: false, filled: false })?.borderRadius) },
    ],
  },
  {
    name: "Popover",
    module: "atoms/popover/popover",
    checks: [
      { token: "p-popover-radius", read: (s, t) => num(styleOf(s.card, t)?.borderRadius) },
      { token: "p-popover-shadow", read: (s, t) => boxShadow(styleOf(s.card, t)) },
    ],
  },
  {
    name: "Swatch",
    module: "atoms/swatch/swatch",
    checks: [
      { token: "p-swatch-radius-small", read: (s) => num(at(s, "radius", "small")) },
      { token: "p-swatch-radius-default", read: (s) => num(at(s, "radius", "default")) },
      { token: "p-swatch-radius-large", read: (s) => num(at(s, "radius", "large")) },
    ],
  },
  {
    name: "Tooltip",
    module: "atoms/tooltip/tooltip",
    checks: [
      { token: "p-tip-radius", read: (s, t) => num(styleOf(s.bubble, t)?.borderRadius) },
      { token: "p-tip-shadow", read: (s, t) => boxShadow(styleOf(s.bubble, t)) },
    ],
  },
  {
    name: "Command",
    module: "organisms/command/command",
    checks: [{ token: "p-cmd-radius", read: (s, t) => num(styleOf(s.panel, t)?.borderRadius) }],
  },
  {
    name: "DataTable",
    module: "organisms/data-table/data-table",
    checks: [{ token: "p-table-radius", read: (s, t) => num(styleOf(s.borderedOutline, t)?.borderRadius) }],
  },
  {
    name: "DragHandle",
    module: "organisms/drag-drop/drag-drop",
    checks: [
      { token: "p-drag-handle-size", read: (s) => num(at(s, "handle", "width")) },
      { token: "p-drag-handle-radius", read: (s) => num(at(s, "handle", "borderRadius")) },
      { token: "p-drag-handle-icon", read: (s) => num(at(s, "handleIconSize")) },
    ],
  },
  {
    name: "TabBar",
    module: "organisms/tab-bar/tab-bar",
    checks: [
      { token: "p-tabbar-radius", read: (s, t) => num(styleOf(s.bar, t)?.borderRadius) ?? 0 },
      { token: "p-tabbar-item-radius", read: (s) => num(at(s, "item", "borderRadius")) ?? 0 },
    ],
  },
  {
    name: "Tabs",
    module: "organisms/tabs/tabs",
    checks: [
      { token: "p-tab-track-radius", read: (s, t) => num(styleOf(s.underlineRow, t, false)?.borderRadius) ?? 0 },
      { token: "p-tab-item-radius", read: (s, t) => num(styleOf(s.underlineTrigger, t, false, false)?.borderRadius) ?? 0 },
      { token: "p-tab-pill-track-radius", read: (s, t) => num(styleOf(s.pillsRow, t, false)?.borderRadius) ?? 0 },
      { token: "p-tab-pill-radius", read: (s, t) => num(styleOf(s.pillsTrigger, t)?.borderRadius) ?? 0 },
      { token: "p-tab-v-radius", read: (s, t) => num(styleOf(s.verticalTrigger, t)?.borderRadius) ?? 0 },
    ],
  },
];

/**
 * Compare a skin value with a CSS declaration.
 *
 * Numbers arrive from the CSS as lengths ("12px"), and shadow strings differ only in
 * the spacing inside rgba(), which no browser cares about, so both sides are reduced
 * before the comparison rather than being compared as authored.
 */
export function normalize(value: SkinValue | string | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  const text = value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const asLength = /^(-?[\d.]+)px$/.exec(text);
  if (asLength) return String(Number(asLength[1]));
  if (/^-?[\d.]+$/.test(text)) return String(Number(text));
  return text.replace(/\s+/g, "");
}
