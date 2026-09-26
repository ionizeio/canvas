import { useState, type ReactNode } from "react";
import { describe, it, expect, afterEach, beforeEach, spyOn } from "bun:test";
import { act, render, renderHook, cleanup, fireEvent, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { shape } from "../src/style/tokens.ts";
import { FOCUS_RING_OFFSET, FOCUS_RING_WIDTH } from "../src/style/pressable.tsx";
import { useFocusFrame } from "../src/style/focus-frame.tsx";
import { CodeBlock } from "../src/molecules/code-block/code-block.tsx";
import { CodeBlock as IOSCodeBlock } from "../src/molecules/code-block/code-block.ios.tsx";
import { CodeBlock as AndroidCodeBlock } from "../src/molecules/code-block/code-block.android.tsx";
import { DataTable } from "../src/organisms/data-table/data-table.tsx";
import { DataTable as IOSDataTable } from "../src/organisms/data-table/data-table.ios.tsx";
import { DataTable as AndroidDataTable } from "../src/organisms/data-table/data-table.android.tsx";
import { Carousel } from "../src/organisms/carousel/carousel.tsx";
import { Carousel as IOSCarousel } from "../src/organisms/carousel/carousel.ios.tsx";
import { Carousel as AndroidCarousel } from "../src/organisms/carousel/carousel.android.tsx";
import { StackedList } from "../src/molecules/stacked-lists/stacked-lists.tsx";
import { StackedList as IOSStackedList } from "../src/molecules/stacked-lists/stacked-lists.ios.tsx";
import { StackedList as AndroidStackedList } from "../src/molecules/stacked-lists/stacked-lists.android.tsx";
import { Feed } from "../src/molecules/feeds/feeds.tsx";
import { Feed as IOSFeed } from "../src/molecules/feeds/feeds.ios.tsx";
import { Feed as AndroidFeed } from "../src/molecules/feeds/feeds.android.tsx";
import { GridList } from "../src/molecules/grid-lists/grid-lists.tsx";
import { GridList as IOSGridList } from "../src/molecules/grid-lists/grid-lists.ios.tsx";
import { GridList as AndroidGridList } from "../src/molecules/grid-lists/grid-lists.android.tsx";
import { LOOKS, lookProps, type Look } from "./fixtures/looks.ts";

// A CodeBlock, DataTable or Carousel scroller that overflows is a keyboard stop sitting
// flush inside a clipping card. Its own ring cannot show there: one drawn outside it is
// clipped by the card, and Chromium paints one drawn inside it under the scrolled
// content (a terminal's dark rows, a carousel's slide). So the card draws the theme's
// ring (src/style/focus-frame.tsx): solid, at the kit's width and offset, while a key
// lands on the scroller, and the scroller draws none. A pointer focus draws no ring,
// as :focus-visible draws none. An `attached` table sits flush inside a parent frame
// that would clip that ring, so it draws the ring just inside its edge, on a layer
// above the scroller. A windowed DataTable's body scrolls its rows on its own, inside the
// same card, so it is a stop of its own while its rows overflow and the card rings it
// the same way. A windowed StackedList or Feed scrolls its rows in a list of its own
// inside its card (or a plain StackedList's root), so it is a stop of its own too, and
// the card rings it. A windowed GridList's scroller is the grid's root, with no card
// around it, so it rings itself. The calendar Heatmap's scroller has room around it and
// keeps its own ring (test/heatmap-scroll-focus.test.tsx).

let warnSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  resetDevWarnings();
  warnSpy = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
  cleanup();
});

// happy-dom has no ResizeObserver, so RNW never fires onLayout on its own: deliver a
// node's measured width through the handler RNW attaches to it.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layOut(node: HTMLElement, width: number, height = 120) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The node has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height } }, timeStamp: 1 }));
}

// The one horizontal scroller under `root`: RNW styles it overflow-x auto.
function scrollerIn(root: HTMLElement): HTMLElement {
  const found = (Array.from(root.querySelectorAll("div")) as HTMLElement[]).filter((node) => getComputedStyle(node).overflowX === "auto");
  if (found.length !== 1) throw new Error(`expected one horizontal scroller, found ${found.length}`);
  return found[0]!;
}

