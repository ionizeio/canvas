import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StyleSheet } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { createBadge } from "../src/atoms/badge/badge.shared.tsx";
import * as badgeSkins from "../src/atoms/badge/badge.styles.ts";
import { createAlert } from "../src/molecules/alert/alert.shared.tsx";
import * as alertSkins from "../src/molecules/alert/alert.styles.ts";
import { colorsByScheme, glassByScheme, type ColorTokens } from "../src/style/tokens.ts";
import { androidSkin, iosSkin, webSkin } from "../src/atoms/button/button.styles.ts";
import { blockDeclarations, cssColorToHex, stripComments } from "../tools/tokens/css-tokens.ts";
import * as actionSheetSkins from "../src/organisms/action-sheet/action-sheet.styles.ts";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { ActionSheet as IOSActionSheet } from "../src/organisms/action-sheet/action-sheet.ios.tsx";
import { ActionSheet as AndroidActionSheet } from "../src/organisms/action-sheet/action-sheet.android.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { Dialog as IOSDialog } from "../src/organisms/dialog/dialog.ios.tsx";
import { Dialog as AndroidDialog } from "../src/organisms/dialog/dialog.android.tsx";
import * as dialogSkins from "../src/organisms/dialog/dialog.styles.ts";
import * as inputSkins from "../src/atoms/input/input.styles.ts";
import * as alertDialogSkins from "../src/molecules/alert-dialog/alert-dialog.styles.ts";
import * as toastSkins from "../src/organisms/toast/toast.styles.ts";
import * as tabsSkins from "../src/organisms/tabs/tabs.styles.ts";
import * as buttonGroupSkins from "../src/atoms/button-group/button-group.styles.ts";
import * as paginationSkins from "../src/atoms/pagination/pagination.styles.ts";
import * as sidebarSkins from "../src/organisms/sidebar/sidebar.styles.ts";
import * as navbarSkins from "../src/organisms/navbars/navbars.styles.ts";
import * as stepsSkins from "../src/organisms/steps/steps.styles.ts";
import * as calendarSkins from "../src/organisms/calendar/calendar.styles.ts";
import * as textareaSkins from "../src/atoms/textarea/textarea.styles.ts";
import * as dropdownSkins from "../src/atoms/dropdown/dropdown.styles.ts";
import * as rowMenuSkins from "../src/organisms/row-menu/row-menu.styles.ts";
import { destructiveText } from "../src/style/destructive-text.ts";
import { toneColor } from "../src/atoms/typography/typography.styles.ts";
import { Tabs as AndroidTabs } from "../src/organisms/tabs/tabs.android.tsx";
import { Calendar } from "../src/organisms/calendar/calendar.tsx";

afterEach(cleanup);

type Rgba = readonly [red: number, green: number, blue: number, alpha: number];
type SrgbColor = string | Rgba;

// Parse the hex and rgb/rgba forms used by the source tokens and rendered text.
// Keep fractional channels throughout compositing, before WCAG linearization.
function rgba(color: SrgbColor): Rgba {
  if (typeof color !== "string") return color;
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) return [
    parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16),
    hex[2] ? parseInt(hex[2], 16) / 255 : 1,
  ];
  const functional = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color);
  if (functional) {
    const channels = functional.slice(1, 4).map(Number);
    const alpha = functional[4] === undefined ? 1 : Number(functional[4]);
    if (channels.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255) &&
        Number.isFinite(alpha) && alpha >= 0 && alpha <= 1) {
      return [channels[0]!, channels[1]!, channels[2]!, alpha];
    }
  }
  throw new Error(`Expected an sRGB color: ${color}`);
}

