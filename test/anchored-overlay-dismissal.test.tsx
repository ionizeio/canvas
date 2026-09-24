import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { BackHandler, Platform } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { BreakpointOverride, useBreakpoint } from "../src/style/responsive.tsx";
import { webSkin as rowMenuSkin } from "../src/organisms/row-menu/row-menu.styles.ts";
import { webSkin as popoverSkin } from "../src/atoms/popover/popover.styles.tsx";
import { Text, View } from "react-native";

// Android's hardware back on an open anchored card. A reviewer opened a RowMenu on
// the Android docs app and pressed back: the page navigated away with the menu still
// open. The Dropdown did exactly the same, and so did every card AnchoredOverlay
// floats, because none of them had ever subscribed to back; only the full-screen
// overlays (Dialog, AlertDialog, Drawer, ActionSheet) and the Sidebar drill-down did.
// AnchoredOverlay now owns the subscription for all of them, so these cases lock the
// contract per consumer: open subscribes, back closes the card and is consumed (the
// navigator never sees it), and the subscription is gone once the card is.
//
// The harness runs react-native-web, whose BackHandler is a stub, so Platform is
// switched to Android and BackHandler.addEventListener recorded, the way the Dialog
// suite does it.

type Back = () => boolean | null | undefined;

function withBackEvents(run: (handlers: Set<Back>) => void, native = true) {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  const handlers = new Set<Back>();
  const add = spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
    expect(event).toBe("hardwareBackPress");
    handlers.add(handler);
    return { remove: () => { handlers.delete(handler); } };
  });
  const select = spyOn(Platform, "select").mockImplementation(specifics => native
    ? "android" in specifics ? specifics.android : "native" in specifics ? specifics.native : specifics.default
    : specifics.web ?? specifics.default);
  Object.defineProperty(Platform, "OS", { configurable: true, value: native ? "android" : "web" });
  try { run(handlers); } finally {
    cleanup();
    expect(handlers.size).toBe(0);
    add.mockRestore();
    select.mockRestore();
    Object.defineProperty(Platform, "OS", originalOS);
  }
}

// What Android does with one press: the newest subscription first, and an earlier one
// only while every later one declines. Returns whether anything consumed it; false is
// the press the navigator would have taken.
function pressBack(handlers: Set<Back>): boolean {
  let consumed = false;
  act(() => {
    for (const handler of [...handlers].reverse()) {
      if (handler()) { consumed = true; break; }
    }
  });
  return consumed;
}

const ui = (node: ReactElement, hosted: boolean) =>
  render(<ThemeProvider light solid>{hosted ? <OverlayProvider>{node}</OverlayProvider> : node}</ThemeProvider>);

const expanded = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-expanded") === "true";
// Whether any trigger or field reports its card open. A hosted list mounts only once
// its trigger measures a real box, which happy-dom never reports, so the lists are read
// from their combobox or trigger rather than from the list itself.
const anyExpanded = () => document.querySelector('[aria-expanded="true"]') != null;

interface Case {
  name: string;
  render: () => ReactElement;
  open: () => void;
  isOpen: () => boolean;
}

