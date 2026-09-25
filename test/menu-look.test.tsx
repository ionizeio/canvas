import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors, mintColors, type ColorTokens } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { withInnerFill } from "../src/style/glass-fill.ts";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import * as dropdownSkins from "../src/atoms/dropdown/dropdown.styles.ts";
import * as rowMenuSkins from "../src/organisms/row-menu/row-menu.styles.ts";
import { menuCheck, menuChosenLabel, menuDetail, menuListPanel, menuPanel, menuRow, menuRowHover, menuRowLabel, menuRowPressed, menuRowPressStrength, menuSection, menuSeparator, MENU_OFFSET, MENU_ROW_GAP } from "../src/style/menu-look.ts";
import * as selectSkins from "../src/atoms/select/select.styles.ts";
import * as autocompleteSkins from "../src/atoms/autocomplete/autocomplete.styles.ts";
import * as phoneSkins from "../src/molecules/phone-input/phone-input.styles.ts";
import * as listboxSkins from "../src/atoms/listbox/listbox.styles.ts";
import { Select } from "../src/atoms/select/select.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { PhoneInput } from "../src/molecules/phone-input/phone-input.tsx";
import { View } from "react-native";

// The web Dropdown and RowMenu are Dark Factory's menu (SKN-5a): its Popover panel of
// MenuItems, read from one recipe (src/style/menu-look.ts) so the two cannot drift. iOS
// and Android keep their platform menus.

afterEach(cleanup);

const t = lightColors;
const flat = (value: string) => value.replace(/\s/g, "");
const rgbaOf = (hex: string) => flat(alpha(hex, 1)).replace(/,1\)$/, ",1.00)");
const wash = /rgba\(123,\s*108,\s*240,\s*0\.08\)/;
const ITEMS = [
  { label: "Rename", icon: "pencil" as const },
  { label: "Archive", disabled: true },
  { label: "Delete", destructive: true, separatorBefore: true },
];

