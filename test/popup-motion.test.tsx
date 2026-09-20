import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, TextInput, View } from "react-native";
import { AnchoredOverlay, popupOrigin } from "../src/style/anchored-overlay.tsx";
import { OverlayProvider, Portal } from "../src/style/portal.tsx";
import { EscapeLayerProvider, useEscapeLayer } from "../src/style/escape-layer.ts";
import { useDialogFocus } from "../src/style/use-dialog-focus.ts";
import { HANDOFF_RETURN, POPUP_PRESENTATION, PopupInteractionContext, PopupMotionPolicy, handoffAcross, restingRadius, usePopupMotion, type PopupEdge, type PopupOrigin, type PopupSize } from "../src/style/popup-motion.tsx";
import { supportsNativeDriver } from "../src/style/motion.ts";
import { PopupHandoffContext, PopupHandoffForeground, usePopupHandoff, shapeRadius, type PopupHandoff, type PopupHandoffValue } from "../src/style/popup-handoff.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { GLASS_LENS_ID, sizedGlassLensCount } from "../src/style/glass-surface/glass-lens.ts";
import { animationClock } from "./liquid-motion-clock.ts";
import { hostedEntranceParts, layoutElement, layoutHostedEntrance } from "./entrance-layout.ts";

afterEach(cleanup);

const SIZE = { width: 240, height: 160 };
function Probe({ open, enabled = true, ready = true, size = SIZE, edge = "top", radius, origin, progress, onExited = () => {} }: {
  open: boolean; enabled?: boolean; ready?: boolean; size?: PopupSize; edge?: PopupEdge; radius?: number;
  origin?: PopupOrigin; progress?: Animated.Value; onExited?: () => void;
}) {
  const motion = usePopupMotion({ open, enabled, ready, size, edge, anchorX: 30, anchorY: 40, radius, origin, progress, onExited });
  return <>
    <Animated.View testID="motion-frame" style={[{ left: 0, top: 0, ...size }, motion.frame]} />
    <Animated.View testID="motion-content" style={[{ opacity: 1 }, motion.content]} />
    {motion.blend ? <Animated.View testID="motion-blend" style={{ opacity: motion.blend.trigger }} /> : null}
    <Text testID="motion-readable">{motion.readable ? "readable" : "held"}</Text>
  </>;
}
const triggerFill = () => parseFloat(screen.getByTestId("motion-blend").style.opacity);
// The frame is a transform of the material's resting box (never a re-laid-out width or
// offset, so the native driver can run it), so the box a viewer sees is read back off
// the transform string: a scale about the centre, then a translation.
function transformOf(node: HTMLElement) {
  const parts = { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };
  for (const [, name, value] of node.style.transform.matchAll(/(translateX|translateY|scaleX|scaleY|scale)\(([-\d.e]+)(?:px)?\)/g)) {
    const number = parseFloat(value);
    if (name === "scale") { parts.scaleX = number; parts.scaleY = number; } else parts[name as keyof typeof parts] = number;
  }
  return parts;
}
// Painted pixels: reconstructing an edge from a scale and a shift leaves 1e-15 of noise.
const exact = (value: number) => { const rounded = Math.round(value * 1e9) / 1e9; return rounded === 0 ? 0 : rounded; };
function frame() {
  const node = screen.getByTestId("motion-frame");
  const { translateX, translateY, scaleX, scaleY } = transformOf(node);
  const box = { width: parseFloat(node.style.width), height: parseFloat(node.style.height) };
  const width = box.width * scaleX;
  const height = box.height * scaleY;
  return { left: exact((box.width - width) / 2 + translateX), top: exact((box.height - height) / 2 + translateY), width: exact(width), height: exact(height) };
}
/** The material's box is never re-laid out: its layout keys stay the resting ones. */
const restingBox = () => {
  const { style } = screen.getByTestId("motion-frame");
  return { left: style.left, top: style.top, width: style.width, height: style.height };
};
// The corner the viewer sees on the axis the presentation keeps exact (the seed
// shape's shorter side, which for every fixture here is the anchor axis, y): the
// uniform radius the unscaled box wears, scaled with that axis.
const corner = () => {
  const node = screen.getByTestId("motion-frame");
  return parseFloat(node.style.borderRadius) * transformOf(node).scaleY;
};
const near = (box: ReturnType<typeof frame>, expected: ReturnType<typeof frame>) => {
  expect(box.left).toBeCloseTo(expected.left, 6);
  expect(box.top).toBeCloseTo(expected.top, 6);
  expect(box.width).toBeCloseTo(expected.width, 6);
  expect(box.height).toBeCloseTo(expected.height, 6);
};
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
        // The box itself is never re-laid out: the frame is a transform of it.
        expect(restingBox()).toEqual({ left: "0px", top: "0px", width: "240px", height: "160px" });
        clock.advance(1600);
        expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
        expect(screen.getByTestId("motion-frame").style.transform).toMatch(/^translateX\(-?0px\) translateY\(-?0px\) scaleX\(1\) scaleY\(1\)$/);
        expect(readable()).toBe(true);
      } finally { unmount(); clock.restore(); }
    });
  }

  it("opens from a droplet with the rows inside it, overshoots, and rests at the skin's corner with the rows at identity", async () => {
    const { seed, across, content: fade } = POPUP_PRESENTATION;
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} />));
    await act(async () => {});
    const clock = animationClock();
    // Every spring of the presentation asks for the platform's driver (the native
    // module on iOS and Android, the JS driver on the web): the frame is transforms,
    // opacity and a radius so it can, and the material's box is never re-laid out.
    const springs: Array<{ useNativeDriver?: boolean }> = [];
    const engine = require("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation").default as typeof Animated;
    const spring = spyOn(Animated, "spring").mockImplementation((value, config) => { springs.push(config); return engine.spring(value, config); });
    try {
      rerender(ui(<Probe open radius={16} />));
      expect(springs.length).toBeGreaterThan(0);
      for (const config of springs) expect(config.useNativeDriver).toBe(supportsNativeDriver);
      expect(restingBox()).toEqual({ left: "0px", top: "0px", width: "240px", height: "160px" });
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
    } finally { unmount(); spring.mockRestore(); clock.restore(); }
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

