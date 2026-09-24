import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { Keyboard, Platform, View, type KeyboardEvent } from "react-native";
import { fitOverlayHeight } from "../src/style/overlay-layout.ts";
import { OverlayProvider, useOverlayHost, insetOverlayBounds, intersectOverlayBounds, type OverlayHost, type OverlayBounds } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { popoverArrowOffset } from "../src/atoms/popover/popover.styles.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { webSkin as dropdownSkin } from "../src/atoms/dropdown/dropdown.styles.ts";
import { hostedEntranceParts, layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);
const base = { triggerTop: 100, triggerHeight: 40, outletHeight: 600, desiredHeight: 200, gap: 4 };

describe("anchored card reachability", () => {
  it("keeps a short menu below and flips a bottom-edge menu above", () => {
    expect(fitOverlayHeight(base)).toEqual({ side: "below", top: 144, maxHeight: 448 });
    expect(fitOverlayHeight({ ...base, triggerTop: 520 })).toEqual({ side: "above", bottom: 84, maxHeight: 508 });
  });

  it("repositions when the keyboard opens after the card", () => {
    const open = fitOverlayHeight({ ...base, triggerTop: 300 });
    expect(open.side).toBe("below");
    const keyboard = fitOverlayHeight({ ...base, triggerTop: 300, currentSide: open.side, visibleBottom: 350 });
    expect(keyboard).toEqual({ side: "above", bottom: 304, maxHeight: 288 });
    // Filtering must not move the card back while the current side fits.
    expect(fitOverlayHeight({ ...base, triggerTop: 300, desiredHeight: 20, currentSide: keyboard.side })).toEqual({ side: "above", bottom: 304, maxHeight: 288 });
  });

  it("caps long content to the larger space without a row-height floor", () => {
    expect(fitOverlayHeight({ ...base, triggerTop: 280, desiredHeight: 2000 })).toEqual({ side: "below", top: 324, maxHeight: 268 });
    expect(fitOverlayHeight({ ...base, triggerTop: 320, desiredHeight: 2000 })).toEqual({ side: "above", bottom: 284, maxHeight: 308 });
    const small = fitOverlayHeight({ ...base, outletHeight: 30, triggerTop: 13, triggerHeight: 1, gap: 1 });
    expect(small.maxHeight).toBe(7);
    expect(small.top! + small.maxHeight).toBeLessThanOrEqual(22);
  });

  it("uses the viewport beyond a short content-sized outlet", () => {
    expect(fitOverlayHeight({ ...base, outletHeight: 150, visibleBottom: 500 })).toEqual({ side: "below", top: 144, maxHeight: 348 });
    expect(fitOverlayHeight({ ...base, outletHeight: 1000, visibleTop: 200, visibleBottom: 700, triggerTop: 620 })).toEqual({ side: "above", bottom: 384, maxHeight: 408 });
  });

  it("keeps beside cards inside the visible band", () => {
    const beside = fitOverlayHeight({ ...base, triggerTop: 560, beside: true });
    expect(beside).toEqual({ side: "below", top: 392, maxHeight: 584 });
    const outside = fitOverlayHeight({ ...base, triggerTop: 800, visibleBottom: 300 });
    expect(outside).toEqual({ side: "below", top: 844, maxHeight: 284 });
    expect(fitOverlayHeight({ ...base, outletHeight: 0 })).toEqual({ side: "below", top: 144, maxHeight: 0 });
  });

  it("preserves offscreen anchors while fitting partially visible triggers", () => {
    expect(fitOverlayHeight({ ...base, triggerTop: -100 }).top).toBe(-56);
    expect(fitOverlayHeight({ ...base, triggerTop: 700 }).top).toBe(744);
    expect(fitOverlayHeight({ ...base, triggerTop: -20 }).top).toBe(24);
    expect(fitOverlayHeight({ ...base, triggerTop: 580 }).side).toBe("above");
  });

  it("aims the popover pointer at its trigger and keeps it off rounded corners", () => {
    expect(popoverArrowOffset(130, 260)).toBe(115);
    expect(popoverArrowOffset(0, 260)).toBe(26);
    expect(popoverArrowOffset(260, 260)).toBe(204);
    expect(popoverArrowOffset(25, 50)).toBe(10);
  });
});

function CaptureHost({ capture }: { capture: (host: OverlayHost) => void }) {
  const host = useOverlayHost();
  useEffect(() => { capture(host!); }, [capture, host]);
  return null;
}

