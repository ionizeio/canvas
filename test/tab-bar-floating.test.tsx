import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { TabBar as WebBar } from "../src/organisms/tab-bar/tab-bar.tsx";

afterEach(cleanup);

const destinations = ["Home", "Search", "Library"].map((label) => ({
  key: label.toLowerCase(), label, icon: () => <Text testID={`${label}-glyph`}>●</Text>,
}));

// The outermost padded ancestor of the tablist: a docked bar's own box, whose bottom
// padding grew by the inset, or a floating bar's frame, which keeps the inset under the
// capsule (the capsule's own symmetric padding sits between the two).
function insetHostOf(bar: HTMLElement): HTMLElement | null {
  let host: HTMLElement | null = null;
  for (let node = bar.parentElement; node; node = node.parentElement) {
    if (node.style.paddingBottom) host = node;
  }
  return host;
}

describe("TabBar floating capsule", () => {
  it("keeps a floating capsule's safe-area space under the bar, never inside it", async () => {
    // A phone with a 34pt home-indicator inset: the capsule floats 22pt up (34 - 12),
    // clear of the indicator; with no inset it keeps its 8pt floor.
    for (const [inset, expected] of [[34, "22px"], [0, "8px"]] as const) {
      const { unmount } = render(<ThemeProvider solid><WebBar items={destinations} bottomInset={inset} testID="bar" /></ThemeProvider>);
      await act(async () => {});
      expect(insetHostOf(screen.getByTestId("bar"))?.style.paddingBottom).toBe(expected);
      const capsule = screen.getByTestId("bar").parentElement as HTMLElement;
      expect(capsule.style.borderRadius).toBe("9999px");
      unmount();
    }
  });
});
