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
import { Tabs } from "../src/organisms/tabs/tabs.tsx";
import { Pagination } from "../src/atoms/pagination/pagination.tsx";
import { brandTint, surfaceUnderFill, BRAND_TINT_ALPHA, BRAND_INK_CONTRAST } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { alpha, composite, contrastRatio, inkOn } from "../src/style/color.ts";
import { glassByScheme, lightColors, darkColors, palette, brandColors, type ColorTokens } from "../src/style/tokens.ts";
import { statusHues, HUE_WASH } from "../src/style/status-hue.ts";

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
// reachable here is the Chromium web LENS, so the DOM cases override the user agent the
// way glass-lens.test.tsx does.

afterEach(cleanup);

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function overrideUserAgent(value: string) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  return () => {
    delete (window.navigator as unknown as Record<string, unknown>)["userAgent"];
  };
}

async function renderGlass(ui: React.ReactElement, solid = false) {
  const restore = overrideUserAgent(CHROME_UA);
  const result = render(<ThemeProvider glass={!solid} solid={solid}>{ui}</ThemeProvider>);
  if (!solid) await waitFor(() => expect(materialLayers(result.container)).toBeGreaterThan(0));
  return { ...result, restore };
}

// The material's lens layer is the one node carrying a `backdrop-filter`.
const materialLayers = (root: HTMLElement) => root.querySelectorAll("[style*='backdrop-filter']").length;
// The under-fill is the lens layer's previous sibling (layer order: under-fill, lens, rim).
const underFillOf = (root: HTMLElement): string => {
  const lens = root.querySelector("[style*='backdrop-filter']") as HTMLElement | null;
  const fill = lens?.previousElementSibling as HTMLElement | null;
  return fill?.style.backgroundColor ?? "";
};
// react-native-web prints every colour as `rgba(r, g, b, a)` with a two-decimal alpha, and
// a hex alpha() string prints a bare one, so colours compare as numbers, not strings.
const rgbaOf = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (!m) return value;
  return [Number(m[1]), Number(m[2]), Number(m[3]), Math.round((m[4] == null ? 1 : Number(m[4])) * 100) / 100];
};

const LIGHT = glassByScheme.light;

