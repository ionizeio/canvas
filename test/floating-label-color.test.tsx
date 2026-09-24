import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { colorsByScheme } from "../src/style/tokens.ts";
import { primaryText } from "../src/style/primary-text.ts";
import { destructiveText } from "../src/style/destructive-text.ts";
import { Input } from "../src/atoms/input/input.android.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.android.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.android.tsx";
import { Select } from "../src/atoms/select/select.android.tsx";
import { Input as WebInput } from "../src/atoms/input/input.tsx";
import { Input as IOSInput } from "../src/atoms/input/input.ios.tsx";
import { Textarea as WebTextarea } from "../src/atoms/textarea/textarea.tsx";
import { Textarea as IOSTextarea } from "../src/atoms/textarea/textarea.ios.tsx";

afterEach(cleanup);

function rgb(color: string): string {
  if (/^#[\da-f]{6}$/i.test(color)) return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).join(",");
  const channels = color.match(/[\d.]+/g);
  if (!channels || channels.length < 3) throw new Error(`Expected rendered color: ${color}`);
  return channels.slice(0, 3).map(Number).join(",");
}
async function labelColor(label: string, expected: string) {
  // Assert the component's rendered endpoint after its real state transition.
  // RNW's test runtime snaps Animated timing; browser/native checks prove motion.
  await waitFor(() => expect(rgb(screen.getByText(label).style.color)).toBe(rgb(expected)));
}

describe("floating labels use text roles without recoloring control indicators", () => {
  for (const scheme of ["light", "dark"] as const) {
    const t = colorsByScheme[scheme];
    // Every M3 field's active indicator is `ring`; the Textarea's moved from `primary` in SKN-6.
    for (const [name, Component, indicator] of [["Input", Input, t.ring], ["Textarea", Textarea, t.ring]] as const) {
      it(`${scheme} ${name} preserves rest, focus, populated, error and recovery transitions`, async () => {
        const ui = (error = false) => <ThemeProvider scheme={scheme}><Component label="Project name" required error={error} placeholder="Enter a name" /></ThemeProvider>;
        const { rerender } = render(ui());
        const field = screen.getByLabelText("Project name");
        expect(rgb(field.style.backgroundColor)).toBe(rgb(t.muted));
        await labelColor("Project name", t["muted-foreground"]);
        fireEvent.focus(field);
        await labelColor("Project name", primaryText(t));
        expect(rgb(field.style.borderBottomColor)).toBe(rgb(indicator));
        fireEvent.change(field, { target: { value: "Canvas" } });
        fireEvent.blur(field);
        await labelColor("Project name", t["muted-foreground"]);
        expect((field as HTMLInputElement).value).toBe("Canvas");
        rerender(ui(true));
        await labelColor("Project name", destructiveText(t));
        expect(field.getAttribute("aria-invalid")).toBe("true");
        expect(rgb(field.style.borderBottomColor)).toBe(rgb(t.destructive));
        fireEvent.focus(field);
        await labelColor("Project name", destructiveText(t));
        rerender(ui());
        await labelColor("Project name", primaryText(t));
        expect(field.getAttribute("aria-invalid")).not.toBe("true");
        expect(field.getAttribute("aria-required")).toBe("true");
        expect(rgb(screen.getByText("*").style.color)).toBe(rgb(t.destructive));
        expect(screen.getByText("*").getAttribute("aria-hidden")).toBe("true");
      });
    }

    it(`${scheme} Autocomplete tints its label while active: focused or open`, async () => {
      render(<ThemeProvider scheme={scheme}><Autocomplete label="Fruit" options={["Apple", "Pear"]} /></ThemeProvider>);
      const field = screen.getByRole("combobox", { name: "Fruit" });
      await labelColor("Fruit", t["muted-foreground"]);
      fireEvent.focus(field);
      await labelColor("Fruit", primaryText(t));
      expect(field.getAttribute("aria-expanded")).toBe("true");
      fireEvent.keyDown(field, { key: "Escape" });
      fireEvent.keyUp(field, { key: "Escape" });
      // Escape closes the list but the field keeps focus, so it stays active: the tint
      // and the indicator are its keyboard focus cue (it suppresses the browser ring).
      expect(field.getAttribute("aria-expanded")).toBe("false");
      await labelColor("Fruit", primaryText(t));
      fireEvent.blur(field);
      await labelColor("Fruit", t["muted-foreground"]);
    });

    it(`${scheme} Select uses open/close without acquiring an error API`, async () => {
      render(<ThemeProvider scheme={scheme}><Select label="Region" options={["EU", "US"]} /></ThemeProvider>);
      const trigger = screen.getByRole("button", { name: "Region" });
      expect(rgb(trigger.style.backgroundColor)).toBe(rgb(t.muted));
      await labelColor("Region", t["muted-foreground"]);
      fireEvent.click(trigger);
      await labelColor("Region", primaryText(t));
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(trigger);
      await labelColor("Region", t["muted-foreground"]);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    it(`${scheme} changing a focused theme updates the role but keeps value and focus`, async () => {
      const ui = (text: string) => <ThemeProvider scheme={scheme} tokens={{ primary: "#643069", "primary-text": text }}><Input label="Branded" defaultValue="Retained" /></ThemeProvider>;
      const { rerender } = render(ui("#794280"));
      const field = screen.getByLabelText("Branded");
      act(() => field.focus());
      await labelColor("Branded", "#794280");
      rerender(ui("#a764b0"));
      await labelColor("Branded", "#a764b0");
      expect(screen.getByLabelText("Branded")).toBe(field);
      expect(document.activeElement).toBe(field);
      expect((field as HTMLInputElement).value).toBe("Retained");
      expect(rgb(field.style.borderBottomColor)).toBe(rgb(t.ring));
    });

    // The static above-field label never recolours on focus. The web titles it in Dark
    // Factory's muted eyebrow (SKN-6), the iOS skins in the iOS input-field reference's
    // secondary gray (`muted-foreground`, its Text/Label), and the Android grouped fallback
    // in `foreground`.
    for (const [name, Component, props, role] of [
      ["Web Input", WebInput, {}, "muted-foreground"], ["iOS Input", IOSInput, {}, "muted-foreground"],
      ["Web Textarea", WebTextarea, {}, "muted-foreground"], ["iOS Textarea", IOSTextarea, {}, "muted-foreground"],
      ["Android grouped Input", Input, { prefix: "$" }, "foreground"],
      ["Android flush Textarea", Textarea, { flush: true }, "foreground"],
    ] as const) {
      it(`${scheme} ${name} preserves its above-field label`, () => {
        render(<ThemeProvider scheme={scheme}><Component label="Static label" {...props} /></ThemeProvider>);
        const label = screen.getByText("Static label");
        const before = label.style.color;
        fireEvent.focus(screen.getByLabelText("Static label"));
        expect(label.style.color).toBe(before);
        expect(rgb(before)).toBe(rgb(t[role]));
      });
    }
  }
});
