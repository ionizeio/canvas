import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors, mintColors, widths, type ColorTokens } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { actionFill } from "../src/style/action.ts";
import { typeScale } from "../src/style/type-scale.ts";
import * as skins from "../src/molecules/form/form.styles.ts";
import { Form, FormSection } from "../src/molecules/form/form.tsx";
import { Form as IOSForm } from "../src/molecules/form/form.ios.tsx";
import { Form as AndroidForm } from "../src/molecules/form/form.android.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { platformBlocks, platformValue, pxValue } from "../tools/tokens/css-tokens.ts";
import { layoutElement } from "./entrance-layout.ts";

// Form takes Dark Factory's form on the web and Android (SKN-6e): its MintDialog's rhythm
// (rows 18 apart, the actions row one more row with its ghost Cancel, the neutral hairline
// pill the kit's web Button draws for `outline`, beside the raised primary submit, 10
// apart), its AutoGrid's two-up grid (14 apart, a 200 cell floor, at most two columns, so
// two-up from 414) and its SectionHeading's type. Android aliases the web skin and still
// injects its Material 3 Button; iOS keeps its SwiftUI form.

afterEach(cleanup);

const ROOT = join(import.meta.dir, "..");
const PALETTES: Array<[string, ColorTokens, { dark?: boolean; mint?: boolean }]> = [
  ["blush", lightColors, {}],
  ["mint", mintColors, { mint: true }],
  ["dark", darkColors, { dark: true }],
];
// A colour as "r,g,b,a" (alpha to two places), whether a token's hex or rgba or the DOM's rgb.
function norm(color: string): string {
  if (color === "transparent") return "0,0,0,0.00";
  const m = (color.startsWith("#") ? alpha(color, 1) : color).match(/rgba?\(([^)]*)\)/);
  if (!m) throw new Error(`not a colour: ${color}`);
  const [r, g, b, a = "1"] = m[1]!.split(",").map((v) => v.trim());
  return `${r},${g},${b},${Number(a).toFixed(2)}`;
}

describe("the skins", () => {
  it("Android aliases the web skin and still injects its Material 3 Button; iOS keeps its own", () => {
    expect(skins.androidSkin).toBe(skins.webSkin);
    expect(skins.iosSkin).not.toBe(skins.webSkin);
    const android = readFileSync(join(ROOT, "src/molecules/form/form.android.tsx"), "utf8");
    expect(android).toContain("createForm(androidSkin, ButtonAndroid)");
    expect(android).toContain('from "../../atoms/button/button.android.js"');
  });

  it("gives the web Dark Factory's rhythm, grid and actions", () => {
    const web = skins.webSkin;
    expect(web.stack).toEqual({ gap: 18 });
    expect(web.sectionStack).toEqual({ gap: 12 });
    // One more row at the form's rhythm: no margin of its own, the pair 10 apart.
    expect(web.actions).toEqual({ flexDirection: "row", justifyContent: "flex-end", gap: 10 });
    expect(web.twoColumnGap).toBe(14);
    expect(web.twoColumnFrom).toBe(414);
    expect(web.twoColumnFrom).toBe(2 * (skins.twoColumnItem.minWidth as number) + web.twoColumnGap);
    expect(web.submitButton).toEqual({ raised: true });
  });

  it("sets a web section in Dark Factory's heading over its 12 / 500 muted meta line", () => {
    for (const [name, t] of PALETTES) {
      expect(skins.webSkin.sectionTitle(t), name).toEqual({ ...typeScale.heading, color: t.foreground });
      expect(skins.webSkin.sectionTitle(t), name).toMatchObject({ fontSize: 14, lineHeight: 19, fontWeight: "700" });
      expect(skins.webSkin.sectionDescription(t), name).toEqual({ fontSize: 12, lineHeight: 17, fontWeight: "500", marginTop: 4, color: t["muted-foreground"] });
    }
  });

  it("keeps the iOS SwiftUI form: its type, its 20 rhythm, the outline Cancel and the plain submit", () => {
    const ios = skins.iosSkin;
    expect(ios.sectionTitle(lightColors)).toEqual({ fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: -0.08, color: lightColors.foreground });
    expect(ios.sectionDescription(lightColors)).toEqual({ marginTop: 4, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: lightColors["muted-foreground"] });
    expect(ios.actions).toEqual({ marginTop: 8, flexDirection: "row", justifyContent: "flex-end", gap: 12 });
    expect(ios.stack).toEqual({ gap: 20 });
    expect(ios.sectionStack).toEqual({ gap: 12 });
    expect(ios.twoColumnGap).toBe(16);
    // Two-up only past the lg step, as before.
    expect(ios.twoColumnFrom).toBe(widths.lg + 1);
    expect(ios.submitButton).toEqual({});
  });

  it("puts exactly two two-up cells on a line at every width from the web's 414 up", () => {
    // The cell's hypothetical width is its 40% basis, floored at 200; a line takes the
    // cells whose sizes and gaps fit, as CSS and Yoga break a wrapping row.
    const basis = Number.parseFloat(String(skins.twoUpCell.flexBasis)) / 100;
    const floor = skins.twoColumnItem.minWidth as number;
    const gap = skins.webSkin.twoColumnGap;
    for (let width = skins.webSkin.twoColumnFrom; width <= 2400; width++) {
      const cell = Math.max(basis * width, floor);
      expect(2 * cell + gap <= width, `two fit at ${width}`).toBe(true);
      expect(3 * cell + 2 * gap > width, `three do not fit at ${width}`).toBe(true);
    }
    expect(skins.twoUpCell).toEqual({ flexGrow: 1, flexShrink: 1, flexBasis: "40%" });
  });
});

