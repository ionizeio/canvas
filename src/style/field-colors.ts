import type { ColorTokens } from "./tokens.js";
import { mixOklab } from "./color.js";

// The colours the field skins share where the semantic set has no single token for
// the job: the RESTING border (web and iOS: Input, Textarea, Select, Autocomplete,
// InputOTP, Stepper, PhoneInput, the Command trigger), the web field's WELL, and the
// iOS ERROR fill. The web field is Dark Factory's (src/style/field-look.ts); the iOS
// fields are drawn to the "iOS Mobile Input Fields" Figma kit (N8TScrzAPwpmwxFS1032my).

/**
 * The resting border of a field: the `field-border` token (Dark Factory's field line
 * densified on the card), falling back to `input` for a legacy token map that omits it.
 *
 * DISCLOSED TRADE-OFF. `input` is held to WCAG 1.4.11's 3:1 boundary floor; this
 * value is ~1.5:1 on the field's own fill, the iOS reference's hairline (Dark Factory's
 * own line is ~1.2:1). It is read ONLY for the resting state of the web and iOS field
 * skins (the 3:1 outline read as a white frame on the dark card); focus (`ring`) and
 * error (`destructive`) borders are unchanged, the non-field controls (checkbox, radio,
 * switch, pagination, the iOS and Android outline button) keep `input`, and Android's
 * M3 fields draw their underline, not this.
 */
export function fieldBorder(tokens: ColorTokens): string {
  return tokens["field-border"] ?? tokens.input;
}

/**
 * The well a web text field paints: the `field-fill` token (Dark Factory's translucent
 * white input fill, which lifts the field off a dark card), falling back to `card` for a
 * token map that omits it.
 */
export function fieldFill(tokens: ColorTokens): string {
  return tokens["field-fill"] ?? tokens.card;
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
