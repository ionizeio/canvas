import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Text } from "react-native";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Feed } from "../src/molecules/feeds/feeds.tsx";
import { GridList } from "../src/molecules/grid-lists/grid-lists.tsx";
import { StackedList } from "../src/molecules/stacked-lists/stacked-lists.tsx";
import { Divider } from "../src/atoms/divider/divider.tsx";
import { Skeleton } from "../src/atoms/skeleton/skeleton.tsx";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// Feed — src/molecules/feeds/feeds.tsx (createFeed(webSkin)).
describe("Feed", () => {
  const items = [
    { actor: "Rachel Chen", action: "approved the request", time: "2 hours ago" },
    { actor: "Marco Diaz", action: "left a comment", time: "5 hours ago" },
    { actor: "Priya Patel", action: "merged the branch", time: "1 day ago" },
  ];

  it("renders one pressable row per item, each with its actor/action/time, and reports the pressed index", () => {
    let pressed = -1;
    const { container } = ui(<Feed items={items} onItemPress={(i) => { pressed = i; }} />);
    // One Pressable (role=button) row per event.
    expect(container.querySelectorAll('[role="button"]').length).toBe(items.length);
    // Each row's actor + action + timestamp render as queryable text.
    expect(screen.getByText("Rachel Chen")).toBeTruthy();
    expect(screen.getByText("approved the request")).toBeTruthy();
    expect(screen.getByText("1 day ago")).toBeTruthy();
    // onItemPress fires with the row's index.
    fireEvent.click(screen.getByText("left a comment"));
    expect(pressed).toBe(1);
  });

  it("connector lead (default) shows the initials node, the avatar lead swaps it for the photo", () => {
    const one = [{ actor: "Rachel Chen", action: "x", time: "y", avatar: "https://example.com/p.jpg" }];
    // Default connector lead paints a node with the actor's initials ("RC").
    const conn = ui(<Feed items={one} />);
    expect(within(conn.container).getByText("RC")).toBeTruthy();
    cleanup();
    // The avatar lead renders the photo instead, so no initials fallback is shown.
    const av = ui(<Feed avatar items={one} />);
    expect(within(av.container).queryByText("RC")).toBeNull();
  });

  it("an item icon leads the connector node, taking precedence over the actor initials", () => {
    const one = [{ actor: "Rachel Chen", action: "x", time: "y", icon: "shieldCheck" as const }];
    const { container } = ui(<Feed items={one} />);
    // The glyph wins the node, so the initials fallback never renders.
    expect(within(container).queryByText("RC")).toBeNull();
    // It is decorative (the actor/action line beside it carries the meaning), so
    // assistive tech skips it. react-native-svg is stubbed in the harness, so the
    // aria-hidden wrapper is what is observable here.
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(1);
  });

  it("the icon also replaces the actor-less dot, and the avatar lead ignores it", () => {
    // No actor: the glyph stands in for the muted dot rather than beside it.
    const anon = [{ action: "the nightly export finished", time: "y", icon: "check" as const }];
    const conn = ui(<Feed items={anon} />);
    expect(conn.container.querySelectorAll('[aria-hidden="true"]').length).toBe(1);
    cleanup();
    // The avatar lead leads with the person, so an item icon changes nothing there: the
    // row hides exactly the nodes it hides without one (the avatar's own gradient layer).
    const person = { actor: "Rachel Chen", action: "x", time: "y" };
    const plain = ui(<Feed avatar items={[person]} />);
    const hiddenWithout = plain.container.querySelectorAll('[aria-hidden="true"]').length;
    cleanup();
    const av = ui(<Feed avatar items={[{ ...person, icon: "check" as const }]} />);
    expect(within(av.container).getByText("RC")).toBeTruthy();
    expect(av.container.querySelectorAll('[aria-hidden="true"]').length).toBe(hiddenWithout);
  });
});

// GridList — src/molecules/grid-lists/grid-lists.tsx (createGridList(webSkin)).
describe("GridList", () => {
  const items = [
    { title: "Alpha", subtitle: "Design", badge: "Active" },
    { title: "Bravo", subtitle: "Eng" },
    { title: "Charlie", subtitle: "Ops" },
  ];

  it("renders one gallery tile per item and reports the pressed index", () => {
    let pressed = -1;
    const { container } = ui(<GridList gallery items={items} onPressItem={(i) => { pressed = i; }} />);
    // Each gallery tile is its own Pressable (role=button); one per item.
    expect(container.querySelectorAll('[role="button"]').length).toBe(items.length);
    expect(screen.getByText("Alpha")).toBeTruthy();
    fireEvent.click(screen.getByText("Charlie"));
    expect(pressed).toBe(2);
  });

  it("a tile action's onPress fires from the rendered button", () => {
    let pressed = "";
    const withActions = [{
      title: "Alpha",
      subtitle: "Design",
      actions: [
        { label: "Message", outline: true, onPress: () => { pressed = "message"; } },
        { label: "View", ghost: true, onPress: () => { pressed = "view"; } },
      ],
    }];
    ui(<GridList items={withActions} />);
    fireEvent.click(screen.getByText("Message"));
    expect(pressed).toBe("message");
    fireEvent.click(screen.getByText("View"));
    expect(pressed).toBe("view");
  });

  it("the people tile shows the badge that the gallery variant drops", () => {
    // People (default) tile renders title, subtitle, AND the status badge.
    const people = ui(<GridList items={[items[0]]} />);
    expect(within(people.container).getByText("Alpha")).toBeTruthy();
    expect(within(people.container).getByText("Design")).toBeTruthy();
    expect(within(people.container).getByText("Active")).toBeTruthy();
    cleanup();
    // Gallery mode ignores avatars/badges/actions, so the badge is gone.
    const gallery = ui(<GridList gallery items={[items[0]]} />);
    expect(within(gallery.container).queryByText("Active")).toBeNull();
  });
});

