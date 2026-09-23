// Canvas design tokens, as plain JS values. RN-usable: no CSS variables, no
// document access. Light and dark color sets plus numeric scales for spacing,
// radius, type, and breakpoints. Components read these (via useTheme for the
// scheme-aware color set) and build their RN style objects from them.

export type ColorScheme = "light" | "dark";

/** Semantic color tokens. The named surface/intent colors components paint with. */
export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  /** Brand text on neutral/tinted surfaces. Omit in legacy maps to use primary. */
  "primary-text"?: string;
  "primary-foreground": string;
  /**
   * The CALL-TO-ACTION fill: the primary Button and the split button's action. Kept
   * apart from `primary`, which paints what is selected, checked, current, linked or
   * focused (the Dark Factory design language draws actions green and selection
   * violet). Omit in legacy maps to paint actions with `primary`; a `tokens` override
   * that sets only `primary` repaints the actions too.
   */
  action?: string;
  /** The label and icon ink on an `action` fill. Omit to use `primary-foreground`. */
  "action-foreground"?: string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  /** Error/action text on neutral surfaces. Omit in legacy maps to use destructive. */
  "destructive-text"?: string;
  "destructive-foreground": string;
  success: string;
  "success-foreground": string;
  warning: string;
  "warning-foreground": string;
  border: string;
  input: string;
  /**
   * The RESTING border of a text field on the web and iOS skins (Input, Textarea,
   * Select, Autocomplete, InputOTP, Stepper, PhoneInput, the Command trigger), and
   * only there: Dark Factory's field line densified on the card until it stands apart
   * from the `border` hairline, which sits BELOW the 3:1 control floor `input` holds (see
   * `fieldBorder` in src/style/field-colors.ts for the disclosed trade-off). Focus
   * and error still paint `ring` and `destructive`, and every non-field control
   * (checkbox, radio, switch, pagination, the outline button) keeps `input`. Omit
   * in legacy maps to rest on `input`.
   */
  "field-border"?: string;
  ring: string;
  /**
   * The soft washes (Dark Factory's `*Soft`): a status or selection color at low alpha,
   * the fill behind a toned badge, an alert band or a tonal selection. Translucent
   * (`rgba`) by contract: composite one on the surface it sits on before measuring it.
   * Omit in legacy maps; a skin then washes the role's own color itself.
   */
  "primary-soft"?: string;
  "success-soft"?: string;
  "warning-soft"?: string;
  "destructive-soft"?: string;
  /** A text field's own fill (DF's translucent white well). Translucent. Omit to fill with `card`. */
  "field-fill"?: string;
  /** The modal backdrop (DF's tinted dim). Translucent. Omit to dim with black. */
  scrim?: string;
  /** The elevation tint (DF's palette-tinted shadow color). Translucent. Omit to shade with the ink. */
  shade?: string;
  /** The inverse surface (DF's dark toast pill) and the ink on it. Omit to invert `foreground`. */
  inverse?: string;
  "inverse-foreground"?: string;
  // Categorical data-viz series colors, assigned to series in fixed order
  // (series 1 is always chart-1, never re-ranked when a series is filtered
  // out). One validated palette serves both schemes: every value passes the
  // computable data-viz checks (OKLCH lightness band, chroma floor, adjacent-
  // pair colorblind separation, >=3:1 contrast) against the light AND dark
  // card surfaces, and none collides with a reserved status token
  // (destructive/success/warning).
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  "chart-6": string;
  "chart-7": string;
  "chart-8": string;
}