// Lay a scroller out `viewport` wide around content `contentWidth` wide (its content
// container is its first child), so it overflows and becomes a keyboard stop.
function overflow(scroller: HTMLElement, viewport = 284, contentWidth = 900) {
  layOut(scroller, viewport);
  layOut(scroller.firstElementChild as HTMLElement, contentWidth);
  expect(scroller.tabIndex).toBe(0);
}

// Lay a windowed body out `viewport` tall around rows `contentHeight` tall (its content
// container is its first child), `width` wide. A GridList's scroller is the grid, whose
// columns follow its own width, so a grid is laid out at a desktop width: below 640 it
// drops to one column and remounts its scroller.
function layOutRows(body: HTMLElement, viewport: number, contentHeight: number, width = 600) {
  layOut(body, width, viewport);
  layOut(body.firstElementChild as HTMLElement, width, contentHeight);
}

// ...so that its rows overflow and it becomes a keyboard stop.
function overflowDown(body: HTMLElement, viewport = 196, contentHeight = 2000, width = 600) {
  layOutRows(body, viewport, contentHeight, width);
  expect(body.tabIndex).toBe(0);
}
const GRID_WIDTH = 1024;

const LONG = 'const destinations = ["Montréal", "Toronto", "Vancouver", "Halifax", "Victoria", "Québec"];';
const COLUMNS = ["Name", "Location", "Status", "Joined", "Team"];
const ROWS = [["Ada", "Montréal", "Active", "2026-01-02", "Design"], ["Sam", "Toronto", "Active", "2026-03-04", "Engineering"]];
// More rows than a 240 px table shows.
const MANY_ROWS = Array.from({ length: 40 }, (_, i) => [`Name ${i + 1}`, "Montréal", "Active", "2026-01-02", "Design"]);
const SLIDES = [{ key: "a", content: "One" }, { key: "b", content: "Two" }, { key: "c", content: "Three" }];
// More rows, events and tiles than a 240 px list shows, none of them focusable.
const PEOPLE = Array.from({ length: 40 }, (_, i) => ({ id: i, name: `Name ${i + 1}`, detail: "Montréal", meta: "Active" }));
const EVENTS = Array.from({ length: 40 }, (_, i) => ({ id: i, actor: `Name ${i + 1}`, action: "joined the team", time: `${i + 1} hours ago` }));
const TILES = Array.from({ length: 40 }, (_, i) => ({ title: `IMG_${1000 + i}.jpg`, subtitle: "2.4 MB", color: "primary" }));
const BOUNDED = { maxHeight: 240 };

interface Case {
  name: string;
  node: ReactNode;
  /** Makes the scroller a keyboard stop and returns it with the frame that draws its ring. */
  stop(): { scroller: HTMLElement; frame: HTMLElement };
}

function codeBlock(name: string, node: ReactNode): Case {
  return {
    name,
    node,
    stop() {
      const frame = screen.getByTestId("subject");
      const scroller = scrollerIn(frame);
      overflow(scroller);
      return { scroller, frame };
    },
  };
}

function dataTable(name: string, node: ReactNode): Case {
  return {
    name,
    node,
    stop() {
      const frame = screen.getByTestId("subject");
      // Below the sm width the columns pan inside a scroller around the table.
      layOut(frame, 375);
      const scroller = screen.getByRole("table").parentElement!.parentElement as HTMLElement;
      overflow(scroller, 375, 550);
      return { scroller, frame };
    },
  };
}

// A windowed table's body: its row group scrolls the rows under the fixed header.
function windowedTable(name: string, node: ReactNode): Case {
  return {
    name,
    node,
    stop() {
      const frame = screen.getByTestId("subject");
      const scroller = screen.getByRole("rowgroup");
      overflowDown(scroller);
      return { scroller, frame };
    },
  };
}

// A windowed StackedList or Feed: the one list under the root scrolls the rows, and the
// root (the card, or a plain list's frame) draws its ring.
function windowedList(name: string, node: ReactNode): Case {
  return {
    name,
    node,
    stop() {
      const frame = screen.getByTestId("subject");
      const scroller = screen.getByRole("list");
      overflowDown(scroller);
      return { scroller, frame };
    },
  };
}

