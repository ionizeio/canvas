import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { useContext, type RefObject } from "react";
import { View } from "react-native";
import {
  GlassBlurTargetContext,
  GlassWindowBlurTargetContext,
  GlassModalBlurTarget,
} from "../src/style/glass-surface/glass-surface.shared.tsx";
import { glassBlurTargetAvailable as baseAvailable } from "../src/style/glass-surface/glass-blur-target.tsx";
import { splitHostStyle } from "../src/style/glass-surface/glass-blur-target.android.tsx";
import { resolveCaptureComponents } from "../src/style/glass-surface/capture-runtime.ts";
import { composite } from "../src/style/color.ts";
import { OverlayProvider, Portal } from "../src/style/portal.tsx";

// The Android sibling blur-target wiring (expo-blur 57+). What must hold, per
// GlassBlurTargetContext in glass-surface.shared: a surface may only receive a
// target it is NOT a native descendant of (an ancestor target segfaults Android's
// RenderThread), so OverlayProvider gives its outlet its OWN sibling target only,
// GlassModalBlurTarget bridges the window-level target into a separate-window
// Modal, and the base (non-Android) fork never reports a target at all. The
// Android fork's BlurTargetView mounting itself is device-verified (the module
// needs a native runtime); here we lock the pure style split it uses.

afterEach(cleanup);

const ref = (): RefObject<View | null> => ({ current: null });

describe("glass-blur-target base fork", () => {
  it("reports no target off Android, so OverlayProvider publishes null and every frost keeps its current path", () => {
    expect(baseAvailable).toBe(false);
  });
});

describe("splitHostStyle (Android fork)", () => {
  it("keeps box keys on the wrapper and moves child-arrangement keys onto the target", () => {
    const { box, content } = splitHostStyle([
      { flex: 1, minWidth: 0 },
      { gap: 28, paddingHorizontal: 24, alignItems: "center", backgroundColor: "#000" },
    ]);
    expect(box).toEqual({ flex: 1, minWidth: 0, backgroundColor: "#000" });
    expect(content).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: "auto",
      gap: 28,
      paddingHorizontal: 24,
      alignItems: "center",
    });
  });

  it("keeps translucent fill beneath its original border and corners without duplicating paint", () => {
    const fill = "rgba(20, 40, 80, 0.5)";
    const shape = { borderWidth: 2, borderColor: "#123456", borderRadius: 16, borderTopLeftRadius: 24, borderBottomEndRadius: 8, borderCurve: "continuous" as const };
    const { box, content } = splitHostStyle([
      { flex: 1, width: 320, backgroundColor: "#ffffff", ...shape },
      { backgroundColor: fill, padding: 12, gap: 8 },
    ]);
    expect(box).toEqual({ flex: 1, width: 320, backgroundColor: fill, ...shape });
    expect(content.backgroundColor).toBeUndefined();
    expect(content.borderRadius).toBeUndefined();
    expect(content.borderTopLeftRadius).toBeUndefined();
    expect(content.borderBottomEndRadius).toBeUndefined();
    expect(content.borderCurve).toBeUndefined();
    expect(content.borderWidth).toBeUndefined();
    expect(content.borderColor).toBeUndefined();
    expect(content.overflow).toBeUndefined();
    expect(content.padding).toBe(12);
    expect(content.gap).toBe(8);
    const backdrop = "#f0e0c0";
    const rendered = [box, content].reduce((behind, layer) => typeof layer.backgroundColor === "string" ? composite(layer.backgroundColor, behind) : behind, backdrop);
    expect(rendered).toBe(composite(fill, backdrop));
    expect(rendered).not.toBe(composite(fill, composite(fill, backdrop)));
  });

  it("fills the wrapper with longhands (no `flex` shorthand, whose web basis rewrite collapses content-sized hosts)", () => {
    const { box, content } = splitHostStyle(undefined);
    expect(box).toEqual({});
    expect(content).toEqual({ flexGrow: 1, flexShrink: 1, flexBasis: "auto" });
    expect("flex" in content).toBe(false);
  });
});

describe("optional native capture capability", () => {
  it("requires the complete paint, content and frost integration before activating any native material", () => {
    const NativeView = () => null;
    const complete = { available: true, PaintHost: NativeView, CaptureHost: NativeView, FrostView: NativeView };
    expect(resolveCaptureComponents("android", complete)).toEqual({ PaintHost: NativeView, CaptureHost: NativeView, FrostView: NativeView });
    for (const missing of ["PaintHost", "CaptureHost", "FrostView"] as const) {
      expect(resolveCaptureComponents("android", { ...complete, [missing]: undefined })).toBeUndefined();
    }
    expect(resolveCaptureComponents("android", { ...complete, available: false })).toBeUndefined();
    expect(resolveCaptureComponents("android")).toBeUndefined();
    expect(resolveCaptureComponents("ios", complete)).toBeUndefined();
    expect(resolveCaptureComponents("web", complete)).toBeUndefined();
  });
});

describe("GlassModalBlurTarget", () => {
  it("bridges the window-level target into GlassBlurTargetContext for a separate-window Modal", () => {
    const target = ref();
    let seen: unknown = "unset";
    function Probe() {
      seen = useContext(GlassBlurTargetContext);
      return null;
    }
    render(
      <GlassWindowBlurTargetContext.Provider value={target}>
        <GlassModalBlurTarget>
          <Probe />
        </GlassModalBlurTarget>
      </GlassWindowBlurTargetContext.Provider>,
    );
    expect(seen).toBe(target);
  });

  it("provides null with no window target published (no OverlayProvider, or a target-less platform)", () => {
    let seen: unknown = "unset";
    function Probe() {
      seen = useContext(GlassBlurTargetContext);
      return null;
    }
    render(
      <GlassModalBlurTarget>
        <Probe />
      </GlassModalBlurTarget>,
    );
    expect(seen).toBe(null);
  });
});

describe("OverlayProvider target publishing", () => {
  it("passes an inherited window target through to nested consumers (outermost provider wins for Modals)", () => {
    const outer = ref();
    let seen: unknown = "unset";
    function Probe() {
      seen = useContext(GlassWindowBlurTargetContext);
      return null;
    }
    render(
      <GlassWindowBlurTargetContext.Provider value={outer}>
        <OverlayProvider>
          <OverlayProvider>
            <Probe />
          </OverlayProvider>
        </OverlayProvider>
      </GlassWindowBlurTargetContext.Provider>,
    );
    expect(seen).toBe(outer);
  });

  it("gives portaled outlet content its OWN target only — here null (base fork), even with a window target above", () => {
    const outer = ref();
    let seen: unknown = "unset";
    function Probe() {
      seen = useContext(GlassBlurTargetContext);
      return null;
    }
    render(
      <GlassWindowBlurTargetContext.Provider value={outer}>
        <OverlayProvider>
          <Portal>
            <Probe />
          </Portal>
        </OverlayProvider>
      </GlassWindowBlurTargetContext.Provider>,
    );
    // The outlet must never receive an ANCESTOR's target (that is the crash); on
    // this platform the provider's own target is unavailable, so it must be null,
    // not the inherited window target.
    expect(seen).toBe(null);
  });
});
