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
import { createToastSystem } from "../src/organisms/toast/toast.shared.tsx";
import { androidSkin as androidToastSkin } from "../src/organisms/toast/toast.styles.ts";
import { Tooltip } from "../src/atoms/tooltip/tooltip.tsx";
import { AnchoredOverlay } from "../src/style/anchored-overlay.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { inverseDenseTint } from "../src/style/glass-fill.ts";
import { channelsOf } from "../src/style/color.ts";

// The DENSE layer of the glass model: the surfaces a user reads and acts on.
//
// A dropdown, select, autocomplete, row menu, split-button overflow menu or country
// list is a card of rows the user picks from; an alert dialog is the prompt asking
// them to confirm a destructive action; a toast is the status that lands over what
// they were reading; a tooltip and a chart's value flag are text they inspect. Under
// the functional layer's sheer tint the page read straight through those rows and
// that text (the divider rules of the pane behind an open menu were visible through
// it on the web docs), so they used to opt OUT of the material and paint an opaque
// box. They take the material now, under the model's densest tint: legible first,
// and still glass at the rim. AnchoredOverlay's `dense` selects that layer for the
// anchored cards; `opaque` remains for a consumer that wants the plain box outright.
//
// Two of them are INVERSE surfaces: the tooltip bubble on every skin paints the
// scheme's ink as its fill and the page colour as its text, and the M3 snackbar paints
// the toast pill (`inverse`) with its own light ink. Their dense tint is that fill at
// the dense alpha (`inverseDenseTint`), so the text keeps its contrast.
//
// The functional-layer overlays (Popover, Command, Dialog, ActionSheet, Drawer, the
// bars) keep the sheer tint. These cases render the web frost, which the test DOM
// supports (its CSS.supports reports backdrop-filter): GlassBox's material clip box
// holding the layer's under-fill, the frost (a `backdrop-filter` layer) and the
// hairline rim (an inset box-shadow).

afterEach(cleanup);

// The anchored card and its surface: walk up from a node inside the floating content
// to the absolute `top: 100%` anchor wrapper AnchoredOverlay positions. The wrapper's
// child on that path is the card's root box (the plain View when opaque, the
// GlassSurface host under glass); the wrapper itself is the SURFACE, whose subtree
// holds the material.
function anchored(container: HTMLElement, contentSelector: string): { card: HTMLElement; surface: HTMLElement } {
  const content = container.querySelector(contentSelector) as HTMLElement | null;
  if (!content) throw new Error(`no ${contentSelector} rendered`);
  let card: HTMLElement = content;
  for (let node = content.parentElement; node; node = node.parentElement) {
    const style = node.getAttribute("style") ?? "";
    if (style.includes("position: absolute") && style.includes("top: 100%")) return { card, surface: node };
    card = node;
  }
  throw new Error(`no anchored card above ${contentSelector}`);
}
const anchoredCard = (container: HTMLElement, contentSelector: string): HTMLElement => anchored(container, contentSelector).card;

// The material's two visible signatures inside a surface: the material clip box GlassBox
// paints behind the content (which a clear surface draws too, though it has no frost)
// and the rim (an inset box-shadow), counted OUTSIDE the controls the surface contains
// (a button, a switch, a checkbox), which are glass pucks of their own under the
// layered model.
const outsideControls = (card: HTMLElement, nodes: Element[]) =>
  nodes.filter((n) => {
    const control = n.closest('[role="button"], [role="switch"], [role="checkbox"]');
    return control == null || !card.contains(control) || control === card;
  });
const materialsOf = (card: HTMLElement) => outsideControls(card, Array.from(card.querySelectorAll('[data-testid="glass-material"]')));
const materialLayers = (card: HTMLElement) => materialsOf(card).length;
const rimLayers = (card: HTMLElement) =>
  outsideControls(card, Array.from(card.querySelectorAll("*")).filter((n) => (n.getAttribute("style") ?? "").includes("box-shadow: inset"))).length;
// The surface's under-fill: the first layer inside its material wrapper (layer order is
// under-fill, frost, rim, and the content follows the wrapper).
const underFillOf = (card: HTMLElement): string => (materialsOf(card)[0]?.firstElementChild as HTMLElement | null)?.style.backgroundColor ?? "";
// react-native-web stores an alpha as an 8-bit channel and prints it with two decimals,
// so colours compare as numbers quantized the way it does.
const rgbaOf = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (!m) return value;
  const a = m[4] == null ? 1 : Number(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number((Math.round(a * 255) / 255).toFixed(2))];
};

