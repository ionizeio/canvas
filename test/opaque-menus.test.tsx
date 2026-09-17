import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { createDropdown } from "../src/atoms/dropdown/dropdown.shared.tsx";
import { iosSkin as iosDropdownSkin, androidSkin as androidDropdownSkin } from "../src/atoms/dropdown/dropdown.styles.ts";
import { Select } from "../src/atoms/select/select.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { AvatarMenu } from "../src/atoms/avatar/avatar.tsx";
import { Popover } from "../src/atoms/popover/popover.tsx";
import { Command } from "../src/organisms/command/command.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { Toast } from "../src/organisms/toast/toast.tsx";

// The OPTION-LIST MENUS are opaque cards, on every theming surface.
//
// A dropdown, select, autocomplete, row menu or split-button overflow menu is a
// card of rows the user reads and picks from. Painted on the glass material, the
// page it opens over reads straight through it between the rows (the divider
// rules of the pane behind an open menu were visible through it on the web docs),
// so these surfaces take the kit's PLAIN surface instead: their skin's own
// `popover` fill, border and radius, unchanged from solid mode. The prompt and
// status surfaces are opaque for the same reason: AlertDialog (the card asking
// the user to confirm a destructive action) and Toast (an opaque capsule painting
// the hand-off's `--p-toast-fill`) paint their own fill on a plain box too.
//
// The glass ones, which keep the material, are the bar/sheet/palette overlays:
// Popover, Command, Dialog, ActionSheet, Navbar, TabBar and Sidebar. Drawer is
// NOT among them, in either direction: its panel paints the `card` token on a
// plain View and has never routed through GlassSurface, so glass mode changes
// nothing about it and there is nothing here to pin.
//
// For the anchored menus the choice is made ONCE, in AnchoredOverlay (`opaque`),
// not per skin and not as a per-component glass prop, so every platform skin of a
// menu inherits it.
//
// These cases run on a Chromium user agent so the web LENS tier is live: that is
// the loudest possible material in the test DOM (a `backdrop-filter` layer plus a
// specular rim inside a clip box), which makes "took the material" and "did not"
// unmistakable. On happy-dom's own UA, with expo-blur stubbed, GlassSurface would
// fall all the way back to a plain box and prove nothing.

afterEach(cleanup);

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Restore by deleting the own property: the real getter lives on the prototype.
function overrideUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  return () => {
    delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
  };
}

// The anchored card: walk up from a node inside the floating content to the child
// of the absolute `top: 100%` anchor wrapper AnchoredOverlay positions. That child
// is the card's root box on both surfaces: the plain View when opaque, the
// GlassBox's outer (shadow) box when the card takes the material.
function anchoredCard(container: HTMLElement, contentSelector: string): HTMLElement {
  const content = container.querySelector(contentSelector) as HTMLElement | null;
  if (!content) throw new Error(`no ${contentSelector} rendered`);
  let card: HTMLElement = content;
  for (let node = content.parentElement; node; node = node.parentElement) {
    const style = node.getAttribute("style") ?? "";
    if (style.includes("position: absolute") && style.includes("top: 100%")) return card;
    card = node;
  }
  throw new Error(`no anchored card above ${contentSelector}`);
}

// The material's two visible signatures inside a card: the lens/frost layer
// (a `backdrop-filter`) and the specular rim (an inset box-shadow).
const materialLayers = (card: HTMLElement) => card.querySelectorAll("[style*='backdrop-filter']").length;
const specularLayers = (card: HTMLElement) =>
  Array.from(card.querySelectorAll("*")).filter((n) => (n.getAttribute("style") ?? "").includes("box-shadow: inset")).length;
// The same two signatures, minus those inside a control (a button, a switch) the
// surface contains: under the layered glass model every control is a glass puck of
// its own, so a surface that carries none of the material itself still holds theirs.
const outsideControls = (card: HTMLElement, nodes: Element[]) =>
  nodes.filter((n) => {
    const control = n.closest('[role="button"], [role="switch"], [role="checkbox"]');
    return control == null || !card.contains(control) || control === card;
  }).length;
const ownMaterialLayers = (card: HTMLElement) => outsideControls(card, Array.from(card.querySelectorAll("[style*='backdrop-filter']")));
const ownSpecularLayers = (card: HTMLElement) =>
  outsideControls(card, Array.from(card.querySelectorAll("*")).filter((n) => (n.getAttribute("style") ?? "").includes("box-shadow: inset")));

