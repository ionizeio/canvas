import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { useContext, type RefObject } from "react";
import { TextInput, View } from "react-native";
import { EntranceReadinessContext } from "../src/style/entrance-readiness.ts";
import { createCaptureTarget, useCaptureDemand, useReadyCaptureTarget } from "../src/style/glass-surface/capture-target.ts";
import { GlassBlurTargetContext } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { OverlayProvider, Portal } from "../src/style/portal.tsx";
import { ThemeProvider, useTheme, type ThemeValue } from "../src/style/theme.tsx";
import { ResolvedThemeProvider } from "../src/style/theme-context.tsx";
import { Text } from "../src/style/text.tsx";
import type { ThemeFonts } from "../src/style/fonts.ts";

afterEach(cleanup);

// The app's registered faces, on the root provider only (a module constant, as the docs ask).
const FACES: ThemeFonts = { sans: { "400": "Manrope_400Regular", "700": "Manrope_700Bold" }, mono: "GeistMono" };

describe("portal material context", () => {
  for (const nestedSurface of ["glass", "solid"] as const) {
    it(`retains the exact nested ${nestedSurface} theme across the outlet`, () => {
      const fonts = { sans: "Brand Sans", mono: { "400": "Brand Mono" } };
      const tokens = { primary: "#176b9b", card: "#122237" };
      let source: ThemeValue | undefined;
      let outlet: ThemeValue | undefined;
      function Probe({ portaled = false }: { portaled?: boolean }) {
        const theme = useTheme();
        if (portaled) outlet = theme;
        else source = theme;
        return null;
      }
      render(
        <ThemeProvider light surface={nestedSurface === "glass" ? "solid" : "glass"}>
          <OverlayProvider>
            <ThemeProvider dark surface={nestedSurface} fonts={fonts} tokens={tokens}>
              <Probe />
              <Portal><Probe portaled /></Portal>
            </ThemeProvider>
          </OverlayProvider>
        </ThemeProvider>,
      );
      expect(outlet).toBe(source);
      expect(outlet?.surface).toBe(nestedSurface);
      expect(outlet?.scheme).toBe("dark");
      expect(outlet?.tokens.primary).toBe(tokens.primary);
      expect(outlet?.tokens.card).toBe(tokens.card);
      expect(outlet?.tokens).toBe(source?.tokens);
      expect(outlet?.glass).toBe(source?.glass);
      expect(outlet?.fonts).toBe(fonts);
    });
  }

  it("carries faces a nested provider inherited into the outlet", () => {
    let outlet: ThemeValue | undefined;
    function Probe() {
      outlet = useTheme();
      return null;
    }
    const { getByText } = render(
      <ThemeProvider fonts={FACES}>
        <OverlayProvider>
          <ThemeProvider dark>
            <Portal><Probe /><Text>Portaled</Text></Portal>
          </ThemeProvider>
        </OverlayProvider>
      </ThemeProvider>,
    );
    expect(outlet?.fonts).toBe(FACES);
    expect(outlet?.scheme).toBe("dark");
    expect(getComputedStyle(getByText("Portaled")).fontFamily).toBe("Manrope_400Regular");
  });

  it("gives a provider nested inside portaled content the faces the outlet re-provides", () => {
    let nested: ThemeValue | undefined;
    function Probe() {
      nested = useTheme();
      return null;
    }
    const { getByText } = render(
      <ThemeProvider fonts={FACES}>
        <OverlayProvider>
          <Portal>
            <ThemeProvider dark>
              <Probe />
              <Text>Inside the outlet</Text>
            </ThemeProvider>
          </Portal>
        </OverlayProvider>
      </ThemeProvider>,
    );
    expect(nested?.fonts).toBe(FACES);
    expect(nested?.scheme).toBe("dark");
    expect(getComputedStyle(getByText("Inside the outlet")).fontFamily).toBe("Manrope_400Regular");
  });

  it("updates material and accessibility demand without replacing the focused foreground or its safe target", () => {
    const safe = createCaptureTarget();
    const unsafeSource = createCaptureTarget();
    safe.attach({} as View);
    unsafeSource.attach({} as View);
    safe.setAvailable(safe.ref.current!, true);
    unsafeSource.setAvailable(unsafeSource.ref.current!, true);
    let published: ThemeValue | undefined;
    let received: ThemeValue | undefined;
    let receivedTarget: RefObject<View | null> | null = null;
    let receivedReady = true;

    function Foreground() {
      const theme = useTheme();
      const target = useReadyCaptureTarget(useContext(GlassBlurTargetContext));
      received = theme;
      receivedTarget = target;
      receivedReady = useContext(EntranceReadinessContext);
      useCaptureDemand(target ?? unsafeSource.ref, target !== null && theme.surface === "glass" && !theme.reducedTransparency && !theme.increasedContrast);
      return <TextInput testID="portal-editor" defaultValue="local draft" />;
    }
    function Publisher({ surface, reduced = false, contrast = false, ready }: {
      surface: "solid" | "glass"; reduced?: boolean; contrast?: boolean; ready: boolean;
    }) {
      // The private bridge accepts the already resolved native/OS snapshot.
      // It must carry these flags directly instead of resolving preferences again.
      published = { ...useTheme(), surface, reducedTransparency: reduced, increasedContrast: contrast };
      return <ResolvedThemeProvider value={published}>
        <GlassBlurTargetContext.Provider value={unsafeSource.ref}>
          <EntranceReadinessContext.Provider value={ready}>
            <Portal><Foreground /></Portal>
          </EntranceReadinessContext.Provider>
        </GlassBlurTargetContext.Provider>
      </ResolvedThemeProvider>;
    }
    function Fixture(props: Parameters<typeof Publisher>[0] & { open?: boolean }) {
      return <ThemeProvider dark solid>
        <GlassBlurTargetContext.Provider value={safe.ref}>
          <EntranceReadinessContext.Provider value={false}>
            <OverlayProvider>{props.open === false ? null : <Publisher {...props} />}</OverlayProvider>
          </EntranceReadinessContext.Provider>
        </GlassBlurTargetContext.Provider>
      </ThemeProvider>;
    }
    const { getByTestId, rerender } = render(<Fixture surface="glass" ready />);
    const editor = getByTestId("portal-editor") as HTMLInputElement;
    act(() => { editor.focus(); editor.setSelectionRange(2, 7); });
    const assertForeground = (active: boolean, ready: boolean) => {
      expect(received).toBe(published);
      expect(receivedTarget).toBe(safe.ref);
      expect(receivedReady).toBe(ready);
      expect(safe.active()).toBe(active);
      expect(unsafeSource.active()).toBe(false);
      expect(getByTestId("portal-editor")).toBe(editor);
      expect(editor.value).toBe("local draft");
      expect(document.activeElement).toBe(editor);
      expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 7]);
    };
    assertForeground(true, true);
    rerender(<Fixture surface="solid" ready={false} />);
    assertForeground(false, false);
    rerender(<Fixture surface="glass" reduced ready />);
    assertForeground(false, true);
    expect(received?.reducedTransparency).toBe(true);
    rerender(<Fixture surface="glass" contrast ready />);
    assertForeground(false, true);
    expect(received?.increasedContrast).toBe(true);
    rerender(<Fixture surface="glass" ready />);
    assertForeground(true, true);
    rerender(<Fixture surface="glass" ready open={false} />);
    expect(safe.active()).toBe(false);
    expect(unsafeSource.active()).toBe(false);
  });
});
