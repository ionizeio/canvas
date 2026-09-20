import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccessibilityInfo } from "react-native";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { AvatarMenu } from "../src/atoms/avatar/avatar.tsx";
import { Navbar } from "../src/organisms/navbars/navbars.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { animationClock } from "./liquid-motion-clock.ts";
import { hostedEntranceParts, layoutElement, layoutHostedEntrance } from "./entrance-layout.ts";

// Without a motion clock nothing conceals the card, so the hosted anatomy cannot
// be located by its concealed entrance; deliver the fixture size to every native
// layout boundary above the content instead (extra same-size events are inert).
function layoutChain(content: Element, size: { width: number; height: number }) {
  for (let node: Element | null = content; node && node.tagName !== "BODY"; node = node.parentElement) {
    if (typeof (node as Element & { __reactLayoutHandler?: unknown }).__reactLayoutHandler === "function") layoutElement(node, size);
  }
}

// Dropdown and Select are the first public popups on the kit's liquid policy:
// under glass their menu material grows from the anchor, the rows stay concealed
// and inert until the material covers them, and a closing menu stays visible
// briefly while its rows are already out of interaction and accessibility.
// Logical state (selection, open) never waits for the decoration. AvatarMenu
// and the collapsed Navbar menu are built on Dropdown and inherit all of it.

afterEach(cleanup);

const SIZE = { width: 240, height: 120 };
const bounds = () => spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
  x: 0, y: 0, width: 640, height: 800, top: 0, left: 0, right: 640, bottom: 800, toJSON: () => ({}),
} as DOMRect);
const glass = (body: ReactNode) => <ThemeProvider glass><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;
const solid = (body: ReactNode) => <ThemeProvider solid><OverlayProvider>{body}</OverlayProvider></ThemeProvider>;
// Opening conceals the rows on the foreground host inside the card; closing
// retires the whole hosted entrance (semantics and pointer events together).
const heldBack = (content: Element) => content.closest('[aria-hidden="true"]') !== null;
const retired = (node: Element) => node.getAttribute("aria-hidden") === "true" && getComputedStyle(node).pointerEvents === "none";

