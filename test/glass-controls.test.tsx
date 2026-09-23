import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";
import { Checkbox } from "../src/atoms/checkbox/checkbox.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { Chip } from "../src/atoms/chip/chip.tsx";
import { Kbd } from "../src/atoms/kbd/kbd.tsx";
import { Alert } from "../src/molecules/alert/alert.tsx";
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { selectionTint } from "../src/organisms/tabs/tabs.styles.ts";
import { Pagination } from "../src/atoms/pagination/pagination.tsx";
import { brandInk, brandTint, surfaceUnderFill, BRAND_TINT_ALPHA, BRAND_INK_CONTRAST } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { alpha, composite, contrastRatio } from "../src/style/color.ts";
import { actionFill, actionInk } from "../src/style/action.ts";
import { lightColors, palette, brandColors } from "../src/style/tokens.ts";
import { WEB_TINTS } from "../src/style/glass-surface/web-frost.ts";
import { statusColors } from "../src/style/status.ts";
import { HUE_SOFT } from "../src/atoms/chip/chip.shared.tsx";
import { LOOKS } from "./fixtures/looks.ts";

// The CONTROL layer of the glass model: every control that paints a surface of its
// own (a field box, a button, a switch track, a checkbox, a badge, a chip, a keycap,
// a tab pill, a page cell) renders it through the material under glass, as a
// GlassPane behind the node that keeps the control's own semantics and interaction.
// In solid mode the pane renders nothing and the control keeps its opaque fill.
//
// Two rules the pucks follow, pinned here:
//   - A BRAND fill (a primary or destructive button, a checked switch, a selected tab
//     or page) is brand-tinted glass: the brand colour is the under-fill, as sheer as
//     legibility allows, with the brand's own ink on top at 4.5:1 over the page.
//   - A HUE wash (a status badge, a coloured chip) is the hue's mid step under the
//     material with the label stepped one deeper than the solid recipe, so every hue
//     holds 4.5:1 over the page, over a content pane and over a control puck.
//
// The material only renders on a material path, and with the expo peers stubbed the one
// reachable here is the web frost, which renders wherever the browser supports a CSS
// backdrop-filter (the test DOM's CSS.supports says it does).

afterEach(cleanup);

async function renderGlass(ui: React.ReactElement, solid = false) {
  const result = render(<ThemeProvider glass={!solid} solid={solid}>{ui}</ThemeProvider>);
  if (!solid) await waitFor(() => expect(materialLayers(result.container)).toBeGreaterThan(0));
  return result;
}

// The material is the wrapper GlassBox paints behind the content. Counting wrappers, not
// backdrop-filtered layers, finds the clear surfaces too: a text field draws no frost.
const materialLayers = (root: HTMLElement) => root.querySelectorAll('[data-testid="glass-material"]').length;
// Inside the wrapper the fill is the layer that paints a background: BEFORE the frost
// for a layer tint (the material's body), AFTER it for a brand colour, which composites
// over the material so the colour the ink solver saw is the colour that renders (the rim
// that follows paints a box shadow, never a background).
const fillOfMaterial = (material: Element | null): { fill: HTMLElement | null; over: boolean } => {
  const layers = Array.from(material?.children ?? []) as HTMLElement[];
  const frost = layers.findIndex((layer) => layer.style.backdropFilter);
  const fill = layers.findIndex((layer) => layer.style.backgroundColor);
  return fill < 0 ? { fill: null, over: false } : { fill: layers[fill], over: frost >= 0 && fill > frost };
};
const fillLayerOf = (root: HTMLElement) => fillOfMaterial(root.querySelector('[data-testid="glass-material"]'));
const underFillOf = (root: HTMLElement): string => fillLayerOf(root).fill?.style.backgroundColor ?? "";
// react-native-web stores an alpha as an 8-bit channel and prints it with two decimals,
// and a hex alpha() string prints a bare one, so colours compare as numbers quantized
// the way react-native-web does it, not as strings.
const rgbaOf = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (!m) return value;
  const a = m[4] == null ? 1 : Number(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number((Math.round(a * 255) / 255).toFixed(2))];
};

// The web renders the web frost's own tints (web-frost.ts); `glassByScheme` is the
// native set (iOS, Android).
const LIGHT = WEB_TINTS.light;

