import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { render, cleanup, screen, within, fireEvent, act } from "@testing-library/react";
import { type ComponentType, type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { StackedList } from "../src/molecules/stacked-lists/stacked-lists.tsx";
import { StackedList as IOSStackedList } from "../src/molecules/stacked-lists/stacked-lists.ios.tsx";
import { StackedList as AndroidStackedList } from "../src/molecules/stacked-lists/stacked-lists.android.tsx";
import { type StackedListProps } from "../src/molecules/stacked-lists/stacked-lists.shared.tsx";
import { Feed } from "../src/molecules/feeds/feeds.tsx";
import { Feed as IOSFeed } from "../src/molecules/feeds/feeds.ios.tsx";
import { Feed as AndroidFeed } from "../src/molecules/feeds/feeds.android.tsx";
import { type FeedProps } from "../src/molecules/feeds/feeds.shared.tsx";
import { GridList } from "../src/molecules/grid-lists/grid-lists.tsx";
import { GridList as IOSGridList } from "../src/molecules/grid-lists/grid-lists.ios.tsx";
import { GridList as AndroidGridList } from "../src/molecules/grid-lists/grid-lists.android.tsx";
import { type GridListProps } from "../src/molecules/grid-lists/grid-lists.shared.tsx";

// StackedList, Feed and GridList are lists, as the Tailwind UI lists they port are
// (`<ul role="list">` of `<li>` rows): react-native-web renders `list` as a <ul> and
// `listitem` as an <li>, so a screen reader announces the list with its item count and
// moves by item. A row that is a button stays a button, inside its item. The windowed
// path (the list is the scroller, its rows count the whole list) is covered with the
// keyboard stop in test/scroll-frame-ring.test.tsx.

let warnSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  resetDevWarnings();
  warnSpy = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  cleanup();
});

const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

const PEOPLE = [
  { id: "ada", name: "Ada Lovelace", detail: "ada@acme.dev", meta: "Owner" },
  { id: "alan", name: "Alan Turing", detail: "alan@acme.dev", badge: "Active" },
  { id: "grace", name: "Grace Hopper", detail: "grace@acme.dev" },
];
const EVENTS = [
  { id: 1, actor: "Ada Lovelace", action: "approved the request", time: "1h" },
  { id: 2, action: "The nightly build passed", time: "2h", icon: "shieldCheck" as const },
  { id: 3, actor: "Alan Turing", action: "joined the team", time: "3h" },
];
const TILES = [
  { title: "Ada Lovelace", subtitle: "Engineer", avatar: "AL", badge: "Active", actions: [{ label: "Message", outline: true }] },
  { title: "Alan Turing", subtitle: "Researcher", avatar: "AT" },
  { title: "Grace Hopper", subtitle: "Admiral", avatar: "GH" },
];

// The one list in the subject, its rows, and a check that every row is one of the
// list's own children: a <ul> holds only <li> elements.
function theList(): { list: HTMLElement; rows: HTMLElement[] } {
  const list = screen.getByRole("list");
  expect(list.tagName).toBe("UL");
  const rows = within(list).getAllByRole("listitem");
  for (const row of rows) {
    expect(row.tagName).toBe("LI");
    expect(row.parentElement).toBe(list);
  }
  expect([...list.children]).toEqual(rows);
  return { list, rows };
}

// Each row that is a button is the only child of its item.
function expectButtonsInItems(rows: HTMLElement[]) {
  for (const row of rows) {
    expect(row.getAttribute("role")).toBe("listitem");
    expect(row.children).toHaveLength(1);
    expect(row.firstElementChild!.getAttribute("role")).toBe("button");
  }
}

const STACKED: Array<[string, ComponentType<StackedListProps>]> = [["web", StackedList], ["ios", IOSStackedList], ["android", AndroidStackedList]];
const FEEDS: Array<[string, ComponentType<FeedProps>]> = [["web", Feed], ["ios", IOSFeed], ["android", AndroidFeed]];
const GRIDS: Array<[string, ComponentType<GridListProps>]> = [["web", GridList], ["ios", IOSGridList], ["android", AndroidGridList]];

