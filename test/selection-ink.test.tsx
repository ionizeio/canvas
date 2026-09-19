import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccessibilityInfo, UIManager, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { darkColors } from "../src/style/tokens.ts";
import { Pagination as WebPagination } from "../src/atoms/pagination/pagination.tsx";
import { Pagination as IOSPagination } from "../src/atoms/pagination/pagination.ios.tsx";
import { Pagination as AndroidPagination } from "../src/atoms/pagination/pagination.android.tsx";
import { Calendar as WebCalendar } from "../src/organisms/calendar/calendar.tsx";
import { Navbar as IOSNavbar } from "../src/organisms/navbars/navbars.ios.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

// The ink on a moving brand puck follows the SURFACE, not the press. Before this
// contract the newly selected label switched to `primary-foreground` the moment it
// was pressed and sat unreadable on the bare cell for the flight (dark navy on the
// dark scheme's cell, frame strips of 2026-09-18), while the label the puck left
// switched to the resting ink under a puck that was still on it. Now the label
// keeps its resting ink until the surface covers it and the departing label takes
// the resting ink back as the surface leaves; a resting tile of its own (the web's
// bordered page cell, iOS's neutral link capsule) yields to the surface the same
// way instead of vanishing at the press. Pinned in the DARK scheme, where the two
// inks differ (both are the same dark navy in light).

afterEach(cleanup);

// react-native-web prints a colour as `rgba(r, g, b, a)` with a two-decimal alpha and
// an Animated interpolation as `rgba(r, g, b, a)` with a bare one, so colours compare
// as `r,g,b` strings read back from either form.
const rgb = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  const h = value.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
};
const REST = rgb(darkColors.foreground);
const COVERED = rgb(darkColors["primary-foreground"]);
const BRAND = rgb(darkColors.primary);
const colourOf = (node: Element) => rgb(getComputedStyle(node).color);
const fillOf = (node: Element) => rgb(getComputedStyle(node).backgroundColor);
const dark = (body: ReactNode) => <ThemeProvider glass dark><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;

function measureHost(cell: Element, rect: LayoutRectangle) {
  for (let host = cell.parentElement; host; host = host.parentElement) {
    if ((host as unknown as { __reactLayoutHandler?: unknown }).__reactLayoutHandler) {
      layoutElement(host, rect);
      return;
    }
  }
  throw new Error("Missing measured wrapper");
}
function frameOf(testID: string) {
  const { style } = screen.getByTestId(testID);
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}
const covers = (frame: { x: number; width: number }, centreX: number) => frame.x <= centreX && centreX <= frame.x + frame.width;

// Advance the clock a frame at a time and record, per frame, the surface's frame and
// the two labels' inks, so the assertions can relate the ink to the surface.
function flight(clock: ReturnType<typeof animationClock>, surface: string, labels: Record<string, Element>, frames: number) {
  const samples: Array<{ frame: ReturnType<typeof frameOf>; ink: Record<string, string> }> = [];
  for (let i = 0; i < frames; i++) {
    clock.advance(16);
    const ink: Record<string, string> = {};
    for (const [name, node] of Object.entries(labels)) ink[name] = colourOf(node);
    samples.push({ frame: frameOf(surface), ink });
  }
  return samples;
}

