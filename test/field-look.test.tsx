import { afterEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { blockDeclarations } from "../tools/tokens/css-tokens.ts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors, mintColors } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { typeScale } from "../src/style/type-scale.ts";
import {
  FIELD_HEIGHT,
  FIELD_ICON,
  FIELD_ICON_GUTTER,
  FIELD_INSET,
  FIELD_INSET_Y,
  FIELD_LABEL_GAP,
  fieldAddon,
  fieldDisabled,
  fieldFrame,
  fieldLabel,
  fieldMultilineValue,
  fieldNote,
  fieldValue,
  type FieldSize,
} from "../src/style/field-look.ts";
import * as inputSkins from "../src/atoms/input/input.styles.ts";
import * as textareaSkins from "../src/atoms/textarea/textarea.styles.ts";
import * as fieldSkins from "../src/molecules/field/field.styles.ts";
import * as selectSkins from "../src/atoms/select/select.styles.ts";
import * as autocompleteSkins from "../src/atoms/autocomplete/autocomplete.styles.ts";
import { Select } from "../src/atoms/select/select.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { clearSurfaceTint } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Field } from "../src/molecules/field/field.tsx";
import { PhoneInput } from "../src/molecules/phone-input/phone-input.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";

// The web Input, Textarea and Field are Dark Factory's field (SKN-6a): its TextField and
// FieldFrame, read from one recipe (src/style/field-look.ts) so the field families cannot
// drift. iOS and Android keep their platform fields.

afterEach(cleanup);

const t = lightColors;
const SIZES: FieldSize[] = ["small", "base", "large"];
const flat = (value: string) => value.replace(/\s/g, "");
const rgbaOf = (hex: string) => flat(alpha(hex, 1)).replace(/,1\)$/, ",1.00)");

describe("Dark Factory's field recipe", () => {
  it("draws Dark Factory's frame: the field corner, a 1px border by state and the field well", () => {
    expect(fieldFrame(t, { focused: false, error: false })).toEqual({ borderRadius: 10, borderWidth: 1, borderColor: t["field-border"], backgroundColor: t["field-fill"] });
    expect(fieldFrame(t, { focused: true, error: false }).borderColor).toBe(t.ring);
    expect(fieldFrame(t, { focused: true, error: true }).borderColor).toBe(t.destructive);
    // A token map without the optional roles falls back to the older field.
    const { "field-fill": _fill, "field-border": _border, ...legacy } = t;
    expect(fieldFrame(legacy as typeof t, { focused: false, error: false })).toMatchObject({ borderColor: t.input, backgroundColor: t.card });
  });

  it("is Dark Factory's 40px field at base with a 13 / 600 value, and derives small and large", () => {
    expect(FIELD_HEIGHT).toEqual({ small: 34, base: 40, large: 46 });
    expect(fieldValue("base")).toEqual({ fontSize: 13, lineHeight: 18, fontWeight: "600" });
    expect(fieldMultilineValue("base")).toEqual({ fontSize: 13, lineHeight: 20, fontWeight: "600" });
    expect([FIELD_INSET, FIELD_INSET_Y]).toEqual([12, 10]);
    for (const size of SIZES) {
      // The single line sits centred on whole pixels: the box less its border and line splits evenly.
      const inset = (FIELD_HEIGHT[size] - 2 - (fieldValue(size).lineHeight as number)) / 2;
      expect(Number.isInteger(inset), size).toBe(true);
      expect(fieldValue(size).fontWeight).toBe("600");
      expect(fieldValue(size).fontSize as number).toBeGreaterThanOrEqual(12);
    }
  });

  it("labels the box with Dark Factory's muted eyebrow and sets notes in its `small`", () => {
    expect(fieldLabel(t)).toEqual({ ...typeScale.eyebrow, color: t["muted-foreground"] });
    expect(FIELD_LABEL_GAP).toBe(6);
    expect(fieldNote(t, false)).toEqual({ ...typeScale.small, color: t["muted-foreground"] });
    expect(fieldNote(t, true).color).toBe(t["destructive-text"]);
  });

  it("draws a disabled field as Dark Factory's disabled controls: a hairline, no fill, the muted ink", () => {
    const hairline = { borderColor: t.border, backgroundColor: "transparent" };
    expect(fieldDisabled(t, false)).toEqual({ frame: hairline, addon: hairline, ink: t["muted-foreground"] });
    // The keyboard can still reach a read-only host, so focus stays visible, on the frame
    // alone: a box inside it keeps the resting hairline as its divider.
    expect(fieldDisabled(t, true).frame.borderColor).toBe(t.ring);
    expect(fieldDisabled(t, true).addon).toEqual(hairline);
  });

  it("keeps the kit's addon in Dark Factory's parts and its glyphs at the SearchField's 15px", () => {
    expect(fieldAddon(t, "left")).toMatchObject({ backgroundColor: t.muted, borderColor: t["field-border"], borderEndWidth: 1, paddingHorizontal: 12 });
    expect(fieldAddon(t, "right")).toMatchObject({ borderStartWidth: 1 });
    expect(FIELD_ICON).toBe(15);
    expect(FIELD_ICON_GUTTER).toBe(12 + 15 + 10);
  });
});