describe("StackedList is a list of its rows", () => {
  for (const [platform, List] of STACKED) {
    it(`(${platform}) a plain list: one item per row, unnamed`, () => {
      ui(<List items={PEOPLE} />);
      const { list, rows } = theList();
      expect(rows).toHaveLength(3);
      expect(rows[0]!.textContent).toContain("Ada Lovelace");
      expect(list.hasAttribute("aria-label")).toBe(false);
      expect(list.hasAttribute("aria-labelledby")).toBe(false);
      expect(list.hasAttribute("tabindex")).toBe(false);
    });

    it(`(${platform}) the header title names the list, and the header stays out of it`, () => {
      ui(<List card title="Team" addAction="Add" items={PEOPLE} />);
      const { list, rows } = theList();
      expect(screen.getByRole("list", { name: "Team" })).toBe(list);
      expect(rows).toHaveLength(3);
      // The title and the header's Add button sit above the list, not in it.
      const add = screen.getByRole("button", { name: /Add/ });
      expect(list.contains(add)).toBe(false);
    });

    it(`(${platform}) a label names a list with no title`, () => {
      ui(<List label="Everyone" items={PEOPLE} />);
      expect(screen.getByRole("list", { name: "Everyone" })).toBeTruthy();
    });

    it(`(${platform}) the title wins over a label`, () => {
      ui(<List title="Team" label="Everyone" items={PEOPLE} />);
      const list = screen.getByRole("list", { name: "Team" });
      expect(list.hasAttribute("aria-label")).toBe(false);
    });

    // `title={cond && "Team"}` passes false when the condition fails: nothing to read,
    // so the label names the list rather than an empty title.
    it(`(${platform}) a title with nothing to read leaves the naming to the label`, () => {
      for (const title of [false, ""] as const) {
        ui(<List title={title} label="Everyone" items={PEOPLE} />);
        const list = screen.getByRole("list", { name: "Everyone" });
        expect(list.hasAttribute("aria-labelledby")).toBe(false);
        cleanup();
      }
    });

    it(`(${platform}) an empty list is a list with no items`, () => {
      ui(<List testID="subject" title="Team" items={[]} />);
      const list = screen.getByRole("list", { name: "Team" });
      expect(list.children).toHaveLength(0);
    });

    it(`(${platform}) a clickable row is a button inside its item`, () => {
      ui(<List clickable items={PEOPLE} onPressItem={() => {}} />);
      const { rows } = theList();
      expectButtonsInItems(rows);
    });

    it(`(${platform}) a clickable row with a trailing control is the item, holding its button and the control`, () => {
      ui(<List clickable items={PEOPLE.map((p) => ({ ...p, trailing: <Button small outline>Edit</Button> }))} onPressItem={() => {}} />);
      const { rows } = theList();
      rows.forEach((row, index) => {
        expect(within(row).getByRole("button", { name: PEOPLE[index]!.name })).toBeTruthy();
        expect(within(row).getByRole("button", { name: "Edit" })).toBeTruthy();
      });
    });

    // A reorderable row's item wraps its Draggable, so the preview a pointer drag lifts
    // out of the list (the Draggable's children) carries no item of its own, and the
    // drop zone's indicator never sits in the list.
    it(`(${platform}) a reorderable list: each item wraps its draggable row and grip`, () => {
      ui(<List reorderable title="Team" items={PEOPLE} onReorder={() => {}} />);
      const { list, rows } = theList();
      expect(screen.getByRole("list", { name: "Team" })).toBe(list);
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row.children).toHaveLength(1);
        const draggable = row.firstElementChild as HTMLElement;
        expect(draggable.hasAttribute("role")).toBe(false);
        expect(draggable.querySelector('[role="listitem"]')).toBeNull();
        expect(within(row).getByRole("button", { name: /^Reorder / })).toBeTruthy();
      }
    });

    it(`(${platform}) a keyboard drag's drop indicator stays outside the list`, async () => {
      ui(<List reorderable title="Team" items={PEOPLE} onReorder={() => {}} />);
      const { list } = theList();
      const zone = list.parentElement!;
      expect(zone.children).toHaveLength(1);
      const grip = screen.getAllByRole("button", { name: /^Reorder / })[0]!;
      fireEvent.keyDown(grip, { key: " " });
      // measureInWindow resolves on a macrotask on the web, and the drag layer chains several.
      for (let i = 0; i < 6; i++) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
      expect(grip.getAttribute("aria-pressed")).toBe("true");
      // The zone now paints its wash and insertion line beside the list, not in it.
      expect(zone.children.length).toBeGreaterThan(1);
      expect(zone.firstElementChild).toBe(list);
      expect([...list.children].every((child) => child.getAttribute("role") === "listitem")).toBe(true);
      act(() => { fireEvent.keyDown(grip, { key: "Escape" }); });
    });
  }
});

