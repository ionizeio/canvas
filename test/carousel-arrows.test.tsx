import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { Insets } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { FOCUS_RING_OFFSET } from "../src/style/pressable.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { Carousel } from "../src/organisms/carousel/carousel.tsx";
import { Carousel as IOSCarousel } from "../src/organisms/carousel/carousel.ios.tsx";
import { Carousel as AndroidCarousel } from "../src/organisms/carousel/carousel.android.tsx";
import { webSkin, iosSkin, androidSkin } from "../src/organisms/carousel/carousel.styles.ts";
import type { CarouselSkin } from "../src/organisms/carousel/carousel.shared.tsx";

// The arrows sit BESIDE the slides, never over them. They used to be an absolute layer
// inside the clipping slide viewport, 8px from its edge, so the first letters of any
// slide text (a Card title at the Card's 20px inset) were painted under the arrow. The
// shell now lays the track out as [prev arrow][viewport][next arrow]; these hold that
// structure and the skin geometry that keeps each arrow's touch area off the slides.

afterEach(cleanup);

const items = [
  { key: "a", content: "First" },
  { key: "b", content: "Second" },
  { key: "c", content: "Third" },
];

type LayoutHost = HTMLElement & { __reactLayoutHandler?: unknown };

/** The larger of the horizontal slop sides; 0 when the skin declares none. */
function horizontalSlop(slop: number | Insets | undefined): number {
  if (slop == null) return 0;
  if (typeof slop === "number") return slop;
  return Math.max(slop.left ?? 0, slop.right ?? 0);
}

const platforms = [
  ["web", Carousel, webSkin],
  ["ios", IOSCarousel, iosSkin],
  ["android", AndroidCarousel, androidSkin],
] as const satisfies readonly (readonly [string, unknown, CarouselSkin])[];

describe("Carousel arrows sit beside the slides", () => {
  for (const [name, Component, skin] of platforms) {
    it(`${name}: the arrows are the track's outer cells, outside the clipping viewport`, () => {
      render(<ThemeProvider><Component testID="carousel" items={items} showArrows /></ThemeProvider>);
      const track = screen.getByTestId("carousel").firstElementChild as HTMLElement;
      const cells = [...track.children] as HTMLElement[];
      expect(cells).toHaveLength(3);
      const [prevCell, viewport, nextCell] = cells;
      // The middle cell is the measured, clipping slide viewport.
      expect((viewport as LayoutHost).__reactLayoutHandler).toBeDefined();
      expect(screen.getByText("First")).toBeDefined();
      expect(viewport.contains(screen.getByText("First"))).toBe(true);
      // Each arrow lives in its own cell beside it, never inside it.
      const prev = screen.getByRole("button", { name: "Previous slide" });
      const next = screen.getByRole("button", { name: "Next slide" });
      expect(prevCell.contains(prev)).toBe(true);
      expect(nextCell.contains(next)).toBe(true);
      expect(viewport.contains(prev)).toBe(false);
      expect(viewport.contains(next)).toBe(false);
      // The track lays out the skin's gutters: the outer inset, then the gap to the slides.
      expect(track.style.paddingLeft).toBe(`${skin.arrowInset}px`);
      expect(track.style.paddingRight).toBe(`${skin.arrowInset}px`);
      expect(track.style.gap).toBe(`${skin.arrowGap}px`);
    });

    it(`${name}: without arrows the viewport is the whole track`, () => {
      render(<ThemeProvider><Component testID="carousel" items={items} showArrows={false} /></ThemeProvider>);
      const track = screen.getByTestId("carousel").firstElementChild as HTMLElement;
      expect(track.children).toHaveLength(1);
      expect(track.style.paddingLeft).toBe("");
      expect(track.style.gap).toBe("");
      expect(screen.queryByRole("button", { name: "Previous slide" })).toBeNull();
    });

    it(`${name}: the arrow's touch area stays inside the carousel and off the slides`, () => {
      const slop = horizontalSlop(skin.arrowHitSlop);
      expect(skin.arrowInset).toBeGreaterThanOrEqual(slop);
      expect(skin.arrowGap).toBeGreaterThanOrEqual(slop);
      expect(skin.arrowGap).toBeGreaterThan(0);
    });
    if (name === "web") {
      it("web: the arrow's focus ring stays inside the carousel", () => {
        // The ring draws FOCUS_RING_OFFSET outside the arrow, plus the browser's
        // ring (2px), so a clipping parent flush with the carousel cannot cut it.
        expect(skin.arrowInset).toBeGreaterThanOrEqual(FOCUS_RING_OFFSET + 2);
      });
    }

    it(`${name}: the slide is a complete card surface with its string content inset`, () => {
      // In solid mode the slide needs its own boundary: on a surface of its own colour
      // (the docs stage, a card) a fill alone disappears. Under glass the hairline
      // keeps its width in a transparent colour (the metrics match) and the
      // material's rim is the edge.
      const slide = skin.slide(lightColors);
      expect(slide.borderWidth).toBe(1);
      expect(slide.borderColor).toBe(lightColors.border);
      expect(slide.overflow).toBe("hidden");
      expect(skin.slidePadding).toBeGreaterThanOrEqual(16);

      render(<ThemeProvider><Component items={items} /></ThemeProvider>);
      const text = screen.getByText("First");
      for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
        expect(Number.parseFloat(text.style[`padding${side}`])).toBe(skin.slidePadding);
      }
    });
  }
});