function composite(foreground: SrgbColor, background: SrgbColor): Rgba {
  const front = rgba(foreground), back = rgba(background);
  const alpha = front[3] + back[3] * (1 - front[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (index: 0 | 1 | 2) => (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

function luminance(color: SrgbColor): number {
  const channels = rgba(color);
  if (channels[3] !== 1) throw new Error("Composite translucent colors onto an opaque backdrop before measuring contrast");
  const [r, g, b] = channels.slice(0, 3).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}

function contrast(a: SrgbColor, b: SrgbColor): number {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high! + 0.05) / (low! + 0.05);
}

function textContrast(text: SrgbColor, background: SrgbColor): number {
  return contrast(composite(text, background), background);
}

type PairedToken = Exclude<keyof ColorTokens, "primary-text" | "destructive-text">;
const PAIRS: [PairedToken, PairedToken][] = [
  ["background", "foreground"], ["card", "card-foreground"], ["popover", "popover-foreground"],
  ["primary", "primary-foreground"], ["secondary", "secondary-foreground"], ["muted", "muted-foreground"],
  ["accent", "accent-foreground"], ["destructive", "destructive-foreground"],
  ["success", "success-foreground"], ["warning", "warning-foreground"],
];
const css = readFileSync(new URL("../styles/tokens/colors.css", import.meta.url), "utf8");

describe("normal text contrast (WCAG 1.4.3)", () => {
  it("uses the WCAG linear-light calculation", () => {
    expect(contrast("#000000", "#ffffff")).toBe(21);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.478, 3);
  });

  it("composites alpha without rounding channels or treating translucent text as opaque", () => {
    expect(composite("rgba(0, 0, 0, 0.5)", "#ffffff")).toEqual([127.5, 127.5, 127.5, 1]);
    expect(composite("rgba(255, 0, 0, 0.5)", "rgba(0, 0, 255, 0.5)")).toEqual([170, 0, 85, 0.75]);
    expect(composite("rgba(1, 2, 3, 0)", "rgba(4, 5, 6, 0)")).toEqual([0, 0, 0, 0]);
    expect(rgba("#00000080")[3]).toBe(128 / 255);
    expect(textContrast("rgba(0, 0, 0, 0.5)", "#ffffff")).toBeLessThan(contrast("#000000", "#ffffff"));
    expect(() => contrast("rgba(0, 0, 0, 0.5)", "#ffffff")).toThrow("Composite translucent colors");
  });

  for (const scheme of ["light", "dark"] as const) {
    const tokens = colorsByScheme[scheme];
    const declarations = blockDeclarations(css, scheme === "light" ? ":root" : ".dark").decls;
    it(`keeps every resting ${scheme} web ActionSheet action and Cancel readable`, () => {
      const fill = actionSheetSkins.webSkin.actionsCard(tokens).backgroundColor as string;
      const cancelFill = actionSheetSkins.webSkin.cancelCard!(tokens).backgroundColor as string;
      for (const destructive of [false, true]) {
        const color = actionSheetSkins.webSkin.rowLabel(tokens, destructive, false).color as string;
        expect(contrast(fill, color)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(cancelFill, actionSheetSkins.webSkin.cancelLabel(tokens).color as string)).toBeGreaterThanOrEqual(4.5);
    });

    for (const [fill, foreground] of PAIRS) {
      it(`keeps ${scheme} ${foreground} at 4.5:1 on its fill in both RN and CSS`, () => {
        expect(contrast(tokens[fill], tokens[foreground])).toBeGreaterThanOrEqual(4.5);
        const cssFill = cssColorToHex(declarations[fill]);
        const cssForeground = cssColorToHex(declarations[foreground]);
        expect(cssFill).toBe(tokens[fill]);
        expect(cssForeground).toBe(tokens[foreground]);
        expect(contrast(cssFill!, cssForeground!)).toBeGreaterThanOrEqual(4.5);
        // Engines can round converted oklch channels differently. Check the
        // entire +/-1 fill-channel neighborhood, including combined changes.
        const channels = [1, 3, 5].map((i) => parseInt(tokens[fill].slice(i, i + 2), 16));
        for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
          const rounded = "#" + channels.map((value, i) =>
            Math.min(255, Math.max(0, value + [dr, dg, db][i]!)).toString(16).padStart(2, "0"),
          ).join("");
          expect(contrast(rounded, tokens[foreground])).toBeGreaterThanOrEqual(4.5);
        }
      });
    }

    for (const [platform, skin] of Object.entries({ web: webSkin, ios: iosSkin, android: androidSkin })) {
      it(`keeps every resting ${scheme} ${platform} filled Button label readable at every size`, () => {
        for (const size of ["small", "base", "large"] as const) {
          for (const intent of ["primary", "secondary", "destructive"] as const) {
            const fill = skin.container(tokens, intent, size, { icon: false, block: false, dim: false }).backgroundColor;
            const foreground = skin.label(tokens, intent, size).color;
            expect(contrast(fill as string, foreground as string)).toBeGreaterThanOrEqual(4.5);
          }
        }
      });
    }
  }
});

const renderedPlatforms = [
  { name: "web", Badge: createBadge(badgeSkins.webSkin), Alert: createAlert(alertSkins.webSkin) },
  { name: "ios", Badge: createBadge(badgeSkins.iosSkin), Alert: createAlert(alertSkins.iosSkin) },
  { name: "android", Badge: createBadge(badgeSkins.androidSkin), Alert: createAlert(alertSkins.androidSkin) },
];
const hexOf = (color: string): string => {
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  const channels = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*1(?:\.0+)?)?\s*\)$/.exec(color);
  if (!channels) throw new Error(`Expected an opaque rendered color: ${color}`);
  return "#" + channels.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("");
};