describe("Dropdown on the liquid popup policy", () => {
  it("conceals the rows until the material settles, then retires them at once on close while the material exits", async () => {
    const measure = bounds();
    const picked: string[] = [];
    const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }, { label: "Sign out" }]} onSelect={(item) => picked.push(item.label)} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      const nodes = hostedEntranceParts(menu);
      layoutHostedEntrance(menu, SIZE);
      // Opening: the foreground waits for the material.
      expect(heldBack(menu)).toBe(true);
      clock.advance(1600);
      expect(heldBack(menu)).toBe(false);
      const row = within(menu).getByRole("menuitem", { name: "Sign out" });
      fireEvent.click(row);
      // The selection is committed and the menu is logically closed at once...
      expect(picked).toEqual(["Sign out"]);
      expect(screen.queryByRole("menuitem", { name: "Sign out" })).toBeNull();
      expect(screen.getByRole("button", { name: "Account" }).getAttribute("aria-expanded")).toBe("false");
      // ...while the retained material is still leaving, with its rows inert.
      expect(row.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(row.isConnected).toBe(false);
      expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
      expect(picked).toEqual(["Sign out"]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("reopens during its exit from the retained material without a second row set", async () => {
    const measure = bounds();
    const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const trigger = screen.getByRole("button", { name: "Account" });
      fireEvent.click(trigger);
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      clock.advance(1600);
      fireEvent.click(trigger); // close
      clock.advance(80);
      fireEvent.click(trigger); // reopen mid-exit
      clock.advance(1600);
      expect(screen.getAllByRole("menu", { hidden: true })).toHaveLength(1);
      expect(screen.getByRole("menuitem", { name: "Profile" }).closest('[role="menu"]')).toBe(menu);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("snaps to rest under Reduce Motion and keeps the ordinary entrance in solid mode", async () => {
    const measure = bounds();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutChain(menu, SIZE);
      await act(async () => {});
      expect(heldBack(menu)).toBe(false);
      view.unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
    const measureAgain = bounds();
    try {
      const view = render(solid(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutChain(menu, SIZE);
      await act(async () => {});
      // Solid: no liquid gating, the rows are reachable as soon as the card is placed.
      expect(heldBack(menu)).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Account" }));
      await act(async () => {});
      expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
      view.unmount();
    } finally { measureAgain.mockRestore(); }
  });
});

// The button-to-menu hand-off (popup-handoff.tsx): under glass a Dropdown-class
// trigger's pill and label yield to the menu's material, which is the pill at
// progress 0, and are back once the pane has re-formed the pill. The trigger's
// material is hidden in place, never at a partial opacity, and never unmounted.
// The card's sizes go through `layoutChain` (every layout boundary above the rows),
// so the checks do not depend on catching the entrance before RNW's own mount
// measurement lands, which a loaded machine reorders.
const inlineOpacity = (node: Element | null): string => (node as HTMLElement | null)?.style.opacity ?? "";
// The fader: the nearest ancestor of a trigger carrying an inline opacity.
const faderOf = (trigger: Element): HTMLElement => {
  for (let node = trigger.parentElement; node; node = node.parentElement) {
    if (node.style.opacity !== "") return node;
  }
  throw new Error("the trigger has no hand-off fader above it");
};
// A GlassPane under a hand-off sits in a wrapper whose opacity is the material curve.
const paneOf = (trigger: Element): HTMLElement => trigger.firstElementChild as HTMLElement;
const layoutRoot = (root: HTMLElement, size: { width: number; height: number }) => {
  const node = Array.from(root.querySelectorAll("*")).find((n) => typeof (n as Element & { __reactLayoutHandler?: unknown }).__reactLayoutHandler === "function");
  if (!node) throw new Error("no layout host in the fixture");
  layoutElement(node, size);
};
const openMenu = async (trigger: Element, clock: ReturnType<typeof animationClock>, role = "menu") => {
  fireEvent.click(trigger);
  clock.advance(32);
  const content = await screen.findByRole(role, { hidden: true }, { timeout: 8000 });
  layoutChain(content, SIZE);
  clock.advance(32);
  return content;
};
// These cases step the springs frame by frame through act(); on a loaded machine
// that is slower than bun's default per-test budget.
const HANDOFF_TIMEOUT = 60000;

describe("the button-to-menu hand-off", () => {
  it("Dropdown: the pill and its label vanish as the pane opens and are back, material first, once it has re-formed the pill", async () => {
    const measure = bounds();
    const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const button = screen.getByRole("button", { name: "Account" });
      const pane = paneOf(button);
      const fader = faderOf(button);
      expect(inlineOpacity(pane)).toBe("1");
      expect(inlineOpacity(fader)).toBe("1");
      const menu = await openMenu(button, clock);
      // The pane's material has the trigger's frame: the pill is hidden in place
      // (still in the tree) and the label is gone (the test engine finishes its
      // short fade in the seed's own tick).
      expect(pane.isConnected).toBe(true);
      expect(inlineOpacity(pane)).toBe("0");
      expect(inlineOpacity(fader)).toBe("0");
      clock.advance(1600);
      expect(heldBack(menu)).toBe(false);
      expect(inlineOpacity(pane)).toBe("0");
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Profile" }));
      // The close: the pane narrows back to the pill with both hidden; the material
      // is back only at the end, never in between, and the label never shows while
      // the material is hidden (it would sit under the standing-in pane's glass).
      let hidden = 0;
      for (let step = 0; step < 120 && inlineOpacity(pane) !== "1"; step++) {
        clock.advance(16);
        const material = parseFloat(inlineOpacity(pane));
        expect(material === 0 || material === 1).toBe(true);
        if (material === 0) { hidden++; expect(parseFloat(inlineOpacity(fader))).toBe(0); }
      }
      expect(hidden).toBeGreaterThan(3);
      expect(inlineOpacity(pane)).toBe("1");
      // The test engine finishes the label's timed return in the snap's own tick.
      expect(inlineOpacity(fader)).toBe("1");
      expect(pane.isConnected).toBe(true);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  }, HANDOFF_TIMEOUT);

  it("AvatarMenu and the collapsed Navbar menu inherit it", async () => {
    const measure = bounds();
    const clock = animationClock();
    try {
      const account = render(glass(<AvatarMenu name="Rachel Chen" email="rachel@example.com" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      const capsule = screen.getByRole("button", { name: "Rachel Chen, rachel@example.com" });
      // The fader wraps the whole custom trigger; the capsule's pane and the
      // avatar's own disc are the wrappers at opacity 1 inside it, and both hide.
      const fader = capsule.firstElementChild as HTMLElement;
      expect(inlineOpacity(fader)).toBe("1");
      const panes = Array.from(fader.querySelectorAll("*")).filter((n) => (n as HTMLElement).style.opacity === "1" && (n as HTMLElement).style.zIndex === "-1");
      expect(panes.length).toBe(2);
      await openMenu(capsule, clock);
      expect(inlineOpacity(fader)).toBe("0");
      for (const pane of panes) expect(inlineOpacity(pane)).toBe("0");
      account.unmount();

      const bar = render(glass(<Navbar brand="Canvas" links={["Home", "Docs"]} />));
      await act(async () => {});
      // Collapse the bar: its container breakpoint reads its own width.
      layoutRoot(bar.container, { width: 320, height: 56 });
      await act(async () => {});
      const hamburger = await screen.findByRole("button", { name: "Navigation menu" });
      const iconFader = hamburger.firstElementChild as HTMLElement;
      expect(inlineOpacity(iconFader)).toBe("1");
      await openMenu(hamburger, clock);
      expect(inlineOpacity(iconFader)).toBe("0");
      bar.unmount();
    } finally { clock.restore(); measure.mockRestore(); }
  }, HANDOFF_TIMEOUT);

  it("does not run under Reduce Motion or in solid mode: the trigger's tree is the plain one", async () => {
    const measure = bounds();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const view = render(glass(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      const button = screen.getByRole("button", { name: "Account" });
      expect(() => faderOf(button)).toThrow();
      // The pane is the plain GlassSurface host, not a hand-off wrapper.
      expect(inlineOpacity(paneOf(button))).toBe("");
      fireEvent.click(button);
      const menu = await screen.findByRole("menu", { hidden: true }, { timeout: 8000 });
      layoutChain(menu, SIZE);
      await act(async () => {});
      expect(inlineOpacity(paneOf(button))).toBe("");
      view.unmount();
    } finally { reduced.mockRestore(); measure.mockRestore(); }
    const measureAgain = bounds();
    try {
      const view = render(solid(<Dropdown trigger="Account" items={[{ label: "Profile" }]} />));
      await act(async () => {});
      const button = screen.getByRole("button", { name: "Account" });
      expect(() => faderOf(button)).toThrow();
      view.unmount();
    } finally { measureAgain.mockRestore(); }
  }, HANDOFF_TIMEOUT);
});

// The field hand-off (popup-handoff.tsx `field`): the field vanishes into the droplet
// on open the way a menu button does (its GlassPane hidden in place, never at a partial
// opacity, its text on a short fade) and is back as soon as the pane has left its box;
// on close the pane absorbs back onto the box, hiding both again only while it covers
// them, and hands back at the snap. The field's text nodes carry the fade as their own
// inline opacity or on a layout-neutral slot, so the field's row keeps its layout.
async function fieldHandsOff(box: HTMLElement, trigger: HTMLElement, role: string, clock: ReturnType<typeof animationClock>, text: HTMLElement[]) {
  const pane = box.firstElementChild as HTMLElement;
  expect(inlineOpacity(pane)).toBe("1");
  for (const node of text) expect(inlineOpacity(node)).toBe("1");
  // The pane reports the field's box (its layout event), so the cover ends where the
  // pane leaves the box rather than at the top of the travel.
  layoutElement(pane.firstElementChild as Element, { width: SIZE.width, height: 48 });
  const content = await openMenu(trigger, clock, role);
  // The droplet forms on the box: the field's material is gone at once and its text
  // on its short fade (the test engine finishes it in the seed's own tick).
  expect(inlineOpacity(pane)).toBe("0");
  for (const node of text) expect(parseFloat(inlineOpacity(node))).toBe(0);
  clock.advance(1600);
  expect(heldBack(content)).toBe(false);
  // The pane has left the box: the field stands under the resting list, whole.
  expect(inlineOpacity(pane)).toBe("1");
  for (const node of text) expect(inlineOpacity(node)).toBe("1");
  // The close from rest: the absorb covers the box, the material yields (never in
  // between) with the text gone under it, and both are back at the snap.
  fireEvent.click(trigger);
  let hidden = 0;
  let textOut = false;
  for (let step = 0; step < 120 && (hidden === 0 || inlineOpacity(pane) !== "1"); step++) {
    clock.advance(16);
    const material = parseFloat(inlineOpacity(pane));
    expect(material === 0 || material === 1).toBe(true);
    if (material === 0) {
      hidden++;
      if (text.every((node) => parseFloat(inlineOpacity(node)) < 1)) textOut = true;
    }
  }
  expect(hidden).toBeGreaterThan(0);
  expect(textOut).toBe(true);
  expect(inlineOpacity(pane)).toBe("1");
  // The test engine finishes the text's timed return in the snap's own tick.
  for (const node of text) expect(inlineOpacity(node)).toBe("1");
  expect(pane.isConnected).toBe(true);
}

describe("the field hand-off", () => {
  it("Select: the list pours from the field's edge and absorbs back into it, the value and chevron fading only under the pane", async () => {
    const measure = bounds();
    const view = render(glass(<Select label="Region" options={["Americas", "Europe"]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const field = screen.getByRole("button", { name: "Region" });
      // No fader wraps the field: its material is the pane at index 0, the value
      // cluster and the chevron carry the fade themselves.
      expect(() => faderOf(field)).toThrow();
      const cluster = field.children[1] as HTMLElement;
      const chevron = field.children[2] as HTMLElement;
      await fieldHandsOff(field, field, "listbox", clock, [cluster, chevron]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  }, HANDOFF_TIMEOUT);

  it("Autocomplete: the same around the live editor, which keeps focus and its value", async () => {
    const measure = bounds();
    const view = render(glass(<Autocomplete label="Fruit" options={["Apple", "Apricot"]} defaultQuery="Ap" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const editor = screen.getByRole("combobox") as HTMLInputElement;
      // The editor's fade rides a layout-neutral slot around it (the editor itself is
      // never an animated host: its ref must stay attached for the accessibility
      // return), so the slot is the faded node and the box is the slot's parent.
      const slot = editor.parentElement as HTMLElement;
      const box = slot.parentElement as HTMLElement;
      const toggle = screen.getByRole("button", { name: "Toggle options" });
      const chevron = toggle.firstElementChild as HTMLElement;
      expect(inlineOpacity(editor)).toBe("");
      await fieldHandsOff(box, toggle, "listbox", clock, [slot, chevron]);
      expect(screen.getByRole("combobox")).toBe(editor);
      expect(editor.value).toBe("Ap");
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  }, HANDOFF_TIMEOUT);

  it("PhoneInput: the country list hands off with the whole box", async () => {
    const measure = bounds();
    const view = render(glass(<PhoneInput label="Phone" />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const segment = screen.getByRole("button", { name: /^Country/ });
      const box = segment.parentElement as HTMLElement;
      const number = (screen.getByRole("textbox") as HTMLElement).parentElement as HTMLElement;
      await fieldHandsOff(box, segment, "listbox", clock, [segment.children[0] as HTMLElement, segment.children[1] as HTMLElement, number]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  }, HANDOFF_TIMEOUT);

  it("leaves a solid or reduced-motion field's tree plain: no inline opacity on the editor, the value or the box", async () => {
    const measure = bounds();
    try {
      const view = render(solid(<><Autocomplete label="Fruit" options={["Apple"]} /><Select label="Region" options={["Americas"]} /></>));
      await act(async () => {});
      expect(inlineOpacity(screen.getByRole("combobox"))).toBe("");
      const field = screen.getByRole("button", { name: "Region" });
      expect(inlineOpacity(field.firstElementChild)).toBe("");
      view.unmount();
    } finally { measure.mockRestore(); }
    const measureAgain = bounds();
    const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    try {
      const view = render(glass(<Autocomplete label="Fruit" options={["Apple"]} />));
      await act(async () => {});
      expect(inlineOpacity(screen.getByRole("combobox"))).toBe("");
      // No slot around the editor, and the pane is the plain GlassSurface host, not
      // a hand-off wrapper.
      expect(inlineOpacity(screen.getByRole("combobox").parentElement)).toBe("");
      expect(inlineOpacity((screen.getByRole("combobox").parentElement as HTMLElement).firstElementChild)).toBe("");
      view.unmount();
    } finally { reduced.mockRestore(); measureAgain.mockRestore(); }
  }, HANDOFF_TIMEOUT);
});

describe("Select on the liquid popup policy", () => {
  it("commits the chosen value before the option material has left", async () => {
    const measure = bounds();
    const changes: string[] = [];
    const view = render(glass(<Select label="Region" options={["Americas", "Europe"]} onSelect={(value) => changes.push(value)} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Region" }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      const nodes = hostedEntranceParts(list);
      layoutHostedEntrance(list, SIZE);
      expect(heldBack(list)).toBe(true);
      clock.advance(1600);
      expect(heldBack(list)).toBe(false);
      const option = within(list).getByRole("option", { name: "Europe" });
      fireEvent.click(option);
      expect(changes).toEqual(["Europe"]);
      expect(screen.getByRole("button", { name: "Region" }).getAttribute("aria-expanded")).toBe("false");
      expect(option.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(option.isConnected).toBe(false);
      expect(changes).toEqual(["Europe"]);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});

describe("AvatarMenu inherits the Dropdown policy", () => {
  it("opens through the concealed-then-readable lifecycle with one accessible trigger", async () => {
    const measure = bounds();
    const view = render(glass(<AvatarMenu name="Rachel Chen" items={[{ label: "Profile" }, { label: "Sign out" }]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const triggers = screen.getAllByRole("button");
      expect(triggers).toHaveLength(1);
      fireEvent.click(triggers[0]!);
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      expect(heldBack(menu)).toBe(true);
      clock.advance(1600);
      expect(heldBack(menu)).toBe(false);
      expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeDefined();
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});

// Phase 3 owners share the mechanism, but each is verified through its own
// trigger and content role: the material conceals the content until it settles,
// and a close retires the content at once while the material leaves.
import { Popover } from "../src/atoms/popover/popover.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { PhoneInput } from "../src/molecules/phone-input/phone-input.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";

const owners: Array<{ name: string; render: () => ReactNode; open: () => void; role: string; close: () => void }> = [
  {
    name: "Popover (triggered)",
    render: () => <Popover trigger="Details" title="Information" actionLabel="Done" />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "Details" })),
    role: "dialog",
    close: () => fireEvent.click(screen.getByRole("button", { name: "Details" })),
  },
  {
    name: "RowMenu",
    render: () => <RowMenu items={[{ label: "Edit" }, { label: "Delete", destructive: true }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
    role: "menu",
    close: () => fireEvent.click(screen.getByRole("button", { name: "More options" })),
  },
  {
    name: "Command (triggered)",
    render: () => <Command trigger groups={[{ heading: "Actions", items: [{ label: "New file" }, { label: "Open" }] }]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: /Search/ })),
    role: "listbox",
    close: () => fireEvent.click(screen.getByRole("button", { name: /Search/ })),
  },
  {
    name: "split ButtonGroup",
    render: () => <ButtonGroup split items={["Save"]} menu={["Save copy"]} />,
    open: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
    role: "menu",
    close: () => fireEvent.click(screen.getByRole("button", { name: "More actions" })),
  },
  {
    name: "PhoneInput country list",
    render: () => <PhoneInput label="Phone" />,
    open: () => fireEvent.click(screen.getByRole("button", { name: /^Country/ })),
    role: "listbox",
    close: () => fireEvent.click(screen.getByRole("button", { name: /^Country/ })),
  },
];

describe("phase 3 owners on the liquid popup policy", () => {
  for (const owner of owners) {
    it(`${owner.name}: conceals until settled, retires at once on close, unmounts after the exit`, async () => {
      const measure = bounds();
      const view = render(glass(owner.render()));
      await act(async () => {});
      const clock = animationClock();
      try {
        owner.open();
        clock.advance(32);
        const content = await screen.findByRole(owner.role, { hidden: true });
        const nodes = hostedEntranceParts(content);
        layoutHostedEntrance(content, SIZE);
        expect(heldBack(content)).toBe(true);
        clock.advance(1600);
        expect(heldBack(content)).toBe(false);
        owner.close();
        expect(screen.queryByRole(owner.role)).toBeNull();
        expect(content.isConnected).toBe(true);
        expect(retired(nodes.entrance)).toBe(true);
        clock.advance(1600);
        expect(content.isConnected).toBe(false);
      } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
    });
  }

  it("Autocomplete: the suggestion list follows the same lifecycle around the live editor", async () => {
    const measure = bounds();
    const view = render(glass(<Autocomplete label="Fruit" options={["Apple", "Apricot"]} />));
    await act(async () => {});
    const clock = animationClock();
    try {
      const field = screen.getByRole("combobox") as HTMLInputElement;
      fireEvent.click(screen.getByRole("button", { name: "Toggle options" }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      const nodes = hostedEntranceParts(list);
      layoutHostedEntrance(list, SIZE);
      expect(heldBack(list)).toBe(true);
      clock.advance(1600);
      expect(heldBack(list)).toBe(false);
      fireEvent.click(within(list).getByRole("option", { name: "Apricot" }));
      expect(field.value).toBe("Apricot");
      expect(field.isConnected).toBe(true);
      expect(retired(nodes.entrance)).toBe(true);
      clock.advance(1600);
      expect(list.isConnected).toBe(false);
      expect(screen.getByRole("combobox")).toBe(field);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("Popover: the inline card stays a static in-flow panel", async () => {
    const view = render(glass(<Popover inline title="Information" actionLabel="Done">Always here</Popover>));
    await act(async () => {});
    expect(screen.getByText("Always here").closest('[aria-hidden="true"]')).toBeNull();
    view.unmount();
  });
});

describe("owners closing their menu when editing is disallowed", () => {
  it("split ButtonGroup: disabling the group while its menu is open closes it and nothing selects afterwards", async () => {
    const measure = bounds();
    const picked: string[] = [];
    const page = (disabled: boolean) => glass(<ButtonGroup split items={["Save"]} menu={["Save copy"]} disabled={disabled} onSelect={(_, item) => picked.push(item)} />);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      clock.advance(32);
      const menu = await screen.findByRole("menu", { hidden: true });
      layoutHostedEntrance(menu, SIZE);
      clock.advance(1600);
      const row = within(menu).getByRole("menuitem", { name: "Save copy" });
      view.rerender(page(true));
      expect(screen.queryByRole("menuitem", { name: "Save copy" })).toBeNull();
      fireEvent.click(row);
      clock.advance(1600);
      expect(picked).toEqual([]);
      expect(row.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });

  it("PhoneInput: turning read-only while the country list is open closes it", async () => {
    const measure = bounds();
    const page = (readOnly: boolean) => glass(<PhoneInput label="Phone" readOnly={readOnly} />);
    const view = render(page(false));
    await act(async () => {});
    const clock = animationClock();
    try {
      fireEvent.click(screen.getByRole("button", { name: /^Country/ }));
      clock.advance(32);
      const list = await screen.findByRole("listbox", { hidden: true });
      layoutHostedEntrance(list, SIZE);
      clock.advance(1600);
      expect(screen.getByRole("listbox")).toBe(list);
      view.rerender(page(true));
      expect(screen.queryByRole("listbox")).toBeNull();
      clock.advance(1600);
      expect(list.isConnected).toBe(false);
    } finally { view.unmount(); clock.restore(); measure.mockRestore(); }
  });
});
