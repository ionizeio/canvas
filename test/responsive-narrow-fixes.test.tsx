// Narrow-container fixes from the responsiveness rollout: the calendar month's
// fluid cell math (pure) and the DescriptionList twoColumn term narrowing (the list's
// own width, seeded from the window until it measures; test/viewport.ts drives the
// seed and test/entrance-layout.ts the measurement), plus the DescriptionList inline
// row that wraps its value instead of running past a narrow card.
import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { monthCellSize } from "../src/organisms/calendar/calendar.shared.tsx";
import { DescriptionList } from "../src/molecules/description-lists/description-lists.tsx";
import { GridList } from "../src/molecules/grid-lists/grid-lists.tsx";
import { Form } from "../src/molecules/form/form.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { resizeViewport } from "./viewport.ts";
import { layoutElement } from "./entrance-layout.ts";

afterEach(cleanup);

describe("monthCellSize (calendar month fluid cells)", () => {
  it("keeps the skin's preferred cell while unmeasured or when the container fits", () => {
    expect(monthCellSize(36, 0, 26)).toBe(36);
    expect(monthCellSize(36, 300, 26)).toBe(36); // (300-26)/7 = 39 > 36
  });

  it("shrinks the cell so seven fit the measured container", () => {
    // A 264px container (320pt phone minus page padding) with 26px chrome:
    // floor(238/7) = 34.
    expect(monthCellSize(40, 264, 26)).toBe(34);
  });

  it("never shrinks below the 32px floor", () => {
    expect(monthCellSize(40, 180, 26)).toBe(32);
  });

  it("converges: the grid relayout at 7*cell never widens past the measurement", () => {
    for (const measured of [180, 226, 264, 280, 306]) {
      const cell = monthCellSize(40, measured, 26);
      if (cell > 32) expect(cell * 7 + 26).toBeLessThanOrEqual(measured);
    }
  });
});

describe("DescriptionList twoColumn term narrowing", () => {
  const ui = () =>
    render(
      <ThemeProvider>
        <DescriptionList twoColumn items={[{ term: "Full name", value: "Margot Foster" }]} />
      </ThemeProvider>,
    );

  it("keeps the 160px label column at desktop widths", () => {
    ui();
    expect((screen.getByText("Full name") as HTMLElement).style.width).toBe("160px");
  });

  it("narrows the label column to 120px at phone widths, before it has measured itself", () => {
    ui();
    resizeViewport(375);
    expect((screen.getByText("Full name") as HTMLElement).style.width).toBe("120px");
  });

  it("follows its own width once measured, not the window's", () => {
    const { container } = ui();
    const probe = [...(container as HTMLElement).querySelectorAll("div")].find((node) => node.style.position === "absolute" && node.style.left === "0px" && node.style.right === "0px") as HTMLElement;
    // A 320px panel in a desktop window: the list is phone-narrow.
    layoutElement(probe, { width: 320, height: 0 });
    expect((screen.getByText("Full name") as HTMLElement).style.width).toBe("120px");
    // A wide container in a phone window: the list is not.
    resizeViewport(375);
    layoutElement(probe, { width: 900, height: 0 });
    expect((screen.getByText("Full name") as HTMLElement).style.width).toBe("160px");
  });

  // A value shares its cell with a trailing Update link, so it must yield and wrap: a
  // Text row item otherwise keeps its longest unbreakable run as its minimum width (the
  // web) or does not shrink at all (native), and a long id or email ran past a phone.
  it("lets a long value shrink and wrap beside the Update link, mono or plain", () => {
    render(
      <ThemeProvider>
        <DescriptionList
          twoColumn
          items={[
            { term: "Client identifier", value: "clnt_01H2X8K9P3Q7VN4W6R5T0JYMZF", mono: true },
            { term: "Email", value: "rachel.chen@example.com", update: true },
          ]}
        />
      </ThemeProvider>,
    );
    for (const value of ["clnt_01H2X8K9P3Q7VN4W6R5T0JYMZF", "rachel.chen@example.com"]) {
      const text = screen.getByText(value) as HTMLElement;
      expect(text.style.flexShrink).toBe("1");
      expect(text.style.minWidth).toBe("0px");
    }
  });
});