// The trigger's side of the hand-off: the material and label opacities the trigger's
// subtree paints from, read back off the DOM as the owner-held travel value moves.
function HandoffProbe({ active = true, onChannel }: { active?: boolean; onChannel: (handoff: PopupHandoff, context: PopupHandoffValue | null) => void }) {
  const { handoff, context } = usePopupHandoff(active);
  onChannel(handoff, context);
  return (
    <PopupHandoffContext.Provider value={context}>
      {context ? <Animated.View testID="handoff-material" style={{ opacity: context.material }} /> : <Text testID="handoff-none">none</Text>}
      <PopupHandoffForeground><Text testID="handoff-label">label</Text></PopupHandoffForeground>
    </PopupHandoffContext.Provider>
  );
}
const materialOpacity = () => parseFloat(screen.getByTestId("handoff-material").style.opacity);
const labelOpacity = () => parseFloat((screen.getByTestId("handoff-label").parentElement as HTMLElement).style.opacity);

describe("the button-to-menu hand-off", () => {
  // A pill 100 by 32 whose top sits 40 above the card, its own corner 16.
  const ORIGIN: PopupOrigin = { x: 20, y: -40, width: 100, height: 32, radius: 16 };
  const { seed, handoff } = POPUP_PRESENTATION;

  it("is the trigger's pill at progress 0, a pill-wide droplet at the seed, and the card at rest", async () => {
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} origin={ORIGIN} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      // Closed: the material sits exactly on the pill, wearing its corner and the
      // trigger's own under-fill.
      near(frame(), { left: 20, top: -40, width: 100, height: 32 });
      expect(corner()).toBeCloseTo(16, 6);
      expect(triggerFill()).toBe(1);
      rerender(ui(<Probe open radius={16} origin={ORIGIN} />));
      // The first paint: the pill's width held (the seed is under `widen`), a share
      // of the way down to the card's height, centred where the pill was, rounder
      // than either the pill or the card, with the rows scaled from the pill's centre.
      const droplet = frame();
      expect(handoffAcross(seed)).toBe(0);
      expect(droplet.width).toBeCloseTo(100, 6);
      expect(droplet.height).toBeCloseTo(32 + (SIZE.height - 32) * seed, 4);
      expect(droplet.left).toBeCloseTo(20, 6);
      const centreY = -24 + (SIZE.height / 2 + 24) * seed;
      expect(droplet.top).toBeCloseTo(centreY - droplet.height / 2, 4);
      expect(corner()).toBeCloseTo(Math.max(16, 0.5 * Math.min(100, droplet.height)), 4);
      expect(content().transform).toContain(`scale(${seed})`);
      expect(content().transform).toContain(`translateX(${(70 - SIZE.width / 2) * (1 - seed)}px)`);
      // The under-fill is still mostly the trigger's at the seed and the pane's own once past `tint`.
      expect(triggerFill()).toBeCloseTo(1 - seed / handoff.tint, 4);
      expect(readable()).toBe(false);
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(corner()).toBe(16);
      expect(triggerFill()).toBe(0);
      expect(content().transform).toMatch(/^translateX\(-?0px\) translateY\(-?0px\) scale\(1\)$/);
      expect(readable()).toBe(true);
    } finally { unmount(); clock.restore(); }
  });

  it("narrows to the pill before its height is gone on close, re-forms the pill exactly, and hands back at 0", async () => {
    let exits = 0;
    const progress = new Animated.Value(0);
    const onExited = () => { exits++; };
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} origin={ORIGIN} progress={progress} onExited={onExited} />));
    await act(async () => {});
    exits = 0;
    const clock = animationClock();
    try {
      rerender(ui(<Probe open radius={16} origin={ORIGIN} progress={progress} onExited={onExited} />));
      clock.advance(1600);
      expect((progress as unknown as { __getValue: () => number }).__getValue()).toBe(1);
      rerender(ui(<Probe open={false} radius={16} origin={ORIGIN} progress={progress} onExited={onExited} />));
      // Somewhere in the close the pane is the pill's width (give or take the
      // contour's squash) while still taller than the pill: the drop hanging under
      // the button, absorbing upward.
      let drop = false;
      let widest = 0;
      for (let step = 0; step < 60 && exits === 0; step++) {
        clock.advance(16);
        const moving = frame();
        widest = Math.max(widest, moving.width);
        if (Math.abs(moving.width - 100) < 3 && moving.height > 40) drop = true;
        // The material never paints its return before the snap: the trigger's own
        // material is only back at exactly 0.
        const value = (progress as unknown as { __getValue: () => number }).__getValue();
        if (value > 0) expect(value).toBeGreaterThan(HANDOFF_RETURN);
      }
      expect(widest).toBeGreaterThan(100);
      expect(drop).toBe(true);
      expect(exits).toBe(1);
      expect((progress as unknown as { __getValue: () => number }).__getValue()).toBe(0);
      // At the hand-back the travel is exactly the pill; the contour's last recoil is
      // within a tenth of a pixel of it and settles on its own.
      const handed = frame();
      expect(Math.abs(handed.width - 100)).toBeLessThan(0.2);
      expect(Math.abs(handed.height - 32)).toBeLessThan(0.2);
      clock.advance(1600);
      near(frame(), { left: 20, top: -40, width: 100, height: 32 });
      expect(corner()).toBeCloseTo(16, 6);
    } finally { unmount(); clock.restore(); }
  });

  it("gives the trigger a material that is 1 only at rest and a label that returns over it once the pane has left", async () => {
    let channel: PopupHandoff | null = null;
    render(<HandoffProbe onChannel={(value) => { channel = value; }} />);
    await act(async () => {});
    // The label's return is a timed fade; drive the real engine's timing through the
    // clock (the test mock would finish it in the same tick as the snap).
    const clock = animationClock();
    const engine = require("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation").default as typeof Animated;
    const timing = spyOn(Animated, "timing").mockImplementation(engine.timing);
    try {
      const travel = channel!.progress;
      expect(channel!.fromTrigger).toBe(true);
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(1);
      // The pane exists: the material is gone at once, the label over its short
      // fade (the droplet covers it; the native glass can trail the commit a frame).
      act(() => travel.setValue(seed));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(1);
      clock.advance(handoff.label.hideMs + 32);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(1));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(0.3));
      expect(labelOpacity()).toBe(0);
      // The tail of a close: anything above the snap keeps both hidden, even 8e-6.
      act(() => travel.setValue(0.001));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(8e-6));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(0);
      // The snap: the material is back at once, the label starts its fade from 0 and
      // is back over `returnMs`, never showing over the standing-in pane.
      act(() => travel.setValue(0));
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(0);
      clock.advance(handoff.label.returnMs / 2);
      const midway = labelOpacity();
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(1);
      clock.advance(handoff.label.returnMs);
      expect(labelOpacity()).toBe(1);
      expect(materialOpacity()).toBe(1);
      // A reopen while the label is still returning turns it back out.
      act(() => travel.setValue(0));
      act(() => travel.setValue(seed));
      clock.advance(handoff.label.hideMs + 32);
      expect(labelOpacity()).toBe(0);
    } finally { timing.mockRestore(); clock.restore(); }
  });

  it("keeps the largest reported shape as the pill and renders nothing of its own when inactive", () => {
    let channel: PopupHandoff | null = null;
    let value: PopupHandoffValue | null = null;
    const { rerender } = render(<HandoffProbe onChannel={(h, c) => { channel = h; value = c; }} />);
    // An account capsule reports its avatar's disc as well as the capsule: the capsule wins by area.
    value!.report({ radius: 12, width: 24, height: 24, layer: "control" });
    value!.report({ radius: 9999, width: 120, height: 36, layer: "control" });
    value!.report({ radius: 4, width: 10, height: 10, layer: "content" });
    expect(channel!.shape.current).toEqual({ radius: 9999, area: 120 * 36, layer: "control" });
    const before = channel!.progress;
    rerender(<HandoffProbe active={false} onChannel={(h, c) => { channel = h; value = c; }} />);
    // The travel value outlives the activation, so a pane that is out keeps driving it.
    expect(channel!.progress).toBe(before);
    expect(channel!.fromTrigger).toBe(false);
    expect(value).toBeNull();
    expect(screen.getByTestId("handoff-none")).toBeDefined();
    // Without a hand-off the fader is a fragment: the label's parent carries no opacity.
    expect((screen.getByTestId("handoff-label").parentElement as HTMLElement).style.opacity).toBe("");
  });

  it("reads a trigger's corner from its shape and caps the origin at the capsule the box allows", () => {
    expect(shapeRadius({ borderRadius: 9999 })).toBe(9999);
    expect(shapeRadius([{ borderRadius: 8 }, { borderTopLeftRadius: 12 }])).toBe(12);
    expect(shapeRadius({ padding: 4 })).toBe(0);
    const rect = { x: 100, y: 50, width: 120, height: 36 };
    expect(popupOrigin(rect, 100, 90, 9999)).toEqual({ x: 0, y: -40, width: 120, height: 36, radius: 18 });
    expect(popupOrigin(rect, 40, 90, 8)).toEqual({ x: 60, y: -40, width: 120, height: 36, radius: 8 });
    expect(popupOrigin(rect, 100, 90, undefined)!.radius).toBe(18);
    expect(popupOrigin(rect, undefined, 90, 8)).toBeUndefined();
    expect(popupOrigin(rect, 100, undefined, 8)).toBeUndefined();
    expect(popupOrigin(null, 100, 90, 8)).toBeUndefined();
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

  it("gives the pane's web lens one def sized for the measured card from the first frame of the travel", async () => {
    // The material wrapper is resized on almost every frame of the opening, and a
    // lens that measured itself would build a fresh filter definition (an isolated
    // SVG document in Chromium) per frame. The pane's lens takes the card's measured
    // bounds through the material motion instead, so its url is the resting def while
    // the spring is still travelling, and the registry holds exactly one def for it.
    Object.defineProperty(window.navigator, "userAgent", { value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", configurable: true });
    const measure = bounds();
    const page = (open: boolean) => ui(<OverlayProvider><Card open={open} /></OverlayProvider>);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      const before = sizedGlassLensCount();
      view.rerender(page(true));
      clock.advance(32);
      const content = await screen.findByTestId("content-A");
      const nodes = hostedEntranceParts(content);
      layoutHostedEntrance(content, SIZE);
      clock.advance(80);
      // Mid-travel: the pane is still growing toward SIZE.
      const lens = nodes.entrance.querySelector("[style*='backdrop-filter']") as HTMLElement;
      expect(lens.style.backdropFilter).toBe(`url(#${GLASS_LENS_ID}-${SIZE.width}x${SIZE.height})`);
      expect(sizedGlassLensCount()).toBe(before + 1);
      clock.advance(1600);
      expect(lens.style.backdropFilter).toBe(`url(#${GLASS_LENS_ID}-${SIZE.width}x${SIZE.height})`);
      expect(sizedGlassLensCount()).toBe(before + 1);
      // A card that re-measures (new results) moves the def once, to the new rest.
      layoutElement(nodes.card, { width: 260, height: 180 });
      clock.advance(1600);
      expect(lens.style.backdropFilter).toBe(`url(#${GLASS_LENS_ID}-260x180)`);
      expect(sizedGlassLensCount()).toBe(before + 1);
      view.rerender(page(false));
      clock.advance(1600);
      expect(sizedGlassLensCount()).toBe(before);
    } finally {
      view.unmount(); clock.restore(); measure.mockRestore();
      delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
    }
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
