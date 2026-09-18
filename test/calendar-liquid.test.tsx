import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccessibilityInfo, UIManager, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { Calendar as WebCalendar } from "../src/organisms/calendar/calendar.tsx";
import { Calendar as IOSCalendar } from "../src/organisms/calendar/calendar.ios.tsx";
import { Calendar as AndroidCalendar } from "../src/organisms/calendar/calendar.android.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { hostedEntranceParts, layoutHostedEntrance } from "./entrance-layout.ts";

// In glass mode the Calendar's selected day travels as one measured control-layer
// surface through the month grid (horizontally, vertically and diagonally) and
// the week strip; the day numbers, event dots and aria state stay fixed. A month
// or view change is a new scope: the surface resets in place, never travelling
// between months. Range endpoints are two independent surfaces. The day peek
// rides the liquid popup policy. Solid mode keeps the skin's own filled day.

afterEach(cleanup);

const platforms = [["web", WebCalendar], ["ios", IOSCalendar], ["android", AndroidCalendar]] as const;

// The test DOM has no layout: cells report their frames in the grid through
// measureLayout, which answers here from the grid's own arithmetic (seven
// 36-point cells per row after `lead` leading blanks), keyed by the day label.
const CELL = 36;
let lead = 1;
const rectOf = (day: number): LayoutRectangle => ({ x: ((lead + day - 1) % 7) * CELL, y: Math.floor((lead + day - 1) / 7) * CELL, width: CELL, height: CELL });
function mockDayMeasurement() {
  return spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, onFail, onSuccess) => {
    const label = (node as unknown as HTMLElement).querySelector('[role="button"]')?.getAttribute("aria-label") ?? "";
    const day = Number(label.split(",")[0]);
    if (Number.isFinite(day) && day >= 1) { const r = rectOf(day); onSuccess(r.x, r.y, r.width, r.height); } else onFail();
  });
}
function frame(id: string) {
  const { style } = screen.getByTestId(id);
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}
const glass = (body: ReactNode) => <ThemeProvider glass><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;
const day = (n: number) => screen.getByRole("button", { name: new RegExp(`^${n}(,|$)`) });