// The inline row puts the value on the right of its term. Its value cell was a bare
// View, which never shrinks (flexShrink 0 on react-native-web and Yoga), so in a
// ~250px sidebar card a mono id beside its Copy button ran the button past the card
// while only the term wrapped. happy-dom lays nothing out, so these pin the styles
// that make the row fit: the row wraps a value that does not fit under its term,
// and the cell yields and holds the trailing edge on either line.
describe("DescriptionList inline rows in a narrow container", () => {
  const cellOf = (node: HTMLElement, rowOf: (el: HTMLElement) => boolean) => {
    let cell = node;
    while (cell.parentElement && !rowOf(cell.parentElement)) cell = cell.parentElement;
    return cell;
  };
  const isRow = (el: HTMLElement) => el.style.flexWrap === "wrap";

  it("wraps a value that does not fit under its term instead of overflowing", () => {
    render(
      <ThemeProvider>
        <DescriptionList
          inline
          items={[
            { term: "Payment ID", value: "pay_9f3k82aq", mono: true, copyValue: "pay_9f3k82aq" },
            { term: "Email", value: "rachel.chen@example.com" },
          ]}
        />
      </ThemeProvider>,
    );
    for (const node of [screen.getByLabelText("Copy Payment ID"), screen.getByText("rachel.chen@example.com")] as HTMLElement[]) {
      const cell = cellOf(node, isRow);
      const row = cell.parentElement!;
      expect(row.style.flexDirection).toBe("row");
      expect(row.style.flexWrap).toBe("wrap");
      // The term/value spacing stays 16 beside each other; a wrapped value sits the
      // stacked layout's 4 under its term.
      expect(row.style.columnGap).toBe("16px");
      expect(row.style.rowGap).toBe("4px");
      // The cell yields (its value ellipsizes or wraps inside it) and keeps the
      // trailing edge, where the rows that fit put their values.
      expect(cell.style.flexShrink).toBe("1");
      expect(cell.style.minWidth).toBe("0px");
      expect(cell.style.marginLeft).toBe("auto");
    }
  });

  it("still grows the cell for the in-place editor", () => {
    render(
      <ThemeProvider>
        <DescriptionList inline items={[{ term: "Plan", value: "Pro", update: true }]} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Update Plan" }));
    const cell = cellOf(screen.getByLabelText("Plan value") as HTMLElement, isRow);
    expect(cell.style.flexGrow).toBe("1");
    expect(cell.style.marginLeft).toBe("");
  });
});

describe("Form twoColumn container stacking", () => {
  // happy-dom never fires onLayout, so these exercise the seedViewport path:
  // the wrapper resolves against the window until its own measurement lands.
  const rowsWrapperOf = (root: HTMLElement) => {
    const el = root.querySelector('[data-testid="probe-input"]') as HTMLElement;
    // input -> field column -> twoColumnItem -> rows wrapper
    let node: HTMLElement | null = el;
    while (node && node.style.flexDirection !== "row" && node.style.flexDirection !== "column") {
      node = node.parentElement;
    }
    return node!;
  };

  it("lays out two-up at desktop widths and stacks at phone widths", () => {
    const { container, unmount } = render(
      <ThemeProvider>
        <Form twoColumn>
          <Input label="First name" testID="probe-input" />
          <Input label="Last name" />
        </Form>
      </ThemeProvider>,
    );
    expect(rowsWrapperOf(container as HTMLElement).style.flexDirection).toBe("row");
    unmount();

    resizeViewport(375);
    const { container: narrow } = render(
      <ThemeProvider>
        <Form twoColumn>
          <Input label="First name" testID="probe-input" />
          <Input label="Last name" />
        </Form>
      </ThemeProvider>,
    );
    expect(rowsWrapperOf(narrow as HTMLElement).style.flexDirection).toBe("column");
  });
});

describe("GridList responsive tiles (one resolution, virtualized path included)", () => {
  const items = [
    { title: "Design", subtitle: "12 files" },
    { title: "Docs", subtitle: "4 files" },
    { title: "Assets", subtitle: "31 files" },
  ];
  const tileOf = (title: string) => {
    // Walk up from the title Text to the ancestor carrying the width style.
    let node: HTMLElement | null = screen.getByText(title) as HTMLElement;
    while (node && !node.style.width) node = node.parentElement;
    return node!;
  };

  it("gallery tiles collapse to full width at phone widths", () => {
    render(
      <ThemeProvider>
        <GridList gallery items={items} />
      </ThemeProvider>,
    );
    expect(tileOf("Design").style.width).toBe("48%");
    resizeViewport(375);
    expect(tileOf("Design").style.width).toBe("100%");
  });

  it("virtualized grids drop to one full-width column at phone widths", () => {
    resizeViewport(375);
    render(
      <ThemeProvider>
        <GridList gallery virtualized style={{ maxHeight: 480 }} items={items} />
      </ThemeProvider>,
    );
    // Every tile is full width; the old bug kept 2-3 FlatList columns of
    // 100%-wide tiles at phone widths.
    for (const item of items) expect(tileOf(item.title).style.width).toBe("100%");
  });
});