function carousel(name: string, node: ReactNode): Case {
  return {
    name,
    node,
    stop() {
      // The track holds [prev arrow][viewport][next arrow]; the viewport measures itself
      // and frames the paged scroller.
      const track = screen.getByTestId("subject").firstElementChild as HTMLElement;
      const frame = [...track.children].find((child) => (child as LayoutHost).__reactLayoutHandler) as HTMLElement;
      layOut(frame, 300);
      const scroller = frame.firstElementChild as HTMLElement;
      overflow(scroller, 300, 900);
      return { scroller, frame };
    },
  };
}

const CASES: Case[] = [
  codeBlock("plain CodeBlock (web)", <CodeBlock testID="subject" code={LONG} />),
  codeBlock("plain CodeBlock (ios)", <IOSCodeBlock testID="subject" code={LONG} />),
  codeBlock("plain CodeBlock (android)", <AndroidCodeBlock testID="subject" code={LONG} />),
  codeBlock("numbered CodeBlock (web)", <CodeBlock testID="subject" numbered code={LONG} />),
  codeBlock("terminal CodeBlock (web)", <CodeBlock testID="subject" terminal code={LONG} />),
  codeBlock("terminal CodeBlock (ios)", <IOSCodeBlock testID="subject" terminal code={LONG} />),
  codeBlock("terminal CodeBlock (android)", <AndroidCodeBlock testID="subject" terminal code={LONG} />),
  dataTable("DataTable (web)", <DataTable testID="subject" columns={COLUMNS} rows={ROWS} />),
  dataTable("DataTable (android)", <AndroidDataTable testID="subject" columns={COLUMNS} rows={ROWS} />),
  windowedTable("windowed DataTable body (web)", <DataTable testID="subject" virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} />),
  windowedTable("windowed DataTable body (ios)", <IOSDataTable testID="subject" virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} />),
  windowedTable("windowed DataTable body (android)", <AndroidDataTable testID="subject" virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} />),
  windowedList("windowed StackedList card (web)", <StackedList testID="subject" card title="Team" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed StackedList card (ios)", <IOSStackedList testID="subject" card title="Team" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed StackedList card (android)", <AndroidStackedList testID="subject" card title="Team" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed plain StackedList (web)", <StackedList testID="subject" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed plain StackedList (ios)", <IOSStackedList testID="subject" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed plain StackedList (android)", <AndroidStackedList testID="subject" virtualized style={BOUNDED} items={PEOPLE} />),
  windowedList("windowed Feed (web)", <Feed testID="subject" virtualized style={BOUNDED} items={EVENTS} />),
  windowedList("windowed Feed (ios)", <IOSFeed testID="subject" virtualized style={BOUNDED} items={EVENTS} />),
  windowedList("windowed Feed (android)", <AndroidFeed testID="subject" virtualized style={BOUNDED} items={EVENTS} />),
  windowedList("windowed avatar Feed (web)", <Feed testID="subject" avatar virtualized style={BOUNDED} items={EVENTS} />),
  windowedList("windowed avatar Feed (ios)", <IOSFeed testID="subject" avatar virtualized style={BOUNDED} items={EVENTS} />),
  windowedList("windowed avatar Feed (android)", <AndroidFeed testID="subject" avatar virtualized style={BOUNDED} items={EVENTS} />),
  carousel("Carousel (web)", <Carousel testID="subject" items={SLIDES} />),
  carousel("Carousel (ios)", <IOSCarousel testID="subject" items={SLIDES} />),
  carousel("Carousel (android)", <AndroidCarousel testID="subject" items={SLIDES} />),
];

const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};

const outline = (node: HTMLElement, part: "color" | "style" | "width" | "offset") => node.style.getPropertyValue(`outline-${part}`);

function expectRing(frame: HTMLElement, look: Look) {
  expect(channels(outline(frame, "color"))).toBe(channels(look.tokens.ring));
  expect(outline(frame, "style")).toBe("solid");
  expect(outline(frame, "width")).toBe(`${FOCUS_RING_WIDTH}px`);
  expect(outline(frame, "offset")).toBe(`${FOCUS_RING_OFFSET}px`);
}
const expectNoRing = (frame: HTMLElement) => expect(outline(frame, "style")).toBe("");
// A node that is its own frame rests on FOCUS_RESET (a solid outline of zero width, the
// style React Native's parser accepts): neither the browser's ring nor the theme's.
function expectNoRingDrawn(node: HTMLElement) {
  expect(outline(node, "style")).toBe("solid");
  expect(outline(node, "width")).toBe("0px");
}

