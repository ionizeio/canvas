import { describe, it, expect, afterEach } from "bun:test";
import { act, cleanup, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
// Web build (the alias serves <name>.tsx); the per-OS skins never hydrate server markup.
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { GLASS_LENS_PENDING_FILTER } from "../src/style/glass-surface/glass-lens.ts";

afterEach(cleanup);

// The material's hydration story. Which material a browser can render (the Chromium
// lens, a backdrop-filter frost, or nothing) is a CLIENT fact read from the user
// agent and CSS.supports, so a server render cannot know it. The static docs export
// shipped solid panels and hydrated into glass ones: React found markup it never sent,
// threw the tree away and rebuilt it (the flash-and-rebuild this guards against). The
// server now assumes frost for the web, the hydration render reproduces that exactly,
// and the lens lands in the commit right after where the engine can render it.

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function overrideUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  return () => {
    delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
  };
}

// Render as a server would. The test DOM exposes `CSS.supports` and a user agent, which a
// Node process never has, so the probes are hidden for the duration of the render: with
// them visible the "server" would see exactly what the client sees and the mismatch this
// file guards against could never show up here.
function renderOnServer(element: React.ReactElement): string {
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { value: undefined, configurable: true });
  const restoreAgent = overrideUserAgent("node");
  try {
    return renderToString(element);
  } finally {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    restoreAgent();
  }
}

const ui = (
  <ThemeProvider glass>
    <GlassSurface layer="functional" style={{ borderRadius: 12 }}>
      <Text>Glass body</Text>
    </GlassSurface>
  </ThemeProvider>
);

// The material layer is the one node carrying a backdrop-filter (layer order: under-fill, material, rim).
const materialLayer = (root: ParentNode) => root.querySelector("[style*='backdrop-filter']") as HTMLElement | null;

describe("GlassSurface server render", () => {
  it("renders the frost material on the server, never the Chromium lens", () => {
    const html = renderOnServer(ui);
    const container = document.createElement("div");
    container.innerHTML = html;
    const layer = materialLayer(container);
    expect(layer).not.toBeNull();
    // Frost is a plain blur + saturate grade; the lens layer would hold the pending
    // lens grade until it acquires a sized filter def, which no server can do.
    expect(layer!.style.backdropFilter).toContain("blur(");
    expect(layer!.style.backdropFilter).not.toBe(GLASS_LENS_PENDING_FILTER);
    expect(html).toContain("Glass body");
  });
});

describe("GlassSurface hydration", () => {
  it("hydrates the server's frost markup on a Chromium client without a mismatch, then upgrades to the lens", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderOnServer(ui);
    const restore = overrideUserAgent(CHROME_UA);
    document.body.appendChild(container);
    const serverBody = Array.from(container.querySelectorAll("div")).find((node) => node.textContent === "Glass body");
    const recovered: string[] = [];
    let root!: Root;
    try {
      act(() => {
        root = hydrateRoot(container, ui, { onRecoverableError: (error) => { recovered.push(String(error)); } });
      });
      // The hydration render matched the server byte for byte: nothing to recover from,
      // and the very node the server shipped still carries the content (a rebuilt
      // subtree would be new nodes).
      expect(recovered).toEqual([]);
      const liveBody = Array.from(container.querySelectorAll("div")).find((node) => node.textContent === "Glass body");
      expect(liveBody).toBe(serverBody!);
      // One commit later the engine's real capabilities apply: the lens layer (its own
      // component, so a fresh node) replaces the frost layer.
      await waitFor(() => expect(materialLayer(container)!.style.backdropFilter).toBe(GLASS_LENS_PENDING_FILTER));
    } finally {
      act(() => root.unmount());
      container.remove();
      restore();
    }
  });
});