describe("Pagination label ink follows the travelling puck", () => {
  const slot = (index: number): LayoutRectangle => ({ x: 44 + index * 44, y: 0, width: 40, height: 40 });
  const centre = (index: number) => slot(index).x + 20;
  const platforms = [["web", WebPagination], ["ios", IOSPagination], ["android", AndroidPagination]] as const;
  for (const [platform, Pagination] of platforms) {
    it(`${platform}: the arriving label turns only once the puck covers it, the departing one as the puck leaves`, async () => {
      const { unmount } = render(dark(<Pagination total={5} defaultPage={2} testID="pages" />));
      await act(async () => {});
      for (let p = 1; p <= 5; p++) measureHost(screen.getByRole("button", { name: `Page ${p}` }), slot(p - 1));
      const clock = animationClock();
      try {
        const two = screen.getByText("2");
        const three = screen.getByText("3");
        const five = screen.getByText("5");
        expect(colourOf(two)).toBe(COVERED);
        expect(colourOf(five)).toBe(REST);
        fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
        // The semantics move at once; the inks do not.
        expect(screen.getByRole("button", { name: "Page 5" }).getAttribute("aria-current")).toBe("page");
        expect(colourOf(five)).toBe(REST);
        expect(colourOf(two)).toBe(COVERED);
        const samples = flight(clock, "pages-selection-motion", { two, five, three }, 60);
        // The arriving label is in the puck's ink only in frames where the puck
        // already covers its centre, and the departing label is back to the resting
        // ink only in frames where the puck no longer covers its centre.
        for (const { frame, ink } of samples) {
          if (ink.five === COVERED) expect(covers(frame, centre(4))).toBe(true);
          if (ink.two === REST) expect(covers(frame, centre(1))).toBe(false);
          // A label the flight passes over is never driven: its ink stays plain.
          expect(ink.three).toBe(REST);
        }
        // Both inks did change, and they settled with the puck.
        expect(samples.some(({ ink }) => ink.five !== REST && ink.five !== COVERED)).toBe(true);
        expect(samples.at(-1)!.ink.five).toBe(COVERED);
        expect(samples.at(-1)!.ink.two).toBe(REST);
        clock.advance(1000);
        expect(frameOf("pages-selection-motion")).toEqual(slot(4));
      } finally { unmount(); clock.restore(); }
    });
  }

  it("web: the resting tile under the arriving label yields to the puck instead of vanishing at the press", async () => {
    const { unmount } = render(dark(<WebPagination total={5} defaultPage={2} testID="pages" />));
    await act(async () => {});
    for (let p = 1; p <= 5; p++) measureHost(screen.getByRole("button", { name: `Page ${p}` }), slot(p - 1));
    const clock = animationClock();
    try {
      // The veil is the first child of the cell: the resting tile's pane inside an
      // opacity wrapper. A bare cell (iOS, M3) has none; the web tile has one.
      const veilOf = (page: number) => screen.getByRole("button", { name: `Page ${page}` }).firstElementChild as HTMLElement;
      expect(parseFloat(getComputedStyle(veilOf(4)).opacity)).toBe(1);
      expect(parseFloat(getComputedStyle(veilOf(2)).opacity)).toBe(0);
      fireEvent.click(screen.getByRole("button", { name: "Page 4" }));
      expect(parseFloat(getComputedStyle(veilOf(4)).opacity)).toBe(1);
      const opacities: number[] = [];
      for (let i = 0; i < 60; i++) {
        clock.advance(16);
        opacities.push(parseFloat(getComputedStyle(veilOf(4)).opacity));
      }
      // Monotonic dissolve, no pop: it fades through intermediate values to 0.
      for (let i = 1; i < opacities.length; i++) expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]! + 1e-6);
      expect(opacities.some((o) => o > 0.05 && o < 0.95)).toBe(true);
      expect(opacities.at(-1)).toBe(0);
      expect(parseFloat(getComputedStyle(veilOf(2)).opacity)).toBe(1);
    } finally { unmount(); clock.restore(); }
  });

  it("paints the covered ink at once under Reduce Motion and on a reset, where nothing travels", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(dark(<WebPagination total={5} defaultPage={1} testID="pages" />));
      await act(async () => {});
      for (let p = 1; p <= 5; p++) measureHost(screen.getByRole("button", { name: `Page ${p}` }), slot(p - 1));
      fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
      await act(async () => {});
      expect(colourOf(screen.getByText("5"))).toBe(COVERED);
      expect(colourOf(screen.getByText("1"))).toBe(REST);
      unmount();
    } finally { reduced.mockRestore(); }
    // A window shift that moves the page the puck sat on resets the surface onto
    // the new page's frame with no travel: that label is in the puck's ink at once.
    const table: Record<number, LayoutRectangle> = {};
    const measure = spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, onFail, onSuccess) => {
      const rect = table[Number(((node as unknown as HTMLElement).querySelector('[role="button"]')?.getAttribute("aria-label") ?? "").replace("Page ", ""))];
      if (rect) onSuccess(rect.x, rect.y, rect.width, rect.height);
      else onFail();
    });
    const { unmount } = render(dark(<WebPagination total={20} defaultPage={2} testID="pages" />));
    await act(async () => {});
    measureHost(screen.getByRole("button", { name: "Page 1" }), slot(0));
    measureHost(screen.getByRole("button", { name: "Page 2" }), slot(1));
    measureHost(screen.getByRole("button", { name: "Page 3" }), slot(2));
    measureHost(screen.getByRole("button", { name: "Page 20" }), slot(4));
    const clock = animationClock();
    try {
      // 2 -> 20 shifts the window to 1 … 19 20: page 2 leaves, so the surface resets.
      [1, 19, 20].forEach((page, i) => { table[page] = slot([0, 2, 3][i]!); });
      fireEvent.click(screen.getByRole("button", { name: "Page 20" }));
      expect(frameOf("pages-selection-motion")).toEqual(slot(3));
      expect(colourOf(screen.getByText("20"))).toBe(COVERED);
      clock.advance(200);
      expect(colourOf(screen.getByText("20"))).toBe(COVERED);
      expect(colourOf(screen.getByText("19"))).toBe(REST);
    } finally { unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("keeps the solid tree's inks: the selected label is the skin's own, nothing animates", async () => {
    const { unmount } = render(<ThemeProvider solid dark><WebPagination total={5} defaultPage={2} testID="pages" /></ThemeProvider>);
    await act(async () => {});
    expect(colourOf(screen.getByText("2"))).toBe(COVERED);
    expect(colourOf(screen.getByText("3"))).toBe(REST);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(colourOf(screen.getByText("3"))).toBe(COVERED);
    expect(colourOf(screen.getByText("2"))).toBe(REST);
    unmount();
  });
});

