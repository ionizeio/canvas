import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StyleSheet } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { createBadge } from "../src/atoms/badge/badge.shared.tsx";
import * as badgeSkins from "../src/atoms/badge/badge.styles.ts";
import { createAlert } from "../src/molecules/alert/alert.shared.tsx";
import * as alertSkins from "../src/molecules/alert/alert.styles.ts";
import { darkColors, lightColors, palette, type ColorTokens } from "../src/style/tokens.ts";
import { inverseDenseTint } from "../src/style/glass-fill.ts";
import { composite as compositeOver, contrastRatio } from "../src/style/color.ts";
import { IDENTITY_HUES, identityDisc, identityHue } from "../src/style/identity-hue.ts";
import { LOOKS, lookProps, type Look } from "./fixtures/looks.ts";
import { oklchOf } from "../tools/darkfactory/derive-tokens.ts";
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
import { scrimFill } from "../src/style/scrim.ts";
import { type Rgba, type SrgbColor, rgba, composite, luminance, contrast, textContrast, paint, primaryTextSurfaces, neighborhood, opacity, groupState, destructiveStates } from "../tools/tokens/text-beds.ts";
import { toneColor } from "../src/atoms/typography/typography.styles.ts";
import { Tabs as AndroidTabs } from "../src/organisms/tabs/tabs.android.tsx";
import { Calendar } from "../src/organisms/calendar/calendar.tsx";
import { Avatar } from "../src/atoms/avatar/avatar.tsx";
import { Avatar as IOSAvatar } from "../src/atoms/avatar/avatar.ios.tsx";
import { Avatar as AndroidAvatar } from "../src/atoms/avatar/avatar.android.tsx";

afterEach(cleanup);

