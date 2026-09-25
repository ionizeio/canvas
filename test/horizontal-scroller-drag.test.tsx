import { type ReactNode } from "react";
import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { act, render, cleanup, fireEvent, screen } from "@testing-library/react";
import { AccessibilityInfo, Platform } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { Tabs as AndroidTabs } from "../src/organisms/tabs/tabs.android.tsx";
import { Board, type BoardColumn, type BoardItem } from "../src/organisms/board/board.tsx";
import { Board as AndroidBoard } from "../src/organisms/board/board.android.tsx";
import { Heatmap } from "../src/charts/heatmap/heatmap.tsx";
import { Heatmap as AndroidHeatmap } from "../src/charts/heatmap/heatmap.android.tsx";

// Tabs' overflow row, Board's lanes and the calendar Heatmap's grid each ride a
// horizontal scroller that pans only when its content overflows. Android's
// HorizontalScrollView claims any sideways drag past touch slop even when it cannot
// scroll, so on Android each takes a drag only while its content overflows: a fitting
// row, board or grid must not cancel a press that drifts sideways or keep the page from
// scrolling. Every other platform keeps a fitting scroller enabled (react-native-web
// renders a disabled one as touch-action: none, and a finger on it could no longer
// scroll the page), and this holds for every entry the docs' three-up renders. While
// TalkBack explores by touch an Android scroller stays enabled too: React Native's
// disabled horizontal scroller drops the hover events touch exploration is made of,
// which would hide the row's tabs, the board's cards and the grid from an exploring
// finger. Either way the element tree stays put: scrollEnabled is a prop of the same
// scroller.

afterEach(cleanup);

const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// `exploring` is whether Android reports touch exploration (TalkBack) as on.
async function onPlatform(os: string, run: () => Promise<void>, exploring = false) {
  const original = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
  const read = spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(exploring);
  try {
    await run();
  } finally {
    cleanup();
    read.mockRestore();
    Object.defineProperty(Platform, "OS", original);
  }
}

// happy-dom has no ResizeObserver, so RNW never fires onLayout on its own: deliver a
// node's measured width through the handler RNW attaches to it.
type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layOut(node: HTMLElement, width: number) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The node has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height: 120 } }, timeStamp: 1 }));
}

// The one horizontal scroller in the tree: RNW styles it overflow-x auto, or hidden
// with touch-action none while scrolling is disabled. Its content container (whose
// layout RNW reports as the content size) is its first child.
function scroller(): HTMLElement {
  const found = (Array.from(document.body.querySelectorAll("div")) as HTMLElement[]).filter((node) => {
    const { overflowX, touchAction } = getComputedStyle(node);
    return overflowX === "auto" || (overflowX === "hidden" && touchAction === "none");
  });
  if (found.length !== 1) throw new Error(`expected one horizontal scroller, found ${found.length}`);
  return found[0]!;
}
const content = () => scroller().firstElementChild as HTMLElement;
// Mount, then let the touch exploration read settle.
async function mounted(mount: () => void) {
  mount();
  await act(async () => {});
}
const takesDrags = () => getComputedStyle(scroller()).touchAction !== "none";

// Lay the scroller out `viewport` wide around content `contentWidth` wide.
function layOutScroller(viewport: number, contentWidth: number) {
  layOut(scroller(), viewport);
  layOut(content(), contentWidth);
}

// Fitting; overflowing; fitting again at a wider scrollport.
const STATES = [[600, 600, false], [320, 700, true], [900, 700, false]] as const;

const MANY = ["General", "Security", "Notifications", "Billing", "Integrations", "Advanced"];
const columns: BoardColumn[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
];
const items: BoardItem[] = [
  { id: "a", columnId: "todo", title: "Task A" },
  { id: "b", columnId: "doing", title: "Task B" },
];
const days = Array.from({ length: 21 }, (_, i) => ({ value: (i % 5) / 4, count: i, date: `2026-03-${String(i + 1).padStart(2, "0")}` }));

