import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { AccessibilityInfo, Animated } from "react-native";
import { Backdrop, BackdropHost } from "../src/organisms/backdrop/backdrop.tsx";
import { backdropClock, resetBackdropClocks, retainBackdropClock, releaseBackdropClock } from "../src/organisms/backdrop/backdrop-clock.ts";
import { useGpuBackdrop, refreshBackdropRenderer } from "../src/organisms/backdrop/skia-runtime.ts";
import { readLayers } from "../src/organisms/backdrop/backdrop-layers.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";

// The Backdrop is the kit's background-animation ENGINE. The contracts worth
// locking down are the ones that break silently: the host must clear when its last
// claimant leaves (apps gate their backdrop and rely on that), the engine must
// carry no brand art, and Reduce Motion must never show a moving frame first.
//
// react-native-svg is stubbed to fragments in test/setup.ts, so these assert the
// surface and the clock rather than rendered vector nodes.

afterEach(() => {
  cleanup();
  resetBackdropClocks();
});

const FIELD = Array.from({ length: 12 }, (_, i) => ({ x: i / 12, y: i / 12, r: 1, a: 0.5 }));

/** The surface root is the only aria-hidden node the engine renders. */
const surface = (c: HTMLElement) => c.querySelector('[aria-hidden="true"]');

const valueOf = (v: Animated.Value): number => (v as unknown as { __getValue: () => number }).__getValue();

function Scene() {
  return (
    <Backdrop>
      <Backdrop.Particles field={FIELD} depth={0} />
    </Backdrop>
  );
}

function wrap(ui: React.ReactNode) {
  return <ThemeProvider>{ui}</ThemeProvider>;
}

describe("Backdrop layer vocabulary", () => {
  it("reads children into ordered layer descriptors", () => {
    const layers = readLayers(
      <>
        <Backdrop.Particles field={FIELD} depth={0} />
        <Backdrop.Gradient blobs={[{ color: "#fff", cx: 0.5, cy: 0.5, r: 0.4, o: 0.3, end: 0.6 }]} />
        <Backdrop.Custom>
          <></>
        </Backdrop.Custom>
      </>,
    );
    expect(layers.map((l) => l.kind)).toEqual(["particles", "gradient", "custom"]);
  });

  it("ignores non-layer children rather than throwing", () => {
    const layers = readLayers(
      <>
        {null}
        <Backdrop.Particles field={FIELD} depth={0} />
        {false}
      </>,
    );
    expect(layers).toHaveLength(1);
  });

  it("defaults a particle layer to the travelling depth", () => {
    const [layer] = readLayers(<Backdrop.Particles field={FIELD} />);
    expect(layer.kind).toBe("particles");
    expect(layer.depth).toBe(1);
  });
});

