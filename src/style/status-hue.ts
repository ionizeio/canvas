// The one status-tone to palette-hue map the kit's toned surfaces read.
//
// Alert (the info / success / warning / error banner) and Badge (the status pill
// with its leading dot) carry the same four semantic tones, so they must resolve
// to the same Tailwind hue family: if they drift, a "warning" alert and a
// "warning" badge sitting in the same view stop reading as the same state. Each
// component used to keep a private copy of the mapping (Alert's TONE_HUE,
// Badge's STATUS_HUE, identical in every entry); this is that mapping, owned once.
//
// It names the HUE ONLY, never a step. Each component still picks its own steps
// off `palette` (Alert: a 50/200 surface with a 600/700/800 type ramp in light and
// a 950/800 surface with a 200/300/400 ramp in dark; Badge: the same pill surfaces
// with a 700/400 label and a saturated 500 dot), because the step ladder is that
// component's own density and contrast decision, not a shared one.
//
// The neutral tone is deliberately absent: neutral rides the semantic tokens
// (muted / border / muted-foreground), which are scheme-aware already, so it never
// reaches for a palette hue. Components keep neutral as their own union member and
// branch on it before indexing this map.

/** The four semantic status tones that resolve to a fixed palette hue. */
export type StatusTone = "success" | "warning" | "error" | "info";

/**
 * The chromatic hue families the palette carries. This is palette vocabulary, so it
 * lives beside `palette` rather than inside the one component that first needed it,
 * and it types the map below: a tone can only resolve to a hue that exists.
 */
export type Hue =
  | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald"
  | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "fuchsia"
  | "purple" | "pink" | "rose";

/**
 * Palette hue family per status tone. Compose with a step to key into `palette`,
 * e.g. `palette[`${statusHues.warning}-500`]`.
 */
export const statusHues: Record<StatusTone, Hue> = {
  success: "green",
  warning: "amber",
  error: "red",
  info: "blue",
};

/**
 * @deprecated The kit no longer paints with it: Dark Factory's soft washes replaced it
 * (`statusColors` for the status tones, and a Chip's free hue at Dark Factory's soft
 * alpha). Kept, unchanged, for code that reads it, until a major release removes it.
 */
// The alpha of a hue's 500 step painted as a WASH under the glass material: the
// tinted pane of an Alert, a status Badge, a coloured Chip. Dense enough to read as
// the hue over the page and over a content pane, sheer enough that the material still
// shows the backdrop through it. The label over the wash steps one deeper than the
// solid recipe's (800 in light, 300 in dark) to hold 4.5:1 on every hue. Solved over
// the Dark Factory pages: dark is the largest wash that keeps every hue's label at 4.5:1
// on the page, a content pane and a control puck (0.30 fell to 4.36:1 there).
export const HUE_WASH = { light: 0.28, dark: 0.27 } as const;