const ui = (node: ReactNode, props: { scheme?: "light" | "dark"; mint?: boolean; glass?: boolean } = {}) => {
  const { glass, ...look } = props;
  return render(glass ? <ThemeProvider glass {...look}>{node}</ThemeProvider> : <ThemeProvider solid {...look}>{node}</ThemeProvider>);
};

for (const subject of CASES) {
  describe(`${subject.name} keyboard focus ring`, () => {
    for (const look of LOOKS) {
      it(`draws the ${look.name} palette's ring on its frame while a key lands on the scroller, and none on the scroller`, () => {
        ui(subject.node, lookProps(look));
        const { scroller, frame } = subject.stop();
        expectNoRing(frame);
        // Tab releases on the node it moved focus to.
        fireEvent.focus(scroller);
        fireEvent.keyUp(scroller, { key: "Tab" });
        expectRing(frame, look);
        // The scroller's own ring (the browser's, or the kit's) is off, so the two never stack.
        expect(outline(scroller, "style")).toBe("solid");
        expect(outline(scroller, "width")).toBe("0px");
        fireEvent.blur(scroller);
        expectNoRing(frame);
      });
    }
  });
}

describe("frame ring under glass", () => {
  const blush = LOOKS[0]!;
  for (const subject of CASES.filter((c) => c.name.endsWith("(web)"))) {
    it(`${subject.name} rings its frame through the material`, () => {
      ui(subject.node, { glass: true });
      const { scroller, frame } = subject.stop();
      fireEvent.keyUp(scroller, { key: "Tab" });
      expectRing(frame, blush);
      expect(outline(scroller, "style")).toBe("solid");
      expect(outline(scroller, "width")).toBe("0px");
    });
  }
});