describe("Calendar moving glass selection", () => {
  for (const [platform, Calendar] of platforms) {
    it(`${platform}: travels diagonally between days of one month while the numbers stay put`, async () => {
      lead = 1;
      const measure = mockDayMeasurement();
      const { unmount } = render(glass(<Calendar month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={10} today={23} testID="cal" />));
      await act(async () => {});
      const clock = animationClock();
      try {
        expect(screen.getAllByTestId("cal-selected-surface")).toHaveLength(1);
        expect(frame("cal-selected-motion")).toEqual(rectOf(10));
        const label = screen.getByText("18");
        fireEvent.click(day(18));
        expect(day(18).getAttribute("aria-pressed")).toBe("true");
        expect(day(10).getAttribute("aria-pressed")).toBe("false");
        expect(frame("cal-selected-motion").x).toBe(rectOf(10).x);
        clock.advance(80);
        // Diagonal travel (one row down, one column right): both axes stretch.
        const flight = frame("cal-selected-motion");
        expect(flight.width).toBeGreaterThan(CELL);
        expect(flight.height).toBeGreaterThan(CELL);
        expect(screen.getByText("18")).toBe(label);
        expect(label.style.transform).toBe("");
        clock.advance(1600);
        expect(frame("cal-selected-motion")).toEqual(rectOf(18));
      } finally { unmount(); clock.restore(); measure.mockRestore(); }
    });
  }

  it("resets in place when the month changes instead of travelling between months", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    const view = render(glass(<WebCalendar month="June 2026" daysInMonth={30} startWeekday={1} selected={12} testID="cal" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      expect(frame("cal-selected-motion")).toEqual(rectOf(12));
      // July starts on a Wednesday: the 12th sits in a different slot.
      lead = 3;
      view.rerender(glass(<WebCalendar month="July 2026" daysInMonth={31} startWeekday={3} selected={12} testID="cal" />));
      await act(async () => {});
      expect(frame("cal-selected-motion")).toEqual(rectOf(12));
      clock.advance(80);
      expect(frame("cal-selected-motion")).toEqual(rectOf(12));
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("moves independent start and end surfaces through a range pick", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    const { unmount } = render(glass(<WebCalendar range month="June 2026" daysInMonth={30} startWeekday={1} defaultRangeStart={8} defaultRangeEnd={14} testID="cal" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      expect(frame("cal-start-motion")).toEqual(rectOf(8));
      expect(frame("cal-end-motion")).toEqual(rectOf(14));
      // A press after a completed range restarts it: the start travels, the end withdraws.
      fireEvent.click(day(5));
      expect(screen.queryByTestId("cal-end-motion")).toBeNull();
      expect(frame("cal-start-motion").x).toBe(rectOf(8).x);
      clock.advance(1600);
      expect(frame("cal-start-motion")).toEqual(rectOf(5));
      // Completing the range places the end surface on its day at once.
      fireEvent.click(day(12));
      expect(frame("cal-end-motion")).toEqual(rectOf(12));
      expect(frame("cal-start-motion")).toEqual(rectOf(5));
      expect(day(12).getAttribute("aria-label")).toBe("12, selected, end of range");
      // A one-day range keeps both surfaces, on the same cell.
      fireEvent.click(day(20));
      fireEvent.click(day(20));
      clock.advance(1600);
      expect(frame("cal-start-motion")).toEqual(rectOf(20));
      expect(frame("cal-end-motion")).toEqual(rectOf(20));
    } finally { unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("travels along the week strip", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    const { unmount } = render(glass(<WebCalendar week month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={10} testID="cal" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      expect(frame("cal-selected-motion")).toEqual(rectOf(10));
      fireEvent.click(day(12));
      clock.advance(80);
      expect(frame("cal-selected-motion").width).toBeGreaterThan(CELL);
      clock.advance(1600);
      expect(frame("cal-selected-motion")).toEqual(rectOf(12));
    } finally { unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("keeps the solid fill and renders no surface in solid mode", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    try {
      const { unmount } = render(<ThemeProvider solid><WebCalendar month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={10} testID="cal" /></ThemeProvider>);
      await act(async () => {});
      expect(screen.queryByTestId("cal-selected-motion")).toBeNull();
      expect(getComputedStyle(day(10)).backgroundColor).not.toMatch(/rgba\(0, 0, 0, 0(?:\.0+)?\)|transparent/);
      unmount();
    } finally { measure.mockRestore(); }
  });

  it("selects the measured bounds immediately under Reduce Motion", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(glass(<WebCalendar month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={3} testID="cal" />));
      await act(async () => {});
      fireEvent.click(day(25));
      await act(async () => {});
      expect(frame("cal-selected-motion")).toEqual(rectOf(25));
      unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
  });

  it("opens the day peek on the liquid popup policy: concealed until settled, retired at once on close", async () => {
    lead = 1;
    const measure = mockDayMeasurement();
    const bounds = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, width: 640, height: 800, top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
    } as DOMRect);
    const { unmount } = render(glass(<WebCalendar dayPeek month="June 2026" daysInMonth={30} startWeekday={1} defaultSelected={3} events={[{ day: 10, title: "Standup", start: 9, end: 10 }]} testID="cal" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(day(10));
      clock.advance(32);
      const title = await screen.findByText("Wednesday, June 10", {}, { timeout: 2000 });
      const nodes = hostedEntranceParts(title);
      layoutHostedEntrance(title, { width: 240, height: 160 });
      expect(title.closest('[aria-hidden="true"]')).not.toBeNull();
      clock.advance(1600);
      expect(title.closest('[aria-hidden="true"]')).toBeNull();
      // Pressing a day without events closes the peek: retired at once, gone after the exit.
      fireEvent.click(day(11));
      expect(title.isConnected).toBe(true);
      expect(nodes.entrance.getAttribute("aria-hidden")).toBe("true");
      clock.advance(1600);
      expect(title.isConnected).toBe(false);
    } finally { unmount(); clock.restore(); measure.mockRestore(); bounds.mockRestore(); }
  });
});
