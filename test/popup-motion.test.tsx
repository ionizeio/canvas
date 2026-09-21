import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { AnchoredOverlay, popupOrigin } from "../src/style/anchored-overlay.tsx";
import { OverlayProvider, Portal } from "../src/style/portal.tsx";
import { EscapeLayerProvider, useEscapeLayer } from "../src/style/escape-layer.ts";
import { useDialogFocus } from "../src/style/use-dialog-focus.ts";
import { HANDOFF_RETURN, POPUP_PRESENTATION, PopupInteractionContext, PopupMotionPolicy, fieldCoverMark, handoffAcross, restingRadius, usePopupMotion, type PopupEdge, type PopupOrigin, type PopupSize } from "../src/style/popup-motion.tsx";
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
    {motion.presence ? <Animated.View testID="motion-presence" style={{ opacity: motion.presence }} /> : null}
    <Animated.View testID="motion-focus" style={motion.focus ? { filter: motion.focus.filter, opacity: motion.focus.opacity } as unknown as ViewStyle : null} />
    <Text testID="motion-readable">{motion.readable ? "readable" : "held"}</Text>
    <Text testID="motion-retiring">{motion.retiring ? "retiring" : "settled"}</Text>
  </>;
}
const presence = () => parseFloat(screen.getByTestId("motion-presence").style.opacity);
const focus = () => { const { style } = screen.getByTestId("motion-focus"); return { filter: style.filter, opacity: style.opacity }; };
const retiring = () => screen.getByTestId("motion-retiring").textContent === "retiring";
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
const valueOf = (value: Animated.Value) => (value as unknown as { __getValue: () => number }).__getValue();
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
      expect(transformOf(screen.getByTestId("motion-content")).scaleX).toBeCloseTo(seed, 9);
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
function HandoffProbe({ active = true, field, onChannel }: { active?: boolean; field?: { gap: number }; onChannel: (handoff: PopupHandoff, context: PopupHandoffValue | null) => void }) {
  const { handoff, context } = usePopupHandoff(active, field ? { field } : undefined);
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
  // A pill 100 by 32 whose top sits 40 above the card, its own corner 16; the drop
  // hangs from its bottom edge (a whole trigger, not a field).
  const ORIGIN: PopupOrigin = { x: 20, y: -40, width: 100, height: 32, radius: 16, hangs: true };
  const { seed, birth, handoff } = POPUP_PRESENTATION;

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
      // The first paint: the pill's width held (the seed is under `widen`), the
      // birth's share of the card's height, hanging from the pill's BOTTOM edge (the
      // pill's spot is empty, the drop's tip on its far edge, less the seed's share
      // of the edge's travel above the slide mark), rounder than either the pill or
      // the card, with the rows scaled from the pane's centre.
      const droplet = frame();
      expect(handoffAcross(seed)).toBe(0);
      expect(droplet.width).toBeCloseTo(100, 6);
      expect(droplet.height).toBeCloseTo(Math.max(32, birth.along * SIZE.height), 4);
      expect(droplet.left).toBeCloseTo(20, 6);
      const far = ORIGIN.y + ORIGIN.height;
      expect(droplet.top).toBeCloseTo(far + (0 - far) * ((seed - handoff.slide) / (1 - handoff.slide)), 4);
      expect(corner()).toBeCloseTo(Math.max(16, 0.5 * Math.min(100, droplet.height)), 4);
      expect(transformOf(screen.getByTestId("motion-content")).scaleX).toBeCloseTo(seed, 9);
      expect(transformOf(screen.getByTestId("motion-content")).translateX).toBeCloseTo((70 - SIZE.width / 2) * (1 - seed), 9);
      expect(transformOf(screen.getByTestId("motion-content")).translateY).toBeCloseTo(droplet.top + droplet.height / 2 - SIZE.height / 2, 4);
      // The under-fill is the trigger's whole at the seed (the drop is born with the
      // pill's tone) and the pane's own once past `tint`.
      expect(triggerFill()).toBe(1);
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

  it("gives the trigger a material that is back from the re-form mark down and a label that returns over it once the pane has left", async () => {
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
      // The pane exists: the material and the label are gone in the same frame (the
      // droplet takes their place, the way the reference's pill vanishes whole).
      act(() => travel.setValue(seed));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(1));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(0.5));
      expect(labelOpacity()).toBe(0);
      expect(materialOpacity()).toBe(0);
      // The tail of a close: anything above the re-form mark keeps the material
      // hidden, even a hair above it; from the mark down the pill is a body of its
      // own under the drop, the label still hidden until the snap.
      act(() => travel.setValue(handoff.reform + 1e-6));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(handoff.reform));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(handoff.reform - 1e-6));
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(0.001));
      expect(materialOpacity()).toBe(1);
      act(() => travel.setValue(8e-6));
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(0);
      // The snap: the label waits out the merge (`returnDelayMs`, counted on frames),
      // then starts its fade from 0 and is back over `returnMs`, never showing over
      // the standing-in pane.
      act(() => travel.setValue(0));
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(0);
      clock.advance(handoff.label.returnDelayMs - 16);
      expect(labelOpacity()).toBe(0);
      clock.advance(32 + handoff.label.returnMs / 2);
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
    expect(channel!.shape.current).toEqual({ radius: 9999, area: 120 * 36, height: 36, layer: "control" });
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
    expect(popupOrigin(rect, 100, 90, 9999)).toEqual({ x: 0, y: -40, width: 120, height: 36, radius: 18, hangs: true });
    expect(popupOrigin(rect, 40, 90, 8)).toEqual({ x: 60, y: -40, width: 120, height: 36, radius: 8, hangs: true });
    // A field's drop is born over its box rather than hanging under it.
    expect(popupOrigin(rect, 40, 90, 8, false)!.hangs).toBe(false);
    expect(popupOrigin(rect, 100, 90, undefined)!.radius).toBe(18);
    expect(popupOrigin(rect, undefined, 90, 8)).toBeUndefined();
    expect(popupOrigin(rect, 100, undefined, 8)).toBeUndefined();
    expect(popupOrigin(null, 100, 90, 8)).toBeUndefined();
  });
});