// The semantic color values below are the sRGB rendering of the WEB hand-off
// (styles/tokens/colors.css), which is the single source of truth for what these
// tokens ARE. RN cannot parse oklch(), so the hand-off's values are carried as the hex
// they resolve to (and the translucent roles as the same rgba), and
// scripts/validate-tokens.ts fails the build on any drift. Change a value in the CSS
// hand-off first, never only here.
//
// The values are Dark Factory's (CLAUDE.md, "Design language: Dark Factory"): its blush
// palette for the light scheme and its dark palette for the dark scheme, each role a DF
// value, a formula over DF values, or a DF color whose lightness was moved the least that
// clears a kit legibility floor. tools/darkfactory/derive-tokens.ts derives them from
// the vendored DF theme and tools/darkfactory/tokens.json records each role's source;
// scripts/check-df-parity.ts keeps the hand-off and this file equal to that table.
export const lightColors: ColorTokens = {
  background: "#f5f2fe",
  foreground: "#3b3c5c",
  card: "#ffffff",
  "card-foreground": "#3b3c5c",
  popover: "#ffffff",
  "popover-foreground": "#3b3c5c",
  primary: "#7262e5",
  "primary-text": "#5d48c9",
  "primary-foreground": "#ffffff",
  "primary-soft": "rgba(123, 108, 240, 0.14)",
  action: "#21804b",
  "action-foreground": "#ffffff",
  secondary: "#f5f2fc",
  "secondary-foreground": "#3b3c5c",
  muted: "#f5f2fc",
  "muted-foreground": "#696b8d",
  accent: "#f4f3fe",
  "accent-foreground": "#3b3c5c",
  destructive: "#b53a44",
  "destructive-text": "#9a1f2f",
  "destructive-foreground": "#ffffff",
  "destructive-soft": "rgba(181, 58, 68, 0.12)",
  success: "#0b7440",
  "success-foreground": "#ffffff",
  "success-soft": "rgba(33, 128, 75, 0.12)",
  warning: "#965801",
  "warning-foreground": "#ffffff",
  "warning-soft": "rgba(240, 160, 40, 0.18)",
  border: "#eae8f3",
  input: "#898ba0",
  "field-border": "#d6d3e7",
  "field-fill": "rgba(255, 255, 255, 0.7)",
  ring: "#7b6cf0",
  scrim: "rgba(40, 30, 90, 0.28)",
  shade: "rgba(121, 100, 214, 0.22)",
  inverse: "#26264a",
  "inverse-foreground": "#ffffff",
  "chart-1": "#7b6cf0",
  "chart-2": "#03919d",
  "chart-3": "#d36225",
  "chart-4": "#d25798",
  "chart-5": "#4382e3",
  "chart-6": "#009574",
  "chart-7": "#b560cf",
  "chart-8": "#a37e05",
};

export const darkColors: ColorTokens = {
  background: "#272544",
  foreground: "#ebebf7",
  card: "#252741",
  "card-foreground": "#ebebf7",
  popover: "#252741",
  "popover-foreground": "#ebebf7",
  primary: "#a496ff",
  "primary-text": "#b8b0ff",
  "primary-foreground": "#221f3a",
  "primary-soft": "rgba(164, 150, 255, 0.16)",
  action: "#5fd18a",
  "action-foreground": "#0d2a17",
  secondary: "#2d2f4c",
  "secondary-foreground": "#ebebf7",
  muted: "#2d2f4c",
  "muted-foreground": "#a3a5c6",
  accent: "#323254",
  "accent-foreground": "#ebebf7",
  destructive: "#ff8b93",
  "destructive-text": "#ffadb0",
  "destructive-foreground": "#38181b",
  "destructive-soft": "rgba(255, 139, 147, 0.16)",
  success: "#5fd18a",
  "success-foreground": "#0d2a17",
  "success-soft": "rgba(95, 209, 138, 0.16)",
  warning: "#ffc46b",
  "warning-foreground": "#311f03",
  "warning-soft": "rgba(255, 180, 80, 0.16)",
  border: "#3b3d54",
  input: "#7c7e93",
  "field-border": "#44455c",
  "field-fill": "rgba(255, 255, 255, 0.06)",
  ring: "#a496ff",
  scrim: "rgba(5, 5, 20, 0.55)",
  shade: "rgba(0, 0, 0, 0.5)",
  inverse: "#26264a",
  "inverse-foreground": "#ffffff",
  "chart-1": "#7b6cf0",
  "chart-2": "#03919d",
  "chart-3": "#d36225",
  "chart-4": "#d25798",
  "chart-5": "#4382e3",
  "chart-6": "#009574",
  "chart-7": "#b560cf",
  "chart-8": "#a37e05",
};