// The alpha of a rendered CSS color. react-native-web normalizes every fill to
// `rgba(r, g, b, a)`, so a see-through card is one whose card fill has a < 1.
function alphaOf(color: string): number {
  const rgba = /^rgba?\(([^)]+)\)$/.exec(color.trim());
  if (rgba) {
    const parts = rgba[1].split(",").map((p) => p.trim());
    return parts.length < 4 ? 1 : Number(parts[3]);
  }
  const hex8 = /^#[0-9a-f]{6}([0-9a-f]{2})$/i.exec(color.trim());
  if (hex8) return parseInt(hex8[1], 16) / 255;
  return 1;
}

const menus = [
  {
    name: "Dropdown",
    content: '[role="menu"]',
    render: () => <Dropdown trigger="Account" open items={[{ label: "Profile" }, { label: "Sign out" }]} />,
  },
  {
    name: "Select",
    content: '[role="listbox"]',
    render: () => <Select label="Region" open options={["Americas", "Europe"]} />,
  },
  {
    name: "Autocomplete",
    content: '[role="listbox"]',
    render: () => <Autocomplete label="Fruit" open options={["Apple", "Apricot"]} />,
  },
  {
    name: "RowMenu",
    content: '[role="menuitem"]',
    render: () => <RowMenu open items={[{ label: "Edit" }, { label: "Delete", destructive: true }]} />,
  },
  {
    name: "AvatarMenu",
    // Built on Dropdown, so it inherits the opaque menu card with no work of its own.
    content: '[role="menu"]',
    render: () => <AvatarMenu name="Rachel Chen" open items={[{ label: "Profile" }, { label: "Sign out" }]} />,
  },
];

describe("option-list menus are opaque cards under glass", () => {
  for (const menu of menus) {
    it(`${menu.name}: paints its own card fill and takes NO glass material`, async () => {
      const restore = overrideUserAgent(CHROME_UA);
      try {
        const { container } = render(<ThemeProvider glass>{menu.render()}</ThemeProvider>);
        await waitFor(() => expect(container.querySelector(menu.content)).not.toBeNull());
        const card = anchoredCard(container, menu.content);
        // The skin's fill is on the card itself. Under the material it would be
        // stripped from the card and repainted as an under-fill layer instead.
        expect(card.style.backgroundColor).not.toBe("");
        expect(card.style.backgroundColor).not.toBe("transparent");
        // And that fill is opaque: nothing of the page shows between the rows.
        expect(alphaOf(card.style.backgroundColor)).toBe(1);
        // No material anywhere inside the card.
        expect(materialLayers(card)).toBe(0);
        expect(specularLayers(card)).toBe(0);
      } finally {
        restore();
      }
    });
  }

  it("keeps the menu card byte-identical to solid mode (fill, border and radius all survive)", async () => {
    // GlassSurface strips a skin's fill AND its border, because the material
    // supplies both. An opaque menu keeps the skin's whole card style, so the
    // glass theming surface changes nothing at all about a menu.
    const readCard = async (glass: boolean) => {
      const { container, unmount } = render(
        <ThemeProvider glass={glass} solid={!glass}>
          <Dropdown trigger="Account" open items={[{ label: "Profile" }]} />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="menu"]')).not.toBeNull());
      const style = anchoredCard(container, '[role="menu"]').getAttribute("style") ?? "";
      unmount();
      return style;
    };
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const glass = await readCard(true);
      expect(glass).toBe(await readCard(false));
      // The web skin's hairline border is part of that: a glass card would have lost it.
      expect(glass).toContain("border-width: 1px");
    } finally {
      restore();
    }
  });

  it("applies to every platform skin, because the opt-out lives in the shared shell", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      for (const skin of [iosDropdownSkin, androidDropdownSkin]) {
        const NativeDropdown = createDropdown(skin);
        const { container, unmount } = render(
          <ThemeProvider glass>
            <NativeDropdown trigger="Account" open items={[{ label: "Profile" }]} />
          </ThemeProvider>,
        );
        await waitFor(() => expect(container.querySelector('[role="menu"]')).not.toBeNull());
        const card = anchoredCard(container, '[role="menu"]');
        expect(alphaOf(card.style.backgroundColor)).toBe(1);
        expect(materialLayers(card)).toBe(0);
        unmount();
      }
    } finally {
      restore();
    }
  });
});

// SplitButton's overflow menu has no `open` prop: it is opened by pressing the
// chevron trigger, so this case drives it the way a user does. Its anchor is the
// same AnchoredOverlay every other menu uses, with the same `opaque` flag.
describe("SplitButton's overflow menu is an opaque card under glass", () => {
  it("paints its own card fill and takes NO glass material", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const { container } = render(
        <ThemeProvider glass>
          <ButtonGroup split items={["Save"]} menu={["Save a copy", "Save as template"]} />
        </ThemeProvider>,
      );
      fireEvent.click(container.querySelector('[aria-label="More actions"]') as HTMLElement);
      await waitFor(() => expect(container.querySelector('[role="menu"]')).not.toBeNull());
      const card = anchoredCard(container, '[role="menu"]');
      expect(alphaOf(card.style.backgroundColor)).toBe(1);
      expect(materialLayers(card)).toBe(0);
      expect(specularLayers(card)).toBe(0);
    } finally {
      restore();
    }
  });
});

