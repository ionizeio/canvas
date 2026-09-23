import { alpha } from "./color.js";
import type { ColorScheme, ColorTokens } from "./tokens.js";

// The soft washes (Dark Factory's `*Soft` colors): a tone's color at a low alpha. Internal:
// the theme derives them for a rebrand, and statusColors falls back to them for a token map
// that omits them. Not re-exported from the style barrel.

/** Dark Factory's wash alphas per scheme and tone. */
export const SOFT_ALPHA = {
  light: { info: 0.14, success: 0.12, warning: 0.18, error: 0.12 },
  dark: { info: 0.16, success: 0.16, warning: 0.16, error: 0.16 },
} as const;

type SoftRoles = Pick<ColorTokens, "primary-soft" | "success-soft" | "warning-soft" | "destructive-soft">;

/**
 * The soft roles a `tokens` override resolves to, merged over the scheme's `base`. A
 * rebrand that repaints a tone's color (`primary`, `success`, `warning`, `destructive`)
 * repaints its wash too, at Dark Factory's alpha for the scheme, so the soft pills and
 * panels follow the new color; an explicit soft role wins; an override that touches
 * neither keeps the scheme's wash. `alpha` leaves a color that already carries its own
 * alpha (an `rgba()` override) as given.
 */
export function softOverride(scheme: ColorScheme, base: ColorTokens, brand: Partial<ColorTokens>): SoftRoles {
  const a = SOFT_ALPHA[scheme];
  const soft = (explicit: string | undefined, color: string | undefined, amount: number, kept: string | undefined) =>
    explicit ?? (color != null ? alpha(color, amount) : kept);
  return {
    "primary-soft": soft(brand["primary-soft"], brand.primary, a.info, base["primary-soft"]),
    "success-soft": soft(brand["success-soft"], brand.success, a.success, base["success-soft"]),
    "warning-soft": soft(brand["warning-soft"], brand.warning, a.warning, base["warning-soft"]),
    "destructive-soft": soft(brand["destructive-soft"], brand.destructive, a.error, base["destructive-soft"]),
  };
}
