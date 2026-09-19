import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, TextInput, View } from "react-native";
import { AnchoredOverlay } from "../src/style/anchored-overlay.tsx";
import { OverlayProvider, Portal } from "../src/style/portal.tsx";
import { EscapeLayerProvider, useEscapeLayer } from "../src/style/escape-layer.ts";
import { useDialogFocus } from "../src/style/use-dialog-focus.ts";
import { POPUP_PRESENTATION, PopupInteractionContext, PopupMotionPolicy, restingRadius, usePopupMotion, type PopupEdge, type PopupSize } from "../src/style/popup-motion.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { hostedEntranceParts, layoutElement, layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);

const SIZE = { width: 240, height: 160 };
function Probe({ open, enabled = true, ready = true, size = SIZE, edge = "top", radius, onExited = () => {} }: {
  open: boolean; enabled?: boolean; ready?: boolean; size?: PopupSize; edge?: PopupEdge; radius?: number; onExited?: () => void;
}) {
  const motion = usePopupMotion({ open, enabled, ready, size, edge, anchorX: 30, anchorY: 40, radius, onExited });
  return <>
    <Animated.View testID="motion-frame" style={[{ left: 0, top: 0, ...size }, motion.frame]} />
    <Animated.View testID="motion-content" style={[{ opacity: 1 }, motion.content]} />
    <Text testID="motion-readable">{motion.readable ? "readable" : "held"}</Text>
  </>;
}
function frame() {
  const { style } = screen.getByTestId("motion-frame");
  return { left: parseFloat(style.left), top: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) };
}
const corner = () => parseFloat(screen.getByTestId("motion-frame").style.borderRadius);
function content() {
  const { style } = screen.getByTestId("motion-content");
  return { opacity: parseFloat(style.opacity), transform: style.transform };
}
const readable = () => screen.getByTestId("motion-readable").textContent === "readable";
const ui = (body: ReactNode) => <ThemeProvider glass>{body}</ThemeProvider>;

