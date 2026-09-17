import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ThemeProvider, useTheme } from "../src/style/theme.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { GlassPane, paneStyle } from "../src/style/glass-surface/glass-pane.tsx";
import { resolveMaterial, type MaterialCapabilities } from "../src/style/glass-surface/material-resolution.ts";
import { useMaterialTheme } from "../src/style/glass-surface/use-material-theme.ts";
import { innerFill, withInnerFill } from "../src/style/glass-fill.ts";
import { lightColors } from "../src/style/tokens.ts";

afterEach(cleanup);
const requested = { surface: "glass", reducedTransparency: false, increasedContrast: false } as const;
const ios: MaterialCapabilities = { platform: "ios", frost: true, liquid: true, lens: false, requiresTarget: false };
const chrome: MaterialCapabilities = { platform: "web", frost: true, liquid: false, lens: true, requiresTarget: false };
const android: MaterialCapabilities = { platform: "android", frost: true, liquid: false, lens: false, requiresTarget: true };

describe("material role and capability resolution", () => {
  it("separates static roles from density on iOS and Chromium", () => {
    for (const capabilities of [ios, chrome]) {
      expect(resolveMaterial(requested, { layer: "content" }, capabilities, false).renderer).toBe("frost");
      expect(resolveMaterial(requested, { layer: "control", static: true }, capabilities, false).renderer).toBe("frost");
      expect(resolveMaterial(requested, { layer: "dense", static: true }, capabilities, false).renderer).toBe("frost");
      expect(resolveMaterial(requested, { layer: "dense" }, capabilities, false).renderer).toBe(capabilities.liquid ? "liquid" : "lens");
    }
  });
  it("requires a safe live Android target and never treats tint as material", () => {
    expect(resolveMaterial(requested, {}, android, false)).toMatchObject({ renderer: "solid", fallback: "missing-target" });
    expect(resolveMaterial(requested, {}, android, true).renderer).toBe("frost");
    expect(resolveMaterial(requested, {}, { ...android, requiresTarget: false }, false).renderer).toBe("frost");
  });
  it("uses complete solid for missing peers and preference overrides", () => {
    expect(resolveMaterial(requested, { static: true }, { ...ios, frost: false }, false).renderer).toBe("solid");
    for (const capabilities of [ios, chrome, android]) {
      for (const flags of [{ surface: "solid" as const }, { reducedTransparency: true }, { increasedContrast: true }]) {
        expect(resolveMaterial({ ...requested, ...flags }, {}, capabilities, true).renderer).toBe("solid");
      }
    }
  });
});

function browserSupport(enabled = true) {
  const descriptor = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
  Object.defineProperty(window.navigator, "userAgent", { value: "Chrome/140.0.0.0", configurable: true });
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { value: { supports: () => enabled }, configurable: true });
  return () => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    if (descriptor) Object.defineProperty(window.navigator, "userAgent", descriptor);
    else delete (window.navigator as unknown as Record<string, unknown>).userAgent;
  };
}

describe("material mode changes", () => {
  it("keeps the same live editor, local state, caret and scroll in both directions", () => {
    const restore = browserSupport();
    let mounts = 0;
    function Editor() {
      const [value, setValue] = useState("draft");
      useEffect(() => { mounts += 1; }, []);
      return <TextInput accessibilityLabel="Draft" value={value} onChangeText={setValue} />;
    }
    const tree = (glass: boolean) => <ThemeProvider glass={glass} solid={!glass}>
      <GlassSurface testID="surface" style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", padding: 8 }}>
        <View testID="scroller"><Editor /></View>
      </GlassSurface>
    </ThemeProvider>;
    try {
      const result = render(tree(false));
      const editor = screen.getByRole("textbox", { name: "Draft" }) as HTMLInputElement;
      const scroller = screen.getByTestId("scroller");
      editor.focus();
      fireEvent.change(editor, { target: { value: "unsaved work" } });
      editor.setSelectionRange(2, 7);
      scroller.scrollTop = 83;
      for (const glass of [true, false, true, false]) {
        result.rerender(tree(glass));
        expect(screen.getByRole("textbox", { name: "Draft" })).toBe(editor);
        expect(document.activeElement).toBe(editor);
        expect(editor.value).toBe("unsaved work");
        expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 7]);
        expect(scroller.scrollTop).toBe(83);
        expect(mounts).toBe(1);
        expect(result.container.querySelectorAll('[style*="backdrop-filter"]').length).toBe(glass ? 1 : 0);
      }
    } finally { restore(); }
  });

  it("restores the pane skin when no material can render", () => {
    const restore = browserSupport(false);
    function LegacyPane() {
      const shape = { backgroundColor: "#123456", borderRadius: 12, borderWidth: 2, borderColor: "#abcdef" };
      return <View style={paneStyle(true, shape)}><GlassPane shape={shape} testID="pane" /><Text>Readable</Text></View>;
    }
    try {
      render(<ThemeProvider glass><LegacyPane /></ThemeProvider>);
      const pane = screen.getByTestId("pane");
      expect(pane.style.backgroundColor).toMatch(/18, ?52, ?86/);
      expect(pane.style.borderWidth).toBe("2px");
      expect(pane.style.borderColor).toMatch(/171, ?205, ?239/);
      expect(pane.querySelector('[style*="backdrop-filter"]')).toBeNull();
    } finally { restore(); }
  });

  it("uses the solid foreground/state recipe when capability is absent", () => {
    const restore = browserSupport(false);
    function Probe() {
      const theme = useMaterialTheme({ static: true });
      return <Text>{`${theme.surface}:${innerFill(theme, "muted")}`}</Text>;
    }
    try {
      render(<ThemeProvider glass><Probe /></ThemeProvider>);
      expect(screen.getByText(`solid:${lightColors.muted}`)).toBeDefined();
    } finally { restore(); }
  });

  it("keeps inner fills opaque under accessibility preferences", () => {
    const theme = { ...requested, dark: false, tokens: lightColors, increasedContrast: true };
    expect(innerFill(theme, "muted")).toBe(lightColors.muted);
    expect(withInnerFill(theme, { backgroundColor: lightColors.secondary }).backgroundColor).toBe(lightColors.secondary);
  });

  it("adds contrast boundaries to pane hosts without mounting decoration", () => {
    const media = spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-contrast"), addEventListener() {}, removeEventListener() {},
    }) as unknown as MediaQueryList);
    function Probe() {
      const theme = useTheme();
      return <View testID="host" style={paneStyle(theme, { backgroundColor: theme.tokens.card })}><GlassPane shape={{ backgroundColor: theme.tokens.card }} /></View>;
    }
    try {
      render(<ThemeProvider glass><Probe /></ThemeProvider>);
      const host = screen.getByTestId("host");
      expect(host.style.borderWidth).toBe("1px");
      expect(host.style.backgroundColor).toMatch(/255, ?255, ?255/);
      expect(host.children.length).toBe(0);
    } finally { media.mockRestore(); }
  });
});
