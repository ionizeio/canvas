import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
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
import { Input } from "../src/atoms/input/input.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Field } from "../src/molecules/field/field.tsx";
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
    expect(fieldDisabled(t, false)).toEqual({ frame: { borderColor: t.border, backgroundColor: "transparent" }, ink: t["muted-foreground"] });
    // The keyboard can still reach a read-only host, so focus stays visible.
    expect(fieldDisabled(t, true).frame.borderColor).toBe(t.ring);
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
});
