import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Card } from "../src/molecules/card/card.tsx";
import { Stats } from "../src/molecules/stats/stats.tsx";

afterEach(cleanup);

describe("static content mode changes", () => {
  for (const kind of ["card", "pressable-card", "stats"] as const) {
    it(`${kind} preserves a live editor and its local state across material changes`, () => {
      let mounts = 0;
      function Editor() {
        const [value, setValue] = useState("Original");
        useEffect(() => { mounts++; }, []);
        return <TextInput accessibilityLabel="Local draft" value={value} onChangeText={setValue} />;
      }
      const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
      Object.defineProperty(globalThis, "CSS", { value: { supports: () => true }, configurable: true });
      const tree = (glass: boolean) => <ThemeProvider glass={glass} solid={!glass}>
        {kind === "stats"
          ? <Stats items={[{ label: "Draft", value: "42", actions: <Editor /> }]} onPressItem={() => {}} />
          : <Card onPress={kind === "pressable-card" ? () => {} : undefined}><Editor /></Card>}
      </ThemeProvider>;
      try {
        const { getByRole, rerender, container } = render(tree(false));
        const input = getByRole("textbox", { name: "Local draft" }) as HTMLInputElement;
        input.focus();
        fireEvent.change(input, { target: { value: "Unsaved local draft" } });
        input.setSelectionRange(3, 9);
        for (const glass of [true, false, true, false]) {
          rerender(tree(glass));
          expect(getByRole("textbox", { name: "Local draft" })).toBe(input);
          expect(document.activeElement).toBe(input);
          expect(input.value).toBe("Unsaved local draft");
          expect([input.selectionStart, input.selectionEnd]).toEqual([3, 9]);
          expect(mounts).toBe(1);
          expect(container.querySelectorAll('[style*="backdrop-filter"]').length).toBe(glass ? 1 : 0);
        }
      } finally {
        if (css) Object.defineProperty(globalThis, "CSS", css);
      }
    });
  }
});