describe("the rendered web form", () => {
  const renderForm = (flags: { dark?: boolean; mint?: boolean }) =>
    render(
      <ThemeProvider light={!flags.dark} dark={flags.dark} mint={flags.mint} solid>
        <Form submitLabel="Save" cancelLabel="Cancel" testID="form">
          <FormSection title="Personal info" description="Shown on your public profile.">
            <Input label="Full name" />
          </FormSection>
        </Form>
      </ThemeProvider>,
    );

  it("draws the rhythm, the section type and the actions in blush, mint and dark", () => {
    for (const [name, t, flags] of PALETTES) {
      renderForm(flags);
      const form = screen.getByTestId("form");
      expect(form.style.rowGap || form.style.gap, name).toMatch(/^18px/);
      const title = screen.getByText("Personal info");
      expect({ size: title.style.fontSize, line: title.style.lineHeight, weight: title.style.fontWeight, color: norm(title.style.color) }, name)
        .toEqual({ size: "14px", line: "19px", weight: "700", color: norm(t.foreground) });
      const meta = screen.getByText("Shown on your public profile.");
      expect({ size: meta.style.fontSize, line: meta.style.lineHeight, weight: meta.style.fontWeight, color: norm(meta.style.color) }, name)
        .toEqual({ size: "12px", line: "17px", weight: "500", color: norm(t["muted-foreground"]) });

      const cancel = screen.getByRole("button", { name: "Cancel" });
      const save = screen.getByRole("button", { name: "Save" });
      // Dark Factory's ghost Cancel is its neutral hairline pill, the kit's outline Button:
      // no fill, the 1px `border` hairline, the foreground label, no glow.
      expect(norm(cancel.style.backgroundColor), name).toBe("0,0,0,0.00");
      expect(cancel.style.borderTopWidth || cancel.style.borderWidth, name).toBe("1px");
      expect(norm(cancel.style.borderTopColor || cancel.style.borderColor), name).toBe(norm(t.border));
      expect(norm(screen.getByText("Cancel").style.color), name).toBe(norm(t.foreground));
      expect(cancel.style.boxShadow, name).toBe("");
      // The raised primary submit rests on the glow in the action colour.
      expect(norm(save.style.backgroundColor), name).toBe(norm(actionFill(t)));
      expect(save.style.boxShadow, name).toMatch(/12px 22px -10px/);
      // The actions row: the pair 10 apart, no margin above it (the form's 18 is the gap).
      // (happy-dom proxies a <form>, so the row is matched by its style, not by identity.)
      let row: HTMLElement | null = save;
      while (row && row.style.justifyContent !== "flex-end") row = row.parentElement;
      expect(row?.parentElement?.getAttribute("data-testid"), name).toBe("form");
      expect(row!.style.rowGap || row!.style.gap, name).toMatch(/10px/);
      expect(row!.style.marginTop, name).toBe("");
      cleanup();
    }
  });

  it("keeps a disabled form's submit off its glow", () => {
    render(
      <ThemeProvider light solid>
        <Form submitLabel="Save" cancelLabel="Cancel" disabled>
          <Input label="Full name" />
        </Form>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" }).style.boxShadow).toBe("");
  });
});

describe("the two-column flow", () => {
  const cellsOf = (wrapper: HTMLElement) => [...wrapper.children] as HTMLElement[];
  // The rows wrapper is the form's child that holds the cells (happy-dom proxies a <form>,
  // so it is matched by the form's test id, not by identity).
  const wrapperOf = () => {
    let node: HTMLElement | null = screen.getByPlaceholderText("Ada");
    while (node && node.parentElement?.getAttribute("data-testid") !== "two-up") node = node.parentElement;
    return node!;
  };
  const renderTwoUp = (FormComponent: typeof Form) =>
    render(
      <ThemeProvider light solid>
        <FormComponent twoColumn testID="two-up">
          <Input label="First name" placeholder="Ada" />
          <Input label="Last name" placeholder="King" />
          <Input label="Email" placeholder="ada@example.com" />
        </FormComponent>
      </ThemeProvider>,
    );

  it("goes two-up on the web from a 414 row, 14 apart, two cells to a line", () => {
    renderTwoUp(Form);
    layoutElement(wrapperOf(), { width: 413, height: 200 });
    // Stacked, the column does not wrap, so its cells stretch to the form's width.
    const stacked = wrapperOf();
    expect(stacked.style.flexDirection).toBe("column");
    expect(stacked.style.flexWrap).toBe("nowrap");
    expect(stacked.style.rowGap || stacked.style.gap).toMatch(/^14px/);
    for (const cell of cellsOf(stacked)) expect(cell.style.flexBasis).toBe("auto");
    layoutElement(wrapperOf(), { width: 414, height: 200 });
    const row = wrapperOf();
    expect(row.style.flexDirection).toBe("row");
    expect(row.style.flexWrap).toBe("wrap");
    expect(row.style.rowGap || row.style.gap).toMatch(/^14px/);
    for (const cell of cellsOf(row)) {
      expect(cell.style.flexBasis).toBe("40%");
      expect(cell.style.minWidth).toBe("200px");
    }
  });

  it("takes the same grid on Android and keeps the iOS grid past the lg step, 16 apart", () => {
    renderTwoUp(AndroidForm);
    layoutElement(wrapperOf(), { width: 414, height: 200 });
    expect(wrapperOf().style.flexDirection).toBe("row");
    cleanup();
    renderTwoUp(IOSForm);
    layoutElement(wrapperOf(), { width: 512, height: 200 });
    expect(wrapperOf().style.flexDirection).toBe("column");
    layoutElement(wrapperOf(), { width: 513, height: 200 });
    const row = wrapperOf();
    expect(row.style.flexDirection).toBe("row");
    expect(row.style.rowGap || row.style.gap).toMatch(/^16px/);
  });
});

describe("the platform actions", () => {
  it("renders iOS's outline Cancel and plain primary submit", () => {
    render(
      <ThemeProvider light solid>
        <IOSForm submitLabel="Save" cancelLabel="Cancel">
          <Input label="Full name" />
        </IOSForm>
      </ThemeProvider>,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel.style.borderTopWidth || cancel.style.borderWidth).toBe("1px");
    expect(norm(cancel.style.borderTopColor || cancel.style.borderColor)).toBe(norm(lightColors.input));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.style.boxShadow).toBe("");
  });

  it("renders Android's Material 3 Buttons as an outlined Cancel and a raised primary submit", () => {
    render(
      <ThemeProvider light solid>
        <AndroidForm submitLabel="Save" cancelLabel="Cancel">
          <Input label="Full name" />
        </AndroidForm>
      </ThemeProvider>,
    );
    // The Material 3 outlined button: no fill, a 1dp outline in `input`.
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(norm(cancel.style.backgroundColor)).toBe("0,0,0,0.00");
    expect(cancel.style.borderTopWidth || cancel.style.borderWidth).toBe("1px");
    expect(norm(cancel.style.borderTopColor || cancel.style.borderColor)).toBe(norm(lightColors.input));
    // Android draws a raised glow on the button's ripple-clip wrapper (button-look.test.tsx).
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.parentElement!.style.boxShadow).toMatch(/12px 22px -10px/);
  });
});