describe("the birth, the settle and the dismiss of a hand-off pane", () => {
  // A pill 100 by 32 whose top sits 40 above the card, its own corner 16.
  const ORIGIN: PopupOrigin = { x: 20, y: -40, width: 100, height: 32, radius: 16, hangs: true };
  const { seed, birth, radius: { settle }, dismiss, handoff } = POPUP_PRESENTATION;
  // The timings here (the fills, the sharpening, the settle, the ghosts) run on the
  // real engine under the clock, as the springs do: the test mock finishes a timing
  // in the tick it starts, which would put every birth at rest on its first frame.
  const realTimings = () => {
    const engine = require("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation").default as typeof Animated;
    return spyOn(Animated, "timing").mockImplementation(engine.timing);
  };

  it("is born with the trigger's tone at the birth's fill, its rows blurred and sharpening on their own clock, and settles its corner from a capsule after it is full", async () => {
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} origin={ORIGIN} />));
    await act(async () => {});
    const clock = animationClock();
    const timing = realTimings();
    try {
      rerender(ui(<Probe open radius={16} origin={ORIGIN} />));
      // The first paint: the under-fills at the birth's fill, the rows blurred by the
      // birth's blur (a CSS filter string, the form every platform's `filter` takes),
      // the rows' own opacity whole, and the drop a capsule on its shorter side.
      expect(presence()).toBeCloseTo(birth.fill, 6);
      expect(focus()).toEqual({ filter: `blur(${birth.blur}px)`, opacity: "1" });
      const droplet = frame();
      expect(corner()).toBeCloseTo(0.5 * Math.min(droplet.width, droplet.height), 3);
      // The rows sharpen on the birth's clock, not the travel's: still soft once the
      // pane is past full, sharp by `sharpMs`. The corner is a capsule until the
      // settle's hold has run, the pane full by then, and relaxes to the skin's only
      // over the settle.
      clock.advance(birth.sharpMs / 2);
      expect(parseFloat(focus().filter.replace(/[^\d.]/g, ""))).toBeGreaterThan(1);
      clock.advance(settle.holdMs - birth.sharpMs / 2 - 16);
      const full = frame();
      expect(full.height).toBeGreaterThan(SIZE.height * 0.98);
      expect(corner()).toBeGreaterThan(16 * 2);
      clock.advance(birth.sharpMs - settle.holdMs + 48);
      expect(focus()).toEqual({ filter: "", opacity: "" });
      // The under-fills are whole by `fillMs`.
      expect(presence()).toBe(1);
      clock.advance(settle.ms + 64);
      expect(corner()).toBeCloseTo(16, 1);
    } finally { unmount(); clock.restore(); timing.mockRestore(); }
  });

  it("dismisses with the rows ghosted on the first frame and retiring, the pane sheer and contracted about its centre, then re-forms the trigger before the drop slides onto it", async () => {
    let exits = 0;
    const progress = new Animated.Value(0);
    const { rerender, unmount } = render(ui(<Probe open={false} radius={16} origin={ORIGIN} progress={progress} onExited={() => { exits++; }} />));
    await act(async () => {});
    exits = 0;
    const clock = animationClock();
    const timing = realTimings();
    try {
      rerender(ui(<Probe open radius={16} origin={ORIGIN} progress={progress} onExited={() => { exits++; }} />));
      clock.advance(1600);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      expect(retiring()).toBe(false);
      rerender(ui(<Probe open={false} radius={16} origin={ORIGIN} progress={progress} onExited={() => { exits++; }} />));
      // The close's first frame: the rows are blurred ghosts at `keep` and the rows
      // stay in the tree (retiring) while they fade; the travel has not moved.
      expect(focus().filter).toBe(`blur(${birth.blur}px)`);
      expect(parseFloat(focus().opacity)).toBeCloseTo(dismiss.ghost.keep, 6);
      expect(retiring()).toBe(true);
      expect(valueOf(progress)).toBe(1);
      // The close, sampled frame by frame to the snap: the pane contracts about its
      // centre to `contract` of its box while the travel still holds at 1 and goes
      // sheer (its under-fills at the dismiss's share); the ghosts fade and the rows
      // retire by the ghosts' fade; the drop hangs under the pill down to the slide
      // mark (its top at the pill's bottom) and then slides onto the pill's box.
      const seen: { value: number; box: ReturnType<typeof frame>; retiring: boolean; presence: number; at: number }[] = [];
      for (let step = 0; step < 80 && exits === 0; step++) {
        clock.advance(16);
        seen.push({ value: valueOf(progress), box: frame(), retiring: retiring(), presence: presence(), at: (step + 1) * 16 });
      }
      expect(exits).toBe(1);
      const contracted = seen.find((s) => s.value === 1 && Math.abs(s.box.width / SIZE.width - handoff.close.contract) < 0.03);
      expect(contracted).toBeDefined();
      expect(contracted!.box.left).toBeCloseTo((SIZE.width - contracted!.box.width) / 2, 1);
      expect(Math.min(...seen.map((s) => s.presence))).toBeCloseTo(dismiss.sheer, 4);
      expect(seen.some((s) => s.retiring)).toBe(true);
      expect(seen.filter((s) => s.at > dismiss.ghost.fadeMs + 32).every((s) => !s.retiring)).toBe(true);
      // (Within a few pixels: the contraction's release and the contour's recoil
      // scale the pane about its centre on top of the edge's travel.)
      const hanging = seen.filter((s) => s.value > handoff.slide && s.value < seed);
      expect(hanging.length).toBeGreaterThan(0);
      for (const s of hanging) expect(Math.abs(s.box.top - (ORIGIN.y + ORIGIN.height))).toBeLessThan(4);
      const sliding = seen.filter((s) => s.value < handoff.slide * 0.75 && s.value > 0);
      expect(sliding.length).toBeGreaterThan(0);
      for (const s of sliding) expect(s.box.top).toBeLessThan(ORIGIN.y + ORIGIN.height - 4);
      // The hand-back is the pill's box exactly, the contraction's release included
      // (the contour's own recoil settles over the next frames, as on every close).
      expect(Math.abs(frame().left - 20)).toBeLessThan(0.1);
      clock.advance(1600);
      near(frame(), { left: 20, top: -40, width: 100, height: 32 });
    } finally { unmount(); clock.restore(); timing.mockRestore(); }
  });

  it("re-forms the trigger's material from a small body as the travel crosses the re-form mark downward, whole again across it upward", async () => {
    let channel: PopupHandoff | null = null;
    let context: PopupHandoffValue | null = null;
    const { unmount } = render(ui(<HandoffProbe onChannel={(handoff, value) => { channel = handoff; context = value; }} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const travel = channel!.progress;
      const growth = context!.growth;
      expect(valueOf(growth)).toBe(1);
      act(() => travel.setValue(1));
      act(() => travel.setValue(handoff.reform + 0.05));
      expect(valueOf(growth)).toBe(1);
      // Crossing the mark downward: the material comes back small and springs to whole.
      act(() => travel.setValue(handoff.reform - 0.01));
      expect(valueOf(growth)).toBeCloseTo(handoff.reformGrowth.from, 6);
      clock.advance(48);
      const growing = valueOf(growth);
      expect(growing).toBeGreaterThan(handoff.reformGrowth.from);
      expect(growing).toBeLessThan(1);
      clock.advance(600);
      expect(valueOf(growth)).toBeCloseTo(1, 3);
      // Crossing upward (a reopen) rests it at whole at once; it is hidden there anyway.
      act(() => travel.setValue(handoff.reform + 0.1));
      act(() => travel.setValue(handoff.reform - 0.01));
      expect(valueOf(growth)).toBeCloseTo(handoff.reformGrowth.from, 6);
      act(() => travel.setValue(handoff.reform + 0.1));
      expect(valueOf(growth)).toBe(1);
    } finally { unmount(); clock.restore(); }
  });
});

