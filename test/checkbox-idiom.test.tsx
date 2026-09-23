import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ElementType } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";

// One job, different control (the design language's item 5): a Checkbox that is ONE
// setting renders the platform switch on iOS and Android, and stays a checkbox on the
// web; a Checkbox that selects items in a list (`selection`, or `indeterminate`, a
// select-all) stays a checkbox everywhere, which iOS draws as the edit-mode circle.

afterEach(cleanup);

const load = async (platform: "web" | "ios" | "android") => {
  const suffix = platform === "web" ? "" : `.${platform}`;
  return (await import(`../src/atoms/checkbox/checkbox${suffix}.tsx`)).Checkbox as ElementType;
};

describe("a one-setting Checkbox", () => {
  for (const platform of ["ios", "android"] as const) {
    it(`is the ${platform} switch, uncontrolled and controlled`, async () => {
      const Checkbox = await load(platform);
      const changes: boolean[] = [];
      render(
        <ThemeProvider>
          <Checkbox onChange={(next: boolean) => changes.push(next)}>Remember me</Checkbox>
          <Checkbox checked accessibilityLabel="Controlled" onChange={() => {}} />
        </ThemeProvider>,
      );
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      const setting = screen.getByRole("switch", { name: "Remember me" });
      expect(setting.getAttribute("aria-checked")).toBe("false");
      fireEvent.click(setting);
      expect(setting.getAttribute("aria-checked")).toBe("true");
      expect(changes).toEqual([true]);
      expect(screen.getByRole("switch", { name: "Controlled" }).getAttribute("aria-checked")).toBe("true");
    });
  }

  it("stays a checkbox on the web", async () => {
    const Checkbox = await load("web");
    render(<ThemeProvider><Checkbox>Remember me</Checkbox></ThemeProvider>);
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeDefined();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });
});

describe("a selection Checkbox", () => {
  for (const platform of ["web", "ios", "android"] as const) {
    it(`stays a checkbox on ${platform}, and so does an indeterminate one`, async () => {
      const Checkbox = await load(platform);
      render(
        <ThemeProvider>
          <Checkbox selection accessibilityLabel="Row one" />
          <Checkbox indeterminate accessibilityLabel="Select all" />
        </ThemeProvider>,
      );
      expect(screen.queryAllByRole("switch")).toHaveLength(0);
      const row = screen.getByRole("checkbox", { name: "Row one" });
      fireEvent.click(row);
      expect(row.getAttribute("aria-checked")).toBe("true");
      expect(screen.getByRole("checkbox", { name: "Select all" }).getAttribute("aria-checked")).toBe("mixed");
    });
  }

  it("is the edit-mode selection circle on iOS and a square elsewhere", async () => {
    const shapes: Record<string, { width: string; radius: string }> = {};
    for (const platform of ["web", "ios", "android"] as const) {
      const Checkbox = await load(platform);
      const view = render(<ThemeProvider><Checkbox selection accessibilityLabel="Row" /></ThemeProvider>);
      const box = screen.getByRole("checkbox", { name: "Row" }).firstElementChild as HTMLElement;
      shapes[platform] = { width: box.style.width, radius: box.style.borderTopLeftRadius || box.style.borderRadius };
      view.unmount();
    }
    expect(shapes.ios).toEqual({ width: "22px", radius: "11px" });
    expect(Number.parseFloat(shapes.web.radius)).toBeLessThan(Number.parseFloat(shapes.web.width) / 2);
    expect(Number.parseFloat(shapes.android.radius)).toBeLessThan(Number.parseFloat(shapes.android.width) / 2);
  });
});

describe("DataTable's bulk selection", () => {
  for (const platform of ["ios", "android"] as const) {
    it(`uses selection checkboxes on ${platform}, never switches`, async () => {
      const { DataTable } = await import(`../src/organisms/data-table/data-table.${platform}.tsx`);
      render(
        <ThemeProvider>
          <DataTable selectable columns={["Name"]} rows={[["Ada"], ["Grace"]]} />
        </ThemeProvider>,
      );
      expect(screen.queryAllByRole("switch")).toHaveLength(0);
      expect(screen.getAllByRole("checkbox").length).toBe(3);
      expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeDefined();
    });
  }
});
