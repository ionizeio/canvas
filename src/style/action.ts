import type { ColorTokens } from "./tokens.js";

// The call-to-action fill and the ink painted on it, separate from `primary` (what is
// selected, checked, current, linked or focused). Legacy complete token maps can omit
// both roles; they then paint with `primary` and `primary-foreground`, as before.
export function actionFill(tokens: ColorTokens): string {
  return tokens.action ?? tokens.primary;
}

export function actionInk(tokens: ColorTokens): string {
  return tokens["action-foreground"] ?? tokens["primary-foreground"];
}

/**
 * The action pair a `tokens` override resolves to, merged over the scheme's `base`.
 * The role split is the kit's, not the consumer's, so a rebrand that sets `primary`
 * without `action` repaints the call-to-action with its primary pair (fill and ink
 * together); an explicit `action` wins, keeping the scheme's action ink unless the
 * override names one; an override that touches neither keeps the scheme's pair. The
 * ink only ever follows the fill it was paired with, so a `primary-foreground` given
 * for a rebranded primary never lands on the scheme's own action fill.
 */
export function actionOverride(base: ColorTokens, brand: Partial<ColorTokens>): Pick<ColorTokens, "action" | "action-foreground"> {
  if (brand.action != null) {
    return { action: brand.action, "action-foreground": brand["action-foreground"] ?? base["action-foreground"] };
  }
  if (brand.primary != null) {
    return { action: brand.primary, "action-foreground": brand["action-foreground"] ?? brand["primary-foreground"] ?? base["primary-foreground"] };
  }
  return { action: base.action, "action-foreground": brand["action-foreground"] ?? base["action-foreground"] };
}
