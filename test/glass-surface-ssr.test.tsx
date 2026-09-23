import { describe, it, expect, afterEach } from "bun:test";
import { act, cleanup, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
// Web build (the alias serves <name>.tsx); the per-OS skins never hydrate server markup.
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { WEB_FROST } from "../src/style/glass-surface/web-frost.ts";
import { useHydrated } from "../src/style/use-hydrated.ts";

afterEach(cleanup);

// The material's hydration story. Whether a browser can render the frost (a CSS
// backdrop-filter) is a CLIENT fact read from CSS.supports, so a server render cannot
// know it. The static docs export shipped solid panels and hydrated into glass ones:
// React found markup it never sent, threw the tree away and rebuilt it (the
// flash-and-rebuild this guards against). The server now assumes frost for the web, the
// hydration render reproduces that exactly, and the browser's real answer lands in the
// commit right after: the same frost where backdrop-filter renders, the solid skin where
// it does not.

// Render as a server would. The test DOM exposes `CSS.supports`, which a Node process
// never has, so the probe is hidden for the duration of the render: with it visible the
// "server" would see exactly what the client sees and the mismatch this file guards
// against could never show up here.
function renderOnServer(element: React.ReactElement): string {
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { value: undefined, configurable: true });
  try {
    return renderToString(element);
  } finally {
    if (css) Object.defineProperty(globalThis, "CSS", css);
  }
}

// A client whose browser answers the backdrop-filter probe with `supported`.
function overrideBackdropSupport(supported: boolean) {
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { value: { supports: () => supported }, configurable: true });
  return () => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as Record<string, unknown>).CSS;
  };
}

// Marks the commit after hydration: "server" for the server render and the hydration
// render, "client" from the first commit on, the same gate the material capabilities use.
function HydrationProbe() {
  return <Text>{useHydrated() ? "client" : "server"}</Text>;
}

const ui = (
  <ThemeProvider glass>
    <GlassSurface layer="functional" style={{ borderRadius: 12 }}>
      <Text>Glass body</Text>
    </GlassSurface>
    <HydrationProbe />
  </ThemeProvider>
);

// The material wrapper GlassBox paints behind the content, and inside it the frost layer:
// the one node carrying a backdrop-filter (layer order: under-fill, frost, rim).
const materialOf = (root: ParentNode) => root.querySelector('[data-testid="glass-material"]') as HTMLElement | null;
const frostOf = (root: ParentNode) => materialOf(root)?.querySelector("[style*='backdrop-filter']") as HTMLElement | null;
const bodyOf = (root: ParentNode) => Array.from(root.querySelectorAll("div")).find((node) => node.textContent === "Glass body");

describe("GlassSurface server render", () => {
  it("renders the frost material on the server", () => {
    const html = renderOnServer(ui);
    const container = document.createElement("div");
    container.innerHTML = html;
    const frost = frostOf(container);
    expect(frost).not.toBeNull();
    // Dark Factory's plain frost: one blur, with no saturation shift.
    expect(frost!.style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
    expect(html).toContain("Glass body");
    expect(html).toContain("server");
  });
});

describe("GlassSurface hydration", () => {
  it("hydrates the server's frost markup without a mismatch, and keeps that frost where backdrop-filter renders", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderOnServer(ui);
    const restore = overrideBackdropSupport(true);
    document.body.appendChild(container);
    const serverBody = bodyOf(container);
    const serverFrost = frostOf(container);
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
      expect(bodyOf(container)).toBe(serverBody!);
      // One commit later the browser's real capabilities apply. It renders the frost the
      // server assumed, so the material the server shipped stays in place untouched.
      await waitFor(() => expect(container.textContent).toContain("client"));
      expect(frostOf(container)).toBe(serverFrost!);
      expect(serverFrost!.style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
    } finally {
      act(() => root.unmount());
      container.remove();
      restore();
    }
  });

  it("hydrates the server's frost markup without a mismatch, then falls to the solid skin where backdrop-filter does not render", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderOnServer(ui);
    const restore = overrideBackdropSupport(false);
    document.body.appendChild(container);
    const serverBody = bodyOf(container);
    const recovered: string[] = [];
    let root!: Root;
    try {
      act(() => {
        root = hydrateRoot(container, ui, { onRecoverableError: (error) => { recovered.push(String(error)); } });
      });
      expect(recovered).toEqual([]);
      expect(bodyOf(container)).toBe(serverBody!);
      // One commit later the browser's answer applies: no frost, so the complete solid
      // skin, with the content node the server shipped still in place.
      await waitFor(() => expect(materialOf(container)).toBeNull());
      expect(container.querySelector("[style*='backdrop-filter']")).toBeNull();
      expect(bodyOf(container)).toBe(serverBody!);
    } finally {
      act(() => root.unmount());
      container.remove();
      restore();
    }
  });
});
