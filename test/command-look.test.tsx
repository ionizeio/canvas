import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors, mintColors, type ColorTokens } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { surfaceRipple } from "../src/style/ripple.ts";
import { innerFill } from "../src/style/glass-fill.ts";
import { FIELD_HEIGHT, fieldFrame, fieldValue } from "../src/style/field-look.ts";
import { MENU_ICON, MENU_OFFSET, MENU_ROW_GAP, menuPanel, menuRow, menuRowLabel, menuRowPressed, menuSection } from "../src/style/menu-look.ts";
import * as skins from "../src/organisms/command/command.styles.ts";
import { Command } from "../src/organisms/command/command.tsx";
import { Column } from "../src/atoms/layout/layout.tsx";

// Command takes Dark Factory's palette on every platform (SKN-6d): no platform ships a
// command palette, so the three entries share one skin built from Dark Factory's parts:
// its menu panel at the dialog corner, its SearchField, its menu rows and eyebrow sections,
// its MenuNote, and its field frame for the collapsed trigger. On an iPhone and on Android
// the rows, the search row and the trigger grow to the platform minimum.

let backdrop = true;
const restores: Array<() => void> = [];
beforeEach(() => {
  backdrop = true;
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => backdrop } });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as unknown as Record<string, unknown>).CSS;
  });
});
afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach((restore) => restore());
});

const ROOT = join(import.meta.dir, "..");
const PALETTES: Array<[string, ColorTokens, { dark?: boolean; mint?: boolean }]> = [
  ["blush", lightColors, {}],
  ["mint", mintColors, { mint: true }],
  ["dark", darkColors, { dark: true }],
];
const GROUPS = [
  { heading: "Actions", items: [{ label: "New file", icon: "file" as const, shortcut: "Ctrl+N" }, { label: "Save", icon: "save" as const }] },
  { heading: "Navigation", items: [{ label: "Go to Settings" }] },
];
// A colour as "r,g,b,a" (alpha to two places), whether a token's hex or rgba or the DOM's rgb.
function norm(color: string): string {
  if (color === "transparent") return "0,0,0,0.00";
  const m = (color.startsWith("#") ? alpha(color, 1) : color).match(/rgba?\(([^)]*)\)/);
  if (!m) throw new Error(`not a colour: ${color}`);
  const [r, g, b, a = "1"] = m[1]!.split(",").map((v) => v.trim());
  return `${r},${g},${b},${Number(a).toFixed(2)}`;
}
const IPHONE = { minTarget: 44, ripple: null };
const ANDROID = { minTarget: 48, ripple: surfaceRipple };
const WEB = { minTarget: null, ripple: null };