describe("Calendar day ink follows the travelling puck", () => {
  const CELL = 36;
  const lead = 1;
  const rectOf = (day: number): LayoutRectangle => ({ x: ((lead + day - 1) % 7) * CELL, y: Math.floor((lead + day - 1) / 7) * CELL, width: CELL, height: CELL });
  const day = (n: number) => screen.getByRole("button", { name: new RegExp(`^${n}(,|$)`) });

  it("the number and the event dot take the puck's ink as it arrives and give it back as it leaves", async () => {
    const measure = spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, onFail, onSuccess) => {
      const n = Number(((node as unknown as HTMLElement).querySelector('[role="button"]')?.getAttribute("aria-label") ?? "").split(",")[0]);
      if (Number.isFinite(n) && n >= 1) { const r = rectOf(n); onSuccess(r.x, r.y, r.width, r.height); } else onFail();
    });
    const { unmount } = render(dark(<WebCalendar month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={10} today={23} events={[{ day: 10 }, { day: 18 }]} testID="cal" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const ten = screen.getByText("10");
      const eighteen = screen.getByText("18");
      const dotOf = (n: number) => day(n).lastElementChild as HTMLElement;
      expect(colourOf(ten)).toBe(COVERED);
      expect(colourOf(eighteen)).toBe(REST);
      expect(fillOf(dotOf(18))).toBe(BRAND);
      expect(fillOf(dotOf(10))).toBe(COVERED);
      fireEvent.click(day(18));
      expect(day(18).getAttribute("aria-pressed")).toBe("true");
      expect(colourOf(eighteen)).toBe(REST);
      expect(fillOf(dotOf(18))).toBe(BRAND);
      // A diagonal flight: the puck must cover the day's centre on both axes before
      // its number and dot are in the puck's ink.
      const target = rectOf(18);
      for (let i = 0; i < 60; i++) {
        clock.advance(16);
        const f = frameOf("cal-selected-motion");
        const inside = covers(f, target.x + CELL / 2) && f.y <= target.y + CELL / 2 && target.y + CELL / 2 <= f.y + f.height;
        if (colourOf(eighteen) === COVERED) expect(inside).toBe(true);
        if (fillOf(dotOf(18)) === COVERED) expect(inside).toBe(true);
      }
      expect(colourOf(eighteen)).toBe(COVERED);
      expect(fillOf(dotOf(18))).toBe(COVERED);
      expect(colourOf(ten)).toBe(REST);
      expect(fillOf(dotOf(10))).toBe(BRAND);
      clock.advance(1000);
      expect(frameOf("cal-selected-motion")).toEqual(rectOf(18));
    } finally { unmount(); clock.restore(); measure.mockRestore(); }
  });
});

describe("Navbar link ink follows the travelling capsule", () => {
  const rects: Record<string, LayoutRectangle> = { Home: { x: 0, y: 0, width: 80, height: 32 }, Reports: { x: 88, y: 0, width: 96, height: 32 }, Settings: { x: 192, y: 0, width: 100, height: 32 } };
  const link = (name: string) => screen.getByRole("link", { name });

  it("iOS: the label turns to the capsule's ink as the capsule arrives, and the resting capsule dissolves under it", async () => {
    const { unmount } = render(dark(<IOSNavbar brand="Acme" links={Object.keys(rects)} testID="nav" />));
    await act(async () => {});
    for (const [name, rect] of Object.entries(rects)) measureHost(link(name), rect);
    const clock = animationClock();
    try {
      const home = screen.getByText("Home");
      const settings = screen.getByText("Settings");
      // The iOS skin's resting links read in the brand text colour on a neutral capsule.
      expect(colourOf(home)).toBe(COVERED);
      expect(colourOf(settings)).toBe(BRAND);
      const capsuleOf = (name: string) => link(name).firstElementChild as HTMLElement;
      expect(parseFloat(getComputedStyle(capsuleOf("Settings")).opacity)).toBe(1);
      expect(parseFloat(getComputedStyle(capsuleOf("Home")).opacity)).toBe(0);
      fireEvent.click(link("Settings"));
      expect(link("Settings").getAttribute("aria-current")).toBe("page");
      expect(colourOf(settings)).toBe(BRAND);
      expect(parseFloat(getComputedStyle(capsuleOf("Settings")).opacity)).toBe(1);
      const centre = rects.Settings!.x + rects.Settings!.width / 2;
      for (let i = 0; i < 60; i++) {
        clock.advance(16);
        const f = frameOf("nav-selection-motion");
        if (colourOf(settings) === COVERED) expect(covers(f, centre)).toBe(true);
        if (parseFloat(getComputedStyle(capsuleOf("Settings")).opacity) === 0) expect(covers(f, centre)).toBe(true);
      }
      expect(colourOf(settings)).toBe(COVERED);
      expect(colourOf(home)).toBe(BRAND);
      expect(parseFloat(getComputedStyle(capsuleOf("Settings")).opacity)).toBe(0);
      expect(parseFloat(getComputedStyle(capsuleOf("Home")).opacity)).toBe(1);
    } finally { unmount(); clock.restore(); }
  });
});