describe("BackdropHost", () => {
  it("renders nothing while no scene is claimed", () => {
    // Load-bearing: apps gate their backdrop on their own conditions (a surface
    // mode, a focused screen). If a root host painted regardless, unmounting the
    // last Backdrop would leave the sky up forever.
    const { container } = render(wrap(<BackdropHost />));
    expect(surface(container)).toBeNull();
  });

  it("paints once a scene is claimed, and clears when it leaves", async () => {
    function App({ on }: { on: boolean }) {
      return <BackdropHost>{on ? <Scene /> : null}</BackdropHost>;
    }
    const { container, rerender } = render(wrap(<App on />));
    await waitFor(() => expect(surface(container)).not.toBeNull());

    await act(async () => {
      rerender(wrap(<App on={false} />));
    });
    expect(surface(container)).toBeNull();
  });

  it("renders inline when there is no host, so an unhosted consumer still works", async () => {
    const { container } = render(wrap(<Scene />));
    await waitFor(() => expect(surface(container)).not.toBeNull());
  });

  // A claim is published from an effect, which a server render never runs, so a host
  // alone would ship a page with no floor under dark-scheme text. The claimant paints
  // inline in the server markup instead, hydration reproduces that exactly, and the
  // host takes the surface over in the commit after.
  it("paints the surface in the server markup and hands it to the host after hydration", async () => {
    const app = wrap(<BackdropHost><Scene /></BackdropHost>);
    const html = renderToString(app);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    expect(surface(container), "the server markup carries the surface").not.toBeNull();
    // The floor, and only the floor: a server has no window to lay the field out
    // against, and a field drawn at zero size is invisible markup by the kilobyte.
    expect(surface(container)!.children.length).toBe(1);
    const recovered: string[] = [];
    let root!: Root;
    try {
      act(() => {
        root = hydrateRoot(container, app, { onRecoverableError: (error) => { recovered.push(String(error)); } });
      });
      expect(recovered).toEqual([]);
      // Exactly one surface at every moment: the host's, once it holds the claim.
      await waitFor(() => expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(1));
      // The host renders its surface before the app, the claimant rendered its inline
      // one inside the app: after the hand-over the surface is the host's, the first child.
      expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});

describe("twinkle scintillates rather than shimmering as one", () => {
  // The contract that keeps regressing back to nothing: a twinkling field must be
  // dealt into phase buckets that carry DIFFERENT opacities at the same instant.
  // The original effect multiplied one shimmer into the whole layer, so every body
  // rose and fell together; a field changing brightness as a unit is a global
  // luminance change and the eye adapts straight through it, which is why it read
  // as no effect at all however wide the range was pushed.
  //
  // `still` pins the clock on the poster frame, so this reads the fan at a known
  // phase instead of racing the animation.
  const opacities = (c: HTMLElement) =>
    [...(surface(c)?.querySelectorAll<HTMLElement>("[style*='opacity']") ?? [])].map((n) => Number(n.style.opacity));

  function Field({ twinkle }: { twinkle: boolean }) {
    return (
      <Backdrop still>
        <Backdrop.Particles field={FIELD} depth={0} twinkle={twinkle} />
      </Backdrop>
    );
  }

  it("draws a twinkling field at several distinct opacities at once", async () => {
    const { container } = render(wrap(<Field twinkle />));
    await waitFor(() => expect(surface(container)).not.toBeNull());
    expect(new Set(opacities(container)).size).toBeGreaterThan(1);
  });

  it("leaves a field that does not twinkle on a single opacity", async () => {
    const { container } = render(wrap(<Field twinkle={false} />));
    await waitFor(() => expect(surface(container)).not.toBeNull());
    expect(new Set(opacities(container)).size).toBe(1);
  });
});

describe("the clock's continuity", () => {
  // A backdrop that is toggled off and back on resumes mid-flight instead of
  // restarting. The phase used to be read back from the JS-driven value on stop;
  // a natively driven value cannot report its position to JS, so the clock keeps
  // the run's wall clock and derives the phase from it, then resumes through a head
  // timing that covers the REST of the cycle before the loop takes over. Under
  // bun test react-native-web swaps in AnimatedMock, which completes every timing
  // synchronously, so the head is observed through its config rather than its
  // value: a quarter of the default 32s flight elapsed means a 24s head.
  // Every timing on the flight value shorter than the full 32s cycle is a resume head.
  const headFor = (calls: Array<unknown[]>) =>
    calls
      .filter((args) => args[0] === backdropClock("default").flight)
      .map((args) => (args[1] as { duration: number }).duration)
      .filter((duration) => duration < 32000);

  it("resumes the flight from the phase it was stopped at", () => {
    let now = 1_000_000;
    const clock = spyOn(Date, "now").mockImplementation(() => now);
    const timing = spyOn(Animated, "timing");
    try {
      retainBackdropClock("default", "running");
      now += 8000;
      releaseBackdropClock("default");
      timing.mockClear();
      retainBackdropClock("default", "running");
      const heads = headFor(timing.mock.calls);
      expect(heads).toContain(24000);
      releaseBackdropClock("default");
    } finally {
      timing.mockRestore();
      clock.mockRestore();
    }
  });

  it("keeps the captured phase across a poster still", () => {
    let now = 1_000_000;
    const clock = spyOn(Date, "now").mockImplementation(() => now);
    const timing = spyOn(Animated, "timing");
    try {
      retainBackdropClock("default", "running");
      now += 16000;
      releaseBackdropClock("default");
      retainBackdropClock("default", "poster");
      expect(valueOf(backdropClock("default").flight)).toBe(0.35);
      releaseBackdropClock("default");
      timing.mockClear();
      retainBackdropClock("default", "running");
      expect(headFor(timing.mock.calls)).toContain(16000);
      releaseBackdropClock("default");
    } finally {
      timing.mockRestore();
      clock.mockRestore();
    }
  });

  it("starts from the top of the cycle on the first run", () => {
    const timing = spyOn(Animated, "timing");
    try {
      retainBackdropClock("default", "running");
      expect(headFor(timing.mock.calls)).toEqual([]);
      releaseBackdropClock("default");
    } finally {
      timing.mockRestore();
    }
  });
});

describe("Backdrop accessibility", () => {
  it("starts on the poster frame so Reduce Motion never shows a moving frame", async () => {
    // useReducedMotion resolves asynchronously and reports false until it does, so
    // the engine starts still and goes live only once the preference has been read.
    // Holding the promise unresolved reproduces exactly that first-frame window.
    let resolve: (v: boolean) => void = () => {};
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(
      new Promise<boolean>((r) => {
        resolve = r;
      }),
    );

    render(wrap(<Scene />));
    await waitFor(() => expect(valueOf(backdropClock("default").flight)).toBe(0.35));

    await act(async () => {
      resolve(false);
    });
    spy.mockRestore();
  });

  it("hides itself from assistive technology", async () => {
    const { container } = render(wrap(<Scene />));
    await waitFor(() => expect(surface(container)).not.toBeNull());
    expect(surface(container)?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("GPU renderer capability", () => {
  // test/setup.ts stubs @shopify/react-native-skia as an empty module, which is the
  // realistic hard case: the peer resolves but no drawing backend is live. That is
  // what a web consumer sees before CanvasKit loads, and the engine must render its
  // SVG baseline throughout rather than a blank screen.
  function Probe() {
    return <>{String(useGpuBackdrop())}</>;
  }

  it("reports no GPU backend when the peer resolves but cannot allocate", () => {
    const { container } = render(wrap(<Probe />));
    expect(container.textContent).toBe("false");
  });

  it("still paints the scene with no GPU backend", async () => {
    const { container } = render(wrap(<Scene />));
    await waitFor(() => expect(surface(container)).not.toBeNull());
  });

  it("survives a refresh when nothing has changed", () => {
    // Apps call this after loading a backend; calling it when the answer is the
    // same must be a no-op rather than a re-render storm.
    expect(() => {
      refreshBackdropRenderer();
      refreshBackdropRenderer();
    }).not.toThrow();
    const { container } = render(wrap(<Probe />));
    expect(container.textContent).toBe("false");
  });
});

describe("the engine carries no brand art", () => {
  // The whole point of putting the engine in the kit and the scene in the app: if a
  // Canvas hex or the docs seed ever appears under the component directory, the
  // boundary has leaked and another app's backdrop would quietly look like ours.
  const BRAND = ["#27cdf2", "#46e082", "#ffb43d", "#ff2d6e", "#b24dff", "20260710"];

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  it("has no Canvas brand hexes or docs seed in src/organisms/backdrop", () => {
    const offenders: string[] = [];
    for (const file of walk(join(import.meta.dir, "..", "src", "organisms", "backdrop"))) {
      if (file.endsWith(".md")) continue;
      const text = readFileSync(file, "utf8");
      for (const needle of BRAND) {
        if (text.includes(needle)) offenders.push(`${file}: ${needle}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
