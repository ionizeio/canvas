import { describe, it, expect } from "bun:test";
import { surfaceRipple, controlRipple, pressDim } from "../src/style/ripple.ts";
import { lightColors } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";

describe("ripple helpers", () => {
  it("surfaceRipple is a bounded foreground-ink ripple", () => {
    const r = surfaceRipple(lightColors);
    expect(r.borderless).toBe(false);
    expect(r.color).toBe(alpha(lightColors.foreground, 0.1)); // the foreground ink @ 0.1
  });

  it("controlRipple is a borderless ripple at slightly higher ink", () => {
    const r = controlRipple(lightColors);
    expect(r.borderless).toBe(true);
    expect(r.color).toBe(alpha(lightColors.foreground, 0.12));
  });

  it("pressDim dims on press off Android (web/iOS), null otherwise", () => {
    // Under the RNW alias Platform.OS === "web", so the dim applies.
    expect(pressDim(true)).toEqual({ opacity: 0.9 });
    expect(pressDim(true, 0.6)).toEqual({ opacity: 0.6 });
    expect(pressDim(false)).toBeNull();
  });
});
