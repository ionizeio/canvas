import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { PhoneInput as PhoneInputWeb, PHONE_COUNTRIES, flagOf } from "../src/molecules/phone-input/phone-input.tsx";
import { PhoneInput as PhoneInputIOS } from "../src/molecules/phone-input/phone-input.ios.tsx";
import { PhoneInput as PhoneInputAndroid } from "../src/molecules/phone-input/phone-input.android.tsx";
import { Field as FieldWeb } from "../src/molecules/field/field.tsx";
import { Field as FieldIOS } from "../src/molecules/field/field.ios.tsx";
import { iosSkin, webSkin, androidSkin } from "../src/molecules/phone-input/phone-input.styles.ts";
import { layoutEntrance } from "./entrance-layout.ts";

// PhoneInput: the country segment (flag + caret) opens a country list, picking a row
// swaps the inline dial code, and the number field is a real phone-pad input the
// label names. Shell behaviour is shared by the three skins, so the journeys run on
// every skin; the country segment's state colours are an iOS skin decision.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

const SKINS = [
  ["web", PhoneInputWeb],
  ["ios", PhoneInputIOS],
  ["android", PhoneInputAndroid],
] as const;

describe("PhoneInput country data", () => {
  it("derives a flag from the ISO code and tolerates a non-code", () => {
    expect(flagOf("US")).toBe("🇺🇸");
    expect(flagOf("gb")).toBe("🇬🇧");
    expect(flagOf("USA")).toBe("");
  });

  it("ships a curated list with unique codes, plus-prefixed dial codes, sorted by name", () => {
    const codes = PHONE_COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of PHONE_COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.dialCode).toMatch(/^\+\d{1,3}$/);
    }
    const names = PHONE_COUNTRIES.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b, "en"))).toEqual(names);
    expect(PHONE_COUNTRIES.find((c) => c.code === "US")?.dialCode).toBe("+1");
    expect(PHONE_COUNTRIES.find((c) => c.code === "GB")?.dialCode).toBe("+44");
  });
});