export const colorsByScheme: Record<ColorScheme, ColorTokens> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * The glass material's own tokens, per scheme, one tint per density layer.
 * These densities do not choose static versus liquid material or custom motion.
 * The role-based contract uses intentional static content panes and functional
 * liquid surfaces, with unpainted layout, foreground content and data ink.
 * Readability must be verified on actual composed backgrounds, not inferred from
 * a token or a passing contrast check against one backdrop.
 *
 *   glass-tint          the FUNCTIONAL layer: bars, sidebars, tab bars, sheets,
 *                       drawers, popovers, dialogs, the command palette. The
 *                       thinnest tint; the material does most of the read.
 *   glass-tint-content  CONTENT panes: cards, tables, lists, tiles, feeds, the
 *                       calendar, chart frames, the docs stages. Dense enough
 *                       that `foreground` text clears 4.5:1 over the page and
 *                       over the aurora backdrop (test/glass-tint.test.tsx).
 *   glass-tint-control  CONTROLS: fields, buttons, segmented controls, chips,
 *                       badges, pills, the check and switch pucks. A brighter
 *                       "puck" than the pane it sits on, in both schemes.
 *   glass-tint-dense    the surfaces the user READS rows or a verdict from: option
 *                       lists (dropdown, select, autocomplete, row menus), alert
 *                       dialogs, toasts. The densest tint, so the page's own rows
 *                       and rules never read between the menu's.
 *
 * The material carries its OWN fill; glass mode swaps NO semantic color token
 * (`card` and `popover` stay opaque in the token set, and a surface that opts out of
 * the material keeps its opaque fill). Every surface takes its tint UNDER the real
 * material selected by the shared renderer for the role and available capability.
 * Native Liquid Glass, static frost and the web lens are distinct material paths.
 * A tint alone is neither proof of real blur nor a complete solid fallback.
 * Missing or unsafe material capability requires the original opaque fill,
 * foreground, boundary and elevation; layout and semantic state must survive.
 *
 * Keys are the CSS custom-property names verbatim (`glass-tint` is `--glass-tint` in
 * styles/tokens/colors.css). The CSS hand-off carries the WEB frost's tints, Dark
 * Factory's (src/style/glass-surface/web-frost.ts), and scripts/validate-tokens.ts
 * holds the two together. `glassByScheme` below is the NATIVE set: iOS Liquid Glass and
 * frost and the Android blur read it, unchanged since the web took Dark Factory's frost.
 * Values are rgba so they compose over whatever sits behind the surface.
 */
export interface GlassTokens {
  /** The functional layer's under-fill (bars, sheets, popovers, dialogs). */
  "glass-tint": string;
  /** The content pane's under-fill (cards, tables, lists, tiles, stages). */
  "glass-tint-content": string;
  /** The control puck's under-fill (fields, buttons, chips, badges, pills). */
  "glass-tint-control": string;
  /** The densest under-fill (option lists, alert dialogs, toasts). */
  "glass-tint-dense": string;
}

export const lightGlass: GlassTokens = {
  "glass-tint": "rgba(255, 255, 255, 0.20)",
  "glass-tint-content": "rgba(255, 255, 255, 0.62)",
  "glass-tint-control": "rgba(255, 255, 255, 0.70)",
  "glass-tint-dense": "rgba(255, 255, 255, 0.88)",
};

export const darkGlass: GlassTokens = {
  // Dark glass: less light behind it to bend, so the tint drops dimmer rather than
  // brighter, and the rim carries more of the read (see --glass-tint in the .dark
  // block of styles/tokens/colors.css). The content and dense panes deepen the same
  // ink; the control puck is the one LIGHT tint, so a field or button lifts off its
  // dark pane the way a lit glass control does.
  "glass-tint": "rgba(22, 22, 28, 0.30)",
  "glass-tint-content": "rgba(22, 22, 28, 0.55)",
  "glass-tint-control": "rgba(255, 255, 255, 0.12)",
  "glass-tint-dense": "rgba(22, 22, 28, 0.84)",
};

/**
 * The native glass tints per scheme (iOS Liquid Glass and frost, the Android blur). The
 * web's are Dark Factory's frost tints; read the active platform's through
 * `useTheme().glass`.
 */