describe("overlay window boundaries", () => {
  it("fits an unchanged Android window to the IME, keeps resized roots bounded, and restores on hide", async () => {
    const platform = Object.getOwnPropertyDescriptor(Platform, "OS")!;
    const originalRect = Element.prototype.getBoundingClientRect;
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const subscription = spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, listener);
      return { remove: () => { listeners.delete(name); } };
    });
    let height = 914;
    Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 400, height, top: 0, left: 0, right: 400, bottom: height, toJSON() { return {}; } }) as DOMRect;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    try {
      let host: OverlayHost | null = null;
      const { unmount } = render(<OverlayProvider><CaptureHost capture={(value) => { host = value; }} /></OverlayProvider>);
      const bounds = () => new Promise<OverlayBounds>((resolve) => host!.measureVisibleBounds!(resolve));
      let revisions = 0;
      const unsubscribe = host!.subscribeLayout!(() => { revisions += 1; });
      expect((await bounds()).height).toBe(914);
      const event = { duration: 0, easing: "keyboard", endCoordinates: { screenX: 0, screenY: 590, width: 400, height: 324 } } as KeyboardEvent;
      act(() => listeners.get("keyboardDidShow")!(event));
      expect((await bounds()).height).toBe(590);
      expect(revisions).toBe(1);
      // A resized legacy content root is smaller than screen-based keyboard Y.
      // The provider must keep that real root edge, not deduct 324 again.
      height = 566;
      expect((await bounds()).height).toBe(566);
      height = 914;
      act(() => listeners.get("keyboardDidShow")!({ ...event, endCoordinates: { ...event.endCoordinates, screenY: 510, height: 404 } }));
      expect((await bounds()).height).toBe(510);
      act(() => listeners.get("keyboardDidHide")!(event));
      expect((await bounds()).height).toBe(914);
      unsubscribe();
      unmount();
      expect(listeners.size).toBe(0);
    } finally {
      cleanup();
      subscription.mockRestore();
      Object.defineProperty(Platform, "OS", platform);
      Element.prototype.getBoundingClientRect = originalRect;
    }
  });

  it("intersects declared chrome with the keyboard band without subtracting it twice", () => {
    const own = insetOverlayBounds({ x: 0, y: 0, width: 400, height: 800 }, { top: 56, bottom: 64 });
    expect(own).toEqual({ x: 0, y: 56, width: 400, height: 680 });
    expect(intersectOverlayBounds(own, { x: 0, y: 0, width: 400, height: 400 })).toEqual({ x: 0, y: 56, width: 400, height: 344 });
    expect(insetOverlayBounds(own, { top: 900, bottom: 900 }).height).toBe(0);
  });

  it("updates measured insets without replacing the host", async () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 400, height: 800, top: 0, left: 0, right: 400, bottom: 800, toJSON: () => ({}) }) as DOMRect;
    try {
      let host: OverlayHost | null = null;
      const capture = (value: OverlayHost) => { host = value; };
      const ui = (top: number) => <ThemeProvider><OverlayProvider viewportInsets={{ top }}><CaptureHost capture={capture} /></OverlayProvider></ThemeProvider>;
      const { rerender } = render(ui(52));
      const before = host!;
      let revisions = 0;
      const unsubscribe = before.subscribeLayout!(() => revisions += 1);
      rerender(ui(56));
      expect(host).toBe(before);
      expect(revisions).toBe(1);
      const bounds = await new Promise<OverlayBounds>((resolve) => host!.measureVisibleBounds!(resolve));
      expect(bounds).toEqual({ x: 0, y: 56, width: 400, height: 744 });
      unsubscribe();
    } finally { Element.prototype.getBoundingClientRect = original; }
  });

  for (const mode of ["content", "viewport", "window"] as const) {
    it(`${mode} hosts measure and inherit the correct native-window band`, async () => {
      const original = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        const inner = this.closest('[data-testid="inner"]') !== null;
        const rect = inner ? { x: 30, y: 100, width: 200, height: 800 } : { x: 0, y: 0, width: 500, height: 400 };
        return { ...rect, left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height, toJSON() { return rect; } } as DOMRect;
      };
      try {
        let host: OverlayHost | null = null;
        render(<ThemeProvider><OverlayProvider><View testID="inner">
          <OverlayProvider viewport={mode === "viewport"} separateWindow={mode === "window"}>
            <CaptureHost capture={(value) => { host = value; }} />
          </OverlayProvider>
        </View></OverlayProvider></ThemeProvider>);
        const bounds = await new Promise<OverlayBounds>((resolve) => host!.measureVisibleBounds!(resolve));
        expect(bounds).toEqual(mode === "content" ? { x: 0, y: 0, width: 500, height: 400 }
          : mode === "viewport" ? { x: 30, y: 100, width: 200, height: 300 }
          : { x: 30, y: 100, width: 200, height: 800 });
      } finally {
        Element.prototype.getBoundingClientRect = original;
      }
    });
  }
});