interface Case {
  name: string;
  entries: Array<[string, () => void]>;
  // The nodes that must survive every state, and a press on one of them.
  nodes: () => HTMLElement[];
  press: () => void;
  pressed: () => boolean;
}

let picked: unknown = null;
const cases: Case[] = [
  {
    name: "Tabs",
    entries: [
      ["web", () => ui(<Tabs tabs={MANY} testID="tabs" onSelect={(i) => { picked = i; }} />)],
      ["android", () => ui(<AndroidTabs tabs={MANY} testID="tabs" onSelect={(i) => { picked = i; }} />)],
    ],
    nodes: () => [screen.getByTestId("tabs"), ...screen.getAllByRole("tab")],
    press: () => fireEvent.click(screen.getByText("Billing")),
    pressed: () => picked === 3,
  },
  {
    name: "Board",
    entries: [
      ["web", () => ui(<Board columns={columns} items={items} onPressItem={(item) => { picked = item.id; }} />)],
      ["android", () => ui(<AndroidBoard columns={columns} items={items} onPressItem={(item) => { picked = item.id; }} />)],
    ],
    nodes: () => [screen.getByLabelText("Task A"), screen.getByLabelText("Move Task B")],
    press: () => fireEvent.click(screen.getByLabelText("Task A")),
    pressed: () => picked === "a",
  },
  {
    name: "calendar Heatmap",
    entries: [
      ["web", () => ui(<Heatmap calendar label="Activity" values={days} />)],
      ["android", () => ui(<AndroidHeatmap calendar label="Activity" values={days} />)],
    ],
    nodes: () => [screen.getByRole("img", { name: /^Activity/ }), ...dayCells()],
    // Pressing the ninth day (March 9, in the second week column) opens its inspect flag.
    press: () => fireEvent.click(dayCells()[8]!),
    pressed: () => screen.queryByText("Mar 9, 2026") != null,
  },
];

// The grid's day cells, in column order: its only 11px squares (the weekday
// gutter's rows are 11px tall but carry no width; 21 days fill three whole weeks,
// so no empty slot pads the last column).
function dayCells(): HTMLElement[] {
  return (Array.from(screen.getByRole("img", { name: /^Activity/ }).querySelectorAll("div")) as HTMLElement[]).filter(
    (node) => node.style.width === "11px" && node.style.height === "11px",
  );
}

for (const c of cases) {
  describe(`${c.name} horizontal scroller`, () => {
    for (const [entry, mount] of c.entries) {
      it(`takes a drag on Android only while its content overflows (${entry} entry)`, () => onPlatform("android", async () => {
        picked = null;
        await mounted(mount);
        const kept = [scroller(), ...c.nodes()];
        // Unmeasured, it cannot know it overflows.
        expect(takesDrags()).toBe(false);
        for (const [viewport, contentWidth, drags] of STATES) {
          layOutScroller(viewport, contentWidth);
          expect(takesDrags()).toBe(drags);
        }
        const now = [scroller(), ...c.nodes()];
        expect(now.length).toBe(kept.length);
        now.forEach((node, i) => expect(node).toBe(kept[i]!));
        c.press();
        expect(c.pressed()).toBe(true);
      }));

      it(`keeps its scroller taking drags on Android while TalkBack explores by touch (${entry} entry)`, () => onPlatform("android", async () => {
        await mounted(mount);
        for (const [viewport, contentWidth] of STATES) {
          layOutScroller(viewport, contentWidth);
          expect(takesDrags()).toBe(true);
        }
      }, true));

      it(`keeps its scroller taking drags on the web, fitting or not (${entry} entry)`, () => onPlatform("web", async () => {
        await mounted(mount);
        expect(takesDrags()).toBe(true);
        for (const [viewport, contentWidth] of STATES) {
          layOutScroller(viewport, contentWidth);
          expect(takesDrags()).toBe(true);
          expect(getComputedStyle(scroller()).overflowX).toBe("auto");
        }
      }));
    }
  });
}