export const glassByScheme: Record<ColorScheme, GlassTokens> = {
  light: lightGlass,
  dark: darkGlass,
};

/**
 * Fixed brand constants. Unlike the semantic tokens these do NOT flip with the
 * scheme: the sign-in orbs and the avatar gradient are brand marks, and a mark
 * that changed hue between light and dark would stop being one mark. Keys are the
 * CSS custom-property names verbatim (`orb-indigo` is `--orb-indigo` in
 * styles/tokens/colors.css); scripts/validate-tokens.ts fails the build if a key
 * here has no matching `--name` in the shipped CSS.
 */
export interface BrandColors {
  "orb-indigo": string;
  "orb-violet": string;
  "orb-cyan": string;
}

// The keys are historical (the orbs were indigo/violet/cyan and renaming them would
// break consumers reading `brandColors["orb-indigo"]`); the values are the former
// Riskora sky family: sky/400, blue/300, sky/400 dark.
/**
 * @deprecated The brand orbs painted the removed Backdrop organism, and the kit's colors
 * are Dark Factory's now; nothing in the kit reads these. Kept, with their former values,
 * until an owner-authorized major removes them (the `--orb-*` custom properties too).
 */
export const brandColors: BrandColors = {
  "orb-indigo": "#3da3f5",
  "orb-violet": "#6676ff",
  "orb-cyan": "#68cdff",
};

/** Fixed, scheme-independent base colors. */
export const baseColors: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
};

/**
 * The standard Tailwind v3 color-hue palette, scheme-independent. Color-coded
 * components that need hues beyond the semantic tokens read from here. Keyed
 * "<hue>-<step>" (e.g. "red-500"), values are the canonical Tailwind v3 hexes,
 * lowercase.
 */