describe("one skin on every platform", () => {
  it("iOS and Android alias the web skin", () => {
    expect(skins.iosSkin).toBe(skins.webSkin);
    expect(skins.androidSkin).toBe(skins.webSkin);
    for (const os of ["ios", "android"]) {
      const entry = readFileSync(join(ROOT, `src/organisms/command/command.${os}.tsx`), "utf8");
      expect(entry).toContain(`createCommand(${os}Skin)`);
    }
    // The web harness runs as the web: no minimum and no ripple.
    expect(skins.webSkin.minTarget).toBeNull();
    expect(skins.webSkin.ripple).toBeNull();
    expect(readFileSync(join(ROOT, "src/organisms/command/command.styles.ts"), "utf8")).toContain("minTarget: platformMinTarget()");
  });

  it("is Dark Factory's menu panel at the dialog corner, 8 below the trigger", () => {
    for (const [name, t] of PALETTES) {
      expect(skins.webSkin.panel(t), name).toEqual({ width: 420, maxWidth: "100%", ...menuPanel(t), borderRadius: 18, overflow: "hidden" });
    }
    expect(skins.webSkin.panelGap).toBe(MENU_OFFSET);
  });

  it("sets the results as the menu's rows, the active row on its pressed fill, the headings as its eyebrow", () => {
    const t = lightColors;
    const web = skins.sharedSkin(WEB);
    expect(web.row).toEqual(menuRow);
    expect(web.rowGap).toBe(MENU_ROW_GAP);
    expect(web.iconSize).toBe(MENU_ICON);
    expect(web.rowLabel(t)).toMatchObject({ ...menuRowLabel, color: t["popover-foreground"] });
    expect(web.rowActive(t)).toEqual(menuRowPressed(t));
    expect(web.rowPressed?.(t)).toEqual(menuRowPressed(t));
    expect(web.groupHeading(t)).toEqual(menuSection(t));
    expect(web.emptyText(t)).toEqual({ ...menuRowLabel, color: t["muted-foreground"] });
    // A shortcut's 20px Kbd centres on the label's line, so a row with one is as tall as
    // one without (Dark Factory's 33px row), where the cap would grow it to 36.
    expect(web.rowShortcut).toEqual({ height: menuRowLabel.lineHeight, justifyContent: "center" });
  });

  it("draws the search row as Dark Factory's SearchField over the kit's focus rule", () => {
    const t = lightColors;
    const web = skins.sharedSkin(WEB);
    expect(web.searchGlyphSize).toBe(15);
    expect(web.searchText(t)).toEqual({ ...fieldValue("base"), color: t.foreground });
    expect(web.searchPlaceholder(t)).toBe(t["muted-foreground"]);
    const rest = web.searchRow(t, false);
    const focused = web.searchRow(t, true);
    expect(rest).toMatchObject({ gap: 10, paddingHorizontal: 10, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: t.border });
    expect(focused).toMatchObject({ borderBottomWidth: 2, borderBottomColor: t.ring });
    // The rule's band stays one height, so the row never shifts when it thickens.
    expect((rest.borderBottomWidth as number) + (rest.paddingBottom as number)).toBe((focused.borderBottomWidth as number) + (focused.paddingBottom as number));
    expect(rest.minHeight).toBeUndefined();
  });

  it("closes on Dark Factory's MenuNote: a hairline over the muted 11 / 500 note", () => {
    for (const [name, t] of PALETTES) {
      expect(skins.webSkin.footer(t), name).toMatchObject({ borderTopWidth: 1, borderTopColor: t.border, marginTop: 4, paddingTop: 8, paddingHorizontal: 10, paddingBottom: 6 });
      expect(skins.webSkin.footerText(t), name).toEqual({ fontSize: 11, lineHeight: 16, fontWeight: "500", color: t["muted-foreground"] });
    }
  });

  it("frames the trigger as the field, its line `ring` while open, with the SearchField's uppercase placeholder", () => {
    for (const [name, t] of PALETTES) {
      expect(skins.webSkin.trigger(t, false), name).toMatchObject({ height: FIELD_HEIGHT.base, paddingHorizontal: 12, gap: 10, ...fieldFrame(t, { focused: false, error: false }) });
      expect(skins.webSkin.trigger(t, true).borderColor, name).toBe(t.ring);
      // At full `muted-foreground`: Dark Factory's 0.9 opacity reads 3.60:1 on its shell.
      expect(skins.webSkin.triggerLabel(t), name).toMatchObject({ fontSize: 10.5, fontWeight: "700", letterSpacing: 1.68, textTransform: "uppercase", color: t["muted-foreground"] });
      expect(skins.webSkin.triggerLabel(t).opacity, name).toBeUndefined();
    }
    expect(skins.webSkin.triggerGlyphSize).toBe(15);
  });

  it("grows the rows, the search row and the trigger to each native platform's minimum, and ripples on Android", () => {
    const t = lightColors;
    for (const [os, platform] of [["iPhone", IPHONE], ["Android", ANDROID]] as const) {
      const skin = skins.sharedSkin(platform);
      expect(skin.minTarget, os).toBe(platform.minTarget);
      expect(skin.row, os).toEqual({ ...menuRow, minHeight: platform.minTarget });
      expect(skin.searchRow(t, false).minHeight, os).toBe(platform.minTarget);
      expect(skin.trigger(t, false).height, os).toBe(platform.minTarget);
    }
    // Android's rows ripple and take no pressed fill; the others press to the menu's fill.
    expect(skins.sharedSkin(ANDROID).ripple).toBe(surfaceRipple);
    expect(skins.sharedSkin(ANDROID).rowPressed).toBeNull();
    expect(skins.sharedSkin(IPHONE).ripple).toBeNull();
    expect(skins.sharedSkin(IPHONE).rowPressed?.(t)).toEqual(menuRowPressed(t));
  });
});

