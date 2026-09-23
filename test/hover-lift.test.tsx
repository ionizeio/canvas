import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccessibilityInfo, Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { HOVER, HOVER_EASING, useReducedMotion } from "../src/style/motion.ts";
import { LOOKS, lookProps } from "./fixtures/looks.ts";
import { Card } from "../src/molecules/card/card.tsx";
import { Card as IOSCard } from "../src/molecules/card/card.ios.tsx";
import { Card as AndroidCard } from "../src/molecules/card/card.android.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { Button as IOSButton } from "../src/atoms/button/button.ios.tsx";
import { Button as AndroidButton } from "../src/atoms/button/button.android.tsx";
import { Sidebar } from "../src/organisms/sidebar/sidebar.tsx";
import { Sidebar as IOSSidebar } from "../src/organisms/sidebar/sidebar.ios.tsx";
import { Sidebar as AndroidSidebar } from "../src/organisms/sidebar/sidebar.android.tsx";
import { Grid } from "../src/atoms/grid/grid.tsx";
import { Column, Row } from "../src/atoms/layout/layout.tsx";
import { webSkin as webSidebarSkin } from "../src/organisms/sidebar/sidebar.styles.ts";

// Dark Factory's hover feedback on the web (the `df-hover-lift` reference card): a
// pressable card rises 2 px while its resting shade deepens to the hovered one, a
// primary button rises 1 px, a nav row's wash fades in, each on CSS `ease` from the
// HOVER table. The hover is read on the control's wrapper, which never moves, and a
// touch never hovers. The iOS and Android skins declare no hover feedback.

afterEach(cleanup);

const style = (node: HTMLElement, property: string) => node.style.getPropertyValue(property);
const transition = (node: HTMLElement) => [style(node, "transition-property"), style(node, "transition-duration"), style(node, "transition-timing-function")];
const channels = (color: string) => {
  if (color.startsWith("#")) {
    const n = parseInt(color.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  return (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color) ?? []).slice(1, 4).join(",");
};
const alphaOf = (color: string) => Number((/rgba\([^)]*,\s*([\d.]+)\)/.exec(color) ?? [])[1] ?? 1);
const hover = (node: HTMLElement, pointerType = "mouse") => fireEvent.pointerEnter(node, { pointerType });
const leave = (node: HTMLElement) => fireEvent.pointerLeave(node);