export const palette: Record<string, string> = {
  // slate
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  // gray
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",
  "gray-950": "#030712",
  // zinc
  "zinc-50": "#fafafa",
  "zinc-100": "#f4f4f5",
  "zinc-200": "#e4e4e7",
  "zinc-300": "#d4d4d8",
  "zinc-400": "#a1a1aa",
  "zinc-500": "#71717a",
  "zinc-600": "#52525b",
  "zinc-700": "#3f3f46",
  "zinc-800": "#27272a",
  "zinc-900": "#18181b",
  "zinc-950": "#09090b",
  // neutral
  "neutral-50": "#fafafa",
  "neutral-100": "#f5f5f5",
  "neutral-200": "#e5e5e5",
  "neutral-300": "#d4d4d4",
  "neutral-400": "#a3a3a3",
  "neutral-500": "#737373",
  "neutral-600": "#525252",
  "neutral-700": "#404040",
  "neutral-800": "#262626",
  "neutral-900": "#171717",
  "neutral-950": "#0a0a0a",
  // stone
  "stone-50": "#fafaf9",
  "stone-100": "#f5f5f4",
  "stone-200": "#e7e5e4",
  "stone-300": "#d6d3d1",
  "stone-400": "#a8a29e",
  "stone-500": "#78716c",
  "stone-600": "#57534e",
  "stone-700": "#44403c",
  "stone-800": "#292524",
  "stone-900": "#1c1917",
  "stone-950": "#0c0a09",
  // red
  "red-50": "#fef2f2",
  "red-100": "#fee2e2",
  "red-200": "#fecaca",
  "red-300": "#fca5a5",
  "red-400": "#f87171",
  "red-500": "#ef4444",
  "red-600": "#dc2626",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
  "red-900": "#7f1d1d",
  "red-950": "#450a0a",
  // orange
  "orange-50": "#fff7ed",
  "orange-100": "#ffedd5",
  "orange-200": "#fed7aa",
  "orange-300": "#fdba74",
  "orange-400": "#fb923c",
  "orange-500": "#f97316",
  "orange-600": "#ea580c",
  "orange-700": "#c2410c",
  "orange-800": "#9a3412",
  "orange-900": "#7c2d12",
  "orange-950": "#431407",
  // amber
  "amber-50": "#fffbeb",
  "amber-100": "#fef3c7",
  "amber-200": "#fde68a",
  "amber-300": "#fcd34d",
  "amber-400": "#fbbf24",
  "amber-500": "#f59e0b",
  "amber-600": "#d97706",
  "amber-700": "#b45309",
  "amber-800": "#92400e",
  "amber-900": "#78350f",
  "amber-950": "#451a03",
  // yellow
  "yellow-50": "#fefce8",
  "yellow-100": "#fef9c3",
  "yellow-200": "#fef08a",
  "yellow-300": "#fde047",
  "yellow-400": "#facc15",
  "yellow-500": "#eab308",
  "yellow-600": "#ca8a04",
  "yellow-700": "#a16207",
  "yellow-800": "#854d0e",
  "yellow-900": "#713f12",
  "yellow-950": "#422006",
  // lime
  "lime-50": "#f7fee7",
  "lime-100": "#ecfccb",
  "lime-200": "#d9f99d",
  "lime-300": "#bef264",
  "lime-400": "#a3e635",
  "lime-500": "#84cc16",
  "lime-600": "#65a30d",
  "lime-700": "#4d7c0f",
  "lime-800": "#3f6212",
  "lime-900": "#365314",
  "lime-950": "#1a2e05",
  // green
  "green-50": "#f0fdf4",
  "green-100": "#dcfce7",
  "green-200": "#bbf7d0",
  "green-300": "#86efac",
  "green-400": "#4ade80",
  "green-500": "#22c55e",
  "green-600": "#16a34a",
  "green-700": "#15803d",
  "green-800": "#166534",
  "green-900": "#14532d",
  "green-950": "#052e16",
  // emerald
  "emerald-50": "#ecfdf5",
  "emerald-100": "#d1fae5",
  "emerald-200": "#a7f3d0",
  "emerald-300": "#6ee7b7",
  "emerald-400": "#34d399",
  "emerald-500": "#10b981",
  "emerald-600": "#059669",
  "emerald-700": "#047857",
  "emerald-800": "#065f46",
  "emerald-900": "#064e3b",
  "emerald-950": "#022c22",
  // teal
  "teal-50": "#f0fdfa",
  "teal-100": "#ccfbf1",
  "teal-200": "#99f6e4",
  "teal-300": "#5eead4",
  "teal-400": "#2dd4bf",
  "teal-500": "#14b8a6",
  "teal-600": "#0d9488",
  "teal-700": "#0f766e",
  "teal-800": "#115e59",
  "teal-900": "#134e4a",
  "teal-950": "#042f2e",
  // cyan
  "cyan-50": "#ecfeff",
  "cyan-100": "#cffafe",
  "cyan-200": "#a5f3fc",
  "cyan-300": "#67e8f9",
  "cyan-400": "#22d3ee",
  "cyan-500": "#06b6d4",
  "cyan-600": "#0891b2",
  "cyan-700": "#0e7490",
  "cyan-800": "#155e75",
  "cyan-900": "#164e63",
  "cyan-950": "#083344",
  // sky
  "sky-50": "#f0f9ff",
  "sky-100": "#e0f2fe",
  "sky-200": "#bae6fd",
  "sky-300": "#7dd3fc",
  "sky-400": "#38bdf8",
  "sky-500": "#0ea5e9",
  "sky-600": "#0284c7",
  "sky-700": "#0369a1",
  "sky-800": "#075985",
  "sky-900": "#0c4a6e",
  "sky-950": "#082f49",
  // blue
  "blue-50": "#eff6ff",
  "blue-100": "#dbeafe",
  "blue-200": "#bfdbfe",
  "blue-300": "#93c5fd",
  "blue-400": "#60a5fa",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "blue-700": "#1d4ed8",
  "blue-800": "#1e40af",
  "blue-900": "#1e3a8a",
  "blue-950": "#172554",
  // indigo
  "indigo-50": "#eef2ff",
  "indigo-100": "#e0e7ff",
  "indigo-200": "#c7d2fe",
  "indigo-300": "#a5b4fc",
  "indigo-400": "#818cf8",
  "indigo-500": "#6366f1",
  "indigo-600": "#4f46e5",
  "indigo-700": "#4338ca",
  "indigo-800": "#3730a3",
  "indigo-900": "#312e81",
  "indigo-950": "#1e1b4b",
  // violet
  "violet-50": "#f5f3ff",
  "violet-100": "#ede9fe",
  "violet-200": "#ddd6fe",
  "violet-300": "#c4b5fd",
  "violet-400": "#a78bfa",
  "violet-500": "#8b5cf6",
  "violet-600": "#7c3aed",
  "violet-700": "#6d28d9",
  "violet-800": "#5b21b6",
  "violet-900": "#4c1d95",
  "violet-950": "#2e1065",
  // purple
  "purple-50": "#faf5ff",
  "purple-100": "#f3e8ff",
  "purple-200": "#e9d5ff",
  "purple-300": "#d8b4fe",
  "purple-400": "#c084fc",
  "purple-500": "#a855f7",
  "purple-600": "#9333ea",
  "purple-700": "#7e22ce",
  "purple-800": "#6b21a8",
  "purple-900": "#581c87",
  "purple-950": "#3b0764",
  // fuchsia
  "fuchsia-50": "#fdf4ff",
  "fuchsia-100": "#fae8ff",
  "fuchsia-200": "#f5d0fe",
  "fuchsia-300": "#f0abfc",
  "fuchsia-400": "#e879f9",
  "fuchsia-500": "#d946ef",
  "fuchsia-600": "#c026d3",
  "fuchsia-700": "#a21caf",
  "fuchsia-800": "#86198f",
  "fuchsia-900": "#701a75",
  "fuchsia-950": "#4a044e",
  // pink
  "pink-50": "#fdf2f8",
  "pink-100": "#fce7f3",
  "pink-200": "#fbcfe8",
  "pink-300": "#f9a8d4",
  "pink-400": "#f472b6",
  "pink-500": "#ec4899",
  "pink-600": "#db2777",
  "pink-700": "#be185d",
  "pink-800": "#9d174d",
  "pink-900": "#831843",
  "pink-950": "#500724",
  // rose
  "rose-50": "#fff1f2",
  "rose-100": "#ffe4e6",
  "rose-200": "#fecdd3",
  "rose-300": "#fda4af",
  "rose-400": "#fb7185",
  "rose-500": "#f43f5e",
  "rose-600": "#e11d48",
  "rose-700": "#be123c",
  "rose-800": "#9f1239",
  "rose-900": "#881337",
  "rose-950": "#4c0519",
};