describe("the field hand-off", () => {
  // A field 100 by 32 whose box ends 8 above the card (the overlay's gap), corner 16.
  const ORIGIN: PopupOrigin = { x: 20, y: -40, width: 100, height: 32, radius: 16 };
  const GAP = 8;
  const { seed, birth, handoff } = POPUP_PRESENTATION;
  const fieldBottom = ORIGIN.y + ORIGIN.height;
  const mark = fieldCoverMark(ORIGIN.height, GAP);

  it("places the cover mark where the pane's edge meets the field's box", () => {
    expect(mark).toBeCloseTo(32 / 40 + handoff.field.margin, 9);
    // Boxes that touch or overlap, or a field with no extent yet, cover for the whole travel.
    expect(fieldCoverMark(32, 0)).toBe(1);
    expect(fieldCoverMark(0, 8)).toBe(1);
    expect(fieldCoverMark(32, -4)).toBe(1);
    expect(fieldCoverMark(4000, 4)).toBe(1);
  });

  it("forms a compact drop centred under a wide trigger, never a bar its full width, and still hands back onto the whole box", async () => {
    // A field that fills its column: the same width as the card it opens.
    const WIDE: PopupOrigin = { x: 0, y: -40, width: SIZE.width, height: 32, radius: 16 };
    const drop = handoff.droplet * SIZE.width;
    let exits = 0;
    const progress = new Animated.Value(0);
    const onExited = () => { exits++; };
    const page = (open: boolean) => ui(<Probe open={open} radius={16} origin={WIDE} progress={progress} onExited={onExited} />);
    const { rerender, unmount } = render(page(false));
    await act(async () => {});
    exits = 0;
    const clock = animationClock();
    try {
      // Closed: the pane sits on the whole box, so a hand-back re-forms the field exactly.
      near(frame(), { left: 0, top: -40, width: SIZE.width, height: 32 });
      rerender(page(true));
      // The first paint is the drop: the card's droplet fraction wide, centred on the
      // trigger, a share of the way to the card's height, and rounder than either box.
      const droplet = frame();
      expect(droplet.width).toBeCloseTo(drop, 4);
      expect(droplet.left).toBeCloseTo((SIZE.width - drop) / 2, 4);
      expect(droplet.width).toBeLessThan(SIZE.width * 0.5);
      expect(droplet.height).toBeCloseTo(Math.max(32, birth.along * SIZE.height), 4);
      expect(corner()).toBeCloseTo(Math.max(16, 0.5 * Math.min(drop, droplet.height)), 4);
      // The drop keeps its width up to `widen` (give or take the contour's squash),
      // then widens to the card; the seed sits at the widen mark, so the width is
      // held at the first paint and widens from there.
      let held = 0;
      for (let step = 0; step < 100; step++) {
        clock.advance(16);
        const value = valueOf(progress);
        if (value > seed && value < handoff.widen) { held++; expect(Math.abs(frame().width - drop)).toBeLessThan(3); }
        if (value > handoff.widen + 0.1) { held++; expect(frame().width).toBeGreaterThan(drop + 3); }
      }
      expect(held).toBeGreaterThan(0);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      // The close narrows to the drop (the width passes through the drop's at the
      // widen mark; the close spring crosses it at about three pixels a millisecond,
      // so a 16 ms step lands within about 25 px of it), then re-widens into the box
      // for the hand-back: the narrowest frame is near the drop, far under the box.
      rerender(page(false));
      let narrowest = Infinity;
      for (let step = 0; step < 80 && exits === 0; step++) {
        clock.advance(16);
        narrowest = Math.min(narrowest, frame().width);
      }
      expect(Math.abs(narrowest - drop)).toBeLessThan(25);
      expect(narrowest).toBeLessThan(SIZE.width * 0.6);
      expect(exits).toBe(1);
      const handed = frame();
      expect(Math.abs(handed.width - SIZE.width)).toBeLessThan(0.5);
      clock.advance(1600);
      near(frame(), { left: 0, top: -40, width: SIZE.width, height: 32 });
    } finally { unmount(); clock.restore(); }
  });

  it("has the pane clear of the field's box whenever the travel is at or past the cover mark, on the way out and home", async () => {
    let exits = 0;
    const progress = new Animated.Value(0);
    const onExited = () => { exits++; };
    const page = (open: boolean) => ui(<Probe open={open} radius={16} origin={ORIGIN} progress={progress} onExited={onExited} />);
    const { rerender, unmount } = render(page(false));
    await act(async () => {});
    exits = 0;
    const clock = animationClock();
    try {
      rerender(page(true));
      // The first paint is the droplet ON the field's box (the field vanishes into it),
      // below the cover mark, so the field's material is out.
      expect(valueOf(progress)).toBeCloseTo(seed, 9);
      expect(frame().top).toBeLessThan(fieldBottom);
      let released = 0;
      for (let step = 0; step < 100; step++) {
        clock.advance(16);
        // Past the mark the pane's top is at or below the field's bottom edge, within
        // the pixel the contour's stretch may add (the margin is sized for it).
        if (valueOf(progress) >= mark) { released++; expect(frame().top).toBeGreaterThanOrEqual(fieldBottom - 1); }
      }
      expect(released).toBeGreaterThan(20);
      expect(frame()).toEqual({ left: 0, top: 0, ...SIZE });
      rerender(page(false));
      let covered = 0;
      for (let step = 0; step < 80 && exits === 0; step++) {
        clock.advance(16);
        const value = valueOf(progress);
        if (value >= mark) expect(frame().top).toBeGreaterThanOrEqual(fieldBottom - 1);
        else if (value > 0) covered++;
      }
      expect(covered).toBeGreaterThan(3);
      expect(exits).toBe(1);
      // The travel is home; the contour's last recoil settles on its own.
      clock.advance(1600);
      near(frame(), { left: 20, top: -40, width: 100, height: 32 });
    } finally { unmount(); clock.restore(); }
  });

  it("gives the field a material that hides only while the pane covers its box, out and home, and a text that fades with it", async () => {
    let channel: PopupHandoff | null = null;
    let value: PopupHandoffValue | null = null;
    render(<HandoffProbe field={{ gap: GAP }} onChannel={(h, c) => { channel = h; value = c; }} />);
    await act(async () => {});
    const clock = animationClock();
    const engine = require("react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation").default as typeof Animated;
    const timing = spyOn(Animated, "timing").mockImplementation(engine.timing);
    try {
      const travel = channel!.progress;
      expect(channel!.fromTrigger).toBe(true);
      // Before the pane has reported, the cover runs to the top of the travel.
      act(() => travel.setValue(0.9));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(0));
      expect(materialOpacity()).toBe(1);
      clock.advance(handoff.label.returnMs + 32);
      // The pane reports the field's box: the cover ends where the pane leaves it.
      act(() => value!.report({ radius: 16, width: 100, height: 32, layer: "control" }));
      // The opening: gone the frame the droplet forms on the box, the text on its short
      // fade, and back (text over its return fade) once past the mark.
      act(() => travel.setValue(seed));
      expect(materialOpacity()).toBe(0);
      clock.advance(handoff.label.hideMs + 32);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(mark - 0.01));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(mark + 0.02));
      expect(materialOpacity()).toBe(1);
      clock.advance(handoff.label.returnMs / 2);
      const midway = labelOpacity();
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(1);
      clock.advance(handoff.label.returnMs);
      expect(labelOpacity()).toBe(1);
      act(() => travel.setValue(1.02));
      expect(materialOpacity()).toBe(1);
      act(() => travel.setValue(1));
      expect(materialOpacity()).toBe(1);
      // The close: gone again below the mark, never in between, back at the snap.
      act(() => travel.setValue(mark + 0.05));
      expect(materialOpacity()).toBe(1);
      act(() => travel.setValue(mark - 0.01));
      expect(materialOpacity()).toBe(0);
      clock.advance(handoff.label.hideMs + 32);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(0.3));
      expect(materialOpacity()).toBe(0);
      act(() => travel.setValue(8e-6));
      expect(materialOpacity()).toBe(0);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(0));
      expect(materialOpacity()).toBe(1);
      expect(labelOpacity()).toBe(0);
      clock.advance(handoff.label.returnMs + 32);
      expect(labelOpacity()).toBe(1);
      // A reopen mid-close: covered again below the mark, released once past it.
      act(() => travel.setValue(0.3));
      expect(materialOpacity()).toBe(0);
      clock.advance(handoff.label.hideMs + 32);
      expect(labelOpacity()).toBe(0);
      act(() => travel.setValue(mark + 0.05));
      expect(materialOpacity()).toBe(1);
      clock.advance(handoff.label.returnMs + 32);
      expect(labelOpacity()).toBe(1);
    } finally { timing.mockRestore(); clock.restore(); }
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
