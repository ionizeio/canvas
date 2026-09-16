import { describe, it, expect } from "bun:test";
import { shadow, customShadow } from "../src/style/shadow.ts";

// The kit test harness resolves `react-native` to react-native-web, so `Platform.OS`
// is "web" here and `shadow()` / `customShadow()` return the cross-platform `boxShadow`
// form (react-native-web deprecated the `shadow*` style props). The native branch
// returns the iOS `shadow*` props + Android `elevation` and is verified on device.

describe("shadow", () => {
  it("defaults to the standard elevation", () => {
    expect(shadow()).toEqual(shadow("DEFAULT"));
  });

  it("scales the shadow with the level (web boxShadow)", () => {
    expect(shadow("none")).toEqual({ boxShadow: "none" });
    expect(shadow("sm").boxShadow).toBe("0px 1px 2px rgba(13, 18, 27, 0.04)");
    expect(shadow("DEFAULT").boxShadow).toBe("0px 0px 20px rgba(13, 18, 27, 0.06)");
    expect(shadow("md").boxShadow).toBe("0px 0px 24px rgba(13, 18, 27, 0.1)");
    expect(shadow("lg").boxShadow).toBe("0px 0px 40px rgba(13, 18, 27, 0.14)");
    expect(shadow("xl").boxShadow).toBe("0px 0px 60px rgba(13, 18, 27, 0.18)");
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