// The first descendant that paints a fill. For the surfaces that are NOT anchored
// cards (a dialog panel inside its scrim, a toast capsule inside its live region)
// that node is the surface itself: the wrapper above it carries semantics, not paint.
function filledBox(root: HTMLElement): HTMLElement {
  const node = Array.from(root.querySelectorAll("*")).find(
    (n) => (n as HTMLElement).style.backgroundColor !== "",
  ) as HTMLElement | undefined;
  if (!node) throw new Error("no filled box inside the surface");
  return node;
}

// The two opaque surfaces that are not anchored menus. Neither renders through
// GlassSurface: a destructive confirmation and a status capsule are read-and-act
// surfaces, so the page they interrupt must not read through their own text.
describe("AlertDialog and Toast are opaque surfaces under glass", () => {
  it("AlertDialog paints its skin's popover card, with NO material", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const { container } = render(
        <ThemeProvider glass>
          <AlertDialog open destructive title="Delete project?" description="This cannot be undone." />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="alertdialog"]')).not.toBeNull());
      const dialog = container.querySelector('[role="alertdialog"]') as HTMLElement;
      // The dimming scrim is the role node's own fill and is unaffected here; the
      // panel is the first filled box INSIDE it.
      const panel = filledBox(dialog);
      expect(alphaOf(panel.style.backgroundColor)).toBe(1);
      // The panel's OWN material: the action buttons inside it are control-layer
      // glass pucks in their own right (the layered model), so the material they
      // carry is theirs, not the panel's.
      expect(ownMaterialLayers(panel)).toBe(0);
      expect(ownSpecularLayers(panel)).toBe(0);
    } finally {
      restore();
    }
  });

  it("Toast paints its skin's capsule fill, with NO material", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const { container } = render(
        <ThemeProvider glass>
          <Toast success message="Project saved" description="All changes are live." />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="status"]')).not.toBeNull());
      const capsule = filledBox(container.querySelector('[role="status"]') as HTMLElement);
      expect(alphaOf(capsule.style.backgroundColor)).toBe(1);
      expect(materialLayers(capsule)).toBe(0);
      expect(specularLayers(capsule)).toBe(0);
    } finally {
      restore();
    }
  });

  it("keeps both byte-identical to solid mode", async () => {
    const readStyles = async (glass: boolean) => {
      const { container, unmount } = render(
        <ThemeProvider glass={glass} solid={!glass}>
          <AlertDialog open destructive title="Delete project?" />
          <Toast success message="Project saved" />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="alertdialog"]')).not.toBeNull());
      const panel = filledBox(container.querySelector('[role="alertdialog"]') as HTMLElement);
      const capsule = filledBox(container.querySelector('[role="status"]') as HTMLElement);
      const styles = [panel.getAttribute("style") ?? "", capsule.getAttribute("style") ?? ""];
      unmount();
      return styles;
    };
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const glass = await readStyles(true);
      expect(glass).toEqual(await readStyles(false));
      // GlassSurface strips a skin's border along with its fill, so the web
      // AlertDialog's hairline surviving is itself proof no material ran.
      expect(glass[0]).toContain("border-width: 1px");
    } finally {
      restore();
    }
  });
});

describe("the glass overlays still take the material", () => {
  it("Popover keeps the lens material under glass", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const { container } = render(
        <ThemeProvider glass>
          <Popover trigger="Details" open title="Dimensions">
            <Text>Set the frame size.</Text>
          </Popover>
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="dialog"]')).not.toBeNull());
      const card = anchoredCard(container, '[role="dialog"]');
      // The card sheds its own fill to the material's under-fill layer, and the
      // lens + specular rim ride above it.
      expect(card.style.backgroundColor).toBe("");
      expect(materialLayers(card)).toBe(1);
      expect(specularLayers(card)).toBe(1);
    } finally {
      restore();
    }
  });

  it("Command keeps the lens material under glass", async () => {
    const restore = overrideUserAgent(CHROME_UA);
    try {
      const { container } = render(
        <ThemeProvider glass>
          <Command trigger open groups={[{ heading: "Actions", items: [{ label: "New file" }] }]} />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="listbox"]')).not.toBeNull());
      const card = anchoredCard(container, '[role="listbox"]');
      expect(card.style.backgroundColor).toBe("");
      expect(materialLayers(card)).toBe(1);
      expect(specularLayers(card)).toBe(1);
    } finally {
      restore();
    }
  });
});
