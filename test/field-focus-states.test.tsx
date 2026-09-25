import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { fieldBorder } from "../src/style/field-colors.ts";
import { FOCUS_RING_OFFSET } from "../src/style/pressable.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Stepper } from "../src/atoms/stepper/stepper.tsx";
import { Stepper as IOSStepper } from "../src/atoms/stepper/stepper.ios.tsx";
import { Stepper as AndroidStepper } from "../src/atoms/stepper/stepper.android.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Input } from "../src/atoms/input/input.tsx";

// A field suppresses the browser's focus ring only because it paints a focus state of
// its own; these hold that every such field really paints one, and that Increase
// Contrast keeps a state border (focus, error, an open list) instead of overwriting it
// with the contrasting hairline, which would leave a keyboard user no focus cue.

afterEach(cleanup);

const t = lightColors;
const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};
const border = (node: HTMLElement, side = "") => channels(node.style.getPropertyValue(`border${side}-color`) || node.style.borderColor);
const outline = (node: HTMLElement, property: "offset" | "style" | "color" | "width") => node.style.getPropertyValue(`outline-${property}`);

describe("fields paint their own focus state", () => {
  it("the web Autocomplete field turns its border `ring` while focused, even after Escape closes the list", async () => {
    render(<ThemeProvider light solid><Autocomplete label="Fruit" options={["Apple", "Pear"]} /></ThemeProvider>);
    const field = screen.getByRole("combobox", { name: "Fruit" });
    const box = field.parentElement as HTMLElement;
    expect(border(box)).toBe(channels(fieldBorder(t)));
    fireEvent.focus(field);
    await waitFor(() => expect(border(box)).toBe(channels(t.ring)));
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.keyUp(field, { key: "Escape" });
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(border(box)).toBe(channels(t.ring));
    fireEvent.blur(field);
    await waitFor(() => expect(border(box)).toBe(channels(fieldBorder(t))));
  });

  it("the web Stepper box turns its border `ring` while its value field holds focus", async () => {
    render(<ThemeProvider light solid><Stepper defaultValue={2} accessibilityLabel="Seats" /></ThemeProvider>);
    const field = screen.getByRole("spinbutton");
    const group = field.parentElement as HTMLElement;
    expect(border(group)).toBe(channels(fieldBorder(t)));
    expect(outline(field, "style")).toBe("solid");
    expect(outline(field, "width")).toBe("0px");
    fireEvent.focus(field);
    await waitFor(() => expect(border(group)).toBe(channels(t.ring)));
    fireEvent.blur(field);
    await waitFor(() => expect(border(group)).toBe(channels(fieldBorder(t))));
  });

  it("a bare iOS or Android Stepper field keeps the kit's themed ring instead", () => {
    render(
      <ThemeProvider light solid>
        <IOSStepper defaultValue={2} accessibilityLabel="iOS seats" />
        <AndroidStepper defaultValue={2} accessibilityLabel="Android seats" />
      </ThemeProvider>,
    );
    for (const field of screen.getAllByRole("spinbutton")) {
      expect(outline(field, "style")).toBe("");
      expect(channels(outline(field, "color"))).toBe(channels(t.ring));
    }
  });

  it("the Command search row's rule turns `ring` and thickens while the search field holds focus", async () => {
    render(<ThemeProvider light solid><Command items={[{ label: "Profile" }, { label: "Settings" }]} /></ThemeProvider>);
    const search = screen.getByRole("textbox");
    const row = search.parentElement as HTMLElement;
    expect(row.style.getPropertyValue("border-bottom-width")).toBe("1px");
    fireEvent.focus(search);
    await waitFor(() => expect(border(row, "-bottom")).toBe(channels(t.ring)));
    expect(row.style.getPropertyValue("border-bottom-width")).toBe("2px");
    fireEvent.blur(search);
    await waitFor(() => expect(border(row, "-bottom")).toBe(channels(t.border)));
  });

  it("the web Select trigger turns its border `ring` while its list is open", async () => {
    render(<ThemeProvider light solid><Select label="Region" options={["EU", "US"]} /></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: "Region" });
    expect(border(trigger)).toBe(channels(fieldBorder(t)));
    fireEvent.click(trigger);
    await waitFor(() => expect(border(trigger)).toBe(channels(t.ring)));
  });

  it("a flush Textarea, which has no frame to paint, keeps the themed ring inside itself", () => {
    render(
      <ThemeProvider light solid>
        <Textarea flush placeholder="Comment" testID="flush" />
        <Textarea placeholder="Framed" testID="framed" />
      </ThemeProvider>,
    );
    const flush = screen.getByTestId("flush");
    expect(outline(flush, "style")).toBe("");
    expect(outline(flush, "offset")).toBe(`-${FOCUS_RING_OFFSET}px`);
    expect(outline(screen.getByTestId("framed"), "style")).toBe("solid");
    expect(outline(screen.getByTestId("framed"), "width")).toBe("0px");
  });
});

describe("Increase Contrast keeps state borders", () => {
  function contrastMore() {
    return spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-contrast"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          onchange: null,
          dispatchEvent: () => true,
        }) as unknown as MediaQueryList,
    );
  }

  it("a resting field takes the contrasting hairline; a focused one keeps `ring`; an errored one keeps its red", async () => {
    const spy = contrastMore();
    try {
      render(
        <ThemeProvider light solid>
          <Input label="Name" testID="rest" />
          <Input label="Email" testID="focus" />
          <Input label="Phone" error testID="error" />
        </ThemeProvider>,
      );
      const rest = screen.getByTestId("rest");
      await waitFor(() => expect(border(rest)).toBe(channels(t.foreground)));
      const focus = screen.getByTestId("focus");
      fireEvent.focus(focus);
      await waitFor(() => expect(border(focus)).toBe(channels(t.ring)));
      expect(border(screen.getByTestId("error"))).toBe(channels(t.destructive));
    } finally {
      spy.mockRestore();
    }
  });
});
