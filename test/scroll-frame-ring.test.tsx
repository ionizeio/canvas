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
// the same way. The calendar Heatmap's scroller has room around it and keeps its own
// ring (test/heatmap-scroll-focus.test.tsx).

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
// container is its first child).
function layOutRows(body: HTMLElement, viewport: number, contentHeight: number) {
  layOut(body, 600, viewport);
  layOut(body.firstElementChild as HTMLElement, 600, contentHeight);
}

// ...so that its rows overflow and it becomes a keyboard stop.
function overflowDown(body: HTMLElement, viewport = 196, contentHeight = 2000) {
  layOutRows(body, viewport, contentHeight);
  expect(body.tabIndex).toBe(0);
}

const LONG = 'const destinations = ["Montréal", "Toronto", "Vancouver", "Halifax", "Victoria", "Québec"];';
const COLUMNS = ["Name", "Location", "Status", "Joined", "Team"];
const ROWS = [["Ada", "Montréal", "Active", "2026-01-02", "Design"], ["Sam", "Toronto", "Active", "2026-03-04", "Engineering"]];
// More rows than a 240 px table shows.
const MANY_ROWS = Array.from({ length: 40 }, (_, i) => [`Name ${i + 1}`, "Montréal", "Active", "2026-01-02", "Design"]);
const SLIDES = [{ key: "a", content: "One" }, { key: "b", content: "Two" }, { key: "c", content: "Three" }];

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
        expect(outline(scroller, "style")).toBe("none");
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
      expect(outline(scroller, "style")).toBe("none");
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
    expect(outline(body, "style")).toBe("none");
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
