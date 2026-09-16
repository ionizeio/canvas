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
  ring: string;
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
// tokens ARE: `--destructive:oklch(0.577 0.245 27.325)` there is `#e7000b` here.
// RN cannot parse oklch(), so the hand-off's values are carried as the hex they
// resolve to, and scripts/validate-tokens.ts converts the CSS back to sRGB and
// fails the build on any drift. Change a value in the CSS hand-off first, never
// only here. (The `chart-*` series and the Tailwind v3 `palette` below are
// authored as hex on both sides and compared verbatim.)
export const lightColors: ColorTokens = {
  background: "#ffffff",
  foreground: "#09090b",
  card: "#ffffff",
  "card-foreground": "#09090b",
  popover: "#ffffff",
  "popover-foreground": "#09090b",
  primary: "#4f39f6",
  "primary-text": "#4b30ef",
  "primary-foreground": "#fafafa",
  secondary: "#f4f4f5",
  "secondary-foreground": "#18181b",
  muted: "#f4f4f5",
  "muted-foreground": "#6d6d77",
  accent: "#f4f4f5",
  "accent-foreground": "#18181b",
  destructive: "#e7000b",
  // Retain the red hue while keeping enabled capsule/pressed text above 4.5:1,
  // including +/-1 sRGB rounding. The authored OKLCH pair stays inside gamut.
  "destructive-text": "#a70510",
  "destructive-foreground": "#fafafa",
  success: "#16a34a",
  "success-foreground": "#042812",
  warning: "#d97708",
  "warning-foreground": "#451a03",
  border: "#e4e4e7",
  // `input` and `border` part company here, and the split is the point of having
  // two names. `border` separates two SURFACES (a card edge, a divider, a table
  // rule) and carries no contrast floor: it is read against the fills either side
  // of it. `input` is the BOUNDARY OF A CONTROL (the fields, checkbox, radio, the
  // switch track, select, autocomplete, pagination, and the outline Button), which
  // is what WCAG 2.2 SC 1.4.11 holds to 3:1 against whatever it sits on. Both
  // shipped the same hairline value until 2.55.1, which left every unfilled
  // control at 1.27:1 in light and 1.34:1 in dark: a silhouette the eye cannot
  // find. Each value here is the lightest one on the border hue that still clears
  // 3:1 against ALL THREE surfaces a control is placed on (the page, a card or
  // popover, and a muted panel), so re-tuning either means re-solving it, not
  // nudging it by eye. test/tokens.test.ts pins the floor, and asserts `border`
  // stays BELOW it so the two cannot be collapsed back together.
  input: "#88888b",
  ring: "#615fff", // one ring value in both schemes; see colors.css
  "chart-1": "#6366f1", // indigo-500
  "chart-2": "#0d9488", // teal-600
  "chart-3": "#ea580c", // orange-600
  "chart-4": "#f43f5e", // rose-500
  "chart-5": "#8b5cf6", // violet-500
  "chart-6": "#0891b2", // cyan-600
  "chart-7": "#059669", // emerald-600
  "chart-8": "#ec4899", // pink-500
};

export const darkColors: ColorTokens = {
  background: "#09090b",
  foreground: "#fafafa",
  card: "#18181b",
  "card-foreground": "#fafafa",
  popover: "#18181b",
  "popover-foreground": "#fafafa",
  primary: "#615fff",
  "primary-text": "#8893fe",
  "primary-foreground": "#ffffff",
  secondary: "#27272a",
  "secondary-foreground": "#fafafa",
  muted: "#27272a",
  "muted-foreground": "#9f9fa9",
  accent: "#27272a",
  "accent-foreground": "#fafafa",
  destructive: "#ff6467",
  "destructive-text": "#fe9b97",
  "destructive-foreground": "#460809",
  success: "#22c55e",
  "success-foreground": "#052e16",
  warning: "#f59e09",
  "warning-foreground": "#451a03",
  border: "#27272a",
  // Control boundary held to 3:1; see the light `input` above for the full note.
  input: "#747478",
  ring: "#615fff",
  // Same series values as light: the palette was validated against both
  // surfaces, so brand overrides stay consistent across schemes by default.
  "chart-1": "#6366f1",
  "chart-2": "#0d9488",
  "chart-3": "#ea580c",
  "chart-4": "#f43f5e",
  "chart-5": "#8b5cf6",
  "chart-6": "#0891b2",
  "chart-7": "#059669",
  "chart-8": "#ec4899",
};

