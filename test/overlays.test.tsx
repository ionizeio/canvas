import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { Tooltip } from "../src/atoms/tooltip/tooltip.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import type { DropdownProps } from "../src/atoms/dropdown/dropdown.shared.tsx";
import {
  webSkin as webMenuSkin,
  iosSkin as iosMenuSkin,
  androidSkin as androidMenuSkin,
  type DropdownSkin,
} from "../src/atoms/dropdown/dropdown.styles.ts";
import { lightColors, type ColorTokens } from "../src/style/tokens.ts";

// Open/close/dismiss/select contract for the kit's overlay surfaces. Each test
// drives the component the way a user does — open via the trigger, assert the
// floating content mounts, invoke an item/close affordance, assert it unmounts —
// and locks the role/aria the surface exposes to assistive tech. (Dialog is
// covered in its own suite; the listbox mechanics of Select/Autocomplete forced
// `open` live in a11y-state.test.tsx — here we cover the trigger-driven flows.)
//
// react-native-web renders a Modal by portaling into document.body rather than
// null-ing out, so the Drawer's content is queried through `screen` (whose base
// element is document.body) and is absent from the render container. Every other
// overlay here renders inline (its open card sits next to the trigger), so the
// per-render `container` sees it directly.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

// The inline fallback anchor (these renders mount no OverlayProvider): walk up
// from the open menu to the absolutely positioned wrapper and read back the
// physical edge react-native-web resolved the logical `start`/`end` inset to.
// It doubles as the HOSTED anchor reader: portaled, the same walk stops on the
// card's placement wrapper inside the outlet (the outlet's own absolute position
// rides a CSS class rather than the inline style).
const anchorStyle = (container: HTMLElement) => {
  let n: HTMLElement | null = container.querySelector('[role="menu"]')?.parentElement ?? null;
  while (n && !(n.getAttribute("style") ?? "").includes("position: absolute")) n = n.parentElement;
  return n?.getAttribute("style") ?? "";
};

// The hosted (portaled) overlay holds its card back until the trigger measures a
// non-zero box, and happy-dom reports every box as 0x0, so a hosted card never
// mounts in a test unless the layout is stubbed. Give the DOM a real box for the
// duration of a case, then let the measure-and-place frame land.
const LAID_OUT = { x: 10, y: 20, width: 160, height: 32, top: 20, left: 10, right: 170, bottom: 52, toJSON: () => ({}) } as DOMRect;
const withLayout = async (run: () => Promise<void>) => {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = () => LAID_OUT;
  try {
    await run();
  } finally {
    Element.prototype.getBoundingClientRect = original;
  }
};
const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

// react-native-web writes every colour into the DOM as `rgba(r, g, b, a.aa)`, so
// put a skin's own hex / rgb() / rgba() / transparent value into that one shape
// before comparing the two.
const asRgba = (color: string): string => {
  if (color === "transparent") return "rgba(0, 0, 0, 0.00)";
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (hex) return `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, 1.00)`;
  const fn = /^rgba?\(([^)]+)\)$/.exec(color);
  if (fn) {
    const [r, g, b, a = "1"] = fn[1].split(",").map((p) => p.trim());
    return `rgba(${r}, ${g}, ${b}, ${Number(a).toFixed(2)})`;
  }
  return color;
};

// The three platform builds of Dropdown, each with the skin it was built from.
// Under bun there is no .ios/.android extension resolution, so each build is
// imported by its explicit filename.
const PLATFORM_MENUS: { name: string; file: string; skin: DropdownSkin }[] = [
  { name: "web", file: "dropdown", skin: webMenuSkin },
  { name: "iOS", file: "dropdown.ios", skin: iosMenuSkin },
  { name: "Android", file: "dropdown.android", skin: androidMenuSkin },
];
const loadDropdown = async (file: string) =>
  ((await import(`../src/atoms/dropdown/${file}.tsx`)) as { Dropdown: (p: DropdownProps) => ReactNode }).Dropdown;

