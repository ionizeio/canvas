import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ElementType } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { primaryText } from "../src/style/primary-text.ts";

// One job, different control (the design language's item 5): an iOS list marks each
// chosen row with a trailing check, in single and multi select alike, and never fills
// a row for being chosen; the web and Android lead the row with the mark (a ✓ gutter
// with the chosen label in the selection violet, or the selection Checkbox). iOS menus (Select's pop-up menu) keep
// UIMenu's leading check, so they are not covered here.

afterEach(cleanup);

type Platform = "web" | "ios" | "android";
const suffix = (platform: Platform) => (platform === "web" ? "" : `.${platform}`);
const listbox = async (platform: Platform) =>
  (await import(`../src/atoms/listbox/listbox${suffix(platform)}.tsx`)).Listbox as ElementType;
const filterPanel = async (platform: Platform) =>
  (await import(`../src/organisms/filter-panel/filter-panel${suffix(platform)}.tsx`)).FilterPanel as ElementType;

/** The decorative trailing check of a row: the last hidden ✓, or null. */
function trailingCheck(row: HTMLElement): HTMLElement | null {
  const last = row.lastElementChild as HTMLElement | null;
  return last?.getAttribute("aria-hidden") === "true" && last.textContent === "✓" ? last : null;
}
const shown = (check: HTMLElement | null) => check != null && check.style.opacity !== "0";

const ITEMS = [{ label: "Backend" }, { label: "Frontend", detail: "Web applications" }, { label: "Design" }];

describe("an iOS Listbox", () => {
  it("marks the chosen option with a trailing check and no row fill, and the check follows a press", async () => {
    const Listbox = await listbox("ios");
    render(<ThemeProvider><Listbox accessibilityLabel="Team" items={ITEMS} defaultSelected={1} /></ThemeProvider>);
    const rows = screen.getAllByRole("option");
    expect(rows.map((row) => shown(trailingCheck(row)))).toEqual([false, true, false]);
    // No leading gutter: the row starts with its label stack.
    expect(rows[1].firstElementChild?.textContent).toBe("FrontendWeb applications");
    expect(rows[1].style.backgroundColor).toBe("");
    fireEvent.click(rows[2]);
    expect(rows.map((row) => shown(trailingCheck(row)))).toEqual([false, false, true]);
    expect(rows[2].getAttribute("aria-selected")).toBe("true");
  });

  it("marks every chosen row the same way in multi-select", async () => {
    const Listbox = await listbox("ios");
    render(<ThemeProvider><Listbox multi accessibilityLabel="Teams" items={ITEMS} defaultSelected={[0, 2]} /></ThemeProvider>);
    const rows = screen.getAllByRole("checkbox");
    expect(rows.map((row) => shown(trailingCheck(row)))).toEqual([true, false, true]);
    fireEvent.click(rows[0]);
    expect(rows.map((row) => shown(trailingCheck(row)))).toEqual([false, false, true]);
    expect(rows[0].getAttribute("aria-checked")).toBe("false");
  });
});

describe("the web and Android Listbox", () => {
  for (const platform of ["web", "android"] as const) {
    it(`leads the chosen row with its mark on ${platform}`, async () => {
      const Listbox = await listbox(platform);
      render(<ThemeProvider light solid><Listbox accessibilityLabel="Team" items={ITEMS} defaultSelected={1} /></ThemeProvider>);
      const rows = screen.getAllByRole("option");
      for (const row of rows) expect(trailingCheck(row)).toBeNull();
      expect(rows[1].firstElementChild?.textContent).toBe("✓");
      // Dark Factory's menu row: the chosen label reads in the selection violet, with no fill.
      expect(rows[1].style.backgroundColor).toBe("");
      // The innermost node carrying the label's text (its wrapper has the same text and no ink).
      const label = (row: HTMLElement) => [...row.querySelectorAll("div")].reverse().find((node) => node.textContent === "Frontend" || node.textContent === "Backend") as HTMLElement;
      const rgb = (hex: string) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")}, 1.00)`;
      expect(label(rows[1]).style.color).toBe(rgb(primaryText(lightColors)));
      expect(label(rows[0]).style.color).toBe(rgb(lightColors.foreground));
    });
  }
});

describe("the FilterPanel option rows", () => {
  const groups = [{ title: "Status", options: [
    { label: "Active", value: "active", count: "128" },
    { label: "Archived", value: "archived", count: "42" },
  ] }];

  it("on iOS put the label first, then the count, then a trailing check on a chosen filter", async () => {
    const FilterPanel = await filterPanel("ios");
    render(<ThemeProvider><FilterPanel groups={groups} defaultValue={["active"]} /></ThemeProvider>);
    const active = screen.getByRole("checkbox", { name: "Active, 128" });
    const archived = screen.getByRole("checkbox", { name: "Archived, 42" });
    expect([...active.children].map((child) => child.textContent)).toEqual(["Active", "128", "✓"]);
    expect([shown(trailingCheck(active)), shown(trailingCheck(archived))]).toEqual([true, false]);
    fireEvent.click(archived);
    expect(shown(trailingCheck(archived))).toBe(true);
    expect(archived.getAttribute("aria-checked")).toBe("true");
  });

  for (const platform of ["web", "android"] as const) {
    it(`on ${platform} lead with the selection Checkbox and carry no trailing check`, async () => {
      const FilterPanel = await filterPanel(platform);
      render(<ThemeProvider><FilterPanel groups={groups} defaultValue={["active"]} /></ThemeProvider>);
      const active = screen.getByRole("checkbox", { name: "Active, 128" });
      expect(trailingCheck(active)).toBeNull();
      expect(active.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
      expect(active.firstElementChild?.textContent).toContain("Active");
    });
  }
});