const hueOf = (hex: string) => oklchOf(hex)[2];

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

  for (const look of LOOKS) {
    const { name: scheme, tokens } = look;
    const declarations = blockDeclarations(css, look.selector).decls;
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
      // A filled intent is read against its own fill; a transparent one (the web's
      // secondary and outline, Dark Factory's outline looks, and every disabled web button)
      // against the surfaces it sits on, the page and a card.
      it(`keeps every resting ${scheme} ${platform} Button label readable at every size`, () => {
        for (const size of ["small", "base", "large"] as const) {
          for (const intent of ["primary", "secondary", "destructive", "outline", "ghost", "link"] as const) {
            for (const disabled of [false, true]) {
              const opts = { icon: false, block: false, dim: disabled, disabled };
              const fill = skin.container(tokens, intent, size, opts).backgroundColor as string;
              const foreground = skin.label(tokens, intent, size, opts).color as string;
              // The iOS and Android skins show a disabled button by fading it (a dim WCAG
              // exempts, 1.4.3's inactive components), so only the web's disabled look is read.
              if (disabled && platform !== "web") continue;
              const beds = fill === "transparent" ? [tokens.background, tokens.card] : [fill];
              for (const bed of beds) expect(contrast(bed, foreground)).toBeGreaterThanOrEqual(4.5);
            }
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


describe("error and destructive text on authored enabled surfaces", () => {
  for (const look of LOOKS) {
    const { name: scheme, tokens: t } = look;
    it(`keeps ${scheme} error/action text readable through surface and press rounding`, () => {
      const declarations = blockDeclarations(css, look.selector).decls;
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

  it("keeps CSS text aliases separate from fills and indicators, with menus on the error ink", () => {
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
    // The web hand-off's menu red is the error ink the menus paint (statusColors), the
    // destructive-text role, so it follows the palette and a brand's override.
    expect(blockDeclarations(css, ":root").decls["p-menu-destructive"]).toBe("var(--destructive-text)");
    expect(blockDeclarations(css, ".dark").decls["p-menu-destructive"]).toBe("var(--destructive-text)");
    // The focus ring is a non-text indicator (WCAG 1.4.11): 3:1 on every surface it can
    // sit on, in each palette.
    for (const { tokens: t } of LOOKS) {
      for (const surface of [t.background, t.card, t.popover, t.muted]) expect(contrast(t.ring, surface)).toBeGreaterThanOrEqual(3);
    }
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

  for (const look of LOOKS) {
    const { name: scheme, tokens } = look;
    it(`keeps ${scheme} RN/CSS primary text readable through the full rounding neighborhood`, () => {
      const text = tokens["primary-text"];
      expect(typeof text).toBe("string");
      if (!text) throw new Error("Default themes must resolve primary-text");
      const declarations = blockDeclarations(css, look.selector).decls;
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
    });

    // The M3 snackbar's action is the palette's own brand on the toast pill, never another
    // palette's: it keeps the palette's primary hue (mint's action is blue, not the dark
    // palette's violet) and reads at 4.5:1 on the pill as the shell paints it: solid, and
    // under glass at the inverse dense tint (the web frost's alpha and the native one) over
    // the page and a card, each resting and under the pressed ripple.
    it(`paints the ${scheme} Android snackbar action in the palette's inverse primary on the pill`, () => {
      const bar = paint(toastSkins.androidSkin.container(tokens, true), "backgroundColor");
      expect(bar).toBe(tokens.inverse!);
      expect(paint(toastSkins.androidSkin.message(tokens))).toBe(tokens["inverse-foreground"]!);
      const action = paint(toastSkins.androidSkin.actionLabel(tokens));
      expect(action).toBe(tokens["inverse-primary"]!);
      const glassPills = [look.webGlass, look.nativeGlass].flatMap((glass) =>
        [tokens.background, tokens.card].map((backdrop) => composite(inverseDenseTint({ tokens, glass }, bar), backdrop)));
      const ripple = toastSkins.androidSkin.ripple!(tokens).color;
      for (const resting of [rgba(bar), ...glassPills]) {
        for (const bed of [resting, composite(ripple, resting)]) {
          for (const foreground of neighborhood(action)) for (const background of neighborhood(bed)) {
            expect(contrast(foreground, background), `${scheme} action on ${bed}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
      expect(Math.abs(hueOf(action) - hueOf(tokens.primary))).toBeLessThanOrEqual(2);
    });

    it(`renders the actual ${scheme} Android pill label over its selected fill and muted track`, () => {
      render(<ThemeProvider {...lookProps(look)}><AndroidTabs pills tabs={["Overview", "Activity"]} /></ThemeProvider>);
      const track = screen.getByRole("tablist");
      for (const name of ["Overview", "Activity"]) {
        const tab = screen.getByRole("tab", { name });
        fireEvent.click(tab);
        expect(tab.getAttribute("aria-selected")).toBe("true");
        const label = within(tab).getByText(name);
        const background = composite(tab.style.backgroundColor, track.style.backgroundColor);
        expect(hexOf(label.style.color)).toBe(tokens["primary-text"]);
        expect(contrast(label.style.color, background)).toBeGreaterThanOrEqual(4.65);
        if (look.scheme === "dark" && tokens.primary !== tokens["primary-text"]) expect(contrast(tokens.primary, background)).toBeLessThan(4.5);
      }
    });

    it(`renders the actual ${scheme} Web Calendar today over the range band`, () => {
      render(<ThemeProvider {...lookProps(look)}><Calendar range defaultRangeStart={2} defaultRangeEnd={6} today={4} month="September 2026" testID="calendar" /></ThemeProvider>);
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

// A token map from before the inverse roles (a consumer's complete legacy map) keeps the
// snackbar it had: the scheme's ink as the bar, the page colour as its text, and for the
// action the brand text of the palette whose surfaces match the bar's lightness (the dark
// palette's on a dark bar, the light palette's on a light one), each at 4.5:1 on the bar.
describe("the inverse roles' fallbacks for legacy token maps", () => {
  const legacy = (t: ColorTokens, keep: (keyof ColorTokens)[] = []): ColorTokens => {
    const map: Partial<ColorTokens> = { ...t };
    for (const role of ["inverse", "inverse-foreground", "inverse-primary"] as const) if (!keep.includes(role)) delete map[role];
    return map as ColorTokens;
  };
  const snackbar = (t: ColorTokens) => ({
    bar: paint(toastSkins.androidSkin.container(t, true), "backgroundColor"),
    text: paint(toastSkins.androidSkin.message(t)),
    action: paint(toastSkins.androidSkin.actionLabel(t)),
  });

  it("inverts a light map: the ink as the bar, the page as its text, the dark palette's brand text as the action", () => {
    const painted = snackbar(legacy(lightColors));
    expect(painted).toEqual({ bar: lightColors.foreground, text: lightColors.background, action: darkColors["primary-text"]! });
    expect(contrast(painted.action, painted.bar)).toBeGreaterThanOrEqual(4.5);
  });

  it("inverts a dark map: the light ink as the bar and the light palette's brand text as the action", () => {
    const painted = snackbar(legacy(darkColors));
    expect(painted).toEqual({ bar: darkColors.foreground, text: darkColors.background, action: lightColors["primary-text"]! });
    expect(contrast(painted.action, painted.bar)).toBeGreaterThanOrEqual(4.5);
  });

  it("picks the brand text by the bar's lightness when a map sets the pill but not its action", () => {
    // Dark Factory's pill is dark in the dark scheme too, so the dark palette's text serves.
    const painted = snackbar(legacy(darkColors, ["inverse", "inverse-foreground"]));
    expect(painted).toEqual({ bar: darkColors.inverse!, text: darkColors["inverse-foreground"]!, action: darkColors["primary-text"]! });
    expect(contrast(painted.action, painted.bar)).toBeGreaterThanOrEqual(4.5);
  });
});

for (const look of LOOKS) {
  const scheme = look.name;
  for (const { name, Badge, Alert } of renderedPlatforms) {
    it(`keeps actual ${scheme} ${name} Badge and Alert status text readable`, () => {
      for (const tone of ["neutral", "success", "warning", "error", "info"] as const) {
        const toneProps = tone === "neutral" ? {} : { [tone]: true };
        const view = render(<ThemeProvider {...lookProps(look)}>
          <Badge status {...toneProps} testID="badge">Status</Badge>
          <Alert {...toneProps} title="Title" description="Description" testID="alert" />
        </ThemeProvider>);
        for (const [id, labels] of [["badge", ["Status"]], ["alert", ["Title", "Description"]]] as const) {
          // A toned Alert's fill is its translucent wash (statusColors), so it is read over
          // the surfaces an alert sits on: the card and the page.
          const rendered = screen.getByTestId(id).style.backgroundColor;
          for (const surface of [look.tokens.card, look.tokens.background]) {
            const fill = compositeOver(rendered, surface);
            for (const label of labels) {
              expect(contrastRatio(fill, screen.getByText(label).style.color), `${tone} ${id} ${label}`).toBeGreaterThanOrEqual(4.5);
            }
          }
        }
        view.unmount();
      }
    });
  }
}


// Each platform's glass tints: the web frost's own (web-frost.ts) and the native set.
const webGlass = (look: Look) => look.webGlass;
const nativeGlass = (look: Look) => look.nativeGlass;
const dialogPlatforms = [
  { name: "web", Component: Dialog, skin: dialogSkins.webSkin, glassOf: webGlass },
  { name: "ios", Component: IOSDialog, skin: dialogSkins.iosSkin, glassOf: nativeGlass },
  { name: "android", Component: AndroidDialog, skin: dialogSkins.androidSkin, glassOf: nativeGlass },
];

describe("Dialog message contrast", () => {
  for (const look of LOOKS) for (const surface of ["solid", "glass"] as const) {
    const { name: scheme, tokens } = look;
    const light = look.scheme === "light";
    for (const { name, Component, skin, glassOf } of dialogPlatforms) {
      it(`keeps actual ${scheme} ${surface} ${name} description and currency readable`, () => {
        render(<ThemeProvider {...lookProps(look)} surface={surface}>
          <Component open title="Refund payment" description="Refund the duplicate payment." withBody />
        </ThemeProvider>);
        const fields = [
          { node: screen.getByText("Refund the duplicate payment."), original: skin.body(tokens) },
          { node: screen.getByText("$"), original: skin.currency(tokens) },
        ];
        for (const { node, original } of fields) {
          const rendered = node.style.color;
          const expected = light && surface === "glass" ? tokens["popover-foreground"] : original.color;
          expect(hexOf(rendered)).toBe(expected);
          expect(Number.parseFloat(getComputedStyle(node).fontSize)).toBe(original.fontSize);
          expect(Number.parseFloat(getComputedStyle(node).lineHeight)).toBe(original.lineHeight);
          for (const underlying of ["background", "card", "muted"] as const) {
            // This is a tint-over-scrim model from the source tokens, not native
            // glass luminance. Device pixel acceptance validates the material.
            const background = surface === "glass"
              ? composite(glassOf(look)["glass-tint"], composite(skin.backdrop(tokens).backgroundColor as string, tokens[underlying]))
              : rgba(skin.card(tokens).backgroundColor as string);
            expect(textContrast(rendered, background)).toBeGreaterThanOrEqual(4.5);
            if (light && surface === "glass") {
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
  { name: "web", Component: ActionSheet, skin: actionSheetSkins.webSkin, glassOf: webGlass },
  { name: "ios", Component: IOSActionSheet, skin: actionSheetSkins.iosSkin, glassOf: nativeGlass },
  { name: "android", Component: AndroidActionSheet, skin: actionSheetSkins.androidSkin, glassOf: nativeGlass },
];

describe("ActionSheet message contrast", () => {
  for (const look of LOOKS) for (const surface of ["solid", "glass"] as const) {
    const { name: scheme, tokens } = look;
    for (const { name, Component, skin, glassOf } of actionSheetPlatforms) {
      it(`keeps actual ${scheme} ${surface} ${name} header colors readable and preserves curated alpha`, () => {
        render(<ThemeProvider {...lookProps(look)} surface={surface}>
          <Component open title="Share document" message="Choose how to share this document." actions={[{ label: "Copy link", onPress: () => {} }]} />
        </ThemeProvider>);
        const fields = [
          { node: screen.getByText("Share document"), original: skin.headerTitle(tokens) },
          { node: screen.getByText("Choose how to share this document."), original: skin.headerMessage(tokens) },
        ];
        const scrim: Rgba = rgba(scrimFill(tokens, skin.scrimOpacity));
        for (const { node, original } of fields) {
          const rendered = node.style.color;
          const promoted = look.scheme === "light" && surface === "glass" && original.color === tokens["muted-foreground"];
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
              ? composite(glassOf(look)["glass-tint"], composite(scrim, tokens[underlying]))
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

const avatarPlatforms = [
  { name: "web", Component: Avatar },
  { name: "ios", Component: IOSAvatar },
  { name: "android", Component: AndroidAvatar },
];

describe("Avatar initials contrast", () => {
  // The disc is Dark Factory's gradient (src/style/identity-hue.ts), so the initials are
  // held to 4.5:1 against BOTH of its stops, for every identity hue; the rendered initials
  // are that disc's ink, in every look and on every platform.
  it("holds the initials' ink at 4.5:1 against both stops of every identity disc", () => {
    for (const hue of IDENTITY_HUES) {
      const disc = identityDisc(hue);
      expect(textContrast(disc.ink, rgba(disc.from)), `hue ${hue} pale stop`).toBeGreaterThanOrEqual(4.5);
      expect(textContrast(disc.ink, rgba(disc.to)), `hue ${hue} deep stop`).toBeGreaterThanOrEqual(4.5);
    }
  });
  // Enough names to land on most of the ten identity hues (the hash is the component's
  // own, so the test asserts the coverage rather than assuming it).
  const first = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Donald", "Frances", "Ken"];
  const last = ["Byron", "Hopper", "Turing", "Dijkstra", "Liskov"];
  const names = first.flatMap((f) => last.map((l) => `${f} ${l}`));
  for (const look of LOOKS) for (const { name, Component } of avatarPlatforms) {
    it(`paints ${look.name} ${name} initials in their disc's ink`, () => {
      const hues = new Set<number>();
      for (const person of names) {
        render(<ThemeProvider {...lookProps(look)} solid><Component name={person} testID="identity" /></ThemeProvider>);
        const container = screen.getByTestId("identity");
        const initials = within(container).getByText(person.split(" ").map((part) => part[0]).join(""));
        const hue = identityHue(person);
        hues.add(hue);
        expect(rgba(initials.style.color)).toEqual(rgba(identityDisc(hue).ink));
        cleanup();
      }
      expect(hues.size).toBeGreaterThanOrEqual(8);
    });
  }
});

