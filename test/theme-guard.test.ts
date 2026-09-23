import { describe, it, expect } from "bun:test";
import { getTheme, setTheme, toggleTheme, getPalette, setPalette, getSurface, setSurface, getDensity, setDensity } from "../src/theme.ts";

// The theme / palette / surface / density helpers are re-exported to every platform from the
// package barrel, so a native consumer or a web-SSR pass can call them with no DOM
// present. They must return the platform defaults and never touch document globals.

// Remove only the theme's own storage keys so a stale saved value from another test
// can't mask the no-document fallback (and so this test leaves no residue).
function clearThemeStorage(): void {
  try {
    globalThis.localStorage?.removeItem("canvas-theme");
    globalThis.localStorage?.removeItem("canvas-palette");
    globalThis.localStorage?.removeItem("canvas-surface");
    globalThis.localStorage?.removeItem("canvas-density");
  } catch {}
}

// Run fn with `document` removed from the global scope (simulating native / SSR),
// restoring the original property descriptor afterward.
function withoutDocument<T>(fn: () => T): T {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: undefined });
  try {
    return fn();
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete (globalThis as { document?: unknown }).document;
  }
}

describe("theme helpers without a document (native / SSR)", () => {
  it("getters return the platform defaults and never throw", () => {
    withoutDocument(() => {
      clearThemeStorage();
      expect(getTheme()).toBe("light");
      expect(getPalette()).toBe("blush");
      expect(getSurface()).toBe("solid");
      expect(getDensity()).toBe("regular");
    });
  });

  it("setters no-op safely and toggleTheme still resolves a value", () => {
    withoutDocument(() => {
      clearThemeStorage();
      expect(() => setTheme("dark")).not.toThrow();
      expect(() => setPalette("mint")).not.toThrow();
      expect(() => setSurface("glass")).not.toThrow();
      expect(() => setDensity("compact")).not.toThrow();
      clearThemeStorage();
      expect(toggleTheme()).toBe("dark");
    });
    clearThemeStorage();
  });
});