describe("the web field families read the recipe", () => {
  it("builds the web Input from it at every size", () => {
    const web = inputSkins.webSkin;
    for (const size of SIZES) {
      expect(web.text(t, size)).toEqual(fieldValue(size));
      expect(web.bareBox(size)).toEqual({ height: FIELD_HEIGHT[size] });
      expect(web.groupedHeight(size)).toBe(FIELD_HEIGHT[size]);
      expect(web.labelAbove!(t, size)).toEqual(fieldLabel(t));
    }
    expect(web.bareField(t, "input", false, false)).toMatchObject({ ...fieldFrame(t, { focused: false, error: false }), paddingHorizontal: 12 });
    expect(web.addonBox(t, "left", { focused: false, error: false })).toEqual(fieldAddon(t, "left"));
    expect([web.iconSize, web.labelGap, web.disabledOpacity]).toEqual([FIELD_ICON, FIELD_LABEL_GAP, 1]);
    expect(web.disabledLook).toBe(fieldDisabled);
  });

  it("builds the web Textarea and Field from it", () => {
    const web = textareaSkins.webSkin;
    expect(web.field(t, { focused: false, error: false })).toMatchObject({ ...fieldFrame(t, { focused: false, error: false }), paddingHorizontal: 12, paddingVertical: 10 });
    for (const size of SIZES) {
      expect(web.text!(size)).toEqual(fieldMultilineValue(size));
      expect(web.labelAbove!(t, size)).toEqual(fieldLabel(t));
    }
    expect(web.count(t, true)).toEqual(fieldNote(t, true));
    expect(web.disabledLook).toBe(fieldDisabled);
    const row = fieldSkins.webSkin;
    expect(row.stack).toMatchObject({ gap: FIELD_LABEL_GAP });
    expect(row.label(t)).toEqual(fieldLabel(t));
    expect(row.message(t, false)).toEqual(fieldNote(t, false));
  });

  it("paints the rendered web field: the well, the eyebrow, and the disabled look with no dim", () => {
    for (const tokens of [lightColors, mintColors, darkColors]) {
      const scheme = tokens === darkColors ? { dark: true } : { light: true };
      render(
        <ThemeProvider {...scheme} mint={tokens === mintColors} solid>
          <Input label="Email" testID="rest" />
          <Input label="Locked" disabled defaultValue="read me" testID="off" />
          <Textarea label="Notes" disabled defaultValue="read me" testID="notes" />
        </ThemeProvider>,
      );
      const rest = screen.getByTestId("rest");
      expect(flat(rest.style.backgroundColor)).toBe(flat(tokens["field-fill"]!).replace(/0\.7\)$/, "0.70)"));
      expect(flat(rest.style.height)).toBe("40px");
      const label = screen.getByText("Email");
      expect(label.style.textTransform).toBe("uppercase");
      expect(flat(label.style.color)).toBe(rgbaOf(tokens["muted-foreground"]));
      for (const id of ["off", "notes"]) {
        const off = screen.getByTestId(id);
        expect(flat(off.style.borderColor ?? off.style.borderTopColor)).toBe(rgbaOf(tokens.border));
        expect(off.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
        expect(flat(off.style.color)).toBe(rgbaOf(tokens["muted-foreground"]));
        // No dim anywhere up the field: the look carries the state.
        for (let node: HTMLElement | null = off; node && node !== document.body; node = node.parentElement) expect(node.style.opacity, id).toBe("");
      }
      cleanup();
    }
  });

  it("keeps a focused disabled field's ring on its frame, never on the boxes inside it", () => {
    const edge = (el: HTMLElement) => flat(el.style.borderColor || el.style.borderTopColor);
    // The nearest ancestor that draws an edge: the field's frame.
    const frameOf = (el: HTMLElement) => {
      let node = el.parentElement;
      while (node && !edge(node)) node = node.parentElement;
      return node!;
    };
    for (const tokens of [lightColors, mintColors, darkColors]) {
      const scheme = tokens === darkColors ? { dark: true } : { light: true };
      render(
        <ThemeProvider {...scheme} mint={tokens === mintColors} solid>
          <Input disabled prefix="$" suffix="USD" defaultValue="90.00" testID="amount" />
          <PhoneInput disabled defaultValue="5551234567" testID="phone" />
        </ThemeProvider>,
      );
      const amount = screen.getByTestId("amount");
      const phone = screen.getByTestId("phone");
      fireEvent.focus(amount);
      fireEvent.focus(phone);
      for (const input of [amount, phone]) expect(edge(frameOf(input))).toBe(rgbaOf(tokens.ring));
      const boxes = [screen.getByText("$").parentElement!, screen.getByText("USD").parentElement!, screen.getByTestId("phone-country")];
      for (const box of boxes) {
        expect(edge(box)).toBe(rgbaOf(tokens.border));
        expect(box.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
      }
      cleanup();
    }
  });

  it("gives a Field row around a Switch the same eyebrow a delegated Input takes", () => {
    render(
      <ThemeProvider light solid>
        <Field label="Notifications"><Switch>Release activity</Switch></Field>
        <Field label="Email"><Input /></Field>
      </ThemeProvider>,
    );
    const own = screen.getByText("Notifications");
    const delegated = screen.getByText("Email");
    for (const key of ["fontSize", "fontWeight", "letterSpacing", "textTransform", "color"] as const) {
      expect(own.style[key], key).toBe(delegated.style[key]);
    }
  });
});

// The web Select trigger and the Autocomplete field are the same field (SKN-6b): the
// recipe's frame, value, eyebrow, helper and disabled look, a 14px chevron-down Icon, and
// under glass the clear well every web field is (the Select trigger used to take the
// frosted control puck).
describe("the web Select and Autocomplete read the recipe", () => {
  const SELECT_SIZES = [["small", "small"], ["default", "base"], ["large", "large"]] as const;

  it("builds the web Select trigger and the Autocomplete field from it at every size", () => {
    const select = selectSkins.webSkin;
    const ac = autocompleteSkins.webSkin;
    for (const [size, field] of SELECT_SIZES) {
      expect(select.trigger(t, size, false)).toMatchObject({ ...fieldFrame(t, { focused: false, error: false }), paddingHorizontal: 12, height: FIELD_HEIGHT[field] });
      expect(select.trigger(t, size, true).borderColor).toBe(t.ring);
      expect(select.valueText(t, size, true)).toEqual({ ...fieldValue(field), color: t.foreground });
      expect(select.valueText(t, size, false).color).toBe(t["muted-foreground"]);
      expect(select.label(t, size)).toEqual({ ...fieldLabel(t), marginBottom: FIELD_LABEL_GAP });
      // The chevron sits at the field's inset in both: the Autocomplete's 24px disclosure box
      // is pulled 5px into the end padding around the 14px glyph, 10px from the text.
      expect(ac.field(t, size, false)).toMatchObject({ ...fieldFrame(t, { focused: false, error: false }), paddingStart: 12, paddingEnd: 7, gap: 10, height: FIELD_HEIGHT[field] });
      expect(ac.field(t, size, true).borderColor).toBe(t.ring);
      expect(ac.fieldText(t, size, false)).toEqual({ ...fieldValue(field), color: t.foreground });
      expect(ac.label(t, size)).toEqual(select.label(t, size));
    }
    expect([select.chevronIcon, ac.chevronIcon, select.iconSize]).toEqual([14, 14, FIELD_ICON]);
    expect(ac.helper(t)).toEqual({ ...fieldNote(t, false), marginTop: FIELD_LABEL_GAP });
    expect([select.disabledLook, ac.disabledLook]).toEqual([fieldDisabled, fieldDisabled]);
    expect([select.disabledOpacity, ac.disabledOpacity]).toEqual([1, 1]);
    expect([select.liquid, ac.liquid]).toEqual([true, true]);
  });

  it("paints the rendered trigger and field: the well, the eyebrow, the chevron Icon, and the disabled look with no dim", () => {
    for (const tokens of [lightColors, mintColors, darkColors]) {
      const scheme = tokens === darkColors ? { dark: true } : { light: true };
      render(
        <ThemeProvider {...scheme} mint={tokens === mintColors} solid>
          <Select label="Region" defaultValue="Europe" options={["Americas", "Europe"]} testID="select" />
          <Select disabled label="Locked" defaultValue="Americas" options={["Americas", "Europe"]} testID="select-off" />
          <Autocomplete label="Person" options={["Ada", "Grace"]} testID="ac" />
          <Autocomplete disabled label="Owner" defaultValue="Ada" options={["Ada", "Grace"]} testID="ac-off" />
        </ThemeProvider>,
      );
      const trigger = screen.getByTestId("select");
      const field = screen.getByTestId("ac").parentElement!;
      for (const box of [trigger, field]) {
        expect(flat(box.style.backgroundColor)).toBe(flat(tokens["field-fill"]!).replace(/0\.7\)$/, "0.70)").replace(/0\.75\)$/, "0.75)"));
        expect(flat(box.style.height)).toBe("40px");
        // The chevron is the kit's decorative Icon (its SVG is a hidden view in the test DOM),
        // not the old text glyph.
        expect(box.querySelector('[aria-hidden="true"]'), "the chevron Icon").not.toBeNull();
        expect(box.textContent).not.toContain("▾");
      }
      for (const text of ["Region", "Person"]) {
        const label = screen.getByText(text);
        expect(label.style.textTransform).toBe("uppercase");
        expect(flat(label.style.color)).toBe(rgbaOf(tokens["muted-foreground"]));
      }
      const offTrigger = screen.getByTestId("select-off");
      const offField = screen.getByTestId("ac-off").parentElement!;
      for (const [box, value] of [[offTrigger, screen.getByText("Americas")], [offField, screen.getByTestId("ac-off")]] as const) {
        expect(flat(box.style.borderColor || box.style.borderTopColor)).toBe(rgbaOf(tokens.border));
        expect(box.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
        expect(flat(value.style.color)).toBe(rgbaOf(tokens["muted-foreground"]));
        for (let node: HTMLElement | null = value; node && node !== document.body; node = node.parentElement) expect(node.style.opacity, "no dim").toBe("");
      }
      cleanup();
    }
  });

  it("gives the web Select trigger the clear well under glass, its open ring painted over it", () => {
    render(<ThemeProvider light glass><Select label="Region" options={["Americas", "Europe"]} testID="select" /></ThemeProvider>);
    const trigger = screen.getByTestId("select");
    const painted = [...trigger.querySelectorAll<HTMLElement>('[data-testid="glass-material"]')];
    expect(painted).toHaveLength(1);
    expect(painted[0]!.querySelector('[style*="backdrop-filter"]'), "a clear well frosts nothing").toBeNull();
    // The clear well's under-fill, as react-native-web prints it (the alpha to two decimals).
    const quantized = (value: string) => {
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
      return m ? [m[1], m[2], m[3], (Math.round(Number(m[4] ?? 1) * 255) / 255).toFixed(2)].map(Number) : value;
    };
    expect(quantized((painted[0]!.children[0] as HTMLElement).style.backgroundColor)).toEqual(quantized(clearSurfaceTint(lightColors, false)));
    expect(screen.queryByTestId("text-entry-state-border")).toBeNull();
    act(() => { fireEvent.click(trigger); });
    const ring = screen.getByTestId("text-entry-state-border");
    expect(ring.parentElement).toBe(trigger);
    expect(flat(ring.style.borderColor)).toBe(rgbaOf(lightColors.ring));
    expect(trigger.style.borderColor).toContain("0.00");
  });
});

