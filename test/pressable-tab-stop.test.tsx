import { afterEach, describe, expect, it } from "bun:test";
import { type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Pressable as RNWPressable } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Pressable } from "../src/style/pressable.tsx";

// `focusable={false}` marks a pointer-only Pressable: a row's press area, a picture under
// its own control bar, a cell whose row carries the keyboard path. React Native honours it
// natively, but react-native-web's Pressable always renders a tab index of its own (0
// unless disabled), and an explicit tab index wins over `focusable` in its DOM props. The
// kit's Pressable spells the request as tab index -1, which React Native's View reads as
// focusable false, so the request means the same thing on every platform.

afterEach(cleanup);

const ui = (node: ReactNode) => render(<ThemeProvider solid>{node}</ThemeProvider>);
const tabIndexOf = (testID: string) => screen.getByTestId(testID).getAttribute("tabindex");

describe("the kit Pressable's tab stop", () => {
  it("takes a focusable={false} Pressable out of the tab order", () => {
    ui(<Pressable testID="area" focusable={false} accessible={false} onPress={() => {}} />);
    expect(tabIndexOf("area")).toBe("-1");
  });

  it("stays a tab stop by default and when asked to be focusable", () => {
    ui(
      <>
        <Pressable testID="plain" onPress={() => {}} />
        <Pressable testID="asked" focusable onPress={() => {}} />
      </>,
    );
    expect([tabIndexOf("plain"), tabIndexOf("asked")]).toEqual(["0", "0"]);
  });

  it("keeps a tab index the caller chose", () => {
    ui(
      <>
        <Pressable testID="roving-active" focusable={false} tabIndex={0} onPress={() => {}} />
        <Pressable testID="roving-rest" focusable tabIndex={-1} onPress={() => {}} />
      </>,
    );
    expect([tabIndexOf("roving-active"), tabIndexOf("roving-rest")]).toEqual(["0", "-1"]);
  });

  it("still leaves a disabled Pressable out of the tab order", () => {
    ui(<Pressable testID="off" disabled onPress={() => {}} />);
    expect(tabIndexOf("off")).toBe("-1");
  });

  it("still presses when it is out of the tab order", () => {
    let presses = 0;
    ui(<Pressable testID="area" focusable={false} onPress={() => (presses += 1)} />);
    fireEvent.click(screen.getByTestId("area"));
    expect(presses).toBe(1);
  });

  // The premise, checked so an upgrade that fixes it says so: when react-native-web's own
  // Pressable honours `focusable={false}`, the kit's spelling of it can go.
  it("compensates for react-native-web's Pressable, which ignores focusable={false}", () => {
    render(<RNWPressable testID="upstream" focusable={false} onPress={() => {}} />);
    expect(tabIndexOf("upstream")).toBe("0");
  });
});
