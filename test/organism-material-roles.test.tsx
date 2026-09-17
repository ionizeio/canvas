import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Text } from "../src/style/index.ts";
import { Calendar } from "../src/organisms/calendar/calendar.tsx";
import { Carousel } from "../src/organisms/carousel/carousel.tsx";
import { DataTable } from "../src/organisms/data-table/data-table.tsx";
import { FilterPanel } from "../src/organisms/filter-panel/filter-panel.tsx";
import { Steps } from "../src/organisms/steps/steps.tsx";
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { DashboardGrid } from "../src/organisms/dashboard-grid/dashboard-grid.tsx";

const restores: Array<() => void> = [];
afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach((restore) => restore());
});

function capabilities(lens: boolean, frost: boolean) {
  const userAgent = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: lens
    ? "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36"
    : "Mozilla/5.0 Version/18.0 Safari/605.1.15" });
  Object.defineProperty(globalThis, "CSS", { configurable: true,
    value: { supports: (_property: string, value: string) => value.startsWith("url(") ? lens : frost } });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as Record<string, unknown>).CSS;
    if (userAgent) Object.defineProperty(window.navigator, "userAgent", userAgent);
    else delete (window.navigator as unknown as Record<string, unknown>).userAgent;
  });
}

const materials = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>("[style]")]
  .filter((node) => node.style.backdropFilter);
const mode = (children: ReactNode, glass: boolean) => <ThemeProvider light glass={glass} solid={!glass}>{children}</ThemeProvider>;