describe("an attached DataTable", () => {
  for (const look of LOOKS) {
    it(`draws the ${look.name} palette's ring just inside its edge, above the scroller, since its parent frame clips`, () => {
      ui(<DataTable testID="subject" attached columns={COLUMNS} rows={ROWS} />, lookProps(look));
      const { scroller, frame } = dataTable("", null).stop();
      fireEvent.keyUp(scroller, { key: "Tab" });
      expectNoRing(frame);
      // The ring layer is the frame's last child, over the whole frame, taking no touches.
      const layer = frame.lastElementChild as HTMLElement;
      expect(channels(outline(layer, "color"))).toBe(channels(look.tokens.ring));
      expect(outline(layer, "style")).toBe("solid");
      expect(outline(layer, "width")).toBe(`${FOCUS_RING_WIDTH}px`);
      expect(outline(layer, "offset")).toBe(`-${FOCUS_RING_WIDTH}px`);
      expect(layer.style.position).toBe("absolute");
      expect(getComputedStyle(layer).pointerEvents).toBe("none");
      expect(layer.getAttribute("aria-hidden")).toBe("true");
      expect(scroller.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      fireEvent.blur(scroller);
      expect(frame.lastElementChild === layer).toBe(false);
    });
  }
});

describe("a windowed DataTable body", () => {
  const blush = LOOKS[0]!;
  const table = (props: { attached?: boolean; loading?: boolean } = {}) => (
    <ThemeProvider solid>
      <DataTable testID="subject" virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} {...props} />
    </ThemeProvider>
  );

  // The attribute, not the property: a div with no tabindex also reports -1, and it is
  // exactly the unmanaged scroller Chromium and Firefox made a stop of their own accord.
  it("is a keyboard stop only while its rows overflow", () => {
    render(table());
    const body = screen.getByRole("rowgroup");
    expect(body.getAttribute("tabindex")).toBe("-1");
    layOutRows(body, 196, 150);
    expect(body.getAttribute("tabindex")).toBe("-1");
    layOutRows(body, 196, 2000);
    expect(body.getAttribute("tabindex")).toBe("0");
    layOutRows(body, 2400, 2000);
    expect(body.getAttribute("tabindex")).toBe("-1");
  });

  it("is a stop whatever its rows hold, just before the first row's controls", () => {
    render(
      <ThemeProvider solid>
        <DataTable testID="subject" selectable virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} />
      </ThemeProvider>,
    );
    const body = screen.getByRole("rowgroup");
    overflowDown(body);
    const boxes = screen.getAllByRole("checkbox");
    // The header's select-all box comes before the body, every row's box inside it.
    expect(body.contains(boxes[0]!)).toBe(false);
    expect(boxes[0]!.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(boxes.slice(1).length).toBeGreaterThan(0);
    for (const box of boxes.slice(1)) expect(body.contains(box)).toBe(true);
  });

  it("is the table's body row group, beside the header row inside the table", () => {
    render(table());
    const body = screen.getByRole("rowgroup");
    const header = screen.getAllByRole("row")[0]!;
    expect(screen.getByRole("table").contains(body)).toBe(true);
    expect(body.contains(header)).toBe(false);
    expect(body.querySelectorAll('[role="row"]').length).toBeGreaterThan(0);
  });

  it("shares the card's ring with the pan scroller at phone widths, each stop in turn", () => {
    render(table());
    const frame = screen.getByTestId("subject");
    layOut(frame, 375);
    const pan = screen.getByRole("table").parentElement!.parentElement as HTMLElement;
    overflow(pan, 375, 550);
    const body = screen.getByRole("rowgroup");
    overflowDown(body);
    fireEvent.keyUp(pan, { key: "Tab" });
    expectRing(frame, blush);
    // Tab moves on from the pan scroller to the body, inside it.
    fireEvent.blur(pan);
    fireEvent.focus(body);
    fireEvent.keyUp(body, { key: "Tab" });
    expectRing(frame, blush);
    expect(outline(body, "style")).toBe("solid");
    expect(outline(body, "width")).toBe("0px");
    fireEvent.blur(body);
    expectNoRing(frame);
  });

  it("clears the body's ring when it turns to its loading rows, and leaves the pan scroller's", () => {
    const { rerender } = render(table());
    const frame = screen.getByTestId("subject");
    layOut(frame, 375);
    const pan = screen.getByRole("table").parentElement!.parentElement as HTMLElement;
    overflow(pan, 375, 550);
    overflowDown(screen.getByRole("rowgroup"));
    fireEvent.keyUp(screen.getByRole("rowgroup"), { key: "Tab" });
    expectRing(frame, blush);
    rerender(table({ loading: true }));
    expect(screen.queryByRole("rowgroup")).toBeNull();
    expectNoRing(frame);
    rerender(table());
    overflowDown(screen.getByRole("rowgroup"));
    fireEvent.keyUp(pan, { key: "Tab" });
    rerender(table({ loading: true }));
    expectRing(frame, blush);
  });

  for (const look of LOOKS) {
    it(`draws the ${look.name} palette's ring just inside an attached table's edge for its body`, () => {
      ui(<DataTable testID="subject" attached virtualized style={{ maxHeight: 240 }} columns={COLUMNS} rows={MANY_ROWS} />, lookProps(look));
      const { scroller, frame } = windowedTable("", null).stop();
      fireEvent.keyUp(scroller, { key: "Tab" });
      expectNoRing(frame);
      const layer = frame.lastElementChild as HTMLElement;
      expect(channels(outline(layer, "color"))).toBe(channels(look.tokens.ring));
      expect(outline(layer, "style")).toBe("solid");
      expect(outline(layer, "offset")).toBe(`-${FOCUS_RING_WIDTH}px`);
      expect(layer.getAttribute("aria-hidden")).toBe("true");
      expect(scroller.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      fireEvent.blur(scroller);
      expect(frame.lastElementChild === layer).toBe(false);
    });
  }
});

describe("a windowed StackedList, Feed or GridList", () => {
  const blush = LOOKS[0]!;
  const LISTS: Array<{ name: string; width: number; node: (props?: object) => ReactNode }> = [
    { name: "StackedList", width: 600, node: (props = {}) => <StackedList testID="subject" virtualized style={BOUNDED} items={PEOPLE} {...props} /> },
    { name: "Feed", width: 600, node: (props = {}) => <Feed testID="subject" virtualized style={BOUNDED} items={EVENTS} {...props} /> },
    { name: "GridList", width: GRID_WIDTH, node: (props = {}) => <GridList testID="subject" gallery virtualized style={BOUNDED} items={TILES} {...props} /> },
  ];

  // The attribute, not the property: a div with no tabindex also reports -1, and it is
  // exactly the unmanaged scroller Chromium and Firefox made a stop of their own accord.
  for (const list of LISTS) {
    it(`${list.name}: is a keyboard stop only while its rows overflow`, () => {
      ui(list.node());
      const scroller = screen.getByRole("list");
      expect(scroller.getAttribute("tabindex")).toBe("-1");
      layOutRows(scroller, 196, 150, list.width);
      expect(scroller.getAttribute("tabindex")).toBe("-1");
      layOutRows(scroller, 196, 2000, list.width);
      expect(scroller.getAttribute("tabindex")).toBe("0");
      layOutRows(scroller, 2400, 2000, list.width);
      expect(scroller.getAttribute("tabindex")).toBe("-1");
    });

    // Focused, an unnamed scroller took its name from every row it rendered in Chromium,
    // a list included, so the stop is the list, named by its label. Its rendered rows
    // say where they sit in the whole list, which the browser cannot count from them.
    it(`${list.name}: the stop is the list, named by its label, and its rows count the whole list`, () => {
      ui(list.node({ label: "Everyone" }));
      const scroller = screen.getByRole("list");
      expect(scroller.tagName).toBe("UL");
      expect(scroller.getAttribute("aria-label")).toBe("Everyone");
      const rows = screen.getAllByRole("listitem");
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(40);
      rows.forEach((row, index) => {
        expect(row.tagName).toBe("LI");
        expect(scroller.contains(row)).toBe(true);
        expect(row.getAttribute("aria-setsize")).toBe("40");
        expect(row.getAttribute("aria-posinset")).toBe(String(index + 1));
        // FlatList's own wrappers between the list and the row (its content container,
        // the row's cell, a multi-column row of cells) are static: Chromium does not
        // count a list's items through a positioned wrapper.
        const wrappers: HTMLElement[] = [];
        for (let node = row.parentElement; node && node !== scroller; node = node.parentElement) wrappers.push(node);
        expect(wrappers.length).toBeGreaterThan(0);
        for (const wrapper of wrappers) expect(getComputedStyle(wrapper).position).toBe("static");
      });
      expect(scroller.textContent).toContain(list.name === "GridList" ? "IMG_1000.jpg" : "Name 1");
    });

    it(`${list.name}: adds no stop or ring handling when it renders eagerly, and its rows need no count`, () => {
      ui(list.node({ virtualized: false }));
      expect(screen.getByRole("list").hasAttribute("tabindex")).toBe(false);
      expect(screen.getByTestId("subject").querySelector("[tabindex]")).toBeNull();
      const rows = screen.getAllByRole("listitem");
      expect(rows).toHaveLength(40);
      for (const row of rows) expect(row.hasAttribute("aria-setsize")).toBe(false);
    });
  }

  it("StackedList: is a stop whatever its rows hold, after the header's action and before the rows' buttons", () => {
    ui(<StackedList testID="subject" clickable title="Team" addAction="Add" virtualized style={BOUNDED} items={PEOPLE} onPressItem={() => {}} />);
    const scroller = screen.getByRole("list");
    overflowDown(scroller);
    const buttons = screen.getAllByRole("button");
    // The header's Add button comes before the list, every row's button inside it.
    expect(scroller.contains(buttons[0]!)).toBe(false);
    expect(buttons[0]!.compareDocumentPosition(scroller) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(buttons.slice(1).length).toBeGreaterThan(0);
    for (const button of buttons.slice(1)) expect(scroller.contains(button)).toBe(true);
  });

  it("Feed: is a stop whatever its rows hold, around every pressable row", () => {
    ui(<Feed testID="subject" virtualized style={BOUNDED} items={EVENTS} onItemPress={() => {}} />);
    const scroller = screen.getByRole("list");
    overflowDown(scroller);
    const rows = screen.getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(scroller.contains(row)).toBe(true);
  });

  it("GridList: is a stop whatever its tiles hold, around every pressable tile", () => {
    ui(<GridList testID="subject" gallery virtualized style={BOUNDED} items={TILES} onPressItem={() => {}} />);
    const scroller = screen.getByRole("list");
    overflowDown(scroller, 196, 2000, GRID_WIDTH);
    const tiles = screen.getAllByRole("button");
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) expect(scroller.contains(tile)).toBe(true);
  });

  it("StackedList: rings the card's own root, which carries the card's corners the outline follows", () => {
    ui(<StackedList testID="subject" card title="Team" virtualized style={BOUNDED} items={PEOPLE} />);
    const { scroller, frame } = windowedList("", null).stop();
    const radius = frame.style.getPropertyValue("border-top-left-radius");
    expect(radius).not.toBe("");
    fireEvent.keyUp(scroller, { key: "Tab" });
    expectRing(frame, blush);
    expect(frame.style.getPropertyValue("border-top-left-radius")).toBe(radius);
  });
});

// A windowed GridList's scroller is the grid's root: no card surrounds it to clip a ring
// drawn around it, so it is its own frame and draws the theme's ring around itself.
describe("a windowed GridList", () => {
  const grids = [
    { name: "web", Grid: GridList },
    { name: "ios", Grid: IOSGridList },
    { name: "android", Grid: AndroidGridList },
  ];
  for (const { name, Grid } of grids) {
    for (const look of LOOKS) {
      it(`(${name}) draws the ${look.name} palette's ring around its own scroller while a key lands on it`, () => {
        ui(<Grid testID="subject" gallery virtualized style={BOUNDED} items={TILES} />, lookProps(look));
        const scroller = screen.getByTestId("subject");
        expect(screen.getByRole("list")).toBe(scroller);
        overflowDown(scroller, 196, 2000, GRID_WIDTH);
        // Neither the browser's ring nor the theme's before a key lands on it.
        expectNoRingDrawn(scroller);
        fireEvent.focus(scroller);
        expectNoRingDrawn(scroller);
        fireEvent.keyUp(scroller, { key: "Tab" });
        expectRing(scroller, look);
        fireEvent.blur(scroller);
        expectNoRingDrawn(scroller);
      });
    }
  }

  it("rings itself through the material under glass", () => {
    ui(<GridList testID="subject" gallery virtualized style={BOUNDED} items={TILES} />, { glass: true });
    const scroller = screen.getByTestId("subject");
    overflowDown(scroller, 196, 2000, GRID_WIDTH);
    fireEvent.keyUp(scroller, { key: "Tab" });
    expectRing(scroller, LOOKS[0]!);
  });

  // The scroller's layout feeds both the grid's own width (its columns) and the stop.
  it("drops to one column at a phone width, and the remounted scroller measures its own stop", () => {
    ui(<GridList testID="subject" gallery cols3 virtualized style={BOUNDED} items={TILES} />);
    const wide = screen.getByTestId("subject");
    layOutRows(wide, 196, 2000, GRID_WIDTH);
    expect(wide.getAttribute("tabindex")).toBe("0");
    layOut(wide, 375, 196);
    // FlatList cannot change its column count live, so the grid remounts its scroller.
    const narrow = screen.getByTestId("subject");
    expect(narrow).not.toBe(wide);
    const tile = screen.getByText("IMG_1000.jpg").parentElement!.parentElement as HTMLElement;
    expect(tile.style.width).toBe("100%");
    // The new scroller's own measurements decide the stop: rows that fit take it away,
    // rows that overflow give it back.
    layOutRows(narrow, 196, 150, 375);
    expect(narrow.getAttribute("tabindex")).toBe("-1");
    layOutRows(narrow, 196, 6000, 375);
    expect(narrow.getAttribute("tabindex")).toBe("0");
  });
});

describe("frame ring follows keyboard focus only", () => {
  const blush = LOOKS[0]!;
  const mount = () => {
    ui(<CodeBlock testID="subject" code={LONG} />);
    return codeBlock("", null).stop();
  };

  it("draws nothing for a pointer focus, then rings once a key is pressed on the scroller", () => {
    const { scroller, frame } = mount();
    fireEvent.focus(scroller);
    expectNoRing(frame);
    fireEvent.keyUp(scroller, { key: "ArrowRight" });
    expectRing(frame, blush);
  });

  it("rings for Safari's Option+Tab, which moves focus with Alt held", () => {
    const { scroller, frame } = mount();
    fireEvent.keyUp(scroller, { key: "Tab", altKey: true });
    expectRing(frame, blush);
  });

  it("drops the ring on a pointer press inside the scroller, and a later pointer focus draws none", () => {
    const { scroller, frame } = mount();
    fireEvent.keyUp(scroller, { key: "Tab" });
    fireEvent.pointerDown(scroller.firstElementChild as HTMLElement);
    expectNoRing(frame);
    fireEvent.blur(scroller);
    fireEvent.focus(scroller);
    expectNoRing(frame);
  });

  it("brings the ring back when keyboard focus returns from another window", () => {
    const { scroller, frame } = mount();
    fireEvent.keyUp(scroller, { key: "Tab" });
    fireEvent.blur(scroller);
    expectNoRing(frame);
    fireEvent.focus(scroller);
    expectRing(frame, blush);
  });

  it("clears the ring when the scroller unmounts with focus, and it does not come back with it", () => {
    function Toggle() {
      const [wrap, setWrap] = useState(false);
      return (
        <>
          <CodeBlock testID="subject" wrap={wrap} code={LONG} />
          <button type="button" onClick={() => setWrap((w) => !w)}>toggle</button>
        </>
      );
    }
    ui(<Toggle />);
    const { scroller, frame } = codeBlock("", null).stop();
    fireEvent.keyUp(scroller, { key: "Tab" });
    expectRing(frame, blush);
    fireEvent.click(screen.getByText("toggle"));
    expectNoRing(screen.getByTestId("subject"));
    fireEvent.click(screen.getByText("toggle"));
    expectNoRing(screen.getByTestId("subject"));
  });

  it("reads a native key event's fields from nativeEvent", () => {
    const { result } = renderHook(useFocusFrame, { wrapper: ({ children }) => <ThemeProvider solid>{children}</ThemeProvider> });
    const node = {};
    const keyUp = (nativeEvent: object) => act(() => (result.current.target as unknown as { onKeyUp(event: object): void }).onKeyUp({ target: node, currentTarget: node, nativeEvent }));
    keyUp({ key: "c", ctrlKey: true });
    expect(result.current.focused).toBe(false);
    keyUp({ key: "Tab" });
    expect(result.current.focused).toBe(true);
  });

  it("ignores a shortcut's keys, which copy a selection rather than move focus", () => {
    const { scroller, frame } = mount();
    fireEvent.focus(scroller);
    fireEvent.keyUp(scroller, { key: "c", metaKey: true });
    fireEvent.keyUp(scroller, { key: "c", ctrlKey: true });
    fireEvent.keyUp(scroller, { key: "Meta" });
    fireEvent.keyUp(scroller, { key: "Control" });
    fireEvent.keyUp(scroller, { key: "Alt" });
    expectNoRing(frame);
  });

  it("ignores a key released on a node inside the scroller", () => {
    const { scroller, frame } = mount();
    fireEvent.keyUp(scroller.firstElementChild as HTMLElement, { key: "Tab" });
    expectNoRing(frame);
  });

  it("keeps the ring when focus leaves a node inside the scroller rather than the scroller", () => {
    const { scroller, frame } = mount();
    fireEvent.keyUp(scroller, { key: "Tab" });
    fireEvent.blur(scroller.firstElementChild as HTMLElement);
    expectRing(frame, blush);
  });

  it("gives the ring the card's corners in solid mode, where the header and surface round their own", () => {
    const { scroller, frame } = mount();
    expect(frame.style.borderTopLeftRadius).toBe("");
    fireEvent.keyUp(scroller, { key: "Tab" });
    for (const corner of ["TopLeft", "TopRight", "BottomLeft", "BottomRight"] as const) {
      expect(frame.style.getPropertyValue(`border-${corner.replace(/([A-Z])/g, "-$1").toLowerCase().slice(1)}-radius`)).toBe(`${shape.web.control}px`);
    }
    fireEvent.blur(scroller);
    expect(frame.style.borderTopLeftRadius).toBe("");
  });

  it("squares the ring's top corners on an attached block", () => {
    ui(<CodeBlock testID="subject" attached code={LONG} />);
    const { scroller, frame } = codeBlock("", null).stop();
    fireEvent.keyUp(scroller, { key: "Tab" });
    expect(frame.style.getPropertyValue("border-top-left-radius")).toBe("0px");
    expect(frame.style.getPropertyValue("border-bottom-left-radius")).toBe(`${shape.web.control}px`);
  });

  it("rings the root under glass, which already carries the card's corners", () => {
    ui(<CodeBlock testID="subject" code={LONG} />, { glass: true });
    const { scroller, frame } = codeBlock("", null).stop();
    const radius = frame.style.getPropertyValue("border-top-left-radius");
    fireEvent.keyUp(scroller, { key: "Tab" });
    expectRing(frame, blush);
    expect(frame.style.getPropertyValue("border-top-left-radius")).toBe(radius);
  });
});
