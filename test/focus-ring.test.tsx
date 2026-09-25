import { afterEach, describe, expect, it } from "bun:test";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { cleanup, render, screen } from "@testing-library/react";
import type { View } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Pressable, FOCUS_RING_OFFSET, FOCUS_RING_WIDTH } from "../src/style/pressable.tsx";
import { FOCUS_RESET } from "../src/style/focus-reset.ts";
import { Button } from "../src/atoms/button/button.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Pagination as IOSPagination } from "../src/atoms/pagination/pagination.ios.tsx";
import { Accordion } from "../src/molecules/accordion/accordion.tsx";
import { Accordion as IOSAccordion } from "../src/molecules/accordion/accordion.ios.tsx";
import { Sidebar } from "../src/organisms/sidebar/sidebar.tsx";
import { Tabs as IOSTabs } from "../src/organisms/tabs/tabs.ios.tsx";
import { DragDropProvider, DropZone, Draggable, DragHandle } from "../src/organisms/drag-drop/drag-drop.tsx";
import { LOOKS, lookProps } from "./fixtures/looks.ts";

// The keyboard focus ring. The kit's Pressable hands the browser the palette's `ring`
// colour and a 2 px offset, and the browser draws the ring on keyboard focus only. A
// control that paints its own focus state (a field) spreads FOCUS_RESET, which keeps
// winning; every other control shows the ring, drawn inside a full-bleed row that a
// clipping container would otherwise cut.

afterEach(cleanup);

const outline = (node: HTMLElement, property: "color" | "offset" | "style" | "width") => node.style.getPropertyValue(`outline-${property}`);
// Whether a node's inline style switches its outline off, either way a browser reads it: no
// style, or a zero width under a named style (the browser's `auto` ring ignores the width).
const suppressed = (node: HTMLElement) =>
  outline(node, "style") === "none" || (outline(node, "width") === "0px" && !["", "auto"].includes(outline(node, "style")));
const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};
const INSET = `-${FOCUS_RING_OFFSET}px`;
const AROUND = `${FOCUS_RING_OFFSET}px`;

describe("the themed focus ring", () => {
  for (const look of LOOKS) {
    it(`colours a kit control's ring with the ${look.name} palette's ring, around the control`, () => {
      render(<ThemeProvider {...lookProps(look)} solid><Button primary testID="save">Save</Button></ThemeProvider>);
      const button = screen.getByTestId("save");
      expect(channels(outline(button, "color"))).toBe(channels(look.tokens.ring));
      expect(outline(button, "offset")).toBe(AROUND);
      // The browser draws it: no style is forced, so it only shows on keyboard focus.
      expect(outline(button, "style")).toBe("");
    });
  }

  it("leaves a field, which paints its own focus border, on its reset", () => {
    render(<ThemeProvider light solid><Input label="Name" testID="name" /></ThemeProvider>);
    // A solid outline of zero width paints nothing (a zero width alone would leave the
    // browser's `auto` ring, which ignores it); `solid` is a style native parses.
    expect(outline(screen.getByTestId("name"), "width")).toBe("0px");
    expect(outline(screen.getByTestId("name"), "style")).toBe("solid");
  });

  it("draws the ring inside full-bleed rows a clipping container would cut", () => {
    render(
      <ThemeProvider light solid>
        <Accordion card items={[{ key: "a", title: "Billing", content: "Plans" }]} />
        <IOSAccordion items={[{ key: "b", title: "Team", content: "Roles" }]} />
        <Sidebar defaultActive="Dashboard" items={[{ label: "Dashboard" }, { label: "Inbox" }]} />
      </ThemeProvider>,
    );
    for (const name of ["Billing", "Team"]) {
      const header = screen.getByRole("button", { name });
      expect(outline(header, "offset"), name).toBe(INSET);
      expect(outline(header, "style"), name).toBe("");
    }
    const row = screen.getByText("Inbox").closest("[tabindex]") as HTMLElement;
    expect(outline(row, "offset")).toBe(INSET);
    expect(outline(row, "style")).toBe("");
  });

  it("keeps the ring around a bare header, which nothing clips", () => {
    render(<ThemeProvider light solid><Accordion items={[{ key: "a", title: "Billing", content: "Plans" }]} /></ThemeProvider>);
    const header = screen.getByRole("button", { name: "Billing" });
    expect(outline(header, "offset")).toBe(AROUND);
    expect(outline(header, "style")).toBe("");
  });

  it("no longer suppresses the ring on the iOS skins the docs preview on the web", () => {
    render(
      <ThemeProvider light solid>
        <IOSPagination total={3} />
        <IOSTabs tabs={["Overview", "Activity"]} />
      </ThemeProvider>,
    );
    const focusable = [...screen.getAllByRole("button"), ...screen.getAllByRole("tab")];
    expect(focusable.length).toBeGreaterThan(3);
    for (const node of focusable) expect(suppressed(node), node.textContent ?? "").toBe(false);
  });

  it("rings the drag handle, a focusable View rather than a Pressable", () => {
    render(
      <ThemeProvider light solid>
        <DragDropProvider>
          <DropZone id="list" label="Tasks">
            <Draggable id="a" data={{ id: "a" }} label="Write the spec">
              <DragHandle label="Reorder Write the spec" testID="grip" />
            </Draggable>
          </DropZone>
        </DragDropProvider>
      </ThemeProvider>,
    );
    const grip = screen.getByTestId("grip");
    expect(outline(grip, "style")).toBe("");
    expect(outline(grip, "offset")).toBe(AROUND);
  });

  it("keeps the style callback and the ref", () => {
    const ref = createRef<View>();
    render(
      <ThemeProvider light solid>
        <Pressable ref={ref} testID="bare" style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })} />
      </ThemeProvider>,
    );
    const bare = screen.getByTestId("bare");
    expect(bare.style.opacity).toBe("1");
    expect(outline(bare, "offset")).toBe(AROUND);
    expect(ref.current as unknown).toBe(bare);
  });

  it("draws a solid ring in --ring on :focus-visible wherever the CSS hand-off is loaded", () => {
    const base = readFileSync(new URL("../styles/tokens/base.css", import.meta.url), "utf8");
    const layer = /@layer base\s*\{([\s\S]*)\n\}/.exec(base)?.[1] ?? "";
    expect(layer).toMatch(/:focus-visible\{outline:var\(--ring-width\) solid var\(--ring\);outline-offset:var\(--ring-offset\)\}/);
    const shadows = readFileSync(new URL("../styles/tokens/shadows.css", import.meta.url), "utf8");
    expect(shadows).toContain(`--ring-offset:${FOCUS_RING_OFFSET}px`);
    // A frame's ring (src/style/focus-frame.tsx) is drawn by the kit itself, at the same width.
    expect(shadows).toContain(`--ring-width:${FOCUS_RING_WIDTH}px`);
  });
});

