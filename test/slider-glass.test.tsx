import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { createSlider } from "../src/atoms/slider/slider.shared.tsx";
import { iosSkin, androidSkin, webSkin } from "../src/atoms/slider/slider.styles.ts";
import { lightColors, darkColors } from "../src/style/tokens.ts";

// Moving thumbs use the liquid role while each platform keeps its own shape.
// The rail is static glass and the iOS skin retains its bright native tint.

afterEach(cleanup);

const IOSSlider = createSlider(iosSkin);

function mount(ui: ReactNode, surface: "glass" | "solid") {
  return render(createElement(ThemeProvider, { surface }, ui));
}

const handle = (c: HTMLElement) => c.querySelector('[role="slider"]') as HTMLElement | null;

describe("Slider Liquid Glass handle", () => {
  for (const [name, skin] of [["web", webSkin], ["ios", iosSkin], ["android", androidSkin]] as const) {
    it(`${name} routes its native thumb geometry through the shared material`, () => {
      const Slider = createSlider(skin);
      const { container } = mount(<Slider testID="slider" defaultValue={50} />, "glass");
      const frame = container.querySelector('[data-testid="slider-thumb-motion"]') as HTMLElement;
      expect(frame.style.width).toBe(`${skin.thumbWidth("base")}px`);
      expect(frame.style.height).toBe(`${skin.thumbHeight("base")}px`);
      expect(frame.querySelector('[style*="backdrop-filter"]')).not.toBeNull();
      expect(frame.style.transform).toBe("");
    });
  }

  it("tints the glass knob bright white (not the popover default) on both schemes", () => {
    // The under-fill is an opaque bright white, scheme-independent, so the knob reads as a
    // bright puck rather than a popover-tinted blob (and, verified on the iOS 26 sim, so
    // GlassView's adaptive darkening does not pull a translucent knob to dim gray). It must
    // differ from the popover token.
    const light = iosSkin.glassTint?.(lightColors);
    const dark = iosSkin.glassTint?.(darkColors);
    expect(light).toBe("#ffffff");
    expect(dark).toBe("#ffffff");
    // The case that matters: on DARK the popover token is near-black, which would make the
    // knob a dim dark blob; the bright white tint overrides it so the knob stays bright.
    // (On light, popover happens to be white too, so no inequality is asserted there.)
    expect(dark).not.toBe(darkColors.popover);
  });

  it("keeps the adjustable slider semantics under GLASS surface", () => {
    const { container } = mount(
      createElement(IOSSlider, { defaultValue: 60, min: 0, max: 100, accessibilityLabel: "Volume" }),
      "glass",
    );
    const h = handle(container);
    expect(h).toBeTruthy();
    expect(h!.getAttribute("aria-valuenow")).toBe("60");
    expect(h!.getAttribute("aria-valuemin")).toBe("0");
    expect(h!.getAttribute("aria-valuemax")).toBe("100");
  });

  it("keeps the same semantics under SOLID surface (the degraded capsule path)", () => {
    const { container } = mount(
      createElement(IOSSlider, { defaultValue: 60, min: 0, max: 100, accessibilityLabel: "Volume" }),
      "solid",
    );
    const h = handle(container);
    expect(h).toBeTruthy();
    expect(h!.getAttribute("aria-valuenow")).toBe("60");
  });

  it("still forwards the disabled state through the glass wrapper", () => {
    const { container } = mount(
      createElement(IOSSlider, { defaultValue: 30, disabled: true, accessibilityLabel: "Volume" }),
      "glass",
    );
    const h = handle(container);
    expect(h!.getAttribute("aria-disabled")).toBe("true");
  });
});