const cases: Case[] = [
  {
    name: "RowMenu",
    render: () => <RowMenu items={[{ label: "Edit" }, { label: "Delete", destructive: true }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
    isOpen: () => expanded("More options"),
  },
  {
    name: "Dropdown",
    render: () => <Dropdown trigger="Actions" items={[{ label: "Edit" }, { label: "Duplicate" }]} />,
    open: () => fireEvent.click(screen.getByText("Actions")),
    isOpen: () => expanded("Actions"),
  },
  {
    name: "Select",
    render: () => <Select options={["Small", "Medium", "Large"]} placeholder="Choose a size" />,
    open: () => fireEvent.click(screen.getByText("Choose a size")),
    isOpen: anyExpanded,
  },
  {
    name: "Popover",
    render: () => <Popover trigger="Details" title="Heads up" />,
    open: () => fireEvent.click(screen.getByText("Details")),
    isOpen: () => expanded("Details"),
  },
  {
    name: "Autocomplete",
    render: () => <Autocomplete options={["Apple", "Banana", "Cherry"]} />,
    open: () => fireEvent.click(screen.getByLabelText("Toggle options")),
    isOpen: anyExpanded,
  },
  {
    name: "ButtonGroup split menu",
    render: () => <ButtonGroup split items={["Save"]} menu={["Save as draft", "Save a copy"]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
    isOpen: () => expanded("More actions"),
  },
  {
    name: "Command",
    render: () => <Command trigger items={[{ label: "Open file" }]} />,
    open: () => fireEvent.click(screen.getByText("Search...")),
    isOpen: anyExpanded,
  },
];

describe("hardware back closes an open anchored card", () => {
  for (const { name, render: node, open, isOpen } of cases) {
    for (const hosted of [true, false]) {
      it(`${name} (${hosted ? "hosted" : "inline"}) subscribes while open, closes on back, and consumes it`, () => withBackEvents(handlers => {
        ui(node(), hosted);
        expect(handlers.size).toBe(0);
        open();
        expect(isOpen()).toBe(true);
        expect(handlers.size).toBeGreaterThan(0);
        expect(pressBack(handlers)).toBe(true);
        expect(isOpen()).toBe(false);
        // Closed, nothing is left listening: the next back belongs to the page.
        expect(handlers.size).toBe(0);
        expect(pressBack(handlers)).toBe(false);
      }));
    }
  }

  it("RowMenu and Dropdown register the same way: one subscription each, only while open", () => withBackEvents(handlers => {
    ui(
      <>
        <RowMenu items={[{ label: "Edit" }]} />
        <Dropdown trigger="Actions" items={[{ label: "Edit" }]} />
      </>,
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(handlers.size).toBe(1);
    pressBack(handlers);
    fireEvent.click(screen.getByText("Actions"));
    expect(handlers.size).toBe(1);
    pressBack(handlers);
    expect(handlers.size).toBe(0);
  }));

  it("reports a controlled close through onOpenChange and consumes back even when the owner stays open", () => withBackEvents(handlers => {
    const changes: boolean[] = [];
    ui(<RowMenu open items={[{ label: "Edit" }]} onOpenChange={next => changes.push(next)} />, true);
    expect(pressBack(handlers)).toBe(true);
    expect(pressBack(handlers)).toBe(true);
    expect(changes).toEqual([false, false]);
    expect(handlers.size).toBe(1);
  }));

  it("leaves back to the page when the card cannot close (pinned open, no onOpenChange)", () => withBackEvents(handlers => {
    ui(
      <>
        <RowMenu open items={[{ label: "Edit" }]} />
        <Dropdown trigger="Actions" open items={[{ label: "Edit" }]} />
      </>,
      true,
    );
    expect(handlers.size).toBe(0);
  }));

  it("closes a card nested in another card before its parent", () => withBackEvents(handlers => {
    ui(
      <Popover trigger="Details" title="Heads up">
        <Select options={["Small", "Large"]} placeholder="Choose a size" />
      </Popover>,
      false,
    );
    fireEvent.click(screen.getByText("Details"));
    const popoverBack = [...handlers][0]!;
    fireEvent.click(screen.getByText("Choose a size"));
    const listbox = () => document.querySelector('[role="listbox"]') != null;
    expect(listbox()).toBe(true);
    // Even the parent's own subscription routes through its escape scope to the open
    // child first, the way the Dialog's does.
    act(() => { expect(popoverBack()).toBe(true); });
    expect(listbox()).toBe(false);
    expect(expanded("Details")).toBe(true);
    expect(pressBack(handlers)).toBe(true);
    expect(expanded("Details")).toBe(false);
  }));

  it("never subscribes to the unsupported web BackHandler", () => withBackEvents(handlers => {
    ui(<RowMenu open onOpenChange={() => {}} items={[{ label: "Edit" }]} />, true);
    expect(handlers.size).toBe(0);
  }, false));
});

// A tap anywhere off an open card closes it, in the whole window. The reviewer's other
// finding: on the docs a tap beside the example stage left the menu open, on Android, iOS
// and the web alike, because the stage mounts its own OverlayProvider and the dismiss
// backdrop filled only that provider's outlet. A nested provider now frames the card (it
// is placed as before) while a card that can close paints, backdrop and all, in the
// window's outermost provider. These cases pin where each piece lands and that the card
// still lands at the frame's place.
describe("an outside tap anywhere in the window closes the card", () => {
  afterEach(cleanup);

  // The outlets are the full-bleed z-1000 layers; the frame's is the one inside the
  // `frame` wrapper, the window's the other.
  const outlets = (container: HTMLElement) => {
    const all = [...container.querySelectorAll("div")].filter(
      (d) => getComputedStyle(d).zIndex === "1000" && getComputedStyle(d).position === "absolute",
    );
    const frame = all.find((d) => d.closest('[data-testid="frame"]') != null)!;
    const window = all.find((d) => d !== frame)!;
    expect(frame).toBeDefined();
    expect(window).toBeDefined();
    return { frame, window };
  };
  // The backdrop is the outlet child pinned to all four edges.
  const backdropIn = (outlet: HTMLElement) =>
    [...outlet.children].find((c) => {
      const style = getComputedStyle(c);
      return style.top === "0px" && style.bottom === "0px" && style.left === "0px" && style.right === "0px";
    }) as HTMLElement | undefined;

  const nested = (node: ReactElement, { separateWindow = false } = {}) =>
    render(
      <ThemeProvider light solid>
        <OverlayProvider>
          <View testID="page">
            <View testID="frame">
              <OverlayProvider separateWindow={separateWindow} style={{ flex: 0 }}>{node}</OverlayProvider>
            </View>
          </View>
        </OverlayProvider>
      </ThemeProvider>,
    );

  // Give chosen nodes a real box (happy-dom reports 0x0, and a hosted card waits for a
  // measured trigger), then let the measure-and-place frame land.
  const withBoxes = async (boxes: () => Map<Element, { x: number; y: number; width: number; height: number }>, run: () => Promise<void>) => {
    const original = Element.prototype.getBoundingClientRect;
    const fallback = { x: 0, y: 0, width: 160, height: 32 };
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const { x, y, width, height } = boxes().get(this) ?? fallback;
      return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON: () => ({}) } as DOMRect;
    };
    try { await run(); } finally { Element.prototype.getBoundingClientRect = original; }
  };
  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  };
  const positioned = (outlet: HTMLElement) =>
    [...outlet.children].find((c) => c !== backdropIn(outlet)) as HTMLElement | undefined;

  it("paints the backdrop in the window's outermost outlet, not the nested one, and a tap there closes", () => {
    const changes: boolean[] = [];
    const { container } = nested(<RowMenu items={[{ label: "Edit" }]} onOpenChange={(next) => changes.push(next)} />);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const { frame, window } = outlets(container);
    expect(frame.children.length).toBe(0);
    const backdrop = backdropIn(window);
    expect(backdrop).toBeDefined();
    fireEvent.click(backdrop!);
    expect(changes).toEqual([true, false]);
    expect(expanded("More options")).toBe(false);
  });

  it("does the same for the Dropdown, the Select and the Popover", () => {
    for (const { node, open } of [
      { node: <Dropdown trigger="Actions" items={[{ label: "Edit" }]} />, open: () => fireEvent.click(screen.getByText("Actions")) },
      { node: <Select options={["Small", "Large"]} placeholder="Choose a size" />, open: () => fireEvent.click(screen.getByText("Choose a size")) },
      { node: <Popover trigger="Details" title="Heads up" />, open: () => fireEvent.click(screen.getByText("Details")) },
    ]) {
      const { container } = nested(node);
      open();
      const { frame, window } = outlets(container);
      expect(frame.children.length).toBe(0);
      fireEvent.click(backdropIn(window)!);
      expect(document.querySelector('[aria-expanded="true"]')).toBeNull();
      cleanup();
    }
  });

  it("places the card where its frame puts it, carried into the window's coordinates", async () => {
    // The window's outlet sits at (10, 5); the nested frame at (30, 105), 300 wide
    // and 200 tall; the trigger at (210, 150).
    let refs: { window?: Element; frame?: Element; trigger?: Element } = {};
    const WINDOW = { x: 10, y: 5, width: 400, height: 900 };
    const FRAME = { x: 30, y: 105, width: 300, height: 200 };
    const TRIGGER = { x: 210, y: 150, width: 32, height: 32 };
    await withBoxes(() => new Map([[refs.window!, WINDOW], [refs.frame!, FRAME], [refs.trigger!, TRIGGER]].filter(([el]) => el) as [Element, typeof WINDOW][]), async () => {
      const leading = nested(<RowMenu testID="trigger" items={[{ label: "Edit" }]} />);
      const found = outlets(leading.container);
      refs = { window: found.window, frame: found.frame, trigger: leading.container.querySelector('[data-testid="trigger"]')! };
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      await settle();
      const card = positioned(found.window)!;
      expect(card).toBeDefined();
      // Below the trigger, by its leading edge: the trigger's own window position less
      // the window outlet's, as if the card had painted in the frame.
      expect(card.style.left).toBe(`${TRIGGER.x - WINDOW.x}px`);
      expect(card.style.top).toBe(`${TRIGGER.y + TRIGGER.height + rowMenuSkin.menuGap - WINDOW.y}px`);
      cleanup();

      // A trailing-aligned card pins its right edge; the inset grows by the gap between
      // the frame's right edge and the window's.
      const trailing = nested(<Dropdown testID="trigger" trigger="Actions" alignEnd items={[{ label: "Edit" }]} />);
      const again = outlets(trailing.container);
      refs = { window: again.window, frame: again.frame, trigger: trailing.container.querySelector('[data-testid="trigger"]')! };
      fireEvent.click(screen.getByText("Actions"));
      await settle();
      const pinned = positioned(again.window)!;
      expect(pinned.style.right).toBe(`${WINDOW.x + WINDOW.width - (TRIGGER.x + TRIGGER.width)}px`);
      expect(pinned.style.left).toBe("");
    });
  });

  // Shared by the placement cases below: the window's outlet sits at (10, 5); the nested
  // frame at (30, 105), 300 wide and 200 tall.
  const WINDOW = { x: 10, y: 5, width: 400, height: 900 };
  const FRAME = { x: 30, y: 105, width: 300, height: 200 };
  type Box = typeof WINDOW;
  const boxesOf = (entries: [Element | undefined, Box][]) => new Map(entries.filter(([el]) => el) as [Element, Box][]);

  it("hands a card painted in the window only the room its frame would have given it", async () => {
    let refs: { window?: Element; frame?: Element; trigger?: Element } = {};
    const TRIGGER = { x: 210, y: 150, width: 32, height: 32 };
    await withBoxes(() => boxesOf([[refs.window, WINDOW], [refs.frame, FRAME], [refs.trigger, TRIGGER]]), async () => {
      const view = nested(<RowMenu testID="trigger" items={[{ label: "Edit" }]} />);
      const found = outlets(view.container);
      refs = { window: found.window, frame: found.frame, trigger: view.container.querySelector('[data-testid="trigger"]')! };
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      await settle();
      // Anchored by its leading edge 180 into a 300-wide frame, the card may grow 120
      // before it meets the frame's far edge, and no further in the wider window.
      expect(positioned(found.window)!.style.maxWidth).toBe(`${FRAME.width - (TRIGGER.x - FRAME.x)}px`);
      cleanup();

      // A card in its frame's own outlet already has exactly that room: no cap.
      const single = render(<ThemeProvider light solid><OverlayProvider><RowMenu testID="trigger" items={[{ label: "Edit" }]} /></OverlayProvider></ThemeProvider>);
      const outlet = [...single.container.querySelectorAll("div")].find((d) => getComputedStyle(d).zIndex === "1000")!;
      refs = { window: outlet, trigger: single.container.querySelector('[data-testid="trigger"]')! };
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      await settle();
      expect(positioned(outlet)!.style.maxWidth).toBe("");
    });
  });

  it("places a card opened inside a window-layer card by the same frame", async () => {
    // A popover near the frame's right edge, opened from inside another popover. Both
    // paint in the window; the inner one must still be clamped inside the frame, as it
    // was when both painted in the frame, not inside the wider window.
    let refs: { window?: Element; frame?: Element; outer?: Element; inner?: Element } = {};
    const OUTER = { x: 40, y: 120, width: 120, height: 32 };
    const INNER = { x: 250, y: 160, width: 60, height: 32 };
    await withBoxes(() => boxesOf([[refs.window, WINDOW], [refs.frame, FRAME], [refs.outer, OUTER], [refs.inner, INNER]]), async () => {
      const view = nested(
        <Popover testID="outer" trigger="Outer" title="Outer card">
          <Popover testID="inner" trigger="Inner" title="Inner card" />
        </Popover>,
      );
      const found = outlets(view.container);
      refs = { window: found.window, frame: found.frame, outer: view.container.querySelector('[data-testid="outer"]')! };
      fireEvent.click(screen.getByText("Outer"));
      await settle();
      refs.inner = document.querySelector('[data-testid="inner"]')!;
      expect(refs.inner).toBeDefined();
      fireEvent.click(screen.getByText("Inner"));
      await settle();
      const cards = [...found.window.children].filter((c) => c !== backdropIn(found.window) && getComputedStyle(c).top !== "0px");
      const innerCard = cards[cards.length - 1] as HTMLElement;
      expect(found.frame.children.length).toBe(0);
      // placeOverlay in the frame: the card's width fitted to the frame, its left edge
      // pulled in so the card ends 8 inside the frame's far edge, then carried into the
      // window's coordinates.
      const fitted = Math.min(popoverSkin.cardWidth, FRAME.width - 16);
      const inFrame = Math.max(8, Math.min(INNER.x - FRAME.x, FRAME.width - fitted - 8));
      expect(innerCard.style.left).toBe(`${inFrame + FRAME.x - WINDOW.x}px`);
    });
  });

  it("follows its trigger when the content scrolls under it with no layout event", async () => {
    let refs: { window?: Element; frame?: Element; trigger?: Element } = {};
    let frame = { ...FRAME };
    let trigger = { x: 210, y: 150, width: 32, height: 32 };
    await withBoxes(() => boxesOf([[refs.window, WINDOW], [refs.frame, frame], [refs.trigger, trigger]]), async () => {
      const view = nested(<RowMenu testID="trigger" items={[{ label: "Edit" }]} />);
      const found = outlets(view.container);
      refs = { window: found.window, frame: found.frame, trigger: view.container.querySelector('[data-testid="trigger"]')! };
      fireEvent.click(screen.getByRole("button", { name: "More options" }));
      await settle();
      const card = () => positioned(found.window)!;
      const below = (t: typeof trigger) => `${t.y + t.height + rowMenuSkin.menuGap - WINDOW.y}px`;
      expect(card().style.top).toBe(below(trigger));
      // The page scrolls 120 up, frame and trigger with it: a keyboard or scrollTo, which
      // no touch on the backdrop made and no layout event reports.
      frame = { ...frame, y: frame.y - 120 };
      trigger = { ...trigger, y: trigger.y - 120 };
      // The loop notices on its next frame and re-measures, a few frames in all.
      await waitFor(() => expect(card().style.top).toBe(below(trigger)));
    });
  });

  it("keeps a card that cannot close in its own frame, where it scrolls with the content", async () => {
    await withBoxes(() => new Map(), async () => {
      const { container } = nested(<RowMenu open items={[{ label: "Edit" }]} />);
      await settle();
      const { frame, window } = outlets(container);
      expect(window.children.length).toBe(0);
      expect(backdropIn(frame)).toBeUndefined();
      expect(positioned(frame)).toBeDefined();
    });
  });

  it("stops at a separate window: a provider in a Modal is its own layer", () => {
    const { container } = nested(<RowMenu items={[{ label: "Edit" }]} />, { separateWindow: true });
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    const { frame, window } = outlets(container);
    expect(window.children.length).toBe(0);
    expect(backdropIn(frame)).toBeDefined();
  });

  it("leaves a dialog in its nearest provider: only an anchored card moves to the window", () => {
    const { container } = nested(<Dialog overlay open onOpenChange={() => {}} title="Contained panel" />);
    const { frame, window } = outlets(container);
    expect(window.children.length).toBe(0);
    expect(frame.textContent).toContain("Contained panel");
  });

  it("carries the opener's simulated breakpoint into the window's outlet", async () => {
    const Bucket = () => <Text>{`bucket:${useBreakpoint()}`}</Text>;
    await withBoxes(() => new Map(), async () => {
      render(
        <ThemeProvider light solid>
          <OverlayProvider>
            <BreakpointOverride value="sm">
              <OverlayProvider style={{ flex: 0 }}>
                <Popover trigger="Details" title="Heads up"><Bucket /></Popover>
              </OverlayProvider>
            </BreakpointOverride>
          </OverlayProvider>
        </ThemeProvider>,
      );
      fireEvent.click(screen.getByText("Details"));
      await settle();
      expect(screen.getByText("bucket:sm")).toBeDefined();
    });
  });
});