export const colorsByScheme: Record<ColorScheme, ColorTokens> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * The glass MATERIAL's own tokens, per scheme. Glass follows Apple's Liquid Glass
 * model: it is a material for the FUNCTIONAL layer (bars, sidebars, sheets, and the
 * overlays that float above content), deliberately NOT applied to the content layer
 * (Apple: "don't use Liquid Glass in the content layer").
 *
 * The material carries its OWN fill, `glass-tint`, and that fill is the only thing
 * glass mode contributes. Glass does NOT reach into the semantic color set: `popover`
 * stays opaque in both schemes, exactly as the web hand-off ships it, so a menu, a
 * select list, or an alert dialog is an opaque card whatever the surface mode; `card`
 * stays opaque too, so content surfaces never turn to glass. Nothing that paints a
 * semantic surface token goes translucent because the theme went to glass. Only the
 * surfaces that render through the GlassSurface primitive (src/style/glass-surface)
 * take this tint, and they take it UNDER the real material: Apple's native Liquid
 * Glass via expo-glass-effect on iOS 26+, the SVG lens on Chromium web, an expo-blur
 * frost elsewhere. The tint is what keeps such a panel legible when the material is
 * near-clear (and the whole fill when no material module is available); the material
 * is what makes it glass.
 *
 * Keys are the CSS custom-property names verbatim (`glass-tint` is `--glass-tint` in
 * styles/tokens/colors.css, the WEB hand-off these values are read from, never
 * invented here); scripts/validate-tokens.ts fails the build when a key has no
 * matching `--name` in the shipped CSS or its value drifts from it. Values are rgba
 * so they compose over whatever sits behind the surface, on native and on
 * react-native-web.
 */
export interface GlassTokens {
  /** The translucent fill painted UNDER the glass material. */
  "glass-tint": string;
}

export const lightGlass: GlassTokens = {
  "glass-tint": "rgba(255, 255, 255, 0.20)",
};

export const darkGlass: GlassTokens = {
  // Dark glass: less light behind it to bend, so the tint drops dimmer rather than
  // brighter, and the rim carries more of the read (see --glass-tint in the .dark
  // block of styles/tokens/colors.css).
  "glass-tint": "rgba(22, 22, 28, 0.30)",
};

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

export const brandColors: BrandColors = {
  "orb-indigo": "#6366f1",
  "orb-violet": "#8b5cf6",
  "orb-cyan": "#06b6d4",
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

/** Font size and matching line height, in px. */
export const fontSize: Record<string, { fontSize: number; lineHeight: number }> = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  "2xl": { fontSize: 24, lineHeight: 32 },
  "3xl": { fontSize: 30, lineHeight: 36 },
  "4xl": { fontSize: 36, lineHeight: 40 },
  "5xl": { fontSize: 48, lineHeight: 48 },
  "6xl": { fontSize: 60, lineHeight: 60 },
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
export type WidthKey = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "xxxl" | "wide" | "wider" | "widest" | "page";

/**
 * The one width scale every bounds-providing container draws from: Container's
 * measure axis, the Dialog and AlertDialog panels, the floating overlays, and any
 * call site that used to pin a `maxWidth` by hand. The values are Tailwind's
 * `max-w-xs` .. `max-w-7xl` steps copied verbatim (no dependency on Tailwind;
 * the numbers only), 64px apart from xs to xxl and then doubling strides, so the
 * kit and the design mirror name widths instead of inventing them. A component
 * never carries one of these on its own root: it is FILL or HUG (see
 * `sizing.ts`), and the parent layout container picks the step.
 */
export const widths: Record<WidthKey, number> = {
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