/** Spacing scale in px (Tailwind rem * 16). Keys are the Tailwind step names. */
export const spacing: Record<string, number> = {
  "0": 0,
  px: 1,
  "0.5": 2,
  "1": 4,
  "1.5": 6,
  "2": 8,
  "2.5": 10,
  "3": 12,
  "3.5": 14,
  "4": 16,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "9": 36,
  "10": 40,
  "11": 44,
  "12": 48,
  "14": 56,
  "16": 64,
  "20": 80,
  "24": 96,
  "28": 112,
  "32": 128,
  "36": 144,
  "40": 160,
  "48": 192,
  "56": 224,
  "64": 256,
};

/** Border radius scale in px. */
export const radius: Record<string, number> = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 24,
  full: 9999,
};

/** The platforms a skin file is written for. */
export type PlatformKey = "web" | "ios" | "android";

/**
 * The corner radii a platform's skins share, by what the corner belongs to. Skins
 * read these instead of spelling a number, so a shape decision is made once per
 * platform: `control` is a rectangular control (an icon button, a menu row, a nav highlight;
 * a capsule control reads `pill`);
 * `field` a text field, select, or autocomplete box; `card` a content surface;
 * `dialog` a dialog, alert, or toast; `menu` a menu, popover, or select list;
 * `sheet` a sheet, drawer, or app shell; `checkbox` the box of a checkbox; `pill`
 * a chip, badge, or capsule; `tile` a KPI card, a stat tile or an icon tile. The web
 * skins consume these (Dark Factory's shapes); the
 * iOS and Android rows record the values their skins already spell per component,
 * so the three columns can be read side by side. Mirrored as `--radius-*` in
 * styles/tokens/radius.css.
 */