describe("popup decorative spring", () => {
  for (const edge of ["top", "bottom", "left", "right"] as const) {
    it(`grows from the ${edge} anchor, deforms, and settles at exact resting bounds`, async () => {
      const { rerender, unmount } = render(ui(<Probe open={false} edge={edge} />));
      await act(async () => {});
      const clock = animationClock();
      try {
        rerender(ui(<Probe open edge={edge} />));
        expect(readable()).toBe(false);
        clock.advance(80);
        const moving = frame();
        expect(moving.width).toBeGreaterThan(0);
        expect(moving.height).toBeGreaterThan(0);
        if (edge === "top") expect(moving.top).toBe(0);
        if (edge === "bottom") expect(moving.top + moving.height).toBeCloseTo(SIZE.height, 4);
        if (edge === "left") expect(moving.left).toBe(0);
        if (edge === "right") expect(moving.left + moving.width).toBeCloseTo(SIZE.width, 4);
        if (edge === "top" || edge === "bottom") expect(moving.left / (SIZE.width - moving.width)).toBeCloseTo(30 / SIZE.width, 4);
        else expect(moving.top / (SIZE.height - moving.height)).toBeCloseTo(40 / SIZE.height, 4);
        expect(screen.getByTestId("motion-frame").style.transform).toBe("");
        clock.advance(1600);
        expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
        expect(readable()).toBe(true);
      } finally { unmount(); clock.restore(); }
    });
  }

  it("opens from a droplet with the rows inside it, overshoots, and rests at the skin's corner with the rows at identity", async () => {
    const { seed, across, content: fade } = POPUP_PRESENTATION;
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(ui(<Probe open radius={16} />));
      // The first paint is the droplet: a fraction of the resting height, narrower
      // than the card, rounder than the skin's corner, with the rows scaled to it
      // and part way through their fade. Not interactive yet.
      const droplet = frame();
      expect(droplet.height).toBeCloseTo(SIZE.height * seed, 4);
      expect(droplet.width).toBeCloseTo(SIZE.width * (across + (1 - across) * seed), 4);
      expect(droplet.top).toBe(0);
      expect(corner()).toBeGreaterThan(16);
      const rows = content();
      expect(rows.opacity).toBeCloseTo((seed - fade.fadeFrom) / (fade.fadeTo - fade.fadeFrom), 4);
      expect(rows.transform).toContain(`scale(${seed})`);
      expect(readable()).toBe(false);
      // The opening spring carries the pane past its resting height before it settles.
      let peak = 0;
      for (let step = 0; step < 40; step++) { clock.advance(16); peak = Math.max(peak, frame().height); }
      expect(peak).toBeGreaterThan(SIZE.height * 1.01);
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(corner()).toBe(16);
      expect(content().opacity).toBe(1);
      expect(content().transform).toMatch(/^translateX\(-?0px\) translateY\(-?0px\) scale\(1\)$/);
      expect(readable()).toBe(true);
    } finally { unmount(); clock.restore(); }
  });

  it("keeps a card's per-corner radii out of the droplet and reads a uniform one", () => {
    expect(restingRadius({ borderRadius: 16 })).toBe(16);
    expect(restingRadius([{ borderRadius: 16 }, { borderTopLeftRadius: 4 }])).toBeUndefined();
    expect(restingRadius({ padding: 8 })).toBeUndefined();
  });

  it("reverses a closing surface from its current bounds and ignores the canceled exit", async () => {
    let exits = 0;
    const onExited = () => { exits++; };
    const { rerender, unmount } = render(ui(<Probe open={false} onExited={onExited} />));
    await act(async () => {});
    exits = 0;
    const clock = animationClock();
    try {
      rerender(ui(<Probe open onExited={onExited} />));
      clock.advance(1600);
      rerender(ui(<Probe open={false} onExited={onExited} />));
      expect(readable()).toBe(false);
      clock.advance(80);
      const closing = frame();
      expect(closing.height).toBeLessThan(SIZE.height);
      rerender(ui(<Probe open onExited={onExited} />));
      expect(frame()).toEqual(closing);
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(readable()).toBe(true);
      expect(exits).toBe(0);
      rerender(ui(<Probe open={false} onExited={onExited} />));
      clock.advance(1600);
      expect(exits).toBe(1);
      expect(frame().height).toBe(0);
    } finally { unmount(); clock.restore(); }
  });

  it("completes an opening when new results resize the contour in flight", async () => {
    const { rerender, unmount } = render(ui(<Probe open={false} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(ui(<Probe open />));
      clock.advance(80);
      const resized = { width: 280, height: 224 };
      rerender(ui(<Probe open size={resized} />));
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...resized });
      expect(readable()).toBe(true);
    } finally { unmount(); clock.restore(); }
  });

  it("finishes a close before measurement without starting a spring", async () => {
    let exits = 0;
    const size = { width: 0, height: 0 };
    const onExited = () => { exits++; };
    const { rerender, unmount } = render(ui(<Probe open size={size} ready={false} onExited={onExited} />));
    await act(async () => {});
    const spring = spyOn(Animated, "spring");
    try {
      rerender(ui(<Probe open={false} size={size} ready={false} onExited={onExited} />));
      expect(exits).toBe(1);
      expect(spring).not.toHaveBeenCalled();
      expect(readable()).toBe(false);
    } finally { unmount(); spring.mockRestore(); }
  });

  it("snaps a moving pane when material capability is removed", async () => {
    const { rerender, unmount } = render(ui(<Probe open={false} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(ui(<Probe open />));
      clock.advance(80);
      rerender(ui(<Probe open enabled={false} />));
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(readable()).toBe(true);
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
    } finally { unmount(); clock.restore(); }
  });

  it("does not replay opening deformation when material capability returns on an already open pane", async () => {
    const { rerender, unmount } = render(ui(<Probe open enabled={false} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(ui(<Probe open />));
      clock.advance(80);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(readable()).toBe(true);
    } finally { unmount(); clock.restore(); }
  });

  it("snaps a moving pane when reduced motion is enabled", async () => {
    const original = AccessibilityInfo.addEventListener;
    const listeners = new Set<(reduced: boolean) => void>();
    const listener = spyOn(AccessibilityInfo, "addEventListener").mockImplementation((event, callback) => {
      if (event !== "reduceMotionChanged") return original(event, callback);
      listeners.add(callback);
      return { remove() { listeners.delete(callback); } };
    });
    const { rerender, unmount } = render(ui(<Probe open={false} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      rerender(ui(<Probe open />));
      clock.advance(80);
      act(() => listeners.forEach(notify => notify(true)));
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(readable()).toBe(true);
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      act(() => listeners.forEach(notify => notify(false)));
      clock.advance(80);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
    } finally { unmount(); clock.restore(); listener.mockRestore(); }
  });
});

function Card({ name = "A", open, onMount, children }: { name?: string; open: boolean; onMount?: () => void; children?: ReactNode }) {
  const trigger = useRef<View>(null);
  return <>
    <View ref={trigger}><Text>{name} trigger</Text></View>
    <PopupMotionPolicy.Provider value>
      <AnchoredOverlay open={open} onDismiss={() => {}} triggerRef={trigger} cardWidth={SIZE.width} onCardMount={onMount}>
        <View testID={`content-${name}`}><TextInput accessibilityLabel={`${name} draft`} defaultValue="unfinished" /></View>
        {children}
      </AnchoredOverlay>
    </PopupMotionPolicy.Provider>
  </>;
}

const bounds = () => spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
  x: 0, y: 0, width: 640, height: 800, top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
} as DOMRect);