describe("the CSS hand-off", () => {
  const blocks = platformBlocks(readFileSync(join(ROOT, "styles/tokens/platforms.css"), "utf8"));
  const px = (platform: "web" | "ios" | "android", name: string) => pxValue(platformValue(blocks, platform, name));

  it("describes the web form, which Android reads, and the iOS form", () => {
    for (const platform of ["web", "android"] as const) {
      expect({
        stack: px(platform, "p-form-stack"),
        section: px(platform, "p-form-section-stack"),
        actionsGap: px(platform, "p-form-actions-gap"),
        actionsTop: px(platform, "p-form-actions-top"),
        gridGap: px(platform, "p-form-grid-gap"),
        gridFrom: px(platform, "p-form-grid-from"),
        title: [px(platform, "p-form-title"), px(platform, "p-form-title-lh"), platformValue(blocks, platform, "p-form-title-weight")],
        desc: [px(platform, "p-form-desc"), px(platform, "p-form-desc-lh"), platformValue(blocks, platform, "p-form-desc-weight")],
      }, platform).toEqual({
        stack: 18, section: 12, actionsGap: 10, actionsTop: 0, gridGap: 14, gridFrom: 414,
        title: [14, 19, "700"], desc: [12, 17, "500"],
      });
    }
    expect(Object.keys(blocks.android.decls).filter((name) => name.startsWith("p-form-"))).toEqual([]);
    expect({
      stack: px("ios", "p-form-stack"),
      actionsGap: px("ios", "p-form-actions-gap"),
      actionsTop: px("ios", "p-form-actions-top"),
      gridGap: px("ios", "p-form-grid-gap"),
      gridFrom: px("ios", "p-form-grid-from"),
      title: [px("ios", "p-form-title"), px("ios", "p-form-title-lh"), platformValue(blocks, "ios", "p-form-title-weight")],
      desc: [px("ios", "p-form-desc"), px("ios", "p-form-desc-lh"), platformValue(blocks, "ios", "p-form-desc-weight")],
    }).toEqual({ stack: 20, actionsGap: 12, actionsTop: 8, gridGap: 16, gridFrom: 513, title: [13, 18, "600"], desc: [13, 18, "400"] });
  });
});
