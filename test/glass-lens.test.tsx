import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { act, render, cleanup, waitFor, screen } from "@testing-library/react";
import { Text, type ViewStyle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { setSurface } from "../src/theme.ts";
import { layoutElement } from "./entrance-layout.ts";
import {
  GLASS_LENS_ID,
  GLASS_LENS_PENDING_FILTER,
  hasGlassLens,
  ensureGlassLens,
  acquireSizedGlassLens,
  releaseSizedGlassLens,
  sizedGlassLensCount,
  sizedLensFilterSpec,
  lensMapDataUri,
  lensBackdropSupported,
} from "../src/style/glass-surface/glass-lens.ts";

// The web Liquid Glass lens tier: per-size SVG displacement filters acquired on
// layout, plus a shared displacement-free def for the CSS token. The pure gate
// and geometry are exercised directly; the component-level tests flip the real
// environment (happy-dom's UA carries no "Chrome/" token, so the lens stays off
// unless a test overrides the user agent; happy-dom also has no layout engine,
// so a mounted lens layer holds the pending blur+saturate grade).

afterEach(cleanup);

// Restore by deleting the own property: the real getter lives on the prototype.
function overrideUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  return () => {
    delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
  };
}

const CHROME_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const HEADLESS_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36";
const SAFARI_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const FIREFOX_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0";
const IOS_CHROME_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1";

describe("lensBackdropSupported (pure engine gate)", () => {
  const yes = () => true;
  it("allows the Chromium family, headless included", () => {
    expect(lensBackdropSupported(CHROME_UA, yes)).toBe(true);
    expect(lensBackdropSupported(HEADLESS_UA, yes)).toBe(true);
  });
  it("denies WebKit and Gecko, which parse the value but render no filter", () => {
    expect(lensBackdropSupported(SAFARI_UA, yes)).toBe(false);
    expect(lensBackdropSupported(FIREFOX_UA, yes)).toBe(false);
    // iOS Chrome is WebKit underneath and identifies as CriOS, not Chrome.
    expect(lensBackdropSupported(IOS_CHROME_UA, yes)).toBe(false);
  });
  it("denies an engine whose CSS.supports rejects the value outright", () => {
    expect(lensBackdropSupported(CHROME_UA, () => false)).toBe(false);
  });
});

describe("shared CSS-token def", () => {
  it("releases CSS resources in solid while retaining independently owned lenses", () => {
    const local = acquireSizedGlassLens(141, 39)!;
    setSurface("glass");
    expect(hasGlassLens()).toBe(true);
    setSurface("solid");
    expect(hasGlassLens()).toBe(false);
    expect(document.getElementById(local.key)).not.toBeNull();
    releaseSizedGlassLens(local.key);
    expect(document.getElementById(GLASS_LENS_ID + "-defs")).toBeNull();
  });
  it("injects once, idempotently, carrying blur + saturation and NO displacement", () => {
    // CSS consumers explicitly acquire the shared definition when enabling glass.
    document.getElementById(GLASS_LENS_ID)?.remove();
    expect(hasGlassLens()).toBe(false);
    expect(ensureGlassLens()).toBe(true);
    expect(document.querySelectorAll(`#${GLASS_LENS_ID}`).length).toBe(1);
    const filter = document.getElementById(GLASS_LENS_ID)!;
    // No shared filter can displace correctly for every element size (the map
    // must know the edges), so the token def is the safe frost grade only.
    expect(filter.querySelectorAll("feDisplacementMap").length).toBe(0);
    expect(filter.querySelectorAll("feGaussianBlur").length).toBe(1);
    expect(filter.querySelectorAll("feColorMatrix").length).toBe(1);
  });
});