// React Native parses the outline keys natively too (View and TextInput), and its parser
// accepts only the styles it names: anything else, `none` included, logs "Could not parse
// OutlineStyle" on every node that carries it. The accepted set is read from the parser
// itself, so the scan follows React Native if it ever widens it.
describe("outline styles native can parse", () => {
  const ROOT = join(import.meta.dir, "..");
  const parser = readFileSync(join(ROOT, "node_modules/react-native/ReactCommon/react/renderer/components/view/conversions.h"), "utf8");
  const body = /fromRawValue\([^)]*OutlineStyle &result\)\s*\{([\s\S]*?)\n\}/.exec(parser)?.[1] ?? "";
  const accepted = new Set([...body.matchAll(/stringValue == "(\w+)"/g)].map((match) => match[1]));

  it("reads the accepted styles from React Native's prop parser", () => {
    expect(accepted.has("solid")).toBe(true);
  });

  it("gives FOCUS_RESET a style native accepts and a zero width", () => {
    expect(accepted.has(FOCUS_RESET.outlineStyle as string)).toBe(true);
    expect(FOCUS_RESET.outlineWidth).toBe(0);
  });

  it("writes no other outline style anywhere a React Native tree renders", () => {
    const files = ["src", "docs/src", "examples", "packages"]
      .flatMap((dir) => [...new Glob(`${dir}/**/*.{ts,tsx}`).scanSync(ROOT)])
      .filter((file) => !file.endsWith(".d.ts") && !file.includes("node_modules/"));
    expect(files.length).toBeGreaterThan(200);
    // The key quoted or not, and every string literal in its value, so a conditional
    // (`focused ? "solid" : "none"`) is read whole.
    const rejected = files.flatMap((file) =>
      [...readFileSync(join(ROOT, file), "utf8").matchAll(/["']?outlineStyle["']?\s*:\s*([^,}\n]+)/g)]
        .flatMap((match) => [...match[1]!.matchAll(/["'`](\w+)["'`]/g)].map((literal) => literal[1]!))
        .filter((value) => !accepted.has(value))
        .map((value) => `${file}: ${value}`));
    expect(rejected).toEqual([]);
  });
});