function paint(style: { color?: unknown; backgroundColor?: unknown }, property: "color" | "backgroundColor" = "color"): string {
  const value = style[property];
  if (typeof value !== "string") throw new Error(`Expected a source ${property}, received ${String(value)}`);
  return value;
}

// Pin the supported default surface set. Use the actual layered skin fills,
// including the two built-in compositions a neutral-pair check cannot catch.
function primaryTextSurfaces(tokens: ColorTokens): [string, SrgbColor][] {
  const neutral = ["background", "card", "popover", "muted"] as const;
  const tonal = paint(tabsSkins.androidSkin.pillsFill(tokens, true, false), "backgroundColor");
  const navTile = paint(navbarSkins.iosSkin.linkTile(tokens, false), "backgroundColor");
  return [
    ...neutral.map((key): [string, SrgbColor] => [key, tokens[key]]),
    ...neutral.map((key): [string, SrgbColor] => [`tonal selected on ${key}`, composite(tonal, tokens[key])]),
    ...neutral.map((key): [string, SrgbColor] => [`iOS Navbar inactive on ${key}`, composite(navTile, tokens[key])]),
    ["today within range", composite(
      paint(calendarSkins.webSkin.dayCellState(tokens, { selected: false, today: true }), "backgroundColor"),
      composite(paint(calendarSkins.webSkin.rangeBand(tokens), "backgroundColor"), tokens.card),
    )],
  ];
}

function neighborhood(color: SrgbColor): Rgba[] {
  const [r, g, b, a] = rgba(color);
  const bounded = (channel: number) => Math.max(0, Math.min(255, channel));
  const values: Rgba[] = [];
  for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
    values.push([bounded(r + dr), bounded(g + dg), bounded(b + db), a]);
  }
  return values;
}

interface TextState { name: string; text: SrgbColor; fill: SrgbColor }
function opacity(color: SrgbColor, value: number): Rgba {
  const [r, g, b, a] = rgba(color);
  return [r, g, b, a * value];
}

// Parent opacity composites the entire painted group onto its parent. The text
// does not first blend into the already-dimmed row a second time.
function groupState(name: string, text: SrgbColor, fill: SrgbColor, parent: SrgbColor, dim = 1): TextState {
  return { name, text: composite(opacity(text, dim), parent), fill: composite(opacity(fill, dim), parent) };
}