describe("Dark Factory's menu on the web", () => {
  it("is one recipe in both web menus", () => {
    const dropdown = dropdownSkins.webSkin;
    const rowMenu = rowMenuSkins.webSkin;
    expect(dropdown.menuCard(t)).toEqual(menuPanel(t));
    expect(rowMenu.menuCard(t)).toEqual(menuPanel(t));
    expect(dropdown.itemRow).toBe(menuRow);
    expect(rowMenu.itemRow).toBe(menuRow);
    expect(dropdown.itemTextType).toBe(menuRowLabel);
    expect(rowMenu.rowTextSize).toBe(menuRowLabel);
    expect(dropdown.menuLabel(t)).toEqual(menuSection(t));
    expect(rowMenu.menuLabel(t)).toEqual(menuSection(t));
    expect(dropdown.separator?.(t)).toEqual(menuSeparator(t));
    expect(rowMenu.separator(t)).toEqual(menuSeparator(t));
    expect([dropdown.menuGap, rowMenu.menuGap]).toEqual([MENU_OFFSET, MENU_OFFSET]);
    expect([dropdown.rowGap, rowMenu.rowGap]).toEqual([MENU_ROW_GAP, MENU_ROW_GAP]);
  });

  it("draws Dark Factory's panel and rows", () => {
    expect(menuPanel(t)).toMatchObject({ borderRadius: 12, padding: 8, borderWidth: 1, borderColor: t.border, backgroundColor: t.popover, boxShadow: expect.stringContaining("26px 50px -20px") });
    expect(menuRow).toMatchObject({ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 10 });
    expect(menuRowLabel).toMatchObject({ fontSize: 12.5, lineHeight: 17, fontWeight: "700" });
    expect(menuSection(t)).toMatchObject({ fontSize: 10, fontWeight: "700", textTransform: "uppercase", color: t["muted-foreground"] });
    expect([MENU_OFFSET, MENU_ROW_GAP]).toEqual([8, 2]);
  });

  it("washes a resting row at once on hover, never a disabled one, and mutes a disabled row instead of dimming it", () => {
    render(<ThemeProvider light solid><Dropdown trigger="Actions" items={ITEMS} /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const [rename, archive] = screen.getAllByRole("menuitem");
    expect(rename.style.getPropertyValue("transition-property")).toBe("");
    fireEvent.pointerEnter(rename, { pointerType: "mouse" });
    expect(rename.style.backgroundColor).toMatch(wash);
    fireEvent.pointerLeave(rename);
    expect(rename.style.backgroundColor).not.toMatch(wash);
    fireEvent.pointerEnter(archive, { pointerType: "mouse" });
    expect(archive.style.backgroundColor).not.toMatch(wash);
    expect(archive.style.opacity).toBe("");
    const label = [...archive.querySelectorAll("div")].find((node) => node.textContent === "Archive") as HTMLElement;
    expect(flat(label.style.color)).toBe(rgbaOf(t["muted-foreground"]));
  });

  it("gives the RowMenu the same rows, and Dark Factory's plain icon button as its trigger", () => {
    render(<ThemeProvider light solid><RowMenu items={ITEMS} /></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger.style.width).toBe("28px");
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(trigger.style.backgroundColor).toMatch(wash);
    fireEvent.click(trigger);
    const [rename, archive] = screen.getAllByRole("menuitem");
    fireEvent.pointerEnter(rename, { pointerType: "mouse" });
    expect(rename.style.backgroundColor).toMatch(wash);
    expect(archive.style.opacity).toBe("");
    expect(rowMenuSkins.webSkin.triggerIconColor(t)).toBe(t["muted-foreground"]);
  });
});

describe("the hover fallback", () => {
  it("washes a row in `accent` for a token map without the optional `hover` role", () => {
    const { hover: _omit, ...legacy } = t;
    expect(menuRowHover(legacy as typeof t)).toEqual({ backgroundColor: t.accent });
    expect(menuRowHover(t)).toEqual({ backgroundColor: t.hover });
  });
});

describe("the platform menus", () => {
  it("keep their own look on iOS and Android: no hover wash, the platform's dim on a disabled row", () => {
    for (const skins of [dropdownSkins, rowMenuSkins]) {
      expect(skins.iosSkin.itemHover).toBeNull();
      expect(skins.androidSkin.itemHover).toBeNull();
      expect(skins.iosSkin.disabledRow).toEqual({ opacity: 0.4, muted: false });
      expect(skins.androidSkin.disabledRow).toEqual({ opacity: 0.38, muted: false });
      expect(skins.webSkin.disabledRow).toEqual({ opacity: 1, muted: true });
    }
    expect(rowMenuSkins.iosSkin.triggerHover).toBeNull();
    expect(rowMenuSkins.androidSkin.triggerHover).toBeNull();
    // The two iOS menus share the kit's iOS menu corner.
    expect(rowMenuSkins.iosSkin.menuCard(t).borderRadius).toBe(dropdownSkins.iosSkin.menuCard(t).borderRadius);
  });

  it("keeps the RowMenu trigger its own size in any parent, with no static alignSelf in any skin", () => {
    for (const skin of [rowMenuSkins.webSkin, rowMenuSkins.iosSkin, rowMenuSkins.androidSkin]) {
      expect(skin.anchor).toEqual({ position: "relative", alignItems: "flex-start" });
    }
    // Inside a plain View (a stretching parent that is not a kit layout container, like a
    // table cell) the anchor may stretch, but it starts the trigger, so the trigger and
    // its hover target keep the 28px box.
    render(<ThemeProvider light solid><View style={{ width: 300 }}><RowMenu items={ITEMS} testID="menu" /></View></ThemeProvider>);
    const root = screen.getByTestId("menu");
    expect(root.style.alignItems).toBe("flex-start");
    expect(root.style.alignSelf).toBe("");
    const trigger = screen.getByRole("button", { name: "More options" });
    expect(trigger.style.width).toBe("28px");
    expect(trigger.parentElement).not.toBe(root.parentElement);
  });
});

// The web option lists are Dark Factory's menu too (SKN-6b): the Select's, the
// Autocomplete's and PhoneInput's countries, with the chosen row the Listbox had (the
// selection violet on the label, a checkmark in `primary` in a gutter every row keeps, no
// fill) moved into the recipe, so a Listbox and a Select mark a choice alike.
describe("Dark Factory's menu in the option lists", () => {
  const PALETTES: [string, ColorTokens][] = [["blush", lightColors], ["mint", mintColors], ["dark", darkColors]];
  const themeOf = (name: string) => (name === "dark" ? { dark: true } : { light: true, mint: name === "mint" });
  const textOf = (row: HTMLElement, text: string) => [...row.querySelectorAll<HTMLElement>("div")].find((node) => node.textContent === text)!;
  // react-native-web prints an alpha with two decimals.
  const quantized = (value: string) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
    return m ? [m[1], m[2], m[3], (Math.round(Number(m[4] ?? 1) * 255) / 255).toFixed(2)].map(Number) : value;
  };

  it("is one recipe in every web option list, and the Listbox's chosen row reads it", () => {
    const select = selectSkins.webSkin;
    const ac = autocompleteSkins.webSkin;
    expect(menuListPanel(t)).toEqual({ ...menuPanel(t), maxHeight: 280, overflow: "hidden" });
    expect(select.panel(t)).toEqual(menuListPanel(t));
    expect(ac.popover(t)).toEqual(menuListPanel(t));
    // Being chosen fills nothing.
    expect(select.optionRow(t, true)).toBe(menuRow);
    expect(ac.row).toBe(menuRow);
    expect(ac.rowSelected(t)).toBeNull();
    expect([select.optionPressed(t), ac.rowPressed(t)]).toEqual([menuRowPressed(t), menuRowPressed(t)]);
    expect(select.optionText(t, "default")).toEqual({ ...menuRowLabel, color: t["popover-foreground"] });
    expect(ac.optionText(t, "large")).toEqual(select.optionText(t, "small"));
    expect([select.indicator(t, "default"), ac.check(t, "default")]).toEqual([menuCheck(t), menuCheck(t)]);
    expect([select.chosenText, ac.chosenText]).toEqual([menuChosenLabel, menuChosenLabel]);
    expect([select.optionHover, ac.rowHover]).toEqual([menuRowHover, menuRowHover]);
    expect([select.rowGap, ac.rowGap, select.menuGap, ac.menuGap]).toEqual([MENU_ROW_GAP, MENU_ROW_GAP, MENU_OFFSET, MENU_OFFSET]);
    expect(phoneSkins.webSkin.menu).toBe(select);
    expect(phoneSkins.webSkin.rowDial).toBe(menuDetail);
    expect(listboxSkins.webSkin.chosenLabel).toBe(menuChosenLabel);
    expect(listboxSkins.webSkin.mark).toEqual({ kind: "gutter", checkmark: menuCheck });
    expect(menuCheck(t)).toEqual({ width: 14, fontSize: 12.5, lineHeight: 17, fontWeight: "700", color: t.primary });
    expect(menuChosenLabel(t)).toEqual({ color: t["primary-text"] });
  });

  it("marks the chosen option in the selection violet beside a checkmark, with no fill, and washes a hovered row", () => {
    for (const [name, tokens] of PALETTES) {
      const theme = themeOf(name);
      for (const list of ["select", "autocomplete", "phone"] as const) {
        render(
          <ThemeProvider {...theme} solid>
            {list === "select" ? <Select open label="Region" defaultValue="Europe" options={["Americas", "Europe"]} />
              : list === "autocomplete" ? <Autocomplete open label="Region" defaultValue="Europe" options={["Americas", "Europe"]} />
              : <PhoneInput label="Phone" defaultCountry="GB" testID="phone" />}
          </ThemeProvider>,
        );
        if (list === "phone") fireEvent.click(screen.getByTestId("phone-country"));
        const rows = screen.getAllByRole("option");
        const chosen = rows.find((row) => row.getAttribute("aria-selected") === "true")!;
        const other = rows.find((row) => row.getAttribute("aria-selected") === "false")!;
        const chosenLabel = list === "phone" ? "United Kingdom" : "Europe";
        const where = `${name} ${list}`;
        expect(flat(textOf(chosen, chosenLabel).style.color), where).toBe(rgbaOf(tokens["primary-text"]!));
        expect(flat(textOf(chosen, "✓").style.color), where).toBe(rgbaOf(tokens.primary));
        expect(textOf(other, "✓"), `${where}: an unchosen row shows no check`).toBeUndefined();
        expect(chosen.style.backgroundColor, `${where}: no fill for being chosen`).toBe("");
        // The list sits Dark Factory's 2px apart.
        expect(chosen.parentElement!.style.gap || chosen.parentElement!.style.rowGap, where).toBe("2px");
        fireEvent.pointerEnter(other, { pointerType: "mouse" });
        expect(quantized(other.style.backgroundColor), `${where}: the hover wash`).toEqual(quantized(tokens.hover!));
        fireEvent.pointerLeave(other);
        expect(other.style.backgroundColor, where).toBe("");
        if (list === "phone") {
          // The dial column is Dark Factory's muted menu detail.
          const dial = textOf(chosen, "+44");
          expect(flat(dial.style.color)).toBe(rgbaOf(tokens["muted-foreground"]));
          expect(dial.style.fontSize).toBe("11px");
        }
        cleanup();
      }
    }
  });

  it("gives PhoneInput's country rows inner fills under glass, never the opaque press fill", async () => {
    render(<ThemeProvider light glass><PhoneInput label="Phone" testID="phone" /></ThemeProvider>);
    fireEvent.click(screen.getByTestId("phone-country"));
    const row = screen.getAllByRole("option")[0]!;
    fireEvent.mouseDown(row, { button: 0, buttons: 1, clientX: 1, clientY: 1 });
    // The soft ink tint: the row's muted dial code keeps 4.5:1 on it (4.61 in blush, where
    // the firm tint would leave 4.30).
    const expected = withInnerFill({ tokens: t, surface: "glass", dark: false }, menuRowPressed(t), "soft").backgroundColor as string;
    expect(expected).not.toBe(t.accent);
    await waitFor(() => expect(quantized(row.style.backgroundColor)).toEqual(quantized(expected)));
    fireEvent.mouseUp(row, { button: 0, buttons: 0, clientX: 1, clientY: 1 });
  });

  it("presses a glass menu row to the recipe's strength: soft beside a muted detail, firm on every other row", async () => {
    // One rule for every menu that tints a pressed row (menuRowPressStrength): a Dropdown
    // row with a shortcut and a PhoneInput country row with its dial code take the soft tint,
    // where the muted detail keeps 4.5:1; a plain Dropdown, RowMenu, Select or Autocomplete
    // row the firm one.
    expect([menuRowPressStrength(true), menuRowPressStrength(false)]).toEqual(["soft", "firm"]);
    const glassFill = (strength: "soft" | "firm") =>
      withInnerFill({ tokens: t, surface: "glass", dark: false }, menuRowPressed(t), strength).backgroundColor as string;
    const pressAndRead = async (row: HTMLElement, strength: "soft" | "firm", where: string) => {
      fireEvent.mouseDown(row, { button: 0, buttons: 1, clientX: 1, clientY: 1 });
      await waitFor(() => expect(quantized(row.style.backgroundColor), where).toEqual(quantized(glassFill(strength))));
      fireEvent.mouseUp(row, { button: 0, buttons: 0, clientX: 1, clientY: 1 });
    };
    expect(glassFill("soft")).not.toBe(glassFill("firm"));
    render(<ThemeProvider light glass><Dropdown trigger="Actions" items={[{ label: "Copy", shortcut: "⌘C" }, { label: "Rename" }]} /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const [copy, rename] = screen.getAllByRole("menuitem");
    await pressAndRead(copy!, "soft", "a Dropdown row with a shortcut");
    await pressAndRead(rename!, "firm", "a plain Dropdown row");
    cleanup();
    render(<ThemeProvider light glass><RowMenu items={[{ label: "Rename" }]} /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    await pressAndRead(screen.getByRole("menuitem"), "firm", "a RowMenu row");
    cleanup();
    for (const list of ["select", "autocomplete"] as const) {
      render(
        <ThemeProvider light glass>
          {list === "select" ? <Select open label="Region" options={["Americas", "Europe"]} />
            : <Autocomplete open label="Region" options={["Americas", "Europe"]} />}
        </ThemeProvider>,
      );
      await pressAndRead(screen.getAllByRole("option")[0]!, "firm", `a ${list} row`);
      cleanup();
    }
  });

  it("keeps the platform option lists: the UIMenu's leading check on iOS, Material 3's tint on Android, no wash", () => {
    for (const skin of [selectSkins.iosSkin, selectSkins.androidSkin]) {
      expect(skin.selectedSide).toBe("leading");
      expect([skin.optionHover, skin.chosenText, skin.rowGap, skin.menuGap]).toEqual([null, null, 0, 4]);
    }
    expect(phoneSkins.iosSkin.menu).toBe(selectSkins.iosSkin);
    expect(selectSkins.iosSkin.optionRow(t, true).backgroundColor).toBeUndefined();
    expect(selectSkins.androidSkin.optionRow(t, true).backgroundColor).toBe(alpha(t.primary, 0.12));
    const android = autocompleteSkins.androidSkin;
    expect([android.rowHover, android.chosenText, android.rowGap, android.menuGap]).toEqual([null, null, 0, 4]);
    expect(android.rowSelected(t)).toEqual({ backgroundColor: t.accent });
  });
});
