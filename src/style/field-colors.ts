import type { ColorTokens } from "./tokens.js";
import { mixOklab } from "./color.js";

// The colours the iOS field skins (Input, Textarea, Select, Autocomplete, PhoneInput)
// share for the two states the semantic set has no single token for: the RESTING
// border and the ERROR fill. Both come from the "iOS Mobile Input Fields" Figma kit
// (N8TScrzAPwpmwxFS1032my), the iOS reference the fields are drawn to.

/**
 * The resting border of an iOS field: the `field-border` token (gray-300 light,
 * systemGray4 dark), falling back to `input` for a legacy token map that omits it.
 *
 * DISCLOSED TRADE-OFF. `input` is held to WCAG 1.4.11's 3:1 boundary floor; this
 * value is ~1.5:1 on the field's own fill, which is the iOS reference's hairline. It
 * is read ONLY for the resting state of the iOS field skins; focus (`ring`) and
 * error (`destructive`) borders are unchanged, and the white `card` box on the
 * tinted page still gives the field an edge. The web and Android skins keep `input`.
 */
export function fieldBorder(tokens: ColorTokens): string {
  return tokens["field-border"] ?? tokens.input;
}

/**
 * The error fill of an iOS field: the reference's Background/Error (red-50 on a
 * white box, a dark red-brown on the dark box), derived here as the destructive hue
 * mixed into the field's `card` fill so it follows a rebrand. The mix is scheme-
 * aware without a scheme flag: a light box (the card's relative luminance above
 * one half) takes 6% of the hue, the dark box 12%, which lands within a few channel
 * steps of the source's FEF2F2 / 2C1B1B (the dark card carries a blue cast).
 */
export function fieldErrorFill(tokens: ColorTokens): string {
  return mixOklab(tokens.card, tokens.destructive, isLight(tokens.card) ? 0.06 : 0.12);
}

/** Whether a #rrggbb fill reads as light (relative luminance above 0.5). */
function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const channel = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4) > 0.5;
}
