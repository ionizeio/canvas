import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { shape } from "../src/style/tokens.ts";
import { Accordion } from "../src/molecules/accordion/accordion.tsx";
import { Collapsible } from "../src/molecules/collapsible/collapsible.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

describe("Accordion", () => {
  it("toggles a panel's expanded state on header press", () => {
    const { container } = ui(<Accordion items={[{ key: "a", title: "Section A", content: "Body A" }]} />);
    const before = container.querySelector("[aria-expanded]");
    expect(before?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByText("Section A"));
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not toggle a disabled item", () => {
    const { container } = ui(<Accordion items={[{ key: "a", title: "Locked", content: "x", disabled: true }]} />);
    fireEvent.click(screen.getByText("Locked"));
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders an item's description under its title, and only when provided", () => {
    const { getByText, queryByText } = ui(
      <Accordion
        items={[
          { key: "a", title: "Billing", description: "Plan and invoices.", content: "x" },
          { key: "b", title: "Team", content: "y" },
        ]}
      />,
    );
    expect(getByText("Billing")).toBeTruthy();
    expect(getByText("Plan and invoices.")).toBeTruthy();
    // The description-less sibling renders its title alone: a bare Text, not the
    // stacked title/description column.
    const team = getByText("Team");
    expect(team).toBeTruthy();
    expect(queryByText("Members and roles.")).toBeNull();
    expect(team.parentElement?.tagName.toLowerCase()).toBe("button");
  });

  it("renders no description line when none is given", () => {
    const { queryByText } = ui(<Accordion items={[{ key: "a", title: "Billing", content: "x" }]} />);
    expect(queryByText("Plan and invoices.")).toBeNull();
  });

  it("`card` wraps the group in an outlined card surface (web)", () => {
    const { getByTestId, container } = ui(
      <Accordion card testID="a" items={[{ key: "a", title: "Section A", content: "Body A" }]} />,
    );
    const el = getByTestId("a");
    expect(el.style.borderWidth).toBe("1px");
    expect(el.style.borderRadius).toBe(`${shape.web.card}px`);
    // The disclosure semantics survive the card surface.
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByText("Section A"));
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Collapsible", () => {
  it("renders the description under the title when provided", () => {
    const { getByText, container } = ui(
      <Collapsible title="Notifications" description="Email and push.">
        Body
      </Collapsible>,
    );
    expect(getByText("Notifications")).toBeTruthy();
    expect(getByText("Email and push.")).toBeTruthy();
    // The header still exposes the disclosure state.
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders no description line otherwise", () => {
    const { queryByText } = ui(<Collapsible title="Notifications">Body</Collapsible>);
    expect(queryByText("Email and push.")).toBeNull();
  });

  it("`card` wraps the disclosure in an outlined card surface (web)", () => {
    const { getByTestId, container } = ui(
      <Collapsible card title="Shipping" testID="c">
        Body
      </Collapsible>,
    );
    const el = getByTestId("c");
    expect(el.style.borderWidth).toBe("1px");
    expect(el.style.borderRadius).toBe(`${shape.web.card}px`);
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByText("Shipping"));
    expect(container.querySelector("[aria-expanded]")?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("ActionSheet", () => {
  it("runs an action's handler and requests close", () => {
    let picked = "";
    let closed = false;
    ui(
      <ActionSheet
        open
        onOpenChange={(o) => { if (!o) closed = true; }}
        actions={[{ label: "Delete", destructive: true, onPress: () => { picked = "Delete"; } }]}
      />,
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(picked).toBe("Delete");
    expect(closed).toBe(true);
  });
});
