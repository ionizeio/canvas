import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { render, cleanup, screen, within, fireEvent, act } from "@testing-library/react";
import React, { type ComponentType, type ForwardedRef, type ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";
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
      expect(list.getAttribute("aria-label")).toBe("Team");
    });

    // A title that is not a string has no text to copy: on the web it names the list by
    // reference, and natively `label` does (a labelled-by relation reads every row on Android).
    it(`(${platform}) a title that is a node names the list by reference on the web`, () => {
      ui(<List title={<>Team <Text>members</Text></>} label="Everyone" items={PEOPLE} />);
      const list = screen.getByRole("list", { name: "Team members" });
      expect(document.getElementById(list.getAttribute("aria-labelledby")!)!.textContent).toBe("Team members");
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

// Natively, Fabric removes a View whose props neither paint nor mark it (a role or a label
// does not count), and hoists the children out of a View that is no stacking context
// (sliceChildShadowNodeViewPairs), so an eager list's container reached no screen reader:
// Android showed no AbsListView for any of the three lists. `collapsable={false}` keeps a
// named list a native view that holds its rows, the Listbox's fix (3bc31490). An unnamed
// list stays collapsable: React Native's Android delegate would name its container with the
// text of every row, one stop reading the whole list. React Native Web drops the prop before
// the DOM, so it is read at React Native's View render boundary. A windowed list's scroller
// is a native scroll view already.
describe("an eager list's native container", () => {
  const component = View as unknown as { render: (props: ViewProps, ref: ForwardedRef<unknown>) => ReactNode };
  const isList = (props: ViewProps) => props.role === "list";

  function listProps(node: ReactNode) {
    const original = component.render;
    const lists: ViewProps[] = [];
    const observer = spyOn(component, "render").mockImplementation((props, ref) => {
      if (isList(props)) lists.push(props);
      return original(props, ref);
    });
    try {
      ui(node);
      return lists;
    } finally {
      observer.mockRestore();
    }
  }

  // [name, list, whether the list is named]
  const CASES: Array<[string, ReactNode, boolean]> = [
    ...STACKED.flatMap(([platform, List]): Array<[string, ReactNode, boolean]> => [
      [`StackedList (${platform})`, <List items={PEOPLE} />, false],
      [`StackedList card with a title (${platform})`, <List card title="Team" items={PEOPLE} />, true],
      [`clickable StackedList with a label and testID (${platform})`, <List clickable label="Team" testID="team" items={PEOPLE} onPressItem={() => {}} />, true],
      [`reorderable StackedList with a title (${platform})`, <List reorderable title="Team" items={PEOPLE} onReorder={() => {}} />, true],
      [`reorderable StackedList (${platform})`, <List reorderable items={PEOPLE} onReorder={() => {}} />, false],
      [`StackedList with a node title (${platform})`, <List title={<Text>Team</Text>} items={PEOPLE} />, false],
      [`StackedList with a node title and a label (${platform})`, <List title={<Text>Team</Text>} label="Everyone" items={PEOPLE} />, true],
    ]),
    ...FEEDS.flatMap(([platform, List]): Array<[string, ReactNode, boolean]> => [
      [`Feed (${platform})`, <List items={EVENTS} />, false],
      [`avatar Feed with a label (${platform})`, <List avatar label="Activity" items={EVENTS} onItemPress={() => {}} />, true],
    ]),
    ...GRIDS.flatMap(([platform, List]): Array<[string, ReactNode, boolean]> => [
      [`GridList (${platform})`, <List items={TILES} />, false],
      [`gallery GridList with a label and testID (${platform})`, <List gallery label="Photos" testID="photos" items={TILES} onPressItem={() => {}} />, true],
    ]),
  ];

  for (const [name, node, named] of CASES) {
    it(`${name}: ${named ? "keeps its named list a native view (collapsable false)" : "leaves its unnamed list collapsable"}`, () => {
      const lists = listProps(node);
      expect(lists.length).toBeGreaterThan(0);
      for (const props of lists) expect(props.collapsable).toBe(named ? false : undefined);
    });
  }

  // React Native's ScrollView does not turn aria-label or aria-labelledby into its native
  // props (its View does), so a windowed list also carries the native spelling of its name.
  const WINDOWED: Array<[string, ReactNode, Partial<ViewProps>]> = [
    ...STACKED.flatMap(([platform, List]): Array<[string, ReactNode, Partial<ViewProps>]> => [
      [`windowed StackedList with a title (${platform})`, <List card title="Team" virtualized style={{ maxHeight: 240 }} items={PEOPLE} />, { accessibilityLabel: "Team" }],
      [`windowed StackedList with a node title and a label (${platform})`, <List card title={<Text>Team</Text>} label="Everyone" virtualized style={{ maxHeight: 240 }} items={PEOPLE} />, { accessibilityLabel: "Everyone" }],
      [`windowed StackedList with a label (${platform})`, <List label="People" virtualized style={{ maxHeight: 240 }} items={PEOPLE} />, { accessibilityLabel: "People" }],
    ]),
    ...FEEDS.map(([platform, List]): [string, ReactNode, Partial<ViewProps>] => [`windowed Feed (${platform})`, <List label="Activity" virtualized style={{ maxHeight: 240 }} items={EVENTS} />, { accessibilityLabel: "Activity" }]),
    ...GRIDS.map(([platform, List]): [string, ReactNode, Partial<ViewProps>] => [`windowed GridList (${platform})`, <List label="Photos" virtualized style={{ maxHeight: 240 }} items={TILES} />, { accessibilityLabel: "Photos" }]),
  ];
  for (const [name, node, native] of WINDOWED) {
    it(`${name}: names its scroller in React Native's native spelling too`, () => {
      const lists = listProps(node);
      expect(lists).toHaveLength(1);
      const props = lists[0]!;
      expect(props.accessibilityLabel).toBe(native.accessibilityLabel);
      expect(props["aria-label"]).toBe(native.accessibilityLabel);
      // Never a labelled-by relation natively: Android's delegate would read every row.
      expect(props.accessibilityLabelledBy).toBeUndefined();
    });
  }

  it("leaves the web's DOM exactly as a list without the prop renders it", () => {
    // React drops a false value on an unknown attribute (and warns once per process), so a
    // forwarded `collapsable` would not show in the DOM: watch the props react-native-web
    // hands React for each DOM element, and compare with a render that never had the prop.
    const hostProps: string[][] = [];
    const createElement = React.createElement;
    const host = spyOn(React, "createElement").mockImplementation(((type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => {
      if (typeof type === "string" && props) hostProps.push(Object.keys(props));
      return (createElement as (...args: unknown[]) => unknown)(type, props, ...children);
    }) as typeof React.createElement);
    try {
      for (const [name, node] of CASES) {
        const kept = ui(node).container.innerHTML;
        cleanup();
        const original = component.render;
        const strip = spyOn(component, "render").mockImplementation((props, ref) => {
          if (!isList(props)) return original(props, ref);
          const { collapsable: _collapsable, ...rest } = props;
          return original(rest, ref);
        });
        let bare: string;
        try {
          bare = ui(node).container.innerHTML;
        } finally {
          strip.mockRestore();
        }
        cleanup();
        // Each render takes fresh useId values (the title's id), so compare them by position.
        const ids = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_id_");
        expect(ids(kept), name).toBe(ids(bare));
      }
    } finally {
      host.mockRestore();
    }
    expect(hostProps.some((keys) => keys.includes("role"))).toBe(true);
    expect(hostProps.filter((keys) => keys.includes("collapsable"))).toEqual([]);
  });
});