describe("the platform fields", () => {
  it("keep their own shapes on iOS and Android, and dim rather than take the web's disabled look", () => {
    for (const skins of [inputSkins, textareaSkins]) {
      expect(skins.iosSkin.disabledLook).toBeUndefined();
      expect(skins.androidSkin.disabledLook).toBeUndefined();
      expect(skins.iosSkin.labelAbove!(t, "base").textTransform).toBeUndefined();
    }
    expect(inputSkins.iosSkin.disabledOpacity).toBe(0.5);
    expect(inputSkins.androidSkin.disabledOpacity).toBe(0.38);
    expect(inputSkins.iosSkin.bareBox("base")).toEqual({ height: 44 });
    expect(inputSkins.androidSkin.bareBox("base")).toEqual({ height: 56 });
    expect(fieldSkins.iosSkin.label(t).textTransform).toBeUndefined();
    // Every M3 field's active indicator is `ring`, the Textarea's included.
    expect(textareaSkins.androidSkin.field(t, { focused: true, error: false }).borderBottomColor).toBe(t.ring);
  });

  it("keep the iOS and Android Select triggers, and give iOS the web's Autocomplete (iOS ships none)", () => {
    const [ios, android] = [selectSkins.iosSkin, selectSkins.androidSkin];
    expect([ios.chevronIcon, android.chevronIcon, ios.chevronGlyph, android.chevronGlyph]).toEqual([null, null, "▾", "⌄"]);
    expect([ios.disabledLook, android.disabledLook, ios.liquid, android.liquid]).toEqual([undefined, undefined, undefined, undefined]);
    expect([ios.disabledOpacity, android.disabledOpacity]).toEqual([0.4, 0.38]);
    expect(ios.trigger(t, "default", false)).toMatchObject({ height: 44, borderRadius: 8, backgroundColor: t.card });
    expect(android.trigger(t, "default", false)).toMatchObject({ height: 56, backgroundColor: t.muted });
    expect(autocompleteSkins.iosSkin).toBe(autocompleteSkins.webSkin);
    const ac = autocompleteSkins.androidSkin;
    expect([ac.chevronIcon, ac.disabledLook, ac.minTarget]).toEqual([null, undefined, 48]);
  });

  it("hand off each platform's Textarea line height as its skin draws it", () => {
    const css = readFileSync(new URL("../styles/tokens/platforms.css", import.meta.url), "utf8");
    const blocks = { web: ':root,[data-platform="web"]', ios: '[data-platform="ios"]', android: '[data-platform="android"]' } as const;
    for (const [platform, selector] of Object.entries(blocks)) {
      const skin = textareaSkins[`${platform as keyof typeof blocks}Skin`];
      // A skin without its own value type reads the shared `sizeText` (the Android skin).
      const value = skin.text ? skin.text("base") : textareaSkins.sizeText("base");
      expect(blockDeclarations(css, selector).decls["p-textarea-lh"], platform).toBe(`${value.lineHeight}px`);
    }
  });
});
