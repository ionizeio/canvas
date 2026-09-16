import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { Input as InputWeb } from "../src/atoms/input/input.tsx";
import { Input as InputIOS } from "../src/atoms/input/input.ios.tsx";
import { Input as InputAndroid } from "../src/atoms/input/input.android.tsx";
import { iosSkin, webSkin, androidSkin } from "../src/atoms/input/input.styles.ts";

// The trailing action glyphs the iOS input-field reference draws (its Password and
// Search fields): `passwordToggle` reveals and re-masks a secure value, `clearable`
// empties the field. Both are shell behaviour shared by the three skins, so each
// is asserted on every skin; the state-tinted glyph is an iOS skin decision and is
// asserted on the skin objects.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

const SKINS = [
  ["web", InputWeb],
  ["ios", InputIOS],
  ["android", InputAndroid],
] as const;

describe("Input passwordToggle", () => {
  for (const [plat, Input] of SKINS) {
    it(`${plat}: starts masked and the eye reveals then re-masks the value`, () => {
      ui(<Input label="Password" secureTextEntry passwordToggle defaultValue="hunter2" />);
      const field = screen.getByLabelText("Password") as HTMLInputElement;
      expect(field.type).toBe("password");
      const eye = screen.getByRole("button", { name: "Show password" });
      fireEvent.click(eye);
      expect(field.type).toBe("text");
      expect(screen.getByRole("button", { name: "Hide password" })).toBe(eye);
      fireEvent.click(eye);
      expect(field.type).toBe("password");
    });
  }

  // The literal-titled journey the interaction registry (tools/interactions) cites.
  it("the eye reveals a masked password and re-masks it", () => {
    ui(<InputWeb label="Password" secureTextEntry passwordToggle defaultValue="hunter2" />);
    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field.type).toBe("password");
  });

  it("renders no eye without secureTextEntry (nothing to reveal)", () => {
    ui(<InputWeb label="Name" passwordToggle defaultValue="Ada" />);
    expect(screen.queryByRole("button", { name: /password/ })).toBeNull();
  });
});

describe("Input clearable", () => {
  for (const [plat, Input] of SKINS) {
    it(`${plat}: the clear button appears with text, empties the field, and reports ""`, () => {
      const seen: string[] = [];
      ui(<Input label="Search" clearable defaultValue="canvas" onChangeText={(v) => seen.push(v)} />);
      const field = screen.getByLabelText("Search") as HTMLInputElement;
      const clear = screen.getByRole("button", { name: "Clear text" });
      fireEvent.click(clear);
      expect(seen).toEqual([""]);
      expect(field.value).toBe("");
      // Nothing left to clear: the button goes away until the field has text again.
      expect(screen.queryByRole("button", { name: "Clear text" })).toBeNull();
      fireEvent.change(field, { target: { value: "c" } });
      expect(screen.getByRole("button", { name: "Clear text" })).toBeTruthy();
    });
  }

  // The literal-titled journey the interaction registry (tools/interactions) cites.
  it("the clear button empties the field and reports an empty value", () => {
    const seen: string[] = [];
    ui(<InputWeb label="Search" clearable defaultValue="canvas" onChangeText={(v) => seen.push(v)} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear text" }));
    expect(seen).toEqual([""]);
    expect((screen.getByLabelText("Search") as HTMLInputElement).value).toBe("");
  });

  it("stays hidden on an empty field and on a read-only one", () => {
    ui(
      <>
        <InputWeb label="Empty" clearable />
        <InputWeb label="Locked" clearable readOnly defaultValue="fixed" />
      </>,
    );
    expect(screen.queryByRole("button", { name: "Clear text" })).toBeNull();
  });

  it("clears a controlled field through onChangeText", () => {
    const seen: string[] = [];
    ui(<InputWeb label="Search" clearable value="canvas" onChangeText={(v) => seen.push(v)} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear text" }));
    expect(seen).toEqual([""]);
  });
});

describe("the iOS glyph follows the field state", () => {
  const t = lightColors;
  it("rests on the lighter `input` gray for a passive glyph and `muted-foreground` for an action glyph", () => {
    expect(iosSkin.iconColor(t, { focused: false, error: false, action: false })).toBe(t.input);
    expect(iosSkin.iconColor(t, { focused: false, error: false, action: true })).toBe(t["muted-foreground"]);
  });
  it("turns `ring` on focus and `destructive` on error, error winning", () => {
    expect(iosSkin.iconColor(t, { focused: true, error: false, action: false })).toBe(t.ring);
    expect(iosSkin.iconColor(t, { focused: false, error: true, action: true })).toBe(t.destructive);
    expect(iosSkin.iconColor(t, { focused: true, error: true, action: false })).toBe(t.destructive);
  });
  it("is a 20px glyph on iOS and 16px on web and Android", () => {
    expect(iosSkin.iconSize).toBe(20);
    expect(webSkin.iconSize).toBe(16);
    expect(androidSkin.iconSize).toBe(16);
  });
  it("keeps the web and Android glyphs muted in every state", () => {
    for (const skin of [webSkin, androidSkin]) {
      for (const focused of [true, false]) for (const error of [true, false]) {
        expect(skin.iconColor(t, { focused, error, action: true })).toBe(t["muted-foreground"]);
      }
    }
  });
});

describe("the iOS field box", () => {
  const t = lightColors;
  it("rests on `field-border`, focuses on `ring`, errors on `destructive` with the wash", () => {
    const rest = iosSkin.bareField(t, "input", false, false);
    const focus = iosSkin.bareField(t, "ring", true, false);
    const error = iosSkin.bareField(t, "destructive", false, true);
    expect(rest.borderColor).toBe(t["field-border"]);
    expect(rest.backgroundColor).toBe(t.card);
    expect(focus.borderColor).toBe(t.ring);
    expect(error.borderColor).toBe(t.destructive);
    expect(error.backgroundColor).not.toBe(t.card);
    expect(rest.borderRadius).toBe(8);
  });
});