describe("organism material roles", () => {
  it("preserves Command's unfilled Search trigger across material modes", () => {
    capabilities(true, true);
    const children = <Command trigger groups={[{ heading: "Actions", items: [{ label: "New file" }] }]} />;
    const result = render(mode(children, true));
    const trigger = screen.getByRole("button", { name: /Search/ });
    // Its Kbd is an independently surfaced passive keycap, so inspect only the
    // trigger's own fill and boundary rather than forbidding all child material.
    expect(trigger.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(trigger.style.borderColor).not.toContain("0.00");
    const original = trigger.style.cssText;
    result.rerender(mode(children, false));
    expect(screen.getByRole("button", { name: /Search/ })).toBe(trigger);
    expect(trigger.style.cssText).toBe(original);
  });

  it("restores DashboardGrid edit-cell fill when its inherited content frost is unavailable", () => {
    capabilities(false, false);
    const children = <DashboardGrid unlocked items={[{ id: "a", span: 12, title: "Revenue", content: <Text>Revenue body</Text> }]} />;
    const result = render(mode(children, true));
    const editCell = screen.getByText("Revenue body").parentElement!;
    const fill = editCell.style.backgroundColor;
    expect(materials(result.container)).toHaveLength(0);
    result.rerender(mode(children, false));
    expect(screen.getByText("Revenue body").parentElement).toBe(editCell);
    expect(editCell.style.backgroundColor).toBe(fill);
  });

  it("resolves selected Calendar days independently from the static calendar body", () => {
    capabilities(true, false);
    render(mode(<Calendar selected={10} testID="calendar" />, true));
    const calendar = screen.getByTestId("calendar");
    const selected = within(calendar).getByRole("button", { name: "10, selected", exact: true });
    expect(materials(calendar)).toHaveLength(1);
    expect(materials(selected)).toHaveLength(1);
    expect(calendar.style.backgroundColor).not.toBe("rgba(0, 0, 0, 0.00)");
    expect(selected.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
  });

  it("keeps Carousel actions liquid when slide frost is unavailable", () => {
    capabilities(true, false);
    render(mode(<Carousel testID="carousel" showArrows items={[{ key: "a", content: null }, { key: "b", content: null }]} />, true));
    expect(materials(screen.getByTestId("carousel"))).toHaveLength(2);
    expect(materials(screen.getByRole("button", { name: "Next slide" }))).toHaveLength(1);
    expect(materials(screen.getByRole("button", { name: "Previous slide" }))).toHaveLength(1);
  });

  it("dims disabled Carousel ink without dimming the liquid material", () => {
    capabilities(true, true);
    const children = <Carousel showArrows items={[{ key: "a", content: null }, { key: "b", content: null }]} />;
    const result = render(mode(children, true));
    const previous = screen.getByRole("button", { name: "Previous slide" });
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    const pane = materials(previous)[0];
    expect(pane).toBeDefined();
    for (let parent = pane.parentElement; parent && parent !== previous.parentElement; parent = parent.parentElement) {
      expect(!parent.style.opacity || Number(parent.style.opacity) === 1).toBe(true);
    }
    expect((previous.lastElementChild as HTMLElement).style.opacity).toBe("0.4");
    result.rerender(mode(children, false));
    expect(screen.getByRole("button", { name: "Previous slide" })).toBe(previous);
    expect(previous.style.opacity).toBe("0.4");
  });

  it("retains complete Calendar selection and table stripe recipes when all material is unavailable", () => {
    capabilities(false, false);
    const children = <>
      <Calendar selected={10} testID="calendar" />
      <DataTable testID="table" bordered striped columns={["Name"]} rows={[["Ada"], ["Grace"]]} />
      <FilterPanel testID="filters" bordered groups={[{ title: "Role", options: [{ label: "Admin" }] }]} />
    </>;
    const result = render(mode(children, true));
    const selected = screen.getByRole("button", { name: "10, selected", exact: true });
    const styles = () => {
      const nodes = [screen.getByTestId("calendar"), screen.getByTestId("table"), screen.getByTestId("filters"), selected,
        ...screen.getByTestId("table").querySelectorAll<HTMLElement>('[role="row"]')];
      return nodes.map((node) => [node.style.backgroundColor, node.style.borderColor, node.style.borderWidth]);
    };
    const fallback = styles();
    expect(materials(result.container)).toHaveLength(0);
    result.rerender(mode(children, false));
    expect(styles()).toEqual(fallback);
    expect(screen.getByRole("button", { name: "10, selected", exact: true })).toBe(selected);
  });

  it("uses stable step frost without painting an unfilled current ring", () => {
    capabilities(true, true);
    render(mode(<Steps current={1} steps={[{ label: "Account" }, { label: "Profile" }, { label: "Review" }]} />, true));
    const current = screen.getByText("2").parentElement!;
    expect(materials(current)).toHaveLength(0);
    expect(current.style.borderColor).not.toContain("0.00");
    const upcoming = screen.getByText("3").parentElement!;
    expect(materials(upcoming)).toHaveLength(1);
    expect(materials(upcoming)[0].style.backdropFilter).toMatch(/^blur\(/);
  });

  it("keeps unfilled underline tabs unpainted and their ink indicator intact", () => {
    capabilities(true, true);
    const children = <Tabs tabs={["Account", "Profile"]} />;
    const result = render(mode(children, false));
    const selected = screen.getByRole("tab", { name: "Account" });
    const original = selected.style.cssText;
    result.rerender(mode(children, true));
    expect(materials(selected)).toHaveLength(0);
    expect(selected.style.cssText).toBe(original);
    expect(screen.getByRole("tab", { name: "Account" })).toBe(selected);
  });

  for (const initialGlass of [false, true]) {
    it(`preserves a DataTable editor, draft, focus and caret from ${initialGlass ? "glass" : "solid"}`, () => {
      capabilities(true, true);
      const children = <DataTable inlineEdit columns={["Name"]} rows={[["Ada"]]} onCellCommit={() => {}} />;
      const result = render(mode(children, initialGlass));
      fireEvent.click(screen.getByText("Ada"));
      const field = screen.getByDisplayValue("Ada") as HTMLInputElement;
      fireEvent.change(field, { target: { value: "Ada Lovelace" } });
      field.focus();
      field.setSelectionRange(2, 6);
      for (const glass of [!initialGlass, initialGlass]) {
        result.rerender(mode(children, glass));
        expect(screen.getByDisplayValue("Ada Lovelace")).toBe(field);
        expect(document.activeElement).toBe(field);
        expect([field.selectionStart, field.selectionEnd]).toEqual([2, 6]);
      }
    });
  }
});