// The web renders the web frost's own tints (web-frost.ts).
const DENSE = rgbaOf(WEB_TINTS.light["glass-tint-dense"]);
const FUNCTIONAL = rgbaOf(WEB_TINTS.light["glass-tint"]);

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
    // Built on Dropdown, so it inherits the dense menu card with no work of its own.
    content: '[role="menu"]',
    render: () => <AvatarMenu name="Rachel Chen" open items={[{ label: "Profile" }, { label: "Sign out" }]} />,
  },
];

describe("option-list menus are dense glass under glass", () => {
  for (const menu of menus) {
    it(`${menu.name}: takes the material under the dense tint, its own card fill handed to the under-fill`, async () => {
      const { container } = render(<ThemeProvider glass>{menu.render()}</ThemeProvider>);
      await waitFor(() => expect(container.querySelector(menu.content)).not.toBeNull());
      const { card, surface } = anchored(container, menu.content);
      // The skin's fill is stripped from the card (the material repaints it as the
      // under-fill), and the material's frost and rim ride on the surface beside it.
      expect(rgbaOf(card.style.backgroundColor)).toEqual([0, 0, 0, 0]);
      expect(materialLayers(surface)).toBe(1);
      expect(rimLayers(surface)).toBe(1);
      // The under-fill is the DENSE tint, not the functional layer's sheer one.
      expect(rgbaOf(underFillOf(surface))).toEqual(DENSE);
    });
  }

  it("keeps the menu card byte-identical to solid mode when the surface is solid", async () => {
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
    // Solid mode is the plain box wearing the skin's whole card style, hairline included.
    const solid = await readCard(false);
    expect(solid).toContain("border-width: 1px");
    expect(await readCard(false)).toBe(solid);
    // Glass keeps border geometry so live layout does not shift on mode changes.
    const glass = await readCard(true);
    expect(glass).toContain("border-width: 1px");
    expect(glass).toMatch(/border-color: rgba\(0, 0, 0, 0(?:\.0+)?\)/);
  });

  it("applies to every platform skin, because the layer lives in the shared shell", async () => {
    for (const skin of [iosDropdownSkin, androidDropdownSkin]) {
      const NativeDropdown = createDropdown(skin);
      const { container, unmount } = render(
        <ThemeProvider glass>
          <NativeDropdown trigger="Account" open items={[{ label: "Profile" }]} />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="menu"]')).not.toBeNull());
      const { surface } = anchored(container, '[role="menu"]');
      expect(materialLayers(surface)).toBe(1);
      expect(rgbaOf(underFillOf(surface))).toEqual(DENSE);
      unmount();
    }
  });

  it("`opaque` still paints the plain box for a consumer that asks for it, and wins over `dense`", async () => {
    // The inline (no provider) path: the card sits in the Entrance's absolute anchor.
    const { container } = render(
      <ThemeProvider glass>
        <AnchoredOverlay open onDismiss={() => {}} triggerRef={{ current: null }} gap={4} opaque dense inlineStyle={{ position: "absolute", top: "100%" }} cardStyle={{ backgroundColor: lightColors.popover, borderRadius: 8 }}>
          <Text role="note">plain</Text>
        </AnchoredOverlay>
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="note"]')).not.toBeNull());
    const { card, surface } = anchored(container, '[role="note"]');
    // The plain box keeps the skin's own opaque fill and takes no material.
    expect(rgbaOf(card.style.backgroundColor)).toEqual(rgbaOf(`rgba(255, 255, 255, 1)`));
    expect(materialLayers(surface)).toBe(0);
  });
});

// SplitButton's overflow menu has no `open` prop: it is opened by pressing the
// chevron trigger, so this case drives it the way a user does. Its anchor is the
// same AnchoredOverlay every other menu uses, with the same `dense` layer.
describe("SplitButton's overflow menu is dense glass under glass", () => {
  it("takes the material under the dense tint", async () => {
    const { container } = render(
      <ThemeProvider glass>
        <ButtonGroup split items={["Save"]} menu={["Save a copy", "Save as template"]} />
      </ThemeProvider>,
    );
    fireEvent.click(container.querySelector('[aria-label="More actions"]') as HTMLElement);
    await waitFor(() => expect(container.querySelector('[role="menu"]')).not.toBeNull());
    const { surface } = anchored(container, '[role="menu"]');
    expect(materialLayers(surface)).toBe(1);
    expect(rgbaOf(underFillOf(surface))).toEqual(DENSE);
  });
});