describe("OverlayProvider outlet (click-through)", () => {
  // Regression guard for the outlet swallowing every click on web. The outlet is a
  // z-1000 full-bleed layer; it MUST be box-none so an EMPTY outlet lets page taps
  // through while portaled children still capture. box-none only works through
  // StyleSheet.create on react-native-web (an inline `{ pointerEvents }` literal is
  // dropped, leaving the outlet at pointer-events:auto and blanketing the page).
  // A synthetic .click() bypasses hit-testing, so only a computed-style assertion
  // catches this — asserting pointer-events resolves to `none`, not `auto`.
  const findOutlet = (container: HTMLElement) =>
    [...container.querySelectorAll("div")].find(
      (d) => getComputedStyle(d).zIndex === "1000" && getComputedStyle(d).position === "absolute",
    );

  it("renders the outlet transparent to pointers (box-none), not click-eating", () => {
    const { container } = ui(
      <OverlayProvider>
        <Text>page</Text>
      </OverlayProvider>,
    );
    const outlet = findOutlet(container);
    expect(outlet).toBeDefined();
    // The box itself is transparent: an empty outlet never intercepts a page click.
    expect(getComputedStyle(outlet!).pointerEvents).toBe("none");
  });

  it("still lets portaled children capture (the box-none child-auto half)", () => {
    const { container } = ui(
      <OverlayProvider>
        <Text>page</Text>
      </OverlayProvider>,
    );
    const outlet = findOutlet(container)!;
    // The outlet carries a pointer-events atomic class whose companion rule sets
    // direct children back to `auto` — so a portaled menu/backdrop stays clickable.
    const peClass = [...outlet.classList].find((c) => c.startsWith("r-pointerEvents-"));
    expect(peClass).toBeDefined();
    const childAutoRule = [...document.styleSheets]
      .flatMap((s) => {
        try {
          return [...s.cssRules].map((r) => r.cssText);
        } catch {
          return [];
        }
      })
      .some((t) => t.includes(`.${peClass}>*`) && t.includes("pointer-events: auto"));
    expect(childAutoRule).toBe(true);
  });
});

describe("AnchoredOverlay dismiss backdrop (hosted)", () => {
  // The hosted (portaled) overlay adds a full-bleed backdrop so an outside tap
  // dismisses — but ONLY when a tap can actually close the card. A controlled
  // `open` with no onOpenChange (e.g. a docs example pinned open) must render
  // WITHOUT it, or the backdrop blankets the host and blocks every click under
  // an overlay that can never close.
  const findOutlet = (container: HTMLElement) =>
    [...container.querySelectorAll("div")].find(
      (d) => getComputedStyle(d).zIndex === "1000" && getComputedStyle(d).position === "absolute",
    )!;
  // The backdrop is the outlet child pinned to all four edges (the positioned
  // card wrapper carries explicit left/top only).
  const findBackdrop = (outlet: HTMLElement) =>
    [...outlet.children].find((c) => {
      const s = getComputedStyle(c);
      return s.top === "0px" && s.bottom === "0px" && s.left === "0px" && s.right === "0px";
    });
  const items = [{ label: "Edit" }, { label: "Duplicate" }];

  it("renders the backdrop for an uncontrolled menu opened via its trigger", () => {
    const { container } = ui(
      <OverlayProvider>
        <Dropdown trigger="Actions" items={items} />
      </OverlayProvider>,
    );
    fireEvent.click(screen.getByText("Actions"));
    expect(findBackdrop(findOutlet(container))).toBeDefined();
  });

  it("renders the backdrop for a controlled menu WITH onOpenChange, and taps report the close", () => {
    let openState: boolean | null = null;
    const { container } = ui(
      <OverlayProvider>
        <Dropdown trigger="Actions" open onOpenChange={(o) => { openState = o; }} items={items} />
      </OverlayProvider>,
    );
    const backdrop = findBackdrop(findOutlet(container))!;
    expect(backdrop).toBeDefined();
    fireEvent.click(backdrop);
    expect(openState).toBe(false);
  });

  it("skips the backdrop when dismissal is a no-op (controlled open, no handler)", () => {
    const { container } = ui(
      <OverlayProvider>
        <Dropdown trigger="Actions" open items={items} />
      </OverlayProvider>,
    );
    expect(findBackdrop(findOutlet(container))).toBeUndefined();
  });
});

