import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import * as dropdownSkins from "../src/atoms/dropdown/dropdown.styles.ts";
import * as rowMenuSkins from "../src/organisms/row-menu/row-menu.styles.ts";
import { menuPanel, menuRow, menuRowLabel, menuSection, menuSeparator, MENU_OFFSET, MENU_ROW_GAP } from "../src/style/menu-look.ts";

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

  it("sizes the RowMenu root as a hugging control, with no static alignSelf in any skin", () => {
    for (const skin of [rowMenuSkins.webSkin, rowMenuSkins.iosSkin, rowMenuSkins.androidSkin]) expect(skin.anchor).toEqual({ position: "relative" });
  });
});