function destructiveStates(t: ColorTokens): TextState[] {
  const text = destructiveText(t);
  const states: TextState[] = (["background", "card", "popover", "muted"] as const)
    .map(key => ({ name: key, text, fill: t[key] }));
  const field = textareaSkins.androidSkin.field(t, { focused: false, error: true });
  states.push({ name: "Android filled Textarea", text, fill: paint(field, "backgroundColor") });
  const dialog = dialogSkins.iosSkin;
  const capsule = paint(dialog.capsule!(t, true, true), "backgroundColor");
  const dialogText = paint(dialog.capsuleLabel!(t, true, true));
  states.push(groupState("iOS Dialog resting", dialogText, capsule, t.popover));
  states.push(groupState("iOS Dialog pressed", dialogText, capsule, t.popover, dialog.capsulePressedOpacity!));
  const alert = alertDialogSkins.iosSkin;
  states.push(groupState("iOS AlertDialog pressed", paint(alert.confirmLabelStyle!(t, true)),
    paint(alert.confirmFill!(t, true), "backgroundColor"), t.popover, alert.pressedOpacity!));
  const dropdown = dropdownSkins.iosSkin;
  states.push(groupState("iOS Dropdown pressed", paint(dropdown.itemTextColor(t, false, true)),
    paint(dropdown.itemPressed!(t), "backgroundColor"), t.popover, dropdown.pressedOpacity!));
  for (const [name, skin] of [["web", actionSheetSkins.webSkin], ["ios", actionSheetSkins.iosSkin], ["android", actionSheetSkins.androidSkin]] as const) {
    const surface = paint(skin.actionsCard(t), "backgroundColor");
    const fill = skin.rowFill ? composite(paint(skin.rowFill(t), "backgroundColor"), surface) : surface;
    const label = paint(skin.rowLabel(t, true, false));
    states.push(groupState(`${name} ActionSheet resting`, label, fill, surface));
    if (skin.pressedOpacity != null) {
      states.push(groupState(`${name} ActionSheet pressed`, label, fill, surface, skin.pressedOpacity));
    } else if (skin.ripple) {
      // The ripple is behind the label; test its full declared state-layer alpha.
      states.push({ name: `${name} ActionSheet ripple`, text: label, fill: composite(skin.ripple(t).color, fill) });
    }
  }
  for (const [name, skin] of [["web", dropdownSkins.webSkin], ["ios", dropdownSkins.iosSkin], ["android", dropdownSkins.androidSkin]] as const) {
    const label = paint(skin.itemTextColor(t, t === colorsByScheme.dark, true));
    if (skin.ripple) states.push({ name: `${name} Dropdown ripple`, text: label, fill: composite(skin.ripple(t).color, t.popover) });
    else if (skin.pressedOpacity == null) states.push({ name: `${name} Dropdown pressed`, text: label, fill: paint(skin.itemPressed!(t), "backgroundColor") });
  }
  for (const [name, skin] of [["web", rowMenuSkins.webSkin], ["ios", rowMenuSkins.iosSkin], ["android", rowMenuSkins.androidSkin]] as const) {
    const label = paint(skin.rowTextColor({ label: "Delete", destructive: true }, false, t, t === colorsByScheme.dark));
    const fill = skin.ripple ? composite(skin.ripple(t).color, t.popover) : paint(skin.itemPressed(t), "backgroundColor");
    states.push({ name: `${name} fixed-red RowMenu pressed`, text: label, fill });
  }
  return states;
}