describe("Drawer (full-screen Modal overlay)", () => {
  it("renders nothing until opened, then mounts the panel via its trigger", () => {
    ui(
      <Drawer trigger="Open menu">
        <Text>Drawer body</Text>
      </Drawer>,
    );
    // Closed: the Modal is not visible, so RNW mounts none of its content.
    expect(screen.queryByText("Drawer body")).toBeNull();
    // The uncontrolled trigger opens it.
    fireEvent.click(screen.getByText("Open menu"));
    expect(screen.getByText("Drawer body")).toBeDefined();
  });

  it("marks the overlay aria-modal so content behind it reads as inert", () => {
    ui(
      <Drawer open>
        <Text>Drawer body</Text>
      </Drawer>,
    );
    expect(document.querySelector('[aria-modal="true"]')).not.toBeNull();
  });

  it("names the modal surface from an explicit label or its trigger", () => {
    const { rerender } = ui(
      <Drawer open accessibilityLabel="Project settings">
        <Text>Drawer body</Text>
      </Drawer>,
    );
    expect(document.querySelector('[aria-modal="true"]')?.getAttribute("aria-label")).toBe("Project settings");
    rerender(
      <Drawer open trigger="Open menu">
        <Text>Drawer body</Text>
      </Drawer>,
    );
    expect(document.querySelector('[aria-modal="true"]')?.getAttribute("aria-label")).toBe("Open menu");
  });

  it("supports every edge, including a top-edge sheet", () => {
    for (const edge of ["left", "right", "bottom", "top"] as const) {
      ui(
        <Drawer open {...{ [edge]: true }}>
          <Text>{`${edge} panel`}</Text>
        </Drawer>,
      );
      expect(screen.getByText(`${edge} panel`)).toBeTruthy();
      expect(document.querySelector('[aria-modal="true"]')).not.toBeNull();
      cleanup();
    }
  });

  it("dismisses on a scrim tap, reporting the close through onOpenChange", () => {
    let openState: boolean | null = null;
    ui(
      <Drawer open onOpenChange={(o) => { openState = o; }}>
        <Text>Drawer body</Text>
      </Drawer>,
    );
    // A side (default left) drawer slides in over an animated dim, behind a TRANSPARENT
    // tap-to-close scrim (accessible={false} — a backdrop, not a labelled control). Reach the
    // scrim structurally from the panel content — Text -> SafeAreaView -> the panel surface
    // (GlassSurface, one plain box in solid mode) -> panelPos -> slide wrapper -> scrim — and
    // confirm a "0, 0, 0" dim backdrop is its sibling, so a structural drift fails loudly
    // here instead of silently.
    const panel = screen.getByText("Drawer body");
    const scrim = panel.parentElement!.parentElement!.parentElement!.parentElement!.parentElement!;
    const dim = scrim.parentElement!.firstElementChild as HTMLElement;
    expect(dim.style.backgroundColor).toContain("0, 0, 0");
    fireEvent.click(scrim);
    expect(openState).toBe(false);
  });
});

describe("ActionSheet (full-screen Modal overlay)", () => {
  it("renders nothing until opened, then mounts the sheet via its trigger", () => {
    ui(
      <ActionSheet
        trigger="Add photo"
        actions={[{ label: "Take Photo", onPress: () => {} }]}
      />,
    );
    // Closed: the Modal is not visible, so RNW mounts none of its rows.
    expect(screen.queryByText("Take Photo")).toBeNull();
    // The uncontrolled trigger opens it.
    fireEvent.click(screen.getByText("Add photo"));
    expect(screen.getByText("Take Photo")).toBeDefined();
  });
});

