import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ElementType } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";

// One job, different control (the design language's item 5): iOS has no radio button,
// so a single choice there is a checkmark list, the inline picker of a grouped Form:
// the label leads, the chosen row carries a trailing check, and a RadioGroup's options
// are the rows of one inset-grouped section with a hairline between two rows. The web
// and Android keep the ring and dot. The role stays `radio` everywhere.

afterEach(cleanup);

type Platform = "web" | "ios" | "android";
const load = async (platform: Platform) => {
  const suffix = platform === "web" ? "" : `.${platform}`;
  const mod = await import(`../src/atoms/radio/radio${suffix}.tsx`);
  return { Radio: mod.Radio as ElementType, RadioGroup: mod.RadioGroup as ElementType };
};

/** The trailing check glyph inside a radio row, or null when the row draws a ring. */
function checkOf(row: HTMLElement): HTMLElement | null {
  return [...row.querySelectorAll<HTMLElement>("[aria-hidden]")].find((node) => node.textContent === "✓") ?? null;
}
const shown = (glyph: HTMLElement | null) => glyph != null && glyph.style.opacity !== "0";

describe("an iOS RadioGroup", () => {
  it("is a checkmark list: one section, a hairline between two rows, the check on the chosen row", async () => {
    const { Radio, RadioGroup } = await load("ios");
    const picks: unknown[] = [];
    render(
      <ThemeProvider>
        <RadioGroup label="Plan" defaultValue="pro" onChange={(value: unknown) => picks.push(value)}>
          <Radio value="hobby">Hobby</Radio>
          <Radio value="pro" description="For growing teams.">Pro</Radio>
          <Radio value="enterprise">Enterprise</Radio>
        </RadioGroup>
      </ThemeProvider>,
    );
    const group = screen.getByRole("radiogroup", { name: "Plan" });
    // Three rows with a separator between each pair, and no ring anywhere.
    expect(group.children).toHaveLength(5);
    const rows = screen.getAllByRole("radio");
    expect(rows).toHaveLength(3);
    // The glyph is hidden from assistive technology, so the row's name is its label alone.
    expect(screen.getByRole("radio", { name: "Hobby" })).toBe(rows[0]);
    expect(rows.map((row) => shown(checkOf(row)))).toEqual([false, true, false]);
    expect(rows.map((row) => row.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);

    fireEvent.click(rows[2]);
    expect(picks).toEqual(["enterprise"]);
    expect(rows.map((row) => shown(checkOf(row)))).toEqual([false, false, true]);
  });

  it("keeps the list vertical when the group asks for a row", async () => {
    const { Radio, RadioGroup } = await load("ios");
    render(
      <ThemeProvider>
        <RadioGroup row defaultValue="hobby">
          <Radio value="hobby">Hobby</Radio>
          <Radio value="pro">Pro</Radio>
        </RadioGroup>
      </ThemeProvider>,
    );
    const group = screen.getByRole("radiogroup");
    expect(group.style.flexDirection).not.toBe("row");
    expect(group.children).toHaveLength(3);
  });

  it("lays selectable cards out as tiles, each marking the choice with the trailing check", async () => {
    const { Radio, RadioGroup } = await load("ios");
    render(
      <ThemeProvider>
        <RadioGroup row defaultValue="pro">
          <Radio card value="pro" description="For growing teams.">Pro</Radio>
          <Radio card value="enterprise" description="Advanced security.">Enterprise</Radio>
        </RadioGroup>
      </ThemeProvider>,
    );
    const group = screen.getByRole("radiogroup");
    // No list section: the tiles sit in the row the group asked for, with no separators.
    expect(group.style.flexDirection).toBe("row");
    expect(group.children).toHaveLength(2);
    expect(screen.getAllByRole("radio").map((row) => shown(checkOf(row)))).toEqual([true, false]);
  });

  it("marks a standalone radio with the trailing check too", async () => {
    const { Radio } = await load("ios");
    render(<ThemeProvider><Radio checked description="For growing teams.">Pro</Radio></ThemeProvider>);
    const row = screen.getByRole("radio", { name: (name) => name.startsWith("Pro") && !name.includes("✓") });
    expect(shown(checkOf(row))).toBe(true);
  });
});

describe("the ring platforms", () => {
  for (const platform of ["web", "android"] as const) {
    it(`keep the ring and dot on ${platform}, with the options stacked and no list section`, async () => {
      const { Radio, RadioGroup } = await load(platform);
      render(
        <ThemeProvider>
          <RadioGroup defaultValue="pro">
            <Radio value="hobby">Hobby</Radio>
            <Radio value="pro">Pro</Radio>
          </RadioGroup>
        </ThemeProvider>,
      );
      const group = screen.getByRole("radiogroup");
      expect(group.children).toHaveLength(2);
      for (const row of screen.getAllByRole("radio")) {
        expect(checkOf(row)).toBeNull();
        // The first child is the ring, a circle.
        expect((row.firstElementChild as HTMLElement).style.borderRadius).toBe("9999px");
      }
      // The chosen ring holds its dot.
      expect(screen.getByRole("radio", { name: "Pro" }).firstElementChild?.childElementCount).toBeGreaterThan(0);
    });
  }
});
