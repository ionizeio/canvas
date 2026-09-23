import { describe, it, expect } from "bun:test";
import { shadow, customShadow } from "../src/style/shadow.ts";
import { darkColors, lightColors } from "../src/style/tokens.ts";

// The kit test harness resolves `react-native` to react-native-web, so `Platform.OS`
// is "web" here and `shadow()` / `customShadow()` return the cross-platform `boxShadow`
// form (react-native-web deprecated the `shadow*` style props). The native branch
// returns the iOS `shadow*` props + Android `elevation` and is verified on device.

describe("shadow", () => {
  it("defaults to the standard elevation", () => {
    expect(shadow()).toEqual(shadow("DEFAULT"));
  });

  it("scales the shadow with the level (web boxShadow, Dark Factory's geometry)", () => {
    expect(shadow("none")).toEqual({ boxShadow: "none" });
    expect(shadow("sm").boxShadow).toBe("0px 16px 32px -22px rgba(121, 100, 214, 0.22)");
    expect(shadow("DEFAULT").boxShadow).toBe("0px 20px 44px -24px rgba(121, 100, 214, 0.22)");
    expect(shadow("md").boxShadow).toBe("0px 30px 54px -24px rgba(121, 100, 214, 0.22)");
    expect(shadow("lg").boxShadow).toBe("0px 26px 50px -20px rgba(121, 100, 214, 0.22)");
    expect(shadow("xl").boxShadow).toBe("0px 50px 100px -30px rgba(0, 0, 0, 0.45)");
  });

  it("tints by the palette's shade, and defaults to the light palette's", () => {
    expect(shadow("DEFAULT", lightColors)).toEqual(shadow("DEFAULT"));
    expect(shadow("DEFAULT", darkColors).boxShadow).toBe("0px 20px 44px -24px rgba(0, 0, 0, 0.5)");
    expect(shadow("xl", darkColors)).toEqual(shadow("xl", lightColors));
  });

  it("does not emit the deprecated shadow* props on web", () => {
    const md = shadow("md");
    expect(md.shadowRadius).toBeUndefined();
    expect(md.shadowColor).toBeUndefined();
    expect(md.elevation).toBeUndefined();
  });

  it("customShadow emits an equivalent boxShadow on web", () => {
    expect(customShadow({ offsetY: 1, radius: 2, opacity: 0.18 }).boxShadow).toBe("0px 1px 2px rgba(0, 0, 0, 0.18)");
    expect(customShadow({ offsetY: 1, radius: 3, opacity: 0.18 }).boxShadow).toBe("0px 1px 3px rgba(0, 0, 0, 0.18)");
  });
});
