import { alpha } from "./color.js";
import { destructiveText } from "./destructive-text.js";
import { primaryText } from "./primary-text.js";
import { SOFT_ALPHA } from "./soft-roles.js";
import type { StatusTone } from "./status-hue.js";
import type { ColorTokens } from "./tokens.js";

// The status colors, read from the theme's roles: what Dark Factory paints its soft
// pills and panels with (a tone's color as the ink, the same color at a low alpha as
// the wash, the solid color as the dot). Every toned surface in the kit reads its tone
// here, so a "warning" Badge, Alert, Chip and chart mark stay the same state, and a
// `tokens` override that repaints `success` repaints all of them.
//
// Dark Factory has no separate info color (its info IS its violet accent2), so `info`
// rides the primary family. `neutral` is the quiet surface pill: the `muted` fill with
// the `muted-foreground` ink (Dark Factory's line-colored neutral wash would leave that
// ink near 4.2:1). The soft roles are optional in a token map; a map without them gets
// Dark Factory's own wash alphas over the tone's color.

/** The tones `statusColors` resolves: the four status tones and the neutral surface. */
export type StatusColorTone = StatusTone | "neutral";

/** One status tone's colors. */
export interface StatusColors {
  /** Text and icons that name the tone, over its wash or a plain surface (4.5:1 or better on both). */
  ink: string;
  /** The translucent soft fill behind a toned pill, chip or panel. */
  wash: string;
  /** The solid mark: a status dot, a meter or chart fill, an icon beside plain text. */
  dot: string;
}

// Dark Factory's light wash alphas, used when a token map omits the soft roles (the theme
// always supplies them, derived for a rebrand, so this reaches only a raw token map).
const WASH = SOFT_ALPHA.light;

/** The ink, wash and dot of a status tone, from the theme's color roles. */
export function statusColors(tokens: ColorTokens, tone: StatusColorTone): StatusColors {
  switch (tone) {
    case "success":
      return { ink: tokens.success, wash: tokens["success-soft"] ?? alpha(tokens.success, WASH.success), dot: tokens.success };
    case "warning":
      return { ink: tokens.warning, wash: tokens["warning-soft"] ?? alpha(tokens.warning, WASH.warning), dot: tokens.warning };
    case "error":
      return { ink: destructiveText(tokens), wash: tokens["destructive-soft"] ?? alpha(tokens.destructive, WASH.error), dot: tokens.destructive };
    case "info":
      return { ink: primaryText(tokens), wash: tokens["primary-soft"] ?? alpha(tokens.primary, WASH.info), dot: tokens.primary };
    case "neutral":
      return { ink: tokens["muted-foreground"], wash: tokens.muted, dot: tokens["muted-foreground"] };
  }
}
