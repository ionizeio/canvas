import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup, act } from "@testing-library/react";
import { AccessibilityInfo } from "react-native";
import { ThemeProvider } from "../src/style/index.ts";
// Import the per-OS Progress entries DIRECTLY (not via the atoms barrel) so this suite is
// independent of unrelated in-flight barrel work.
import { Progress } from "../src/atoms/progress/progress.tsx"; // web skin (continuous)
import { Progress as ProgressAndroid } from "../src/atoms/progress/progress.android.tsx"; // M3 segmented
import { toneOf, toneFill } from "../src/atoms/progress/progress.shared.tsx";
import { darkColors, lightColors } from "../src/style/tokens.ts";

afterEach(cleanup);

// Render inside an async act so useReducedMotion's async AccessibilityInfo read (a state
// update) settles within act, keeping the suite free of "not wrapped in act" warnings.
async function wrap(ui: React.ReactNode) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ThemeProvider>{ui}</ThemeProvider>);
  });
  return result;
}

// happy-dom has no ResizeObserver, so RNW's onLayout never fires on its own. Fire the layout
// handler RNW attaches to the host node, mirroring a real browser reporting the track width.
function fireLayout(el: Element, width: number) {
  const h = (el as unknown as { __reactLayoutHandler?: (e: unknown) => void }).__reactLayoutHandler;
  if (typeof h === "function") {
    act(() => h({ nativeEvent: { layout: { x: 0, y: 0, width, height: 8, left: 0, top: 0 } }, timeStamp: 1 }));
  } else {
    throw new Error("no __reactLayoutHandler on the progressbar (RNW layout hook absent)");
  }
}

// translateX (px) out of a react-native-web transform string, or NaN.
function translateXpx(el: Element): number {
  const t = getComputedStyle(el).transform || (el as HTMLElement).style.transform || "";
  const m = /matrix\(1, 0, 0, 1, (-?\d+(?:\.\d+)?), 0\)/.exec(t) || /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(t);
  return m ? parseFloat(m[1]) : NaN;
}

describe("Progress determinate fill", async () => {
  it("reports the clamped value as aria-valuenow", async () => {
    const { container } = await wrap(<Progress value={0.6} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("60");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("paints the value immediately via the static percent fallback (pre-measurement)", async () => {
    const { container } = await wrap(<Progress value={0.6} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    const fill = bar.querySelector("div") as HTMLElement;
    // Before onLayout, trackWidth is 0 -> the in-flow percent-width fill paints the value.
    expect(fill.style.width).toBe("60%");
    expect(translateXpx(fill)).toBeNaN(); // no transform yet
  });

  it("positions the eased fill's trailing edge at the value once measured", async () => {
    const { container } = await wrap(<Progress value={0.6} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    fireLayout(bar, 320);
    const fill = bar.querySelector("div") as HTMLElement;
    // Animated fill: a full-width (320px) bar translated left by (1 - 0.6) * 320 = 128,
    // so its trailing edge sits at 192px = 60% of the track.
    expect(Math.round(parseFloat(fill.style.width))).toBe(320);
    expect(translateXpx(fill)).toBeCloseTo(-128, 0);
  });

  it("value 0 hides the fill and value 1 fills the track", async () => {
    const zero = await wrap(<Progress value={0} />);
    let bar = zero.container.querySelector('[role="progressbar"]')!;
    fireLayout(bar, 320);
    expect(translateXpx(bar.querySelector("div") as HTMLElement)).toBeCloseTo(-320, 0); // fully off-left
    cleanup();
    const full = await wrap(<Progress value={1} />);
    bar = full.container.querySelector('[role="progressbar"]')!;
    fireLayout(bar, 320);
    expect(translateXpx(bar.querySelector("div") as HTMLElement)).toBeCloseTo(0, 0); // flush
  });

  it("clamps out-of-range values", async () => {
    const { container } = await wrap(<Progress value={1.5} />);
    expect(container.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("100");
  });
});

describe("Progress M3 segmented (Android)", async () => {
  it("offsets the inactive track a gap past the active edge once measured", async () => {
    const { container } = await wrap(<ProgressAndroid value={0.5} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    fireLayout(bar, 320);
    const parts = [...bar.querySelectorAll("div")] as HTMLElement[];
    const xs = parts.map(translateXpx).filter((n) => !Number.isNaN(n));
    // active indicator: translateX = -(1 - 0.5) * 320 = -160 (trailing edge at 160 = 50%)
    // inactive track:  translateX =  0.5 * 320 + 4 (gap) = 164 (leading edge a 4dp gap past)
    expect(xs).toContain(-160);
    expect(xs).toContain(164);
  });

  it("no gap at rest-empty (value 0): inactive spans the full rail", async () => {
    const { container } = await wrap(<ProgressAndroid value={0} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    fireLayout(bar, 320);
    const xs = ([...bar.querySelectorAll("div")] as HTMLElement[]).map(translateXpx).filter((n) => !Number.isNaN(n));
    // inactive track translateX = 0*320 + 0 (gap suppressed at 0) = 0 -> spans full width
    expect(xs).toContain(0);
  });
});

describe("Progress tone axis", async () => {
  it("resolves the tone with danger > warning > default precedence", () => {
    expect(toneOf({})).toBe("default");
    expect(toneOf({ warning: true })).toBe("warning");
    expect(toneOf({ danger: true })).toBe("danger");
    // Both passed: the more urgent tone wins.
    expect(toneOf({ warning: true, danger: true })).toBe("danger");
  });

  // The tone fill is the tone's solid color from statusColors, the same as a Badge's dot.
  it("maps each tone to the theme's status color, in either scheme", () => {
    for (const tokens of [lightColors, darkColors]) {
      expect(toneFill("warning", tokens)).toBe(tokens.warning);
      expect(toneFill("danger", tokens)).toBe(tokens.destructive);
    }
  });

  it("recolors the rendered fill so warning, danger, and default all differ", async () => {
    // The pre-measurement static fill carries the fillColor as an inline backgroundColor.
    const fillBg = (root: Element) => {
      const bar = root.querySelector('[role="progressbar"]')!;
      return (bar.querySelector("div") as HTMLElement).style.backgroundColor;
    };
    const base = await wrap(<Progress value={0.85} />);
    const warn = await wrap(<Progress warning value={0.85} />);
    const danger = await wrap(<Progress danger value={0.85} />);
    const baseBg = fillBg(base.container);
    const warnBg = fillBg(warn.container);
    const dangerBg = fillBg(danger.container);
    expect(warnBg).not.toBe(baseBg);
    expect(dangerBg).not.toBe(baseBg);
    expect(warnBg).not.toBe(dangerBg);
  });
});

describe("Progress reduced motion", async () => {
  it("still reflects the value when Reduce Motion is on (snaps, does not drop the fill)", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    const { container } = await wrap(<Progress value={0.4} />);
    const bar = container.querySelector('[role="progressbar"]')!;
    await act(async () => {}); // let the reduce-motion read resolve
    fireLayout(bar, 320);
    const fill = bar.querySelector("div") as HTMLElement;
    // -(1 - 0.4) * 320 = -192 -> trailing edge at 128 = 40%
    expect(translateXpx(fill)).toBeCloseTo(-192, 0);
    spy.mockRestore();
  });
});