// A CARD OPENED ABOVE ITS TRIGGER ON A SCROLLED HOST.
//
// The docs Page mounts its overlay host INSIDE the page scroller, so the outlet is
// the whole page body and scrolls with it: when the page is scrolled, the outlet's
// top sits above the window and the trigger's outlet-relative y is larger than its
// window y. A card that flips above its trigger is pinned by a `bottom` inset,
// resolved against that outlet, and the card must hug that inset: the wrapper's
// height has to be the card's own. On iOS and Android it was not (2026-09-19): the
// scrollport inside the card inherited React Native's ScrollView `flexGrow: 1`, and
// while Yoga measured the wrapper (no height of its own) it turned the card's
// maxHeight into an at-most constraint that the growing scrollport filled under the
// legacy stretch errata React Native keeps on. The wrapper came out as tall as the
// cap, the card laid out content-sized at its top, and a menu whose bottom should
// have touched its trigger floated up to the top of the visible band. The numbers
// here are the iPhone 17 Pro reproduction's, rounded: a 1056pt page body scrolled
// 80pt under a 874pt window, the trigger 612pt down the window.
const SCROLLED_HOST = { outletHeight: 1056, visibleTop: 80, visibleBottom: 954, triggerTop: 692, triggerHeight: 38, gap: 4 };

describe("a card opened above its trigger on a scrolled host", () => {
  it("pins the card's bottom edge to the trigger through the scrolled outlet's own height", () => {
    // Unmeasured, the card sits below and is capped by the band under the trigger.
    expect(fitOverlayHeight({ ...SCROLLED_HOST, desiredHeight: null })).toEqual({ side: "below", top: 734, maxHeight: 212 });
    // Measured taller than that band, it flips above: the inset is the outlet's
    // height minus the card's bottom edge (the trigger's top less the gap), so the
    // edge lands on the trigger no matter how far the outlet scrolled.
    const above = fitOverlayHeight({ ...SCROLLED_HOST, desiredHeight: 245 });
    expect(above).toEqual({ side: "above", bottom: 368, maxHeight: 600 });
    expect(SCROLLED_HOST.outletHeight - above.bottom!).toBe(SCROLLED_HOST.triggerTop - SCROLLED_HOST.gap);
    expect(above.top).toBeUndefined();
  });

  it("anchors the hosted card by that inset alone and keeps its scrollport from growing into the cap", async () => {
    const measure = spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      // The window band is the root outlet; the page outlet is the content host
      // inside the scrolled page; the trigger is the Dropdown's own wrapper.
      const outlet = getComputedStyle(this).zIndex === "1000";
      const inPage = this.closest('[data-testid="page"]') !== null;
      const [x, y, width, height] = this.getAttribute("data-testid") === "edge-menu"
        ? [28, 612, 119, SCROLLED_HOST.triggerHeight]
        : outlet && inPage ? [28, -80, 346, SCROLLED_HOST.outletHeight]
        : outlet ? [0, 0, 402, 874]
        : [0, 0, 0, 0];
      return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}) };
    });
    try {
      render(
        <ThemeProvider>
          <OverlayProvider>
            <View testID="page">
              <OverlayProvider style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}>
                <Dropdown testID="edge-menu" trigger="Fruit actions" items={[{ label: "Open" }, { label: "Rename" }, { label: "Duplicate" }, { label: "Archive" }, { label: "Delete", destructive: true }]} />
              </OverlayProvider>
            </View>
          </OverlayProvider>
        </ThemeProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Fruit actions" }));
      // The rendered menu stands off by the web skin's own gap, so its placements are
      // the pure fit's at that gap.
      const host = { ...SCROLLED_HOST, gap: dropdownSkin.menuGap };
      const below = fitOverlayHeight({ ...host, desiredHeight: null });
      const above = fitOverlayHeight({ ...host, desiredHeight: 245 });
      expect(above.side).toBe("above");
      // The portal attaches the card concealed, placed below, until it is measured.
      const menu = await screen.findByRole("menu", { hidden: true });
      const parts = hostedEntranceParts(menu);
      const wrapperStyle = () => parts.entrance.getAttribute("style") ?? "";
      await waitFor(() => expect(wrapperStyle()).toContain(`top: ${below.top}px`));
      // 233pt of rows in a 245pt card: taller than the band below the trigger.
      layoutHostedEntrance(menu, { width: 200, height: 245 }, { width: 200, height: 233 });
      await waitFor(() => expect(wrapperStyle()).toContain(`bottom: ${SCROLLED_HOST.outletHeight - (SCROLLED_HOST.triggerTop - dropdownSkin.menuGap)}px`));
      // Nothing but that inset may size or place the wrapper along the page: no top,
      // and no height of its own, so it is exactly as tall as the card it wraps.
      expect(wrapperStyle()).not.toMatch(/(^|; )top:/);
      expect(wrapperStyle()).not.toMatch(/(^|; )(min-|max-)?height:/);
      // The card takes the band above the trigger as its cap, and its scrollport
      // may only shrink to that cap, never grow to it: growth is what let Yoga
      // inflate the wrapper to the cap on iOS and Android and float the card away
      // from its trigger.
      expect(parts.card.getAttribute("style")).toContain(`max-height: ${above.maxHeight}px`);
      const scrollport = parts.viewport.getAttribute("style") ?? "";
      expect(scrollport).toContain("flex-grow: 0");
      expect(scrollport).toContain("flex-shrink: 1");
    } finally {
      measure.mockRestore();
    }
  });
});
