import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, Text, UIManager } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Sidebar as WebSidebar } from "../src/organisms/sidebar/sidebar.tsx";
import { Sidebar as IOSSidebar } from "../src/organisms/sidebar/sidebar.ios.tsx";
import { Sidebar as AndroidSidebar } from "../src/organisms/sidebar/sidebar.android.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { layoutElement } from "./entrance-layout.ts";

// In glass mode the Sidebar's active row fill travels as one measured
// control-layer surface through the column or the scroll body, across sections;
// icons, labels, badges, roles, aria-current and hit targets stay fixed; a row
// hidden in a closed section withdraws the surface; solid mode keeps the skin's
// own row fill.

afterEach(cleanup);

const platforms = [["web", WebSidebar], ["ios", IOSSidebar], ["android", AndroidSidebar]] as const;

const SECTIONS = [
  { id: "a", title: "Workspace", items: [{ id: "home", label: "Home", icon: "home" as const }, { id: "reports", label: "Reports" }] },
  { id: "b", title: "Admin", collapsible: true, items: [{ id: "billing", label: "Billing" }] },
];

// Rows report their frames through measureLayout against the body node; the
// test DOM has no layout, so the native measurement answers from this table
// (row wrapper node -> rect) instead, keyed by the row's accessible name.
const RECTS: Record<string, { x: number; y: number; width: number; height: number }> = {
  Home: { x: 12, y: 40, width: 216, height: 36 },
  Reports: { x: 12, y: 80, width: 216, height: 36 },
  Billing: { x: 12, y: 168, width: 216, height: 36 },
};
function mockRowMeasurement() {
  return spyOn(UIManager, "measureLayout").mockImplementation((node, _relativeTo, _onFail, onSuccess) => {
    const element = node as unknown as HTMLElement;
    const name = element.querySelector('[role="button"]')?.textContent?.trim() ?? "";
    const rect = Object.entries(RECTS).find(([label]) => name.startsWith(label))?.[1];
    if (rect) onSuccess(rect.x, rect.y, rect.width, rect.height);
  });
}
function measureRow(name: string) {
  const row = screen.getByRole("button", { name });
  for (let host = row.parentElement; host; host = host.parentElement) {
    if ((host as unknown as { __reactLayoutHandler?: unknown }).__reactLayoutHandler) {
      layoutElement(host, RECTS[name]!);
      return;
    }
  }
  throw new Error(`Missing measured row wrapper for ${name}`);
}
function frame() {
  const { style } = screen.getByTestId("side-selection-motion");
  return { x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}

describe("Sidebar moving glass selection", () => {
  for (const [platform, Sidebar] of platforms) {
    it(`${platform}: moves one measured surface between rows, across sections, while rows stay put`, async () => {
      const measure = mockRowMeasurement();
      const { unmount } = render(<ThemeProvider glass><Sidebar sections={SECTIONS} defaultActive="home" defaultOpenSections={["b"]} independentSections testID="side" /></ThemeProvider>);
      await act(async () => {});
      const clock = animationClock();
      try {
        measureRow("Home"); measureRow("Reports"); measureRow("Billing");
        expect(screen.getAllByTestId("side-selection")).toHaveLength(1);
        expect(frame()).toEqual(RECTS.Home);
        const billing = screen.getByRole("button", { name: "Billing" });
        const label = screen.getByText("Billing");
        fireEvent.click(billing);
        expect(billing.getAttribute("aria-current")).toBe("page");
        expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBeNull();
        expect(frame().y).toBe(RECTS.Home.y);
        clock.advance(80);
        // Vertical travel across the section boundary: the surface stretches along the way.
        expect(frame().height).toBeGreaterThan(36);
        expect(frame().y).toBeGreaterThan(RECTS.Home.y);
        expect(screen.getByText("Billing")).toBe(label);
        expect(label.style.transform).toBe("");
        clock.advance(1600);
        expect(frame()).toEqual(RECTS.Billing);
      } finally { unmount(); clock.restore(); measure.mockRestore(); }
    });
  }

  it("keeps the solid row fill and renders no moving surface in solid mode", async () => {
    const measure = mockRowMeasurement();
    try {
      const { unmount } = render(<ThemeProvider solid><WebSidebar sections={SECTIONS} defaultActive="home" testID="side" /></ThemeProvider>);
      await act(async () => {});
      measureRow("Home");
      expect(screen.queryByTestId("side-selection-motion")).toBeNull();
      expect(getComputedStyle(screen.getByRole("button", { name: "Home" })).backgroundColor).not.toMatch(/rgba\(0, 0, 0, 0(?:\.0+)?\)|transparent/);
      unmount();
    } finally { measure.mockRestore(); }
  });

  it("withdraws the surface while the active row's section is closed and returns when it reopens", async () => {
    const measure = mockRowMeasurement();
    try {
      const { unmount } = render(<ThemeProvider glass><WebSidebar sections={SECTIONS} defaultActive="billing" defaultOpenSections={["b"]} testID="side" /></ThemeProvider>);
      await act(async () => {});
      measureRow("Billing");
      expect(frame()).toEqual(RECTS.Billing);
      fireEvent.click(screen.getByRole("button", { name: "Admin" }));
      await act(async () => {});
      expect(screen.queryByRole("button", { name: "Billing" })).toBeNull();
      expect(screen.queryByTestId("side-selection-motion")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Admin" }));
      await act(async () => {});
      measureRow("Billing");
      expect(frame()).toEqual(RECTS.Billing);
      unmount();
    } finally { measure.mockRestore(); }
  });

  it("measures against the scroll body in the shell shape", async () => {
    const measure = mockRowMeasurement();
    try {
      const { unmount } = render(<ThemeProvider glass><WebSidebar header={<Text>Brand</Text>} footer={<Text>v1</Text>} sections={SECTIONS} defaultActive="reports" testID="side" /></ThemeProvider>);
      await act(async () => {});
      measureRow("Reports");
      expect(frame()).toEqual(RECTS.Reports);
      expect(screen.getByText("Brand")).toBeDefined();
      unmount();
    } finally { measure.mockRestore(); }
  });

  it("selects the measured bounds immediately under Reduce Motion", async () => {
    const measure = mockRowMeasurement();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const { unmount } = render(<ThemeProvider glass><WebSidebar sections={SECTIONS} defaultActive="home" testID="side" /></ThemeProvider>);
      await act(async () => {});
      measureRow("Home"); measureRow("Reports");
      fireEvent.click(screen.getByRole("button", { name: "Reports" }));
      await act(async () => {});
      expect(frame()).toEqual(RECTS.Reports);
      unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
  });
});
