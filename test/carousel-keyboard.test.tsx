import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TextInput } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Carousel } from "../src/organisms/carousel/carousel.tsx";
import { Carousel as IOSCarousel } from "../src/organisms/carousel/carousel.ios.tsx";
import { Carousel as AndroidCarousel } from "../src/organisms/carousel/carousel.android.tsx";
import { createCarousel, type CarouselSkin } from "../src/organisms/carousel/carousel.shared.tsx";
import { webSkin, iosSkin, androidSkin } from "../src/organisms/carousel/carousel.styles.ts";

afterEach(cleanup);
const items = [
  { key: "a", content: <TextInput accessibilityLabel="Slide input" /> },
  { key: "b", content: "Second" }, { key: "c", content: "Third" },
];
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layout(node: HTMLElement, width: number, height = 100) {
  act(() => (node as LayoutHost).__reactLayoutHandler?.({
    nativeEvent: { layout: { x: 0, y: 0, width, height } }, timeStamp: 1,
  }));
}
function mount() {
  const changes: number[] = [];
  const view = render(<ThemeProvider><Carousel testID="carousel" items={items} onIndexChange={(i) => changes.push(i)} /></ThemeProvider>);
  // The track row holds [prev arrow][measured viewport][next arrow]; the viewport is
  // the cell that measures itself.
  const track = screen.getByTestId("carousel").firstElementChild as HTMLElement;
  const measured = [...track.children].find((node) => (node as LayoutHost).__reactLayoutHandler) as HTMLElement;
  layout(measured, 300);
  const viewport = measured.firstElementChild as HTMLElement | null;
  if (!viewport) throw new Error("Expected the paged scrollport inside the viewport");
  layout(viewport, 300);
  layout(viewport.firstElementChild as HTMLElement, 900);
  return { ...view, viewport, changes };
}
function key(node: HTMLElement, key: string, extra = {}) {
  fireEvent.keyDown(node, { key, ...extra });
  fireEvent.keyUp(node, { key, ...extra });
}

describe("Carousel keyboard and picker integration", () => {
  it("focuses the measured overflowing scrollport and handles full navigation sequences", async () => {
    const { viewport, changes } = mount();
    expect(viewport.tabIndex).toBe(0);
    key(viewport, "ArrowRight");
    expect(screen.getByRole("button", { name: "Slide 2 of 3, current slide" }).getAttribute("aria-current")).toBe("true");
    key(viewport, "End");
    key(viewport, "ArrowRight");
    key(viewport, "Home");
    key(viewport, "ArrowLeft");
    expect(changes).toEqual([1, 2, 0]);
    await act(async () => {});
  });

  it("leaves nested inputs, composing keys and already prevented events alone", async () => {
    const { viewport, changes } = mount();
    key(screen.getByRole("textbox", { name: "Slide input" }), "End");
    key(viewport, "End", { isComposing: true });
    key(viewport, "End", { keyCode: 229 });
    const prevented = new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true });
    prevented.preventDefault();
    fireEvent(viewport, prevented);
    expect(changes).toEqual([]);
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    fireEvent(viewport, handled);
    expect(handled.defaultPrevented).toBe(true);
    key(viewport, "ArrowRight", { repeat: true });
    expect(changes).toEqual([1, 2]);
    await act(async () => {});
  });

  it("uses valid current-button semantics and does not activate the current picker", () => {
    const { container } = render(<ThemeProvider><Carousel items={items} onIndexChange={() => { throw new Error("Current slide must be a no-op"); }} /></ThemeProvider>);
    const group = screen.getByRole("group", { name: "Choose a slide" });
    expect(group.querySelectorAll('button[aria-current]').length).toBe(3);
    expect(container.querySelector("[aria-selected]")).toBeNull();
    const current = screen.getByRole("button", { name: "Slide 1 of 3, current slide" });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.hasAttribute("disabled")).toBe(false);
    expect(current.tabIndex).toBe(0);
    fireEvent.click(current);
  });

  it("retains legacy skin typing and provides real fallback targets", () => {
    const { dotTarget: _target, ...originalSkin } = webSkin;
    const legacySkin: CarouselSkin = { ...originalSkin, dotHitSlop: 4, focusOutlineReset: {} };
    const LegacyCarousel = createCarousel(legacySkin);
    render(<ThemeProvider><LegacyCarousel items={items} /></ThemeProvider>);
    const target = screen.getByRole("button", { name: "Slide 2 of 3" });
    expect(Number.parseFloat(target.style.minWidth)).toBeGreaterThanOrEqual(24);
    expect(Number.parseFloat(target.style.height)).toBeGreaterThanOrEqual(24);
  });

  it("clamps removed uncontrolled items silently and does not revive the removed index", () => {
    const changes: number[] = [];
    const node = (data = items) => <ThemeProvider><Carousel items={data} defaultIndex={2} onIndexChange={(next) => changes.push(next)} /></ThemeProvider>;
    const view = render(node());
    expect(screen.getByRole("button", { name: "Slide 3 of 3, current slide" })).toBeDefined();
    view.rerender(node(items.slice(0, 1)));
    view.rerender(node());
    expect(screen.getByRole("button", { name: "Slide 1 of 3, current slide" })).toBeDefined();
    expect(changes).toEqual([]);
  });

  it("controlled picker requests preserve the parent's index until an external update", () => {
    const changes: number[] = [];
    const node = (index: number) => <ThemeProvider><Carousel items={items} index={index} onIndexChange={(next) => changes.push(next)} /></ThemeProvider>;
    const view = render(node(0));
    fireEvent.click(screen.getByRole("button", { name: "Slide 3 of 3" }));
    expect(changes).toEqual([2]);
    expect(screen.getByRole("button", { name: "Slide 1 of 3, current slide" })).toBeDefined();
    view.rerender(node(2));
    fireEvent.click(screen.getByRole("button", { name: "Slide 3 of 3, current slide" }));
    expect(changes).toEqual([2]);
  });

  for (const [name, Component, skin, minimum] of [
    ["web", Carousel, webSkin, 24], ["ios", IOSCarousel, iosSkin, 44], ["android", AndroidCarousel, androidSkin, 48],
  ] as const) {
    it(`${name} paints small dots inside real platform-sized button targets`, () => {
      render(<ThemeProvider><Component items={items} showDots /></ThemeProvider>);
      const target = screen.getByRole("button", { name: "Slide 2 of 3" });
      expect(Number.parseFloat(target.style.minWidth)).toBeGreaterThanOrEqual(minimum);
      expect(Number.parseFloat(target.style.height)).toBeGreaterThanOrEqual(minimum);
      expect(skin.dotTarget?.alignItems).toBe("center");
      expect(skin.dotTarget?.justifyContent).toBe("center");
    });
  }
});