describe("retained popup content and semantics", () => {
  it("keeps the same editor across reopening, with one focus readiness notification per accepted opening", async () => {
    const measure = bounds();
    let mounts = 0;
    const onMount = () => { mounts++; };
    const page = (open: boolean) => ui(<OverlayProvider><Card open={open} onMount={onMount} /></OverlayProvider>);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      view.rerender(page(true));
      clock.advance(32);
      const content = await screen.findByTestId("content-A");
      const nodes = hostedEntranceParts(content);
      layoutHostedEntrance(content, SIZE);
      expect(mounts).toBe(0);
      clock.advance(1600);
      expect(mounts).toBe(1);
      const editor = screen.getByRole("textbox", { name: "A draft" }) as HTMLInputElement;
      fireEvent.change(editor, { target: { value: "saved local editor state" } });
      act(() => { editor.focus(); editor.setSelectionRange(3, 8); });
      view.rerender(page(false));
      expect(screen.queryByRole("textbox", { name: "A draft" })).toBeNull();
      expect(editor.isConnected).toBe(true);
      expect(nodes.entrance.getAttribute("aria-hidden")).toBe("true");
      expect(getComputedStyle(nodes.entrance).pointerEvents).toBe("none");
      clock.advance(80);
      view.rerender(page(true));
      clock.advance(1600);
      expect(screen.getByRole("textbox", { name: "A draft" })).toBe(editor);
      expect(editor.value).toBe("saved local editor state");
      expect([editor.selectionStart, editor.selectionEnd]).toEqual([3, 8]);
      expect(mounts).toBe(2);
      view.rerender(page(true));
      layoutElement(nodes.card, { width: 260, height: 180 });
      clock.advance(1600);
      expect(mounts).toBe(2);
      view.rerender(page(false));
      clock.advance(1600);
      expect(editor.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("drops a closed owner before its trigger measurement arrives", async () => {
    const measure = bounds();
    let mounts = 0;
    const page = (open: boolean) => ui(<OverlayProvider><Card open={open} onMount={() => { mounts++; }} /></OverlayProvider>);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      view.rerender(page(true));
      view.rerender(page(false));
      clock.advance(1600);
      expect(screen.queryByTestId("content-A")).toBeNull();
      expect(mounts).toBe(0);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("raises A above B when A reopens during exit, preserving both editors", async () => {
    const measure = bounds();
    const page = (a: boolean, b: boolean) => ui(<OverlayProvider><Card open={a} /><Card name="B" open={b} /></OverlayProvider>);
    const view = render(page(false, false));
    await act(async () => {});
    const clock = animationClock();
    try {
      view.rerender(page(true, false));
      clock.advance(32);
      const a = await screen.findByTestId("content-A");
      layoutHostedEntrance(a, SIZE);
      clock.advance(1600);
      const aEditor = screen.getByRole("textbox", { name: "A draft" });
      view.rerender(page(false, true));
      clock.advance(32);
      const b = await screen.findByTestId("content-B");
      layoutHostedEntrance(b, SIZE);
      const bEditor = b.querySelector("textarea,input");
      const order = () => [...view.container.querySelectorAll('[data-testid^="content-"]')].map(node => node.getAttribute("data-testid"));
      expect(order()).toEqual(["content-A", "content-B"]);
      expect(screen.queryByRole("textbox", { name: "A draft" })).toBeNull();
      view.rerender(page(true, true));
      expect(order()).toEqual(["content-B", "content-A"]);
      clock.advance(1600);
      expect(screen.getByRole("textbox", { name: "A draft" })).toBe(aEditor);
      expect(screen.getByRole("textbox", { name: "B draft" })).toBe(bEditor);
      view.rerender(page(true, true));
      expect(order()).toEqual(["content-B", "content-A"]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("retires a portaled descendant's semantics and Escape owner when its retained parent closes", async () => {
    const measure = bounds();
    const dismissed: string[] = [];
    function OutsideOwner() { useEscapeLayer(true, () => dismissed.push("outside")); return null; }
    function NestedOwner() {
      const scope = useEscapeLayer(true, () => dismissed.push("nested"));
      return <EscapeLayerProvider scope={scope}><Card name="nested" open /></EscapeLayerProvider>;
    }
    function Parent({ open }: { open: boolean }) {
      const scope = useEscapeLayer(open, () => dismissed.push("parent"));
      return <EscapeLayerProvider scope={scope}><Card open={open}><NestedOwner /></Card></EscapeLayerProvider>;
    }
    const page = (open: boolean) => ui(<OverlayProvider><OutsideOwner /><Parent open={open} /></OverlayProvider>);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      view.rerender(page(true));
      clock.advance(32);
      const parent = await screen.findByTestId("content-A");
      layoutHostedEntrance(parent, SIZE);
      clock.advance(1600);
      const nested = await screen.findByTestId("content-nested");
      layoutHostedEntrance(nested, SIZE);
      clock.advance(1600);
      expect(screen.getByRole("textbox", { name: "nested draft" })).toBeTruthy();
      view.rerender(page(false));
      expect(parent.isConnected).toBe(true);
      expect(screen.queryByRole("textbox", { name: "nested draft" })).toBeNull();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.keyUp(document, { key: "Escape" });
      expect(dismissed).toEqual(["outside"]);
      clock.advance(1600);
      expect(parent.isConnected).toBe(false);
      expect(nested.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});

describe("retained popup interaction context", () => {
  it("passes through Portal and releases a retained panel's focus trap", () => {
    function FocusPanel() {
      const ref = useDialogFocus(true);
      return <View ref={ref} tabIndex={-1} testID="focus-panel">
        <Pressable accessibilityRole="button"><Text>First</Text></Pressable>
        <Pressable accessibilityRole="button"><Text>Last</Text></Pressable>
      </View>;
    }
    const page = (mounted: boolean, interactive: boolean) => ui(<OverlayProvider>
      <Pressable accessibilityRole="button" testID="original-opener"><Text>Open</Text></Pressable>
      {mounted && <PopupInteractionContext.Provider value={interactive}><Portal><FocusPanel /></Portal></PopupInteractionContext.Provider>}
    </OverlayProvider>);
    const view = render(page(false, true));
    const opener = screen.getByTestId("original-opener");
    act(() => opener.focus());
    view.rerender(page(true, true));
    const panel = screen.getByTestId("focus-panel");
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    act(() => last.focus());
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    view.rerender(page(true, false));
    expect(screen.getByTestId("focus-panel")).toBe(panel);
    expect(document.activeElement).toBe(opener);
    act(() => last.focus());
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(last);
    view.rerender(page(true, true));
    expect(document.activeElement).toBe(panel);
  });

  for (const runtime of ["ios", "android"] as const) {
    it(`${runtime}: an inactive retained branch cannot receive native dismissal`, () => {
      const select = spyOn(Platform, "select").mockImplementation(specifics =>
        runtime in specifics ? specifics[runtime] : "native" in specifics ? specifics.native : specifics.default,
      );
      const dismissed: string[] = [];
      let nested: ReturnType<typeof useEscapeLayer> | null = null;
      let root: ReturnType<typeof useEscapeLayer> | null = null;
      function Nested() { nested = useEscapeLayer(true, () => dismissed.push("nested")); return <Text>Retained child</Text>; }
      function Fixture({ interactive }: { interactive: boolean }) {
        root = useEscapeLayer(true, () => dismissed.push("root"));
        return <PopupInteractionContext.Provider value={interactive}><Portal><EscapeLayerProvider scope={root}><Nested /></EscapeLayerProvider></Portal></PopupInteractionContext.Provider>;
      }
      const page = (interactive: boolean) => ui(<OverlayProvider><Fixture interactive={interactive} /></OverlayProvider>);
      const view = render(page(true));
      try {
        act(() => root!.onAccessibilityEscape());
        expect(dismissed).toEqual(["nested"]);
        const oldNested = nested!;
        view.rerender(page(false));
        act(() => oldNested.onAccessibilityEscape());
        act(() => oldNested.onRequestClose());
        expect(dismissed).toEqual(["nested"]);
        act(() => root!.onAccessibilityEscape());
        expect(dismissed).toEqual(["nested", "root"]);
      } finally { view.unmount(); select.mockRestore(); }
    });
  }
});
