import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, type LayoutRectangle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Navbar as WebNavbar } from "../src/organisms/navbars/navbars.tsx";
import { Navbar as IOSNavbar } from "../src/organisms/navbars/navbars.ios.tsx";
import { Navbar as AndroidNavbar } from "../src/organisms/navbars/navbars.android.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

// In glass mode the Navbar's active link fill travels as one measured
// control-layer surface (profile "navigation"); labels, roles, aria-current and
// hit targets stay fixed, a collapse retires it, and solid mode keeps the skin's
// own active tile untouched.

afterEach(cleanup);

const platforms = [["web", WebNavbar], ["ios", IOSNavbar], ["android", AndroidNavbar]] as const;

function measureLink(name: string, rect: LayoutRectangle) {
  const link = screen.getByRole("link", { name });
  for (let host = link.parentElement; host; host = host.parentElement) {
    if ((host as unknown as { __reactLayoutHandler?: unknown }).__reactLayoutHandler) {
      layoutElement(host, rect);
      return;
    }
  }
  throw new Error(`Missing measured link wrapper for ${name}`);
}

function frame() {
  const { style } = screen.getByTestId("nav-selection-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}

const links = ["Home", "Reports", "Settings"];

describe("Navbar moving glass selection", () => {
  for (const [platform, Navbar] of platforms) {
    it(`${platform}: moves one measured surface between links while the labels and aria-current stay put`, async () => {
      const { unmount } = render(<ThemeProvider glass><Navbar brand="Acme" links={links} testID="nav" /></ThemeProvider>);
      await act(async () => {});
      measureLink("Home", { x: 0, y: 0, width: 80, height: 36 });
      measureLink("Reports", { x: 88, y: 0, width: 96, height: 36 });
      measureLink("Settings", { x: 192, y: 0, width: 100, height: 36 });
      const reports = screen.getByRole("link", { name: "Reports" });
      const label = screen.getByText("Reports");
      const clock = animationClock();
      try {
        expect(screen.getAllByTestId("nav-selection")).toHaveLength(1);
        expect(frame()).toEqual({ x: 0, y: 0, width: 80, height: 36 });
        // The active tile itself paints no fill of its own: the surface carries it.
        expect(getComputedStyle(screen.getByRole("link", { name: "Home" })).backgroundColor).toMatch(/rgba\(0, 0, 0, 0(?:\.0+)?\)|transparent/);
        fireEvent.click(reports);
        expect(reports.getAttribute("aria-current")).toBe("page");
        expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
        expect(frame().x).toBe(0);
        clock.advance(80);
        // Navigation profile: horizontal stretch in flight, no growth into the label lane.
        expect(frame().width).toBeGreaterThan(80);
        expect(frame().height).toBeLessThanOrEqual(36);
        expect(screen.getByText("Reports")).toBe(label);
        expect(label.style.transform).toBe("");
        expect(screen.getAllByTestId("nav-selection")).toHaveLength(1);
        clock.advance(1600);
        expect(frame()).toEqual({ x: 88, y: 0, width: 96, height: 36 });
      } finally { unmount(); clock.restore(); }
    });
  }

  it("keeps the solid tile untouched and renders no moving surface in solid mode", async () => {
    const { unmount } = render(<ThemeProvider solid><WebNavbar brand="Acme" links={links} testID="nav" /></ThemeProvider>);
    await act(async () => {});
    measureLink("Home", { x: 0, y: 0, width: 80, height: 36 });
    expect(screen.queryByTestId("nav-selection-motion")).toBeNull();
    expect(getComputedStyle(screen.getByRole("link", { name: "Home" })).backgroundColor).not.toMatch(/rgba\(0, 0, 0, 0(?:\.0+)?\)|transparent/);
    unmount();
  });

  it("retires the surface when the bar collapses into its menu and measures afresh on expansion", async () => {
    const { unmount } = render(<ThemeProvider glass><WebNavbar brand="Acme" links={links} testID="nav" /></ThemeProvider>);
    await act(async () => {});
    measureLink("Home", { x: 0, y: 0, width: 80, height: 36 });
    expect(screen.getByTestId("nav-selection-motion")).toBeDefined();
    layoutElement(screen.getByTestId("nav"), { width: 400, height: 56 });
    await act(async () => {});
    expect(screen.queryByTestId("nav-selection-motion")).toBeNull();
    expect(screen.getByRole("button", { name: "Navigation menu" })).toBeDefined();
    layoutElement(screen.getByTestId("nav"), { width: 1200, height: 56 });
    // The expanded row measures afresh (the batch answers on the next macrotask
    // here, with the test DOM's empty frames): a changed frame then places the
    // surface in place (no travel across the collapse) instead of animating from
    // stale bounds.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    measureLink("Home", { x: 12, y: 0, width: 84, height: 36 });
    expect(frame()).toEqual({ x: 12, y: 0, width: 84, height: 36 });
    unmount();
  });

  it("selects the measured bounds immediately under Reduce Motion", async () => {
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(<ThemeProvider glass><WebNavbar brand="Acme" links={links} testID="nav" /></ThemeProvider>);
      await act(async () => {});
      measureLink("Home", { x: 0, y: 0, width: 80, height: 36 });
      measureLink("Reports", { x: 88, y: 0, width: 96, height: 36 });
      fireEvent.click(screen.getByRole("link", { name: "Reports" }));
      await act(async () => {});
      expect(frame()).toEqual({ x: 88, y: 0, width: 96, height: 36 });
      unmount();
    } finally { reduced.mockRestore(); }
  });
});