describe("a pressable card lifts on hover", () => {
  it("rises 2 px and deepens its resting shade to the hovered one, over the card timing, and settles back on leave", () => {
    render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    const surface = screen.getByTestId("card");
    expect(transition(surface)).toEqual(["transform, box-shadow", `${HOVER.card.duration}ms`, HOVER_EASING]);
    expect(style(surface, "transform")).toBe("");
    expect(style(surface, "box-shadow")).toContain("20px 44px -24px");

    hover(surface);
    expect(style(surface, "transform")).toContain(`translateY(-${HOVER.card.distance}px)`);
    expect(style(surface, "box-shadow")).toContain("30px 54px -24px");

    leave(surface);
    expect(style(surface, "transform")).toBe("");
    expect(style(surface, "box-shadow")).toContain("20px 44px -24px");
  });

  it("reads the hover on the wrapper, which stays put while the surface rises inside it", () => {
    render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    const surface = screen.getByTestId("card");
    const wrapper = surface.parentElement as HTMLElement;
    hover(wrapper);
    expect(style(surface, "transform")).toContain("translateY(-2px)");
    expect(style(wrapper, "transform")).toBe("");
  });

  it("keeps a raised card's shade and moves only the transform", () => {
    render(<ThemeProvider light solid><Card raised onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    const surface = screen.getByTestId("card");
    expect(style(surface, "transition-property")).toBe("transform");
    const resting = style(surface, "box-shadow");
    hover(surface);
    expect(style(surface, "transform")).toContain("translateY(-2px)");
    expect(style(surface, "box-shadow")).toBe(resting);
  });

  it("clears a hover it could not see end: a card made pressable again comes back at rest", () => {
    const view = render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    hover(screen.getByTestId("card"));
    expect(style(screen.getByTestId("card"), "transform")).toContain("translateY(-2px)");
    // No longer pressable: the wrapper loses its handlers, so the pointer's leave goes unseen.
    view.rerender(<ThemeProvider light solid><Card testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    view.rerender(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    expect(style(screen.getByTestId("card"), "transform")).toBe("");
  });

  it("ignores a touch, whose pointer enter is not a hover", () => {
    render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    const surface = screen.getByTestId("card");
    hover(surface, "touch");
    expect(style(surface, "transform")).toBe("");
  });

  it("leaves a card that is not pressable, and the iOS and Android cards, untouched", () => {
    render(
      <ThemeProvider light solid>
        <Card testID="plain"><Text>Plain</Text></Card>
        <IOSCard onPress={() => {}} testID="ios"><Text>iOS</Text></IOSCard>
        <AndroidCard onPress={() => {}} testID="android"><Text>Android</Text></AndroidCard>
      </ThemeProvider>,
    );
    for (const id of ["plain", "ios", "android"]) {
      const node = screen.getByTestId(id);
      expect(style(node, "transition-property"), id).toBe("");
      hover(node);
      expect(style(node, "transform"), id).toBe("");
    }
  });
});

describe("a lifted card stacks above its neighbours while it lifts and settles", () => {
  const zOf = (node: HTMLElement) => node.style.getPropertyValue("z-index");
  const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

  it("raises its wrapper while hovered and through the leave, then drops back", async () => {
    render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
    const wrapper = screen.getByTestId("card").parentElement as HTMLElement;
    expect(zOf(wrapper)).toBe("");
    hover(wrapper);
    expect(zOf(wrapper)).toBe("10");
    leave(wrapper);
    // Still settling: the shade is still shrinking over the neighbour below.
    expect(zOf(wrapper)).toBe("10");
    await wait(HOVER.card.duration + 60);
    expect(zOf(wrapper)).toBe("");
  });

  it("lifts its Grid cell and its Row span cell, which are stacking contexts of their own", () => {
    render(
      <ThemeProvider light solid>
        <Grid>
          <Card onPress={() => {}} testID="in-grid"><Text>Scout</Text></Card>
          <Card onPress={() => {}} testID="grid-neighbour"><Text>Mint</Text></Card>
        </Grid>
        <Row>
          <Column span={6}><Card onPress={() => {}} testID="in-span"><Text>Scout</Text></Card></Column>
          <Column span={6}><Card onPress={() => {}} testID="span-neighbour"><Text>Mint</Text></Card></Column>
        </Row>
      </ThemeProvider>,
    );
    for (const [id, neighbour] of [["in-grid", "grid-neighbour"], ["in-span", "span-neighbour"]]) {
      const wrapper = screen.getByTestId(id).parentElement as HTMLElement;
      hover(wrapper);
      // Some ancestor above the card's own wrapper is raised: its cell, which holds the
      // card and not the neighbour, so it stacks above the neighbour's cell.
      const lifted = [...ancestors(wrapper)].find((node) => zOf(node) === "10" && node !== wrapper);
      expect(lifted, id).toBeDefined();
      expect(lifted!.contains(screen.getByTestId(neighbour)), id).toBe(false);
      expect(lifted!.parentElement!.contains(screen.getByTestId(neighbour)), id).toBe(true);
      leave(wrapper);
    }
  });

  it("drops at once under Reduce Motion, where the leave is instant", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    try {
      render(<ThemeProvider light solid><Card onPress={() => {}} testID="card"><Text>Scout</Text></Card></ThemeProvider>);
      await act(async () => {});
      const wrapper = screen.getByTestId("card").parentElement as HTMLElement;
      hover(wrapper);
      expect(zOf(wrapper)).toBe("10");
      leave(wrapper);
      expect(zOf(wrapper)).toBe("");
    } finally {
      spy.mockRestore();
    }
  });
});

function* ancestors(node: HTMLElement): Generator<HTMLElement> {
  for (let n: HTMLElement | null = node; n; n = n.parentElement) yield n;
}

describe("a primary button lifts on hover", () => {
  it("rises 1 px over the button timing and settles back on leave", () => {
    render(<ThemeProvider light solid><Button primary onPress={() => {}}>Save</Button></ThemeProvider>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(transition(button)).toEqual(["transform", `${HOVER.button.duration}ms`, HOVER_EASING]);
    hover(button);
    expect(style(button, "transform")).toContain(`translateY(-${HOVER.button.distance}px)`);
    leave(button);
    expect(style(button, "transform")).toBe("");
  });

  it("stays put when disabled or loading, and every other intent switches its hover instantly", () => {
    render(
      <ThemeProvider light solid>
        <Button primary disabled onPress={() => {}}>Disabled</Button>
        <Button primary loading onPress={() => {}} accessibilityLabel="Loading" />
        <Button secondary onPress={() => {}}>Secondary</Button>
        <Button outline onPress={() => {}}>Outline</Button>
      </ThemeProvider>,
    );
    for (const name of ["Disabled", "Loading"]) {
      const button = screen.getByRole("button", { name });
      hover(button);
      expect(style(button, "transform"), name).toBe("");
    }
    for (const name of ["Secondary", "Outline"]) {
      const button = screen.getByRole("button", { name });
      expect(style(button, "transition-property"), name).toBe("");
      hover(button);
      expect(style(button, "transform"), name).toBe("");
    }
  });

  it("leaves the iOS and Android buttons, which keep their platform look, untouched", () => {
    render(
      <ThemeProvider light solid>
        <IOSButton primary onPress={() => {}}>iOS</IOSButton>
        <AndroidButton primary onPress={() => {}}>Android</AndroidButton>
      </ThemeProvider>,
    );
    for (const name of ["iOS", "Android"]) {
      const button = screen.getByRole("button", { name });
      expect(style(button, "transition-property"), name).toBe("");
      hover(button);
      expect(style(button, "transform"), name).toBe("");
    }
  });
});

describe("a nav row's wash fades in on hover", () => {
  const items = [{ label: "Dashboard" }, { label: "Inbox" }];
  const frameOf = (label: string) => (screen.getByText(label).closest("[tabindex]") as HTMLElement).parentElement as HTMLElement;

  it("paints the palette's translucent hover beneath the row while hovered, fading from the same colour transparent", () => {
    render(<ThemeProvider light solid><Sidebar defaultActive="Dashboard" items={items} /></ThemeProvider>);
    const frame = frameOf("Inbox");
    const wash = lightColors.hover!;
    expect(transition(frame)).toEqual(["background-color", `${HOVER.wash.duration}ms`, HOVER_EASING]);
    expect(channels(style(frame, "background-color"))).toBe(channels(wash));
    expect(alphaOf(style(frame, "background-color"))).toBe(0);
    hover(frame);
    expect(channels(style(frame, "background-color"))).toBe(channels(wash));
    expect(alphaOf(style(frame, "background-color"))).toBeCloseTo(alphaOf(wash), 3);
    leave(frame);
    expect(alphaOf(style(frame, "background-color"))).toBe(0);
  });

  it("washes with each palette's own hover, and with `accent` where a palette omits the role", () => {
    for (const look of LOOKS) {
      const { unmount } = render(<ThemeProvider {...lookProps(look)} solid><Sidebar defaultActive="Dashboard" items={items} /></ThemeProvider>);
      const frame = frameOf("Inbox");
      hover(frame);
      expect(channels(style(frame, "background-color")), look.name).toBe(channels(look.tokens.hover!));
      unmount();
    }
    // A legacy token map (one written before the role) washes with its `accent`.
    const { hover: _omitted, ...legacy } = lightColors;
    expect(webSidebarSkin.wash!.color(legacy)).toBe(lightColors.accent);
  });

  it("keeps the row's own pressed and active fills off the transition, so they switch at once", () => {
    render(<ThemeProvider light solid><Sidebar defaultActive="Dashboard" items={items} /></ThemeProvider>);
    const active = screen.getByText("Dashboard").closest("[tabindex]") as HTMLElement;
    expect(channels(style(active, "background-color"))).toBe(channels(lightColors.accent));
    expect(style(active, "transition-property")).toBe("");
  });

  it("keeps the same translucent wash under glass, where it reads over the material", () => {
    render(<ThemeProvider light glass><Sidebar defaultActive="Dashboard" items={items} /></ThemeProvider>);
    const frame = frameOf("Inbox");
    hover(frame);
    expect(channels(style(frame, "background-color"))).toBe(channels(lightColors.hover!));
    expect(alphaOf(style(frame, "background-color"))).toBeCloseTo(alphaOf(lightColors.hover!), 3);
  });

  it("leaves the iOS and Android rails, which keep their platform rows, untouched", () => {
    render(
      <ThemeProvider light solid>
        <IOSSidebar defaultActive="Dashboard" items={[{ label: "Home" }, { label: "Mail" }]} />
        <AndroidSidebar defaultActive="Dashboard" items={[{ label: "Feed" }, { label: "Chat" }]} />
      </ThemeProvider>,
    );
    for (const label of ["Mail", "Chat"]) {
      const frame = frameOf(label);
      expect(style(frame, "transition-property"), label).toBe("");
      hover(frame);
      expect(style(frame, "background-color"), label).toBe("");
    }
  });
});

describe("Reduce Motion", () => {
  it("keeps the hover change but makes it instant", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    try {
      render(<ThemeProvider light solid><Button primary onPress={() => {}}>Save</Button></ThemeProvider>);
      await act(async () => {});
      const button = screen.getByRole("button", { name: "Save" });
      expect(style(button, "transition-duration")).toBe("0ms");
      hover(button);
      expect(style(button, "transform")).toContain("translateY(-1px)");
    } finally {
      spy.mockRestore();
    }
  });

  it("is one subscription for every consumer, released with the last one", async () => {
    const remove = { calls: 0 };
    const add = spyOn(AccessibilityInfo, "addEventListener").mockImplementation((() => ({ remove: () => { remove.calls++; } })) as never);
    const read = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    function Probe({ id }: { id: string }) {
      return <Text testID={id}>{useReducedMotion() ? "reduced" : "full"}</Text>;
    }
    try {
      const view = render(<><Probe id="a" /><Probe id="b" /><Probe id="c" /></>);
      await act(async () => {});
      expect(add.mock.calls.filter(([event]) => event === "reduceMotionChanged").length).toBe(1);
      for (const id of ["a", "b", "c"]) expect(screen.getByTestId(id).textContent).toBe("reduced");
      view.unmount();
      expect(remove.calls).toBe(1);
    } finally {
      add.mockRestore();
      read.mockRestore();
    }
  });
});