describe("the rendered palette", () => {
  for (const [name, t, provider] of PALETTES) {
    it(`${name}: the panel, the eyebrow headings, the active row and the footer note`, () => {
      render(<ThemeProvider solid {...provider}><Command footer groups={GROUPS} testID="cmd" /></ThemeProvider>);
      const card = screen.getByTestId("cmd");
      expect(card.style.borderRadius).toBe("18px");
      expect(card.style.padding).toBe("8px");
      const heading = screen.getByText("Actions");
      expect(heading.style.textTransform).toBe("uppercase");
      expect(norm(heading.style.color)).toBe(norm(t["muted-foreground"]));
      const active = screen.getByRole("option", { name: /New file/ });
      expect(active.getAttribute("aria-selected")).toBe("true");
      expect(norm(active.style.backgroundColor)).toBe(norm(t.accent));
      expect(active.style.borderRadius).toBe("8px");
      const rest = screen.getByRole("option", { name: /Save/ });
      expect(rest.style.backgroundColor).toBe("");
      expect(norm(screen.getByText("Save").style.color)).toBe(norm(t["popover-foreground"]));
      const note = screen.getByText("to close");
      expect(note.style.fontSize).toBe("11px");
      expect(norm(note.style.color)).toBe(norm(t["muted-foreground"]));
      const footer = note.parentElement!.parentElement!;
      expect(norm(footer.style.borderTopColor)).toBe(norm(t.border));
      const search = screen.getByRole("textbox");
      expect(search.style.fontSize).toBe("13px");
      expect(search.style.fontWeight).toBe("600");
    });

    it(`${name}: the trigger is the field's frame, turning \`ring\` while the palette is open`, () => {
      render(<ThemeProvider solid {...provider}><Command trigger groups={GROUPS} /></ThemeProvider>);
      const trigger = screen.getByRole("button", { name: /Search/ });
      expect(trigger.style.height).toBe("40px");
      expect(trigger.style.borderRadius).toBe("10px");
      expect(norm(trigger.style.backgroundColor)).toBe(norm(t["field-fill"]!));
      expect(norm(trigger.style.borderColor)).toBe(norm(t["field-border"]!));
      const label = screen.getByText("Search...");
      expect(label.style.textTransform).toBe("uppercase");
      expect(norm(label.style.color)).toBe(norm(t["muted-foreground"]));
      expect(label.style.opacity).toBe("");
      act(() => { fireEvent.click(trigger); });
      expect(norm(trigger.style.borderColor)).toBe(norm(t.ring));
    });
  }

  // The trigger and the rows are rows: a hugging Kbd inside them centres on the row's cross
  // axis, where it would take a stretching Column's leading alignment (the top of the row).
  it("centres the trigger's and the rows' Kbd caps inside a stretching Column", () => {
    render(<ThemeProvider solid><Column><Command trigger defaultOpen groups={GROUPS} /></Column></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: /Search/ });
    // Described as markup, so a failure prints (a diff over DOM nodes never finishes).
    const hugging = (root: Element) => [...root.querySelectorAll<HTMLElement>("div")].filter((el) => el.style.alignSelf === "flex-start").map((el) => el.outerHTML.slice(0, 120));
    expect(hugging(trigger)).toEqual([]);
    expect(hugging(screen.getByRole("option", { name: /New file/ }))).toEqual([]);
  });

  it("tints the active row with ink on the glass palette, never an opaque patch", () => {
    render(<ThemeProvider light glass><Command groups={GROUPS} /></ThemeProvider>);
    const active = screen.getByRole("option", { name: /New file/ });
    const tint = innerFill({ tokens: lightColors, surface: "glass", dark: false }, "muted", "firm");
    expect(norm(active.style.backgroundColor)).toBe(norm(tint));
    expect(norm(active.style.backgroundColor)).not.toBe(norm(lightColors.accent));
  });

  // The trigger's pane is its child, inside its 1px border, so it takes the corner radii
  // inset by that border and no border of its own: the clear well and its rim sit flush
  // inside the line, and the open ring stays on the trigger's own border.
  it("fills the trigger's padding box with the clear well under glass, the open ring on its own border", () => {
    render(<ThemeProvider light glass><Command trigger groups={GROUPS} /></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: /Search/ });
    const pane = trigger.firstElementChild as HTMLElement;
    const material = pane.querySelector<HTMLElement>('[data-testid="glass-material"]')!;
    expect(material).not.toBeNull();
    expect(material.querySelector('[style*="backdrop-filter"]'), "a clear well frosts nothing").toBeNull();
    expect(pane.style.borderRadius).toBe("9px");
    expect(pane.style.borderWidth).toBe("");
    expect(norm(trigger.style.borderColor)).toBe(norm("transparent"));
    act(() => { fireEvent.click(trigger); });
    expect(norm(trigger.style.borderColor)).toBe(norm(lightColors.ring));
  });

  it("draws one outline on the trigger when the material resolves solid under glass", () => {
    backdrop = false;
    render(<ThemeProvider light glass><Command trigger groups={GROUPS} /></ThemeProvider>);
    const trigger = screen.getByRole("button", { name: /Search/ });
    expect(norm(trigger.style.backgroundColor)).toBe(norm(lightColors["field-fill"]!));
    expect(norm(trigger.style.borderColor)).toBe(norm(lightColors["field-border"]!));
    const pane = trigger.firstElementChild as HTMLElement;
    const outlined = [...pane.querySelectorAll<HTMLElement>("div"), pane].filter((el) => el.style.borderWidth !== "" || el.style.borderColor !== "").map((el) => el.outerHTML.slice(0, 120));
    expect(outlined).toEqual([]);
  });
});

describe("the CSS hand-off", () => {
  it("has no iOS or Android Command rows: both platforms read the web's", () => {
    const css = readFileSync(join(ROOT, "styles/tokens/platforms.css"), "utf8");
    expect(css.match(/--p-cmd-radius:/g)).toHaveLength(1);
    expect(css.match(/--p-cmd-row-pad-y:/g)).toHaveLength(1);
    expect(css).toContain("--p-cmd-radius:18px");
    expect(css).toContain("--p-cmd-glyph:15px");
    expect(css).toContain("--p-cmd-row-font:12.5px;--p-cmd-row-lh:17px");
  });
});
