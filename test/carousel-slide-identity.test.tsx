import { useEffect, type ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TextInput } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Carousel, type CarouselProps } from "../src/organisms/carousel/carousel.tsx";
import { Carousel as IOSCarousel } from "../src/organisms/carousel/carousel.ios.tsx";
import { Carousel as AndroidCarousel } from "../src/organisms/carousel/carousel.android.tsx";

// A Carousel cannot size its slides until its viewport measures: after the first
// frame (and after a server render), and again when a hidden viewport (width 0) is
// shown. Measuring changes the slides' layout only. Every slide stays mounted, so
// its own state (a field's text, a playing video) survives the first layout and a
// hide, instead of the current slide being swapped for a second copy of itself.

afterEach(cleanup);

// A slide body that counts its mounts, standing in for any stateful slide content.
let mounts = 0;
function Notes({ label }: { label: string }) {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <TextInput accessibilityLabel={label} />;
}
beforeEach(() => {
  mounts = 0;
});

const items = [
  { key: "a", content: <Notes label="Notes A" /> },
  { key: "b", content: "Second" },
  { key: "c", content: <Notes label="Notes C" /> },
];

// happy-dom has no ResizeObserver, so RNW never fires onLayout on its own: deliver the
// viewport's width through the handler RNW attaches to it. The track row holds
// [prev arrow][measured viewport][next arrow]; the viewport is the cell that measures.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layout(node: HTMLElement, width: number) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("Expected a node with an onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 120 } }, timeStamp: 1 }));
}
const viewport = () => {
  const track = screen.getByTestId("carousel").firstElementChild as HTMLElement;
  return [...track.children].find((node) => (node as LayoutHost).__reactLayoutHandler) as HTMLElement;
};
// The paged scrollport inside the viewport, and whether a slide is hidden from view.
const scrollport = () => viewport().firstElementChild as HTMLElement;
const hidden = (text: string) => {
  const found = screen.queryByText(text);
  if (!found) return "absent";
  for (let node: HTMLElement | null = found; node && node !== scrollport(); node = node.parentElement) {
    if (node.style.display === "none") return true;
  }
  return false;
};

for (const [platform, Component] of [["web", Carousel], ["ios", IOSCarousel], ["android", AndroidCarousel]] as Array<[string, ComponentType<CarouselProps>]>) {
  describe(`Carousel slide identity (${platform})`, () => {
    it("keeps every slide mounted, with a field's text, through the first layout and a hide and show", () => {
      render(<ThemeProvider><Component testID="carousel" items={items} /></ThemeProvider>);
      const firstFrameMounts = mounts;
      const field = screen.getByLabelText("Notes A") as HTMLInputElement;
      fireEvent.change(field, { target: { value: "draft" } });
      const scroller = scrollport();
      const second = [hidden("Second")];

      layout(viewport(), 300);
      second.push(hidden("Second"));
      layout(viewport(), 0);
      second.push(hidden("Second"));
      layout(viewport(), 300);

      expect(screen.getByLabelText("Notes A")).toBe(field);
      expect(field.value).toBe("draft");
      expect(mounts).toBe(firstFrameMounts);
      expect(scrollport()).toBe(scroller);
      // Every slide mounts on the first frame; only the current one shows until the
      // viewport has a width, and again while it has none.
      expect(firstFrameMounts).toBe(2);
      expect(second).toEqual([true, false, true]);
    });

    it("scrolls only within the current slide's page when the width lands", () => {
      // iOS reports every non-animated scroll as a momentum end, which reads the page
      // back as the current slide: a scroll through another page would announce a
      // slide change nobody made.
      for (const start of [0, 2]) {
        const changes: number[] = [];
        const lefts: number[] = [];
        const scroll = HTMLElement.prototype.scroll;
        HTMLElement.prototype.scroll = function (this: HTMLElement, options?: ScrollToOptions | number) {
          if (typeof options === "object" && options.left != null) lefts.push(options.left);
          return scroll.call(this, options as ScrollToOptions);
        };
        try {
          render(<ThemeProvider><Component testID="carousel" items={items} defaultIndex={start} onIndexChange={(i) => changes.push(i)} /></ThemeProvider>);
          layout(viewport(), 300);
        } finally {
          HTMLElement.prototype.scroll = scroll;
        }
        expect(lefts.length).toBeGreaterThan(0);
        expect(lefts.map((left) => Math.round(left / 300))).toEqual(lefts.map(() => start));
        expect(lefts.at(-1)).toBe(start * 300);
        expect(changes).toEqual([]);
        cleanup();
      }
    });

    it("shows the starting slide before measuring and scrolls to it once the width lands", () => {
      render(<ThemeProvider><Component testID="carousel" items={items} defaultIndex={2} /></ThemeProvider>);
      const field = screen.getByLabelText("Notes C");
      const firstFrameMounts = mounts;

      layout(viewport(), 300);

      expect(screen.getByLabelText("Notes C")).toBe(field);
      expect(mounts).toBe(firstFrameMounts);
      expect(scrollport().scrollLeft).toBe(600);
    });
  });
}