describe("brand-tinted glass pucks", () => {
  it("a primary Button is a brand puck: the container fill goes transparent and the action colour is the under-fill", async () => {
    const { container } = await renderGlass(<Button primary testID="save">Save</Button>);
    const button = container.querySelector('[data-testid="save"]') as HTMLElement;
    expect(button.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(materialLayers(button)).toBe(1);
    expect(rgbaOf(underFillOf(button))).toEqual(rgbaOf(brandTint(actionFill(lightColors), lightColors.background, actionInk(lightColors))));
  });

  it("a destructive Button carries the destructive colour; ghost and link buttons take no material at all", async () => {
    const { container } = await renderGlass(
      <>
        <Button destructive testID="delete">Delete</Button>
        <Button ghost testID="ghost">Cancel</Button>
        <Button link testID="link">Learn more</Button>
      </>,
    );
    const del = container.querySelector('[data-testid="delete"]') as HTMLElement;
    expect(rgbaOf(underFillOf(del))).toEqual(rgbaOf(brandTint(lightColors.destructive, lightColors.background)));
    expect(materialLayers(container.querySelector('[data-testid="ghost"]') as HTMLElement)).toBe(0);
    expect(materialLayers(container.querySelector('[data-testid="link"]') as HTMLElement)).toBe(0);
  });

  it("an outline Button is a plain control puck with its hairline dropped (the rim is the edge)", async () => {
    const { container } = await renderGlass(<Button outline testID="more">More</Button>);
    const button = container.querySelector('[data-testid="more"]') as HTMLElement;
    expect(rgbaOf(underFillOf(button))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
    expect(button.style.borderColor).toBe("rgba(0, 0, 0, 0.00)");
  });

  it("a checked Switch track is brand glass and an unchecked one the plain control material", async () => {
    const { container } = await renderGlass(
      <>
        <Switch defaultChecked testID="on" accessibilityLabel="Notifications" />
        <Switch testID="off" accessibilityLabel="Marketing" />
      </>,
    );
    const on = container.querySelector('[data-testid="on"]') as HTMLElement;
    const off = container.querySelector('[data-testid="off"]') as HTMLElement;
    expect(rgbaOf(underFillOf(on))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
    expect(rgbaOf(underFillOf(off))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
  });

  it("a checked Checkbox box is brand glass with the check on top", async () => {
    const { container } = await renderGlass(<Checkbox defaultChecked testID="terms">Accept</Checkbox>);
    const row = container.querySelector('[data-testid="terms"]') as HTMLElement;
    expect(rgbaOf(underFillOf(row))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
    expect(row.textContent).toContain("✓");
  });

  it("the selected Tabs material uses its skin tint and stable foreground over a functional-layer track", async () => {
    const { container } = await renderGlass(<Tabs pills tabs={["Overview", "Activity"]} testID="tabs" />);
    const strip = container.querySelector('[data-testid="tabs"]') as HTMLElement;
    // The track's own pane is the first material; the selected tab's puck follows.
    const fills = Array.from(strip.querySelectorAll('[data-testid="glass-material"]')).map((material) => rgbaOf(fillOfMaterial(material).fill?.style.backgroundColor ?? ""));
    expect(fills[0]).toEqual(rgbaOf(LIGHT["glass-tint"]));
    // The web shares the capsule segmented control with iOS: the puck carries the
    // raised thumb's fill (the light scheme's `background`) at the selection tint's
    // opacity ceiling, not a brand tint.
    expect(fills).toContainEqual(rgbaOf(selectionTint({ backgroundColor: lightColors.background }, false)!));
    const selected = strip.querySelector('[aria-selected="true"]') as HTMLElement;
    const label = Array.from(selected.querySelectorAll("*")).find((n) => n.textContent === "Overview" && (n as HTMLElement).style.color) as HTMLElement;
    expect(rgbaOf(label.style.color)).toEqual(rgbaOf(alpha(lightColors.foreground, 1)));
  });

  it("the current page of a Pagination is a brand puck; the rest of the web tiles are plain control pucks", async () => {
    const { container } = await renderGlass(<Pagination total={3} defaultPage={2} testID="pages" />);
    const pages = container.querySelector('[data-testid="pages"]') as HTMLElement;
    const current = pages.querySelector('[aria-current="page"]') as HTMLElement;
    expect(rgbaOf(underFillOf(current))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
    const other = Array.from(pages.querySelectorAll('[role="button"]')).find((n) => n.getAttribute("aria-current") == null && n.textContent === "1") as HTMLElement;
    expect(rgbaOf(underFillOf(other))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
  });

  it("paints a brand fill OVER the material and a layer tint beneath it", async () => {
    // The solver models the puck as the brand composited on the page. Beneath the
    // material that model failed: the frost's own scheme tint dyed the fill (expo-blur's
    // dark BlurView halved the brand's brightness on iOS, 2:1 for the ink) and the blur
    // pulled the dark surroundings into a small puck (3.4:1 on the web Calendar day).
    // Over the material the brand composites on the blurred page, as solved.
    const { container } = await renderGlass(
      <>
        <Button primary testID="brand">Save</Button>
        <Button outline testID="plain">More</Button>
      </>,
    );
    const brand = fillLayerOf(container.querySelector('[data-testid="brand"]') as HTMLElement);
    expect(brand.over).toBe(true);
    expect(rgbaOf(brand.fill!.style.backgroundColor)).toEqual(rgbaOf(brandTint(actionFill(lightColors), lightColors.background, actionInk(lightColors))));
    const plain = fillLayerOf(container.querySelector('[data-testid="plain"]') as HTMLElement);
    expect(plain.over).toBe(false);
    expect(rgbaOf(plain.fill!.style.backgroundColor)).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
  });

  it("keeps the painted ink at 4.5:1 over the page in every palette, densifying only as far as it needs", () => {
    for (const { name: scheme, tokens: t, nativeGlass } of LOOKS) {
      for (const brand of [t.primary, actionFill(t), t.destructive]) {
        // The ink is the one the skin paints on the brand (its token pair), not the stronger
        // of black and white (see brandInk).
        const ink = brandInk(t, brand);
        const fill = surfaceUnderFill(nativeGlass, "control", brand, undefined, t);
        expect(fill).toBe(brandTint(brand, t.background, ink));
        expect(contrastRatio(composite(fill, t.background), ink), `${scheme} ${brand}`).toBeGreaterThanOrEqual(BRAND_INK_CONTRAST);
        // Never sheerer than the floor; where the floor already clears, it stays there.
        const floor = alpha(brand, BRAND_TINT_ALPHA);
        if (contrastRatio(composite(floor, t.background), ink) >= BRAND_INK_CONTRAST) expect(fill).toBe(floor);
      }
    }
  });
});

describe("hue washes", () => {
  it("a coloured Chip washes the material with the hue's mid step at the soft alpha under its deep label; a status Badge is the plain control material with its tone on the dot", async () => {
    const { container } = await renderGlass(
      <>
        <Badge status success testID="status">Active</Badge>
        <Badge destructive testID="soft">Blocked</Badge>
        <Chip blue testID="chip">Design</Chip>
        <Kbd testID="kbd">⌘</Kbd>
      </>,
    );
    // Dark Factory's live-state pill: the quiet surface pill, the foreground label, the tone's dot.
    const badge = container.querySelector('[data-testid="status"]') as HTMLElement;
    expect(rgbaOf(underFillOf(badge))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
    expect(badge.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    const badgeLabel = Array.from(badge.querySelectorAll("*")).find((n) => n.textContent === "Active" && (n as HTMLElement).style.color) as HTMLElement;
    expect(rgbaOf(badgeLabel.style.color)).toEqual(rgbaOf(alpha(lightColors.foreground, 1)));
    expect(rgbaOf((badgeLabel.previousElementSibling as HTMLElement).style.backgroundColor)).toEqual(rgbaOf(alpha(statusColors(lightColors, "success").dot, 1)));
    // The soft destructive pill washes the material with its own wash, under its ink.
    const soft = container.querySelector('[data-testid="soft"]') as HTMLElement;
    expect(rgbaOf(underFillOf(soft))).toEqual(rgbaOf(statusColors(lightColors, "error").wash));
    const chip = container.querySelector('[data-testid="chip"]') as HTMLElement;
    expect(rgbaOf(underFillOf(chip))).toEqual(rgbaOf(alpha(palette["blue-500"], HUE_SOFT.light)));
    const chipLabel = Array.from(chip.querySelectorAll("*")).find((n) => n.textContent === "Design" && (n as HTMLElement).style.color) as HTMLElement;
    expect(rgbaOf(chipLabel.style.color)).toEqual(rgbaOf(alpha(palette["blue-800"], 1)));
    // A keycap is the plain control material.
    expect(rgbaOf(underFillOf(container.querySelector('[data-testid="kbd"]') as HTMLElement))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
  });

  it("holds every hue's deeper label at 4.5:1 over its chip wash on the page, a content pane and a control puck, in every palette", () => {
    const hues = Object.keys(palette).filter((k) => k.endsWith("-500")).map((k) => k.slice(0, -4));
    expect(hues.length).toBeGreaterThan(10);
    // The panes differ by platform: the web frost's tints and the native set.
    for (const look of LOOKS) {
      for (const [platform, g] of [["web", look.webGlass], ["native", look.nativeGlass]] as const) {
        const { name: scheme, tokens: t } = look;
        const dark = look.scheme === "dark";
        const bases = [t.background, composite(g["glass-tint-content"], t.background), composite(g["glass-tint-control"], composite(g["glass-tint-content"], t.background))];
        for (const hue of hues) {
          const wash = alpha(palette[`${hue}-500`], dark ? HUE_SOFT.dark : HUE_SOFT.light);
          const ink = palette[`${hue}-${dark ? 300 : 800}`];
          for (const base of bases) {
            expect(contrastRatio(composite(wash, base), ink), `${platform} ${scheme} ${hue} over ${base}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("paints a toned pane's wash IN PLACE of the layer's tint, so its ink reads as it does over the page", async () => {
    // A pane's tint replaces the layer's under-fill (surfaceUnderFill): the soft Badge's
    // control puck and the toned Alert's content pane are the wash alone over the material.
    // Composited over the control puck instead, the lighter dark-mode inks would fall under
    // 4.5:1 on the native frost (success about 3.96:1), which is why the wash never stacks on it.
    const { container } = await renderGlass(
      <>
        <Badge destructive testID="soft">Blocked</Badge>
        <Alert success title="Saved" description="Every change is stored." testID="alert" />
      </>,
    );
    expect(rgbaOf(underFillOf(container.querySelector('[data-testid="soft"]') as HTMLElement))).toEqual(rgbaOf(statusColors(lightColors, "error").wash));
    expect(rgbaOf(underFillOf(container.querySelector('[data-testid="alert"]') as HTMLElement))).toEqual(rgbaOf(statusColors(lightColors, "success").wash));
    for (const look of LOOKS) {
      const t = look.tokens;
      for (const tone of ["success", "warning", "error", "info"] as const) {
        const { ink, wash } = statusColors(t, tone);
        const bed = composite(wash, t.background);
        expect(contrastRatio(bed, ink), `${look.name} ${tone} ink`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(bed, t.foreground), `${look.name} ${tone} Alert body`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("the solid recipe's 700/400 label is what the deeper step replaces (it dips under 4.5:1 on the wash)", () => {
    const wash = alpha(palette["orange-500"], HUE_SOFT.light);
    expect(contrastRatio(composite(wash, lightColors.background), palette["orange-700"])).toBeLessThan(4.5);
    expect(contrastRatio(composite(wash, lightColors.background), palette["orange-800"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("field boxes", () => {
  it("an Input box drops its fill and resting hairline for the pane, and an errored box keeps its destructive border over a destructive wash", async () => {
    const { container } = await renderGlass(
      <>
        <Input label="Name" testID="name" />
        <Input label="Email" error testID="email" />
      </>,
    );
    const name = container.querySelector('[data-testid="name"]') as HTMLElement;
    expect(name.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(name.style.borderColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(rgbaOf(underFillOf(name.parentElement as HTMLElement))).toEqual(rgbaOf(alpha(lightColors.card, 0.22)));
    const email = container.querySelector('[data-testid="email"]') as HTMLElement;
    expect(rgbaOf(email.style.borderColor)).toEqual(rgbaOf(alpha(lightColors.destructive, 1)));
    expect(rgbaOf(underFillOf(email.parentElement as HTMLElement))).toEqual(rgbaOf(alpha(lightColors.destructive, 0.18)));
  });
});

describe("solid mode", () => {
  it("renders no material anywhere and keeps the opaque fills", async () => {
    const { container } = await renderGlass(
      <>
        <Button primary testID="save">Save</Button>
        <Input label="Name" testID="name" />
        <Switch defaultChecked testID="on" accessibilityLabel="Notifications" />
        <Badge status success>Active</Badge>
        <Chip blue>Design</Chip>
        <Kbd>⌘</Kbd>
        <Tabs pills tabs={["Overview", "Activity"]} />
        <Pagination total={3} />
      </>,
      true,
    );
    expect(materialLayers(container)).toBe(0);
    expect(rgbaOf((container.querySelector('[data-testid="save"]') as HTMLElement).style.backgroundColor)).toEqual(rgbaOf(alpha(actionFill(lightColors), 1)));
    expect(rgbaOf((container.querySelector('[data-testid="name"]') as HTMLElement).style.backgroundColor)).toEqual(rgbaOf(alpha(lightColors.card, 1)));
  });

  it("the aurora is not a base the pucks are tuned against, but the brand ink still clears 4.5:1 over it", () => {
    for (const { name: scheme, tokens: t } of LOOKS) {
      for (const orb of [brandColors["orb-indigo"], brandColors["orb-violet"], brandColors["orb-cyan"]]) {
        expect(contrastRatio(composite(brandTint(t.primary, t.background), orb), t["primary-foreground"]), `${scheme} primary over ${orb}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
