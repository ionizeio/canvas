import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { View } from "react-native";
import { Button } from "../src/atoms/button/button.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { AnchoredOverlay } from "../src/style/anchored-overlay.tsx";
import { Entrance } from "../src/style/entrance.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { hostedEntranceParts, layoutElement, layoutEntrance, layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);
const SIZE = { width: 240, height: 160 };
const themed = (node: ReactNode) => <ThemeProvider>{node}</ThemeProvider>;
const focus = (node: HTMLElement) => act(() => node.focus());

function Card({ open = true, onMount }: { open?: boolean; onMount: () => void }) {
  const trigger = useRef<View>(null);
  return <>
    <View ref={trigger}><Button>Card trigger</Button></View>
    <AnchoredOverlay open={open} onDismiss={() => {}} triggerRef={trigger} onCardMount={onMount}>
      <View testID="card-content"><Button>Card action</Button></View>
    </AnchoredOverlay>
  </>;
}

describe("anchored focus readiness", () => {
  it("an inline card is ready on mount and notifies once per opening", () => {
    let mounts = 0;
    const view = render(themed(<Card onMount={() => { mounts++; }} />));
    expect(mounts).toBe(1);
    expect(screen.getByRole("button", { name: "Card action" })).toBeTruthy();
    expect(screen.getByTestId("card-content").closest('[aria-hidden="true"]')).toBeNull();
    view.rerender(themed(<Card onMount={() => { mounts++; }} />));
    expect(mounts).toBe(1);
    view.rerender(themed(<Card open={false} onMount={() => { mounts++; }} />));
    expect(screen.queryByRole("button", { name: "Card action" })).toBeNull();
    view.rerender(themed(<Card onMount={() => { mounts++; }} />));
    expect(mounts).toBe(2);
  });

  it("waits for the enclosing entrance and creates a new notification on reopen", () => {
    let mounts = 0;
    const page = (ready: boolean, open = true) => themed(
      <Entrance ready={ready}><Card open={open} onMount={() => { mounts++; }} /></Entrance>,
    );
    const view = render(page(false));
    expect(mounts).toBe(0);
    expect(screen.getByTestId("card-content").closest('[aria-hidden="true"]')).not.toBeNull();
    view.rerender(page(true));
    expect(mounts).toBe(1);
    view.rerender(page(false));
    view.rerender(page(true));
    expect(mounts).toBe(1);
    view.rerender(page(true, false));
    view.rerender(page(true));
    expect(mounts).toBe(2);
  });

  it("does not notify a card closed while its enclosing entrance is still held", () => {
    let mounts = 0;
    const page = (open: boolean) => themed(<Entrance ready={false}><Card open={open} onMount={() => { mounts++; }} /></Entrance>);
    const view = render(page(true));
    const content = screen.getByTestId("card-content");
    view.rerender(page(false));
    expect(content.isConnected).toBe(false);
    expect(mounts).toBe(0);
  });

  it("a hosted card waits for its owner's fitting before it notifies", async () => {
    const measure = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, width: 640, height: 800,
      top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
    } as DOMRect);
    try {
      let mounts = 0;
      render(themed(<OverlayProvider><Card onMount={() => { mounts++; }} /></OverlayProvider>));
      const content = await screen.findByTestId("card-content");
      const nodes = hostedEntranceParts(content);
      expect(mounts).toBe(0);
      expect(screen.queryByRole("button", { name: "Card action" })).toBeNull();
      layoutElement(nodes.viewport, SIZE);
      layoutElement(nodes.content, SIZE);
      expect(mounts).toBe(0);
      layoutElement(nodes.card, SIZE);
      expect(mounts).toBe(1);
      expect(screen.getByRole("button", { name: "Card action" })).toBeTruthy();
    } finally { cleanup(); measure.mockRestore(); }
  });
});

