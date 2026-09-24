import { primaryText } from "./primary-text.js";
import { statusColors } from "./status.js";
import type { StatusTone } from "./status-hue.js";
import { darkColors, lightColors, type ColorTokens } from "./tokens.js";

// The inverse surface: Dark Factory's toast pill, which the Material 3 snackbar paints as
// its bar, with the ink on it and the brand an action carries there (M3's
// inverse-primary, the palette's own hue lightened to 4.5:1 on the pill). Legacy complete
// token maps can omit all three roles; they then invert the scheme (`foreground` as the
// fill, `background` as its ink) and take the opposite scheme's brand text for the
// action, as the snackbar did before the roles existed.
export function inverseFill(tokens: ColorTokens): string {
  return tokens.inverse ?? tokens.foreground;
}

export function inverseInk(tokens: ColorTokens): string {
  return tokens["inverse-foreground"] ?? tokens.background;
}

export function inversePrimary(tokens: ColorTokens): string {
  return tokens["inverse-primary"] ?? primaryText(isDarkFill(inverseFill(tokens)) ? darkColors : lightColors);
}

/**
 * A status tone's ink on the inverse surface (an intent glyph on the toast pill). The pill
 * is dark in every palette and scheme, so the tones read in the dark scheme's own status
 * inks, which are solved for a dark surface (6:1 and better on the pill); a legacy map
 * whose inverse is light takes the light scheme's.
 */
export function inverseStatus(tokens: ColorTokens, tone: StatusTone): string {
  return statusColors(isDarkFill(inverseFill(tokens)) ? darkColors : lightColors, tone).ink;
}

// Coarse dark/light call on a hex fill (sRGB weights, no gamma; all the legacy
// inverse-primary pick needs). Non-hex fills read as light.
function isDarkFill(color: string): boolean {
  if (color[0] !== "#") return false;
  const h = color.slice(1);
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}