describe("PhoneInput journeys", () => {
  for (const [plat, PhoneInput] of SKINS) {
    it(`${plat}: the label names a phone-pad field that starts on the default country`, () => {
      ui(<PhoneInput label="Phone number" defaultCountry="US" placeholder="Add your phone number" />);
      const field = screen.getByLabelText("Phone number") as HTMLInputElement;
      expect(field.tagName.toLowerCase()).toBe("input");
      expect(field.getAttribute("inputmode")).toBe("tel");
      expect(screen.getByRole("button", { name: "Country, United States +1" })).toBeTruthy();
      expect(screen.getByText("+1")).toBeTruthy();
    });

    it(`${plat}: the segment opens the list, and picking a row swaps the dial code and reports the code`, () => {
      const picked: string[] = [];
      ui(<PhoneInput label="Phone number" defaultCountry="US" onCountryChange={(c) => picked.push(c)} />);
      const segment = screen.getByRole("button", { name: "Country, United States +1" });
      expect(segment.getAttribute("aria-haspopup")).toBe("listbox");
      fireEvent.click(segment);
      layoutEntrance(screen.getByRole("listbox", { hidden: true }), { width: 320, height: 200 });
      const list = screen.getByRole("listbox", { name: "Country" });
      expect(segment.getAttribute("aria-controls")).toBe(list.id);
      fireEvent.click(screen.getByRole("option", { name: "United Kingdom +44" }));
      expect(picked).toEqual(["GB"]);
      expect(screen.getByRole("button", { name: "Country, United Kingdom +44" })).toBeTruthy();
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(screen.getByText("+44")).toBeTruthy();
    });

    it(`${plat}: typing reports the national number`, () => {
      const seen: string[] = [];
      ui(<PhoneInput label="Phone number" onChangeText={(v) => seen.push(v)} />);
      fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "415" } });
      expect(seen).toEqual(["415"]);
    });
  }

  // The literal-titled journey the interaction registry (tools/interactions) cites.
  it("picking a country from the segment's list swaps the dial code and reports the code", () => {
    const picked: string[] = [];
    ui(<PhoneInputWeb label="Phone number" defaultCountry="US" onCountryChange={(c) => picked.push(c)} />);
    fireEvent.click(screen.getByRole("button", { name: "Country, United States +1" }));
    layoutEntrance(screen.getByRole("listbox", { hidden: true }), { width: 320, height: 200 });
    fireEvent.click(screen.getByRole("option", { name: "Japan +81" }));
    expect(picked).toEqual(["JP"]);
    expect(screen.getByText("+81")).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("a controlled country stays put until the parent changes it", () => {
    ui(<PhoneInputWeb label="Phone number" country="FR" />);
    fireEvent.click(screen.getByRole("button", { name: "Country, France +33" }));
    layoutEntrance(screen.getByRole("listbox", { hidden: true }), { width: 320, height: 200 });
    fireEvent.click(screen.getByRole("option", { name: "Germany +49" }));
    expect(screen.getByRole("button", { name: "Country, France +33" })).toBeTruthy();
  });

  it("a custom list replaces the default one and the first row is the default country", () => {
    ui(<PhoneInputWeb label="Phone number" countries={[{ code: "NZ", name: "New Zealand", dialCode: "+64" }, { code: "AU", name: "Australia", dialCode: "+61" }]} />);
    expect(screen.getByRole("button", { name: "Country, New Zealand +64" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Country, New Zealand +64" }));
    layoutEntrance(screen.getByRole("listbox", { hidden: true }), { width: 320, height: 200 });
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("disabled and read-only fields keep the list closed", () => {
    ui(
      <>
        <PhoneInputWeb label="Off" disabled />
        <PhoneInputWeb label="Locked" readOnly defaultValue="555" />
      </>,
    );
    for (const name of ["Off", "Locked"]) {
      expect((screen.getByLabelText(name) as HTMLInputElement).readOnly || (screen.getByLabelText(name) as HTMLInputElement).disabled).toBe(true);
    }
    fireEvent.click(screen.getAllByRole("button", { name: /^Country/ })[1]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("required marks the field programmatically and error flags it invalid", () => {
    ui(<PhoneInputWeb label="Phone number" required error />);
    const field = screen.getByLabelText("Phone number");
    expect(field.getAttribute("aria-required")).toBe("true");
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Field delegates into PhoneInput", () => {
  for (const [plat, Field, PhoneInput] of [["web", FieldWeb, PhoneInputWeb], ["ios", FieldIOS, PhoneInputIOS]] as const) {
    it(`${plat}: the Field label names the number field and the error message describes it`, () => {
      ui(
        <Field label="Phone number" error="Invalid phone number.">
          <PhoneInput defaultValue="(415) 72" />
        </Field>,
      );
      const field = screen.getByLabelText("Phone number");
      expect(field.getAttribute("aria-invalid")).toBe("true");
      const message = screen.getByText("Invalid phone number.");
      expect(field.getAttribute("aria-describedby")).toBe(message.id);
      // One label only: Field hands it down rather than drawing a second one.
      expect(screen.getAllByText("Phone number")).toHaveLength(1);
    });
  }
});

describe("the iOS country segment follows the field state", () => {
  const t = lightColors;
  it("divides with the resting hairline, the ring, or destructive", () => {
    expect(iosSkin.country(t, { focused: false, error: false }).borderColor).toBe(t["field-border"]);
    expect(iosSkin.country(t, { focused: true, error: false }).borderColor).toBe(t.ring);
    expect(iosSkin.country(t, { focused: true, error: true }).borderColor).toBe(t.destructive);
    expect(iosSkin.country(t, { focused: false, error: false }).borderEndWidth).toBe(1);
  });
  it("references the platform's own Input and Select skins for the box and the menu", () => {
    for (const skin of [webSkin, iosSkin, androidSkin]) {
      expect(typeof skin.field.groupContainer).toBe("function");
      expect(typeof skin.menu.panel).toBe("function");
    }
  });
});
