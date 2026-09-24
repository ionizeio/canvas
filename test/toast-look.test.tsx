import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Pressable, Text } from "react-native";
import * as iconModule from "../src/atoms/icon/icon.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors } from "../src/style/tokens.ts";
import { inverseStatus } from "../src/style/inverse.ts";
import { Toast, ToastProvider, useToast } from "../src/organisms/toast/toast.tsx";
import { webSkin, iosSkin } from "../src/organisms/toast/toast.styles.ts";

// The web and iOS toast is Dark Factory's toast pill (SKN-5c): the deep `inverse` fill in
// every scheme, a pill for one line and the sheet corner once a description wraps, the
// message in its strong body, and the kit's extra parts in inks solved for the pill.

afterEach(cleanup);

const t = lightColors;

describe("Dark Factory's toast pill", () => {
  it("is the web skin on iOS too, the inverse pill that takes the sheet corner once a description wraps", () => {
    expect(iosSkin).toBe(webSkin);
    expect(webSkin.container(t, false, false)).toMatchObject({ borderRadius: 9999, backgroundColor: t.inverse, paddingVertical: 11, paddingStart: 18 });
    expect(webSkin.container(t, false, true).borderRadius).toBe(22);
    expect(webSkin.container(darkColors, false, false).backgroundColor).toBe(darkColors.inverse);
    expect(webSkin.message(t)).toMatchObject({ fontSize: 12.5, lineHeight: 17, fontWeight: "700", color: t["inverse-foreground"] });
  });

  it("draws the intent glyphs in the dark scheme's status inks, which read on the pill", () => {
    const drawn = (ui: React.ReactElement) => {
      const spy = spyOn(iconModule, "Icon");
      try {
        render(ui);
        return spy.mock.calls.map(([props]) => props as Record<string, unknown>);
      } finally {
        spy.mockRestore();
        cleanup();
      }
    };
    const [success] = drawn(<ThemeProvider light solid><Toast success message="Saved" /></ThemeProvider>);
    expect(success.circleCheck).toBe(true);
    expect(success.color).toBe(inverseStatus(t, "success"));
    expect(inverseStatus(t, "success")).toBe(darkColors.success);
  });
});

describe("the toast provider", () => {
  it("passes the destructive intent through to the toast it shows", () => {
    function Fire() {
      const { toast } = useToast();
      return (
        <Pressable onPress={() => toast({ message: "Deleted", destructive: true })}>
          <Text>fire</Text>
        </Pressable>
      );
    }
    const spy = spyOn(iconModule, "Icon");
    try {
      render(<ThemeProvider light solid><ToastProvider><Fire /></ToastProvider></ThemeProvider>);
      act(() => { fireEvent.click(screen.getByText("fire")); });
      expect(screen.getByText("Deleted")).toBeTruthy();
      const glyph = spy.mock.calls.map(([props]) => props as Record<string, unknown>).find((props) => props.circleX === true);
      expect(glyph?.color).toBe(inverseStatus(t, "error"));
    } finally {
      spy.mockRestore();
    }
  });
});