describe("Feed is a list of its events", () => {
  for (const [platform, List] of FEEDS) {
    for (const lead of ["connector", "avatar"] as const) {
      it(`(${platform}, ${lead}) one item per event, named by its label`, () => {
        ui(<List {...{ [lead]: true }} label="Recent activity" items={EVENTS} />);
        const { list, rows } = theList();
        expect(screen.getByRole("list", { name: "Recent activity" })).toBe(list);
        expect(rows).toHaveLength(3);
        expect(rows[1]!.textContent).toContain("The nightly build passed");
      });

      it(`(${platform}, ${lead}) a pressable event is a button inside its item`, () => {
        ui(<List {...{ [lead]: true }} items={EVENTS} onItemPress={() => {}} />);
        const { list, rows } = theList();
        expect(list.hasAttribute("aria-label")).toBe(false);
        expectButtonsInItems(rows);
      });
    }
  }
});

describe("GridList is a list of its tiles", () => {
  for (const [platform, List] of GRIDS) {
    it(`(${platform}) the grid's root is the list, named by its label, one item per tile`, () => {
      ui(<List testID="subject" label="Team members" items={TILES} />);
      const { list, rows } = theList();
      expect(list).toBe(screen.getByTestId("subject"));
      expect(screen.getByRole("list", { name: "Team members" })).toBe(list);
      expect(rows).toHaveLength(3);
      // A tile's own action is a button inside its item.
      expect(within(rows[0]!).getByRole("button", { name: "Message" })).toBeTruthy();
    });

    it(`(${platform}) a gallery tile is itself the item`, () => {
      ui(<List gallery items={TILES} />);
      const { rows } = theList();
      for (const row of rows) expect(row.querySelector('[role="button"]')).toBeNull();
      expect(rows[0]!.textContent).toContain("Ada Lovelace");
    });

    it(`(${platform}) a tappable gallery tile is a button filling its item`, () => {
      ui(<List gallery items={TILES} onPressItem={() => {}} />);
      const { rows } = theList();
      expectButtonsInItems(rows);
    });

    it(`(${platform}) a tappable people tile's card is inside its item`, () => {
      ui(<List items={TILES} onPressItem={() => {}} />);
      const { rows } = theList();
      for (const row of rows) expect(row.querySelector('[role="button"]')).not.toBeNull();
    });
  }
});

// Windowed, the list is the keyboard stop, and a focused list with no name is named in
// Chromium from every row it rendered: a StackedList's title names it.
describe("a windowed StackedList", () => {
  const MANY = Array.from({ length: 40 }, (_, i) => ({ id: i, name: `Name ${i + 1}`, detail: "Montréal" }));
  for (const [platform, List] of STACKED) {
    it(`(${platform}) is the list its title names`, () => {
      ui(<List card title="Team" virtualized style={{ maxHeight: 240 }} items={MANY} />);
      const list = screen.getByRole("list", { name: "Team" });
      expect(list.hasAttribute("tabindex")).toBe(true);
      expect(within(list).getAllByRole("listitem")[0]!.getAttribute("aria-setsize")).toBe("40");
    });
  }
});