// StackedList — src/molecules/stacked-lists/stacked-lists.tsx (createStackedList(webSkin)).
describe("StackedList", () => {
  const items = [
    { name: "Ada Lovelace", detail: "ada@acme.dev", meta: "2h ago" },
    { name: "Alan Turing", detail: "alan@acme.dev", meta: "5h ago" },
    { name: "Grace Hopper", detail: "grace@acme.dev", meta: "1d ago" },
  ];

  it("clickable variant renders one pressable row per item with name/detail and reports the pressed index", () => {
    let pressed = -1;
    const { container } = ui(<StackedList clickable items={items} onPressItem={(i) => { pressed = i; }} />);
    // Each clickable row is a Pressable (role=button); one per item.
    expect(container.querySelectorAll('[role="button"]').length).toBe(items.length);
    // Row primary (name) and secondary (detail) lines both render.
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("grace@acme.dev")).toBeTruthy();
    fireEvent.click(screen.getByText("Alan Turing"));
    expect(pressed).toBe(1);
  });

  it("renders a header title and each row's trailing meta", () => {
    ui(<StackedList title="Team" items={items} />);
    expect(screen.getByText("Team")).toBeTruthy();
    expect(screen.getByText("2h ago")).toBeTruthy();
  });
});

// Divider — src/atoms/divider/divider.tsx (createDivider(webSkin)).
describe("Divider", () => {
  it("plain horizontal rule carries separator semantics and spans full width", () => {
    const { container } = ui(<Divider />);
    const sep = container.querySelector('[role="separator"]') as HTMLElement;
    expect(sep).toBeTruthy();
    expect(sep.textContent).toBe("");
    expect(sep.getAttribute("style")).toContain("height: 1px");
    expect(sep.getAttribute("style")).toContain("width: 100%");
  });

  it("a string child renders a centered label while keeping the separator role", () => {
    const { container } = ui(<Divider>OR</Divider>);
    expect(screen.getByText("OR")).toBeTruthy();
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });

  it("a non-text child drops the separator role (interactive action pattern)", () => {
    const { container } = ui(<Divider><Text>Skip</Text></Divider>);
    expect(screen.getByText("Skip")).toBeTruthy();
    expect(container.querySelector('[role="separator"]')).toBeNull();
  });

  it("the vertical orientation renders a stretching vertical rule", () => {
    const { container } = ui(<Divider vertical />);
    const sep = container.querySelector('[role="separator"]') as HTMLElement;
    expect(sep).toBeTruthy();
    expect(sep.getAttribute("style")).toContain("width: 1px");
    expect(sep.getAttribute("style")).toContain("align-self: stretch");
  });
});

// Skeleton — src/atoms/skeleton/skeleton.tsx (createSkeleton(webSkin)).
describe("Skeleton", () => {
  it("announces a busy loading placeholder with a default accessible name", () => {
    const { container } = ui(<Skeleton />);
    const pb = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(pb).toBeTruthy();
    expect(pb.getAttribute("aria-busy")).toBe("true");
    expect(pb.getAttribute("aria-label")).toBe("Loading");
  });

  it("honors a custom accessibilityLabel", () => {
    const { container } = ui(<Skeleton avatar accessibilityLabel="Loading avatar" />);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-label")).toBe("Loading avatar");
  });

  it("the size prop scales the avatar footprint", () => {
    const large = ui(<Skeleton avatar large />);
    expect((large.container.querySelector('[role="progressbar"]') as HTMLElement).style.width).toBe("48px");
    cleanup();
    const small = ui(<Skeleton avatar small />);
    expect((small.container.querySelector('[role="progressbar"]') as HTMLElement).style.width).toBe("32px");
  });

  it("a composite shape scaffold nests blocks the single-line default does not", () => {
    // The `card` scaffold is a composite of nested muted blocks...
    const card = ui(<Skeleton card />);
    expect(card.container.querySelector('[role="progressbar"]')!.children.length).toBeGreaterThan(0);
    cleanup();
    // ...whereas the default single text line is a leaf.
    const text = ui(<Skeleton />);
    expect(text.container.querySelector('[role="progressbar"]')!.children.length).toBe(0);
  });
});