describe("sized lens defs", () => {
  it("keeps clear and regular grades independent at the same geometry", () => {
    const before = sizedGlassLensCount();
    const regular = acquireSizedGlassLens(321, 48)!;
    const clear = acquireSizedGlassLens(321, 48, true)!;
    const shared = acquireSizedGlassLens(321, 48, true)!;
    expect(clear.key).not.toBe(regular.key);
    expect(shared.key).toBe(clear.key);
    expect(sizedGlassLensCount()).toBe(before + 2);
    const regularDef = document.getElementById(regular.key)!;
    const clearDef = document.getElementById(clear.key)!;
    expect(Number(clearDef.querySelector('feGaussianBlur[in="bent"]')!.getAttribute("stdDeviation"))).toBeLessThan(1);
    expect(Number(regularDef.querySelector("feGaussianBlur")!.getAttribute("stdDeviation"))).toBe(6);
    expect(Number(clearDef.querySelector('feGaussianBlur[in="map"]')!.getAttribute("stdDeviation"))).toBeGreaterThan(0);
    expect(clearDef.querySelector("feDisplacementMap")!.getAttribute("in2")).toBe("smooth-map");
    expect(clearDef.querySelector("feDisplacementMap")!.getAttribute("scale"))
      .toBe(regularDef.querySelector("feDisplacementMap")!.getAttribute("scale"));
    expect(clearDef.querySelector("feImage")!.getAttribute("href"))
      .toBe(regularDef.querySelector("feImage")!.getAttribute("href"));
    releaseSizedGlassLens(clear.key);
    expect(document.getElementById(clear.key)).not.toBeNull();
    releaseSizedGlassLens(shared.key);
    expect(document.getElementById(clear.key)).toBeNull();
    expect(document.getElementById(regular.key)).not.toBeNull();
    releaseSizedGlassLens(regular.key);
    expect(sizedGlassLensCount()).toBe(before);
  });

  it("acquire creates the def, equal sizes share it, release removes it", () => {
    const before = sizedGlassLensCount();
    const a = acquireSizedGlassLens(1200, 56)!;
    expect(a.url).toBe(`url(#${GLASS_LENS_ID}-1200x56)`);
    expect(document.getElementById(`${GLASS_LENS_ID}-1200x56`)).not.toBeNull();
    const b = acquireSizedGlassLens(1200, 56)!;
    expect(b.key).toBe(a.key);
    expect(sizedGlassLensCount()).toBe(before + 1);
    releaseSizedGlassLens(a.key);
    expect(document.getElementById(`${GLASS_LENS_ID}-1200x56`)).not.toBeNull();
    releaseSizedGlassLens(b.key);
    expect(document.getElementById(`${GLASS_LENS_ID}-1200x56`)).toBeNull();
    expect(sizedGlassLensCount()).toBe(before);
  });

  it("rejects degenerate sizes", () => {
    expect(acquireSizedGlassLens(0, 56)).toBeNull();
    expect(acquireSizedGlassLens(1200, 0)).toBeNull();
  });

  it("filter spec uses px units, a single dual-channel displacement pass, and the lens grade", () => {
    const spec = sizedLensFilterSpec("t", 1200, 56);
    const primitive = (tag: string) => spec.children.filter((c) => c.tag === tag);
    expect(spec.attrs.filterUnits).toBe("userSpaceOnUse");
    // Region inflated 12% each side: x=-144, width=1488; y=-7, height=70. The
    // feImage carries the same region so the map's intrinsic size IS the region.
    expect(spec.attrs.x).toBe(-144);
    expect(spec.attrs.width).toBe(1488);
    expect(spec.attrs.y).toBe(-7);
    expect(spec.attrs.height).toBe(70);
    const image = primitive("feImage")[0];
    expect([image.attrs.x, image.attrs.y, image.attrs.width, image.attrs.height]).toEqual([-144, -7, 1488, 70]);
    expect(primitive("feDisplacementMap").length).toBe(1);
    expect(primitive("feDisplacementMap")[0].attrs.xChannelSelector).toBe("R");
    expect(primitive("feDisplacementMap")[0].attrs.yChannelSelector).toBe("G");
    expect(primitive("feGaussianBlur")[0].attrs.stdDeviation).toBe(6);
    expect(primitive("feColorMatrix")[0].attrs.values).toBe(1.9);
  });

  it("map geometry: constant 12px rims hugging the element edges inside the inflated region", () => {
    const uri = lensMapDataUri(1200, 56, 12, 12, 144, 7);
    const svg = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    // Left rim at the element's left edge (region x 144), right rim ending at
    // its right edge (144 + 1200 - 12 = 1332), both 12px wide and marked by
    // the low/high red-channel values.
    expect(svg).toContain("<rect x='144' y='7' width='12' height='56' fill='rgb(56,128,128)'/>");
    expect(svg).toContain("<rect x='1332' y='7' width='12' height='56' fill='rgb(200,128,128)'/>");
    // Bottom rim carries the high green channel; its corner cells carry both.
    expect(svg).toContain("<rect x='156' y='51' width='1176' height='12' fill='rgb(128,200,128)'/>");
    expect(svg).toContain("<rect x='1332' y='51' width='12' height='12' fill='rgb(200,200,128)'/>");
  });

  it("tiny surfaces shrink the rim so a flat centre survives", () => {
    const spec = sizedLensFilterSpec("t2", 24, 24);
    // rim = min(12, floor(24/3)) = 8: the map's first band rect is 8px wide.
    const uri = String(spec.children.find((c) => c.tag === "feImage")!.attrs.href);
    const svg = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    expect(svg).toContain("width='8' height='24' fill='rgb(56,128,128)'");
  });
});