describe("error and destructive text on authored enabled surfaces", () => {
  for (const scheme of ["light", "dark"] as const) {
    const t = colorsByScheme[scheme];
    it(`keeps ${scheme} error/action text readable through surface and press rounding`, () => {
      const declarations = blockDeclarations(css, scheme === "light" ? ":root" : ".dark").decls;
      expect(cssColorToHex(declarations["destructive-text"])).toBe(destructiveText(t));
      for (const { name, text, fill } of destructiveStates(t)) {
        for (const foreground of neighborhood(text)) for (const background of neighborhood(fill)) {
          expect(contrast(foreground, background), `${scheme}: ${name}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`keeps the ${scheme} Android Textarea rest label readable on its opaque filled surface`, () => {
      const fill = paint(textareaSkins.androidSkin.field(t, { focused: false, error: false }), "backgroundColor");
      expect(fill).toBe(t.muted);
      for (const foreground of neighborhood(t["muted-foreground"])) for (const background of neighborhood(fill)) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("keeps CSS text aliases separate from fills, indicators and fixed-red menus", () => {
    const platformCss = readFileSync(new URL("../styles/tokens/platforms.css", import.meta.url), "utf8");
    for (const platform of ["ios", "android"] as const) {
      const block = blockDeclarations(platformCss, `[data-platform="${platform}"]`).decls;
      for (const key of ["p-alert-confirm-destructive-label", "p-ad-confirm-destructive-label", "p-menu-destructive"]) {
        expect(block[key]).toBe("var(--destructive-text)");
      }
      expect(block["p-alert-confirm-destructive-fill"]).toBe(platform === "ios" ? "var(--secondary)" : "transparent");
    }
    const web = blockDeclarations(platformCss, ':root,[data-platform="web"]').decls;
    expect(web["p-alert-confirm-destructive-fill"]).toBe("var(--destructive)");
    expect(web["p-alert-confirm-destructive-label"]).toBe("var(--destructive-foreground)");
    expect(blockDeclarations(platformCss, '[data-platform="android"]').decls["p-textarea-fill"]).toBe("var(--muted)");
    expect(blockDeclarations(css, ":root").decls["p-menu-destructive"]).toBe("#d02533");
    expect(blockDeclarations(css, ".dark").decls["p-menu-destructive"]).toBe("#dc6565");
    for (const t of Object.values(colorsByScheme)) expect(t.ring).toBe("#3da3f5");
  });
});

function baseRule(selector: "a" | "a:hover"): CSSStyleDeclaration {
  const base = readFileSync(new URL("../styles/tokens/base.css", import.meta.url), "utf8");
  const rule = new RegExp(`(?:^|[{}])\\s*${selector}\\s*\\{([^}]+)\\}`, "m").exec(stripComments(base));
  if (!rule) throw new Error(`Missing CSS handoff rule: ${selector}`);
  const declaration = document.createElement("a").style;
  declaration.cssText = rule[1]!;
  return declaration;
}

describe("primary text on authored surfaces", () => {
  it("maps the CSS text roles to primary-text and preserves fill/graphic roles", () => {
    const platformCss = readFileSync(new URL("../styles/tokens/platforms.css", import.meta.url), "utf8");
    const android = blockDeclarations(platformCss, '[data-platform="android"]').decls;
    const ios = blockDeclarations(platformCss, '[data-platform="ios"]').decls;
    const web = blockDeclarations(platformCss, ':root,[data-platform="web"]').decls;
    for (const key of ["p-tab-label-selected", "p-tab-v-selected-label", "p-side-active-label", "p-nav-link-active-label",
      "p-seg-selected-label", "p-page-selected-label", "p-alert-cancel-label", "p-alert-confirm-label", "p-ad-cancel-label", "p-ad-confirm-label"]) {
      expect(android[key], key).toBe("var(--primary-text)");
    }
    expect(ios["p-nav-link-label"]).toBe("var(--primary-text)");
    expect(ios["p-nav-link-active-fill"]).toBe("var(--primary)");
    expect(ios["p-nav-link-active-label"]).toBe("var(--primary-foreground)");
    expect(android["p-select-check-color"]).toBe("var(--primary)");
    expect(web["p-sheet-row-label"]).toBe("var(--popover-foreground)");
    expect(web["p-sheet-cancel-label"]).toBe("var(--popover-foreground)");
    expect(baseRule("a").color).toBe("var(--primary-text)");
  });

  for (const scheme of ["light", "dark"] as const) {
    const tokens = colorsByScheme[scheme];
    it(`keeps ${scheme} RN/CSS primary text readable through the full rounding neighborhood`, () => {
      const text = tokens["primary-text"];
      expect(typeof text).toBe("string");
      if (!text) throw new Error("Default themes must resolve primary-text");
      const declarations = blockDeclarations(css, scheme === "light" ? ":root" : ".dark").decls;
      expect(cssColorToHex(declarations["primary-text"])).toBe(text);
      for (const [name, fill] of primaryTextSurfaces(tokens)) {
        expect(contrast(text, fill), name).toBeGreaterThanOrEqual(4.65);
        // Perturb both the text AND the final fractional composite, not just
        // individual opaque tokens. Include every combined RGB direction.
        for (const foreground of neighborhood(text)) for (const background of neighborhood(fill)) {
          expect(contrast(foreground, background), name).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`keeps actual CSS anchor hover readable on the four ${scheme} neutral surfaces`, () => {
      const text = tokens["primary-text"];
      if (!text) throw new Error("Default themes must resolve primary-text");
      const opacity = Number(baseRule("a:hover").opacity);
      expect(opacity).toBe(0.9);
      const [r, g, b] = rgba(text);
      const hovered: Rgba = [r, g, b, opacity];
      for (const key of ["background", "card", "popover", "muted"] as const) {
        const painted = composite(hovered, tokens[key]);
        expect(contrast(painted, tokens[key]), key).toBeGreaterThanOrEqual(4.65);
        for (const foreground of neighborhood(painted)) for (const background of neighborhood(tokens[key])) {
          expect(contrast(foreground, background), key).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`uses the foreground role in every ${scheme} primary text skin`, () => {
      const expected = tokens["primary-text"];
      const styles: [string, { color?: unknown }][] = [];
      for (const [platform, skin] of Object.entries({ web: webSkin, ios: iosSkin, android: androidSkin })) {
        for (const size of ["small", "base", "large"] as const) styles.push([`${platform} link ${size}`, skin.label(tokens, "link", size)]);
      }
      styles.push(
        ["Typography primary", toneColor(tokens, scheme === "dark", "primary")],
        ["iOS Input action", inputSkins.iosSkin.actionText(tokens)],
        ["Android Input action", inputSkins.androidSkin.actionText(tokens)],
        ["Android AlertDialog text button", alertDialogSkins.androidSkin.textButtonLabel(tokens, false)],
        ["Android Dialog text button", dialogSkins.androidSkin.textButtonLabel(tokens, false)],
        ["Web Toast action", toastSkins.webSkin.actionLabel(tokens)],
        ["iOS Toast action", toastSkins.iosSkin.actionLabel(tokens)],
        ["Android underline Tab", tabsSkins.androidSkin.underlineLabel(tokens, true)],
        ["Android pill Tab", tabsSkins.androidSkin.pillsLabel(tokens, true)],
        ["Android vertical Tab", tabsSkins.androidSkin.verticalLabel(tokens, true)],
        ["Android ButtonGroup segment", buttonGroupSkins.androidSkin.segmentLabel(tokens, true)],
        ["Android Pagination selected page", paginationSkins.androidSkin.pageLabel(tokens, true)],
        ["Android Sidebar active label", sidebarSkins.androidSkin.label(tokens, true, "compact")],
        ["iOS Navbar inactive label", navbarSkins.iosSkin.linkLabel(tokens, false)],
        ["Android Navbar active label", navbarSkins.androidSkin.linkLabel(tokens, true)],
      );
      for (const platform of ["webSkin", "iosSkin", "androidSkin"] as const) {
        styles.push(
          [`${platform} current step number`, stepsSkins[platform].glyphState(tokens, "current")],
          [`${platform} Calendar today`, calendarSkins[platform].dayLabel(tokens, { selected: false, today: true })],
          [`${platform} Calendar event title`, calendarSkins[platform].eventTitle(tokens)],
        );
        expect(paint(calendarSkins[platform].dayLabel(tokens, { selected: true, today: true })))
          .toBe(tokens["primary-foreground"]);
        expect(paint(calendarSkins[platform].dayCellState(tokens, { selected: true, today: true }), "backgroundColor"))
          .toBe(tokens.primary);
      }
      for (const [name, style] of styles) expect(paint(style), name).toBe(expected);
      const inverse = paint(toastSkins.androidSkin.actionLabel(tokens));
      expect(inverse).toBe(colorsByScheme[scheme === "light" ? "dark" : "light"]["primary-text"]);
      expect(contrast(inverse, tokens.foreground)).toBeGreaterThanOrEqual(4.5);
    });

    it(`renders the actual ${scheme} Android pill label over its selected fill and muted track`, () => {
      render(<ThemeProvider scheme={scheme}><AndroidTabs pills tabs={["Overview", "Activity"]} /></ThemeProvider>);
      const track = screen.getByRole("tablist");
      for (const name of ["Overview", "Activity"]) {
        const tab = screen.getByRole("tab", { name });
        fireEvent.click(tab);
        expect(tab.getAttribute("aria-selected")).toBe("true");
        const label = within(tab).getByText(name);
        const background = composite(tab.style.backgroundColor, track.style.backgroundColor);
        expect(hexOf(label.style.color)).toBe(tokens["primary-text"]);
        expect(contrast(label.style.color, background)).toBeGreaterThanOrEqual(4.65);
        if (scheme === "dark" && tokens.primary !== tokens["primary-text"]) expect(contrast(tokens.primary, background)).toBeLessThan(4.5);
      }
    });

    it(`renders the actual ${scheme} Web Calendar today over the range band`, () => {
      render(<ThemeProvider scheme={scheme}><Calendar range defaultRangeStart={2} defaultRangeEnd={6} today={4} month="September 2026" testID="calendar" /></ThemeProvider>);
      const today = screen.getByRole("button", { name: "4, today, in range" });
      const band = today.parentElement?.parentElement?.firstElementChild as HTMLElement | undefined;
      expect(band?.style.backgroundColor).toBeTruthy();
      const card = screen.getByTestId("calendar");
      const background = composite(today.style.backgroundColor, composite(band!.style.backgroundColor, card.style.backgroundColor));
      const label = within(today).getByText("4");
      expect(hexOf(label.style.color)).toBe(tokens["primary-text"]);
      expect(contrast(label.style.color, background)).toBeGreaterThanOrEqual(4.65);
      if (tokens.primary !== tokens["primary-text"]) expect(contrast(tokens.primary, background)).toBeLessThan(4.5);
      const endpoint = screen.getByRole("button", { name: "2, selected, start of range" });
      expect(hexOf(endpoint.style.backgroundColor)).toBe(tokens.primary);
      expect(hexOf(within(endpoint).getByText("2").style.color)).toBe(tokens["primary-foreground"]);
    });
  }
});

for (const scheme of ["light", "dark"] as const) {
  for (const { name, Badge, Alert } of renderedPlatforms) {
    it(`keeps actual ${scheme} ${name} Badge and Alert status text readable`, () => {
      for (const tone of ["neutral", "success", "warning", "error", "info"] as const) {
        const toneProps = tone === "neutral" ? {} : { [tone]: true };
        const view = render(<ThemeProvider scheme={scheme}>
          <Badge status {...toneProps} testID="badge">Status</Badge>
          <Alert {...toneProps} title="Title" description="Description" testID="alert" />
        </ThemeProvider>);
        for (const [id, labels] of [["badge", ["Status"]], ["alert", ["Title", "Description"]]] as const) {
          const fill = hexOf(screen.getByTestId(id).style.backgroundColor);
          for (const label of labels) {
            const text = hexOf(screen.getByText(label).style.color);
            expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
          }
        }
        view.unmount();
      }
    });
  }
}


const dialogPlatforms = [
  { name: "web", Component: Dialog, skin: dialogSkins.webSkin },
  { name: "ios", Component: IOSDialog, skin: dialogSkins.iosSkin },
  { name: "android", Component: AndroidDialog, skin: dialogSkins.androidSkin },
];

describe("Dialog message contrast", () => {
  for (const scheme of ["light", "dark"] as const) for (const surface of ["solid", "glass"] as const) {
    const tokens = colorsByScheme[scheme];
    for (const { name, Component, skin } of dialogPlatforms) {
      it(`keeps actual ${scheme} ${surface} ${name} description and currency readable`, () => {
        render(<ThemeProvider scheme={scheme} surface={surface}>
          <Component open title="Refund payment" description="Refund the duplicate payment." withBody />
        </ThemeProvider>);
        const fields = [
          { node: screen.getByText("Refund the duplicate payment."), original: skin.body(tokens) },
          { node: screen.getByText("$"), original: skin.currency(tokens) },
        ];
        for (const { node, original } of fields) {
          const rendered = node.style.color;
          const expected = scheme === "light" && surface === "glass" ? tokens["popover-foreground"] : original.color;
          expect(hexOf(rendered)).toBe(expected);
          expect(Number.parseFloat(getComputedStyle(node).fontSize)).toBe(original.fontSize);
          expect(Number.parseFloat(getComputedStyle(node).lineHeight)).toBe(original.lineHeight);
          for (const underlying of ["background", "card", "muted"] as const) {
            // This is a tint-over-scrim model from the source tokens, not native
            // glass luminance. Device pixel acceptance validates the material.
            const background = surface === "glass"
              ? composite(glassByScheme[scheme]["glass-tint"], composite(skin.backdrop(tokens).backgroundColor as string, tokens[underlying]))
              : rgba(skin.card(tokens).backgroundColor as string);
            expect(textContrast(rendered, background)).toBeGreaterThanOrEqual(4.5);
            if (scheme === "light" && surface === "glass") {
              expect(textContrast(original.color as string, background)).toBeLessThan(4.5);
            }
          }
        }
        expect(hexOf(screen.getByText("Refund payment").style.color)).toBe(skin.title(tokens).color);
        expect(hexOf(screen.getByText("Amount").style.color)).toBe(skin.fieldLabel(tokens).color);
        if (name === "android") {
          expect(hexOf(screen.getByText("Cancel").style.color)).toBe(tokens["primary-text"]);
          expect(hexOf(screen.getByText("Confirm").style.color)).toBe(tokens["primary-text"]);
        }
      });
    }
  }
});


const actionSheetPlatforms = [
  { name: "web", Component: ActionSheet, skin: actionSheetSkins.webSkin },
  { name: "ios", Component: IOSActionSheet, skin: actionSheetSkins.iosSkin },
  { name: "android", Component: AndroidActionSheet, skin: actionSheetSkins.androidSkin },
];

describe("ActionSheet message contrast", () => {
  for (const scheme of ["light", "dark"] as const) for (const surface of ["solid", "glass"] as const) {
    const tokens = colorsByScheme[scheme];
    for (const { name, Component, skin } of actionSheetPlatforms) {
      it(`keeps actual ${scheme} ${surface} ${name} header colors readable and preserves curated alpha`, () => {
        render(<ThemeProvider scheme={scheme} surface={surface}>
          <Component open title="Share document" message="Choose how to share this document." actions={[{ label: "Copy link", onPress: () => {} }]} />
        </ThemeProvider>);
        const fields = [
          { node: screen.getByText("Share document"), original: skin.headerTitle(tokens) },
          { node: screen.getByText("Choose how to share this document."), original: skin.headerMessage(tokens) },
        ];
        const dim = rgba(StyleSheet.flatten(actionSheetSkins.scrimDim).backgroundColor as string);
        const scrim: Rgba = [dim[0], dim[1], dim[2], dim[3] * skin.scrimOpacity];
        for (const { node, original } of fields) {
          const rendered = node.style.color;
          const promoted = scheme === "light" && surface === "glass" && original.color === tokens["muted-foreground"];
          const expected = promoted ? tokens["popover-foreground"] : original.color as string;
          // Compare the alpha too: the readable iOS secondary label remains
          // translucent foreground, and stronger titles keep their skin color.
          expect(rgba(rendered)).toEqual(rgba(expected));
          expect(Number.parseFloat(getComputedStyle(node).fontSize)).toBe(original.fontSize);
          expect(Number.parseFloat(getComputedStyle(node).lineHeight)).toBe(original.lineHeight);
          for (const underlying of ["background", "card", "muted"] as const) {
            // Model the settled source scrim and tint, without claiming that a
            // native blur or Liquid Glass surface has this exact luminance.
            const background = surface === "glass"
              ? composite(glassByScheme[scheme]["glass-tint"], composite(scrim, tokens[underlying]))
              : rgba(skin.actionsCard(tokens).backgroundColor as string);
            expect(textContrast(rendered, background)).toBeGreaterThanOrEqual(4.5);
            if (promoted) expect(textContrast(original.color as string, background)).toBeLessThan(4.5);
          }
        }
        expect(rgba(screen.getByText("Copy link").style.color)).toEqual(rgba(skin.rowLabel(tokens, false, false).color as string));
        expect(rgba(screen.getByText("Cancel").style.color)).toEqual(rgba(skin.cancelLabel(tokens).color as string));
      });
    }
  }
});
