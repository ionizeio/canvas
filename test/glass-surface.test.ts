import { describe, it, expect } from "bun:test";
import {
  splitSurfaceStyle,
  contrastBorder,
  specularRim,
  MATERIAL_FILL,
  GLASS_INTENSITY,
  CONTRAST_BORDER_WIDTH,
} from "../src/style/glass-surface/glass-surface.shared.tsx";
import { lightColors, darkColors } from "../src/style/tokens.ts";

describe("splitSurfaceStyle", () => {
  it("strips backgroundColor so the material supplies the fill", () => {
    const { outer, clip } = splitSurfaceStyle({ backgroundColor: "#ffffff", borderRadius: 12, width: 100 });
    expect(outer.backgroundColor).toBeUndefined();
    expect(clip.backgroundColor).toBeUndefined();
  });

  it("routes sizing/position to the outer box and clips the inner", () => {
    const { outer, clip } = splitSurfaceStyle({ width: 100, height: 50, margin: 8, borderRadius: 12 });
    expect(outer.width).toBe(100);
    expect(outer.height).toBe(50);
    expect(outer.margin).toBe(8);
    expect(clip.overflow).toBe("hidden");
    expect(clip.flexGrow).toBe(1);
    expect(clip.flexShrink).toBe(1);
  });

  it("gives the clip an AUTO flex basis so a content-sized surface wraps its children", () => {
    // A basis-0 clip (the `flex: 1` shorthand) collapses a content-sized surface
    // to its padding under Yoga, which has no min-content floor: the ActionSheet
    // cards, dialog cards, and menus all size from their children.
    const { clip } = splitSurfaceStyle({ borderRadius: 34, padding: 14 });
    expect(clip.flexBasis).toBe("auto");
    expect(clip.flex).toBeUndefined();
  });

  it("duplicates the radius onto both boxes so the drop shadow is rounded too", () => {
    const { outer, clip } = splitSurfaceStyle({ borderRadius: 16 });
    expect(outer.borderRadius).toBe(16);
    expect(clip.borderRadius).toBe(16);
  });

  it("keeps non-sizing skin styles (padding) on the clip box", () => {
    const { clip } = splitSurfaceStyle({ padding: 12 });
    expect(clip.padding).toBe(12);
  });

  it("strips border width/color/style so the material supplies the edge", () => {
    const { outer, clip } = splitSurfaceStyle({
      borderWidth: 1,
      borderColor: "#e4e4e7",
      borderStyle: "solid",
      borderTopWidth: 2,
      borderEndColor: "#000",
      borderRadius: 12,
      padding: 8,
    });
    // No border key survives on either box...
    expect(clip.borderWidth).toBeUndefined();
    expect(clip.borderColor).toBeUndefined();
    expect(clip.borderStyle).toBeUndefined();
    expect(clip.borderTopWidth).toBeUndefined();
    expect(clip.borderEndColor).toBeUndefined();
    expect(outer.borderWidth).toBeUndefined();
    // ...but radius (shape) and padding are kept.
    expect(clip.borderRadius).toBe(12);
    expect(outer.borderRadius).toBe(12);
    expect(clip.padding).toBe(8);
  });
});

describe("contrastBorder", () => {
  it("is a 1px foreground border on light", () => {
    expect(contrastBorder(lightColors)).toEqual({ borderWidth: CONTRAST_BORDER_WIDTH, borderColor: lightColors.foreground });
    expect(lightColors.foreground).toBe("#0d121b");
  });

  it("is a 1px foreground border on dark", () => {
    expect(contrastBorder(darkColors)).toEqual({ borderWidth: CONTRAST_BORDER_WIDTH, borderColor: darkColors.foreground });
    expect(darkColors.foreground).toBe("#ffffff");
  });
});

describe("specularRim", () => {
  it("carries the skin radius and a scheme-adaptive inset boxShadow", () => {
    const light = specularRim({ borderRadius: 26 }, false);
    const dark = specularRim({ borderRadius: 26 }, true);
    expect(light.borderRadius).toBe(26);
    expect(light.position).toBe("absolute");
    expect(typeof light.boxShadow).toBe("string");
    expect(light.boxShadow).not.toBe(dark.boxShadow);
  });
});

describe("material constants", () => {
  it("MATERIAL_FILL is an absolute-fill, non-interactive layer", () => {
    expect(MATERIAL_FILL.position).toBe("absolute");
    expect(MATERIAL_FILL.top).toBe(0);
    expect(MATERIAL_FILL.left).toBe(0);
    expect(MATERIAL_FILL.right).toBe(0);
    expect(MATERIAL_FILL.bottom).toBe(0);
    expect(MATERIAL_FILL.pointerEvents).toBe("none");
  });

  it("GLASS_INTENSITY is a sane blur intensity", () => {
    expect(typeof GLASS_INTENSITY).toBe("number");
    expect(GLASS_INTENSITY).toBeGreaterThan(0);
    expect(GLASS_INTENSITY).toBeLessThanOrEqual(100);
  });
});