for (const hosted of [false, true]) {
  describe(`Popover ${hosted ? "hosted" : "fallback"} readiness`, () => {
    async function fixture() {
      const measure = hosted ? spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0, y: 0, width: 640, height: 800,
        top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
      } as DOMRect) : undefined;
      const page = (open: boolean) => {
        const body = <><Button>Original opener</Button><Button>Elsewhere</Button>
          <Popover open={open} title="Information" onOpenChange={() => {}} actionLabel="Done" />
        </>;
        return themed(hosted ? <OverlayProvider>{body}</OverlayProvider> : body);
      };
      const view = render(page(false));
      const opener = screen.getByRole("button", { name: "Original opener" });
      focus(opener);
      view.rerender(page(true));
      // Inspect structural attachment only while it is intentionally hidden.
      const panel = await waitFor(() => {
        const node = document.querySelector<HTMLElement>('[role="dialog"]');
        expect(node).not.toBeNull();
        return node!;
      });
      const reveal = () => hosted ? layoutHostedEntrance(panel, SIZE) : layoutEntrance(panel, SIZE);
      return { view, page, panel, opener, reveal, restore: () => { cleanup(); measure?.mockRestore(); } };
    }

    it(hosted ? "captures the opener immediately and delays focus until the fit commits" : "captures the opener and focuses the panel at once", async () => {
      const f = await fixture();
      try {
        if (hosted) {
          expect(document.activeElement).toBe(f.opener);
          expect(screen.queryByRole("dialog")).toBeNull();
          focus(screen.getByRole("button", { name: "Elsewhere" }));
          f.reveal();
        }
        expect(screen.getByRole("dialog")).toBe(f.panel);
        expect(document.activeElement).toBe(f.panel);
        f.view.rerender(f.page(false));
        expect(document.activeElement).toBe(f.opener);
      } finally { f.restore(); }
    });

    it("restores the opener on close and focuses a reopened panel", async () => {
      const f = await fixture();
      try {
        f.view.rerender(f.page(false));
        expect(f.panel.isConnected).toBe(false);
        expect(document.activeElement).toBe(f.opener);
        f.view.rerender(f.page(true));
        const panel = await waitFor(() => {
          const node = document.querySelector<HTMLElement>('[role="dialog"]');
          expect(node).not.toBeNull();
          return node!;
        });
        expect(panel).not.toBe(f.panel);
        if (hosted) {
          expect(document.activeElement).toBe(f.opener);
          layoutHostedEntrance(panel, SIZE);
        }
        expect(document.activeElement).toBe(screen.getByRole("dialog"));
      } finally { f.restore(); }
    });
  });
}

it("a nested Popover waits for its ancestor, retains focus through refits, and restores on close", () => {
  const page = (ready: boolean, open: boolean) => themed(<>
    <Button>Opener</Button>
    <Entrance ready={ready}><Popover open={open} title="Nested" actionLabel="Done" /></Entrance>
  </>);
  const view = render(page(false, false));
  const opener = screen.getByRole("button", { name: "Opener" });
  focus(opener);
  view.rerender(page(false, true));
  const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
  layoutEntrance(panel, SIZE);
  expect(document.activeElement).toBe(opener);
  view.rerender(page(true, true));
  expect(document.activeElement).toBe(panel);
  const done = screen.getByRole("button", { name: "Done" });
  focus(done);
  let moves = 0;
  const moved = () => { moves++; };
  document.addEventListener("focusin", moved);
  try {
    for (let cycle = 0; cycle < 2; cycle++) {
      view.rerender(page(false, true));
      view.rerender(page(true, true));
      expect(document.activeElement).toBe(done);
    }
    expect(moves).toBe(0);
  } finally { document.removeEventListener("focusin", moved); }
  fireEvent.keyDown(done, { key: "Tab" });
  view.rerender(page(true, false));
  expect(document.activeElement).toBe(opener);
});

it("preserves ancestor readiness when a Popover moves into the provider's sibling outlet", async () => {
  const measure = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, width: 640, height: 800,
    top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
  } as DOMRect);
  const page = (ready: boolean, open: boolean) => themed(<OverlayProvider>
    <Button>Opener</Button>
    <Entrance ready={ready}><Popover open={open} title="Portaled child" /></Entrance>
  </OverlayProvider>);
  try {
    const view = render(page(false, false));
    const opener = screen.getByRole("button", { name: "Opener" });
    focus(opener);
    view.rerender(page(false, true));
    const panel = await waitFor(() => {
      const node = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(node).not.toBeNull();
      return node!;
    });
    layoutHostedEntrance(panel, SIZE);
    expect(document.activeElement).toBe(opener);
    view.rerender(page(true, true));
    await waitFor(() => expect(document.activeElement).toBe(panel));
    view.rerender(page(true, false));
    expect(document.activeElement).toBe(opener);
  } finally { cleanup(); measure.mockRestore(); }
});

it("notifies a portaled card once after its logical ancestor releases it", async () => {
  const measure = spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, width: 640, height: 800,
    top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
  } as DOMRect);
  let mounts = 0;
  const page = (ready: boolean, open = true) => themed(<OverlayProvider>
    <Entrance ready={ready}><Card open={open} onMount={() => { mounts++; }} /></Entrance>
  </OverlayProvider>);
  try {
    const view = render(page(false));
    layoutHostedEntrance(await screen.findByTestId("card-content"), SIZE);
    expect(mounts).toBe(0);
    view.rerender(page(true));
    await waitFor(() => expect(mounts).toBe(1));
    view.rerender(page(false));
    view.rerender(page(true));
    expect(mounts).toBe(1);
    view.rerender(page(false, false));
    view.rerender(page(false));
    layoutHostedEntrance(await screen.findByTestId("card-content"), SIZE);
    expect(mounts).toBe(1);
    view.rerender(page(false, false));
    view.rerender(page(true, false));
    expect(mounts).toBe(1);
  } finally { cleanup(); measure.mockRestore(); }
});