describe("brand-tinted glass pucks", () => {
  it("a primary Button is a brand puck: the container fill goes transparent and the primary colour is the under-fill", async () => {
    const { container, restore } = await renderGlass(<Button primary testID="save">Save</Button>);
    try {
      const button = container.querySelector('[data-testid="save"]') as HTMLElement;
      expect(button.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
      expect(materialLayers(button)).toBe(1);
      expect(rgbaOf(underFillOf(button))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
    } finally {
      restore();
    }
  });

  it("a destructive Button carries the destructive colour; ghost and link buttons take no material at all", async () => {
    const { container, restore } = await renderGlass(
      <>
        <Button destructive testID="delete">Delete</Button>
        <Button ghost testID="ghost">Cancel</Button>
        <Button link testID="link">Learn more</Button>
      </>,
    );
    try {
      const del = container.querySelector('[data-testid="delete"]') as HTMLElement;
      expect(rgbaOf(underFillOf(del))).toEqual(rgbaOf(brandTint(lightColors.destructive, lightColors.background)));
      expect(materialLayers(container.querySelector('[data-testid="ghost"]') as HTMLElement)).toBe(0);
      expect(materialLayers(container.querySelector('[data-testid="link"]') as HTMLElement)).toBe(0);
    } finally {
      restore();
    }
  });

  it("an outline Button is a plain control puck with its hairline dropped (the rim is the edge)", async () => {
    const { container, restore } = await renderGlass(<Button outline testID="more">More</Button>);
    try {
      const button = container.querySelector('[data-testid="more"]') as HTMLElement;
      expect(rgbaOf(underFillOf(button))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
      expect(button.style.borderColor).toBe("rgba(0, 0, 0, 0.00)");
    } finally {
      restore();
    }
  });

  it("a checked Switch track is brand glass and an unchecked one the plain control material", async () => {
    const { container, restore } = await renderGlass(
      <>
        <Switch defaultChecked testID="on" accessibilityLabel="Notifications" />
        <Switch testID="off" accessibilityLabel="Marketing" />
      </>,
    );
    try {
      const on = container.querySelector('[data-testid="on"]') as HTMLElement;
      const off = container.querySelector('[data-testid="off"]') as HTMLElement;
      expect(rgbaOf(underFillOf(on))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
      expect(rgbaOf(underFillOf(off))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
    } finally {
      restore();
    }
  });

  it("a checked Checkbox box is brand glass with the check on top", async () => {
    const { container, restore } = await renderGlass(<Checkbox defaultChecked testID="terms">Accept</Checkbox>);
    try {
      const row = container.querySelector('[data-testid="terms"]') as HTMLElement;
      expect(rgbaOf(underFillOf(row))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
      expect(row.textContent).toContain("✓");
    } finally {
      restore();
    }
  });

  it("the selected pill of a Tabs strip is a brand puck on a functional-layer track, its label in primary-foreground", async () => {
    const { container, restore } = await renderGlass(<Tabs pills tabs={["Overview", "Activity"]} testID="tabs" />);
    try {
      const strip = container.querySelector('[data-testid="tabs"]') as HTMLElement;
      // The track's own pane is the first material; the selected tab's puck follows.
      const fills = Array.from(strip.querySelectorAll("[style*='backdrop-filter']")).map((lens) => rgbaOf((lens.previousElementSibling as HTMLElement).style.backgroundColor));
      expect(fills[0]).toEqual(rgbaOf(LIGHT["glass-tint"]));
      expect(fills).toContainEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
      const selected = strip.querySelector('[aria-selected="true"]') as HTMLElement;
      const label = Array.from(selected.querySelectorAll("*")).find((n) => n.textContent === "Overview" && (n as HTMLElement).style.color) as HTMLElement;
      expect(rgbaOf(label.style.color)).toEqual(rgbaOf(alpha(lightColors["primary-foreground"], 1)));
    } finally {
      restore();
    }
  });

  it("the current page of a Pagination is a brand puck; the rest of the web tiles are plain control pucks", async () => {
    const { container, restore } = await renderGlass(<Pagination total={3} defaultPage={2} testID="pages" />);
    try {
      const pages = container.querySelector('[data-testid="pages"]') as HTMLElement;
      const current = pages.querySelector('[aria-current="page"]') as HTMLElement;
      expect(rgbaOf(underFillOf(current))).toEqual(rgbaOf(brandTint(lightColors.primary, lightColors.background)));
      const other = Array.from(pages.querySelectorAll('[role="button"]')).find((n) => n.getAttribute("aria-current") == null && n.textContent === "1") as HTMLElement;
      expect(rgbaOf(underFillOf(other))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
    } finally {
      restore();
    }
  });

  it("keeps the brand ink at 4.5:1 over the page in both schemes, densifying only the colours that need it", () => {
    for (const scheme of ["light", "dark"] as const) {
      const t: ColorTokens = scheme === "light" ? lightColors : darkColors;
      for (const brand of [t.primary, t.destructive]) {
        const fill = brandTint(brand, t.background);
        expect(contrastRatio(composite(fill, t.background), inkOn(brand)), `${scheme} ${brand}`).toBeGreaterThanOrEqual(BRAND_INK_CONTRAST);
        // The ink `inkOn` picks has the polarity of the ink the kit's tokens pair with the
        // fill (dark on the sky primary, white on the destructive red), and that real ink
        // clears the bar too.
        const tokenInk = brand === t.primary ? t["primary-foreground"] : t["destructive-foreground"];
        expect(inkOn(brand) === "#ffffff").toBe(contrastRatio("#ffffff", tokenInk) < contrastRatio("#0a0a0a", tokenInk));
        expect(contrastRatio(composite(fill, t.background), tokenInk), `${scheme} ${brand} token ink`).toBeGreaterThanOrEqual(BRAND_INK_CONTRAST);
      }
      // The sky primary stays at the sheer floor; the light-scheme destructive red, which
      // sits at 3.2:1 there, is the one that climbs.
      expect(brandTint(t.primary, t.background)).toBe(alpha(t.primary, BRAND_TINT_ALPHA));
      expect(surfaceUnderFill(glassByScheme[scheme], "control", t.primary, undefined, t.background)).toBe(alpha(t.primary, BRAND_TINT_ALPHA));
    }
    expect(brandTint(lightColors.destructive, lightColors.background)).not.toBe(alpha(lightColors.destructive, BRAND_TINT_ALPHA));
    expect(brandTint(darkColors.destructive, darkColors.background)).toBe(alpha(darkColors.destructive, BRAND_TINT_ALPHA));
  });
});

describe("hue washes", () => {
  it("a status Badge and a coloured Chip wash the material with the hue's mid step and step their label one deeper", async () => {
    const { container, restore } = await renderGlass(
      <>
        <Badge status success testID="status">Active</Badge>
        <Chip blue testID="chip">Design</Chip>
        <Kbd testID="kbd">⌘</Kbd>
      </>,
    );
    try {
      const badge = container.querySelector('[data-testid="status"]') as HTMLElement;
      expect(rgbaOf(underFillOf(badge))).toEqual(rgbaOf(alpha(palette[`${statusHues.success}-500`], HUE_WASH.light)));
      expect(badge.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
      const badgeLabel = Array.from(badge.querySelectorAll("*")).find((n) => n.textContent === "Active" && (n as HTMLElement).style.color) as HTMLElement;
      expect(rgbaOf(badgeLabel.style.color)).toEqual(rgbaOf(alpha(palette[`${statusHues.success}-800`], 1)));
      const chip = container.querySelector('[data-testid="chip"]') as HTMLElement;
      expect(rgbaOf(underFillOf(chip))).toEqual(rgbaOf(alpha(palette["blue-500"], HUE_WASH.light)));
      const chipLabel = Array.from(chip.querySelectorAll("*")).find((n) => n.textContent === "Design" && (n as HTMLElement).style.color) as HTMLElement;
      expect(rgbaOf(chipLabel.style.color)).toEqual(rgbaOf(alpha(palette["blue-800"], 1)));
      // A keycap is the plain control material.
      expect(rgbaOf(underFillOf(container.querySelector('[data-testid="kbd"]') as HTMLElement))).toEqual(rgbaOf(LIGHT["glass-tint-control"]));
    } finally {
      restore();
    }
  });

  it("holds every hue's deeper label at 4.5:1 over the page, over a content pane and over a control puck, in both schemes", () => {
    const hues = Object.keys(palette).filter((k) => k.endsWith("-500")).map((k) => k.slice(0, -4));
    expect(hues.length).toBeGreaterThan(10);
    for (const scheme of ["light", "dark"] as const) {
      const t = scheme === "light" ? lightColors : darkColors;
      const g = glassByScheme[scheme];
      const dark = scheme === "dark";
      const bases = [t.background, composite(g["glass-tint-content"], t.background), composite(g["glass-tint-control"], composite(g["glass-tint-content"], t.background))];
      for (const hue of hues) {
        const wash = alpha(palette[`${hue}-500`], dark ? HUE_WASH.dark : HUE_WASH.light);
        const ink = palette[`${hue}-${dark ? 300 : 800}`];
        for (const base of bases) {
          expect(contrastRatio(composite(wash, base), ink), `${scheme} ${hue} over ${base}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("the solid recipe's 700/400 label is what the deeper step replaces (it dips under 4.5:1 on the wash)", () => {
    const wash = alpha(palette["orange-500"], HUE_WASH.light);
    expect(contrastRatio(composite(wash, lightColors.background), palette["orange-700"])).toBeLessThan(4.5);
    expect(contrastRatio(composite(wash, lightColors.background), palette["orange-800"])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("field boxes", () => {
  it("an Input box drops its fill and resting hairline for the pane, and an errored box keeps its destructive border over a destructive wash", async () => {
    const { container, restore } = await renderGlass(
      <>
        <Input label="Name" testID="name" />
        <Input label="Email" error testID="email" />
      </>,
    );
    try {
      const name = container.querySelector('[data-testid="name"]') as HTMLElement;
      expect(name.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
      expect(name.style.borderColor).toBe("rgba(0, 0, 0, 0.00)");
      expect(rgbaOf(underFillOf(name.parentElement as HTMLElement))).toEqual(rgbaOf(alpha(lightColors.card, 0.22)));
      const email = container.querySelector('[data-testid="email"]') as HTMLElement;
      expect(rgbaOf(email.style.borderColor)).toEqual(rgbaOf(alpha(lightColors.destructive, 1)));
      expect(rgbaOf(underFillOf(email.parentElement as HTMLElement))).toEqual(rgbaOf(alpha(lightColors.destructive, 0.18)));
    } finally {
      restore();
    }
  });
});

describe("solid mode", () => {
  it("renders no material anywhere and keeps the opaque fills", async () => {
    const { container, restore } = await renderGlass(
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
    try {
      expect(materialLayers(container)).toBe(0);
      expect(rgbaOf((container.querySelector('[data-testid="save"]') as HTMLElement).style.backgroundColor)).toEqual(rgbaOf(alpha(lightColors.primary, 1)));
      expect(rgbaOf((container.querySelector('[data-testid="name"]') as HTMLElement).style.backgroundColor)).toEqual(rgbaOf(alpha(lightColors.card, 1)));
    } finally {
      restore();
    }
  });

  it("the aurora is not a base the pucks are tuned against, but the brand ink still clears 4.5:1 over it", () => {
    for (const scheme of ["light", "dark"] as const) {
      const t = scheme === "light" ? lightColors : darkColors;
      for (const orb of [brandColors["orb-indigo"], brandColors["orb-violet"], brandColors["orb-cyan"]]) {
        expect(contrastRatio(composite(brandTint(t.primary, t.background), orb), t["primary-foreground"]), `${scheme} primary over ${orb}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