describe("Popover (anchored card)", () => {
  it("toggles the card from its trigger and exposes aria-expanded", () => {
    const { container } = ui(
      <Popover trigger="Details" title="Heads up" description="Some supporting copy." />,
    );
    const trigger = container.querySelector('[aria-expanded]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Heads up")).toBeNull();

    fireEvent.click(screen.getByText("Details"));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Heads up")).toBeDefined();
    expect(screen.getByText("Some supporting copy.")).toBeDefined();
  });

  it("closes when the card's action button is pressed", () => {
    // Uncontrolled: open via the trigger, then let the card's action dismiss it.
    ui(<Popover trigger="Details" title="Heads up" actionLabel="Got it" />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("Heads up")).toBeDefined();
    fireEvent.click(screen.getByText("Got it"));
    expect(screen.queryByText("Heads up")).toBeNull();
  });

  it("hosts custom children in the panel body, between the description and the action", () => {
    ui(
      <Popover trigger="Rename" title="Rename project" description="Pick a clear name." actionLabel="Save">
        <Text>Custom body</Text>
      </Popover>,
    );
    // Closed: the children unmount with the rest of the card.
    expect(screen.queryByText("Custom body")).toBeNull();
    fireEvent.click(screen.getByText("Rename"));
    const child = screen.getByText("Custom body");
    // The slot renders after the supporting line and before the action row.
    const description = screen.getByText("Pick a clear name.");
    const action = screen.getByText("Save");
    expect(description.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(child.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders children in the static inline panel too", () => {
    ui(
      <Popover inline title="Rename this project?">
        <Text>Inline body</Text>
      </Popover>,
    );
    expect(screen.getByText("Inline body")).toBeDefined();
  });
});

describe("Tooltip", () => {
  it("shows the tip as a live alert on trigger press, then hides on re-press", () => {
    const { container } = ui(<Tooltip trigger="Info" label="Extra context" />);
    const trigger = container.querySelector('[aria-expanded]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Extra context")).toBeNull();

    fireEvent.click(screen.getByText("Info"));
    const bubble = container.querySelector('[role="alert"]')!;
    expect(bubble).not.toBeNull();
    expect(bubble.getAttribute("aria-live")).toBe("polite");
    expect(bubble.textContent).toBe("Extra context");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByText("Info"));
    expect(screen.queryByText("Extra context")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the tip while the trigger is hovered and hides on hover out", () => {
    const { container } = ui(<Tooltip trigger="Info" label="Extra context" />);
    const trigger = container.querySelector('[aria-expanded]')!;
    expect(screen.queryByText("Extra context")).toBeNull();

    // react-native-web listens for pointerenter when PointerEvent exists and
    // mouseenter otherwise; fire both so the test holds under either DOM.
    fireEvent.pointerEnter(trigger);
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Extra context")).toBeDefined();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerLeave(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Extra context")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the tip on focus and hides on blur, for every trigger flavor", () => {
    for (const props of [{}, { iconTrigger: true }, { textTrigger: true }] as const) {
      const { container, unmount } = ui(<Tooltip trigger="Info" label="Extra context" {...props} />);
      const trigger = container.querySelector('[aria-expanded]')!;
      expect(screen.queryByText("Extra context")).toBeNull();

      fireEvent.focus(trigger);
      expect(screen.getByText("Extra context")).toBeDefined();

      fireEvent.blur(trigger);
      expect(screen.queryByText("Extra context")).toBeNull();
      unmount();
    }
  });

  // The element trigger (`children`): the tip hangs off a control the caller
  // already has (the console's icon Button), so the wrapper may only LISTEN. It
  // takes no role, no tab stop, and no press responder; the child stays the one
  // interactive, labelled element.
  it("hangs the tip off an element trigger without claiming the child's press", () => {
    let presses = 0;
    const { container } = ui(
      <Tooltip label="Glass on">
        <Button ghost small onPress={() => { presses += 1; }}>Glass</Button>
      </Tooltip>,
    );
    const child = container.querySelector("button")!;
    expect(container.querySelectorAll("button").length).toBe(1);

    fireEvent.click(child);
    // The child's own onPress still runs, and the press does NOT toggle the tip.
    expect(presses).toBe(1);
    expect(screen.queryByText("Glass on")).toBeNull();
  });

  it("shows the tip on the element trigger's hover and focus, and hides it again", () => {
    const { container } = ui(
      <Tooltip label="Glass on">
        <Button ghost small onPress={() => {}}>Glass</Button>
      </Tooltip>,
    );
    const child = container.querySelector("button")!;

    // The wrapper takes RN's pointer events, which React synthesizes from
    // pointerover/pointerout (RTL's pointerEnter/pointerLeave fire both), so
    // entering the CHILD enters the wrapper too.
    fireEvent.pointerEnter(child);
    expect(screen.getByText("Glass on")).toBeDefined();

    fireEvent.pointerLeave(child);
    expect(screen.queryByText("Glass on")).toBeNull();

    // Focus/blur bubble out of the child, so a keyboard tab onto it opens the tip.
    fireEvent.focus(child);
    expect(screen.getByText("Glass on")).toBeDefined();
    fireEvent.blur(child);
    expect(screen.queryByText("Glass on")).toBeNull();
  });

  // The bubble renders IN FLOW, so opening it pushes the trigger over by the
  // bubble's height. If the hover region hugged the child, the trigger would slide
  // out from under a stationary pointer and the browser's post-layout hover
  // recompute would close the tip the moment it appeared (verified in Chrome). The
  // region is the whole tooltip instead, so crossing onto the bubble keeps it up.
  it("keeps an element trigger's tip up while the pointer crosses onto the bubble", () => {
    const { container } = ui(
      <Tooltip label="Glass on">
        <Button ghost small onPress={() => {}}>Glass</Button>
      </Tooltip>,
    );
    const child = container.querySelector("button")!;
    fireEvent.pointerEnter(child);
    const bubble = container.querySelector('[role="alert"]')!;
    expect(bubble.textContent).toBe("Glass on");

    // Trigger -> bubble: a move WITHIN the tooltip must not close it.
    fireEvent.pointerOut(child, { relatedTarget: bubble });
    fireEvent.pointerOver(bubble, { relatedTarget: child });
    expect(screen.getByText("Glass on")).toBeDefined();

    // Leaving the tooltip altogether does close it.
    fireEvent.pointerLeave(bubble);
    expect(screen.queryByText("Glass on")).toBeNull();
  });

  it("gives the element trigger's wrapper no role and no tab stop", () => {
    const { container } = ui(
      <Tooltip label="Glass on" open testID="glass-tip">
        <Button ghost small onPress={() => {}}>Glass</Button>
      </Tooltip>,
    );
    const root = container.querySelector('[data-testid="glass-tip"]')!;
    const child = container.querySelector("button")!;
    // Every node between the child and the tooltip root is inert: no role, so
    // nothing extra is announced, and no tab stop, so the child is the only
    // keyboard target.
    let ancestors = 0;
    for (let node = child.parentElement; node != null && node !== root.parentElement; node = node.parentElement) {
      expect(node.getAttribute("role")).toBeNull();
      expect(node.getAttribute("tabindex")).toBeNull();
      ancestors += 1;
    }
    expect(ancestors).toBeGreaterThan(0);
    // No second interactive element, and no button nested inside another button.
    expect(container.querySelectorAll("button").length).toBe(1);
    expect(child.parentElement?.closest("button")).toBeNull();
  });

  it("gives children precedence over iconTrigger and textTrigger", () => {
    const { container } = ui(
      <Tooltip label="Glass on" iconTrigger textTrigger trigger="Hover me">
        <Button ghost small onPress={() => {}}>Glass</Button>
      </Tooltip>,
    );
    // Only the child renders: no built-in trigger, so no aria-expanded node.
    expect(container.querySelectorAll("button").length).toBe(1);
    expect(container.querySelector("[aria-expanded]")).toBeNull();
    expect(screen.getByText("Glass")).toBeDefined();
    expect(screen.queryByText("Hover me")).toBeNull();
  });
});

describe("RowMenu", () => {
  it("opens the menu from the ⋯ trigger and reports the selected row, then closes", () => {
    let picked: { label: string; index: number } | null = null;
    const { container } = ui(
      <RowMenu
        sectionLabel="Manage"
        items={[{ label: "Rename" }, { label: "Delete", destructive: true }]}
        onSelect={(item, index) => { picked = { label: item.label, index }; }}
      />,
    );
    const trigger = screen.getByLabelText("More options");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Rename")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(2);

    fireEvent.click(screen.getByText("Delete"));
    expect(picked).toEqual({ label: "Delete", index: 1 });
    expect(screen.queryByText("Delete")).toBeNull();
  });
});

describe("Dropdown", () => {
  it("opens a role=menu from the trigger, selects a row, and closes", () => {
    let picked: { label: string; index: number } | null = null;
    const { container } = ui(
      <Dropdown
        trigger="Actions"
        items={[{ label: "Duplicate" }, { label: "Archive" }]}
        onSelect={(item, index) => { picked = { label: item.label, index }; }}
      />,
    );
    expect(screen.queryByText("Duplicate")).toBeNull();

    fireEvent.click(screen.getByText("Actions"));
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(2);

    fireEvent.click(screen.getByText("Archive"));
    expect(picked).toEqual({ label: "Archive", index: 1 });
    expect(screen.queryByText("Archive")).toBeNull();
  });

  it("does not select or close on a disabled row", () => {
    let selected = false;
    const { container } = ui(
      <Dropdown
        trigger="Actions"
        items={[{ label: "Edit" }, { label: "Remove", disabled: true }]}
        onSelect={() => { selected = true; }}
      />,
    );
    fireEvent.click(screen.getByText("Actions"));
    const disabledRow = container.querySelectorAll('[role="menuitem"]')[1];
    expect(disabledRow.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(screen.getByText("Remove"));
    expect(selected).toBe(false);
    // Still open: a disabled row is a no-op, so the menu stays put.
    expect(screen.getByText("Edit")).toBeDefined();
  });

  it("renders the identity header above the label and the rows, outside the item count", () => {
    const { container } = ui(
      <Dropdown
        trigger="Account"
        title="Rachel Chen"
        description="rachel@nannier.com"
        label="Account actions"
        items={[{ label: "Profile" }, { label: "Log out" }]}
      />,
    );
    fireEvent.click(screen.getByText("Account"));
    const menu = container.querySelector('[role="menu"]')!;
    const order = menu.textContent ?? "";
    // Header block first, then the muted section label, then the rows.
    expect(order.indexOf("Rachel Chen")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("Rachel Chen")).toBeLessThan(order.indexOf("rachel@nannier.com"));
    expect(order.indexOf("rachel@nannier.com")).toBeLessThan(order.indexOf("Account actions"));
    expect(order.indexOf("Account actions")).toBeLessThan(order.indexOf("Profile"));
    // The header is not a menu item: the roving-focus count is still the two
    // rows, and neither header line takes a tab stop.
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(2);
    expect(screen.getByText("Rachel Chen").getAttribute("tabindex")).toBeNull();
    expect(screen.getByText("rachel@nannier.com").getAttribute("tabindex")).toBeNull();
  });

  // An unnamed menu is announced as a bare "menu", and two loose Text nodes inside
  // role="menu" are anonymous generic content. The header names the menu and is
  // itself a group (a valid child of `menu`), WITHOUT becoming a focusable row.
  it("names the menu from the identity header and reads the header as one group", () => {
    const { container } = ui(
      <Dropdown
        trigger="Account"
        title="Rachel Chen"
        description="rachel@nannier.com"
        items={[{ label: "Profile" }, { label: "Log out" }]}
      />,
    );
    fireEvent.click(screen.getByText("Account"));
    const menu = container.querySelector('[role="menu"]')!;
    // The title is the label target: it is what a user calls that menu.
    expect(menu.getAttribute("aria-label")).toBe("Rachel Chen");

    const group = container.querySelector('[role="group"]')!;
    expect(group).not.toBeNull();
    expect(group.getAttribute("aria-label")).toBe("Rachel Chen, rachel@nannier.com");
    // Both lines live inside that one group, instead of as loose anonymous nodes.
    expect(group.contains(screen.getByText("Rachel Chen"))).toBe(true);
    expect(group.contains(screen.getByText("rachel@nannier.com"))).toBe(true);
    // ...and the group is not an item: no menuitem role, no tab stop, and the
    // roving-focus count is still items.length.
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("tabindex")).toBeNull();
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(2);
  });

  it("falls back to the section label for the menu name, and to none with neither", () => {
    const labelled = ui(<Dropdown trigger="Actions" label="Account actions" items={[{ label: "Profile" }]} />);
    fireEvent.click(screen.getByText("Actions"));
    expect(labelled.container.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBe("Account actions");
    // No header block came along with the section label.
    expect(labelled.container.querySelector('[role="group"]')).toBeNull();
    cleanup();

    // Nothing to name it with: the attribute is absent rather than invented, so
    // the platform's own name-from-the-trigger computation still applies.
    const bare = ui(<Dropdown trigger="Actions" items={[{ label: "Profile" }]} />);
    fireEvent.click(screen.getByText("Actions"));
    expect(bare.container.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBeNull();
  });

  // The header block is only a header if something closes it off; without the rule
  // it reads as an unstyled first row. iOS and web each draw their own hairline,
  // Android (M3, which groups with spacing rather than dividers) deliberately
  // draws none, so "no separator" has to be asserted too, or dropping the rule
  // everywhere would still look correct on the one skin that never had it.
  it("closes the identity header with each skin's own hairline, and with none where the skin has none", async () => {
    const items = [{ label: "Profile" }, { label: "Log out" }];
    for (const { name, file, skin } of PLATFORM_MENUS) {
      const Native = await loadDropdown(file);
      const { container } = ui(
        <Native trigger="Account" title="Rachel Chen" description="rachel@nannier.com" items={items} />,
      );
      fireEvent.click(screen.getByText("Account"));
      const menu = container.querySelector('[role="menu"]')!;
      const after = menu.children[1] as HTMLElement;

      if (skin.separator) {
        // header group, hairline, then one wrapper per row.
        expect(menu.children.length, name).toBe(2 + items.length);
        // The rule is a bare hairline View, not a row: nothing focusable in it.
        expect(after.querySelector('[role="menuitem"]'), name).toBeNull();
        const rule = skin.separator(lightColors);
        expect(after.style.height, name).toBe(`${rule.height as number}px`);
        expect(after.style.backgroundColor, name).toBe(asRgba(rule.backgroundColor as string));
        // ...standing off by the skin's own margin (4 on web, 6 on iOS).
        expect(after.style.marginTop, name).toBe(`${rule.marginTop as number}px`);
        expect(after.style.marginBottom, name).toBe(`${rule.marginBottom as number}px`);
      } else {
        // M3: the header's own padding does the separating, so the first row
        // follows the group directly.
        expect(menu.children.length, name).toBe(1 + items.length);
        expect(after.querySelector('[role="menuitem"]'), name).not.toBeNull();
      }

      // Either way the hairline is not a row: the item count is untouched.
      expect(container.querySelectorAll('[role="menuitem"]').length, name).toBe(items.length);
      cleanup();
    }
  });

  // The header is exercised with both lines, and with neither. Title-only is the
  // third shape, and the one AvatarMenu produces for an account with no email:
  // one line in has to mean one line out, with no trailing comma in the name from
  // the line that is not there.
  it("renders a title-only header, and a description-only one, without inventing a second line", () => {
    const titleOnly = ui(<Dropdown trigger="Account" title="Rachel Chen" items={[{ label: "Profile" }]} />);
    fireEvent.click(screen.getByText("Account"));
    const group = titleOnly.container.querySelector('[role="group"]') as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.children.length).toBe(1);
    expect(group.getAttribute("aria-label")).toBe("Rachel Chen");
    expect(titleOnly.container.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBe("Rachel Chen");
    // A one-line header is still a header: the hairline closes it off.
    expect((titleOnly.container.querySelector('[role="menu"]')!.children[1] as HTMLElement).style.height).toBe("1px");
    cleanup();

    // ...and the mirror shape, where only the muted line is supplied, names the
    // menu from that line rather than leaving it anonymous.
    const descriptionOnly = ui(
      <Dropdown trigger="Account" description="rachel@nannier.com" items={[{ label: "Profile" }]} />,
    );
    fireEvent.click(screen.getByText("Account"));
    const line = descriptionOnly.container.querySelector('[role="group"]') as HTMLElement;
    expect(line.children.length).toBe(1);
    expect(line.getAttribute("aria-label")).toBe("rachel@nannier.com");
    expect(descriptionOnly.container.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBe("rachel@nannier.com");
  });

  it("omits the header block entirely when neither title nor description is passed", () => {
    const { container } = ui(<Dropdown trigger="Actions" items={[{ label: "Edit" }, { label: "Duplicate" }]} />);
    fireEvent.click(screen.getByText("Actions"));
    // Nothing extra above the rows: the menu's children are exactly the items,
    // so every pre-existing call site renders byte for byte as before.
    expect(container.querySelector('[role="menu"]')!.children.length).toBe(2);
  });

  it("pins the menu's trailing edge to the trigger with alignEnd, the leading edge without it", () => {
    const leading = ui(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />);
    fireEvent.click(screen.getByText("Account"));
    // react-native-web resolves the logical `start`/`end` inset to the physical
    // edge for the active direction, so the default anchors at the left.
    expect(anchorStyle(leading.container)).toContain("left: 0px");
    expect(anchorStyle(leading.container)).not.toContain("right: 0px");
    cleanup();

    const trailing = ui(<Dropdown trigger="Account" alignEnd items={[{ label: "Profile" }]} />);
    fireEvent.click(screen.getByText("Account"));
    expect(anchorStyle(trailing.container)).toContain("right: 0px");
    expect(anchorStyle(trailing.container)).not.toContain("left: 0px");
  });

  // The anchor above is the no-provider FALLBACK. Every real app and every docs
  // stage mounts an OverlayProvider, and there the card is portaled and placed by
  // AnchoredOverlay from an inset it measures, not by the inline start/end style.
  // Unless `alignEnd` reaches that placement too, a menu that tests as
  // trailing-aligned ships leading-aligned.
  it("carries the same alignment onto the hosted (portaled) card, not just the inline fallback", async () => {
    await withLayout(async () => {
      const leading = ui(
        <OverlayProvider>
          <Dropdown trigger="Account" items={[{ label: "Profile" }]} />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByText("Account"));
      await settle();
      // Hosted, the leading edge is the trigger's own offset inside the outlet...
      expect(anchorStyle(leading.container)).toContain("left: 0px");
      expect(anchorStyle(leading.container)).not.toContain("right: 0px");
      cleanup();

      const trailing = ui(
        <OverlayProvider>
          <Dropdown trigger="Account" alignEnd items={[{ label: "Profile" }]} />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByText("Account"));
      await settle();
      // ...and the trailing edge a `right` inset from the outlet's edge, which is
      // what lets the card be pinned without ever being measured.
      expect(anchorStyle(trailing.container)).toContain("right: 0px");
      expect(anchorStyle(trailing.container)).not.toContain("left: 0px");
    });
  });

  // Two trigger shapes, two owners of the dim. The CUSTOM trigger is the one the
  // menu skin fades, by the hand-off's --p-disabled for that platform; the default
  // trigger is a Button, which owns its own disabled treatment. Both have to be
  // dimmed AND inert, and only the custom one may read the menu skin's number.
  it("dims a disabled custom trigger by each platform's own --p-disabled, and the default trigger by the Button's", async () => {
    for (const { name, file, skin } of PLATFORM_MENUS) {
      const Native = await loadDropdown(file);
      const { container } = ui(
        <Native disabled triggerLabel="Account" items={[{ label: "Edit" }]}>
          <Text>Account</Text>
        </Native>,
      );
      const custom = container.querySelector('[aria-haspopup="menu"]') as HTMLElement;
      // 0.5 on web, 0.4 on iOS, M3's 0.38 on Android.
      expect(custom.style.opacity, name).toBe(String(skin.disabledOpacity));
      expect(custom.getAttribute("aria-disabled"), name).toBe("true");
      expect(custom.getAttribute("aria-expanded"), name).toBe("false");
      cleanup();
    }

    // The default trigger takes Button's disabled treatment instead, so the menu
    // skin's number is deliberately NOT applied there. (Which number Button uses
    // per platform is the Button suite's business; under bun there is no
    // .ios/.android resolution, so every build here links the web Button.) What
    // matters at this seam is that the default path is dimmed and out of the tab
    // order rather than looking live.
    const { container } = ui(<Dropdown trigger="Actions" disabled items={[{ label: "Edit" }]} />);
    const button = container.querySelector('[aria-haspopup="menu"]') as HTMLElement;
    expect(Number(button.style.opacity)).toBeGreaterThan(0);
    expect(Number(button.style.opacity)).toBeLessThan(1);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("tabindex")).toBe("-1");
  });

  it("never opens a disabled Dropdown and marks the default trigger disabled", () => {
    let reported: boolean | null = null;
    const { container } = ui(
      <Dropdown trigger="Actions" disabled onOpenChange={(o) => { reported = o; }} items={[{ label: "Edit" }]} />,
    );
    const trigger = container.querySelector("[aria-expanded]")!;
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");

    fireEvent.click(screen.getByText("Actions"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(reported).toBeNull();
  });

  // A custom trigger is a View, so nothing names the button unless the caller says
  // so: without triggerLabel the browser falls back to naming it from its contents,
  // which concatenates the trigger's text nodes and repeats any nested label.
  it("names a custom trigger from triggerLabel, on the button itself", () => {
    const { container } = ui(
      <Dropdown triggerLabel="Rachel Chen, rachel@example.com" items={[{ label: "Profile" }]}>
        <Text>Rachel Chen</Text>
      </Dropdown>,
    );
    const trigger = container.querySelector('[aria-haspopup="menu"]')!;
    expect(trigger.getAttribute("aria-label")).toBe("Rachel Chen, rachel@example.com");
    cleanup();

    // Omitted, the attribute is absent rather than empty, so the platform's own
    // name-from-contents still applies to a trigger that reads fine on its own.
    const plain = ui(
      <Dropdown items={[{ label: "Profile" }]}>
        <Text>Account</Text>
      </Dropdown>,
    ).container;
    expect(plain.querySelector('[aria-haspopup="menu"]')!.getAttribute("aria-label")).toBeNull();
  });

  it("keeps a disabled custom trigger inert, even against a controlled open", () => {
    const { container } = ui(
      <Dropdown disabled open items={[{ label: "Edit" }]}>
        <Text>Account</Text>
      </Dropdown>,
    );
    const trigger = container.querySelector("[aria-expanded]")!;
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    // A controlled `open` cannot force the menu out of a disabled control.
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="menu"]')).toBeNull();

    fireEvent.click(screen.getByText("Account"));
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it("carries the hand-off's identity-header metrics on all three skins", async () => {
    const { webSkin, iosSkin, androidSkin } = await import("../src/atoms/dropdown/dropdown.styles.ts");
    // The gutter is the per-OS value: it matches each skin's own section-label
    // gutter, so the header, the label, and the row labels share one column.
    expect(webSkin.menuHeader).toEqual({ paddingHorizontal: 12, paddingVertical: 8, gap: 2 });
    expect(iosSkin.menuHeader).toEqual({ paddingHorizontal: 16, paddingVertical: 6, gap: 2 });
    expect(androidSkin.menuHeader).toEqual({ paddingHorizontal: 16, paddingVertical: 8, gap: 2 });
    // The type scale is deliberately shared (the hand-off hard-codes 14/20
    // medium over 12/16), and each line reads its semantic token.
    const t = { "popover-foreground": "PF", "muted-foreground": "MF" } as unknown as ColorTokens;
    for (const skin of [webSkin, iosSkin, androidSkin]) {
      expect(skin.menuHeaderTitle(t)).toEqual({ fontSize: 14, lineHeight: 20, fontWeight: "500", color: "PF" });
      expect(skin.menuHeaderDescription(t)).toEqual({ fontSize: 12, lineHeight: 16, color: "MF" });
    }
  });

  it("renders the identity header on the iOS and Android builds too", async () => {
    for (const platform of ["ios", "android"] as const) {
      const mod = (await import(`../src/atoms/dropdown/dropdown.${platform}.tsx`)) as {
        Dropdown: (p: Record<string, unknown>) => ReactNode;
      };
      const Native = mod.Dropdown;
      const { container } = ui(
        <Native trigger="Account" title="Rachel Chen" description="rachel@nannier.com" items={[{ label: "Profile" }]} />,
      );
      fireEvent.click(screen.getByText("Account"));
      expect(screen.getByText("Rachel Chen")).toBeDefined();
      expect(container.querySelectorAll('[role="menuitem"]').length).toBe(1);
      cleanup();
    }
  });
});

describe("Select (trigger-driven, uncontrolled)", () => {
  it("opens the listbox from the trigger, picks an option, then closes showing the value", () => {
    let chosen = "";
    const { container } = ui(
      <Select options={["Small", "Medium", "Large"]} placeholder="Choose a size" onSelect={(o) => { chosen = o; }} />,
    );
    const trigger = container.querySelector('[aria-expanded]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="listbox"]')).toBeNull();

    fireEvent.click(screen.getByText("Choose a size"));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);

    fireEvent.click(options[1]);
    expect(chosen).toBe("Medium");
    // Closed after select, and the trigger now shows the chosen value.
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('[aria-expanded]')!.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Medium")).toBeDefined();
  });
});
