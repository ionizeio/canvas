import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { layoutEntrances, layoutHostedEntrance } from "./entrance-layout.ts";
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { RadioGroup } from "../src/atoms/radio/radio.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { Listbox } from "../src/atoms/listbox/listbox.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { Slider } from "../src/atoms/slider/slider.tsx";
import { I18nManager } from "react-native";

afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// The HOSTED (portaled) overlay path, which every real app and every docs stage
// runs, holds its card back until the trigger measures a non-zero box. Supply
// the fixture box while it measures, wait for the actual portal content to mount,
// then deliver its explicit native card/scroll/Entrance layouts.
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
  let menu: Element | null = null;
  await waitFor(() => {
    menu = document.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
  });
  // Supply only this card's native placement boundaries, never its rows.
  layoutHostedEntrance(menu!, { width: 160, height: 144 });
};

describe("Tabs roving keyboard navigation", () => {
  it("moves + activates the tab with arrows, wraps, and honors Home/End", () => {
    const { container } = ui(<Tabs tabs={["One", "Two", "Three"]} defaultActive={0} />);
    const tabs = () => [...container.querySelectorAll('[role="tab"]')];
    const selected = () => tabs().findIndex((t) => t.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    // Roving tabindex: only the active tab is in the tab order.
    expect(tabs()[0].getAttribute("tabindex")).toBe("0");
    expect(tabs()[1].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(tabs()[0], { key: "ArrowRight" });
    expect(selected()).toBe(1);
    fireEvent.keyDown(tabs()[1], { key: "ArrowRight" });
    expect(selected()).toBe(2);
    // Wraps past the end.
    fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
    expect(selected()).toBe(0);
    // ArrowLeft goes back (and wraps).
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(selected()).toBe(2);
    // Home/End jump to the ends.
    fireEvent.keyDown(tabs()[2], { key: "Home" });
    expect(selected()).toBe(0);
    fireEvent.keyDown(tabs()[0], { key: "End" });
    expect(selected()).toBe(2);
  });

  it("skips a per-item disabled tab and keeps it out of the tab order", () => {
    const { container } = ui(
      <Tabs tabs={["One", { label: "Two", disabled: true }, "Three"]} defaultActive={0} />,
    );
    const tabs = () => [...container.querySelectorAll('[role="tab"]')];
    const selected = () => tabs().findIndex((t) => t.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0);
    // The disabled trigger is never a tab stop.
    expect(tabs()[1].getAttribute("tabindex")).toBe("-1");
    // ArrowRight hops over the disabled middle tab.
    fireEvent.keyDown(tabs()[0], { key: "ArrowRight" });
    expect(selected()).toBe(2);
    // ArrowLeft hops over it on the way back.
    fireEvent.keyDown(tabs()[2], { key: "ArrowLeft" });
    expect(selected()).toBe(0);
  });

  it("redirects Home/End off a disabled end tab to the nearest enabled one", () => {
    const { container } = ui(
      <Tabs
        tabs={[{ label: "One", disabled: true }, "Two", "Three", { label: "Four", disabled: true }]}
        defaultActive={1}
      />,
    );
    const tabs = () => [...container.querySelectorAll('[role="tab"]')];
    const selected = () => tabs().findIndex((t) => t.getAttribute("aria-selected") === "true");
    // End targets the disabled last tab and walks back to the nearest enabled.
    fireEvent.keyDown(tabs()[1], { key: "End" });
    expect(selected()).toBe(2);
    // Home targets the disabled first tab and walks forward to the nearest enabled.
    fireEvent.keyDown(tabs()[2], { key: "Home" });
    expect(selected()).toBe(1);
  });
});

describe("RadioGroup roving keyboard navigation", () => {
  it("moves selection with all four arrows, wraps, and keeps one tab stop", () => {
    const { container } = ui(
      <RadioGroup defaultValue="a">
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
        <Radio value="c">C</Radio>
      </RadioGroup>,
    );
    const radios = () => [...container.querySelectorAll('[role="radio"]')];
    const checked = () => radios().findIndex((r) => r.getAttribute("aria-checked") === "true");
    expect(checked()).toBe(0);
    // Roving tabindex: only the selected radio is in the tab order.
    expect(radios()[0].getAttribute("tabindex")).toBe("0");
    expect(radios()[1].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(radios()[0], { key: "ArrowDown" });
    expect(checked()).toBe(1);
    fireEvent.keyDown(radios()[1], { key: "ArrowRight" });
    expect(checked()).toBe(2);
    // Wraps forward and back.
    fireEvent.keyDown(radios()[2], { key: "ArrowDown" });
    expect(checked()).toBe(0);
    fireEvent.keyDown(radios()[0], { key: "ArrowUp" });
    expect(checked()).toBe(2);
  });
});

describe("Listbox roving keyboard navigation", () => {
  it("single-select: arrows and Home/End move + select the option", () => {
    const items = [{ label: "A" }, { label: "B" }, { label: "C" }];
    const { container } = ui(<Listbox items={items} defaultSelected={0} />);
    const opts = () => [...container.querySelectorAll('[role="option"]')];
    const sel = () => opts().findIndex((o) => o.getAttribute("aria-selected") === "true");
    expect(sel()).toBe(0);
    expect(opts()[0].getAttribute("tabindex")).toBe("0");
    expect(opts()[1].getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(opts()[0], { key: "ArrowDown" });
    expect(sel()).toBe(1);
    fireEvent.keyDown(opts()[1], { key: "End" });
    expect(sel()).toBe(2);
  });

  it("multi-select: arrows move focus, Space toggles the focused row", () => {
    const items = [{ label: "A" }, { label: "B" }, { label: "C" }];
    const { getByRole } = ui(<Listbox multi items={items} />);
    // Multi-select is a checkbox group with one interactive host per row.
    const list = getByRole("group", { name: "Options" });
    const rows = () => [...list.children] as HTMLElement[];
    const checkedIdx = () =>
      rows().map((r, i) => (r.getAttribute("aria-checked") === "true" ? i : -1)).filter((i) => i >= 0);
    // The first row is the single tab stop.
    expect(rows()[0].getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(rows()[0], { key: " " });
    fireEvent.keyUp(rows()[0], { key: " " });
    expect(checkedIdx()).toEqual([0]);
    // Arrow moves focus down without toggling.
    fireEvent.keyDown(rows()[0], { key: "ArrowDown" });
    expect(rows()[1].getAttribute("tabindex")).toBe("0");
    expect(checkedIdx()).toEqual([0]);
    fireEvent.keyDown(rows()[1], { key: " " });
    fireEvent.keyUp(rows()[1], { key: " " });
    expect(checkedIdx()).toEqual([0, 1]);
  });
});

describe("Dropdown menu roving keyboard navigation", () => {
  it("opens focused on the first row, arrows move focus, Enter selects and closes", () => {
    let picked = -1;
    const items = [{ label: "Profile" }, { label: "Settings" }, { label: "Sign out" }];
    const { container } = ui(<Dropdown trigger="Menu" items={items} onSelect={(_it, i) => { picked = i; }} />);
    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    const menuitems = () => [...container.querySelectorAll('[role="menuitem"]')];
    expect(menuitems().length).toBe(3);
    // The first row is the tab stop once the menu opens.
    expect(menuitems()[0].getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(menuitems()[0], { key: "ArrowDown" });
    expect(menuitems()[1].getAttribute("tabindex")).toBe("0");
    // Enter activates the focused row and closes the menu.
    fireEvent.keyDown(menuitems()[1], { key: "Enter" });
    expect(picked).toBe(1);
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(0);
  });

  it("moves DOM focus onto the first row on the inline path, skipping a disabled one", () => {
    const items = [{ label: "Profile", disabled: true }, { label: "Settings" }, { label: "Sign out" }];
    const { container } = ui(<Dropdown trigger="Menu" items={items} />);
    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    const menuitems = [...container.querySelectorAll('[role="menuitem"]')];
    // The first ENABLED row takes focus and the single tab stop, not row 0.
    expect(document.activeElement).toBe(menuitems[1]);
    expect(menuitems[1].getAttribute("tabindex")).toBe("0");
    expect(menuitems[0].getAttribute("tabindex")).toBe("-1");
  });

  // The hosted path is the one every app and docs page runs, and it mounts the
  // card a measurement LATER than `open` flips, so focusing on the open alone
  // focused nothing, leaving the arrows dead and the menu at the end of the tab
  // order. Focus must follow the card's mount instead.
  it("moves focus into the PORTALED menu once its card mounts, so the arrows are live there too", async () => {
    await withLayout(async () => {
      let picked = -1;
      const items = [{ label: "Profile" }, { label: "Settings" }, { label: "Sign out" }];
      const { container } = ui(
        <OverlayProvider>
          <Dropdown trigger="Menu" items={items} onSelect={(_it, i) => { picked = i; }} />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByText("Menu"));
      await settle();
      const menuitems = () => [...container.querySelectorAll('[role="menuitem"]')];
      expect(menuitems().length).toBe(3);
      expect(document.activeElement).toBe(menuitems()[0]);

      // Live roving: the arrows move real focus, not just the tab stop.
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
      expect(document.activeElement).toBe(menuitems()[1]);
      expect(menuitems()[1].getAttribute("tabindex")).toBe("0");
      fireEvent.keyDown(document.activeElement!, { key: "End" });
      expect(document.activeElement).toBe(menuitems()[2]);

      fireEvent.keyDown(document.activeElement!, { key: "Enter" });
      expect(picked).toBe(2);
      expect(container.querySelectorAll('[role="menuitem"]').length).toBe(0);
    });
  });

  // An identity header puts a NON-FOCUSABLE node (a role="group", not a row) at
  // the top of the card, ahead of every menuitem. The open-focus counts rows, not
  // children, so it must still land on row 0, and the header must never take the
  // focus or shift the roving index by the one child it adds.
  it("opens onto the first ROW when an identity header sits above it, on both overlay paths", async () => {
    const items = [{ label: "Profile" }, { label: "Settings" }];
    const inline = ui(
      <Dropdown trigger="Menu" title="Rachel Chen" description="rachel@nannier.com" items={items} />,
    );
    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    const rows = [...inline.container.querySelectorAll('[role="menuitem"]')];
    expect(rows.length).toBe(2);
    expect(document.activeElement).toBe(rows[0]);
    expect(rows[0].getAttribute("tabindex")).toBe("0");
    const header = inline.container.querySelector('[role="group"]')!;
    expect(header.getAttribute("tabindex")).toBeNull();
    expect(header.contains(document.activeElement)).toBe(false);
    // The arrows still walk the rows, unshifted by the header node.
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);
    cleanup();

    // ...and on the hosted path, where the card (header and rows together) mounts
    // a measurement later than the open itself.
    await withLayout(async () => {
      const hosted = ui(
        <OverlayProvider>
          <Dropdown trigger="Menu" title="Rachel Chen" description="rachel@nannier.com" items={items} />
        </OverlayProvider>,
      );
      fireEvent.click(screen.getByText("Menu"));
      await settle();
      const hostedRows = [...hosted.container.querySelectorAll('[role="menuitem"]')];
      expect(hostedRows.length).toBe(2);
      expect(document.activeElement).toBe(hostedRows[0]);
      expect(hosted.container.querySelector('[role="group"]')!.contains(document.activeElement)).toBe(false);
    });
  });

  it("still skips a disabled first row when an identity header sits above it", () => {
    const items = [{ label: "Profile", disabled: true }, { label: "Settings" }, { label: "Sign out" }];
    const { container } = ui(
      <Dropdown trigger="Menu" title="Rachel Chen" description="rachel@nannier.com" items={items} />,
    );
    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    const rows = [...container.querySelectorAll('[role="menuitem"]')];
    // The first ENABLED row takes focus and the single tab stop, counted from the
    // rows rather than from the card's children (the header is child 0, the
    // hairline child 1, so a child-based count would land on the wrong row).
    expect(document.activeElement).toBe(rows[1]);
    expect(rows[1].getAttribute("tabindex")).toBe("0");
    expect(rows[0].getAttribute("tabindex")).toBe("-1");
  });

  // WAI-ARIA: closing a menu hands focus back to the button that opened it.
  // Without that, Escape or a row press drops focus on document.body and the
  // keyboard user restarts at the top of the page.
  it("returns focus to the trigger on Escape, on a row select, and on an outside dismissal", async () => {
    const items = [{ label: "Profile" }, { label: "Settings" }];
    const { container } = ui(<Dropdown trigger="Menu" items={items} />);
    const trigger = container.querySelector('[aria-haspopup="menu"]')!;

    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    expect(document.activeElement).toBe(container.querySelector('[role="menuitem"]'));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // Selecting a row closes and returns focus the same way.
    fireEvent.click(screen.getByText("Menu"));
    layoutEntrances(document.body, { width: 240, height: 144 });
    fireEvent.click(screen.getByText("Settings"));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // ...as does an outside tap on the hosted path's dismiss backdrop.
    cleanup();
    await withLayout(async () => {
      const hosted = ui(
        <OverlayProvider>
          <Dropdown trigger="Menu" items={items} />
        </OverlayProvider>,
      );
      const hostedTrigger = hosted.container.querySelector('[aria-haspopup="menu"]')!;
      fireEvent.click(screen.getByText("Menu"));
      await settle();
      // The dismiss backdrop is the outlet CHILD pinned to all four edges (the
      // outlet itself is pinned the same way, hence the two-step search).
      const outlet = [...hosted.container.querySelectorAll("div")].find(
        (d) => getComputedStyle(d).zIndex === "1000" && getComputedStyle(d).position === "absolute",
      )!;
      const backdrop = [...outlet.children].find((c) => {
        const s = getComputedStyle(c);
        return s.top === "0px" && s.bottom === "0px" && s.left === "0px" && s.right === "0px";
      })!;
      expect(backdrop).toBeDefined();
      fireEvent.click(backdrop);
      expect(hosted.container.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(hostedTrigger);
    });
  });

  it("returns focus to the trigger when a controlled close happens with focus still on a row", () => {
    const items = [{ label: "Profile" }, { label: "Settings" }];
    const { container, rerender } = render(
      <ThemeProvider>
        <Dropdown trigger="Menu" open onOpenChange={() => {}} items={items} />
      </ThemeProvider>,
    );
    layoutEntrances(container, { width: 240, height: 144 });
    const trigger = container.querySelector('[aria-haspopup="menu"]')!;
    expect(document.activeElement).toBe(container.querySelector('[role="menuitem"]'));
    rerender(
      <ThemeProvider>
        <Dropdown trigger="Menu" open={false} onOpenChange={() => {}} items={items} />
      </ThemeProvider>,
    );
    // The close orphaned the focused row, so the trigger takes focus back rather
    // than leaving the keyboard user on document.body.
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves focus where the user moved it when a close was not user-driven", () => {
    const items = [{ label: "Profile" }, { label: "Settings" }];
    // A real control elsewhere on the page, the way a user tabs on while a
    // controlled menu is still open.
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    try {
      const { container, rerender } = render(
        <ThemeProvider>
          <Dropdown trigger="Menu" open onOpenChange={() => {}} items={items} />
        </ThemeProvider>,
      );
      layoutEntrances(container, { width: 240, height: 144 });
      const trigger = container.querySelector('[aria-haspopup="menu"]')!;
      // Tabbing off the focused row re-renders the row it left (RNW tracks focus
      // state on a Pressable), so the move goes through act.
      act(() => {
        elsewhere.focus();
      });
      expect(document.activeElement).toBe(elsewhere);

      // The app closes the menu on its own; focus is not the menu's to reclaim.
      rerender(
        <ThemeProvider>
          <Dropdown trigger="Menu" open={false} onOpenChange={() => {}} items={items} />
        </ThemeProvider>,
      );
      expect(container.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(elsewhere);
      expect(document.activeElement).not.toBe(trigger);
    } finally {
      elsewhere.remove();
    }
  });
});

describe("Command palette keyboard navigation", () => {
  it("arrows move the active row (clamped), aria-activedescendant follows, Enter selects", () => {
    let picked = -1;
    const groups = [{ heading: "Actions", items: [{ label: "New" }, { label: "Open" }, { label: "Save" }] }];
    const { container } = ui(<Command groups={groups} footer onSelect={(_it, i) => { picked = i; }} />);
    // The focusable driver is the search row's real text input.
    const search = container.querySelector('[role="search"] input') as HTMLElement;
    const options = () => [...container.querySelectorAll('[role="option"]')];
    const activeIdx = () => options().findIndex((o) => o.getAttribute("aria-selected") === "true");
    expect(activeIdx()).toBe(0);
    expect(search.getAttribute("aria-activedescendant")).toBe(options()[0].getAttribute("id"));

    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeIdx()).toBe(1);
    expect(search.getAttribute("aria-activedescendant")).toBe(options()[1].getAttribute("id"));
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeIdx()).toBe(2);
    // Clamps at the last row.
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(activeIdx()).toBe(2);
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(activeIdx()).toBe(1);
    // Enter selects the active row.
    fireEvent.keyDown(search, { key: "Enter" });
    expect(picked).toBe(1);
  });
});

describe("Slider RTL keyboard direction", () => {
  it("reverses the horizontal arrows in a right-to-left locale, keeping Home/End/vertical logical", () => {
    // Force RTL through the SAME accessor the kit reads (isRTL() ->
    // I18nManager.getConstants().isRTL). React Native Web has no direct
    // `I18nManager.isRTL` property, so stubbing that would be a no-op here.
    const origGetConstants = I18nManager.getConstants;
    I18nManager.getConstants = () => ({ ...origGetConstants.call(I18nManager), isRTL: true });
    try {
      let val = 50;
      const { container } = ui(<Slider value={50} min={0} max={100} onChange={(v) => { val = v; }} accessibilityLabel="Vol" />);
      const slider = container.querySelector('[role="slider"]') as HTMLElement;
      // ArrowRight moves the thumb visually rightward, which is toward MIN in RTL.
      fireEvent.keyDown(slider, { key: "ArrowRight" });
      expect(val).toBe(49);
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
      expect(val).toBe(51);
      // Vertical arrows and Home/End keep their logical direction.
      fireEvent.keyDown(slider, { key: "ArrowUp" });
      expect(val).toBe(51);
      fireEvent.keyDown(slider, { key: "Home" });
      expect(val).toBe(0);
      fireEvent.keyDown(slider, { key: "End" });
      expect(val).toBe(100);
    } finally {
      I18nManager.getConstants = origGetConstants;
    }
  });
});
