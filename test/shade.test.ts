import { describe, expect, it } from "bun:test";
import { isRing, peakAlpha, renderedContrast, shadeLayers, SHADE_LIMIT } from "../tools/tokens/shade.ts";

// The rendered-shade measure behind the elevation gates, pinned on the cases it exists
// to decide.
describe("rendered shade", () => {
  it("sets the limit at the old cap: black at 0.20, unblurred, on white", () => {
    expect(SHADE_LIMIT).toBeCloseTo(1.606, 3);
  });

  it("admits every shadow of the ambient ladder it replaces", () => {
    for (const value of ["0px 1px 3px rgba(13, 18, 27, 0.08)", "0px 0px 20px rgba(13, 18, 27, 0.06)", "0px 0px 60px rgba(13, 18, 27, 0.18)"]) {
      for (const layer of shadeLayers(value)) expect(renderedContrast(layer, "#ffffff")).toBeLessThanOrEqual(SHADE_LIMIT);
    }
  });

  it("admits Dark Factory's ladder in every palette, though its alpha reads above the old cap", () => {
    for (const shade of ["rgba(121, 100, 214, 0.22)", "rgba(60, 110, 190, 0.2)"]) {
      const [card] = shadeLayers(`0px 20px 44px -24px ${shade}`);
      // Most of the shade is tucked under the box: 0.22 spelled, about 0.09 rendered.
      expect(peakAlpha(card!)).toBeLessThan(0.1);
      expect(renderedContrast(card!, "#ffffff")).toBeLessThanOrEqual(SHADE_LIMIT);
    }
    const [dark] = shadeLayers("0px 20px 44px -24px rgba(0, 0, 0, 0.5)");
    expect(renderedContrast(dark!, "#252741")).toBeLessThanOrEqual(SHADE_LIMIT);
  });

  it("refuses a hard, dark drop", () => {
    const [drop] = shadeLayers("0 2px 2px rgba(0,0,0,0.6)");
    expect(renderedContrast(drop!, "#ffffff")).toBeGreaterThan(SHADE_LIMIT);
  });

  it("finds Dark Factory's dialog shade above the limit, which is why it is a top-layer role", () => {
    const [dialog] = shadeLayers("0px 50px 100px -30px rgba(0, 0, 0, 0.45)");
    expect(renderedContrast(dialog!, "#ffffff")).toBeGreaterThan(SHADE_LIMIT);
  });

  it("keeps each layer's colour and reads a zero-blur, zero-offset layer as a ring", () => {
    const layers = shadeLayers("0 26px 50px -20px rgba(121,100,214,0.22), 0 0 0 1px rgba(90,80,160,0.13)");
    expect(layers.map((layer) => layer.color)).toEqual(["rgba(121,100,214,0.22)", "rgba(90,80,160,0.13)"]);
    expect(layers.map(isRing)).toEqual([false, true]);
  });
});
