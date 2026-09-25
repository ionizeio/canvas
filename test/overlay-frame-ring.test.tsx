import { type ReactNode } from "react";
import { describe, it, expect, afterEach } from "bun:test";
import { act, render, cleanup, fireEvent, screen } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { FOCUS_RING_OFFSET, FOCUS_RING_WIDTH } from "../src/style/pressable.tsx";
import { OverlayScrollView } from "../src/style/overlay-scroll.tsx";
import { createAutocomplete } from "../src/atoms/autocomplete/autocomplete.shared.tsx";
import { createSelect } from "../src/atoms/select/select.shared.tsx";
import { webSkin as autocompleteWeb } from "../src/atoms/autocomplete/autocomplete.styles.ts";
import { webSkin as selectWeb, iosSkin as selectIos, androidSkin as selectAndroid } from "../src/atoms/select/select.styles.ts";
import { Command } from "../src/organisms/command/command.tsx";
import { LOOKS, lookProps, type Look } from "./fixtures/looks.ts";

// An option list's scrollport is a keyboard stop while its rows overflow the capped
// card, and it sits flush inside the card's clip: the card cuts a ring drawn around the
// port, and the rows cover one drawn inside it. So the card that frames the port draws
// the theme's ring while a key lands on the port, and the port draws none
// (src/style/focus-frame.tsx). That holds for every anchored card (AnchoredOverlay's
// OverlayCard, whichever owner fills it) and for the bare Command palette's own card. A
// port that nothing frames wears the kit's own ring.

afterEach(cleanup);

type LayoutHost = HTMLElement & { __reactLayoutHandler?: (event: unknown) => void };
function layOut(node: HTMLElement, width: number, height: number) {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The node has no onLayout handler");
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height } }, timeStamp: 1 }));
}

// The vertical scrollport around the option list: RNW styles it overflow-y auto.
function portOf(listbox: HTMLElement): HTMLElement {
  for (let node = listbox.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).overflowY === "auto") return node;
  }
  throw new Error("no scrollport above the option list");
}

// Lay the port out 200 tall around 600 of rows (its content container is its first
// child), so the rows overflow and the port becomes a keyboard stop.
function overflow(port: HTMLElement) {
  layOut(port, 280, 200);
  layOut(port.firstElementChild as HTMLElement, 280, 600);
  expect(port.tabIndex).toBe(0);
}

// The painted card: the nearest ancestor of the list carrying the skin's cap.
function cappedCard(node: HTMLElement): HTMLElement {
  for (let at = node.parentElement; at; at = at.parentElement) {
    if ((at.getAttribute("style") ?? "").includes("max-height")) return at;
  }
  throw new Error("no capped card above the option list");
}

const OPTIONS = ["Ada Lovelace", "Grace Hopper", "Kira Tanaka", "Liang Bao", "Marcus Allen", "Noor Park", "Rachel Chen", "Sofia Ruiz", "Tomas Nowak", "Yuki Mori"];
const GROUPS = [{ heading: "People", items: OPTIONS.map((label) => ({ label })) }];

const AutocompleteWeb = createAutocomplete(autocompleteWeb);
const SelectWeb = createSelect(selectWeb);
const SelectIos = createSelect(selectIos);
const SelectAndroid = createSelect(selectAndroid);

interface Case {
  name: string;
  node: ReactNode;
  frameOf(port: HTMLElement): HTMLElement;
}

const CASES: Case[] = [
  { name: "Select (web)", node: <SelectWeb open options={OPTIONS} />, frameOf: cappedCard },
  { name: "Select (ios)", node: <SelectIos open options={OPTIONS} />, frameOf: cappedCard },
  { name: "Select (android)", node: <SelectAndroid open options={OPTIONS} />, frameOf: cappedCard },
  { name: "Autocomplete (web)", node: <AutocompleteWeb open options={OPTIONS} />, frameOf: cappedCard },
  { name: "bare Command", node: <Command testID="palette" groups={GROUPS} />, frameOf: () => screen.getByTestId("palette") },
];

const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};
const outline = (node: HTMLElement, part: "color" | "style" | "width" | "offset") => node.style.getPropertyValue(`outline-${part}`);

function expectRing(frame: HTMLElement, look: Look) {
  expect(channels(outline(frame, "color"))).toBe(channels(look.tokens.ring));
  expect(outline(frame, "style")).toBe("solid");
  expect(outline(frame, "width")).toBe(`${FOCUS_RING_WIDTH}px`);
  expect(outline(frame, "offset")).toBe(`${FOCUS_RING_OFFSET}px`);
}

const ui = (node: ReactNode, look: Look) => render(<ThemeProvider solid {...lookProps(look)}>{node}</ThemeProvider>);

for (const subject of CASES) {
  describe(`${subject.name} option list keyboard focus ring`, () => {
    for (const look of LOOKS) {
      it(`draws the ${look.name} palette's ring on the card while a key lands on the port, and none on the port`, () => {
        ui(subject.node, look);
        const port = portOf(screen.getByRole("listbox"));
        overflow(port);
        const frame = subject.frameOf(port);
        expect(outline(frame, "style")).toBe("");
        fireEvent.focus(port);
        expect(outline(frame, "style")).toBe("");
        // Shift+Tab from the first row releases on the port it moved to.
        fireEvent.keyUp(port, { key: "Tab", shiftKey: true });
        expectRing(frame, look);
        expect(outline(port, "style")).toBe("solid");
        expect(outline(port, "width")).toBe("0px");
        // A key released on a row inside the port belongs to the row, not the port.
        fireEvent.blur(port);
        expect(outline(frame, "style")).toBe("");
        fireEvent.keyUp(screen.getAllByRole("option")[0]!, { key: "Tab" });
        expect(outline(frame, "style")).toBe("");
      });
    }
  });
}

describe("an option-list port with nothing framing it", () => {
  for (const look of LOOKS) {
    it(`wears the ${look.name} palette's own ring around itself`, () => {
      render(
        <ThemeProvider solid {...lookProps(look)}>
          <OverlayScrollView testID="port"><Text>Row</Text></OverlayScrollView>
        </ThemeProvider>,
      );
      const port = screen.getByTestId("port");
      expect(channels(outline(port, "color"))).toBe(channels(look.tokens.ring));
      expect(outline(port, "offset")).toBe(`${FOCUS_RING_OFFSET}px`);
      // The browser draws it, on keyboard focus only.
      expect(outline(port, "style")).toBe("");
    });
  }
});