// The dense surfaces that are not anchored cards: the dialog panel inside its scrim,
// the toast capsule inside its live region, the tooltip bubble beside its trigger.
describe("AlertDialog, Toast and Tooltip are dense glass under glass", () => {
  it("AlertDialog renders its card through the material under the dense tint; the scrim is unaffected", async () => {
    const { container } = render(
      <ThemeProvider glass>
        <AlertDialog open destructive title="Delete project?" description="This cannot be undone." />
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="alertdialog"]')).not.toBeNull());
    const dialog = container.querySelector('[role="alertdialog"]') as HTMLElement;
    // The role node's own fill is the dimming scrim; the panel's material sits inside it.
    expect(dialog.style.backgroundColor).not.toBe("");
    expect(materialLayers(dialog)).toBe(1);
    expect(rgbaOf(underFillOf(dialog))).toEqual(DENSE);
  });

  it("Toast renders its capsule through the material under the dense tint", async () => {
    const { container } = render(
      <ThemeProvider glass>
        <Toast success message="Project saved" description="All changes are live." />
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="status"]')).not.toBeNull());
    const region = container.querySelector('[role="status"]') as HTMLElement;
    expect(materialLayers(region)).toBe(1);
    expect(rgbaOf(underFillOf(region))).toEqual(DENSE);
  });

  it("the M3 snackbar and the Tooltip bubble are INVERSE surfaces: their own fill at the dense alpha, so their inverse text stays legible", async () => {
    const { Toast: AndroidToast } = createToastSystem(androidToastSkin);
    const { container } = render(
      <ThemeProvider glass>
        <AndroidToast message="Project saved" />
        <Tooltip label="Copy link" open textTrigger="Share" />
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="status"]')).not.toBeNull());
    const theme = { tokens: lightColors, glass: WEB_TINTS.light };
    // The snackbar paints the toast pill (`inverse`), at the dense token's own alpha.
    const pill = rgbaOf(inverseDenseTint(theme, lightColors.inverse!));
    const pillFill = channelsOf(lightColors.inverse!)!;
    expect(pill).toEqual([pillFill[0], pillFill[1], pillFill[2], DENSE[3]]);
    expect(rgbaOf(underFillOf(container.querySelector('[role="status"]') as HTMLElement))).toEqual(pill);
    // The Tooltip bubble paints the scheme's ink, the helper's default fill.
    const ink = rgbaOf(inverseDenseTint(theme));
    const inkFill = channelsOf(lightColors.foreground)!;
    expect(ink).toEqual([inkFill[0], inkFill[1], inkFill[2], DENSE[3]]);
    await waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    const bubble = container.querySelector('[role="alert"]') as HTMLElement;
    expect(bubble.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(rgbaOf(underFillOf(bubble))).toEqual(ink);
  });

  it("keeps all three byte-identical to solid mode when the surface is solid", async () => {
    const readStyles = async (glass: boolean) => {
      const { container, unmount } = render(
        <ThemeProvider glass={glass} solid={!glass}>
          <AlertDialog open destructive title="Delete project?" />
          <Toast success message="Project saved" />
          <Tooltip label="Copy link" open textTrigger="Share" />
        </ThemeProvider>,
      );
      await waitFor(() => expect(container.querySelector('[role="alertdialog"]')).not.toBeNull());
      // The generated ids differ per render; the styles are what the mode may change.
      const styles = Array.from(container.querySelectorAll("[style]")).map((n) => n.getAttribute("style"));
      const materials = container.querySelectorAll('[data-testid="glass-material"]').length;
      unmount();
      return { styles, materials };
    };
    const solid = await readStyles(false);
    expect(solid.materials).toBe(0);
    expect((await readStyles(false)).styles).toEqual(solid.styles);
    const glass = await readStyles(true);
    expect(glass.materials).toBeGreaterThan(0);
    expect(glass.styles).not.toEqual(solid.styles);
  });
});

describe("the functional-layer overlays keep the sheer tint", () => {
  it("Popover keeps the frost material under the functional tint", async () => {
    const { container } = render(
      <ThemeProvider glass>
        <Popover trigger="Details" open title="Dimensions">
          <Text>Set the frame size.</Text>
        </Popover>
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="dialog"]')).not.toBeNull());
    const { card, surface } = anchored(container, '[role="dialog"]');
    expect(rgbaOf(card.style.backgroundColor)).toEqual([0, 0, 0, 0]);
    expect(materialLayers(surface)).toBe(1);
    expect(rimLayers(surface)).toBe(1);
    expect(rgbaOf(underFillOf(surface))).toEqual(FUNCTIONAL);
  });

  it("Command keeps the frost material under the functional tint", async () => {
    const { container } = render(
      <ThemeProvider glass>
        <Command trigger open groups={[{ heading: "Actions", items: [{ label: "New file" }] }]} />
      </ThemeProvider>,
    );
    await waitFor(() => expect(container.querySelector('[role="listbox"]')).not.toBeNull());
    const { card, surface } = anchored(container, '[role="listbox"]');
    expect(rgbaOf(card.style.backgroundColor)).toEqual([0, 0, 0, 0]);
    expect(materialLayers(surface)).toBe(1);
    expect(rgbaOf(underFillOf(surface))).toEqual(FUNCTIONAL);
  });
});