describe("Trusted Types safety", () => {
  // The docs site sends `require-trusted-types-for 'script'`, and any consumer
  // may. Under that CSP Chromium throws a TypeError on EVERY string assigned to
  // innerHTML. The shared def is injected at import time, so a sink there does
  // not merely drop the glass, it escapes the module factory and blanks the app:
  // that is what served canvas.nannier.com a white page. Both injection paths
  // are therefore driven through a setter that throws exactly as Chromium does.
  function forbidInnerHTML() {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    Object.defineProperty(Element.prototype, "innerHTML", {
      configurable: true,
      get: original?.get,
      set() {
        throw new TypeError(
          "Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment.",
        );
      },
    });
    return () => {
      if (original) Object.defineProperty(Element.prototype, "innerHTML", original);
    };
  }

  it("builds both the shared and the sized defs without touching an innerHTML sink", () => {
    // Drop the import-time def so ensureGlassLens does real work under the ban.
    document.getElementById(GLASS_LENS_ID)?.remove();
    const restore = forbidInnerHTML();
    try {
      expect(ensureGlassLens()).toBe(true);
      const shared = document.getElementById(GLASS_LENS_ID)!;
      // Really SVG-namespaced elements, not HTML look-alikes named "filter".
      expect(shared.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(shared.querySelectorAll("feGaussianBlur").length).toBe(1);
      expect(shared.querySelectorAll("feDisplacementMap").length).toBe(0);

      const def = acquireSizedGlassLens(320, 96)!;
      const sized = document.getElementById(def.key)!;
      expect(sized.getAttribute("filterUnits")).toBe("userSpaceOnUse");
      expect(sized.querySelectorAll("feDisplacementMap").length).toBe(1);
      // Case-sensitive SVG attribute names survive setAttribute on an SVG node.
      expect(sized.querySelector("feDisplacementMap")!.getAttribute("xChannelSelector")).toBe("R");
      expect(sized.querySelector("feImage")!.getAttribute("href")).toContain("data:image/svg+xml,");
      releaseSizedGlassLens(def.key);
    } finally {
      restore();
    }
  });
});

describe("GlassSurface lens tier", () => {
  it("renders the lens layer on a Chromium UA (pending grade under the layout-less test DOM)", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      render(
        <ThemeProvider surface="glass">
          <GlassSurface testID="lens-gs" style={{ borderRadius: 12 }}>
            <Text>content</Text>
          </GlassSurface>
        </ThemeProvider>,
      );
      await waitFor(() => {
        const outer = screen.getByTestId("lens-gs") as HTMLElement;
        // GlassBox anatomy: the host, the material's motion wrapper, the clip box.
        const clip = outer.firstElementChild as HTMLElement;
        // Material order inside the clip box: under-fill, lens layer, specular
        // rim, then the content.
        const lensLayer = clip.children[1] as HTMLElement;
        // happy-dom performs no layout, so the layer holds the pending
        // blur+saturate grade; in a real browser onLayout swaps in the sized
        // url(#cds-glass-lens-WxH) def.
        expect(lensLayer.style.backdropFilter).toBe(GLASS_LENS_PENDING_FILTER);
        // The rim rides above the lens; the frost's BlurView is replaced, not
        // stacked (exactly one backdrop-filtered layer).
        const rim = clip.children[2] as HTMLElement;
        expect(rim.getAttribute("style") ?? "").toContain("box-shadow");
        const filtered = Array.from(clip.children).filter((c) => ((c as HTMLElement).getAttribute("style") ?? "").includes("backdrop-filter"));
        expect(filtered.length).toBe(1);
      });
    } finally {
      restore();
    }
  });

  it("measures a resting surface on layout and acquires the def for its own box", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const before = sizedGlassLensCount();
      const view = render(
        <ThemeProvider surface="glass">
          <GlassSurface testID="rest-gs" style={{ borderRadius: 12 }}>
            <Text>content</Text>
          </GlassSurface>
        </ThemeProvider>,
      );
      const clip = screen.getByTestId("rest-gs").firstElementChild as HTMLElement;
      const lensLayer = clip.children[1] as HTMLElement;
      await waitFor(() => expect(lensLayer.style.backdropFilter).toBe(GLASS_LENS_PENDING_FILTER));
      layoutElement(lensLayer, { width: 141, height: 39 });
      await waitFor(() => expect(lensLayer.style.backdropFilter).toBe(`url(#${GLASS_LENS_ID}-141x39)`));
      expect(sizedGlassLensCount()).toBe(before + 1);
      view.unmount();
      expect(sizedGlassLensCount()).toBe(before);
    } finally {
      restore();
    }
  });

  it("stays off the lens on a non-Chromium UA (happy-dom's own), keeping the ladder's next rung", async () => {
    render(
      <ThemeProvider surface="glass">
        <GlassSurface testID="frost-gs" style={{ borderRadius: 12 }}>
          <Text>content</Text>
        </GlassSurface>
      </ThemeProvider>,
    );
    await waitFor(() => {
      const outer = screen.getByTestId("frost-gs") as HTMLElement;
      // Stable browser frost does not require the optional native blur peer.
      const frost = outer.querySelector("[style*='backdrop-filter']") as HTMLElement;
      expect(frost.style.backdropFilter).toBe("blur(16px) saturate(150%)");
      expect(frost.style.backdropFilter).not.toContain("url(");
    });
  });

  it("keeps the Reduce Transparency rung above the lens (opaque, no filter)", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    const spy = spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-transparency"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          onchange: null,
          dispatchEvent: () => true,
        }) as unknown as MediaQueryList,
    );
    try {
      render(
        <ThemeProvider surface="glass">
          <GlassSurface testID="rt-gs" style={{ borderRadius: 12 }}>
            <Text>content</Text>
          </GlassSurface>
        </ThemeProvider>,
      );
      await waitFor(() => {
        const outer = screen.getByTestId("rt-gs") as HTMLElement;
        expect(outer.querySelector("[style*='backdrop-filter']")).toBeNull();
        expect((outer.getAttribute("style") ?? "")).not.toContain("backdrop-filter");
      });
    } finally {
      spy.mockRestore();
      restore();
    }
  });
});