export interface ShapeTokens {
  control: number;
  field: number;
  card: number;
  dialog: number;
  menu: number;
  sheet: number;
  checkbox: number;
  pill: number;
  /** A tile: a KPI card, a stat tile, an icon tile; tighter than a content card. */
  tile: number;
}

export const shape: Record<PlatformKey, ShapeTokens> = {
  // Dark Factory: 8 on rectangular controls (an icon button, a menu row, a nav highlight),
  // 10 on fields, 12 on menus and tiles, 14 on cards, 18 on dialogs, 22 on sheets and the
  // shell, a 6 checkbox; every capsule (a chip, a badge, a pill button) reads `pill`.
  web: { control: 8, field: 10, card: 14, dialog: 18, menu: 12, sheet: 22, checkbox: 6, pill: 9999, tile: 12 },
  // HIG / iOS 26: capsule buttons, 8 rounded-border fields (the iOS input-field kit), 12 grouped surfaces
  // with the continuous curve, 28 alerts, 26 menus, the 38 sheet corner, a 5 box.
  ios: { control: 9999, field: 8, card: 12, dialog: 28, menu: 26, sheet: 38, checkbox: 5, pill: 9999, tile: 12 },
  // Material 3: stadium buttons, the 4 filled-field top corner, the 12 medium shape
  // for cards, 28 extra-large dialogs and sheets, 4 extra-small menus, a 2 box.
  android: { control: 9999, field: 4, card: 12, dialog: 28, menu: 4, sheet: 28, checkbox: 2, pill: 9999, tile: 12 },
};

/**
 * Font size and matching line height, in px: the Riskora ladder (Paragraph X Small
 * 12 up to Title H1 64), mirrored in styles/tokens/typography.css `--text-*` /
 * `--leading-*`.
 */
export const fontSize: Record<string, { fontSize: number; lineHeight: number }> = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 30 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 28, lineHeight: 36 },
  "4xl": { fontSize: 36, lineHeight: 44 },
  "5xl": { fontSize: 40, lineHeight: 48 },
  "6xl": { fontSize: 55, lineHeight: 64 },
  "7xl": { fontSize: 64, lineHeight: 70 },
};

/** Font weights (RN expects string values). */
export const fontWeight: Record<string, string> = {
  thin: "100",
  extralight: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
};

/** Letter spacing (tracking) in px. */
export const letterSpacing: Record<string, number> = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
};

/** Line height (leading) in px. Relative leadings are approximated as absolute. */
export const lineHeight: Record<string, number> = {
  none: 16,
  tight: 18,
  snug: 20,
  normal: 24,
  relaxed: 28,
  loose: 32,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "7": 28,
  "8": 32,
  "9": 36,
  "10": 40,
};

/** The breakpoint keys, in ascending pixel order. */
export type BreakpointKey = "sm" | "md" | "lg" | "xl" | "2xl";

/** Desktop-first breakpoints in px: a variant applies at this width and below. */
export const breakpoints: Record<BreakpointKey, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/** The width-scale steps, narrowest first. */
export type WidthKey = "xxxs" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl" | "wide" | "wider" | "widest" | "page";

/**
 * The one width scale every bounds-providing container draws from: Container's
 * measure axis, the Dialog and AlertDialog panels, the floating overlays, and any
 * call site that used to pin a `maxWidth` by hand. The values are Tailwind's
 * `max-w-xs` .. `max-w-7xl` steps copied verbatim (no dependency on Tailwind;
 * the numbers only), 64px apart from xs to xxl and then doubling strides, plus
 * two tile steps below xs (`max-w-48` and `max-w-64`, the small KPI card and the
 * chart tile), so the kit and the design mirror name widths instead of inventing
 * them. A component never carries one of these as a width of its own: it is FILL
 * or HUG (see `sizing.ts`), and the step is a cap, picked by the parent layout
 * container or named on the component through its measure axis (`MeasureProps`).
 * Declared narrowest first: `stepOf` reads this order as its precedence.
 */
export const widths: Record<WidthKey, number> = {
  xxxs: 192,
  xxs: 256,
  xs: 320,
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  xxl: 672,
  xxxl: 768,
  wide: 896,
  wider: 1024,
  widest: 1152,
  page: 1280,
};
